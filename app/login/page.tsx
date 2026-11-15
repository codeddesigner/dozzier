"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthLayout, LOGIN_BENTO, OrDivider, SocialButton } from "@/components/AuthLayout";
import { OtpInput } from "@/components/OtpInput";

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
    router.replace("/app");
  }

  async function verify(token = code) {
    if (!mfa || token.length < 6) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfa.factorId, code: token });
    setBusy(false);
    if (error) { setCode(""); return setErr("That code didn’t work. Try the latest one from your app."); }
    router.replace("/app");
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

  const social = (p: string) => setNote(`${p} isn’t switched on for this workspace yet — log in with your email and password.`);

  return (
    <AuthLayout bentoTitle={LOGIN_BENTO} topRight={<>New to Dozzier? <Link href="/signup">Create account</Link></>}>
      <form onSubmit={submit} className="col" style={{ gap: 18 }}>
        <h1 className="title">Log in to Dozzier</h1>
        <SocialButton provider="google" label="Continue with Google" onClick={() => social("Google sign-in")} />
        <SocialButton provider="sso" label="Continue with SSO" onClick={() => social("SSO")} />
        {note && <div className="notice info"><Info size={16} />{note}</div>}
        <OrDivider />
        <label className="field"><span className="label">Email</span><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
        <label className="field"><span className="label">Password</span><input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div className="row">
          <label className="checkbox grow"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />Keep me signed in</label>
          <Link href="/forgot-password" className="link" style={{ fontSize: 14 }}>Forgot password?</Link>
        </div>
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-brand btn-block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      </form>
    </AuthLayout>
  );
}
