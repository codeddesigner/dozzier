"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Folder as FolderIcon, ImageIcon, ChevronDown, Plus, FilePlus2, Share2, Trash2, Pencil, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase, Space, SpaceItem, Doc, Link as LinkT } from "@/lib/supabase";
import { Avatar, DocThumb, Loading, Menu, Modal, toast, useLoad } from "@/components/ui";
import { LinkModal } from "@/components/LinkModal";
import { LinksTable } from "@/components/DocTables";
import { SPACE_TEMPLATES } from "@/components/templates";
import { createSpace } from "@/components/SpacePicker";
import { timeAgo } from "@/lib/format";

export default function SpacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [folder, setFolder] = useState<SpaceItem | null>(null);
  const [addDocs, setAddDocs] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [fname, setFname] = useState("");
  const [linkModal, setLinkModal] = useState<{ existing?: LinkT } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const { data, loading, reload } = useLoad(async () => {
    const [s, i, d, l] = await Promise.all([
      supabase.from("spaces").select("*").eq("id", id).single(),
      supabase.from("space_items").select("*").eq("space_id", id).order("position").order("name"),
      supabase.from("documents").select("id,name,file_type").is("deleted_at", null),
      supabase.from("links").select("*").eq("space_id", id).order("created_at", { ascending: false }),
    ]);
    if (s.error) throw s.error;
    const linkIds = (l.data || []).map((x) => x.id);
    const vv = linkIds.length ? await supabase.from("visits").select("link_id,visitor_email,started_at").in("link_id", linkIds).order("started_at", { ascending: false }) : { data: [] as { link_id: string; visitor_email: string | null; started_at: string }[] };
    return { space: s.data as Space, items: (i.data || []) as SpaceItem[], docs: (d.data || []) as Pick<Doc, "id" | "name" | "file_type">[], links: (l.data || []) as LinkT[], visits: vv.data || [] };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (!data) return <div className="content"><p className="error-text">Space not found.</p></div>;
  const { space, items, docs, links, visits } = data;
  const level = items.filter((i) => (folder ? i.parent_id === folder.id : !i.parent_id));
  const childCount = (fid: string) => items.filter((i) => i.parent_id === fid).length;
  const docType = (did: string | null) => docs.find((d) => d.id === did)?.file_type || "file";
  const counts: Record<string, number> = {}; const last: Record<string, string> = {};
  visits.forEach((v) => { counts[v.link_id] = (counts[v.link_id] || 0) + 1; last[v.link_id] ||= v.started_at; });
  const viewers = [...new Set(visits.map((v) => v.visitor_email).filter(Boolean))] as string[];

  async function addFolder() {
    if (!fname.trim()) return;
    await supabase.from("space_items").insert({ space_id: id, kind: "folder", name: fname.trim(), parent_id: folder?.id || null, position: level.length });
    await supabase.from("spaces").update({ updated_at: new Date().toISOString() }).eq("id", id);
    setFname(""); setNewFolder(false); reload();
  }
  async function remove(it: SpaceItem) { await supabase.from("space_items").delete().eq("id", it.id); toast("Removed from Space"); reload(); }
  async function applyTemplate(i: number) {
    const t = SPACE_TEMPLATES[i];
    const nid = await createSpace(t, t.name);
    toast(`Created “${t.name}”`); router.push(`/app/spaces/${nid}`);
  }

  return (
    <div style={{ display: "flex", gap: 40, padding: "0 40px", minHeight: "100%" }}>
      <div className="grow" style={{ background: "var(--dz-bg-muted)", borderRadius: "0 0 24px 24px", padding: 32, maxWidth: 760 }}>
        <div className="row gap-8" style={{ marginBottom: 16 }}>
          <Link href="/app/spaces" className="btn btn-ghost btn-s"><ArrowLeft size={14} />Spaces</Link><span className="spacer" />
          <button className="btn btn-secondary btn-s" style={{ background: "#fff" }} onClick={() => setAddDocs(true)}><FilePlus2 size={14} />Add documents</button>
          <button className="btn btn-secondary btn-s" style={{ background: "#fff" }} onClick={() => setNewFolder(true)}><Plus size={14} />Folder</button>
          <button className="btn btn-dark btn-s" onClick={() => setLinkModal({})}><Share2 size={14} />Share Space</button>
        </div>
        <div className="card" style={{ overflow: "hidden", boxShadow: "var(--shadow-lg)", border: 0 }}>
          <div className="space-banner" style={{ background: space.banner, borderRadius: 0 }}><span className="badge" style={{ position: "absolute", top: 12, left: 12, background: "#fff" }}>Preview</span></div>
          <div className="row gap-16" style={{ padding: "0 20px", alignItems: "flex-end", marginTop: -40 }}>
            <div style={{ width: 92, height: 92, borderRadius: 8, background: "var(--dz-bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ImageIcon size={24} className="muted" /></div>
            <div className="col gap-4 grow" style={{ paddingTop: 48 }}>
              <div className="row gap-8">{renaming ? <input className="input" autoFocus defaultValue={space.name} onBlur={async (e) => { await supabase.from("spaces").update({ name: e.target.value || space.name }).eq("id", id); setRenaming(false); reload(); }} />
                : <><span className="h1">{space.name}</span><button className="icon-btn s" onClick={() => setRenaming(true)} aria-label="Rename"><Pencil size={14} /></button></>}</div>
              <span className="caption muted">{space.subtitle || "Data room"} · Last updated {timeAgo(space.updated_at)} <span className="badge badge-success">Active <ChevronDown size={10} /></span></span>
              <div className="avatar-stack mt-8">{(viewers.length ? viewers : ["you"]).slice(0, 4).map((e) => <Avatar key={e} email={e} size={32} />)}<button className="avatar" style={{ width: 32, height: 32, background: "#fff", color: "var(--dz-text-primary)", marginLeft: -8, border: "1px solid var(--dz-border-default)" }} onClick={() => setLinkModal({})} aria-label="Invite"><Plus size={14} /></button></div>
            </div>
          </div>
          <div style={{ padding: "16px 20px 20px" }}>
            <div className="row gap-6 semibold body-m">
              <button onClick={() => setFolder(null)}>Home</button>
              {folder && <><ChevronRight size={14} className="faint" />{folder.name}</>}
            </div>
            <table className="table mt-8">
              <thead><tr><th style={{ width: 40 }} /><th>Name</th><th>Type</th><th className="hide-sm">Updated</th><th style={{ width: 40 }} /></tr></thead>
              <tbody>
                {level.length === 0 && <tr><td colSpan={5} className="table-empty">Empty — add documents or a folder.</td></tr>}
                {level.map((it) => (
                  <tr key={it.id} className="clickable" onClick={() => it.kind === "folder" ? setFolder(it) : router.push(`/app/content/${it.document_id}`)}>
                    <td>{it.kind === "folder" ? <FolderIcon size={22} fill="#a9c4fb" color="#a9c4fb" /> : <DocThumb kind={docType(it.document_id)} />}</td>
                    <td><div className="col"><span className="medium ellipsis" style={{ maxWidth: 220 }}>{it.name}</span>{it.kind === "folder" && <span className="caption muted">{childCount(it.id)} items</span>}</div></td>
                    <td className="muted">{it.kind === "folder" ? "Folder" : "Document"}</td>
                    <td className="hide-sm muted">{timeAgo(it.created_at)}</td>
                    <td><Menu items={[{ label: "Remove", icon: <Trash2 size={14} />, danger: true, onClick: () => remove(it) }]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <h2 className="h2 mt-32" style={{ marginBottom: 12 }}>Links to this Space</h2>
        <div className="card" style={{ padding: "0 8px" }}><LinksTable links={links} visitCounts={counts} lastVisit={last} onChange={reload} onEdit={(l) => setLinkModal({ existing: l })} /></div>
        <div className="row mt-24"><button className="btn btn-danger btn-s" onClick={async () => { if (!confirm("Delete this Space and its links?")) return; await supabase.from("spaces").delete().eq("id", id); router.push("/app/spaces"); }}><Trash2 size={14} />Delete Space</button></div>
      </div>
      <aside className="hide-md" style={{ width: 340, flexShrink: 0, paddingTop: 32 }}>
        <div className="h2" style={{ marginBottom: 16 }}>Templates</div>
        <div className="col gap-16">
          {SPACE_TEMPLATES.map((t, i) => (
            <div key={t.name} className="template-card">
              <div className="col"><div style={{ height: 50, background: t.banner }} /><div className="col gap-6" style={{ padding: 12 }}>{[80, 70, 76, 60].map((w, k) => <span key={k} style={{ height: 3, width: `${w}%`, background: "#e2e0dc", borderRadius: 2 }} />)}</div></div>
              <div className="col" style={{ padding: 12, background: "#fff" }}>
                <span className="semibold">{t.name}</span><span className="caption muted mt-8 grow">{t.desc}</span>
                <div><button className="btn btn-dark btn-s mt-8" onClick={() => applyTemplate(i)}>Use template</button></div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {newFolder && (
        <Modal title="New folder" onClose={() => setNewFolder(false)} width={420} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setNewFolder(false)}>Cancel</button><button className="btn btn-dark" onClick={addFolder}>Create</button></>}>
          <input className="input" autoFocus value={fname} onChange={(e) => setFname(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFolder()} placeholder="Folder name" />
        </Modal>
      )}
      {addDocs && <AddDocs docs={docs} existing={items.filter((i) => i.document_id).map((i) => i.document_id!)} onClose={() => setAddDocs(false)}
        onAdd={async (sel) => {
          await supabase.from("space_items").insert(sel.map((d, i) => ({ space_id: id, kind: "document", name: d.name, document_id: d.id, parent_id: folder?.id || null, position: 100 + i })));
          await supabase.from("spaces").update({ updated_at: new Date().toISOString() }).eq("id", id);
          setAddDocs(false); toast(`${sel.length} document${sel.length === 1 ? "" : "s"} added`); reload();
        }} />}
      {linkModal && <LinkModal spaceId={id} existing={linkModal.existing} defaultName="" onClose={() => setLinkModal(null)} onSaved={() => { setLinkModal(null); reload(); }} />}
    </div>
  );
}

function AddDocs({ docs, existing, onClose, onAdd }: { docs: Pick<Doc, "id" | "name" | "file_type">[]; existing: string[]; onClose: () => void; onAdd: (d: Pick<Doc, "id" | "name">[]) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const avail = docs.filter((d) => !existing.includes(d.id));
  return (
    <Modal title="Add documents from your library" onClose={onClose} width={520}
      footer={<><span className="grow caption faint">{sel.length} selected</span><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" disabled={!sel.length} onClick={() => onAdd(avail.filter((d) => sel.includes(d.id)))}>Add</button></>}>
      {avail.length === 0 && <p className="muted">All your documents are already in this Space. <Link className="brand" href="/app/content">Upload more</Link>.</p>}
      {avail.map((d) => (
        <label key={d.id} className="row gap-12" style={{ padding: "10px 4px", borderBottom: "1px solid var(--dz-border-subtle)", cursor: "pointer" }}>
          <input type="checkbox" checked={sel.includes(d.id)} onChange={(e) => setSel((s) => e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id))} />
          <DocThumb kind={d.file_type} /><span className="medium">{d.name}</span>
        </label>
      ))}
    </Modal>
  );
}
