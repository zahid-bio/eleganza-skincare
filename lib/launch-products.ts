import type { StoreProduct } from "./catalog";

type SeedProduct = Omit<
  StoreProduct,
  "facts" | "quickFacts" | "ingredients" | "packaging" | "builderBlocks"
> & {
  cost: number;
  facts?: string;
};

export const catalog: SeedProduct[] = [
  {
    slug: "radiance-renewal-face-oil",
    name: "Radiance Renewal Face Oil",
    short: "Radiance Renewal",
    category: "Skincare",
    format: "Face oil",
    price: 3997,
    cost: 1000,
    sku: "ELG-OIL-001",
    headline: "A few drops. A beautiful glow.",
    description:
      "A face oil designed to leave skin feeling soft and conditioned with a luminous-looking finish.",
    ritual:
      "As the first step in this edit, face oil gives the routine a moment of care before complexion makeup.",
    image: "oil-packshot",
    alt: "Amber glass facial oil bottle with an ivory paper label",
    detailImages: [
      {
        name: "oil-detail",
        alt: "Amber bottle and dropper collar in close-up",
        label: "Packaging detail",
      },
      {
        name: "oil-macro",
        alt: "A glass pipette holding a drop of golden face oil",
        label: "Texture",
      },
    ],
    color: "#e7d6bb",
    stock: 40,
  },
  {
    slug: "lumiveil-liquid-concealer",
    name: "LumiVeil Liquid Concealer",
    short: "LumiVeil",
    category: "Complexion",
    format: "Liquid concealer",
    price: 2997,
    cost: 700,
    sku: "ELG-CON-001",
    headline: "Beautifully blended. Effortlessly you.",
    description:
      "A liquid concealer for targeted, blendable complexion coverage.",
    ritual:
      "Use concealer where you’d like a little extra coverage as part of your complexion routine.",
    image: "concealer-packshot",
    alt: "Frosted concealer vial and angled applicator on muted rose plaster",
    detailImages: [
      {
        name: "concealer-detail",
        alt: "Frosted glass and the LumiVeil label in close-up",
        label: "Packaging detail",
      },
      {
        name: "concealer-macro",
        alt: "A close-up of the doe-foot applicator and a creamy concealer swipe",
        label: "Texture",
      },
    ],
    color: "#e9d9d0",
    stock: 40,
  },
  {
    slug: "satinluxe-foundation",
    name: "SatinLuxe Foundation",
    short: "SatinLuxe",
    category: "Complexion",
    format: "Foundation",
    price: 3497,
    cost: 900,
    sku: "ELG-FDN-001",
    headline: "A softly polished complexion.",
    description:
      "A complexion base designed for an even-looking, polished finish.",
    ritual:
      "Foundation sits at the heart of the complexion step, with concealer for targeted coverage.",
    image: "foundation-packshot",
    alt: "Beveled foundation bottle and espresso cap on oat-toned plaster",
    detailImages: [
      {
        name: "foundation-detail",
        alt: "The beveled glass and SatinLuxe label in close-up",
        label: "Packaging detail",
      },
      {
        name: "foundation-macro",
        alt: "A soft satin ribbon of warm beige foundation",
        label: "Texture",
      },
    ],
    color: "#d7c4ac",
    stock: 40,
  },
  {
    slug: "sculptglow-contour-stick",
    name: "SculptGlow Contour Stick",
    short: "SculptGlow",
    category: "Complexion",
    format: "Contour stick",
    price: 2997,
    cost: 700,
    sku: "ELG-CTR-001",
    headline: "Define. Blend. Glow.",
    description:
      "A creamy contour-format makeup stick for creating the appearance of dimension.",
    ritual:
      "Contour is the final step in the edit, wherever you want a little more definition.",
    image: "contour-packshot",
    alt: "Open contour stick and espresso cap on mauve stone",
    detailImages: [
      {
        name: "contour-detail",
        alt: "The opened SculptGlow balm and twist-up casing in close-up",
        label: "Packaging detail",
      },
      {
        name: "contour-macro",
        alt: "A crescent of cocoa-colored contour balm on pale stone",
        label: "Texture",
      },
    ],
    color: "#dbbdb3",
    stock: 40,
  },
];
