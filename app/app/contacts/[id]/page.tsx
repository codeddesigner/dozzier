"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Flame, Mail, Trash2, Link2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar, DocThumb, Loading, Menu, Tabs, toast } from "@/components/ui";
import { CountUp } from "@/components/Motion";
import { displayName, duration, timeAgo, intentScore, intentLevel } from "@/lib/format";
import { insights } from "@/lib/insights";
import { useContact } from "@/components/contact/useContact";
import { Timeline } from "@/components/contact/Timeline";

export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"activity" | "questions" | "content" | "links" | "details">("activity");
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("tab"); if (t === "questions") setTab("questions"); }, []);
  const { data, loading, reload } = useContact(id);
  const [form, setForm] = useState<{ name: string; title: string; tags: string; notes: string } | null>(null);
  const ins = useMemo(() => data && insights(displayName(data.contact.email, data.contact.name), data.visits, data.pages, data.questions, data.forwards), [data]);

  if (loading && !data) return <Loading />;
  if (!data || !ins) return <div className="content"><p className="error-text">Contact not found.</p></div>;
  const { contact: c, visits, questions } = data;
  const name = displayName(c.email, c.name);
  const score = intentScore({ seconds: ins.total, visits: visits.length, downloads: visits.filter((v) => v.downloaded).length, pages: Math.max(0, ...visits.map((v) => v.pages_viewed)) });
  const lvl = intentLevel(score);
  const loc = visits.find((v) => v.location)?.location;
  const f = form || { name: c.name || "", title: c.title || "", tags: c.tags.join(", "), notes: c.notes || "" };
  const links = [...new Map(visits.filter((v) => v.link_id).map((v) => [v.link_id, v])).values()];
  const docs = [...new Map(visits.filter((v) => v.document_id).map((v) => [v.document_id, v])).values()];

  return (
    <div className="content">
      <div className="row gap-6 body-m"><Link href="/app/contacts" className="muted">Contacts</Link><ChevronRight size={14} className="faint" /><span className="semibold">{name}</span></div>
      <div className="row gap-16 mt-24 head-row" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <Avatar name={name} email={c.email} size={56} />
        <div className="col gap-4 grow head-main with-avatar">
          <div className="row gap-12 wrap"><span className="page-title" style={{ fontSize: 28 }}>{name}</span><span className={`intent ${lvl.tone}`}><span className="flame"><Flame size={12} /></span>{lvl.label} · {score}</span></div>
          <span className="muted body-m">{[c.title && `${c.title}${c.accounts ? `, ${c.accounts.name}` : ""}`, !c.title && c.accounts?.name, c.email, loc].filter(Boolean).join(" · ")}</span>
        </div>
        <a className="btn btn-secondary" href={`mailto:${c.email}`}><Mail size={16} />Email</a>
        <Link className="btn btn-brand" href={`/app/contacts/${c.id}/follow-up`}><Sparkles size={16} />Draft follow-up</Link>
        <Menu items={[{ label: "Delete contact", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("contacts").delete().eq("id", c.id); router.push("/app/contacts"); } }]} />
      </div>

      <div className="kpis mt-24">
        {([["Sessions", visits.length, (n: number) => String(Math.round(n))], ["Total time", ins.total, duration], ["Completion", ins.completion * 100, (n: number) => `${Math.round(n)}%`], ["Forwards", data.forwards.length, (n: number) => String(Math.round(n))]] as const).map(([l, v, fmt]) => (
          <div className="kpi" key={l}><div className="kpi-label">{l}</div><div className="kpi-card"><div className="value"><CountUp to={v} format={fmt} /></div><span className="caption faint">{l === "Completion" && ins.main ? ins.main.name : l === "Forwards" ? (data.forwards[0] || "None yet") : l === "Sessions" && visits[0] ? `Last ${timeAgo(visits[0].started_at).toLowerCase()}` : "All time"}</span></div></div>
        ))}
      </div>

      <div className="dd-grid mt-24">
        <section className="card" style={{ padding: 20 }}>
          <div className="row" style={{ marginBottom: 14 }}><span className="h2 grow">Attention heatmap</span><span className="caption muted">{ins.main?.name || "No document viewed yet"}</span></div>
          {ins.main ? (
            <>
              <div className="heatmap">
                {ins.heat.map((s, i) => (
                  <div key={i} className="heat-cell-wrap" style={{ animationDelay: `${i * 25}ms` }}>
                    <div className={`heat-cell ${ins.level(s)}`} title={`Page ${i + 1}: ${duration(s)}`} />
                    <span className="micro faint">p{i + 1} · {s ? duration(s) : "—"}</span>
                  </div>
                ))}
              </div>
              <div className="row gap-16 caption muted" style={{ marginTop: 14 }}>
                <span className="row gap-6"><span className="heat-key skimmed" />Skimmed</span><span className="row gap-6"><span className="heat-key read" />Read</span><span className="row gap-6"><span className="heat-key studied" />Studied</span>
              </div>
            </>
          ) : <p className="muted">When {name.split(" ")[0]} opens a document, you’ll see which pages held their attention.</p>}
        </section>
        <div className="col gap-16">
          <section className="copilot-card">
            <span className="row gap-6 caption medium brand"><Sparkles size={14} />Dozzier Copilot</span>
            <span className="h3">{ins.headline}</span>
            <span className="muted" style={{ fontSize: 14 }}>{ins.read}</span>
            <div className="row gap-8 mt-8"><Link href={`/app/contacts/${c.id}/follow-up`} className="btn btn-dark btn-s">Draft follow-up</Link><button className="btn btn-ghost btn-s" onClick={() => setTab("activity")}>View timeline</button></div>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <div className="h3" style={{ marginBottom: 12 }}>Activity</div>
            <Timeline events={ins.timeline.slice(0, 5)} />
          </section>
        </div>
      </div>

      <div className="mt-32"><Tabs value={tab} onChange={setTab} tabs={[{ id: "activity", label: "Visit activity" }, { id: "questions", label: `Questions${questions.length ? ` (${questions.length})` : ""}` }, { id: "content", label: "Content" }, { id: "links", label: "Links" }, { id: "details", label: "Details & notes" }]} /></div>
      {tab === "activity" && (
        <table className="table mt-16">
          <thead><tr><th>Visit</th><th className="hide-sm">Location</th><th>Pages</th><th>Time</th></tr></thead>
          <tbody>
            {visits.length === 0 && <tr><td colSpan={4} className="table-empty">No visits yet.</td></tr>}
            {visits.map((v) => (
              <tr key={v.id}><td><div className="col"><span className="medium">{v.documents?.name || "Space"} {v.downloaded && <span className="badge badge-brand">Downloaded</span>}</span><span className="caption muted">{new Date(v.started_at).toLocaleString()}</span></div></td>
                <td className="hide-sm muted">{v.location || "—"}</td><td>{v.pages_viewed}</td><td>{duration(v.duration_seconds)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "questions" && <QuestionsList questions={questions} onAnswered={reload} />}
      {tab === "content" && (
        <table className="table mt-16"><thead><tr><th>Content</th><th>Last visit</th></tr></thead>
          <tbody>{docs.length === 0 && <tr><td colSpan={2} className="table-empty">{name} hasn’t viewed anything yet.</td></tr>}
            {docs.map((d) => <tr key={d.document_id} className="clickable" onClick={() => router.push(`/app/content/${d.document_id}`)}><td><div className="row gap-12"><DocThumb kind={d.documents?.file_type || "file"} /><span className="medium">{d.documents?.name}</span></div></td><td>{timeAgo(d.started_at)}</td></tr>)}</tbody></table>
      )}
      {tab === "links" && (
        <table className="table mt-16"><thead><tr><th>Link</th><th>First opened</th></tr></thead>
          <tbody>{links.map((v) => <tr key={v.link_id} className="clickable" onClick={() => router.push(`/app/links/${v.link_id}`)}><td><span className="row gap-8"><Link2 size={14} />{v.links?.name}</span></td><td>{timeAgo(v.started_at)}</td></tr>)}
            {links.length === 0 && <tr><td colSpan={2} className="table-empty">No links opened.</td></tr>}</tbody></table>
      )}
      {tab === "details" && (
        <div className="col gap-12 mt-24" style={{ maxWidth: 520 }}>
          <label className="field"><span className="label">Name</span><input className="input" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} /></label>
          <label className="field"><span className="label">Title</span><input className="input" value={f.title} onChange={(e) => setForm({ ...f, title: e.target.value })} /></label>
          <label className="field"><span className="label">Tags</span><input className="input" value={f.tags} onChange={(e) => setForm({ ...f, tags: e.target.value })} placeholder="Investor, Lead" /></label>
          <label className="field"><span className="label">Notes</span><textarea className="input" rows={4} value={f.notes} onChange={(e) => setForm({ ...f, notes: e.target.value })} placeholder="Private notes about this contact" /></label>
          <div><button className="btn btn-primary" onClick={async () => { await supabase.from("contacts").update({ name: f.name || null, title: f.title || null, notes: f.notes || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }).eq("id", c.id); toast("Contact saved"); setForm(null); reload(); }}>Save</button></div>
        </div>
      )}
    </div>
  );
}

function QuestionsList({ questions, onAnswered }: { questions: { id: string; body: string; page_number: number; answer: string | null; created_at: string }[]; onAnswered: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!questions.length) return <p className="muted mt-24">No questions yet. Visitors can ask about any page from the viewer.</p>;
  return (
    <div className="col gap-12 mt-16">
      {questions.map((q) => (
        <div key={q.id} className="card" style={{ padding: 16 }}>
          <div className="row gap-8"><span className="tag">Page {q.page_number}</span><span className="caption muted grow">{timeAgo(q.created_at)}</span>{q.answer ? <span className="badge badge-success">Answered</span> : <span className="badge badge-warn">Needs reply</span>}</div>
          <p className="mt-8" style={{ fontSize: 15 }}>{q.body}</p>
          {q.answer ? <div className="q-answer mt-8"><span className="caption medium">You</span><p style={{ fontSize: 14 }}>{q.answer}</p></div> : (
            <div className="row gap-8 mt-8">
              <input className="input grow" placeholder="Write a reply — the visitor sees it in the viewer" value={drafts[q.id] || ""} onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })} />
              <button className="btn btn-primary" disabled={!drafts[q.id]?.trim()} onClick={async () => { await supabase.from("doc_questions").update({ answer: drafts[q.id].trim(), answered_at: new Date().toISOString() }).eq("id", q.id); toast("Reply posted"); onAnswered(); }}>Reply</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
