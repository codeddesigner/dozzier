"use client";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, KeyRound, Webhook, Plus, Trash2 } from "lucide-react";
import { Modal, toast } from "@/components/ui";
import { Card, SettingsHead, useSetting } from "@/components/settings/kit";

type Hook = { url: string; events: string[] };
type A = { requested: boolean; webhooks: Hook[] };
const EVENTS = ["visit.started", "visit.ended", "link.created", "agreement.signed", "file_request.uploaded"];

export default function ApiWebhooks() {
  const s = useSetting<A>("api", { requested: false, webhooks: [] });
  const v: A = Object.assign({ requested: false, webhooks: [] as Hook[] }, s.value);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [ev, setEv] = useState<string[]>(["visit.started"]);
  async function requestAccess() { const next = { ...v, requested: true }; s.update(next); await s.save(undefined, "API access requested", next); }
  async function addHook() {
    if (!/^https:\/\/\S+\.\S+/.test(url)) return toast("Use an https:// URL");
    const next = { ...v, webhooks: [...v.webhooks, { url: url.trim(), events: ev }] };
    s.update(next); await s.save(undefined, "Endpoint saved", next); setOpen(false); setUrl("");
  }
  async function removeHook(i: number) { const next = { ...v, webhooks: v.webhooks.filter((_, j) => j !== i) }; s.update(next); await s.save(undefined, "Endpoint removed", next); }
  return (
    <>
      <SettingsHead title="API & webhooks" sub="Build on Dozzier." action={<Link href="/docs/api" target="_blank" className="btn btn-secondary"><ExternalLink size={14} />API docs</Link>} />
      <Card title="API keys">
        <div className="row gap-12">
          <span className="set-row-ico"><KeyRound size={16} /></span>
          <div className="grow"><div className="medium">The Dozzier API is in private beta</div><div className="caption muted">Request access and we’ll enable secret keys for this workspace.</div></div>
          {v.requested ? <span className="badge badge-brand">Requested</span> : <button className="btn btn-primary btn-s" onClick={requestAccess}>Request access</button>}
        </div>
      </Card>
      <Card title="Webhooks" sub="We’ll POST JSON to these endpoints when events happen. Deliveries start when your API access is enabled.">
        {v.webhooks.length === 0 && <p className="caption muted">No endpoints yet.</p>}
        {v.webhooks.map((h, i) => (
          <div className="set-row" key={h.url + i}>
            <span className="set-row-ico"><Webhook size={16} /></span>
            <div className="grow" style={{ minWidth: 0 }}><div className="medium ellipsis">{h.url}</div><div className="row gap-6 wrap" style={{ marginTop: 4 }}>{h.events.map((e) => <span className="tag" key={e}>{e}</span>)}</div></div>
            <span className="badge badge-muted">Waiting for access</span>
            <button className="icon-btn s" aria-label="Remove endpoint" onClick={() => removeHook(i)}><Trash2 size={14} /></button>
          </div>
        ))}
        <div><button className="btn btn-secondary btn-s" onClick={() => setOpen(true)}><Plus size={14} />Add endpoint</button></div>
      </Card>
      {open && (
        <Modal title="Add webhook endpoint" onClose={() => setOpen(false)} width={480} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={addHook}>Add endpoint</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Endpoint URL</span><input className="input" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.yourcompany.com/dozzier" /></label>
            <div className="field"><span className="label">Events</span>{EVENTS.map((e) => <label key={e} className="checkbox"><input type="checkbox" checked={ev.includes(e)} onChange={() => setEv((x) => x.includes(e) ? x.filter((y) => y !== e) : [...x, e])} /><code>{e}</code></label>)}</div>
          </div>
        </Modal>
      )}
    </>
  );
}
