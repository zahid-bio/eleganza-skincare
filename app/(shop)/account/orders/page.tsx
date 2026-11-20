import type { Metadata } from "next";
import { TrackingForm } from "@/components/forms";

export const metadata: Metadata = { title: "Find an order" };
export default function Orders() {
  return (
    <section className="utility narrow shell">
      <div className="utility-heading">
        <p className="eyebrow">Your account</p>
        <h1>
          Find an <em>order.</em>
        </h1>
        <p>
          Use your checkout email and test order number to look up a purchase.
        </p>
      </div>
      <TrackingForm />
    </section>
  );
}
