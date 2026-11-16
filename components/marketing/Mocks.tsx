import Link from "next/link";
import { Search, Bell, ChevronDown, Calendar, Users, Zap, Check, Lock, ShieldCheck, KeyRound, Globe, FileCheck2 } from "lucide-react";
import { NAV_GROUPS } from "@/components/nav";
import { TypeText } from "@/components/Motion";
import { HeroLiveAlert, IntentScore, MockKpis, MockRows } from "@/components/LandingMotion";

export function DashboardMock() {
  return (
    <div style={{ height: 620, overflow: "hidden" }}>
      <div style={{ zoom: 0.7556, width: 1440, pointerEvents: "none" }}>
        <div className="app" style={{ height: 900 }}>
          <aside className="sidebar">
            <div className="ws-switch-wrap"><span className="ws-switch"><span className="ws-switch-logo">TC</span><span className="ws-switch-text"><span className="ws-switch-name">Thiscompany</span><span className="ws-switch-sub">Stella · Owner</span></span><span className="ws-switch-chev"><ChevronDown size={14} style={{ transform: "rotate(180deg)" }} /><ChevronDown size={14} /></span></span></div>
            <div className="side-nav">
              <span className="nav-item"><Search size={20} /><span>Search</span></span>
              <span className="nav-item"><Bell size={20} /><span className="grow">Activity</span><span className="nav-count">3</span></span>
              {NAV_GROUPS.flatMap((g) => g.items).map((n) => <span key={n.href} className={`nav-item ${n.href === "/app" ? "active" : ""}`} style={n.href === "/app" ? { background: "var(--dz-bg-emphasis)" } : undefined}><n.icon size={20} /><span>{n.label}</span></span>)}
            </div>
            <div className="side-section">Spaces</div>
            <span className="side-space on"><span className="side-space-dot"><i style={{ background: "#ff7a3d" }} /></span><span className="side-space-text"><span className="side-space-name">Acme — Series A</span><span className="side-space-sub">11 visitors · 2 new</span></span><span className="side-space-badge">2</span></span>
            <span className="side-space"><span className="side-space-dot"><i style={{ background: "#14c7b0" }} /></span><span className="side-space-text"><span className="side-space-name">Board pack · Q3</span><span className="side-space-sub">5 visitors</span></span></span>
            <span className="side-invite">+ Invite your team</span>
          </aside>
          <div className="main-col">
          <div className="ws-banner" style={{ display: "flex" }}><span>Connect your CRM to sync every visit and intent score to your deals automatically.</span><span className="ws-banner-link">Connect HubSpot</span></div>
          <div className="shell">
          <div className="main">
          <div className="content" style={{ flex: 1, padding: "32px 48px" }}>
            <div className="muted body-m">Good evening, Chidera</div>
            <div className="page-title">See what’s new</div>
            <div className="row gap-8 mt-24"><span className="chip"><Calendar size={16} />Last 30 days<ChevronDown size={14} /></span><span className="chip"><Users size={16} />Team visits<ChevronDown size={14} /></span></div>
            <MockKpis />
            <div className="tabs mt-24">{["Visitor activity", "Popular content", "Top groups & links", "Top Spaces", "Visit chart"].map((t, i) => <span key={t} className={`tab ${i === 0 ? "active" : ""}`}>{t}</span>)}</div>
            <div className="row gap-6 mt-24">
              {["Spaces", "Link owners", "Domains"].map((c) => <span key={c} className="chip" style={{ height: 30, fontSize: 13, padding: "0 12px" }}>{c}<ChevronDown size={12} /></span>)}
              <span className="spacer" /><span className="search" style={{ width: 200, height: 32 }}><Search size={14} /><span className="caption">Search</span></span>
            </div>
            <table className="table mt-16">
              <thead><tr><th style={{ width: 24 }} /><th>Name</th><th>Space or link visited</th><th>Visits</th><th>Downloads</th><th>Time spent</th><th>Last visit</th></tr></thead>
              <MockRows />
            </table>
          </div>
          </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AiCardBody({ title, body, brand }: { title: string; body: string; brand?: boolean }) {
  return (
    <>
      <div className="row gap-8 brand caption medium"><span className="flame"><Zap size={18} /></span>Suggested next step</div>
      <div className="h3">{title}</div>
      <p className="muted"><TypeText text={body} /></p>
      <div className="row gap-8"><Link href="/signup" className={`btn ${brand ? "btn-brand" : "btn-primary"} btn-s`}>Draft follow-up</Link><Link href="/signup" className="btn btn-ghost btn-s">View timeline</Link></div>
    </>
  );
}

/** Browser frame with the dashboard and the three floating cards (landing + product hero). */
export function ProductShot() {
  return (
    <div className="product-shot d-only" data-tilt-scroll>
        <div className="browser">
          <div className="browser-bar"><span className="dot" style={{ background: "#ff5f57" }} /><span className="dot" style={{ background: "#febc2e" }} /><span className="dot" style={{ background: "#28c840" }} /><div className="browser-url">dozzier.co/app</div></div>
          <DashboardMock />
        </div>
        <div className="float-card f1" style={{ left: -48, top: 250, padding: "14px 16px", minWidth: 351, whiteSpace: "nowrap" }}>
          <HeroLiveAlert />
        </div>
        <div className="float-card f2 col gap-8" style={{ left: 1010, top: 170, padding: "14px 16px", whiteSpace: "nowrap" }}>
          <span className="overline" style={{ color: "var(--dz-text-tertiary)" }}>Intent score</span>
          <div className="row gap-12"><span className="semibold">Acme Ventures</span><IntentScore /></div>
        </div>
        <div className="float-card f3 ai-card" style={{ left: 800, top: 420, width: 340 }}>
          <AiCardBody title="Acme is ready for a follow-up" body="Spent 6 min on pricing and forwarded to 2 partners. Suggest sending the data room." />
        </div>
      </div>
  );
}

export function SecurityBento({ head = true }: { head?: boolean }) {
  const Chips = ({ items }: { items: string[] }) => <div className="sec-chips">{items.map((t) => <span key={t}><Check size={14} />{t}</span>)}</div>;
  const Card = ({ I, t, b, children, style }: { I: typeof Lock; t: string; b: string; children?: React.ReactNode; style?: React.CSSProperties }) => (
    <div className="sec-card spotlight" style={style}><span className="icon-tile"><I size={22} /></span><div className="h1">{t}</div><p className="body-m muted">{b}</p>{children}</div>
  );
  return (
    <section className="sec-wrap" id={head ? "security" : undefined}>
      <div className="sec-panel">
        {head && <div className="lp-head" style={{ marginBottom: 0 }} data-stagger="90"><span className="overline">Security</span><h2 className="display-l">Enterprise-grade by default</h2><p className="body-l muted">Your documents stay yours — locked down, logged, and revocable at any moment.</p></div>}
        <div className="sec-bento" data-stagger="110">
          <div className="sec-row">
            <Card I={Lock} t="Encrypted end to end" b="Every file is encrypted at rest and in transit, with screenshot protection and dynamic watermarks on sensitive links." style={{ flex: 1, height: 360 }}>
              <span className="grow" /><Chips items={["AES-256 at rest", "TLS 1.3 in transit", "Screenshot protection", "Dynamic watermarks", "Revoke access anytime"]} />
            </Card>
            <Card I={ShieldCheck} t="Full audit trail" b="Every view, download and permission change — exportable anytime." style={{ width: 380, height: 360 }}>
              <div className="sec-log">{[["Paul · Viewed Series A Deck", "2m"], ["Cynthia · Downloaded Term sheet", "1h"], ["Stella · Revoked link · Globex", "3h"]].map(([a, b]) => <div key={a}><i /><span className="grow">{a}</span><span className="faint">{b}</span></div>)}</div>
            </Card>
          </div>
          <div className="sec-row">
            <Card I={KeyRound} t="SSO, SAML & SCIM" b="Granular roles, IP allow-lists and automatic provisioning." style={{ flex: 1, height: 300 }}><span className="grow" /><Chips items={["Okta", "Google", "Microsoft Entra"]} /></Card>
            <Card I={Globe} t="Data residency" b="Region-locked storage — choose where your documents live." style={{ flex: 1, height: 300 }}><span className="grow" /><Chips items={["EU", "US"]} /></Card>
            <Card I={FileCheck2} t="Access controls" b="Email verification, passcodes, NDAs, expiry and allow/block lists on every link." style={{ flex: 1, height: 300 }} />
          </div>
        </div>
      </div>
    </section>
  );
}
