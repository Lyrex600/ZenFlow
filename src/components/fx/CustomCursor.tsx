import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/device";
import { usePrefs } from "./PrefsProvider";

const INTERACTIVE = "a, button, [role='button'], [role='tab'], [role='switch'], label, select, summary, [data-cursor='hover']";

/** Optional dot + ring cursor. Never shown on touch devices or with reduced motion. */
export function CustomCursor() {
  const { prefs } = usePrefs();
  const [supported, setSupported] = useState(false);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 380, damping: 32, mass: 0.5 });

  useEffect(() => {
    setSupported(!isCoarsePointer() && !prefersReducedMotion());
  }, []);

  const enabled = supported && prefs.cursor;

  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.classList.remove("has-custom-cursor");
      return;
    }
    root.classList.add("has-custom-cursor");
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const el = e.target instanceof Element ? e.target : null;
      setHover(!!el?.closest(INTERACTIVE));
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]" style={{ opacity: visible ? 1 : 0 }}>
      <motion.div
        className="absolute -ml-1 -mt-1 h-2 w-2 rounded-full bg-primary"
        style={{ x, y }}
      />
      <motion.div
        className="absolute rounded-full border border-primary/60 transition-[width,height,margin,background-color] duration-300"
        style={{
          x: rx,
          y: ry,
          width: hover ? 52 : 32,
          height: hover ? 52 : 32,
          marginLeft: hover ? -26 : -16,
          marginTop: hover ? -26 : -16,
          backgroundColor: hover ? "color-mix(in oklab, var(--teal) 12%, transparent)" : "transparent",
        }}
      />
    </div>
  );
}
