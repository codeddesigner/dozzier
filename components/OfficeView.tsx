"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type OfficeFormat = "pptx" | "docx" | "xlsx";

/** Office mime/extension → the format we can render in the browser (null = not supported). */
export function officeFormat(mime: string | null | undefined, name?: string | null): OfficeFormat | null {
  const m = (mime || "").toLowerCase(), n = (name || "").toLowerCase();
  if (m.includes("presentationml") || n.endsWith(".pptx")) return "pptx";
  if (m.includes("wordprocessingml") || n.endsWith(".docx")) return "docx";
  if (m.includes("spreadsheetml") || m === "application/vnd.ms-excel" || m === "text/csv" || /\.(xlsx|xls|csv)$/.test(n)) return "xlsx";
  return null;
}

/**
 * Renders a PowerPoint, Word or Excel file in the browser and shows one "page" at a time:
 * a slide, a Word page, or a spreadsheet tab. Scales the page to fit maxW × maxH.
 */
export function OfficeView({ url, format, page, maxW, maxH, onPages, watermark }: {
  url: string; format: OfficeFormat; page: number; maxW: number; maxH: number; onPages?: (n: number) => void; watermark?: string | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<HTMLElement[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [nat, setNat] = useState({ w: 960, h: 540 });

  useEffect(() => {
    let cancelled = false;
    const el = host.current;
    if (!el) return;
    el.innerHTML = ""; setPages([]); setErr(null);
    (async () => {
      const buf = await (await fetch(url)).arrayBuffer();
      if (cancelled) return;
      let list: HTMLElement[] = [];
      if (format === "docx") {
        const { renderAsync } = await import("docx-preview");
        await renderAsync(buf, el, undefined, { className: "dz-docx", inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: false, experimental: true, renderHeaders: true, renderFooters: true });
        list = Array.from(el.querySelectorAll<HTMLElement>("section.dz-docx"));
      } else if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        list = wb.SheetNames.map((name) => {
          const sec = document.createElement("section");
          sec.className = "dz-sheet";
          sec.innerHTML = `<div class="dz-sheet-tab">${name.replace(/</g, "&lt;")}</div>` + XLSX.utils.sheet_to_html(wb.Sheets[name], { header: "", footer: "" });
          el.appendChild(sec);
          return sec;
        });
      } else {
        const { init } = await import("pptx-preview");
        const p = init(el, { width: 960, height: 540, mode: "list" });
        await p.preview(buf);
        // Each slide is rendered as a direct child block of the preview wrapper.
        const wrap = el.firstElementChild as HTMLElement | null;
        const cands = wrap ? Array.from(wrap.children) as HTMLElement[] : [];
        list = cands.filter((c) => c.offsetHeight > 50);
      }
      if (cancelled) return;
      if (!list.length) throw new Error("empty");
      setPages(list); onPages?.(list.length);
    })().catch(() => !cancelled && setErr("We couldn’t display this file. The sender can share it as a PDF instead."));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, format]);

  // Show only the current page and measure it so we can scale it to fit.
  useLayoutEffect(() => {
    if (!pages.length) return;
    const i = Math.min(page, pages.length - 1);
    pages.forEach((p, j) => { p.style.display = j === i ? "" : "none"; });
    const cur = pages[i];
    const w = Math.max(cur.scrollWidth, cur.offsetWidth, 320), h = Math.max(cur.scrollHeight, cur.offsetHeight, 200);
    setNat({ w, h });
  }, [pages, page]);

  const scale = Math.min(maxW / nat.w, maxH / nat.h, format === "xlsx" ? 1.25 : 4);
  return (
    <div className="viewer-page office-page" style={{ width: nat.w * scale, height: nat.h * scale, overflow: "hidden", background: "#fff" }}>
      <div ref={host} className={`office-host office-${format}`} style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: nat.w }} />
      {!pages.length && !err && <div className="loading" style={{ position: "absolute", inset: 0 }}><span className="spinner" /></div>}
      {err && <div className="col gap-8" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "#4b5563" }}>{err}</div>}
      {watermark && <div className="watermark"><span>{watermark}</span></div>}
    </div>
  );
}

/** Page count at upload: slides in a .pptx, pages Word recorded in a .docx, tabs in a spreadsheet. */
export async function countOfficePages(file: File, format: OfficeFormat): Promise<number> {
  try {
    if (format === "xlsx") {
      const XLSX = await import("xlsx");
      return Math.max(1, XLSX.read(await file.arrayBuffer(), { type: "array", bookSheets: true }).SheetNames.length);
    }
    const { unzipEntries } = await import("@/lib/unzip");
    const entries = await unzipEntries(file);
    if (format === "pptx") return Math.max(1, entries.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name)).length);
    const app = entries.find((e) => e.name === "docProps/app.xml");
    const m = app ? new TextDecoder().decode(await app.read()).match(/<Pages>(\d+)<\/Pages>/) : null;
    return m ? Math.max(1, Number(m[1])) : 1;
  } catch { return 1; }
}
