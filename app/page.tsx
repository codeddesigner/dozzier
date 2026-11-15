import Link from "next/link";
import {
  Upload, Link2, Sparkles, MessageSquareText, Signature, History, Kanban, CheckCircle2, Lock, KeyRound, Globe, ShieldCheck,
  Info, AtSign, Mail, User, Settings2, BarChart3, Users, Files, TrendingUp, FileCheck2, Palette, Puzzle, HousePlus, List, CircleCheck,
  Image as ImageIcon, Search, Zap, Bell, CircleHelp, Calendar, ChevronDown, Flame, Eye, Download as DownloadIcon, Clock3, Mail as MailIcon,
} from "lucide-react";
import { Logo, AppIcon, FooterLogo } from "@/components/Logo";
import { Faq } from "@/components/Faq";
import { PageBars } from "@/components/charts";
import { NAV_GROUPS } from "@/components/nav";
import { LogoMark } from "@/components/Logo";
import { PricingCards } from "@/components/Pricing";
import { Avatar } from "@/components/ui";
import { AppLogo, INTEGRATIONS } from "@/components/AppLogo";
import { WordReveal, TypeText, CountUp } from "@/components/Motion";
import { HeroLiveAlert, IntentScore, MockKpis, MockRows, LiveFeed, LinkSettingsLive } from "@/components/LandingMotion";

const DEMO = "mailto:sales@dozzier.io?subject=Dozzier%20demo";

function Nav() {
  return (
    <header className="lp-nav">
      <a href="/signup" className="announce-bar">Read the 2026 State of Secure Document Sharing report&nbsp;&nbsp;<span className="arrow">→</span></a>
      <div className="lp-nav-inner">
        <Link href="/" aria-label="Dozzier home"><Logo height={30} /></Link>
        <nav className="lp-links">
          <a href="#product">Product</a><a href="#data-rooms">Data rooms</a><a href="#ai">AI</a>
          <a href="#integrations">Integrations</a><a href="#pricing">Pricing</a><Link href="/docs">Docs</Link>
        </nav>
        <div className="spacer" />
        <Link href="/login" className="lp-signin">Sign in<ChevronDown size={16} /></Link>
        <Link href="/signup" className="btn btn-secondary">Try for free</Link>
      </div>
    </header>
  );
}

function DashboardMock() {
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

function Hero() {
  return (
    <section className="hero" id="product">
      <Link href="/signup" className="announce h-in"><span className="badge badge-brand">New</span>Ask Dozzier — AI answers across every deal <span className="arrow">→</span></Link>
      <h1 className="display-xl" style={{ maxWidth: 948 }}><WordReveal text="The secure platform to share, track, and move business forward." delay={80} /></h1>
      <p className="body-l muted h-in" style={{ maxWidth: 732, animationDelay: ".45s" }}>
        Dozzier turns every deck, proposal and data room into a secure link with page-by-page analytics, live alerts and AI follow-ups — so you know who’s interested and exactly what to do next.
      </p>
      <div className="row gap-12 wrap h-in" style={{ justifyContent: "center", animationDelay: ".6s" }}>
        <Link href="/signup" className="btn btn-primary btn-l">Start free — no card needed<span className="arrow">→</span></Link>
        <a href={DEMO} className="btn btn-secondary btn-l">Book a demo</a>
      </div>
      <p className="caption faint h-in" style={{ animationDelay: ".72s" }}>Free 14-day trial on every plan · Set up in 2 minutes · Cancel anytime</p>
      <div className="product-shot" data-tilt-scroll>
        <div className="browser">
          <div className="browser-bar"><span className="dot" style={{ background: "#ff5f57" }} /><span className="dot" style={{ background: "#febc2e" }} /><span className="dot" style={{ background: "#28c840" }} /><div className="browser-url">app.dozzier.io/dashboard</div></div>
          <DashboardMock />
        </div>
        <div className="float-card f1" style={{ left: -48, top: 250, padding: "14px 16px", width: 372 }}>
          <HeroLiveAlert />
        </div>
        <div className="float-card f2 col gap-8" style={{ left: 1010, top: 170, padding: "14px 16px" }}>
          <span className="overline" style={{ color: "var(--dz-text-tertiary)" }}>Intent score</span>
          <div className="row gap-12"><span className="semibold">Acme Ventures</span><IntentScore /></div>
        </div>
        <div className="float-card f3 ai-card" style={{ left: 800, top: 420, width: 340 }}>
          <AiCardBody title="Acme is ready for a follow-up" body="Spent 6 min on pricing and forwarded to 2 partners. Suggest sending the data room." />
        </div>
      </div>
    </section>
  );
}

function AiCardBody({ title, body }: { title: string; body: string }) {
  return (
    <>
      <div className="row gap-8 brand caption medium"><span className="flame"><Sparkles size={18} /></span>Dozzier Copilot</div>
      <div className="h3">{title}</div>
      <p className="muted"><TypeText text={body} /></p>
      <div className="row gap-8"><Link href="/signup" className="btn btn-primary btn-s">Draft follow-up</Link><Link href="/signup" className="btn btn-ghost btn-s">View timeline</Link></div>
    </>
  );
}

function Logos() {
  const items: [string, React.CSSProperties][] = [
    ["northwind", { fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }], ["Halcyon Capital", { fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }],
    ["LUMEN BIO", { fontSize: 18, fontWeight: 300, letterSpacing: "0.18em" }], ["arcadia", { fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }],
    ["Foundry & Co.", { fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }], ["KESTREL", { fontSize: 20, fontWeight: 700, letterSpacing: "0.16em" }],
  ];
  return (
    <section style={{ padding: "56px 24px", borderTop: "1px solid var(--dz-border-subtle)", borderBottom: "1px solid var(--dz-border-subtle)" }}>
      <p className="center muted" style={{ marginBottom: 28 }} data-reveal>Trusted by founders, sales teams and dealmakers at <CountUp to={4000} duration={1800} />+ companies</p>
      <div className="marquee" style={{ maxWidth: 1018, margin: "0 auto", color: "#6b7280" }} data-reveal="fade">
        <div className="marquee-track">{[...items, ...items].map(([n, s], i) => <span key={i} style={s} aria-hidden={i >= items.length}>{n}</span>)}</div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    [Upload, "Upload anything", "Drop in PDFs, decks, videos or whole folders. Dozzier scans for sensitive data and suggests the right link settings."],
    [Link2, "Share a smart link", "Require email, add a passcode or NDA, set expiry and watermark — per recipient, or in bulk from your CRM."],
    [Sparkles, "Act on real intent", "See every page view in real time, get an intent score per account, and send AI-drafted follow-ups that land."],
  ] as const;
  return (
    <section className="lp-section">
      <div className="lp-head" data-stagger="90"><span className="overline">How it works</span><h2 className="display-l">From upload to “yes” in three steps</h2></div>
      <div className="lp-container grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} data-stagger="140">
        {steps.map(([Icon, t, b], i) => (
          <div className="step-card spotlight" key={t}>
            <div className="row"><span className="icon-tile"><Icon size={22} /></span><span className="spacer" /><span className="h2 step-num" style={{ color: "var(--dz-text-disabled)" }}>0{i + 1}</span></div>
            <div className="h2 mt-24">{t}</div>
            <p className="body-m muted">{b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="lp-section" style={{ background: "var(--dz-bg-subtle)" }}>
      <div className="lp-head" data-stagger="90">
        <span className="overline">Everything in one place</span>
        <h2 className="display-l">Built for the moments that close deals</h2>
        <p className="body-l muted">All the sharing controls you expect, plus the parts you’ve been stitching together with spreadsheets and Slack.</p>
      </div>
      <div className="lp-container col gap-24">
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "776fr 400fr", gap: 24 }} data-stagger="120">
          <div className="feature-card spotlight">
            <span className="overline">Analytics</span><div className="h1">Page-by-page engagement</div>
            <p className="body-m muted">Time on every page, every visitor, every version — with heatmaps that show where attention really goes.</p>
            <div className="card" style={{ padding: 16, marginTop: 24 }}>
              <div className="row"><span className="semibold">Time spent per page</span><span className="spacer" /><span className="micro muted hide-sm">Avg. 01:12 per visit · 82% completion</span></div>
              <div className="mt-16"><PageBars values={[38, 52, 20, 64, 30, 24, 12, 44, 18, 8, 26, 6]} height={100} /></div>
            </div>
          </div>
          <div className="feature-card dark spotlight">
            <span className="overline" style={{ color: "#9ca3af" }}>Real-time</span><div className="h1">Know the second they open it</div>
            <p className="body-m" style={{ color: "#9ca3af" }}>Live “viewing now” alerts in the app, email, Slack and your phone.</p>
            <LiveFeed />
          </div>
        </div>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} data-stagger="120">
          <div className="feature-card spotlight" style={{ height: 500 }}>
            <span className="overline">Control</span><div className="h1">Share securely, your way</div>
            <p className="body-m muted">Email verification, passcodes, NDAs, allow/block lists, expiry, dynamic watermarks and download controls.</p>
            <LinkSettingsLive />
          </div>
          <div className="feature-card spotlight" id="data-rooms">
            <span className="overline">Data rooms</span><div className="h1">Data rooms that run diligence</div>
            <p className="body-m muted">Group permissions, request tracker, Q&amp;A and a full audit log in one Space.</p>
            <div style={{ marginTop: 16, background: "#fff" }}>
              <div className="banner-anim" style={{ height: 58, position: "relative" }}><span style={{ position: "absolute", left: 6, top: 6, background: "rgba(255,255,255,.9)", borderRadius: 999, padding: "1px 4px", fontSize: 5, fontWeight: 500, lineHeight: "6px" }}>Preview</span></div>
              <div className="row" style={{ gap: 7, padding: "0 9px 7px", alignItems: "flex-start" }}>
                <span style={{ width: 43, height: 43, background: "var(--dz-bg-muted)", borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--dz-icon-secondary)" }}><ImageIcon size={13} /></span>
                <div className="col" style={{ paddingTop: 22, gap: 3 }}>
                  <span style={{ fontSize: 8, fontWeight: 600, lineHeight: "10px" }}>Investor due diligence</span>
                  <span className="row" style={{ gap: 3, fontSize: 5, color: "var(--dz-text-secondary)", lineHeight: "7px" }}>Subtitle · Last updated 1d ago <span style={{ background: "var(--dz-bg-success-subtle)", color: "var(--dz-text-success)", borderRadius: 1.5, padding: "1px 2px", fontWeight: 500, fontSize: 4.3 }}>Active ⌄</span></span>
                  <span className="row">{[["Ab", "#ff5a5a"], ["Pa", "#3b8bff"], ["Cy", "#ff4f8b"]].map(([t, c]) => <span key={t} className="avatar" style={{ width: 14.5, height: 14.5, fontSize: 5.8, background: c, marginRight: -2 }}>{t}</span>)}<span className="avatar" style={{ width: 11.5, height: 11.5, background: "#fff", border: ".4px solid var(--dz-border-default)", color: "#111827", fontSize: 7 }}>+</span></span>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-card spotlight" id="ai">
            <span className="overline">AI</span><div className="h1">Ask Dozzier anything</div>
            <p className="body-m muted">“Which investors read the financials twice?” Cited answers and one-click follow-ups.</p>
            <div className="ai-card mt-16"><AiCardBody title="3 investors re-read your model" body="Acme, Northwind and Kestrel spent 4+ min on pages 12–14. Draft a follow-up with the updated cap table?" /></div>
          </div>
        </div>
        <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} data-stagger="90">
          {([[MessageSquareText, "Visitor Q&A", "Viewers ask questions on any page; you answer by email or in-app."], [Signature, "eSign & file requests", "Collect signatures and files without another tool."], [History, "Version compare", "See what changed and notify everyone who saw the old one."], [Kanban, "Deal pipeline", "A Kanban board that moves with engagement and syncs to your CRM."]] as const).map(([I, t, b]) => (
            <div className="mini-card spotlight" key={t}><I size={24} color="#4D94F7" /><div className="h3" style={{ marginTop: 8 }}>{t}</div><p className="muted">{b}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  return (
    <section className="lp-section" id="integrations">
      <div className="lp-container grid-2" style={{ display: "grid", gridTemplateColumns: "560px 1fr", gap: 80, alignItems: "center" }}>
        <div className="col gap-16" data-stagger="80">
          <span className="overline">Integrations</span>
          <h2 className="display-l">Fits the stack you already use</h2>
          <p className="body-l muted">Push engagement into your CRM, get alerts where you work, and import files from the cloud drives your team already lives in.</p>
          {["Two-way CRM sync with HubSpot, Salesforce and Pipedrive", "Live alerts in Slack, Teams and email", "Import from Google Drive, Dropbox, Box, OneDrive and SharePoint", "6,000+ apps through Zapier, plus a REST API and webhooks"].map((t) => (
            <div key={t} className="row gap-12 body-m"><CheckCircle2 size={20} color="#4D94F7" />{t}</div>
          ))}
          <div><Link href="/signup" className="btn btn-secondary">See all integrations</Link></div>
        </div>
        <div className="int-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 100px))", gap: 16 }} data-stagger="45" data-stagger-variant="pop">
          {INTEGRATIONS.map((n) => (
            <div className="int-tile" key={n}><AppLogo name={n} /><span>{n}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    [Lock, "Encrypted end to end", "AES-256 at rest and TLS 1.3 in transit, with screenshot protection on sensitive links."],
    [KeyRound, "SSO, SAML & SCIM", "Granular roles, IP allow-lists and automatic provisioning for your whole team."],
    [Globe, "Data residency", "Choose where your documents live, with region-locked storage in the EU or US."],
    [ShieldCheck, "Full audit trail", "Every view, download, permission change and signature — exportable anytime."],
  ] as const;
  return (
    <section className="lp-section" style={{ background: "var(--dz-bg-inverse)", color: "#fff" }}>
      <div className="lp-head" data-stagger="90"><span className="overline" style={{ color: "#9ca3af" }}>Security</span><h2 className="display-l">Enterprise-grade by default</h2><p className="body-l" style={{ color: "#9ca3af" }}>Your documents stay yours — locked down, logged, and revocable at any moment.</p></div>
      <div className="lp-container grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} data-stagger="110">
        {items.map(([I, t, b]) => <div className="sec-card spotlight" key={t}><I size={22} /><div className="h3">{t}</div><p className="caption" style={{ color: "#9ca3af" }}>{b}</p></div>)}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="lp-section" id="pricing" style={{ background: "var(--dz-bg-subtle)" }}>
      <div className="lp-head" data-stagger="90"><span className="overline">Pricing</span><h2 className="display-l">Simple pricing that scales with you</h2><p className="body-l muted">Start free for 14 days on any plan. No credit card required.</p></div>
      <div className="lp-container" data-reveal>
        <PricingCards cta={(id) => <Link href={`/signup?plan=${id}`} className="btn btn-block btn-primary">{id === "datarooms" ? "Start free trial" : "Select plan"}</Link>} />
        <p className="row gap-8 muted" style={{ justifyContent: "center", marginTop: 56 }}><Info size={16} />Need SSO, custom contracts or 50+ seats? <a href={DEMO} style={{ textDecoration: "underline" }}>Talk to sales about Enterprise.</a></p>
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Product", [["Analytics", "#product"], ["Data rooms", "#data-rooms"], ["Ask Dozzier", "#ai"], ["eSign", "#product"], ["Integrations", "#integrations"], ["Pricing", "#pricing"]]],
    ["Resources", [["Docs", "/docs"], ["API reference", "/docs/api"], ["Changelog", "/docs/changelog"], ["Status", "/docs/contact#status"], ["Help center", "/docs"]]],
    ["Company", [["About", "#product"], ["Careers", "mailto:careers@dozzier.io"], ["Blog", "/docs/changelog"], ["Contact", "/docs/contact"]]],
    ["Legal", [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["Security", "/legal/security"], ["DPA", "/legal/dpa"]]],
  ];
  return (
    <footer className="footer">
      <div className="lp-container">
        <div className="footer-cols" data-stagger="70">
          <div><FooterLogo height={36} /><p className="muted" style={{ marginTop: 16, maxWidth: 300 }}>Secure document sharing with analytics that tell you what to do next.</p></div>
          {cols.map(([h, ls]) => <div key={h}><div className="semibold">{h}</div>{ls.map(([l, href]) => <a key={l} href={href}>{l}</a>)}</div>)}
        </div>
        <div className="row" style={{ borderTop: "1px solid var(--dz-border-subtle)", marginTop: 48, paddingTop: 24 }}>
          <span className="caption faint grow">© 2026 Dozzier, Inc. · dozzier.io</span>
          <div className="row gap-16 muted"><AtSign size={18} /><Mail size={18} /><Globe size={18} /></div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <main>
      <Nav />
      <Hero />
      <Logos />
      <HowItWorks />
      <Features />
      <Integrations />
      <Security />
      <Pricing />
      <section className="lp-section" id="faq">
        <div className="lp-head" style={{ marginBottom: 32 }} data-stagger="90"><span className="overline">FAQ</span><h2 className="display-l">Questions, answered</h2></div>
        <div data-reveal><Faq /></div>
      </section>
      <section style={{ padding: "0 24px 96px" }}>
        <div className="lp-container cta-box" data-reveal="scale">
          <span className="cta-icon" style={{ borderRadius: 13, display: "inline-flex" }}><AppIcon size={56} tone="white" /></span>
          <h2 className="display-l">Stop guessing. Start knowing.</h2>
          <p className="body-l" style={{ opacity: 0.85 }}>Send your first tracked link in under two minutes.</p>
          <div className="row gap-12"><Link href="/signup" className="btn btn-secondary btn-l">Start free trial</Link><a href={DEMO} className="btn btn-dark btn-l">Book a demo<span className="arrow">→</span></a></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
