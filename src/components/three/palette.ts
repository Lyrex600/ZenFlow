import * as THREE from "three";

/** Scene colors mirror the CSS tokens --teal / --blue (dark and light variants). */
export function palette(light: boolean) {
  return light
    ? {
        a: new THREE.Color("#1fae97"),
        b: new THREE.Color("#2f7fe0"),
        deep: new THREE.Color("#1b4a63"),
        pa: new THREE.Color("#178f7d"),
        pb: new THREE.Color("#2463b8"),
        pc: new THREE.Color("#6b8fae"),
      }
    : {
        a: new THREE.Color("#36e2c4"),
        b: new THREE.Color("#4aa8ff"),
        deep: new THREE.Color("#06121f"),
        pa: new THREE.Color("#7ff3df"),
        pb: new THREE.Color("#8cc8ff"),
        pc: new THREE.Color("#eef8ff"),
      };
}
