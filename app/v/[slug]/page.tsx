"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Maximize, ZoomIn, ZoomOut, Download, Printer, Flag, CircleHelp, ShieldCheck, Folder, ArrowLeft, FileText, MessageSquare, CalendarDays, X, Search, ImageIcon } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Logo, AppIcon, LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { DocRenderer, Source, sourceFor } from "@/components/DocRenderer";
import { NDA_TEMPLATE } from "@/components/nda";
import { OtpInput } from "@/components/OtpInput";
import { ReportLink } from "@/components/ReportLink";
import { indexItems } from "@/lib/format";
import { isAppHost } from "@/lib/domains";

type Pub = { link_id: string; name: string; require_email: boolean; verify_email?: boolean; has_passcode: boolean; allow_download: boolean; watermark: boolean; require_nda: boolean;
  screenshot_protection: boolean; document_name: string | null; file_type: string | null; page_count: number | null; is_sample: boolean | null; sender: string;
  space_id: string | null; space_name: string | null; nda_text: string | null;
  brand?: { color: string | null; logo_path: string | null; hide_branding: boolean | null; viewer: string; welcome: string | null; show_shared_by: boolean; sender_name: string | null; sender_title: string | null; avatar_path: string | null; booking_url: string | null } };

function BrandAsset({ path, alt, style }: { path: string | null | undefined; alt: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (path) supabase.storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl || null)); }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} style={style} /> : null;
}
type Started = { token?: string | null; visit_id: string; file_path: string | null; mime_type: string | null; file_type: string; page_count: number; is_sample: boolean; email: string | null; name: string; note: string | null };
type SpaceItem = { id: string; kind: "folder" | "document"; name: string; parent_id: string | null; level: string; file_type: string | null; page_count: number | null; created_at: string };
type SpaceData = { name: string; subtitle: string | null; banner: string; updated_at: string; status: string; sender: string; workspace: string | null; expires_at: string | null; nda: boolean; watermark: boolean; group: string | null; viewers: string[]; items: SpaceItem[]; auto_index?: boolean };
type Current = { source: Source; pages: number; name: string; path: string | null; visitId?: string; level?: string };

export default function Viewer() {
  const { slug } = useParams<{ slug: string }>();
  const [pub, setPub] = useState<Pub | null | undefined>(undefined);
  const [visit, setVisit] = useState<Started | null>(null);
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [current, setCurrent] = useState<Current | null>(null);
  const [spaceErr, setSpaceErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [nda, setNda] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeStep, setCodeStep] = useState(false);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const tokKey = (em: string) => `dz-vt-${slug}-${em.trim().toLowerCase()}`;

  // Load link metadata; skip the gate if nothing is required.
  useEffect(() => {
    (async () => {
      // On a customer's own domain, only that workspace's links open.
      if (!isAppHost(window.location.host)) {
        const { data: ok } = await supabase.rpc("link_on_host", { p_slug: slug, p_host: window.location.host });
        if (!ok) { setPub(null); return; }
      }
      const { data } = await supabase.rpc("get_public_link", { p_slug: slug });
      const p = (data as Pub) || null;
      setPub(p);
      try {
        const pre = new URLSearchParams(window.location.search).get("email");
        const saved = localStorage.getItem("dz-viewer-email");
        if (pre) setEmail(pre); else if (saved) setEmail(saved);
      } catch {}
      if (p && !p.require_email && !p.verify_email && !p.has_passcode && !p.require_nda) start(p, "", "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function sendCode(em: string) {
    const { error } = await supabase.rpc("request_view_code", { p_slug: slug, p_email: em });
    if (error) { setErr(error.message); return false; }
    return true;
  }

  async function start(p: Pub, em: string, pc: string, otp?: string) {
    setBusy(true); setErr(null);
    let location = "";
    try { location = (await (await fetch("/api/geo")).json()).location || ""; } catch {}
    // A device that verified this email before keeps a 30-day token.
    let remembered: string | null = null;
    try { remembered = em ? localStorage.getItem(tokKey(em)) : null; } catch {}
    const { data, error } = await supabase.rpc("start_visit", { p_slug: slug, p_email: em, p_passcode: pc, p_location: location, p_user_agent: navigator.userAgent, p_code: otp || remembered || null });
    if (error) {
      if (error.message.includes("VERIFY_REQUIRED")) {
        try { if (remembered) localStorage.removeItem(tokKey(em)); } catch {}
        if (otp) { setBusy(false); setCode(""); return setErr("That code didn’t work. Check the latest email or send a new code."); }
        const ok = await sendCode(em);
        setBusy(false);
        if (ok) { setCodeStep(true); setCode(""); }
        return;
      }
      setBusy(false); return setErr(error.message);
    }
    const v = data as Started;
    try { if (em) localStorage.setItem("dz-viewer-email", em); if (v.token && em) localStorage.setItem(tokKey(em), v.token); } catch {}
    setCodeStep(false);
    setVisit(v);
    if (p.space_id) {
      const { data: s, error: se } = await supabase.rpc("space_for_visit", { p_visit_id: v.visit_id });
      if (se) { setBusy(false); setVisit(null); return setErr(se.message); }
      setSpace(s as SpaceData);
    } else {
      await openDoc({ file_path: v.file_path, mime_type: v.mime_type, file_type: v.file_type, page_count: v.page_count, is_sample: v.is_sample, name: v.name, note: v.note });
    }
    setBusy(false);
  }

  async function openSpaceItem(it: SpaceItem) {
    setSpaceErr(null);
    const { data, error } = await supabase.rpc("space_open_doc", { p_visit_id: visit!.visit_id, p_item_id: it.id });
    if (error) return setSpaceErr(error.message);
    const d = data as Started & { level: string };
    await openDoc(d, { visitId: d.visit_id, level: d.level });
  }

  async function openDoc(d: { file_path: string | null; mime_type: string | null; file_type: string; page_count: number; is_sample: boolean; name: string; note?: string | null }, extra: { visitId?: string; level?: string } = {}) {
    let url: string | null = null;
    if (d.file_path) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 3600);
      url = data?.signedUrl || null;
    }
    setCurrent({ source: sourceFor({ ...d, note: d.note || null }, url), pages: d.is_sample ? 12 : d.page_count || 1, name: d.name, path: d.file_path, ...extra });
  }

  if (pub === undefined) return <div className="viewer"><div className="loading" style={{ margin: "auto" }}><span className="spinner" /></div></div>;
  if (pub === null) return (
    <div className="viewer"><Bar />
      <div className="viewer-stage"><div className="gate" style={{ alignItems: "center", textAlign: "center" }}><AppIcon size={36} /><div className="h2">This link isn’t available</div><p className="muted">It may have expired or been turned off by the sender. Ask them for a new link.</p></div></div>
    </div>
  );

  if (!visit) {
    const title = pub.space_id ? pub.space_name : pub.document_name;
    const b = pub.brand;
    const accent = b?.color && /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : undefined;
    return (
      <div className={`viewer ${b?.viewer === "light" ? "viewer-light" : ""}`}>
        <Bar counter={pub.page_count ? `${pub.is_sample ? 3 : 1} / ${pub.is_sample ? 12 : pub.page_count}` : undefined}>
          <div className="row gap-4 gate-tools" aria-hidden="true">
            <span className="vb-icon"><Maximize size={18} /></span><span className="vb-icon"><ZoomIn size={18} /></span><span className="vb-icon"><ZoomOut size={18} /></span>
            {pub.allow_download && <><span className="vb-icon"><Download size={18} /></span><span className="vb-icon hide-sm"><Printer size={18} /></span></>}
            <Avatar name="You" size={30} color="#ff7a3d" />
            <span className="vb-icon hide-sm"><Flag size={18} /></span><span className="vb-icon hide-sm"><CircleHelp size={18} /></span>
          </div>
        </Bar>
        <div className="viewer-stage">
          <div className="blurred-page" />
          {codeStep ? (
          <form className="gate" style={{ position: "relative" }} onSubmit={(e) => { e.preventDefault(); if (code.length === 6) start(pub, email, pass, code); }}>
            <div style={{ alignSelf: "center" }}>{b?.logo_path ? <BrandAsset path={b.logo_path} alt={pub.sender} style={{ height: 36, maxWidth: 160, objectFit: "contain" }} /> : <LogoMark size={30} />}</div>
            <div className="h3 center gate-title">Check your email</div>
            <p className="caption muted center">We sent a 6-digit code to <span className="medium" style={{ color: "var(--dz-text-primary)" }}>{email}</span>. Enter it to view “{title}”.</p>
            <div style={{ alignSelf: "center" }}><OtpInput value={code} onChange={setCode} onComplete={(c) => start(pub, email, pass, c)} disabled={busy} /></div>
            {err && <p className="error-text">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || code.length < 6} style={accent ? { background: accent } : undefined}>{busy ? "Checking…" : "Verify and view"}</button>
            <div className="row caption" style={{ justifyContent: "space-between" }}>
              <button type="button" className="link" onClick={() => { setCodeStep(false); setErr(null); setCode(""); }}>Use a different email</button>
              <button type="button" className="link" disabled={resent} onClick={async () => { setErr(null); if (await sendCode(email)) { setResent(true); setTimeout(() => setResent(false), 30000); } }}>{resent ? "Code sent" : "Send a new code"}</button>
            </div>
            {!b?.hide_branding && <p className="caption faint row gap-6" style={{ justifyContent: "center" }}><ShieldCheck size={14} />Secured by Dozzier</p>}
          </form>
          ) : (
          <form className="gate" style={{ position: "relative" }} onSubmit={(e) => { e.preventDefault(); if (pub.require_nda && !nda) return setErr("Please accept the agreement to continue"); start(pub, email, pass); }}>
            <div style={{ alignSelf: "center" }}>{b?.logo_path ? <BrandAsset path={b.logo_path} alt={pub.sender} style={{ height: 36, maxWidth: 160, objectFit: "contain" }} /> : <LogoMark size={30} />}</div>
            <div className="h3 center gate-title">{pub.sender} shared “{title}”</div>
            {b?.welcome && <p className="caption center" style={{ color: "var(--dz-text-secondary)" }}>{b.welcome}</p>}
            <p className="caption muted center">{pub.verify_email ? "Enter your email and we’ll send you a code to view." : pub.require_email ? "Enter your email to view. The sender will see that you opened it." : "Enter the details below to view."}</p>
            {(pub.require_email || pub.verify_email) && <label className="field"><span className="label">Email</span><input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>}
            {pub.has_passcode && <label className="field"><span className="label">Passcode</span><input className="input" type="password" required value={pass} onChange={(e) => setPass(e.target.value)} /></label>}
            {pub.require_nda && (
              <div className="col gap-8">
                <div className="caption" style={{ maxHeight: 140, overflowY: "auto", whiteSpace: "pre-wrap", background: "var(--dz-bg-subtle)", border: "1px solid var(--dz-border-default)", borderRadius: 8, padding: 10 }}>{pub.nda_text || NDA_TEMPLATE}</div>
                <label className="checkbox caption"><input type="checkbox" checked={nda} onChange={(e) => setNda(e.target.checked)} />I agree to the terms above</label>
              </div>
            )}
            {err && <p className="error-text">{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy} style={accent ? { background: accent } : undefined}>{busy ? "Opening…" : "Continue"}</button>
            {b?.show_shared_by && b.sender_name && (
              <div className="row gap-10" style={{ borderTop: "1px solid var(--dz-border-subtle)", paddingTop: 12 }}>
                {b.avatar_path ? <BrandAsset path={b.avatar_path} alt="" style={{ width: 32, height: 32, borderRadius: 999, objectFit: "cover" }} /> : <Avatar name={b.sender_name} size={32} color="#ff7a3d" />}
                <div className="col grow"><span className="medium caption">{b.sender_name}</span><span className="micro faint">{[b.sender_title, pub.sender].filter(Boolean).join(" · ")}</span></div>
                {b.booking_url && <a href={b.booking_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-s">Book a call</a>}
              </div>
            )}
            {!b?.hide_branding && <p className="caption faint row gap-6" style={{ justifyContent: "center" }}><ShieldCheck size={14} />Secured by Dozzier</p>}
          </form>
          )}
        </div>
      </div>
    );
  }

  if (space && !current) {
    return <SpaceBrowser space={space} email={visit.email} visitId={visit.visit_id} error={spaceErr} onOpen={openSpaceItem} />;
  }
  if (!current) return <div className="viewer"><Bar /><div className="loading" style={{ margin: "auto" }}><span className="spinner" /></div></div>;

  const rPub = current.level ? { ...pub, allow_download: current.level === "download", watermark: current.level === "view_watermark" } : pub;
  return <Reader key={current.visitId || "doc"} pub={rPub} visit={current.visitId ? { ...visit, visit_id: current.visitId } : visit} doc={current} onBack={space ? () => setCurrent(null) : undefined} />;
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

function SpaceBrowser({ space, email, visitId, error, onOpen }: { space: SpaceData; email: string | null; visitId: string; error: string | null; onOpen: (it: SpaceItem) => void }) {
  const [folder, setFolder] = useState<SpaceItem | null>(null);
  const [q, setQ] = useState("");
  const [ask, setAsk] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const spaceIdx = space.auto_index !== false ? indexItems(space.items.map((x, i) => ({ ...x, position: i }))) : null;
  const top = space.items.filter((i) => !i.parent_id && i.kind === "folder");
  const rootDocs = space.items.filter((i) => !i.parent_id && i.kind === "document");
  const kids = (id: string) => space.items.filter((i) => i.parent_id === id);
  const deepDocs = (id: string): SpaceItem[] => kids(id).flatMap((k) => (k.kind === "folder" ? deepDocs(k.id) : [k]));
  const isNew = (it: SpaceItem) => Date.now() - new Date(it.created_at).getTime() < 7 * 86400000;
  const list = q.trim() ? space.items.filter((i) => i.kind === "document" && i.name.toLowerCase().includes(q.trim().toLowerCase())) : folder ? kids(folder.id) : [];
  const initials = (space.workspace || space.sender).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const open = async (it: SpaceItem) => { if (it.kind === "folder") { setFolder(it); setQ(""); return; } setBusyId(it.id); await onOpen(it); setBusyId(null); };
  const notice = [space.nda && "You accepted the NDA", space.expires_at && `Access expires ${new Date(space.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, space.watermark && email && "Pages are watermarked with your email"].filter(Boolean) as string[];
  const updated = (() => { const m = Math.round((Date.now() - new Date(space.updated_at).getTime()) / 60000); return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; })();

  return (
    <div className="sv">
      <header className="sv-bar">
        <span className="sv-mono">{initials}</span>
        <span className="medium ellipsis sv-crumb">{space.workspace || space.sender} · {space.name}</span>
        <span className="spacer" />
        <label className="sv-search hide-sm"><Search size={15} /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="btn btn-secondary btn-s" onClick={() => setAsk(true)}><MessageSquare size={15} />Ask a question</button>
        {email && <Avatar email={email} size={30} />}
      </header>
      {notice.length > 0 && <div className="sv-notice"><ShieldCheck size={15} />{notice.join(" · ")}</div>}
      <div className="sv-body">
        <nav className="sv-side">
          <button className={!folder && !q ? "on" : ""} onClick={() => { setFolder(null); setQ(""); }}><Folder size={16} fill="#a9c4fb" color="#a9c4fb" />Home</button>
          {top.map((f) => <button key={f.id} className={folder?.id === f.id ? "on" : ""} onClick={() => open(f)}><Folder size={16} fill="#a9c4fb" color="#a9c4fb" /><span className="ellipsis grow">{f.name}</span>{deepDocs(f.id).some(isNew) && <span className="sv-newdot" />}</button>)}
        </nav>
        <main className="sv-main">
          {error && <div className="sv-error">{error}</div>}
          {!folder && !q ? (
            <>
              <div className="sv-banner" style={{ background: space.banner }} />
              <div className="sv-head">
                <div className="sv-logo"><ImageIcon size={26} /></div>
                <div className="col gap-6">
                  <h1 className="h1">{space.name}</h1>
                  <span className="caption muted row gap-8">Shared by {space.sender} · Updated {updated}<span className="badge badge-success">{space.status === "active" ? "Active" : "Archived"}</span>{space.group && <span className="tag">{space.group}</span>}</span>
                  {space.viewers.length > 0 && <div className="avatar-stack mt-4">{space.viewers.slice(0, 4).map((e) => <Avatar key={e} email={e} size={30} />)}</div>}
                </div>
              </div>
              {space.subtitle && <p className="muted" style={{ marginTop: 8 }}>{space.subtitle}</p>}
              <div className="sv-folders">
                {top.map((f, i) => { const d = deepDocs(f.id); const n = d.filter(isNew).length; return (
                  <button key={f.id} className="sv-fcard" style={{ animationDelay: `${i * 40}ms` }} onClick={() => open(f)}>
                    <Folder size={26} fill="#a9c4fb" color="#a9c4fb" /><span className="col grow" style={{ minWidth: 0, textAlign: "left" }}><span className="medium ellipsis">{spaceIdx?.get(f.id) && <span className="item-index">{spaceIdx.get(f.id)}</span>}{f.name}</span><span className="caption muted">{d.length} file{d.length === 1 ? "" : "s"}</span></span>
                    {n > 0 && <span className="badge badge-brand">{n} new</span>}
                  </button>
                ); })}
              </div>
              {rootDocs.length > 0 && <FileList idx={spaceIdx} items={rootDocs} isNew={isNew} busyId={busyId} onOpen={open} />}
              {top.length === 0 && rootDocs.length === 0 && <p className="muted mt-24">Nothing has been shared with you here yet.</p>}
            </>
          ) : (
            <>
              <div className="row gap-6 semibold" style={{ marginBottom: 12 }}>
                <button className="muted" onClick={() => { setFolder(null); setQ(""); }}>Home</button><ChevronRight size={14} className="faint" />
                {q ? <span>Results for “{q}”</span> : <span>{folder!.name}</span>}
              </div>
              {list.length === 0 ? <p className="muted">{q ? "No documents match." : "This folder is empty."}</p> : <FileList idx={spaceIdx} items={list} isNew={isNew} busyId={busyId} onOpen={open} countOf={(id) => deepDocs(id).length} />}
            </>
          )}
        </main>
      </div>
      {ask && <SpaceAsk visitId={visitId} folders={top} current={folder} sender={space.sender} onClose={() => setAsk(false)} />}
    </div>
  );
}

function FileList({ items, isNew, busyId, onOpen, countOf, idx }: { items: SpaceItem[]; isNew: (i: SpaceItem) => boolean; busyId: string | null; onOpen: (i: SpaceItem) => void; countOf?: (id: string) => number; idx?: Map<string, string> | null }) {
  const LV: Record<string, string> = { download: "Download", view_watermark: "View only · watermarked", view: "View only" };
  return (
    <div className="sv-files">
      {items.map((it, i) => (
        <button key={it.id} className="sv-file" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} onClick={() => onOpen(it)} disabled={busyId === it.id}>
          {it.kind === "folder" ? <Folder size={22} fill="#a9c4fb" color="#a9c4fb" /> : <FileText size={22} color="#4D94F7" />}
          <span className="col grow" style={{ minWidth: 0, textAlign: "left" }}><span className="medium ellipsis">{idx?.get(it.id) && <span className="item-index">{idx.get(it.id)}</span>}{it.name}</span>
            <span className="caption muted">{it.kind === "folder" ? `${countOf?.(it.id) ?? 0} files` : [it.page_count ? `${it.page_count} page${it.page_count === 1 ? "" : "s"}` : (it.file_type || "").toUpperCase(), LV[it.level]].filter(Boolean).join(" · ")}</span></span>
          {isNew(it) && it.kind === "document" && <span className="badge badge-brand">New</span>}
          {busyId === it.id ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <ChevronRight size={16} className="faint" />}
        </button>
      ))}
    </div>
  );
}

function SpaceAsk({ visitId, folders, current, sender, onClose }: { visitId: string; folders: SpaceItem[]; current: SpaceItem | null; sender: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [folder, setFolder] = useState(current?.id || "");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);
  async function send() {
    setState("busy"); setErr(null);
    const { error } = await supabase.rpc("space_request", { p_visit_id: visitId, p_title: title, p_folder_id: folder || null, p_details: details || null });
    if (error) { setState("idle"); return setErr(error.message); }
    setState("sent");
  }
  return (
    <div className="sv-modal-back" onClick={onClose}>
      <div className="sv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ask a question">
        <div className="row"><span className="h3 grow">{state === "sent" ? "Sent" : "Ask a question or request a document"}</span><button className="icon-btn s" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        {state === "sent" ? (
          <><p className="muted" style={{ fontSize: 14 }}>{sender} has your request and will add it to the Space or reply to you directly.</p><div><button className="btn btn-primary" onClick={onClose}>Back to the Space</button></div></>
        ) : (
          <>
            <label className="field"><span className="label">What do you need?</span><input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 3-year financial model (xlsx)" /></label>
            <label className="field"><span className="label">Details (optional)</span><textarea className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
            {folders.length > 0 && <label className="field"><span className="label">Folder</span><select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Not sure</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
            {err && <p className="error-text">{err}</p>}
            <div className="row gap-8"><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={state === "busy" || !title.trim()} onClick={send}>{state === "busy" ? "Sending…" : "Send request"}</button></div>
          </>
        )}
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
  const [qOpen, setQOpen] = useState(false);
  // Questions panel opens on demand (Figma "Viewer · Reading" shows the full page first).
  useEffect(() => { if (new URLSearchParams(window.location.search).get("questions") === "1") setQOpen(true); }, []);
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
    const fit = () => setBox({ w: Math.min(1100, window.innerWidth - (window.innerWidth < 700 ? 32 : 220) - (qOpen && window.innerWidth > 900 ? 320 : 0)), h: window.innerHeight - 200 });
    fit(); window.addEventListener("resize", fit);
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight" || e.key === " ") go(pageRef.current + 1); if (e.key === "ArrowLeft") go(pageRef.current - 1); };
    window.addEventListener("keydown", k);
    const blur = () => pub.screenshot_protection && setHidden(true);
    const focus = () => setHidden(false);
    window.addEventListener("blur", blur); window.addEventListener("focus", focus);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("keydown", k); window.removeEventListener("blur", blur); window.removeEventListener("focus", focus); };
  }, [go, pub.screenshot_protection, qOpen]);

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
          <button className={`vb-icon ${qOpen ? "on" : ""}`} aria-label="Questions" aria-pressed={qOpen} onClick={() => setQOpen((o) => !o)}><MessageSquare size={18} /></button>
          <ReportLink email={visit.email} />
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
        <div className="viewer-thumbs" style={qOpen ? { paddingRight: 320 } : undefined}>{Array.from({ length: pages }, (_, i) => <button key={i} className={i === page ? "active" : ""} onClick={() => go(i)} aria-label={`Page ${i + 1}`} />)}</div>
      )}
      {qOpen && <QuestionsPanel visitId={visit.visit_id} page={page + 1} brand={pub.brand} sender={pub.sender} onClose={() => setQOpen(false)} onJump={(n) => go(n - 1)} />}
    </div>
  );
}

type Q = { id: string; page_number: number; body: string; answer: string | null; created_at: string; mine: boolean; asker: string; answerer: string | null };

function QuestionsPanel({ visitId, page, brand, sender, onClose, onJump }: { visitId: string; page: number; brand?: Pub["brand"]; sender: string; onClose: () => void; onJump: (n: number) => void }) {
  const [qs, setQs] = useState<Q[]>([]);
  const [scope, setScope] = useState<"page" | "all">("all");
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const load = useCallback(() => supabase.rpc("visit_questions", { p_visit_id: visitId }).then(({ data }) => setQs((data as Q[]) || [])), [visitId]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  const list = scope === "page" ? qs.filter((q) => q.page_number === page) : qs;
  async function ask() {
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("ask_question", { p_visit_id: visitId, p_page: page, p_body: text.trim(), p_anonymous: anon });
    setBusy(false);
    if (error) return;
    setText(""); setSent(true); setTimeout(() => setSent(false), 3000); load();
  }
  const who = brand?.sender_name?.split(" ")[0] || sender;
  return (
    <aside className="q-panel" aria-label="Questions">
      <div className="row" style={{ padding: "18px 18px 10px" }}><span className="h3 grow">Questions</span><button className="icon-btn s" aria-label="Close questions" onClick={onClose}><X size={16} /></button></div>
      <div style={{ padding: "0 18px" }}>
        <div className="segmented">{(["page", "all"] as const).map((sc) => <button key={sc} className={scope === sc ? "active" : ""} onClick={() => setScope(sc)}>{sc === "page" ? "This page" : `All${qs.length ? ` (${qs.length})` : ""}`}</button>)}</div>
      </div>
      <div className="q-list">
        {list.length === 0 && <p className="caption muted" style={{ padding: "8px 2px" }}>{scope === "page" ? `No questions on page ${page} yet.` : "No questions yet — ask anything about this document."}</p>}
        {list.map((q) => (
          <div key={q.id} className="q-card">
            <div className="row"><button className="tag" onClick={() => onJump(q.page_number)}>Page {q.page_number}</button><span className="spacer" />{q.answer ? <span className="badge badge-success">Answered</span> : <span className="badge badge-muted">Waiting</span>}</div>
            <div className="caption medium">{q.mine ? "You" : q.asker}</div>
            <p style={{ fontSize: 14 }}>{q.body}</p>
            {q.answer && <div className="q-answer"><span className="caption medium">{q.answerer || sender}</span><p style={{ fontSize: 14 }}>{q.answer}</p></div>}
          </div>
        ))}
      </div>
      <div className="q-ask">
        <textarea className="input" rows={3} placeholder={`Ask about page ${page}…`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); }} />
        <div className="row"><label className="checkbox caption grow"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />Ask anonymously</label>
          <button className="btn btn-primary btn-s" disabled={busy || !text.trim()} onClick={ask}>{busy ? "Sending…" : "Ask"}</button></div>
        {sent && <span className="caption cycle-item" style={{ color: "var(--dz-text-success)" }}>Sent — {who} will reply right here.</span>}
      </div>
      {brand?.booking_url && (
        <a className="q-book" href={brand.booking_url} target="_blank" rel="noreferrer"><CalendarDays size={16} /><span className="col grow"><span className="medium">Talk to {who}</span><span className="caption muted">Book a call</span></span><span className="btn btn-primary btn-s">Book</span></a>
      )}
    </aside>
  );
}
