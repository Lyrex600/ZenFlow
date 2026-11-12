import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { playChime } from "@/lib/audio/chime";
import { alarmLabelSchema, timeSchema } from "@/lib/vault/schema";
import { useApp } from "../AppContext";
import { Panel, TabHeader } from "../Panel";

type Perm = NotificationPermission | "unsupported";

export function AlarmsTab() {
  const { data, update } = useApp();
  const [time, setTime] = useState("09:00");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [perm, setPerm] = useState<Perm>("default");

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const askPermission = async () => {
    if (typeof Notification === "undefined") return;
    setPerm(await Notification.requestPermission());
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = timeSchema.safeParse(time);
    const l = alarmLabelSchema.safeParse(label || "Rappel");
    if (!t.success || !l.success) {
      setError(!t.success ? "Heure invalide." : (l.error?.issues[0]?.message ?? "Libellé invalide."));
      return;
    }
    if (data.alarms.length >= 100) {
      setError("100 alarmes maximum.");
      return;
    }
    setError(null);
    const id = crypto.randomUUID();
    update((d) => ({ ...d, alarms: [...d.alarms, { id, time: t.data, label: l.data, enabled: true }].sort((a, b) => a.time.localeCompare(b.time)) }));
    setLabel("");
    if (perm === "default") void askPermission();
  };

  return (
    <div>
      <TabHeader title="Alarmes & rappels" subtitle="Un carillon doux, un message et une notification — tant que ZenFlow est ouvert et déverrouillé." />
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Panel title="Nouvelle alarme">
            <form onSubmit={add} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="alarm-time">Heure</Label>
                <Input id="alarm-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-xl bg-background/40 text-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alarm-label">Libellé</Label>
                <Input id="alarm-label" placeholder="Boire un verre d'eau" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} className="h-12 rounded-xl bg-background/40" />
              </div>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <Button type="submit" variant="hero" className="w-full">
                <Plus /> Ajouter
              </Button>
            </form>
          </Panel>
          <Panel title="Notifications" description="Pour être prévenu quand l'onglet est en arrière-plan.">
            {perm === "granted" && <p className="text-sm text-good">Notifications autorisées.</p>}
            {perm === "denied" && <p className="text-sm text-warn">Notifications bloquées. Tu peux les réactiver dans les réglages de ton navigateur.</p>}
            {perm === "unsupported" && <p className="text-sm text-muted-foreground">Ton navigateur ne prend pas en charge les notifications.</p>}
            {perm === "default" && (
              <Button variant="glass" onClick={askPermission}>
                <BellRing /> Autoriser les notifications
              </Button>
            )}
            <Button variant="link" className="mt-2 px-0" onClick={() => playChime(data.settings.volume)}>
              Tester le carillon
            </Button>
          </Panel>
        </div>

        <Panel title="Tes alarmes" description={data.alarms.length ? `${data.alarms.filter((a) => a.enabled).length} active(s) sur ${data.alarms.length}` : undefined}>
          {data.alarms.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
              <BellRing className="mb-4 h-10 w-10 text-primary/60" aria-hidden />
              <p>Aucune alarme pour l'instant.</p>
              <p className="text-sm">Ajoute un rappel pour une pause, un verre d'eau ou une fin de journée.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {data.alarms.map((a) => (
                  <motion.li
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="hairline flex items-center gap-4 rounded-2xl p-4"
                  >
                    <span className={`font-display text-3xl font-semibold tabular-nums ${a.enabled ? "" : "text-muted-foreground"}`}>{a.time}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{a.label}</span>
                    <Switch
                      checked={a.enabled}
                      onCheckedChange={(v) => update((d) => ({ ...d, alarms: d.alarms.map((x) => (x.id === a.id ? { ...x, enabled: v } : x)) }))}
                      aria-label={`${a.enabled ? "Désactiver" : "Activer"} l'alarme de ${a.time}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => update((d) => ({ ...d, alarms: d.alarms.filter((x) => x.id !== a.id) }))}
                      aria-label={`Supprimer l'alarme de ${a.time}`}
                    >
                      <Trash2 />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
