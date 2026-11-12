import type { PasswordEvaluation } from "@/lib/security/password";
import { cn } from "@/lib/utils";

const SEGMENT = ["bg-danger", "bg-danger", "bg-warn", "bg-good", "bg-good"];
const TEXT = ["text-danger", "text-danger", "text-warn", "text-good", "text-good"];

export function StrengthMeter({ evaluation, id, empty }: { evaluation: PasswordEvaluation; id: string; empty: boolean }) {
  return (
    <div id={id} className="space-y-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full bg-muted transition-colors duration-300", !empty && i <= evaluation.score && SEGMENT[evaluation.score])}
          />
        ))}
      </div>
      {!empty && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className={cn("font-medium", TEXT[evaluation.score])}>Robustesse : {evaluation.label}</span>
          {evaluation.issues.length > 0 && <span className="text-muted-foreground">{evaluation.issues.join(" · ")}</span>}
        </div>
      )}
    </div>
  );
}
