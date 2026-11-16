import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AccountAuthScreen } from "@/components/app/AuthScreen";
import { AccountProvider, useAccount } from "@/lib/account/AccountProvider";
import { FullScreenSpinner } from "./app";

const TITLE = "Administration — ZenFlow";
const DESCRIPTION = "Espace réservé aux administrateurs ZenFlow : comptes, connexions récentes et statut des utilisateurs.";

export const Route = createFileRoute("/admin")({
  // The session lives in the browser; access is decided by the server on every request.
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <AccountProvider>
      <AdminGate />
    </AccountProvider>
  );
}

function AdminGate() {
  const { status, user, takePendingSecret } = useAccount();
  // The admin area never opens the local vault: drop the sign-in password from memory right away.
  useEffect(() => {
    if (status === "signedIn") takePendingSecret();
  }, [status, takePendingSecret]);

  if (status === "loading") return <FullScreenSpinner />;
  if (status === "signedOut" || !user) return <AccountAuthScreen preferSignup={false} />;
  return <AdminDashboard />;
}
