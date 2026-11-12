import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AmbientEngine, type SoundId } from "@/lib/audio/ambient";
import { playChime } from "@/lib/audio/chime";
import { dayKey } from "@/lib/stats";
import type { Session, Settings, VaultData } from "@/lib/vault/schema";
import { useVault, useVaultData } from "@/lib/vault/VaultProvider";

type NotifyKind = "success" | "info" | "warning";

interface AppValue {
  data: VaultData;
  update: (fn: (d: VaultData) => VaultData) => void;
  setSettings: (patch: Partial<Settings>) => void;
  notify: (title: string, opts?: { description?: string; kind?: NotifyKind; chime?: boolean; system?: boolean }) => void;
  logSession: (kind: Session["kind"], minutes: number) => void;
  markBusy: (id: string, busy: boolean) => void;
  ambient: {
    active: SoundId[];
    levels: Record<SoundId, number>;
    toggle: (id: SoundId) => void;
    setLevel: (id: SoundId, level: number) => void;
    stopAll: () => void;
  };
}

const AppContext = createContext<AppValue | null>(null);

const DEFAULT_LEVELS: Record<SoundId, number> = {
  pluie: 0.6, ocean: 0.6, foret: 0.6, feu: 0.6, vent: 0.6, ruisseau: 0.6, orage: 0.6, bruit: 0.4,
};

function systemNotify(title: string, body?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { ...(body ? { body } : {}), silent: true, tag: "zenflow" });
  } catch {
    /* some browsers require a service worker for notifications */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { data, update } = useVaultData();
  const { setBusy } = useVault();
  const settingsRef = useRef(data.settings);
  settingsRef.current = data.settings;

  const setSettings = useCallback((patch: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })), [update]);

  const notify = useCallback<AppValue["notify"]>((title, opts = {}) => {
    const s = settingsRef.current;
    if (s.chime && opts.chime !== false) playChime(s.volume);
    if (s.toasts) {
      const fn = opts.kind === "warning" ? toast.warning : opts.kind === "info" ? toast.info : toast.success;
      fn(title, opts.description ? { description: opts.description } : undefined);
    }
    if (opts.system && document.hidden) systemNotify(title, opts.description);
  }, []);

  const logSession = useCallback(
    (kind: Session["kind"], minutes: number) => {
      if (minutes <= 0) return;
      update((d) => ({ ...d, sessions: [...d.sessions, { t: Date.now(), kind, minutes: Math.round(minutes * 10) / 10 }].slice(-20_000) }));
    },
    [update],
  );

  // Busy registry: auto-lock on inactivity pauses while a session runs.
  const busy = useRef(new Set<string>());
  const markBusy = useCallback(
    (id: string, on: boolean) => {
      if (on) busy.current.add(id);
      else busy.current.delete(id);
      setBusy(busy.current.size > 0);
    },
    [setBusy],
  );

  // Ambient engine lives as long as the vault is unlocked.
  const engine = useRef<AmbientEngine | null>(null);
  const [active, setActive] = useState<SoundId[]>([]);
  const [levels, setLevels] = useState<Record<SoundId, number>>(DEFAULT_LEVELS);
  const getEngine = () => {
    if (!engine.current) {
      engine.current = new AmbientEngine();
      engine.current.setMaster(settingsRef.current.volume);
      (Object.keys(DEFAULT_LEVELS) as SoundId[]).forEach((id) => engine.current?.setLevel(id, levels[id]));
    }
    return engine.current;
  };

  useEffect(() => {
    engine.current?.setMaster(data.settings.volume);
  }, [data.settings.volume]);

  useEffect(() => () => engine.current?.stopAll(), []);

  const ambient = useMemo<AppValue["ambient"]>(
    () => ({
      active,
      levels,
      toggle: (id) => {
        const e = getEngine();
        if (e.isPlaying(id)) {
          e.stop(id);
          setActive((a) => a.filter((x) => x !== id));
        } else if (e.start(id)) {
          setActive((a) => [...a, id]);
        } else {
          toast.error("Ton navigateur ne prend pas en charge la Web Audio API.");
        }
      },
      setLevel: (id, level) => {
        getEngine().setLevel(id, level);
        setLevels((l) => ({ ...l, [id]: level }));
      },
      stopAll: () => {
        engine.current?.stopAll();
        setActive([]);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, levels],
  );

  // Alarm runner: checks every 10 s while unlocked.
  const fired = useRef(new Set<string>());
  const alarmsRef = useRef(data.alarms);
  alarmsRef.current = data.alarms;
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = dayKey(now.getTime());
      for (const a of alarmsRef.current) {
        const key = `${a.id}@${today}@${a.time}`;
        if (!a.enabled || a.time !== hhmm || fired.current.has(key)) continue;
        fired.current.add(key);
        playChime(Math.max(0.5, settingsRef.current.volume));
        toast.info(`⏰ ${a.time} — ${a.label}`, { duration: 15_000 });
        systemNotify(`ZenFlow · ${a.time}`, a.label);
      }
    };
    check();
    const iv = setInterval(check, 10_000);
    return () => clearInterval(iv);
  }, []);

  const value = useMemo<AppValue>(
    () => ({ data, update, setSettings, notify, logSession, markBusy, ambient }),
    [data, update, setSettings, notify, logSession, markBusy, ambient],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
