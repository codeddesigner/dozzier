"use client";
import { supabase, BUCKET, SUPABASE_URL } from "@/lib/supabase";

const CHUNK = 6 * 1024 * 1024; // Supabase requires exactly 6 MB TUS chunks.
const RESUMABLE_FROM = 6 * 1024 * 1024;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";

/** Direct storage host (recommended by Supabase for large uploads). Works whether the app uses auth.dozzier.co or xyz.supabase.co. */
const REF = process.env.NEXT_PUBLIC_SUPABASE_REF || "hxgcoekovalkmdwcabll";
const storageHost = () => /\.supabase\.co$/.test(SUPABASE_URL) ? SUPABASE_URL.replace(/^https:\/\/([a-z0-9]+)\.supabase\.co$/, "https://$1.storage.supabase.co") : `https://${REF}.storage.supabase.co`;
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uploads a file to the documents bucket. Small files go in one request; anything over 6 MB uses
 * Supabase's resumable (TUS) endpoint in 6 MB chunks, retrying each chunk so a dropped connection
 * doesn't restart a 2 GB upload. onProgress gets 0–1.
 */
export async function uploadFile(path: string, file: File, onProgress?: (p: number) => void): Promise<void> {
  const contentType = file.type || "application/octet-stream";
  if (file.size <= RESUMABLE_FROM) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType });
    if (error) throw error;
    onProgress?.(1);
    return;
  }
  const token = async () => (await supabase.auth.getSession()).data.session?.access_token || ANON;
  const meta = { bucketName: BUCKET, objectName: path, contentType, cacheControl: "3600" };
  const create = await fetch(`${storageHost()}/storage/v1/upload/resumable`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await token()}`, apikey: ANON, "tus-resumable": "1.0.0",
      "upload-length": String(file.size),
      "upload-metadata": Object.entries(meta).map(([k, v]) => `${k} ${b64(v)}`).join(","),
    },
  });
  if (!create.ok) throw new Error(await errorText(create, "Couldn’t start the upload"));
  const loc = create.headers.get("location");
  if (!loc) throw new Error("Upload server didn’t return an upload URL");
  const uploadUrl = new URL(loc, storageHost()).toString();

  const h = async (extra: Record<string, string> = {}) => ({ authorization: `Bearer ${await token()}`, apikey: ANON, "tus-resumable": "1.0.0", ...extra });
  let offset = 0, failures = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + CHUNK, file.size));
    const r = await fetch(uploadUrl, { method: "PATCH", headers: await h({ "upload-offset": String(offset), "content-type": "application/offset+octet-stream" }), body: chunk }).catch(() => null);
    if (r?.ok) {
      offset = Number(r.headers.get("upload-offset")) || offset + chunk.size;
      failures = 0;
      onProgress?.(Math.min(1, offset / file.size));
      continue;
    }
    if (r && r.status >= 400 && r.status < 500 && r.status !== 409 && r.status !== 423) throw new Error(await errorText(r, "Upload was rejected"));
    if (++failures > 5) throw new Error("Upload failed — check your connection and try again");
    await sleep([0, 1000, 3000, 5000, 10000, 20000][failures]);
    // Resync with what the server already has, then carry on from there.
    const head = await fetch(uploadUrl, { method: "HEAD", headers: await h() }).catch(() => null);
    const have = Number(head?.headers.get("upload-offset"));
    if (head?.ok && Number.isFinite(have)) offset = have;
  }
}

async function errorText(r: Response, fallback: string) {
  const t = await r.text().catch(() => "");
  try { const j = JSON.parse(t) as { message?: string; error?: string }; return j.message || j.error || fallback; } catch { return t.slice(0, 200) || fallback; }
}
