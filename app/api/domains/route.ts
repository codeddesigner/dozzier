import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { domainRule, isApex, normalizeDomain, isAppHost, hostLabel, isVanity, vanityProblem, VANITY_ROOT } from "@/lib/domains";

export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const PROJECT = process.env.VERCEL_PROJECT_ID || "prj_Etxi80YkAof4sFJR2Ub9Cnrg4kH9";
const TEAM = process.env.VERCEL_TEAM_ID || "team_1D7hK58NrH7wg9eIXwegoBVk";

type Rec = { type: string; name: string; value: string };

async function vercel(path: string, init?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`https://api.vercel.com${path}${sep}teamId=${TEAM}`, { ...init, headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j: j as Record<string, unknown> };
}

/** Asks Vercel where the domain stands and which DNS records the customer still needs. */
async function inspect(domain: string): Promise<{ status: "active" | "pending"; records: Rec[]; message?: string }> {
  const [pd, cfg] = await Promise.all([vercel(`/v9/projects/${PROJECT}/domains/${domain}`), vercel(`/v6/domains/${domain}/config`)]);
  if (!pd.ok) return { status: "pending", records: [], message: "This domain isn’t attached any more. Remove it and add it again." };
  const records: Rec[] = [];
  if (isVanity(domain)) {
    if (pd.j.verified === false) await vercel(`/v9/projects/${PROJECT}/domains/${domain}/verify`, { method: "POST" });
    const ready = pd.j.verified !== false && !((cfg.j.misconfigured as boolean | undefined) ?? true);
    return { status: ready ? "active" : "pending", records, message: ready ? undefined : "Setting up your address — this usually takes under a minute." };
  }
  if (isApex(domain)) records.push({ type: "A", name: "@", value: "76.76.21.21" });
  else records.push({ type: "CNAME", name: hostLabel(domain), value: "cname.vercel-dns.com" });
  const verification = (pd.j.verification as { type: string; domain: string; value: string }[] | undefined) || [];
  for (const v of verification) records.push({ type: v.type, name: v.domain, value: v.value });
  if (pd.j.verified === false) await vercel(`/v9/projects/${PROJECT}/domains/${domain}/verify`, { method: "POST" });
  const misconfigured = (cfg.j.misconfigured as boolean | undefined) ?? true;
  return { status: pd.j.verified !== false && !misconfigured ? "active" : "pending", records };
}

async function auth(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const [{ data: ws }, { data: role }] = await Promise.all([sb.rpc("ws"), sb.rpc("ws_role")]);
  if (!ws) return null;
  const { data: p } = await sb.from("profiles").select("plan").eq("id", ws as string).maybeSingle();
  return { sb, ws: ws as string, role: role as string, plan: (p?.plan as string) || "trial" };
}
const off = () => NextResponse.json({ error: "Custom domains aren’t switched on yet. Add VERCEL_TOKEN to the project’s environment variables." }, { status: 503 });

/** GET ?domain=… → refresh one domain's status and the DNS records it needs. */
export async function GET(req: NextRequest) {
  if (!process.env.VERCEL_TOKEN) return off();
  const a = await auth(req); if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  const domain = normalizeDomain(req.nextUrl.searchParams.get("domain") || "");
  const { data: row } = await a.sb.from("custom_domains").select("id,status").eq("domain", domain).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await inspect(domain);
  if (r.status !== row.status && (a.role === "Owner" || a.role === "Admin")) await a.sb.from("custom_domains").update({ status: r.status }).eq("id", row.id);
  return NextResponse.json(r);
}

/** POST { domain } → attach to Vercel and save for this workspace. */
export async function POST(req: NextRequest) {
  if (!process.env.VERCEL_TOKEN) return off();
  const a = await auth(req); if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  if (a.role !== "Owner" && a.role !== "Admin") return NextResponse.json({ error: "Only workspace admins can add domains" }, { status: 403 });
  const domain = normalizeDomain(((await req.json().catch(() => ({}))) as { domain?: string }).domain || "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain) || domain.length > 253) return NextResponse.json({ error: "Enter a domain like docs.yourcompany.com" }, { status: 400 });
  const rule = domainRule(a.plan);
  if (rule === "none") return NextResponse.json({ error: "A Dozzier address is on Standard, and your own domain is on Data Rooms.", upgrade: true }, { status: 402 });
  const vanity = isVanity(domain);
  const { data: existing } = await a.sb.from("custom_domains").select("domain,is_primary");
  const rows = (existing || []) as { domain: string; is_primary: boolean }[];
  if (vanity) {
    const problem = vanityProblem(domain.slice(0, -VANITY_ROOT.length - 1));
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (rows.some((r) => isVanity(r.domain))) return NextResponse.json({ error: "Your workspace already has a Dozzier address. Remove it first to pick a new one." }, { status: 400 });
  } else {
    if (isAppHost(domain) || domain.endsWith(`.${VANITY_ROOT}`) || domain === VANITY_ROOT) return NextResponse.json({ error: "That domain can’t be used" }, { status: 400 });
    if (rule !== "any") return NextResponse.json({ error: `Your own domain is on the Data Rooms plan. On Standard you get a Dozzier address like yourcompany.${VANITY_ROOT}.`, upgrade: true }, { status: 402 });
    if (rows.filter((r) => !isVanity(r.domain)).length >= 5) return NextResponse.json({ error: "You can add up to 5 domains" }, { status: 400 });
  }
  const { data: taken } = await a.sb.rpc("domain_taken", { p_domain: domain });
  if (taken) return NextResponse.json({ error: vanity ? "That name is taken — try another" : "That domain is already in use on Dozzier" }, { status: 400 });
  const count = rows.length;
  // Your own domain takes over as the link domain; a Dozzier address is primary only if nothing else is.
  const makePrimary = vanity ? !rows.some((r) => r.is_primary) : !rows.some((r) => r.is_primary && !isVanity(r.domain));

  const add = await vercel(`/v10/projects/${PROJECT}/domains`, { method: "POST", body: JSON.stringify({ name: domain }) });
  const code = (add.j.error as { code?: string; message?: string } | undefined);
  if (!add.ok && code?.code !== "domain_already_in_use_by_project") {
    return NextResponse.json({ error: code?.code === "domain_already_in_use" ? "That domain is connected to another Vercel project. Remove it there first." : code?.message || "Couldn’t add that domain" }, { status: 400 });
  }
  if (makePrimary && count) await a.sb.from("custom_domains").update({ is_primary: false }).neq("domain", domain);
  const { error } = await a.sb.from("custom_domains").insert({ domain, is_primary: makePrimary, status: "pending" });
  if (error) {
    // Only detach from Vercel if this request attached it (never pull a domain another workspace uses).
    if (add.ok) await vercel(`/v9/projects/${PROJECT}/domains/${domain}`, { method: "DELETE" });
    return NextResponse.json({ error: error.message.includes("duplicate") ? (vanity ? "That name is taken — try another" : "That domain is already in use on Dozzier") : error.message }, { status: 400 });
  }
  return NextResponse.json(await inspect(domain));
}

/** DELETE ?domain=… → detach from Vercel and forget it. */
export async function DELETE(req: NextRequest) {
  const a = await auth(req); if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  if (a.role !== "Owner" && a.role !== "Admin") return NextResponse.json({ error: "Only workspace admins can remove domains" }, { status: 403 });
  const domain = normalizeDomain(req.nextUrl.searchParams.get("domain") || "");
  const { data: row } = await a.sb.from("custom_domains").select("id").eq("domain", domain).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (process.env.VERCEL_TOKEN) await vercel(`/v9/projects/${PROJECT}/domains/${domain}`, { method: "DELETE" });
  await a.sb.from("custom_domains").delete().eq("id", row.id);
  // Keep a link domain: fall back to the Dozzier address (or any remaining domain).
  const { data: left } = await a.sb.from("custom_domains").select("id,domain,is_primary").order("created_at");
  const rest = (left || []) as { id: string; domain: string; is_primary: boolean }[];
  if (rest.length && !rest.some((r) => r.is_primary)) {
    const next = rest.find((r) => !isVanity(r.domain)) || rest[0];
    await a.sb.from("custom_domains").update({ is_primary: true }).eq("id", next.id);
  }
  return NextResponse.json({ ok: true });
}
