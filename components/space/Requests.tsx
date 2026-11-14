"use client";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { supabase, SpaceItem } from "@/lib/supabase";
import { Avatar, Menu, Modal, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName } from "@/lib/format";
import { audit, Member, Req } from "@/lib/space";

const STATUS = { open: { label: "Open", cls: "badge-warn" }, in_review: { label: "In review", cls: "badge-brand" }, done: { label: "Done", cls: "badge-success" } } as const;
type F = "all" | Req["status"];

export function Requests({ spaceId, folders, onCount }: { spaceId: string; folders: SpaceItem[]; onCount?: (n: number) => void }) {
  const { email, profile } = useApp();
  const [f, setF] = useState<F>("all");
  const [add, setAdd] = useState<{ title: string; folder_id: string; assignee: string; due_date: string } | null>(null);
  const { data, reload } = useLoad(async () => {
    const [r, m] = await Promise.all([
      supabase.from("space_requests").select("*").eq("space_id", spaceId).order("created_at", { ascending: false }),
      supabase.from("space_members").select("*").eq("space_id", spaceId),
    ]);
    const reqs = (r.data || []) as Req[];
    onCount?.(reqs.filter((x) => x.status !== "done").length);
    return { reqs, members: (m.data || []) as Member[] };
  }, [spaceId]);
  if (!data) return <div className="skeleton mt-24"><span /><span /><span /></div>;
  const { reqs, members } = data;
  const n = (s: F) => (s === "all" ? reqs.length : reqs.filter((r) => r.status === s).length);
  const done = n("done");
  const list = reqs.filter((r) => f === "all" || r.status === f);
  const me = profile.full_name || displayName(email);
  const people = [{ v: email, l: `${me} (you)` }, ...members.filter((m) => m.role === "editor" || true).map((m) => ({ v: m.email, l: m.name || displayName(m.email) }))];
  const nameOf = (e: string | null) => (!e ? "Unassigned" : e === email ? me : members.find((m) => m.email === e)?.name || displayName(e));
  const folderName = (id: string | null) => folders.find((x) => x.id === id)?.name;

  async function patch(r: Req, p: Partial<Req>, log?: string) {
    await supabase.from("space_requests").update({ ...p, updated_at: new Date().toISOString() }).eq("id", r.id);
    if (log) audit(spaceId, email, log, "request");
    reload();
  }
  async function create() {
    if (!add?.title.trim()) return;
    await supabase.from("space_requests").insert({ space_id: spaceId, title: add.title.trim(), folder_id: add.folder_id || null, assignee: add.assignee || null, due_date: add.due_date || null, requested_by: email });
    audit(spaceId, email, `Added request “${add.title.trim()}”`, "request");
    setAdd(null); toast("Request added"); reload();
  }

  return (
    <div className="mt-24">
      <div className="row gap-8 wrap">
        {(["all", "open", "in_review", "done"] as F[]).map((s) => <button key={s} className={`pill-opt ${f === s ? "on dark" : ""}`} onClick={() => setF(s)}>{s === "all" ? "All" : STATUS[s].label} · {n(s)}</button>)}
        <span className="grow" />
        <button className="btn btn-dark btn-s" onClick={() => setAdd({ title: "", folder_id: "", assignee: email, due_date: "" })}><Plus size={14} />Add request</button>
      </div>
      <div className="row gap-16 mt-24" style={{ alignItems: "center" }}>
        <div className="req-progress grow"><span style={{ width: `${reqs.length ? (done / reqs.length) * 100 : 0}%` }} /></div>
        <span className="caption muted">{done} of {reqs.length} resolved</span>
      </div>
      <div className="card mt-16">
        {list.length === 0 && <div className="table-empty" style={{ padding: 28 }}>{reqs.length ? "Nothing here." : "No requests yet. Visitors can request documents from the Space, or add your own diligence checklist."}</div>}
        {list.map((r, i) => (
          <div key={r.id} className="req-row" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
            <button className={`req-check ${r.status === "done" ? "on" : ""}`} aria-label={r.status === "done" ? "Reopen" : "Mark done"} onClick={() => patch(r, { status: r.status === "done" ? "open" : "done" }, r.status === "done" ? `Reopened “${r.title}”` : `Resolved “${r.title}”`)}>{r.status === "done" && <Check size={12} />}</button>
            <div className="col grow" style={{ minWidth: 0 }}>
              <span className={`medium ${r.status === "done" ? "muted" : ""}`}>{r.title}</span>
              <span className="caption muted ellipsis">Requested by {r.requested_by === email ? "you" : displayName(r.requested_by)}{folderName(r.folder_id) ? ` · ${folderName(r.folder_id)}` : ""}</span>
            </div>
            <select className={`req-status badge ${STATUS[r.status].cls}`} value={r.status} aria-label="Status" onChange={(e) => patch(r, { status: e.target.value as Req["status"] }, `Set “${r.title}” to ${STATUS[e.target.value as Req["status"]].label}`)}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label className="row gap-6 req-assignee hide-sm"><Avatar email={r.assignee} name={nameOf(r.assignee)} size={22} />
              <select value={r.assignee || ""} aria-label="Assignee" onChange={(e) => patch(r, { assignee: e.target.value || null })} className={r.assignee ? "" : "muted"}>
                <option value="">Unassigned</option>{people.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select></label>
            <label className="caption muted req-due hide-sm">{r.due_date ? "Due " : ""}<input type="date" value={r.due_date || ""} onChange={(e) => patch(r, { due_date: e.target.value || null })} aria-label="Due date" /></label>
            <Menu items={[{ label: "Delete", danger: true, icon: <Trash2 size={14} />, onClick: async () => { await supabase.from("space_requests").delete().eq("id", r.id); reload(); } }]} />
          </div>
        ))}
      </div>
      {add && (
        <Modal title="Add request" width={480} onClose={() => setAdd(null)} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setAdd(null)}>Cancel</button><button className="btn btn-dark" onClick={create}>Add request</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">What’s needed</span><input className="input" autoFocus value={add.title} onChange={(e) => setAdd({ ...add, title: e.target.value })} placeholder="Cap table as of Oct 2026" /></label>
            <label className="field"><span className="label">Folder</span><select className="input" value={add.folder_id} onChange={(e) => setAdd({ ...add, folder_id: e.target.value })}><option value="">—</option>{folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <div className="row gap-12">
              <label className="field grow"><span className="label">Assignee</span><select className="input" value={add.assignee} onChange={(e) => setAdd({ ...add, assignee: e.target.value })}><option value="">Unassigned</option>{people.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select></label>
              <label className="field grow"><span className="label">Due</span><input className="input" type="date" value={add.due_date} onChange={(e) => setAdd({ ...add, due_date: e.target.value })} /></label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
