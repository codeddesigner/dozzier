"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("register_user", { p_email: email, p_password: password, p_full_name: name, p_workspace: company });
    if (error) { setBusy(false); return setErr(error.message); }
    const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (e2) return setErr(e2.message);
    router.replace("/app");
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <Link href="/" style={{ alignSelf: "center" }}><LogoMark size={40} /></Link>
        <div className="center"><div className="h1">Start your free trial</div><p className="muted mt-8">14 days on any plan. No credit card required.</p></div>
        <label className="field"><span className="label">Your name</span><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Chidera Okafor" autoComplete="name" /></label>
        <label className="field"><span className="label">Company</span><input className="input" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Randombase" autoComplete="organization" /></label>
        <label className="field"><span className="label">Work email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
        <label className="field"><span className="label">Password</span><input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Creating your workspace…" : "Create account"}</button>
        <p className="center caption muted">Already have an account? <Link href="/login" className="brand medium">Log in</Link></p>
      </form>
    </div>
  );
}
