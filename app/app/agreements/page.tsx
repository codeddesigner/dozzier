"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Trash2, Download, Eye, Plus, Upload, FileText, Copy, ShieldCheck, ChevronDown } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { DocArt } from "@/components/DocArt";
import { Avatar, Empty, Loading, Menu, Modal, Tabs, toast, useLoad } from "@/components/ui";
import { NDA_TEMPLATE } from "@/components/nda";
import { useApp } from "@/components/AppContext";
import { countPdfPages } from "@/lib/pdf";
import { timeAgo } from "@/lib/format";
import { textToPdf } from "@/lib/esign";

type Agreement = { id: string; name: string; file_path: string | null; body: string | null; created_at: string; kind: "gate" | "esign"; status: "draft" | "sent" | "completed" | "voided"; is_template: boolean; page_count: number; sent_at: string | null; completed_at: string | null };
type S = { agreement_id: string; name: string; email: string; signed_at: string | null };
const STATUS: Record<Agreement["status"], [string, string]> = { draft: ["Draft", "badge-muted"], sent: ["Waiting", "badge-warn"], completed: ["Completed", "badge-success"], voided: ["Voided", "badge-muted"] };


export default function Agreements() {
  const router = useRouter();
  const { userId, wsId, email, profile } = useApp();
  const pdfInput = useRef<HTMLInputElement>(null);
  const gateInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"envelopes" | "templates" | "gate">("envelopes");
  const [view, setView] = useState<Agreement | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useLoad(async () => {
    const [a, s] = await Promise.all([supabase.from("agreements").select("*").order("created_at", { ascending: false }), supabase.from("agreement_signers").select("agreement_id,name,email,signed_at").order("position")]);
    return { list: (a.data || []) as Agreement[], signers: (s.data || []) as S[] };
  }, []);
  const envelopes = (data?.list || []).filter((a) => a.kind === "esign" && !a.is_template);
  const templates = (data?.list || []).filter((a) => a.kind === "esign" && a.is_template);
  const gates = (data?.list || []).filter((a) => a.kind === "gate");

  async function createFrom(bytes: Blob, name: string, pages: number) {
    const path = `${wsId}/agreements/${crypto.randomUUID()}-${name.replace(/[^\w.\-]+/g, "_")}.pdf`;
    const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf" });
    if (up.error) throw up.error;
    const { data: a, error } = await supabase.from("agreements").insert({ name, file_path: path, kind: "esign", status: "draft", page_count: pages }).select("id").single();
    if (error) throw error;
    await supabase.from("agreement_signers").insert({ agreement_id: a.id, name: profile.full_name || email.split("@")[0], email: email.toLowerCase(), position: 1, is_owner: true });
    router.push(`/app/agreements/${a.id}`);
  }
  async function uploadPdf(f: File) {
    if (!/pdf/i.test(f.type) && !/\.pdf$/i.test(f.name)) return toast("eSign works with PDFs — export your document as PDF first");
    setBusy(true);
    try { await createFrom(f, f.name.replace(/\.pdf$/i, ""), await countPdfPages(f)); } catch (e) { toast(e instanceof Error ? e.message : "Upload failed"); setBusy(false); }
  }
  async function fromNda() {
    setBusy(true);
    try { const { bytes, pages } = await textToPdf("Mutual NDA", NDA_TEMPLATE); await createFrom(new Blob([bytes as BlobPart], { type: "application/pdf" }), "Mutual NDA", pages); }
    catch (e) { toast(e instanceof Error ? e.message : "Couldn’t create the NDA"); setBusy(false); }
  }
  async function applyTemplate(t: Agreement) {
    setBusy(true);
    const { data: a, error } = await supabase.from("agreements").insert({ name: t.name, file_path: t.file_path, kind: "esign", status: "draft", page_count: t.page_count }).select("id").single();
    if (error) { setBusy(false); return toast(error.message); }
    const [rs, fs] = await Promise.all([supabase.from("agreement_signers").select("*").eq("agreement_id", t.id).order("position"), supabase.from("agreement_fields").select("*").eq("agreement_id", t.id)]);
    const made = await supabase.from("agreement_signers").insert((rs.data || []).map((r) => ({ agreement_id: a.id, name: r.is_owner ? profile.full_name || "You" : r.name, email: r.is_owner ? email.toLowerCase() : r.email, position: r.position, is_owner: r.is_owner }))).select("id,position");
    const map = new Map((made.data || []).map((m) => [m.position, m.id]));
    const pos = new Map((rs.data || []).map((r) => [r.id, r.position]));
    await supabase.from("agreement_fields").insert((fs.data || []).map((f) => ({ agreement_id: a.id, signer_id: map.get(pos.get(f.signer_id)), kind: f.kind, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h })).filter((f) => f.signer_id));
    router.push(`/app/agreements/${a.id}`);
  }
  async function uploadGate(f: File) {
    const path = `${wsId}/agreements/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (up.error) return toast(up.error.message);
    const body = f.type.startsWith("text/") ? await f.text() : null;
    await supabase.from("agreements").insert({ name: f.name.replace(/\.[^.]+$/, ""), file_path: path, body, kind: "gate" });
    toast("Agreement added — turn on “Require NDA” on any link to use it"); reload();
  }
  async function open(a: Agreement) {
    if (a.kind === "esign") return router.push(`/app/agreements/${a.id}`);
    if (a.body) return setView(a);
    if (a.file_path) { const { data: d } = await supabase.storage.from(BUCKET).createSignedUrl(a.file_path, 300); if (d) window.open(d.signedUrl, "_blank"); }
  }
  async function remove(a: Agreement) {
    const shared = (data?.list || []).some((x) => x.id !== a.id && x.file_path === a.file_path);
    if (a.file_path && !shared) await supabase.storage.from(BUCKET).remove([a.file_path]);
    await supabase.from("agreements").delete().eq("id", a.id); reload();
  }

  const newMenu = (
    <Menu label="Upload" trigger={<>{busy ? "Preparing…" : "Upload"}<ChevronDown size={16} /></>} items={[
      { label: "PDF to sign", icon: <Upload size={14} />, onClick: () => pdfInput.current?.click() },
      { label: "Gating agreement (NDA)", icon: <ShieldCheck size={14} />, onClick: () => gateInput.current?.click() },
      { label: "Mutual NDA template", icon: <FileText size={14} />, onClick: fromNda },
    ]} />
  );
  const isEmpty = !!data && envelopes.length === 0 && templates.length === 0 && gates.length === 0;
  async function downloadTemplate() {
    const { bytes } = await textToPdf("Mutual NDA", NDA_TEMPLATE);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })); a.download = "Mutual-NDA-template.pdf"; a.click();
  }

  return (
    <div className="content">
      <div className="page-head"><h1 className="page-title grow">Agreements</h1>{newMenu}</div>
      <input ref={pdfInput} type="file" hidden accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadPdf(f); }} />
      <input ref={gateInput} type="file" hidden accept=".pdf,.txt" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadGate(f); }} />
      {isEmpty ? (
        <div className="ag-empty">
          <DocArt big />
          <div className="ag-empty-title">Need to protect sensitive content?</div>
          <p className="muted">Set up a legally-binding agreement that viewers must sign before accessing your content. Upload an NDA or any gating document.</p>
          <button className="btn btn-outline" onClick={() => gateInput.current?.click()}>Upload agreement</button>
          <div className="row gap-8" style={{ marginTop: 40 }}>
            <button className="btn btn-secondary" disabled={busy} onClick={fromNda}>Use template</button>
            <button className="btn btn-secondary" onClick={downloadTemplate}>Download template</button>
          </div>
        </div>
      ) : <>
      <div className="mt-8"><Tabs value={tab} onChange={setTab} tabs={[{ id: "envelopes", label: `Sent for signature${envelopes.length ? ` (${envelopes.length})` : ""}` }, { id: "templates", label: `Templates${templates.length ? ` (${templates.length})` : ""}` }, { id: "gate", label: "Click-through NDA" }]} /></div>
      {loading && !data ? <Loading /> : tab === "envelopes" ? (
        envelopes.length === 0 ? (
          <Empty art={<DocArt />} title="Get agreements signed" body="Upload a PDF, place signature fields for each signer, and send. Everyone signs in the browser — you get a certified, tamper-evident copy.">{newMenu}</Empty>
        ) : (
          <div className="card mt-16">{envelopes.map((a, i) => {
            const ss = data!.signers.filter((s) => s.agreement_id === a.id);
            const n = ss.filter((s) => s.signed_at).length;
            return (
              <div key={a.id} className="fr-row" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} onClick={() => open(a)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(a)}>
                <span className="set-row-ico"><FileSignature size={16} /></span>
                <div className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{a.name}</span><span className="caption muted ellipsis">{a.status === "draft" ? `Draft · edited ${timeAgo(a.created_at).toLowerCase()}` : `${n} of ${ss.length} signed · sent ${timeAgo(a.sent_at || a.created_at).toLowerCase()}`}</span></div>
                <div className="avatar-stack hide-sm">{ss.slice(0, 4).map((s) => <span key={s.email} className={s.signed_at ? "" : "dim"}><Avatar name={s.name} email={s.email} size={24} /></span>)}</div>
                <span className={`badge ${STATUS[a.status][1]}`}>{STATUS[a.status][0]}</span>
                <Menu items={[{ label: a.status === "draft" ? "Edit" : "View certificate", icon: <Eye size={14} />, onClick: () => open(a) }, { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => remove(a) }]} />
              </div>
            );
          })}</div>
        )
      ) : tab === "templates" ? (
        templates.length === 0 ? <p className="muted mt-24">No templates yet. In the editor, choose <b>Save as template</b> to reuse a document with its fields already placed.</p> : (
          <div className="card mt-16">{templates.map((t) => (
            <div key={t.id} className="fr-row" onClick={() => applyTemplate(t)} role="button" tabIndex={0}>
              <span className="set-row-ico"><Copy size={16} /></span>
              <div className="col grow"><span className="medium">{t.name}</span><span className="caption muted">Saved {timeAgo(t.created_at).toLowerCase()}</span></div>
              <button className="btn btn-secondary btn-s" disabled={busy}><Plus size={14} />Use template</button>
              <Menu items={[{ label: "Edit template", icon: <Eye size={14} />, onClick: () => router.push(`/app/agreements/${t.id}`) }, { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => remove(t) }]} />
            </div>
          ))}</div>
        )
      ) : (
        <>
          <div className="row gap-12 mt-16 gate-note"><ShieldCheck size={18} className="brand" /><p className="muted grow" style={{ fontSize: 14 }}>Visitors accept your most recent click-through agreement on any link or Space with <b>Require NDA</b> turned on.</p>
            <button className="btn btn-secondary btn-s" onClick={async () => { await supabase.from("agreements").insert({ name: "Mutual NDA", body: NDA_TEMPLATE, kind: "gate" }); toast("Mutual NDA added"); reload(); }}>Use NDA template</button>
            <button className="btn btn-secondary btn-s" onClick={() => gateInput.current?.click()}><Upload size={14} />Upload</button></div>
          <table className="table mt-16">
            <thead><tr><th>Name</th><th>Type</th><th>Added</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>{gates.length === 0 && <tr><td colSpan={4} className="table-empty">No click-through agreement yet — visitors see Dozzier’s standard mutual NDA.</td></tr>}
              {gates.map((a, i) => (
                <tr key={a.id} className="clickable" onClick={() => open(a)}>
                  <td><span className="row gap-8 medium"><FileSignature size={16} />{a.name}{i === 0 && <span className="badge badge-success">In use</span>}</span></td>
                  <td className="muted">{a.body ? "Click-through" : "Document"}</td><td>{timeAgo(a.created_at)}</td>
                  <td><Menu items={[{ label: "View", icon: <Eye size={14} />, onClick: () => open(a) }, { label: "Download", icon: <Download size={14} />, onClick: () => { const b = new Blob([a.body || ""], { type: "text/plain" }); const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `${a.name}.txt`; l.click(); } }, { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => remove(a) }]} /></td>
                </tr>))}</tbody>
          </table>
        </>
      )}
      </>}
      {view && <Modal title={view.name} onClose={() => setView(null)}><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }} className="body-m">{view.body}</pre></Modal>}
    </div>
  );
}
