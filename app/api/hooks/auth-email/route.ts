import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { deliver } from "@/lib/email/server";
import { authEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";

type HookBody = {
  user: { email: string; new_email?: string; user_metadata?: { full_name?: string; name?: string } };
  email_data: { token?: string; token_hash?: string; redirect_to?: string; email_action_type: string; site_url?: string; token_new?: string; token_hash_new?: string };
};

/** Standard Webhooks signature check (Supabase Auth "Send Email" hook). Secret format: v1,whsec_<base64>. */
function verify(raw: string, h: Headers) {
  const secret = (process.env.SUPABASE_AUTH_HOOK_SECRET || "").trim().replace(/^v1,/, "").replace(/^whsec_/, "");
  if (!secret) return false;
  const id = h.get("webhook-id"), ts = h.get("webhook-timestamp"), sig = h.get("webhook-signature");
  if (!id || !ts || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = crypto.createHmac("sha256", Buffer.from(secret, "base64")).update(`${id}.${ts}.${raw}`).digest("base64");
  return sig.split(" ").some((s) => { const v = s.split(",")[1] || ""; return v.length === expected.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected)); });
}

/**
 * Supabase Auth calls this instead of sending its own emails, so sign-up confirmation,
 * password reset, magic links and email changes all use the Dozzier email design.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(raw, req.headers)) return NextResponse.json({ error: { http_code: 401, message: "Invalid signature" } }, { status: 401 });
  const b = JSON.parse(raw) as HookBody;
  const d = b.email_data;
  const type = d.email_action_type;
  const redirect = d.redirect_to || d.site_url || "https://dozzier.co";
  const link = (hash?: string, t = type) => `${SB_URL}/auth/v1/verify?token=${encodeURIComponent(hash || "")}&type=${encodeURIComponent(t)}&redirect_to=${encodeURIComponent(redirect)}`;
  const name = b.user.user_metadata?.full_name || b.user.user_metadata?.name || null;
  try {
    if (type === "email_change" && b.user.new_email) {
      // Supabase sends two confirmations for a secure email change: one to each address.
      const jobs = [];
      if (d.token_hash_new) jobs.push({ to: b.user.email, m: authEmail({ type, url: link(d.token_hash_new), email: b.user.new_email, name }) });
      if (d.token_hash) jobs.push({ to: b.user.new_email, m: authEmail({ type, url: link(d.token_hash), email: b.user.new_email, name }) });
      await Promise.all(jobs.map((j) => deliver({ to: [j.to], subject: j.m.subject, html: j.m.html, text: j.m.text, tag: "auth_email_change" })));
    } else {
      const m = authEmail({ type, url: link(d.token_hash), code: d.token, email: b.user.email, name });
      await deliver({ to: [b.user.email], subject: m.subject, html: m.html, text: m.text, tag: `auth_${type}` });
    }
    return NextResponse.json({});
  } catch (e) {
    return NextResponse.json({ error: { http_code: 500, message: e instanceof Error ? e.message : "send failed" } }, { status: 500 });
  }
}
