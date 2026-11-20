"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  calculateShippingCents,
  money,
  productUrl,
  type SiteSettings,
  type StoreProduct,
} from "@/lib/catalog";
import { Icon } from "./icon";
import { Photo } from "./image";

type Panel = "cart" | "search" | "product" | "menu";
type Line = { slug: string; qty: number };
type ShippingConfig = Pick<
  SiteSettings,
  "shippingCents" | "freeShippingThresholdCents" | "shippingLabel"
>;
const storageKey = "eleganza-cart-v1";

export const navigation = [
  ["Shop All", "/collections/all"],
  ["Face Oil", "/products/radiance-renewal-face-oil"],
  ["Complexion", "/collections/complexion"],
  ["Our Story", "/about"],
  ["FAQ", "/faq"],
] as const;

const Store = createContext<{
  add: (product: StoreProduct, qty: number) => void;
  open: (panel: Panel, product?: StoreProduct) => void;
  update: (slug: string, qty: number) => void;
  clear: () => void;
  items: { product: StoreProduct; qty: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingLabel: string;
  baseShippingCents: number;
  freeShippingThresholdCents: number | null;
  count: number;
} | null>(null);

export function useStore() {
  const store = useContext(Store);
  if (!store) throw new Error("Store provider is required.");
  return store;
}

function readCart(): Line[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter(
          (line) =>
            line &&
            typeof line.slug === "string" &&
            Number.isInteger(line.qty) &&
            line.qty > 0 &&
            line.qty <= 99,
        )
      : [];
  } catch {
    return [];
  }
}

export function StoreProvider({
  products,
  shippingConfig = {
    shippingCents: 0,
    freeShippingThresholdCents: null,
    shippingLabel: "Standard Shipping",
  },
  children,
}: {
  products: StoreProduct[];
  shippingConfig?: ShippingConfig;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<Line[]>([]);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selected, setSelected] = useState<StoreProduct>();
  const [search, setSearch] = useState("");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const index = new Map(products.map((product) => [product.slug, product]));
  const items = cart.flatMap(({ slug, qty }) => {
    const product = index.get(slug);
    return product ? [{ product, qty }] : [];
  });
  const subtotal = items.reduce(
    (sum, { product, qty }) => sum + product.price * qty,
    0,
  );
  const shipping = calculateShippingCents(subtotal, shippingConfig);
  const total = subtotal + shipping;
  const count = items.reduce((sum, { qty }) => sum + qty, 0);
  const matches = search.trim()
    ? products.filter((p) =>
        (p.name + " " + p.category + " " + p.format)
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : products;

  useEffect(() => {
    setCart(readCart());
    setReady(true);
    const synchronize = (event: StorageEvent) => {
      if (event.key === storageKey) setCart(readCart());
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (panel && !element.open) element.showModal();
    if (!panel && element.open) {
      element.close();
      trigger.current?.focus();
    }
    if (!panel) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [panel]);

  function open(next: Panel, product?: StoreProduct) {
    if (!panel && document.activeElement instanceof HTMLElement)
      trigger.current = document.activeElement;
    setSelected(product);
    setSearch("");
    setPanel(next);
  }
  function update(slug: string, qty: number) {
    const product = index.get(slug);
    if (!product) return;
    setCart((existing) => [
      ...existing.filter((line) => line.slug !== slug),
      ...(qty > 0
        ? [{ slug, qty: Math.min(99, qty, Math.max(product.stock, 1)) }]
        : []),
    ]);
  }
  function add(product: StoreProduct, qty: number) {
    if (product.stock < 1 || qty < 1) return;
    setCart((existing) => {
      const current =
        existing.find((line) => line.slug === product.slug)?.qty ?? 0;
      return [
        ...existing.filter((line) => line.slug !== product.slug),
        { slug: product.slug, qty: Math.min(99, current + qty, product.stock) },
      ];
    });
    open("cart");
  }
  function fullSearch(event: FormEvent) {
    event.preventDefault();
    setPanel(null);
    router.push("/search?q=" + encodeURIComponent(search.trim()));
  }

  return (
    <Store.Provider
      value={{
        add,
        open,
        items,
        update,
        clear: () => setCart([]),
        subtotal,
        shipping,
        total,
        shippingLabel: shippingConfig.shippingLabel,
        baseShippingCents: shippingConfig.shippingCents,
        freeShippingThresholdCents: shippingConfig.freeShippingThresholdCents,
        count,
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="drawer"
        aria-labelledby="drawer-title"
        onCancel={(event) => {
          event.preventDefault();
          setPanel(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPanel(null);
        }}
      >
        {panel && (
          <div className="drawer-inner">
            <div className="drawer-title">
              <h2 id="drawer-title">
                {panel === "cart"
                  ? `Your bag (${count})`
                  : panel === "search"
                    ? "Search"
                    : panel === "menu"
                      ? "Explore Eleganza"
                      : "Quick view"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setPanel(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            {panel === "cart" && (
              <>
                <CartLines />
                <div className="drawer-bottom">
                  {items.length > 0 ? (
                    <>
                      <div className="total-line">
                        <span>Subtotal</span>
                        <strong>{money(subtotal)}</strong>
                      </div>
                      {shippingConfig.shippingCents > 0 && (
                        <div className="total-line drawer-shipping-line">
                          <span>{shippingConfig.shippingLabel}</span>
                          <span>
                            {shipping === 0 ? "Free" : money(shipping)}
                          </span>
                        </div>
                      )}
                      {shippingConfig.shippingCents > 0 && (
                        <div className="total-line drawer-total-line">
                          <strong>Total</strong>
                          <strong>{money(total)}</strong>
                        </div>
                      )}
                      <Link
                        className="button button-wide"
                        href="/cart"
                        onClick={() => setPanel(null)}
                      >
                        View bag <Icon name="arrow" size={18} />
                      </Link>
                    </>
                  ) : (
                    <Link
                      className="button button-wide"
                      href="/collections/all"
                      onClick={() => setPanel(null)}
                    >
                      Shop the Collection <Icon name="arrow" size={18} />
                    </Link>
                  )}
                </div>
              </>
            )}
            {panel === "search" && (
              <>
                <form className="search-input" onSubmit={fullSearch}>
                  <input
                    type="search"
                    aria-label="Search products"
                    placeholder="Face oil, concealer, foundation…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="icon-button"
                    aria-label="Search"
                  >
                    <Icon name="search" />
                  </button>
                </form>
                <p className="eyebrow">
                  {search.trim() ? "Results" : "Explore the collection"}
                </p>
                {matches.length ? (
                  <div className="search-results">
                    {matches.map((product) => (
                      <Link
                        key={product.slug}
                        href={productUrl(product.slug)}
                        onClick={() => setPanel(null)}
                      >
                        <Photo name={product.image} alt="" sizes="64px" />
                        <span>
                          {product.name}
                          <small>{product.format}</small>
                        </span>
                        <Icon name="diagonal" size={16} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p>No essentials match that search.</p>
                )}
              </>
            )}
            {panel === "product" && selected && (
              <div className="quick-product">
                <Photo name={selected.image} alt={selected.alt} sizes="440px" />
                <div className="total-line">
                  <h3>{selected.name}</h3>
                  <span className="product-card-prices">
                    <span>{money(selected.price)}</span>
                    {selected.compareAtPrice != null &&
                      selected.compareAtPrice > selected.price && (
                        <s className="price-compare">
                          {money(selected.compareAtPrice)}
                        </s>
                      )}
                  </span>
                </div>
                <p>{selected.description}</p>
                <button
                  className="button button-wide"
                  disabled={!selected.stock}
                  onClick={() => add(selected, 1)}
                >
                  {selected.stock ? "Add to bag" : "Unavailable in preview"}
                  <Icon name="plus" size={17} />
                </button>
                <Link
                  className="underline-link"
                  href={productUrl(selected.slug)}
                  onClick={() => setPanel(null)}
                >
                  View full details
                </Link>
              </div>
            )}
            {panel === "menu" && (
              <nav className="drawer-nav" aria-label="Mobile navigation">
                {[
                  ...navigation,
                  ["Track order", "/track-order"],
                  ["Account", "/account"],
                ].map(([label, href]) => (
                  <Link key={href} href={href} onClick={() => setPanel(null)}>
                    {label}
                    <Icon name="diagonal" size={19} />
                  </Link>
                ))}
              </nav>
            )}
          </div>
        )}
      </dialog>
    </Store.Provider>
  );
}

export function CartLines() {
  const { items, update } = useStore();
  if (!items.length) return <p className="empty-bag">Your bag is empty.</p>;
  return (
    <div className="cart-lines">
      {items.map(({ product, qty }) => (
        <div className="cart-line" key={product.slug}>
          <Photo name={product.image} alt="" sizes="110px" />
          <div>
            <Link href={productUrl(product.slug)}>{product.name}</Link>
            <small>{product.format}</small>
            <Quantity
              label={product.name}
              qty={qty}
              max={Math.min(99, product.stock)}
              setQty={(value) => update(product.slug, value)}
            />
            <button
              className="text-button"
              onClick={() => update(product.slug, 0)}
            >
              Remove
            </button>
          </div>
          <b>{money(product.price * qty)}</b>
        </div>
      ))}
    </div>
  );
}

export function Quantity({
  label,
  qty,
  setQty,
  max,
}: {
  label: string;
  qty: number;
  setQty: (n: number) => void;
  max: number;
}) {
  return (
    <div className="quantity" role="group" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        disabled={qty <= 1}
        onClick={() => setQty(qty - 1)}
        aria-label="Decrease quantity"
      >
        <Icon name="minus" size={15} />
      </button>
      <output aria-live="polite">{qty}</output>
      <button
        type="button"
        disabled={qty >= max}
        onClick={() => setQty(qty + 1)}
        aria-label="Increase quantity"
      >
        <Icon name="plus" size={15} />
      </button>
    </div>
  );
}
