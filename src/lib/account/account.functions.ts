import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeIp } from "./ip";

/**
 * Records a login event (IP + user agent) for the caller, right after a fresh
 * sign-in. Runs server-side so the IP comes from the request, not the client.
 */
export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const iat = Number(context.claims.iat ?? 0);
    // Only tokens issued in the last 2 minutes count as a fresh sign-in.
    if (!iat || Date.now() / 1000 - iat > 120) return { recorded: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 10_000).toISOString();
    const { count } = await supabaseAdmin
      .from("login_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if ((count ?? 0) > 0) return { recorded: false };

    const ip = normalizeIp(getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? null);
    const userAgent = (getRequestHeader("user-agent") ?? "").slice(0, 400) || null;
    const { error } = await supabaseAdmin.from("login_events").insert({ user_id: context.userId, ip, user_agent: userAgent });
    if (error) {
      console.error("recordLogin: insert failed");
      return { recorded: false };
    }
    return { recorded: true };
  });

/** Admin only: disable (ban) or re-enable an account. Verified server-side. */
export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ userId: z.string().uuid(), disabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isActiveAdmin } = await import("./admin-session.server");
    if (!(await isActiveAdmin(context.supabase, context.userId))) throw notFound();
    if (data.userId === context.userId) throw new Error("Tu ne peux pas désactiver ton propre compte.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
    });
    if (banError) throw new Error("Action impossible pour le moment.");
    await supabaseAdmin
      .from("profiles")
      .update({ disabled_at: data.disabled ? new Date().toISOString() : null })
      .eq("id", data.userId);
    return { ok: true };
  });

/** Deletes the caller's own account (profile and login history cascade). */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Suppression impossible pour le moment.");
    return { ok: true };
  });
