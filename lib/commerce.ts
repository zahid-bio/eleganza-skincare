import { randomUUID, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";
import { calculateShippingCents } from "./catalog";
import { db, getSiteSettings, type Query } from "./db";

const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const checkoutInput = z
  .object({
    email,
    requestKey: z.uuid(),
    items: z
      .array(
        z.object({
          slug: z.string().max(120),
          qty: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
  })
  .refine(
    (v) => new Set(v.items.map((i) => i.slug)).size === v.items.length,
    "Each product must appear once.",
  );
export const trackInput = z.object({
  email,
  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^ELG-[A-F0-9]{10}$/),
});
export const ticketInput = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  topic: z.enum(["Order", "Delivery", "Return", "Product", "Other"]),
  orderNumber: z.string().trim().max(32).optional(),
  message: z.string().trim().min(10).max(2000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const signupInput = z.object({ email, consent: z.literal(true) });

type Order = {
  id: string;
  number: string;
  email: string;
  status: string;
  mode: "demo" | "stripe_test";
  subtotal_cents: number | null;
  shipping_cents: number;
  total_cents: number;
  stripe_session_id?: string;
};
type Item = {
  slug: string;
  name: string;
  sku: string;
  price_cents: number;
  qty: number;
};

export class CommerceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function stripeTest() {
  const secret = process.env.STRIPE_TEST_SECRET_KEY;
  return secret?.startsWith("sk_test_") &&
    process.env.STRIPE_TEST_WEBHOOK_SECRET?.startsWith("whsec_")
    ? new Stripe(secret)
    : null;
}

function reference(prefix: string) {
  return prefix + "-" + randomBytes(5).toString("hex").toUpperCase();
}

async function loadLines(query: Query, id: string) {
  return query<Item>(
    "SELECT slug,name,sku,price_cents,qty FROM order_items WHERE order_id=$1 ORDER BY slug",
    [id],
  );
}

async function reserve(
  input: z.infer<typeof checkoutInput>,
  mode: Order["mode"],
) {
  return (await db()).transaction(async (query) => {
    const id = randomUUID();
    const [created] = await query<Order>(
      "INSERT INTO orders(id,number,email,request_key,status,mode,total_cents) VALUES($1,$2,$3,$4,$5,$6,1) ON CONFLICT(request_key) DO NOTHING RETURNING *",
      [
        id,
        reference("ELG"),
        input.email,
        input.requestKey,
        mode === "demo" ? "test_paid" : "pending",
        mode,
      ],
    );
    const cart = [...input.items].sort((a, b) => a.slug.localeCompare(b.slug));
    if (!created) {
      const [existing] = await query<Order>(
        "SELECT * FROM orders WHERE request_key=$1",
        [input.requestKey],
      );
      const previous = await loadLines(query, existing.id);
      if (
        existing.email !== input.email ||
        previous.length !== cart.length ||
        cart.some(
          (i) => !previous.some((p) => p.slug === i.slug && p.qty === i.qty),
        )
      ) {
        throw new CommerceError(
          "This checkout has changed. Start checkout again.",
          409,
        );
      }
      if (existing.status === "expired")
        throw new CommerceError(
          "This checkout has expired. Start checkout again.",
          409,
        );
      return {
        order: existing,
        items: previous,
        shippingLabel: (await getSiteSettings(query)).shippingLabel,
      };
    }

    const items: Item[] = [];
    for (const line of cart) {
      const [product] = await query<Omit<Item, "qty">>(
        "UPDATE products SET stock=stock-$2,updated_at=now() WHERE slug=$1 AND published AND stock >= $2 RETURNING slug,name,sku,price_cents",
        [line.slug, line.qty],
      );
      if (!product)
        throw new CommerceError(
          "One of these items is unavailable in the selected quantity.",
          409,
        );
      items.push({ ...product, qty: line.qty });
      await query(
        "INSERT INTO order_items(order_id,slug,name,sku,price_cents,qty) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          product.slug,
          product.name,
          product.sku,
          product.price_cents,
          line.qty,
        ],
      );
    }
    const subtotal = items.reduce(
      (sum, item) => sum + item.price_cents * item.qty,
      0,
    );
    const settings = await getSiteSettings(query);
    const shipping = calculateShippingCents(subtotal, settings);
    const total = subtotal + shipping;
    const [order] = await query<Order>(
      "UPDATE orders SET subtotal_cents=$2,shipping_cents=$3,total_cents=$4 WHERE id=$1 RETURNING *",
      [id, subtotal, shipping, total],
    );
    return { order, items, shippingLabel: settings.shippingLabel };
  });
}

export async function checkout(
  input: z.infer<typeof checkoutInput>,
  origin: string,
) {
  const stripe = stripeTest();
  const { order, items, shippingLabel } = await reserve(
    input,
    stripe ? "stripe_test" : "demo",
  );
  if (order.mode === "demo" || order.status !== "pending")
    return { number: order.number };
  if (!stripe)
    throw new CommerceError(
      "Stripe test mode is unavailable. Restore the test configuration and retry.",
      503,
    );
  const configured = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).origin
    : origin;

  const session = order.stripe_session_id
    ? await stripe.checkout.sessions.retrieve(order.stripe_session_id)
    : await stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: order.email,
          client_reference_id: order.id,
          metadata: { order_id: order.id },
          line_items: items.map((item) => ({
            quantity: item.qty,
            price_data: {
              currency: "usd",
              unit_amount: item.price_cents,
              product_data: { name: item.name },
            },
          })),
          ...(order.shipping_cents > 0
            ? {
                shipping_options: [
                  {
                    shipping_rate_data: {
                      type: "fixed_amount",
                      fixed_amount: {
                        amount: order.shipping_cents,
                        currency: "usd",
                      },
                      display_name: shippingLabel || "Standard Shipping",
                    },
                  },
                ],
              }
            : {}),
          success_url:
            configured + "/checkout?returned=1&reference=" + order.number,
          cancel_url: configured + "/checkout?canceled=1",
        },
        { idempotencyKey: order.id },
      );

  await (
    await db()
  ).query(
    "UPDATE orders SET stripe_session_id=$2 WHERE id=$1 AND (stripe_session_id IS NULL OR stripe_session_id=$2)",
    [order.id, session.id],
  );
  return session.status === "open" && session.url
    ? { url: session.url }
    : { number: order.number };
}

export async function recordStripeEvent(event: Stripe.Event) {
  if (
    event.livemode ||
    (event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.expired")
  )
    return;
  const session = event.data.object;
  const id = session.metadata?.order_id;
  if (!z.uuid().safeParse(id).success) return;
  await (
    await db()
  ).transaction(async (query) => {
    const [order] = await query<Order>(
      "SELECT * FROM orders WHERE id=$1 AND mode='stripe_test' FOR UPDATE",
      [id],
    );
    if (
      !order ||
      (order.stripe_session_id && order.stripe_session_id !== session.id)
    )
      return;
    if (
      session.currency !== "usd" ||
      session.amount_total !== order.total_cents ||
      session.client_reference_id !== order.id
    ) {
      throw new CommerceError("Checkout reconciliation failed.", 422);
    }
    const [recorded] = await query(
      "INSERT INTO provider_events(id,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id",
      [event.id, id],
    );
    if (!recorded || order.status !== "pending") return;
    if (
      event.type === "checkout.session.completed" &&
      session.payment_status === "paid"
    ) {
      await query(
        "UPDATE orders SET status='test_paid',stripe_session_id=$2,updated_at=now() WHERE id=$1",
        [id, session.id],
      );
    }
    if (event.type === "checkout.session.expired") {
      for (const line of await loadLines(query, order.id))
        await query(
          "UPDATE products SET stock=stock+$2,updated_at=now() WHERE slug=$1",
          [line.slug, line.qty],
        );
      await query(
        "UPDATE orders SET status='expired',stripe_session_id=$2,updated_at=now() WHERE id=$1",
        [id, session.id],
      );
    }
  });
}

export async function track(input: z.infer<typeof trackInput>) {
  const [order] = await (
    await db()
  ).query(
    "SELECT number,status,carrier,tracking_url,created_at FROM orders WHERE number=$1 AND email=$2",
    [input.number, input.email],
  );
  if (!order)
    throw new CommerceError(
      "We couldn’t find an order with those details.",
      404,
    );
  return order;
}

export async function contact(input: z.infer<typeof ticketInput>) {
  const number = reference("CARE");
  await (
    await db()
  ).query(
    "INSERT INTO support_tickets(id,number,name,email,topic,order_number,message) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      randomUUID(),
      number,
      input.name,
      input.email,
      input.topic,
      input.orderNumber || null,
      input.message,
    ],
  );
  return { number };
}

export async function subscribe(input: z.infer<typeof signupInput>) {
  await (
    await db()
  ).query(
    "INSERT INTO email_subscriptions(email) VALUES($1) ON CONFLICT(email) DO NOTHING",
    [input.email],
  );
  return { saved: true };
}
