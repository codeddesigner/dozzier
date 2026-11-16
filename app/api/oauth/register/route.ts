import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CORS } from "@/lib/oauthServer";

export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";

/** RFC 7591 dynamic client registration. Every client is public and must use PKCE. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { client_name?: string; redirect_uris?: unknown } | null;
  const uris = Array.isArray(b?.redirect_uris) ? (b!.redirect_uris as unknown[]).filter((u): u is string => typeof u === "string") : [];
  if (!uris.length) return NextResponse.json({ error: "invalid_redirect_uri", error_description: "redirect_uris is required" }, { status: 400, headers: CORS });
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("oauth_register", { p_name: String(b?.client_name || ""), p_redirect_uris: uris });
  if (error) return NextResponse.json({ error: "invalid_redirect_uri", error_description: error.message }, { status: 400, headers: CORS });
  const d = data as { client_id: string; client_name: string; redirect_uris: string[] };
  return NextResponse.json({
    ...d,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  }, { status: 201, headers: CORS });
}
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
