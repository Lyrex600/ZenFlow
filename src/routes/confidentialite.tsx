import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const TITLE = "Confidentialité — ZenFlow";
const DESCRIPTION = "Comment ZenFlow protège tes données : chiffrement local AES-256-GCM, aucune donnée envoyée, aucun traqueur.";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

const POINTS = [
  { t: "Où sont mes données ?", d: "Uniquement dans le stockage local de ton navigateur, sous forme chiffrée. ZenFlow n'a pas de serveur de comptes ni de base de données." },
  { t: "Comment sont-elles chiffrées ?", d: "AES-256-GCM via la Web Crypto API. La clé est dérivée de ta phrase secrète avec PBKDF2-SHA256 (600 000 itérations, sel aléatoire de 16 octets). Chaque écriture utilise un nouveau vecteur d'initialisation aléatoire de 12 octets." },
  { t: "Et ma phrase secrète ?", d: "Elle n'est jamais enregistrée, journalisée ni envoyée. La clé dérivée reste en mémoire pendant la session et est effacée au verrouillage. Le déverrouillage réussit seulement si le coffre se déchiffre." },
  { t: "Que reste-t-il en clair ?", d: "Tes préférences d'affichage (thème, curseur) et le compteur d'échecs de connexion, pour que le délai de sécurité survive à un rechargement. Rien de personnel." },
  { t: "Mesure d'audience, cookies ?", d: "Aucun. Pas d'analytics, pas de cookies, pas de traqueurs. Les polices sont servies depuis le site lui-même." },
  { t: "Limites", d: "Si tu oublies ta phrase secrète, tes données sont perdues. Le chiffrement ne protège pas d'un appareil déjà compromis. L'hébergeur du site voit, comme pour toute page web, les requêtes de chargement de la page — jamais tes données." },
];

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-14 flex items-center justify-between">
        <Link to="/" aria-label="Accueil">
          <Logo />
        </Link>
        <Button asChild variant="glass" size="sm">
          <Link to="/">
            <ArrowLeft /> Retour
          </Link>
        </Button>
      </div>
      <h1 className="text-5xl font-semibold sm:text-6xl">Confidentialité</h1>
      <p className="mt-5 text-lg text-muted-foreground">Ce que ZenFlow fait — et ne fait pas — avec tes données.</p>
      <div className="mt-12 space-y-4">
        {POINTS.map((p) => (
          <section key={p.t} className="glass rounded-2xl p-7">
            <h2 className="text-xl font-semibold">{p.t}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{p.d}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
