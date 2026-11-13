"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { displayName, duration, intentScore, intentLevel, timeAgo } from "@/lib/format";
import { useApp } from "@/components/AppContext";

type V = { id: string; visitor_email: string | null; contact_id: string | null; account_id: string | null; document_id: string | null; duration_seconds: number; downloaded: boolean; pages_viewed: number; started_at: string;
  documents: { name: string; page_count: number } | null; accounts: { name: string } | null };
type Answer = { title: string; body: React.ReactNode };
type Msg = { role: "user" | "ai"; text?: string; answer?: Answer };

const SUGGESTIONS = ["Who should I follow up with?", "Which accounts are most engaged?", "Which documents get the most attention?", "Where do readers drop off?"];

async function load(): Promise<V[]> {
  const { data } = await supabase.from("visits").select("id,visitor_email,contact_id,account_id,document_id,duration_seconds,downloaded,pages_viewed,started_at,documents(name,page_count),accounts(name)").order("started_at", { ascending: false }).limit(1000);
  return (data || []) as unknown as V[];
}

function group<K extends string>(vs: V[], key: (v: V) => K | null) {
  const m = new Map<K, V[]>();
  vs.forEach((v) => { const k = key(v); if (k) m.set(k, [...(m.get(k) || []), v]); });
  return [...m.entries()].map(([k, rows]) => ({ k, rows, secs: rows.reduce((a, r) => a + r.duration_seconds, 0),
    score: intentScore({ seconds: rows.reduce((a, r) => a + r.duration_seconds, 0), visits: rows.length, downloads: rows.filter((r) => r.downloaded).length, pages: Math.max(...rows.map((r) => r.pages_viewed)) }) }));
}

async function answer(q: string, sender: string): Promise<Answer> {
  const vs = await load();
  if (!vs.length) return { title: "No visit data yet", body: <p>Share a link first — once people open it I can tell you who’s engaged, which pages work and who to follow up with. <Link className="brand" href="/app/content">Go to Content</Link></p> };
  const s = q.toLowerCase();
  if (/follow|reach|email|contact|who should/.test(s)) {
    const hot = group(vs, (v) => v.visitor_email).filter((g) => Date.now() - +new Date(g.rows[0].started_at) < 14 * 86400000).sort((a, b) => b.score - a.score).slice(0, 3);
    return { title: `${hot.length} people are ready for a follow-up`, body: (
      <div className="col gap-12">{hot.map((g) => {
        const doc = g.rows[0].documents?.name || "your document";
        const draft = `Hi ${displayName(g.k)},\n\nThanks for taking the time to look through ${doc}. Happy to walk you through any questions — would a quick call this week work?\n\nBest,\n${sender}`;
        return (
          <div key={g.k} className="card row gap-12" style={{ padding: 12 }}>
            <div className="col grow"><span className="semibold">{displayName(g.k)} <span className={`intent ${intentLevel(g.score).tone}`}>{intentLevel(g.score).label} · {g.score}</span></span>
              <span className="caption muted">{g.rows.length} visit{g.rows.length > 1 ? "s" : ""} · {duration(g.secs)} on {doc} · last {timeAgo(g.rows[0].started_at).toLowerCase()}{g.rows.some((r) => r.downloaded) ? " · downloaded" : ""}</span></div>
            <a className="btn btn-primary btn-s" href={`mailto:${g.k}?subject=${encodeURIComponent(`Following up on ${doc}`)}&body=${encodeURIComponent(draft)}`}><Mail size={14} />Draft follow-up</a>
          </div>);
      })}</div>) };
  }
  if (/account|company|compan|engaged|interest|hot/.test(s)) {
    const top = group(vs, (v) => v.accounts?.name || null).sort((a, b) => b.score - a.score).slice(0, 5);
    return { title: "Most engaged accounts", body: <ol style={{ margin: 0, paddingLeft: 18 }}>{top.map((g) => <li key={g.k} style={{ marginBottom: 6 }}><b>{g.k}</b> — intent {g.score}, {g.rows.length} visits from {new Set(g.rows.map((r) => r.visitor_email)).size} people, {duration(g.secs)} total</li>)}</ol> };
  }
  if (/drop|lose|leave|page|skip/.test(s)) {
    const docs = group(vs, (v) => v.documents?.name || null);
    return { title: "Where readers drop off", body: <ul style={{ margin: 0, paddingLeft: 18 }}>{docs.map((g) => {
      const pc = g.rows[0].documents?.page_count || 1;
      const avgPages = g.rows.reduce((a, r) => a + r.pages_viewed, 0) / g.rows.length;
      const comp = Math.round(Math.min(1, avgPages / pc) * 100);
      return <li key={g.k} style={{ marginBottom: 6 }}><b>{g.k}</b>: readers get through {comp}% on average (≈ page {Math.max(1, Math.round(avgPages))} of {pc}). {comp < 60 ? "Consider moving your strongest slide earlier." : "Strong completion — keep it."}</li>;
    })}</ul> };
  }
  const docs = group(vs, (v) => v.documents?.name || null).sort((a, b) => b.secs - a.secs);
  return { title: "Documents getting the most attention", body: <ol style={{ margin: 0, paddingLeft: 18 }}>{docs.map((g) => <li key={g.k} style={{ marginBottom: 6 }}><b>{g.k}</b> — {duration(g.secs)} total across {g.rows.length} visits ({duration(g.secs / g.rows.length)} per visit)</li>)}</ol> };
}

export default function Ask() {
  const { profile } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text }]);
    const a = await answer(text, profile.full_name || profile.workspace_name || "");
    setMsgs((m) => [...m, { role: "ai", answer: a }]); setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  return (
    <div className="content" style={{ maxWidth: 820 }}>
      <div className="row gap-8 brand medium"><Sparkles size={18} />Dozzier Copilot</div>
      <h1 className="page-title mt-8">Ask Dozzier anything</h1>
      <p className="muted body-m">Answers come straight from your visit data — who read what, for how long, and who’s ready to talk.</p>
      <div className="col gap-16 mt-24">
        {msgs.map((m, i) => m.role === "user"
          ? <div key={i} style={{ alignSelf: "flex-end", background: "var(--dz-bg-muted)", borderRadius: 14, padding: "10px 14px", maxWidth: "80%" }}>{m.text}</div>
          : <div key={i} className="ai-card"><div className="row gap-8 brand caption medium"><Sparkles size={16} />Dozzier Copilot</div><div className="h3">{m.answer!.title}</div><div className="muted">{m.answer!.body}</div></div>)}
        {busy && <div className="ai-card"><span className="spinner" /></div>}
        <div ref={end} />
      </div>
      {msgs.length === 0 && <div className="row gap-8 wrap mt-16">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>}
      <form className="search mt-24" style={{ width: "100%", height: 48 }} onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <Sparkles size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Which investors read the financials twice?" />
        <button className="btn btn-primary btn-s" aria-label="Ask" disabled={!q.trim() || busy}><ArrowUp size={14} /></button>
      </form>
      {msgs.length > 0 && <div className="row gap-8 wrap mt-16">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>}
    </div>
  );
}
