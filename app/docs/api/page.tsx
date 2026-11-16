"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { ZAPIER_EVENTS } from "@/lib/docs";

const INTRO = [
  { id: "overview", title: "Overview" },
  { id: "connect-zapier", title: "Connect Zapier" },
  { id: "zap-ideas", title: "Zap ideas" },
  { id: "mcp", title: "AI tools (MCP)" },
];

/** Light JSON highlighting: keys blue-ish, strings green. */
function Hl({ text }: { text: string }) {
  const parts = text.split(/("(?:[^"\\]|\\.)*")/g);
  return <>{parts.map((p, i) => (p.startsWith('"') ? <span key={i} className={parts[i + 1]?.trimStart().startsWith(":") ? "tok-key" : "tok-str"}>{p}</span> : <span key={i}>{p}</span>))}</>;
}

const STEPS: [string, React.ReactNode][] = [
  ["Start a Zap", <>In Zapier, create a Zap and choose <b>Webhooks by Zapier → Catch Hook</b> as the trigger. Copy the webhook URL it gives you.</>],
  ["Paste it into Dozzier", <>In Dozzier, open <Link className="link" href="/app/settings/integrations">Settings → Integrations</Link>, click <b>Connect</b> on Zapier and paste the URL. Only workspace admins can do this.</>],
  ["Send a test", <>Dozzier sends a test event straight away. Back in Zapier, click <b>Test trigger</b> so it learns the fields.</>],
  ["Add your action", <>Pick any of Zapier’s 6,000+ apps — add a row to Google Sheets, update a HubSpot contact, post to a channel. Use a <b>Filter</b> step on <code>event</code> to act on one kind of event only.</>],
];
const IDEAS: [string, string][] = [
  ["Log every visit in Google Sheets", "Filter: event is open → Google Sheets: Create row with who, company, document and at."],
  ["Update your CRM when a deal room is opened", "Filter: event is open → HubSpot / Salesforce / Pipedrive: find contact by email, add a note."],
  ["Chase signed NDAs", "Filter: event is signed and completed is true → Gmail: send the next step to the signer."],
  ["Collect file-request uploads in one place", "Filter: event is upload → Google Drive / Dropbox: save a record, or notify finance."],
];

export default function Automations() {
  const [id, setId] = useState("overview");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (h) setId(h); };
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const ev = ZAPIER_EVENTS.find((e) => e.id === id);
  const sample = JSON.stringify(ev ? ev.example : ZAPIER_EVENTS[0].example, null, 2);

  return (
    <div className="api-shell">
      <aside className="doc-side">
        <div className="doc-side-group"><div className="doc-side-label">Automations</div>
          {INTRO.map((x) => <a key={x.id} href={`#${x.id}`} className={`doc-side-link ${id === x.id ? "on" : ""}`}>{x.title}</a>)}</div>
        <div className="doc-side-group"><div className="doc-side-label">Events</div>
          {ZAPIER_EVENTS.map((e) => <a key={e.id} href={`#${e.id}`} className={`doc-side-link ${id === e.id ? "on" : ""}`}>{e.title}</a>)}</div>
      </aside>
      <main className="api-main" key={id}>
        {ev ? (
          <>
            <code className="medium">event: &quot;{ev.event}&quot;</code>
            <h1 className="doc-title" style={{ marginTop: 12 }}>{ev.title}</h1>
            <p className="doc-p">{ev.desc}</p>
            <h2 className="h3" style={{ margin: "28px 0 14px" }}>Fields</h2>
            <div className="api-params">
              {ev.fields.map((f, i) => (
                <div key={f.name} className="api-param" style={{ ["--i" as string]: i }}>
                  <div><code className="medium">{f.name}</code></div>
                  <div className="muted">{f.desc}</div>
                </div>
              ))}
            </div>
          </>
        ) : id === "connect-zapier" ? (
          <>
            <h1 className="doc-title">Connect Zapier</h1>
            <p className="doc-p">Zapier is available on every plan. It takes about two minutes.</p>
            <ol className="col gap-16" style={{ paddingLeft: 20, marginTop: 20 }}>
              {STEPS.map(([t, b]) => <li key={t}><span className="medium">{t}.</span> <span className="muted">{b}</span></li>)}
            </ol>
            <p className="doc-p" style={{ marginTop: 24 }}>Every event below is sent to Zapier, whatever your Slack and email notification settings are. Quiet hours don’t apply to Zapier.</p>
          </>
        ) : id === "zap-ideas" ? (
          <>
            <h1 className="doc-title">Zap ideas</h1>
            <p className="doc-p">A few Zaps teams set up first. Each one starts with your Dozzier Catch Hook.</p>
            <div className="api-params" style={{ marginTop: 20 }}>
              {IDEAS.map(([t, b], i) => <div key={t} className="api-param" style={{ ["--i" as string]: i }}><div className="medium">{t}</div><div className="muted">{b}</div></div>)}
            </div>
          </>
        ) : id === "mcp" ? (
          <>
            <h1 className="doc-title">AI tools (MCP)</h1>
            <p className="doc-p">Want to ask questions instead of reacting to events? Dozzier’s MCP server lets Claude, ChatGPT and Cursor read your documents, links and visitor analytics, and create tracked links.</p>
            <p className="doc-p"><Link className="link" href="/docs/mcp">Set up MCP →</Link></p>
          </>
        ) : (
          <>
            <h1 className="doc-title">Automate Dozzier with Zapier</h1>
            <p className="doc-p">Dozzier sends an event to Zapier the moment something happens — a link is opened, a question is asked, a file is downloaded, an agreement is signed, a file lands in a request, or someone asks for something in a data room. From there you can send it to any of Zapier’s 6,000+ apps.</p>
            <p className="doc-p">Each event is a flat JSON object, so every field shows up in Zapier ready to map. Start with <a className="link" href="#connect-zapier">Connect Zapier</a>, then see the <a className="link" href="#open">events</a>.</p>
          </>
        )}
      </main>
      <aside className="api-code">
        <div className="row gap-16 api-tabs"><span className="on" style={{ fontSize: 13 }}>Example event</span>
          <span className="spacer" /><button aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(sample); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>
        <pre className="api-pre" key={id}><Hl text={sample} /></pre>
        <div className="api-resp-label">Sent as a POST to your Zapier Catch Hook URL</div>
      </aside>
    </div>
  );
}
