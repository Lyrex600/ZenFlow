import { describe, expect, it } from "vitest";
import { summarize } from "./stats";

const day = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();

describe("stats", () => {
  it("totals focus minutes, focus sessions and breaks", () => {
    const s = summarize(
      [
        { t: day(2026, 11, 12), kind: "focus", minutes: 25 },
        { t: day(2026, 11, 12), kind: "break", minutes: 5 },
        { t: day(2026, 11, 12), kind: "pause", minutes: 3 },
        { t: day(2026, 11, 11), kind: "focus", minutes: 50 },
      ],
      day(2026, 11, 12, 18),
    );
    expect(s.focusMinutes).toBe(75);
    expect(s.focusSessions).toBe(2);
    expect(s.breaks).toBe(2);
  });

  it("builds a 7-day chart ending today", () => {
    const s = summarize([{ t: day(2026, 11, 12), kind: "focus", minutes: 25 }], day(2026, 11, 12, 18));
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toMatchObject({ key: "2026-11-12", minutes: 25 });
  });

  it("counts the streak from yesterday when today has no session yet", () => {
    const s = summarize(
      [
        { t: day(2026, 11, 9), kind: "focus", minutes: 25 },
        { t: day(2026, 11, 10), kind: "pause", minutes: 3 },
        { t: day(2026, 11, 11), kind: "focus", minutes: 25 },
      ],
      day(2026, 11, 12, 8),
    );
    expect(s.streak).toBe(3);
  });

  it("breaks the streak on a missing day", () => {
    const s = summarize(
      [
        { t: day(2026, 11, 9), kind: "focus", minutes: 25 },
        { t: day(2026, 11, 12), kind: "focus", minutes: 25 },
      ],
      day(2026, 11, 12, 18),
    );
    expect(s.streak).toBe(1);
  });
});
