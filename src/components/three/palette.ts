import * as THREE from "three";

/** Scene colors mirror the CSS tokens --teal / --blue (dark and light variants). */
export function palette(light: boolean) {
  return light
    ? { a: new THREE.Color("#1fae97"), b: new THREE.Color("#2f7fe0"), pa: new THREE.Color("#178f7d"), pb: new THREE.Color("#2463b8") }
    : { a: new THREE.Color("#36e2c4"), b: new THREE.Color("#4aa8ff"), pa: new THREE.Color("#7ff3df"), pb: new THREE.Color("#8cc8ff") };
}
