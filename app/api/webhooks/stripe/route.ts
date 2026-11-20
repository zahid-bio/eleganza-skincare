import { recordStripeEvent, stripeTest } from "@/lib/commerce";

export async function POST(request: Request) {
  const stripe = stripeTest();
  const secret = process.env.STRIPE_TEST_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret) return new Response(null, { status: 404 });
  if (!signature) return new Response(null, { status: 400 });
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    await recordStripeEvent(event);
  } catch {
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
