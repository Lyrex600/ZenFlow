import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PARTICLE_FRAGMENT, PARTICLE_VERTEX } from "./shaders";
import { palette } from "./palette";
import { useBlending, useShaderMaterial } from "./useShaderMaterial";

interface ParticlesProps {
  count: number;
  inner?: number;
  outer?: number;
  size?: number;
  drift?: number;
  spin?: number;
  light: boolean;
  animate?: boolean;
  /** Spread as a flat-ish field instead of a spherical shell. */
  field?: boolean;
  /** RNG seed, so stacked layers do not overlap. */
  seed?: number;
  /** Overall opacity multiplier for this layer. */
  opacity?: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Particles({ count, inner = 2.2, outer = 9, size = 34, drift = 1, spin = 0.02, light, animate = true, field = false, seed: seedValue = 7, opacity = 1 }: ParticlesProps) {
  const points = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const colors = useMemo(() => palette(light), [light]);

  const geometry = useMemo(() => {
    const rand = mulberry32(seedValue);
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      if (field) {
        pos[i * 3] = (rand() - 0.5) * 22;
        pos[i * 3 + 1] = (rand() - 0.5) * 14;
        pos[i * 3 + 2] = -rand() * 14 + 2;
      } else {
        const r = inner + Math.pow(rand(), 0.7) * (outer - inner);
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.75;
        pos[i * 3 + 2] = r * Math.cos(ph);
      }
      // Mostly fine dust, a few larger motes.
      const m = rand();
      scale[i] = 0.3 + m * m * m * 2.4 + rand() * 0.25;
      seed[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count, inner, outer, field, seedValue]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uDrift: { value: drift },
      uOpacity: { value: 0.9 },
      uColorA: { value: colors.pa.clone() },
      uColorB: { value: colors.pb.clone() },
      uColorC: { value: colors.pc.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const material = useShaderMaterial({ vertexShader: PARTICLE_VERTEX, fragmentShader: PARTICLE_FRAGMENT, uniforms, transparent: true, depthWrite: false });
  useBlending(material, light ? THREE.NormalBlending : THREE.AdditiveBlending);

  useEffect(() => {
    uniforms.uPixelRatio.value = dpr;
    uniforms.uColorA.value.copy(colors.pa);
    uniforms.uColorB.value.copy(colors.pb);
    uniforms.uColorC.value.copy(colors.pc);
    uniforms.uOpacity.value = (light ? 0.75 : 0.9) * opacity;
  }, [dpr, colors, light, uniforms, opacity]);

  useFrame((_, delta) => {
    if (!animate) return;
    const dt = Math.min(delta, 0.05);
    uniforms.uTime.value += dt;
    if (points.current) points.current.rotation.y += dt * spin;
  });

  return (
    <points ref={points} geometry={geometry} material={material} />
  );
}
