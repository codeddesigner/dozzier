"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Copy, Flame, Link2, Mail, Download as DownloadIcon, Lock, Calendar, FileCheck2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { CountUp, Cycle, useInView } from "@/components/Motion";

const VIEWERS = [
  { name: "Paul", co: "Randombase", color: "#3b8bff", doc: "Pitch deck · page 7 of 18 · 4m 12s" },
  { name: "Priya", co: "Northwind", color: "#a66bff", doc: "Data room · Financials.xlsx · 6m 40s" },
  { name: "Daniel", co: "Acme Ventures", color: "#14c7b0", doc: "Series A deck · page 11 of 18 · 2m 05s" },
  { name: "Stella", co: "Kestrel", color: "#ff4f8b", doc: "Term sheet.pdf · page 2 of 4 · 1m 30s" },
];

/** Hero "viewing now" card that cycles through live visitors. */
export function HeroLiveAlert() {
  return (
    <Cycle items={VIEWERS} every={3200} render={(v) => (
      <div className="row gap-12">
        <Avatar size={32} name={v.name} color={v.color} />
        <div className="col"><span className="semibold">{v.name} at {v.co} is viewing now</span><span className="caption muted">{v.doc}</span></div>
        <span className="badge badge-success"><span className="dot" />Live</span>
      </div>
    )} />
  );
}

export function IntentScore() {
  return <span className="intent danger"><span className="flame"><Flame size={12} /></span>Hot · <CountUp to={92} duration={1800} /></span>;
}

export function MockKpis() {
  const kpis: [string, number, (n: number) => string, string, string][] = [
    ["Total visits", 128, (n) => String(Math.round(n)), "↑ 24%", "up"],
    ["Unique visitors", 46, (n) => String(Math.round(n)), "↑ 12%", "up"],
    ["Avg. time per visit", 161, (n) => { const s = Math.round(n); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }, "↓ 8%", "down"],
    ["Downloads", 9, (n) => String(Math.round(n)), "0%", "flat"],
  ];
  return (
    <div className="kpis mt-24">
      {kpis.map(([l, v, f, d, t]) => (
        <div className="kpi" key={l}><div className="kpi-label">{l}</div><div className="kpi-card"><div className="value"><CountUp to={v} format={f} duration={1600} /></div><div className="row gap-6"><span className={`delta ${t}`}>{d}</span><span className="caption faint">vs last 30 days</span></div></div></div>
      ))}
    </div>
  );
}

type Row = [string, string, string, number, number, string, string];
const ROWS: Row[] = [
  ["Paul", "paul@randombase.com", "Randombase", 1, 1, "01:51", "40 min ago"],
  ["Cynthia", "cynthia@randombase.com", "Randombase", 1, 0, "01:06", "40 min ago"],
  ["Stella", "stella@randombase.com", "Series A — Acme Ventures", 3, 0, "04:13", "2 hours ago"],
  ["Daniel", "daniel@acmevc.com", "Series A — Acme Ventures", 2, 1, "06:40", "Yesterday"],
  ["Priya Raman", "priya@northwind.io", "Data room · Diligence", 5, 2, "12:08", "2 days ago"],
];
const NEW: Row[] = [
  ["Marcus Lee", "marcus@kestrel.vc", "Series A — Acme Ventures", 1, 0, "00:42", "Just now"],
  ["Ada Obi", "ada@halcyon.capital", "Data room · Diligence", 2, 1, "03:18", "Just now"],
  ["Tom Weir", "tom@lumen.bio", "Randombase", 1, 0, "01:12", "Just now"],
];

/** Visitor table where a fresh visit slides in at the top every few seconds. */
export function MockRows() {
  const [ref, inView] = useInView<HTMLTableSectionElement>(false);
  const [rows, setRows] = useState<{ r: Row; k: string; fresh?: boolean }[]>(ROWS.map((r) => ({ r, k: r[1] })));
  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const t = setInterval(() => {
      const r = NEW[n % NEW.length]; n += 1;
      setRows((x) => [{ r, k: `${r[1]}-${n}`, fresh: true }, ...x.map((y) => ({ ...y, fresh: false }))].slice(0, 5));
    }, 4200);
    return () => clearInterval(t);
  }, [inView]);
  return (
    <tbody ref={ref}>
      {rows.map(({ r, k, fresh }, i) => (
        <tr key={k} className={`mock-row ${fresh ? "fresh" : ""}`} style={{ animationDelay: fresh ? "0ms" : `${900 + i * 90}ms` }}>
          <td><ChevronDown size={16} style={{ transform: "rotate(-90deg)" }} /></td>
          <td><div className="row gap-12"><Avatar size={32} name={r[0]} /><div className="col"><span className="medium">{r[0]}</span><span className="caption muted">{r[1]}</span></div></div></td>
          <td><span className="row gap-6"><Link2 size={14} />{r[2]}</span></td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td>
          <td>{fresh ? <span className="badge badge-success"><span className="dot" />{r[6]}</span> : r[6]}</td>
        </tr>
      ))}
    </tbody>
  );
}

const FEED = [
  ["Paul", "Opened Pitch deck · Acme Ventures", "Live"],
  ["Cynthia", "Forwarded to 2 partners", "New"],
  ["Stella", "Downloaded Term sheet.pdf", "New"],
  ["Priya", "Asked a question on page 12", "New"],
  ["Daniel", "Spent 6 min on pricing", "Live"],
  ["Marcus", "Signed the NDA", "New"],
];

/** Realtime notifications stream for the dark feature card. */
export function LiveFeed() {
  const [ref, inView] = useInView<HTMLDivElement>(false);
  const [items, setItems] = useState(() => FEED.slice(0, 3).map((f, i) => ({ f, k: i })));
  useEffect(() => {
    if (!inView) return;
    let n = 3;
    const t = setInterval(() => {
      const f = FEED[n % FEED.length]; const k = n; n += 1;
      setItems((x) => [{ f, k }, ...x].slice(0, 4));
    }, 2600);
    return () => clearInterval(t);
  }, [inView]);
  return (
    <div ref={ref} className="feed mt-16">
      {items.map(({ f: [n, d, b], k }) => (
        <div key={k} className="row feed-item" style={{ background: "#1f2937", borderRadius: 12, padding: "12px 14px" }}>
          <div className="col grow"><span className="semibold">{n}</span><span className="caption" style={{ color: "#9ca3af" }}>{d}</span></div>
          <span className={`badge ${b === "Live" ? "badge-success" : "badge-brand"}`}>{b === "Live" && <span className="dot" />}{b}</span>
        </div>
      ))}
    </div>
  );
}

/** Link-settings panel whose toggles switch on one by one, then keep breathing. */
export function LinkSettingsLive() {
  const items: [typeof Mail, string, string][] = [
    [Mail, "Require email to view", "Visitors verify their email before the document opens."],
    [DownloadIcon, "Allow downloads", "Let visitors download a PDF copy."],
    [Lock, "Require passcode", "Share a passcode separately for extra protection."],
    [Calendar, "Link expiration", "Disable this link on Dec 31, 2026 at 11:59 PM."],
    [FileCheck2, "Dynamic watermark", "Stamp each page with the viewer’s email."],
  ];
  const target = [true, false, true, true, true];
  const [ref, inView] = useInView<HTMLDivElement>(false);
  const [on, setOn] = useState([false, false, false, false, false]);
  useEffect(() => {
    if (!inView) return;
    const timers = target.map((v, i) => setTimeout(() => setOn((x) => x.map((y, j) => (j === i ? v : y))), 500 + i * 380));
    const loop = setInterval(() => setOn((x) => x.map((y, j) => (j === 1 || j === 2 ? !y : y))), 3400);
    return () => { timers.forEach(clearTimeout); clearInterval(loop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  return (
    <div ref={ref} className="card" style={{ marginTop: 16, padding: 16, boxShadow: "var(--shadow-lg)", fontSize: 12 }}>
      <div className="row semibold" style={{ fontSize: 14 }}>Create link<span className="spacer" />×</div>
      <div className="micro medium mt-8">Link name</div>
      <div className="input" style={{ height: 30, display: "flex", alignItems: "center", fontSize: 12, marginTop: 4 }}>Randombase — Series A</div>
      <div className="row gap-6 brand" style={{ background: "var(--dz-bg-brand-subtle)", borderRadius: 6, padding: "6px 8px", marginTop: 8 }}><Link2 size={12} /><span className="grow">dozzier.io/v/randombase-series-a</span><Copy size={11} /></div>
      <div className="row" style={{ gap: 16, marginTop: 12, borderBottom: "1px solid var(--dz-border-default)", fontSize: 10 }}>
        {["Access", "Security", "Branding", "Notifications"].map((t, i) => <span key={t} style={{ padding: "0 0 6px", color: i ? "var(--dz-text-secondary)" : "var(--dz-text-primary)", fontWeight: i ? 400 : 500, borderBottom: i ? 0 : "1.5px solid #111827", marginBottom: -1 }}>{t}</span>)}
      </div>
      {items.map(([I, t, d], i) => (
        <div className="row gap-8" key={t} style={{ padding: "8px 0", borderBottom: "1px solid var(--dz-border-subtle)" }}>
          <I size={14} /><div className="grow"><div className="medium">{t}</div><div className="faint" style={{ fontSize: 10 }}>{d}</div></div>
          <span className={`toggle ${on[i] ? "on" : ""}`} style={{ transform: "scale(.8)" }} />
        </div>
      ))}
    </div>
  );
}
