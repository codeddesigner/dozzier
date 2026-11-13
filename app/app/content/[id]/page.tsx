"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { LinksTable, VisitRow, V, PV } from "@/components/DocTables";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye, Upload, ChevronDown, Pencil, Link2, Download, Building2, Copy, Trash2, Settings2, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase, Doc, Link as LinkT, BUCKET } from "@/lib/supabase";
import { Avatar, Kpi, Loading, Menu, Modal, Tabs, Toggle, copy, toast, useLoad } from "@/components/ui";
import { PageBars, LineChart, dailySeries } from "@/components/charts";
import { LinkModal, linkUrl } from "@/components/LinkModal";
import { DocRenderer, sourceFor } from "@/components/DocRenderer";
import { displayName, duration, timeAgo, fileKind } from "@/lib/format";
import { countPdfPages } from "@/lib/pdf";
import { useApp } from "@/components/AppContext";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useApp();
  const [tab, setTab] = useState<"activity" | "performance" | "links" | "settings">("activity");
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t === "links" || t === "performance") setTab(t); }, []);
  const [linkModal, setLinkModal] = useState<{ existing?: LinkT | null } | null>(null);
  const [preview, setPreview] = useState(false);
  const [range, setRange] = useState(30);
  const [coach, setCoach] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);

  const { data, loading, reload, error } = useLoad(async () => {
    const [d, l, v] = await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("links").select("*").eq("document_id", id).order("created_at", { ascending: false }),
      supabase.from("visits").select("id,link_id,contact_id,visitor_email,location,duration_seconds,pages_viewed,downloaded,is_sample,started_at").eq("document_id", id).order("started_at", { ascending: false }),
    ]);
    if (d.error) throw d.error;
    const pv = await supabase.from("page_views").select("visit_id,page_number,seconds").eq("document_id", id);
    return { doc: d.data as Doc, links: (l.data || []) as LinkT[], visits: (v.data || []) as V[], pages: (pv.data || []) as PV[] };
  }, [id]);

  useEffect(() => { try { if (!localStorage.getItem("dz-coach-visits")) setCoach(true); } catch {} }, []);
  const dismissCoach = () => { setCoach(false); try { localStorage.setItem("dz-coach-visits", "1"); } catch {} };

  const derived = useMemo(() => {
    if (!data) return null;
    const counts: Record<string, number> = {}; const last: Record<string, string> = {};
    data.visits.forEach((v) => { if (v.link_id) { counts[v.link_id] = (counts[v.link_id] || 0) + 1; last[v.link_id] ||= v.started_at; } });
    const byVisit: Record<string, PV[]> = {};
    data.pages.forEach((p) => (byVisit[p.visit_id] ||= []).push(p));
    const n = Math.max(1, data.doc.page_count);
    const per = Array(n).fill(0); const hits = Array(n).fill(0);
    data.pages.forEach((p) => { if (p.page_number <= n) { per[p.page_number - 1] += p.seconds; hits[p.page_number - 1]++; } });
    const avgPer = per.map((s, i) => (hits[i] ? s / Math.max(1, data.visits.length) : 0));
    return { counts, last, byVisit, avgPer };
  }, [data]);

  if (error) return <div className="content"><p className="error-text">This document couldn’t be loaded.</p><Link href="/app/content" className="brand">Back to content</Link></div>;
  if (loading && !data) return <Loading />;
  if (!data || !derived) return null;
  const { doc, links, visits } = data;
  const linkName = (lid: string | null) => links.find((l) => l.id === lid)?.name;

  const now = Date.now();
  const inRange = (v: V, from: number, to: number) => { const t = new Date(v.started_at).getTime(); return t >= now - from * 86400000 && t < now - to * 86400000; };
  const cur = visits.filter((v) => inRange(v, 30, 0)), prev = visits.filter((v) => inRange(v, 60, 30));
  const comp = (list: V[]) => list.length ? list.reduce((a, v) => a + Math.min(1, v.pages_viewed / Math.max(1, doc.page_count)), 0) / list.length : 0;
  const avg = (list: V[]) => list.length ? list.reduce((a, v) => a + v.duration_seconds, 0) / list.length : 0;
  const uniq = (list: V[]) => new Set(list.map((v) => v.visitor_email || v.id)).size;
  const series = dailySeries(visits.map((v) => v.started_at), range === 0 ? Math.max(7, Math.ceil((now - new Date(doc.created_at).getTime()) / 86400000) + 1) : range);

  async function replace(file: File) {
    toast("Uploading new version…");
    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (up.error) return toast(up.error.message);
    const kind = fileKind(file.type || file.name);
    const pages = kind === "pdf" ? await countPdfPages(file) : 1;
    if (doc.file_path) await supabase.storage.from(BUCKET).remove([doc.file_path]);
    await supabase.from("documents").update({ file_path: path, file_type: kind, mime_type: file.type, size_bytes: file.size, page_count: pages, is_sample: false, updated_at: new Date().toISOString() }).eq("id", doc.id);
    toast("New version live on all links"); reload();
  }

  return (
    <div className="content">
      <Link href="/app/content" className="muted">My Content</Link>
      <div className="row gap-16 mt-16 wrap">
        <div style={{ width: 56, height: 40, borderRadius: 8, background: "var(--dz-bg-brand-subtle)", position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", left: 8, top: 10, width: 22, height: 3, background: "#0061fe", borderRadius: 2 }} /><span style={{ position: "absolute", left: 8, top: 16, width: 14, height: 2, background: "#8ab2ff", borderRadius: 2 }} />
          <span style={{ position: "absolute", right: 8, bottom: 8, width: 14, height: 14, background: "#0061fe", borderRadius: 99 }} /></div>
        <div className="col grow" style={{ minWidth: 200 }}>
          <h1 className="page-title" style={{ fontSize: 28 }}>{doc.name}</h1>
          <NoteEditor doc={doc} onSaved={reload} />
        </div>
        <Menu items={[
          { label: "Download original", icon: <Download size={14} />, onClick: async () => { if (!doc.file_path) return toast("Sample content has no file"); const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60, { download: true }); if (s) window.location.href = s.signedUrl; } },
          { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", doc.id); toast("Moved to Deleted content"); router.push("/app/content"); } },
        ]} />
        <button className="btn btn-secondary" onClick={() => setPreview(true)}><Eye size={16} />Preview</button>
        <button className="btn btn-secondary" onClick={() => replaceInput.current?.click()}><Upload size={16} />Replace</button>
        <input ref={replaceInput} type="file" hidden onChange={(e) => e.target.files?.[0] && replace(e.target.files[0])} />
        <div className="split-btn"><button className="btn btn-dark" onClick={() => setLinkModal({})}>Create link</button>
          <button className="btn btn-dark" aria-label="Link options" onClick={() => setTab("links")}><ChevronDown size={16} /></button></div>
      </div>
      <div className="row gap-8 caption muted mt-8"><Avatar name="You" size={20} />Last updated {timeAgo(doc.updated_at)} · {doc.page_count} page{doc.page_count === 1 ? "" : "s"}</div>

      <div className="mt-24"><Tabs value={tab} onChange={setTab} tabs={[{ id: "activity", label: "Activity" }, { id: "performance", label: "Performance" }, { id: "links", label: "Links" }, { id: "settings", label: "Settings" }]} /></div>

      {tab === "activity" && (
        <div style={{ position: "relative" }}>
          <h2 className="h1 mt-24" style={{ marginBottom: 16 }}>All visits</h2>
          {coach && visits.length > 0 && (
            <div className="coachmark" style={{ right: 60, top: 40 }}>
              <div className="h3">Dig deeper into the data</div>
              <p className="caption" style={{ color: "#cfccc7", marginTop: 8 }}>Click any visitor to see page-by-page analytics for their visit.</p>
              <div className="row gap-12 mt-16" style={{ justifyContent: "flex-end" }}><button className="caption medium" style={{ color: "#fff", textDecoration: "underline" }} onClick={dismissCoach}>Not now</button><button className="btn btn-s" style={{ border: "1px solid #5c5953", color: "#fff" }} onClick={dismissCoach}>Try it</button></div>
            </div>
          )}
          <table className="table caps">
            <thead><tr><th>Visitor</th><th className="hide-sm">Link</th><th className="hide-sm" /><th>Time</th><th /></tr></thead>
            <tbody>
              {visits.length === 0 && <tr><td colSpan={5} className="table-empty">No visits yet. Create a link and share it — visits show up here in real time.</td></tr>}
              {visits.map((v) => <VisitRow key={v.id} v={v} pages={derived.byVisit[v.id] || []} pageCount={doc.page_count} linkName={linkName(v.link_id)} onOpen={() => router.push(`/app/contacts/${v.contact_id}`)} />)}
            </tbody>
          </table>
          <h2 className="h1 mt-32" style={{ marginBottom: 16 }}>All links</h2>
          <LinksTable links={links} visitCounts={derived.counts} lastVisit={derived.last} onChange={reload} onEdit={(l) => setLinkModal({ existing: l })} />
        </div>
      )}

      {tab === "performance" && (
        <div className="col gap-24 mt-24">
          <div className="kpis">
            <Kpi label="Visits" value={cur.length} cur={cur.length} prev={prev.length} />
            <Kpi label="Unique visitors" value={uniq(cur)} cur={uniq(cur)} prev={uniq(prev)} />
            <Kpi label="Avg. completion" value={`${Math.round(comp(cur) * 100)}%`} cur={comp(cur)} prev={comp(prev)} />
            <Kpi label="Avg. time" value={duration(avg(cur))} cur={avg(cur)} prev={avg(prev)} />
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div className="row" style={{ marginBottom: 24 }}><span className="h2 grow">Time spent per page</span><span className="muted hide-sm">Avg. {duration(avg(visits))} per visit · {Math.round(comp(visits) * 100)}% completion</span></div>
            <PageBars values={derived.avgPer} compact={doc.page_count > 20} />
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div className="row" style={{ marginBottom: 16 }}><span className="h2 grow">Recent visit stats</span>
              <div className="segmented">{[[7, "Last 7 days"], [30, "Last 30 days"], [0, "All time"]].map(([d, l]) => <button key={l} className={range === d ? "active" : ""} onClick={() => setRange(d as number)}>{l}</button>)}</div></div>
            <LineChart points={series.points} labels={series.labels} />
          </div>
        </div>
      )}

      {tab === "links" && (
        <div className="mt-24">
          <div className="row" style={{ marginBottom: 16 }}><span className="h1 grow">Links</span><button className="btn btn-dark" onClick={() => setLinkModal({})}>Create link</button></div>
          <LinksTable links={links} visitCounts={derived.counts} lastVisit={derived.last} onChange={reload} onEdit={(l) => setLinkModal({ existing: l })} />
        </div>
      )}

      {tab === "settings" && <DocSettings doc={doc} onSaved={reload} />}

      {linkModal && <LinkModal documentId={doc.id} existing={linkModal.existing} defaultName="" onClose={() => setLinkModal(null)} onSaved={() => { setLinkModal(null); reload(); setTab((t) => (t === "performance" || t === "settings" ? "links" : t)); }} />}
      {preview && <PreviewOverlay doc={doc} onClose={() => setPreview(false)} />}
    </div>
  );
}

function NoteEditor({ doc, onSaved }: { doc: Doc; onSaved: () => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(doc.note || "");
  const isUrl = doc.mime_type === "text/uri-list";
  if (isUrl) return <a className="caption brand" href={doc.note || "#"} target="_blank" rel="noreferrer">{doc.note}</a>;
  if (!edit) return <button className="row gap-6 caption muted" onClick={() => setEdit(true)}><Pencil size={12} />{doc.note || "Add a note to this document"}</button>;
  const save = async () => { await supabase.from("documents").update({ note: v.trim() || null }).eq("id", doc.id); setEdit(false); onSaved(); };
  return <input className="input" style={{ height: 30, maxWidth: 420 }} autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="Add a note" />;
}

function DocSettings({ doc, onSaved }: { doc: Doc; onSaved: () => void }) {
  const [name, setName] = useState(doc.name);
  const save = async () => { await supabase.from("documents").update({ name: name.trim() || doc.name, updated_at: new Date().toISOString() }).eq("id", doc.id); toast("Saved"); onSaved(); };
  return (
    <div className="col gap-16 mt-24" style={{ maxWidth: 520 }}>
      <label className="field"><span className="label">Document name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="caption muted">Type: {doc.file_type.toUpperCase()} · {doc.page_count} pages{doc.size_bytes ? ` · ${(doc.size_bytes / 1048576).toFixed(1)} MB` : ""} · Uploaded {new Date(doc.created_at).toLocaleDateString()}</div>
      <div><button className="btn btn-dark" onClick={save}>Save changes</button></div>
    </div>
  );
}

function PreviewOverlay({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(doc.page_count);
  const [box, setBox] = useState({ w: 900, h: 560 });
  useEffect(() => {
    if (doc.file_path) supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600).then(({ data }) => setUrl(data?.signedUrl || null));
    const fit = () => setBox({ w: Math.min(1100, window.innerWidth - 200), h: window.innerHeight - 200 });
    fit(); window.addEventListener("resize", fit);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setPage((p) => p + 1); if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1)); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("keydown", k); };
  }, [doc.file_path, onClose]);
  const p = Math.min(page, pages - 1);
  if (doc.file_path && !url) return <div className="scrim"><span className="spinner" /></div>;
  return (
    <div className="scrim" style={{ background: "rgba(26,25,24,.92)", flexDirection: "column", gap: 16 }}>
      <div className="row" style={{ width: "100%", maxWidth: 1200, color: "#fff" }}><span className="semibold grow">Preview · {doc.name}</span><span className="caption">{p + 1} / {pages}</span><button className="icon-btn" style={{ color: "#fff", marginLeft: 16 }} onClick={onClose} aria-label="Close preview"><X size={20} /></button></div>
      <div className="row gap-24">
        <button className="viewer-nav" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <DocRenderer source={sourceFor(doc, url)} page={p} maxW={box.w} maxH={box.h} onPages={setPages} />
        <button className="viewer-nav" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
