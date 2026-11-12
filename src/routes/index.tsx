import { createFileRoute } from "@tanstack/react-router";
import { ScrollProgress } from "@/components/fx/ScrollProgress";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Nav } from "@/components/landing/Nav";
import { Features, HowItWorks, StatsStrip, Testimonials, Why } from "@/components/landing/Sections";

const TITLE = "ZenFlow — Focus. Breathe. Flow.";
const DESCRIPTION =
  "Reprends le contrôle de ton attention : respiration guidée, Pomodoro, sons d'ambiance synthétisés et statistiques, chiffrés localement en AES-256.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Aller au contenu
      </a>
      <ScrollProgress />
      <Nav />
      <main id="contenu">
        <Hero />
        <Features />
        <HowItWorks />
        <Why />
        <StatsStrip />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
