import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, KeyRound, Loader2, Lock, LogOut, MailCheck, ShieldCheck, Upload, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
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
import { useAccount } from "@/lib/account/AccountProvider";
import { remainingLockMs, type LockoutState } from "@/lib/security/lockout";
import { evaluatePassword } from "@/lib/security/password";
import { nameSchema } from "@/lib/vault/schema";
import { useVault } from "@/lib/vault/VaultProvider";
import { PasswordField } from "./PasswordField";
import { StrengthMeter } from "./StrengthMeter";

const emailSchema = z.string().trim().email().max(254);
export const IP_CONSENT = "Pour la sécurité de ton compte, nous enregistrons l'adresse IP et l'horodatage de tes connexions.";

function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}

function useLockWait(lockout: LockoutState): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (lockout.lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockout.lockedUntil]);
  return remainingLockMs(lockout, now);
}

function AuthShell({ icon, title, subtitle, children, footer }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
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
          <motion.div key={title} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.3 }}>
            <div className="mb-7">
              <div className="bg-aurora mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-glow">{icon}</div>
              <h1 className="text-3xl font-semibold">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </motion.div>
        </AnimatePresence>
        {footer && <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-6 text-sm">{footer}</div>}
      </motion.div>
    </main>
  );
}

function EmailField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email" className="text-sm text-muted-foreground">
        E-mail
      </Label>
      <Input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl bg-background/40 text-base"
      />
    </div>
  );
}

function LoginForm() {
  const { signIn, lockout } = useAccount();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wait = useLockWait(lockout);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending || wait > 0) return;
    if (!emailSchema.safeParse(email).success || !pass) {
      setError("Renseigne un e-mail valide et ton mot de passe.");
      return;
    }
    setPending(true);
    setError(null);
    const r = await signIn(email, pass);
    if (!r.ok) {
      setError(r.error);
      setPass("");
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <EmailField value={email} onChange={setEmail} autoFocus />
      <PasswordField id="current-password" label="Mot de passe" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} disabled={wait > 0} describedBy="login-status" />
      <div id="login-status" aria-live="polite" className="min-h-5 text-sm">
        {wait > 0 ? <p className="text-warn">Trop de tentatives. Réessaie dans {formatWait(wait)}.</p> : error ? <p role="alert" className="text-danger">{error}</p> : null}
      </div>
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={pending || wait > 0}>
        {pending ? <><Loader2 className="animate-spin" /> Connexion…</> : <><KeyRound /> Se connecter</>}
      </Button>
    </form>
  );
}

function SignupForm({ onDone }: { onDone: (needsConfirmation: boolean) => void }) {
  const { signUp } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameResult = nameSchema.safeParse(name);
  const emailOk = emailSchema.safeParse(email).success;
  const evaluation = useMemo(() => evaluatePassword(pass, [name, email.split("@")[0] ?? ""].filter(Boolean)), [pass, name, email]);
  const match = pass.length > 0 && pass === confirm;
  const canSubmit = nameResult.success && emailOk && evaluation.ok && match && ack && !pending;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !nameResult.success) return;
    setPending(true);
    setError(null);
    const r = await signUp(nameResult.data, email, pass);
    if (!r.ok) {
      setError(r.error);
      setPending(false);
      return;
    }
    setPass("");
    setConfirm("");
    onDone(r.needsConfirmation);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm text-muted-foreground">
          Ton prénom (ou pseudo)
        </Label>
        <Input id="name" name="nickname" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-12 rounded-xl bg-background/40 text-base" aria-invalid={name.length > 0 && !nameResult.success} />
        {name.length > 0 && !nameResult.success && <p className="text-xs text-danger">{nameResult.error.issues[0]?.message}</p>}
      </div>
      <EmailField value={email} onChange={setEmail} />
      <PasswordField id="new-password" label="Mot de passe" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} describedBy="strength" />
      <StrengthMeter id="strength" evaluation={evaluation} empty={pass.length === 0} />
      <PasswordField id="confirm-password" label="Confirme le mot de passe" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} describedBy="confirm-hint" />
      <p id="confirm-hint" className="-mt-3 text-xs text-muted-foreground" aria-live="polite">
        {confirm.length > 0 && !match ? "Les deux mots de passe ne correspondent pas." : "Astuce : 3 ou 4 mots sans lien + un chiffre, c'est solide et mémorisable."}
      </p>

      <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
        <p className="flex items-start gap-2 font-medium text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Tes données de pratique sont chiffrées avec ce mot de passe
        </p>
        <p className="mt-1.5 text-muted-foreground">
          Statistiques, alarmes et réglages restent chiffrés sur ton appareil avec une clé tirée de ton mot de passe. Personne ne peut les récupérer à ta place : si tu l'oublies, elles deviennent illisibles. Exporte régulièrement une sauvegarde chiffrée.
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
          <span className="text-foreground">J'ai compris : sans mon mot de passe, mes données de pratique sont irrécupérables.</span>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{IP_CONSENT}</p>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!canSubmit}>
        {pending ? <><Loader2 className="animate-spin" /> Création du compte…</> : <><ShieldCheck /> Créer mon compte</>}
      </Button>
    </form>
  );
}

/** Signed out: real account sign-in / sign-up. */
export function AccountAuthScreen({ preferSignup }: { preferSignup: boolean }) {
  const { notice } = useAccount();
  const [mode, setMode] = useState<"login" | "signup" | "check-email">(preferSignup ? "signup" : "login");

  if (mode === "check-email") {
    return (
      <AuthShell icon={<MailCheck className="h-5 w-5" aria-hidden />} title="Vérifie ta boîte mail" subtitle="Nous t'avons envoyé un lien de confirmation. Ouvre-le pour activer ton compte, puis connecte-toi.">
        <Button variant="glass" size="lg" className="w-full" onClick={() => setMode("login")}>
          J'ai confirmé, me connecter
        </Button>
      </AuthShell>
    );
  }

  const isSignup = mode === "signup";
  return (
    <AuthShell
      icon={isSignup ? <UserPlus className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
      title={isSignup ? "Crée ton compte" : "Bon retour"}
      subtitle={notice ?? (isSignup ? "Un compte sécurisé, et tes données de pratique chiffrées en AES-256-GCM sur ton appareil." : "Connecte-toi pour retrouver ton espace.")}
      footer={
        <button type="button" onClick={() => setMode(isSignup ? "login" : "signup")} className="text-muted-foreground hover:text-foreground">
          {isSignup ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
        </button>
      }
    >
      {isSignup ? <SignupForm onDone={(needs) => setMode(needs ? "check-email" : "login")} /> : <LoginForm />}
    </AuthShell>
  );
}

/** Signed in: open (or create) the local encrypted vault for this account. */
export function VaultGate({ children }: { children: ReactNode }) {
  const account = useAccount();
  const vault = useVault();
  const [pass, setPass] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const consumed = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const wait = useLockWait(vault.lockout);

  const displayName = account.profile?.display_name || (account.user?.user_metadata?.["display_name"] as string | undefined) || account.user?.email?.split("@")[0] || "Ami·e";

  // Use the password just typed at sign-in once, then forget it.
  useEffect(() => {
    if (consumed.current || vault.status === "loading") return;
    consumed.current = true;
    const secret = account.takePendingSecret();
    if (!secret) {
      setAuto(false);
      return;
    }
    void (async () => {
      if (vault.status === "locked") {
        const r = await vault.unlock(secret);
        if (!r.ok) setError("Ce coffre local n'a pas été chiffré avec ton mot de passe actuel. Entre l'ancien mot de passe, importe une sauvegarde ou efface les données locales.");
      } else if (vault.status === "empty") {
        await vault.create(displayName, secret);
      }
      setAuto(false);
    })();
  }, [vault, account, displayName]);

  if (vault.status === "unlocked") return <>{children}</>;
  if (vault.status === "loading" || auto) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-3" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="text-sm text-muted-foreground">Déchiffrement de ton espace…</span>
      </div>
    );
  }

  const isEmpty = vault.status === "empty";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pass || pending || wait > 0) return;
    setPending(true);
    setError(null);
    if (isEmpty) {
      const r = await account.reauth(pass);
      account.takePendingSecret();
      if (!r.ok) {
        setError(r.error);
        setPending(false);
        setPass("");
        return;
      }
      await vault.create(displayName, pass);
    } else {
      const r = await vault.unlock(pass);
      if (!r.ok) {
        setError("Mot de passe incorrect ou données locales illisibles.");
        setPending(false);
        setPass("");
      }
    }
  };

  const reasonText =
    vault.lockReason === "idle"
      ? "Verrouillé automatiquement après une période d'inactivité."
      : vault.lockReason === "hidden"
        ? "Verrouillé quand l'onglet est passé en arrière-plan."
        : vault.lockReason === "import"
          ? "Sauvegarde importée. Déverrouille-la avec le mot de passe utilisé lors de son export."
          : vault.lockReason === "manual"
            ? "Espace verrouillé. La clé a été effacée de la mémoire."
            : "Entre ton mot de passe pour déchiffrer tes données sur cet appareil.";

  const doImport = async (f: File) => {
    const r = await vault.importBackup(f);
    if (!r.ok) setError(r.error);
  };

  return (
    <AuthShell
      icon={isEmpty ? <ShieldCheck className="h-5 w-5" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
      title={isEmpty ? "Prépare ton espace" : `Re-bonjour, ${displayName}`}
      subtitle={isEmpty ? "Confirme ton mot de passe : il sert à chiffrer tes données de pratique sur cet appareil." : reasonText}
      footer={
        <>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Upload className="h-3.5 w-3.5" aria-hidden /> Importer une sauvegarde
          </button>
          {!isEmpty && (
            <button type="button" onClick={() => setConfirmDestroy(true)} className="text-muted-foreground hover:text-danger">
              Effacer les données locales
            </button>
          )}
          <button type="button" onClick={() => void account.signOut()} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" aria-hidden /> Se déconnecter
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zenflow,application/json"
            className="hidden"
            aria-label="Fichier de sauvegarde ZenFlow"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (isEmpty) void doImport(f);
                else setPendingFile(f);
              }
              e.target.value = "";
            }}
          />
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <input type="email" name="username" autoComplete="username" value={account.user?.email ?? ""} readOnly hidden aria-hidden />
        <PasswordField id="vault-password" label="Mot de passe" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} disabled={wait > 0} describedBy="vault-status" autoFocus />
        <div id="vault-status" aria-live="polite" className="min-h-5 text-sm">
          {wait > 0 ? <p className="text-warn">Trop de tentatives. Réessaie dans {formatWait(wait)}.</p> : error ? <p role="alert" className="text-danger">{error}</p> : null}
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={!pass || pending || wait > 0}>
          {pending ? <><Loader2 className="animate-spin" /> Vérification…</> : <><KeyRound /> {isEmpty ? "Créer mon espace chiffré" : "Déverrouiller"}</>}
        </Button>
      </form>

      <AlertDialog open={pendingFile !== null} onOpenChange={(o) => !o && setPendingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer les données locales ?</AlertDialogTitle>
            <AlertDialogDescription>Les données chiffrées de cet appareil seront remplacées par la sauvegarde importée. Cette action est irréversible.</AlertDialogDescription>
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
            <AlertDialogTitle>Effacer les données locales ?</AlertDialogTitle>
            <AlertDialogDescription>Statistiques, alarmes et réglages de cet appareil seront supprimés. Ton compte reste intact. Une sauvegarde .zenflow pourra être réimportée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                vault.destroy();
                setError(null);
              }}
            >
              Effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthShell>
  );
}
