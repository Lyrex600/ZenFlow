import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Shared reveal curve: a soft expo-out used by every section on the site. */
export const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({ children, delay = 0, className, y = 36 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ opacity: { duration: 0.9, delay, ease: "easeOut" }, default: { duration: 1.1, delay, ease: REVEAL_EASE } }}
    >
      {children}
    </motion.div>
  );
}
