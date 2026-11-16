import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deliver, EMAIL_RE } from "@/lib/email/server";
import { productUpdateEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";

type Body = { mode: "preview" | "test" | "send"; title?: string; sub?: string; body?: string; cta_label?: string; cta_url?: string; test_to?: string };

async function admin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const [{ data: ok }, { data: u }] = await Promise.all([sb.rpc("is_platform_admin"), sb.auth.getUser(token)]);
  return ok ? { sb, email: u.user?.email || "" } : null;
}

function build(b: Body) {
  const cta = b.cta_label?.trim() && /^https:\/\//.test(b.cta_url?.trim() || "") ? { label: b.cta_label.trim(), url: b.cta_url!.trim() } : null;
  return productUpdateEmail({ title: (b.title || "").trim(), sub: (b.sub || "").trim(), bodyText: (b.body || "").trim(), cta });
}

/** Admin → Product updates: preview, send a test, or send to everyone who hasn't opted out. */
export async function POST(req: NextRequest) {
  const a = await admin(req);
  if (!a) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!b.title?.trim() || !b.body?.trim()) return NextResponse.json({ error: "Add a title and a message" }, { status: 400 });
  if (b.cta_label?.trim() && !/^https:\/\//.test(b.cta_url?.trim() || "")) return NextResponse.json({ error: "The button link must start with https://" }, { status: 400 });
  const m = build(b);
  if (b.mode === "preview") return NextResponse.json({ html: m.html, subject: m.subject });

  if (b.mode === "test") {
    const to = (b.test_to || a.email).trim();
    if (!EMAIL_RE.test(to)) return NextResponse.json({ error: "Enter a valid test address" }, { status: 400 });
    try { await deliver({ to: [to], subject: `[Test] ${m.subject}`, html: m.html, text: m.text, tag: "product_update_test" }); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 502 }); }
    return NextResponse.json({ ok: true, to });
  }

  // Send to everyone: the database records the send and returns the audience.
  const { data, error } = await a.sb.rpc("admin_product_update_start", { p_title: b.title, p_sub: b.sub || "", p_body: b.body, p_cta_label: b.cta_label || "", p_cta_url: b.cta_url || "" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { id, audience } = data as { id: string; audience: { email: string; name: string | null }[] };
  let sent = 0, failed = 0;
  const queue = audience.filter((r) => EMAIL_RE.test(r.email));
  failed += audience.length - queue.length;
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      try { await deliver({ to: [r.email], subject: m.subject, html: m.html, text: m.text, tag: "product_update" }); sent++; }
      catch { failed++; }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await a.sb.rpc("admin_product_update_finish", { p_id: id, p_sent: sent, p_failed: failed });
  return NextResponse.json({ ok: true, id, sent, failed });
}
