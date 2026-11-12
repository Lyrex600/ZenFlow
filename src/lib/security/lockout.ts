import { z } from "zod";

/**
 * Progressive lockout after failed unlock attempts. Persisted in localStorage
 * so a reload does not reset it. This slows down guessing through the UI; the
 * real protection against offline guessing is the PBKDF2 cost.
 */
export const FREE_ATTEMPTS = 3;
export const BASE_DELAY_MS = 30_000;
export const MAX_DELAY_MS = 60 * 60 * 1000;
const STORAGE_KEY = "zenflow.lockout.v1";

export interface LockoutState {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number | null;
}

export const EMPTY_LOCKOUT: LockoutState = { failures: 0, lockedUntil: 0, lastFailureAt: null };

const lockoutSchema = z.object({
  failures: z.number().int().min(0).max(10_000),
  lockedUntil: z.number().min(0),
  lastFailureAt: z.number().nullable(),
});

/** Delay imposed after the given number of consecutive failures. */
export function lockoutDelayMs(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(BASE_DELAY_MS * 2 ** (failures - FREE_ATTEMPTS), MAX_DELAY_MS);
}

export function registerFailure(state: LockoutState, now: number): LockoutState {
  const failures = state.failures + 1;
  const delay = lockoutDelayMs(failures);
  return { failures, lockedUntil: delay > 0 ? now + delay : 0, lastFailureAt: now };
}

export function remainingLockMs(state: LockoutState, now: number): number {
  return Math.max(0, state.lockedUntil - now);
}

export function readLockout(): LockoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_LOCKOUT;
    const parsed = lockoutSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY_LOCKOUT;
  } catch {
    return EMPTY_LOCKOUT;
  }
}

export function writeLockout(state: LockoutState): void {
  try {
    if (state.failures === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}
