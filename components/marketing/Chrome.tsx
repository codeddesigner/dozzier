import Link from "next/link";
import { Check, CheckCircle2, AtSign, Mail, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo, FooterLogo, LogoMark } from "@/components/Logo";
import { MobileMenu } from "@/components/LandingMobile";

export const DEMO = "/talk-to-sales";

export const SITE_LINKS: [string, string][] = [
  ["Product", "/product"], ["Data rooms", "/data-rooms"], ["Security", "/security"],
  ["Integrations", "/integrations"], ["Pricing", "/pricing"], ["Docs", "/docs"],
];

/** Announcement bar + top nav shared by every marketing page. Figma: logo 131 × 24. */
export function SiteNav({ active }: { active?: string }) {
  return (
    <header className="lp-nav">
      <Link href="/docs/mcp" className="announce-bar"><span className="announce-check d-only"><Check size={14} strokeWidth={2.5} /></span><span className="d-only">New: Bring your Dozzier data into Claude, ChatGPT and Cursor with MCP</span><span className="m-only">New: Dozzier works with Claude via MCP</span>&nbsp;&nbsp;<span className="arrow">→</span></Link>
      <div className="lp-nav-inner">
        <Link href="/" aria-label="Dozzier home"><Logo height={24} /></Link>
        <nav className="lp-links">
          {SITE_LINKS.map(([l, h]) => <Link key={h} href={h} className={active === h ? "on" : undefined} aria-current={active === h ? "page" : undefined}>{l}</Link>)}
        </nav>
        <div className="spacer" />
        <Link href="/login" className="btn btn-ghost d-only">Log in</Link>
        <Link href={DEMO} className="btn btn-secondary btn-xs-shadow d-only">Talk to Sales</Link>
        <Link href="/signup" className="btn btn-dark lp-try">Try for free</Link>
        <MobileMenu />
      </div>
    </header>
  );
}

export function SiteCta() {
  return (
    <section className="cta-wrap">
      <div className="lp-container cta-box" data-reveal="scale">
        <span className="cta-icon"><LogoMark size={28} color="#fff" /></span>
        <h2 className="display-l">Stop guessing. Start knowing.</h2>
        <p className="body-l" style={{ opacity: 0.85, marginTop: 0 }}>Send your first tracked link in under two minutes.</p>
        <div className="row gap-12 cta-btns"><Link href="/signup" className="btn btn-secondary btn-xs-shadow">Start free trial</Link><Link href={DEMO} className="btn btn-dark">Book a demo</Link></div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const cols: [string, [string, string][]][] = [
    ["Product", [["Analytics", "/product"], ["Data rooms", "/data-rooms"], ["MCP server", "/docs/mcp"], ["eSign", "/esign"], ["Integrations", "/integrations"], ["Pricing", "/pricing"]]],
    ["Resources", [["Docs", "/docs"], ["API reference", "/docs/api"], ["Changelog", "/docs/changelog"], ["Status", "/docs/contact#status"], ["Help center", "/docs"]]],
    ["Company", [["About", "/product"], ["Careers", "mailto:careers@dozzier.io"], ["Blog", "/docs/changelog"], ["Contact", "/talk-to-sales"]]],
    ["Legal", [["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"], ["Security", "/security"], ["DPA", "/legal/dpa"]]],
  ];
  return (
    <footer className="footer">
      <div className="lp-container">
        <div className="footer-cols" data-stagger="70">
          <div><FooterLogo height={36} /><p className="muted" style={{ marginTop: 16, maxWidth: 300 }}>Secure document sharing with analytics that tell you what to do next.</p></div>
          {cols.map(([h, ls]) => <div key={h}><div className="semibold">{h}</div>{ls.map(([l, href]) => <Link key={l} href={href}>{l}</Link>)}</div>)}
        </div>
        <div className="row footer-bottom" style={{ borderTop: "1px solid var(--dz-border-subtle)", marginTop: 48, paddingTop: 24 }}>
          <span className="caption faint grow">© 2026 Dozzier, Inc. · dozzier.io</span>
          <div className="row gap-16 muted footer-icons"><AtSign size={18} /><Mail size={18} /><Globe size={18} /></div>
        </div>
      </div>
    </footer>
  );
}

/** Figma "Page hero": pill, 60px title, subtitle, lime + muted buttons. */
export function PageHero({ pill, title, sub, ctas = true, children }: { pill: string; title: React.ReactNode; sub: string; ctas?: boolean; children?: React.ReactNode }) {
  return (
    <section className="mk-hero">
      <span className="mk-pill h-in">{pill}</span>
      <h1 className="mk-h1 h-in" style={{ animationDelay: ".08s" }}>{title}</h1>
      <p className="mk-sub h-in" style={{ animationDelay: ".16s" }}>{sub}</p>
      {ctas && <div className="row gap-12 wrap h-in mk-ctas" style={{ animationDelay: ".24s" }}><Link href="/signup" className="btn btn-lime btn-l">Try for free</Link><Link href={DEMO} className="btn btn-secondary btn-l">Talk to sales</Link></div>}
      {children}
    </section>
  );
}

/** Text column + visual, alternating sides. */
export function FeatureRow({ id, overline, title, body, points, flip, tint, children }: { id?: string; overline: string; title: string; body: string; points: string[]; flip?: boolean; tint?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`mk-row ${flip ? "flip" : ""}`} style={tint ? { background: "var(--dz-bg-subtle)" } : undefined}>
      <div className="mk-row-in">
        <div className="mk-row-text" data-stagger="80">
          <span className="overline">{overline}</span>
          <h2 className="mk-h2">{title}</h2>
          <p className="body-m muted">{body}</p>
          <div className="col gap-10">{points.map((p) => <div key={p} className="row gap-10 mk-point"><CheckCircle2 size={20} color="#4D94F7" />{p}</div>)}</div>
        </div>
        <div className="mk-visual" data-reveal>{children}</div>
      </div>
    </section>
  );
}

export type Card = [LucideIcon, string, string];

/** Section heading + grid of icon cards. */
export function CardGrid({ overline, title, cards, cols = 3, tint = true }: { overline: string; title: string; cards: Card[]; cols?: 2 | 3; tint?: boolean }) {
  return (
    <section className="mk-grid-sec" style={tint ? undefined : { background: "#fff" }}>
      <div className="mk-sec-head" data-stagger="80"><span className="overline">{overline}</span><h2 className="mk-h2l">{title}</h2></div>
      <div className={`mk-cards c${cols}`} data-stagger="70">
        {cards.map(([I, t, b]) => (
          <div key={t} className="mk-card spotlight"><span className="mk-ico"><I size={22} /></span><div className="mk-card-t">{t}</div><p className="mk-card-b">{b}</p></div>
        ))}
      </div>
    </section>
  );
}
