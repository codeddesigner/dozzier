"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, FileText, Link2, House, CircleUserRound, Sparkles, Plus, FileInput, FileSignature, Settings, Moon, Upload, KanbanSquare, Inbox, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { displayName, intentLevel, intentScore } from "@/lib/format";
import { applyTheme } from "@/components/Theme";

type Item = { id: string; group: string; icon: typeof Search; title: string; meta?: string; href?: string; run?: () => void; kbd?: string };
const RECENT_KEY = "dz-palette-recent";

export function openPalette() { window.dispatchEvent(new Event("dz-palette")); }

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    const o = () => setOpen(true);
    window.addEventListener("keydown", k); window.addEventListener("dz-palette", o);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("dz-palette", o); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setI(0); setTimeout(() => input.current?.focus(), 10); } }, [open]);

  const actions = useMemo<Item[]>(() => {
    const t = q.trim();
    return [
      { id: "a-link", group: "Actions", icon: Link2, title: t ? `Create link for ${t}` : "Create link", href: `/app/content?new=link${t ? `&name=${encodeURIComponent(t)}` : ""}`, kbd: "⌘L" },
      { id: "a-upload", group: "Actions", icon: Upload, title: "Upload content", href: "/app/content?upload=1" },
      { id: "a-space", group: "Actions", icon: House, title: "Create a Space", href: "/app/spaces?new=1" },
      { id: "a-fr", group: "Actions", icon: FileInput, title: "New file request", href: "/app/file-requests?new=1" },
      { id: "a-sign", group: "Actions", icon: FileSignature, title: "Send an agreement for signature", href: "/app/agreements" },
      { id: "a-pipe", group: "Go to", icon: KanbanSquare, title: "Deal pipeline", href: "/app/accounts" },
      { id: "a-inbox", group: "Go to", icon: Inbox, title: "Activity", href: "/app/inbox" },
      { id: "a-set", group: "Go to", icon: Settings, title: "Settings", href: "/app/settings/profile", kbd: "⌘," },
      { id: "a-dark", group: "Actions", icon: Moon, title: "Toggle dark mode", run: () => { const d = document.documentElement.getAttribute("data-theme") === "dark"; applyTheme(d ? "light" : "dark"); } },
    ].filter((a) => !t || a.title.toLowerCase().includes(t.toLowerCase()) || a.id === "a-link" || a.id === "a-ask");
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const t = q.trim();
    if (t.length < 2) {
      let recent: Item[] = [];
      try { recent = (JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as Item[]).map((r) => ({ ...r, group: "Recent", icon: ArrowRight })); } catch {}
      setItems([...recent.slice(0, 5), ...actions]); setI(0); return;
    }
    const like = `%${t}%`;
    let stale = false;
    const h = setTimeout(async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [a, d, l, s, c] = await Promise.all([
        supabase.from("accounts").select("id,name,domain").ilike("name", like).limit(4),
        supabase.rpc("search_documents", { p_q: t, p_limit: 5 }),
        supabase.from("links").select("id,name,document_id,space_id").ilike("name", like).limit(4),
        supabase.from("spaces").select("id,name").ilike("name", like).limit(3),
        supabase.from("contacts").select("id,name,email").or(`name.ilike.${like},email.ilike.${like}`).limit(4),
      ]);
      const accIds = (a.data || []).map((x) => x.id); const linkIds = (l.data || []).map((x) => x.id); const spaceIds = (s.data || []).map((x) => x.id);
      const [av, lv, si] = await Promise.all([
        accIds.length ? supabase.from("visits").select("account_id,duration_seconds,started_at,downloaded").in("account_id", accIds) : Promise.resolve({ data: [] }),
        linkIds.length ? supabase.from("visits").select("link_id").in("link_id", linkIds) : Promise.resolve({ data: [] }),
        spaceIds.length ? supabase.from("space_items").select("space_id").eq("kind", "folder").in("space_id", spaceIds) : Promise.resolve({ data: [] }),
      ]);
      if (stale) return;
      const avs = (av.data || []) as { account_id: string; duration_seconds: number; started_at: string; downloaded: boolean }[];
      const out: Item[] = [
        ...(a.data || []).map((x) => { const vs = avs.filter((v) => v.account_id === x.id); const sc = intentScore({ seconds: vs.reduce((n, v) => n + v.duration_seconds, 0), visits: vs.length, downloads: vs.filter((v) => v.downloaded).length }); const wk = vs.filter((v) => v.started_at > since).length;
          return { id: `acc-${x.id}`, group: "Accounts", icon: Users, title: x.name, meta: `Account · ${intentLevel(sc).label}${wk ? ` · ${wk} visit${wk === 1 ? "" : "s"} this week` : ""}`, href: `/app/accounts/${x.id}` }; }),
        ...(c.data || []).map((x) => ({ id: `con-${x.id}`, group: "Contacts", icon: CircleUserRound, title: displayName(x.email, x.name), meta: x.email, href: `/app/contacts/${x.id}` })),
        ...(l.data || []).map((x) => ({ id: `lnk-${x.id}`, group: "Content", icon: FileText, title: x.name, meta: `Link · ${(lv.data || []).filter((v: { link_id: string }) => v.link_id === x.id).length} visits`, href: x.space_id ? `/app/spaces/${x.space_id}` : `/app/links/${x.id}` })),
        ...((d.data || []) as { id: string; name: string; file_type: string; snippet: string | null }[]).map((x) => ({ id: `doc-${x.id}`, group: "Content", icon: FileText, title: x.name, meta: x.snippet ? `“…${x.snippet.replace(/[«»]/g, "").slice(0, 70)}…”` : `Document · ${x.file_type.toUpperCase()}`, href: `/app/content/${x.id}` })),
        ...(s.data || []).map((x) => ({ id: `sp-${x.id}`, group: "Content", icon: House, title: x.name, meta: `Space · ${(si.data || []).filter((v: { space_id: string }) => v.space_id === x.id).length} folders`, href: `/app/spaces/${x.id}` })),
        ...actions,
      ];
      setItems(out); setI(0);
    }, 140);
    return () => { stale = true; clearTimeout(h); };
  }, [q, open, actions]);

  useEffect(() => { list.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest" }); }, [i]);

  function run(it: Item, newTab = false) {
    if (it.href) {
      try { if (!it.id.startsWith("a-")) { const r = [{ id: it.id, title: it.title, meta: it.meta, href: it.href }, ...(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as Item[]).filter((x) => x.id !== it.id)].slice(0, 6); localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } } catch {}
      if (newTab) window.open(it.href, "_blank"); else router.push(it.href);
    } else it.run?.();
    setOpen(false);
  }

  if (!open) return null;
  const groups = [...new Set(items.map((x) => x.group))];
  let n = -1;
  return (
    <div className="cp-back" onMouseDown={() => setOpen(false)}>
      <div className="cp" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <label className="cp-input"><Search size={18} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts, content, people — or type a command"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
              else if (e.key === "Enter" && items[i]) { e.preventDefault(); run(items[i], e.metaKey || e.ctrlKey); }
            }} />
          <span className="kbd">esc</span>
        </label>
        <div className="cp-list" ref={list}>
          {items.length === 0 && <div className="caption faint" style={{ padding: 16 }}>No matches</div>}
          {groups.map((g) => (
            <div key={g}>
              <div className="cp-group">{g}</div>
              {items.filter((x) => x.group === g).map((it) => { n++; const k = n; const I = it.icon; return (
                <button key={it.id} data-i={k} className={`cp-item ${k === i ? "on" : ""}`} onMouseEnter={() => setI(k)} onClick={(e) => run(it, e.metaKey || e.ctrlKey)}>
                  <I size={16} /><span className="grow ellipsis">{it.title}</span>{it.meta && <span className="caption muted ellipsis cp-meta">{it.meta}</span>}{it.kbd && <span className="kbd">{it.kbd}</span>}
                </button>
              ); })}
            </div>
          ))}
        </div>
        <div className="cp-foot caption muted"><span>↑↓ Navigate</span><span>↵ Open</span><span>⌘↵ Open in new tab</span></div>
      </div>
    </div>
  );
}
