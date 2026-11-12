import { z } from "zod";

/** Non-sensitive display preferences, stored in plain text so the landing page can use them. */
export const PREFS_KEY = "zenflow.prefs.v1";

export const prefsSchema = z.object({
  theme: z.enum(["dark", "light"]),
  cursor: z.boolean(),
});
export type Prefs = z.infer<typeof prefsSchema>;
export const DEFAULT_PREFS: Prefs = { theme: "dark", cursor: true };

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const r = prefsSchema.partial().safeParse(JSON.parse(raw));
    if (!r.success) return DEFAULT_PREFS;
    return { theme: r.data.theme ?? DEFAULT_PREFS.theme, cursor: r.data.cursor ?? DEFAULT_PREFS.cursor };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: Prefs["theme"]): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

/** Runs before hydration to avoid a theme flash. Static string, no user data. */
export const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");if(p.theme==="light"){var r=document.documentElement;r.classList.remove("dark");r.classList.add("light");r.style.colorScheme="light"}}catch(e){}`;
