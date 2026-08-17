import Link from "next/link";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ userId?: string; secret?: string; error?: string }> }) {
  const params = await searchParams; const ready = Boolean(params.userId && params.secret);
  return <main className="auth-shell"><section className="auth-brand"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><p>Choose a strong new password for your marketplace identity.</p></section><section className="auth-panel"><div className="auth-card">
    <p className="kicker">NEW PASSWORD</p><h1>Secure your account.</h1>
    {params.error && <p className="form-error" role="alert">This recovery link is invalid or has expired.</p>}
    {!ready ? <p className="form-error">Open this page from the recovery link sent to your email.</p> : <form action="/api/auth/recovery/complete" method="post"><input type="hidden" name="userId" value={params.userId} /><input type="hidden" name="secret" value={params.secret} /><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><button type="submit">Update password <span aria-hidden="true">→</span></button></form>}
    <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
  </div></section></main>;
}
