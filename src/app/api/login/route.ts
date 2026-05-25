import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthConfig, isValidLogin, normalizeNextPath } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? "/"));

  if (!isValidLogin(username, password)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  response.cookies.set(AUTH_COOKIE_NAME, getAuthConfig().sessionToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}
