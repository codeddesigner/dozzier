"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui";
import { OtpInput } from "@/components/OtpInput";
import { Row } from "@/components/settings/kit";

/** TOTP two-factor: set up with a QR code, verify, or turn off. */
export function TwoFactorRow() {
  const [factor, setFactor] = useState<{ id: string } | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await supabase.auth.mfa.listFactors(); setFactor(data?.totp?.find((f) => f.status === "verified") || null); };
  useEffect(() => { load(); }, []);
  async function start() {
    setBusy(true);
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of (list?.all || []).filter((f) => f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Dozzier ${Date.now()}` });
    setBusy(false);
    if (error || !data) return toast(error?.message || "Couldn’t start setup");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function verify(token = code) {
    if (!enroll || token.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: token });
    setBusy(false);
    if (error) { setCode(""); return toast("That code didn’t work — try the latest one"); }
    setEnroll(null); setCode(""); toast("Two-factor authentication is on"); load();
  }
  async function off() {
    if (!factor) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    toast(error ? error.message : "Two-factor authentication turned off"); load();
  }
  return (
    <>
      <Row title="Two-factor authentication" sub={factor ? "Authenticator app" : "Ask for a code from an authenticator app at sign-in"}>
        {factor === undefined ? null : factor ? <><span className="badge badge-success"><span className="dot" />On</span><button className="btn btn-ghost btn-s" onClick={off}>Turn off</button></> : !enroll && <button className="btn btn-secondary btn-s" disabled={busy} onClick={start}>Set up</button>}
      </Row>
      {enroll && (
        <div className="col gap-12 cycle-item" style={{ padding: "4px 0 12px" }}>
          <p className="muted" style={{ fontSize: 14 }}>Scan with Google Authenticator, 1Password or Authy, then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code for your authenticator app" width={150} height={150} style={{ border: "1px solid var(--dz-border-default)", borderRadius: 8, background: "#fff" }} />
          <span className="caption faint">Can’t scan? Key: <code>{enroll.secret}</code></span>
          <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} />
          <div className="row gap-8"><button className="btn btn-primary btn-s" disabled={busy || code.length < 6} onClick={() => verify()}>Verify and turn on</button><button className="btn btn-ghost btn-s" onClick={() => setEnroll(null)}>Cancel</button></div>
        </div>
      )}
    </>
  );
}
