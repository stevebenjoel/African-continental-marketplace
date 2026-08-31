import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicStore } from "@/src/modules/catalogue/server/repository";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { StorefrontView } from "@/src/modules/storefront/ui/storefront-view";
import { JsonLd } from "@/src/shared/seo/json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params, data = await getPublicStore(slug);
  if (!data) return { title: "Store not found", robots: { index: false, follow: false } };
  const name = String(data.store.name), description = `Shop approved products from ${name}, a verified seller on the PAC-SM continental marketplace.`;
  return { title: name, description, alternates: { canonical: `/store/${slug}` }, openGraph: { title: `${name} on PAC-SM`, description, url: `/store/${slug}`, type: "website", images: data.store.logoFileId ? [{ url: `/api/storefront/logo/${data.store.$id}`, alt: String(data.store.logoAltText ?? `${name} logo`) }] : [{ url: "/og.png", alt: "PAC-SM" }] } };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, pricing] = await Promise.all([params, getCurrencyDisplay()]);
  const data = await getPublicStore(slug);
  if (!data) notFound();
  const offerByProduct = new Map(data.offers.map(offer => [String(offer.productId), offer]));
  const items = data.products.flatMap(product => { const offer = offerByProduct.get(product.$id); return offer ? [{ product, offer, media: data.mediaByProduct.get(product.$id)?.[0] ?? null }] : []; });
  const origin = process.env.APP_BASE_URL ?? "http://localhost:3000", url = `${origin}/store/${slug}`;
  const schema = { "@context": "https://schema.org", "@type": "OnlineStore", "@id": `${url}#store`, name: String(data.store.name), url, ...(data.store.logoFileId ? { logo: `${origin}/api/storefront/logo/${data.store.$id}` } : {}), parentOrganization: { "@type": "Organization", name: "PAC-SM", url: origin }, hasOfferCatalog: { "@type": "OfferCatalog", name: `${String(data.store.name)} product collection`, numberOfItems: items.length } };
  return <><JsonLd data={schema}/><StorefrontView store={{ ...data.store, tagline: `Merchant ${String(data.vendor.merchantId)} · prices shown in ${pricing.currency}` }} items={items} format={pricing.format}/></>;
}
