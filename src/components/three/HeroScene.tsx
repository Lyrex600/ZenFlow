import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { lazy, Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Orb } from "./Orb";
import { Particles } from "./Particles";
import { Rings } from "./Rings";
import { Ready } from "./Ready";
import type { SceneQuality } from "./types";

const Effects = lazy(() => import("./Effects"));

/** Damping rates (1/s): lower = softer. Pointer and scroll are smoothed twice, so nothing snaps. */
const POINTER_DAMP = 2.4;
const SCROLL_DAMP = 3.2;
const FOLLOW_DAMP = 2.8;
const TILT_X = 0.24;
const TILT_Y = 0.34;
const CAM_PARALLAX = 0.35;

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));

/** Window-level pointer (the hero copy sits above the canvas and would swallow canvas events). */
function useWindowPointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return p;
}

/** Pointer tilt + scroll-driven camera dolly and orb morph, all exponentially damped. */
function Rig({ animate, light, detail, layers }: { animate: boolean; light: boolean; detail: number; layers: number }) {
  const group = useRef<THREE.Group>(null);
  const near = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const far = useRef<THREE.Group>(null);
  const morph = useRef(0.09);
  const smooth = useRef({ px: 0, py: 0, scroll: 0 });
  const pointer = useWindowPointer();
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const sm = smooth.current;
    const rawScroll = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight)));
    sm.scroll = damp(sm.scroll, rawScroll, SCROLL_DAMP, dt);
    if (animate) {
      sm.px = damp(sm.px, pointer.current.x, POINTER_DAMP, dt);
      sm.py = damp(sm.py, pointer.current.y, POINTER_DAMP, dt);
    }
    const p = sm.scroll;
    // Ease-in-out on scroll progress so the dolly starts and ends gently.
    const e = p * p * (3 - 2 * p);
    morph.current = 0.09 + e * 0.24;

    camera.position.z = damp(camera.position.z, 5.4 + e * 2.6, FOLLOW_DAMP, dt);
    camera.position.x = damp(camera.position.x, sm.px * CAM_PARALLAX, FOLLOW_DAMP, dt);
    camera.position.y = damp(camera.position.y, sm.py * CAM_PARALLAX * 0.6, FOLLOW_DAMP, dt);
    camera.lookAt(0, 0, 0);

    const g = group.current;
    if (g) {
      const wide = width >= 1024;
      g.position.x = damp(g.position.x, wide ? 1.75 : 0, FOLLOW_DAMP, dt);
      g.position.y = damp(g.position.y, (wide ? 0 : 1.05) + e * 0.6, FOLLOW_DAMP, dt);
      g.rotation.x = damp(g.rotation.x, -sm.py * TILT_X, FOLLOW_DAMP, dt);
      g.rotation.y = damp(g.rotation.y, sm.px * TILT_Y, FOLLOW_DAMP, dt);
    }
    // Depth parallax: near dust moves most, far dust barely.
    const layersRefs = [near.current, mid.current, far.current];
    const factors = [0.55, 0.25, 0.08];
    layersRefs.forEach((l, i) => {
      if (!l) return;
      const f = factors[i] ?? 0;
      l.position.x = -sm.px * f;
      l.position.y = -sm.py * f * 0.7 + e * f * 1.2;
    });
  });

  const counts = layers === 3 ? [260, 700, 1040] : [0, 0, 0];
  return (
    <>
      <group ref={group}>
        <Orb detail={detail} light={light} morphRef={morph} animate={animate} />
        <Rings light={light} animate={animate} />
      </group>
      {layers === 3 ? (
        <>
          <group ref={near}>
            <Particles count={counts[0] ?? 0} inner={3} outer={6} size={58} drift={0.8} spin={0.014} seed={11} light={light} animate={animate} />
          </group>
          <group ref={mid}>
            <Particles count={counts[1] ?? 0} inner={2.4} outer={9} size={36} drift={0.6} spin={0.02} seed={23} light={light} animate={animate} />
          </group>
          <group ref={far}>
            <Particles count={counts[2] ?? 0} inner={8} outer={16} size={30} drift={0.4} spin={0.008} seed={37} opacity={0.7} light={light} animate={animate} />
          </group>
        </>
      ) : (
        <group ref={mid}>
          <Particles count={animate ? 700 : 500} light={light} animate={animate} />
        </group>
      )}
    </>
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
      <Rig animate={animate} light={light} detail={high ? 40 : 18} layers={high ? 3 : 1} />
      {high && !light && (
        <Suspense fallback={null}>
          <Effects aberration />
        </Suspense>
      )}
      <Ready />
    </Canvas>
  );
}
