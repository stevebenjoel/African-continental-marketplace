import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { findVendorByOwner } from "@/src/modules/vendors/server/repository";
import { CountrySelect, PhoneFields } from "@/app/components/country-phone-fields";
export const dynamic = "force-dynamic";

export default async function VendorRegistration({ searchParams }: { searchParams: Promise<{ error?: string; submitted?: string }> }) {
  const [user, params] = await Promise.all([getCurrentAppwriteUser(), searchParams]);
  if (!user) redirect("/login?returnTo=/vendor/register");
  const existing = await findVendorByOwner(user.$id);
  return <main className="account-shell"><nav className="account-nav"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><Link href="/account">My account</Link></nav><section className="account-card vendor-card">
    <p className="kicker">SELL ACROSS AFRICA</p><h1>Vendor registration.</h1>
    {existing ? <div className="success-note"><strong>Application status: {String(existing.status).replaceAll("_", " ")}</strong><br />Your reference is {existing.$id}. We will notify you when the review changes.</div> : <form className="vendor-form" action="/api/vendors/apply" method="post" encType="multipart/form-data">
      {params.error && <p className="form-error">{params.error}</p>}
      <fieldset><legend>Contact</legend><label>Full name<input name="fullName" defaultValue={user.name} required /></label><CountrySelect/><PhoneFields/></fieldset>
      <fieldset><legend>Business</legend><label>Legal business name<input name="legalName" required /></label><label>Trading name<input name="tradingName" /></label><label>Registration number<input name="registrationNumber" required /></label><label>Tax identification number<input name="taxId" /></label><label>Business type<select name="businessType" required><option value="company">Registered company</option><option value="partnership">Partnership</option><option value="sole_proprietor">Sole proprietor</option><option value="cooperative">Cooperative</option></select></label><label>Vendor type<select name="vendorType" required><option value="sme">SME</option><option value="individual_seller">Individual seller</option><option value="retailer">Retailer</option><option value="wholesaler">Wholesaler</option><option value="distributor">Distributor</option><option value="manufacturer">Manufacturer</option><option value="farmer">Farmer</option><option value="cooperative">Cooperative</option><option value="exporter">Exporter</option><option value="service_provider">Service provider</option><option value="international_supplier">International supplier</option></select></label><label className="wide">Registered address<textarea name="address" required /></label><label className="wide">Operational address<textarea name="operationalAddress" required /></label><label>Directors (one per line)<textarea name="directors" required /></label><label>Beneficial owners (one per line)<textarea name="beneficialOwners" required /></label></fieldset>
      <fieldset><legend>Settlement and trade</legend><label>Bank name<input name="bankName" required /></label><label>Account name<input name="bankAccountName" required /></label><label>Account number / IBAN<input name="bankAccountNumber" autoComplete="off" required /></label><CountrySelect name="bankCountryCode" label="Bank country"/><label>SWIFT / BIC<input name="swiftCode" maxLength={20} /></label><label>Exporter registration number<input name="exporterNumber" /></label></fieldset>
      <fieldset><legend>Store</legend><label>Store name<input name="storeName" required /></label><label>Store URL slug<input name="storeSlug" pattern="[a-z0-9-]+" placeholder="my-african-store" required /></label><label>Settlement currency<input name="currency" defaultValue="NGN" minLength={3} maxLength={3} required /></label></fieldset>
      <fieldset><legend>KYC / KYB documents</legend><label>Registration certificate<input name="registration_certificate" type="file" accept=".pdf,.jpg,.jpeg,.png" required /></label><label>Tax document<input name="tax_document" type="file" accept=".pdf,.jpg,.jpeg,.png" required /></label><label>Director / owner ID<input name="owner_identity" type="file" accept=".pdf,.jpg,.jpeg,.png" required /></label></fieldset>
      <button type="submit">Submit for verification</button><small>Documents are stored privately and only authorized reviewers can retrieve them.</small>
    </form>}
  </section></main>;
}
