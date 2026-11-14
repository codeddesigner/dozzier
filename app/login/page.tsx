"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppIcon } from "@/components/Logo";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setErr(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    router.replace("/app");
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <Link href="/" style={{ alignSelf: "center" }}><AppIcon size={40} /></Link>
        <div className="center"><div className="h1">Log in to Dozzier</div><p className="muted mt-8">Welcome back — see who’s reading.</p></div>
        <label className="field"><span className="label">Email</span><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
        <label className="field"><span className="label">Password</span><input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="error-text">{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        <p className="center caption muted">New to Dozzier? <Link href="/signup" className="brand medium">Start free</Link></p>
      </form>
    </div>
  );
}
