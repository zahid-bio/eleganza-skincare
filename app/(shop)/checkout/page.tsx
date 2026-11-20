import type { Metadata } from "next";
import { CheckoutForm } from "@/components/forms";
import { stripeTest } from "@/lib/commerce";

export const metadata: Metadata = { title: "Checkout" };
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{
    returned?: string;
    canceled?: string;
    reference?: string;
  }>;
}) {
  const { returned, canceled, reference } = await searchParams;
  return (
    <section className="utility shell">
      <div className="utility-heading">
        <p className="eyebrow">Store preview</p>
        <h1>
          Checkout<em>.</em>
        </h1>
      </div>
      <CheckoutForm
        stripe={Boolean(stripeTest())}
        returned={returned === "1"}
        canceled={canceled === "1"}
        stripeReference={
          typeof reference === "string" && /^ELG-[A-F0-9]{10}$/.test(reference)
            ? reference
            : undefined
        }
      />
    </section>
  );
}
