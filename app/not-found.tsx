import Link from "next/link";
import { Icon } from "@/components/icon";

export default function NotFound() {
  return (
    <main className="utility narrow shell">
      <div className="utility-heading">
        <p className="eyebrow">404</p>
        <h1>
          Page unavailable<em>.</em>
        </h1>
      </div>
      <Link href="/" className="button">
        Back to Eleganza <Icon name="arrow" size={17} />
      </Link>
    </main>
  );
}
