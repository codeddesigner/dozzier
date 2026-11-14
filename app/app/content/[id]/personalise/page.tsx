"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Plus, Trash2, Upload, ClipboardPaste, Copy, Mail, Check, Users } from "lucide-react";
import { supabase, Doc } from "@/lib/supabase";
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
  const { data: doc, loading } = useLoad<Doc>(async () => { const r = await supabase.from("documents").select("*").eq("id", id).single(); if (r.error) throw r.error; return r.data as Doc; }, [id]);
  const [rows, setRows] = useState<R[]>([]);
  const [draft, setDraft] = useState("");
  const [paste, setPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState(() => { const p = standardPreset(profile.settings); return { require_email: p.require_email.on, watermark: p.watermark.on, allow_download: p.allow_download.on, notify: p.notify.on, lock_email: true }; });
  const fileRef = useRef<HTMLInputElement>(null);
  const tpls = (profile.settings?.email?.templates as { name: string; subject: string; body: string }[] | undefined) || [];
  const [tplIdx, setTplIdx] = useState(0);
  const tpl = tpls[tplIdx] || { name: "Default", subject: "{{document}} for {{company}}", body: "Hi {{first_name}},\n\nHere’s {{document}}, tailored for {{company}}: {{link}}\n\nIt’s private to you — feel free to forward it to your team.\n\n{{signature}}" };
  const sender = profile.full_name || me.split("@")[0];

  const add = (list: R[]) => setRows((r) => { const seen = new Set(r.map((x) => x.email)); return [...r, ...list.filter((x) => !seen.has(x.email) && (seen.add(x.email), true))]; });
  const created = rows.filter((r) => r.slug).length;
  const sample = rows[0] || { email: "alex@acme.com", name: "Alex Rivera", company: "Acme" };
  const varsFor = (r: R) => ({ first_name: r.name.split(" ")[0], company: r.company || r.name, document: doc?.name || "", link: r.slug ? linkUrlOf(r.slug) + (opts.lock_email ? `?email=${encodeURIComponent(r.email)}` : "") : "[unique link]", signature: profile.settings?.email?.signature || sender });
  const preview = useMemo(() => ({ subject: fillTemplate(tpl.subject, varsFor(sample)), body: fillTemplate(tpl.body, varsFor(sample)) }), [tpl, sample, doc, opts]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createAll() {
    if (!doc) return;
    const todo = rows.filter((r) => !r.slug);
    if (!todo.length) return;
    setBusy(true);
    const expires = standardPreset(profile.settings).expiry.on ? new Date(Date.now() + 30 * 86400000).toISOString() : null;
    const payload = todo.map((r) => ({ name: `${doc.name} — ${r.company || r.name}`, slug: slugify(r.company || r.name), enabled: true, document_id: doc.id, require_email: opts.require_email, allow_download: opts.allow_download, watermark: opts.watermark, notify: opts.notify, expires_at: expires, allowed_domains: null, passcode: null, require_nda: false, screenshot_protection: false }));
    const res = await supabase.from("links").insert(payload).select("id,slug");
    setBusy(false);
    if (res.error) return toast(res.error.message);
    const made = res.data as { id: string; slug: string }[];
    let i = 0;
    setRows((rs) => rs.map((r) => (r.slug ? r : { ...r, slug: made[i]?.slug, linkId: made[i++]?.id })));
    toast(`${made.length} personalised link${made.length === 1 ? "" : "s"} created`);
  }

  if (loading && !doc) return <Loading />;
  if (!doc) return <div className="content"><p className="error-text">Document not found.</p></div>;

  return (
    <div className="content">
      <div className="row gap-6 body-m"><Link href="/app/content" className="muted">Content</Link><ChevronRight size={14} className="faint" /><Link href={`/app/content/${doc.id}`} className="muted ellipsis">{doc.name}</Link><ChevronRight size={14} className="faint" /><span className="semibold">Personalise links</span></div>
      <div className="row gap-12 mt-24" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="col gap-4 grow"><span className="page-title">Personalise links</span><span className="muted body-m">One unique link per recipient, so you know exactly who opened what.</span></div>
        <button className="btn btn-primary" disabled={busy || rows.length === created} onClick={createAll}><Users size={16} />{busy ? "Creating…" : rows.length - created > 0 ? `Create ${rows.length - created} link${rows.length - created === 1 ? "" : "s"}` : "Create links"}</button>
      </div>

      <div className="pz-grid mt-24">
        <section className="card" style={{ padding: 20, minWidth: 0 }}>
          <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
            <span className="h3 grow">Recipients <span className="muted">({rows.length})</span></span>
            <button className="btn btn-secondary btn-s" onClick={() => setPaste((p) => !p)}><ClipboardPaste size={14} />Paste list</button>
            <button className="btn btn-secondary btn-s" onClick={() => fileRef.current?.click()}><Upload size={14} />Import CSV</button>
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
                      <a className="icon-btn s" aria-label="Email" href={`mailto:${r.email}?subject=${encodeURIComponent(fillTemplate(tpl.subject, v))}&body=${encodeURIComponent(fillTemplate(tpl.body, v))}`}><Mail size={14} /></a>
                      <span className="badge badge-success"><Check size={12} />Ready</span></span> : <span className="caption faint">Not created</span>}</td>
                    <td>{!r.slug && <button className="icon-btn s" aria-label="Remove" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><Trash2 size={14} /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {created > 0 && <div className="row gap-8 mt-16"><button className="btn btn-secondary btn-s" onClick={() => copy(rows.filter((r) => r.slug).map((r) => `${r.name} <${r.email}>: ${linkUrlOf(r.slug!)}${opts.lock_email ? `?email=${encodeURIComponent(r.email)}` : ""}`).join("\n"), "All links copied")}><Copy size={14} />Copy all links</button><Link className="btn btn-ghost btn-s" href={`/app/content/${doc.id}?tab=links`}>View in Links</Link></div>}
        </section>

        <div className="col gap-16">
          <section className="card" style={{ padding: 20 }}>
            <div className="row" style={{ marginBottom: 10 }}><span className="h3 grow">Email preview</span>
              {tpls.length > 1 && <select className="input" style={{ width: "auto", height: 32 }} value={tplIdx} onChange={(e) => setTplIdx(Number(e.target.value))}>{tpls.map((t, i) => <option key={i} value={i}>{t.name}</option>)}</select>}</div>
            <div className="lr-preview"><span className="caption muted">To: {sample.email}</span><span className="medium">{preview.subject}</span><pre>{preview.body}</pre></div>
            <span className="caption faint" style={{ display: "block", marginTop: 8 }}>Edit templates in <Link href="/app/settings/email" className="link">Settings → Email</Link>.</span>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <div className="h3" style={{ marginBottom: 6 }}>Link settings</div>
            {([["lock_email", "Pre-fill each recipient’s email"], ["require_email", "Require email to view"], ["watermark", "Dynamic watermark"], ["allow_download", "Allow downloads"], ["notify", "Notify me on every visit"]] as const).map(([k, l]) => (
              <div className="set-row" key={k}><span className="grow">{l}</span><Toggle on={opts[k]} onChange={(v: boolean) => setOpts((o) => ({ ...o, [k]: v }))} /></div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
