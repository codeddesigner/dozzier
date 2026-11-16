import { NextResponse } from "next/server";
import { CORS, protectedResourceMetadata } from "@/lib/oauthServer";

/** RFC 9728: tells MCP clients where to sign in. Also answers the path-suffixed form (/…/api/mcp). */
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json(protectedResourceMetadata(), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } }); }
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
