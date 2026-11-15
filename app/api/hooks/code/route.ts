import { NextRequest, NextResponse } from "next/server";
import { deliver, layout, EMAIL_RE } from "@/lib/email/server";

export const dynamic = "force-dynamic";

/** Called by Postgres (request_view_code) to email a visitor their 6-digit viewing code. */
export async function POST(req: NextRequest) {
  if (!process.env.DOZZIER_HOOK_SECRET || req.headers.get("x-dozzier-secret") !== process.env.DOZZIER_HOOK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = (await req.json()) as { to: string; code: string; sender?: string; doc?: string };
  if (!EMAIL_RE.test(p.to || "") || !/^\d{6}$/.test(p.code || "")) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const sender = (p.sender || "Someone").slice(0, 80), doc = (p.doc || "a document").slice(0, 120);
  const spaced = `${p.code.slice(0, 3)} ${p.code.slice(3)}`;
  try {
    await deliver({
      to: [p.to], subject: `${spaced} is your code to view “${doc}”`, tag: "view_code",
      text: `Your code to view “${doc}” from ${sender} is ${spaced}.\n\nIt expires in 15 minutes. If you didn’t ask for it, you can ignore this email.`,
      html: layout({
        preheader: `Your viewing code is ${spaced}`, heading: "Confirm it’s you",
        bodyHtml: `<p style="margin:0 0 14px;line-height:1.6">Enter this code to view “${doc.replace(/</g, "&lt;")}” from ${sender.replace(/</g, "&lt;")}:</p>
<p style="margin:0 0 18px;font-size:32px;font-weight:700;letter-spacing:.18em;font-family:ui-monospace,Menlo,monospace">${spaced}</p>
<p style="margin:0;line-height:1.6;color:#6b7280;font-size:13px">It expires in 15 minutes. If you didn’t ask for it, you can ignore this email.</p>`,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "send failed" }, { status: 502 });
  }
}
