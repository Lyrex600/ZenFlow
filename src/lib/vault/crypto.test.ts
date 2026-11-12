// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deriveKey, IV_BYTES, openJson, parseVaultFile, PBKDF2_ITERATIONS, randomSalt, sealJson, SALT_BYTES } from "./crypto";

const FAST = 1_000; // low iteration count only to keep the test quick

describe("vault crypto", () => {
  it("uses at least 600 000 PBKDF2 iterations, 16-byte salt, 12-byte IV", () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    expect(SALT_BYTES).toBe(16);
    expect(IV_BYTES).toBe(12);
  });

  it("round-trips with the right passphrase and fails with a wrong one", async () => {
    const salt = randomSalt();
    const key = await deriveKey("lune-violette-marche-42", salt, FAST);
    expect(key.extractable).toBe(false);
    const file = await sealJson(key, salt, FAST, { hello: "monde" });
    expect(file.ct).not.toContain("monde");
    await expect(openJson(key, file)).resolves.toEqual({ hello: "monde" });
    const wrong = await deriveKey("mauvaise-phrase-secrete", salt, FAST);
    await expect(openJson(wrong, file)).rejects.toBeTruthy();
  });

  it("uses a fresh IV on every write", async () => {
    const salt = randomSalt();
    const key = await deriveKey("lune-violette-marche-42", salt, FAST);
    const a = await sealJson(key, salt, FAST, { x: 1 });
    const b = await sealJson(key, salt, FAST, { x: 1 });
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
  });

  it("rejects vault files with a weak iteration count", async () => {
    const salt = randomSalt();
    const key = await deriveKey("lune-violette-marche-42", salt, FAST);
    const weak = await sealJson(key, salt, FAST, {});
    expect(parseVaultFile(weak)).toBeNull();
    expect(parseVaultFile({ ...weak, kdf: { ...weak.kdf, iterations: PBKDF2_ITERATIONS } })).not.toBeNull();
  });
});
