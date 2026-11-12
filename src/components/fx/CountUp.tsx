import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

const fmt = new Intl.NumberFormat("fr-FR");

/** Renders the final value on the server; counts up from 0 once scrolled into view. */
export function CountUp({ value, duration = 1.8, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const started = useRef(false);

  useEffect(() => {
    if (reduce || !ref.current || started.current) return;
    if (!inView) {
      ref.current.textContent = fmt.format(0);
      return;
    }
    started.current = true;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = fmt.format(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {fmt.format(value)}
    </span>
  );
}
