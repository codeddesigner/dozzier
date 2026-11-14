"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { OtpInput } from "@/components/OtpInput";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";

export default function Settings() {
  const { profile, email, refreshProfile } = useApp();
  const [name, setName] = useState(profile.full_name || "");
  const [ws, setWs] = useState(profile.workspace_name || "");
  const [pw, setPw] = useState("");
  async function save() {
    await supabase.from("profiles").update({ full_name: name.trim(), workspace_name: ws.trim() }).eq("id", profile.id);
    await refreshProfile(); toast("Settings saved");
  }
  async function changePw() {
    if (pw.length < 8) return toast("Use at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    toast(error ? error.message : "Password updated"); setPw("");
  }
  return (
    <div className="content" style={{ maxWidth: 640, margin: 0 }}>
      <div className="page-head"><h1 className="page-title">Settings</h1></div>
      <div className="card col gap-16 mt-16" style={{ padding: 24 }}>
        <div className="h2">Profile & workspace</div>
        <label className="field"><span className="label">Your name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span className="label">Workspace name</span><input className="input" value={ws} onChange={(e) => setWs(e.target.value)} /><span className="caption faint">Visitors see this as the sender of your links.</span></label>
        <label className="field"><span className="label">Email</span><input className="input" value={email} disabled /></label>
        <div><button className="btn btn-dark" onClick={save}>Save changes</button></div>
      </div>
      <div className="card col gap-16 mt-24" style={{ padding: 24 }}>
        <div className="h2">Password</div>
        <label className="field"><span className="label">New password</span><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        <div><button className="btn btn-secondary" onClick={changePw}>Update password</button></div>
      </div>
      <TwoFactor />
    </div>
  );
}

function TwoFactor() {
  const [factor, setFactor] = useState<{ id: string; status: string } | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactor(data?.totp?.find((f) => f.status === "verified") || null);
  };
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
    <div className="card col gap-16 mt-24" style={{ padding: 24 }}>
      <div className="row gap-12"><span className="auth-icon" style={{ width: 36, height: 36 }}><ShieldCheck size={18} /></span>
        <div className="col grow"><div className="h2">Two-factor authentication</div><span className="caption muted">Ask for a code from an authenticator app when you log in.</span></div>
        {factor && <span className="badge badge-success"><span className="dot" />On</span>}</div>
      {factor === undefined ? null : factor ? (
        <div><button className="btn btn-secondary" onClick={off}>Turn off</button></div>
      ) : enroll ? (
        <div className="col gap-12">
          <p className="muted">Scan this QR code with Google Authenticator, 1Password or Authy, then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code for your authenticator app" width={160} height={160} style={{ border: "1px solid var(--dz-border-default)", borderRadius: 8 }} />
          <span className="caption faint">Can’t scan? Enter this key: <code>{enroll.secret}</code></span>
          <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} />
          <div className="row gap-8"><button className="btn btn-dark" disabled={busy || code.length < 6} onClick={() => verify()}>Verify and turn on</button><button className="btn btn-ghost" onClick={() => setEnroll(null)}>Cancel</button></div>
        </div>
      ) : (
        <div><button className="btn btn-dark" disabled={busy} onClick={start}>Set up two-factor</button></div>
      )}
    </div>
  );
}
