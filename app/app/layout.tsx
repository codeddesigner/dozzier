"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox as InboxIcon, Folder as FolderIcon, Building2, Settings as SettingsIcon, Search, Bell, CircleHelp, ChevronLeft, ChevronRight, ChevronDown, LogOut, FileText, Users, Zap, Moon, User as UserIcon, Check, Sparkles } from "lucide-react";
import { applyTheme, type Theme } from "@/components/Theme";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";
import { Avatar, ToastHost, toast } from "@/components/ui";
import { NAV_GROUPS, NAV_ALL, APPS } from "@/components/nav";
import { Ctx, Profile } from "@/components/AppContext";
import { useChecklist } from "@/components/GettingStarted";
import { HelpPanel } from "@/components/HelpPanel";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { CommandPalette, openPalette } from "@/components/CommandPalette";
import { displayName, timeAgo } from "@/lib/format";

const PLAN_LABEL: Record<string, string> = { trial: "Free trial", personal: "Personal", standard: "Standard", datarooms: "Advanced Data Rooms" };

function SearchButton() {
  return (
    <button className="hdr-search" onClick={openPalette} aria-label="Search (⌘K)">
      <Search size={14} /><span className="grow faint" style={{ textAlign: "left" }}>Search</span><span className="kbd">⌘K</span>
    </button>
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
  const current = [...NAV_ALL, { href: "/app/upgrade", label: "Upgrade" }, { href: "/app/help", label: "Help" }, { href: "/app/links", label: "Links" }, { href: "/app/inbox", label: "Inbox" }]
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
          <button className="rail-btn" data-label="Search" aria-label="Search" onClick={openPalette}><Search size={18} /></button>
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
              <SearchButton />
              <NotificationsMenu />
              <button className="support-link hide-sm" onClick={() => setHelp(true)}><FileText size={16} />Support</button>
            </header>
            <main className="main">{children}</main>
            <nav className="mob-tabs" aria-label="Main">
              {[{ href: "/app/inbox", label: "Inbox", I: InboxIcon }, { href: "/app/content", label: "Content", I: FolderIcon }, { href: "/app/accounts", label: "Accounts", I: Building2 }, { href: "/app/settings", label: "Settings", I: SettingsIcon }].map((t) => (
                <Link key={t.href} href={t.href} className={path.startsWith(t.href) || (t.href === "/app/inbox" && path === "/app") ? "on" : ""}><t.I size={20} /><span>{t.label}</span></Link>
              ))}
            </nav>
          </div>
        </div>
        <HelpPanel open={help} onClose={() => setHelp(false)} />
        <CommandPalette />
        <ToastHost />
      </div>
    </Ctx.Provider>
  );
}
