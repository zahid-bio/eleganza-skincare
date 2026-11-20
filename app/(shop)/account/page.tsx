import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Your account" };
export default function Account() {
  return (
    <section className="utility narrow shell">
      <div className="utility-heading">
        <p className="eyebrow">Customer care</p>
        <h1>
          Your <em>account.</em>
        </h1>
        <p>
          Customer sign-in will open with the live store. You can look up a test
          purchase with your order number and checkout email.
        </p>
      </div>
      <Link className="button" href="/account/orders">
        Find an order <Icon name="arrow" size={17} />
      </Link>
    </section>
  );
}
