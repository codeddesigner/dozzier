"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Sparkles, RefreshCw, Copy, Mail, Scissors, Briefcase, BarChart3, Inbox } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar, Loading, Tabs, copy, toast } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, timeAgo } from "@/lib/format";
import { draftFollowUp, insights, tone } from "@/lib/insights";
import { useContact } from "@/components/contact/useContact";
import { Timeline } from "@/components/contact/Timeline";

export default function FollowUpPage() {
  const { id } = useParams<{ id: string }>();
  const { email: me, profile } = useApp();
  const { data, loading } = useContact(id);
  const [tab, setTab] = useState<"activity" | "questions" | "notes" | "emails">("activity");
  const [variant, setVariant] = useState(0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [applied, setApplied] = useState<string[]>([]);
  const [notes, setNotes] = useState<string | null>(null);

  const name = data ? displayName(data.contact.email, data.contact.name) : "";
  const ins = useMemo(() => data && insights(name, data.visits, data.pages, data.questions, data.forwards), [data, name]);

  useEffect(() => {
    if (!data || !ins) return;
    const d = draftFollowUp({ name: data.contact.name || "", email: data.contact.email, sender: profile.full_name || me.split("@")[0], signature: profile.settings?.email?.signature,
      docName: ins.main?.name, topPage: ins.top[0]?.page, question: ins.lastQ ? { body: ins.lastQ.body, answer: ins.lastQ.answer } : undefined, forwards: data.forwards, variant });
    setSubject(d.subject); setBody(d.body); setApplied([]); setCc(data.forwards.join(", "));
  }, [data, ins, variant, profile, me]);

  if (loading && !data) return <Loading />;
  if (!data || !ins) return <div className="content"><p className="error-text">Contact not found.</p></div>;
  const c = data.contact;

  function apply(k: "shorter" | "formal" | "metrics") {
    if (applied.includes(k)) return;
    setBody((b) => tone(b, k)); setApplied((a) => [...a, k]);
  }
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}${cc ? `&cc=${encodeURIComponent(cc)}` : ""}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const mailto = `mailto:${c.email}?${cc ? `cc=${encodeURIComponent(cc)}&` : ""}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  async function logSent() {
    await supabase.from("contacts").update({ notes: `${c.notes ? c.notes + "\n" : ""}[${new Date().toLocaleDateString()}] Follow-up sent: ${subject}` }).eq("id", c.id);
  }

  return (
    <div className="content">
      <div className="row gap-6 body-m"><Link href="/app/contacts" className="muted">Contacts</Link><ChevronRight size={14} className="faint" /><Link href={`/app/contacts/${c.id}`} className="muted">{name}</Link><ChevronRight size={14} className="faint" /><span className="semibold">Follow-up</span></div>
      <div className="row gap-12 mt-24" style={{ alignItems: "center" }}>
        <Avatar name={name} email={c.email} size={44} />
        <div className="col grow"><span className="page-title" style={{ fontSize: 24 }}>Follow up with {name.split(" ")[0]}</span><span className="caption muted">{c.email}{data.visits[0] ? ` · last active ${timeAgo(data.visits[0].started_at).toLowerCase()}` : ""}</span></div>
      </div>

      <div className="fu-grid mt-24">
        <section className="card" style={{ padding: 20, minWidth: 0 }}>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "activity", label: "Activity" }, { id: "questions", label: `Questions${data.questions.length ? ` (${data.questions.length})` : ""}` }, { id: "notes", label: "Notes" }, { id: "emails", label: "Emails" }]} />
          <div className="mt-16">
            {tab === "activity" && <Timeline events={ins.timeline} />}
            {tab === "questions" && (data.questions.length ? (
              <div className="col gap-12">{data.questions.map((q) => (
                <div key={q.id} className="q-card"><span className="caption muted">Page {q.page_number} · {timeAgo(q.created_at)}</span><p style={{ fontSize: 14 }}>{q.body}</p>{q.answer && <div className="q-answer"><span className="caption medium">You</span><p style={{ fontSize: 14 }}>{q.answer}</p></div>}</div>
              ))}</div>
            ) : <p className="caption muted">No questions from {name.split(" ")[0]} yet.</p>)}
            {tab === "notes" && (
              <div className="col gap-8">
                <textarea className="input" rows={8} value={notes ?? c.notes ?? ""} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes — only your workspace sees these" />
                <div><button className="btn btn-secondary btn-s" disabled={notes === null} onClick={async () => { await supabase.from("contacts").update({ notes }).eq("id", c.id); toast("Notes saved"); }}>Save notes</button></div>
              </div>
            )}
            {tab === "emails" && (
              <div className="empty-mini"><Inbox size={22} /><span className="medium">No email history</span><span className="caption muted">Connect Gmail or Outlook in Integrations to see your threads with {name.split(" ")[0]} here.</span><Link href="/app/settings/integrations" className="btn btn-secondary btn-s">Integrations</Link></div>
            )}
          </div>
        </section>

        <section className="copilot-card fu-draft">
          <div className="row"><span className="row gap-6 caption medium brand grow"><Sparkles size={14} />Copilot draft</span><button className="btn btn-ghost btn-s" onClick={() => setVariant((v) => v + 1)}><RefreshCw size={14} />Regenerate</button></div>
          {ins.tags.length > 0 && <div className="row gap-6 wrap">{ins.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
          <label className="field"><span className="label">To</span><input className="input" value={c.email} readOnly /></label>
          <label className="field"><span className="label">Cc</span><input className="input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional" /></label>
          <label className="field"><span className="label">Subject</span><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
          <textarea className="input fu-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="row gap-6 wrap">
            {([["shorter", "Shorter", Scissors], ["formal", "More formal", Briefcase], ["metrics", "Add metrics", BarChart3]] as const).map(([k, l, I]) => (
              <button key={k} className={`pill-opt ${applied.includes(k) ? "on" : ""}`} onClick={() => apply(k)}><I size={13} />{l}</button>
            ))}
          </div>
          <div className="row gap-8 mt-8 wrap">
            <a className="btn btn-primary" href={gmail} target="_blank" rel="noreferrer" onClick={logSent}><Mail size={16} />Send with Gmail</a>
            <a className="btn btn-secondary" href={mailto} onClick={logSent}>Open in mail app</a>
            <button className="btn btn-ghost" onClick={() => { copy(`Subject: ${subject}\n\n${body}`); toast("Draft copied"); }}><Copy size={14} />Copy</button>
          </div>
          <span className="caption faint">Drafted from {name.split(" ")[0]}’s activity. Review before sending.</span>
        </section>
      </div>
    </div>
  );
}
