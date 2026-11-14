"use client";
import { useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Card, SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";

type T = { id: string; name: string; subject: string; body: string; used: number };
type E = { templates: T[]; signature: string };
const DEFAULT: E = {
  templates: [
    { id: "intro", name: "Investor intro", used: 0, subject: "{{company}} × Randombase — our Series A deck", body: "Hi {{first_name}},\n\nThanks for the time today. Here’s our deck, tailored for {{company}}: {{link}}\n\nIt’s private to you — feel free to forward to your partners.\n\n{{signature}}" },
    { id: "follow", name: "Follow-up after view", used: 0, subject: "Following up on {{document}}", body: "Hi {{first_name}},\n\nSaw you had a look at {{document}} — happy to walk through anything on a quick call.\n\n{{signature}}" },
    { id: "room", name: "Data room invite", used: 0, subject: "Access to our data room", body: "Hi {{first_name}},\n\nHere’s access to our data room: {{link}}\n\n{{signature}}" },
    { id: "proposal", name: "Proposal for review", used: 0, subject: "Proposal for {{company}}", body: "Hi {{first_name}},\n\nAttached is our proposal for {{company}}: {{link}}\n\n{{signature}}" },
  ],
  signature: "",
};
const VARS = ["{{first_name}}", "{{company}}", "{{link}}", "{{document}}", "{{signature}}"];

export default function EmailSignature() {
  const s = useSetting<E>("email", DEFAULT);
  const v = { ...DEFAULT, ...s.value };
  const [sel, setSel] = useState(v.templates[0]?.id);
  const t = v.templates.find((x) => x.id === sel) || v.templates[0];
  const patch = (p: Partial<T>) => s.update({ ...v, templates: v.templates.map((x) => (x.id === t.id ? { ...x, ...p } : x)) });
  const add = () => { const id = `t${Date.now()}`; s.update({ ...v, templates: [...v.templates, { id, name: "New template", subject: "", body: "Hi {{first_name}},\n\n{{link}}\n\n{{signature}}", used: 0 }] }); setSel(id); };
  const remove = () => { const rest = v.templates.filter((x) => x.id !== t.id); s.update({ ...v, templates: rest }); setSel(rest[0]?.id); };
  return (
    <>
      <SettingsHead title="Email & signature" sub="Templates used when you share from Dozzier or let Copilot draft a follow-up." action={<SaveButton onClick={() => s.save()} saving={s.saving} />} />
      <div className="set-split">
        <Card title="Templates" style={{ width: 260, flexShrink: 0 }}>
          {v.templates.map((x) => (
            <button key={x.id} className={`tpl-item ${x.id === t?.id ? "on" : ""}`} onClick={() => setSel(x.id)}>
              <Mail size={16} /><span className="col" style={{ textAlign: "left" }}><span className="medium">{x.name}</span><span className="caption muted">{x.used ? `Used ${x.used} times` : "Not used yet"}</span></span>
            </button>
          ))}
          <button className="row gap-8 medium" style={{ padding: "6px 10px" }} onClick={add}><Plus size={16} />New template</button>
        </Card>
        {t && (
          <Card style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-8"><input className="input h3" style={{ border: 0, padding: 0, height: 28, fontWeight: 600 }} value={t.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Template name" />
              <button className="icon-btn s" aria-label="Delete template" onClick={remove}><Trash2 size={14} /></button></div>
            <label className="field"><span className="label">Subject</span><input className="input" value={t.subject} onChange={(e) => patch({ subject: e.target.value })} /></label>
            <label className="field"><span className="label">Message</span><textarea className="input" rows={9} value={t.body} onChange={(e) => patch({ body: e.target.value })} /></label>
            <div className="row gap-6 wrap"><span className="caption muted">Insert:</span>{VARS.map((x) => <button key={x} className="tag" onClick={() => patch({ body: t.body + x })}>{x}</button>)}</div>
          </Card>
        )}
      </div>
      <Card title="Signature" sub="Added wherever {{signature}} appears.">
        <textarea className="input" rows={4} value={v.signature} onChange={(e) => s.update({ ...v, signature: e.target.value })} placeholder={"Chidera Okafor\nFounder & CEO, Randombase"} />
      </Card>
    </>
  );
}
