"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthLayout, LOGIN_BENTO } from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // Always show the same message, whether or not the account exists.
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false); setSent(true);
  }

  return (
    <AuthLayout bentoTitle={LOGIN_BENTO} topRight={<>Remembered it? <Link href="/login">Log in</Link></>}>
      <form onSubmit={submit} className="col" style={{ gap: 18 }}>
        <h1 className="title">Reset your password</h1>
        <p className="sub">Enter your email and we’ll send a secure reset link.</p>
        <label className="field"><span className="label">Email</span><input className="input" type="email" required autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} placeholder="you@company.com" autoComplete="email" /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        {sent && (
          <div className="notice success" role="status"><CheckCircle2 size={16} /><span className="grow">If an account exists, a reset link is on its way.</span>
            <button type="button" className="icon-btn s" aria-label="Dismiss" onClick={() => setSent(false)}><X size={14} /></button></div>
        )}
      </form>
    </AuthLayout>
  );
}
