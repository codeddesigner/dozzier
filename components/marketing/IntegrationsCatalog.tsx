"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Check } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

/** [name, label, category, blurb, live today] */
const APPS: [string, string, string, string, boolean][] = [
  ["HubSpot", "HubSpot", "CRM", "Sync visits and intent scores to contacts and deals.", false],
  ["Salesforce", "Salesforce", "CRM", "Log engagement as activities and create leads from new visitors.", false],
  ["Pipedrive", "Pipedrive", "CRM", "Push hot accounts into your pipeline automatically.", false],
  ["Slack", "Slack", "Messaging", "Live “viewing now” alerts, questions and signatures in any channel.", true],
  ["Teams", "Microsoft Teams", "Messaging", "Visit alerts, questions and signatures in a Teams channel.", true],
  ["Gmail", "Gmail", "Email", "Insert tracked links straight from your inbox.", false],
  ["Outlook", "Outlook", "Email", "Share tracked links straight from Outlook.", false],
  ["Google Drive", "Google Drive", "Storage", "Import files and keep them in sync.", false],
  ["Dropbox", "Dropbox", "Storage", "Import folders and keep versions in sync.", false],
  ["Zapier", "Zapier", "Automation", "Trigger 6,000+ apps on visits, signatures and uploads.", true],
  ["Zoom", "Zoom", "Messaging", "See who read your deck before the meeting starts.", false],
  ["Notion", "Notion", "Storage", "Share Notion pages as tracked documents.", false],
];
const CATS = ["All", "CRM", "Messaging", "Email", "Storage", "Automation"];

export function IntegrationsCatalog() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const list = APPS.filter(([n, l, c, d]) => (cat === "All" || c === cat) && `${n} ${l} ${c} ${d}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section className="mk-int">
      <div className="mk-int-bar">
        <label className="mk-search"><Search size={16} /><input placeholder="Search integrations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search integrations" /></label>
        <div className="row gap-8 wrap">{CATS.map((c) => <button key={c} className={`mk-chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      </div>
      <div className="mk-int-grid" key={cat + q}>
        {list.map(([n, l, c, d, live], i) => (
          <div key={n} className="mk-app cycle-item" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="row gap-12"><AppLogo name={n} size={36} /><div className="col grow"><span className="medium">{l}</span><span className="caption muted">{c}</span></div>
              {live ? <span className="badge badge-success"><Check size={11} />Available</span> : <span className="badge badge-muted">Early access</span>}</div>
            <p className="caption muted" style={{ fontSize: 14, lineHeight: "20px", margin: 0 }}>{d}</p>
            <div><Link href="/app/settings/integrations" className={`btn btn-s ${live ? "btn-dark" : "btn-outline"}`}>{live ? "Connect" : "Request access"}</Link></div>
          </div>
        ))}
        {!list.length && <p className="muted">No integrations match “{q}”. <Link className="link" href="/talk-to-sales">Tell us what you need.</Link></p>}
      </div>
    </section>
  );
}
