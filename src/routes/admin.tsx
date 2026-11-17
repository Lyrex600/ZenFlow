import { createFileRoute, notFound, rootRouteId, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AccountProvider, useAccount } from "@/lib/account/AccountProvider";
import { checkAdminAccess } from "@/lib/account/admin-session.functions";
import { FullScreenSpinner } from "./app";

const TITLE = "Administration — ZenFlow";
const DESCRIPTION = "Espace réservé aux administrateurs ZenFlow : comptes, connexions récentes et statut des utilisateurs.";

export const Route = createFileRoute("/admin")({
  // The access check runs on the server before anything renders; the page itself renders in the browser.
  ssr: "data-only",
  beforeLoad: async () => {
    const { ok } = await checkAdminAccess();
    // Same answer as a page that doesn't exist: real HTTP 404, root "page introuvable" screen.
    if (!ok) throw notFound({ routeId: rootRouteId });
  },
  loader: () => ({ granted: true as const }),
  // Metadata only once access is granted, so a refused visit looks exactly like any unknown URL.
  head: ({ loaderData }) =>
    loaderData?.granted
      ? {
          meta: [
            { title: TITLE },
            { name: "description", content: DESCRIPTION },
            { name: "robots", content: "noindex, nofollow" },
            { property: "og:title", content: TITLE },
            { property: "og:description", content: DESCRIPTION },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary" },
          ],
        }
      : {},
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
  const navigate = useNavigate();
  // The admin area never opens the local vault: drop any sign-in password from memory right away.
  useEffect(() => {
    if (status === "signedIn") takePendingSecret();
    if (status === "signedOut") void navigate({ to: "/", replace: true });
  }, [status, takePendingSecret, navigate]);

  if (status !== "signedIn" || !user) return <FullScreenSpinner />;
  return <AdminDashboard />;
}
