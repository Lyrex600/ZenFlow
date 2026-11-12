export type BreathPatternId = "calme" | "478" | "box" | "55";

export interface BreathPhase {
  label: string;
  seconds: number;
  /** Orb scale at the start and end of the phase. */
  from: number;
  to: number;
}

export interface BreathPattern {
  id: BreathPatternId;
  name: string;
  hint: string;
  phases: BreathPhase[];
}

const SMALL = 0.72;
const BIG = 1.22;

export const BREATH_PATTERNS: Record<BreathPatternId, BreathPattern> = {
  calme: {
    id: "calme",
    name: "Calme 4-4-6",
    hint: "Inspire 4 s · Retiens 4 s · Expire 6 s",
    phases: [
      { label: "Inspire", seconds: 4, from: SMALL, to: BIG },
      { label: "Retiens", seconds: 4, from: BIG, to: BIG },
      { label: "Expire", seconds: 6, from: BIG, to: SMALL },
    ],
  },
  "478": {
    id: "478",
    name: "Sommeil 4-7-8",
    hint: "Inspire 4 s · Retiens 7 s · Expire 8 s",
    phases: [
      { label: "Inspire", seconds: 4, from: SMALL, to: BIG },
      { label: "Retiens", seconds: 7, from: BIG, to: BIG },
      { label: "Expire", seconds: 8, from: BIG, to: SMALL },
    ],
  },
  box: {
    id: "box",
    name: "Carré 4-4-4-4",
    hint: "Inspire · Retiens · Expire · Retiens — 4 s chacun",
    phases: [
      { label: "Inspire", seconds: 4, from: SMALL, to: BIG },
      { label: "Retiens", seconds: 4, from: BIG, to: BIG },
      { label: "Expire", seconds: 4, from: BIG, to: SMALL },
      { label: "Retiens", seconds: 4, from: SMALL, to: SMALL },
    ],
  },
  "55": {
    id: "55",
    name: "Cohérence 5-5",
    hint: "Inspire 5 s · Expire 5 s",
    phases: [
      { label: "Inspire", seconds: 5, from: SMALL, to: BIG },
      { label: "Expire", seconds: 5, from: BIG, to: SMALL },
    ],
  },
};

export function cycleSeconds(p: BreathPattern): number {
  return p.phases.reduce((a, ph) => a + ph.seconds, 0);
}

const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

export interface BreathState {
  index: number;
  label: string;
  phaseProgress: number;
  secondsLeft: number;
  scale: number;
}

/** Where in the breathing cycle we are after `elapsed` seconds. */
export function breathAt(p: BreathPattern, elapsed: number): BreathState {
  const total = cycleSeconds(p);
  let t = ((elapsed % total) + total) % total;
  for (let i = 0; i < p.phases.length; i++) {
    const ph = p.phases[i]!;
    if (t < ph.seconds || i === p.phases.length - 1) {
      const k = Math.min(1, t / ph.seconds);
      return {
        index: i,
        label: ph.label,
        phaseProgress: k,
        secondsLeft: Math.max(1, Math.ceil(ph.seconds - t)),
        scale: ph.from + (ph.to - ph.from) * easeInOutSine(k),
      };
    }
    t -= ph.seconds;
  }
  const first = p.phases[0]!;
  return { index: 0, label: first.label, phaseProgress: 0, secondsLeft: first.seconds, scale: SMALL };
}
