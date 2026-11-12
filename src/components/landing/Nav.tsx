import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Magnetic } from "@/components/fx/Magnetic";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment", label: "Comment ça marche" },
  { href: "#pourquoi", label: "Pourquoi" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <nav
        aria-label="Navigation principale"
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between rounded-full border border-transparent px-3 py-2 transition-all duration-500 sm:px-5",
          (scrolled || open) && "glass-strong",
        )}
      >
        <Link to="/" className="rounded-full" aria-label="ZenFlow, accueil">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/app">Connexion</Link>
          </Button>
          <Magnetic className="hidden sm:inline-flex">
            <Button asChild variant="hero">
              <Link to="/app" search={{ mode: "signup" }}>
                Commencer
              </Link>
            </Button>
          </Magnetic>
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((o) => !o)}
          >
            <motion.span className="absolute h-[2px] w-5 rounded bg-foreground" animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }} transition={{ duration: 0.3 }} />
            <motion.span className="absolute h-[2px] w-5 rounded bg-foreground" animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }} transition={{ duration: 0.3 }} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong mx-auto mt-2 max-w-7xl rounded-3xl p-4 lg:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 font-display text-lg hover:bg-accent">
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="glass">
                <Link to="/app">Connexion</Link>
              </Button>
              <Button asChild variant="hero">
                <Link to="/app" search={{ mode: "signup" }}>
                  Commencer
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
