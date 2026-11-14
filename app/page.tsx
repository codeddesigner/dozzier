import Link from "next/link";
import {
  Upload, Link2, Sparkles, MessageSquareText, Signature, History, Kanban, CheckCircle2, Lock, KeyRound, Globe, ShieldCheck,
  Info, AtSign, Mail, User, Settings2, BarChart3, Users, Files, TrendingUp, FileCheck2, Palette, Puzzle, HousePlus, List, CircleCheck,
  Search, Zap, Bell, CircleHelp, Calendar, ChevronDown, Flame, Eye, Download as DownloadIcon, Clock3, Mail as MailIcon,
} from "lucide-react";
import { Logo, AppIcon } from "@/components/Logo";
import { Faq } from "@/components/Faq";
import { PageBars } from "@/components/charts";
import { NAV_GROUPS, APPS } from "@/components/nav";
import { LogoMark } from "@/components/Logo";
import { PricingCards } from "@/components/Pricing";
import { Avatar } from "@/components/ui";

const DEMO = "mailto:sales@dozzier.io?subject=Dozzier%20demo";

function Nav() {
  return (
    <header className="lp-nav">
      <a href="/signup" className="announce-bar">Read the 2026 State of Secure Document Sharing report&nbsp;&nbsp;→</a>
      <div className="lp-nav-inner">
        <Link href="/" aria-label="Dozzier home"><Logo height={30} /></Link>
        <nav className="lp-links">
          <a href="#product">Product</a><a href="#data-rooms">Data rooms</a><a href="#ai">AI</a>
          <a href="#integrations">Integrations</a><a href="#pricing">Pricing</a><a href="#faq">Docs</a>
        </nav>
        <div className="spacer" />
        <Link href="/login" className="lp-signin">Sign in<ChevronDown size={16} /></Link>
        <Link href="/signup" className="btn btn-secondary">Try for free</Link>
      </div>
    </header>
  );
}

function DashboardMock() {
  const rows = [
    ["Paul", "paul@randombase.com", "Randombase", 1, 1, "01:51", "40 min ago"],
    ["Cynthia", "cynthia@randombase.com", "Randombase", 1, 0, "01:06", "40 min ago"],
    ["Stella", "stella@randombase.com", "Series A — Acme Ventures", 3, 0, "04:13", "2 hours ago"],
    ["Daniel", "daniel@acmevc.com", "Series A — Acme Ventures", 2, 1, "06:40", "Yesterday"],
    ["Priya Raman", "priya@northwind.io", "Data room · Diligence", 5, 2, "12:08", "2 days ago"],
  ];
  return (
    <div style={{ height: 620, overflow: "hidden" }}>
      <div style={{ zoom: 0.7556, width: 1440, pointerEvents: "none" }}>
        <div className="app" style={{ height: 900 }}>
          <div className="rail">
            <LogoMark size={28} />
            <span className="rail-collapse"><ChevronDown size={16} style={{ transform: "rotate(-90deg)" }} /></span>
            <span className="rail-sep" />
            {APPS.map((a, i) => <span key={a.label} className={`rail-app ${i === 0 ? "active" : ""}`}><a.icon size={20} /></span>)}
            <span className="spacer" />
            <span className="rail-btn"><Search size={18} /></span><span className="rail-btn"><CircleHelp size={18} /></span>
            <Avatar size={32} name="Chidera" color="#ff7a3d" />
          </div>
          <div className="shell">
          <aside className="sidebar">
            <div className="ws"><span className="h3">Randombase</span><ChevronDown size={16} /></div>
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="nav-group"><div className="nav-label">{g.label}</div>
                {g.items.map((n) => <div key={n.href} className={`nav-item ${n.href === "/app" ? "active" : ""}`}><n.icon size={20} /><span>{n.label}</span></div>)}
              </div>
            ))}
          </aside>
          <div className="shell-main">
          <div className="page-header">
            <div className="crumbs"><span className="muted">Randombase</span><span className="sep">/</span><span className="cur">Dashboard</span></div>
            <span className="spacer" />
            <span className="hdr-search"><Search size={14} /><span className="grow">Search</span><span className="kbd">⌘K</span></span>
            <span className="icon-btn hdr-icon"><Bell size={18} /></span>
            <span className="support-link"><Files size={16} />Support</span>
          </div>
          <div className="content" style={{ flex: 1, padding: "32px 48px" }}>
            <div className="muted body-m">Good evening, Chidera</div>
            <div className="page-title" style={{ fontSize: 36 }}>See what’s new</div>
            <div className="row gap-8 mt-24"><span className="chip"><Calendar size={16} />Last 30 days<ChevronDown size={14} /></span><span className="chip"><Users size={16} />Team visits<ChevronDown size={14} /></span></div>
            <div className="kpis mt-24">
              {[["Total visits", "128", "↑ 24%", "up"], ["Unique visitors", "46", "↑ 12%", "up"], ["Avg. time per visit", "02:41", "↓ 8%", "down"], ["Downloads", "9", "0%", "flat"]].map(([l, v, d, t]) => (
                <div className="kpi" key={l}><div className="kpi-label">{l}</div><div className="kpi-card"><div className="value">{v}</div><div className="row gap-6"><span className={`delta ${t}`}>{d}</span><span className="caption faint">vs last 30 days</span></div></div></div>
              ))}
            </div>
            <div className="tabs mt-24">{["Visitor activity", "Popular content", "Top groups & links", "Top Spaces", "Visit chart"].map((t, i) => <span key={t} className={`tab ${i === 0 ? "active" : ""}`}>{t}</span>)}</div>
            <table className="table mt-24">
              <thead><tr><th style={{ width: 24 }} /><th>Name</th><th>Space or link visited</th><th>Visits</th><th>Downloads</th><th>Time spent</th><th>Last visit</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r[1] as string}><td><ChevronDown size={16} style={{ transform: "rotate(-90deg)" }} /></td>
                  <td><div className="row gap-12"><Avatar size={32} name={r[0] as string} /><div className="col"><span className="medium">{r[0]}</span><span className="caption muted">{r[1]}</span></div></div></td>
                  <td><span className="row gap-6"><Link2 size={14} />{r[2]}</span></td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td>{r[6]}</td></tr>
              ))}</tbody>
            </table>
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
            <h1 className="display-xl" style={{ maxWidth: 948 }}>The secure platform to share, track, and move business forward.</h1>
      <p className="body-l muted" style={{ maxWidth: 732 }}>
        Dozzier turns every deck, proposal and data room into a secure link with page-by-page analytics, live alerts and AI follow-ups — so you know who’s interested and exactly what to do next.
      </p>
      <div className="row gap-12 wrap" style={{ justifyContent: "center" }}>
        <Link href="/signup" className="btn btn-primary btn-l">Start free — no card needed</Link>
        <a href={DEMO} className="btn btn-secondary btn-l">Book a demo</a>
      </div>
      <p className="caption faint">Free 14-day trial on every plan · Set up in 2 minutes · Cancel anytime</p>
      <div className="product-shot">
        <div className="browser">
          <div className="browser-bar"><span className="dot" style={{ background: "#ff5f57" }} /><span className="dot" style={{ background: "#febc2e" }} /><span className="dot" style={{ background: "#28c840" }} /><div className="browser-url">app.dozzier.io/dashboard</div></div>
          <DashboardMock />
        </div>
        <div className="float-card row gap-12" style={{ left: -48, top: 250, padding: "14px 16px" }}>
          <Avatar size={32} name="Paul" color="#3b8bff" />
          <div className="col"><span className="semibold">Paul at Randombase is viewing now</span><span className="caption muted">Pitch deck · page 7 of 18 · 4m 12s</span></div>
          <span className="badge badge-success"><span className="dot" />Live</span>
        </div>
        <div className="float-card col gap-8" style={{ left: 1010, top: 170, padding: "14px 16px" }}>
          <span className="overline" style={{ color: "var(--dz-text-tertiary)" }}>Intent score</span>
          <div className="row gap-12"><span className="semibold">Acme Ventures</span><span className="intent danger"><Flame size={12} />Hot · 92</span></div>
        </div>
        <div className="float-card ai-card" style={{ left: 800, top: 420, width: 340 }}>
          <AiCardBody title="Acme is ready for a follow-up" body="Spent 6 min on pricing and forwarded to 2 partners. Suggest sending the data room." />
        </div>
      </div>
    </section>
  );
}

function AiCardBody({ title, body }: { title: string; body: string }) {
  return (
    <>
      <div className="row gap-8 brand caption medium"><Sparkles size={18} />Dozzier Copilot</div>
      <div className="h3">{title}</div>
      <p className="muted">{body}</p>
      <div className="row gap-8"><Link href="/signup" className="btn btn-primary btn-s">Draft follow-up</Link><Link href="/signup" className="btn btn-ghost btn-s">View timeline</Link></div>
    </>
  );
}

function Logos() {
  const items: [string, React.CSSProperties][] = [
    ["northwind", { fontSize: 28, fontWeight: 700, letterSpacing: -1 }], ["Halcyon Capital", { fontSize: 22, fontFamily: "Georgia, serif" }],
    ["LUMEN BIO", { fontSize: 20, fontWeight: 600, letterSpacing: 3 }], ["arcadia", { fontSize: 28, fontStyle: "italic", fontFamily: "Georgia, serif" }],
    ["Foundry & Co.", { fontSize: 24, fontWeight: 600 }], ["KESTREL", { fontSize: 22, fontWeight: 800, letterSpacing: 2 }],
  ];
  return (
    <section style={{ padding: "56px 24px", borderTop: "1px solid var(--dz-border-subtle)", borderBottom: "1px solid var(--dz-border-subtle)" }}>
      <p className="center muted medium" style={{ marginBottom: 28 }}>Trusted by founders, sales teams and dealmakers at 4,000+ companies</p>
      <div className="logos" style={{ maxWidth: 1032, margin: "0 auto" }}>{items.map(([n, s]) => <span key={n} style={s}>{n}</span>)}</div>
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
      <div className="lp-head"><span className="overline">How it works</span><h2 className="display-l">From upload to “yes” in three steps</h2></div>
      <div className="lp-container grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
        {steps.map(([Icon, t, b], i) => (
          <div className="step-card" key={t}>
            <div className="row"><span className="icon-tile"><Icon size={22} /></span><span className="spacer" /><span className="h2" style={{ color: "var(--dz-text-disabled)" }}>0{i + 1}</span></div>
            <div className="h2 mt-24">{t}</div>
            <p className="body-m muted">{b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LinkSettingsMini() {
  const items: [typeof Mail, string, string, boolean][] = [
    [Mail, "Require email to view", "Visitors verify their email before the document opens.", true],
    [DownloadIcon, "Allow downloads", "Let visitors download a PDF copy.", false],
    [Lock, "Require passcode", "Share a passcode separately for extra protection.", false],
    [Calendar, "Link expiration", "Disable this link on Dec 31, 2026 at 11:59 PM.", true],
    [FileCheck2, "Dynamic watermark", "Stamp each page with the viewer’s email.", true],
  ];
  return (
    <div className="card" style={{ marginTop: 16, padding: 16, boxShadow: "var(--shadow-lg)", fontSize: 12 }}>
      <div className="row semibold" style={{ fontSize: 14 }}>Create link<span className="spacer" />×</div>
      <div className="micro medium mt-8">Link name</div>
      <div className="input" style={{ height: 30, display: "flex", alignItems: "center", fontSize: 12, marginTop: 4 }}>Randombase — Series A</div>
      <div className="row gap-6 brand" style={{ background: "var(--dz-bg-brand-subtle)", borderRadius: 6, padding: "6px 8px", marginTop: 8 }}><Link2 size={12} />dozzier.io/v/randombase-series-a</div>
      {items.map(([I, t, d, on]) => (
        <div className="row gap-8" key={t} style={{ padding: "8px 0", borderBottom: "1px solid var(--dz-border-subtle)" }}>
          <I size={14} /><div className="grow"><div className="medium">{t}</div><div className="faint" style={{ fontSize: 10 }}>{d}</div></div>
          <span className={`toggle ${on ? "on" : ""}`} style={{ transform: "scale(.8)" }} />
        </div>
      ))}
    </div>
  );
}

function Features() {
  return (
    <section className="lp-section" style={{ background: "var(--dz-bg-subtle)" }}>
      <div className="lp-head">
        <span className="overline">Everything in one place</span>
        <h2 className="display-l">Built for the moments that close deals</h2>
        <p className="body-l muted">All the sharing controls you expect, plus the parts you’ve been stitching together with spreadsheets and Slack.</p>
      </div>
      <div className="lp-container col gap-24">
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "776fr 400fr", gap: 24 }}>
          <div className="feature-card">
            <span className="overline">Analytics</span><div className="h1">Page-by-page engagement</div>
            <p className="body-m muted">Time on every page, every visitor, every version — with heatmaps that show where attention really goes.</p>
            <div className="card" style={{ padding: 16, marginTop: 24 }}>
              <div className="row"><span className="semibold">Time spent per page</span><span className="spacer" /><span className="micro muted hide-sm">Avg. 01:12 per visit · 82% completion</span></div>
              <div className="mt-16"><PageBars values={[38, 52, 20, 64, 30, 24, 12, 44, 18, 8, 26, 6]} height={100} /></div>
            </div>
          </div>
          <div className="feature-card dark">
            <span className="overline" style={{ color: "#9ca3af" }}>Real-time</span><div className="h1">Know the second they open it</div>
            <p className="body-m" style={{ color: "#9ca3af" }}>Live “viewing now” alerts in the app, email, Slack and your phone.</p>
            <div className="col gap-8 mt-16">
              {[["Paul", "Opened Pitch deck · Acme Ventures", "Live"], ["Cynthia", "Forwarded to 2 partners", "New"], ["Stella", "Downloaded Term sheet.pdf", "New"]].map(([n, d, b]) => (
                <div key={n} className="row" style={{ background: "#1f2937", borderRadius: 12, padding: "12px 14px" }}>
                  <div className="col grow"><span className="semibold">{n}</span><span className="caption" style={{ color: "#9ca3af" }}>{d}</span></div>
                  <span className={`badge ${b === "Live" ? "badge-success" : "badge-brand"}`}>{b === "Live" && <span className="dot" />}{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          <div className="feature-card" style={{ height: 500 }}>
            <span className="overline">Control</span><div className="h1">Share securely, your way</div>
            <p className="body-m muted">Email verification, passcodes, NDAs, allow/block lists, expiry, dynamic watermarks and download controls.</p>
            <LinkSettingsMini />
          </div>
          <div className="feature-card" id="data-rooms">
            <span className="overline">Data rooms</span><div className="h1">Data rooms that run diligence</div>
            <p className="body-m muted">Group permissions, request tracker, Q&amp;A and a full audit log in one Space.</p>
            <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
              <div style={{ height: 64, background: "linear-gradient(120deg,#4b4f93,#7b80c9)" }} />
              <div className="row gap-12" style={{ padding: 12 }}>
                <span className="doc-thumb file" style={{ width: 40, height: 40 }}><HousePlus size={16} /></span>
                <div className="col"><span className="semibold caption">Investor due diligence</span><span className="micro faint">Subtitle · Last updated 1d ago <span className="badge badge-success" style={{ fontSize: 10 }}>Active</span></span></div>
              </div>
            </div>
          </div>
          <div className="feature-card" id="ai">
            <span className="overline">AI</span><div className="h1">Ask Dozzier anything</div>
            <p className="body-m muted">“Which investors read the financials twice?” Cited answers and one-click follow-ups.</p>
            <div className="ai-card mt-16"><AiCardBody title="3 investors re-read your model" body="Acme, Northwind and Kestrel spent 4+ min on pages 12–14. Draft a follow-up with the updated cap table?" /></div>
          </div>
        </div>
        <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
          {([[MessageSquareText, "Visitor Q&A", "Viewers ask questions on any page; you answer by email or in-app."], [Signature, "eSign & file requests", "Collect signatures and files without another tool."], [History, "Version compare", "See what changed and notify everyone who saw the old one."], [Kanban, "Deal pipeline", "A Kanban board that moves with engagement and syncs to your CRM."]] as const).map(([I, t, b]) => (
            <div className="mini-card" key={t}><I size={24} color="#4D94F7" /><div className="h3" style={{ marginTop: 8 }}>{t}</div><p className="muted">{b}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  const apps: [string, string, string][] = [
    ["HubSpot", "#ff7a59", "Hs"], ["Salesforce", "#00a1e0", "Sf"], ["Pipedrive", "", "Pd"], ["Slack", "#4a154b", "Sl"],
    ["Teams", "", "Mt"], ["Gmail", "#ea4335", "M"], ["Outlook", "", "Ol"], ["Zoom", "", "Zm"],
    ["Zapier", "#ff4f00", "Z"], ["Notion", "", "No"], ["Google Drive", "#1fa463", "▲"], ["Dropbox", "", "Db"],
    ["Box", "", "Bx"], ["OneDrive", "", "Od"], ["SharePoint", "", "Sp"],
  ];
  return (
    <section className="lp-section" id="integrations">
      <div className="lp-container grid-2" style={{ display: "grid", gridTemplateColumns: "560px 1fr", gap: 80, alignItems: "center" }}>
        <div className="col gap-16">
          <span className="overline">Integrations</span>
          <h2 className="display-l">Fits the stack you already use</h2>
          <p className="body-l muted">Push engagement into your CRM, get alerts where you work, and import files from the cloud drives your team already lives in.</p>
          {["Two-way CRM sync with HubSpot, Salesforce and Pipedrive", "Live alerts in Slack, Teams and email", "Import from Google Drive, Dropbox, Box, OneDrive and SharePoint", "6,000+ apps through Zapier, plus a REST API and webhooks"].map((t) => (
            <div key={t} className="row gap-12 body-m"><CheckCircle2 size={20} color="#4D94F7" />{t}</div>
          ))}
          <div><Link href="/signup" className="btn btn-secondary">See all integrations</Link></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 100px)", gap: 16 }}>
          {apps.map(([n, c, ab]) => (
            <div className="int-tile" key={n}>
              <span className="int-logo" style={c ? { color: c } : { border: "1.5px dashed var(--dz-border-strong)", color: "var(--dz-text-tertiary)" }}>{ab}</span>
              <span className="micro muted">{n}</span>
            </div>
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
      <div className="lp-head"><span className="overline" style={{ color: "#9ca3af" }}>Security</span><h2 className="display-l">Enterprise-grade by default</h2><p className="body-l" style={{ color: "#9ca3af" }}>Your documents stay yours — locked down, logged, and revocable at any moment.</p></div>
      <div className="lp-container grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
        {items.map(([I, t, b]) => <div className="sec-card" key={t}><I size={22} /><div className="h3">{t}</div><p className="caption" style={{ color: "#9ca3af" }}>{b}</p></div>)}
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="lp-section" id="pricing" style={{ background: "var(--dz-bg-subtle)" }}>
      <div className="lp-head"><span className="overline">Pricing</span><h2 className="display-l">Simple pricing that scales with you</h2><p className="body-l muted">Start free for 14 days on any plan. No credit card required.</p></div>
      <div className="lp-container">
        <PricingCards cta={(id) => <Link href={`/signup?plan=${id}`} className="btn btn-block btn-primary">{id === "datarooms" ? "Start free trial" : "Select plan"}</Link>} />
        <p className="row gap-8 muted" style={{ justifyContent: "center", marginTop: 56 }}><Info size={16} />Need SSO, custom contracts or 50+ seats? <a href={DEMO} style={{ textDecoration: "underline" }}>Talk to sales about Enterprise.</a></p>
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Product", [["Analytics", "#product"], ["Data rooms", "#data-rooms"], ["Ask Dozzier", "#ai"], ["eSign", "#product"], ["Integrations", "#integrations"], ["Pricing", "#pricing"]]],
    ["Resources", [["Docs", "#faq"], ["API reference", "#integrations"], ["Changelog", "#"], ["Status", "#"], ["Help center", "#faq"]]],
    ["Company", [["About", "#"], ["Careers", "#"], ["Blog", "#"], ["Contact", "mailto:hello@dozzier.io"]]],
    ["Legal", [["Privacy", "#"], ["Terms", "#"], ["Security", "#"], ["DPA", "#"]]],
  ];
  return (
    <footer className="footer">
      <div className="lp-container">
        <div className="footer-cols">
          <div><Logo height={36} /><p className="muted" style={{ marginTop: 16, maxWidth: 300 }}>Secure document sharing with analytics that tell you what to do next.</p></div>
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
        <div className="lp-head" style={{ marginBottom: 32 }}><span className="overline">FAQ</span><h2 className="display-l">Questions, answered</h2></div>
        <Faq />
      </section>
      <section style={{ padding: "0 24px 96px" }}>
        <div className="lp-container cta-box">
          <span style={{ width: 80, height: 80, borderRadius: 999, background: "#fff", border: "1px solid var(--dz-border-default)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><AppIcon size={48} /></span>
          <h2 className="display-l">Stop guessing. Start knowing.</h2>
          <p className="body-l" style={{ opacity: 0.85 }}>Send your first tracked link in under two minutes.</p>
          <div className="row gap-12"><Link href="/signup" className="btn btn-secondary btn-l">Start free trial</Link><a href={DEMO} className="btn btn-dark btn-l">Book a demo</a></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
