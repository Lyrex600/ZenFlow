import { getAudioContext } from "./context";

/**
 * 8 procedurally synthesized soundscapes (Web Audio API, no audio files).
 * Each builder wires noise buffers, filters and LFOs into its own gain node.
 */
export type SoundId = "pluie" | "ocean" | "foret" | "feu" | "vent" | "ruisseau" | "orage" | "bruit";

interface Voice {
  gain: GainNode;
  stop: () => void;
}

type NoiseKind = "white" | "pink" | "brown";
const buffers = new Map<NoiseKind, AudioBuffer>();

function noiseBuffer(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
  const cached = buffers.get(kind);
  if (cached) return cached;
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w * 0.5;
    else if (kind === "pink") {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  buffers.set(kind, buf);
  return buf;
}

function noise(ctx: AudioContext, kind: NoiseKind): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind);
  src.loop = true;
  src.loopStart = Math.random() * 2;
  src.start(0, Math.random() * 3);
  return src;
}

function filter(ctx: AudioContext, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function lfo(ctx: AudioContext, target: AudioParam, rate: number, depth: number): OscillatorNode {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = rate;
  g.gain.value = depth;
  osc.connect(g).connect(target);
  osc.start();
  return osc;
}

function gainNode(ctx: AudioContext, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

type Builder = (ctx: AudioContext, out: GainNode) => () => void;

function burst(ctx: AudioContext, out: AudioNode, opts: { dur: number; gain: number; hp?: number; lp?: number; kind?: NoiseKind; attack?: number }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, opts.kind ?? "white");
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(opts.gain, now + (opts.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
  let node: AudioNode = src;
  if (opts.hp) node = node.connect(filter(ctx, "highpass", opts.hp));
  if (opts.lp) node = node.connect(filter(ctx, "lowpass", opts.lp));
  node.connect(g).connect(out);
  src.start(now, Math.random() * 3);
  src.stop(now + opts.dur + 0.05);
}

function every(min: number, max: number, fn: () => void): () => void {
  let t: ReturnType<typeof setTimeout>;
  const loop = () => {
    fn();
    t = setTimeout(loop, min + Math.random() * (max - min));
  };
  t = setTimeout(loop, min + Math.random() * (max - min));
  return () => clearTimeout(t);
}

const rain: Builder = (ctx, out) => {
  const hiss = noise(ctx, "pink");
  hiss.connect(filter(ctx, "highpass", 500)).connect(filter(ctx, "lowpass", 7000)).connect(gainNode(ctx, 0.55)).connect(out);
  const patter = noise(ctx, "white");
  const bp = filter(ctx, "bandpass", 3200, 0.6);
  const pg = gainNode(ctx, 0.12);
  patter.connect(bp).connect(pg).connect(out);
  const l = lfo(ctx, pg.gain, 0.3, 0.05);
  const stopDrops = every(30, 120, () => burst(ctx, out, { dur: 0.03 + Math.random() * 0.04, gain: 0.08 + Math.random() * 0.12, hp: 2000 + Math.random() * 3000 }));
  return () => { stopDrops(); [hiss, patter, l].forEach((n) => n.stop()); };
};

const ocean: Builder = (ctx, out) => {
  const body = noise(ctx, "brown");
  const lp = filter(ctx, "lowpass", 450);
  const g = gainNode(ctx, 0.45);
  body.connect(lp).connect(g).connect(out);
  const wash = noise(ctx, "pink");
  const bp = filter(ctx, "bandpass", 900, 0.5);
  const wg = gainNode(ctx, 0.18);
  wash.connect(bp).connect(wg).connect(out);
  const l1 = lfo(ctx, g.gain, 0.09, 0.35);
  const l2 = lfo(ctx, wg.gain, 0.09, 0.16);
  const l3 = lfo(ctx, lp.frequency, 0.09, 250);
  return () => [body, wash, l1, l2, l3].forEach((n) => n.stop());
};

const forest: Builder = (ctx, out) => {
  const leaves = noise(ctx, "pink");
  const lp = filter(ctx, "bandpass", 1400, 0.4);
  const g = gainNode(ctx, 0.14);
  leaves.connect(lp).connect(g).connect(out);
  const l = lfo(ctx, g.gain, 0.12, 0.07);
  const stopBirds = every(1400, 4200, () => {
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2400 + Math.random() * 1600;
    for (let i = 0; i < notes; i++) {
      const t = ctx.currentTime + i * (0.11 + Math.random() * 0.06);
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), t + 0.07);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.06, t + 0.015);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(og).connect(out);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  });
  return () => { stopBirds(); leaves.stop(); l.stop(); };
};

const fire: Builder = (ctx, out) => {
  const roar = noise(ctx, "brown");
  const lp = filter(ctx, "lowpass", 700);
  const g = gainNode(ctx, 0.5);
  roar.connect(lp).connect(g).connect(out);
  const l = lfo(ctx, g.gain, 0.4, 0.12);
  const stopCrackle = every(40, 260, () => burst(ctx, out, { dur: 0.012 + Math.random() * 0.03, gain: 0.1 + Math.random() * 0.3, hp: 1200 + Math.random() * 2500 }));
  return () => { stopCrackle(); roar.stop(); l.stop(); };
};

const wind: Builder = (ctx, out) => {
  const src = noise(ctx, "pink");
  const bp = filter(ctx, "bandpass", 600, 1.4);
  const g = gainNode(ctx, 0.4);
  src.connect(bp).connect(g).connect(out);
  const l1 = lfo(ctx, bp.frequency, 0.06, 350);
  const l2 = lfo(ctx, g.gain, 0.045, 0.22);
  return () => [src, l1, l2].forEach((n) => n.stop());
};

const stream: Builder = (ctx, out) => {
  const a = noise(ctx, "white");
  const bp1 = filter(ctx, "bandpass", 1800, 0.7);
  const g1 = gainNode(ctx, 0.12);
  a.connect(bp1).connect(g1).connect(out);
  const b = noise(ctx, "pink");
  const bp2 = filter(ctx, "bandpass", 500, 0.8);
  const g2 = gainNode(ctx, 0.25);
  b.connect(bp2).connect(g2).connect(out);
  const l1 = lfo(ctx, g1.gain, 5.3, 0.04);
  const l2 = lfo(ctx, bp1.frequency, 0.7, 500);
  const l3 = lfo(ctx, g2.gain, 3.1, 0.06);
  return () => [a, b, l1, l2, l3].forEach((n) => n.stop());
};

const storm: Builder = (ctx, out) => {
  const stopRain = rain(ctx, out);
  const rumble = noise(ctx, "brown");
  const lp = filter(ctx, "lowpass", 140);
  const g = gainNode(ctx, 0.35);
  rumble.connect(lp).connect(g).connect(out);
  const l = lfo(ctx, g.gain, 0.05, 0.2);
  const stopThunder = every(9000, 22000, () =>
    burst(ctx, out, { dur: 3 + Math.random() * 3, gain: 0.7, lp: 260, kind: "brown", attack: 0.25 }),
  );
  return () => { stopRain(); stopThunder(); rumble.stop(); l.stop(); };
};

const white: Builder = (ctx, out) => {
  const src = noise(ctx, "white");
  src.connect(gainNode(ctx, 0.35)).connect(out);
  return () => src.stop();
};

const BUILDERS: Record<SoundId, Builder> = {
  pluie: rain,
  ocean,
  foret: forest,
  feu: fire,
  vent: wind,
  ruisseau: stream,
  orage: storm,
  bruit: white,
};

export class AmbientEngine {
  private master: GainNode | null = null;
  private voices = new Map<SoundId, Voice>();
  private levels = new Map<SoundId, number>();
  private masterVolume = 0.7;

  private ensure(): AudioContext | null {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(ctx.destination);
    }
    return ctx;
  }

  isPlaying(id: SoundId): boolean {
    return this.voices.has(id);
  }

  start(id: SoundId): boolean {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.voices.has(id)) return !!ctx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.levels.get(id) ?? 0.6), ctx.currentTime + 1.2);
    gain.connect(this.master);
    const stopNodes = BUILDERS[id](ctx, gain);
    this.voices.set(id, { gain, stop: stopNodes });
    return true;
  }

  stop(id: SoundId): void {
    const v = this.voices.get(id);
    const ctx = getAudioContext();
    if (!v || !ctx) return;
    this.voices.delete(id);
    v.gain.gain.cancelScheduledValues(ctx.currentTime);
    v.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
    setTimeout(() => {
      try { v.stop(); } catch { /* already stopped */ }
      v.gain.disconnect();
    }, 1200);
  }

  setLevel(id: SoundId, level: number): void {
    this.levels.set(id, level);
    const v = this.voices.get(id);
    const ctx = getAudioContext();
    if (v && ctx) v.gain.gain.setTargetAtTime(Math.max(0.0001, level), ctx.currentTime, 0.1);
  }

  setMaster(volume: number): void {
    this.masterVolume = volume;
    const ctx = getAudioContext();
    if (this.master && ctx) this.master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
  }

  stopAll(): void {
    for (const id of [...this.voices.keys()]) this.stop(id);
  }
}
