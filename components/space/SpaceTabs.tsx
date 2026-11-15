"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Copy } from "lucide-react";
import { supabase, Space, SpaceItem } from "@/lib/supabase";
import { Avatar, DocThumb, Toggle, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, duration, timeAgo } from "@/lib/format";
import { SPACE_TEMPLATES } from "@/components/templates";
import { audit, Group, Member } from "@/lib/space";

type V = { id: string; visitor_email: string | null; contact_id: string | null; started_at: string; last_seen_at: string; duration_seconds: number; downloaded: boolean; location: string | null; parent_visit_id: string | null; space_item_id: string | null; document_id: string | null };

function useSpaceVisits(linkIds: string[]) {
  return useLoad(async () => (linkIds.length ? ((await supabase.from("visits").select("id,visitor_email,contact_id,started_at,last_seen_at,duration_seconds,downloaded,location,parent_visit_id,space_item_id,document_id").in("link_id", linkIds).order("started_at", { ascending: false }).limit(2000)).data || []) as V[] : []), [linkIds.join(",")]);
}

export function Visitors({ spaceId, linkIds }: { spaceId: string; linkIds: string[] }) {
  const router = useRouter();
  const { data } = useSpaceVisits(linkIds);
  const { data: gm } = useLoad(async () => {
    const [g, m] = await Promise.all([supabase.from("space_groups").select("*").eq("space_id", spaceId), supabase.from("space_members").select("*").eq("space_id", spaceId)]);
    return { groups: (g.data || []) as Group[], members: (m.data || []) as Member[] };
  }, [spaceId]);
  if (!data) return <div className="skeleton mt-24"><span /><span /></div>;
  const by = new Map<string, { email: string; contact: string | null; first: string; last: string; secs: number; docs: Set<string>; dl: number; loc: string | null; live: boolean }>();
  data.forEach((v) => {
    const k = v.visitor_email || "Anonymous";
    const g = by.get(k) || { email: k, contact: v.contact_id, first: v.started_at, last: v.last_seen_at, secs: 0, docs: new Set<string>(), dl: 0, loc: v.location, live: false };
    g.first = v.started_at < g.first ? v.started_at : g.first; g.last = v.last_seen_at > g.last ? v.last_seen_at : g.last;
    g.secs += v.duration_seconds; if (v.document_id) g.docs.add(v.document_id); if (v.downloaded) g.dl++;
    g.live ||= Date.now() - new Date(v.last_seen_at).getTime() < 120000; by.set(k, g);
  });
  const rows = [...by.values()].sort((a, b) => +new Date(b.last) - +new Date(a.last));
  const groupOf = (e: string) => { const m = gm?.members.find((x) => x.email === e); return gm?.groups.find((g) => g.id === m?.group_id)?.name; };
  return (
    <table className="table mt-24">
      <thead><tr><th>Visitor</th><th className="hide-sm">Group</th><th>Docs opened</th><th>Time</th><th className="hide-sm">Downloads</th><th>Last seen</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="table-empty">No one has opened this Space yet. Share it or invite people to get started.</td></tr>}
        {rows.map((r) => (
          <tr key={r.email} className={r.contact ? "clickable" : ""} onClick={() => r.contact && router.push(`/app/contacts/${r.contact}`)}>
            <td><span className="row gap-10"><Avatar email={r.email.includes("@") ? r.email : null} name={r.email} size={30} /><span className="col"><span className="medium">{displayName(r.email)}</span><span className="caption muted">{r.email}{r.loc ? ` · ${r.loc}` : ""}</span></span></span></td>
            <td className="hide-sm">{groupOf(r.email) ? <span className="tag">{groupOf(r.email)}</span> : <span className="faint">—</span>}</td>
            <td>{r.docs.size}</td><td>{duration(r.secs)}</td><td className="hide-sm">{r.dl || "—"}</td>
            <td>{r.live ? <span className="row gap-6" style={{ color: "var(--dz-text-success)" }}><span className="live-dot" />Live</span> : timeAgo(r.last)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Analytics({ items, linkIds }: { items: SpaceItem[]; linkIds: string[] }) {
  const { data } = useSpaceVisits(linkIds);
  if (!data) return <div className="skeleton mt-24"><span /><span /></div>;
  const opens = data.filter((v) => v.parent_visit_id);
  const sessions = data.filter((v) => !v.parent_visit_id);
  const docs = items.filter((i) => i.kind === "document").map((i) => {
    const vs = opens.filter((v) => v.space_item_id === i.id);
    return { it: i, views: vs.length, people: new Set(vs.map((v) => v.visitor_email)).size, secs: vs.reduce((a, v) => a + v.duration_seconds, 0), dl: vs.filter((v) => v.downloaded).length };
  }).sort((a, b) => b.secs - a.secs || b.views - a.views);
  const max = Math.max(1, ...docs.map((d) => d.secs));
  const folderOf = (it: SpaceItem) => items.find((x) => x.id === it.parent_id)?.name;
  const totalSecs = opens.reduce((a, v) => a + v.duration_seconds, 0);
  return (
    <div className="mt-24">
      <div className="kpis">
        {[["Visitors", String(new Set(sessions.map((v) => v.visitor_email || v.id)).size)], ["Sessions", String(sessions.length)], ["Documents opened", String(opens.length)], ["Time in documents", duration(totalSecs)]].map(([l, v]) => (
          <div className="kpi" key={l}><div className="kpi-label">{l}</div><div className="kpi-card"><div className="value">{v}</div></div></div>
        ))}
      </div>
      <h2 className="h2 mt-32" style={{ marginBottom: 12 }}>Engagement by document</h2>
      <table className="table">
        <thead><tr><th>Document</th><th>Attention</th><th>Views</th><th className="hide-sm">People</th><th className="hide-sm">Downloads</th></tr></thead>
        <tbody>
          {docs.length === 0 && <tr><td colSpan={5} className="table-empty">Add documents to see which ones get read.</td></tr>}
          {docs.map((d) => (
            <tr key={d.it.id}><td><span className="row gap-10"><DocThumb kind="pdf" /><span className="col"><span className="medium ellipsis" style={{ maxWidth: 260 }}>{d.it.name}</span>{folderOf(d.it) && <span className="caption muted">{folderOf(d.it)}</span>}</span></span></td>
              <td style={{ width: "32%" }}><span className="row gap-8"><span className="bar-track grow"><span className="bar-fill" style={{ width: `${(d.secs / max) * 100}%` }} /></span><span className="caption muted" style={{ width: 56, textAlign: "right" }}>{d.secs ? duration(d.secs) : "—"}</span></span></td>
              <td>{d.views}</td><td className="hide-sm">{d.people}</td><td className="hide-sm">{d.dl || "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Q = { id: string; body: string; page_number: number; answer: string | null; created_at: string; asker_email: string | null; documents: { name: string } | null };
export function SpaceQA({ linkIds }: { linkIds: string[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data, reload } = useLoad(async () => (linkIds.length ? ((await supabase.from("doc_questions").select("id,body,page_number,answer,created_at,asker_email,documents(name)").in("link_id", linkIds).order("created_at", { ascending: false })).data || []) as unknown as Q[] : []), [linkIds.join(",")]);
  if (!data) return <div className="skeleton mt-24"><span /><span /></div>;
  if (!data.length) return <p className="muted mt-24">No questions yet. Visitors can ask about any page while reading a document in this Space.</p>;
  return (
    <div className="col gap-12 mt-24">
      {data.map((q) => (
        <div key={q.id} className="card" style={{ padding: 16 }}>
          <div className="row gap-8"><Avatar email={q.asker_email} name={q.asker_email || "Anonymous"} size={24} /><span className="medium">{q.asker_email ? displayName(q.asker_email) : "Anonymous visitor"}</span>
            <span className="caption muted grow">{q.documents?.name} · page {q.page_number} · {timeAgo(q.created_at)}</span>{q.answer ? <span className="badge badge-success">Answered</span> : <span className="badge badge-warn">Needs reply</span>}</div>
          <p className="mt-8" style={{ fontSize: 15 }}>{q.body}</p>
          {q.answer ? <div className="q-answer mt-8"><span className="caption medium">You</span><p style={{ fontSize: 14 }}>{q.answer}</p></div> : (
            <div className="row gap-8 mt-8"><input className="input grow" placeholder="Reply — the visitor sees it in the document" value={drafts[q.id] || ""} onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })} />
              <button className="btn btn-primary" disabled={!drafts[q.id]?.trim()} onClick={async () => { await supabase.from("doc_questions").update({ answer: drafts[q.id].trim(), answered_at: new Date().toISOString() }).eq("id", q.id); toast("Reply posted"); reload(); }}>Reply</button></div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SpaceSettings({ space, onSaved }: { space: Space; onSaved: () => void }) {
  const router = useRouter();
  const { email } = useApp();
  const init = { name: space.name, subtitle: space.subtitle || "", status: space.status, banner: space.banner, require_nda: !!space.require_nda, verify_email: !!space.verify_email, watermark: space.watermark ?? true, allow_download: !!space.allow_download, auto_index: space.auto_index !== false };
  const [s, setS] = useState(init);
  const dirty = JSON.stringify(s) !== JSON.stringify(init);
  const [copying, setCopying] = useState(false);
  async function duplicate() {
    setCopying(true);
    const { data, error } = await supabase.rpc("duplicate_space", { p_space: space.id });
    setCopying(false);
    if (error) return toast(error.message);
    toast(`Created “${space.name} (copy)” — links and visitors weren’t copied`); router.push(`/app/spaces/${data}`);
  }
  async function save() {
    await supabase.from("spaces").update({ ...s, subtitle: s.subtitle || null, updated_at: new Date().toISOString() }).eq("id", space.id);
    await supabase.from("links").update({ require_nda: s.require_nda, watermark: s.watermark, allow_download: s.allow_download, ...(s.verify_email ? { verify_email: true, require_email: true } : {}) }).eq("space_id", space.id);
    audit(space.id, email, "Updated Space settings"); toast("Space settings saved"); onSaved();
  }
  return (
    <div className="col gap-16 mt-24" style={{ maxWidth: 620 }}>
      <div className="card set-card"><div className="h3">Details</div>
        <label className="field"><span className="label">Name</span><input className="input" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
        <label className="field"><span className="label">Subtitle</span><input className="input" value={s.subtitle} onChange={(e) => setS({ ...s, subtitle: e.target.value })} placeholder="Confidential · for Acme Ventures only" /></label>
        <div className="field"><span className="label">Cover</span><div className="row gap-8 wrap">{[...SPACE_TEMPLATES.map((t) => t.banner), "linear-gradient(120deg,#4D94F7,#8ab2ff)", "linear-gradient(120deg,#111827,#4b5563)"].map((b) => (
          <button key={b} className={`cover-swatch ${s.banner === b ? "on" : ""}`} style={{ background: b }} aria-label="Cover colour" onClick={() => setS({ ...s, banner: b })} />))}</div></div>
        <div className="set-row"><div className="col grow"><span>Number files and folders</span><span className="caption muted">Shows 1, 1.1, 1.2… in the data room, for you and for visitors. Reorder with Move up / Move down.</span></div><Toggle on={s.auto_index} onChange={(v) => setS({ ...s, auto_index: v })} /></div>
        <label className="field"><span className="label">Status</span><select className="input" value={s.status} onChange={(e) => setS({ ...s, status: e.target.value })}><option value="active">Active — visitors can enter</option><option value="archived">Archived — read-only for you, closed to visitors</option></select></label>
      </div>
      <div className="card set-card"><div className="h3">Security defaults</div><span className="caption muted">Apply to every link to this Space and to visitors outside a group.</span>
        {([["require_nda", "Require NDA before entry"], ["verify_email", "Verify visitor email with a code"], ["watermark", "Watermark all pages"], ["allow_download", "Allow downloads"]] as const).map(([k, l]) => (
          <div className="set-row" key={k}><span className="grow">{l}</span><Toggle on={s[k]} onChange={(v) => setS({ ...s, [k]: v })} /></div>))}
      </div>
      <div className="row gap-8"><button className="btn btn-primary" disabled={!dirty} onClick={save}>Save changes</button>{dirty && <span className="caption muted">Unsaved changes</span>}</div>
      <div className="card set-card"><div className="h3">Duplicate Space</div><span className="caption muted">Copies the folders, documents, groups and permissions into a new Space. Links, visitors, requests and the audit log aren’t copied.</span>
        <div><button className="btn btn-secondary btn-s" disabled={copying} onClick={duplicate}><Copy size={14} />{copying ? "Duplicating…" : "Duplicate Space"}</button></div></div>
      <div className="card set-card danger"><div className="h3">Delete Space</div><span className="caption muted">Removes the Space, its links, requests and audit log. Documents stay in your library.</span>
        <div><button className="btn btn-danger btn-s" onClick={async () => { if (!confirm(`Delete “${space.name}”? This can’t be undone.`)) return; await supabase.from("spaces").delete().eq("id", space.id); router.push("/app/spaces"); }}><Trash2 size={14} />Delete Space</button></div></div>
    </div>
  );
}
