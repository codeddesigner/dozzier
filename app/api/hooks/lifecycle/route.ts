import { NextRequest, NextResponse } from "next/server";
import { deliver, EMAIL_RE } from "@/lib/email/server";
import { welcomeEmail, trialEndingEmail, digestEmail, receiptEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";

type P =
  | { event: "welcome"; to: string; name?: string | null; workspace?: string | null }
  | { event: "trial_ending"; to: string; name?: string | null; days: number; ends: string }
  | { event: "receipt"; to: string; name?: string | null; plan: string; interval: string; seats?: number | null; amount: string; reference: string; date: string; currency: string }
  | { event: "digest"; to: string; name?: string | null; visits: number; prev: number; docs: number; days: number[]; hot: { name: string; visits: number }[]; top: { doc: string; visits: number }[] };

/** Called by Postgres (pg_net) for welcome, trial-ending, weekly-digest and (from the Stripe webhook) receipt emails. */
export async function POST(req: NextRequest) {
  if (!process.env.DOZZIER_HOOK_SECRET || req.headers.get("x-dozzier-secret") !== process.env.DOZZIER_HOOK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = (await req.json()) as P;
  if (!EMAIL_RE.test(p.to || "")) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const m = p.event === "welcome" ? welcomeEmail(p)
    : p.event === "trial_ending" ? trialEndingEmail(p)
    : p.event === "receipt" ? receiptEmail(p)
    : p.event === "digest" ? digestEmail({ ...p, days: (p.days || []).slice(0, 7), hot: (p.hot || []).slice(0, 3), top: (p.top || []).slice(0, 5) })
    : null;
  if (!m) return NextResponse.json({ skipped: "unknown" });
  try {
    await deliver({ to: [p.to], subject: m.subject, html: m.html, text: m.text, tag: p.event });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "send failed" }, { status: 502 });
  }
}
