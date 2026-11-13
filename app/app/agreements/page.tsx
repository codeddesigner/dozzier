"use client";
import { useRef, useState } from "react";
import { ChevronDown, FileSignature, Trash2, Download, Eye } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Empty, Loading, Menu, Modal, toast, useLoad } from "@/components/ui";
import { NDA_TEMPLATE } from "@/components/nda";
import { useApp } from "@/components/AppContext";
import { timeAgo } from "@/lib/format";

type Agreement = { id: string; name: string; file_path: string | null; body: string | null; created_at: string };

function Art() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" aria-hidden="true">
      <ellipse cx="48" cy="74" rx="44" ry="4" fill="#eeedea" />
      <rect x="14" y="10" width="44" height="56" rx="4" fill="#dbe7ff" transform="rotate(-8 36 38)" />
      <rect x="26" y="6" width="48" height="62" rx="4" fill="#fff" stroke="#1a1918" strokeWidth="2" />
      <rect x="34" y="16" width="26" height="3" rx="1.5" fill="#a19d96" /><rect x="34" y="24" width="32" height="3" rx="1.5" fill="#a19d96" /><rect x="34" y="32" width="20" height="3" rx="1.5" fill="#a19d96" />
      <rect x="40" y="46" width="30" height="12" rx="2" fill="#0061fe" />
      <circle cx="74" cy="8" r="8" fill="#0061fe" /><path d="M70 8l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  );
}

export default function Agreements() {
  const { userId } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<Agreement | null>(null);
  const { data, loading, reload } = useLoad(async () => ((await supabase.from("agreements").select("*").order("created_at", { ascending: false })).data || []) as Agreement[], []);

  async function upload(f: File) {
    const path = `${userId}/agreements/${crypto.randomUUID()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (up.error) return toast(up.error.message);
    const body = f.type.startsWith("text/") ? await f.text() : null;
    await supabase.from("agreements").insert({ name: f.name.replace(/\.[^.]+$/, ""), file_path: path, body });
    toast("Agreement uploaded — turn on “Require NDA” on any link to use it"); reload();
  }
  async function useTemplate() {
    await supabase.from("agreements").insert({ name: "Mutual NDA", body: NDA_TEMPLATE });
    toast("Mutual NDA added"); reload();
  }
  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([NDA_TEMPLATE], { type: "text/plain" }));
    a.download = "Dozzier-Mutual-NDA.txt"; a.click();
  }
  async function open(a: Agreement) {
    if (a.body) return setView(a);
    if (a.file_path) { const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.file_path, 300); if (data) window.open(data.signedUrl, "_blank"); }
  }

  return (
    <div className="content">
      <div className="page-head"><h1 className="page-title grow">Agreements</h1>
        <div style={{ position: "relative" }}><button className="btn btn-dark" onClick={() => input.current?.click()}>Upload<ChevronDown size={14} /></button></div>
        <input ref={input} type="file" hidden accept=".pdf,.doc,.docx,.txt" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      {loading && !data ? <Loading /> : !data?.length ? (
        <Empty art={<Art />} title="Need to protect sensitive content?" body="Set up a legally-binding agreement that viewers must sign before accessing your content. Upload an NDA or any gating document.">
          <button className="btn btn-outline" onClick={() => input.current?.click()}>Upload agreement</button>
          <div className="row gap-8 mt-8"><button className="btn btn-secondary btn-s" onClick={useTemplate}>Use template</button><button className="btn btn-secondary btn-s" onClick={downloadTemplate}>Download template</button></div>
        </Empty>
      ) : (
        <>
          <p className="muted mt-8">Viewers accept your most recent agreement on any link with <b>Require NDA</b> turned on.</p>
          <table className="table mt-16">
            <thead><tr><th>Name</th><th>Type</th><th>Added</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>{data.map((a, i) => (
              <tr key={a.id} className="clickable" onClick={() => open(a)}>
                <td><span className="row gap-8 medium"><FileSignature size={16} />{a.name}{i === 0 && <span className="badge badge-success">In use</span>}</span></td>
                <td className="muted">{a.body ? "Click-through" : "Document"}</td><td>{timeAgo(a.created_at)}</td>
                <td><Menu items={[{ label: "View", icon: <Eye size={14} />, onClick: () => open(a) }, { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: async () => { if (a.file_path) await supabase.storage.from(BUCKET).remove([a.file_path]); await supabase.from("agreements").delete().eq("id", a.id); reload(); } }]} /></td>
              </tr>))}</tbody>
          </table>
          <div className="row gap-8 mt-16"><button className="btn btn-secondary btn-s" onClick={useTemplate}>Add NDA template</button><button className="btn btn-ghost btn-s" onClick={downloadTemplate}><Download size={14} />Download template</button></div>
        </>
      )}
      {view && <Modal title={view.name} onClose={() => setView(null)}><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }} className="body-m">{view.body}</pre></Modal>}
    </div>
  );
}
