import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export function POST() {
  return clearSession();
}

export function GET() {
  return clearSession();
}

function clearSession() {
  const response = new NextResponse(null, {
    headers: { Location: "/login" },
    status: 303,
  });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
