import Link from "next/link";
import type { ReactNode } from "react";
import { type BuilderBlock, money, type StoreProduct } from "@/lib/catalog";
import { Photo } from "./image";

const TONE_CLASS: Record<NonNullable<BuilderBlock["tone"]>, string> = {
  blush: "tone-blush",
  sand: "tone-sand",
  cream: "tone-cream",
  white: "tone-white",
};

function BlockCta({
  block,
  product,
  renderAddToBag,
}: {
  block: BuilderBlock;
  product: Pick<StoreProduct, "slug" | "name" | "price" | "stock">;
  renderAddToBag?: (label: string) => ReactNode;
}) {
  if (!block.ctaType || block.ctaType === "none") return null;
  if (block.ctaType === "add_to_bag") {
    const label = `${block.ctaLabel || "Add to bag"} — ${money(product.price)}`;
    if (renderAddToBag) return <>{renderAddToBag(label)}</>;
    return (
      <span className="btn btn--fern">
        {label}
      </span>
    );
  }
  if (block.ctaType === "link" && block.ctaLabel) {
    const href = block.ctaHref || "/collections/all";
    return (
      <Link className="btn btn--fern" href={href}>
        {block.ctaLabel}
      </Link>
    );
  }
  return null;
}

export function ProductBuilderBlocks({
  blocks,
  product,
  renderAddToBag,
  wrapBlock,
}: {
  blocks: BuilderBlock[];
  product: Pick<StoreProduct, "slug" | "name" | "price" | "stock">;
  renderAddToBag?: (label: string) => ReactNode;
  wrapBlock?: (block: BuilderBlock, index: number, node: ReactNode) => ReactNode;
}) {
  if (!blocks.length) return null;

  return (
    <div className="product-story">
      {blocks.map((block, index) => {
        const tone = TONE_CLASS[block.tone || (block.type === "ritual" ? "blush" : "sand")];
        let node: ReactNode = null;

        if (block.type === "ritual" || block.type === "feature") {
          const isReverse = block.imageSide === "right";
          const media = (
            <div className="pdp-split__media">
              <Photo
                name={block.image || "oil-detail"}
                alt={block.alt || block.heading || product.name}
                sizes="(max-width: 780px) 100vw, 50vw"
              />
            </div>
          );
          const copy = (
            <div className="pdp-split__copy">
              {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
              {block.heading && <h2>{block.heading}</h2>}
              {block.body && <p className="pdp-split__body">{block.body}</p>}
              {block.steps && block.steps.length > 0 && (
                <ol className="pdp-steps">
                  {block.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
              <BlockCta
                block={block}
                product={product}
                renderAddToBag={renderAddToBag}
              />
            </div>
          );

          node = (
            <section
              className={`pdp-split ${tone} ${
                isReverse ? "pdp-split--reverse" : ""
              } ${block.type === "ritual" ? "pdp-split--ritual" : "pdp-split--feature"}`}
            >
              {isReverse ? (
                <>
                  {copy}
                  {media}
                </>
              ) : (
                <>
                  {media}
                  {copy}
                </>
              )}
            </section>
          );
        } else if (block.type === "benefits") {
          node = (
            <section className={`pdp-benefits-section ${tone}`}>
              <div className="pdp-section-head">
                {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
                {block.heading && <h2>{block.heading}</h2>}
                {block.body && <p>{block.body}</p>}
              </div>
              <div className="pdp-benefits-grid">
                {(block.items || []).map((item, idx) => (
                  <article className="pdp-benefit-card" key={idx}>
                    <span className="pdp-benefit-num">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        } else if (block.type === "specs") {
          node = (
            <section className={`pdp-specs-section ${tone}`}>
              {(block.eyebrow || block.heading) && (
                <div className="pdp-section-head">
                  {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
                  {block.heading && <h2>{block.heading}</h2>}
                </div>
              )}
              <dl className="product-quick-facts product-quick-facts--wide">
                {(block.items || []).map((item, idx) => (
                  <div key={idx}>
                    <dt>{item.title}</dt>
                    <dd>{item.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        } else if (block.type === "accordion") {
          node = (
            <section className={`pdp-accordion-section ${tone}`}>
              {(block.eyebrow || block.heading) && (
                <div className="pdp-section-head">
                  {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
                  {block.heading && <h2>{block.heading}</h2>}
                </div>
              )}
              <div className="accordion-group">
                {(block.items || []).map((item, idx) => (
                  <details key={idx} open={idx === 0}>
                    <summary>
                      {item.title}
                      <span aria-hidden="true" />
                    </summary>
                    <p>{item.detail}</p>
                  </details>
                ))}
              </div>
            </section>
          );
        } else if (block.type === "banner") {
          node = (
            <section className={`pdp-banner ${tone}`}>
              {block.eyebrow && <p className="eyebrow">{block.eyebrow}</p>}
              {block.heading && <h2>{block.heading}</h2>}
              {block.body && <p>{block.body}</p>}
              <BlockCta
                block={block}
                product={product}
                renderAddToBag={renderAddToBag}
              />
            </section>
          );
        } else if (block.type === "image") {
          node = (
            <section className={`pdp-showcase ${tone}`}>
              <div className="pdp-showcase__frame">
                <Photo
                  name={block.image || "campaign"}
                  alt={block.alt || block.heading || product.name}
                  sizes="(max-width: 780px) 100vw, 90vw"
                />
              </div>
              {(block.heading || block.body) && (
                <div className="pdp-showcase__caption">
                  {block.heading && <h3>{block.heading}</h3>}
                  {block.body && <p>{block.body}</p>}
                </div>
              )}
            </section>
          );
        }

        if (!node) return null;
        return wrapBlock ? (
          <div key={block.id}>{wrapBlock(block, index, node)}</div>
        ) : (
          <div key={block.id}>{node}</div>
        );
      })}
    </div>
  );
}
