import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, KeyRound, Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { evaluatePassword } from "@/lib/security/password";
import { remainingLockMs } from "@/lib/security/lockout";
import { nameSchema } from "@/lib/vault/schema";
import { useVault } from "@/lib/vault/VaultProvider";
import { PasswordField } from "./PasswordField";
import { StrengthMeter } from "./StrengthMeter";

function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}

/** Hidden username so password managers save the passphrase under a stable entry. */
function ManagerUsername() {
  return <input type="text" name="username" autoComplete="username" value="ZenFlow (coffre local)" readOnly hidden aria-hidden />;
}

function SignupForm() {
  const { create } = useVault();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameResult = nameSchema.safeParse(name);
  const evaluation = useMemo(() => evaluatePassword(pass, name ? [name] : []), [pass, name]);
  const match = pass.length > 0 && pass === confirm;
  const canSubmit = nameResult.success && evaluation.ok && match && ack && !pending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      await create(name, pass);
      setPass("");
      setConfirm("");
    } catch {
      setError("Impossible de créer le coffre. Vérifie les champs et réessaie.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <ManagerUsername />
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm text-muted-foreground">
          Ton prénom (ou pseudo)
        </Label>
        <Input
          id="name"
          name="nickname"
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="h-12 rounded-xl bg-background/40 text-base"
          aria-invalid={name.length > 0 && !nameResult.success}
          aria-describedby="name-hint"
        />
        <p id="name-hint" className="text-xs text-muted-foreground">
          {name.length > 0 && !nameResult.success ? nameResult.error.issues[0]?.message : "Stocké chiffré, uniquement sur cet appareil."}
        </p>
      </div>
      <PasswordField id="passphrase" label="Phrase secrète" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} describedBy="strength" />
      <StrengthMeter id="strength" evaluation={evaluation} empty={pass.length === 0} />
      <PasswordField id="confirm" label="Confirme la phrase secrète" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} describedBy="confirm-hint" />
      <p id="confirm-hint" className="-mt-3 text-xs text-muted-foreground" aria-live="polite">
        {confirm.length > 0 && !match ? "Les deux phrases ne correspondent pas." : "Astuce : 3 ou 4 mots sans lien + un chiffre, c'est solide et mémorisable."}
      </p>

      <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
        <p className="flex items-start gap-2 font-medium text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Aucune récupération possible
        </p>
        <p className="mt-1.5 text-muted-foreground">
          Ta phrase secrète n'est stockée nulle part. Si tu l'oublies, tes données seront définitivement illisibles. Note-la dans un gestionnaire de mots de passe et exporte régulièrement une sauvegarde chiffrée.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" aria-describedby="ack-text" />
          <span id="ack-text" className="text-foreground">J'ai compris : sans ma phrase secrète, mes données sont irrécupérables.</span>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!canSubmit}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Chiffrement du coffre…
          </>
        ) : (
          <>
            <ShieldCheck /> Créer mon coffre chiffré
          </>
        )}
      </Button>
    </form>
  );
}

function UnlockForm() {
  const { unlock, lockout } = useVault();
  const [pass, setPass] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const wait = remainingLockMs(lockout, now);

  useEffect(() => {
    if (lockout.lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockout.lockedUntil]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pass || pending || wait > 0) return;
    setPending(true);
    setError(null);
    const result = await unlock(pass);
    if (!result.ok) {
      setPass("");
      setError("Phrase secrète incorrecte ou coffre illisible.");
      setNow(Date.now());
      setPending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ManagerUsername />
      <PasswordField
        ref={inputRef}
        id="current-passphrase"
        label="Phrase secrète"
        autoComplete="current-password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        disabled={wait > 0}
        describedBy="unlock-status"
      />
      <div id="unlock-status" aria-live="polite" className="min-h-5 text-sm">
        {wait > 0 ? (
          <p className="text-warn">Trop de tentatives. Réessaie dans {formatWait(wait)}.</p>
        ) : error ? (
          <p role="alert" className="text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!pass || pending || wait > 0}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Vérification…
          </>
        ) : (
          <>
            <KeyRound /> Déverrouiller
          </>
        )}
      </Button>
    </form>
  );
}

export function AuthScreen({ preferSignup }: { preferSignup: boolean }) {
  const { status, lockReason, importBackup, destroy } = useVault();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const isUnlock = status === "locked";

  const doImport = async (f: File) => {
    setImportError(null);
    const r = await importBackup(f);
    if (!r.ok) setImportError(r.error);
  };

  const onPick = (f: File | undefined) => {
    if (!f) return;
    if (status === "locked") setPendingFile(f);
    else void doImport(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const reasonText =
    lockReason === "idle"
      ? "Verrouillé automatiquement après une période d'inactivité."
      : lockReason === "hidden"
        ? "Verrouillé quand l'onglet est passé en arrière-plan."
        : lockReason === "import"
          ? "Sauvegarde importée. Déverrouille-la avec sa phrase secrète."
          : lockReason === "manual"
            ? "Coffre verrouillé. La clé a été effacée de la mémoire."
            : preferSignup
              ? "Un coffre existe déjà sur cet appareil. Déverrouille-le, ou efface-le pour en créer un nouveau."
              : "Entre ta phrase secrète pour déchiffrer tes données.";

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="orb-fallback h-[34rem] w-[34rem] opacity-25 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative w-full max-w-md rounded-[2rem] p-7 sm:p-9"
      >
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" aria-label="Retour à l'accueil">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft /> Accueil
            </Link>
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={isUnlock ? "unlock" : "signup"} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3 }}>
            <div className="mb-7">
              <div className="bg-aurora mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-glow">
                {isUnlock ? <Lock className="h-5 w-5" aria-hidden /> : <ShieldCheck className="h-5 w-5" aria-hidden />}
              </div>
              <h1 className="text-3xl font-semibold">{isUnlock ? "Bon retour" : "Crée ton coffre"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isUnlock ? reasonText : "Tes données seront chiffrées en AES-256-GCM sur cet appareil. Pas d'e-mail, pas de serveur."}
              </p>
            </div>
            {isUnlock ? <UnlockForm /> : <SignupForm />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-6 text-sm">
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Upload className="h-3.5 w-3.5" aria-hidden /> Importer une sauvegarde
          </button>
          {isUnlock && (
            <button type="button" onClick={() => setConfirmDestroy(true)} className="text-muted-foreground hover:text-danger">
              Effacer ce coffre
            </button>
          )}
          <input ref={fileRef} type="file" accept=".zenflow,application/json" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} aria-label="Fichier de sauvegarde ZenFlow" />
        </div>
        {importError && (
          <p role="alert" className="mt-3 text-center text-sm text-danger">
            {importError}
          </p>
        )}
      </motion.div>

      <AlertDialog open={pendingFile !== null} onOpenChange={(o) => !o && setPendingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer le coffre actuel ?</AlertDialogTitle>
            <AlertDialogDescription>Le coffre présent sur cet appareil sera remplacé par la sauvegarde importée. Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (pendingFile) void doImport(pendingFile);
                setPendingFile(null);
              }}
            >
              Remplacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDestroy} onOpenChange={setConfirmDestroy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer ce coffre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les données chiffrées de cet appareil seront supprimées définitivement. Si tu as une sauvegarde .zenflow, tu pourras la réimporter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={destroy}>
              Effacer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
