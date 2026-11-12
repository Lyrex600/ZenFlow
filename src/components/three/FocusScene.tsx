import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Particles } from "./Particles";
import { Ready } from "./Ready";
import type { SceneQuality } from "./types";

function Drift({ animate }: { animate: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!animate || !g.current) return;
    const t = state.clock.elapsedTime;
    g.current.rotation.z = Math.sin(t * 0.03) * 0.08;
    g.current.position.y = Math.sin(t * 0.05) * 0.3;
    g.current.position.x += Math.min(delta, 0.05) * 0;
  });
  return (
    <group ref={g}>
      <Particles count={animate ? 1400 : 600} field drift={0.35} spin={0.006} size={46} light={false} animate={animate} />
    </group>
  );
}

export default function FocusScene({ quality, active, light }: { quality: SceneQuality; active: boolean; light: boolean }) {
  const animate = quality !== "static";
  return (
    <Canvas
      frameloop={animate && active ? "always" : "demand"}
      dpr={[1, quality === "high" ? 1.5 : 1.15]}
      gl={{ antialias: false, alpha: true }}
      camera={{ position: [0, 0, 6], fov: 55 }}
      aria-hidden
    >
      {light ? <LightField animate={animate} /> : <Drift animate={animate} />}
      <Ready />
    </Canvas>
  );
}

function LightField({ animate }: { animate: boolean }) {
  return <Particles count={animate ? 1200 : 500} field drift={0.35} spin={0.006} size={40} light animate={animate} />;
}
