"use client";
import { Toggle } from "@/components/ui";
import { Card, Row, Select, SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";

const EVENTS: [string, string, string][] = [
  ["open", "Someone opens my link", "First open and every return visit"],
  ["viewing", "Visitor is viewing now", "Live presence while they read"],
  ["question", "New question on a document", "Q&A from visitors"],
  ["forward", "Document forwarded", "A new person opens a shared link"],
  ["download", "Download or print", "When a visitor downloads a copy"],
  ["signed", "Agreement signed", "NDA or contract completed"],
  ["upload", "File request upload", "Someone uploaded to your request"],
  ["expiring", "Link expiring soon", "3 days before expiry"],
  ["weekly", "Weekly engagement digest", "Every Monday, 8:00"],
];
const CHANNELS = ["inapp", "email", "slack", "push"] as const;
type Ch = (typeof CHANNELS)[number];
type N = { matrix: Record<string, Ch[]>; quiet: boolean; quiet_from: string; quiet_to: string };
const DEFAULT: N = {
  matrix: { open: ["inapp", "email", "slack", "push"], viewing: ["inapp", "slack", "push"], question: ["inapp", "email", "slack", "push"], forward: ["inapp", "email", "push"], download: ["inapp", "email"], signed: ["inapp", "email", "slack"], upload: ["inapp", "email"], expiring: ["inapp", "email"], weekly: ["email"] },
  quiet: false, quiet_from: "20:00", quiet_to: "08:00",
};
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export default function Notifications() {
  const s = useSetting<N>("notifications", DEFAULT);
  const v = { ...DEFAULT, ...s.value, matrix: { ...DEFAULT.matrix, ...(s.value.matrix || {}) } };
  const flip = (e: string, c: Ch) => {
    const cur = v.matrix[e] || [];
    s.update({ ...v, matrix: { ...v.matrix, [e]: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] } });
  };
  return (
    <>
      <SettingsHead title="Notifications" sub="Choose what you hear about, and where." action={<SaveButton onClick={() => s.save()} saving={s.saving} />} />
      <section className="set-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table notif-table">
          <thead><tr><th>Event</th>{["In-app", "Email", "Slack / Teams", "Push"].map((h) => <th key={h} className="center">{h}</th>)}</tr></thead>
          <tbody>
            {EVENTS.map(([id, t, d]) => (
              <tr key={id}>
                <td><div className="medium">{t}</div><div className="caption muted">{d}</div></td>
                {CHANNELS.map((c) => <td key={c} className="center"><input type="checkbox" className="check" aria-label={`${t} — ${c}`} checked={(v.matrix[id] || []).includes(c)} onChange={() => flip(id, c)} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Card title="Quiet hours" sub="Pause push, Slack and Teams alerts — emails are batched into a morning summary.">
        <Row title="Enable quiet hours"><Toggle on={v.quiet} onChange={(x) => s.update({ ...v, quiet: x })} /></Row>
        {v.quiet && <Row title="From" sub="Local time"><div className="row gap-8"><Select value={v.quiet_from} onChange={(x) => s.update({ ...v, quiet_from: x })} options={HOURS} /><span className="muted">to</span><Select value={v.quiet_to} onChange={(x) => s.update({ ...v, quiet_to: x })} options={HOURS} /></div></Row>}
      </Card>
    </>
  );
}
