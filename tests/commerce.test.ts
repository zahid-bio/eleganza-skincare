import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type Stripe from "stripe";
import { catalog } from "../lib/launch-products";
import {
  checkout,
  checkoutInput,
  contact,
  recordStripeEvent,
  signupInput,
  subscribe,
  track,
} from "../lib/commerce";
import { db, getCatalog } from "../lib/db";

process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;
delete process.env.STRIPE_TEST_SECRET_KEY;
delete process.env.STRIPE_TEST_WEBHOOK_SECRET;
const [oil, concealer, foundation] = catalog;
const origin = "http://localhost:3218";

test("catalog shows the four brief prices without landed costs", async () => {
  const products = await getCatalog();
  assert.deepEqual(
    products.map((p) => p.price),
    [3997, 2997, 3497, 2997],
  );
  assert.ok(products.every((p) => !("cost" in p)));
});

test("checkout validates quantities, uses database pricing, and applies a retry once", async () => {
  const checkoutPayload = checkoutInput.parse({
    email: "shopper@example.com",
    requestKey: randomUUID(),
    items: [{ slug: oil.slug, qty: 2, price: 1 }],
  });
  const [first, retry] = await Promise.all([
    checkout(checkoutPayload, origin),
    checkout(checkoutPayload, origin),
  ]);
  assert.ok(first.number);
  assert.equal(first.number, retry.number);
  const database = await db();
  const [saved] = await database.query(
    "SELECT total_cents FROM orders WHERE number=$1",
    [first.number],
  );
  const [stock] = await database.query(
    "SELECT stock FROM products WHERE slug=$1",
    [oil.slug],
  );
  assert.equal(saved.total_cents, 7994);
  assert.equal(stock.stock, oil.stock - 2);
  const result = await track({
    number: first.number,
    email: checkoutPayload.email,
  });
  assert.equal(result.status, "test_paid");
  assert.ok(!("email" in result));
  await assert.rejects(
    track({ number: first.number, email: "other@example.com" }),
    { status: 404 },
  );
  await assert.rejects(
    checkout(
      { ...checkoutPayload, items: [{ slug: oil.slug, qty: 3 }] },
      origin,
    ),
    { status: 409 },
  );
});

test("an unavailable line rolls back the whole checkout and inventory reservation", async () => {
  const input = checkoutInput.parse({
    email: "stock@example.com",
    requestKey: randomUUID(),
    items: [
      { slug: concealer.slug, qty: 1 },
      { slug: oil.slug, qty: 99 },
    ],
  });
  await assert.rejects(checkout(input, origin), { status: 409 });
  const database = await db();
  const [stock] = await database.query(
    "SELECT stock FROM products WHERE slug=$1",
    [concealer.slug],
  );
  assert.equal(stock.stock, concealer.stock);
  assert.equal(
    (
      await database.query("SELECT id FROM orders WHERE request_key=$1", [
        input.requestKey,
      ])
    ).length,
    0,
  );
});

test("an expired Stripe test event releases the reservation once", async () => {
  const database = await db();
  const id = randomUUID();
  await database.transaction(async (query) => {
    await query(
      "INSERT INTO orders(id,number,email,request_key,status,mode,total_cents) VALUES($1,'ELG-1111111111','sandbox@example.com',$2,'pending','stripe_test',$3)",
      [id, randomUUID(), foundation.price],
    );
    await query(
      "INSERT INTO order_items(order_id,slug,name,sku,price_cents,qty) VALUES($1,$2,$3,$4,$5,1)",
      [id, foundation.slug, foundation.name, foundation.sku, foundation.price],
    );
    await query("UPDATE products SET stock=stock-1 WHERE slug=$1", [
      foundation.slug,
    ]);
  });
  const event = {
    type: "checkout.session.expired",
    id: "evt_test_expired",
    livemode: false,
    data: {
      object: {
        id: "cs_test_one",
        metadata: { order_id: id },
        currency: "usd",
        amount_total: foundation.price,
        client_reference_id: id,
      },
    },
  } as unknown as Stripe.Event;
  await recordStripeEvent(event);
  await recordStripeEvent(event);
  const [p] = await database.query("SELECT stock FROM products WHERE slug=$1", [
    foundation.slug,
  ]);
  const [order] = await database.query(
    "SELECT status FROM orders WHERE id=$1",
    [id],
  );
  assert.equal(p.stock, foundation.stock);
  assert.equal(order.status, "expired");
});

test("support creates a reference and email opt-ins are stored once", async () => {
  const ticket = await contact({
    name: "Preview Shopper",
    email: "support@example.com",
    topic: "Product",
    message: "A sample product question.",
    consent: true,
  });
  assert.match(ticket.number, /^CARE-[0-9A-F]{10}$/);
  assert.equal(
    signupInput.safeParse({ email: "list@example.com", consent: false })
      .success,
    false,
  );
  const input = signupInput.parse({ email: "List@example.com", consent: true });
  await subscribe(input);
  await subscribe(input);
  const [record] = await (
    await db()
  ).query(
    "SELECT count(*)::int AS count FROM email_subscriptions WHERE email='list@example.com'",
  );
  assert.equal(record.count, 1);
});
