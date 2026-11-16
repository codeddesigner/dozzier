"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Upload, Send, MessageSquare, Mail, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { searchDocs } from "@/lib/docs";

const TOPICS = ["Question", "Bug", "Billing", "Feature request"];
type Svc = { name: string; check?: () => Promise<boolean>; note?: string };
const SERVICES: Svc[] = [
  { name: "App & dashboard", check: async () => (await fetch("/app", { cache: "no-store" })).ok },
  { name: "Document viewer", check: async () => (await fetch("/v/status-check", { cache: "no-store" })).ok },
  { name: "Link delivery", check: async () => !(await supabase.rpc("get_public_link", { p_slug: "status-check" })).error },
  { name: "Analytics pipeline", check: async () => !(await supabase.rpc("get_public_file_request", { p_slug: "status-check" })).error },
  { name: "Zapier & MCP" },
];

export default function ContactSupport() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Question");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user; if (!u) return;
      setEmail(u.email || "");
      supabase.from("profiles").select("full_name").eq("id", u.id).maybeSingle().then(({ data: p }) => p?.full_name && setName(p.full_name));
    });
  }, []);
  const [status, setStatus] = useState<Record<string, boolean | null>>({});
  useEffect(() => {
    SERVICES.forEach((sv) => sv.check?.().then((ok) => setStatus((x) => ({ ...x, [sv.name]: ok })), () => setStatus((x) => ({ ...x, [sv.name]: false }))));
  }, []);
  const checked = SERVICES.filter((sv) => sv.check);
  const allOk = checked.every((sv) => status[sv.name] === true);
  const anyDown = checked.some((sv) => status[sv.name] === false);
  const hints = useMemo(() => (subject.trim().length > 3 ? searchDocs(subject).slice(0, 2) : []), [subject]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.from("support_requests").insert({
      name: name.trim(), email: email.trim().toLowerCase(), topic, subject: subject.trim(), body: body.trim(),
      attachments: files.map((f) => f.name), meta: { ua: navigator.userAgent, url: document.referrer || null },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <main className="contact-wrap">
      <div className="col gap-8" style={{ flex: 1, minWidth: 0 }}>
        <h1 className="display-l h-in">Contact support</h1>
        <p className="muted h-in" style={{ animationDelay: ".1s" }}>We usually reply within 2 hours, Mon–Fri.</p>
        {sent ? (
          <div className="contact-card col gap-12 cycle-item" style={{ alignItems: "center", textAlign: "center", padding: 48 }}>
            <CheckCircle2 size={40} color="#1e9e5a" className="gs-circle done" style={{ border: 0, background: "none", width: 40, height: 40 }} />
            <div className="h2">Message received</div>
            <p className="muted">We’ve logged your request about “{subject}”. Replies go to {email}.</p>
            <Link href="/docs" className="btn btn-secondary">Back to guides</Link>
          </div>
        ) : (
          <form className="contact-card" onSubmit={send} data-reveal>
            <div className="row gap-12">
              <label className="field grow"><span className="label">Name</span><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="field grow"><span className="label">Email</span><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            </div>
            <div className="row gap-8 wrap">{TOPICS.map((t) => <button type="button" key={t} className={`pill-opt ${topic === t ? "on" : ""}`} onClick={() => setTopic(t)}>{t}</button>)}</div>
            <label className="field"><span className="label">Subject</span><input className="input" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Watermark missing on downloaded PDF" /></label>
            {hints.length > 0 && (
              <div className="contact-hints cycle-item">
                <span className="row gap-6 caption medium brand"><Sparkles size={14} />These might help</span>
                {hints.map((h) => <Link key={h.slug} href={`/docs/${h.slug}`} className="link caption" style={{ fontWeight: 400 }}>→ {h.title}</Link>)}
              </div>
            )}
            <label className="field"><span className="label">Describe the issue</span>
              <textarea className="input" required rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened, and what did you expect?" />
              <span className="caption faint">We’ll include your browser details automatically.</span>
            </label>
            <label className="dropzone" style={{ minHeight: 44 }}>
              <Upload size={16} /><span className="muted">{files.length ? files.map((f) => f.name).join(", ") : "Attach screenshots or a screen recording"}</span>
              <input type="file" multiple hidden accept="image/*,video/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
            {files.length > 0 && <span className="caption faint">File names are sent with your message; we’ll ask for the files by email if we need them.</span>}
            {err && <p className="error-text">{err}</p>}
            <div><button className="btn btn-primary" disabled={busy}><Send size={14} />{busy ? "Sending…" : "Send message"}</button></div>
          </form>
        )}
      </div>
      <div className="col gap-16" style={{ width: 380, flexShrink: 0 }}>
        <div className="contact-side" id="status" data-reveal>
          <div className="row"><span className="h3 grow">System status</span>
            {allOk ? <span className="badge badge-success cycle-item"><span className="dot" />All systems normal</span> : anyDown ? <span className="badge badge-danger cycle-item">Degraded</span> : <span className="badge badge-muted">Checking…</span>}</div>
          {SERVICES.map((sv) => {
            const st = status[sv.name];
            return (
              <div key={sv.name} className="row gap-12">
                <span className="grow" style={{ fontSize: 14 }}>{sv.name}</span>
                {sv.note ? <span className="caption faint">{sv.note}</span> : (
                  <span className={`status-bars ${st === true ? "ok" : st === false ? "down" : ""}`}>{Array.from({ length: 30 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 18}ms` }} />)}</span>
                )}
              </div>
            );
          })}
          <span className="caption faint">Checked live from your browser just now.</span>
        </div>
        <div className="contact-side" data-reveal>
          <span className="h3">Other ways to reach us</span>
          <span className="row gap-8"><MessageSquare size={16} />Live chat in the app (Mon–Fri)</span>
          <a href="mailto:support@dozzier.io" className="row gap-8"><Mail size={16} />support@dozzier.io</a>
          <span className="row gap-8"><Users size={16} />Community forum</span>
        </div>
      </div>
    </main>
  );
}
