"use client";
// Lazily load pdf.js in the browser only.
type PdfJs = typeof import("pdfjs-dist");
let lib: Promise<PdfJs> | null = null;

export function loadPdfJs(): Promise<PdfJs> {
  if (!lib) {
    lib = import("pdfjs-dist").then((m) => {
      m.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${m.version}/build/pdf.worker.min.mjs`;
      return m;
    });
  }
  return lib;
}

export async function countPdfPages(file: File): Promise<number> {
  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const n = doc.numPages;
    doc.destroy();
    return n;
  } catch {
    return 1;
  }
}
