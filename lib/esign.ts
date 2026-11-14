"use client";
// eSign helpers: field metadata, signature rendering, hashing and the signed PDF with its certificate page.

export type FieldKind = "signature" | "initials" | "date" | "name" | "company" | "text";
export type Field = { id: string; signer_id: string; kind: FieldKind; page: number; x: number; y: number; w: number; h: number; label?: string | null; value?: string | null };
export type Signer = { id: string; name: string; email: string; position: number; is_owner?: boolean; token?: string; signed_at?: string | null; viewed_at?: string | null; signature?: Sig | null; location?: string | null; ip?: string | null };
export type Sig = { type: "typed" | "drawn" | "upload"; data: string; text?: string };

export const FIELD_META: Record<FieldKind, { label: string; w: number; h: number }> = {
  signature: { label: "Signature", w: 0.3, h: 0.065 },
  initials: { label: "Initials", w: 0.11, h: 0.05 },
  date: { label: "Date signed", w: 0.15, h: 0.03 },
  name: { label: "Full name", w: 0.26, h: 0.032 },
  company: { label: "Company", w: 0.26, h: 0.032 },
  text: { label: "Text", w: 0.26, h: 0.032 },
};
export const SIGNER_COLORS = ["#4D94F7", "#F59E0B", "#10B981", "#A855F7", "#EF4444", "#0EA5E9"];
export const colorOf = (i: number) => SIGNER_COLORS[i % SIGNER_COLORS.length];
export const SCRIPT_FONT = "Dancing Script";
export const SCRIPT_CSS = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600&display=swap";

export const initialsOf = (name: string) => name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 3);
export const docId = (id: string) => `dz_${id.replace(/-/g, "").slice(0, 10)}`;

/** Renders typed text in the script font to a transparent PNG. */
export async function typedToPng(text: string, height = 120) {
  try { await document.fonts.load(`600 ${height * 0.62}px "${SCRIPT_FONT}"`); } catch {}
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `600 ${height * 0.62}px "${SCRIPT_FONT}", "Segoe Script", "Brush Script MT", cursive`;
  const w = Math.ceil(ctx.measureText(text).width + height * 0.4);
  c.width = Math.max(w, height); c.height = height;
  ctx.font = `600 ${height * 0.62}px "${SCRIPT_FONT}", "Segoe Script", "Brush Script MT", cursive`;
  ctx.fillStyle = "#111827"; ctx.textBaseline = "middle";
  ctx.fillText(text, height * 0.2, height * 0.55);
  return c.toDataURL("image/png");
}

export async function sha256(bytes: ArrayBuffer | Uint8Array) {
  const buf = await crypto.subtle.digest("SHA-256", (bytes instanceof Uint8Array ? bytes.slice().buffer : bytes) as ArrayBuffer);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, max: number) {
  const out: string[] = [];
  text.split("\n").forEach((para) => {
    if (!para.trim()) { out.push(""); return; }
    let line = "";
    para.split(/\s+/).forEach((w) => {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > max && line) { out.push(line); line = w; } else line = t;
    });
    out.push(line);
  });
  return out;
}
const ascii = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, "-").replace(/…/g, "...").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

/** Turns a plain-text agreement into a Letter-size PDF so fields can be placed on real pages. */
export async function textToPdf(title: string, body: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("Dozzier");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = wrap(ascii(body), font, 11, 612 - 144);
  let page = pdf.addPage([612, 792]); let y = 720;
  const first = lines[0]?.toUpperCase() === lines[0] && lines[0]?.length < 70 ? lines.shift()! : ascii(title).toUpperCase();
  page.drawText(first, { x: 72, y, size: 13, font: bold, color: rgb(0.07, 0.09, 0.15) }); y -= 30;
  for (const l of lines) {
    if (y < 72) { page = pdf.addPage([612, 792]); y = 720; }
    page.drawText(l, { x: 72, y, size: 11, font, color: rgb(0.2, 0.23, 0.3) }); y -= 16;
  }
  // Leave room for signatures at the end.
  if (y < 220) { page = pdf.addPage([612, 792]); }
  return { bytes: await pdf.save(), pages: pdf.getPageCount() };
}

async function pngBytes(dataUrl: string) {
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
}

/** Stamps every field onto the original PDF and appends a certificate of completion. */
export async function buildSignedPdf(o: { original: ArrayBuffer; name: string; id: string; hash: string | null; sentAt: string | null; sender: string; signers: Signer[]; fields: Field[]; space?: string | null }) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.load(o.original, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const imgs = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  for (const s of o.signers) if (s.signature?.data?.startsWith("data:image/png")) imgs.set(s.id, await pdf.embedPng(await pngBytes(s.signature.data)));
  const initImgs = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  for (const f of o.fields) {
    const p = pages[f.page - 1]; if (!p) continue;
    const { width: W, height: H } = p.getSize();
    const x = f.x * W, w = f.w * W, h = f.h * H, y = H - f.y * H - h;
    const s = o.signers.find((x) => x.id === f.signer_id);
    if (!s?.signed_at) continue;
    if (f.kind === "signature" || f.kind === "initials") {
      let img = f.kind === "signature" ? imgs.get(s.id) : initImgs.get(s.id);
      if (!img && f.kind === "initials") { img = await pdf.embedPng(await pngBytes(await typedToPng(initialsOf(s.signature?.text || s.name)))); initImgs.set(s.id, img); }
      if (!img) continue;
      const r = Math.min(w / img.width, h / img.height);
      p.drawImage(img, { x, y: y + (h - img.height * r) / 2, width: img.width * r, height: img.height * r });
      p.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.5, color: rgb(0.6, 0.63, 0.68) });
      p.drawText(`Signed by ${ascii(s.name)}`, { x, y: y - 8, size: 5.5, font, color: rgb(0.45, 0.48, 0.53) });
    } else if (f.value) {
      const size = Math.min(11, h * 0.7);
      p.drawText(ascii(f.value), { x: x + 2, y: y + (h - size) / 2 + 1, size, font, color: rgb(0.07, 0.09, 0.15), maxWidth: w });
    }
  }
  // Certificate of completion
  const c = pdf.addPage([612, 792]);
  let y = 720;
  c.drawText("Certificate of completion", { x: 72, y, size: 18, font: bold, color: rgb(0.07, 0.09, 0.15) }); y -= 22;
  c.drawText(ascii(o.name), { x: 72, y, size: 11, font, color: rgb(0.35, 0.38, 0.43) }); y -= 34;
  const fmt = (d?: string | null) => (d ? new Date(d).toUTCString().replace(" GMT", " UTC") : "-");
  const rows: [string, string][] = [["Document ID", docId(o.id)], ["SHA-256 (original)", o.hash || "-"], ["Sent", `${fmt(o.sentAt)} by ${ascii(o.sender)}`]];
  o.signers.forEach((s) => rows.push([`Signed - ${ascii(s.name)}`, s.signed_at ? `${fmt(s.signed_at)}${s.ip ? ` - ${s.ip}` : ""}${s.location ? ` - ${ascii(s.location)}` : ""}\n${ascii(s.email)}` : "Not signed"]));
  if (o.space) rows.push(["Linked Space", `${ascii(o.space)} (access granted)`]);
  for (const [k, v] of rows) {
    c.drawLine({ start: { x: 72, y: y + 14 }, end: { x: 540, y: y + 14 }, thickness: 0.5, color: rgb(0.9, 0.91, 0.92) });
    c.drawText(k, { x: 72, y, size: 9.5, font, color: rgb(0.42, 0.45, 0.5) });
    v.split("\n").forEach((line, i) => wrap(line, font, 9.5, 300).forEach((l, j) => c.drawText(l, { x: 240, y: y - (i + j) * 13, size: 9.5, font: i === 0 ? bold : font, color: rgb(0.07, 0.09, 0.15) })));
    y -= 22 + (v.split("\n").length - 1) * 13 + (v.length > 60 ? 13 : 0);
  }
  y -= 10;
  wrap("Each signer adopted their signature and consented to sign electronically. Times are recorded by Dozzier's servers. The SHA-256 fingerprint identifies the document as it was sent; any change to it produces a different fingerprint.", font, 8.5, 468)
    .forEach((l) => { c.drawText(l, { x: 72, y, size: 8.5, font, color: rgb(0.45, 0.48, 0.53) }); y -= 12; });
  return pdf.save();
}

export function saveBytes(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a"); a.href = url; a.download = name.endsWith(".pdf") ? name : `${name}.pdf`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
