"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, Sparkles, RefreshCw, Mail, Inbox } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Loading, Menu, Tabs, copy, toast } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, timeAgo } from "@/lib/format";
import { draftFollowUp, insights, tone } from "@/lib/insights";
import { useContact } from "@/components/contact/useContact";
import { Timeline } from "@/components/contact/Timeline";
import { sendEmail } from "@/lib/sendEmail";

export default function FollowUpPage() {
  const { id } = useParams<{ id: string }>();
  const { email: me, profile } = useApp();
  const router = useRouter();
  const { data, loading } = useContact(id);
  const [tab, setTab] = useState<"activity" | "questions" | "notes" | "emails">("activity");
  const [variant, setVariant] = useState(0);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cc, setCc] = useState("");
  const [applied, setApplied] = useState<string[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [sending, setSending] = useState<"idle" | "sending" | "sent">("idle");

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

  const send = async () => {
    setSending("sending");
    const err = await sendEmail({ kind: "follow_up", to: [c.email], cc: cc.split(/[,\s]+/).filter(Boolean), subject, message: body });
    if (err) { toast(err); setSending("idle"); return; }
    await logSent(); setSending("sent"); toast(`Sent to ${c.email} — replies come to your inbox`);
  };
  const translate = () => { const lang = navigator.language?.split("-")[0] || "en"; window.open(`https://translate.google.com/?sl=en&tl=${lang === "en" ? "fr" : lang}&text=${encodeURIComponent(body)}&op=translate`, "_blank"); };

  return (
    <div className="fu-page">
      <section className="fu-left">
        <div className="row gap-6 caption muted"><Link href="/app/contacts" className="muted">Contacts</Link><ChevronRight size={12} /><Link href={`/app/contacts/${c.id}`} className="muted">{name}</Link></div>
        <div className="fu-name">{name}</div>
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

      <section className="fu-right">
        <div className="row"><span className="row gap-8 fu-title grow"><Mail size={18} className="brand" />Follow-up draft</span>
          <Menu items={[{ label: "Open contact", onClick: () => router.push(`/app/contacts/${c.id}`) }, { label: "Copy draft", onClick: () => { copy(`Subject: ${subject}\n\n${body}`); toast("Draft copied"); } }]} /></div>
        <div className="row gap-6 wrap">{[...ins.tags, "Tone: warm, concise"].map((t) => <span key={t} className="fu-tag">{t}</span>)}</div>
        <div className="fu-letter">
          <div className="fu-meta"><span>To: {c.email}</span><label className="fu-cc">Cc: <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="add people" aria-label="Cc" /></label></div>
          <input className="fu-subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <textarea className="fu-text" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message" />
        </div>
        <div className="row gap-6 wrap">
          {([["shorter", "Shorter"], ["formal", "More formal"], ["metrics", "Add metrics"]] as const).map(([k, l]) => (
            <button key={k} className={`chip ${applied.includes(k) ? "active" : ""}`} onClick={() => apply(k)}>{l}</button>
          ))}
          <button className="chip" onClick={translate}>Translate</button>
        </div>
        <span className="grow" />
        <div className="row gap-8 fu-actions">
          <button className="btn btn-ghost" onClick={() => setVariant((v) => v + 1)}><RefreshCw size={16} />Another version</button>
          <span className="grow" />
          <button className="btn btn-secondary" onClick={() => { copy(`Subject: ${subject}\n\n${body}`); toast("Draft copied"); }}>Copy</button>
          <div className="split-btn">
            <button className="btn btn-brand" disabled={sending !== "idle" || !subject.trim() || !body.trim()} onClick={send}>{sending === "sending" ? "Sending…" : sending === "sent" ? "Sent" : "Send"}</button>
            <Menu label="More ways to send" triggerClass="btn btn-brand split-caret" trigger={<ChevronDown size={16} />} items={[
              { label: "Send with Gmail", icon: <Mail size={14} />, onClick: () => { logSent(); window.open(gmail, "_blank"); } },
              { label: "Open in mail app", icon: <Mail size={14} />, onClick: () => { logSent(); window.location.href = mailto; } },
            ]} />
          </div>
        </div>
        <span className="caption faint">Sent from Dozzier on your behalf — replies come to {me}.</span>
      </section>
    </div>
  );
}
