import { describe, expect, it } from "vitest";
import { evaluatePassword, isCommonPassword, MIN_PASSWORD_LENGTH } from "./password";

describe("password policy", () => {
  it("requires at least 10 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(evaluatePassword("Xk#9pL!2q").ok).toBe(false); // 9 chars
    expect(evaluatePassword("Xk#9pL!2qZ").ok).toBe(true); // 10 chars
  });

  it("blocks very common passwords and their variants", () => {
    expect(isCommonPassword("azerty1234")).toBe(true);
    expect(isCommonPassword("Password123!")).toBe(true);
    expect(isCommonPassword("P@ssw0rd!")).toBe(true);
    expect(isCommonPassword("1234567890")).toBe(true);
    expect(evaluatePassword("motdepasse2024").ok).toBe(false);
  });

  it("accepts a long multi-word passphrase", () => {
    const r = evaluatePassword("lune-violette-marche-42");
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("rejects straight sequences even when long enough", () => {
    expect(evaluatePassword("abcdefghij").ok).toBe(false);
  });
});
