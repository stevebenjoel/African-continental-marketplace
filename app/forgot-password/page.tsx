import Link from "next/link";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell"><section className="auth-brand"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><p>Secure account recovery without exposing whether an address is registered.</p></section><section className="auth-panel"><div className="auth-card">
    <p className="kicker">ACCOUNT RECOVERY</p><h1>Reset your password.</h1>
    {params.sent && <p className="success-note" role="status">If that address is registered, recovery instructions have been sent.</p>}
    <form action="/api/auth/recovery/request" method="post"><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={320} /></label><button type="submit">Send recovery link <span aria-hidden="true">→</span></button></form>
    <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
  </div></section></main>;
}
