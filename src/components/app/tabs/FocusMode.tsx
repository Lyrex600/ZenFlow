import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { lazy, useEffect, useRef, useState } from "react";
import { usePrefs } from "@/components/fx/PrefsProvider";
import { SceneHost } from "@/components/three/SceneHost";
import { Button } from "@/components/ui/button";
import { QUOTES } from "@/lib/quotes";
import { useApp } from "../AppContext";
import { formatClock, usePomodoro, usePomodoroRemaining } from "../PomodoroContext";

const FocusScene = lazy(() => import("@/components/three/FocusScene"));

/** Fullscreen, distraction-free Pomodoro view. */
export function FocusMode({ onExit }: { onExit: () => void }) {
  const { prefs } = usePrefs();
  const { data } = useApp();
  const pomo = usePomodoro();
  const remaining = usePomodoroRemaining();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    const el = document.documentElement;
    let enteredFs = false;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().then(() => (enteredFs = true)).catch(() => {});
    }
    pauseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitRef.current();
    };
    const onFs = () => {
      if (enteredFs && !document.fullscreenElement) exitRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      document.body.style.overflow = prevOverflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!data.settings.quotes) return;
    const iv = setInterval(() => setQuoteIndex((i) => (i + 1) % QUOTES.length), 14_000);
    return () => clearInterval(iv);
  }, [data.settings.quotes]);

  const quote = QUOTES[quoteIndex] ?? QUOTES[0]!;
  const progress = 1 - remaining / pomo.total;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Mode focus"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-background px-6"
    >
      <div aria-hidden className="aurora-mesh absolute inset-0 opacity-60" />
      <SceneHost className="absolute inset-0" fallback={null}>
        {(quality, active) => <FocusScene quality={quality} active={active} light={prefs.theme === "light"} />}
      </SceneHost>

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">{pomo.mode === "focus" ? `Focus · cycle ${pomo.cycle}` : "Pause"}</p>
        <p className="font-display mt-4 text-[22vw] font-semibold leading-none tabular-nums sm:text-[160px] lg:text-[200px]">{formatClock(remaining)}</p>
        <div className="mt-6 h-1 w-64 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="bg-aurora h-full rounded-full transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>

        {data.settings.quotes && (
          <div className="mt-14 h-32 max-w-xl">
            <AnimatePresence mode="wait">
              <motion.figure key={quoteIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.8 }}>
                <blockquote className="font-display text-xl leading-snug sm:text-2xl">« {quote.text} »</blockquote>
                <figcaption className="mt-3 text-sm text-muted-foreground">— {quote.author}</figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        )}

        <div className="mt-10 flex gap-3">
          <Button ref={pauseRef} variant="hero" size="lg" onClick={pomo.running ? pomo.pause : pomo.start}>
            {pomo.running ? <Pause /> : <Play />} {pomo.running ? "Pause" : "Reprendre"}
          </Button>
          <Button variant="glass" size="lg" onClick={pomo.skip}>
            <SkipForward /> Passer
          </Button>
          <Button variant="glass" size="icon" className="h-12 w-12" onClick={onExit} aria-label="Quitter le mode focus">
            <X />
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Échap pour quitter</p>
      </div>
    </motion.div>
  );
}
