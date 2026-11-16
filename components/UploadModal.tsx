"use client";
import { useRef, useState } from "react";
import { Upload, Link2, FileArchive } from "lucide-react";
import { unzip } from "@/lib/unzip";
import { Modal, Tabs, toast } from "./ui";
import { supabase, BUCKET } from "@/lib/supabase";
import { countPdfPages } from "@/lib/pdf";
import { fileKind } from "@/lib/format";
import { limitsFor, fmtBytes, MAX_FILE_BYTES } from "@/lib/limits";
import { extractText } from "@/lib/extractText";
import { uploadFile } from "@/lib/upload";
import { officeFormat, countOfficePages } from "@/components/OfficeView";
import { useApp } from "./AppContext";
import { downloadUrls, PROVIDER_HINT, type Provider } from "@/lib/cloudImport";

const SOURCES: [Provider, string][] = [["Google Drive", "/logos/google-drive.png"], ["Dropbox", "/logos/dropbox.png"], ["Box", "Bx"], ["OneDrive", "Od"], ["SharePoint", "Sp"]];

export function UploadModal({ folderId, onClose, onDone }: { folderId?: string | null; onClose: () => void; onDone: (docIds: string[]) => void }) {
  const { userId, wsId, profile } = useApp();
  const [tab, setTab] = useState<"file" | "url" | "zip" | "cloud">("file");
  const [cloud, setCloud] = useState<Provider>("Google Drive");
  const [share, setShare] = useState("");
  const zipInput = useRef<HTMLInputElement>(null);
  async function pickZip(f?: File | null) {
    if (!f) return;
    setErr(null); setProgress("Extracting…");
    try { const list = await unzip(f); if (!list.length) throw new Error("No files found in that ZIP"); setFiles(list); setProgress(`${list.length} file${list.length === 1 ? "" : "s"} ready`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn’t read the ZIP"); setProgress(""); }
  }
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function uploadFiles(list: File[] = files) {
    if (!list.length) return input.current?.click();
    const files = list;
    setBusy(true); setErr(null);
    const ids: string[] = [];
    try {
      // Plan storage quota for the whole workspace.
      const { data: used } = await supabase.from("documents").select("size_bytes").is("deleted_at", null);
      const usedBytes = (used || []).reduce((a, d: { size_bytes: number | null }) => a + (d.size_bytes || 0), 0);
      const quota = limitsFor(profile.plan).gb * 1e9;
      const adding = files.reduce((a, f) => a + f.size, 0);
      if (usedBytes + adding > quota) throw new Error(`That would use ${fmtBytes(usedBytes + adding)} of your ${limitsFor(profile.plan).gb} GB storage. Delete old files or upgrade your plan.`);
      for (const [i, f] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}${f.size > 20e6 ? ` (${fmtBytes(f.size)}) — large files take a moment` : ""}…`);
        if (f.size > MAX_FILE_BYTES) throw new Error(`${f.name} is larger than 2 GB`);
        const kind = fileKind(f.type || f.name);
        const office = officeFormat(f.type, f.name);
        const pages = kind === "pdf" || f.type === "application/pdf" ? await countPdfPages(f) : office ? await countOfficePages(f, office) : 1;
        const path = `${wsId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
        const label = `Uploading ${i + 1} of ${files.length}${f.size > 6e6 ? ` (${fmtBytes(f.size)})` : ""}`;
        await uploadFile(path, f, (p) => setProgress(`${label}… ${Math.round(p * 100)}%`));
        const { data, error } = await supabase.from("documents").insert({
          name: f.name.replace(/\.[^.]+$/, ""), content_text: await extractText(f), file_path: path, file_type: kind, mime_type: f.type, size_bytes: f.size, page_count: pages, folder_id: folderId || null,
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

  /** Downloads a shared cloud file through /api/import, then uploads it like a file from this device. */
  async function importCloud() {
    if (!downloadUrls(share)) return setErr(`Paste a ${cloud} share link, like ${PROVIDER_HINT[cloud].example}`);
    setBusy(true); setErr(null); setProgress(`Getting the file from ${cloud}…`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ url: share.trim() }) });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Couldn’t import that file"); }
      const total = Number(r.headers.get("content-length") || 0);
      const reader = r.body.getReader();
      const parts: BlobPart[] = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); got += value.length;
        setProgress(`Getting the file from ${cloud}… ${total ? `${Math.round((got / total) * 100)}%` : fmtBytes(got)}`);
      }
      const name = decodeURIComponent(r.headers.get("x-file-name") || `${cloud} file`);
      const file = new File(parts, name, { type: r.headers.get("content-type") || "application/octet-stream" });
      setBusy(false);
      await uploadFiles([file]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Import failed"); setBusy(false); setProgress(""); }
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
        <button className="btn btn-dark" disabled={busy} onClick={tab === "url" ? addUrl : tab === "cloud" ? importCloud : tab === "zip" && !files.length ? () => zipInput.current?.click() : () => uploadFiles()}>{busy ? (tab === "cloud" ? "Importing…" : "Uploading…") : tab === "url" ? "Add" : tab === "cloud" ? "Import" : "Upload"}</button></>}>
      <div className="up-tabs"><Tabs tabs={[{ id: "file", label: "Upload file" }, { id: "url", label: "Add URL" }, { id: "zip", label: "Extract ZIP" }]} value={tab} onChange={(t) => { setTab(t); setErr(null); if (t !== "file") setFiles([]); }} /></div>
      {tab === "file" ? (
        <div className="col gap-16 mt-16">
          <span className="caption" style={{ color: "var(--dz-text-secondary)" }}>Choose a source to upload from</span>
          <div className="up-sources">
            <button className="up-src on" onClick={() => input.current?.click()}><Upload size={20} /><span>My device</span></button>
            {SOURCES.map(([n, a]) => (
              <button key={n} className="up-src" onClick={() => { setCloud(n); setShare(""); setErr(null); setTab("cloud"); }}>
                {a.startsWith("/") ? <img src={a} alt="" width={n === "Dropbox" ? 20 : 22} height={20} style={{ objectFit: "contain" }} /> : <span className="up-mono">{a}</span>}<span>{n}</span>
              </button>
            ))}
            <button className="up-src" onClick={() => setTab("url")}><Link2 size={20} /><span>From URL</span></button>
          </div>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); setFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => input.current?.click()}
            style={{ border: `1.5px dashed ${drag ? "var(--dz-border-brand)" : "var(--dz-border-strong)"}`, borderRadius: 12, padding: 28, textAlign: "center", background: drag ? "var(--dz-bg-brand-subtle)" : "var(--dz-bg-subtle)", cursor: "pointer" }}>
            <Upload size={20} />
            <div className="medium mt-8">{files.length ? files.map((f) => f.name).join(", ") : "Drag files here, or browse"}</div>
            <div className="caption faint">PDF, PowerPoint, Word, Excel, images and video up to 2 GB each</div>
          </div>
          <input ref={input} type="file" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </div>
      ) : tab === "cloud" ? (
        <div className="col gap-12 mt-16">
          <button type="button" className="caption medium muted" style={{ alignSelf: "flex-start" }} onClick={() => { setTab("file"); setErr(null); }}>← All sources</button>
          <label className="field"><span className="label">{cloud} share link</span>
            <input className="input" autoFocus value={share} onChange={(e) => setShare(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !busy) importCloud(); }} placeholder={PROVIDER_HINT[cloud].example} /></label>
          <span className="caption faint">{PROVIDER_HINT[cloud].how}</span>
        </div>
      ) : tab === "zip" ? (
        <div className="col gap-12 mt-16">
          <span className="caption" style={{ color: "var(--dz-text-secondary)" }}>Upload a .zip — we unpack it and add each file to your content.</span>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pickZip(e.dataTransfer.files[0]); }} onClick={() => zipInput.current?.click()}
            className={`up-drop ${drag ? "on" : ""}`}>
            <FileArchive size={22} />
            <div className="medium mt-8">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"}: ${files.slice(0, 4).map((f) => f.name).join(", ")}${files.length > 4 ? "…" : ""}` : "Drag a ZIP here, or browse"}</div>
            <div className="caption faint">Folders are flattened; hidden files are skipped</div>
          </div>
          <input ref={zipInput} type="file" accept=".zip,application/zip" hidden onChange={(e) => { pickZip(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      ) : (
        <label className="field mt-16"><span className="label">URL</span><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.figma.com/proto/…" /></label>
      )}
      {err && <p className="error-text mt-8">{err}</p>}
    </Modal>
  );
}
