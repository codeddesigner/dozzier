"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Link2, Download, Building2, Copy, Trash2, Settings2, ExternalLink } from "lucide-react";
import { supabase, Link as LinkT } from "@/lib/supabase";
import { Avatar, Menu, Toggle, copy, toast } from "@/components/ui";
import { PageBars } from "@/components/charts";
import { linkUrl } from "@/components/LinkModal";
import { displayName, duration, timeAgo } from "@/lib/format";

export type V = { id: string; link_id: string | null; contact_id: string | null; visitor_email: string | null; location: string | null; duration_seconds: number; pages_viewed: number; downloaded: boolean; is_sample: boolean; started_at: string };
export type PV = { visit_id: string; page_number: number; seconds: number };

function Ring({ pct }: { pct: number }) {
  const r = 8, c = 2 * Math.PI * r;
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-label={`${Math.round(pct * 100)}% read`}><circle cx="11" cy="11" r={r} fill="none" stroke="#dce8ff" strokeWidth="3" /><circle cx="11" cy="11" r={r} fill="none" stroke="#4D94F7" strokeWidth="3" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 11 11)" strokeLinecap="round" /></svg>;
}

export function LinksTable({ links, visitCounts, lastVisit, onChange, onEdit }: {
  links: LinkT[]; visitCounts: Record<string, number>; lastVisit?: Record<string, string>; onChange: () => void; onEdit: (l: LinkT) => void;
}) {
  const router = useRouter();
  async function toggle(l: LinkT, v: boolean) { await supabase.from("links").update({ enabled: v }).eq("id", l.id); toast(v ? "Link enabled" : "Link disabled — visitors can no longer open it"); onChange(); }
  async function del(l: LinkT) { if (!confirm(`Delete link “${l.name}”? Its visit history is deleted too.`)) return; await supabase.from("links").delete().eq("id", l.id); onChange(); }
  return (
    <table className="table caps">
      <thead><tr><th>Name</th><th>Link</th><th /><th>Activity</th></tr></thead>
      <tbody>
        {links.length === 0 && <tr><td colSpan={4} className="table-empty">No links yet. Create one to start tracking.</td></tr>}
        {links.map((l) => (
          <tr key={l.id} className="clickable" onClick={() => router.push(`/app/links/${l.id}`)}>
            <td><div className="row gap-12"><Building2 size={18} className="muted" /><div className="col"><span className="medium">{l.name}</span><span className="caption muted">{timeAgo(lastVisit?.[l.id] || l.created_at)}</span></div></div></td>
            <td style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
              <button className="row gap-8 ellipsis" onClick={() => copy(linkUrl(l.slug))} title="Copy link"
                style={{ background: l.enabled ? "var(--dz-bg-brand-subtle)" : "var(--dz-bg-muted)", borderRadius: 999, padding: "6px 12px", width: "100%", color: l.enabled ? "var(--dz-text-primary)" : "var(--dz-text-disabled)" }}>
                <Link2 size={14} /><span className="ellipsis">{linkUrl(l.slug).replace(/^https?:\/\//, "")}</span>
              </button>
            </td>
            <td onClick={(e) => e.stopPropagation()}><div className="row gap-8"><Toggle on={l.enabled} onChange={(v) => toggle(l, v)} />
              <Menu items={[
                { label: "Copy link", icon: <Copy size={14} />, onClick: () => copy(linkUrl(l.slug)) },
                { label: "Open link", icon: <ExternalLink size={14} />, onClick: () => window.open(`/v/${l.slug}`, "_blank") },
                { label: "Link settings", icon: <Settings2 size={14} />, onClick: () => onEdit(l) },
                { label: "Delete link", icon: <Trash2 size={14} />, danger: true, onClick: () => del(l) },
              ]} /></div></td>
            <td><div className="col"><span>{visitCounts[l.id] || 0}</span><span className="caption muted">visits</span></div></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function VisitRow({ v, pages, pageCount, linkName, onOpen }: { v: V; pages: PV[]; pageCount: number; linkName?: string; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const values = Array.from({ length: Math.max(1, pageCount) }, (_, i) => pages.find((p) => p.page_number === i + 1)?.seconds || 0);
  const pct = Math.min(1, pages.length / Math.max(1, pageCount));
  return (
    <>
      <tr className="clickable" onClick={() => setOpen(!open)}>
        <td><div className="row gap-12"><Avatar email={v.visitor_email} name={displayName(v.visitor_email)} size={32} />
          <div className="col"><span className="row gap-8"><span className="medium">{displayName(v.visitor_email)}</span>{v.is_sample && <span className="tag">Sample visit</span>}</span>
            <span className="caption muted">{v.visitor_email || "Anonymous"} · {timeAgo(v.started_at)}</span></div></div></td>
        <td className="hide-sm"><span className="row gap-6 muted"><Link2 size={14} />{linkName || "—"}</span></td>
        <td className="hide-sm">{v.downloaded && <Download size={16} color="#4D94F7" aria-label="Downloaded" />}</td>
        <td className="nowrap"><div className="row gap-8">{duration(v.duration_seconds)}<Ring pct={pct} /></div></td>
        <td style={{ width: 40 }}><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "" }} /></td>
      </tr>
      {open && (
        <tr><td colSpan={5} style={{ height: "auto", background: "var(--dz-bg-subtle)", padding: 20 }}>
          <div className="row" style={{ marginBottom: 12 }}><span className="semibold grow">Time per page</span><span className="caption muted">{v.location || "Unknown location"} · {pages.length} of {pageCount} pages viewed</span>
            {onOpen && v.contact_id && <button className="btn btn-ghost btn-s" onClick={onOpen}>View contact</button>}</div>
          <PageBars values={values} height={80} compact={pageCount > 20} />
        </td></tr>
      )}
    </>
  );
}

