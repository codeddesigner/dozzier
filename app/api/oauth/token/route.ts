import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CORS } from "@/lib/oauthServer";

export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const NO_STORE = { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" };

/** OAuth token endpoint: authorization_code (PKCE S256) and refresh_token grants. */
export async function POST(req: NextRequest) {
  const type = req.headers.get("content-type") || "";
  let p: Record<string, string> = {};
  if (type.includes("application/json")) p = ((await req.json().catch(() => ({}))) || {}) as Record<string, string>;
  else p = Object.fromEntries(new URLSearchParams(await req.text()));
  // client_secret_basic: client id in the Authorization header (we issue no secrets, so only the id matters).
  const basic = req.headers.get("authorization")?.match(/^Basic\s+(.+)$/i)?.[1];
  if (basic && !p.client_id) { try { p.client_id = decodeURIComponent(atob(basic).split(":")[0]); } catch {} }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("oauth_token", {
    p_grant: p.grant_type || "", p_client_id: p.client_id || "", p_code: p.code || null, p_verifier: p.code_verifier || null,
    p_redirect_uri: p.redirect_uri || null, p_refresh: p.refresh_token || null,
  });
  if (error) {
    const code = /^(invalid_client|invalid_grant|unsupported_grant_type)$/.test(error.message) ? error.message : "invalid_request";
    return NextResponse.json({ error: code, error_description: code === "invalid_grant" ? "The code or refresh token is invalid, expired or already used." : error.message },
      { status: code === "invalid_client" ? 401 : 400, headers: NO_STORE });
  }
  return NextResponse.json(data, { headers: NO_STORE });
}
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
