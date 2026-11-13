import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const h = req.headers;
  const city = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region");
  const country = h.get("x-vercel-ip-country");
  const parts = [city ? decodeURIComponent(city) : null, region, country].filter(Boolean);
  return NextResponse.json({ location: parts.join(", ") || null });
}
