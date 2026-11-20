import type { Metadata } from "next";
import { ProductGrid } from "@/components/product-grid";
import { Icon } from "@/components/icon";
import { getCatalog } from "@/lib/db";

export const metadata: Metadata = { title: "Search" };
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const products = (await getCatalog()).filter((p) =>
    [p.name, p.category, p.format].some((value) =>
      value.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  return (
    <section className="shell utility search-page">
      <div className="utility-heading">
        <p className="eyebrow">Explore Eleganza</p>
        <h1>
          Search<em>.</em>
        </h1>
        <form className="search-input">
          <input
            name="q"
            type="search"
            aria-label="Search products"
            defaultValue={query}
            placeholder="Search the collection"
            maxLength={100}
          />
          <button className="icon-button" aria-label="Search">
            <Icon name="search" />
          </button>
        </form>
      </div>
      <p>
        {query
          ? `${products.length} results for “${query}”`
          : "Browse the collection"}
      </p>
      <ProductGrid products={products} />
    </section>
  );
}
