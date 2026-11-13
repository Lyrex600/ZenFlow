import { Reveal } from "@/components/fx/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeading } from "./SectionHeading";

export const FAQ_ITEMS = [
  {
    q: "Mes données sont-elles vraiment privées ?",
    a: "Tes données de pratique (statistiques, alarmes, réglages) sont chiffrées dans ton navigateur (AES-256-GCM) avec une clé dérivée de ton mot de passe (PBKDF2-SHA256, 600 000 itérations) et ne quittent jamais ton appareil. Ton compte (e-mail, prénom) est géré par notre serveur ; ton mot de passe y est stocké uniquement sous forme d'empreinte, jamais en clair. Pour la sécurité de ton compte, nous enregistrons l'adresse IP et l'horodatage de tes connexions. Aucun traqueur.",
  },
  {
    q: "Que se passe-t-il si j'oublie mon mot de passe ?",
    a: "Tes données de pratique chiffrées sur ton appareil deviennent illisibles : personne ne peut les déchiffrer à ta place. Garde ton mot de passe dans un gestionnaire et exporte régulièrement une sauvegarde chiffrée. Tu peux toujours effacer les données locales et repartir de zéro.",
  },
  {
    q: "Puis-je utiliser ZenFlow sur plusieurs appareils ?",
    a: "Il n'y a pas de synchronisation automatique. Exporte une sauvegarde chiffrée (.zenflow) depuis l'app, puis importe-la dans un autre navigateur : elle s'ouvre avec le mot de passe utilisé lors de l'export.",
  },
  {
    q: "Les sons utilisent-ils des fichiers audio ?",
    a: "Non. Les 8 paysages sont synthétisés en temps réel avec la Web Audio API de ton navigateur : rien à télécharger, et tu peux les mélanger librement.",
  },
  {
    q: "Les alarmes fonctionnent-elles quand l'app est fermée ?",
    a: "Non. Les rappels sonnent tant que l'onglet ZenFlow est ouvert et déverrouillé. Autorise les notifications pour être prévenu quand l'onglet est en arrière-plan.",
  },
  {
    q: "Que protège exactement le chiffrement ?",
    a: "Il protège tes données si quelqu'un accède à ton navigateur ou à une sauvegarde : sans ton mot de passe, elles sont illisibles. Il ne protège pas d'un appareil déjà compromis (logiciel espion, extension malveillante). Le verrouillage automatique et le délai croissant après plusieurs échecs limitent les accès opportunistes.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="px-6 py-28 sm:py-36">
      <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions fréquentes" />
      <Reveal className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="glass rounded-3xl px-6 sm:px-8">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`q${i}`} className={i === FAQ_ITEMS.length - 1 ? "border-b-0" : undefined}>
              <AccordionTrigger className="py-6 text-left font-display text-lg font-medium hover:no-underline">{item.q}</AccordionTrigger>
              <AccordionContent className="pb-6 text-base leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
