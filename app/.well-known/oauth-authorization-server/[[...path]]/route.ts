import { NextResponse } from "next/server";
import { CORS, authServerMetadata } from "@/lib/oauthServer";

/** RFC 8414 authorization server metadata. */
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json(authServerMetadata(), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } }); }
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }
