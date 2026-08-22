import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string; recovered?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell">
    <section className="auth-brand"><Link className="brand" href="/"><span>PAC</span><b>SM</b></Link><p>One secure identity for retail, wholesale and continental trade.</p></section>
    <section className="auth-panel"><div className="auth-card">
      <p className="kicker">WELCOME BACK</p><h1>Sign in to PAC-SM.</h1>
      {params.recovered && <p className="success-note" role="status">Your password has been updated. You can sign in now.</p>}
      {params.error && <p className="form-error" role="alert">{params.error.startsWith("oauth_") ? "Google sign-in was not completed. Please try again or use your email and password." : "We could not sign you in. Check your details and try again."}</p>}
      <a className="oauth-button" href={`/api/auth/oauth/google?returnTo=${encodeURIComponent(params.returnTo ?? "/account")}`}><span aria-hidden="true">G</span> Continue with Google</a>
      <div className="auth-divider"><span>or use email</span></div>
      <form action="/api/auth/login" method="post">
        <input type="hidden" name="returnTo" value={params.returnTo ?? "/account"} />
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
        <button type="submit">Sign in <span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-help"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="auth-switch">New to PAC-SM? <Link href="/register">Create an account</Link></p>
    </div></section>
  </main>;
}
