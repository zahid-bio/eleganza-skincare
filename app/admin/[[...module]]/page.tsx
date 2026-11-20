import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createProduct,
  deleteProduct,
  fulfill,
  login,
  logout,
  resolveTicket,
  savePage,
  saveProduct,
  saveSettings,
} from "@/app/admin/actions";
import "@/app/(shop)/products/[slug]/product.css";
import {
  type AdminProductData,
  ProductBuilderStudio,
} from "@/components/admin-product-builder";
import { productImageUrl } from "@/components/image";
import {
  defaultBuilderBlocks,
  defaultQuickFacts,
  money,
  productUrl,
} from "@/lib/catalog";
import {
  db,
  getSiteSettings,
  parseBuilderBlocks,
  parseDetailImages,
  parseQuickFacts,
} from "@/lib/db";
import { infoPages } from "@/lib/pages";
import { can, localAdminEnabled, staff, type Permission } from "@/lib/staff";

export const metadata: Metadata = { title: "Store admin" };
export const dynamic = "force-dynamic";
const modules: Record<
  string,
  { label: string; permission?: Permission; help: string }
> = {
  overview: {
    label: "Dashboard",
    help: "Full store overview, recent orders, and quick shortcuts.",
  },
  orders: {
    label: "Orders",
    permission: "orders",
    help: "Review test orders and update fulfillment.",
  },
  products: {
    label: "Products & Builder",
    permission: "catalog",
    help: "Add and edit products with the drag-and-drop visual page builder.",
  },
  customers: {
    label: "Customers",
    permission: "customers",
    help: "See customer records associated with preview orders.",
  },
  support: {
    label: "Support",
    permission: "support",
    help: "Review and resolve requests submitted from the storefront.",
  },
  content: {
    label: "Content",
    permission: "catalog",
    help: "Edit preview pages, page SEO metadata, and decide which revisions the storefront displays.",
  },
  settings: {
    label: "Settings & SEO",
    permission: "settings",
    help: "Configure custom domain, main page SEO, marketing pixels, and shipping charges.",
  },
  analytics: {
    label: "Analytics",
    permission: "report",
    help: "Review totals for simulated and Stripe test orders.",
  },
  marketing: {
    label: "Email list",
    permission: "marketing",
    help: "View opt-ins submitted from the storefront.",
  },
  audit: {
    label: "Audit log",
    permission: "audit",
    help: "Review changes to catalog, content, fulfillment, settings, and support.",
  },
};

const notices: Record<string, string> = {
  saved: "Changes saved.",
  created: "New product created.",
  deleted: "Product deleted.",
  in_use:
    "This product has existing orders and cannot be deleted. Uncheck 'Display this product' to hide it instead.",
  missing: "Product not found.",
  duplicate: "A product with that slug or SKU already exists.",
  invalid: "Check the entered values and try again.",
  conflict:
    "This record changed or is no longer editable. Reload and try again.",
  login: "The preview access key did not match.",
  slow: "Wait a minute and try again.",
  permission: "Your staff role cannot perform that action.",
};
const states: Record<string, string> = {
  pending: "Pending",
  test_paid: "Test paid",
  shipped: "Shipped",
  delivered: "Delivered",
  expired: "Expired",
};
const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(value));
type Row = Record<string, unknown>;
type PageProps = {
  params: Promise<{ module?: string[] }>;
  searchParams: Promise<{
    q?: string;
    p?: string;
    notice?: string;
    edit?: string;
    new?: string;
  }>;
};
const PAGE_SIZE = 15;

export default async function Admin({ params, searchParams }: PageProps) {
  const [{ module }, filters, user] = await Promise.all([
    params,
    searchParams,
    staff(),
  ]);
  const key = module?.[0] || "overview";
  if ((module?.length ?? 0) > 1 || !Object.hasOwn(modules, key)) notFound();
  const alert =
    typeof filters.notice === "string" && Object.hasOwn(notices, filters.notice)
      ? notices[filters.notice]
      : "";
  if (!user)
    return (
      <main className="admin-signin">
        <Link href="/" className="admin-brand brand-wordmark">
          eleganza
        </Link>
        <div className="admin-login-card">
          <p className="eyebrow">Store preview</p>
          <h1>Staff access</h1>
          {localAdminEnabled() ? (
            <form className="form" action={login}>
              <label>
                Preview access key
                <input
                  type="password"
                  name="key"
                  autoComplete="current-password"
                  required
                  maxLength={500}
                />
              </label>
              <button className="btn btn--fern button-wide">Sign in</button>
              {alert && <p role="alert">{alert}</p>}
            </form>
          ) : (
            <p>
              Staff sign-in requires a configured preview key or managed
              identity.
            </p>
          )}
        </div>
        <Link className="underline-link" href="/">
          Back to the storefront
        </Link>
      </main>
    );

  const entry = modules[key];
  if (entry.permission && !can(user.role, entry.permission)) notFound();
  const q = typeof filters.q === "string" ? filters.q.trim().slice(0, 100) : "";
  const page = Math.min(
    1000,
    Math.max(1, Number.parseInt(filters.p || "1", 10) || 1),
  );
  const builderOpen =
    key === "products" &&
    (filters.new === "1" ||
      (typeof filters.edit === "string" && filters.edit.length > 0));

  return (
    <div className={builderOpen ? "admin-shell admin-shell--wide" : "admin-shell"}>
      <aside className="admin-sidebar">
        <Link className="admin-brand brand-wordmark" href="/admin">
          eleganza
        </Link>
        <nav aria-label="Admin modules">
          {Object.entries(modules)
            .filter(([, m]) => !m.permission || can(user.role, m.permission))
            .map(([slug, m]) => (
              <Link
                aria-current={key === slug ? "page" : undefined}
                href={slug === "overview" ? "/admin" : "/admin/" + slug}
                key={slug}
              >
                {m.label}
              </Link>
            ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/">View storefront ↗</Link>
          {localAdminEnabled() && (
            <form action={logout}>
              <button>Sign out</button>
            </form>
          )}
        </div>
      </aside>
      <main className={builderOpen ? "admin-main admin-main--builder" : "admin-main"}>
        {!builderOpen && (
          <div className="admin-heading">
            <div>
              <p className="eyebrow">Store command center</p>
              <h1>{entry.label}</h1>
              <p>{entry.help}</p>
            </div>
            <div className="admin-heading-actions">
              {can(user.role, "catalog") && (
                <Link className="btn btn--fern" href="/admin/products?new=1">
                  + New product
                </Link>
              )}
              <span className="status-tag">{user.role}</span>
            </div>
          </div>
        )}
        {alert && (
          <p className="admin-notice" role="status">
            {alert}
          </p>
        )}
        {key === "overview" || key === "analytics" ? (
          <Overview
            canReport={can(user.role, "report")}
            canSupport={can(user.role, "support")}
            canCatalog={can(user.role, "catalog")}
            canOrders={can(user.role, "orders")}
            canSettings={can(user.role, "settings")}
          />
        ) : (
          <ModuleContent
            name={key}
            q={q}
            page={page}
            editSlug={typeof filters.edit === "string" ? filters.edit : undefined}
            isNew={filters.new === "1"}
          />
        )}
      </main>
    </div>
  );
}

async function Overview({
  canReport,
  canSupport,
  canCatalog,
  canOrders,
  canSettings,
}: {
  canReport: boolean;
  canSupport: boolean;
  canCatalog: boolean;
  canOrders: boolean;
  canSettings: boolean;
}) {
  const database = await db();
  const [values, settings, recentProducts, recentOrders] = await Promise.all([
    Promise.all([
      canReport
        ? database.query(
            "SELECT count(*)::int AS count, COALESCE(sum(total_cents),0)::int AS revenue FROM orders WHERE status IN ('test_paid','shipped','delivered')",
          )
        : [],
      canReport
        ? database.query(
            "SELECT count(*)::int AS total, count(*) FILTER (WHERE published)::int AS published, count(*) FILTER (WHERE published AND stock < 8)::int AS low_stock FROM products",
          )
        : [],
      canSupport
        ? database.query(
            "SELECT count(*)::int AS count FROM support_tickets WHERE status='open'",
          )
        : [],
      canReport
        ? database.query(
            "SELECT count(*)::int AS count FROM email_subscriptions",
          )
        : [],
    ]),
    canSettings ? getSiteSettings() : null,
    canCatalog
      ? database.query<{
          slug: string;
          name: string;
          price_cents: number;
          compare_at_price_cents: number | null;
          stock: number;
          published: boolean;
          image: string | null;
        }>(
          "SELECT slug,name,price_cents,compare_at_price_cents,stock,published,image FROM products ORDER BY created_at ASC, name ASC LIMIT 6",
        )
      : [],
    canOrders
      ? database.query<{
          number: string;
          email: string;
          status: string;
          total_cents: number;
          created_at: string;
        }>(
          "SELECT number,email,status,total_cents,created_at FROM orders ORDER BY created_at DESC LIMIT 5",
        )
      : [],
  ]);
  const [[orders], [prodStats], [tickets], [subscribers]] = values;
  const metrics = [
    ...(orders
      ? [
          ["Test sales", money(Number(orders.revenue))],
          ["Test orders", String(orders.count)],
        ]
      : []),
    ...(prodStats
      ? [
          ["Published products", `${prodStats.published} / ${prodStats.total}`],
          ["Low-stock alerts", String(prodStats.low_stock)],
        ]
      : []),
    ...(tickets ? [["Open support", String(tickets.count)]] : []),
    ...(subscribers ? [["Email subscribers", String(subscribers.count)]] : []),
  ];
  const activePixels = settings
    ? [
        settings.facebookPixelId && "Facebook",
        settings.tiktokPixelId && "TikTok",
        settings.pinterestPixelId && "Pinterest",
        settings.googleAdsId && "Google Ads",
      ].filter(Boolean)
    : [];

  return (
    <div className="admin-entries admin-dashboard-stack">
      {metrics.length ? (
        <div className="admin-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <section className="admin-card">
          <h2>Your workspace</h2>
          <p>Use the navigation to open the modules available to your role.</p>
        </section>
      )}

      <div className="admin-dashboard-grid">
        {canCatalog && (
          <section className="admin-card">
            <div className="admin-overview-header">
              <div>
                <h2 className="admin-card-title">Products & Visual Builder</h2>
                <p>Click any product to open the Elementor-style editor.</p>
              </div>
              <Link className="btn btn--fern" href="/admin/products?new=1">
                + Add product
              </Link>
            </div>
            <div className="admin-dash-list">
              {recentProducts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/admin/products?edit=${encodeURIComponent(p.slug)}`}
                  className="admin-dash-product"
                >
                  <img
                    src={productImageUrl(p.image || "oil-packshot")}
                    alt=""
                  />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {money(Number(p.price_cents))} · {p.stock} in stock
                    </small>
                  </div>
                  <span className="status-tag">
                    {p.published ? "Published" : "Hidden"}
                  </span>
                </Link>
              ))}
            </div>
            <div className="admin-dash-footer">
              <Link className="underline-link" href="/admin/products">
                Open full product catalog →
              </Link>
            </div>
          </section>
        )}

        {canOrders && (
          <section className="admin-card">
            <div className="admin-overview-header">
              <div>
                <h2 className="admin-card-title">Recent orders</h2>
                <p>Latest test checkouts & fulfillment status.</p>
              </div>
              <Link className="btn btn--outline" href="/admin/orders">
                All orders
              </Link>
            </div>
            {recentOrders.length ? (
              <div className="admin-dash-list">
                {recentOrders.map((o) => (
                  <Link
                    key={o.number}
                    href={`/admin/orders?q=${encodeURIComponent(o.number)}`}
                    className="admin-dash-order"
                  >
                    <div>
                      <strong>{o.number}</strong>
                      <small>
                        {o.email} · {formatDate(o.created_at)}
                      </small>
                    </div>
                    <div className="admin-dash-order__right">
                      <strong>{money(Number(o.total_cents))}</strong>
                      <span className="status-tag">
                        {states[o.status] || o.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="admin-card-help">No test orders placed yet.</p>
            )}
          </section>
        )}
      </div>

      {settings && (
        <section className="admin-card admin-overview-settings">
          <div className="admin-overview-header">
            <div>
              <strong>Store configuration</strong>
              <p>
                Domain: {settings.domain || "Default preview domain"} ·
                Shipping:{" "}
                {settings.shippingCents > 0
                  ? `${money(settings.shippingCents)}${
                      settings.freeShippingThresholdCents
                        ? ` (free over ${money(settings.freeShippingThresholdCents)})`
                        : ""
                    }`
                  : "Free ($0.00)"}{" "}
                · Pixels:{" "}
                {activePixels.length
                  ? activePixels.join(", ")
                  : "None configured"}
              </p>
            </div>
            <Link className="btn btn--outline" href="/admin/settings">
              Manage Settings & SEO
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

const queries: Record<string, string> = {
  products:
    "SELECT *,updated_at::text AS revision FROM products WHERE name ILIKE $1 OR sku ILIKE $1 ORDER BY created_at ASC, name ASC",
  orders:
    "SELECT number,email,status,subtotal_cents,shipping_cents,total_cents,carrier,tracking_url,created_at FROM orders WHERE number ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC",
  customers:
    "SELECT email,count(*)::int AS count,max(created_at) AS latest FROM orders WHERE email ILIKE $1 GROUP BY email ORDER BY latest DESC",
  support:
    "SELECT * FROM support_tickets WHERE number ILIKE $1 OR email ILIKE $1 OR topic ILIKE $1 ORDER BY created_at DESC",
  marketing:
    "SELECT email,consent_at FROM email_subscriptions WHERE email ILIKE $1 ORDER BY consent_at DESC",
  audit:
    "SELECT id,actor,action,entity,created_at FROM audit_log WHERE actor ILIKE $1 OR action ILIKE $1 OR entity ILIKE $1 ORDER BY created_at DESC",
};

function rowToBuilderData(row: Row): AdminProductData {
  const category = row.category === "Complexion" ? "Complexion" : "Skincare";
  const format = String(row.format ?? "Essential");
  const name = String(row.name ?? "");
  const description = String(row.description ?? "");
  const headline = String(row.headline ?? name);
  const ritual = String(row.ritual ?? description);
  const image = String(row.image ?? "oil-packshot");
  const alt = String(row.alt ?? name);
  const detailImages = parseDetailImages(row.detail_images);
  const quickFacts = parseQuickFacts(row.quick_facts);
  const builderBlocks = parseBuilderBlocks(row.builder_blocks);
  const facts = String(row.facts ?? "");
  const compareAt =
    row.compare_at_price_cents != null
      ? Number(row.compare_at_price_cents)
      : null;

  return {
    slug: String(row.slug),
    name,
    shortName: String(row.short_name ?? name),
    sku: String(row.sku ?? ""),
    category,
    format,
    description,
    headline,
    ritual,
    facts: facts || `${format} · ${category}`,
    ingredients: String(
      row.ingredients ||
        "The full ingredient list will be available after product approval.",
    ),
    packaging: String(
      row.packaging || "Recyclable outer packaging and studio-tested bottle.",
    ),
    quickFacts: quickFacts.length
      ? quickFacts
      : defaultQuickFacts(category, format),
    builderBlocks: builderBlocks.length
      ? builderBlocks
      : defaultBuilderBlocks({
          name,
          category,
          headline,
          description,
          ritual,
          facts,
          image,
          alt,
          detailImages,
        }),
    priceUsd: (Number(row.price_cents) / 100).toFixed(2),
    comparePriceUsd: compareAt != null ? (compareAt / 100).toFixed(2) : "",
    costUsd: (Number(row.cost_cents ?? 0) / 100).toFixed(2),
    stock: Number(row.stock ?? 0),
    published: Boolean(row.published),
    image,
    alt,
    color: String(row.color ?? "#efe6dc"),
    detailImages,
    seoTitle: String(row.seo_title ?? ""),
    seoDescription: String(row.seo_description ?? ""),
    revision: String(row.revision ?? ""),
  };
}

async function ModuleContent({
  name,
  q,
  page,
  editSlug,
  isNew,
}: {
  name: string;
  q: string;
  page: number;
  editSlug?: string;
  isNew?: boolean;
}) {
  const database = await db();

  if (name === "products" && (isNew || editSlug)) {
    const allRows = await database.query<Row>(
      "SELECT *,updated_at::text AS revision FROM products ORDER BY created_at ASC, name ASC",
    );
    const allProducts = allRows.map((r) => ({
      slug: String(r.slug),
      name: String(r.name),
      priceCents: Number(r.price_cents),
      compareAtCents:
        r.compare_at_price_cents != null
          ? Number(r.compare_at_price_cents)
          : null,
      stock: Number(r.stock),
      published: Boolean(r.published),
      image: String(r.image ?? "oil-packshot"),
    }));

    if (isNew) {
      const fresh: AdminProductData = {
        slug: "",
        name: "New Skincare Essential",
        shortName: "",
        sku: `ELG-${Math.random().toString(36).slice(2, 6).toUpperCase()}-001`,
        category: "Skincare",
        format: "Daily essential",
        description:
          "A weightless daily formula crafted for soft, luminous skin.",
        headline: "Part of your everyday ritual.",
        ritual: "Apply morning and evening to clean skin.",
        facts: "50 mL / 1.7 fl oz · Fragrance-free",
        ingredients:
          "The full ingredient list will be available after product approval.",
        packaging: "Recyclable vessel and protective carton.",
        quickFacts: defaultQuickFacts("Skincare", "Daily essential"),
        builderBlocks: defaultBuilderBlocks({
          name: "New Skincare Essential",
          category: "Skincare",
          headline: "Part of your everyday ritual.",
          description:
            "A weightless daily formula crafted for soft, luminous skin.",
          ritual: "Apply morning and evening to clean skin.",
          facts: "50 mL / 1.7 fl oz · Fragrance-free",
          image: "oil-packshot",
          alt: "New Skincare Essential",
          detailImages: [
            {
              name: "oil-macro",
              alt: "Formula texture close-up",
              label: "Texture",
            },
          ],
        }),
        priceUsd: "34.95",
        comparePriceUsd: "",
        costUsd: "0.00",
        stock: 40,
        published: true,
        image: "oil-packshot",
        alt: "New Skincare Essential",
        color: "#f8efe9",
        detailImages: [
          {
            name: "oil-macro",
            alt: "Formula texture close-up",
            label: "Texture",
          },
        ],
        seoTitle: "",
        seoDescription: "",
        revision: "",
      };
      return (
        <ProductBuilderStudio
          key="new-product"
          mode="create"
          initial={fresh}
          allProducts={allProducts}
          createAction={createProduct}
          saveAction={saveProduct}
          deleteAction={deleteProduct}
        />
      );
    }

    const match = allRows.find((r) => String(r.slug) === editSlug);
    if (!match) {
      return (
        <div className="admin-card">
          <p>Product not found.</p>
          <Link className="btn btn--outline" href="/admin/products">
            Back to products
          </Link>
        </div>
      );
    }

    return (
      <ProductBuilderStudio
        key={String(match.slug) + ":" + String(match.revision)}
        mode="edit"
        initial={rowToBuilderData(match)}
        allProducts={allProducts}
        createAction={createProduct}
        saveAction={saveProduct}
        deleteAction={deleteProduct}
      />
    );
  }

  if (name === "products") {
    const rows = await database.query<Row>(queries.products, ["%" + q + "%"]);
    return (
      <>
        <div className="admin-products-bar">
          <form className="admin-search">
            <label>
              <span>Search products</span>
              <input type="search" name="q" defaultValue={q} maxLength={100} />
            </label>
            <button className="btn btn--outline">Search</button>
          </form>
          <Link className="btn btn--fern" href="/admin/products?new=1">
            + Add product with Visual Builder
          </Link>
        </div>

        {!rows.length ? (
          <p className="admin-empty">No matching products.</p>
        ) : (
          <div className="admin-product-grid">
            {rows.map((row) => {
              const compareAt =
                row.compare_at_price_cents != null
                  ? Number(row.compare_at_price_cents)
                  : null;
              const priceCents = Number(row.price_cents);
              return (
                <article className="admin-product-card" key={String(row.slug)}>
                  <Link
                    href={`/admin/products?edit=${encodeURIComponent(
                      String(row.slug),
                    )}`}
                    className="admin-product-card__media"
                  >
                    <img
                      src={productImageUrl(String(row.image || "oil-packshot"))}
                      alt={String(row.name)}
                    />
                    <span className="status-tag">
                      {row.published ? "Published" : "Hidden"}
                    </span>
                  </Link>
                  <div className="admin-product-card__body">
                    <p className="eyebrow">{String(row.sku)}</p>
                    <h2>{String(row.name)}</h2>
                    <div className="admin-product-card__meta">
                      <strong>{money(priceCents)}</strong>
                      {compareAt != null && compareAt > priceCents && (
                        <s className="price-compare">{money(compareAt)}</s>
                      )}
                      <span>· {String(row.stock)} in stock</span>
                    </div>
                    <div className="admin-product-card__actions">
                      <Link
                        className="btn btn--fern"
                        href={`/admin/products?edit=${encodeURIComponent(
                          String(row.slug),
                        )}`}
                      >
                        Edit in Visual Builder
                      </Link>
                      <Link
                        className="underline-link"
                        href={productUrl(String(row.slug))}
                        target="_blank"
                      >
                        Live ↗
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </>
    );
  }

  if (name === "settings") {
    const s = await getSiteSettings();
    return (
      <form className="admin-entries" action={saveSettings}>
        <section className="admin-card">
          <h2 className="admin-card-title">Domain & Main Page SEO</h2>
          <p className="admin-card-help">
            Set the canonical store domain and search metadata for the home
            page. Product-level SEO can be edited on each product inside{" "}
            <Link className="underline-link" href="/admin/products">
              Products & Builder
            </Link>
            .
          </p>
          <div className="form">
            <label>
              Custom domain
              <input
                name="domain"
                maxLength={200}
                placeholder="https://www.eleganzaskincare.com"
                defaultValue={s.domain ?? ""}
              />
            </label>
            <label>
              Main page search title (SEO title)
              <input
                name="homeSeoTitle"
                maxLength={110}
                placeholder="Eleganza Skincare | Beautiful Skin. Timeless Elegance."
                defaultValue={s.homeSeoTitle ?? ""}
              />
            </label>
            <label>
              Main page search description (SEO description)
              <textarea
                name="homeSeoDescription"
                rows={3}
                maxLength={230}
                placeholder="Explore Eleganza Skincare face oil and complexion essentials for your everyday beauty routine."
                defaultValue={s.homeSeoDescription ?? ""}
              />
            </label>
          </div>
        </section>

        <section className="admin-card">
          <h2 className="admin-card-title">Tracking Pixels & Ads Tags</h2>
          <p className="admin-card-help">
            Enter your pixel IDs to load tracking tags on the storefront. Leave
            a field blank to disable that tag.
          </p>
          <div className="form">
            <div className="admin-fields">
              <label>
                Facebook Pixel ID
                <input
                  name="facebookPixelId"
                  maxLength={32}
                  pattern="[0-9]{10,22}"
                  placeholder="123456789012345"
                  defaultValue={s.facebookPixelId ?? ""}
                />
              </label>
              <label>
                TikTok Pixel ID
                <input
                  name="tiktokPixelId"
                  maxLength={32}
                  pattern="[A-Za-z0-9]{8,32}"
                  placeholder="CXXXXXXXXXXXXXXXXX"
                  defaultValue={s.tiktokPixelId ?? ""}
                />
              </label>
            </div>
            <div className="admin-fields">
              <label>
                Pinterest Pixel (Tag ID)
                <input
                  name="pinterestPixelId"
                  maxLength={32}
                  pattern="[0-9]{10,22}"
                  placeholder="2612345678901"
                  defaultValue={s.pinterestPixelId ?? ""}
                />
              </label>
              <label>
                Google Ads Tag ID
                <input
                  name="googleAdsId"
                  maxLength={32}
                  pattern="(AW|G|GT)-[A-Za-z0-9]{5,20}"
                  placeholder="AW-123456789"
                  defaultValue={s.googleAdsId ?? ""}
                />
              </label>
            </div>
            <label>
              Google Ads Conversion Label <span>(optional)</span>
              <input
                name="googleAdsLabel"
                maxLength={40}
                pattern="[A-Za-z0-9_-]{4,40}"
                placeholder="AbCdEfGhIjKlMnOpQr"
                defaultValue={s.googleAdsLabel ?? ""}
              />
            </label>
          </div>
        </section>

        <section className="admin-card">
          <h2 className="admin-card-title">Shipping Charge Settings</h2>
          <p className="admin-card-help">
            Configure the flat shipping charge applied at checkout and in the
            shopping bag.
          </p>
          <div className="form">
            <div className="admin-fields">
              <label>
                Shipping charge (USD)
                <input
                  name="shippingCharge"
                  inputMode="decimal"
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  defaultValue={(s.shippingCents / 100).toFixed(2)}
                />
              </label>
              <label>
                Free shipping over (USD) <span>(optional)</span>
                <input
                  name="freeShippingThreshold"
                  inputMode="decimal"
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  placeholder="e.g. 75.00"
                  defaultValue={
                    s.freeShippingThresholdCents != null
                      ? (s.freeShippingThresholdCents / 100).toFixed(2)
                      : ""
                  }
                />
              </label>
            </div>
            <label>
              Shipping method label
              <input
                name="shippingLabel"
                maxLength={80}
                defaultValue={s.shippingLabel}
              />
            </label>
          </div>
        </section>

        <div>
          <button className="btn btn--fern">Save settings</button>
        </div>
      </form>
    );
  }

  if (name === "content") {
    const rows = await database.query("SELECT * FROM pages");
    const index = new Map(rows.map((row) => [row.slug, row]));
    return (
      <div className="admin-entries">
        <div className="admin-card admin-callout">
          <span>
            Looking for Main Page (Home) SEO, Domain, Pixels, or Shipping?
          </span>
          <Link className="underline-link" href="/admin/settings">
            Open Settings & SEO
          </Link>
        </div>
        {Object.entries(infoPages).map(([slug, defaults]) => {
          const row = index.get(slug);
          return (
            <details className="admin-card" key={slug}>
              <summary>
                {defaults.title}
                <span className="status-tag">
                  {row?.published ? "Published" : "Preview default"}
                </span>
              </summary>
              <form className="form" action={savePage}>
                <input type="hidden" name="slug" value={slug} />
                <label>
                  Title
                  <input
                    required
                    name="title"
                    maxLength={110}
                    defaultValue={String(row?.title ?? defaults.title)}
                  />
                </label>
                <label>
                  Page copy
                  <textarea
                    name="body"
                    rows={4}
                    maxLength={5000}
                    defaultValue={String(row?.body ?? defaults.body)}
                  />
                </label>
                <label>
                  Search title (SEO)
                  <input
                    name="seoTitle"
                    maxLength={110}
                    defaultValue={String(row?.seo_title ?? "")}
                  />
                </label>
                <label>
                  Search description (SEO)
                  <textarea
                    name="seo"
                    rows={2}
                    maxLength={230}
                    defaultValue={String(row?.seo_description ?? "")}
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={Boolean(row?.published)}
                  />{" "}
                  Show this revision in the storefront preview
                </label>
                <button className="btn btn--fern">Save page</button>
              </form>
            </details>
          );
        })}
      </div>
    );
  }

  const rows = await database.query(queries[name] + " LIMIT $2 OFFSET $3", [
    "%" + q + "%",
    PAGE_SIZE + 1,
    (page - 1) * PAGE_SIZE,
  ]);
  const visible = rows.slice(0, PAGE_SIZE);
  const pageUrl = (next: number) =>
    "/admin/" +
    name +
    "?" +
    new URLSearchParams({ p: String(next), q }).toString();
  return (
    <>
      <form className="admin-search">
        <label>
          <span>Search {modules[name].label.toLowerCase()}</span>
          <input type="search" name="q" defaultValue={q} maxLength={100} />
        </label>
        <button className="btn btn--outline">Search</button>
      </form>
      {!visible.length ? (
        <p className="admin-empty">No matching records.</p>
      ) : (
        <div className="admin-entries">
          {visible.map((row) => (
            <Record
              key={String(row.slug || row.number || row.id || row.email)}
              row={row}
              module={name}
            />
          ))}
        </div>
      )}
      {(page > 1 || rows.length > PAGE_SIZE) && (
        <nav className="admin-pagination" aria-label="Pagination">
          {page > 1 && <Link href={pageUrl(page - 1)}>← Previous</Link>}
          <span>Page {page}</span>
          {rows.length > PAGE_SIZE && (
            <Link href={pageUrl(page + 1)}>Next →</Link>
          )}
        </nav>
      )}
    </>
  );
}

function Record({ row, module }: { row: Row; module: string }) {
  if (module === "orders")
    return (
      <details className="admin-card">
        <summary>
          <span>
            {String(row.number)} · {money(Number(row.total_cents))}
          </span>
          <span className="status-tag">{states[String(row.status)]}</span>
        </summary>
        <p>
          {String(row.email)} · {formatDate(String(row.created_at))}
          {Number(row.shipping_cents || 0) > 0
            ? ` · Shipping ${money(Number(row.shipping_cents))}`
            : ""}
        </p>
        <OrderDetails number={String(row.number)} />
        {(row.status === "test_paid" || row.status === "shipped") && (
          <form className="form" action={fulfill}>
            <input type="hidden" name="number" value={String(row.number)} />
            <label>
              Carrier
              <input
                name="carrier"
                maxLength={80}
                defaultValue={String(row.carrier ?? "")}
              />
            </label>
            <label>
              Tracking URL
              <input
                name="tracking"
                type="url"
                maxLength={480}
                defaultValue={String(row.tracking_url ?? "")}
              />
            </label>
            <button className="btn btn--fern">
              {row.status === "shipped" ? "Mark delivered" : "Mark shipped"}
            </button>
          </form>
        )}
      </details>
    );
  if (module === "support")
    return (
      <details className="admin-card">
        <summary>
          {String(row.number)} · {String(row.topic)}
          <span className="status-tag">{String(row.status)}</span>
        </summary>
        <p>
          {String(row.name)} · {String(row.email)} ·{" "}
          {formatDate(String(row.created_at))}
        </p>
        <p className="support-message">{String(row.message)}</p>
        {row.status === "open" && (
          <form action={resolveTicket}>
            <input type="hidden" name="number" value={String(row.number)} />
            <button className="btn btn--fern">Resolve request</button>
          </form>
        )}
      </details>
    );
  if (module === "audit")
    return (
      <div className="admin-record">
        <span>
          <strong>{String(row.action)}</strong>
          <small>
            {String(row.actor)} · {String(row.entity)}
          </small>
        </span>
        <span>{formatDate(String(row.created_at))}</span>
      </div>
    );
  return (
    <div className="admin-record">
      <span>
        <strong>{String(row.email)}</strong>
        {module === "customers" && (
          <small>{String(row.count)} preview orders</small>
        )}
      </span>
      <span>{formatDate(String(row.latest || row.consent_at))}</span>
    </div>
  );
}

async function OrderDetails({ number }: { number: string }) {
  const lines = await (
    await db()
  ).query<{ name: string; qty: number; price_cents: number }>(
    "SELECT i.name,i.qty,i.price_cents FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.number=$1 ORDER BY i.name",
    [number],
  );
  return (
    <ul className="admin-order-lines">
      {lines.map((line) => (
        <li key={line.name}>
          {line.name} × {line.qty}{" "}
          <span>{money(line.price_cents * line.qty)}</span>
        </li>
      ))}
    </ul>
  );
}
