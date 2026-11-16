import { NextRequest, NextResponse } from "next/server";
import { isAppHost } from "@/lib/domains";

/**
 * Customer domains (docs.acme.com) only serve shared links:
 *   docs.acme.com/series-a  → the viewer for link "series-a"
 *   docs.acme.com/          → a small "shared by Acme" page
 * Everything that belongs to the app (dashboard, sign-in, docs) goes back to dozzier.co.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!host || isAppHost(host)) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/") || pathname.startsWith("/v/") || pathname === "/domain-home" || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  if (pathname === "/") return NextResponse.rewrite(new URL("/domain-home", req.url));
  const seg = pathname.slice(1).replace(/\/$/, "");
  const APP = /^(app|login|signup|onboarding|forgot-password|reset-password|docs|pricing|changelog|legal|privacy|terms|security|upgrade|r|s|sign)(\/|$)/;
  if (APP.test(seg) || seg.includes("/")) return NextResponse.redirect(`https://dozzier.co${pathname}${search}`, 307);
  return NextResponse.rewrite(new URL(`/v/${seg}${search}`, req.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
