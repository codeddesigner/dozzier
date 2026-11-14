"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Mic, Flame, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar, Modal, copy, toast } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, duration, intentLevel, intentScore, timeAgo } from "@/lib/format";
import { linkUrlOf } from "@/components/LinkReady";
import { downloadText, toCsv } from "@/lib/space";

type V = { id: string; visitor_email: string | null; contact_id: string | null; account_id: string | null; document_id: string | null; link_id: string | null; duration_seconds: number; downloaded: boolean; pages_viewed: number; started_at: string;
  documents: { name: string; page_count: number } | null; accounts: { name: string } | null };
type L = { id: string; name: string; slug: string; created_at: string; document_id: string | null; space_id: string | null };
type Row = { key: string; email?: string | null; title: string; sub: string; score?: number; href?: string; accountId?: string | null };
type Act = { label: string; primary?: boolean; run: () => void };
type Answer = { intro: string; rows?: Row[]; outro?: string; actions?: Act[]; sources?: string[]; empty?: boolean };
type Msg = { role: "user" | "ai"; text?: string; answer?: Answer };
type Ctx = { router: ReturnType<typeof useRouter>; sender: string; nudge: (links: L[]) => void };

const SUGGESTIONS = ["Which investors read the deck this week, and who hasn’t opened it yet?", "Who should I follow up with?", "Which accounts are most engaged?", "Where do readers drop off?"];
const STOP = new Set(["which", "who", "what", "read", "the", "this", "week", "and", "hasnt", "hasn't", "opened", "yet", "investors", "people", "did", "has", "have", "last", "days", "month", "today", "my", "a", "of", "on", "in", "to", "for", "is", "are", "most", "summarise", "summarize", "activity", "about", "with", "not", "open"]);

const scoreOf = (rows: V[]) => intentScore({ seconds: rows.reduce((a, r) => a + r.duration_seconds, 0), visits: rows.length, downloads: rows.filter((r) => r.downloaded).length, pages: Math.max(0, ...rows.map((r) => r.pages_viewed)) });
function byKey<K extends string>(vs: V[], key: (v: V) => K | null) {
  const m = new Map<K, V[]>(); vs.forEach((v) => { const k = key(v); if (k) m.set(k, [...(m.get(k) || []), v]); });
  return [...m.entries()].map(([k, rows]) => ({ k, rows, secs: rows.reduce((a, r) => a + r.duration_seconds, 0), score: scoreOf(rows) }));
}
function periodOf(s: string) {
  if (/today/.test(s)) return { days: 1, label: "today" };
  if (/this week|7 days|past week|last week/.test(s)) return { days: 7, label: "in the last 7 days" };
  if (/month|30 days/.test(s)) return { days: 30, label: "in the last 30 days" };
  return { days: 90, label: "in the last 90 days" };
}

async function answer(q: string, c: Ctx): Promise<Answer> {
  const s = q.toLowerCase();
  const [vr, lr, ar] = await Promise.all([
    supabase.from("visits").select("id,visitor_email,contact_id,account_id,document_id,link_id,duration_seconds,downloaded,pages_viewed,started_at,documents(name,page_count),accounts(name)").order("started_at", { ascending: false }).limit(2000),
    supabase.from("links").select("id,name,slug,created_at,document_id,space_id").eq("enabled", true).order("created_at", { ascending: false }),
    supabase.from("accounts").select("id,name,stage"),
  ]);
  const all = (vr.data || []) as unknown as V[]; const links = (lr.data || []) as L[]; const accounts = (ar.data || []) as { id: string; name: string; stage: string | null }[];
  if (!all.length && !links.length) return { intro: "There’s no activity to look at yet. Share a link and I’ll tell you who’s engaged, which pages work and who to follow up with.", empty: true, actions: [{ label: "Go to Content", primary: true, run: () => c.router.push("/app/content") }] };
  const p = periodOf(s);
  const vs = all.filter((v) => Date.now() - +new Date(v.started_at) < p.days * 86400000);
  const words = s.replace(/[^\w\s@.-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const docMatch = (v: V) => !words.length || words.some((w) => (v.documents?.name || "").toLowerCase().includes(w));
  const exportRows = (rows: Row[], name: string) => ({ label: "Export list", run: () => downloadText(`${name}.csv`, toCsv([["Name", "Email", "Detail", "Intent"], ...rows.map((r) => [r.title, r.email || "", r.sub, r.score ?? ""])])) });
  const toPipeline = (rows: Row[]) => ({ label: "Add to pipeline", run: async () => {
    const ids = [...new Set(rows.map((r) => r.accountId).filter(Boolean))] as string[];
    const fresh = ids.filter((id) => !accounts.find((a) => a.id === id)?.stage);
    if (!ids.length) return toast("None of these people have a company account yet");
    if (fresh.length) await supabase.from("accounts").update({ stage: "deep_dive", stage_updated_at: new Date().toISOString() }).in("id", fresh);
    toast(`${ids.length} account${ids.length === 1 ? "" : "s"} on your pipeline`); c.router.push("/app/accounts");
  } });

  // "Summarise <name> activity"
  const sm = s.match(/summari[sz]e\s+(.+?)\s+activity/);
  if (sm) {
    const n = sm[1].trim();
    const acc = accounts.find((a) => a.name.toLowerCase().includes(n));
    const rows = all.filter((v) => (acc && v.account_id === acc.id) || (v.visitor_email || "").includes(n) || (v.documents?.name || "").toLowerCase().includes(n));
    if (!rows.length) return { intro: `I couldn’t find any activity for “${sm[1]}”.` };
    const people = byKey(rows, (v) => v.visitor_email).sort((a, b) => b.score - a.score);
    const top = byKey(rows, (v) => v.documents?.name || null).sort((a, b) => b.secs - a.secs)[0];
    return { intro: `${acc?.name || sm[1]}: ${rows.length} visit${rows.length === 1 ? "" : "s"} from ${people.length} ${people.length === 1 ? "person" : "people"}, ${duration(rows.reduce((a, r) => a + r.duration_seconds, 0))} in total. Last active ${timeAgo(rows[0].started_at).toLowerCase()}.`,
      rows: people.slice(0, 5).map((g) => ({ key: g.k, email: g.k, title: `${displayName(g.k)}${g.rows[0].accounts ? ` · ${g.rows[0].accounts.name}` : ""}`, sub: `${duration(g.secs)} · ${g.rows.length} visit${g.rows.length === 1 ? "" : "s"}`, score: g.score, href: g.rows[0].contact_id ? `/app/contacts/${g.rows[0].contact_id}` : undefined, accountId: g.rows[0].account_id })),
      outro: top ? `Most of the attention went to ${top.k} (${duration(top.secs)}).` : undefined,
      actions: [...(acc ? [{ label: `Open ${acc.name}`, primary: true, run: () => c.router.push(`/app/accounts/${acc.id}`) }] : []), ...(people[0]?.rows[0].contact_id ? [{ label: `Draft follow-up to ${displayName(people[0].k).split(" ")[0]}`, run: () => c.router.push(`/app/contacts/${people[0].rows[0].contact_id}/follow-up`) }] : [])],
      sources: [`${rows.length} visitor sessions`, ...(top ? [top.k] : [])] };
  }

  // "Who read X this week, and who hasn't opened it?"
  if (/read|spent|looked|opened|open/.test(s) && /who|which/.test(s)) {
    const hits = byKey(vs.filter(docMatch), (v) => v.visitor_email).filter((g) => g.secs >= 30).sort((a, b) => b.secs - a.secs);
    const rows: Row[] = hits.slice(0, 8).map((g) => ({ key: g.k, email: g.k, title: `${displayName(g.k)}${g.rows[0].accounts ? ` · ${g.rows[0].accounts.name}` : ""}`, sub: `${duration(g.secs)} on ${g.rows[0].documents?.name || "your content"}${g.rows.some((r) => r.downloaded) ? " · downloaded" : ""}`, score: g.score, href: g.rows[0].contact_id ? `/app/contacts/${g.rows[0].contact_id}` : undefined, accountId: g.rows[0].account_id }));
    const docNames = [...new Set(vs.filter(docMatch).map((v) => v.documents?.name).filter(Boolean))] as string[];
    const unopened = /hasn|not opened|haven|unopened|yet/.test(s) ? links.filter((l) => !all.some((v) => v.link_id === l.id) && (!words.length || words.some((w) => l.name.toLowerCase().includes(w)) || docNames.length > 0)).slice(0, 6) : [];
    const ago = (d: string) => { const n = Math.round((Date.now() - +new Date(d)) / 86400000); return n < 1 ? "today" : `${n} day${n === 1 ? "" : "s"} ago`; };
    return {
      intro: rows.length ? `${rows.length} ${rows.length === 1 ? "person" : "people"} spent meaningful time on ${docNames.length === 1 ? docNames[0] : "your content"} ${p.label}:` : `Nobody has spent meaningful time on ${words.length ? `“${words.join(" ")}”` : "your content"} ${p.label}.`,
      rows, outro: unopened.length ? `Not opened yet: ${unopened.map((l) => `${l.name} (sent ${ago(l.created_at)})`).join(", ")}.` : undefined,
      actions: [...(unopened.length ? [{ label: `Draft nudges to ${unopened.slice(0, 2).map((l) => l.name.split(" — ").pop()).join(" & ")}${unopened.length > 2 ? ` +${unopened.length - 2}` : ""}`, primary: true, run: () => c.nudge(unopened) }] : []), ...(rows.length ? [toPipeline(rows), exportRows(rows, "readers")] : [])],
      sources: [...docNames.slice(0, 2), `${vs.length} visitor session${vs.length === 1 ? "" : "s"}`, ...(unopened.length ? ["Links"] : [])],
    };
  }

  if (/follow|reach|email|contact|who should|ready/.test(s)) {
    const hot = byKey(all.filter((v) => Date.now() - +new Date(v.started_at) < 14 * 86400000), (v) => v.visitor_email).sort((a, b) => b.score - a.score).slice(0, 5);
    const rows = hot.map((g) => ({ key: g.k, email: g.k, title: `${displayName(g.k)}${g.rows[0].accounts ? ` · ${g.rows[0].accounts.name}` : ""}`, sub: `${g.rows.length} visit${g.rows.length > 1 ? "s" : ""} · ${duration(g.secs)} · last ${timeAgo(g.rows[0].started_at).toLowerCase()}`, score: g.score, href: g.rows[0].contact_id ? `/app/contacts/${g.rows[0].contact_id}/follow-up` : undefined, accountId: g.rows[0].account_id }));
    return { intro: rows.length ? `${rows.length} ${rows.length === 1 ? "person is" : "people are"} worth a follow-up — highest intent first. Open one to get a drafted email.` : "No one has been active in the last two weeks.", rows,
      actions: rows.length ? [toPipeline(rows), exportRows(rows, "follow-ups")] : [], sources: [`${all.length} visitor sessions`, "Intent scores"] };
  }
  if (/account|company|compan|engaged|interest|hot/.test(s)) {
    const top = byKey(all, (v) => v.account_id).sort((a, b) => b.score - a.score).slice(0, 6);
    const rows = top.map((g) => ({ key: g.k, title: g.rows[0].accounts?.name || "Account", sub: `${g.rows.length} visits from ${new Set(g.rows.map((r) => r.visitor_email)).size} people · ${duration(g.secs)}`, score: g.score, href: `/app/accounts/${g.k}`, accountId: g.k }));
    return { intro: "Your most engaged accounts:", rows, actions: rows.length ? [toPipeline(rows), exportRows(rows, "accounts")] : [], sources: [`${all.length} visitor sessions`, "Accounts"] };
  }
  if (/drop|lose|leave|page|skip|complet/.test(s)) {
    const docs = byKey(all, (v) => v.documents?.name || null).sort((a, b) => b.rows.length - a.rows.length);
    const rows = docs.slice(0, 6).map((g) => { const pc = g.rows[0].documents?.page_count || 1; const avg = g.rows.reduce((a, r) => a + r.pages_viewed, 0) / g.rows.length; const comp = Math.round(Math.min(1, avg / pc) * 100);
      return { key: g.k, title: g.k, sub: `Readers get through ${comp}% (≈ page ${Math.max(1, Math.round(avg))} of ${pc})${comp < 60 ? " — move your strongest page earlier" : ""}`, href: g.rows[0].document_id ? `/app/content/${g.rows[0].document_id}?tab=performance` : undefined }; });
    return { intro: "Where readers drop off:", rows, sources: docs.slice(0, 2).map((d) => d.k) };
  }
  const docs = byKey(all, (v) => v.documents?.name || null).sort((a, b) => b.secs - a.secs).slice(0, 6);
  return { intro: "Documents getting the most attention:", rows: docs.map((g) => ({ key: g.k, title: g.k, sub: `${duration(g.secs)} across ${g.rows.length} visits · ${duration(g.secs / g.rows.length)} each`, href: g.rows[0].document_id ? `/app/content/${g.rows[0].document_id}` : undefined })),
    outro: "Try asking “who read the deck this week?” or “summarise Acme activity”.", sources: [`${all.length} visitor sessions`] };
}

export default function Ask() {
  const router = useRouter();
  const { profile, email } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState<L[] | null>(null);
  const [listening, setListening] = useState(false);
  const [canMic, setCanMic] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const sender = profile.full_name || displayName(email);
  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setQ(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text }]);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 30);
    try { const a = await answer(text, { router, sender, nudge: setNudge }); setMsgs((m) => [...m, { role: "ai", answer: a }]); }
    catch { setMsgs((m) => [...m, { role: "ai", answer: { intro: "Something went wrong reading your data — try again." } }]); }
    setBusy(false);
    setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }
  useEffect(() => {
    setCanMic(typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window));
    const p = new URLSearchParams(window.location.search).get("q");
    if (p) { window.history.replaceState(null, "", "/app/ask"); ask(p); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function mic() {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void };
    const C = W.SpeechRecognition || W.webkitSpeechRecognition; if (!C) return;
    const r = new C(); r.lang = navigator.language || "en-US"; r.interimResults = true;
    r.onresult = (e) => setQ(Array.from(e.results).map((x) => x[0].transcript).join(""));
    r.onend = () => setListening(false);
    setListening(true); r.start();
  }

  return (
    <div className="content ask-page">
      <h1 className="page-title">Ask Dozzier</h1>
      {msgs.length === 0 && (
        <div className="ask-empty">
          <span className="ask-orb"><Sparkles size={22} /></span>
          <p className="muted body-m">Answers come straight from your visit data — who read what, for how long, and who’s ready to talk.</p>
          <div className="col gap-8" style={{ width: "100%", maxWidth: 560 }}>{SUGGESTIONS.map((s, i) => <button key={s} className="ask-sugg" style={{ animationDelay: `${i * 60}ms` }} onClick={() => ask(s)}>{s}</button>)}</div>
        </div>
      )}
      <div className="col gap-16 mt-24">
        {msgs.map((m, i) => m.role === "user" ? <div key={i} className="ask-q">{m.text}</div> : (
          <div key={i} className="ask-a">
            <span className="row gap-6 brand caption medium"><Sparkles size={14} />Dozzier</span>
            <p style={{ fontSize: 15 }}>{m.answer!.intro}</p>
            {m.answer!.rows && m.answer!.rows.length > 0 && <div className="col gap-8">{m.answer!.rows.map((r, j) => {
              const lvl = r.score !== undefined ? intentLevel(r.score) : null;
              const inner = <>{r.email !== undefined ? <Avatar email={r.email} name={r.title} size={30} /> : null}<span className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{r.title}</span><span className="caption muted ellipsis">{r.sub}</span></span>
                {lvl && <span className={`intent ${lvl.tone}`}><span className="flame"><Flame size={11} /></span>{lvl.label} · {r.score}</span>}</>;
              return r.href ? <a key={r.key} href={r.href} onClick={(e) => { e.preventDefault(); router.push(r.href!); }} className="ask-row" style={{ animationDelay: `${j * 50}ms` }}>{inner}</a> : <div key={r.key} className="ask-row" style={{ animationDelay: `${j * 50}ms` }}>{inner}</div>;
            })}</div>}
            {m.answer!.outro && <p style={{ fontSize: 15 }}>{m.answer!.outro}</p>}
            {m.answer!.actions && m.answer!.actions.length > 0 && <div className="row gap-8 wrap">{m.answer!.actions.map((a) => <button key={a.label} className={`btn btn-s ${a.primary ? "btn-dark" : "btn-secondary"}`} onClick={a.run}>{a.label}</button>)}</div>}
            {m.answer!.sources && <div className="row gap-6 wrap caption muted">Sources:{m.answer!.sources.map((x) => <span key={x} className="ask-src">{x}</span>)}</div>}
          </div>
        ))}
        {busy && <div className="ask-a"><span className="row gap-6 brand caption medium"><Sparkles size={14} />Dozzier</span><span className="ask-typing"><i /><i /><i /></span></div>}
        <div ref={end} />
      </div>
      <form className="ask-input" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? "Listening…" : "Ask about your content, visitors or deals…"} autoFocus />
        {canMic && <button type="button" className={`icon-btn s ${listening ? "rec" : ""}`} aria-label="Dictate" onClick={mic}><Mic size={16} /></button>}
        <button className="ask-send" aria-label="Ask" disabled={!q.trim() || busy}><Send size={16} /></button>
      </form>
      {nudge && (
        <Modal title="Nudges for links not opened yet" onClose={() => setNudge(null)} width={560}>
          <div className="col gap-12">
            {nudge.map((l) => { const t = `Hi,\n\nJust checking you received this — here’s the link again: ${linkUrlOf(l.slug)}\n\nHappy to walk you through it on a quick call.\n\nBest,\n${sender}`; return (
              <div key={l.id} className="card" style={{ padding: 14 }}>
                <div className="row gap-8"><span className="medium grow ellipsis">{l.name}</span><button className="btn btn-secondary btn-s" onClick={() => copy(t, "Nudge copied")}><Copy size={13} />Copy</button>
                  <a className="btn btn-ghost btn-s" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Following up: ${l.name}`)}&body=${encodeURIComponent(t)}`}>Gmail</a></div>
                <pre className="caption muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "8px 0 0" }}>{t}</pre>
              </div>
            ); })}
          </div>
        </Modal>
      )}
    </div>
  );
}
