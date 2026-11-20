import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { productImageUrl } from "@/components/image";
import { ProductStoryClient } from "@/components/pdp-story-client";
import { Gallery, PurchaseBox } from "@/components/product-detail";
import { ProductGrid } from "@/components/product-grid";
import { money, productUrl } from "@/lib/catalog";
import { getCatalog, getSiteSettings } from "@/lib/db";
import "./product.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getCatalog()).find((product) => product.slug === slug);
  if (!p) notFound();
  return {
    title: p.seoTitle ? { absolute: p.seoTitle } : p.name,
    description: p.seoDescription || p.description,
    alternates: { canonical: productUrl(slug) },
    openGraph: {
      title: p.seoTitle || p.name,
      description: p.seoDescription || p.description,
      images: [{ url: productImageUrl(p.image), alt: p.alt }],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [products, settings] = await Promise.all([
    getCatalog(),
    getSiteSettings(),
  ]);
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  const gallery = [
    { name: product.image, alt: product.alt || product.name, label: "Product" },
    ...product.detailImages,
  ];
  const hasCompare =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <div className="product-page shell">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link href="/collections/all">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-page__layout">
        <Gallery key={slug} images={gallery} />

        <section className="product-page__info" aria-labelledby="product-name">
          <h1 id="product-name">{product.name}</h1>
          <p className="product-page__summary">{product.description}</p>
          <p className="product-page__facts">{product.facts}</p>

          <div className="pdp-price-bar">
            <strong className="pdp-price-main">{money(product.price)}</strong>
            {hasCompare && (
              <>
                <s className="price-compare">
                  {money(product.compareAtPrice!)}
                </s>
                <span className="pdp-save-badge">
                  Save {money(product.compareAtPrice! - product.price)}
                </span>
              </>
            )}
          </div>

          <PurchaseBox key={slug} product={product} />

          <div className="product-order-links">
            <Link href="/shipping-policy">Shipping and delivery</Link>
            <Link href="/returns-refunds">Returns</Link>
          </div>

          {product.quickFacts.length > 0 && (
            <dl className="product-quick-facts">
              {product.quickFacts.slice(0, 3).map((fact, idx) => (
                <div key={idx}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="accordion-group">
            <details>
              <summary>
                Ingredients
                <span aria-hidden="true" />
              </summary>
              <p>{product.ingredients}</p>
              <Link className="underline-link" href="/ingredients-and-safety">
                Ingredients & safety
              </Link>
            </details>

            <details>
              <summary>
                Formula and packaging
                <span aria-hidden="true" />
              </summary>
              <p>{product.packaging}</p>
              <p className="pdp-sku-line">SKU: {product.sku}</p>
            </details>

            <details>
              <summary>
                Shipping & returns
                <span aria-hidden="true" />
              </summary>
              <p>
                {settings.shippingCents > 0
                  ? `${settings.shippingLabel} is ${money(settings.shippingCents)}${
                      settings.freeShippingThresholdCents != null &&
                      settings.freeShippingThresholdCents > 0
                        ? ` (free on orders over ${money(settings.freeShippingThresholdCents)})`
                        : ""
                    }.`
                  : "Live shipping and returns start after the store opens."}
              </p>
              <Link className="underline-link" href="/shipping-policy">
                Shipping & Delivery
              </Link>
            </details>
          </div>
        </section>
      </div>

      <ProductStoryClient blocks={product.builderBlocks} product={product} />

      <section className="product-companions" aria-labelledby="related-heading">
        <h2 id="related-heading">More for your routine</h2>
        <ProductGrid
          columns={3}
          products={products.filter((p) => p.slug !== slug).slice(0, 3)}
        />
      </section>
    </div>
  );
}
