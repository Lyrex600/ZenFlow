import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp } from "./AppContext";

export type PomodoroMode = "focus" | "break";

interface PomodoroState {
  mode: PomodoroMode;
  running: boolean;
  /** Epoch ms when the current phase ends (only while running). */
  endsAt: number | null;
  /** Remaining ms when paused. */
  remaining: number;
  total: number;
  cycle: number;
}

interface PomodoroValue extends PomodoroState {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setDurations: (focusMin: number, breakMin: number) => void;
}

const PomodoroContext = createContext<PomodoroValue | null>(null);

export const POMODORO_PRESETS = [
  { focus: 15, break: 5 },
  { focus: 25, break: 5 },
  { focus: 50, break: 10 },
  { focus: 90, break: 15 },
] as const;

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { data, setSettings, notify, logSession, markBusy } = useApp();
  const { focusMin, breakMin, autoStart } = data.settings;
  const durationOf = useCallback((m: PomodoroMode) => (m === "focus" ? focusMin : breakMin) * 60_000, [focusMin, breakMin]);

  const [state, setState] = useState<PomodoroState>(() => ({
    mode: "focus",
    running: false,
    endsAt: null,
    remaining: focusMin * 60_000,
    total: focusMin * 60_000,
    cycle: 1,
  }));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Durations changed while idle at the start of a phase: adopt the new length.
  useEffect(() => {
    setState((s) => {
      const total = durationOf(s.mode);
      if (s.running || s.remaining !== s.total || s.total === total) return s;
      return { ...s, total, remaining: total };
    });
  }, [durationOf]);

  useEffect(() => {
    markBusy("pomodoro", state.running);
    return () => markBusy("pomodoro", false);
  }, [state.running, markBusy]);

  const complete = useCallback(() => {
    const s = stateRef.current;
    logSession(s.mode, s.total / 60_000);
    const next: PomodoroMode = s.mode === "focus" ? "break" : "focus";
    notify(s.mode === "focus" ? "Session de focus terminée" : "Pause terminée", {
      description: s.mode === "focus" ? "Bravo. Lève les yeux, respire, étire-toi." : "Prêt pour un nouveau cycle ?",
      system: true,
    });
    const total = durationOf(next);
    setState({
      mode: next,
      running: autoStart,
      endsAt: autoStart ? Date.now() + total : null,
      remaining: total,
      total,
      cycle: next === "focus" ? s.cycle + 1 : s.cycle,
    });
  }, [autoStart, durationOf, logSession, notify]);

  // Schedule completion for the current phase.
  useEffect(() => {
    if (!state.running || state.endsAt === null) return;
    const check = () => {
      if (stateRef.current.endsAt !== null && Date.now() >= stateRef.current.endsAt) complete();
    };
    const t = setTimeout(check, Math.max(0, state.endsAt - Date.now()) + 30);
    const iv = setInterval(check, 1000);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [state.running, state.endsAt, complete]);

  const start = useCallback(() => setState((s) => (s.running ? s : { ...s, running: true, endsAt: Date.now() + s.remaining })), []);
  const pause = useCallback(
    () => setState((s) => (s.running && s.endsAt ? { ...s, running: false, remaining: Math.max(0, s.endsAt - Date.now()), endsAt: null } : s)),
    [],
  );
  const reset = useCallback(() => setState((s) => ({ ...s, running: false, endsAt: null, remaining: s.total })), []);
  const skip = useCallback(() => {
    setState((s) => {
      const mode: PomodoroMode = s.mode === "focus" ? "break" : "focus";
      const total = durationOf(mode);
      return { mode, running: s.running, endsAt: s.running ? Date.now() + total : null, remaining: total, total, cycle: mode === "focus" ? s.cycle + 1 : s.cycle };
    });
  }, [durationOf]);
  const setDurations = useCallback(
    (f: number, b: number) => {
      setSettings({ focusMin: f, breakMin: b });
      setState({ mode: "focus", running: false, endsAt: null, remaining: f * 60_000, total: f * 60_000, cycle: 1 });
    },
    [setSettings],
  );

  const value = useMemo<PomodoroValue>(() => ({ ...state, start, pause, reset, skip, setDurations }), [state, start, pause, reset, skip, setDurations]);
  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro(): PomodoroValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return ctx;
}

/** Remaining ms, ticking 4×/s while running. */
export function usePomodoroRemaining(): number {
  const { running, endsAt, remaining } = usePomodoro();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [running]);
  return running && endsAt ? Math.max(0, endsAt - now) : remaining;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
