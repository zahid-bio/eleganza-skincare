import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import {
  defaultBuilderBlocks,
  defaultQuickFacts,
  defaultSiteSettings,
  type BuilderBlock,
  type BuilderBlockType,
  type ProductImage,
  type QuickFact,
  type SiteSettings,
  type StoreProduct,
} from "./catalog";
import { catalog } from "./launch-products";

export type Query = <T extends Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) => Promise<T[]>;
type Database = {
  query: Query;
  exec: (sql: string) => Promise<void>;
  transaction: <T>(fn: (query: Query) => Promise<T>) => Promise<T>;
};
const instance = globalThis as typeof globalThis & {
  eleganzaDatabase?: Promise<Database>;
};

async function createDatabase(): Promise<Database> {
  let adapter: Database;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 6,
      connectionTimeoutMillis: 5_000,
    });
    adapter = {
      query: async (sql, params) => (await pool.query(sql, params)).rows,
      exec: async (sql) => {
        await pool.query(sql);
      },
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn(
            async (sql, params) => (await client.query(sql, params)).rows,
          );
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
  } else {
    const directory = process.env.PGLITE_DIR || path.resolve(".data/eleganza");
    if (directory !== "memory://")
      await mkdir(path.dirname(directory), { recursive: true });
    const local = new PGlite(directory);
    adapter = {
      query: async <T extends Record<string, unknown>>(
        sql: string,
        params?: unknown[],
      ) => (await local.query<T>(sql, params)).rows,
      exec: async (sql) => {
        await local.exec(sql);
      },
      transaction: (fn) =>
        local.transaction((tx) =>
          fn(
            async <T extends Record<string, unknown>>(
              sql: string,
              params?: unknown[],
            ) => (await tx.query<T>(sql, params)).rows,
          ),
        ),
    };
  }
  const schema = await readFile(
    path.join(process.cwd(), "db/001_initial.sql"),
    "utf8",
  );
  await adapter.exec(
    process.env.DATABASE_URL
      ? `BEGIN; SELECT pg_advisory_xact_lock(888078192); ${schema} COMMIT;`
      : schema,
  );
  await adapter.transaction(async (query) => {
    for (const [index, p] of catalog.entries()) {
      await query(
        `INSERT INTO products(
          slug,name,description,sku,price_cents,compare_at_price_cents,cost_cents,stock,
          short_name,category,format,headline,ritual,image,alt,color,detail_images,created_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,now() + ($18 * interval '1 millisecond'))
        ON CONFLICT(slug) DO UPDATE SET
          short_name = COALESCE(products.short_name, EXCLUDED.short_name),
          category = CASE WHEN products.short_name IS NULL THEN EXCLUDED.category ELSE products.category END,
          format = CASE WHEN products.short_name IS NULL THEN EXCLUDED.format ELSE products.format END,
          headline = CASE WHEN products.short_name IS NULL THEN EXCLUDED.headline ELSE products.headline END,
          ritual = CASE WHEN products.short_name IS NULL THEN EXCLUDED.ritual ELSE products.ritual END,
          image = CASE WHEN products.short_name IS NULL THEN EXCLUDED.image ELSE products.image END,
          alt = CASE WHEN products.short_name IS NULL THEN EXCLUDED.alt ELSE products.alt END,
          color = CASE WHEN products.short_name IS NULL THEN EXCLUDED.color ELSE products.color END,
          detail_images = CASE WHEN products.short_name IS NULL THEN EXCLUDED.detail_images ELSE products.detail_images END`,
        [
          p.slug,
          p.name,
          p.description,
          p.sku,
          p.price,
          p.compareAtPrice ?? null,
          p.cost,
          p.stock,
          p.short,
          p.category,
          p.format,
          p.headline,
          p.ritual,
          p.image,
          p.alt,
          p.color,
          JSON.stringify(p.detailImages),
          index,
        ],
      );
    }
  });
  return adapter;
}

export function db() {
  instance.eleganzaDatabase ??= createDatabase().catch((error) => {
    delete instance.eleganzaDatabase;
    throw error;
  });
  return instance.eleganzaDatabase;
}

type ProductRow = {
  slug: string;
  name: string;
  description: string;
  sku: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock: number;
  seo_title: string | null;
  seo_description: string | null;
  short_name: string | null;
  category: string | null;
  format: string | null;
  headline: string | null;
  ritual: string | null;
  image: string | null;
  alt: string | null;
  color: string | null;
  detail_images: unknown;
  facts: string | null;
  quick_facts: unknown;
  ingredients: string | null;
  packaging: string | null;
  builder_blocks: unknown;
};

export function parseQuickFacts(raw: unknown): QuickFact[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const value = typeof item.value === "string" ? item.value.trim() : "";
    if (!label && !value) return [];
    return [{ label: label || "Detail", value }];
  });
}

const VALID_BLOCK_TYPES = new Set<BuilderBlockType>([
  "ritual",
  "feature",
  "benefits",
  "specs",
  "accordion",
  "banner",
  "image",
]);

export function parseBuilderBlocks(raw: unknown): BuilderBlock[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry, idx) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const type =
      typeof item.type === "string" &&
      VALID_BLOCK_TYPES.has(item.type as BuilderBlockType)
        ? (item.type as BuilderBlockType)
        : null;
    if (!type) return [];
    const steps = Array.isArray(item.steps)
      ? item.steps.filter((s): s is string => typeof s === "string")
      : undefined;
    const items = Array.isArray(item.items)
      ? item.items.flatMap((sub) => {
          if (!sub || typeof sub !== "object") return [];
          const o = sub as Record<string, unknown>;
          const title = typeof o.title === "string" ? o.title : "";
          const detail = typeof o.detail === "string" ? o.detail : "";
          return [{ title, detail }];
        })
      : undefined;
    const tone =
      item.tone === "blush" ||
      item.tone === "sand" ||
      item.tone === "cream" ||
      item.tone === "white"
        ? item.tone
        : undefined;
    const imageSide =
      item.imageSide === "left" || item.imageSide === "right"
        ? item.imageSide
        : undefined;
    const ctaType =
      item.ctaType === "add_to_bag" ||
      item.ctaType === "link" ||
      item.ctaType === "none"
        ? item.ctaType
        : undefined;
    return [
      {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `block-${idx}`,
        type,
        eyebrow: typeof item.eyebrow === "string" ? item.eyebrow : undefined,
        heading: typeof item.heading === "string" ? item.heading : undefined,
        body: typeof item.body === "string" ? item.body : undefined,
        image: typeof item.image === "string" ? item.image : undefined,
        alt: typeof item.alt === "string" ? item.alt : undefined,
        imageSide,
        tone,
        steps,
        items,
        ctaLabel: typeof item.ctaLabel === "string" ? item.ctaLabel : undefined,
        ctaType,
        ctaHref: typeof item.ctaHref === "string" ? item.ctaHref : undefined,
      },
    ];
  });
}

export function parseDetailImages(raw: unknown): ProductImage[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) return [];
    const alt = typeof item.alt === "string" ? item.alt.trim() : "";
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : "Gallery view";
    return [{ name, alt, label }];
  });
}

export async function getCatalog(): Promise<StoreProduct[]> {
  const rows = await (
    await db()
  ).query<ProductRow>(
    `SELECT slug,name,description,sku,price_cents,compare_at_price_cents,stock,
            seo_title,seo_description,short_name,category,format,headline,ritual,
            image,alt,color,detail_images,facts,quick_facts,ingredients,packaging,builder_blocks
     FROM products
     WHERE published
     ORDER BY created_at ASC, name ASC`,
  );
  return rows.map((row) => {
    const category = row.category === "Complexion" ? "Complexion" : "Skincare";
    const format = row.format?.trim() || "Essential";
    const detailImages = parseDetailImages(row.detail_images);
    const parsedQuickFacts = parseQuickFacts(row.quick_facts);
    const parsedBlocks = parseBuilderBlocks(row.builder_blocks);
    const headline = row.headline?.trim() || row.name;
    const ritual = row.ritual?.trim() || row.description;
    const image = row.image?.trim() || "oil-packshot";
    const alt = row.alt?.trim() || row.name;
    const facts = row.facts?.trim() || `${format} · ${category}`;

    return {
      slug: row.slug,
      name: row.name,
      short: row.short_name?.trim() || row.name,
      category,
      format,
      price: Number(row.price_cents),
      compareAtPrice:
        row.compare_at_price_cents != null
          ? Number(row.compare_at_price_cents)
          : undefined,
      sku: row.sku,
      headline,
      description: row.description,
      ritual,
      facts,
      quickFacts: parsedQuickFacts.length
        ? parsedQuickFacts
        : defaultQuickFacts(category, format),
      ingredients:
        row.ingredients?.trim() ||
        "The full ingredient list will be available after product approval.",
      packaging:
        row.packaging?.trim() ||
        "Recyclable outer packaging and studio-tested applicator.",
      builderBlocks: parsedBlocks.length
        ? parsedBlocks
        : defaultBuilderBlocks({
            name: row.name,
            category,
            headline,
            description: row.description,
            ritual,
            facts,
            image,
            alt,
            detailImages,
          }),
      image,
      alt,
      color: row.color?.trim() || "#efe6dc",
      detailImages,
      stock: Number(row.stock),
      seoTitle: row.seo_title ?? undefined,
      seoDescription: row.seo_description ?? undefined,
    };
  });
}

type SiteSettingsRow = {
  domain: string | null;
  home_seo_title: string | null;
  home_seo_description: string | null;
  facebook_pixel_id: string | null;
  tiktok_pixel_id: string | null;
  pinterest_pixel_id: string | null;
  google_ads_id: string | null;
  google_ads_label: string | null;
  shipping_cents: number | null;
  free_shipping_threshold_cents: number | null;
  shipping_label: string | null;
};

export async function getSiteSettings(
  queryFn?: Query,
): Promise<SiteSettings> {
  const q = queryFn ?? (await db()).query;
  const [row] = await q<SiteSettingsRow>(
    `SELECT domain,home_seo_title,home_seo_description,
            facebook_pixel_id,tiktok_pixel_id,pinterest_pixel_id,
            google_ads_id,google_ads_label,
            shipping_cents,free_shipping_threshold_cents,shipping_label
     FROM site_settings
     WHERE id=1`,
  );
  if (!row) return { ...defaultSiteSettings };
  return {
    domain: row.domain ?? null,
    homeSeoTitle: row.home_seo_title ?? null,
    homeSeoDescription: row.home_seo_description ?? null,
    facebookPixelId: row.facebook_pixel_id ?? null,
    tiktokPixelId: row.tiktok_pixel_id ?? null,
    pinterestPixelId: row.pinterest_pixel_id ?? null,
    googleAdsId: row.google_ads_id ?? null,
    googleAdsLabel: row.google_ads_label ?? null,
    shippingCents: Number(row.shipping_cents ?? 0),
    freeShippingThresholdCents:
      row.free_shipping_threshold_cents != null
        ? Number(row.free_shipping_threshold_cents)
        : null,
    shippingLabel: row.shipping_label?.trim() || "Standard Shipping",
  };
}

export async function audit(
  query: Query,
  actor: string,
  action: string,
  entity: string,
  before: unknown,
  after: unknown,
) {
  await query(
    "INSERT INTO audit_log(actor,action,entity,before_state,after_state) VALUES($1,$2,$3,$4,$5)",
    [actor, action, entity, JSON.stringify(before), JSON.stringify(after)],
  );
}
