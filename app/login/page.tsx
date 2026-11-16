"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOAuth, startSSO } from "@/lib/oauth";
import { useAuthMethods } from "@/lib/authMethods";
import { ArrowLeft, Building2, Info, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthLayout, LOGIN_BENTO, OrDivider, SocialButton } from "@/components/AuthLayout";
import { OtpInput } from "@/components/OtpInput";

/** Where to go after signing in: ?next=/admin etc. (same-site paths only). */
function nextPath() {
  try { const n = new URLSearchParams(window.location.search).get("next"); if (n && n.startsWith("/") && !n.startsWith("//")) return n; } catch {}
  return "/app";
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [code, setCode] = useState("");
  const methods = useAuthMethods();
  const anySocial = !!methods && (methods.google || methods.microsoft || methods.sso);
  const [sso, setSso] = useState(false);
  // dozzier.co/login?sso=1 (the sign-on URL given to customers' IT teams) opens straight to SSO.
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get("sso")) setSso(true); } catch {} }, []);

  async function ssoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const problem = await startSSO(email, nextPath());
    if (problem) { setBusy(false); setErr(problem); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setBusy(false); return setErr(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message); }
    // "Keep me signed in" off: sign out when the browser is closed (checked in the app shell).
    try { if (keep) localStorage.removeItem("dz-session-only"); else localStorage.setItem("dz-session-only", "1"); sessionStorage.setItem("dz-alive", "1"); } catch {}
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const totp = f?.totp?.[0];
      if (totp) { setBusy(false); return setMfa({ factorId: totp.id }); }
    }
    router.replace(nextPath());
  }

  async function verify(token = code) {
    if (!mfa || token.length < 6) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfa.factorId, code: token });
    setBusy(false);
    if (error) { setCode(""); return setErr("That code didn’t work. Try the latest one from your app."); }
    router.replace(nextPath());
  }

  if (mfa) {
    return (
      <AuthLayout bentoTitle={LOGIN_BENTO}>
        <span className="auth-icon"><ShieldCheck size={20} /></span>
        <h1 className="title">Enter your authentication code</h1>
        <p className="sub">Open your authenticator app and enter the 6-digit code for Dozzier.</p>
        <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} />
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-brand btn-block" disabled={busy || code.length < 6} onClick={() => verify()}>{busy ? "Verifying…" : "Verify"}</button>
        <p className="caption muted">Lost your device? <button className="link caption" onClick={() => setNote("Contact your workspace admin or support@dozzier.io to reset two-factor authentication.")}>Get help signing in</button></p>
        {note && <div className="notice info"><Info size={16} />{note}</div>}
      </AuthLayout>
    );
  }

  const social = async (p: string) => {
    if (p === "SSO") { setErr(null); setNote(null); return setSso(true); }
    setNote(null); const err = await startOAuth(p === "Microsoft" ? "azure" : "google", nextPath()); if (err) setNote(err);
  };

  if (sso && methods?.sso !== false) {
    return (
      <AuthLayout bentoTitle={LOGIN_BENTO}>
        <form onSubmit={ssoSubmit} className="col" style={{ gap: 18 }}>
          <button type="button" className="row gap-6 caption medium muted" style={{ alignSelf: "flex-start" }} onClick={() => { setSso(false); setErr(null); }}><ArrowLeft size={14} />All log in options</button>
          <span className="auth-icon"><Building2 size={20} /></span>
          <h1 className="title">Log in with SSO</h1>
          <p className="sub">Enter your work email and we’ll send you to your company’s login.</p>
          <label className="field"><span className="label">Work email</span><input className="input" type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
          {err && <p className="error-text">{err}</p>}
          <button className="btn btn-brand btn-block" disabled={busy}>{busy ? "Redirecting…" : "Continue"}</button>
          <p className="caption muted center">Single sign-on is set up by your company on Dozzier Enterprise. <a className="link caption" href="/talk-to-sales">Talk to sales</a></p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout bentoTitle={LOGIN_BENTO}>
      <form onSubmit={submit} className="col" style={{ gap: 18 }}>
        <h1 className="title">Log in to Dozzier</h1>
        {methods?.google && <SocialButton provider="google" label="Continue with Google" onClick={() => social("Google sign-in")} />}
        {methods?.microsoft && <SocialButton provider="microsoft" label="Continue with Microsoft" onClick={() => social("Microsoft")} />}
        {methods?.sso && <SocialButton provider="sso" label="Continue with SSO" onClick={() => social("SSO")} />}
        {note && <div className="notice info"><Info size={16} />{note}</div>}
        {anySocial && <OrDivider />}
        <label className="field"><span className="label">Email</span><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
        <label className="field"><span className="label">Password</span><input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div className="row">
          <label className="checkbox grow"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />Keep me signed in</label>
          <Link href="/forgot-password" className="link" style={{ fontSize: 14 }}>Forgot password?</Link>
        </div>
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-brand btn-block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        <p className="auth-switch">New to Dozzier? <Link href="/signup">Create account</Link></p>
      </form>
    </AuthLayout>
  );
}
