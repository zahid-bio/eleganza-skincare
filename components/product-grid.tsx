"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { money, productUrl, type StoreProduct } from "@/lib/catalog";
import { Icon } from "./icon";
import { Photo } from "./image";
import { useStore } from "./store";

export function ProductCard({ product }: { product: StoreProduct }) {
  const { add } = useStore();
  const hasCompare =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  return (
    <article className="shop-card">
      <Link
        className="shop-card__media"
        href={productUrl(product.slug)}
        aria-label={product.name}
        style={{ backgroundColor: product.color }}
      >
        <Photo
          name={product.image}
          alt={product.alt}
          sizes="(max-width: 650px) 48vw, 25vw"
        />
      </Link>
      <div className="shop-card__body">
        <h3>
          <Link href={productUrl(product.slug)}>{product.name}</Link>
        </h3>
        <p className="shop-card__summary">{product.description}</p>
        <p className="shop-card__facts">{product.facts}</p>
        <div className="shop-card__price-row">
          <span className="shop-card__price">{money(product.price)}</span>
          {hasCompare && (
            <s className="price-compare">{money(product.compareAtPrice!)}</s>
          )}
          {hasCompare && (
            <span className="price-save">
              Save {money(product.compareAtPrice! - product.price)}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn--outline shop-card__cta"
          disabled={product.stock < 1}
          onClick={() => add(product, 1)}
        >
          {product.stock > 0 ? (
            <>
              <span>Add to bag</span>
              <Icon name="plus" size={15} />
            </>
          ) : (
            <span>Unavailable</span>
          )}
        </button>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  columns = 4,
}: {
  products: StoreProduct[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={
        columns === 3 ? "shop-grid shop-grid--related" : "shop-grid"
      }
    >
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}

export function CollectionGrid({ products }: { products: StoreProduct[] }) {
  const [sort, setSort] = useState("featured");
  const ordered = useMemo(() => {
    if (sort === "low") return [...products].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...products].sort((a, b) => b.price - a.price);
    return products;
  }, [products, sort]);
  return (
    <>
      <div className="collection-controls">
        <span>
          {products.length} {products.length === 1 ? "product" : "products"}
        </span>
        <label>
          Sort by{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price, low to high</option>
            <option value="high">Price, high to low</option>
          </select>
        </label>
      </div>
      {ordered.length ? (
        <ProductGrid products={ordered} />
      ) : (
        <p>There are no products in this collection yet.</p>
      )}
    </>
  );
}

const STAGE_CATEGORIES = [
  { key: "skincare", label: "skincare", pill: "Glow" },
  { key: "all", label: "all formulas", pill: "All" },
  { key: "complexion", label: "complexion", pill: "Complexion" },
] as const;

export function HomeCollectionStage({
  products,
}: {
  products: StoreProduct[];
}) {
  const [activeKey, setActiveKey] =
    useState<(typeof STAGE_CATEGORIES)[number]["key"]>("all");
  const [sort, setSort] = useState("featured");

  const activeIndex = STAGE_CATEGORIES.findIndex((c) => c.key === activeKey);
  function stepCategory(delta: number) {
    const next =
      (activeIndex + delta + STAGE_CATEGORIES.length) %
      STAGE_CATEGORIES.length;
    setActiveKey(STAGE_CATEGORIES[next].key);
  }

  const filtered = useMemo(() => {
    const base =
      activeKey === "all"
        ? products
        : products.filter((p) =>
            activeKey === "skincare"
              ? p.category === "Skincare"
              : p.category === "Complexion",
          );
    if (sort === "low") return [...base].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...base].sort((a, b) => b.price - a.price);
    return base;
  }, [products, activeKey, sort]);

  return (
    <section className="home-collection" id="collection" aria-label="Collection">
      <div className="cat-stage">
        <div className="cat-stage__backdrop" aria-hidden="true">
          <Photo
            name="campaign"
            alt=""
            sizes="100vw"
          />
        </div>
        <div className="cat-stage__inner shell">
          <button
            type="button"
            className="cat-stage__arrow"
            aria-label="Previous category"
            onClick={() => stepCategory(-1)}
          >
            <Icon name="left" size={18} />
          </button>
          <div className="cat-stage__ticker" role="tablist" aria-label="Filter collection">
            {STAGE_CATEGORIES.map((cat) => {
              const selected = cat.key === activeKey;
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={
                    selected
                      ? "cat-stage__tab is-active"
                      : "cat-stage__tab"
                  }
                  onClick={() => setActiveKey(cat.key)}
                >
                  <span className="cat-stage__word">{cat.label}</span>
                  <span className="cat-stage__pill">{cat.pill}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="cat-stage__arrow"
            aria-label="Next category"
            onClick={() => stepCategory(1)}
          >
            <Icon name="right" size={18} />
          </button>
        </div>
      </div>

      <div className="shell home-collection__grid-wrap">
        <div className="collection-controls">
          <span>
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </span>
          <label>
            Sort by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price, low to high</option>
              <option value="high">Price, high to low</option>
            </select>
          </label>
        </div>
        {filtered.length ? (
          <ProductGrid products={filtered} />
        ) : (
          <p className="empty-collection">
            No products in this category yet.
          </p>
        )}
      </div>
    </section>
  );
}
