import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const h = req.headers;
  const city = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region");
  const country = h.get("x-vercel-ip-country");
  const parts = [city ? decodeURIComponent(city) : null, region, country].filter(Boolean);
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return NextResponse.json({ location: parts.join(", ") || null, ip });
}
