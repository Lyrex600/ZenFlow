import { Reveal } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, subtitle, id, className }: { eyebrow: string; title: string; subtitle?: string; id?: string; className?: string }) {
  return (
    <Reveal className={cn("mx-auto mb-14 max-w-2xl text-center", className)}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h2 id={id} className="text-4xl font-semibold leading-[1.05] sm:text-5xl">
        {title}
      </h2>
      {subtitle && <p className="mt-5 text-lg text-muted-foreground">{subtitle}</p>}
    </Reveal>
  );
}
