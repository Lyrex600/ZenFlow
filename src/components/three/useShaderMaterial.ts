import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Builds a ShaderMaterial once and keeps the exact `uniforms` object passed in,
 * so per-frame writes (`uniforms.uTime.value += dt`) reach the GPU. Passing
 * `uniforms` as a JSX prop lets the renderer hold a copy, which freezes them.
 */
export function useShaderMaterial(params: THREE.ShaderMaterialParameters & { uniforms: Record<string, THREE.IUniform> }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => new THREE.ShaderMaterial(params), []);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/** Applies a blending mode change in place (e.g. on theme switch). */
export function useBlending(material: THREE.Material, blending: THREE.Blending) {
  useEffect(() => {
    if (material.blending === blending) return;
    material.blending = blending;
    material.needsUpdate = true;
  }, [material, blending]);
}
