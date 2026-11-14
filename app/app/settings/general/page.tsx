"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, BUCKET } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";
import { Card, Row, Select, SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";

type W = { slug: string; timezone: string; language: string; keep_analytics: string; keep_deleted: string };

export default function General() {
  const { profile, userId, refreshProfile } = useApp();
  const slugify = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);
  const s = useSetting<W>("workspace", { slug: slugify(profile.workspace_name || "workspace"), timezone: "(GMT+00:00) London", language: "English (UK)", keep_analytics: "Forever", keep_deleted: "30 days" });
  const [name, setName] = useState(profile.workspace_name || "");
  const [logo, setLogo] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (profile.brand_logo_path) supabase.storage.from(BUCKET).createSignedUrl(profile.brand_logo_path, 3600).then(({ data }) => setLogo(data?.signedUrl || null)); }, [profile.brand_logo_path]);
  const v = s.value;

  async function upload(f: File) {
    if (f.size > 2 * 1024 * 1024) return toast("Logo must be under 2 MB");
    const path = `${userId}/brand/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) return toast(error.message);
    await supabase.from("profiles").update({ brand_logo_path: path }).eq("id", userId);
    await refreshProfile(); toast("Logo updated");
  }

  return (
    <>
      <SettingsHead title="General" sub={`Settings that apply to everyone in ${profile.workspace_name || "your workspace"}.`} action={<SaveButton saving={s.saving} onClick={() => { if (!name.trim()) return toast("Workspace name can’t be empty"); s.save({ workspace_name: name.trim() }); }} />} />
      <Card title="Workspace">
        <div className="row gap-12">
          <span className="ws-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" /> : (name || "W").slice(0, 2).toUpperCase()}
          </span>
          <button className="btn btn-secondary btn-s" onClick={() => file.current?.click()}>Change logo</button>
          <input ref={file} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
        <div className="set-grid">
          <label className="field"><span className="label">Workspace name</span><input className="input" value={name} onChange={(e) => { setName(e.target.value); s.setDirty(true); }} /></label>
          <label className="field"><span className="label">Workspace URL</span>
            <span className="input row" style={{ gap: 0 }}><input style={{ border: 0, outline: 0, flex: 1, minWidth: 0, background: "none" }} value={v.slug} onChange={(e) => s.update({ ...v, slug: slugify(e.target.value) })} /><span className="faint">.dozzier.io</span></span>
            <span className="caption faint">Changing this updates old app links automatically.</span></label>
          <label className="field"><span className="label">Default time zone</span><select className="input" value={v.timezone} onChange={(e) => s.update({ ...v, timezone: e.target.value })}>{["(GMT-05:00) New York", "(GMT+00:00) London", "(GMT+01:00) Lagos", "(GMT+01:00) Paris", "(GMT+04:00) Dubai", "(GMT+08:00) Singapore"].map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="field"><span className="label">Default language</span><select className="input" value={v.language} onChange={(e) => s.update({ ...v, language: e.target.value })}><option>English (UK)</option><option>English (US)</option></select></label>
        </div>
      </Card>
      <Card title="Data retention" sub="How long visitor analytics and deleted content are kept.">
        <Row title="Visitor analytics" sub="Keep for"><Select value={v.keep_analytics} onChange={(x) => s.update({ ...v, keep_analytics: x })} options={["Forever", "2 years", "1 year", "90 days"]} /></Row>
        <Row title="Deleted content" sub="Recoverable for"><Select value={v.keep_deleted} onChange={(x) => s.update({ ...v, keep_deleted: x })} options={["30 days", "14 days", "7 days"]} /></Row>
      </Card>
      <Card title="Danger zone" danger>
        <Row title="Transfer ownership" sub="Make another admin the workspace owner"><button className="btn btn-outline btn-s" disabled title="Invite an admin first">Transfer</button></Row>
        <Row title="Delete workspace" sub="All content, links and analytics will be permanently deleted"><Link href="/app/settings/security" className="btn btn-danger btn-s">Delete workspace</Link></Row>
      </Card>
    </>
  );
}
