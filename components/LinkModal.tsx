"use client";
import { linkUrlFor } from "@/lib/linkBase";
import { useMemo, useState } from "react";
import { Mail, Download, Lock, Calendar, FileCheck2, FileSignature, Users, Scan, Bell, Link2, Copy, ShieldCheck } from "lucide-react";
import { Modal, Tabs, Toggle, copy, toast } from "./ui";
import { supabase, Link } from "@/lib/supabase";
import { slugify } from "@/lib/format";
import { useApp } from "@/components/AppContext";
import { standardPreset } from "@/lib/linkDefaults";
import { LinkReady } from "./LinkReady";

export function linkUrl(slug: string) {
  return linkUrlFor(slug);
}

type Draft = Omit<Link, "id" | "created_at" | "document_id" | "space_id">;

export function LinkModal({ documentId, spaceId, existing, defaultName, docName, onClose, onSaved }: {
  documentId?: string; spaceId?: string; existing?: Link | null; defaultName?: string; docName?: string; onClose: () => void; onSaved: (l: Link) => void;
}) {
  const { profile } = useApp();
  const preset = standardPreset(profile.settings);
  const initial = useMemo<Draft>(() => existing ? { ...existing } : {
    name: defaultName || "", slug: slugify(defaultName || "link"), enabled: true,
    require_email: preset.require_email.on, verify_email: false, allow_download: preset.allow_download.on, passcode: null,
    expires_at: preset.expiry.on ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
    watermark: preset.watermark.on, require_nda: preset.require_nda.on, allowed_domains: null, screenshot_protection: false, notify: preset.notify.on,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, defaultName]);
  const [d, setD] = useState<Draft>(initial);
  const [tab, setTab] = useState<"access" | "security" | "branding" | "notifications">("access");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState<Link | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!d.name.trim()) return setErr("Give this link a name, e.g. the recipient's company");
    setBusy(true); setErr(null);
    const payload = {
      name: d.name.trim(), slug: d.slug, enabled: d.enabled, require_email: d.require_email || d.verify_email, verify_email: d.verify_email, allow_download: d.allow_download,
      passcode: d.passcode?.trim() || null, expires_at: d.expires_at, watermark: d.watermark, require_nda: d.require_nda,
      allowed_domains: d.allowed_domains?.trim() || null, screenshot_protection: d.screenshot_protection, notify: d.notify,
    };
    const res = existing
      ? await supabase.from("links").update(payload).eq("id", existing.id).select("*").single()
      : await supabase.from("links").insert({ ...payload, document_id: documentId || null, space_id: spaceId || null }).select("*").single();
    setBusy(false);
    if (res.error) return setErr(res.error.message.includes("duplicate") ? "That link address is taken — try another" : res.error.message);
    if (!existing) { copy(linkUrl(res.data.slug), "Link created and copied to clipboard"); setReady(res.data as Link); return; }
    toast("Link settings saved");
    onSaved(res.data as Link);
  }

  const lockKey: Record<string, string> = { "Require email to view": "require_email", "Allow downloads": "allow_download", "Dynamic watermark": "watermark", "Require NDA": "require_nda", "Link expiration": "expiry", "Notify me on every visit": "notify" };
  const locked = (title: string) => !!preset[lockKey[title]]?.locked;
  const rows: { icon: typeof Mail; title: string; desc: string; on: boolean; set: (v: boolean) => void; extra?: React.ReactNode }[] = [
    { icon: Mail, title: "Require email to view", desc: "Visitors enter their email before the document opens.", on: d.require_email || d.verify_email, set: (v) => { set("require_email", v); if (!v) set("verify_email", false); } },
    { icon: ShieldCheck, title: "Verify email with a code", desc: "We email visitors a 6-digit code, so every view is tied to a real inbox.", on: d.verify_email, set: (v) => { set("verify_email", v); if (v) set("require_email", true); } },
    { icon: Download, title: "Allow downloads", desc: "Let visitors download a copy of the file.", on: d.allow_download, set: (v) => set("allow_download", v) },
    { icon: Lock, title: "Require passcode", desc: "Share a passcode separately for extra protection.", on: d.passcode !== null, set: (v) => set("passcode", v ? "" : null),
      extra: d.passcode !== null && <input className="input" placeholder="Passcode" value={d.passcode || ""} onChange={(e) => set("passcode", e.target.value)} /> },
    { icon: Calendar, title: "Link expiration", desc: d.expires_at ? `Disable this link on ${new Date(d.expires_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.` : "Disable this link automatically on a date.",
      on: d.expires_at !== null, set: (v) => set("expires_at", v ? new Date(Date.now() + 30 * 86400000).toISOString() : null),
      extra: d.expires_at !== null && <input className="input" type="date" value={d.expires_at?.slice(0, 10) || ""} onChange={(e) => set("expires_at", e.target.value ? new Date(e.target.value + "T23:59:00").toISOString() : null)} /> },
    { icon: FileCheck2, title: "Dynamic watermark", desc: "Stamp each page with the viewer’s email and time.", on: d.watermark, set: (v) => set("watermark", v) },
    { icon: FileSignature, title: "Require NDA", desc: "Visitors accept your agreement before viewing.", on: d.require_nda, set: (v) => set("require_nda", v) },
    { icon: Users, title: "Allow or block visitors", desc: d.allowed_domains ? `Only people @${d.allowed_domains.split(",")[0].trim()}${d.allowed_domains.includes(",") ? " (and more)" : ""} can open this link.` : "Restrict this link to specific email domains.",
      on: d.allowed_domains !== null, set: (v) => { set("allowed_domains", v ? "" : null); if (v) set("require_email", true); },
      extra: d.allowed_domains !== null && <input className="input" placeholder="randombase.com, acmevc.com" value={d.allowed_domains || ""} onChange={(e) => set("allowed_domains", e.target.value)} /> },
    { icon: Scan, title: "Screenshot protection", desc: "Blur content when the window loses focus.", on: d.screenshot_protection, set: (v) => set("screenshot_protection", v) },
    { icon: Bell, title: "Notify me on every visit", desc: "Real-time in-app alert with page analytics.", on: d.notify, set: (v) => set("notify", v) },
  ];
  const visible = tab === "access" ? rows.slice(0, 8) : tab === "security" ? [rows[1], rows[3], rows[7], rows[8]] : tab === "notifications" ? [rows[9]] : [];

  if (ready) return <LinkReady link={ready} docName={docName || defaultName} documentId={documentId} onDone={() => onSaved(ready)} />;
  return (
    <Modal title={existing ? "Link settings" : "Create link"} onClose={onClose}
      footer={<><span className="caption faint grow">Changes apply to this link only</span><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : existing ? "Save" : "Create link"}</button></>}>
      <label className="field"><span className="label">Link name</span>
        <input className="input" autoFocus value={d.name} placeholder="Thiscompany — Series A" onChange={(e) => { set("name", e.target.value); if (!existing) set("slug", slugify(e.target.value)); }} /></label>
      <div className="row gap-8 brand mt-16" style={{ background: "var(--dz-bg-brand-subtle)", borderRadius: 8, padding: "10px 12px" }}>
        <Link2 size={16} /><span className="grow ellipsis medium">{linkUrl(d.slug).replace(/^https?:\/\//, "")}</span>
        <button className="icon-btn s" aria-label="Copy link" onClick={() => copy(linkUrl(d.slug))}><Copy size={14} /></button>
      </div>
      <div className="mt-16"><Tabs tabs={[{ id: "access", label: "Access" }, { id: "security", label: "Security" }, { id: "branding", label: "Branding" }, { id: "notifications", label: "Notifications" }]} value={tab} onChange={setTab} /></div>
      <div className="col mt-8">
        {tab === "branding" && <p className="muted" style={{ padding: "16px 0" }}>Links use your workspace branding from Settings → Branding (logo, accent colour and welcome message).</p>}
        {visible.map((r) => (
          <div key={r.title} className="col gap-8" style={{ padding: "12px 0" }}>
            <div className="row" style={{ gap: 14 }}>
              <span className="icon-tile" style={{ width: 36, height: 36, borderRadius: 8, background: r.on ? "var(--dz-bg-brand-subtle)" : "var(--dz-bg-muted)", color: r.on ? "var(--dz-icon-brand)" : "var(--dz-icon-secondary)" }}><r.icon size={18} /></span>
              <div className="grow col" style={{ gap: 2 }}><div className="medium body-m">{r.title}</div><div className="caption muted">{r.desc}</div></div>
              {locked(r.title) && <span className="caption faint row gap-6" title="Locked in Settings → Link defaults"><Lock size={12} />Locked</span>}
              <Toggle on={r.on} onChange={r.set} disabled={locked(r.title)} />
            </div>
            {r.extra && <div style={{ paddingLeft: 50 }}>{r.extra}</div>}
          </div>
        ))}
      </div>
      {err && <p className="error-text mt-8">{err}</p>}
    </Modal>
  );
}
