import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { downloadUrls, hostAllowed } from "@/lib/cloudImport";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const MAX = 2e9;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Follows redirects by hand so every hop stays on an allowed cloud-storage host (no SSRF). */
async function fetchAllowed(url: string, hops = 8): Promise<Response | null> {
  let cur = url;
  for (let i = 0; i < hops; i++) {
    const u = new URL(cur);
    if (u.protocol !== "https:" || !hostAllowed(u.hostname)) return null;
    // Give up on a hop that doesn't answer within 20 s; once headers arrive the body can stream for as long as it needs.
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20_000);
    const r = await fetch(cur, { redirect: "manual", signal: ac.signal, headers: { "User-Agent": UA, Accept: "*/*" }, cache: "no-store" }).catch(() => null);
    clearTimeout(timer);
    if (!r) return null;
    if (r.status >= 300 && r.status < 400) {
      await r.body?.cancel().catch(() => {});
      const loc = r.headers.get("location");
      if (!loc) return null;
      cur = new URL(loc, cur).toString();
      continue;
    }
    return r;
  }
  return null;
}

function fileName(r: Response, fallback: string) {
  const cd = r.headers.get("content-disposition") || "";
  const star = cd.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (star) { try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, "")); } catch {} }
  const plain = cd.match(/filename\s*=\s*"?([^";]+)"?/);
  return (plain?.[1] || fallback).trim();
}

/**
 * Imports a file from a Google Drive, Dropbox, OneDrive, SharePoint or Box share link.
 * Streams the file back to the signed-in user's browser, which then uploads it through the normal pipeline.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const plan = downloadUrls(url || "");
  if (!plan) return NextResponse.json({ error: "Paste a share link from Google Drive, Dropbox, OneDrive, SharePoint or Box." }, { status: 400 });

  for (const candidate of plan.urls) {
    const r = await fetchAllowed(candidate);
    if (!r || !r.ok || !r.body) { await r?.body?.cancel().catch(() => {}); continue; }
    const type = (r.headers.get("content-type") || "").toLowerCase();
    // An HTML page means a sign-in, preview or "too large to scan" page rather than the file.
    if (type.includes("text/html")) { await r.body.cancel().catch(() => {}); continue; }
    const len = Number(r.headers.get("content-length") || 0);
    if (len > MAX) { await r.body.cancel().catch(() => {}); return NextResponse.json({ error: "That file is larger than 2 GB." }, { status: 413 }); }
    const name = fileName(r, `${plan.provider} file`);
    return new NextResponse(r.body, {
      headers: {
        "Content-Type": type || "application/octet-stream",
        ...(len ? { "Content-Length": String(len) } : {}),
        "X-File-Name": encodeURIComponent(name),
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json({
    error: `Couldn’t download that ${plan.provider} file. Make sure the link is shared with “Anyone with the link”. If it’s private to your company, download it and upload it from your device.`,
  }, { status: 422 });
}
