import type { Metadata } from "next";
import { Signature, BadgeCheck, FileInput, AlarmClock, HousePlus, Bell, Upload, FileText } from "lucide-react";
import { SiteNav, SiteCta, SiteFooter, PageHero, CardGrid } from "@/components/marketing/Chrome";

export const metadata: Metadata = { title: "eSign & file requests | Dozzier", description: "Send NDAs and agreements for signature and collect files from anyone — without another tool or another login." };

export default function ESign() {
  return (
    <main>
      <SiteNav />
      <PageHero pill="eSign & file requests" title="Get it signed. Get it back." sub="Send NDAs and agreements for signature and collect files from anyone — without another tool or another login." />
      <div className="mk-panel">
        <div className="mk-esign" data-reveal>
          <div className="mk-nda">
            <span className="overline" style={{ color: "var(--dz-text-tertiary)" }}>Mutual non-disclosure agreement</span>
            <p>This Agreement is entered into by Thiscompany and the Recipient for the purpose of evaluating a potential investment.</p>
            <p>1. Confidential Information includes all non-public business, financial and technical information.</p>
            <p>2. The Recipient will use Confidential Information solely for the Purpose.</p>
            <div className="mk-sign"><span className="overline brand">Sign here</span><span className="mk-sig">Daniel</span></div>
          </div>
          <div className="mk-req">
            <span className="semibold">File request · Q3 financials</span>
            <span className="caption muted">From Stella · due Friday</span>
            <div className="mk-drop"><Upload size={16} /><span className="medium">Drop files to upload</span><span className="caption muted">No account needed</span></div>
            {["Q3 P&L.xlsx", "Balance sheet.pdf"].map((n) => <div key={n} className="row gap-8"><FileText size={15} className="faint" /><span className="grow">{n}</span><span className="badge badge-success">Uploaded</span></div>)}
          </div>
        </div>
      </div>
      <CardGrid overline="How it works" title="Paperwork without the chase" cards={[
        [Signature, "Legally binding eSign", "Drag signature, initials and date fields; set signing order."],
        [BadgeCheck, "Audit certificate", "Every signature comes with a tamper-proof completion certificate."],
        [FileInput, "Request files from anyone", "Recipients upload without an account; files land in the right folder."],
        [AlarmClock, "Auto-reminders", "Nudge signers and uploaders until it’s done."],
        [HousePlus, "Straight into data rooms", "Signed NDAs unlock the right Space automatically."],
        [Bell, "Know when it’s done", "Alerts the moment a document is signed or a file arrives."],
      ]} />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
