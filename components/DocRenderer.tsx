"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { loadPdfJs } from "@/lib/pdf";
import { SampleSlide } from "./SampleDeck";
import { OfficeView, officeFormat, type OfficeFormat } from "./OfficeView";

export type Source =
  | { kind: "sample" }
  | { kind: "pdf"; url: string }
  | { kind: "image"; url: string }
  | { kind: "video"; url: string }
  | { kind: "external"; url: string }
  | { kind: "office"; url: string; format: OfficeFormat }
  | { kind: "file"; url: string; name: string };

type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]>["promise"]>;

/** Renders a single page of a document, scaled to fit maxW × maxH. */
export function DocRenderer({ source, page, maxW, maxH, onPages, watermark }: {
  source: Source; page: number; maxW: number; maxH: number; onPages?: (n: number) => void; watermark?: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 16, h: 9 });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (source.kind !== "pdf") return;
    let cancelled = false;
    loadPdfJs().then((p) => p.getDocument({ url: source.url }).promise).then((d) => {
      if (cancelled) return;
      setPdf(d); onPages?.(d.numPages);
    }).catch(() => !cancelled && setErr("Could not open this PDF"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind === "pdf" ? source.url : ""]);

  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    pdf.getPage(Math.min(page + 1, pdf.numPages)).then((pg) => {
      if (cancelled || !canvas.current) return;
      const base = pg.getViewport({ scale: 1 });
      const scale = Math.min(maxW / base.width, maxH / base.height);
      const dpr = window.devicePixelRatio || 1;
      const vp = pg.getViewport({ scale: scale * dpr });
      const c = canvas.current;
      c.width = vp.width; c.height = vp.height;
      c.style.width = `${vp.width / dpr}px`; c.style.height = `${vp.height / dpr}px`;
      setSize({ w: vp.width / dpr, h: vp.height / dpr });
      const ctx = c.getContext("2d");
      if (!ctx) return;
      task = pg.render({ canvasContext: ctx, viewport: vp, canvas: c } as Parameters<typeof pg.render>[0]) as unknown as typeof task;
      task?.promise.catch(() => {});
    });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, page, maxW, maxH]);

  const wm = watermark ? <div className="watermark"><span>{watermark}</span></div> : null;

  if (source.kind === "sample") {
    const w = Math.min(maxW, (maxH * 16) / 9);
    return <div className="viewer-page" style={{ width: w, height: (w * 9) / 16 }}><SampleSlide index={page} />{wm}</div>;
  }
  if (source.kind === "pdf") {
    if (err) return <Fallback title={err} />;
    return <div className="viewer-page" style={{ width: size.w, height: size.h, minWidth: 100, minHeight: 100 }}>
      <canvas ref={canvas} style={{ display: "block" }} />{!pdf && <div className="loading" style={{ position: "absolute", inset: 0 }}><span className="spinner" /></div>}{wm}
    </div>;
  }
  if (source.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <div className="viewer-page" style={{ maxWidth: maxW, maxHeight: maxH }}><img src={source.url} alt="" style={{ display: "block", maxWidth: maxW, maxHeight: maxH }} draggable={false} />{wm}</div>;
  }
  if (source.kind === "video") {
    return <div className="viewer-page" style={{ background: "#000" }}><video src={source.url} controls style={{ display: "block", maxWidth: maxW, maxHeight: maxH }} /></div>;
  }
  if (source.kind === "office") return <OfficeView url={source.url} format={source.format} page={page} maxW={maxW} maxH={maxH} onPages={onPages} watermark={watermark} />;
  if (source.kind === "external") {
    return <Fallback title="This content lives on another site" action={<a className="btn btn-primary" href={source.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Open content</a>} />;
  }
  return <Fallback title={source.name} sub="This file type can’t be previewed in the browser." action={<a className="btn btn-primary" href={source.url} target="_blank" rel="noreferrer">Open file</a>} />;
}

function Fallback({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="viewer-page col gap-12" style={{ padding: 48, alignItems: "center", textAlign: "center", width: 520, maxWidth: "90vw" }}>
      <FileText size={36} className="faint" /><div className="h2">{title}</div>{sub && <p className="muted">{sub}</p>}{action}
    </div>
  );
}

export function sourceFor(doc: { is_sample: boolean; file_type: string; mime_type: string | null; note?: string | null; name?: string }, url: string | null): Source {
  if (doc.is_sample) return { kind: "sample" };
  if (doc.mime_type === "text/uri-list" && doc.note) return { kind: "external", url: doc.note };
  if (!url) return { kind: "file", url: "#", name: doc.name || "File" };
  if (doc.file_type === "pdf" || doc.mime_type === "application/pdf") return { kind: "pdf", url };
  if (doc.file_type === "image" || doc.mime_type?.startsWith("image/")) return { kind: "image", url };
  if (doc.file_type === "video" || doc.mime_type?.startsWith("video/")) return { kind: "video", url };
  const office = officeFormat(doc.mime_type, doc.name);
  if (office) return { kind: "office", url, format: office };
  return { kind: "file", url, name: doc.name || "File" };
}
