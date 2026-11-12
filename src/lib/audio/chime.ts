import { getAudioContext } from "./context";

/** A soft synthesized bell (no audio file). */
export function playChime(volume = 0.5): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = Math.max(0, Math.min(1, volume)) * 0.35;
  out.connect(ctx.destination);

  const notes = [523.25, 783.99];
  notes.forEach((base, n) => {
    const start = now + n * 0.28;
    [1, 2.76, 5.4].forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = base * ratio;
      const peak = [1, 0.35, 0.12][i] ?? 0.1;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 2.4 / (i + 1));
      osc.connect(g).connect(out);
      osc.start(start);
      osc.stop(start + 2.6);
    });
  });
  setTimeout(() => out.disconnect(), 3500);
}
