import { describe, expect, it } from "vitest";
import { EMPTY_LOCKOUT, lockoutDelayMs, registerFailure, remainingLockMs } from "./lockout";

describe("progressive lockout", () => {
  it("allows 2 free failures, then doubles from 30 s", () => {
    expect(lockoutDelayMs(1)).toBe(0);
    expect(lockoutDelayMs(2)).toBe(0);
    expect(lockoutDelayMs(3)).toBe(30_000);
    expect(lockoutDelayMs(4)).toBe(60_000);
    expect(lockoutDelayMs(5)).toBe(120_000);
  });

  it("caps the delay at one hour", () => {
    expect(lockoutDelayMs(30)).toBe(3_600_000);
  });

  it("locks until now + delay after the third failure", () => {
    let s = EMPTY_LOCKOUT;
    s = registerFailure(s, 1000);
    s = registerFailure(s, 2000);
    expect(remainingLockMs(s, 2000)).toBe(0);
    s = registerFailure(s, 3000);
    expect(s.lockedUntil).toBe(33_000);
    expect(remainingLockMs(s, 13_000)).toBe(20_000);
  });
});
