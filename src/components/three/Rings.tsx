import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { palette } from "./palette";

const RINGS = [
  { r: 1.65, tube: 0.008, tilt: [1.2, 0.2, 0], speed: [0.12, 0.18, 0] },
  { r: 2.05, tube: 0.006, tilt: [0.4, 1.1, 0.3], speed: [-0.08, 0.1, 0.05] },
  { r: 2.5, tube: 0.005, tilt: [1.6, -0.5, 0.8], speed: [0.05, -0.07, 0.09] },
] as const;

export function Rings({ light, animate = true, segments = 160 }: { light: boolean; animate?: boolean; segments?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const colors = useMemo(() => palette(light), [light]);
  const tints = useMemo<THREE.Color[]>(() => [colors.a, colors.a.clone().lerp(colors.b, 0.5), colors.b], [colors]);

  useFrame((_, delta) => {
    if (!animate) return;
    const dt = Math.min(delta, 0.05);
    RINGS.forEach((ring, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.rotation.x += ring.speed[0] * dt;
      m.rotation.y += ring.speed[1] * dt;
      m.rotation.z += ring.speed[2] * dt;
    });
  });

  return (
    <group>
      {RINGS.map((ring, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          rotation={ring.tilt as unknown as [number, number, number]}
        >
          <torusGeometry args={[ring.r, ring.tube, 8, segments]} />
          <meshBasicMaterial color={tints[i] ?? colors.a} transparent opacity={light ? 0.7 : 0.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
