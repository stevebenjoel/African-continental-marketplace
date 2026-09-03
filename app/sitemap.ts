import type { MetadataRoute } from "next";
import { listPublicSeoEntries } from "@/src/modules/catalogue/server/repository";
import { BRAND_CATALOGUES } from "@/src/modules/catalogue/domain/brand-catalogue";

const origin = process.env.APP_BASE_URL ?? "http://localhost:3000";
const publicRoutes = ["", "/products", "/wholesale", "/pre-orders", "/white-label", "/pac-sm-products", "/brands", ...BRAND_CATALOGUES.map(brand => `/brands/${brand.slug}`), "/offtakers", "/procurement", "/trade", "/logistics", "/standards", "/academy", "/faq", "/documentation", "/developers"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = publicRoutes.map((path, index) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: index < 4 ? "daily" : "weekly",
    priority: index === 0 ? 1 : index < 4 ? 0.9 : 0.7
  }));

  try {
    const entries = await listPublicSeoEntries();
    return [...base,
      ...entries.products.map(product => ({ url: `${origin}/products/${encodeURIComponent(String(product.slug))}`, lastModified: new Date(String(product.reviewedAt ?? product.submittedAt ?? now)), changeFrequency: "weekly" as const, priority: 0.8 })),
      ...entries.stores.map(store => ({ url: `${origin}/store/${encodeURIComponent(String(store.slug))}`, lastModified: new Date(String(store.brandingUpdatedAt ?? store.$updatedAt ?? now)), changeFrequency: "weekly" as const, priority: 0.7 }))
    ];
  } catch {
    return base;
  }
}
