import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { listWishlist } from "@/src/modules/engagement/server/wishlist";
import { createAppwriteDatabaseClient } from "@/src/integrations/appwrite/server";
import { env } from "@/src/shared/config/env";
export const dynamic = "force-dynamic";
export default async function WishlistPage() { const user = await getCurrentAppwriteUser(); if (!user) redirect("/login?returnTo=/wishlist"); const items = await listWishlist(user.$id), databases = createAppwriteDatabaseClient().databases, databaseId = env().APPWRITE_DATABASE_ID; const products = await Promise.all(items.documents.map(item => databases.getDocument({ databaseId, collectionId: "products", documentId: String(item.productId) }).catch(() => null))); return <main className="marketplace-shell"><nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/products">Marketplace</Link></nav><header><p className="kicker">SAVED PRODUCTS</p><h1>Your wishlist.</h1></header><section className="product-grid">{items.documents.map((item, index) => { const product = products[index]; return product && <article key={item.$id}><Link href={`/products/${String(product.slug)}`}><div className="product-placeholder">{String(product.name).slice(0,2).toUpperCase()}</div><h2>{String(product.name)}</h2></Link><form action={`/api/wishlist/${item.$id}/remove`} method="post"><button type="submit">Remove</button></form></article>; })}</section></main>; }
