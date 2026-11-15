import { Canvas } from "@react-three/fiber";
import { lazy, Suspense, type MutableRefObject } from "react";
import { Orb } from "./Orb";
import { Particles } from "./Particles";
import { Rings } from "./Rings";
import { Ready } from "./Ready";
import type { SceneQuality } from "./types";

const Effects = lazy(() => import("./Effects"));

export default function BreathScene({
  quality,
  active,
  light,
  scaleRef,
}: {
  quality: SceneQuality;
  active: boolean;
  light: boolean;
  scaleRef: MutableRefObject<number>;
}) {
  const decorative = quality !== "static";
  const high = quality === "high";
  return (
    <Canvas
      frameloop={active ? "always" : "demand"}
      dpr={[1, high ? 1.75 : 1.25]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 6.2], fov: 42 }}
      aria-hidden
    >
      <Orb detail={high ? 40 : 18} light={light} scaleRef={scaleRef} animate={decorative} />
      <Rings light={light} animate={decorative} />
      <Particles count={high ? 900 : 350} inner={2.8} outer={7} seed={5} light={light} animate={decorative} drift={0.6} />
      {high && !light && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
      <Ready />
    </Canvas>
  );
}
