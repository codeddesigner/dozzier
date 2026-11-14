"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthLayout, LOGIN_BENTO } from "@/components/AuthLayout";

export default function ResetPassword() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === "PASSWORD_RECOVERY" || s) setReady(true); });
    supabase.auth.getSession().then(({ data }) => setReady((r) => r || !!data.session));
    const t = setTimeout(() => setReady((r) => r ?? false), 2500);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters");
    if (pw !== pw2) return setErr("Passwords don’t match");
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace("/app");
  }

  return (
    <AuthLayout bentoTitle={LOGIN_BENTO} topRight={<>Remembered it? <Link href="/login">Log in</Link></>}>
      <span className="auth-icon"><KeyRound size={20} /></span>
      {ready === false ? (
        <>
          <h1 className="title">This reset link has expired</h1>
          <p className="sub">Reset links work once and expire after an hour.</p>
          <Link href="/forgot-password" className="btn btn-primary btn-block">Send a new link</Link>
        </>
      ) : (
        <form onSubmit={submit} className="col" style={{ gap: 18 }}>
          <h1 className="title">Choose a new password</h1>
          <p className="sub">You’ll be signed in right after.</p>
          <label className="field"><span className="label">New password</span><input className="input" type="password" required autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
          <label className="field"><span className="label">Confirm password</span><input className="input" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
          {err && <p className="error-text">{err}</p>}
          <button className="btn btn-primary btn-block" disabled={busy || !ready}>{busy ? "Saving…" : "Update password"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
