import { AudioWaveform, CloudLightning, CloudRain, Droplets, Flame, Square, Trees, Volume2, Waves, Wind } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { SoundId } from "@/lib/audio/ambient";
import { cn } from "@/lib/utils";
import { useApp } from "../AppContext";
import { Panel, TabHeader } from "../Panel";

const SOUNDS: { id: SoundId; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "pluie", label: "Pluie", icon: CloudRain },
  { id: "ocean", label: "Océan", icon: Waves },
  { id: "foret", label: "Forêt", icon: Trees },
  { id: "feu", label: "Feu", icon: Flame },
  { id: "vent", label: "Vent", icon: Wind },
  { id: "ruisseau", label: "Ruisseau", icon: Droplets },
  { id: "orage", label: "Orage", icon: CloudLightning },
  { id: "bruit", label: "Bruit blanc", icon: AudioWaveform },
];

export function SoundsTab() {
  const { data, setSettings, ambient } = useApp();

  return (
    <div>
      <TabHeader title="Sons d'ambiance" subtitle="8 paysages synthétisés en direct par ton navigateur — aucun fichier audio. Mélange-les librement." />
      <Panel className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-medium">Volume général</span>
          </div>
          <Slider
            className="flex-1"
            value={[data.settings.volume * 100]}
            max={100}
            step={1}
            onValueChange={([v = 0]) => setSettings({ volume: v / 100 })}
            aria-label="Volume général"
          />
          <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">{Math.round(data.settings.volume * 100)}%</span>
          <Button variant="glass" onClick={ambient.stopAll} disabled={ambient.active.length === 0}>
            <Square /> Tout arrêter
          </Button>
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SOUNDS.map((s) => {
          const on = ambient.active.includes(s.id);
          return (
            <div key={s.id} className={cn("glass gradient-border rounded-3xl p-5 transition-all duration-500", on && "shadow-glow")}>
              <button
                type="button"
                onClick={() => ambient.toggle(s.id)}
                aria-pressed={on}
                className="flex w-full items-center gap-4 text-left"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500",
                    on ? "bg-aurora text-primary-foreground shadow-glow" : "hairline text-muted-foreground",
                  )}
                >
                  <s.icon className={cn("h-6 w-6", on && "animate-pulse")} aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-lg font-semibold">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{on ? "En lecture" : "Touche pour écouter"}</span>
                </span>
              </button>
              <Slider
                className="mt-5"
                value={[ambient.levels[s.id] * 100]}
                max={100}
                step={1}
                onValueChange={([v = 0]) => ambient.setLevel(s.id, v / 100)}
                aria-label={`Volume ${s.label}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
