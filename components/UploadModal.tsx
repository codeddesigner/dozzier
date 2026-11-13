"use client";
import { useRef, useState } from "react";
import { Upload, Link2 } from "lucide-react";
import { Modal, Tabs, toast } from "./ui";
import { supabase, BUCKET } from "@/lib/supabase";
import { countPdfPages } from "@/lib/pdf";
import { fileKind } from "@/lib/format";
import { useApp } from "./AppContext";

const SOURCES: [string, string][] = [["Google Drive", "G"], ["Dropbox", "Db"], ["Box", "Bx"], ["OneDrive", "Od"], ["SharePoint", "Sp"]];

export function UploadModal({ folderId, onClose, onDone }: { folderId?: string | null; onClose: () => void; onDone: (docIds: string[]) => void }) {
  const { userId } = useApp();
  const [tab, setTab] = useState<"file" | "url">("file");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function uploadFiles() {
    if (!files.length) return input.current?.click();
    setBusy(true); setErr(null);
    const ids: string[] = [];
    try {
      for (const [i, f] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        if (f.size > 50 * 1024 * 1024) throw new Error(`${f.name} is larger than 50 MB`);
        const kind = fileKind(f.type || f.name);
        const pages = kind === "pdf" || f.type === "application/pdf" ? await countPdfPages(f) : 1;
        const path = `${userId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (up.error) throw up.error;
        const { data, error } = await supabase.from("documents").insert({
          name: f.name.replace(/\.[^.]+$/, ""), file_path: path, file_type: kind, mime_type: f.type, size_bytes: f.size, page_count: pages, folder_id: folderId || null,
        }).select("id").single();
        if (error) throw error;
        ids.push(data.id);
      }
      toast(files.length === 1 ? `${files[0].name} uploaded` : `${files.length} files uploaded`);
      onDone(ids);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false); setProgress("");
  }

  async function addUrl() {
    if (!/^https?:\/\//.test(url)) return setErr("Enter a full URL starting with https://");
    setBusy(true);
    const name = url.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
    const { data, error } = await supabase.from("documents").insert({ name, file_path: null, note: url, file_type: "file", mime_type: "text/uri-list", page_count: 1, folder_id: folderId || null }).select("id").single();
    setBusy(false);
    if (error) return setErr(error.message);
    toast("Link added to your content");
    onDone([data.id]);
  }

  return (
    <Modal title="Upload" onClose={onClose} width={640}
      footer={<><span className="caption faint grow">{progress}</span><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-dark" disabled={busy} onClick={tab === "file" ? uploadFiles : addUrl}>{busy ? "Uploading…" : tab === "file" ? (files.length ? "Upload" : "Choose files") : "Add"}</button></>}>
      <Tabs tabs={[{ id: "file", label: "Upload file" }, { id: "url", label: "Add URL" }]} value={tab} onChange={(t) => { setTab(t); setErr(null); }} />
      {tab === "file" ? (
        <div className="col gap-16 mt-16">
          <span className="muted">Choose a source to upload from</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <button className="int-tile" style={{ borderColor: "var(--dz-border-brand)", background: "var(--dz-bg-brand-subtle)" }} onClick={() => input.current?.click()}><Upload size={20} /><span className="caption medium">My device</span></button>
            {SOURCES.map(([n, a]) => (
              <button key={n} className="int-tile" onClick={() => toast(`${n} import needs the ${n} integration — upload from your device for now`)}>
                <span className="int-logo" style={{ width: 22, height: 22, fontSize: 10, border: "1px dashed var(--dz-border-strong)", borderRadius: 6 }}>{a}</span><span className="caption medium">{n}</span>
              </button>
            ))}
            <button className="int-tile" onClick={() => setTab("url")}><Link2 size={20} /><span className="caption medium">From URL</span></button>
          </div>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); setFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => input.current?.click()}
            style={{ border: `1.5px dashed ${drag ? "var(--dz-border-brand)" : "var(--dz-border-strong)"}`, borderRadius: 12, padding: 28, textAlign: "center", background: drag ? "var(--dz-bg-brand-subtle)" : "var(--dz-bg-subtle)", cursor: "pointer" }}>
            <Upload size={20} />
            <div className="medium mt-8">{files.length ? files.map((f) => f.name).join(", ") : "Drag files here, or browse"}</div>
            <div className="caption faint">PDF, PPTX, DOCX, XLSX, images and video up to 50 MB</div>
          </div>
          <input ref={input} type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </div>
      ) : (
        <label className="field mt-16"><span className="label">URL</span><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/proto/…" /></label>
      )}
      {err && <p className="error-text mt-8">{err}</p>}
    </Modal>
  );
}
