/** Minimal ZIP reader (stored + deflate) using the browser's DecompressionStream. Skips folders and macOS metadata. */
export async function unzip(file: File): Promise<File[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  // Find the End Of Central Directory record (signature 0x06054b50) scanning backwards.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("That doesn’t look like a ZIP file");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out: File[] = [];
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/") || name.startsWith("__MACOSX/") || name.split("/").pop()!.startsWith(".")) continue;
    const lNameLen = dv.getUint16(local + 26, true), lExtraLen = dv.getUint16(local + 28, true);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.slice(start, start + csize);
    let data: Uint8Array;
    if (method === 0) data = raw;
    else if (method === 8) {
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
      data = new Uint8Array(await new Response(stream).arrayBuffer());
    } else continue;
    const base = name.split("/").pop()!;
    out.push(new File([data as BlobPart], base, { type: mimeOf(base) }));
  }
  return out;
}

function mimeOf(n: string) {
  const ext = n.split(".").pop()?.toLowerCase() || "";
  return ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain", csv: "text/csv" } as Record<string, string>)[ext] || "application/octet-stream";
}
