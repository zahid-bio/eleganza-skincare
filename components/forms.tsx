"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { money } from "@/lib/catalog";
import { Icon } from "./icon";
import { CartLines, useStore } from "./store";

async function submit<T>(action: string, payload: object): Promise<T> {
  const response = await fetch("/api/commerce/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}

function useSubmission() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { pending, error, run };
}

export function Newsletter() {
  const { run, pending, error } = useSubmission();
  const [complete, setComplete] = useState(false);
  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(async () => {
      await submit("newsletter", {
        email: data.get("email"),
        consent: data.get("consent") === "on",
      });
      setComplete(true);
    });
  }
  if (complete)
    return (
      <p className="signup-success" role="status">
        <Icon name="check" size={17} /> You’re on the list for this preview.
      </p>
    );
  return (
    <form onSubmit={handle} className="newsletter">
      <div>
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          aria-label="Email address"
          placeholder="Your email address"
          maxLength={254}
        />
        <button aria-label="Join the list" disabled={pending}>
          <Icon name="arrow" size={20} />
        </button>
      </div>
      <label className="checkbox-row">
        <input required name="consent" type="checkbox" /> I agree to receive
        Eleganza emails.
      </label>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

const orderLabels: Record<string, string> = {
  pending: "Payment pending",
  test_paid: "Test order placed",
  shipped: "Shipped",
  delivered: "Delivered",
  expired: "Checkout expired",
};
type Tracked = {
  number: string;
  status: string;
  carrier?: string;
  tracking_url?: string;
};
export function TrackingForm() {
  const { run, pending, error } = useSubmission();
  const [order, setOrder] = useState<Tracked>();
  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setOrder(undefined);
    run(async () => setOrder(await submit("track", Object.fromEntries(data))));
  }
  return (
    <>
      <form className="form" onSubmit={handle}>
        <label>
          Order number
          <input
            required
            name="number"
            placeholder="ELG-…"
            autoComplete="off"
            maxLength={15}
          />
        </label>
        <label>
          Email used at checkout
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <button disabled={pending} className="button">
          {pending ? "Looking up order…" : "Find my order"}{" "}
          <Icon name="arrow" size={17} />
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      {order && (
        <div className="result-box" role="status">
          <p className="eyebrow">{order.number}</p>
          <h2>{orderLabels[order.status] || order.status}</h2>
          {order.carrier && <p>{order.carrier}</p>}
          {order.tracking_url && (
            <a className="underline-link" href={order.tracking_url}>
              View carrier tracking <Icon name="diagonal" size={15} />
            </a>
          )}
        </div>
      )}
    </>
  );
}

export function ContactForm() {
  const { run, pending, error } = useSubmission();
  const [reference, setReference] = useState("");
  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(async () => {
      const result = await submit<{ number: string }>("contact", {
        ...Object.fromEntries(data),
        consent: data.get("consent") === "on",
      });
      setReference(result.number);
    });
  }
  if (reference)
    return (
      <div className="result-box" role="status">
        <h2>Request saved.</h2>
        <p>
          Your preview support reference is <strong>{reference}</strong>.
        </p>
      </div>
    );
  return (
    <form className="form" onSubmit={handle}>
      <label>
        Name
        <input
          required
          name="name"
          autoComplete="name"
          minLength={2}
          maxLength={100}
        />
      </label>
      <label>
        Email
        <input
          required
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
        />
      </label>
      <label>
        Topic
        <select name="topic">
          {["Order", "Delivery", "Return", "Product", "Other"].map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
      </label>
      <label>
        Order number <span>(optional)</span>
        <input name="orderNumber" maxLength={32} />
      </label>
      <label>
        Message
        <textarea
          required
          name="message"
          rows={5}
          minLength={10}
          maxLength={2000}
        />
      </label>
      <label hidden className="honeypot">
        Website
        <input name="website" autoComplete="off" tabIndex={-1} />
      </label>
      <label className="checkbox-row">
        <input required name="consent" type="checkbox" /> I agree to be
        contacted about this request.
      </label>
      <button disabled={pending} className="button">
        {pending ? "Sending…" : "Send support request"}
        <Icon name="arrow" size={17} />
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function BagPage() {
  const {
    items,
    subtotal,
    shipping,
    total,
    shippingLabel,
    baseShippingCents,
    freeShippingThresholdCents,
  } = useStore();
  return (
    <div className="bag-layout">
      <CartLines />
      <div className="order-summary">
        <h2>Order summary</h2>
        <div className="total-line">
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        {baseShippingCents > 0 && (
          <div className="total-line summary-shipping">
            <span>{shippingLabel}</span>
            <span>{shipping === 0 ? "Free" : money(shipping)}</span>
          </div>
        )}
        <div className="total-line summary-total">
          <strong>Total</strong>
          <strong>{money(total)}</strong>
        </div>
        {baseShippingCents > 0 &&
          freeShippingThresholdCents != null &&
          freeShippingThresholdCents > 0 &&
          subtotal < freeShippingThresholdCents && (
            <p className="shipping-note">
              Add {money(freeShippingThresholdCents - subtotal)} more for free
              shipping.
            </p>
          )}
        <p>Preview orders use test checkout.</p>
        {items.length ? (
          <Link className="button button-wide" href="/checkout">
            Go to checkout <Icon name="arrow" size={17} />
          </Link>
        ) : (
          <Link className="button button-wide" href="/collections/all">
            Shop the Collection <Icon name="arrow" size={17} />
          </Link>
        )}
      </div>
    </div>
  );
}

function checkoutRequestKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // The Wi-Fi preview can run over HTTP, where randomUUID is unavailable.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function CheckoutForm({
  stripe,
  returned,
  canceled,
  stripeReference,
}: {
  stripe: boolean;
  returned: boolean;
  canceled: boolean;
  stripeReference?: string;
}) {
  const {
    items,
    subtotal,
    shipping,
    total,
    shippingLabel,
    baseShippingCents,
    clear,
  } = useStore();
  const { run, pending, error } = useSubmission();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("preview@example.com");
  const requestKey = useRef<{ fingerprint: string; key: string }>(null);
  const router = useRouter();

  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lines = items
      .map(({ product, qty }) => ({ slug: product.slug, qty }))
      .sort((a, b) => a.slug.localeCompare(b.slug));
    const fingerprint = JSON.stringify([email, lines]);
    if (!requestKey.current || requestKey.current.fingerprint !== fingerprint)
      requestKey.current = { key: checkoutRequestKey(), fingerprint };
    run(async () => {
      const result = await submit<{ number?: string; url?: string }>(
        "checkout",
        { items: lines, email, requestKey: requestKey.current!.key },
      );
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      if (result.number) {
        setReference(result.number);
        clear();
        router.refresh();
      }
    });
  }

  if (returned || reference)
    return (
      <div className="result-box" role="status">
        <p className="eyebrow">Checkout preview</p>
        <h2>
          {reference
            ? "Test order received."
            : "Returned from Stripe test checkout."}
        </h2>
        {reference && (
          <p>
            <strong>{reference}</strong> · {email}
          </p>
        )}
        {!reference && stripeReference && (
          <p>
            Order reference <strong>{stripeReference}</strong>
          </p>
        )}
        <p>
          Use Track Order to see the latest status. A Stripe test payment
          updates after provider confirmation.
        </p>
        <Link className="button" href="/track-order">
          Track an order <Icon name="arrow" size={17} />
        </Link>
      </div>
    );
  if (!items.length)
    return (
      <>
        <p>Your bag is empty.</p>
        <Link className="button" href="/collections/all">
          Shop the Collection <Icon name="arrow" size={17} />
        </Link>
      </>
    );
  return (
    <div className="bag-layout checkout-layout">
      <form className="form" onSubmit={handle}>
        <p className="inline-notice">
          {canceled
            ? "Stripe test checkout was canceled. Your bag is still here."
            : stripe
              ? "This checkout uses Stripe test mode. Use test credentials."
              : "This preview creates a simulated order without charging a card. Use a sample email address."}
        </p>
        <label>
          Email for test order
          <input
            required
            type="email"
            name="email"
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button disabled={pending} className="button">
          {pending
            ? "Preparing checkout…"
            : stripe
              ? "Continue to Stripe test checkout"
              : "Place test order"}{" "}
          <Icon name="arrow" size={17} />
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <div className="order-summary">
        <h2>Your order</h2>
        {items.map(({ product, qty }) => (
          <div className="total-line checkout-line" key={product.slug}>
            <span>
              {product.name} × {qty}
            </span>
            <span>{money(product.price * qty)}</span>
          </div>
        ))}
        <div className="total-line">
          <span>Subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
        {baseShippingCents > 0 && (
          <div className="total-line summary-shipping">
            <span>{shippingLabel}</span>
            <span>{shipping === 0 ? "Free" : money(shipping)}</span>
          </div>
        )}
        <div className="total-line summary-total">
          <strong>Total</strong>
          <strong>{money(total)}</strong>
        </div>
      </div>
    </div>
  );
}
