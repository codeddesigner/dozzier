"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, PenLine, Pencil, CalendarDays, User, Building2, Type, Plus, X, Download, Copy, Mail, ChevronRight, Ban, Send, FolderLock } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Avatar, Loading, Modal, copy, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName, timeAgo } from "@/lib/format";
import { Pages, startDrag } from "@/components/esign/Pages";
import { FIELD_META, Field, FieldKind, Signer, buildSignedPdf, colorOf, docId, saveBytes, sha256 } from "@/lib/esign";

type A = { id: string; name: string; file_path: string | null; body: string | null; kind: string; status: "draft" | "sent" | "completed" | "voided"; sent_at: string | null; completed_at: string | null; doc_hash: string | null; sender_email: string | null; space_id: string | null; page_count: number; is_template: boolean; created_at: string };
const KIND_ICON: Record<FieldKind, typeof PenLine> = { signature: PenLine, initials: Pencil, date: CalendarDays, name: User, company: Building2, text: Type };
const signUrl = (t: string) => `${window.location.origin}/s/${t}`;

export default function AgreementPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, reload } = useLoad(async () => {
    const [a, s, f, sp] = await Promise.all([
      supabase.from("agreements").select("*").eq("id", id).single(),
      supabase.from("agreement_signers").select("*").eq("agreement_id", id).order("position"),
      supabase.from("agreement_fields").select("*").eq("agreement_id", id),
      supabase.from("spaces").select("id,name").order("updated_at", { ascending: false }),
    ]);
    if (a.error) throw a.error;
    const url = a.data.file_path ? (await supabase.storage.from(BUCKET).createSignedUrl(a.data.file_path, 3600)).data?.signedUrl || null : null;
    return { a: a.data as A, signers: (s.data || []) as Signer[], fields: (f.data || []) as Field[], spaces: (sp.data || []) as { id: string; name: string }[], url };
  }, [id]);
  if (loading && !data) return <Loading />;
  if (!data) return <div className="content"><p className="error-text">Agreement not found.</p></div>;
  return data.a.status === "draft" ? <Prepare {...data} reload={reload} /> : <Status {...data} reload={reload} />;
}

function Prepare({ a, signers, fields: initial, spaces, url, reload }: { a: A; signers: Signer[]; fields: Field[]; spaces: { id: string; name: string }[]; url: string | null; reload: () => void }) {
  const { email, profile } = useApp();
  const [fields, setFields] = useState<Field[]>(initial);
  const [active, setActive] = useState<string | null>(signers[0]?.id || null);
  const [sel, setSel] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState<{ id?: string; name: string; email: string } | null>(null);
  const [sent, setSent] = useState<Signer[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(a.name);
  useEffect(() => setFields(initial), [initial]);
  useEffect(() => { if (!active && signers[0]) setActive(signers[0].id); }, [signers, active]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (sel && (e.key === "Delete" || e.key === "Backspace") && !(e.target as HTMLElement).closest("input,textarea")) removeField(sel); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  const idx = (sid: string) => signers.findIndex((s) => s.id === sid);

  async function addSigner() {
    if (!adding) return;
    const em = adding.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("Enter a valid email");
    if (adding.id) {
      const { error } = await supabase.from("agreement_signers").update({ name: adding.name.trim() || displayName(em), email: em, is_owner: em === email.toLowerCase() }).eq("id", adding.id);
      if (error) return toast(error.message);
      setAdding(null); reload(); return;
    }
    const { data: s, error } = await supabase.from("agreement_signers").insert({ agreement_id: a.id, name: adding.name.trim() || displayName(em), email: em, position: signers.length + 1, is_owner: em === email.toLowerCase() }).select("id").single();
    if (error) return toast(error.message);
    setAdding(null); setActive(s.id); reload();
  }
  async function addMe() {
    const { data: s } = await supabase.from("agreement_signers").insert({ agreement_id: a.id, name: profile.full_name || displayName(email), email: email.toLowerCase(), position: signers.length + 1, is_owner: true }).select("id").single();
    if (s) setActive(s.id); reload();
  }
  async function removeSigner(s: Signer) { await supabase.from("agreement_signers").delete().eq("id", s.id); if (active === s.id) setActive(null); reload(); }
  async function addField(kind: FieldKind, pg = page, cx?: number, cy?: number) {
    if (!active) return toast("Add a signer first");
    const m = FIELD_META[kind];
    const x = Math.min(1 - m.w, Math.max(0, (cx ?? 0.12 + (fields.filter((f) => f.page === pg).length % 4) * 0.04) - (cx !== undefined ? m.w / 2 : 0)));
    const y = Math.min(1 - m.h, Math.max(0, (cy ?? 0.72 + (fields.filter((f) => f.page === pg).length % 5) * 0.045) - (cy !== undefined ? m.h / 2 : 0)));
    const { data: f, error } = await supabase.from("agreement_fields").insert({ agreement_id: a.id, signer_id: active, kind, page: pg, x, y, w: m.w, h: m.h }).select("*").single();
    if (error) return toast(error.message);
    setFields((fs) => [...fs, f as Field]); setSel(f.id);
  }
  async function removeField(fid: string) { setFields((fs) => fs.filter((f) => f.id !== fid)); setSel(null); await supabase.from("agreement_fields").delete().eq("id", fid); }
  async function saveTemplate() {
    const { data: t, error } = await supabase.from("agreements").insert({ name: `${a.name}`, file_path: a.file_path, body: a.body, kind: "esign", status: "draft", is_template: true, page_count: a.page_count }).select("id").single();
    if (error) return toast(error.message);
    // Template keeps field layout, assigned to placeholder roles.
    const roles = await supabase.from("agreement_signers").insert(signers.map((s, i) => ({ agreement_id: t.id, name: s.is_owner ? "You" : `Signer ${i + 1}`, email: s.is_owner ? email : `signer${i + 1}@example.com`, position: s.position, is_owner: !!s.is_owner }))).select("id,position");
    const map = new Map((roles.data || []).map((r) => [r.position, r.id]));
    await supabase.from("agreement_fields").insert(fields.map((f) => ({ agreement_id: t.id, signer_id: map.get(signers.find((s) => s.id === f.signer_id)?.position || 0), kind: f.kind, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h })).filter((f) => f.signer_id));
    toast("Saved as template");
  }
  async function send() {
    if (!signers.length) return toast("Add at least one signer");
    const missing = signers.filter((s) => !fields.some((f) => f.signer_id === s.id && f.kind === "signature"));
    if (missing.length) return toast(`Add a signature field for ${missing.map((m) => m.name).join(", ")}`);
    if (!url) return toast("This agreement has no document");
    setBusy(true);
    const hash = await sha256(await (await fetch(url)).arrayBuffer());
    const { error } = await supabase.from("agreements").update({ status: "sent", sent_at: new Date().toISOString(), doc_hash: hash, sender_email: email, name: name.trim() || a.name }).eq("id", a.id);
    setBusy(false);
    if (error) return toast(error.message);
    const fresh = await supabase.from("agreement_signers").select("*").eq("agreement_id", a.id).order("position");
    setSent((fresh.data || []) as Signer[]);
  }

  return (
    <div className="es-editor">
      <header className="es-top">
        <Link href="/app/agreements" className="icon-btn" aria-label="Back to agreements"><ArrowLeft size={18} /></Link>
        <input className="es-title" value={name} onChange={(e) => setName(e.target.value)} onBlur={async () => { if (name.trim() && name !== a.name) await supabase.from("agreements").update({ name: name.trim() }).eq("id", a.id); }} aria-label="Agreement name" />
        <span className="grow" />
        {a.is_template ? <><span className="badge badge-brand">Template</span><Link href="/app/agreements" className="btn btn-dark">Done</Link></> : <>
        <button className="btn btn-secondary" onClick={saveTemplate}>Save as template</button>
        <button className="btn btn-dark" disabled={busy} onClick={send}><Send size={15} />{busy ? "Sending…" : "Send for signature"}</button></>}
      </header>
      <div className="es-body">
        <aside className="es-side">
          <div className="es-label">Signers</div>
          {signers.map((s, i) => (
            <button key={s.id} className={`es-signer ${active === s.id ? "on" : ""}`} onClick={() => setActive(s.id)} onDoubleClick={() => setAdding({ id: s.id, name: s.name, email: s.email })} title="Double-click to edit" style={{ "--c": colorOf(i) } as React.CSSProperties}>
              <span className="es-dot" /><span className="col grow" style={{ minWidth: 0, textAlign: "left" }}><span className="medium ellipsis">{s.name}</span><span className="caption muted ellipsis">{s.is_owner ? "You" : s.email}</span></span>
              <span className="caption muted">{i + 1}</span>
              <span className="es-x" role="button" aria-label={`Edit ${s.name}`} onClick={(e) => { e.stopPropagation(); setAdding({ id: s.id, name: s.name, email: s.email }); }}><Pencil size={11} /></span>
              <span className="es-x" role="button" aria-label={`Remove ${s.name}`} onClick={(e) => { e.stopPropagation(); removeSigner(s); }}><X size={12} /></span>
            </button>
          ))}
          {adding ? (
            <div className="es-add col gap-6">
              <input className="input" autoFocus placeholder="Name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
              <input className="input" placeholder="email@company.com" value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addSigner()} />
              <div className="row gap-6"><button className="btn btn-dark btn-s" onClick={addSigner}>{adding.id ? "Save" : "Add"}</button><button className="btn btn-ghost btn-s" onClick={() => setAdding(null)}>Cancel</button></div>
            </div>
          ) : (
            <div className="row gap-6"><button className="btn btn-ghost btn-s" onClick={() => setAdding({ name: "", email: "" })}><Plus size={14} />Add signer</button>
              {!signers.some((s) => s.is_owner) && <button className="btn btn-ghost btn-s" onClick={addMe}>Add me</button>}</div>
          )}
          <div className="es-label mt-16">Fields {active && <span className="caption muted" style={{ textTransform: "none", letterSpacing: 0 }}>· for {signers.find((s) => s.id === active)?.name}</span>}</div>
          {(Object.keys(FIELD_META) as FieldKind[]).map((k) => { const I = KIND_ICON[k]; return (
            <button key={k} className="es-tool" draggable onDragStart={(e) => e.dataTransfer.setData("text/dz-field", k)} onClick={() => addField(k)}><I size={15} />{FIELD_META[k].label}</button>
          ); })}
          <span className="caption faint">Click to add on page {page}, or drag onto the document.</span>
          <div className="es-label mt-16">When everyone has signed</div>
          <label className="row gap-8 caption"><FolderLock size={14} /><select className="input select-s grow" value={a.space_id || ""} onChange={async (e) => { await supabase.from("agreements").update({ space_id: e.target.value || null }).eq("id", a.id); reload(); }}>
            <option value="">Don’t grant Space access</option>{spaces.map((s) => <option key={s.id} value={s.id}>Grant access to {s.name}</option>)}</select></label>
        </aside>
        <main className="es-canvas" onPointerDown={() => setSel(null)}>
          {url ? <Pages url={url} count={a.page_count} onPageDown={setPage}
            onDrop={(pg, x, y, e) => { const k = e.dataTransfer.getData("text/dz-field") as FieldKind; if (k in FIELD_META) { setPage(pg); addField(k, pg, x, y); } }}
            overlay={(pg) => fields.filter((f) => f.page === pg).map((f) => {
              const i = idx(f.signer_id); const s = signers[i]; const I = KIND_ICON[f.kind];
              return (
                <div key={f.id} className={`es-field ${sel === f.id ? "sel" : ""}`} style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%`, "--c": colorOf(i) } as React.CSSProperties}
                  onPointerDown={(e) => { setSel(f.id); startDrag(e, f, (x, y) => setFields((fs) => fs.map((z) => (z.id === f.id ? { ...z, x, y } : z))), (x, y) => supabase.from("agreement_fields").update({ x, y }).eq("id", f.id).then(() => {})); }}>
                  <I size={13} /><span className="ellipsis">{FIELD_META[f.kind].label}{s ? ` · ${s.name.split(" ")[0]}` : ""}</span>
                  {sel === f.id && <button className="es-fx" aria-label="Remove field" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeField(f.id)}><X size={11} /></button>}
                </div>
              );
            })} /> : <div className="es-empty">This agreement has no document attached.</div>}
        </main>
      </div>
      {sent && (
        <Modal title="Sent for signature" onClose={() => { setSent(null); reload(); }} width={540} footer={<><span className="grow" /><button className="btn btn-primary" onClick={() => { setSent(null); reload(); }}>Done</button></>}>
          <div className="col gap-12">
            <p className="muted" style={{ fontSize: 14 }}>Send each signer their private link. You’ll see when they open and sign it.</p>
            {sent.map((s, i) => {
              const body = `Hi ${s.name.split(" ")[0]},\n\nPlease review and sign “${name}”: ${signUrl(s.token!)}\n\nIt takes about a minute — no account needed.\n\nThanks,\n${profile.full_name || displayName(email)}`;
              return (
                <div key={s.id} className="row gap-10 member-row" style={{ padding: "8px 0" }}>
                  <span className="es-dot" style={{ "--c": colorOf(i) } as React.CSSProperties} /><span className="col grow" style={{ minWidth: 0 }}><span className="medium">{s.name}</span><span className="caption muted ellipsis">{s.email}</span></span>
                  {s.is_owner ? <a className="btn btn-dark btn-s" href={signUrl(s.token!)} target="_blank" rel="noreferrer">Sign now</a> : <>
                    <button className="icon-btn s" aria-label="Copy signing link" onClick={() => copy(signUrl(s.token!), "Signing link copied")}><Copy size={14} /></button>
                    <a className="btn btn-secondary btn-s" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(s.email)}&su=${encodeURIComponent(`Please sign: ${name}`)}&body=${encodeURIComponent(body)}`}><Mail size={14} />Gmail</a></>}
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Status({ a, signers, fields, spaces, url, reload }: { a: A; signers: Signer[]; fields: Field[]; spaces: { id: string; name: string }[]; url: string | null; reload: () => void }) {
  const { email, profile } = useApp();
  const [busy, setBusy] = useState(false);
  const space = spaces.find((s) => s.id === a.space_id);
  const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  const signed = signers.filter((s) => s.signed_at).length;
  async function download() {
    if (!url) return;
    setBusy(true);
    try {
      const orig = await (await fetch(url)).arrayBuffer();
      if (a.status !== "completed") { saveBytes(a.name, new Uint8Array(orig)); return; }
      const bytes = await buildSignedPdf({ original: orig, name: a.name, id: a.id, hash: a.doc_hash, sentAt: a.sent_at, sender: a.sender_email || email, signers, fields, space: space?.name });
      saveBytes(`${a.name} — signed`, bytes);
    } catch (e) { toast(e instanceof Error ? e.message : "Couldn’t build the PDF"); } finally { setBusy(false); }
  }
  return (
    <div className="content">
      <div className="row gap-6 body-m"><Link href="/app/agreements" className="muted">Agreements</Link><ChevronRight size={14} className="faint" /><span className="semibold">{a.status === "completed" ? "Signed & certified" : a.name}</span></div>
      <h1 className="page-title mt-24">{a.name}</h1>
      <div className="mt-8">{a.status === "completed" ? <span className="status-pill ok"><span className="live-dot" />Completed · {fmt(a.completed_at)}</span>
        : a.status === "voided" ? <span className="status-pill muted">Voided</span> : <span className="status-pill wait">Waiting for {signers.length - signed} of {signers.length}</span>}</div>
      <div className="cert-grid mt-24">
        <section className="card">
          <div className="row cert-head"><span className="h3 grow">{a.status === "completed" ? "Certificate of completion" : "Audit trail"}</span>
            <button className="btn btn-secondary btn-s" disabled={busy || !url} onClick={download}><Download size={14} />{busy ? "Preparing…" : a.status === "completed" ? "Download PDF" : "Original PDF"}</button></div>
          {([["Document ID", docId(a.id)], ["SHA-256", a.doc_hash ? `${a.doc_hash.slice(0, 4)}…${a.doc_hash.slice(-4)}` : "—"], ["Sent", `${fmt(a.sent_at)} by ${a.sender_email || email}`]] as [string, string][]).concat(
            signers.map((s) => [`Signed — ${s.name}`, s.signed_at ? [fmt(s.signed_at), s.ip, s.location].filter(Boolean).join(" · ") : s.viewed_at ? `Opened ${timeAgo(s.viewed_at).toLowerCase()} · not signed yet` : "Not opened yet"] as [string, string]),
            space ? [["Linked Space", `${space.name}${a.status === "completed" ? " (access granted)" : " (access on completion)"}`]] : []).map(([k, v]) => (
            <div className="cert-row" key={k}><span className="muted">{k}</span><span title={k === "SHA-256" ? a.doc_hash || "" : undefined} className={k === "SHA-256" ? "mono" : ""}>{v}</span></div>
          ))}
        </section>
        <aside className="col gap-16">
          <section className="card" style={{ padding: 16 }}>
            <div className="h3" style={{ marginBottom: 10 }}>Signers</div>
            {signers.map((s) => (
              <div key={s.id} className="row gap-10" style={{ padding: "7px 0" }}>
                <Avatar name={s.name} email={s.email} size={28} /><span className="grow medium ellipsis">{s.name}</span>
                {s.signed_at ? <span className="badge badge-success">Signed</span> : a.status === "sent" ? <>
                  <button className="icon-btn s" aria-label="Copy signing link" onClick={() => copy(signUrl(s.token!), "Signing link copied")}><Copy size={13} /></button>
                  {s.is_owner ? <a className="btn btn-dark btn-s" href={signUrl(s.token!)} target="_blank" rel="noreferrer">Sign</a>
                    : <a className="btn btn-ghost btn-s" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(s.email)}&su=${encodeURIComponent(`Reminder: please sign ${a.name}`)}&body=${encodeURIComponent(`Hi ${s.name.split(" ")[0]},\n\nA quick reminder to sign “${a.name}”: ${signUrl(s.token!)}\n\nThanks,\n${profile.full_name || displayName(email)}`)}`}>Remind</a>}
                </> : <span className="badge badge-muted">—</span>}
              </div>
            ))}
          </section>
          {a.status === "sent" && <button className="btn btn-ghost btn-s" style={{ alignSelf: "flex-start" }} onClick={async () => { if (!confirm("Void this agreement? Signing links stop working.")) return; await supabase.from("agreements").update({ status: "voided", voided_at: new Date().toISOString() }).eq("id", a.id); reload(); }}><Ban size={14} />Void agreement</button>}
        </aside>
      </div>
    </div>
  );
}
