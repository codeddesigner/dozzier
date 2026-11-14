"use client";
import { useEffect, useState } from "react";
import { Plus, ChevronDown, Copy, Lock, Unlock, Trash2, Download, FileInput } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Empty, Loading, Menu, Modal, copy, toast, useLoad } from "@/components/ui";
import { slugify, timeAgo } from "@/lib/format";

type Req = { id: string; title: string; description: string | null; slug: string; status: "open" | "closed"; created_at: string };
type Up = { id: string; request_id: string; uploader_email: string | null; file_name: string; file_path: string; size_bytes: number | null; created_at: string };

const reqUrl = (slug: string) => `${window.location.origin}/r/${slug}`;

export default function FileRequests() {
  const [show, setShow] = useState<"all" | "open" | "closed">("all");
  const [create, setCreate] = useState(false);
  const [openReq, setOpenReq] = useState<Req | null>(null);
  const [coach, setCoach] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new")) setCreate(true);
    try { if (!localStorage.getItem("dz-coach-fr")) setCoach(true); } catch {}
  }, []);
  const { data, loading, reload } = useLoad(async () => {
    const [r, u] = await Promise.all([supabase.from("file_requests").select("*").order("created_at", { ascending: false }), supabase.from("file_request_uploads").select("*").order("created_at", { ascending: false })]);
    return { reqs: (r.data || []) as Req[], ups: (u.data || []) as Up[] };
  }, []);
  const list = (data?.reqs || []).filter((r) => show === "all" || r.status === show);

  return (
    <div className="content" style={{ position: "relative" }}>
      <div className="page-head"><h1 className="page-title grow">File requests</h1><button className="btn btn-dark" onClick={() => setCreate(true)}><Plus size={16} />Create file request</button></div>
      {coach && (
        <div className="coachmark" style={{ right: 48, top: 110 }}>
          <div className="h3">Collect files securely</div>
          <p className="caption" style={{ color: "#cfccc7", marginTop: 8 }}>Send a link — anyone can upload to it without an account. Files land straight in your workspace.</p>
          <div className="row mt-16" style={{ justifyContent: "flex-end" }}><button className="btn btn-s" style={{ border: "1px solid #4b5563", color: "#fff" }} onClick={() => { setCoach(false); try { localStorage.setItem("dz-coach-fr", "1"); } catch {} }}>Got it</button></div>
        </div>
      )}
      <div className="caption muted mt-8">Show</div>
      <label className="chip mt-8"><select value={show} onChange={(e) => setShow(e.target.value as "all")}><option value="all">All requests</option><option value="open">Open requests</option><option value="closed">Closed requests</option></select><ChevronDown size={14} /></label>
      {loading && !data ? <Loading /> : list.length === 0 ? (
        <Empty art={<FileInput size={44} className="brand" />} title="Request files from anyone" body="Create a request link, send it to a client or investor, and their uploads arrive here — no account needed on their side.">
          <button className="btn btn-dark" onClick={() => setCreate(true)}>Create file request</button>
        </Empty>
      ) : (
        <table className="table mt-24">
          <thead><tr><th>Request</th><th>Status</th><th>Files</th><th className="hide-sm">Created</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>{list.map((r) => {
            const n = data!.ups.filter((u) => u.request_id === r.id).length;
            return (
              <tr key={r.id} className="clickable" onClick={() => setOpenReq(r)}>
                <td><div className="col"><span className="medium">{r.title}</span><span className="caption muted ellipsis" style={{ maxWidth: 360 }}>{r.description || reqUrl(r.slug)}</span></div></td>
                <td><span className={`badge ${r.status === "open" ? "badge-success" : "badge-muted"}`}>{r.status === "open" ? "Open" : "Closed"}</span></td>
                <td>{n}</td><td className="hide-sm">{timeAgo(r.created_at)}</td>
                <td><Menu items={[
                  { label: "Copy request link", icon: <Copy size={14} />, onClick: () => copy(reqUrl(r.slug)) },
                  r.status === "open" ? { label: "Close request", icon: <Lock size={14} />, onClick: async () => { await supabase.from("file_requests").update({ status: "closed" }).eq("id", r.id); reload(); } }
                    : { label: "Reopen request", icon: <Unlock size={14} />, onClick: async () => { await supabase.from("file_requests").update({ status: "open" }).eq("id", r.id); reload(); } },
                  { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("file_requests").delete().eq("id", r.id); reload(); } },
                ]} /></td>
              </tr>);
          })}</tbody>
        </table>
      )}
      {create && <CreateReq onClose={() => setCreate(false)} onDone={() => { setCreate(false); reload(); }} />}
      {openReq && (
        <Modal title={openReq.title} onClose={() => setOpenReq(null)} width={640}>
          <div className="row gap-8" style={{ background: "var(--dz-bg-brand-subtle)", borderRadius: 8, padding: "8px 12px" }}><span className="grow brand ellipsis">{reqUrl(openReq.slug)}</span><button className="btn btn-primary btn-s" onClick={() => copy(reqUrl(openReq.slug))}><Copy size={14} />Copy</button></div>
          <table className="table mt-16"><thead><tr><th>File</th><th>From</th><th>Received</th><th /></tr></thead>
            <tbody>{data!.ups.filter((u) => u.request_id === openReq.id).map((u) => (
              <tr key={u.id}><td className="medium">{u.file_name}</td><td className="muted">{u.uploader_email || "Anonymous"}</td><td>{timeAgo(u.created_at)}</td>
                <td><button className="icon-btn s" aria-label="Download" onClick={async () => { const { data: s, error } = await supabase.storage.from(BUCKET).createSignedUrl(u.file_path, 120, { download: u.file_name }); if (error) return toast(error.message); window.location.href = s.signedUrl; }}><Download size={16} /></button></td></tr>
            ))}{!data!.ups.some((u) => u.request_id === openReq.id) && <tr><td colSpan={4} className="table-empty">No files yet. Share the link above.</td></tr>}</tbody></table>
        </Modal>
      )}
    </div>
  );
}

function CreateReq({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  async function save() {
    if (!title.trim()) return toast("Give your request a title");
    const slug = slugify(title);
    const { error } = await supabase.from("file_requests").insert({ title: title.trim(), description: desc.trim() || null, slug });
    if (error) return toast(error.message);
    copy(reqUrl(slug), "Request created — link copied"); onDone();
  }
  return (
    <Modal title="Create file request" onClose={onClose} width={520} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" onClick={save}>Create request</button></>}>
      <div className="col gap-12">
        <label className="field"><span className="label">What are you requesting?</span><input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Signed term sheet" /></label>
        <label className="field"><span className="label">Instructions (optional)</span><textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Please upload the countersigned PDF." /></label>
      </div>
    </Modal>
  );
}
