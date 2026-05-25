export const AUTH_COOKIE_NAME = "atrium_session";

const DEFAULT_LOGIN_USER = "atrium";
const DEFAULT_LOGIN_PASSWORD = "workgate";
const DEFAULT_AUTH_TOKEN = "atrium-local-session";

export function getAuthConfig() {
  return {
    username: process.env.ATRIUM_LOGIN_USER?.trim() || DEFAULT_LOGIN_USER,
    password: process.env.ATRIUM_LOGIN_PASSWORD || DEFAULT_LOGIN_PASSWORD,
    sessionToken: process.env.ATRIUM_AUTH_TOKEN || DEFAULT_AUTH_TOKEN,
  };
}

export function isValidLogin(username: string, password: string) {
  const config = getAuthConfig();
  return username === config.username && password === config.password;
}

export function hasValidSession(cookieValue: string | undefined) {
  return Boolean(cookieValue) && cookieValue === getAuthConfig().sessionToken;
}

export function normalizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "https://atrium.local");
    if (url.origin !== "https://atrium.local") return "/";
    if (url.pathname === "/login") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
