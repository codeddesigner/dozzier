"use client";
import { setLinkDomain } from "@/lib/linkBase";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Inbox as InboxIcon, Folder as FolderIcon, Building2, Settings as SettingsIcon, Search, Bell, CircleHelp, ChevronUp, ChevronDown, ChevronRight, LogOut, Zap, Moon, User as UserIcon, Check, Sparkles, Plus, Flag, Star, X, PanelLeft, Play } from "lucide-react";
import { applyTheme, type Theme } from "@/components/Theme";
import { supabase } from "@/lib/supabase";
import { Avatar, ToastHost, toast } from "@/components/ui";
import { NAV_GROUPS, NAV_ALL, NAV_SIDE } from "@/components/nav";
import { Ctx, Profile } from "@/components/AppContext";
import { useChecklist } from "@/components/GettingStarted";
import { HelpPanel } from "@/components/HelpPanel";
import { CommandPalette, openPalette } from "@/components/CommandPalette";
import { ProductTour, startTour } from "@/components/ProductTour";
import { displayName } from "@/lib/format";

const PLAN_LABEL: Record<string, string> = { trial: "Free trial", personal: "Personal", standard: "Standard", datarooms: "Advanced Data Rooms" };

function WorkspaceSwitcher({ profile, email, onHelp, onCollapse, collapsed }: { profile: Profile; email: string; onHelp: () => void; onCollapse: () => void; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
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
  const words = ws.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : ws.trim().slice(0, 2)).toUpperCase() || "W";
  const first = (profile.full_name || displayName(email)).split(" ")[0];
  return (
    <div className="ws-switch-wrap" ref={ref}>
      <button className="ws-switch" aria-label="Workspace and account menu" aria-expanded={open} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ top: r.bottom + 6, left: r.left }); setOpen((o) => !o); }} data-label={ws}>
        <span className="ws-switch-logo">{initials}</span>
        <span className="ws-switch-text"><span className="ws-switch-name">{ws}</span><span className="ws-switch-sub">{first} · Owner</span></span>
        <span className="ws-switch-chev"><ChevronUp size={14} /><ChevronDown size={14} /></span>
      </button>
      {open && (
        <div className="menu acct-menu ws-menu" style={pos ? { position: "fixed", top: pos.top, left: pos.left } : undefined}>
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
          <div className="acct-sep" />
          <button onClick={() => { setOpen(false); onCollapse(); }}><PanelLeft size={16} /><span className="grow">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span><span className="caption faint">⌘\\</span></button>
          <button onClick={() => { setOpen(false); onHelp(); }}><CircleHelp size={16} />Help &amp; docs</button>
          <button onClick={() => { setOpen(false); startTour(); }}><Play size={16} />Take the product tour</button>
          <a href="/docs/changelog" target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><Sparkles size={16} />What’s new</a>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}><LogOut size={16} />Sign out</button>
        </div>
      )}
    </div>
  );
}

type SideSpace = { id: string; name: string; visitors: number; fresh: number };
const SPACE_DOTS = ["#ff7a3d", "#14c7b0", "#a66bff", "#2577ea", "#ffb020"];

/** Recent Spaces with visitor counts, and new visits in the last day (Activity badge). */
function useSidebarData(userId: string | null) {
  const [spaces, setSpaces] = useState<SideSpace[]>([]);
  const [activity, setActivity] = useState(0);
  const path = usePathname();
  useEffect(() => {
    if (!userId) return;
    let off = false;
    (async () => {
      const day = new Date(Date.now() - 86400000).toISOString();
      const [sp, act] = await Promise.all([
        supabase.from("spaces").select("id,name,updated_at").neq("status", "archived").order("updated_at", { ascending: false }).limit(2),
        supabase.from("visits").select("id", { count: "exact", head: true }).eq("is_sample", false).gte("started_at", day),
      ]);
      const list = (sp.data || []) as { id: string; name: string }[];
      let rows: { visitor_email: string | null; started_at: string; links: { space_id: string } | null }[] = [];
      if (list.length) {
        const r = await supabase.from("visits").select("visitor_email,started_at,links!inner(space_id)").in("links.space_id", list.map((x) => x.id)).is("parent_visit_id", null).limit(1000);
        rows = (r.data || []) as unknown as typeof rows;
      }
      if (off) return;
      setSpaces(list.map((x) => {
        const mine = rows.filter((v) => v.links?.space_id === x.id);
        const who = new Set(mine.map((v) => v.visitor_email || "anon"));
        const fresh = new Set(mine.filter((v) => v.started_at >= day).map((v) => v.visitor_email || "anon"));
        return { id: x.id, name: x.name, visitors: who.size, fresh: fresh.size };
      }));
      setActivity(act.count || 0);
    })();
    return () => { off = true; };
  }, [userId, path]);
  return { spaces, activity };
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
  const [state, setState] = useState<{ userId: string; wsId: string; role: string; email: string; profile: Profile } | null>(null);
  const [invites, setInvites] = useState<{ id: string; role: string; workspace: string; inviter: string | null }[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [help, setHelp] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  const checklist = useChecklist(state?.userId || null, state?.profile || null);
  const side = useSidebarData(state?.userId || null);
  const [bannerOff, setBannerOff] = useState(true);
  useEffect(() => { try { setBannerOff(localStorage.getItem("dz-banner-crm") === "1"); } catch { setBannerOff(false); } }, []);
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
    let profile: Profile = (data as Profile) || { id: session.user.id, full_name: null, workspace_name: null, plan: "trial", created_at: "" };
    const [{ data: wsId }, { data: role }, { data: inv }] = await Promise.all([supabase.rpc("ws"), supabase.rpc("ws_role"), supabase.rpc("my_invites")]);
    const w = (wsId as string) || session.user.id;
    // Teammates see the workspace owner's name, plan and branding.
    if (w !== session.user.id) {
      const { data: o } = await supabase.from("profiles").select("workspace_name,plan,brand_color,brand_logo_path,hide_branding,custom_domain,crm_connected,created_at,subscription_status,billing_subscription").eq("id", w).maybeSingle();
      if (o) profile = { ...profile, ...o, created_at: profile.created_at };
    }
    setInvites((inv as typeof invites) || []);
    const { data: dom } = await supabase.from("custom_domains").select("domain,is_primary").eq("status", "active").order("is_primary", { ascending: false }).limit(1);
    setLinkDomain(dom?.[0]?.domain || null);
    setState({ userId: session.user.id, wsId: w, role: (role as string) || "Owner", email: session.user.email || "", profile });
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visits", filter: `owner_id=eq.${state.wsId}` }, (p) => {
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
  const toggle = () => { const c = !collapsed; setCollapsed(c); try { localStorage.setItem("dz-sidebar", c ? "1" : "0"); } catch {} };

  return (
    <Ctx.Provider value={{ ...state, refreshProfile: loadProfile }}>
      <div className={`app ${collapsed ? "side-collapsed" : ""}`}>
        <aside ref={sideRef} className="sidebar">
          <button className="side-expand" aria-label="Expand sidebar" data-label="Expand sidebar" onClick={toggle}><ChevronRight size={16} /></button>
          <WorkspaceSwitcher profile={state.profile} email={state.email} onHelp={() => setHelp(true)} onCollapse={toggle} collapsed={collapsed} />
          <div className="side-nav">
            <span className="nav-indicator" style={{ transform: `translateY(${ind?.y ?? 0}px)`, height: ind?.h ?? 40, opacity: ind ? 1 : 0 }} />
            <button className="nav-item" onClick={openPalette} data-label="Search"><Search size={20} /><span className="grow">Search</span><span className="kbd side-kbd">⌘K</span></button>
            <Link href="/app/inbox" className={`nav-item ${isActive("/app/inbox") ? "active" : ""}`} data-label="Activity"><Bell size={20} /><span className="grow">Activity</span>{side.activity > 0 && <span className="nav-count">{side.activity > 99 ? "99+" : side.activity}</span>}</Link>
            {NAV_SIDE.map((n) => (
              <Link key={n.href} href={n.href} className={`nav-item ${isActive(n.href) ? "active" : ""}`} data-label={n.label}><n.icon size={20} /><span>{n.label}</span></Link>
            ))}
          </div>
          <div data-tour="spaces" className="side-spaces">
          {side.spaces.length > 0 && <div className="side-section">Spaces</div>}
          {side.spaces.map((sp, i) => (
            <Link key={sp.id} href={`/app/spaces/${sp.id}`} className={`side-space ${path.startsWith(`/app/spaces/${sp.id}`) ? "on" : ""}`} data-label={sp.name}>
              <span className="side-space-dot"><i style={{ background: SPACE_DOTS[i % SPACE_DOTS.length] }} /></span>
              <span className="side-space-text"><span className="side-space-name">{sp.name}</span><span className="side-space-sub">{sp.visitors} visitor{sp.visitors === 1 ? "" : "s"}{sp.fresh ? ` · ${sp.fresh} new` : ""}</span></span>
              {sp.fresh > 0 && <span className="side-space-badge">{sp.fresh}</span>}
            </Link>
          ))}
          <Link href="/app/settings/members" className="side-invite" data-label="Invite your team"><Plus size={18} /><span>Invite your team</span></Link>
          </div>
          <div className="spacer" />
          <div className="side-bottom">
            {checklist ? (() => { const d = checklist.filter((i) => i.done).length; return (
              <button className="side-link" data-label="Getting started" onClick={async () => { if (state.profile.checklist_dismissed) { await supabase.from("profiles").update({ checklist_dismissed: false }).eq("id", state.userId); await loadProfile(); } router.push("/app"); }}>
                <Flag size={18} /><span className="grow">Getting started</span>{d < checklist.length && <span className="side-progress"><SetupRing done={d} total={checklist.length} />{d}/{checklist.length}</span>}
              </button>); })() : <Link className="side-link" href="/app" data-label="Getting started"><Flag size={18} /><span>Getting started</span></Link>}
            <button className="side-link" data-label="Refer and earn" onClick={() => { const u = `https://dozzier.co/signup?ref=${state.userId.slice(0, 8)}`; navigator.clipboard?.writeText(u).catch(() => {}); toast("Referral link copied — you both get a free month when they upgrade"); }}><Star size={18} /><span>Refer and earn</span></button>
            <button className="side-link" data-label="Help and support" onClick={() => setHelp(true)}><CircleHelp size={18} /><span className="grow">Help and support</span><span className="side-live"><i />Live</span></button>
          </div>
          {state.profile.plan === "trial" && (() => { const left = Math.max(0, 14 - Math.floor((Date.now() - new Date(state.profile.created_at || Date.now()).getTime()) / 86400000)); return (
            <Link href="/app/upgrade" className="side-promo" data-label="Upgrade">
              <span className="side-promo-text"><span className="caption muted">{left > 0 ? `All premium features unlocked for ${left} day${left === 1 ? "" : "s"}` : "Your free trial has ended"}</span><span className="semibold">Upgrade now</span></span>
              <span className="side-promo-icon"><Sparkles size={20} /></span>
            </Link>); })()}
        </aside>
        <div className="main-col">
          {invites[0] && (
            <div className="ws-banner ws-invite" style={{ display: "flex" }}>
              <span>{invites[0].inviter || "A teammate"} invited you to join <b>{invites[0].workspace}</b> as {invites[0].role}. You’ll work on their shared content, links and data rooms.</span>
              <button className="ws-banner-link" onClick={async () => { const { error } = await supabase.rpc("accept_invite", { p_invite: invites[0].id }); if (error) return toast(error.message); toast(`You joined ${invites[0].workspace}`); await loadProfile(); router.push("/app"); }}>Join workspace</button>
              <button className="ws-banner-x" aria-label="Dismiss" onClick={() => setInvites(invites.slice(1))}><X size={14} /></button>
            </div>
          )}
          {!state.profile.crm_connected && !bannerOff && (
            <div className="ws-banner">
              <span>Connect your CRM to sync every visit and intent score to your deals automatically.</span>
              <Link href="/app/settings/integrations" className="ws-banner-link">Connect HubSpot</Link>
              <button className="ws-banner-x" aria-label="Dismiss" onClick={() => { setBannerOff(true); try { localStorage.setItem("dz-banner-crm", "1"); } catch {} }}><X size={14} /></button>
            </div>
          )}
          <div className="shell">
            <main className="main">{children}</main>
          </div>
          <nav className="mob-tabs" aria-label="Main">
            {[{ href: "/app/inbox", label: "Inbox", I: InboxIcon }, { href: "/app/content", label: "Content", I: FolderIcon }, { href: "/app/accounts", label: "Accounts", I: Building2 }, { href: "/app/settings", label: "Settings", I: SettingsIcon }].map((t) => (
              <Link key={t.href} href={t.href} className={path.startsWith(t.href) || (t.href === "/app/inbox" && path === "/app") ? "on" : ""}><t.I size={20} /><span>{t.label}</span></Link>
            ))}
            <button className={more ? "on" : ""} onClick={() => setMore((m) => !m)} aria-expanded={more}><LayoutGrid size={20} /><span>More</span></button>
          </nav>
          {more && (
            <div className="mob-sheet-back" onClick={() => setMore(false)}>
              <div className="mob-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="All sections">
                <span className="mob-grab" />
                <div className="row gap-10" style={{ padding: "4px 4px 12px" }}><span className="h3 grow ellipsis">{ws}</span><button className="btn btn-secondary btn-s" onClick={() => { setMore(false); openPalette(); }}><Search size={14} />Search</button></div>
                {NAV_GROUPS.map((g) => (
                  <div key={g.label} className="mob-sheet-group">
                    <div className="nav-label">{g.label}</div>
                    <div className="mob-sheet-grid">
                      {g.items.map((n) => <Link key={n.href} href={n.href} className={isActive(n.href) ? "on" : ""}><n.icon size={20} /><span>{n.label}</span></Link>)}
                    </div>
                  </div>
                ))}
                <div className="mob-sheet-foot">
                  <button onClick={() => { setMore(false); setHelp(true); }}><CircleHelp size={16} />Help</button>
                  <Link href="/app/upgrade"><Zap size={16} />Upgrade</Link>
                  <button onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}><LogOut size={16} />Sign out</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <HelpPanel open={help} onClose={() => setHelp(false)} />
        <ProductTour userId={state.userId} firstName={(state.profile.full_name || "").split(" ")[0]} createdAt={state.profile.created_at} checklist={checklist} />
        <CommandPalette />
        <ToastHost />
      </div>
    </Ctx.Provider>
  );
}
