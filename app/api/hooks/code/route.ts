import { NextRequest, NextResponse } from "next/server";
import { deliver, EMAIL_RE } from "@/lib/email/server";
import { viewCodeEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";

/** Called by Postgres (request_view_code) to email a visitor their 6-digit viewing code. */
export async function POST(req: NextRequest) {
  if (!process.env.DOZZIER_HOOK_SECRET || req.headers.get("x-dozzier-secret") !== process.env.DOZZIER_HOOK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = (await req.json()) as { to: string; code: string; sender?: string; doc?: string };
  if (!EMAIL_RE.test(p.to || "") || !/^\d{6}$/.test(p.code || "")) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const sender = (p.sender || "Someone").slice(0, 80), doc = (p.doc || "a document").slice(0, 120);
  try {
    const m = viewCodeEmail({ code: p.code, sender, doc });
    await deliver({ to: [p.to], subject: m.subject, tag: "view_code", text: m.text, html: m.html });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "send failed" }, { status: 502 });
  }
}
