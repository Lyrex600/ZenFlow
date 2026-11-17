import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

/** True only for an enabled account whose profile has is_admin = true. Runs with the caller's own rights (RLS applies). */
export async function isActiveAdmin(supabase: Client, uid: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin", { uid });
  if (error || data !== true) return false;
  const { data: profile } = await supabase.from("profiles").select("disabled_at").eq("id", uid).maybeSingle();
  return Boolean(profile) && !profile?.disabled_at;
}

/** Verifies a raw access token and returns the user id when it belongs to an active admin, otherwise null. */
export async function verifyAdminToken(token: string | null): Promise<string | null> {
  if (!token || token.split(".").length !== 3) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const uid = data?.claims?.sub;
  if (error || !uid) return null;
  return (await isActiveAdmin(supabase, uid)) ? uid : null;
}
