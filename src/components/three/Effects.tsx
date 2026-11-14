import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type ChromaticAberrationEffect } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Soft, low bloom: lifts the rim light and ring trails without blowing out. */
const BLOOM_INTENSITY = 0.55;
const BLOOM_THRESHOLD = 0.62;
/** Chromatic aberration only appears while the camera moves fast. */
const CA_MAX = 0.0022;
const CA_GAIN = 0.0016;
const CA_SPEED_FLOOR = 0.25;

function AberrationDriver({ effect }: { effect: React.RefObject<ChromaticAberrationEffect | null> }) {
  const camera = useThree((s) => s.camera);
  const last = useRef(new THREE.Vector3().copy(camera.position));
  const amount = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.max(1 / 240, Math.min(delta, 0.05));
    const speed = camera.position.distanceTo(last.current) / dt;
    last.current.copy(camera.position);
    const target = Math.min(CA_MAX, Math.max(0, speed - CA_SPEED_FLOOR) * CA_GAIN);
    amount.current += (target - amount.current) * (1 - Math.exp(-8 * dt));
    effect.current?.offset.set(amount.current, amount.current * 0.6);
  });
  return null;
}

/**
 * High-quality tier only (never mounted on low/mobile/reduced-motion paths).
 * Tone mapping runs after bloom so HDR highlights stay finite.
 */
export default function Effects({ aberration = false }: { aberration?: boolean }) {
  const ca = useRef<ChromaticAberrationEffect | null>(null);
  const offset = useMemo(() => new THREE.Vector2(0, 0), []);
  return (
    <>
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={BLOOM_INTENSITY} luminanceThreshold={BLOOM_THRESHOLD} luminanceSmoothing={0.3} radius={0.72} />
        {aberration ? (
          <ChromaticAberration ref={ca} offset={offset} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
        ) : (
          <></>
        )}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      {aberration && <AberrationDriver effect={ca} />}
    </>
  );
}
