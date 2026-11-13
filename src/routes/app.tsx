import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";
import { AccountAuthScreen, VaultGate } from "@/components/app/AuthScreen";
import { Dashboard, TAB_IDS, type TabId } from "@/components/app/Dashboard";
import { AccountProvider, useAccount } from "@/lib/account/AccountProvider";
import { VaultProvider } from "@/lib/vault/VaultProvider";

interface AppSearch {
  mode?: "signup" | undefined;
  tab?: TabId | undefined;
}

const TITLE = "Ton espace — ZenFlow";
const DESCRIPTION = "Connecte-toi à ZenFlow : pause guidée, Pomodoro, alarmes, sons d'ambiance et statistiques chiffrées sur ton appareil.";

export const Route = createFileRoute("/app")({
  // Web Crypto, localStorage, the account session and WebGL only exist in the browser.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AppSearch => ({
    mode: search["mode"] === "signup" ? "signup" : undefined,
    tab: TAB_IDS.includes(search["tab"] as TabId) ? (search["tab"] as TabId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  return (
    <AccountProvider>
      <AppGate />
    </AccountProvider>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

function AppGate() {
  const { status, user } = useAccount();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/app" });
  const setTab = useCallback((tab: TabId) => void navigate({ search: (prev) => ({ ...prev, mode: undefined, tab }), replace: true }), [navigate]);

  if (status === "loading") return <FullScreenSpinner />;
  if (status === "signedOut" || !user) return <AccountAuthScreen preferSignup={search.mode === "signup"} />;
  return (
    <VaultProvider key={user.id} userId={user.id}>
      <VaultGate>
        <Dashboard tab={search.tab ?? "pause"} onTab={setTab} />
      </VaultGate>
    </VaultProvider>
  );
}
