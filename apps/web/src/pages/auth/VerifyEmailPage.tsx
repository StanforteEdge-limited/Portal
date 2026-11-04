import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Icon } from "@/shared";
import { authApi } from "@/shared/lib/core";
import brandLogo from "../../../../shared/assets/brand/stanforte-logo.png";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) return;
    setLoading(true);
    authApi.verifyEmail(token).then(() => setMessage("Email verified. You can now sign in to your workspace."))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to verify email."))
      .finally(() => setLoading(false));
  }, [params]);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    if (!email.trim()) { setError("Enter the email used to create the workspace."); return; }
    setLoading(true);
    try { await authApi.resendVerification(email.trim().toLowerCase()); setMessage("If the account is awaiting verification, a new link has been sent."); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to resend verification email."); }
    finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12"><section className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 p-8 shadow-card"><img src={brandLogo} alt="Stanforte Edge" className="h-11 w-auto" /><div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-white"><Icon name="mail" /></div><h1 className="mt-5 font-headline text-2xl font-bold text-on-surface">Verify your email</h1><p className="mt-2 text-sm leading-6 text-on-surface-variant">Check your inbox for the verification link. You must verify your email before signing in.</p>{error ? <div role="alert" className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}{message ? <div role="status" className="mt-5 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{message}</div> : null}<form onSubmit={resend} className="mt-6 space-y-4"><label className="block"><span className="field-label">Email address</span><input className="input-base" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label><Button type="submit" className="w-full justify-center" disabled={loading}>{loading ? "Sending..." : "Resend verification email"}</Button></form><p className="mt-5 text-sm text-slate-500"><Link className="font-semibold text-brand-900" to="/login">Return to sign in</Link></p></section></main>;
}
