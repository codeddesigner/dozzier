"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, ShieldAlert, Sparkles, X } from "lucide-react";
import { supabase, BUCKET, Doc } from "@/lib/supabase";
import { loadPdfJs } from "@/lib/pdf";
import { useApp } from "@/components/AppContext";

type Step = { label: string; detail?: string; state: "wait" | "run" | "done" | "warn" };
const SENSITIVE: [string, RegExp][] = [
  ["email addresses", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  ["phone numbers", /(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]\d{3}[\s-]\d{4}\b/g],
  ["bank / IBAN numbers", /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/g],
  ["ID numbers", /\b\d{3}-\d{2}-\d{4}\b/g],
  ["“confidential” markings", /\b(confidential|strictly private|do not distribute)\b/gi],
];

/** The Figma "Processing" card: real pdf.js steps for a freshly uploaded PDF. */
export function ProcessingCard({ doc, onCreateLink }: { doc: Doc; onCreateLink: () => void }) {
  const { profile } = useApp();
  const key = `dz-proc-${doc.id}`;
  const [hidden, setHidden] = useState(true);
  const [steps, setSteps] = useState<Step[]>([
    { label: "Converting pages", state: "run" }, { label: "Extracting text", state: "wait" },
    { label: "Scanning for sensitive data", state: "wait" }, { label: "Suggesting link settings", state: "wait" },
  ]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [suggest, setSuggest] = useState<string[]>([]);
  const isPdf = doc.file_type === "pdf" || doc.mime_type === "application/pdf";

  useEffect(() => { try { setHidden(!!localStorage.getItem(key)); } catch { setHidden(false); } }, [key]);
  useEffect(() => {
    if (hidden || !isPdf || !doc.file_path) return;
    let off = false;
    const upd = (i: number, s: Partial<Step>) => !off && setSteps((xs) => xs.map((x, j) => (j === i ? { ...x, ...s } : j === i + 1 && s.state && s.state !== "run" ? { ...x, state: "run" } : x)));
    (async () => {
      const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path!, 300);
      if (!s) return;
      const pdf = await (await loadPdfJs()).getDocument({ url: s.signedUrl }).promise;
      const n = pdf.numPages;
      const out: string[] = [];
      for (let p = 1; p <= Math.min(n, 6); p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const scale = 120 / vp.width;
        const v2 = page.getViewport({ scale });
        const c = document.createElement("canvas"); c.width = v2.width; c.height = v2.height;
        await page.render({ canvasContext: c.getContext("2d")!, viewport: v2 }).promise;
        out.push(c.toDataURL("image/jpeg", 0.7)); if (!off) setThumbs([...out]);
      }
      upd(0, { state: "done", detail: `${n} page${n === 1 ? "" : "s"}` });
      let text = "";
      for (let p = 1; p <= Math.min(n, 40); p++) {
        const tc = await (await pdf.getPage(p)).getTextContent();
        text += " " + tc.items.map((it) => ("str" in it ? it.str : "")).join(" ");
      }
      const words = text.split(/\s+/).filter(Boolean).length;
      upd(1, { state: "done", detail: words ? `${words.toLocaleString()} words` : "No text layer — looks like images or a scan" });
      const hits = SENSITIVE.map(([l, re]) => [l, (text.match(re) || []).length] as const).filter(([, c]) => c > 0);
      upd(2, hits.length ? { state: "warn", detail: `Found ${hits.map(([l, c]) => `${c} ${l}`).join(", ")}` } : { state: "done", detail: "Nothing sensitive found" });
      const uses = profile.use_cases || [];
      const sg = ["Require email"];
      if (hits.length || /confidential/i.test(text)) sg.push("Dynamic watermark", "No downloads");
      if (uses.some((u) => /legal|m&a|due/i.test(u)) || /\b(nda|term sheet|agreement)\b/i.test(text)) sg.push("Require NDA");
      if (uses.some((u) => /sales|proposal/i.test(u))) sg.push("Allow downloads");
      if (uses.some((u) => /fund|investor/i.test(u))) sg.push("Expire in 30 days");
      setSuggest([...new Set(sg)]);
      upd(3, { state: "done", detail: "Based on your content and how you use Dozzier" });
      pdf.destroy();
    })().catch(() => !off && setSteps((xs) => xs.map((x) => (x.state === "done" ? x : { ...x, state: "warn", detail: "Couldn’t read this file — you can still share it" }))));
    return () => { off = true; };
  }, [hidden, isPdf, doc.file_path, profile.use_cases]);

  if (hidden || !isPdf || !doc.file_path) return null;
  const done = steps.every((s) => s.state === "done" || s.state === "warn");
  const close = () => { try { localStorage.setItem(key, "1"); } catch {} setHidden(true); };

  return (
    <section className="proc-card mt-24">
      <div className="row"><span className="h3 grow">{done ? "Ready to share" : "Preparing your document…"}</span><button className="icon-btn s" aria-label="Dismiss" onClick={close}><X size={14} /></button></div>
      <div className="proc-body">
        <ol className="proc-steps">
          {steps.map((s) => (
            <li key={s.label} className={s.state}>
              <span className="proc-ico">{s.state === "run" ? <Loader2 size={14} className="spin" /> : s.state === "done" ? <Check size={14} /> : s.state === "warn" ? <ShieldAlert size={14} /> : null}</span>
              <span className="col"><span className="medium" style={{ fontSize: 14 }}>{s.label}</span>{s.detail && <span className="caption muted">{s.detail}</span>}</span>
            </li>
          ))}
        </ol>
        <div className="proc-thumbs">{thumbs.map((t, i) => <img key={i} src={t} alt={`Page ${i + 1}`} style={{ animationDelay: `${i * 60}ms` }} />)}{thumbs.length === 0 && Array.from({ length: 4 }, (_, i) => <span key={i} className="proc-ghost" />)}</div>
      </div>
      {suggest.length > 0 && (
        <div className="row gap-8 wrap proc-suggest">
          <span className="row gap-6 caption medium brand"><Sparkles size={14} />Suggested</span>
          {suggest.map((s) => <span key={s} className="tag">{s}</span>)}
          <span className="grow" />
          <button className="btn btn-primary btn-s" onClick={() => { close(); onCreateLink(); }}>Create link</button>
        </div>
      )}
    </section>
  );
}
