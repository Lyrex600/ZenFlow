import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { detectQuality, type Quality } from "@/lib/device";
import type { SceneQuality } from "./types";

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.warn("3D scene unavailable, using static fallback.", error);
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Hosts a lazily loaded 3D scene. Picks a quality tier on the client, pauses
 * rendering when off-screen, and falls back to static CSS when WebGL is
 * unavailable or the scene fails.
 */
export function SceneHost({
  className,
  fallback,
  children,
}: {
  className?: string;
  fallback: ReactNode;
  children: (quality: SceneQuality, active: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    setQuality(detectQuality());
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setActive(entry?.isIntersecting ?? true), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-scene data-quality={quality ?? "pending"}>
      {quality === null || quality === "none" ? (
        fallback
      ) : (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>{children(quality, active)}</Suspense>
        </SceneBoundary>
      )}
    </div>
  );
}

export function OrbFallback({ className = "h-64 w-64" }: { className?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <div className={`orb-fallback ${className}`} />
    </div>
  );
}
