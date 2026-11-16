import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const REF = process.env.NEXT_PUBLIC_SUPABASE_REF || "hxgcoekovalkmdwcabll";

type Provider = { id: string; saml?: { entity_id?: string; metadata_url?: string }; domains?: { domain: string }[]; created_at?: string };

/** Supabase Management API (SAML connections can only be managed here, not from the database). */
async function mgmt(path: string, init?: RequestInit) {
  const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
  if (!token) return { ok: false, status: 503, j: { message: "Add SUPABASE_ACCESS_TOKEN in Vercel to manage SSO connections." } as Record<string, unknown> };
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth/sso/providers${path}`, {
    ...init, cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: r.ok, status: r.status, j };
}
const msg = (j: Record<string, unknown>, fallback: string) => String(j.message || j.msg || j.error || fallback);

/** Only platform admins get through; returns a Supabase client acting as them. */
async function admin(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data } = await sb.rpc("is_platform_admin");
  return data ? sb : null;
}

const cleanDomains = (v: unknown) =>
  String(v || "").split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter((d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d));

export async function GET(req: NextRequest) {
  const sb = await admin(req);
  if (!sb) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const [{ data: links }, p] = await Promise.all([sb.rpc("admin_sso_list"), mgmt("")]);
  const items = ((p.j.items as Provider[]) || []).map((x) => ({ id: x.id, entity_id: x.saml?.entity_id, metadata_url: x.saml?.metadata_url, domains: (x.domains || []).map((d) => d.domain), created_at: x.created_at }));
  return NextResponse.json({ configured: p.status !== 503, error: p.ok ? null : msg(p.j, "Couldn’t reach Supabase"), providers: items, links: links || [] });
}

export async function POST(req: NextRequest) {
  const sb = await admin(req);
  if (!sb) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; name?: string; domains?: string; metadata?: string; owner_email?: string };
  const name = (b.name || "").trim();
  const domains = cleanDomains(b.domains);
  const meta = (b.metadata || "").trim();
  if (!name) return NextResponse.json({ error: "Add the company name" }, { status: 400 });
  if (!domains.length) return NextResponse.json({ error: "Add at least one email domain, like acme.com" }, { status: 400 });
  const body: Record<string, unknown> = { domains, attribute_mapping: { keys: { email: { names: ["email", "mail", "emailaddress", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] }, name: { names: ["name", "displayName", "http://schemas.microsoft.com/identity/claims/displayname", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] } } } };
  if (meta) {
    if (/^https:\/\//i.test(meta)) body.metadata_url = meta;
    else if (meta.startsWith("<")) body.metadata_xml = meta;
    else return NextResponse.json({ error: "Paste the metadata link (https://…) or the metadata XML" }, { status: 400 });
  } else if (!b.id) return NextResponse.json({ error: "Paste the metadata link from their IT team" }, { status: 400 });

  let id = b.id;
  const r = id ? await mgmt(`/${id}`, { method: "PUT", body: JSON.stringify(body) }) : await mgmt("", { method: "POST", body: JSON.stringify({ type: "saml", ...body }) });
  if (!r.ok) {
    const m = msg(r.j, "Supabase refused the connection");
    return NextResponse.json({ error: /already/i.test(m) ? "One of those domains is already connected to another company." : /saml.*(disabled|not enabled)/i.test(m) ? "Turn on SAML 2.0 in Supabase → Authentication → Sign In / Providers first." : m }, { status: r.status === 503 ? 503 : 400 });
  }
  id = id || String(r.j.id);
  const { error } = await sb.rpc("admin_sso_link", { p_provider: id, p_name: name, p_domains: domains, p_owner_email: (b.owner_email || "").trim() });
  if (error) return NextResponse.json({ error: `Connected, but couldn’t link the workspace: ${error.message}`, id }, { status: 400 });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const sb = await admin(req);
  if (!sb) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const r = await mgmt(`/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404) return NextResponse.json({ error: msg(r.j, "Couldn’t remove it") }, { status: 400 });
  await sb.rpc("admin_sso_unlink", { p_provider: id });
  return NextResponse.json({ ok: true });
}
