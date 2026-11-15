"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { SettingsHead, useSetting } from "@/components/settings/kit";

const APPS: [string, string, string][] = [
  ["HubSpot", "CRM", "Sync visits, intent scores and Copilot summaries to contacts and deals."],
  ["Salesforce", "CRM", "Log engagement as activities; create leads from new visitors."],
  ["Pipedrive", "CRM", "Attach document engagement to deals and people."],
  ["Slack", "Messaging", "Live “viewing now” alerts and Q&A replies in any channel."],
  ["Teams", "Messaging", "Visit alerts and daily digests in Microsoft Teams."],
  ["Gmail", "Email", "Share tracked links straight from your inbox."],
  ["Outlook", "Email", "Insert tracked links from Outlook on web and desktop."],
  ["Zoom", "Messaging", "See who read your deck before the meeting starts."],
  ["Google Drive", "Storage", "Import files and keep them in sync."],
  ["Dropbox", "Storage", "Import files from Dropbox folders."],
  ["Box", "Storage", "Import files from Box."],
  ["OneDrive", "Storage", "Import files from OneDrive."],
  ["SharePoint", "Storage", "Import files from SharePoint sites."],
  ["Notion", "Storage", "Share Notion pages as tracked documents."],
  ["Zapier", "Developer", "Connect Dozzier events to 6,000+ apps."],
];
const CATS = ["All", "CRM", "Messaging", "Email", "Storage", "Developer"];

export default function Integrations() {
  const [cat, setCat] = useState("All");
  const s = useSetting<string[]>("integration_requests", []);
  const req = s.value || [];
  async function request(n: string) {
    const next = [...req, n];
    s.update(next);
    await s.save(undefined, `Early access requested for ${n}`, next);
  }
  return (
    <>
      <SettingsHead title="Integrations" sub="Connect the tools your team already uses. Integrations are in early access — request the ones you need." />
      <div className="row gap-8 wrap">{CATS.map((c) => <button key={c} className={`pill-opt ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="int-cards" key={cat}>
        {APPS.filter(([, c]) => cat === "All" || c === cat).map(([n, c, d], i) => (
          <div key={n} className="set-card int-card" style={{ animationDelay: `${i * 35}ms` }}>
            <div className="row gap-12"><AppLogo name={n} size={40} /><div className="col grow"><span className="medium">{n}</span><span className="caption muted">{c}</span></div>
              {req.includes(n) && <span className="badge badge-brand"><Check size={11} />Requested</span>}</div>
            <p className="caption muted" style={{ fontSize: 14, lineHeight: "20px" }}>{d}</p>
            <div>{req.includes(n) ? <button className="btn btn-outline btn-s" disabled>Requested</button> : <button className="btn btn-brand btn-s" onClick={() => request(n)}>Request access</button>}</div>
          </div>
        ))}
      </div>
    </>
  );
}
