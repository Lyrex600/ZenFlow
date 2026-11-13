import { Download, FileLock2, Trash2, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayKey } from "@/lib/stats";
import { nameSchema } from "@/lib/vault/schema";
import { downloadFile } from "@/lib/vault/storage";
import { useVault } from "@/lib/vault/VaultProvider";
import { useAccount } from "@/lib/account/AccountProvider";
import { evaluatePassword } from "@/lib/security/password";
import { PasswordField } from "../PasswordField";
import { StrengthMeter } from "../StrengthMeter";
import { useApp } from "../AppContext";
import { Panel, TabHeader } from "../Panel";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function ExportButtons() {
  const { data } = useApp();
  const { exportBackup } = useVault();
  const exportJson = () => {
    const { lastUnlock: _ignored, ...rest } = data;
    void _ignored;
    downloadFile(`zenflow-donnees-${dayKey(Date.now())}.json`, JSON.stringify(rest, null, 2), "application/json");
  };
  const exportEncrypted = async () => {
    try {
      await exportBackup();
      toast.success("Sauvegarde chiffrée exportée");
    } catch {
      toast.error("Export impossible");
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button variant="hero" onClick={exportEncrypted}>
        <FileLock2 /> Sauvegarde chiffrée (.zenflow)
      </Button>
      <Button variant="glass" onClick={exportJson}>
        <Download /> Données lisibles (JSON)
      </Button>
    </div>
  );
}

function ChangePassword() {
  const account = useAccount();
  const { rekey } = useVault();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evaluation = evaluatePassword(next, [account.user?.email?.split("@")[0] ?? ""]);
  const can = current.length > 0 && evaluation.ok && next === confirm && !pending;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!can) return;
    setPending(true);
    setError(null);
    const r = await account.changePassword(current, next);
    if (!r.ok) {
      setError(r.error);
      setPending(false);
      return;
    }
    await rekey(next);
    setCurrent("");
    setNext("");
    setConfirm("");
    setPending(false);
    toast.success("Mot de passe modifié", { description: "Tes données locales ont été re-chiffrées avec le nouveau mot de passe." });
  };
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="email" name="username" autoComplete="username" value={account.user?.email ?? ""} readOnly hidden aria-hidden />
      <PasswordField id="pw-current" label="Mot de passe actuel" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <PasswordField id="pw-new" label="Nouveau mot de passe" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      <StrengthMeter id="pw-strength" evaluation={evaluation} empty={next.length === 0} />
      <PasswordField id="pw-confirm" label="Confirme le nouveau mot de passe" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="glass" disabled={!can}>
        {pending ? "Modification…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}

export function ProfileTab() {
  const { data, update } = useApp();
  const { destroy } = useVault();
  const account = useAccount();
  const removeAccount = async () => {
    const ok = await account.deleteAccount();
    if (ok) destroy();
    else toast.error("Suppression impossible pour le moment.");
  };
  const [name, setName] = useState(data.profile.name);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const save = (e: FormEvent) => {
    e.preventDefault();
    const r = nameSchema.safeParse(name);
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? "Nom invalide");
      return;
    }
    setError(null);
    update((d) => ({ ...d, profile: { ...d.profile, name: r.data } }));
    void account.updateDisplayName(r.data);
    setName(r.data);
    toast.success("Profil mis à jour");
  };

  return (
    <div>
      <TabHeader title="Profil" subtitle="Ton compte, ton mot de passe et tes exports." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Identité">
          <div className="mb-6 flex items-center gap-4">
            <span className="bg-aurora flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-semibold text-primary-foreground shadow-glow" aria-hidden>
              {data.profile.name.slice(0, 1).toUpperCase() || <UserRound />}
            </span>
            <div>
              <p className="font-display text-xl font-semibold">{data.profile.name}</p>
              <p className="text-sm text-muted-foreground">{account.user?.email}</p>
              <p className="text-sm text-muted-foreground">Espace créé le {dateFmt.format(data.profile.createdAt)}</p>
            </div>
          </div>
          <form onSubmit={save} className="space-y-3" noValidate>
            <Label htmlFor="profile-name">Prénom ou pseudo</Label>
            <div className="flex gap-2">
              <Input id="profile-name" autoComplete="nickname" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl bg-background/40" />
              <Button type="submit" variant="glass" disabled={name.trim() === data.profile.name}>
                Enregistrer
              </Button>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </form>
        </Panel>

        <Panel title="Exporter mes données" description="La sauvegarde chiffrée se réimporte sur n'importe quel navigateur avec ta phrase secrète. Le JSON est lisible par tous : garde-le en lieu sûr.">
          <ExportButtons />
        </Panel>

        <Panel title="Mot de passe" description="Change-le régulièrement. Tes données locales sont re-chiffrées automatiquement.">
          <ChangePassword />
        </Panel>

        <Panel title="Supprimer mon compte" description="Supprime ton compte, ton historique de connexions et les données chiffrées de cet appareil.">
          <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 /> Supprimer définitivement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ton compte ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ton compte et ton historique de connexions seront supprimés de nos serveurs, et tes données de pratique effacées de cet appareil. Tape <strong>SUPPRIMER</strong> pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Tape SUPPRIMER pour confirmer" autoComplete="off" className="h-11 rounded-xl bg-background/40" />
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={confirmText !== "SUPPRIMER"} onClick={() => void removeAccount()}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Panel>
      </div>
    </div>
  );
}
