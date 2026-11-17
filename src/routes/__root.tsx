import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  ScriptOnce,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { MotionConfig, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Background } from "@/components/fx/Background";
import { CustomCursor } from "@/components/fx/CustomCursor";
import { PrefsProvider } from "@/components/fx/PrefsProvider";
import { Toaster } from "@/components/ui/sonner";
import { THEME_BOOT_SCRIPT } from "@/lib/prefs";
import { CSP_META } from "@/lib/security/headers";

// A full page load is checked against a short-lived cookie; when it has expired the server
// answers 404 even for a valid session. Retry once in the browser, where the fresh token is sent.
const notFoundRetried = new Set<string>();

function NotFoundComponent() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (notFoundRetried.has(pathname)) return;
    notFoundRetried.add(pathname);
    void import("@/integrations/supabase/client").then(async ({ supabase }) => {
      const { data } = await supabase.auth.getSession();
      if (data.session) void router.invalidate();
    });
  }, [pathname, router]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <h1 className="text-aurora text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="bg-aurora inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Cette page n'a pas pu se charger</h1>
        <p className="mt-2 text-sm text-muted-foreground">Une erreur est survenue. Tu peux réessayer ou revenir à l'accueil.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-aurora inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Réessayer
          </button>
          <a href="/" className="glass inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "ZenFlow — Focus. Breathe. Flow." },
      { name: "description", content: "Respiration guidée, Pomodoro, sons d'ambiance et statistiques, chiffrés sur ton appareil." },
      { name: "author", content: "ZenFlow" },
      { name: "theme-color", content: "#070a0f" },
      { name: "referrer", content: "no-referrer" },
      ...(import.meta.env.PROD ? [{ httpEquiv: "Content-Security-Policy", content: CSP_META }] : []),
      { property: "og:title", content: "ZenFlow — Focus. Breathe. Flow." },
      { property: "og:description", content: "Respiration guidée, Pomodoro, sons d'ambiance et statistiques, chiffrés sur ton appareil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>{THEME_BOOT_SCRIPT}</ScriptOnce>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  return (
    <motion.div
      key={pathname}
      initial={first.current ? false : { opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <PrefsProvider>
        <MotionConfig reducedMotion="user">
          <Background />
          <PageTransition>
            <Outlet />
          </PageTransition>
          <CustomCursor />
          <Toaster position="top-center" />
        </MotionConfig>
      </PrefsProvider>
    </QueryClientProvider>
  );
}
