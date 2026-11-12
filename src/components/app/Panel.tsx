import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ title, description, children, className, action }: { title?: string | undefined; description?: string | undefined; children: ReactNode; className?: string | undefined; action?: ReactNode }) {
  return (
    <section className={cn("glass rounded-3xl p-6 sm:p-7", className)}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function TabHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </header>
  );
}

export function Chip({ active, children, onClick, disabled, label }: { active: boolean; children: ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-aurora text-primary-foreground shadow-glow" : "hairline text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
