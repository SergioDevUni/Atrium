import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, hasValidSession } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/logout", "/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (hasValidSession(sessionCookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/readme/") ||
    pathname.match(/\.[a-zA-Z0-9]+$/)
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
