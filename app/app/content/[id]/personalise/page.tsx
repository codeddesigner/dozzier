"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Plus, Trash2, Upload, ClipboardPaste, Copy, Mail, Check, Users, Send } from "lucide-react";
import { sendEach } from "@/lib/sendEmail";
import { supabase, Doc , DOC_COLS } from "@/lib/supabase";
import { Avatar, Loading, Toggle, copy, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, slugify } from "@/lib/format";
import { standardPreset } from "@/lib/linkDefaults";
import { fillTemplate, linkUrlOf } from "@/components/LinkReady";

type R = { email: string; name: string; company: string; slug?: string; linkId?: string };
const FREE = ["gmail", "googlemail", "yahoo", "outlook", "hotmail", "icloud", "me", "proton", "protonmail", "aol", "live"];
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function companyOf(email: string) {
  const d = email.split("@")[1]?.split(".")[0] || "";
  if (FREE.includes(d.toLowerCase())) return "";
  return d.charAt(0).toUpperCase() + d.slice(1);
}
function parse(text: string): R[] {
  const out: R[] = [];
  text.split(/\r?\n/).forEach((line) => {
    const emails = line.match(EMAIL_RE);
    if (!emails) return;
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    emails.forEach((e) => {
      const rest = cells.filter((c) => c && !c.includes("@"));
      out.push({ email: e.toLowerCase(), name: rest[0] || displayName(e), company: rest[1] || companyOf(e) });
    });
  });
  return out;
}

export default function Personalise() {
  const { id } = useParams<{ id: string }>();
  const { profile, email: me } = useApp();
  const { data: doc, loading } = useLoad<Doc>(async () => { const r = await supabase.from("documents").select(DOC_COLS).eq("id", id).single(); if (r.error) throw r.error; return r.data as Doc; }, [id]);
  const [rows, setRows] = useState<R[]>([]);
  const [draft, setDraft] = useState("");
  const [paste, setPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState(() => { const p = standardPreset(profile.settings); return { require_email: p.require_email.on, watermark: p.watermark.on, allow_download: p.allow_download.on, notify: p.notify.on, lock_email: true, expire: p.expiry.on }; });
  const fileRef = useRef<HTMLInputElement>(null);
  const tpls = (profile.settings?.email?.templates as { name: string; subject: string; body: string }[] | undefined) || [];
  const [tplIdx, setTplIdx] = useState(0);
  const [mail, setMail] = useState<Record<string, "sending" | "sent" | "failed">>({});
  const tpl = tpls[tplIdx] || { name: "Default", subject: "{{document}} for {{company}}", body: "Hi {{first_name}},\n\nHere’s {{document}}, tailored for {{company}}: {{link}}\n\nIt’s private to you — feel free to forward it to your team.\n\n{{signature}}" };
  const sender = profile.full_name || me.split("@")[0];

  const add = (list: R[]) => setRows((r) => { const seen = new Set(r.map((x) => x.email)); return [...r, ...list.filter((x) => !seen.has(x.email) && (seen.add(x.email), true))]; });
  const created = rows.filter((r) => r.slug).length;
  const sample = rows[0] || { email: "alex@acme.com", name: "Alex Rivera", company: "Acme" };
  const varsFor = (r: R) => ({ first_name: r.name.split(" ")[0], company: r.company || r.name, document: doc?.name || "", link: r.slug ? linkUrlOf(r.slug) + (opts.lock_email ? `?email=${encodeURIComponent(r.email)}` : "") : "[unique link]", signature: profile.settings?.email?.signature || sender });
  const preview = useMemo(() => ({ subject: fillTemplate(tpl.subject, varsFor(sample)), body: fillTemplate(tpl.body, varsFor(sample)) }), [tpl, sample, doc, opts]); // eslint-disable-line react-hooks/exhaustive-deps

  async function emailRows(list: R[]) {
    if (!list.length) return;
    setMail((m) => ({ ...m, ...Object.fromEntries(list.map((r) => [r.email, "sending" as const])) }));
    const res = await sendEach(list, (r) => { const v = varsFor(r); return { kind: "share" as const, to: [r.email], subject: fillTemplate(tpl.subject, v), message: fillTemplate(tpl.body, v), cta: { label: `Open ${doc?.name || "document"}`, url: v.link }, meta: { template: "share" as const, title: doc?.name || undefined } }; },
      (r, err) => setMail((m) => ({ ...m, [r.email]: err ? "failed" : "sent" })));
    toast(res.failed ? `${res.ok} sent, ${res.failed} failed${res.error ? ` — ${res.error}` : ""}` : `Emailed ${res.ok} recipient${res.ok === 1 ? "" : "s"}`);
  }
  const unsent = rows.filter((r) => r.slug && mail[r.email] !== "sent" && mail[r.email] !== "sending");

  async function createAll(): Promise<R[]> {
    if (!doc) return [];
    const todo = rows.filter((r) => !r.slug);
    if (!todo.length) return [];
    setBusy(true);
    const expires = opts.expire ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
    const payload = todo.map((r) => ({ name: `${doc.name} — ${r.company || r.name}`, slug: slugify(r.company || r.name), enabled: true, document_id: doc.id, require_email: opts.require_email, allow_download: opts.allow_download, watermark: opts.watermark, notify: opts.notify, expires_at: expires, allowed_domains: null, passcode: null, require_nda: false, screenshot_protection: false }));
    const res = await supabase.from("links").insert(payload).select("id,slug");
    setBusy(false);
    if (res.error) { toast(res.error.message); return []; }
    const made = res.data as { id: string; slug: string }[];
    const done = todo.map((r, j) => ({ ...r, slug: made[j]?.slug, linkId: made[j]?.id }));
    setRows((rs) => rs.map((r) => done.find((d) => d.email === r.email) || r));
    toast(`${made.length} personalised link${made.length === 1 ? "" : "s"} created`);
    return done;
  }
  async function createAndSend() {
    const fresh = await createAll();
    const toSend = [...fresh, ...rows.filter((r) => r.slug && mail[r.email] !== "sent" && mail[r.email] !== "sending")];
    if (toSend.length) await emailRows(toSend);
  }

  if (loading && !doc) return <Loading />;
  if (!doc) return <div className="content"><p className="error-text">Document not found.</p></div>;

  return (
    <div className="content">
      <div className="row gap-8 wrap head-row">
        <h1 className="page-title grow head-main">Personalise “{doc.name}”</h1>
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={16} />Import CSV</button>
        <button className="btn btn-secondary" onClick={() => toast("Connect HubSpot in Settings → Integrations to import a list")}>From HubSpot list</button>
        <button className="btn btn-ghost" onClick={() => setPaste((p) => !p)}><ClipboardPaste size={16} />Paste list</button>
      </div>

      <div className="pz-grid mt-24">
        <section className="card" style={{ padding: 20, minWidth: 0 }}>
          <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
            <span className="h3 grow">Recipients <span className="muted">({rows.length})</span></span>
            <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const list = parse(await f.text()); add(list); toast(`${list.length} recipient${list.length === 1 ? "" : "s"} imported`); e.target.value = ""; }} />
          </div>
          {paste && (
            <div className="col gap-8" style={{ marginBottom: 12 }}>
              <textarea className="input" rows={4} autoFocus placeholder={"Paste emails or rows like:\nAlex Rivera, Acme, alex@acme.com"} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div><button className="btn btn-primary btn-s" disabled={!draft.trim()} onClick={() => { const l = parse(draft); add(l); setDraft(""); setPaste(false); toast(`${l.length} added`); }}>Add recipients</button></div>
            </div>
          )}
          <form className="row gap-8" onSubmit={(e) => { e.preventDefault(); const l = parse(draft || ""); if (!paste && l.length) { add(l); setDraft(""); } }} style={{ display: paste ? "none" : "flex" }}>
            <input className="input grow" placeholder="Add an email, e.g. alex@acme.com" value={paste ? "" : draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn btn-secondary" type="submit"><Plus size={14} />Add</button>
          </form>
          <table className="table mt-16">
            <thead><tr><th>Recipient</th><th className="hide-sm">Company</th><th>Link</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} className="table-empty">Add recipients to create a unique, trackable link for each of them.</td></tr>}
              {rows.map((r, i) => {
                const url = r.slug ? linkUrlOf(r.slug) + (opts.lock_email ? `?email=${encodeURIComponent(r.email)}` : "") : "";
                const v = varsFor(r);
                return (
                  <tr key={r.email} style={{ animation: "rise .3s ease both", animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                    <td><div className="row gap-8"><Avatar name={r.name} email={r.email} size={28} /><div className="col" style={{ minWidth: 0 }}>
                      <input className="pz-inline medium" value={r.name} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Name" />
                      <span className="caption muted ellipsis">{r.email}</span></div></div></td>
                    <td className="hide-sm"><input className="pz-inline" value={r.company} placeholder="—" onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))} aria-label="Company" /></td>
                    <td>{r.slug ? <span className="row gap-4">
                      <button className="icon-btn s" aria-label="Copy link" onClick={() => copy(url, "Link copied")}><Copy size={14} /></button>
                      <a className="icon-btn s hide-sm" aria-label="Open in mail app" href={`mailto:${r.email}?subject=${encodeURIComponent(fillTemplate(tpl.subject, v))}&body=${encodeURIComponent(fillTemplate(tpl.body, v))}`}><Mail size={14} /></a>
                      {mail[r.email] === "sent" ? <span className="badge badge-success"><Check size={12} />Emailed</span>
                        : mail[r.email] === "sending" ? <span className="caption muted">Sending…</span>
                        : <button className="btn btn-secondary btn-s" onClick={() => emailRows([r])}><Send size={12} />{mail[r.email] === "failed" ? "Retry" : "Send"}</button>}</span> : <span className="caption faint">Not created</span>}</td>
                    <td>{!r.slug && <button className="icon-btn s" aria-label="Remove" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {created > 0 && <div className="row gap-8 mt-16 wrap">{unsent.length > 0 && <button className="btn btn-primary btn-s" onClick={() => emailRows(unsent)}><Send size={14} />Email {unsent.length === created ? "all " : ""}{unsent.length}</button>}<button className="btn btn-secondary btn-s" onClick={() => copy(rows.filter((r) => r.slug).map((r) => `${r.name} <${r.email}>: ${linkUrlOf(r.slug!)}${opts.lock_email ? `?email=${encodeURIComponent(r.email)}` : ""}`).join("\n"), "All links copied")}><Copy size={14} />Copy all links</button><Link className="btn btn-ghost btn-s" href={`/app/content/${doc.id}?tab=links`}>View in Links</Link></div>}
        </section>

        <section className="card pz-side">
          <div className="row" style={{ marginBottom: 12 }}><span className="h3 grow">Email preview</span>
            {tpls.length > 1 && <select className="input" style={{ width: "auto", height: 32 }} value={tplIdx} onChange={(e) => setTplIdx(Number(e.target.value))}>{tpls.map((t, i) => <option key={i} value={i}>{t.name}</option>)}</select>}</div>
          <div className="pz-mail"><span className="semibold">Subject: {preview.subject}</span><pre>{preview.body}</pre></div>
          <div className="pz-opts">
            {([["require_email", "Require email (pre-filled)"], ["notify", "Notify me on first open"], ["expire", "Expire after 30 days"]] as const).map(([k, l]) => (
              <div className="row" key={k}><span className="grow">{l}</span><Toggle on={opts[k]} onChange={(v: boolean) => setOpts((o) => ({ ...o, [k]: v, ...(k === "require_email" ? { lock_email: v } : {}) }))} /></div>
            ))}
          </div>
          <button className="btn btn-brand btn-block" disabled={busy || (rows.length === 0) || (rows.length === created && unsent.length === 0)} onClick={createAndSend}>
            {busy ? "Creating…" : rows.length - created > 0 ? `Create ${rows.length - created} link${rows.length - created === 1 ? "" : "s"} & send` : unsent.length ? `Send ${unsent.length} email${unsent.length === 1 ? "" : "s"}` : rows.length ? "All sent" : "Add recipients to start"}
          </button>
          <span className="caption faint">Edit the message in <Link href="/app/settings/email" className="link">Settings → Email</Link>.</span>
        </section>
      </div>
    </div>
  );
}
