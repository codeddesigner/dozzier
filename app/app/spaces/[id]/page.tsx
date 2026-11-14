"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Folder as FolderIcon, ImageIcon, Plus, FilePlus2, Share2, Trash2, Pencil, ChevronRight, UserPlus, Eye } from "lucide-react";
import { supabase, Space, SpaceItem, Doc, Link as LinkT } from "@/lib/supabase";
import { Avatar, DocThumb, Loading, Menu, Modal, Tabs, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { LinkModal, linkUrl } from "@/components/LinkModal";
import { LinksTable } from "@/components/DocTables";
import { timeAgo } from "@/lib/format";
import { audit, Level, spaceLink } from "@/lib/space";
import { Permissions } from "@/components/space/Permissions";
import { Requests } from "@/components/space/Requests";
import { AuditLog } from "@/components/space/AuditLog";
import { Analytics, SpaceQA, SpaceSettings, Visitors } from "@/components/space/SpaceTabs";
import { InviteModal } from "@/components/space/Invite";

type Tab = "content" | "permissions" | "visitors" | "qa" | "requests" | "analytics" | "audit" | "settings";
const TABS: Tab[] = ["content", "permissions", "visitors", "qa", "requests", "analytics", "audit", "settings"];

export default function SpacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { email } = useApp();
  const [tab, setTab] = useState<Tab>("content");
  const [folder, setFolder] = useState<SpaceItem | null>(null);
  const [addDocs, setAddDocs] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [fname, setFname] = useState("");
  const [linkModal, setLinkModal] = useState<{ existing?: LinkT } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [invite, setInvite] = useState(false);
  const [nonce, setNonce] = useState(0);
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab") as Tab | null; if (t && TABS.includes(t)) setTab(t); }, []);
  const go = (t: Tab) => { setTab(t); window.history.replaceState(null, "", t === "content" ? `/app/spaces/${id}` : `/app/spaces/${id}?tab=${t}`); };

  const { data, loading, reload } = useLoad(async () => {
    const [s, i, d, l] = await Promise.all([
      supabase.from("spaces").select("*").eq("id", id).single(),
      supabase.from("space_items").select("*").eq("space_id", id).order("position").order("name"),
      supabase.from("documents").select("id,name,file_type").is("deleted_at", null),
      supabase.from("links").select("*").eq("space_id", id).order("created_at", { ascending: false }),
    ]);
    if (s.error) throw s.error;
    const linkIds = (l.data || []).map((x) => x.id);
    const [vv, rq, qa] = await Promise.all([
      linkIds.length ? supabase.from("visits").select("link_id,visitor_email,started_at").in("link_id", linkIds).is("parent_visit_id", null).order("started_at", { ascending: false }) : Promise.resolve({ data: [] as { link_id: string; visitor_email: string | null; started_at: string }[] }),
      supabase.from("space_requests").select("id", { count: "exact", head: true }).eq("space_id", id).neq("status", "done"),
      linkIds.length ? supabase.from("doc_questions").select("id", { count: "exact", head: true }).in("link_id", linkIds).is("answer", null) : Promise.resolve({ count: 0 }),
    ]);
    return { space: s.data as Space, items: (i.data || []) as SpaceItem[], docs: (d.data || []) as Pick<Doc, "id" | "name" | "file_type">[], links: (l.data || []) as LinkT[], visits: vv.data || [], openReqs: rq.count || 0, openQs: qa.count || 0 };
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
  const topFolders = items.filter((i) => !i.parent_id && i.kind === "folder");
  const linkIds = links.map((l) => l.id);
  const defaultLevel: Level = space.allow_download ? "download" : space.watermark ?? true ? "view_watermark" : "view";

  async function addFolder() {
    if (!fname.trim()) return;
    await supabase.from("space_items").insert({ space_id: id, kind: "folder", name: fname.trim(), parent_id: folder?.id || null, position: level.length });
    await supabase.from("spaces").update({ updated_at: new Date().toISOString() }).eq("id", id);
    audit(id, email, `Created folder “${fname.trim()}”${folder ? ` in ${folder.name}` : ""}`, "upload");
    setFname(""); setNewFolder(false); reload();
  }
  async function remove(it: SpaceItem) { await supabase.from("space_items").delete().eq("id", it.id); audit(id, email, `Removed “${it.name}”`, "upload"); toast("Removed from Space"); reload(); }
  async function preview() { try { const slug = await spaceLink(space); window.open(linkUrl(slug), "_blank"); reload(); } catch (e) { toast(e instanceof Error ? e.message : "Couldn’t open preview"); } }

  return (
    <div className="content">
      <div className="row gap-6 body-m"><Link href="/app/spaces" className="muted">Spaces</Link><ChevronRight size={14} className="faint" /><span className="semibold ellipsis">{space.name}</span></div>
      <div className="row gap-12 mt-24 head-row" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <div className="row gap-8 grow head-main" style={{ minWidth: 0 }}>{renaming
          ? <input className="input" style={{ fontSize: 22, height: 44, maxWidth: 520 }} autoFocus defaultValue={space.name} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} onBlur={async (e) => { const n = e.target.value.trim(); if (n && n !== space.name) { await supabase.from("spaces").update({ name: n }).eq("id", id); audit(id, email, `Renamed Space to “${n}”`); } setRenaming(false); reload(); }} />
          : <><h1 className="page-title ellipsis">{space.name}</h1><button className="icon-btn s" onClick={() => setRenaming(true)} aria-label="Rename"><Pencil size={14} /></button>{space.status !== "active" && <span className="badge badge-muted">Archived</span>}</>}</div>
        <button className="btn btn-secondary" onClick={preview}><Eye size={16} />Visitor view</button>
        <button className="btn btn-secondary" onClick={() => setLinkModal({})}><Share2 size={16} />Share</button>
        <button className="btn btn-dark" onClick={() => setInvite(true)}><UserPlus size={16} />Invite people</button>
      </div>
      <div className="mt-16"><Tabs value={tab} onChange={go} tabs={[{ id: "content", label: "Content" }, { id: "permissions", label: "Permissions" }, { id: "visitors", label: "Visitors" }, { id: "qa", label: data.openQs ? `Q&A ${data.openQs}` : "Q&A" }, { id: "requests", label: data.openReqs ? `Requests ${data.openReqs}` : "Requests" }, { id: "analytics", label: "Analytics" }, { id: "audit", label: "Audit log" }, { id: "settings", label: "Settings" }]} /></div>

      {tab === "content" && (
        <div className="space-content mt-24">
          <div className="card space-card">
            <div className="space-banner" style={{ background: space.banner, borderRadius: 0 }}><span className="badge" style={{ position: "absolute", top: 12, left: 12, background: "#fff" }}>Preview</span></div>
            <div className="row gap-16 space-head-row" style={{ padding: "0 20px", alignItems: "flex-end", marginTop: -40 }}>
              <div className="space-logo"><ImageIcon size={24} className="muted" /></div>
              <div className="col gap-4 grow" style={{ paddingTop: 48 }}>
                <span className="caption muted">{space.subtitle || "Data room"} · Updated {timeAgo(space.updated_at)} <span className={`badge ${space.status === "active" ? "badge-success" : "badge-muted"}`}>{space.status === "active" ? "Active" : "Archived"}</span></span>
                <div className="avatar-stack mt-8">{(viewers.length ? viewers : [email]).slice(0, 4).map((e) => <Avatar key={e} email={e} size={32} />)}<button className="avatar" style={{ width: 32, height: 32, background: "var(--dz-bg-surface)", color: "var(--dz-text-primary)", marginLeft: -8, border: "1px solid var(--dz-border-default)" }} onClick={() => setInvite(true)} aria-label="Invite"><Plus size={14} /></button></div>
              </div>
              <div className="row gap-8" style={{ paddingBottom: 4 }}>
                <button className="btn btn-secondary btn-s" onClick={() => setAddDocs(true)}><FilePlus2 size={14} />Add documents</button>
                <button className="btn btn-secondary btn-s" onClick={() => setNewFolder(true)}><Plus size={14} />Folder</button>
              </div>
            </div>
            <div style={{ padding: "16px 20px 20px" }}>
              <div className="row gap-6 semibold body-m"><button onClick={() => setFolder(null)}>Home</button>{folder && <><ChevronRight size={14} className="faint" />{folder.name}</>}</div>
              <table className="table mt-8">
                <thead><tr><th style={{ width: 40 }} /><th>Name</th><th className="hide-sm">Type</th><th className="hide-sm">Added</th><th style={{ width: 40 }} /></tr></thead>
                <tbody>
                  {level.length === 0 && <tr><td colSpan={5} className="table-empty">Empty — add documents or a folder.</td></tr>}
                  {level.map((it) => (
                    <tr key={it.id} className="clickable" onClick={() => it.kind === "folder" ? setFolder(it) : router.push(`/app/content/${it.document_id}`)}>
                      <td>{it.kind === "folder" ? <FolderIcon size={22} fill="#a9c4fb" color="#a9c4fb" /> : <DocThumb kind={docType(it.document_id)} />}</td>
                      <td><div className="col"><span className="medium ellipsis" style={{ maxWidth: 320 }}>{it.name}</span>{it.kind === "folder" && <span className="caption muted">{childCount(it.id)} items</span>}</div></td>
                      <td className="hide-sm muted">{it.kind === "folder" ? "Folder" : "Document"}</td>
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
        </div>
      )}
      {tab === "permissions" && <Permissions key={nonce} spaceId={id} folders={topFolders} defaultLevel={defaultLevel} onInvite={() => setInvite(true)} />}
      {tab === "visitors" && <Visitors spaceId={id} linkIds={linkIds} />}
      {tab === "qa" && <SpaceQA linkIds={linkIds} />}
      {tab === "requests" && <Requests spaceId={id} folders={topFolders} />}
      {tab === "analytics" && <Analytics items={items} linkIds={linkIds} />}
      {tab === "audit" && <AuditLog spaceId={id} spaceName={space.name} items={items} />}
      {tab === "settings" && <SpaceSettings space={space} onSaved={reload} />}

      {newFolder && (
        <Modal title="New folder" onClose={() => setNewFolder(false)} width={420} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setNewFolder(false)}>Cancel</button><button className="btn btn-dark" onClick={addFolder}>Create</button></>}>
          <input className="input" autoFocus value={fname} onChange={(e) => setFname(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFolder()} placeholder="Folder name" />
        </Modal>
      )}
      {addDocs && <AddDocs docs={docs} existing={items.filter((i) => i.document_id).map((i) => i.document_id!)} onClose={() => setAddDocs(false)}
        onAdd={async (sel) => {
          await supabase.from("space_items").insert(sel.map((d, i) => ({ space_id: id, kind: "document", name: d.name, document_id: d.id, parent_id: folder?.id || null, position: 100 + i })));
          await supabase.from("spaces").update({ updated_at: new Date().toISOString() }).eq("id", id);
          audit(id, email, `Added ${sel.length} document${sel.length === 1 ? "" : "s"} to ${folder?.name || "Home"}`, "upload", folder?.id);
          setAddDocs(false); toast(`${sel.length} document${sel.length === 1 ? "" : "s"} added`); reload();
        }} />}
      {linkModal && <LinkModal spaceId={id} existing={linkModal.existing} defaultName={linkModal.existing ? "" : space.name} docName={space.name} onClose={() => setLinkModal(null)} onSaved={() => { setLinkModal(null); reload(); }} />}
      {invite && <InviteModal space={space} onClose={() => { setInvite(false); setNonce((n) => n + 1); reload(); }} />}
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
