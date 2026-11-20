"use client";

import type { BuilderBlock, StoreProduct } from "@/lib/catalog";
import { ProductBuilderBlocks } from "./product-blocks";
import { StoryAddToBagButton } from "./product-detail";

export function ProductStoryClient({
  blocks,
  product,
}: {
  blocks: BuilderBlock[];
  product: StoreProduct;
}) {
  return (
    <ProductBuilderBlocks
      blocks={blocks}
      product={product}
      renderAddToBag={(label) => (
        <StoryAddToBagButton product={product} label={label} />
      )}
    />
  );
}
