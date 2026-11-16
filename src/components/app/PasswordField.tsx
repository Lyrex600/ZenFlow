import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  describedBy?: string;
}

/**
 * Passphrase input: show/hide toggle, correct autocomplete for password
 * managers, paste allowed, copy/cut/drag blocked so the secret never lands
 * on the clipboard by accident.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { id, label, autoComplete, describedBy, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const block = (e: { preventDefault: () => void }) => e.preventDefault();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={256}
          aria-describedby={describedBy}
          onCopy={block}
          onCut={block}
          onDragStart={block}
          className="h-12 rounded-xl bg-background/40 pr-12 text-base"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={show}
          aria-controls={id}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
});
