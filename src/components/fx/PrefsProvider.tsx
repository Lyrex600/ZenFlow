import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyTheme, DEFAULT_PREFS, readPrefs, writePrefs, type Prefs } from "@/lib/prefs";

interface PrefsValue {
  prefs: Prefs;
  setTheme: (t: Prefs["theme"]) => void;
  toggleTheme: () => void;
  setCursor: (on: boolean) => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const p = readPrefs();
    setPrefs(p);
    applyTheme(p.theme);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      if (patch.theme) applyTheme(next.theme);
      return next;
    });
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({
      prefs,
      setTheme: (theme) => update({ theme }),
      toggleTheme: () => update({ theme: prefs.theme === "dark" ? "light" : "dark" }),
      setCursor: (cursor) => update({ cursor }),
    }),
    [prefs, update],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
