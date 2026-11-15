import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SITE } from "@/lib/email/server";

export const dynamic = "force-dynamic";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const HOOK_HOSTS = /^https:\/\/(hooks\.slack\.com\/services\/|[a-z0-9-]+\.webhook\.office\.com\/|prod-[0-9]+\.[a-z0-9-]+\.logic\.azure\.com|[a-z0-9-]+\.[a-z]+\.environment\.api\.powerplatform\.com|hooks\.zapier\.com\/hooks\/catch\/)/;

/** Sends a test message to a connected Slack, Teams or Zapier webhook. */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  const sb = createClient(URL_, KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: string };
  const { data } = await sb.from("integrations").select("url").eq("kind", kind || "").maybeSingle();
  const url = data?.url as string | undefined;
  if (!url || !HOOK_HOSTS.test(url)) return NextResponse.json({ error: "Connect it first" }, { status: 400 });
  const link = `${SITE}/app`;
  const body = kind === "slack"
    ? { text: "Dozzier is connected. You’ll get alerts here when someone opens your links.", blocks: [{ type: "section", text: { type: "mrkdwn", text: "*Dozzier is connected* :white_check_mark:\nYou’ll get alerts here when someone opens your links, asks a question or signs." } }] }
    : kind === "teams"
      ? { "@type": "MessageCard", "@context": "https://schema.org/extensions", summary: "Dozzier is connected", themeColor: "2577EA", title: "Dozzier is connected", text: "You’ll get alerts here when someone opens your links, asks a question or signs.", potentialAction: [{ "@type": "OpenUri", name: "Open Dozzier", targets: [{ os: "default", uri: link }] }] }
      : { event: "test", who: "Paul", company: "Randombase", document: "Series A deck", location: "London, UK", url: link, at: new Date().toISOString() };
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    if (!r.ok) return NextResponse.json({ error: `The webhook answered ${r.status}. Check the URL and try again.` }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Couldn’t reach that webhook" }, { status: 502 }); }
}
