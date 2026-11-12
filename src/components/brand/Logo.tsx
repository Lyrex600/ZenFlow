import { useId } from "react";
import { cn } from "@/lib/utils";

/** Three concentric rotating rings. */
export function LogoMark({ className }: { className?: string }) {
  const gid = `zf${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ring = "origin-center [transform-box:fill-box]";
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--teal)" }} />
          <stop offset="1" style={{ stopColor: "var(--blue)" }} />
        </linearGradient>
      </defs>
      <circle className={cn(ring, "animate-spin-slow")} cx="20" cy="20" r="17" fill="none" stroke={`url(#${gid})`} strokeWidth="2" strokeDasharray="78 29" strokeLinecap="round" />
      <circle className={cn(ring, "animate-spin-slower")} cx="20" cy="20" r="11.5" fill="none" stroke={`url(#${gid})`} strokeWidth="2" strokeDasharray="48 24" strokeLinecap="round" opacity="0.85" />
      <circle className={cn(ring, "animate-spin-slowest")} cx="20" cy="20" r="6" fill="none" stroke={`url(#${gid})`} strokeWidth="2" strokeDasharray="26 12" strokeLinecap="round" opacity="0.7" />
      <circle cx="20" cy="20" r="1.8" fill={`url(#${gid})`} />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">ZenFlow</span>
    </span>
  );
}
