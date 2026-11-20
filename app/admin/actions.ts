"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type BuilderBlock,
  normalizeDomainOrigin,
  type ProductImage,
  type QuickFact,
} from "@/lib/catalog";
import {
  audit,
  db,
  parseBuilderBlocks,
  parseDetailImages,
  parseQuickFacts,
} from "@/lib/db";
import { infoPages } from "@/lib/pages";
import {
  can,
  previewSignIn,
  staff,
  staffCookie,
  type Permission,
} from "@/lib/staff";

let failedAttempts = 0;
let loginWindow = 0;

export async function login(data: FormData) {
  const now = Date.now();
  if (now > loginWindow) {
    failedAttempts = 0;
    loginWindow = now + 60_000;
  }
  if (failedAttempts >= 10) redirect("/admin?notice=slow");
  const key = data.get("key");
  if (typeof key !== "string" || !(await previewSignIn(key))) {
    failedAttempts++;
    redirect("/admin?notice=login");
  }
  redirect("/admin");
}
export async function logout() {
  (await cookies()).set(staffCookie, "", { path: "/admin", maxAge: 0 });
  redirect("/admin");
}

async function requirePermission(permission: Permission) {
  const user = await staff();
  if (!user || !can(user.role, permission))
    redirect("/admin?notice=permission");
  return user.actor;
}

const field = (n: number) => z.string().trim().max(n);

const usdRequired = z
  .string()
  .trim()
  .regex(/^\d{1,6}(\.\d{1,2})?$/)
  .transform((n) => Math.round(Number(n) * 100))
  .refine((n) => n > 0);

const usdOptional = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,6}(\.\d{1,2})?$/.test(v))
  .transform((v) => (v === "" ? null : Math.round(Number(v) * 100)));

const usdNonNegative = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,6}(\.\d{1,2})?$/.test(v))
  .transform((v) => (v === "" ? 0 : Math.round(Number(v) * 100)));

function isValidImageSource(value: string): boolean {
  if (!value || value.length > 500) return false;
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(value)) return true;
  if (/^\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes("..")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidHref(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeDetailImages(raw: string): ProductImage[] | null {
  if (!raw.trim()) return [];
  try {
    const parsed = parseDetailImages(raw);
    for (const img of parsed) {
      if (!isValidImageSource(img.name)) return null;
    }
    return parsed.slice(0, 12);
  } catch {
    return null;
  }
}

function sanitizeQuickFacts(raw: string): QuickFact[] | null {
  if (!raw.trim()) return [];
  try {
    return parseQuickFacts(raw).slice(0, 6);
  } catch {
    return null;
  }
}

function sanitizeBuilderBlocks(raw: string): BuilderBlock[] | null {
  if (!raw.trim()) return [];
  try {
    const parsed = parseBuilderBlocks(raw).slice(0, 20);
    for (const block of parsed) {
      if (block.image && !isValidImageSource(block.image)) return null;
      if (block.ctaHref && !isValidHref(block.ctaHref)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

const productFields = {
  name: field(110).min(1),
  shortName: field(60).optional().default(""),
  category: z.enum(["Skincare", "Complexion"]).optional().default("Skincare"),
  format: field(60).optional().default("Essential"),
  description: field(1200).min(1),
  headline: field(140).optional().default(""),
  ritual: field(600).optional().default(""),
  facts: field(180).optional().default(""),
  ingredients: field(3000).optional().default(""),
  packaging: field(1200).optional().default(""),
  quickFactsJson: z.string().max(10_000).optional().default("[]"),
  builderBlocksJson: z.string().max(80_000).optional().default("[]"),
  stock: z
    .string()
    .trim()
    .regex(/^\d{1,7}$/)
    .transform(Number),
  price: usdRequired,
  comparePrice: usdOptional.optional().default(null),
  cost: usdNonNegative.optional(),
  image: field(500).optional().default("oil-packshot"),
  alt: field(240).optional().default(""),
  color: field(20).optional().default("#efe6dc"),
  detailImagesJson: z.string().max(20_000).optional().default("[]"),
  seoTitle: field(110).optional().default(""),
  seoDescription: field(230).optional().default(""),
};

const editProductSchema = z.object({
  slug: field(120).min(1),
  updated: field(70),
  ...productFields,
});

const createProductSchema = z.object({
  slug: field(120).optional().default(""),
  sku: field(40).min(1),
  ...productFields,
});

export async function saveProduct(data: FormData) {
  const actor = await requirePermission("catalog");
  const parsed = editProductSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/products?notice=invalid");
  const p = parsed.data;
  const image = p.image || "oil-packshot";
  const detailImages = sanitizeDetailImages(p.detailImagesJson);
  const quickFacts = sanitizeQuickFacts(p.quickFactsJson);
  const builderBlocks = sanitizeBuilderBlocks(p.builderBlocksJson);
  if (
    !isValidImageSource(image) ||
    detailImages === null ||
    quickFacts === null ||
    builderBlocks === null ||
    (p.comparePrice !== null && p.comparePrice <= 0)
  ) {
    redirect(`/admin/products?edit=${encodeURIComponent(p.slug)}&notice=invalid`);
  }
  const color = /^#[0-9a-f]{3,8}$/i.test(p.color) ? p.color : "#efe6dc";

  const changed = await (
    await db()
  ).transaction(async (query) => {
    const [before] = await query<{ revision: string; cost_cents: number }>(
      "SELECT *,updated_at::text AS revision FROM products WHERE slug=$1 FOR UPDATE",
      [p.slug],
    );
    if (!before || before.revision !== p.updated) return false;
    const costCents = p.cost !== undefined ? p.cost : Number(before.cost_cents);
    const [after] = await query(
      `UPDATE products
       SET name=$2,short_name=$3,category=$4,format=$5,description=$6,
           headline=$7,ritual=$8,facts=$9,ingredients=$10,packaging=$11,
           quick_facts=$12::jsonb,builder_blocks=$13::jsonb,
           stock=$14,price_cents=$15,compare_at_price_cents=$16,
           cost_cents=$17,image=$18,alt=$19,color=$20,detail_images=$21::jsonb,
           seo_title=$22,seo_description=$23,published=$24,updated_at=clock_timestamp()
       WHERE slug=$1
       RETURNING *`,
      [
        p.slug,
        p.name,
        p.shortName || p.name,
        p.category,
        p.format || "Essential",
        p.description,
        p.headline || p.name,
        p.ritual || p.description,
        p.facts,
        p.ingredients,
        p.packaging,
        JSON.stringify(quickFacts),
        JSON.stringify(builderBlocks),
        p.stock,
        p.price,
        p.comparePrice,
        costCents,
        image,
        p.alt || p.name,
        color,
        JSON.stringify(detailImages),
        p.seoTitle || null,
        p.seoDescription || null,
        data.get("published") === "on",
      ],
    );
    await audit(query, actor, "catalog.update", p.slug, before, after);
    return true;
  });
  redirect(
    `/admin/products?edit=${encodeURIComponent(p.slug)}&notice=${
      changed ? "saved" : "conflict"
    }`,
  );
}

export async function createProduct(data: FormData) {
  const actor = await requirePermission("catalog");
  const parsed = createProductSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/products?new=1&notice=invalid");
  const p = parsed.data;
  const slug = slugify(p.slug || p.name);
  const image = p.image || "oil-packshot";
  const detailImages = sanitizeDetailImages(p.detailImagesJson);
  const quickFacts = sanitizeQuickFacts(p.quickFactsJson);
  const builderBlocks = sanitizeBuilderBlocks(p.builderBlocksJson);
  if (
    !slug ||
    !isValidImageSource(image) ||
    detailImages === null ||
    quickFacts === null ||
    builderBlocks === null ||
    (p.comparePrice !== null && p.comparePrice <= 0)
  ) {
    redirect("/admin/products?new=1&notice=invalid");
  }
  const color = /^#[0-9a-f]{3,8}$/i.test(p.color) ? p.color : "#efe6dc";

  const created = await (
    await db()
  ).transaction(async (query) => {
    const [existing] = await query(
      "SELECT slug FROM products WHERE slug=$1 OR sku=$2",
      [slug, p.sku],
    );
    if (existing) return false;
    const [after] = await query(
      `INSERT INTO products(
        slug,name,short_name,category,format,description,headline,ritual,
        facts,ingredients,packaging,quick_facts,builder_blocks,
        sku,price_cents,compare_at_price_cents,cost_cents,stock,published,
        seo_title,seo_description,image,alt,color,detail_images
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25::jsonb)
      RETURNING *`,
      [
        slug,
        p.name,
        p.shortName || p.name,
        p.category,
        p.format || "Essential",
        p.description,
        p.headline || p.name,
        p.ritual || p.description,
        p.facts,
        p.ingredients,
        p.packaging,
        JSON.stringify(quickFacts),
        JSON.stringify(builderBlocks),
        p.sku,
        p.price,
        p.comparePrice,
        p.cost ?? 0,
        p.stock,
        data.get("published") === "on",
        p.seoTitle || null,
        p.seoDescription || null,
        image,
        p.alt || p.name,
        color,
        JSON.stringify(detailImages),
      ],
    );
    await audit(query, actor, "catalog.create", slug, null, after);
    return true;
  });
  redirect(
    created
      ? `/admin/products?edit=${encodeURIComponent(slug)}&notice=created`
      : "/admin/products?new=1&notice=duplicate",
  );
}

export async function deleteProduct(data: FormData) {
  const actor = await requirePermission("catalog");
  const slug = data.get("slug");
  if (typeof slug !== "string" || !slug.trim()) {
    redirect("/admin/products?notice=invalid");
  }
  const result = await (
    await db()
  ).transaction(async (query) => {
    const [ordered] = await query(
      "SELECT 1 FROM order_items WHERE slug=$1 LIMIT 1",
      [slug],
    );
    if (ordered) return "in_use";
    const [before] = await query("SELECT * FROM products WHERE slug=$1", [slug]);
    if (!before) return "missing";
    await query("DELETE FROM products WHERE slug=$1", [slug]);
    await audit(query, actor, "catalog.delete", slug, before, null);
    return "deleted";
  });
  redirect("/admin/products?notice=" + result);
}

const fulfillmentSchema = z.object({
  number: z.string().regex(/^ELG-[A-F0-9]{10}$/),
  carrier: field(80),
  tracking: field(480),
});
export async function fulfill(data: FormData) {
  const actor = await requirePermission("orders");
  const parsed = fulfillmentSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/orders?notice=invalid");
  const { number, carrier, tracking } = parsed.data;
  if (tracking && !z.url({ protocol: /^https$/ }).safeParse(tracking).success)
    redirect("/admin/orders?notice=invalid");
  const changed = await (
    await db()
  ).transaction(async (query) => {
    const [before] = await query<{ status: string }>(
      "SELECT status,carrier,tracking_url FROM orders WHERE number=$1 FOR UPDATE",
      [number],
    );
    if (!before) return false;
    const next =
      before.status === "test_paid"
        ? "shipped"
        : before.status === "shipped"
          ? "delivered"
          : null;
    if (!next) return false;
    const [after] = await query(
      "UPDATE orders SET status=$2,carrier=$3,tracking_url=$4,updated_at=now() WHERE number=$1 RETURNING status,carrier,tracking_url",
      [number, next, carrier || null, tracking || null],
    );
    await audit(query, actor, "order." + next, number, before, after);
    return true;
  });
  redirect("/admin/orders?notice=" + (changed ? "saved" : "conflict"));
}

export async function resolveTicket(data: FormData) {
  const actor = await requirePermission("support");
  const number = data.get("number");
  if (typeof number !== "string" || !/^CARE-[A-F0-9]{10}$/.test(number))
    redirect("/admin/support?notice=invalid");
  await (
    await db()
  ).transaction(async (query) => {
    const [after] = await query(
      "UPDATE support_tickets SET status='resolved',updated_at=now() WHERE number=$1 AND status='open' RETURNING status",
      [number],
    );
    if (after)
      await audit(
        query,
        actor,
        "support.resolve",
        number,
        { status: "open" },
        after,
      );
  });
  redirect("/admin/support?notice=saved");
}

export async function savePage(data: FormData) {
  const actor = await requirePermission("catalog");
  const parsed = z
    .object({
      slug: field(60),
      title: field(110).min(1),
      body: field(5000),
      seoTitle: field(110).optional().default(""),
      seo: field(230),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success || !Object.hasOwn(infoPages, parsed.data.slug))
    redirect("/admin/content?notice=invalid");
  const { slug, title, body, seoTitle, seo } = parsed.data;
  const published = data.get("published") === "on";
  await (
    await db()
  ).transaction(async (query) => {
    const [before] = await query(
      "SELECT * FROM pages WHERE slug=$1 FOR UPDATE",
      [slug],
    );
    const [after] = await query(
      "INSERT INTO pages(slug,title,body,seo_title,seo_description,published) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(slug) DO UPDATE SET title=$2,body=$3,seo_title=$4,seo_description=$5,published=$6,updated_at=now() RETURNING *",
      [slug, title, body, seoTitle || null, seo, published],
    );
    await audit(query, actor, "content.update", slug, before ?? null, after);
  });
  redirect("/admin/content?notice=saved");
}

const optionalRegex = (re: RegExp) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || re.test(v))
    .transform((v) => v || null);

const settingsSchema = z.object({
  domain: field(200).optional().default(""),
  homeSeoTitle: field(110).optional().default(""),
  homeSeoDescription: field(230).optional().default(""),
  facebookPixelId: optionalRegex(/^\d{10,22}$/),
  tiktokPixelId: optionalRegex(/^[A-Za-z0-9]{8,32}$/),
  pinterestPixelId: optionalRegex(/^\d{10,22}$/),
  googleAdsId: optionalRegex(/^(AW|G|GT)-[A-Za-z0-9]{5,20}$/i),
  googleAdsLabel: optionalRegex(/^[A-Za-z0-9_-]{4,40}$/),
  shippingCharge: usdNonNegative,
  freeShippingThreshold: usdOptional,
  shippingLabel: field(80).optional().default("Standard Shipping"),
});

export async function saveSettings(data: FormData) {
  const actor = await requirePermission("settings");
  const parsed = settingsSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) redirect("/admin/settings?notice=invalid");
  const s = parsed.data;
  let normalizedDomain: string | null = null;
  if (s.domain) {
    normalizedDomain = normalizeDomainOrigin(s.domain);
    if (!normalizedDomain) redirect("/admin/settings?notice=invalid");
  }
  await (
    await db()
  ).transaction(async (query) => {
    const [before] = await query(
      "SELECT * FROM site_settings WHERE id=1 FOR UPDATE",
    );
    const [after] = await query(
      `INSERT INTO site_settings(
        id,domain,home_seo_title,home_seo_description,
        facebook_pixel_id,tiktok_pixel_id,pinterest_pixel_id,
        google_ads_id,google_ads_label,
        shipping_cents,free_shipping_threshold_cents,shipping_label,updated_at
      ) VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
      ON CONFLICT(id) DO UPDATE SET
        domain=$1,home_seo_title=$2,home_seo_description=$3,
        facebook_pixel_id=$4,tiktok_pixel_id=$5,pinterest_pixel_id=$6,
        google_ads_id=$7,google_ads_label=$8,
        shipping_cents=$9,free_shipping_threshold_cents=$10,shipping_label=$11,
        updated_at=now()
      RETURNING *`,
      [
        normalizedDomain,
        s.homeSeoTitle || null,
        s.homeSeoDescription || null,
        s.facebookPixelId,
        s.tiktokPixelId,
        s.pinterestPixelId,
        s.googleAdsId ? s.googleAdsId.toUpperCase() : null,
        s.googleAdsLabel,
        s.shippingCharge,
        s.freeShippingThreshold,
        s.shippingLabel || "Standard Shipping",
      ],
    );
    await audit(
      query,
      actor,
      "settings.update",
      "site_settings",
      before ?? null,
      after,
    );
  });
  redirect("/admin/settings?notice=saved");
}
