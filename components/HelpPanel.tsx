"use client";
import { startTour } from "@/components/ProductTour";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ExternalLink, Search, FileText, ChevronRight, Plus, Sparkles, Play } from "lucide-react";
import { article, articlesFor, searchDocs } from "@/lib/docs";

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const [q, setQ] = useState("");
  useEffect(() => { if (!open) setQ(""); }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  const list = useMemo(() => (q.trim() ? searchDocs(q).slice(0, 5) : articlesFor(path).map((s) => article(s)!).filter(Boolean)), [q, path]);
  const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const mod = mac ? "⌘" : "Ctrl ";

  return (
    <>
      <div className={`help-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`help-panel ${open ? "open" : ""}`} aria-hidden={!open} aria-label="Help">
        <div className="row" style={{ padding: "20px 20px 12px" }}>
          <span className="h2 grow">Help</span>
          <Link href="/docs" target="_blank" className="icon-btn s" aria-label="Open docs in a new tab"><ExternalLink size={16} /></Link>
          <button className="icon-btn s" aria-label="Close help" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: "0 20px" }}>
          <label className="search" style={{ width: "100%", height: 40 }}><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help or ask a question" /></label>
        </div>
        <div className="help-body">
          <div className="help-label">{q.trim() ? "Results" : "For this page"}</div>
          {list.map((a, i) => (
            <Link key={a.slug} href={`/docs/${a.slug}`} target="_blank" className="help-row" style={{ animationDelay: `${i * 50}ms` }}>
              <FileText size={16} /><span className="grow">{a.title}</span><ChevronRight size={16} className="faint" />
            </Link>
          ))}
          {q.trim() && list.length === 0 && <p className="caption faint" style={{ padding: "4px 2px" }}>No guides match — try the chat below.</p>}
          <Link href="/docs/contact" target="_blank" className="help-chat">
            <span className="avatar-stack">
              {[["Ab", "#ff5a5a"], ["Pa", "#3b8bff"], ["Cy", "#ff4f8b"]].map(([t, c]) => <span key={t} className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: c }}>{t}</span>)}
              <span className="avatar" style={{ width: 28, height: 28, background: "#fff", border: "1px solid var(--dz-border-default)", color: "#111827", alignSelf: "center" }}><Plus size={14} /></span>
            </span>
            <span className="col"><span className="medium">Chat with us</span><span className="caption muted">Typically replies in 2 hours</span></span>
          </Link>
          <button className="help-tour" onClick={() => { onClose(); startTour(); }}><Play size={16} /><span className="grow">Take the product tour</span><span className="caption muted">2 min</span></button>
          <div className="help-label">Keyboard shortcuts</div>
          {[["Search", `${mod}K`], ["Create link", `${mod}L`], ["Ask Dozzier", `${mod}J`], ["Toggle sidebar", `${mod}\\`]].map(([l, k]) => (
            <div key={l} className="row help-key"><span className="grow">{l}</span><span className="kbd">{k}</span></div>
          ))}
        </div>
        <Link href="/docs/changelog" target="_blank" className="help-foot"><Sparkles size={16} className="brand" /><span className="grow medium">New: Ask Dozzier is here</span><span className="link caption">See what’s new</span></Link>
      </aside>
    </>
  );
}
