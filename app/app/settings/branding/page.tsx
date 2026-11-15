"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Toggle, toast } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { Card, Row, SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";

const SWATCHES = ["#2577ea", "#111827", "#1e9e5a", "#6b5bd6", "#e8508f", "#f08a24"];
type B = { viewer: "dark" | "light"; welcome: string; show_shared_by: boolean };

export default function Branding() {
  const { profile, userId, refreshProfile } = useApp();
  const s = useSetting<B>("branding", { viewer: "dark", welcome: "Thanks for taking a look — questions welcome on any page.", show_shared_by: true });
  const [color, setColor] = useState(profile.brand_color || "#2577ea");
  const [hide, setHide] = useState(!!profile.hide_branding);
  const [logo, setLogo] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const paid = profile.plan !== "trial" && profile.plan !== "personal";
  useEffect(() => { if (profile.brand_logo_path) supabase.storage.from(BUCKET).createSignedUrl(profile.brand_logo_path, 3600).then(({ data }) => setLogo(data?.signedUrl || null)); }, [profile.brand_logo_path]);
  const v = s.value;
  const validHex = /^#[0-9a-f]{6}$/i.test(color);

  async function upload(f: File) {
    if (f.size > 2 * 1024 * 1024) return toast("Logo must be under 2 MB");
    const path = `${userId}/brand/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) return toast(error.message);
    await supabase.from("profiles").update({ brand_logo_path: path }).eq("id", userId);
    await refreshProfile(); toast("Logo updated");
  }
  const dark = v.viewer === "dark";

  return (
    <>
      <SettingsHead title="Branding" sub="What visitors see when they open your links." action={<SaveButton saving={s.saving} onClick={() => { if (!validHex) return toast("Accent must be a hex colour like #4D94F7"); s.save({ brand_color: color, hide_branding: hide }); }} />} />
      <div className="set-split">
        <div className="col gap-16 grow" style={{ minWidth: 0 }}>
          <Card title="Logo & colour">
            <div className="row gap-12">
              <span className="ws-logo">{/* eslint-disable-next-line @next/next/no-img-element */}{logo ? <img src={logo} alt="" /> : (profile.workspace_name || "W").slice(0, 2).toUpperCase()}</span>
              <button className="btn btn-secondary btn-s" onClick={() => file.current?.click()}>{logo ? "Replace" : "Upload logo"}</button>
              <input ref={file} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </div>
            <div className="row gap-8">{SWATCHES.map((c) => <button key={c} aria-label={`Accent ${c}`} className={`swatch ${color.toLowerCase() === c ? "on" : ""}`} style={{ background: c }} onClick={() => { setColor(c); s.setDirty(true); }} />)}</div>
            <label className="field"><span className="label">Accent hex</span><input className="input" value={color} onChange={(e) => { setColor(e.target.value); s.setDirty(true); }} style={{ borderColor: validHex ? undefined : "var(--dz-text-danger)" }} /></label>
          </Card>
          <Card title="Viewer">
            <div className="row gap-8">{(["dark", "light"] as const).map((t) => <button key={t} className={`pill-opt ${v.viewer === t ? "on" : ""}`} onClick={() => s.update({ ...v, viewer: t })}>{t === "dark" ? "Dark viewer" : "Light viewer"}</button>)}</div>
            <label className="field"><span className="label">Welcome message</span><textarea className="input" rows={2} value={v.welcome} onChange={(e) => s.update({ ...v, welcome: e.target.value })} /></label>
            <Row title="Show “Shared by” card" sub="Your name, title and booking link from your profile"><Toggle on={v.show_shared_by} onChange={(x) => s.update({ ...v, show_shared_by: x })} /></Row>
            <Row title="Remove “Secured by Dozzier”" sub={paid ? "Hide our footer on your links" : "Available on Standard and above"}><Toggle on={hide} disabled={!paid} onChange={(x) => { setHide(x); s.setDirty(true); }} /></Row>
          </Card>
        </div>
        <div style={{ width: 340, flexShrink: 0 }}>
          <div className="preview-browser" style={{ position: "sticky", top: 16 }}>
            <div className="bar"><span className="dot" style={{ background: "#ff5f57" }} /><span className="dot" style={{ background: "#febc2e" }} /><span className="dot" style={{ background: "#28c840" }} /><span className="url">{profile.custom_domain || "dozzier.co"}/v/series-a</span></div>
            <div style={{ background: dark ? "#111827" : "#f3f5f7", padding: "28px 20px 0", transition: "background-color .4s ease", minHeight: 380 }}>
              <div className="col gap-10 preview-gate" style={{ background: "#fff", borderRadius: "14px 14px 0 0", padding: "24px 20px", textAlign: "center", alignItems: "center", boxShadow: "var(--shadow-lg)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logo ? <img src={logo} alt="" style={{ height: 28, maxWidth: 120, objectFit: "contain" }} /> : <LogoMark size={28} color={validHex ? color : "#2577ea"} />}
                <div className="h3">{profile.workspace_name || "Your workspace"} shared “Dozzier Intro”</div>
                {v.welcome && <p className="caption muted">{v.welcome}</p>}
                <input className="input" placeholder="you@company.com" readOnly tabIndex={-1} />
                <span className="btn btn-block" style={{ background: validHex ? color : "#2577ea", color: "#fff", transition: "background-color .4s" }}>Continue</span>
                {!hide && <span className="caption faint row gap-6"><ShieldCheck size={12} />Secured by Dozzier</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
