import Link from "next/link";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell">
    <section className="auth-brand"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><p>Join the infrastructure connecting African enterprise.</p></section>
    <section className="auth-panel"><div className="auth-card">
      <p className="kicker">CREATE YOUR ACCOUNT</p><h1>Start your journey.</h1>
      {params.error && <p className="form-error" role="alert">Registration was not completed. The email may already be in use.</p>}
      <a className="oauth-button" href={`/api/auth/oauth/google?returnTo=${encodeURIComponent(params.returnTo ?? "/account")}`}><span aria-hidden="true">G</span> Register with Google</a>
      <div className="auth-divider"><span>or register with email</span></div>
      <form action="/api/auth/register" method="post">
        <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={128} /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
        <label>Password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="password-help" /></label>
        <small id="password-help">At least 12 characters, including uppercase, lowercase and a number.</small>
        <button type="submit">Create account <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-switch">Already registered? <Link href="/login">Sign in</Link></p>
    </div></section>
  </main>;
}
