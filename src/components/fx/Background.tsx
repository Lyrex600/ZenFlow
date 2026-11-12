/** Fixed aurora backdrop: gradient mesh, film grain and vignette. Purely decorative. */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="aurora-mesh absolute -inset-[10%] animate-aurora" />
      <div className="vignette absolute inset-0" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
