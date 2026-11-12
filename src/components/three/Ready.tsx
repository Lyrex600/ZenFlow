import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

/** Marks the closest [data-scene] wrapper as ready after the first drawn frame. */
export function Ready() {
  const gl = useThree((s) => s.gl);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => gl.domElement.closest("[data-scene]")?.setAttribute("data-scene-ready", "true"));
  });
  return null;
}
