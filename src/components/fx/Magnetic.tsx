import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Gently pulls its child toward the mouse pointer. Disabled for touch and reduced motion. */
export function Magnetic({ children, strength = 0.4, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.45 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.45 });
  const ss = useSpring(scale, { stiffness: 300, damping: 22 });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
    scale.set(1.035);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x: sx, y: sy, scale: ss }} className={cn("inline-flex", className)}>
      {children}
    </motion.div>
  );
}
