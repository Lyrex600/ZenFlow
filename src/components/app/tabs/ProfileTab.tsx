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

export function ProfileTab() {
  const { data, update } = useApp();
  const { destroy } = useVault();
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
    setName(r.data);
    toast.success("Profil mis à jour");
  };

  return (
    <div>
      <TabHeader title="Profil" subtitle="Ton identité ici se résume à un prénom, chiffré avec le reste." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Identité">
          <div className="mb-6 flex items-center gap-4">
            <span className="bg-aurora flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-semibold text-primary-foreground shadow-glow" aria-hidden>
              {data.profile.name.slice(0, 1).toUpperCase() || <UserRound />}
            </span>
            <div>
              <p className="font-display text-xl font-semibold">{data.profile.name}</p>
              <p className="text-sm text-muted-foreground">Coffre créé le {dateFmt.format(data.profile.createdAt)}</p>
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

        <Panel title="Supprimer mon compte" description="Efface définitivement le coffre de cet appareil. Il n'existe aucune copie ailleurs." className="lg:col-span-2">
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
                  Toutes tes données (sessions, alarmes, réglages) seront effacées de cet appareil. Sans sauvegarde .zenflow, elles seront perdues. Tape <strong>SUPPRIMER</strong> pour confirmer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Tape SUPPRIMER pour confirmer" autoComplete="off" className="h-11 rounded-xl bg-background/40" />
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={confirmText !== "SUPPRIMER"} onClick={destroy}>
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
