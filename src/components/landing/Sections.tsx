import { BarChart3, Bell, Headphones, Leaf, Quote, ShieldCheck, Sparkles, Timer, Wind } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { CountUp } from "@/components/fx/CountUp";
import { Reveal } from "@/components/fx/Reveal";
import { SectionHeading } from "./SectionHeading";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const FEATURES: { icon: Icon; title: string; text: string; chips?: string[] }[] = [
  { icon: Wind, title: "Pause guidée", text: "Une orbe qui respire avec toi. Sessions de 1 à 10 minutes, rythmes 4-4-6, 4-7-8, carré ou 5-5, carillon doux à la fin." },
  { icon: Timer, title: "Focus Pomodoro", text: "Cycles 15/5, 25/5, 50/10 ou 90/15, mode plein écran sans distraction et citations pour garder le cap." },
  { icon: Bell, title: "Alarmes & rappels", text: "Rappels avec carillon, notification et message à l'écran — tant que ZenFlow est ouvert dans ton navigateur." },
  {
    icon: Headphones,
    title: "Sons d'ambiance",
    text: "8 paysages synthétisés en direct, sans aucun fichier audio. Mélange-les librement.",
    chips: ["pluie", "océan", "forêt", "feu", "vent", "ruisseau", "orage", "bruit blanc"],
  },
  { icon: BarChart3, title: "Statistiques", text: "Minutes de focus, sessions, pauses, série de jours et graphique des 7 derniers jours." },
  { icon: ShieldCheck, title: "Privé par conception", text: "Tes données de pratique sont chiffrées en AES-256-GCM sur ton appareil. Ton compte est sécurisé côté serveur, sans aucun traqueur." },
];

export function Features() {
  return (
    <section id="fonctionnalites" aria-labelledby="features-title" className="relative px-6 py-28 sm:py-36">
      <SectionHeading id="features-title" eyebrow="Fonctionnalités" title="Tout ce qu'il faut. Rien de plus." subtitle="Six outils sobres pour respirer, te concentrer et suivre tes progrès." />
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08}>
            <article className="glass gradient-border group h-full rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow">
              <div className="bg-aurora mb-6 flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <f.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.text}</p>
              {f.chips && (
                <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Paysages sonores">
                  {f.chips.map((c) => (
                    <li key={c} className="hairline rounded-full px-2.5 py-1 text-xs text-muted-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Choisis un cycle", text: "Une pause de 3 minutes ou un Pomodoro de 25 ? Choisis le rythme qui te ressemble." },
  { n: "02", title: "Entre dans le flow", text: "Plein écran, sons d'ambiance, et plus rien d'autre que ta tâche." },
  { n: "03", title: "Respire & recommence", text: "Une pause guidée entre deux cycles, et tu repars avec une attention neuve." },
];

export function HowItWorks() {
  return (
    <section id="comment" aria-labelledby="how-title" className="relative px-6 py-28 sm:py-36">
      <SectionHeading id="how-title" eyebrow="Comment ça marche" title="Trois gestes. Un rituel." />
      <ol className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-3 md:gap-6">
        <div aria-hidden className="bg-aurora absolute left-0 right-0 top-9 hidden h-px opacity-30 md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.12}>
            <li className="relative">
              <div className="glass-strong relative mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full">
                <span className="text-aurora font-display text-2xl font-bold">{s.n}</span>
              </div>
              <h3 className="text-2xl font-semibold">{s.title}</h3>
              <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

const WHY: { icon: Icon; title: string; text: string }[] = [
  { icon: Leaf, title: "Moins de bruit", text: "Pas de fil d'actualité, pas de badges, pas de notifications inutiles. Juste ce qu'il faut pour te concentrer." },
  { icon: Sparkles, title: "Plus de constance", text: "Les séries et le graphique hebdomadaire t'aident à installer une habitude, sans culpabiliser." },
  { icon: ShieldCheck, title: "Vraiment à toi", text: "Tes statistiques, alarmes et réglages restent chiffrés sur ton appareil. Le serveur ne connaît que ton compte et tes connexions." },
];

export function Why() {
  return (
    <section id="pourquoi" aria-labelledby="why-title" className="relative px-6 py-28 sm:py-36">
      <SectionHeading id="why-title" eyebrow="Pourquoi ZenFlow" title="Pensé pour les esprits calmes." />
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        {WHY.map((w, i) => (
          <Reveal key={w.title} delay={i * 0.1}>
            <article className="glass gradient-border h-full rounded-2xl p-8">
              <w.icon className="mb-8 h-7 w-7 text-primary" aria-hidden />
              <h3 className="text-2xl font-semibold">{w.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{w.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STATS = [
  { value: 256, label: "bits — clé AES-GCM" },
  { value: 600000, label: "itérations PBKDF2" },
  { value: 8, label: "paysages sonores" },
  { value: 0, label: "traqueur publicitaire" },
];

export function StatsStrip() {
  return (
    <section aria-label="ZenFlow en chiffres" className="px-6 py-16">
      <Reveal className="glass-strong mx-auto grid max-w-6xl grid-cols-2 gap-y-10 rounded-3xl px-6 py-12 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <CountUp value={s.value} className="text-aurora font-display text-4xl font-bold tabular-nums sm:text-5xl" />
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

const TESTIMONIALS = [
  { quote: "Deux Pomodoros avec la pluie en fond et ma liste du matin est faite. Je ne touche plus à mon téléphone.", who: "Léa", role: "étudiante" },
  { quote: "J'aime que rien ne parte sur un serveur. La pause 4-7-8 entre deux réunions, c'est devenu un réflexe.", who: "Karim", role: "développeur" },
  { quote: "Après une garde de nuit, trois minutes avec l'orbe et l'océan suffisent à faire redescendre la pression.", who: "Inès", role: "infirmière" },
];

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="px-6 py-28 sm:py-36">
      <SectionHeading
        id="testimonials-title"
        eyebrow="Témoignages"
        title="Ce qu'on aimerait t'entendre dire."
        subtitle="Exemples fictifs, à titre d'illustration : ZenFlow est un tout nouveau projet."
      />
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.who} delay={i * 0.1}>
            <figure className="glass h-full rounded-2xl p-8">
              <Quote className="mb-5 h-6 w-6 text-primary" aria-hidden />
              <blockquote className="text-lg leading-relaxed">« {t.quote} »</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="bg-aurora flex h-9 w-9 items-center justify-center rounded-full font-display font-semibold text-primary-foreground" aria-hidden>
                  {t.who[0]}
                </span>
                {t.who}, {t.role} <span className="hairline rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">fictif</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
