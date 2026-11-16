import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { domainRule, isApex, normalizeDomain, isAppHost, hostLabel } from "@/lib/domains";

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
  if (isAppHost(domain) || domain.endsWith(".dozzier.co")) return NextResponse.json({ error: "That domain can’t be used" }, { status: 400 });
  const rule = domainRule(a.plan);
  if (rule === "none") return NextResponse.json({ error: "Custom domains are on the Standard and Data Rooms plans.", upgrade: true }, { status: 402 });
  if (rule === "subdomain" && isApex(domain)) return NextResponse.json({ error: `Standard includes subdomains like docs.${domain}. Full domains are on the Data Rooms plan.`, upgrade: true }, { status: 402 });
  const { count } = await a.sb.from("custom_domains").select("id", { count: "exact", head: true });
  if ((count || 0) >= 5) return NextResponse.json({ error: "You can add up to 5 domains" }, { status: 400 });

  const add = await vercel(`/v10/projects/${PROJECT}/domains`, { method: "POST", body: JSON.stringify({ name: domain }) });
  const code = (add.j.error as { code?: string; message?: string } | undefined);
  if (!add.ok && code?.code !== "domain_already_in_use_by_project") {
    return NextResponse.json({ error: code?.code === "domain_already_in_use" ? "That domain is connected to another Vercel project. Remove it there first." : code?.message || "Couldn’t add that domain" }, { status: 400 });
  }
  const { error } = await a.sb.from("custom_domains").insert({ domain, is_primary: !count, status: "pending" });
  if (error) {
    await vercel(`/v9/projects/${PROJECT}/domains/${domain}`, { method: "DELETE" });
    return NextResponse.json({ error: error.message.includes("duplicate") ? "That domain is already in use on Dozzier" : error.message }, { status: 400 });
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
  return NextResponse.json({ ok: true });
}
