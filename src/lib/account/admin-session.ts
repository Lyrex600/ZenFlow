/**
 * Client-safe helpers for the admin gate cookie. The cookie only ever holds the
 * caller's own short-lived access token (HttpOnly, never readable by scripts),
 * so a full page load of the admin area can be checked on the server.
 */
export const ADMIN_COOKIE = "__Host-zf_adm";

/** Seconds until the token's `exp`, or 0 when it is missing or already expired. */
export function cookieMaxAge(exp: unknown, nowSec: number): number {
  const e = typeof exp === "number" ? exp : Number(exp);
  if (!Number.isFinite(e)) return 0;
  return Math.max(0, Math.floor(e - nowSec));
}

/** Prefers the Authorization header (client navigation), falls back to the cookie (full page load). */
export function pickToken(authorization: string | null | undefined, cookie: string | null | undefined): string | null {
  if (authorization?.startsWith("Bearer ")) {
    const t = authorization.slice(7).trim();
    if (t) return t;
  }
  return cookie?.trim() || null;
}
