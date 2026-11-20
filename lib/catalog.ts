export type ProductImage = { name: string; alt: string; label: string };

export type QuickFact = { label: string; value: string };

export type BuilderBlockType =
  | "ritual"
  | "feature"
  | "benefits"
  | "specs"
  | "accordion"
  | "banner"
  | "image";

export type BuilderBlock = {
  id: string;
  type: BuilderBlockType;
  eyebrow?: string;
  heading?: string;
  body?: string;
  image?: string;
  alt?: string;
  imageSide?: "left" | "right";
  tone?: "blush" | "sand" | "cream" | "white";
  steps?: string[];
  items?: { title: string; detail: string }[];
  ctaLabel?: string;
  ctaType?: "add_to_bag" | "link" | "none";
  ctaHref?: string;
};

export type StoreProduct = {
  slug: string;
  name: string;
  short: string;
  category: "Skincare" | "Complexion";
  format: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  headline: string;
  description: string;
  ritual: string;
  facts: string;
  quickFacts: QuickFact[];
  ingredients: string;
  packaging: string;
  builderBlocks: BuilderBlock[];
  image: string;
  alt: string;
  color: string;
  detailImages: ProductImage[];
  stock: number;
  seoTitle?: string;
  seoDescription?: string;
};

export function defaultQuickFacts(
  category: "Skincare" | "Complexion",
  format: string,
): QuickFact[] {
  if (category === "Skincare") {
    return [
      { label: "Texture", value: format || "Silky botanical oil" },
      { label: "Finish", value: "Dewy, luminous glow" },
      { label: "Skin type", value: "All skin types" },
    ];
  }
  return [
    { label: "Texture", value: format || "Weightless cream" },
    { label: "Finish", value: "Natural satin skin" },
    { label: "Coverage", value: "Buildable everyday" },
  ];
}

export function defaultBuilderBlocks(product: {
  name: string;
  category: "Skincare" | "Complexion";
  headline: string;
  description: string;
  ritual: string;
  facts?: string;
  image: string;
  alt: string;
  detailImages: ProductImage[];
}): BuilderBlock[] {
  const ritualImg = product.detailImages[1]?.name || product.detailImages[0]?.name || product.image;
  const featureImg = product.detailImages[0]?.name || product.image;
  const isSkincare = product.category === "Skincare";
  return [
    {
      id: "ritual-default",
      type: "ritual",
      eyebrow: "How to use",
      heading: product.headline || "Part of your everyday ritual.",
      body: product.ritual || product.description,
      image: ritualImg,
      alt: product.detailImages[1]?.alt || product.alt || product.name,
      imageSide: "left",
      tone: "blush",
      steps: isSkincare
        ? [
            "Start with clean, slightly damp skin morning or evening.",
            "Warm two to three drops between clean fingertips.",
            "Press gently across cheeks, forehead, and neck before makeup.",
          ]
        : [
            "Prep skin with facial oil or your daily moisturizer.",
            "Apply sparingly where you want soft, even-looking coverage.",
            "Blend outward with fingertips, a sponge, or a soft brush.",
          ],
      ctaType: "none",
    },
    {
      id: "feature-default",
      type: "feature",
      eyebrow: product.name,
      heading: product.description,
      body: product.facts || "Crafted for an effortless daily routine.",
      image: featureImg,
      alt: product.detailImages[0]?.alt || product.alt || product.name,
      imageSide: "right",
      tone: "sand",
      ctaType: "add_to_bag",
      ctaLabel: "Add to bag",
    },
  ];
}

export type SiteSettings = {
  domain: string | null;
  homeSeoTitle: string | null;
  homeSeoDescription: string | null;
  facebookPixelId: string | null;
  tiktokPixelId: string | null;
  pinterestPixelId: string | null;
  googleAdsId: string | null;
  googleAdsLabel: string | null;
  shippingCents: number;
  freeShippingThresholdCents: number | null;
  shippingLabel: string;
};

export const defaultSiteSettings: SiteSettings = {
  domain: null,
  homeSeoTitle: null,
  homeSeoDescription: null,
  facebookPixelId: null,
  tiktokPixelId: null,
  pinterestPixelId: null,
  googleAdsId: null,
  googleAdsLabel: null,
  shippingCents: 0,
  freeShippingThresholdCents: null,
  shippingLabel: "Standard Shipping",
};

export function calculateShippingCents(
  subtotalCents: number,
  settings: Pick<SiteSettings, "shippingCents" | "freeShippingThresholdCents">,
): number {
  if (subtotalCents <= 0 || settings.shippingCents <= 0) return 0;
  if (
    settings.freeShippingThresholdCents != null &&
    settings.freeShippingThresholdCents > 0 &&
    subtotalCents >= settings.freeShippingThresholdCents
  ) {
    return 0;
  }
  return settings.shippingCents;
}

export function normalizeDomainOrigin(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : "https://" + trimmed;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!parsed.hostname || parsed.hostname.includes(" ")) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveBaseOrigin(
  configuredDomain?: string | null,
  envOrigin = process.env.APP_ORIGIN,
): string {
  return (
    normalizeDomainOrigin(configuredDomain) ||
    normalizeDomainOrigin(envOrigin) ||
    "https://www.eleganzaskincare.com"
  );
}

export const builtInProductImages = [
  { key: "oil-packshot", label: "Face Oil — Studio bottle" },
  { key: "oil-detail", label: "Face Oil — Packaging detail" },
  { key: "oil-macro", label: "Face Oil — Texture drop" },
  { key: "concealer-packshot", label: "Concealer — Studio vial" },
  { key: "concealer-detail", label: "Concealer — Packaging detail" },
  { key: "concealer-macro", label: "Concealer — Texture swipe" },
  { key: "foundation-packshot", label: "Foundation — Studio bottle" },
  { key: "foundation-detail", label: "Foundation — Packaging detail" },
  { key: "foundation-macro", label: "Foundation — Texture ribbon" },
  { key: "contour-packshot", label: "Contour — Studio stick" },
  { key: "contour-detail", label: "Contour — Packaging detail" },
  { key: "contour-macro", label: "Contour — Texture balm" },
  { key: "campaign", label: "Editorial — Campaign still" },
  { key: "portrait", label: "Editorial — Portrait" },
  { key: "amber-study", label: "Editorial — Amber study" },
] as const;

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const productUrl = (slug: string) => "/products/" + slug;
export const motto = "Beautiful Skin. Timeless Elegance.";
export const editorial = [
  {
    image: "campaign",
    alt: "Amber glass dropper bottle on travertine with an ivory calla lily",
    title: "The Radiance Edit",
  },
  {
    image: "portrait",
    alt: "Woman in warm sunlight with her hand resting against her face",
    title: "The Everyday Ritual",
  },
  {
    image: "amber-study",
    alt: "A sculptural amber drop suspended above a limestone disc",
    title: "An Amber Study",
  },
];
