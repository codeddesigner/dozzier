import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deliver, EMAIL_RE, SITE } from "@/lib/email/server";
import { userEmail, type UserMeta } from "@/lib/email/messages";

export const dynamic = "force-dynamic";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const DAILY_LIMIT = 300;
const KINDS = ["invite", "sign", "file_request", "reminder", "share", "follow_up", "update", "nudge"] as const;

type Body = { kind: (typeof KINDS)[number]; to: string[]; cc?: string[]; bcc?: string[]; subject: string; message: string; heading?: string; cta?: { label: string; url: string }; meta?: UserMeta };

const TEMPLATES = ["team_invite", "room_invite", "sign", "sign_reminder", "file_request", "file_reminder", "share", "update", "message"];
/** Only short plain strings make it into the header illustration. */
function cleanMeta(m?: UserMeta): UserMeta | undefined {
  if (!m || typeof m !== "object") return undefined;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
  return { template: TEMPLATES.includes(String(m.template)) ? m.template : undefined, title: str(m.title, 120), role: str(m.role, 20), workspace: str(m.workspace, 60), due: str(m.due, 40), subtitle: str(m.subtitle, 60),
    items: Array.isArray(m.items) ? m.items.slice(0, 3).map((x) => String(x).slice(0, 60)) : undefined };
}

/** Sends an email on behalf of the signed-in user (From: "Name via Dozzier", Reply-To: the user). */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in to send email" }, { status: 401 });
  const sb = createClient(URL_, KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user?.email) return NextResponse.json({ error: "Session expired — sign in again" }, { status: 401 });

  let b: Body;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const clean = (l?: string[]) => [...new Set((l || []).map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))];
  const to = clean(b.to), cc = clean(b.cc), bcc = clean(b.bcc);
  const n = to.length + cc.length + bcc.length;
  if (!KINDS.includes(b.kind)) return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  if (!to.length && !bcc.length) return NextResponse.json({ error: "Add at least one valid recipient" }, { status: 400 });
  if (n > 50) return NextResponse.json({ error: "Up to 50 recipients per email" }, { status: 400 });
  const subject = String(b.subject || "").trim().slice(0, 200);
  const message = String(b.message || "").trim().slice(0, 8000);
  if (!subject || !message) return NextResponse.json({ error: "Add a subject and a message" }, { status: 400 });

  // Buttons may only point back to Dozzier, so the app can't be used to send arbitrary links under our name.
  const origin = req.nextUrl.origin;
  const okHost = (url: string) => { try { const h = new URL(url).host; return [new URL(SITE).host, new URL(origin).host, "dozzier.vercel.app", "dozzier.co", "www.dozzier.co"].includes(h); } catch { return false; } };
  const cta = b.cta && okHost(b.cta.url) ? { label: String(b.cta.label || "Open").slice(0, 40), url: b.cta.url } : undefined;

  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: log } = await sb.from("email_log").select("recipients").gte("created_at", since);
  const used = (log || []).reduce((a, r) => a + (r.recipients as number), 0);
  if (used + n > DAILY_LIMIT) return NextResponse.json({ error: `Daily sending limit reached (${DAILY_LIMIT} recipients). Try again tomorrow.` }, { status: 429 });

  const { data: p } = await sb.from("profiles").select("full_name,workspace_name").eq("id", u.user.id).maybeSingle();
  const sender = p?.full_name || u.user.email.split("@")[0];
  try {
    const id = await deliver({
      to, cc, bcc, subject, replyTo: u.user.email, fromName: sender, tag: b.kind,
      text: message + (cta ? `\n\n${cta.label}: ${cta.url}` : ""),
      html: userEmail({ kind: b.kind, meta: cleanMeta(b.meta), heading: b.heading?.slice(0, 120), subject, message, cta, sender, workspace: p?.workspace_name }),
    });
    await sb.from("email_log").insert({ kind: b.kind, recipients: n, subject, provider_id: id || null });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t send" }, { status: 502 });
  }
}
