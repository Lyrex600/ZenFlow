import { describe, expect, it } from "vitest";
import { BREATH_PATTERNS, breathAt, cycleSeconds } from "./breathing";

describe("breathing patterns", () => {
  it("default rhythm is Inspire 4 s, Retiens 4 s, Expire 6 s", () => {
    const p = BREATH_PATTERNS.calme;
    expect(p.phases.map((ph) => [ph.label, ph.seconds])).toEqual([
      ["Inspire", 4],
      ["Retiens", 4],
      ["Expire", 6],
    ]);
    expect(cycleSeconds(p)).toBe(14);
  });

  it("presets have the documented durations", () => {
    expect(BREATH_PATTERNS["478"].phases.map((p) => p.seconds)).toEqual([4, 7, 8]);
    expect(BREATH_PATTERNS.box.phases.map((p) => p.seconds)).toEqual([4, 4, 4, 4]);
    expect(BREATH_PATTERNS["55"].phases.map((p) => p.seconds)).toEqual([5, 5]);
  });

  it("finds the phase at a given time and loops", () => {
    const p = BREATH_PATTERNS.calme;
    expect(breathAt(p, 1).label).toBe("Inspire");
    expect(breathAt(p, 5).label).toBe("Retiens");
    expect(breathAt(p, 9).label).toBe("Expire");
    expect(breathAt(p, 15).label).toBe("Inspire");
  });

  it("grows the orb while inhaling and shrinks it while exhaling", () => {
    const p = BREATH_PATTERNS.calme;
    expect(breathAt(p, 3.9).scale).toBeGreaterThan(breathAt(p, 0.1).scale);
    expect(breathAt(p, 13.9).scale).toBeLessThan(breathAt(p, 8.1).scale);
  });
});
