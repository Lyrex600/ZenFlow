import { Pause, Play, RotateCcw } from "lucide-react";
import { lazy, useCallback, useEffect, useRef, useState } from "react";
import { usePrefs } from "@/components/fx/PrefsProvider";
import { OrbFallback, SceneHost } from "@/components/three/SceneHost";
import { Button } from "@/components/ui/button";
import { BREATH_PATTERNS, breathAt, type BreathPatternId } from "@/lib/breathing";
import { cn } from "@/lib/utils";
import { useApp } from "../AppContext";
import { Chip, Panel, TabHeader } from "../Panel";
import { ProgressRing } from "../ProgressRing";
import { formatClock } from "../PomodoroContext";

const BreathScene = lazy(() => import("@/components/three/BreathScene"));
const DURATIONS = [1, 3, 5, 10] as const;

export function BreathTab() {
  const { data, setSettings, notify, logSession, markBusy } = useApp();
  const { prefs } = usePrefs();
  const pattern = BREATH_PATTERNS[data.settings.breathPattern];
  const [minutes, setMinutes] = useState<number>(3);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState(() => breathAt(pattern, 0));

  const scaleRef = useRef(0.85);
  const accRef = useRef(0);
  const startRef = useRef(0);
  const total = minutes * 60;

  const reset = useCallback(() => {
    setRunning(false);
    accRef.current = 0;
    setElapsed(0);
    setPhase(breathAt(pattern, 0));
    scaleRef.current = 0.85;
  }, [pattern]);

  useEffect(() => {
    markBusy("breath", running);
    return () => markBusy("breath", false);
  }, [running, markBusy]);

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now();
    let raf = 0;
    let lastUi = 0;
    let finished = false;
    const loop = (t: number) => {
      const el = accRef.current + (t - startRef.current) / 1000;
      const st = breathAt(pattern, el);
      scaleRef.current = st.scale;
      if (t - lastUi > 100) {
        lastUi = t;
        setElapsed(el);
        setPhase(st);
      }
      if (el >= total) {
        finished = true;
        accRef.current = 0;
        setRunning(false);
        setElapsed(0);
        scaleRef.current = 0.85;
        logSession("pause", minutes);
        notify("Pause terminée", { description: `${minutes} min de respiration. Ton attention te dit merci.`, system: true });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (!finished) accRef.current += (performance.now() - startRef.current) / 1000;
    };
  }, [running, pattern, total, minutes, logSession, notify]);

  const choosePattern = (id: BreathPatternId) => {
    setSettings({ breathPattern: id });
    reset();
  };

  const progress = elapsed / total;
  const idle = !running && elapsed === 0;

  return (
    <div>
      <TabHeader title="Pause guidée" subtitle="Suis l'orbe : elle grandit quand tu inspires, se pose quand tu retiens, se vide quand tu expires." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel className="flex flex-col items-center justify-center overflow-hidden py-10">
          <ProgressRing progress={progress} size={320} stroke={4} className="max-w-full" label="Progression de la pause">
            <SceneHost className="absolute inset-3 overflow-hidden rounded-full" fallback={<OrbFallback className="h-40 w-40" />}>
              {(quality, active) => <BreathScene quality={quality} active={active} light={prefs.theme === "light"} scaleRef={scaleRef} />}
            </SceneHost>
          </ProgressRing>
          <div className="mt-8 text-center" aria-live="polite">
            <p className="font-display text-5xl font-semibold">{idle ? "Prêt ?" : phase.label}</p>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {idle ? pattern.hint : `${phase.secondsLeft} s · reste ${formatClock((total - elapsed) * 1000)}`}
            </p>
          </div>
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {pattern.phases.map((ph, i) => (
              <span key={`${ph.label}${i}`} className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                <span
                  className="bg-aurora block h-full rounded-full"
                  style={{ width: idle ? "0%" : i < phase.index ? "100%" : i === phase.index ? `${phase.phaseProgress * 100}%` : "0%" }}
                />
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" onClick={() => setRunning((r) => !r)}>
              {running ? <Pause /> : <Play />} {running ? "Pause" : elapsed > 0 ? "Reprendre" : "Commencer"}
            </Button>
            <Button variant="glass" size="lg" onClick={reset} disabled={idle}>
              <RotateCcw /> Réinitialiser
            </Button>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Durée">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  active={minutes === d}
                  disabled={running}
                  onClick={() => {
                    setMinutes(d);
                    reset();
                  }}
                >
                  {d} min
                </Chip>
              ))}
            </div>
          </Panel>
          <Panel title="Rythme">
            <div className="space-y-2" role="radiogroup" aria-label="Rythme de respiration">
              {Object.values(BREATH_PATTERNS).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === pattern.id}
                  disabled={running}
                  onClick={() => choosePattern(p.id)}
                  className={cn(
                    "w-full rounded-2xl p-4 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60",
                    p.id === pattern.id ? "bg-primary/10 shadow-glow" : "hairline hover:border-primary/40",
                  )}
                >
                  <span className="block font-medium">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
