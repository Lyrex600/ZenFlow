import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  is_admin: boolean;
  disabled_at: string | null;
  last_seen_at: string | null;
  last_login_at: string | null;
  last_ip: string | null;
}

export interface LoginEventRow {
  id: number;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Admin overview. The admin check runs on the server with the caller's own
 * token (RLS applies); anyone else gets the same "not found" as a missing page.
 * Never selects anything password-related: the account server keeps those
 * out of the app's tables entirely.
 */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ now: number; selfId: string; users: AdminUserRow[] }> => {
    const { isActiveAdmin } = await import("./admin-session.server");
    if (!(await isActiveAdmin(context.supabase, context.userId))) throw notFound();

    const { data, error: listError } = await context.supabase.rpc("admin_user_overview");
    if (listError) {
      console.error("getAdminOverview: list failed");
      throw new Error("Impossible de charger les comptes pour le moment.");
    }
    const users: AdminUserRow[] = (data ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name ?? null,
      created_at: u.created_at,
      is_admin: u.is_admin,
      disabled_at: u.disabled_at ?? null,
      last_seen_at: u.last_seen_at ?? null,
      last_login_at: u.last_login_at ?? null,
      last_ip: u.last_ip ?? null,
    }));
    return { now: Date.now(), selfId: context.userId, users };
  });

/** Admin only: the 50 most recent sign-ins (IP, user agent, time) for one account. */
export const getLoginHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<LoginEventRow[]> => {
    const { isActiveAdmin } = await import("./admin-session.server");
    if (!(await isActiveAdmin(context.supabase, context.userId))) throw notFound();

    const { data: rows, error: listError } = await context.supabase
      .from("login_events")
      .select("id, ip, user_agent, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (listError) throw new Error("Historique indisponible pour le moment.");
    return (rows ?? []).map((r) => ({ id: r.id, ip: r.ip === null ? null : String(r.ip), user_agent: r.user_agent, created_at: r.created_at }));
  });
