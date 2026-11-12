import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal } from "@/components/fx/Reveal";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="px-6 py-24">
      <Reveal className="glass-strong gradient-border relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-8 py-20 text-center">
        <div aria-hidden className="orb-fallback absolute -right-24 -top-24 h-72 w-72 opacity-40 blur-2xl" />
        <div aria-hidden className="orb-fallback absolute -bottom-32 -left-20 h-72 w-72 opacity-30 blur-3xl" />
        <h2 id="cta-title" className="relative text-4xl font-semibold sm:text-6xl">
          Prêt à entrer dans le <span className="text-aurora">flow</span> ?
        </h2>
        <p className="relative mx-auto mt-5 max-w-lg text-lg text-muted-foreground">Crée ton coffre en moins d'une minute. Pas d'e-mail, pas de compte en ligne.</p>
        <div className="relative mt-10 flex justify-center">
          <Magnetic>
            <Button asChild variant="hero" size="lg">
              <Link to="/app" search={{ mode: "signup" }}>
                Commencer <ArrowRight />
              </Link>
            </Button>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Focus. Breathe. Flow.</p>
        </div>
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground" href="/#fonctionnalites">Fonctionnalités</a></li>
            <li><a className="hover:text-foreground" href="/#faq">FAQ</a></li>
            <li><Link className="hover:text-foreground" to="/confidentialite">Confidentialité</Link></li>
            <li><Link className="hover:text-foreground" to="/app">Ouvrir l'app</Link></li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-7xl text-xs text-muted-foreground">
        © 2026 ZenFlow · Aucun cookie, aucun traqueur, aucune donnée envoyée à un serveur.
      </p>
    </footer>
  );
}
