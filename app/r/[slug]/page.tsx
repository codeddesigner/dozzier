"use client";
import { useEffect, useRef, useState } from "react";
import { inMemory } from "@/lib/upload";
import { useParams } from "next/navigation";
import { Upload, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { supabase, BUCKET, SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase";
import { fileKind } from "@/lib/format";

type Req = { id: string; title: string; description: string | null; sender: string; workspace: string | null; due_date: string | null; open: boolean };
type Item = { id: string; file: File; pct: number; state: "queued" | "uploading" | "done" | "error"; err?: string };
const MAX = 50 * 1024 * 1024;
const KIND_LABEL: Record<string, string> = { pdf: "PDF", sheet: "SHEET", doc: "DOC", deck: "DECK", image: "IMG", video: "VID", file: "FILE" };

/** Upload with progress via the Storage REST API; falls back to the SDK. */
async function put(path: string, picked: File, onPct: (n: number) => void): Promise<void> {
  const f = await inMemory(picked);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", f.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || "application/octet-stream" }).then(({ error }) => (error ? reject(error) : resolve())));
    xhr.onerror = () => supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || "application/octet-stream" }).then(({ error }) => (error ? reject(error) : resolve()));
    xhr.send(f);
  });
}

export default function RequestUpload() {
  const { slug } = useParams<{ slug: string }>();
  const [req, setReq] = useState<Req | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    supabase.rpc("get_public_file_request", { p_slug: slug }).then(({ data }) => setReq((data as Req) || null));
    try { const e = new URLSearchParams(window.location.search).get("email"); if (e) setEmail(e); } catch {}
  }, [slug]);

  const add = (fs: FileList | File[]) => { const list = Array.from(fs); setItems((xs) => [...xs, ...list.map((file) => ({ id: crypto.randomUUID(), file, pct: 0, state: (file.size > MAX ? "error" : "queued") as Item["state"], err: file.size > MAX ? "Larger than 50 MB" : undefined }))]); };
  const upd = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const ready = items.filter((i) => i.state === "queued" || i.state === "done");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!req) return;
    const todo = items.filter((i) => i.state === "queued");
    if (!todo.length) return setErr("Add at least one file");
    setBusy(true); setErr(null);
    let ok = 0;
    for (const it of todo) {
      upd(it.id, { state: "uploading", pct: 1 });
      try {
        const path = `requests/${req.id}/${crypto.randomUUID()}-${it.file.name.replace(/[^\w.\-]+/g, "_")}`;
        await put(path, it.file, (n) => upd(it.id, { pct: n }));
        const { error } = await supabase.rpc("add_request_upload", { p_slug: slug, p_email: email, p_file_name: it.file.name, p_file_path: path, p_size: it.file.size, p_note: ok === 0 ? note : null });
        if (error) throw error;
        upd(it.id, { state: "done", pct: 100 }); ok++;
      } catch (x: unknown) { upd(it.id, { state: "error", err: x instanceof Error ? x.message : "Upload failed" }); }
    }
    setBusy(false);
    if (ok) setTimeout(() => { setDone(ok); setItems([]); setNote(""); }, 600);
    else setErr("Nothing was uploaded — try again.");
  }

  const due = req?.due_date ? new Date(req.due_date + "T23:59:59") : null;
  const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
  const ws = req?.workspace || req?.sender || "";
  const initials = ws.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="fr-page">
      {req && <div className="row gap-10 fr-brand"><span className="sv-mono">{initials}</span><span className="semibold">{ws}</span></div>}
      <form className="fr-card" onSubmit={send}>
        {req === undefined ? <div className="loading"><span className="spinner" /></div> : req === null || !req.open ? (
          <div className="col gap-8 center" style={{ alignItems: "center", padding: "20px 0" }}><div className="h2">This request is closed</div><p className="muted">{req && !req.open ? "The deadline has passed." : "It may have been closed by the sender."} Ask them for a new upload link.</p></div>
        ) : done ? (
          <div className="col gap-12 center" style={{ alignItems: "center", padding: "12px 0" }}><span className="lr-check" style={{ width: 48, height: 48 }}><CheckCircle2 size={26} /></span><div className="h2">Thanks — {done} file{done > 1 ? "s" : ""} sent</div><p className="muted">{req.sender} can see them now.</p><button type="button" className="btn btn-secondary" onClick={() => setDone(0)}>Send more</button></div>
        ) : (
          <>
            <h1 className="h2" style={{ fontSize: 22 }}>{req.sender} requested files from you</h1>
            <p className="muted" style={{ fontSize: 14 }}>{req.title}{req.description ? <> — “{req.description}”</> : null}</p>
            {due && <span className={`fr-due ${daysLeft! <= 2 ? "soon" : ""}`}>Due {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {daysLeft! > 1 ? `${daysLeft} days left` : daysLeft === 1 ? "1 day left" : daysLeft === 0 ? "due today" : "overdue"}</span>}
            {!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !email ? <label className="field"><span className="label">Your email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
              : <span className="caption muted">Uploading as <b>{email}</b> · <button type="button" className="link" onClick={() => setEmail("")}>change</button></span>}
            <div className={`fr-drop ${drag ? "on" : ""}`} onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && input.current?.click()}>
              <Upload size={20} /><span className="medium">Drop files here or browse</span><span className="caption muted">Any file type · up to 50 MB each</span>
            </div>
            <input ref={input} type="file" multiple hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
            {items.length > 0 && (
              <div className="col gap-10">
                {items.map((it) => { const k = fileKind(it.file.name + " " + it.file.type); return (
                  <div key={it.id} className="fr-file">
                    <span className={`fr-kind ${k}`}>{KIND_LABEL[k]}</span>
                    <div className="col grow" style={{ minWidth: 0, gap: 6 }}>
                      <div className="row gap-8"><span className="ellipsis grow" style={{ fontSize: 14 }}>{it.file.name}</span>
                        <span className={`caption ${it.state === "done" ? "ok" : it.state === "error" ? "bad" : "muted"}`}>{it.state === "done" ? "Uploaded" : it.state === "error" ? it.err : it.state === "uploading" ? `${it.pct}%` : `${(it.file.size / 1048576).toFixed(1)} MB`}</span>
                        {!busy && it.state !== "done" && <button type="button" className="icon-btn s" aria-label="Remove" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}><X size={13} /></button>}</div>
                      <span className="fr-bar"><span className={it.state} style={{ width: `${it.state === "queued" ? 0 : it.pct}%` }} /></span>
                    </div>
                  </div>
                ); })}
              </div>
            )}
            <label className="field"><span className="label">Note to {req.sender} (optional)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="September statement will follow on Friday." /></label>
            {err && <p className="error-text">{err}</p>}
            <button className="btn btn-dark btn-block" disabled={busy || !ready.length}>{busy ? "Uploading…" : `Submit ${ready.length || ""} file${ready.length === 1 ? "" : "s"}`.replace("  ", " ")}</button>
          </>
        )}
      </form>
      <p className="caption faint row gap-6" style={{ justifyContent: "center", marginTop: 16 }}><ShieldCheck size={14} />Encrypted upload · Powered by Dozzier</p>
    </div>
  );
}
