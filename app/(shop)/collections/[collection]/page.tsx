import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionGrid } from "@/components/product-grid";
import { getCatalog } from "@/lib/db";

const collections = {
  all: {
    name: "The Collection",
    description:
      "Skincare and complexion essentials for your everyday beauty routine.",
    category: null,
  },
  skincare: {
    name: "Skincare",
    description: "Begin your ritual with Radiance Renewal Face Oil.",
    category: "Skincare",
  },
  complexion: {
    name: "Complexion",
    description:
      "Concealer, foundation and contour for the way you like to wear makeup.",
    category: "Complexion",
  },
} as const;
type Props = { params: Promise<{ collection: string }> };

async function resolveCollection(params: Props["params"]) {
  const { collection } = await params;
  if (!Object.hasOwn(collections, collection)) notFound();
  const key = collection as keyof typeof collections;
  return { key, current: collections[key] };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key, current } = await resolveCollection(params);
  return {
    title: key === "all" ? "Shop All Skincare & Beauty" : current.name,
    description: current.description,
    alternates: { canonical: "/collections/" + key },
  };
}

export default async function Collection({ params }: Props) {
  const { key, current } = await resolveCollection(params);
  const products = (await getCatalog()).filter(
    (item) => !current.category || item.category === current.category,
  );
  return (
    <>
      <section className="page-heading">
        <div className="shell page-heading-inner">
          <div>
            <p className="eyebrow">Eleganza Skincare</p>
            <h1>
              {current.name}
              <em>.</em>
            </h1>
          </div>
          <p>{current.description}</p>
        </div>
      </section>
      <section className="collection-list shell" aria-label="Products">
        <nav className="pill-row" aria-label="Collections">
          {(
            [
              ["All essentials", "all"],
              ["Skincare", "skincare"],
              ["Complexion", "complexion"],
            ] as const
          ).map(([label, slug]) => (
            <Link
              className="pill"
              aria-current={key === slug ? "page" : undefined}
              href={"/collections/" + slug}
              key={slug}
            >
              {label}
            </Link>
          ))}
        </nav>
        <CollectionGrid key={key} products={products} />
      </section>
    </>
  );
}
