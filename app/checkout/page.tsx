import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { getCart } from "@/src/modules/cart/server/repository";
import { listAddresses } from "@/src/modules/customers/server/repository";
import { env } from "@/src/shared/config/env";

export const dynamic = "force-dynamic";
export default async function CheckoutPage() {
  const user = await getCurrentAppwriteUser();
  if (!user) redirect("/login?returnTo=/checkout");
  const [{ items }, addresses] = await Promise.all([getCart(user.$id), listAddresses(user.$id)]);
  if (!items.length) redirect("/cart");
  const paystackAvailable = Boolean(env().PAYSTACK_SECRET_KEY);
  return <main className="marketplace-shell"><nav><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/cart">Back to cart</Link></nav><header><p className="kicker">SECURE CHECKOUT</p><h1>Delivery and payment.</h1><p>Your order is created and the selected payment starts immediately.</p></header><form className="checkout-form" action="/api/checkout" method="post"><fieldset><legend>1. Delivery address</legend>{addresses.documents.map((address, index) => <label className="checkout-choice" key={address.$id}><input type="radio" name="addressId" value={address.$id} defaultChecked={index === 0} required/><span><strong>{String(address.label)}</strong><small>{String(address.line1)}, {String(address.city)}</small></span></label>)}{!addresses.documents.length && <p>Add an address before checkout. <Link href="/account/addresses">Add address</Link></p>}</fieldset><label className="checkout-coupon">Coupon code (optional)<input name="couponCode" maxLength={40} placeholder="WELCOME10"/></label><fieldset><legend>2. Payment method</legend><label className="checkout-choice"><input type="radio" name="provider" value="demo" defaultChecked/><span><strong>PAC-SM DemoPay</strong><small>Instant sandbox capture</small></span></label><label className="checkout-choice"><input type="radio" name="provider" value="paystack"/><span><strong>Paystack</strong><small>{paystackAvailable ? "Continue to secure card, bank, USSD or mobile-money payment" : "Sandbox simulation — no money is charged"}</small></span></label><label className="checkout-choice"><input type="radio" name="provider" value="papss"/><span><strong>PAPSS</strong><small>Sandbox Pan-African settlement simulation — no money is charged</small></span></label></fieldset><button type="submit" disabled={!addresses.documents.length}>Place order and pay</button><small>Price, coupon and stock are validated atomically. Goods are released only after server-confirmed payment.</small></form></main>;
}
