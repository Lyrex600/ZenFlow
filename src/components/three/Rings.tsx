import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { palette } from "./palette";
import { RING_FRAGMENT, RING_VERTEX } from "./shaders";

/**
 * Each ring sways around its own tilt with sine easing (no linear spin) while a
 * light trail travels along it at its own pace.
 */
const RINGS = [
  { r: 1.62, tube: 0.007, tilt: [1.08, 0.18, 0.05], sway: [0.16, 0.22, 0.12], freq: [0.07, 0.05, 0.09], trail: 0.045, phase: 0 },
  { r: 2.04, tube: 0.0055, tilt: [0.5, 0.62, 0.32], sway: [0.18, 0.16, 0.16], freq: [0.05, 0.08, 0.04], trail: -0.032, phase: 2.1 },
  { r: 2.52, tube: 0.0045, tilt: [1.9, -0.42, 0.86], sway: [0.12, 0.16, 0.22], freq: [0.04, 0.035, 0.06], trail: 0.024, phase: 4.2 },
] as const;

function RingMesh({ ring, index, light, animate, segments }: { ring: (typeof RINGS)[number]; index: number; light: boolean; animate: boolean; segments: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const colors = useMemo(() => palette(light), [light]);
  const uniforms = useMemo(
    () => ({
      uColorA: { value: new THREE.Color() },
      uColorB: { value: new THREE.Color() },
      uHead: { value: index / 3 },
      uOpacity: { value: 0.8 },
    }),
    [index],
  );

  useEffect(() => {
    const a = colors.a.clone();
    const b = colors.b.clone();
    uniforms.uColorA.value.copy(index === 2 ? b : a);
    uniforms.uColorB.value.copy(index === 0 ? b : a.lerp(b, 0.5));
    uniforms.uOpacity.value = light ? 0.95 : 0.85;
  }, [colors, index, light, uniforms]);

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    const t = animate ? state.clock.elapsedTime + ring.phase : ring.phase;
    m.rotation.set(
      ring.tilt[0] + Math.sin(t * ring.freq[0] * Math.PI * 2) * ring.sway[0],
      ring.tilt[1] + Math.sin(t * ring.freq[1] * Math.PI * 2 + 1.3) * ring.sway[1],
      ring.tilt[2] + Math.sin(t * ring.freq[2] * Math.PI * 2 + 2.6) * ring.sway[2],
    );
    if (animate) uniforms.uHead.value = (uniforms.uHead.value + dt * ring.trail + 1) % 1;
  });

  return (
    <mesh ref={mesh} rotation={ring.tilt as unknown as [number, number, number]}>
      <torusGeometry args={[ring.r, ring.tube, 8, segments]} />
      <shaderMaterial
        vertexShader={RING_VERTEX}
        fragmentShader={RING_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function Rings({ light, animate = true, segments = 200 }: { light: boolean; animate?: boolean; segments?: number }) {
  return (
    <group>
      {RINGS.map((ring, i) => (
        <RingMesh key={i} ring={ring} index={i} light={light} animate={animate} segments={segments} />
      ))}
    </group>
  );
}
