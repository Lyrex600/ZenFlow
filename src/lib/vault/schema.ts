import { z } from "zod";

/** Safe single-line text: no control characters, no angle brackets. */
export const safeText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\p{Cc}\p{Cf}]/gu, "").trim())
    .pipe(
      z
        .string()
        .min(1, "Ce champ est requis")
        .max(max, `${max} caractères maximum`)
        .refine((s) => !/[<>]/.test(s), "Les caractères < et > ne sont pas autorisés"),
    );

export const nameSchema = safeText(40);
export const alarmLabelSchema = safeText(60);
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide");

export const AUTO_LOCK_OPTIONS = [1, 5, 10, 15, 30, 60] as const;

export const settingsSchema = z.object({
  chime: z.boolean(),
  toasts: z.boolean(),
  autoStart: z.boolean(),
  quotes: z.boolean(),
  autoLockMin: z.number().int().min(1).max(60),
  lockOnHidden: z.boolean(),
  focusMin: z.number().int().min(1).max(180),
  breakMin: z.number().int().min(1).max(60),
  breathPattern: z.enum(["calme", "478", "box", "55"]),
  volume: z.number().min(0).max(1),
});

export const sessionSchema = z.object({
  t: z.number(),
  kind: z.enum(["focus", "break", "pause"]),
  minutes: z.number().min(0).max(600),
});

export const alarmSchema = z.object({
  id: z.string().max(64),
  time: timeSchema,
  label: z.string().max(60),
  enabled: z.boolean(),
});

export const vaultDataSchema = z.object({
  v: z.literal(1),
  profile: z.object({ name: z.string().max(40), createdAt: z.number() }),
  settings: settingsSchema,
  alarms: z.array(alarmSchema).max(100),
  sessions: z.array(sessionSchema).max(20_000),
  lastUnlock: z.number().nullable(),
});

export type VaultData = z.infer<typeof vaultDataSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Alarm = z.infer<typeof alarmSchema>;

export const DEFAULT_SETTINGS: Settings = {
  chime: true,
  toasts: true,
  autoStart: false,
  quotes: true,
  autoLockMin: 10,
  lockOnHidden: false,
  focusMin: 25,
  breakMin: 5,
  breathPattern: "calme",
  volume: 0.7,
};

export function createVaultData(name: string, now: number): VaultData {
  return {
    v: 1,
    profile: { name, createdAt: now },
    settings: { ...DEFAULT_SETTINGS },
    alarms: [],
    sessions: [],
    lastUnlock: null,
  };
}
