import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  calculateShippingCents,
  normalizeDomainOrigin,
  resolveBaseOrigin,
} from "../lib/catalog";
import { checkout, checkoutInput } from "../lib/commerce";
import { db, getCatalog, getSiteSettings } from "../lib/db";
import {
  detectImageExtension,
  readUploadedImage,
  saveUploadedImage,
} from "../lib/media";

process.env.PGLITE_DIR = "memory://";
delete process.env.DATABASE_URL;
delete process.env.STRIPE_TEST_SECRET_KEY;
delete process.env.STRIPE_TEST_WEBHOOK_SECRET;

test("newly added products with compared price, images, and SEO appear in catalog", async () => {
  const database = await db();
  await database.query(
    `INSERT INTO products(
      slug,name,short_name,category,format,description,headline,ritual,
      sku,price_cents,compare_at_price_cents,cost_cents,stock,published,
      seo_title,seo_description,image,alt,color,detail_images
    ) VALUES(
      'velvet-lip-balm','Velvet Lip Balm','Velvet Lip','Complexion','Lip balm',
      'A nourishing tinted balm.','Soft cushion.','Apply as needed.',
      'ELG-LIP-001',2200,3000,500,25,true,
      'Velvet Lip Balm | Eleganza','Nourishing lip balm',
      '/api/media/lip-main.webp','Velvet Lip Balm tube','#ecd8d0',
      $1::jsonb
    )`,
    [
      JSON.stringify([
        {
          name: "/api/media/lip-swatch.webp",
          alt: "Lip swatch",
          label: "Swatch",
        },
      ]),
    ],
  );

  const products = await getCatalog();
  const added = products.find((p) => p.slug === "velvet-lip-balm");
  assert.ok(added);
  assert.equal(added.price, 2200);
  assert.equal(added.compareAtPrice, 3000);
  assert.equal(added.image, "/api/media/lip-main.webp");
  assert.equal(added.detailImages.length, 1);
  assert.equal(added.seoTitle, "Velvet Lip Balm | Eleganza");
  assert.equal(added.seoDescription, "Nourishing lip balm");
  assert.ok(!("cost" in added));
});

test("site settings persist domain, main page SEO, pixels, and shipping charge", async () => {
  const database = await db();
  await database.query(
    `UPDATE site_settings
     SET domain='https://shop.eleganza.example',
         home_seo_title='Eleganza Official Store',
         home_seo_description='Luxury skincare and complexion.',
         facebook_pixel_id='123456789012345',
         tiktok_pixel_id='C123456789ABCDEF',
         pinterest_pixel_id='2612345678901',
         google_ads_id='AW-987654321',
         google_ads_label='convLabel1',
         shipping_cents=795,
         free_shipping_threshold_cents=7500,
         shipping_label='Express Courier'
     WHERE id=1`,
  );

  const settings = await getSiteSettings();
  assert.equal(settings.domain, "https://shop.eleganza.example");
  assert.equal(settings.homeSeoTitle, "Eleganza Official Store");
  assert.equal(settings.facebookPixelId, "123456789012345");
  assert.equal(settings.tiktokPixelId, "C123456789ABCDEF");
  assert.equal(settings.pinterestPixelId, "2612345678901");
  assert.equal(settings.googleAdsId, "AW-987654321");
  assert.equal(settings.shippingCents, 795);
  assert.equal(settings.freeShippingThresholdCents, 7500);
  assert.equal(settings.shippingLabel, "Express Courier");

  assert.equal(calculateShippingCents(2200, settings), 795);
  assert.equal(calculateShippingCents(7500, settings), 0);

  const lowOrder = await checkout(
    checkoutInput.parse({
      email: "shipping-low@example.com",
      requestKey: randomUUID(),
      items: [{ slug: "velvet-lip-balm", qty: 1 }],
    }),
    "http://localhost:3218",
  );
  const [savedLow] = await database.query(
    "SELECT subtotal_cents,shipping_cents,total_cents FROM orders WHERE number=$1",
    [lowOrder.number],
  );
  assert.equal(savedLow.subtotal_cents, 2200);
  assert.equal(savedLow.shipping_cents, 795);
  assert.equal(savedLow.total_cents, 2995);

  const freeOrder = await checkout(
    checkoutInput.parse({
      email: "shipping-free@example.com",
      requestKey: randomUUID(),
      items: [{ slug: "velvet-lip-balm", qty: 4 }],
    }),
    "http://localhost:3218",
  );
  const [savedFree] = await database.query(
    "SELECT subtotal_cents,shipping_cents,total_cents FROM orders WHERE number=$1",
    [freeOrder.number],
  );
  assert.equal(savedFree.subtotal_cents, 8800);
  assert.equal(savedFree.shipping_cents, 0);
  assert.equal(savedFree.total_cents, 8800);

  // Reset shipping back to 0 so test ordering remains independent
  await database.query(
    "UPDATE site_settings SET shipping_cents=0, free_shipping_threshold_cents=NULL WHERE id=1",
  );
});

test("domain normalization and image upload validation", async () => {
  assert.equal(
    normalizeDomainOrigin("eleganzaskincare.com/path"),
    "https://eleganzaskincare.com",
  );
  assert.equal(
    resolveBaseOrigin("https://custom.eleganza.com"),
    "https://custom.eleganza.com",
  );
  assert.equal(normalizeDomainOrigin("javascript:alert(1)"), null);

  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  assert.equal(detectImageExtension(pngHeader), "png");
  assert.equal(
    detectImageExtension(new TextEncoder().encode("<svg></svg>123")),
    null,
  );

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "eleganza-upload-"));
  process.env.UPLOAD_DIR = tempDir;
  try {
    const file = new File([pngHeader], "sample.png", { type: "image/png" });
    const url = await saveUploadedImage(file);
    assert.match(url, /^\/api\/media\/prod-[a-z0-9-]+\.png$/);
    const filename = url.split("/").pop()!;
    const readBack = await readUploadedImage(filename);
    assert.ok(readBack);
    assert.equal(readBack.contentType, "image/png");
    assert.equal(await readUploadedImage("../etc/passwd"), null);
  } finally {
    delete process.env.UPLOAD_DIR;
    await rm(tempDir, { recursive: true, force: true });
  }
});
