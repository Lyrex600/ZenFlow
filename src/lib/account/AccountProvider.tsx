import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { EMPTY_LOCKOUT, readLockout, registerFailure, remainingLockMs, writeLockout, type LockoutState } from "@/lib/security/lockout";
import { deleteMyAccount, recordLogin } from "./account.functions";
import { clearAdminCookie, syncAdminCookie } from "./admin-session.functions";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Result = { ok: true } | { ok: false; error: string };

interface AccountValue {
  status: "loading" | "signedOut" | "signedIn";
  user: User | null;
  profile: Profile | null;
  lockout: LockoutState;
  notice: string | null;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (name: string, email: string, password: string) => Promise<{ ok: true; needsConfirmation: boolean } | { ok: false; error: string }>;
  reauth: (password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  /** One-shot: the password typed at sign-in, used once to open the local vault, then dropped. */
  takePendingSecret: () => string | null;
  updateDisplayName: (name: string) => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<Result>;
  deleteAccount: () => Promise<boolean>;
}

const AccountContext = createContext<AccountValue | null>(null);
const GENERIC_LOGIN_ERROR = "E-mail ou mot de passe incorrect.";
const HEARTBEAT_MS = 25_000;
const IDLE_MS = 60_000;

function mapAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("not confirmed")) return "Confirme d'abord ton adresse e-mail grâce au lien reçu.";
  if (m.includes("banned")) return "Ce compte est désactivé.";
  if (m.includes("rate") || m.includes("too many")) return "Trop de tentatives. Réessaie dans quelques minutes.";
  return GENERIC_LOGIN_ERROR;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lockout, setLockout] = useState<LockoutState>(EMPTY_LOCKOUT);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingSecret = useRef<string | null>(null);
  const user = session?.user ?? null;

  useEffect(() => {
    setLockout(readLockout());
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") void clearAdminCookie().catch(() => undefined);
    });
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data?.disabled_at) {
      pendingSecret.current = null;
      setNotice("Ce compte a été désactivé.");
      await supabase.auth.signOut();
      return;
    }
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void loadProfile(user.id);
  }, [user, loadProfile]);

  // Admins only: keep the HttpOnly admin-gate cookie in step with the current access token,
  // so a full page load of the admin area can be verified on the server.
  const isAdmin = profile?.is_admin === true;
  const accessToken = session?.access_token;
  useEffect(() => {
    if (isAdmin && accessToken) void syncAdminCookie().catch(() => undefined);
  }, [isAdmin, accessToken]);

  // Online status heartbeat (visible to admins only): sent while the tab is visible,
  // focused and used in the last minute. Admins treat >60 s without a beat as offline.
  useEffect(() => {
    if (!user) return;
    let lastActivity = Date.now();
    const mark = () => {
      lastActivity = Date.now();
    };
    const beat = () => {
      if (document.hidden || !document.hasFocus() || Date.now() - lastActivity > IDLE_MS) return;
      void supabase.rpc("touch_presence");
      void loadProfile(user.id);
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const onFocus = () => {
      mark();
      beat();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    beat();
    const iv = setInterval(beat, HEARTBEAT_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(iv);
    };
  }, [user, loadProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<Result> => {
    const current = readLockout();
    if (remainingLockMs(current, Date.now()) > 0) {
      setLockout(current);
      return { ok: false, error: "Trop de tentatives." };
    }
    // Set before the call: the session event can render the vault gate before the promise resolves.
    pendingSecret.current = password;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      pendingSecret.current = null;
      const next = registerFailure(readLockout(), Date.now());
      writeLockout(next);
      setLockout(next);
      return { ok: false, error: mapAuthError(error.message) };
    }
    writeLockout(EMPTY_LOCKOUT);
    setLockout(EMPTY_LOCKOUT);
    setNotice(null);
    void recordLogin().catch(() => undefined);
    return { ok: true };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/app`, data: { display_name: name } },
    });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("pwned") || m.includes("leaked") || m.includes("weak")) {
        return { ok: false as const, error: "Ce mot de passe apparaît dans des fuites de données connues. Choisis-en un autre." };
      }
      return { ok: false as const, error: "Inscription impossible. Vérifie ton e-mail et réessaie." };
    }
    if (data.session) {
      pendingSecret.current = password;
      void recordLogin().catch(() => undefined);
    }
    return { ok: true as const, needsConfirmation: !data.session };
  }, []);

  const reauth = useCallback(
    async (password: string): Promise<Result> => {
      if (!user?.email) return { ok: false, error: GENERIC_LOGIN_ERROR };
      return signIn(user.email, password);
    },
    [user, signIn],
  );

  const signOut = useCallback(async () => {
    pendingSecret.current = null;
    await supabase.auth.signOut();
  }, []);

  const takePendingSecret = useCallback(() => {
    const s = pendingSecret.current;
    pendingSecret.current = null;
    return s;
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!user) return false;
      const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
      if (!error) setProfile((p) => (p ? { ...p, display_name: name } : p));
      return !error;
    },
    [user],
  );

  const changePassword = useCallback(async (current: string, next: string): Promise<Result> => {
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("pwned") || m.includes("leaked")) return { ok: false, error: "Ce mot de passe apparaît dans des fuites connues." };
      if (m.includes("same")) return { ok: false, error: "Le nouveau mot de passe doit être différent." };
      return { ok: false, error: "Mot de passe actuel incorrect ou changement refusé." };
    }
    return { ok: true };
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await deleteMyAccount();
      pendingSecret.current = null;
      await supabase.auth.signOut();
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AccountValue>(
    () => ({
      status: session === undefined ? "loading" : session ? "signedIn" : "signedOut",
      user,
      profile,
      lockout,
      notice,
      signIn,
      signUp,
      reauth,
      signOut,
      takePendingSecret,
      updateDisplayName,
      changePassword,
      deleteAccount,
    }),
    [session, user, profile, lockout, notice, signIn, signUp, reauth, signOut, takePendingSecret, updateDisplayName, changePassword, deleteAccount],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}
