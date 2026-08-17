import Link from "next/link";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ userId?: string; secret?: string; error?: string }> }) {
  const params = await searchParams; const ready = Boolean(params.userId && params.secret);
  return <main className="auth-shell"><section className="auth-brand"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><p>Verified identities are the first layer of trusted continental commerce.</p></section><section className="auth-panel"><div className="auth-card">
    <p className="kicker">EMAIL VERIFICATION</p><h1>Confirm your email.</h1>
    {params.error && <p className="form-error" role="alert">This verification link is invalid or has expired.</p>}
    {!ready ? <p className="form-error">Open this page from the verification link sent to your email.</p> : <form action="/api/auth/verification/complete" method="post"><input type="hidden" name="userId" value={params.userId} /><input type="hidden" name="secret" value={params.secret} /><button type="submit">Verify email <span aria-hidden="true">→</span></button></form>}
    <p className="auth-switch"><Link href="/account">Return to account</Link></p>
  </div></section></main>;
}
