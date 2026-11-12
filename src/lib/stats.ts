import type { Session } from "./vault/schema";

const DAY_LABELS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function shiftDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export interface DayBar {
  key: string;
  label: string;
  minutes: number;
}

export interface StatsSummary {
  focusMinutes: number;
  focusSessions: number;
  breaks: number;
  streak: number;
  week: DayBar[];
}

/**
 * Totals over all sessions, a 7-day focus chart ending today, and the streak:
 * consecutive days with at least one focus session or guided pause, ending
 * today (or yesterday when today has none yet).
 */
export function summarize(sessions: Session[], now: number): StatsSummary {
  let focusMinutes = 0;
  let focusSessions = 0;
  let breaks = 0;
  const perDay = new Map<string, number>();
  const activeDays = new Set<string>();

  for (const s of sessions) {
    if (s.kind === "focus") {
      focusMinutes += s.minutes;
      focusSessions += 1;
      const k = dayKey(s.t);
      perDay.set(k, (perDay.get(k) ?? 0) + s.minutes);
      activeDays.add(k);
    } else {
      breaks += 1;
      if (s.kind === "pause") activeDays.add(dayKey(s.t));
    }
  }

  const today = startOfDay(now);
  const week: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const ts = shiftDays(today, -i);
    const key = dayKey(ts);
    week.push({ key, label: DAY_LABELS[new Date(ts).getDay()] ?? "", minutes: Math.round(perDay.get(key) ?? 0) });
  }

  let streak = 0;
  let cursor = activeDays.has(dayKey(today)) ? today : shiftDays(today, -1);
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }

  return { focusMinutes: Math.round(focusMinutes), focusSessions, breaks, streak, week };
}
