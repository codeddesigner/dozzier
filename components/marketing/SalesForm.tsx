"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"];
const USES = ["Fundraising", "Sales", "M&A / due diligence", "Board reporting", "Legal & compliance", "Something else"];

export function SalesForm() {
  const [f, setF] = useState({ first: "", last: "", email: "", company: "", size: "11–50", use: "Fundraising", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.from("support_requests").insert({
      name: `${f.first} ${f.last}`.trim(), email: f.email.trim().toLowerCase(), topic: "Sales",
      subject: `Demo request · ${f.company.trim() || "Unknown company"} (${f.size})`,
      body: [`Company: ${f.company}`, `Team size: ${f.size}`, `Main use case: ${f.use}`, "", f.note.trim() || "(no notes)"].join("\n"),
      meta: { source: "talk-to-sales", company: f.company, team_size: f.size, use_case: f.use, url: document.referrer || null },
    });
    setBusy(false);
    if (error) return setErr("Something went wrong. Please try again, or email sales@dozzier.io.");
    setSent(true);
  }

  if (sent) return (
    <div className="mk-form col gap-12" style={{ alignItems: "center", textAlign: "center", padding: 48 }}>
      <CheckCircle2 size={40} color="#1e9e5a" />
      <div className="h2">Thanks, {f.first || "we’ve got it"}!</div>
      <p className="muted" style={{ margin: 0 }}>We’ll reply to {f.email} within one business day to find a time.</p>
      <Link href="/signup" className="btn btn-secondary">Start a free trial meanwhile</Link>
    </div>
  );

  return (
    <form className="mk-form" onSubmit={submit}>
      <div className="mk-form-t">Book a demo</div>
      <div className="mk-2">
        <label className="field"><span className="label">First name</span><input className="input" required autoComplete="given-name" placeholder="Your first name" value={f.first} onChange={set("first")} /></label>
        <label className="field"><span className="label">Last name</span><input className="input" autoComplete="family-name" placeholder="Your last name" value={f.last} onChange={set("last")} /></label>
      </div>
      <label className="field"><span className="label">Work email</span><input className="input" type="email" required autoComplete="email" placeholder="you@company.com" value={f.email} onChange={set("email")} /></label>
      <label className="field"><span className="label">Company</span><input className="input" required autoComplete="organization" placeholder="Company name" value={f.company} onChange={set("company")} /></label>
      <div className="mk-2">
        <label className="field"><span className="label">Team size</span><select className="input" value={f.size} onChange={set("size")}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="field"><span className="label">Main use case</span><select className="input" value={f.use} onChange={set("use")}>{USES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label className="field"><span className="label">Anything we should know?</span><input className="input" placeholder="Moving from DocSend, ~40 active data rooms…" value={f.note} onChange={set("note")} /></label>
      {err && <p className="caption" style={{ color: "var(--dz-text-danger, #d92d20)", margin: 0 }}>{err}</p>}
      <button className="btn btn-brand btn-l btn-block" disabled={busy}>{busy ? "Sending…" : "Book my demo"}</button>
      <p className="caption muted" style={{ margin: 0 }}>We’ll reply within one business day. By submitting you agree to our <Link href="/legal/privacy" className="link">Privacy Policy</Link>.</p>
    </form>
  );
}
