import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_COOKIE, cookieMaxAge, pickToken } from "./admin-session";

// Partitioned + SameSite=None keeps the cookie working inside the editor preview frame;
// it is HttpOnly and only read by the admin gate below, which never returns data.
const COOKIE_OPTS = { path: "/", httpOnly: true, secure: true, sameSite: "none", partitioned: true } as const;

/**
 * Gate for the admin page, run on the server before anything renders. Returns
 * only a boolean; the route turns `false` into a genuine 404.
 */
export const checkAdminAccess = createServerFn({ method: "GET" }).handler(async (): Promise<{ ok: boolean }> => {
  const token = pickToken(getRequestHeader("authorization"), getCookie(ADMIN_COOKIE));
  if (!token) return { ok: false };
  const { verifyAdminToken } = await import("./admin-session.server");
  return { ok: (await verifyAdminToken(token)) !== null };
});

/** Stores the caller's access token in the HttpOnly gate cookie, for admins only. */
export const syncAdminCookie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isActiveAdmin } = await import("./admin-session.server");
    const token = pickToken(getRequestHeader("authorization"), null);
    const maxAge = cookieMaxAge(context.claims.exp, Date.now() / 1000);
    if (token && maxAge > 0 && (await isActiveAdmin(context.supabase, context.userId))) {
      setCookie(ADMIN_COOKIE, token, { ...COOKIE_OPTS, maxAge });
    } else {
      deleteCookie(ADMIN_COOKIE, COOKIE_OPTS);
    }
    return { ok: true };
  });

/** Clears the gate cookie (sign-out). */
export const clearAdminCookie = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(ADMIN_COOKIE, COOKIE_OPTS);
  return { ok: true };
});
