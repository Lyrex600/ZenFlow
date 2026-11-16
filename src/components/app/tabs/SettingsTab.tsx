import { CheckCircle2, Lock, ShieldAlert, ShieldCheck, Timer, XCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { usePrefs } from "@/components/fx/PrefsProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FREE_ATTEMPTS, remainingLockMs } from "@/lib/security/lockout";
import { IV_BYTES, PBKDF2_ITERATIONS, SALT_BYTES } from "@/lib/vault/crypto";
import { AUTO_LOCK_OPTIONS } from "@/lib/vault/schema";
import { useVault } from "@/lib/vault/VaultProvider";
import { useApp } from "../AppContext";
import { Panel, TabHeader } from "../Panel";
import { ExportButtons } from "./ProfileTab";
import { ResetStatsButton } from "./StatsTab";

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const time = new Intl.DateTimeFormat("fr-FR", { timeStyle: "medium" });
const nf = new Intl.NumberFormat("fr-FR");

function Row({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <Label htmlFor={id} className="text-base font-medium">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Check({ ok, title, children }: { ok: boolean; title: string; children: ReactNode }) {
  return (
    <li className="hairline flex gap-3 rounded-2xl p-4">
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-good" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />}
      <div>
        <p className="font-medium">
          {title} <span className="sr-only">{ok ? "(actif)" : "(inactif)"}</span>
        </p>
        <div className="mt-0.5 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function SecurityCenter() {
  const { data, setSettings } = useApp();
  const vault = useVault();
  const [env, setEnv] = useState({ secure: false, subtle: false });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setEnv({ secure: window.isSecureContext, subtle: !!globalThis.crypto?.subtle });
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const lockWait = remainingLockMs(vault.lockout, now);

  return (
    <Panel
      title="Centre de sécurité"
      description="État réel des protections actives sur cet appareil."
      className="lg:col-span-2"
      action={
        <Button variant="hero" onClick={() => void vault.lock("manual")}>
          <Lock /> Verrouiller maintenant
        </Button>
      }
    >
      <ul className="grid gap-3 md:grid-cols-2">
        <Check ok={env.subtle && vault.keyExtractable === false} title="Chiffrement AES-256-GCM">
          Clé dérivée par PBKDF2-SHA256 ({nf.format(PBKDF2_ITERATIONS)} itérations, sel de {SALT_BYTES} octets), IV aléatoire de {IV_BYTES} octets à chaque écriture. Clé
          {vault.keyExtractable === false ? " non exportable, " : " "}en mémoire uniquement.
          {vault.lastWrite && <> Dernière écriture chiffrée : {time.format(vault.lastWrite)}.</>}
        </Check>
        <Check ok title="Mot de passe jamais stocké en clair">
          Le serveur de comptes n'en garde qu'une empreinte (bcrypt). Le coffre local se déchiffre uniquement avec une clé dérivée en mémoire.
        </Check>
        <Check ok title="Verrouillage automatique">
          Après {data.settings.autoLockMin} min d'inactivité (suspendu pendant une session en cours)
          {data.settings.lockOnHidden ? ", et dès que l'onglet passe en arrière-plan." : "."}
        </Check>
        <Check ok={lockWait === 0} title="Protection contre les essais répétés">
          {vault.lockout.failures === 0
            ? `Aucun échec récent. Délai croissant dès ${FREE_ATTEMPTS} échecs consécutifs.`
            : `${vault.lockout.failures} échec(s) depuis le dernier déverrouillage réussi.`}
          {lockWait > 0 && ` Bloqué encore ${Math.ceil(lockWait / 1000)} s.`}
        </Check>
        <Check ok={vault.previousUnlock !== null} title="Dernier déverrouillage">
          {vault.previousUnlock ? `Avant cette session : ${dateTime.format(vault.previousUnlock)}.` : "Première session sur ce coffre."} Session actuelle ouverte à{" "}
          {data.lastUnlock ? time.format(data.lastUnlock) : "—"}.
        </Check>
        <Check ok={env.secure} title="Contexte sécurisé (HTTPS)">
          {env.secure ? "La page est servie dans un contexte sécurisé." : "Contexte non sécurisé : certaines protections du navigateur sont limitées."}
        </Check>
      </ul>

      <div className="mt-6 grid gap-6 border-t border-border pt-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="autolock" className="flex items-center gap-2 text-base font-medium">
            <Timer className="h-4 w-4 text-primary" aria-hidden /> Verrouillage après inactivité
          </Label>
          <Select value={String(data.settings.autoLockMin)} onValueChange={(v) => setSettings({ autoLockMin: Number(v) })}>
            <SelectTrigger id="autolock" className="h-11 rounded-xl bg-background/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTO_LOCK_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Row
          id="lock-hidden"
          label="Verrouiller en arrière-plan"
          hint="Verrouille dès que tu changes d'onglet, même pendant une session."
          checked={data.settings.lockOnHidden}
          onChange={(v) => setSettings({ lockOnHidden: v })}
        />
      </div>
      <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
        Aucune récupération n'est possible sans ton mot de passe. Exporte une sauvegarde chiffrée régulièrement.
      </p>
    </Panel>
  );
}

export function SettingsTab() {
  const { data, setSettings } = useApp();
  const { prefs, setTheme, setCursor } = usePrefs();
  const s = data.settings;

  return (
    <div>
      <TabHeader title="Paramètres" subtitle="Apparence, sons, sessions et sécurité." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Apparence">
          <div className="divide-y divide-border">
            <Row id="theme" label="Thème clair" checked={prefs.theme === "light"} onChange={(v) => setTheme(v ? "light" : "dark")} />
            <Row id="cursor" label="Curseur personnalisé" hint="Jamais affiché sur écran tactile ni avec « réduire les animations »." checked={prefs.cursor} onChange={setCursor} />
          </div>
        </Panel>
        <Panel title="Sons & notifications">
          <div className="divide-y divide-border">
            <Row id="chime" label="Carillon de fin" checked={s.chime} onChange={(v) => setSettings({ chime: v })} />
            <Row id="toasts" label="Messages à l'écran" checked={s.toasts} onChange={(v) => setSettings({ toasts: v })} />
          </div>
        </Panel>
        <Panel title="Sessions">
          <div className="divide-y divide-border">
            <Row id="autostart" label="Enchaîner automatiquement" hint="Démarre la phase suivante du Pomodoro sans attendre." checked={s.autoStart} onChange={(v) => setSettings({ autoStart: v })} />
            <Row id="quotes" label="Citations en mode focus" checked={s.quotes} onChange={(v) => setSettings({ quotes: v })} />
          </div>
        </Panel>
        <Panel title="Données">
          <div className="space-y-4">
            <ExportButtons />
            <ResetStatsButton />
          </div>
        </Panel>
        <SecurityCenter />
      </div>
      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden /> Thème et curseur sont stockés en clair (non sensibles) ; tout le reste est chiffré.
      </p>
    </div>
  );
}
