export type Quality = "high" | "low" | "static" | "none";

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Pick a 3D quality tier: none (no WebGL), static (reduced motion), low (mobile/low-end), high. */
export function detectQuality(): Quality {
  if (!hasWebGL()) return "none";
  if (prefersReducedMotion()) return "static";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  if (isCoarsePointer() || window.innerWidth < 768 || cores <= 4 || memory <= 4) return "low";
  return "high";
}
