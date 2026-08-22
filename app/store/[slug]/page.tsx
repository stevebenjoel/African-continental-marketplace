import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicStore } from "@/src/modules/catalogue/server/repository";
import { getCurrencyDisplay } from "@/src/modules/localization/server/currency";
import { ProductImage } from "@/src/modules/catalogue/ui/product-image";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, pricing] = await Promise.all([params, getCurrencyDisplay()]);
  const data = await getPublicStore(slug);
  if (!data) notFound();
  const offerByProduct = new Map(data.offers.map(offer => [String(offer.productId), offer]));
  return <main className="marketplace-shell"><nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/products">Marketplace</Link></nav><header className="store-header"><p className="kicker">VERIFIED PAC-SM SELLER</p><h1>{String(data.store.name)}</h1><p>Merchant {String(data.vendor.merchantId)} · Prices in {pricing.currency}</p></header><section className="product-grid">{data.products.map(product => { const offer = offerByProduct.get(product.$id); return offer && <Link href={`/products/${String(product.slug)}`} key={product.$id}><article><ProductImage media={data.mediaByProduct.get(product.$id)?.[0]} productName={String(product.name)} className="product-placeholder"/><h2>{String(product.name)}</h2><strong>{pricing.format(Number(offer.retailPriceMinor), String(offer.currency))}</strong></article></Link>; })}</section></main>;
}
