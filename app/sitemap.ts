import type { MetadataRoute } from "next";
import { productUrl, resolveBaseOrigin } from "@/lib/catalog";
import { getCatalog, getSiteSettings } from "@/lib/db";
import { infoPages } from "@/lib/pages";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, products] = await Promise.all([
    getSiteSettings(),
    getCatalog(),
  ]);
  const base = new URL(resolveBaseOrigin(settings.domain));
  const paths = [
    "/",
    "/collections/all",
    "/collections/skincare",
    "/collections/complexion",
    ...Object.keys(infoPages).map((slug) => "/" + slug),
    ...products.map((p) => productUrl(p.slug)),
  ];
  return paths.map((path) => ({ url: new URL(path, base).href }));
}
