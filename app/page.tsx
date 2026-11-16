import Link from "next/link";
import {
  Upload, Link2, Sparkles, MessageSquareText, Signature, History, Kanban, CheckCircle2, Lock, KeyRound, Globe, ShieldCheck,
  Info, AtSign, Mail, User, Settings2, BarChart3, Users, Files, TrendingUp, FileCheck2, Palette, Puzzle, HousePlus, List, CircleCheck,
  Image as ImageIcon, Search, Check, Play, Zap, Bell, CircleHelp, Calendar, ChevronDown, Flame, Eye, Download as DownloadIcon, Clock3, Mail as MailIcon,
} from "lucide-react";
import { Logo, AppIcon, FooterLogo } from "@/components/Logo";
import { Faq } from "@/components/Faq";
import { PageBars } from "@/components/charts";
import { NAV_GROUPS } from "@/components/nav";
import { LogoMark } from "@/components/Logo";
import { LandingPricing } from "@/components/LandingMobile";
import { SiteNav, SiteCta, SiteFooter, DEMO } from "@/components/marketing/Chrome";
import { ProductShot, SecurityBento, AiCardBody } from "@/components/marketing/Mocks";
import { Avatar } from "@/components/ui";
import { AppLogo, INTEGRATIONS } from "@/components/AppLogo";
import { WordReveal, TypeText, CountUp } from "@/components/Motion";
import { HeroLiveAlert, IntentScore, MockKpis, MockRows, LiveFeed, LinkSettingsLive } from "@/components/LandingMotion";




function Hero() {
  return (
    <section className="hero" id="product">
      <Link href="/signup" className="announce h-in"><span className="badge badge-brand">New</span><span className="d-only">Dozzier MCP — your deal data in Claude and Cursor</span><span className="m-only">Dozzier MCP for Claude &amp; Cursor</span> <span className="arrow">→</span></Link>
      <h1 className="display-xl hero-title"><WordReveal text="The secure platform to share, track, and move business forward." delay={80} /></h1>
      <p className="body-l muted h-in d-only" style={{ maxWidth: 732, animationDelay: ".45s" }}>
        Dozzier turns every deck, proposal and data room into a secure link with page-by-page analytics, live alerts and timely follow-ups — so you know who’s interested and exactly what to do next.
      </p>
      <p className="body-m muted h-in m-only hero-sub-m" style={{ animationDelay: ".45s" }}>Turn every deck, proposal and data room into a secure link with page-by-page analytics, live alerts and timely follow-ups.</p>
      <div className="row gap-12 wrap h-in hero-ctas" style={{ justifyContent: "center", animationDelay: ".6s" }}>
        <Link href="/signup" className="btn btn-lime btn-l">Try for free</Link>
        <a href="#how-it-works" className="btn btn-ghost btn-l"><Play size={18} />See how it works (1:00)</a>
      </div>
      <p className="caption faint m-only hero-trial">14-day free trial · Set up in 2 minutes</p>
      <div className="hero-explore h-in d-only" style={{ animationDelay: ".72s" }}>
        <span>Explore:</span>
        <Link href="/product"><TrendingUp size={18} />Analytics</Link>
        <Link href="/data-rooms"><HousePlus size={18} />Data rooms</Link>
        <Link href="/security"><Lock size={18} />Security</Link>
      </div>
      <div className="hero-peek m-only">
        <div className="peek-alert"><span className="avatar" style={{ width: 20, height: 20, fontSize: 8, background: "#3b8bff" }}>Pa</span><div className="col grow" style={{ minWidth: 0 }}><span className="semibold">Paul is viewing your deck</span><span className="caption" style={{ color: "var(--dz-text-secondary)" }}>Pitch deck · page 7 of 18 · 4m 12s</span></div><span className="badge badge-success"><span className="dot" />Live</span></div>
        <div className="peek-kpis">{[["Total visits", "128", "↑ 24%"], ["Visitors", "46", "↑ 12%"]].map(([l, v, d]) => (
          <div className="peek-kpi" key={l}><span className="peek-kpi-l">{l}</span><div className="peek-kpi-v"><span>{v}</span><span className="row gap-6"><span className="peek-delta">{d}</span><span className="caption faint">vs last 30 days</span></span></div></div>
        ))}</div>
        <div className="ai-card peek-ai"><AiCardBody title="Paul is ready for a follow-up" body="Spent 6 min on pricing and forwarded to 2 partners." brand /></div>
      </div>
      <ProductShot />
    </section>
  );
}


function Logos() {
  const items: [string, React.CSSProperties][] = [
    ["northwind", { fontSize: 24, fontWeight: 700, letterSpacing: "-0.96px" }], ["Halcyon Capital", { fontSize: 20, fontWeight: 500 }],
    ["LUMEN BIO", { fontSize: 18, fontWeight: 500, letterSpacing: "3.24px" }], ["arcadia", { fontSize: 24, fontWeight: 500, letterSpacing: "-0.48px" }],
    ["Foundry & Co.", { fontSize: 22, fontWeight: 400, letterSpacing: "-0.22px" }], ["KESTREL", { fontSize: 20, fontWeight: 700, letterSpacing: "4px" }],
  ];
  return (
    <section className="logo-strip" id="customers">
      <p className="medium" data-reveal>Trusted by founders, sales teams and dealmakers at <CountUp to={4000} duration={1800} />+ companies</p>
      <div className="logo-row" data-stagger="70">{items.map(([n, s]) => <span key={n} style={s}>{n}</span>)}</div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    [Upload, "Upload anything", "Drop in PDFs, decks, videos or whole folders. Dozzier scans for sensitive data and suggests the right link settings."],
    [Link2, "Share a smart link", "Require email, add a passcode or NDA, set expiry and watermark — per recipient, or in bulk from your CRM."],
    [Sparkles, "Act on real intent", "See every page view in real time, get an intent score per account, and follow up while they’re still reading."],
  ] as const;
  return (
    <section className="lp-section" id="how-it-works">
      <div className="lp-head" data-stagger="90"><span className="overline">How it works</span><h2 className="display-l">From upload to “yes” in three steps</h2></div>
      <div className="lp-container grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }} data-stagger="140">
        {steps.map(([Icon, t, b], i) => (
          <div className="step-card spotlight" key={t}>
            <div className="row step-top"><span className="icon-tile"><Icon size={22} /></span><span className="spacer" /><span className="h2 step-num" style={{ color: "var(--dz-text-disabled)" }}>0{i + 1}</span></div>
            <div className="h2">{t}</div>
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
          <div className="feature-card spotlight" id="product-analytics">
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
          <div className="feature-card spotlight" id="mcp">
            <span className="overline">MCP</span><div className="h1">Your deal data in Claude and Cursor</div>
            <p className="body-m muted">Connect Dozzier’s MCP server and ask your AI tools who read what, or have them create tracked links for you.</p>
            <div className="mcp-card mt-16">
              <div className="mcp-q">Which investors read the financials this week?</div>
              <div className="mcp-tool"><code>dozzier · get_document_analytics</code><span className="badge badge-success">done</span></div>
              <div className="mcp-a">Acme, Northwind and Kestrel each spent 4+ min on pages 12–14 of the Series A deck.</div>
            </div>
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
            <div key={t} className="row gap-12 body-m int-point"><CheckCircle2 size={20} color="#4D94F7" />{t}</div>
          ))}
          <div><Link href="/integrations" className="btn btn-secondary">See all integrations</Link></div>
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


function Pricing() {
  return (
    <section className="lp-section" id="pricing" style={{ background: "var(--dz-bg-subtle)" }}>
      <div className="lp-head" data-stagger="90"><span className="overline">Pricing</span><h2 className="display-l">Simple pricing that scales with you</h2><p className="body-l muted"><span className="d-only">Start free for 14 days on any plan. No credit card required.</span><span className="m-only">14-day free trial on every plan. No card required.</span></p></div>
      <div className="lp-container" data-reveal>
        <LandingPricing />
        <p className="row gap-8 muted" style={{ justifyContent: "center", marginTop: 56 }}><Info size={16} />Need SSO, custom contracts or 50+ seats? <a href={DEMO} style={{ textDecoration: "underline" }}>Talk to sales about Enterprise.</a></p>
      </div>
    </section>
  );
}


export default function Landing() {
  return (
    <main>
      <SiteNav />
      <Hero />
      <Logos />
      <HowItWorks />
      <Features />
      <Integrations />
      <SecurityBento />
      <Pricing />
      <section className="lp-section" id="faq">
        <div className="lp-head" style={{ marginBottom: 32 }} data-stagger="90"><span className="overline">FAQ</span><h2 className="display-l">Questions, answered</h2></div>
        <div data-reveal><Faq /></div>
      </section>
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
