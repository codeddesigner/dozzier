import type { Metadata } from "next";
import { X, Copy, Mail, Download, KeyRound, CalendarClock, Eye, MessageSquareText, Forward, Zap, Clock3 } from "lucide-react";
import { SiteNav, SiteCta, SiteFooter, PageHero, FeatureRow } from "@/components/marketing/Chrome";
import { ProductShot } from "@/components/marketing/Mocks";
import { PageBars } from "@/components/charts";

export const metadata: Metadata = { title: "Product | Dozzier", description: "Share decks, proposals and reports as secure links, then follow every page, visitor and forward in real time." };

function LinkModal() {
  const rows: [typeof Mail, string, string, boolean][] = [
    [Mail, "Require email to view", "Visitors verify their email before the document opens.", true],
    [Download, "Allow downloads", "Let visitors download a PDF copy.", false],
    [KeyRound, "Require passcode", "Share a passcode separately for extra protection.", false],
    [CalendarClock, "Link expiration", "Disable this link on Dec 31, 2026 at 11:59 PM.", true],
  ];
  return (
    <div className="mk-modal">
      <div className="row"><span className="semibold grow">Create link</span><X size={16} className="faint" /></div>
      <div className="col gap-6"><span className="mk-lbl">Link name</span><span className="mk-input">Thiscompany — Series A</span></div>
      <div className="mk-url"><span className="grow">dozzier.co/v/thiscompany-series-a</span><Copy size={13} /></div>
      <div className="mk-tabs">{["Access", "Security", "Branding", "Notifications"].map((t, i) => <span key={t} className={i === 0 ? "on" : ""}>{t}</span>)}</div>
      {rows.map(([I, t, b, on]) => (
        <div key={t} className="mk-set"><span className="mk-set-ico"><I size={14} /></span><div className="col grow"><span className="medium">{t}</span><span className="caption muted">{b}</span></div><span className={`mk-tgl ${on ? "on" : ""}`}><i /></span></div>
      ))}
    </div>
  );
}

function Alerts() {
  const items: [string, string, string, boolean][] = [
    ["Pa", "Paul is viewing Series A Pitch Deck — page 11 of 18", "#8b5cf6", true],
    ["Da", "Daniel asked a question on page 8", "#8b5cf6", true],
    ["Da", "Your deck was forwarded to sarah@acmevc.com", "#8b5cf6", false],
  ];
  return (
    <div className="mk-alerts">
      {items.map(([a, t, c, unread]) => (
        <div key={t} className={`mk-alert ${unread ? "unread" : ""}`}>
          <span className="avatar" style={{ width: 28, height: 28, fontSize: 11, background: c }}>{a}</span>
          <div className="col grow" style={{ minWidth: 0 }}><span className="medium">{t}</span><span className="caption muted"><span className="mk-live">● Live</span> · Just now · Acme Ventures</span></div>
          {unread && <i className="mk-dot" />}
        </div>
      ))}
    </div>
  );
}

function Intelligence() {
  return (
    <div className="mk-intel">
      <div className="ai-card mk-intel-card">
        <div className="row gap-8 brand caption medium"><Zap size={16} />Suggested next step</div>
        <div className="h3">Acme is ready for a follow-up</div>
        <p className="muted" style={{ margin: 0 }}>Spent 6 min on pricing and forwarded to 2 partners.</p>
        <div className="row gap-8"><span className="btn btn-brand btn-s">Draft follow-up</span><span className="btn btn-ghost btn-s">View timeline</span></div>
      </div>
      <div className="mk-timeline">
        {([[Forward, "Forwarded to sarah@acmevc.com", "Forwarded by paul@acmevc.com · 2h ago"], [Clock3, "Spent 6m 4s on Financials.pdf", "Most time on page 4 · Pricing"], [Eye, "Opened Series A Deck", "Page 11 of 18 · yesterday"], [MessageSquareText, "Asked a question on page 8", "“What’s the burn after the raise?”"]] as const).map(([I, t, s]) => (
          <div key={t} className="row gap-10"><span className="mk-tl-ico"><I size={13} /></span><div className="col"><span className="medium">{t}</span><span className="caption muted">{s}</span></div></div>
        ))}
      </div>
    </div>
  );
}

export default function Product() {
  return (
    <main>
      <SiteNav active="/product" />
      <PageHero pill="Secure sharing & analytics" title={<>Share any document. See exactly<br className="d-only" /> what happens next.</>} sub="Send decks, proposals and reports as secure links, then follow every page, visitor and forward in real time." />
      <div className="mk-shot"><ProductShot /></div>
      <FeatureRow id="links" overline="Secure links" title="Control every link you send" body="Create a link per recipient with exactly the access you want — and change it anytime, even after it’s sent."
        points={["Email verification, passcodes and NDAs", "Expiry dates, download control and dynamic watermarks", "Allow/block lists by email or domain"]}>
        <LinkModal />
      </FeatureRow>
      <FeatureRow id="analytics" flip tint overline="Page-by-page analytics" title="Know which pages win the deal" body="See time spent on every page, by every visitor, across every version — with heatmaps that show where attention goes."
        points={["Per-page time and completion", "Per-visitor heatmaps and session timelines", "Compare engagement across versions"]}>
        <div className="mk-chart">
          <div className="row"><span className="semibold">Time spent per page</span><span className="spacer" /><span className="micro muted hide-sm">Avg. 01:12 per visit · 82% completion</span></div>
          <div className="mt-16"><PageBars values={[38, 52, 20, 64, 30, 24, 44, 18, 26, 8, 22, 12]} height={120} /></div>
        </div>
      </FeatureRow>
      <FeatureRow id="alerts" overline="Live alerts" title="Follow up while they’re still reading" body="Get notified the second someone opens your link — in the app, by email, in Slack or on your phone."
        points={["“Viewing now” alerts with the current page", "Forward and download notifications", "Daily digest of hot accounts"]}>
        <Alerts />
      </FeatureRow>
      <FeatureRow id="intelligence" flip tint overline="Visitor intelligence" title="Turn engagement into pipeline" body="Every visitor gets an intent score and a full timeline, rolled up by account — so you know who to call first."
        points={["Intent scores for people and accounts", "Suggested next steps based on the pages they read", "Send data to your CRM through Zapier, or ask Claude via MCP"]}>
        <Intelligence />
      </FeatureRow>
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
