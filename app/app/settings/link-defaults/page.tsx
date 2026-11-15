"use client";
import { useState } from "react";
import { Mail, Download, FileCheck2, Calendar, FileText, Bell, Lock, LockOpen } from "lucide-react";
import { Toggle } from "@/components/ui";
import { SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";
import { DEFAULT_PRESETS, type LinkDefault, type Preset } from "@/lib/linkDefaults";

const ROWS: [string, typeof Mail, string, string][] = [
  ["require_email", Mail, "Require email to view", "Visitors verify email before opening."],
  ["allow_download", Download, "Allow downloads", "Let visitors download a PDF copy."],
  ["watermark", FileCheck2, "Dynamic watermark", "Stamp viewer email, time and IP on every page."],
  ["expiry", Calendar, "Link expiration", "Expire links 30 days after creation."],
  ["require_nda", FileText, "Require NDA", "Ask visitors to sign the default NDA."],
  ["notify", Bell, "Notify owner on every visit", "Alert the link owner on each visit."],
];

export default function LinkDefaults() {
  const s = useSetting<Record<string, Preset>>("link_defaults", DEFAULT_PRESETS);
  const [tab, setTab] = useState("Standard");
  const presets = { ...DEFAULT_PRESETS, ...s.value };
  const p = presets[tab];
  const set = (k: string, patch: Partial<LinkDefault>) => s.update({ ...presets, [tab]: { ...p, [k]: { ...p[k], ...patch } } });
  return (
    <>
      <SettingsHead title="Link defaults" sub="New links start with these settings. Locked settings can’t be changed per link." action={<SaveButton onClick={() => s.save()} saving={s.saving} />} />
      <div className="row gap-8 wrap">{Object.keys(presets).map((t) => <button key={t} className={`pill-opt ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      <section className="set-card ld-list" key={tab}>
        {ROWS.map(([k, I, t, d], i) => (
          <div className="set-row cycle-item" key={k} style={{ animationDelay: `${i * 40}ms` }}>
            <span className="set-row-ico"><I size={16} /></span>
            <div className="grow"><div className="medium">{t}</div><div className="caption muted">{d}</div></div>
            <Toggle on={p[k].on} onChange={(x) => set(k, { on: x })} />
            <button className={`lock-btn ${p[k].locked ? "on" : ""}`} onClick={() => set(k, { locked: !p[k].locked })} aria-pressed={p[k].locked}>
              {p[k].locked ? <Lock size={12} /> : <LockOpen size={12} />}{p[k].locked ? "Locked" : "Editable"}
            </button>
          </div>
        ))}
      </section>
      <p className="caption muted">The Standard preset is used when you create a link from Content.</p>
    </>
  );
}
