"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, CircleHelp, ChevronLeft, ChevronRight, ChevronDown, LogOut, Settings, FileText, Users, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";
import { Avatar, ToastHost, toast, DocThumb } from "@/components/ui";
import { NAV_GROUPS, NAV_ALL, APPS } from "@/components/nav";
import { Ctx, Profile } from "@/components/AppContext";
import { useChecklist } from "@/components/GettingStarted";
import { displayName, timeAgo } from "@/lib/format";

const PLAN_LABEL: Record<string, string> = { trial: "Free trial", personal: "Personal", standard: "Standard", datarooms: "Advanced Data Rooms" };

type Hit = { kind: "doc" | "contact" | "account" | "space"; id: string; title: string; sub?: string; type?: string };

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const like = `%${q.trim()}%`;
      const [d, c, a, s] = await Promise.all([
        supabase.from("documents").select("id,name,file_type").is("deleted_at", null).ilike("name", like).limit(5),
        supabase.from("contacts").select("id,name,email").or(`name.ilike.${like},email.ilike.${like}`).limit(5),
        supabase.from("accounts").select("id,name,domain").ilike("name", like).limit(5),
        supabase.from("spaces").select("id,name").ilike("name", like).limit(5),
      ]);
      setHits([
        ...(d.data || []).map((x) => ({ kind: "doc" as const, id: x.id, title: x.name, type: x.file_type })),
        ...(s.data || []).map((x) => ({ kind: "space" as const, id: x.id, title: x.name, sub: "Space" })),
        ...(c.data || []).map((x) => ({ kind: "contact" as const, id: x.id, title: displayName(x.email, x.name), sub: x.email })),
        ...(a.data || []).map((x) => ({ kind: "account" as const, id: x.id, title: x.name, sub: x.domain || "Account" })),
      ]);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);
  const go = (h: Hit) => {
    setOpen(false); setQ("");
    router.push(h.kind === "doc" ? `/app/content/${h.id}` : h.kind === "contact" ? `/app/contacts/${h.id}` : h.kind === "account" ? `/app/accounts/${h.id}` : `/app/spaces/${h.id}`);
  };
  return (
    <div style={{ position: "relative" }}>
      <label className="hdr-search">
        <Search size={14} />
        <input id="dz-search" ref={ref} value={q} placeholder="Search" onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) go(hits[0]); }} />
        <span className="kbd">⌘K</span>
      </label>
      {open && q.trim().length >= 2 && (
        <div className="menu" style={{ right: 0, width: 360 }}>
          {hits.length === 0 && <div className="caption faint" style={{ padding: 10 }}>No results for “{q}”</div>}
          {hits.map((h) => (
            <button key={h.kind + h.id} onMouseDown={() => go(h)}>
              {h.kind === "doc" ? <DocThumb kind={h.type || "file"} /> : <Avatar name={h.title} size={24} />}
              <span className="grow ellipsis">{h.title}</span><span className="micro faint">{h.sub || "Content"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Note = { id: string; visitor_email: string | null; last_seen_at: string; document_id: string | null; documents: { name: string } | null };

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("visits").select("id,visitor_email,last_seen_at,document_id,documents(name)").order("last_seen_at", { ascending: false }).limit(8);
    setItems((data as unknown as Note[]) || []);
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);
  return (
    <div style={{ position: "relative" }}>
      <button className="icon-btn hdr-icon" aria-label="Notifications" onClick={() => setOpen((o) => !o)}><Bell size={18} /></button>
      {open && (
        <div className="menu" style={{ width: 340 }} onMouseLeave={() => setOpen(false)}>
          <div className="semibold" style={{ padding: "8px 10px" }}>Recent activity</div>
          {items.length === 0 && <div className="caption faint" style={{ padding: 10 }}>No visits yet. Share a link to get started.</div>}
          {items.map((v) => {
            const live = Date.now() - new Date(v.last_seen_at).getTime() < 120000;
            return (
              <Link key={v.id} href={v.document_id ? `/app/content/${v.document_id}` : "/app"} onClick={() => setOpen(false)}>
                <Avatar email={v.visitor_email} name={displayName(v.visitor_email)} size={28} />
                <span className="col grow" style={{ minWidth: 0 }}>
                  <span className="medium ellipsis">{displayName(v.visitor_email)} {live ? "is viewing" : "viewed"} {v.documents?.name || "a document"}</span>
                  <span className="micro faint">{timeAgo(v.last_seen_at)}</span>
                </span>
                {live && <span className="badge badge-success"><span className="dot" />Live</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserMenu({ profile, email }: { profile: Profile; email: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <div style={{ position: "relative" }}>
      <button className="rail-avatar" aria-label="Account" onClick={() => setOpen((o) => !o)}>
        <Avatar name={profile.full_name} email={email} size={32} color="#ff7a3d" />
      </button>
      {open && (
        <div className="menu rail-menu" onMouseLeave={() => setOpen(false)}>
          <div style={{ padding: "8px 10px" }}><div className="medium">{profile.full_name || displayName(email)}</div><div className="micro faint">{email}</div><div className="micro faint">{PLAN_LABEL[profile.plan] || profile.plan}</div></div>
          <Link href="/app/settings" onClick={() => setOpen(false)}><Settings size={16} />Settings</Link>
          <Link href="/app/upgrade" onClick={() => setOpen(false)}><Zap size={16} />Upgrade plan</Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}><LogOut size={16} />Log out</button>
        </div>
      )}
    </div>
  );
}

function SetupRing({ done, total }: { done: number; total: number }) {
  const r = 5.5, c = 2 * Math.PI * r;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r={r} fill="none" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx="7" cy="7" r={r} fill="none" stroke="#1e9e5a" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${(c * done) / total} ${c}`} transform="rotate(-90 7 7)" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<{ userId: string; email: string; profile: Profile } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const checklist = useChecklist(state?.userId || null, state?.profile || null);

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    try {
      if (localStorage.getItem("dz-session-only") && !sessionStorage.getItem("dz-alive")) { await supabase.auth.signOut(); router.replace("/login"); return; }
    } catch {}
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (data && !(data as Profile).onboarded_at) { router.replace("/onboarding"); return; }
    setState({ userId: session.user.id, email: session.user.email || "", profile: (data as Profile) || { id: session.user.id, full_name: null, workspace_name: null, plan: "trial", created_at: "" } });
  }, [router]);

  useEffect(() => {
    loadProfile();
    try { setCollapsed(localStorage.getItem("dz-sidebar") === "1"); } catch {}
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") router.replace("/login"); });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile, router]);

  // Live "viewing now" alerts
  useEffect(() => {
    if (!state) return;
    const ch = supabase.channel("visits-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visits", filter: `owner_id=eq.${state.userId}` }, (p) => {
        const v = p.new as { visitor_email: string | null };
        toast(`${displayName(v.visitor_email)} just opened your document`);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [state]);

  if (!state) return <div className="loading" style={{ paddingTop: 200 }}><span className="spinner" /></div>;
  const isActive = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  const ws = state.profile.workspace_name || "My workspace";
  const current = [...NAV_ALL, { href: "/app/upgrade", label: "Upgrade" }, { href: "/app/help", label: "Help" }, { href: "/app/links", label: "Links" }]
    .filter((n) => isActive(n.href)).sort((x, y) => y.href.length - x.href.length)[0];
  const deeper = current && path.replace(/\/$/, "") !== current.href;
  const toggle = () => { const c = !collapsed; setCollapsed(c); try { localStorage.setItem("dz-sidebar", c ? "1" : "0"); } catch {} };

  return (
    <Ctx.Provider value={{ ...state, refreshProfile: loadProfile }}>
      <div className="app">
        <nav className="rail" aria-label="Apps">
          <Link href="/app" aria-label="Dozzier home"><LogoMark size={28} /></Link>
          <button className="rail-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggle}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <span className="rail-sep" />
          {APPS.map((a) => (
            <Link key={a.label} href={a.href} data-label={a.label} aria-label={a.label} className={`rail-app ${a.match(path) ? "active" : ""}`}><a.icon size={20} /></Link>
          ))}
          <span className="spacer" />
          <button className="rail-btn" data-label="Search" aria-label="Search" onClick={() => document.getElementById("dz-search")?.focus()}><Search size={18} /></button>
          <Link href="/app/help" className="rail-btn" data-label="Help" aria-label="Help"><CircleHelp size={18} /></Link>
          <UserMenu profile={state.profile} email={state.email} />
        </nav>
        <div className="shell">
          <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <Link href="/app/settings" className="ws"><span className="h3 ellipsis">{ws}</span><ChevronDown size={16} /></Link>
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="nav-group">
                <div className="nav-label">{g.label}</div>
                {g.items.map((n) => (
                  <Link key={n.href} href={n.href} className={`nav-item ${isActive(n.href) ? "active" : ""}`}><n.icon size={20} /><span>{n.label}</span></Link>
                ))}
              </div>
            ))}
            <div className="spacer" />
            {checklist && (() => { const d = checklist.filter((i) => i.done).length; return (
              <button className="setup-btn" onClick={async () => { if (state.profile.checklist_dismissed) { await supabase.from("profiles").update({ checklist_dismissed: false }).eq("id", state.userId); await loadProfile(); } router.push("/app"); }}>
                <SetupRing done={d} total={checklist.length} /><span className="grow" style={{ textAlign: "left" }}>Setup guide</span><span className="faint">{d}/{checklist.length}</span>
              </button>); })()}
            <Link href="/app/settings" className="invite-btn"><Users size={16} />Invite member</Link>
          </aside>
          <div className="shell-main">
            <header className="page-header">
              <div className="crumbs">
                <span className="muted">{ws}</span>
                {current && <><span className="sep">/</span>{deeper ? <Link href={current.href} className="muted">{current.label}</Link> : <span className="cur">{current.label}</span>}</>}
                {deeper && <><span className="sep">/</span><span className="cur">Details</span></>}
              </div>
              <span className="spacer" />
              <GlobalSearch />
              <Notifications />
              <Link href="/app/help" className="support-link hide-sm"><FileText size={16} />Support</Link>
            </header>
            <main className="main">{children}</main>
          </div>
        </div>
        <ToastHost />
      </div>
    </Ctx.Provider>
  );
}
