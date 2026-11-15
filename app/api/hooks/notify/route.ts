import { NextRequest, NextResponse } from "next/server";
import { deliver, layout, textToHtml, SITE } from "@/lib/email/server";

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

  const who = p.who || "Someone";
  const from = p.company ? `${who} (${p.company})` : who;
  const url = `${SITE}${p.href || "/app"}`;
  let subject = "", heading = "", text = "", cta = "Open in Dozzier";
  switch (p.event) {
    case "open":
      subject = `${who} ${p.returning ? "is back on" : "opened"} ${p.doc || "your link"}`; heading = subject;
      text = `${from} ${p.returning ? "came back to" : "just opened"} ${p.doc || "your link"}${p.location ? ` from ${p.location}` : ""}.\n\nYou’ll see every page they read, and for how long, on their profile.`; cta = "See their activity"; break;
    case "question":
      subject = `${who} asked a question on ${p.doc || "your document"}`; heading = `New question${p.page ? ` on page ${p.page}` : ""}`;
      text = `${from} asked:\n\n“${(p.body || "").slice(0, 600)}”\n\nReply from Dozzier and they’ll see your answer right next to the page.`; cta = "Reply"; break;
    case "download":
      subject = `${who} downloaded ${p.doc || "your document"}`; heading = subject; text = `${from} downloaded a copy of ${p.doc || "your document"}.`; break;
    case "signed":
      subject = p.completed ? `“${p.title}” is fully signed` : `${who} signed “${p.title}”`; heading = subject;
      text = p.completed ? `Everyone has signed “${p.title}”. The certificate of completion and the signed PDF are ready.` : `${who} signed “${p.title}”. You’ll get another email when everyone has signed.`; cta = p.completed ? "Download signed PDF" : "View status"; break;
    case "upload":
      subject = `${who} uploaded ${p.count && p.count > 1 ? `${p.count} files` : p.file || "a file"}`; heading = `New upload to “${p.title}”`;
      text = `${who} uploaded ${p.file || "a file"} to your request “${p.title}”.${p.body ? `\n\nTheir note: “${p.body.slice(0, 400)}”` : ""}`; cta = "View files"; break;
    case "request":
      subject = `${who} requested “${(p.title || "").slice(0, 80)}”`; heading = "New request in your data room";
      text = `${from} asked for “${p.title}” in ${p.doc || "your Space"}.${p.body ? `\n\n${p.body.slice(0, 500)}` : ""}`; cta = "Open request tracker"; break;
    default: return NextResponse.json({ skipped: "unknown" });
  }
  // Zapier gets every event as structured data; Slack and Teams get a short message unless quiet hours are on.
  const hookJobs: Promise<void>[] = [postHook(p.hooks?.zapier, { event: p.event, who: p.who, company: p.company, document: p.doc, location: p.location, page: p.page, text: p.body, title: p.title, url, at: new Date().toISOString() })];
  if (wantsChat && !quiet) {
    const line = `*${subject}*\n${text.split("\n\n")[0]}`;
    hookJobs.push(postHook(p.hooks?.slack, { text: `${subject} — ${url}`, blocks: [{ type: "section", text: { type: "mrkdwn", text: line } }, { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: cta }, url }] }] }));
    hookJobs.push(postHook(p.hooks?.teams, { "@type": "MessageCard", "@context": "https://schema.org/extensions", summary: subject, themeColor: "2577EA", title: subject, text: text.split("\n\n")[0], potentialAction: [{ "@type": "OpenUri", name: cta, targets: [{ os: "default", uri: url }] }] }));
  }
  await Promise.all(hookJobs);
  if (!wantsEmail) return NextResponse.json({ ok: true, skipped: "email settings" });
  if (quiet) return NextResponse.json({ ok: true, skipped: "quiet hours" });
  try {
    await deliver({ to: [p.to], subject, tag: `alert_${p.event}`, text: `${text}\n\n${cta}: ${url}`,
      html: layout({ preheader: text.slice(0, 120), heading, bodyHtml: textToHtml(text), cta: { label: cta, url }, footer: "You’re getting this because email alerts are on for this event. Change them in Settings → Notifications." }) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "send failed" }, { status: 502 });
  }
}
