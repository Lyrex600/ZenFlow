import { z } from "zod";

/**
 * Local-first vault crypto (Web Crypto only).
 * - Key: PBKDF2-SHA256, >= 600 000 iterations, random 16-byte salt.
 * - Cipher: AES-256-GCM, random 12-byte IV for every write.
 * The passphrase and the derived key are never stored, logged or sent anywhere.
 * The derived CryptoKey is created non-extractable.
 */
export const PBKDF2_ITERATIONS = 600_000;
export const MAX_ITERATIONS = 5_000_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
const AAD = new TextEncoder().encode("zenflow-vault-v1");
const MAX_CIPHERTEXT_CHARS = 8_000_000;

export function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const b64String = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);

export const vaultFileSchema = z.object({
  format: z.literal("zenflow-vault"),
  v: z.literal(1),
  kdf: z.object({
    name: z.literal("PBKDF2-SHA256"),
    iterations: z.number().int().min(PBKDF2_ITERATIONS).max(MAX_ITERATIONS),
    salt: b64String.refine((s) => fromB64(s).length === SALT_BYTES, "salt"),
  }),
  cipher: z.object({
    name: z.literal("AES-256-GCM"),
    iv: b64String.refine((s) => fromB64(s).length === IV_BYTES, "iv"),
  }),
  ct: b64String.max(MAX_CIPHERTEXT_CHARS),
  updatedAt: z.number(),
});

export type VaultFile = z.infer<typeof vaultFileSchema>;

export function parseVaultFile(input: unknown): VaultFile | null {
  const r = vaultFileSchema.safeParse(input);
  return r.success ? r.data : null;
}

export function randomSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(SALT_BYTES)));
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase.normalize("NFC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt JSON data with a fresh random IV. */
export async function sealJson(
  key: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  data: unknown,
): Promise<VaultFile> {
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_BYTES)));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, plaintext);
  return {
    format: "zenflow-vault",
    v: 1,
    kdf: { name: "PBKDF2-SHA256", iterations, salt: toB64(salt) },
    cipher: { name: "AES-256-GCM", iv: toB64(iv) },
    ct: toB64(ct),
    updatedAt: Date.now(),
  };
}

/** Decrypt; throws when the key is wrong or the file was tampered with. */
export async function openJson(key: CryptoKey, file: Pick<VaultFile, "cipher" | "ct">): Promise<unknown> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(file.cipher.iv), additionalData: AAD },
    key,
    fromB64(file.ct),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
