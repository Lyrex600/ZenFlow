import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { HALO_FRAGMENT, HALO_VERTEX, ORB_FRAGMENT, ORB_VERTEX } from "./shaders";
import { palette } from "./palette";
import { useBlending, useShaderMaterial } from "./useShaderMaterial";

/** Breathing scale range from lib/breathing (SMALL..BIG), used to derive glow. */
const SCALE_MIN = 0.72;
const SCALE_MAX = 1.22;
/** Spring for the breathing scale: critically damped, so phases flow without overshoot. */
const SPRING_K = 26;
const SPRING_C = 2 * Math.sqrt(SPRING_K);

interface OrbProps {
  detail: number;
  light: boolean;
  /** Target displacement amplitude (morph). */
  morphRef?: MutableRefObject<number>;
  /** Target uniform scale (breathing). */
  scaleRef?: MutableRefObject<number>;
  /** Idle breathing when no scaleRef is given. */
  idle?: boolean;
  animate?: boolean;
}

export function Orb({ detail, light, morphRef, scaleRef, idle = true, animate = true }: OrbProps) {
  const group = useRef<THREE.Group>(null);
  const velocity = useRef(0);
  const colors = useMemo(() => palette(light), [light]);

  const orbUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.06 },
      uFreq: { value: 0.95 },
      uGlow: { value: 0.35 },
      uLight: { value: 0 },
      uColorA: { value: colors.a.clone() },
      uColorB: { value: colors.b.clone() },
      uDeep: { value: colors.deep.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const haloUniforms = useMemo(
    () => ({ uColorA: { value: colors.a.clone() }, uColorB: { value: colors.b.clone() }, uStrength: { value: 0.5 } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const orbMaterial = useShaderMaterial({ vertexShader: ORB_VERTEX, fragmentShader: ORB_FRAGMENT, uniforms: orbUniforms });
  const haloMaterial = useShaderMaterial({
    vertexShader: HALO_VERTEX,
    fragmentShader: HALO_FRAGMENT,
    uniforms: haloUniforms,
    transparent: true,
    depthWrite: false,
  });
  useBlending(haloMaterial, light ? THREE.NormalBlending : THREE.AdditiveBlending);

  useEffect(() => {
    orbUniforms.uColorA.value.copy(colors.a);
    orbUniforms.uColorB.value.copy(colors.b);
    orbUniforms.uDeep.value.copy(colors.deep);
    orbUniforms.uLight.value = light ? 1 : 0;
    haloUniforms.uColorA.value.copy(colors.a);
    haloUniforms.uColorB.value.copy(colors.b);
  }, [colors, light, orbUniforms, haloUniforms]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) orbUniforms.uTime.value += dt;
    const k = 1 - Math.exp(-2.5 * dt);
    const amp = morphRef?.current ?? 0.06;
    orbUniforms.uAmp.value += (amp - orbUniforms.uAmp.value) * k;
    const g = group.current;
    if (!g) return;

    let s = g.scale.x;
    if (scaleRef) {
      // Spring toward the breathing target for a fluid, eased transition between phases.
      const accel = SPRING_K * (scaleRef.current - s) - SPRING_C * velocity.current;
      velocity.current += accel * dt;
      s += velocity.current * dt;
    } else {
      const target = idle && animate ? 1 + Math.sin(state.clock.elapsedTime * 0.6) * 0.03 : 1;
      s += (target - s) * k;
    }
    g.scale.setScalar(s);

    // Glow follows the breath: brighter core and halo when the lungs are full.
    const breath = scaleRef ? THREE.MathUtils.clamp((s - SCALE_MIN) / (SCALE_MAX - SCALE_MIN), 0, 1) : 0.4 + (s - 1) * 4;
    orbUniforms.uGlow.value = breath;
    haloUniforms.uStrength.value = (light ? 0.28 : 0.42) + breath * (light ? 0.12 : 0.22);
  });

  return (
    <group ref={group}>
      <mesh material={orbMaterial}>
        <icosahedronGeometry args={[1, detail]} />
      </mesh>
      <mesh position={[0, 0, -0.6]} renderOrder={-1} material={haloMaterial}>
        <planeGeometry args={[5.2, 5.2]} />
      </mesh>
    </group>
  );
}
