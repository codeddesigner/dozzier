import { NextRequest, NextResponse } from "next/server";
import { deliver, SITE } from "@/lib/email/server";
import { alertEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";

type Payload = {
  event: "open" | "question" | "download" | "signed" | "upload" | "request";
  to: string; owner_name?: string | null; settings?: { notifications?: { matrix?: Record<string, string[]>; quiet?: boolean; quiet_from?: string; quiet_to?: string }; workspace?: { timezone?: string } } | null;
  who?: string | null; company?: string | null; doc?: string | null; location?: string | null; page?: number | null; body?: string | null; count?: number | null;
  file?: string | null; title?: string | null; completed?: boolean | null; href?: string | null; returning?: boolean | null;
  hooks?: { slack?: string; teams?: string; zapier?: string } | null;
};
// Events that go to Slack/Teams when the person hasn't changed their notification settings.
const CHAT_DEFAULT: Record<string, boolean> = { open: true, question: true, signed: true, download: false, upload: false, request: true };
const HOOK_HOSTS = /^https:\/\/(hooks\.slack\.com\/services\/|[a-z0-9-]+\.webhook\.office\.com\/|prod-[0-9]+\.[a-z0-9-]+\.logic\.azure\.com|[a-z0-9-]+\.[a-z]+\.environment\.api\.powerplatform\.com|hooks\.zapier\.com\/hooks\/catch\/)/;

async function postHook(url: string | undefined, body: unknown) {
  if (!url || !HOOK_HOSTS.test(url)) return;
  try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(4000) }); } catch {}
}
// Events that default to email when the person hasn't changed their notification settings.
const EMAIL_DEFAULT: Record<string, boolean> = { open: true, question: true, download: true, signed: true, upload: true, request: true };

function inQuiet(n: NonNullable<NonNullable<Payload["settings"]>["notifications"]>, tz?: string) {
  if (!n.quiet || !n.quiet_from || !n.quiet_to) return false;
  const m = tz?.match(/GMT([+-])(\d{2}):(\d{2})/);
  const off = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  const now = new Date(Date.now() + off * 60000); const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const a = toMin(n.quiet_from), b = toMin(n.quiet_to);
  return a > b ? mins >= a || mins < b : mins >= a && mins < b;
}

/** Called by Supabase (pg_net) when something happens; emails the owner if their settings allow it. */
export async function POST(req: NextRequest) {
  if (!process.env.DOZZIER_HOOK_SECRET || req.headers.get("x-dozzier-secret") !== process.env.DOZZIER_HOOK_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = (await req.json()) as Payload;
  const n = p.settings?.notifications || {};
  const key = p.event === "request" ? "question" : p.event;
  const wantsEmail = n.matrix?.[key] ? n.matrix[key].includes("email") : EMAIL_DEFAULT[p.event];
  const wantsChat = n.matrix?.[key] ? n.matrix[key].includes("slack") : CHAT_DEFAULT[p.event];
  const quiet = inQuiet(n, p.settings?.workspace?.timezone);

  const url = `${SITE}${p.href || "/app"}`;
  if (!["open", "question", "download", "signed", "upload", "request"].includes(p.event)) return NextResponse.json({ skipped: "unknown" });
  const m = alertEmail({ ...p, url });
  const subject = m.subject, text = m.line, cta = m.cta;
  // Zapier gets every event as structured data; Slack and Teams get a short message unless quiet hours are on.
  const hookJobs: Promise<void>[] = [postHook(p.hooks?.zapier, { event: p.event, who: p.who, email: p.who && /^\S+@\S+\.\S+$/.test(p.who) ? p.who.toLowerCase() : null, company: p.company, document: p.doc, title: p.title, file: p.file, page: p.page, text: p.body, location: p.location, returning: p.returning ?? null, completed: p.completed ?? null, url, at: new Date().toISOString() })];
  if (wantsChat && !quiet) {
    const line = `*${subject}*\n${text.split("\n\n")[0]}`;
    hookJobs.push(postHook(p.hooks?.slack, { text: `${subject} — ${url}`, blocks: [{ type: "section", text: { type: "mrkdwn", text: line } }, { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: cta }, url }] }] }));
    hookJobs.push(postHook(p.hooks?.teams, { "@type": "MessageCard", "@context": "https://schema.org/extensions", summary: subject, themeColor: "2577EA", title: subject, text: text.split("\n\n")[0], potentialAction: [{ "@type": "OpenUri", name: cta, targets: [{ os: "default", uri: url }] }] }));
  }
  await Promise.all(hookJobs);
  if (!wantsEmail) return NextResponse.json({ ok: true, skipped: "email settings" });
  if (quiet) return NextResponse.json({ ok: true, skipped: "quiet hours" });
  try {
    await deliver({ to: [p.to], subject, tag: `alert_${p.event}`, text: m.text, html: m.html });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "send failed" }, { status: 502 });
  }
}
