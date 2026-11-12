import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { HALO_FRAGMENT, HALO_VERTEX, ORB_FRAGMENT, ORB_VERTEX } from "./shaders";
import { palette } from "./palette";

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
  const colors = useMemo(() => palette(light), [light]);

  const orbUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.16 },
      uFreq: { value: 1.35 },
      uColorA: { value: colors.a.clone() },
      uColorB: { value: colors.b.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const haloUniforms = useMemo(
    () => ({ uColorA: { value: colors.a.clone() }, uColorB: { value: colors.b.clone() }, uStrength: { value: 0.55 } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    orbUniforms.uColorA.value.copy(colors.a);
    orbUniforms.uColorB.value.copy(colors.b);
    haloUniforms.uColorA.value.copy(colors.a);
    haloUniforms.uColorB.value.copy(colors.b);
    haloUniforms.uStrength.value = light ? 0.35 : 0.55;
  }, [colors, light, orbUniforms, haloUniforms]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (animate) orbUniforms.uTime.value += dt;
    const k = 1 - Math.exp(-4 * dt);
    const amp = morphRef?.current ?? 0.16;
    orbUniforms.uAmp.value += (amp - orbUniforms.uAmp.value) * k;
    if (group.current) {
      const target = scaleRef ? scaleRef.current : idle && animate ? 1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.035 : 1;
      const s = group.current.scale.x + (target - group.current.scale.x) * (scaleRef ? 1 - Math.exp(-10 * dt) : k);
      group.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1, detail]} />
        <shaderMaterial vertexShader={ORB_VERTEX} fragmentShader={ORB_FRAGMENT} uniforms={orbUniforms} />
      </mesh>
      <mesh position={[0, 0, -0.6]} renderOrder={-1}>
        <planeGeometry args={[5.2, 5.2]} />
        <shaderMaterial
          vertexShader={HALO_VERTEX}
          fragmentShader={HALO_FRAGMENT}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
