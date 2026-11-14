"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, FileText, Code2, Sparkles } from "lucide-react";
import { ARTICLES, ENDPOINTS, category, searchDocs } from "@/lib/docs";

/** Opens the search dialog from anywhere: window.dispatchEvent(new CustomEvent("dz-docs-search", { detail: "query" })) */
export const openDocsSearch = (q = "") => window.dispatchEvent(new CustomEvent("dz-docs-search", { detail: q }));

export function DocsSearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    const o = (e: Event) => { setQ((e as CustomEvent<string>).detail || ""); setOpen(true); };
    window.addEventListener("keydown", k);
    window.addEventListener("dz-docs-search", o);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("dz-docs-search", o); };
  }, []);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 10); setSel(0); }, [open]);

  const guides = useMemo(() => (q.trim() ? searchDocs(q).slice(0, 5) : ARTICLES.slice(4, 9)), [q]);
  const api = useMemo(() => {
    const t = q.toLowerCase();
    if (!t.trim()) return [];
    return ENDPOINTS.filter((e) => t.split(/\W+/).some((w) => w.length > 3 && (e.title + " " + e.desc + " " + e.params.map((p) => p.name).join(" ")).toLowerCase().includes(w.replace(/(ing|s)$/, "")))).slice(0, 2);
  }, [q]);
  const top = q.trim() ? guides[0] : null;
  const firstP = top?.body.find((b) => "p" in b && b.p.length > 60) as { p: string } | undefined;
  const answer = firstP?.p || top?.summary || "";
  const items = [...guides.map((g) => `/docs/${g.slug}`), ...api.map((e) => `/docs/api#${e.id}`)];
  const go = (href: string) => { setOpen(false); router.push(href); };

  if (!open) return null;
  return (
    <div className="ds-scrim" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="ds-dialog" role="dialog" aria-label="Search docs">
        <div className="ds-input"><Search size={18} />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Ask a question or search, e.g. “how do I require an NDA?”"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter" && items[sel]) go(items[sel]);
            }} />
          <span className="kbd">esc</span>
        </div>
        {top && (
          <div className="ds-answer">
            <span className="row gap-6 caption medium brand"><Sparkles size={14} />Quick answer</span>
            <p>{answer}</p>
            <div className="row gap-6 wrap">{guides.slice(0, 3).map((g) => <Link key={g.slug} href={`/docs/${g.slug}`} className="ds-chip" onClick={() => setOpen(false)}>{g.title.length > 28 ? category(g.cat)?.title : g.title}</Link>)}</div>
          </div>
        )}
        <div className="ds-list">
          {guides.length > 0 && <div className="ds-label">{q.trim() ? "Guides" : "Suggested"}</div>}
          {guides.map((g, i) => (
            <button key={g.slug} className={`ds-row ${sel === i ? "on" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => go(`/docs/${g.slug}`)}>
              <FileText size={16} /><span className="grow ellipsis">{g.title}</span><span className="caption faint">{category(g.cat)?.title}</span>
            </button>
          ))}
          {api.length > 0 && <div className="ds-label">API</div>}
          {api.map((e, j) => (
            <button key={e.id} className={`ds-row ${sel === guides.length + j ? "on" : ""}`} onMouseEnter={() => setSel(guides.length + j)} onClick={() => go(`/docs/api#${e.id}`)}>
              <Code2 size={16} /><span className="grow ellipsis">{e.method === "DEL" ? "DELETE" : e.method} {e.path} — {e.title}</span><span className="caption faint">API reference</span>
            </button>
          ))}
          {q.trim() && guides.length === 0 && api.length === 0 && <div className="caption faint" style={{ padding: 16 }}>No results for “{q}”. <Link className="link" href="/docs/contact" onClick={() => setOpen(false)}>Ask support</Link></div>}
        </div>
      </div>
    </div>
  );
}
