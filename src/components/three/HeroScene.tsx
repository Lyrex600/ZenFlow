import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Orb } from "./Orb";
import { Particles } from "./Particles";
import { Rings } from "./Rings";
import { Ready } from "./Ready";
import type { SceneQuality } from "./types";

/** Pointer tilt + scroll-driven camera dolly and orb morph. */
function Rig({ animate, light, detail }: { animate: boolean; light: boolean; detail: number }) {
  const group = useRef<THREE.Group>(null);
  const morph = useRef(0.16);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = 1 - Math.exp(-3 * dt);
    const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
    morph.current = 0.16 + p * 0.38;
    camera.position.z += (5.4 + p * 2.6 - camera.position.z) * k;
    const g = group.current;
    if (!g) return;
    const wide = width >= 1024;
    g.position.x += ((wide ? 1.75 : 0) - g.position.x) * k;
    g.position.y += ((wide ? 0 : 1.05) + p * 0.6 - g.position.y) * k;
    if (animate) {
      g.rotation.x += (-state.pointer.y * 0.28 - g.rotation.x) * k;
      g.rotation.y += (state.pointer.x * 0.38 - g.rotation.y) * k;
    }
  });

  return (
    <group ref={group}>
      <Orb detail={detail} light={light} morphRef={morph} animate={animate} />
      <Rings light={light} animate={animate} />
    </group>
  );
}

export default function HeroScene({ quality, active, light }: { quality: SceneQuality; active: boolean; light: boolean }) {
  const animate = quality !== "static";
  const high = quality === "high";
  return (
    <Canvas
      frameloop={animate && active ? "always" : "demand"}
      dpr={[1, high ? 1.75 : 1.25]}
      gl={{ antialias: high, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 5.4], fov: 45 }}
      aria-hidden
    >
      <Rig animate={animate} light={light} detail={high ? 48 : 20} />
      <Particles count={high ? 2000 : animate ? 700 : 500} light={light} animate={animate} />
      <Ready />
    </Canvas>
  );
}
