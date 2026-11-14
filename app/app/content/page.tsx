"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, ChevronDown, Plus, Upload, Share2, FolderPlus, FileInput, ArrowDown, Trash2, RotateCcw, Pencil, Search } from "lucide-react";
import { supabase, Doc, Folder } from "@/lib/supabase";
import { DocThumb, Loading, Menu, Modal, useLoad, toast } from "@/components/ui";
import { UploadModal } from "@/components/UploadModal";
import { LinkModal } from "@/components/LinkModal";
import { timeAgo } from "@/lib/format";
import { useApp } from "@/components/AppContext";

type View = { kind: "all" } | { kind: "deleted" } | { kind: "folder"; id: string };

export default function ContentLibrary() {
  const router = useRouter();
  const { profile } = useApp();
  const [view, setView] = useState<View>({ kind: "all" });
  const [upload, setUpload] = useState(false);
  const [newFolder, setNewFolder] = useState<null | "team" | "personal">(null);
  const [folderName, setFolderName] = useState("");
  const [rename, setRename] = useState<Doc | null>(null);
  const [share, setShare] = useState(false);
  const [q, setQ] = useState("");
  const [asc, setAsc] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("new") === "link") setShare(true);
    if (p.get("upload")) setUpload(true);
    if (p.toString()) window.history.replaceState(null, "", "/app/content");
  }, []);

  const { data, loading, reload } = useLoad(async () => {
    const [d, f, v] = await Promise.all([
      supabase.from("documents").select("*").order("updated_at", { ascending: false }),
      supabase.from("folders").select("*").order("created_at"),
      supabase.from("visits").select("document_id"),
    ]);
    const counts: Record<string, number> = {};
    (v.data || []).forEach((x) => { if (x.document_id) counts[x.document_id] = (counts[x.document_id] || 0) + 1; });
    return { docs: (d.data || []) as Doc[], folders: (f.data || []) as Folder[], counts };
  }, []);

  const docs = useMemo(() => {
    if (!data) return [];
    let list = data.docs.filter((d) => (view.kind === "deleted" ? d.deleted_at : !d.deleted_at));
    if (view.kind === "folder") list = list.filter((d) => d.folder_id === view.id);
    if (q) list = list.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
    return asc ? [...list].reverse() : list;
  }, [data, view, q, asc]);

  const title = view.kind === "all" ? "All content" : view.kind === "deleted" ? "Deleted content" : data?.folders.find((f) => f.id === view.id)?.name || "Folder";

  async function createFolder() {
    if (!folderName.trim() || !newFolder) return;
    const { data: f, error } = await supabase.from("folders").insert({ name: folderName.trim(), kind: newFolder }).select("id").single();
    if (error) return toast(error.message);
    setNewFolder(null); setFolderName(""); await reload(); setView({ kind: "folder", id: f.id });
  }
  async function softDelete(d: Doc, restore = false) {
    await supabase.from("documents").update({ deleted_at: restore ? null : new Date().toISOString() }).eq("id", d.id);
    toast(restore ? "Restored" : "Moved to Deleted content"); reload();
  }
  async function hardDelete(d: Doc) {
    if (!confirm(`Permanently delete “${d.name}”? Links to it will stop working. This can’t be undone.`)) return;
    if (d.file_path) await supabase.storage.from("documents").remove([d.file_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    toast("Deleted permanently"); reload();
  }
  async function move(d: Doc, folderId: string | null) {
    await supabase.from("documents").update({ folder_id: folderId }).eq("id", d.id); toast("Moved"); reload();
  }

  const FolderBtn = ({ v, label, indent = 0 }: { v: View; label: string; indent?: number }) => {
    const active = JSON.stringify(v) === JSON.stringify(view);
    return (
      <button className={`nav-item ${active ? "active" : ""}`} style={{ paddingLeft: 10 + indent, height: 36, width: "100%" }} onClick={() => setView(v)}>
        <FolderIcon size={16} fill="#8ab2ff" color="#8ab2ff" /><span className="ellipsis">{label}</span>
      </button>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <aside className="hide-sm" style={{ width: 300, flexShrink: 0, borderRight: "1px solid var(--dz-border-default)", padding: "24px 12px" }}>
        <div className="h2" style={{ padding: "0 10px 12px" }}>Content library</div>
        <FolderBtn v={{ kind: "all" }} label="All content" />
        <FolderBtn v={{ kind: "deleted" }} label="Deleted content" />
        {(["team", "personal"] as const).map((k) => (
          <div key={k}>
            <div className="row nav-item" style={{ height: 36 }}><ChevronDown size={14} /><span className="grow">{k === "team" ? "Team folders" : "Personal folders"}</span>
              <button className="icon-btn s" aria-label="New folder" onClick={() => setNewFolder(k)}><Plus size={16} /></button></div>
            {data?.folders.filter((f) => f.kind === k).map((f) => <FolderBtn key={f.id} v={{ kind: "folder", id: f.id }} label={f.name} indent={18} />)}
          </div>
        ))}
      </aside>
      <div className="content grow" style={{ maxWidth: 1000 }}>
        <div className="row gap-12 wrap"><h1 className="page-title grow">{title}</h1>
          <div className="search"><Search size={16} /><input placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <div className="row gap-8 mt-24 wrap">
          <button className="btn btn-dark" onClick={() => setUpload(true)}><Upload size={16} />Add content<ChevronDown size={14} /></button>
          <button className="btn btn-secondary" onClick={() => docs[0] ? setShare(true) : toast("Upload a document first")}><Share2 size={16} />Share</button>
          <button className="btn btn-secondary" onClick={() => setNewFolder("personal")}><FolderPlus size={16} />Create folder</button>
          <button className="btn btn-secondary" onClick={() => router.push("/app/file-requests?new=1")}><FileInput size={16} />Request files</button>
        </div>
        {loading && !data ? <Loading /> : (
          <table className="table mt-24">
            <thead><tr><th style={{ width: 40 }} /><th>Name</th>
              <th><button className="row gap-4" style={{ color: "var(--dz-text-primary)", fontWeight: 500 }} onClick={() => setAsc(!asc)}>Updated <ArrowDown size={14} style={{ transform: asc ? "rotate(180deg)" : "" }} /></button></th>
              <th>Visits</th><th style={{ width: 48 }} /></tr></thead>
            <tbody>
              {docs.length === 0 && <tr><td colSpan={5} className="table-empty">{view.kind === "deleted" ? "Nothing in the trash." : <>No content here yet. <button className="brand medium" onClick={() => setUpload(true)}>Upload a file</button> to get a trackable link.</>}</td></tr>}
              {docs.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => view.kind !== "deleted" && router.push(`/app/content/${d.id}`)}>
                  <td><DocThumb kind={d.file_type} /></td>
                  <td className="medium">{d.name} {d.is_sample && <span className="tag">Sample</span>}</td>
                  <td><div className="col"><span>{timeAgo(d.updated_at)}</span><span className="caption faint">By {profile.full_name?.split(" ")[0] || "you"}</span></div></td>
                  <td>{data?.counts[d.id] || 0} visits</td>
                  <td>
                    <Menu items={view.kind === "deleted" ? [
                      { label: "Restore", icon: <RotateCcw size={14} />, onClick: () => softDelete(d, true) },
                      { label: "Delete forever", icon: <Trash2 size={14} />, danger: true, onClick: () => hardDelete(d) },
                    ] : [
                      { label: "Rename", icon: <Pencil size={14} />, onClick: () => setRename(d) },
                      ...(data?.folders || []).filter((f) => f.id !== d.folder_id).map((f) => ({ label: `Move to ${f.name}`, icon: <FolderIcon size={14} />, onClick: () => move(d, f.id) })),
                      { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => softDelete(d) },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {upload && <UploadModal folderId={view.kind === "folder" ? view.id : null} onClose={() => setUpload(false)} onDone={() => { setUpload(false); reload(); }} />}
      {share && docs[0] && <ShareModal docs={docs} onClose={() => setShare(false)} />}
      {newFolder && (
        <Modal title={`New ${newFolder} folder`} onClose={() => setNewFolder(null)} width={420}
          footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setNewFolder(null)}>Cancel</button><button className="btn btn-dark" onClick={createFolder}>Create</button></>}>
          <input className="input" autoFocus placeholder="Folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createFolder()} />
        </Modal>
      )}
      {rename && <RenameModal doc={rename} onClose={() => setRename(null)} onDone={() => { setRename(null); reload(); }} />}
    </div>
  );
}

function RenameModal({ doc, onClose, onDone }: { doc: Doc; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(doc.name);
  const save = async () => { await supabase.from("documents").update({ name: name.trim() || doc.name, updated_at: new Date().toISOString() }).eq("id", doc.id); onDone(); };
  return (
    <Modal title="Rename" onClose={onClose} width={420} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" onClick={save}>Save</button></>}>
      <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
    </Modal>
  );
}

function ShareModal({ docs, onClose }: { docs: Doc[]; onClose: () => void }) {
  const [pick, setPick] = useState<Doc | null>(null);
  const router = useRouter();
  if (pick) return <LinkModal documentId={pick.id} docName={pick.name} defaultName="" onClose={onClose} onSaved={() => router.push(`/app/content/${pick.id}?tab=links`)} />;
  return (
    <Modal title="Share which document?" onClose={onClose} width={480}>
      <div className="col">{docs.map((d) => (
        <button key={d.id} className="row gap-12" style={{ padding: "10px 4px", borderBottom: "1px solid var(--dz-border-subtle)", textAlign: "left" }} onClick={() => setPick(d)}>
          <DocThumb kind={d.file_type} /><span className="medium grow">{d.name}</span>
        </button>
      ))}</div>
    </Modal>
  );
}
