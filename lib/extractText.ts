"use client";
import { loadPdfJs } from "@/lib/pdf";
import { officeFormat } from "@/components/OfficeView";

const MAX = 200000;
const xmlText = (xml: string) => xml.replace(/<a:br\/>|<w:br\/>|<\/w:p>|<\/a:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&apos;/g, "'");

/** Best-effort plain text of an uploaded file, for full-text search. Never throws. */
export async function extractText(file: File): Promise<string | null> {
  try {
    const type = (file.type || "").toLowerCase(), name = file.name.toLowerCase();
    if (type === "application/pdf" || name.endsWith(".pdf")) {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      let out = "";
      for (let i = 1; i <= Math.min(doc.numPages, 300) && out.length < MAX; i++) {
        const tc = await (await doc.getPage(i)).getTextContent();
        out += (tc.items as { str?: string }[]).map((it) => it.str || "").join(" ") + "\n";
      }
      doc.destroy();
      return out.slice(0, MAX).trim() || null;
    }
    if (type.startsWith("text/") && !name.endsWith(".csv")) return (await file.text()).slice(0, MAX) || null;
    const office = officeFormat(file.type, file.name);
    if (office === "xlsx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      return wb.SheetNames.map((n) => `${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join("\n").slice(0, MAX) || null;
    }
    if (office) {
      const { unzipEntries } = await import("@/lib/unzip");
      const entries = await unzipEntries(file);
      const want = office === "docx" ? (n: string) => n === "word/document.xml" : (n: string) => /^ppt\/slides\/slide\d+\.xml$/.test(n);
      const parts = entries.filter((e) => want(e.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      let out = "";
      for (const p of parts) { out += xmlText(new TextDecoder().decode(await p.read())) + "\n"; if (out.length > MAX) break; }
      return out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").slice(0, MAX).trim() || null;
    }
  } catch {}
  return null;
}
