import { Flame, Leaf, RotateCcw, Timer, Trophy } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp } from "@/components/fx/CountUp";
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
import { summarize } from "@/lib/stats";
import { useApp } from "../AppContext";
import { Panel, TabHeader } from "../Panel";

export function ResetStatsButton() {
  const { update, data } = useApp();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="glass" disabled={data.sessions.length === 0}>
          <RotateCcw /> Réinitialiser les statistiques
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser les statistiques ?</AlertDialogTitle>
          <AlertDialogDescription>Toutes tes sessions enregistrées seront supprimées. Tes réglages et alarmes sont conservés.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => update((d) => ({ ...d, sessions: [] }))}>
            Réinitialiser
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StatsTab() {
  const { data } = useApp();
  const reduce = useReducedMotion();
  const s = useMemo(() => summarize(data.sessions, Date.now()), [data.sessions]);
  const cards = [
    { label: "Minutes de focus", value: s.focusMinutes, icon: Timer },
    { label: "Sessions de focus", value: s.focusSessions, icon: Trophy },
    { label: "Pauses", value: s.breaks, icon: Leaf },
    { label: "Série (jours)", value: s.streak, icon: Flame },
  ];

  return (
    <div>
      <TabHeader title="Statistiques" subtitle="Tes progrès, calculés et stockés uniquement sur cet appareil." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass gradient-border rounded-3xl p-5 sm:p-6">
            <c.icon className="mb-4 h-5 w-5 text-primary" aria-hidden />
            <CountUp value={c.value} duration={1.4} className="font-display text-4xl font-semibold tabular-nums sm:text-5xl" />
            <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <Panel title="7 derniers jours" description="Minutes de focus par jour." className="mt-6" action={<ResetStatsButton />}>
        <div className="h-72 w-full" role="img" aria-label={`Minutes de focus : ${s.week.map((d) => `${d.label} ${d.minutes}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s.week} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="zf-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: "var(--teal)" }} />
                  <stop offset="1" style={{ stopColor: "var(--blue)" }} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--hairline)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--hairline)", borderRadius: 14, color: "var(--foreground)" }}
                formatter={(v: number) => [`${v} min`, "Focus"]}
              />
              <Bar dataKey="minutes" fill="url(#zf-bar)" radius={[10, 10, 4, 4]} maxBarSize={44} isAnimationActive={!reduce} animationBegin={180} animationDuration={1100} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
