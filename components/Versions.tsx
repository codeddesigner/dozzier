"use client";
import { useEffect, useState } from "react";
import { Bell, RotateCcw } from "lucide-react";
import { supabase, BUCKET, Doc, Link as LinkT } from "@/lib/supabase";
import { DocThumb, Modal, copy, toast, useLoad } from "@/components/ui";
import { sendEmail } from "@/lib/sendEmail";
import { useApp } from "@/components/AppContext";
import { loadPdfJs } from "@/lib/pdf";
import { displayName } from "@/lib/format";
import { linkUrl } from "@/components/LinkModal";

type Ver = { id: string; version: number; file_path: string | null; file_type: string | null; mime_type: string | null; page_count: number; size_bytes: number | null; uploaded_at: string | null; replaced_at: string; replaced_by: string | null };
type Row = { v: number; label: string; file_path: string | null; file_type: string | null; pages: number; from: string; to: string | null; by: string | null; current: boolean; id?: string; mime: string | null; size: number | null };
type Thumb = { src: string; changed: "same" | "changed" | "new" };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric" });

/** Renders each page small and greyscale so two versions can be compared pixel by pixel. */
async function pageImages(path: string, max = 40) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (!data) throw new Error("Couldn’t open the file");
  const pdf = await (await loadPdfJs()).getDocument({ url: data.signedUrl }).promise;
  const out: { src: string; px: Uint8ClampedArray }[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, max); p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 }); const scale = 96 / vp.width; const v2 = page.getViewport({ scale });
    const c = document.createElement("canvas"); c.width = Math.round(v2.width); c.height = Math.round(v2.height);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    await page.render({ canvasContext: ctx, viewport: v2 }).promise;
    out.push({ src: c.toDataURL("image/jpeg", 0.75), px: ctx.getImageData(0, 0, c.width, c.height).data });
  }
  pdf.destroy();
  return out;
}
function differs(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return true;
  let diff = 0, n = 0;
  for (let i = 0; i < a.length; i += 16) { const ga = (a[i] + a[i + 1] + a[i + 2]) / 3, gb = (b[i] + b[i + 1] + b[i + 2]) / 3; if (Math.abs(ga - gb) > 24) diff++; n++; }
  return diff / n > 0.004;
}

export function Versions({ doc, links, visits, onRestored }: { doc: Doc; links: LinkT[]; visits: { visitor_email: string | null; started_at: string }[]; onRestored: () => void }) {
  const { email } = useApp();
  const { data: vers, reload } = useLoad(async () => ((await supabase.from("document_versions").select("*").eq("document_id", doc.id).order("version", { ascending: false })).data || []) as Ver[], [doc.id, doc.updated_at]);
  const [cmp, setCmp] = useState<{ a: Row; b: Row } | null>(null);
  const [thumbs, setThumbs] = useState<Thumb[] | null>(null);
  const [cmpErr, setCmpErr] = useState<string | null>(null);
  const [notify, setNotify] = useState(false);
  const [notifying, setNotifying] = useState<"idle" | "sending" | "sent">("idle");

  const rows: Row[] = vers ? [
    { v: vers.length + 1, label: doc.name, file_path: doc.file_path, file_type: doc.file_type, pages: doc.page_count, from: vers[0]?.replaced_at || doc.created_at, to: null, by: vers[0]?.replaced_by || null, current: true, mime: doc.mime_type, size: doc.size_bytes },
    ...vers.map((x, i) => ({ v: x.version, label: doc.name, file_path: x.file_path, file_type: x.file_type, pages: x.page_count, from: vers[i + 1]?.replaced_at || x.uploaded_at || doc.created_at, to: x.replaced_at, by: vers[i + 1]?.replaced_by || null, current: false, id: x.id, mime: x.mime_type, size: x.size_bytes })),
  ] : [];
  const visitsIn = (r: Row) => visits.filter((v) => v.started_at >= r.from && (!r.to || v.started_at < r.to)).length;

  useEffect(() => { if (rows.length > 1 && !cmp) setCmp({ a: rows[1], b: rows[0] }); }, [vers]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cmp) return;
    setThumbs(null); setCmpErr(null);
    const pdf = (r: Row) => r.file_path && (r.file_type === "pdf" || r.mime === "application/pdf");
    if (!pdf(cmp.a) || !pdf(cmp.b)) { setCmpErr("Page-by-page compare works for PDFs."); return; }
    let off = false;
    Promise.all([pageImages(cmp.a.file_path!), pageImages(cmp.b.file_path!)]).then(([a, b]) => {
      if (off) return;
      setThumbs(b.map((p, i) => ({ src: p.src, changed: !a[i] ? "new" : differs(a[i].px, p.px) ? "changed" : "same" })));
    }).catch((e) => !off && setCmpErr(e instanceof Error ? e.message : "Couldn’t compare"));
    return () => { off = true; };
  }, [cmp]);

  async function restore(r: Row) {
    if (!r.id || !r.file_path) return;
    const n = (vers?.length || 0) + 1;
    await supabase.from("document_versions").insert({ document_id: doc.id, version: n, file_path: doc.file_path, file_type: doc.file_type, mime_type: doc.mime_type, page_count: doc.page_count, size_bytes: doc.size_bytes, uploaded_at: doc.updated_at, replaced_by: email });
    await supabase.from("documents").update({ file_path: r.file_path, file_type: r.file_type, mime_type: r.mime, page_count: r.pages, size_bytes: r.size, updated_at: new Date().toISOString() }).eq("id", doc.id);
    toast(`v${r.v} restored — it’s now live on every link`); reload(); onRestored();
  }

  const changed = (thumbs || []).map((t, i) => (t.changed !== "same" ? i + 1 : 0)).filter(Boolean);
  const past = [...new Set(visits.filter((v) => v.visitor_email).map((v) => v.visitor_email!))];
  const link = links.find((l) => l.enabled);
  const note = `Hi,\n\nI’ve updated ${doc.name}${changed.length ? ` — ${changed.length === 1 ? `page ${changed[0]} changed` : `pages ${changed.slice(0, -1).join(", ")} and ${changed[changed.length - 1]} changed`}` : ""}.${link ? ` Same link as before: ${linkUrl(link.slug)}` : ""}\n\nBest,\n${displayName(email)}`;

  if (!vers) return <div className="skeleton mt-24"><span /><span /></div>;
  return (
    <div className="mt-24">
      <div className="col gap-8">
        {rows.map((r, i) => (
          <div key={r.v} className={`ver-row ${r.current ? "current" : ""}`} style={{ animationDelay: `${i * 40}ms` }}>
            <span className="ver-tag">v{r.v}</span>
            <DocThumb kind={r.file_type || "file"} />
            <div className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{r.label}{r.current ? "" : ""}</span>
              <span className="caption muted">{r.v === 1 ? "Uploaded" : "Replaced"}{r.by ? ` by ${r.by === email ? "you" : displayName(r.by)}` : ""} · {fmt(r.from)} · {r.pages} page{r.pages === 1 ? "" : "s"}{r.current && cmp?.b.v === r.v && thumbs ? ` · ${changed.length} page${changed.length === 1 ? "" : "s"} changed` : ""}</span></div>
            <span className="caption muted hide-sm">{visitsIn(r)} visit{visitsIn(r) === 1 ? "" : "s"}</span>
            {r.current ? (rows.length > 1 && <button className="btn btn-ghost btn-s" onClick={() => setCmp({ a: rows[1], b: r })}>Compare</button>)
              : <><button className="btn btn-ghost btn-s hide-sm" onClick={() => setCmp({ a: r, b: rows[0] })}>Compare</button><button className="btn btn-ghost btn-s" onClick={() => restore(r)}><RotateCcw size={13} />Restore</button></>}
          </div>
        ))}
        {rows.length === 1 && <p className="caption muted mt-8">This is the first version. Use <b>Replace</b> to upload a new one — links keep working and older versions stay here.</p>}
      </div>
      {cmp && (
        <section className="card ver-cmp mt-24">
          <div className="row gap-8"><span className="h2 grow">Compare v{cmp.a.v} → v{cmp.b.v}</span>
            {past.length > 0 && cmp.b.current && <button className="btn btn-secondary btn-s" onClick={() => setNotify(true)}><Bell size={14} />Notify {past.length} past visitor{past.length === 1 ? "" : "s"}</button>}</div>
          {cmpErr ? <p className="muted mt-8">{cmpErr}</p> : !thumbs ? <div className="ver-strip mt-16">{Array.from({ length: Math.min(cmp.b.pages, 12) }, (_, i) => <span key={i} className="ver-ghost" />)}</div> : (
            <div className="ver-strip mt-16">{thumbs.map((t, i) => (
              <div key={i} className={`ver-page ${t.changed}`} style={{ animationDelay: `${i * 25}ms` }}><img src={t.src} alt={`Page ${i + 1}`} /><span className="micro">{t.changed === "same" ? `p${i + 1}` : `p${i + 1} ${t.changed}`}</span></div>
            ))}</div>
          )}
          {thumbs && <p className="caption muted mt-8">{changed.length ? `${changed.length} of ${thumbs.length} pages differ from v${cmp.a.v}.` : `No visible changes from v${cmp.a.v}.`}</p>}
        </section>
      )}
      {notify && (
        <Modal title={`Tell ${past.length} past visitor${past.length === 1 ? "" : "s"} about the update`} onClose={() => setNotify(false)} width={540}>
          <div className="col gap-12">
            <pre className="lr-preview" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, margin: 0 }}>{note}</pre>
            <span className="caption muted">Sent as one email with everyone in Bcc, so recipients don’t see each other.</span>
            <div className="row gap-8">
              <button className="btn btn-primary btn-s" disabled={notifying !== "idle"} onClick={async () => {
                setNotifying("sending");
                for (let i = 0; i < past.length; i += 45) {
                  const err = await sendEmail({ kind: "update", to: [email], bcc: past.slice(i, i + 45), subject: `Updated: ${doc.name}`, message: note, meta: { template: "update", title: doc.name } });
                  if (err) { toast(err); setNotifying("idle"); return; }
                }
                setNotifying("sent"); toast(`Sent to ${past.length} past visitor${past.length === 1 ? "" : "s"}`); setNotify(false);
              }}><Bell size={14} />{notifying === "sending" ? "Sending…" : notifying === "sent" ? "Sent" : `Send to ${past.length}`}</button>
              <a className="btn btn-secondary btn-s" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&bcc=${encodeURIComponent(past.join(","))}&su=${encodeURIComponent(`Updated: ${doc.name}`)}&body=${encodeURIComponent(note)}`}>Gmail</a>
              <a className="btn btn-ghost btn-s hide-sm" href={`mailto:${email}?bcc=${encodeURIComponent(past.join(","))}&subject=${encodeURIComponent(`Updated: ${doc.name}`)}&body=${encodeURIComponent(note)}`}>Mail app</a>
              <button className="btn btn-ghost btn-s" onClick={() => copy(note, "Message copied")}>Copy text</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
