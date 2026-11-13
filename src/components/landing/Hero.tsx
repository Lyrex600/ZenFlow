import { ClientOnly, Link } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { lazy } from "react";
import { Magnetic } from "@/components/fx/Magnetic";
import { usePrefs } from "@/components/fx/PrefsProvider";
import { SceneHost } from "@/components/three/SceneHost";
import { Button } from "@/components/ui/button";

const HeroScene = lazy(() => import("@/components/three/HeroScene"));

function HeroFallback() {
  return (
    <div className="absolute inset-0 flex items-start justify-center pt-28 lg:items-center lg:justify-end lg:pr-[10%] lg:pt-0" aria-hidden>
      <div className="orb-fallback h-56 w-56 sm:h-72 sm:w-72 lg:h-[26rem] lg:w-[26rem]" />
    </div>
  );
}

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero() {
  const { prefs } = usePrefs();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 140]);
  const opacity = useTransform(scrollY, [0, 520], [1, 0]);

  return (
    <section aria-labelledby="hero-title" className="relative min-h-[100svh] overflow-hidden">
      <ClientOnly fallback={<HeroFallback />}>
        <SceneHost className="absolute inset-0" fallback={<HeroFallback />}>
          {(quality, active) => <HeroScene quality={quality} active={active} light={prefs.theme === "light"} />}
        </SceneHost>
      </ClientOnly>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent lg:bg-gradient-to-r lg:from-background/85 lg:via-background/20 lg:to-transparent" />

      <motion.div
        style={reduce ? {} : { y, opacity }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-6 pb-28 pt-32 lg:justify-center lg:pb-16"
      >
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }} className="max-w-3xl">
          <motion.p variants={item} className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
            <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
            Chiffrement local AES-256 · Sans traqueur
          </motion.p>
          <motion.h1 id="hero-title" variants={item} className="text-5xl font-semibold leading-[0.95] sm:text-7xl lg:text-[96px]">
            <span className="text-gradient">Reprends le contrôle de ton </span>
            <span className="text-aurora">attention.</span>
          </motion.h1>
          <motion.p variants={item} className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Respiration guidée, sessions Pomodoro, sons d'ambiance et statistiques réunis dans un espace calme — tes données de pratique chiffrées sur ton appareil.
          </motion.p>
          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Button asChild variant="hero" size="lg">
                <Link to="/app" search={{ mode: "signup" }}>
                  Commencer maintenant <ArrowRight />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild variant="glass" size="lg">
              <a href="#fonctionnalites">Voir les fonctionnalités</a>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      <a
        href="#fonctionnalites"
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground sm:flex"
        aria-label="Faire défiler vers les fonctionnalités"
      >
        <span className="hairline flex h-9 w-5 justify-center rounded-full pt-1.5">
          <span className="scroll-hint-dot h-1.5 w-1 rounded-full bg-primary" />
        </span>
        Défile
      </a>
    </section>
  );
}
