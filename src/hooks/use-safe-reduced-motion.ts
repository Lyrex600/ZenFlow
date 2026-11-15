import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Like framer-motion's useReducedMotion, but always `false` on the server and the
 * first client render, so server HTML and hydration match. Updates after mount.
 */
export function useSafeReducedMotion(): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && reduce === true;
}
