"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, CircleHelp, ChevronLeft, ChevronRight, ChevronDown, LogOut, FileText, Users, Zap, Moon, User as UserIcon, Check, Sparkles } from "lucide-react";
import { applyTheme, type Theme } from "@/components/Theme";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";
import { Avatar, ToastHost, toast, DocThumb } from "@/components/ui";
import { NAV_GROUPS, NAV_ALL, APPS } from "@/components/nav";
import { Ctx, Profile } from "@/components/AppContext";
import { useChecklist } from "@/components/GettingStarted";
import { HelpPanel } from "@/components/HelpPanel";
import { NotificationsMenu } from "@/components/NotificationsMenu";
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

function UserMenu({ profile, email, onHelp }: { profile: Profile; email: string; onHelp: () => void }) {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => { try { setThemeState((localStorage.getItem("dz-theme") as Theme) || "light"); } catch {} }, []);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h); window.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); window.removeEventListener("keydown", k); };
  }, [open]);
  const go = (href: string) => { setOpen(false); router.push(href); };
  const pick = (t: Theme) => {
    setThemeState(t); applyTheme(t);
    supabase.from("profiles").select("settings").eq("id", profile.id).maybeSingle().then(({ data }) => {
      const st = (data?.settings || {}) as Record<string, Record<string, unknown>>;
      supabase.from("profiles").update({ settings: { ...st, prefs: { ...(st.prefs || {}), theme: t } } }).eq("id", profile.id);
    });
  };
  const ws = profile.workspace_name || "My workspace";
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="rail-avatar" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={profile.full_name} email={email} size={32} color="#ff7a3d" />
      </button>
      {open && (
        <div className="menu rail-menu acct-menu">
          <div className="row gap-10" style={{ padding: "10px 10px 12px" }}>
            <Avatar name={profile.full_name} email={email} size={36} color="#ff7a3d" />
            <div className="col" style={{ minWidth: 0 }}><span className="medium ellipsis">{profile.full_name || displayName(email)}</span><span className="caption muted ellipsis">{email}</span></div>
          </div>
          <div className="acct-sep" />
          <button onClick={() => go("/app/settings/profile")}><UserIcon size={16} />View profile</button>
          <button onClick={() => go("/app/settings/preferences")}><Moon size={16} /><span className="grow">Preferences</span><span className="caption faint">⌘,</span></button>
          <button onClick={() => go("/app/settings/notifications")}><Bell size={16} />Notification settings</button>
          <div className="acct-sep" />
          <div style={{ padding: "6px 10px 8px" }}>
            <div className="caption muted" style={{ marginBottom: 6 }}>Theme</div>
            <div className="segmented acct-theme">{(["light", "dark", "system"] as Theme[]).map((t) => <button key={t} className={theme === t ? "active" : ""} onClick={() => pick(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
          </div>
          <div className="acct-sep" />
          <div className="acct-label">Workspaces</div>
          <button className="acct-ws on" onClick={() => go("/app/settings/general")}><span className="acct-ws-badge">{ws.slice(0, 1).toUpperCase()}</span><span className="grow">{ws}</span><span className="caption faint">{PLAN_LABEL[profile.plan] || profile.plan}</span><Check size={14} className="brand" /></button>
          <button onClick={() => go("/app/upgrade")}><Zap size={16} />Upgrade plan</button>
          <div className="acct-sep" />
          <button onClick={() => { setOpen(false); onHelp(); }}><CircleHelp size={16} />Help &amp; docs</button>
          <a href="/docs/changelog" target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><Sparkles size={16} />What’s new</a>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}><LogOut size={16} />Sign out</button>
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
  const [help, setHelp] = useState(false);
  const checklist = useChecklist(state?.userId || null, state?.profile || null);
  const sideRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = sideRef.current?.querySelector<HTMLElement>(".nav-item.active");
    setInd(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [path, state, collapsed]);

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    try {
      if (localStorage.getItem("dz-session-only") && !sessionStorage.getItem("dz-alive")) { await supabase.auth.signOut(); router.replace("/login"); return; }
    } catch {}
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (data && !(data as Profile).onboarded_at) { router.replace("/onboarding"); return; }
    const prefs = ((data as Profile)?.settings || {}).prefs || {};
    try { if (prefs.theme && !localStorage.getItem("dz-theme")) applyTheme(prefs.theme); } catch {}
    document.documentElement.classList.toggle("compact", !!prefs.compact);
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

  // Global shortcuts: ⌘L create link, ⌘J Ask Dozzier, ⌘\ toggle sidebar, ? help
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || "") || (e.target as HTMLElement)?.isContentEditable;
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === "l") { e.preventDefault(); router.push("/app/content?new=link"); }
        else if (key === "j") { e.preventDefault(); router.push("/app/ask"); }
        else if (key === ",") { e.preventDefault(); router.push("/app/settings/preferences"); }
        else if (key === "\\") { e.preventDefault(); setCollapsed((c) => { try { localStorage.setItem("dz-sidebar", c ? "0" : "1"); } catch {} return !c; }); }
      } else if (e.key === "?" && !typing) { setHelp((h) => !h); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [router]);

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
          <button className={`rail-btn ${help ? "on" : ""}`} data-label="Help" aria-label="Help" onClick={() => setHelp((h) => !h)}><CircleHelp size={18} /></button>
          <UserMenu profile={state.profile} email={state.email} onHelp={() => setHelp(true)} />
        </nav>
        <div className="shell">
          <aside ref={sideRef} className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <span className="nav-indicator" style={{ transform: `translateY(${ind?.y ?? 0}px)`, height: ind?.h ?? 40, opacity: ind ? 1 : 0 }} />
            <Link href="/app/settings/general" className="ws"><span className="h3 ellipsis">{ws}</span><ChevronDown size={16} /></Link>
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
            <Link href="/app/settings/members" className="invite-btn"><Users size={16} />Invite member</Link>
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
              <NotificationsMenu />
              <button className="support-link hide-sm" onClick={() => setHelp(true)}><FileText size={16} />Support</button>
            </header>
            <main className="main">{children}</main>
          </div>
        </div>
        <HelpPanel open={help} onClose={() => setHelp(false)} />
        <ToastHost />
      </div>
    </Ctx.Provider>
  );
}
