"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Upload, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { AppIcon } from "@/components/Logo";

type Req = { id: string; title: string; description: string | null; sender: string };

export default function RequestUpload() {
  const { slug } = useParams<{ slug: string }>();
  const [req, setReq] = useState<Req | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { supabase.rpc("get_public_file_request", { p_slug: slug }).then(({ data }) => setReq((data as Req) || null)); }, [slug]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!req || !files.length) return setErr("Choose at least one file");
    setBusy(true); setErr(null);
    try {
      for (const f of files) {
        if (f.size > 50 * 1024 * 1024) throw new Error(`${f.name} is larger than 50 MB`);
        const path = `requests/${req.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (up.error) throw up.error;
        const { error } = await supabase.rpc("add_request_upload", { p_slug: slug, p_email: email, p_file_name: f.name, p_file_path: path, p_size: f.size });
        if (error) throw error;
      }
      setDone(files.length); setFiles([]);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={send} style={{ maxWidth: 480 }}>
        <div style={{ alignSelf: "center" }}><AppIcon size={40} /></div>
        {req === undefined ? <div className="loading"><span className="spinner" /></div> : req === null ? (
          <div className="center"><div className="h2">This request is closed</div><p className="muted mt-8">Ask the sender for a new upload link.</p></div>
        ) : done ? (
          <div className="col gap-12 center" style={{ alignItems: "center" }}><CheckCircle2 size={40} color="#13703f" /><div className="h2">Thanks — {done} file{done > 1 ? "s" : ""} sent</div><p className="muted">{req.sender} has been notified.</p><button type="button" className="btn btn-secondary" onClick={() => setDone(0)}>Send more</button></div>
        ) : (
          <>
            <div className="center"><div className="h2">{req.sender} requested: {req.title}</div>{req.description && <p className="muted mt-8">{req.description}</p>}</div>
            <label className="field"><span className="label">Your email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
            <div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFiles(Array.from(e.dataTransfer.files)); }}
              style={{ border: "1.5px dashed var(--dz-border-strong)", borderRadius: 12, padding: 24, textAlign: "center", background: "var(--dz-bg-subtle)", cursor: "pointer" }}>
              <Upload size={20} /><div className="medium mt-8">{files.length ? files.map((f) => f.name).join(", ") : "Drag files here, or browse"}</div><div className="caption faint">Up to 50 MB per file</div>
            </div>
            <input ref={input} type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {err && <p className="error-text">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
            <p className="caption faint row gap-6" style={{ justifyContent: "center" }}><ShieldCheck size={14} />Secured by Dozzier</p>
          </>
        )}
      </form>
    </div>
  );
}
