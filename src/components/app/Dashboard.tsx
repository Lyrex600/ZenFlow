import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, Headphones, Lock, LogOut, Settings, Timer, UserRound, Wind, type LucideIcon } from "lucide-react";
import { LogoMark, Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVault } from "@/lib/vault/VaultProvider";
import { useAccount } from "@/lib/account/AccountProvider";
import { AppProvider, useApp } from "./AppContext";
import { formatClock, PomodoroProvider, usePomodoro, usePomodoroRemaining } from "./PomodoroContext";
import { AlarmsTab } from "./tabs/AlarmsTab";
import { BreathTab } from "./tabs/BreathTab";
import { FocusTab } from "./tabs/FocusTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { SoundsTab } from "./tabs/SoundsTab";
import { StatsTab } from "./tabs/StatsTab";

export const TAB_IDS = ["pause", "focus", "alarmes", "sons", "stats", "profil", "parametres"] as const;
export type TabId = (typeof TAB_IDS)[number];

const TABS: { id: TabId; label: string; short: string; icon: LucideIcon }[] = [
  { id: "pause", label: "Pause guidée", short: "Pause", icon: Wind },
  { id: "focus", label: "Focus Pomodoro", short: "Focus", icon: Timer },
  { id: "alarmes", label: "Alarmes & rappels", short: "Alarmes", icon: Bell },
  { id: "sons", label: "Sons d'ambiance", short: "Sons", icon: Headphones },
  { id: "stats", label: "Statistiques", short: "Stats", icon: BarChart3 },
  { id: "profil", label: "Profil", short: "Profil", icon: UserRound },
  { id: "parametres", label: "Paramètres", short: "Réglages", icon: Settings },
];

const CONTENT: Record<TabId, () => React.ReactElement> = {
  pause: BreathTab,
  focus: FocusTab,
  alarmes: AlarmsTab,
  sons: SoundsTab,
  stats: StatsTab,
  profil: ProfileTab,
  parametres: SettingsTab,
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
}

function PomodoroBadge({ onOpen }: { onOpen: () => void }) {
  const pomo = usePomodoro();
  const remaining = usePomodoroRemaining();
  if (!pomo.running) return null;
  return (
    <button type="button" onClick={onOpen} className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm" aria-label="Session de focus en cours, ouvrir l'onglet Focus">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
      <span className="tabular-nums">{formatClock(remaining)}</span>
    </button>
  );
}

function Shell({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  const { data } = useApp();
  const { lock } = useVault();
  const { signOut } = useAccount();
  const logout = async () => {
    await lock("manual");
    await signOut();
  };
  const Content = CONTENT[tab];

  return (
    <div className="min-h-[100svh] lg:pl-72">
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-4 left-4 z-40 hidden w-64 flex-col rounded-[1.75rem] p-4 lg:flex" aria-label="Menu de l'application">
        <Link to="/" className="mb-8 px-2 pt-2" aria-label="ZenFlow, accueil">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {active && <motion.span layoutId="side-pill" className="bg-aurora absolute inset-0 rounded-2xl shadow-glow" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <t.icon className="relative h-4 w-4" aria-hidden />
                <span className="relative">{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
          <ThemeToggle />
          <Button variant="glass" className="flex-1" onClick={() => void lock("manual")}>
            <Lock /> Verrouiller
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut />
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass-strong sticky top-0 z-40 flex items-center justify-between rounded-b-3xl px-4 py-3 lg:hidden">
        <Link to="/" aria-label="ZenFlow, accueil">
          <LogoMark />
        </Link>
        <div className="flex items-center gap-1">
          <PomodoroBadge onOpen={() => onTab("focus")} />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => void lock("manual")} aria-label="Verrouiller">
            <Lock />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Se déconnecter">
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
        <div className="mb-6 hidden items-center justify-between lg:flex">
          <p className="text-muted-foreground">
            {greeting()}, <span className="text-foreground">{data.profile.name}</span>
          </p>
          <PomodoroBadge onOpen={() => onTab("focus")} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <Content />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile tab bar */}
      <nav className="glass-strong no-scrollbar fixed inset-x-3 bottom-3 z-40 flex gap-1 overflow-x-auto rounded-3xl p-1.5 lg:hidden" aria-label="Onglets">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              aria-current={active ? "page" : undefined}
              aria-label={t.label}
              className={cn("relative flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium", active ? "text-primary-foreground" : "text-muted-foreground")}
            >
              {active && <motion.span layoutId="bar-pill" className="bg-aurora absolute inset-0 rounded-2xl" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <t.icon className="relative h-5 w-5" aria-hidden />
              <span className="relative">{t.short}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function Dashboard({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  return (
    <AppProvider>
      <PomodoroProvider>
        <Shell tab={tab} onTab={onTab} />
      </PomodoroProvider>
    </AppProvider>
  );
}
