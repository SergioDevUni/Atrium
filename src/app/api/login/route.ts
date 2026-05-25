import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthConfig, isValidLogin, normalizeNextPath } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? "/"));

  if (!isValidLogin(username, password)) {
    const loginParams = new URLSearchParams({ error: "1", next: nextPath });
    return redirectTo(`/login?${loginParams.toString()}`);
  }

  const response = redirectTo(nextPath);
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
  void request;
  return redirectTo("/login");
}

function redirectTo(path: string) {
  return new NextResponse(null, {
    headers: { Location: path },
    status: 303,
  });
}
