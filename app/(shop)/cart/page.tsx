import type { Metadata } from "next";
import { BagPage } from "@/components/forms";

export const metadata: Metadata = { title: "Your bag" };
export default function Cart() {
  return (
    <section className="utility shell">
      <div className="utility-heading">
        <p className="eyebrow">The collection</p>
        <h1>
          Your <em>bag.</em>
        </h1>
      </div>
      <BagPage />
    </section>
  );
}
