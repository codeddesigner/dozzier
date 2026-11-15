"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, Image as ImageIcon, Folder as FolderIcon, MoreHorizontal, Plus } from "lucide-react";
import { SPACE_TEMPLATES } from "@/components/templates";
import { createSpace } from "@/components/SpacePicker";
import { Avatar, toast } from "@/components/ui";
import { useApp } from "@/components/AppContext";

/** Figma "Screen / Spaces · New data room": live preview of a template + template gallery. */
export default function SpaceTemplates() {
  const router = useRouter();
  const { profile, email } = useApp();
  const [pick, setPick] = useState(2);
  const [busy, setBusy] = useState<number | null>(null);
  const t = SPACE_TEMPLATES[pick];

  async function use(i: number) {
    setBusy(i);
    try {
      const tpl = SPACE_TEMPLATES[i];
      const id = await createSpace(tpl, tpl.name, { require_nda: i === 1 || i === 2, watermark: true });
      router.push(`/app/spaces/${id}`);
    } catch (e) { toast(e instanceof Error ? e.message : "Couldn’t create the Space"); setBusy(null); }
  }

  return (
    <div className="st-wrap">
      <div className="st-stage">
        <Link href="/app/spaces" className="st-back"><ChevronLeft size={16} />Spaces</Link>
        <div className="st-card" key={pick}>
          <div className="st-banner" style={{ background: t.banner }}><span className="st-badge">Preview</span></div>
          <div className="st-head">
            <span className="st-logo"><ImageIcon size={24} /></span>
            <div className="col" style={{ gap: 4, paddingTop: 52, minWidth: 0 }}>
              <span className="st-title">{t.name}</span>
              <span className="row gap-6 caption muted">Subtitle · Last updated just now <span className="st-active">Active<ChevronDown size={12} /></span></span>
              <span className="row st-people">
                <Avatar name={profile.full_name} email={email} size={32} color="#ff5a5f" />
                <Avatar name="Paul" size={32} color="#3b8bff" />
                <Avatar name="Cynthia" size={32} color="#ff4f8b" />
                <span className="st-add"><Plus size={14} /></span>
              </span>
            </div>
          </div>
          <div className="st-home">Home</div>
          <table className="table st-table">
            <thead><tr><th style={{ width: 40 }} /><th>Name</th><th>Type</th><th>Updated</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>
              {t.folders.map((f) => (
                <tr key={f}>
                  <td><FolderIcon size={22} fill="#a9c7fb" color="#a9c7fb" /></td>
                  <td><div className="col"><span className="ellipsis st-fname">{f}</span><span className="caption muted">Empty folder</span></div></td>
                  <td>Folder</td><td>Just now</td><td><MoreHorizontal size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="st-side">
        <div className="h2" style={{ marginBottom: 16 }}>Templates</div>
        {SPACE_TEMPLATES.map((x, i) => (
          <div key={x.name} className={`st-tpl ${i === pick ? "on" : ""}`} onClick={() => setPick(i)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setPick(i)}>
            <div className="st-tpl-art"><span style={{ background: x.banner }} /><i /><i /><i /><i /></div>
            <div className="st-tpl-body">
              <span className="medium">{x.name}</span>
              <span className="caption muted">{x.desc}</span>
              <button className="btn btn-brand btn-s" disabled={busy !== null} onClick={(e) => { e.stopPropagation(); use(i); }}>{busy === i ? "Creating…" : "Use template"}</button>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
