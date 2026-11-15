"use client";
import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { SettingsHead, useSetting } from "@/components/settings/kit";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Modal, toast, useLoad } from "@/components/ui";

type Hook = "slack" | "teams" | "zapier";
/** Apps that work today through an incoming webhook, with how to get one. */
const HOOKS: Record<string, { kind: Hook; how: string; help: string; placeholder: string }> = {
  Slack: { kind: "slack", placeholder: "https://hooks.slack.com/services/…", help: "https://api.slack.com/messaging/webhooks",
    how: "In Slack, create an app (or use an existing one), turn on Incoming Webhooks, add a webhook to the channel you want, then paste its URL here." },
  Teams: { kind: "teams", placeholder: "https://….webhook.office.com/… or a Workflows URL", help: "https://support.microsoft.com/office/create-incoming-webhooks-with-workflows-for-microsoft-teams-8ae491c7-0394-4861-ba59-055e33f75498",
    how: "In the Teams channel, open Workflows → “Post to a channel when a webhook request is received”, finish the setup, then paste the URL it gives you." },
  Zapier: { kind: "zapier", placeholder: "https://hooks.zapier.com/hooks/catch/…", help: "https://zapier.com/apps/webhook/integrations",
    how: "In Zapier, start a Zap with “Webhooks by Zapier → Catch Hook”, copy the URL, paste it here, then send a test so Zapier can see the fields." },
};
const APPS: [string, string, string][] = [
  ["Slack", "Messaging", "Live “viewing now” alerts, questions and signatures in any channel."],
  ["Teams", "Messaging", "Visit alerts, questions and signatures in a Microsoft Teams channel."],
  ["Zapier", "Developer", "Send every Dozzier event to 6,000+ apps."],
  ["HubSpot", "CRM", "Sync visits, intent scores and Copilot summaries to contacts and deals."],
  ["Salesforce", "CRM", "Log engagement as activities; create leads from new visitors."],
  ["Pipedrive", "CRM", "Attach document engagement to deals and people."],
  ["Gmail", "Email", "Share tracked links straight from your inbox."],
  ["Outlook", "Email", "Insert tracked links from Outlook on web and desktop."],
  ["Zoom", "Messaging", "See who read your deck before the meeting starts."],
  ["Google Drive", "Storage", "Import files and keep them in sync."],
  ["Dropbox", "Storage", "Import files from Dropbox folders."],
  ["Box", "Storage", "Import files from Box."],
  ["OneDrive", "Storage", "Import files from OneDrive."],
  ["SharePoint", "Storage", "Import files from SharePoint sites."],
  ["Notion", "Storage", "Share Notion pages as tracked documents."],
];
const CATS = ["All", "CRM", "Messaging", "Email", "Storage", "Developer"];

export default function Integrations() {
  const { role } = useApp();
  const admin = role === "Owner" || role === "Admin";
  const [cat, setCat] = useState("All");
  const s = useSetting<string[]>("integration_requests", []);
  const req = s.value || [];
  const { data: hooks, reload } = useLoad(async () => {
    const { data } = await supabase.from("integrations").select("kind,url");
    return Object.fromEntries((data || []).map((r) => [r.kind, r.url as string])) as Partial<Record<Hook, string>>;
  }, []);
  const [open, setOpen] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(n: string) {
    const next = [...req, n];
    s.update(next);
    await s.save(undefined, `Early access requested for ${n}`, next);
  }
  async function test(kind: Hook) {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/integrations/test", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ kind }) });
    const j = await r.json().catch(() => ({}));
    toast(r.ok ? "Test message sent — check the channel" : (j as { error?: string }).error || "Test failed");
  }
  async function connect(n: string) {
    const h = HOOKS[n];
    setBusy(true);
    const { error } = await supabase.from("integrations").upsert({ kind: h.kind, url: url.trim() }, { onConflict: "owner_id,kind" });
    setBusy(false);
    if (error) return toast(error.message.includes("check") ? `That doesn’t look like a ${n} webhook URL` : error.message);
    setOpen(null); setUrl(""); await reload(); toast(`${n} connected`); test(h.kind);
  }
  async function disconnect(n: string) {
    await supabase.from("integrations").delete().eq("kind", HOOKS[n].kind);
    reload(); toast(`${n} disconnected`);
  }

  const cur = open ? HOOKS[open] : null;
  return (
    <>
      <SettingsHead title="Integrations" sub="Connect the tools your team already uses. Slack, Teams and Zapier work today; request early access to the rest." />
      <div className="row gap-8 wrap">{CATS.map((c) => <button key={c} className={`pill-opt ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="int-cards" key={cat}>
        {APPS.filter(([, c]) => cat === "All" || c === cat).map(([n, c, d], i) => {
          const h = HOOKS[n]; const on = h && hooks?.[h.kind];
          return (
            <div key={n} className="set-card int-card" style={{ animationDelay: `${i * 35}ms` }}>
              <div className="row gap-12"><AppLogo name={n} size={40} /><div className="col grow"><span className="medium">{n}</span><span className="caption muted">{c}</span></div>
                {on ? <span className="badge badge-success"><Check size={11} />Connected</span> : !h && req.includes(n) && <span className="badge badge-brand"><Check size={11} />Requested</span>}</div>
              <p className="caption muted" style={{ fontSize: 14, lineHeight: "20px" }}>{d}</p>
              <div className="row gap-8">
                {h ? (on ? <>
                  <button className="btn btn-secondary btn-s" onClick={() => test(h.kind)}>Send test</button>
                  {admin && <button className="btn btn-ghost btn-s" onClick={() => disconnect(n)}>Disconnect</button>}
                </> : <button className="btn btn-brand btn-s" disabled={!admin} title={admin ? undefined : "Ask a workspace admin to connect this"} onClick={() => { setOpen(n); setUrl(""); }}>Connect</button>)
                  : req.includes(n) ? <button className="btn btn-outline btn-s" disabled>Requested</button> : <button className="btn btn-brand btn-s" onClick={() => request(n)}>Request access</button>}
              </div>
            </div>
          );
        })}
      </div>
      {open && cur && (
        <Modal title={`Connect ${open}`} onClose={() => setOpen(null)} width={520}
          footer={<><a className="btn btn-ghost" href={cur.help} target="_blank" rel="noreferrer"><ExternalLink size={14} />How to get a URL</a><span className="grow" /><button className="btn btn-ghost" onClick={() => setOpen(null)}>Cancel</button><button className="btn btn-brand" disabled={busy || !url.trim()} onClick={() => connect(open)}>{busy ? "Connecting…" : "Connect"}</button></>}>
          <div className="col gap-12">
            <p className="muted">{cur.how}</p>
            <label className="field"><span className="label">Webhook URL</span><input className="input" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder={cur.placeholder} /></label>
            {cur.kind !== "zapier" && <p className="caption muted">Choose which events post here in Settings → Notifications (the Slack / Teams column).</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
