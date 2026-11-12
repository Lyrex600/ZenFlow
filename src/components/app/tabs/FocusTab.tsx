import { AnimatePresence } from "framer-motion";
import { Maximize2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayKey } from "@/lib/stats";
import { useApp } from "../AppContext";
import { Chip, Panel, TabHeader } from "../Panel";
import { formatClock, POMODORO_PRESETS, usePomodoro, usePomodoroRemaining } from "../PomodoroContext";
import { ProgressRing } from "../ProgressRing";
import { FocusMode } from "./FocusMode";

const customSchema = z.object({
  focus: z.coerce.number().int().min(1).max(180),
  brk: z.coerce.number().int().min(1).max(60),
});

export function FocusTab() {
  const { data } = useApp();
  const pomo = usePomodoro();
  const remaining = usePomodoroRemaining();
  const [fullscreen, setFullscreen] = useState(false);
  const [focusInput, setFocusInput] = useState(String(data.settings.focusMin));
  const [breakInput, setBreakInput] = useState(String(data.settings.breakMin));
  const [error, setError] = useState<string | null>(null);

  const today = dayKey(Date.now());
  const todayFocus = useMemo(() => data.sessions.filter((s) => s.kind === "focus" && dayKey(s.t) === today), [data.sessions, today]);

  const applyCustom = (e: FormEvent) => {
    e.preventDefault();
    const r = customSchema.safeParse({ focus: focusInput, brk: breakInput });
    if (!r.success) {
      setError("Focus : 1 à 180 min · Pause : 1 à 60 min.");
      return;
    }
    setError(null);
    pomo.setDurations(r.data.focus, r.data.brk);
  };

  const enterFocus = () => {
    if (!pomo.running) pomo.start();
    setFullscreen(true);
  };

  return (
    <div>
      <TabHeader title="Focus Pomodoro" subtitle="Alterne concentration profonde et vraies pauses. Le mode plein écran coupe tout le reste." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel className="flex flex-col items-center py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{pomo.mode === "focus" ? `Focus · cycle ${pomo.cycle}` : "Pause"}</p>
          <ProgressRing progress={1 - remaining / pomo.total} size={300} stroke={5} className="mt-6 max-w-full" label="Progression de la session">
            <span className="font-display text-6xl font-semibold tabular-nums sm:text-7xl">{formatClock(remaining)}</span>
          </ProgressRing>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" onClick={pomo.running ? pomo.pause : pomo.start}>
              {pomo.running ? <Pause /> : <Play />} {pomo.running ? "Pause" : remaining < pomo.total ? "Reprendre" : "Démarrer"}
            </Button>
            <Button variant="glass" size="lg" onClick={pomo.reset} disabled={remaining === pomo.total && !pomo.running}>
              <RotateCcw /> Réinitialiser
            </Button>
            <Button variant="glass" size="lg" onClick={pomo.skip}>
              <SkipForward /> Passer
            </Button>
          </div>
          <Button variant="link" className="mt-4" onClick={enterFocus}>
            <Maximize2 /> Mode focus plein écran
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">
            Aujourd'hui : {todayFocus.length} session{todayFocus.length > 1 ? "s" : ""} · {Math.round(todayFocus.reduce((a, s) => a + s.minutes, 0))} min
          </p>
        </Panel>

        <div className="space-y-6">
          <Panel title="Préréglages" description="Focus / pause, en minutes.">
            <div className="flex flex-wrap gap-2">
              {POMODORO_PRESETS.map((p) => (
                <Chip
                  key={p.focus}
                  active={data.settings.focusMin === p.focus && data.settings.breakMin === p.break}
                  onClick={() => {
                    pomo.setDurations(p.focus, p.break);
                    setFocusInput(String(p.focus));
                    setBreakInput(String(p.break));
                  }}
                >
                  {p.focus}/{p.break}
                </Chip>
              ))}
            </div>
          </Panel>
          <Panel title="Personnalisé">
            <form onSubmit={applyCustom} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="focus-min">Focus (min)</Label>
                  <Input id="focus-min" inputMode="numeric" type="number" min={1} max={180} value={focusInput} onChange={(e) => setFocusInput(e.target.value)} className="h-11 rounded-xl bg-background/40" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-min">Pause (min)</Label>
                  <Input id="break-min" inputMode="numeric" type="number" min={1} max={60} value={breakInput} onChange={(e) => setBreakInput(e.target.value)} className="h-11 rounded-xl bg-background/40" />
                </div>
              </div>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" variant="glass" className="w-full">
                Appliquer
              </Button>
            </form>
          </Panel>
        </div>
      </div>
      <AnimatePresence>{fullscreen && <FocusMode onExit={() => setFullscreen(false)} />}</AnimatePresence>
    </div>
  );
}
