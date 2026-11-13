"use client";
import { useState } from "react";
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
    </div>
  );
}
