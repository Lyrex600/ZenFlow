import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deriveKey, fromB64, openJson, parseVaultFile, PBKDF2_ITERATIONS, randomSalt, sealJson } from "./crypto";
import { createVaultData, nameSchema, vaultDataSchema, type VaultData } from "./schema";
import { clearVaultFile, downloadFile, hasVault, readVaultFile, writeVaultFile } from "./storage";
import { EMPTY_LOCKOUT, readLockout, registerFailure, remainingLockMs, writeLockout, type LockoutState } from "@/lib/security/lockout";
import { dayKey } from "@/lib/stats";

export type VaultStatus = "loading" | "empty" | "locked" | "unlocked";
export type LockReason = "manual" | "idle" | "hidden" | "import";
export type UnlockResult = { ok: true } | { ok: false; retryAt: number | null };

interface VaultValue {
  status: VaultStatus;
  data: VaultData | null;
  previousUnlock: number | null;
  lastWrite: number | null;
  lockout: LockoutState;
  lockReason: LockReason | null;
  keyExtractable: boolean | null;
  create: (name: string, passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<UnlockResult>;
  lock: (reason?: LockReason) => Promise<void>;
  update: (fn: (d: VaultData) => VaultData) => void;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Re-encrypt the vault under a new passphrase (fresh salt). */
  rekey: (passphrase: string) => Promise<void>;
  destroy: () => void;
  setBusy: (busy: boolean) => void;
}

const VaultContext = createContext<VaultValue | null>(null);
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

/**
 * Holds the unlocked vault session. The derived key lives only in a ref (memory)
 * and is dropped on lock; the passphrase is never kept after derivation.
 */
export function VaultProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [data, setData] = useState<VaultData | null>(null);
  const [lockout, setLockout] = useState<LockoutState>(EMPTY_LOCKOUT);
  const [previousUnlock, setPreviousUnlock] = useState<number | null>(null);
  const [lastWrite, setLastWrite] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState<LockReason | null>(null);
  const [keyExtractable, setKeyExtractable] = useState<boolean | null>(null);

  const keyRef = useRef<CryptoKey | null>(null);
  const saltRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const iterRef = useRef(PBKDF2_ITERATIONS);
  const dataRef = useRef<VaultData | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const busyRef = useRef(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    setLockout(readLockout());
    setStatus(hasVault(userId) ? "locked" : "empty");
  }, [userId]);

  const persist = useCallback((d: VaultData) => {
    const key = keyRef.current;
    const salt = saltRef.current;
    if (!key || !salt) return chain.current;
    const iterations = iterRef.current;
    chain.current = chain.current
      .then(async () => {
        const file = await sealJson(key, salt, iterations, d);
        writeVaultFile(userId, file);
        setLastWrite(file.updatedAt);
      })
      .catch(() => {
        console.error("ZenFlow: écriture du coffre impossible (stockage plein ou indisponible).");
      });
    return chain.current;
  }, [userId]);

  // Debounced encrypted write after every change.
  useEffect(() => {
    dataRef.current = data;
    if (status !== "unlocked" || !data) return;
    const t = setTimeout(() => void persist(data), 300);
    return () => clearTimeout(t);
  }, [data, status, persist]);

  const wipe = useCallback(() => {
    keyRef.current = null;
    saltRef.current = null;
    dataRef.current = null;
    busyRef.current = false;
    setKeyExtractable(null);
    setData(null);
  }, []);

  const lock = useCallback(
    async (reason: LockReason = "manual") => {
      if (!keyRef.current) return;
      const d = dataRef.current;
      if (d) await persist(d);
      await chain.current;
      wipe();
      setLockReason(reason);
      setStatus("locked");
    },
    [persist, wipe],
  );

  const start = useCallback((key: CryptoKey, salt: Uint8Array<ArrayBuffer>, iterations: number, d: VaultData) => {
    keyRef.current = key;
    saltRef.current = salt;
    iterRef.current = iterations;
    dataRef.current = d;
    lastActivity.current = Date.now();
    setKeyExtractable(key.extractable);
    setData(d);
    setLockReason(null);
    setStatus("unlocked");
  }, []);

  const create = useCallback(
    async (name: string, passphrase: string) => {
      const parsedName = nameSchema.safeParse(name);
      const cleanName = parsedName.success ? parsedName.data : "Ami·e";
      const salt = randomSalt();
      const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
      const now = Date.now();
      const d = { ...createVaultData(cleanName, now), lastUnlock: now };
      const file = await sealJson(key, salt, PBKDF2_ITERATIONS, d);
      writeVaultFile(userId, file);
      setLastWrite(file.updatedAt);
      writeLockout(EMPTY_LOCKOUT);
      setLockout(EMPTY_LOCKOUT);
      setPreviousUnlock(null);
      start(key, salt, PBKDF2_ITERATIONS, d);
    },
    [start, userId],
  );

  const unlock = useCallback(
    async (passphrase: string): Promise<UnlockResult> => {
      const current = readLockout();
      if (remainingLockMs(current, Date.now()) > 0) {
        setLockout(current);
        return { ok: false, retryAt: current.lockedUntil };
      }
      try {
        const file = readVaultFile(userId);
        if (!file) throw new Error("invalid");
        const salt = fromB64(file.kdf.salt);
        const key = await deriveKey(passphrase, salt, file.kdf.iterations);
        const parsed = vaultDataSchema.parse(await openJson(key, file));
        writeLockout(EMPTY_LOCKOUT);
        setLockout(EMPTY_LOCKOUT);
        setPreviousUnlock(parsed.lastUnlock);
        setLastWrite(file.updatedAt);
        start(key, salt, file.kdf.iterations, { ...parsed, lastUnlock: Date.now() });
        return { ok: true };
      } catch {
        const next = registerFailure(readLockout(), Date.now());
        writeLockout(next);
        setLockout(next);
        return { ok: false, retryAt: next.lockedUntil || null };
      }
    },
    [start, userId],
  );

  const update = useCallback((fn: (d: VaultData) => VaultData) => {
    setData((prev) => (prev ? fn(prev) : prev));
  }, []);

  const exportBackup = useCallback(async () => {
    if (dataRef.current) await persist(dataRef.current);
    await chain.current;
    const file = readVaultFile(userId);
    if (!file) throw new Error("Aucun coffre");
    downloadFile(`zenflow-sauvegarde-${dayKey(Date.now())}.zenflow`, JSON.stringify(file), "application/json");
  }, [persist, userId]);

  const rekey = useCallback(
    async (passphrase: string) => {
      const d = dataRef.current;
      if (!d || !keyRef.current) throw new Error("Coffre verrouillé");
      await chain.current;
      const salt = randomSalt();
      const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
      const file = await sealJson(key, salt, PBKDF2_ITERATIONS, d);
      writeVaultFile(userId, file);
      keyRef.current = key;
      saltRef.current = salt;
      iterRef.current = PBKDF2_ITERATIONS;
      setLastWrite(file.updatedAt);
    },
    [userId],
  );

  const importBackup = useCallback(
    async (f: File): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (f.size > MAX_IMPORT_BYTES) return { ok: false, error: "Fichier trop volumineux." };
      let parsed: unknown;
      try {
        parsed = JSON.parse(await f.text());
      } catch {
        return { ok: false, error: "Ce fichier n'est pas une sauvegarde ZenFlow valide." };
      }
      const file = parseVaultFile(parsed);
      if (!file) return { ok: false, error: "Ce fichier n'est pas une sauvegarde ZenFlow valide." };
      writeVaultFile(userId, file);
      wipe();
      setLockReason("import");
      setStatus("locked");
      return { ok: true };
    },
    [wipe, userId],
  );

  const destroy = useCallback(() => {
    clearVaultFile(userId);
    writeLockout(EMPTY_LOCKOUT);
    setLockout(EMPTY_LOCKOUT);
    wipe();
    chain.current = Promise.resolve();
    setLastWrite(null);
    setPreviousUnlock(null);
    setLockReason(null);
    setStatus("empty");
  }, [wipe, userId]);

  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy;
    lastActivity.current = Date.now();
  }, []);

  // Auto-lock on inactivity (paused while a session runs) and optionally when the tab is hidden.
  useEffect(() => {
    if (status !== "unlocked") return;
    const mark = () => {
      lastActivity.current = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const iv = setInterval(() => {
      const d = dataRef.current;
      if (!d) return;
      if (busyRef.current) {
        lastActivity.current = Date.now();
        return;
      }
      if (Date.now() - lastActivity.current > d.settings.autoLockMin * 60_000) void lock("idle");
    }, 5000);
    const onVisibility = () => {
      if (document.hidden && dataRef.current?.settings.lockOnHidden) void lock("hidden");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, lock]);

  const value = useMemo<VaultValue>(
    () => ({
      status,
      data,
      previousUnlock,
      lastWrite,
      lockout,
      lockReason,
      keyExtractable,
      create,
      unlock,
      lock,
      update,
      exportBackup,
      importBackup,
      rekey,
      destroy,
      setBusy,
    }),
    [status, data, previousUnlock, lastWrite, lockout, lockReason, keyExtractable, create, unlock, lock, update, exportBackup, importBackup, rekey, destroy, setBusy],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside VaultProvider");
  return ctx;
}

/** Only for components rendered while unlocked. */
export function useVaultData(): { data: VaultData; update: VaultValue["update"] } {
  const { data, update } = useVault();
  if (!data) throw new Error("Vault is locked");
  return { data, update };
}
