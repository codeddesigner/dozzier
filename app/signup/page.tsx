"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthLayout, OrDivider, SIGNUP_BENTO, SocialButton } from "@/components/AuthLayout";

const PERSONAL = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "proton.me", "protonmail.com", "live.com", "me.com"];

/** "randombase.com" → "Randombase" */
function workspaceFromEmail(email: string) {
  const d = email.split("@")[1] || "";
  if (!d || PERSONAL.includes(d)) return "My workspace";
  const base = d.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "details">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Invite emails link here with ?email= so the invitee signs up with the invited address.
  useEffect(() => { try { const e = new URLSearchParams(window.location.search).get("email"); if (e) setEmail(e); } catch {} }, []);
  const domain = email.split("@")[1]?.toLowerCase() || "";
  const personal = PERSONAL.includes(domain);

  function next(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Enter a valid email address");
    setStep("details");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setErr("Use at least 8 characters for your password");
    setBusy(true); setErr(null);
    const clean = email.trim().toLowerCase();
    const { error } = await supabase.rpc("register_user", { p_email: clean, p_password: password, p_full_name: name.trim(), p_workspace: workspaceFromEmail(clean) });
    if (error) { setBusy(false); return setErr(error.message.includes("already") ? "An account with this email already exists. Log in instead." : error.message); }
    const { error: e2 } = await supabase.auth.signInWithPassword({ email: clean, password });
    if (e2) { setBusy(false); return setErr(e2.message); }
    router.replace("/onboarding");
  }

  const social = (p: string) => setNote(`${p} sign-in isn’t switched on for this workspace yet — continue with your work email for now.`);

  return (
    <AuthLayout bentoTitle={SIGNUP_BENTO} topRight={<>Already have an account? <Link href="/login">Log in</Link></>}>
      {step === "email" ? (
        <form onSubmit={next} className="col" style={{ gap: 18 }}>
          <h1 className="title">Create your Dozzier account</h1>
          <p className="sub">Free for 14 days. No credit card required.</p>
          <SocialButton provider="google" label="Continue with Google" onClick={() => social("Google")} />
          <SocialButton provider="microsoft" label="Continue with Microsoft" onClick={() => social("Microsoft")} />
          {note && <div className="notice info"><Info size={16} />{note}</div>}
          <OrDivider />
          <label className="field"><span className="label">Work email</span>
            <input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            {personal && <span className="caption faint">Tip: use your work email so teammates can find your workspace.</span>}
          </label>
          {err && <p className="error-text">{err}</p>}
          <button className="btn btn-brand btn-block">Continue with email</button>
          <p className="caption faint center">By continuing you agree to Dozzier’s <Link href="/legal/terms" className="link" style={{ fontWeight: 400 }}>Terms of Service</Link> and <Link href="/legal/privacy" className="link" style={{ fontWeight: 400 }}>Privacy Policy</Link>.</p>
        </form>
      ) : (
        <form onSubmit={create} className="col" style={{ gap: 18 }}>
          <button type="button" className="row gap-6 caption medium muted" style={{ alignSelf: "flex-start" }} onClick={() => setStep("email")}><ArrowLeft size={14} />{email}</button>
          <h1 className="title">Finish creating your account</h1>
          <p className="sub">Add your name and a password for Dozzier.</p>
          <label className="field"><span className="label">Full name</span><input className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Chidera Okafor" autoComplete="name" /></label>
          <label className="field"><span className="label">Password</span><input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
          {err && <p className="error-text">{err}</p>}
          <button className="btn btn-brand btn-block" disabled={busy}>{busy ? "Creating your account…" : "Create account"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
