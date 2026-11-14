"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize, ZoomIn, ZoomOut, Download, Printer, Flag, CircleHelp, ShieldCheck, Folder, ArrowLeft, FileText } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Logo, AppIcon } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { DocRenderer, Source, sourceFor } from "@/components/DocRenderer";
import { NDA_TEMPLATE } from "@/components/nda";

type Pub = { link_id: string; name: string; require_email: boolean; has_passcode: boolean; allow_download: boolean; watermark: boolean; require_nda: boolean;
  screenshot_protection: boolean; document_name: string | null; file_type: string | null; page_count: number | null; is_sample: boolean | null; sender: string;
  space_id: string | null; space_name: string | null; nda_text: string | null };
type Started = { visit_id: string; file_path: string | null; mime_type: string | null; file_type: string; page_count: number; is_sample: boolean; email: string | null; name: string; note: string | null };
type SpaceItem = { id: string; kind: "folder" | "document"; name: string; parent_id: string | null; document_id: string | null; file_path: string | null; mime_type: string | null; file_type: string; note: string | null; page_count: number; is_sample: boolean };
type SpaceData = { name: string; subtitle: string | null; banner: string; items: SpaceItem[] };

export default function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const [pub, setPub] = useState<Pub | null | undefined>(undefined);
  const [visit, setVisit] = useState<Started | null>(null);
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [current, setCurrent] = useState<{ source: Source; pages: number; name: string; path: string | null } | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nda, setNda] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load link metadata; skip the gate if nothing is required.
  useEffect(() => {
    supabase.rpc("get_public_link", { p_slug: slug }).then(({ data }) => {
      const p = (data as Pub) || null;
      setPub(p);
      try { const saved = localStorage.getItem("dz-viewer-email"); if (saved) setEmail(saved); } catch {}
      if (p && !p.require_email && !p.has_passcode && !p.require_nda) start(p, "", "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function start(p: Pub, em: string, pc: string) {
    setBusy(true); setErr(null);
    let location = "";
    try { location = (await (await fetch("/api/geo")).json()).location || ""; } catch {}
    const { data, error } = await supabase.rpc("start_visit", { p_slug: slug, p_email: em, p_passcode: pc, p_location: location, p_user_agent: navigator.userAgent });
    if (error) { setBusy(false); return setErr(error.message); }
    const v = data as Started;
    try { if (em) localStorage.setItem("dz-viewer-email", em); } catch {}
    setVisit(v);
    if (p.space_id) {
      const { data: s } = await supabase.rpc("get_public_space", { p_slug: slug });
      setSpace(s as SpaceData);
    } else {
      await openDoc({ file_path: v.file_path, mime_type: v.mime_type, file_type: v.file_type, page_count: v.page_count, is_sample: v.is_sample, name: v.name, note: v.note });
    }
    setBusy(false);
  }

  async function openDoc(d: { file_path: string | null; mime_type: string | null; file_type: string; page_count: number; is_sample: boolean; name: string; note?: string | null }) {
    let url: string | null = null;
    if (d.file_path) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 3600);
      url = data?.signedUrl || null;
    }
    setCurrent({ source: sourceFor({ ...d, note: d.note || null }, url), pages: d.is_sample ? 12 : d.page_count || 1, name: d.name, path: d.file_path });
  }

  if (pub === undefined) return <div className="viewer"><div className="loading" style={{ margin: "auto" }}><span className="spinner" /></div></div>;
  if (pub === null) return (
    <div className="viewer"><Bar />
      <div className="viewer-stage"><div className="gate" style={{ alignItems: "center", textAlign: "center" }}><AppIcon size={36} /><div className="h2">This link isn’t available</div><p className="muted">It may have expired or been turned off by the sender. Ask them for a new link.</p></div></div>
    </div>
  );

  if (!visit) {
    const title = pub.space_id ? pub.space_name : pub.document_name;
    return (
      <div className="viewer">
        <Bar counter={pub.page_count ? `1 / ${pub.is_sample ? 12 : pub.page_count}` : undefined} />
        <div className="viewer-stage">
          <div className="blurred-page" />
          <form className="gate" style={{ position: "relative" }} onSubmit={(e) => { e.preventDefault(); if (pub.require_nda && !nda) return setErr("Please accept the agreement to continue"); start(pub, email, pass); }}>
            <div style={{ alignSelf: "center" }}><AppIcon size={36} /></div>
            <div className="h3 center" style={{ fontSize: 19 }}>{pub.sender} shared “{title}”</div>
            <p className="caption muted center">{pub.require_email ? "Enter your email to view. The sender will see that you opened it." : "Enter the details below to view."}</p>
            {pub.require_email && <label className="field"><span className="label">Email</span><input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>}
            {pub.has_passcode && <label className="field"><span className="label">Passcode</span><input className="input" type="password" required value={pass} onChange={(e) => setPass(e.target.value)} /></label>}
            {pub.require_nda && (
              <div className="col gap-8">
                <div className="caption" style={{ maxHeight: 140, overflowY: "auto", whiteSpace: "pre-wrap", background: "var(--dz-bg-subtle)", border: "1px solid var(--dz-border-default)", borderRadius: 8, padding: 10 }}>{pub.nda_text || NDA_TEMPLATE}</div>
                <label className="checkbox caption"><input type="checkbox" checked={nda} onChange={(e) => setNda(e.target.checked)} />I agree to the terms above</label>
              </div>
            )}
            {err && <p className="error-text">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Opening…" : "Continue"}</button>
            <p className="caption faint row gap-6" style={{ justifyContent: "center" }}><ShieldCheck size={14} />Secured by Dozzier</p>
          </form>
        </div>
      </div>
    );
  }

  if (space && !current) {
    return <SpaceBrowser space={space} email={visit.email} onOpen={(it) => openDoc({ file_path: it.file_path, mime_type: it.mime_type, file_type: it.file_type, page_count: it.page_count, is_sample: it.is_sample, name: it.name, note: it.note })} />;
  }
  if (!current) return <div className="viewer"><Bar /><div className="loading" style={{ margin: "auto" }}><span className="spinner" /></div></div>;

  return <Reader pub={pub} visit={visit} doc={current} onBack={space ? () => setCurrent(null) : undefined} />;
}

function Bar({ counter, children }: { counter?: string; children?: React.ReactNode }) {
  return (
    <div className="viewer-bar">
      <a href="/" target="_blank" rel="noreferrer"><Logo height={22} dark /></a>
      {counter && <span className="counter">{counter}</span>}
      <span className="spacer" />{children}
    </div>
  );
}

function SpaceBrowser({ space, email, onOpen }: { space: SpaceData; email: string | null; onOpen: (it: SpaceItem) => void }) {
  const [folder, setFolder] = useState<SpaceItem | null>(null);
  const items = space.items.filter((i) => (folder ? i.parent_id === folder.id : !i.parent_id));
  return (
    <div className="viewer" style={{ background: "#f3f5f7", color: "var(--dz-text-primary)" }}>
      <div className="viewer-bar" style={{ background: "#111827", color: "#fff" }}><Logo height={22} dark /><span className="spacer" />{email && <Avatar email={email} size={30} />}</div>
      <div style={{ maxWidth: 860, width: "100%", margin: "32px auto", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ height: 140, background: space.banner }} />
        <div style={{ padding: 24 }}>
          <div className="h1">{space.name}</div>{space.subtitle && <p className="muted">{space.subtitle}</p>}
          <div className="row gap-8 semibold mt-24">{folder ? <button className="row gap-6" onClick={() => setFolder(null)}><ArrowLeft size={14} />Home / {folder.name}</button> : "Home"}</div>
          <table className="table mt-8"><tbody>
            {items.length === 0 && <tr><td className="table-empty">This folder is empty.</td></tr>}
            {items.map((it) => (
              <tr key={it.id} className="clickable" onClick={() => (it.kind === "folder" ? setFolder(it) : onOpen(it))}>
                <td><div className="row gap-12">{it.kind === "folder" ? <Folder size={20} fill="#a9c4fb" color="#a9c4fb" /> : <FileText size={20} color="#4D94F7" />}<span className="medium">{it.name}</span></div></td>
                <td className="muted">{it.kind === "folder" ? `${space.items.filter((x) => x.parent_id === it.id).length} items` : "Document"}</td>
              </tr>))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

function Reader({ pub, visit, doc, onBack }: { pub: Pub; visit: Started; doc: { source: Source; pages: number; name: string; path: string | null }; onBack?: () => void }) {
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(doc.pages);
  const [zoom, setZoom] = useState(1);
  const [box, setBox] = useState({ w: 1040, h: 585 });
  const [hidden, setHidden] = useState(false);
  const last = useRef(Date.now());
  const pageRef = useRef(0);

  const flush = useCallback(() => {
    const now = Date.now();
    const secs = Math.round((now - last.current) / 1000);
    last.current = now;
    if (secs > 0 && document.visibilityState === "visible") supabase.rpc("track_page", { p_visit_id: visit.visit_id, p_page: pageRef.current + 1, p_seconds: secs }).then(() => {});
  }, [visit.visit_id]);

  useEffect(() => {
    const t = setInterval(flush, 5000);
    const vis = () => { if (document.visibilityState === "hidden") flush(); else last.current = Date.now(); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", flush);
    return () => { clearInterval(t); flush(); document.removeEventListener("visibilitychange", vis); window.removeEventListener("pagehide", flush); };
  }, [flush]);

  const go = useCallback((n: number) => { flush(); const p = Math.max(0, Math.min(pages - 1, n)); pageRef.current = p; setPage(p); }, [flush, pages]);

  useEffect(() => {
    const fit = () => setBox({ w: Math.min(1100, window.innerWidth - (window.innerWidth < 700 ? 32 : 220)), h: window.innerHeight - 200 });
    fit(); window.addEventListener("resize", fit);
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight" || e.key === " ") go(pageRef.current + 1); if (e.key === "ArrowLeft") go(pageRef.current - 1); };
    window.addEventListener("keydown", k);
    const blur = () => pub.screenshot_protection && setHidden(true);
    const focus = () => setHidden(false);
    window.addEventListener("blur", blur); window.addEventListener("focus", focus);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("keydown", k); window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); };
  }, [go, pub.screenshot_protection]);

  async function download() {
    if (!doc.path) return;
    supabase.rpc("record_download", { p_visit_id: visit.visit_id }).then(() => {});
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.path, 120, { download: doc.name });
    if (data) window.location.href = data.signedUrl;
  }

  const wm = pub.watermark ? `${visit.email || "viewer"} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : null;
  const multi = pages > 1;

  return (
    <div className="viewer" onContextMenu={(e) => e.preventDefault()}>
      <Bar counter={`${page + 1} / ${pages}`}>
        <div className="row gap-4">
          {onBack && <button className="vb-icon" onClick={onBack} aria-label="Back to Space"><ArrowLeft size={18} /></button>}
          <button className="vb-icon" aria-label="Full screen" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()}><Maximize size={18} /></button>
          <button className="vb-icon" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, z + 0.2))}><ZoomIn size={18} /></button>
          <button className="vb-icon" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}><ZoomOut size={18} /></button>
          {pub.allow_download && doc.path && <button className="vb-icon" aria-label="Download" onClick={download}><Download size={18} /></button>}
          {pub.allow_download && <button className="vb-icon hide-sm" aria-label="Print" onClick={() => window.print()}><Printer size={18} /></button>}
          <span className="hide-sm" style={{ width: 1, height: 22, background: "#374151", margin: "0 8px" }} />
          {visit.email && <Avatar email={visit.email} size={30} />}
          <a className="vb-icon hide-sm" aria-label="Report" href={`mailto:abuse@dozzier.io?subject=Report%20link%20${encodeURIComponent(location.pathname)}`}><Flag size={18} /></a>
          <a className="vb-icon hide-sm" aria-label="Help" href="/" target="_blank" rel="noreferrer"><CircleHelp size={18} /></a>
        </div>
      </Bar>
      <div className="viewer-stage" style={{ overflow: zoom > 1 ? "auto" : "hidden" }}>
        {multi && <button className="viewer-nav hide-sm" disabled={page === 0} onClick={() => go(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>}
        <div className={hidden ? "blur-guard" : ""} style={{ transition: "filter .15s" }} onClick={(e) => { if (window.innerWidth < 700) go(e.clientX > window.innerWidth / 2 ? page + 1 : page - 1); }}>
          <DocRenderer source={doc.source} page={page} maxW={box.w * zoom} maxH={box.h * zoom} onPages={(n) => setPages(n)} watermark={wm} />
        </div>
        {multi && <button className="viewer-nav hide-sm" disabled={page >= pages - 1} onClick={() => go(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>}
      </div>
      {multi && pages <= 40 && (
        <div className="viewer-thumbs">{Array.from({ length: pages }, (_, i) => <button key={i} className={i === page ? "active" : ""} onClick={() => go(i)} aria-label={`Page ${i + 1}`} />)}</div>
      )}
    </div>
  );
}
