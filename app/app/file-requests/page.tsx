"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Copy, Lock, Unlock, Trash2, Download, FileInput, Mail, Bell, FolderInput, Check, ChevronRight } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Avatar, Empty, Loading, Menu, Modal, Tabs, Toggle, copy, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, fileKind, slugify, timeAgo } from "@/lib/format";
import { sendEach, type EmailInput } from "@/lib/sendEmail";

type Req = { id: string; title: string; description: string | null; slug: string; status: "open" | "closed"; created_at: string; recipients: string[]; due_date: string | null;
  save_space_id: string | null; save_folder_id: string | null; remind: boolean; notify: boolean; allow_late: boolean };
type Up = { id: string; request_id: string; uploader_email: string | null; file_name: string; file_path: string; size_bytes: number | null; created_at: string; note: string | null; saved_document_id: string | null };
type Dest = { space_id: string; space: string; folder_id: string | null; folder: string | null };

const reqUrl = (slug: string, email?: string) => `${window.location.origin}/r/${slug}${email ? `?email=${encodeURIComponent(email)}` : ""}`;
const RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
function requestEmail(r: { title: string; description: string | null; due_date: string | null; slug: string }, e: string, sender: string, reminder = false): EmailInput {
  const due = r.due_date ? ` by ${new Date(r.due_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : "";
  return { kind: reminder ? "reminder" : "file_request", to: [e], subject: reminder ? `Reminder: ${r.title}` : `${sender} requested files: ${r.title}`, heading: reminder ? `A quick reminder about “${r.title}”` : `${sender} requested files from you`,
    message: `Hi ${displayName(e).split(" ")[0]},\n\n${reminder ? `Just a reminder to upload ${r.title}${due}.` : `Could you upload ${r.title}${due}?`}${r.description ? `\n\n${r.description}` : ""}\n\nNo account needed — the link below is private to you.`,
    cta: { label: "Upload files", url: reqUrl(r.slug, e) } };
}
const dueLabel = (d: string | null) => { if (!d) return null; const n = Math.ceil((new Date(d + "T23:59:59").getTime() - Date.now()) / 86400000); return { text: `Due ${new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, late: n < 0, soon: n >= 0 && n <= 2 }; };

function useDests() {
  return useLoad(async () => {
    const [s, i] = await Promise.all([supabase.from("spaces").select("id,name").eq("status", "active").order("updated_at", { ascending: false }), supabase.from("space_items").select("id,space_id,name").eq("kind", "folder").is("parent_id", null).order("position")]);
    const out: Dest[] = [];
    (s.data || []).forEach((sp) => { out.push({ space_id: sp.id, space: sp.name, folder_id: null, folder: null }); (i.data || []).filter((f) => f.space_id === sp.id).forEach((f) => out.push({ space_id: sp.id, space: sp.name, folder_id: f.id, folder: f.name })); });
    return out;
  }, []);
}

export default function FileRequests() {
  const [show, setShow] = useState<"all" | "open" | "closed">("all");
  const [create, setCreate] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("new")) setCreate(true); }, []);
  const { data, loading, reload } = useLoad(async () => {
    const [r, u] = await Promise.all([supabase.from("file_requests").select("*").order("created_at", { ascending: false }), supabase.from("file_request_uploads").select("*").order("created_at", { ascending: false })]);
    return { reqs: (r.data || []) as Req[], ups: (u.data || []) as Up[] };
  }, []);
  const list = (data?.reqs || []).filter((r) => show === "all" || r.status === show);
  const openReq = data?.reqs.find((r) => r.id === openId) || null;

  return (
    <div className="content">
      <div className="page-head"><h1 className="page-title grow">File requests</h1><button className="btn btn-dark" onClick={() => setCreate(true)}><Plus size={16} />New file request</button></div>
      <div className="mt-8"><Tabs value={show} onChange={setShow} tabs={[{ id: "all", label: `All${data ? ` (${data.reqs.length})` : ""}` }, { id: "open", label: "Open" }, { id: "closed", label: "Closed" }]} /></div>
      {loading && !data ? <Loading /> : list.length === 0 ? (
        <Empty art={<FileInput size={44} className="brand" />} title="Request files from anyone" body="Send a private upload link to clients or investors. Their files land here — no account needed on their side.">
          <button className="btn btn-dark" onClick={() => setCreate(true)}>New file request</button>
        </Empty>
      ) : (
        <div className="card mt-16">
          {list.map((r, i) => {
            const ups = data!.ups.filter((u) => u.request_id === r.id);
            const from = new Set(ups.map((u) => u.uploader_email));
            const got = r.recipients.filter((e) => from.has(e)).length;
            const due = dueLabel(r.due_date);
            return (
              <div key={r.id} className="fr-row" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} onClick={() => setOpenId(r.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(r.id)}>
                <span className="set-row-ico"><FileInput size={16} /></span>
                <div className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{r.title}</span><span className="caption muted ellipsis">{r.recipients.length ? `${got} of ${r.recipients.length} recipients uploaded` : "Anyone with the link"} · {ups.length} file{ups.length === 1 ? "" : "s"}</span></div>
                {r.recipients.length > 0 && <div className="avatar-stack hide-sm">{r.recipients.slice(0, 3).map((e) => <span key={e} className={from.has(e) ? "" : "dim"}><Avatar email={e} size={24} /></span>)}</div>}
                {due && <span className={`badge ${due.late ? "badge-muted" : due.soon ? "badge-warn" : "badge-muted"} hide-sm`}>{due.late ? "Past due" : due.text}</span>}
                <span className={`badge ${r.status === "open" ? "badge-success" : "badge-muted"}`}>{r.status === "open" ? "Open" : "Closed"}</span>
                <span className="caption muted hide-sm" style={{ width: 72, textAlign: "right" }}>{timeAgo(r.created_at)}</span>
                <Menu items={[
                  { label: "Copy upload link", icon: <Copy size={14} />, onClick: () => copy(reqUrl(r.slug)) },
                  r.status === "open" ? { label: "Close request", icon: <Lock size={14} />, onClick: async () => { await supabase.from("file_requests").update({ status: "closed" }).eq("id", r.id); reload(); } }
                    : { label: "Reopen request", icon: <Unlock size={14} />, onClick: async () => { await supabase.from("file_requests").update({ status: "open" }).eq("id", r.id); reload(); } },
                  { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("file_requests").delete().eq("id", r.id); reload(); } },
                ]} />
              </div>
            );
          })}
        </div>
      )}
      {create && <CreateReq onClose={() => setCreate(false)} onDone={(id) => { setCreate(false); reload(); setOpenId(id); }} />}
      {openReq && <ReqDetail r={openReq} ups={data!.ups.filter((u) => u.request_id === openReq.id)} onClose={() => setOpenId(null)} onChange={reload} />}
    </div>
  );
}

function CreateReq({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const { data: dests } = useDests();
  const { profile, email: me } = useApp();
  const [f, setF] = useState({ title: "", description: "", recipients: "", due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), dest: "", remind: true, notify: true, allow_late: false });
  const [busy, setBusy] = useState(false);
  const emails = [...new Set((f.recipients.match(RE) || []).map((e) => e.toLowerCase()))];
  async function save() {
    if (!f.title.trim()) return toast("Give your request a title");
    setBusy(true);
    const d = dests?.find((x) => `${x.space_id}:${x.folder_id || ""}` === f.dest);
    const { data, error } = await supabase.from("file_requests").insert({ title: f.title.trim(), description: f.description.trim() || null, slug: slugify(f.title), recipients: emails, due_date: f.due_date || null,
      save_space_id: d?.space_id || null, save_folder_id: d?.folder_id || null, remind: f.remind, notify: f.notify, allow_late: f.allow_late }).select("id,slug").single();
    if (error) { setBusy(false); return toast(error.message); }
    if (emails.length) {
      const r = await sendEach(emails, (e) => requestEmail({ title: f.title.trim(), description: f.description.trim() || null, due_date: f.due_date || null, slug: data.slug }, e, profile.full_name || displayName(me)));
      toast(r.failed ? `Request created — ${r.ok} sent, ${r.failed} failed${r.error ? `: ${r.error}` : ""}` : `Request sent to ${r.ok} ${r.ok === 1 ? "person" : "people"}`);
    }
    setBusy(false);
    onDone(data.id);
  }
  return (
    <Modal title="New file request" onClose={onClose} width={520} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" disabled={busy} onClick={save}>{busy ? "Creating…" : emails.length ? "Create & send" : "Create request"}</button></>}>
      <div className="col gap-12">
        <label className="field"><span className="label">Request title</span><input className="input" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Q3 bank statements & tax filings" /></label>
        <label className="field"><span className="label">Instructions for recipients</span><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Please upload PDFs. Name files by month." /></label>
        <label className="field"><span className="label">Recipients</span><input className="input" value={f.recipients} onChange={(e) => setF({ ...f, recipients: e.target.value })} placeholder="ngozi@lawfirm.ng, finance@acme.com" />
          <span className="caption faint">We email each person a private upload link. Leave empty for a link anyone can use.</span></label>
        <div className="row gap-12">
          <label className="field grow"><span className="label">Deadline</span><input className="input" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></label>
          <label className="field grow" style={{ minWidth: 0 }}><span className="label">Save to</span><select className="input" value={f.dest} onChange={(e) => setF({ ...f, dest: e.target.value })}>
            <option value="">Keep in File requests</option>{(dests || []).map((d) => <option key={`${d.space_id}:${d.folder_id || ""}`} value={`${d.space_id}:${d.folder_id || ""}`}>{d.folder ? `${d.space} / ${d.folder}` : d.space}</option>)}</select></label>
        </div>
        {([["remind", "Remind 2 days before deadline"], ["notify", "Notify me on every upload"], ["allow_late", "Allow uploads after deadline"]] as const).map(([k, l]) => (
          <div className="row" key={k}><span className="grow" style={{ fontSize: 14 }}>{l}</span><Toggle on={f[k]} onChange={(v) => setF({ ...f, [k]: v })} /></div>
        ))}
      </div>
    </Modal>
  );
}

function ReqDetail({ r, ups, onClose, onChange }: { r: Req; ups: Up[]; onClose: () => void; onChange: () => void }) {
  const { userId, profile, email: me } = useApp();
  const { data: dests } = useDests();
  const [saving, setSaving] = useState<string | null>(null);
  const [mail, setMail] = useState<Record<string, string>>({});
  async function send(list: string[], reminder: boolean) {
    setMail((m) => ({ ...m, ...Object.fromEntries(list.map((e) => [e, "sending"])) }));
    const res = await sendEach(list, (e) => requestEmail(r, e, sender, reminder), (e, err) => setMail((m) => ({ ...m, [e]: err || "sent" })));
    toast(res.failed ? `${res.ok} sent, ${res.failed} failed${res.error ? `: ${res.error}` : ""}` : `${reminder ? "Reminder" : "Request"} sent to ${res.ok} ${res.ok === 1 ? "person" : "people"}`);
  }
  const dest = dests?.find((d) => d.space_id === r.save_space_id && (d.folder_id || null) === (r.save_folder_id || null));
  const from = useMemo(() => new Set(ups.map((u) => u.uploader_email)), [ups]);
  const pending = r.recipients.filter((e) => !from.has(e));
  const sender = profile.full_name || displayName(me);
  const due = dueLabel(r.due_date);

  async function saveToSpace(list: Up[]) {
    if (!dest) return;
    setSaving(list.length === 1 ? list[0].id : "all");
    let n = 0;
    for (const u of list.filter((x) => !x.saved_document_id)) {
      const to = `${userId}/${crypto.randomUUID()}-${u.file_name.replace(/[^\w.\-]+/g, "_")}`;
      const c = await supabase.storage.from(BUCKET).copy(u.file_path, to);
      if (c.error) { toast(c.error.message); continue; }
      const kind = fileKind(u.file_name);
      const d = await supabase.from("documents").insert({ name: u.file_name.replace(/\.[^.]+$/, ""), file_path: to, file_type: kind, mime_type: null, size_bytes: u.size_bytes, page_count: 1 }).select("id").single();
      if (d.error) { toast(d.error.message); continue; }
      await supabase.from("space_items").insert({ space_id: dest.space_id, parent_id: dest.folder_id, kind: "document", name: u.file_name.replace(/\.[^.]+$/, ""), document_id: d.data.id, position: 200 });
      await supabase.from("file_request_uploads").update({ saved_document_id: d.data.id }).eq("id", u.id);
      n++;
    }
    if (n) {
      await supabase.from("space_audit").insert({ space_id: dest.space_id, actor: me, action: `Uploaded ${n} file${n === 1 ? "" : "s"} to ${dest.folder || dest.space} from “${r.title}”`, kind: "upload", item_id: dest.folder_id });
      toast(`${n} file${n === 1 ? "" : "s"} saved to ${dest.folder || dest.space}`);
    }
    setSaving(null); onChange();
  }

  return (
    <Modal title={r.title} onClose={onClose} width={680}>
      <div className="col gap-16">
        <div className="row gap-8 wrap">
          <span className={`badge ${r.status === "open" ? "badge-success" : "badge-muted"}`}>{r.status === "open" ? "Open" : "Closed"}</span>
          {due && <span className={`badge ${due.soon ? "badge-warn" : "badge-muted"}`}>{due.late ? `${due.text} · past due` : due.text}</span>}
          {dest && <span className="row gap-4 caption muted"><FolderInput size={13} />Saves to {dest.folder ? `${dest.space} / ${dest.folder}` : dest.space}</span>}
          {r.remind && pending.length > 0 && due?.soon && <span className="row gap-4 caption" style={{ color: "#b45309" }}><Bell size={13} />Reminder due — {pending.length} still to upload</span>}
        </div>
        <div className="lr-url"><span className="grow ellipsis medium">{reqUrl(r.slug).replace(/^https?:\/\//, "")}</span><button className="btn btn-primary btn-s" onClick={() => copy(reqUrl(r.slug), "Upload link copied")}><Copy size={14} />Copy link</button></div>

        {r.recipients.length > 0 && (
          <div>
            <div className="row" style={{ marginBottom: 8 }}><span className="h3 grow">Recipients</span>
              {pending.length > 0 && <button className="btn btn-secondary btn-s" disabled={pending.some((e) => mail[e] === "sending")} onClick={() => send(pending, true)}><Bell size={14} />Remind {pending.length}</button>}</div>
            <div className="card">{r.recipients.map((e) => (
              <div key={e} className="member-row">
                <Avatar email={e} size={28} /><span className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{displayName(e)}</span><span className="caption muted ellipsis">{e}</span></span>
                {from.has(e) ? <span className="badge badge-success"><Check size={12} />Uploaded</span> : <span className="badge badge-muted">Waiting</span>}
                <button className="icon-btn s" aria-label="Copy personal link" onClick={() => copy(reqUrl(r.slug, e), "Personal link copied")}><Copy size={14} /></button>
                {mail[e] === "sending" ? <span className="caption muted">Sending…</span> : mail[e] === "sent" ? <span className="caption" style={{ color: "var(--dz-text-success)" }}>Sent</span>
                  : <button className="btn btn-ghost btn-s" title={mail[e] || undefined} onClick={() => send([e], from.has(e) ? false : !!r.created_at && Date.now() - +new Date(r.created_at) > 3600000)}><Mail size={14} />{mail[e] ? "Retry" : "Send"}</button>}
              </div>
            ))}</div>
          </div>
        )}

        <div>
          <div className="row" style={{ marginBottom: 8 }}><span className="h3 grow">Files ({ups.length})</span>
            {dest && ups.some((u) => !u.saved_document_id) && <button className="btn btn-secondary btn-s" disabled={!!saving} onClick={() => saveToSpace(ups)}><FolderInput size={14} />{saving === "all" ? "Saving…" : `Save all to ${dest.folder || dest.space}`}</button>}</div>
          <div className="card">
            {ups.length === 0 && <div className="table-empty" style={{ padding: 24 }}>No files yet. Share the link — uploads show up here instantly.</div>}
            {ups.map((u) => (
              <div key={u.id} className="member-row" style={{ alignItems: "flex-start" }}>
                <span className={`fr-kind ${fileKind(u.file_name)}`}>{fileKind(u.file_name).toUpperCase().slice(0, 5)}</span>
                <div className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{u.file_name}</span>
                  <span className="caption muted">{u.uploader_email || "Anonymous"} · {timeAgo(u.created_at)}{u.size_bytes ? ` · ${(u.size_bytes / 1048576).toFixed(1)} MB` : ""}</span>
                  {u.note && <span className="caption fr-note">“{u.note}”</span>}</div>
                {u.saved_document_id ? <a className="badge badge-brand" href={`/app/content/${u.saved_document_id}`}>In Space <ChevronRight size={11} /></a>
                  : dest && <button className="btn btn-ghost btn-s" disabled={!!saving} onClick={() => saveToSpace([u])}>{saving === u.id ? "Saving…" : "Save to Space"}</button>}
                <button className="icon-btn s" aria-label="Download" onClick={async () => { const { data: s, error } = await supabase.storage.from(BUCKET).createSignedUrl(u.file_path, 120, { download: u.file_name }); if (error) return toast(error.message); window.location.href = s.signedUrl; }}><Download size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
