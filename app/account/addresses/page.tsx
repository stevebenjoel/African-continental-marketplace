import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { safeReturnTo } from "@/src/modules/auth/server/request-security";
import { listAddresses } from "@/src/modules/customers/server/repository";
import { CountrySelect, PhoneFields } from "@/app/components/country-phone-fields";

export const dynamic = "force-dynamic";

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ saved?: string; returnTo?: string }> }) {
  const [user, query] = await Promise.all([getCurrentAppwriteUser(), searchParams]);
  const returnTo = query.returnTo ? safeReturnTo(query.returnTo) : "";
  if (!user) {
    const addressReturn = returnTo ? `/account/addresses?returnTo=${encodeURIComponent(returnTo)}` : "/account/addresses";
    redirect(`/login?returnTo=${encodeURIComponent(addressReturn)}`);
  }
  const addresses = await listAddresses(user.$id);
  return <main className="account-shell">
    <nav className="account-nav"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href={returnTo || "/account"}>{returnTo ? "Back to checkout" : "Account"}</Link></nav>
    <section className="account-card">
      <p className="kicker">DELIVERY</p><h1>Saved addresses.</h1>
      {query.saved && <p className="success-note">Address saved.</p>}
      {returnTo && <p className="admin-notice">Save your delivery address to continue directly to checkout and payment.</p>}
      <section className="address-grid">{addresses.documents.map(address => <article key={address.$id}><strong>{String(address.label)}</strong><p>{String(address.recipientName)}<br />{String(address.line1)}<br />{String(address.city)}, {String(address.region)}<br />{String(address.countryCode)}</p></article>)}</section>
      <form className="vendor-form" action="/api/account/addresses" method="post">
        {returnTo && <input type="hidden" name="returnTo" value={returnTo}/>}
        <fieldset><legend>Add delivery address</legend><label>Label<input name="label" placeholder="Home" required /></label><label>Recipient name<input name="recipientName" defaultValue={user.name} required /></label><CountrySelect/><PhoneFields/><label>Address line 1<input name="line1" required /></label><label>Address line 2<input name="line2" /></label><label>City<input name="city" required /></label><label>State / region<input name="region" required /></label><label>Postal code<input name="postalCode" /></label></fieldset>
        <button>{returnTo ? "Save address and continue to checkout" : "Save address"}</button>
      </form>
    </section>
  </main>;
}
