import { notFound } from "next/navigation";
import { getPublicStore } from "@/src/modules/catalogue/server/repository";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { StorefrontView } from "@/src/modules/storefront/ui/storefront-view";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, pricing] = await Promise.all([params, getCurrencyDisplay()]);
  const data = await getPublicStore(slug);
  if (!data) notFound();
  const offerByProduct = new Map(data.offers.map(offer => [String(offer.productId), offer]));
  const items = data.products.flatMap(product => { const offer = offerByProduct.get(product.$id); return offer ? [{ product, offer, media: data.mediaByProduct.get(product.$id)?.[0] ?? null }] : []; });
  return <StorefrontView store={{ ...data.store, tagline: `Merchant ${String(data.vendor.merchantId)} · prices shown in ${pricing.currency}` }} items={items} format={pricing.format}/>;
}
