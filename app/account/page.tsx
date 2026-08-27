import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppwriteUser } from "@/src/modules/auth/server/session";
import { isSuperAdmin } from "@/src/modules/authorization/domain/super-admin";
import { ADMIN_ROLE_INFO, grantedAdminRoles } from "@/src/modules/authorization/domain/admin-roles";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; verification?: string; oauth?: string }> }) {
  const [user, params] = await Promise.all([getCurrentAppwriteUser(), searchParams]);
  if (!user) redirect("/login?returnTo=/account");
  const adminRoles = grantedAdminRoles(user.labels);
  return <main className="account-shell">
    <nav className="account-nav"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><form action="/api/auth/logout" method="post"><button>Sign out</button></form></nav>
    <section className="account-card">
      {params.welcome && <p className="success-note">Account created successfully.</p>}
      {params.oauth === "google" && <p className="success-note">Google sign-in completed successfully.</p>}
      {params.verification === "sent" && <p className="success-note">Verification instructions were sent to your email.</p>}
      {params.verification === "complete" && <p className="success-note">Your email address is now verified.</p>}
      {params.verification === "already" && <p className="success-note">Your email address is already verified.</p>}
      {params.verification === "unavailable" && <p className="form-error">Your account is ready, but the verification email could not be sent. Use the button below after email delivery is configured.</p>}
      {params.verification === "failed" && <p className="form-error">The verification email could not be sent. Please wait briefly and try again.</p>}
      <p className="kicker">PAC-SM ACCOUNT</p><h1>Welcome, {user.name || "member"}.</h1>
      <div className="account-grid"><article><span>Email</span><strong>{user.email}</strong></article><article><span>Email status</span><strong>{user.emailVerification ? "Verified" : "Verification pending"}</strong></article><article><span>Orders</span><strong><Link href="/orders">Purchase history →</Link></strong></article><article><span>Wishlist</span><strong><Link href="/wishlist">Saved products →</Link></strong></article><article><span>Delivery</span><strong><Link href="/account/addresses">Manage addresses →</Link></strong></article><article><span>Buyer protection</span><strong><Link href="/account/disputes">Manage disputes →</Link></strong></article><article><span>Sell on PAC-SM</span><strong><Link href="/seller">Open Seller Centre →</Link></strong></article></div>
      {adminRoles.length > 0 && <section className="account-privileges"><div><p className="kicker">ADMINISTRATIVE ACCESS</p><h2>Your assigned privileges</h2><p>These responsibilities were granted to this email by the Super Administrator.</p></div><div className="account-privilege-grid">{adminRoles.map(role=>{const info=ADMIN_ROLE_INFO[role];return <article key={role}><span>ACTIVE PRIVILEGE</span><h3>{info.name}</h3><p>{info.description}</p>{info.href?<Link href={info.href}>Open operational centre →</Link>:<small>The privilege is active. Its dedicated workspace will appear here when that operations module is opened to delegated staff.</small>}</article>})}</div></section>}
      {!user.emailVerification && <form className="verification-form" action="/api/auth/verification/send" method="post"><button>Send verification email</button></form>}
      {isSuperAdmin(user.labels) && <p className="admin-entry"><Link href="/admin">Open Super Admin Centre →</Link></p>}
    </section>
  </main>;
}
