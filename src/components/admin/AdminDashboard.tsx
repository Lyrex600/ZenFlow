import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, CloudOff, Loader2, LogOut, RefreshCw, Search, ShieldCheck, UserCheck, Users, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/fx/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { setUserDisabled } from "@/lib/account/account.functions";
import { getAdminOverview, getLoginHistory, type AdminUserRow } from "@/lib/account/admin.functions";
import { useAccount } from "@/lib/account/AccountProvider";
import { isOnline } from "@/lib/account/presence";
import { describeUserAgent } from "@/lib/account/ua";
import { cn } from "@/lib/utils";

type SortKey = "email" | "display_name" | "created_at" | "last_login_at" | "last_ip" | "status";
type SortDir = "asc" | "desc";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const fmt = (iso: string | null, f = DATE_FMT) => (iso ? f.format(new Date(iso)) : "—");

function relative(iso: string | null, now: number): string {
  if (!iso) return "jamais";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "status", label: "Statut" },
  { key: "email", label: "E-mail" },
  { key: "display_name", label: "Nom affiché", className: "hidden md:table-cell" },
  { key: "created_at", label: "Inscription", className: "hidden lg:table-cell" },
  { key: "last_login_at", label: "Dernière connexion" },
  { key: "last_ip", label: "Dernière IP", className: "hidden sm:table-cell" },
];

function StatusDot({ online, disabled }: { online: boolean; disabled: boolean }) {
  if (disabled)
    return (
      <span className="inline-flex items-center gap-2 text-xs font-medium text-danger">
        <Ban className="h-3.5 w-3.5" aria-hidden /> Désactivé
      </span>
    );
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-medium", online ? "text-good" : "text-muted-foreground")}>
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60 motion-reduce:hidden" />}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", online ? "bg-good" : "bg-muted-foreground/50")} />
      </span>
      {online ? "En ligne" : "Hors ligne"}
    </span>
  );
}

export function AdminDashboard() {
  const { signOut } = useAccount();
  const navigate = useNavigate();
  const leave = async () => {
    await signOut();
    void navigate({ to: "/", replace: true });
  };
  const fetchOverview = useServerFn(getAdminOverview);
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fetchOverview(), refetchInterval: 15_000 });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "last_login_at", dir: "desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = overview.data ?? null;
  const now = data?.now ?? Date.now();

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.users.filter((u) => u.email.toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q) || (u.last_ip ?? "").includes(q))
      : data.users;
    const value = (u: AdminUserRow): string | number => {
      if (sort.key === "status") return u.disabled_at ? -1 : isOnline(u.last_seen_at, data.now) ? 1 : 0;
      if (sort.key === "created_at" || sort.key === "last_login_at") return u[sort.key] ? Date.parse(u[sort.key] as string) : 0;
      return (u[sort.key] ?? "").toLowerCase();
    };
    return [...filtered].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr");
      return sort.dir === "asc" ? c : -c;
    });
  }, [data, query, sort]);

  const selected = data?.users.find((u) => u.id === selectedId) ?? null;
  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "email" || key === "display_name" || key === "last_ip" ? "asc" : "desc" }));

  if (overview.isPending) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Vérification de l'accès…</span>
      </div>
    );
  }

  if (overview.isError || !data) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong w-full max-w-md rounded-[2rem] p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-warn/15 text-warn">
            <CloudOff aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold">Chargement impossible</h1>
          <p className="mt-2 text-sm text-muted-foreground">Les comptes n'ont pas pu être chargés. Réessaie dans un instant.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="glass" onClick={() => void overview.refetch()}>
              <RefreshCw /> Réessayer
            </Button>
            <Button asChild variant="hero">
              <Link to="/app">Retour à mon espace</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  const onlineCount = data.users.filter((u) => !u.disabled_at && isOnline(u.last_seen_at, data.now)).length;
  const disabledCount = data.users.filter((u) => u.disabled_at).length;

  return (
    <div className="min-h-[100svh]">
      <header className="glass-strong sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="ZenFlow, accueil">
              <Logo />
            </Link>
            <span className="hairline rounded-full px-2.5 py-0.5 text-xs font-medium text-primary">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/app">Mon espace</Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => void leave()} aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold sm:text-5xl">Comptes</h1>
          <p className="mt-2 text-muted-foreground">Inscriptions, connexions et statut en direct. Aucun mot de passe n'est visible ici, ni nulle part ailleurs.</p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: "Comptes", value: data.users.length },
            { icon: Wifi, label: "En ligne", value: onlineCount },
            { icon: Ban, label: "Désactivés", value: disabledCount },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-3xl p-5">
              <s.icon className="h-5 w-5 text-primary" aria-hidden />
              <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <section className="glass overflow-hidden rounded-3xl" aria-label="Liste des comptes">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un e-mail, un nom, une IP…" aria-label="Rechercher un compte" className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {rows.length} compte{rows.length > 1 ? "s" : ""} · actualisé toutes les 15 s
              {overview.isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" aria-hidden />}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                    return (
                      <th key={c.key} scope="col" className={cn("px-4 py-3 font-medium sm:px-5", c.className)} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                        <button type="button" onClick={() => toggleSort(c.key)} className={cn("inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground", active && "text-foreground")}>
                          {c.label}
                          <Icon className="h-3 w-3" aria-hidden />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    tabIndex={0}
                    onClick={() => setSelectedId(u.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(u.id);
                      }
                    }}
                    aria-label={`Voir le détail de ${u.email}`}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                  >
                    <td className="px-4 py-3.5 sm:px-5">
                      <StatusDot online={isOnline(u.last_seen_at, now)} disabled={Boolean(u.disabled_at)} />
                    </td>
                    <td className="max-w-[16rem] px-4 py-3.5 sm:px-5">
                      <span className="block truncate font-medium">{u.email}</span>
                      {u.is_admin && <span className="text-xs text-primary">Administrateur</span>}
                    </td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground md:table-cell sm:px-5">{u.display_name || "—"}</td>
                    <td className="hidden px-4 py-3.5 text-muted-foreground lg:table-cell sm:px-5">{fmt(u.created_at, DAY_FMT)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground sm:px-5">{fmt(u.last_login_at)}</td>
                    <td className="hidden px-4 py-3.5 font-mono text-xs text-muted-foreground sm:table-cell sm:px-5">{u.last_ip ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-5 py-12 text-center text-muted-foreground">
                      Aucun compte ne correspond à « {query} ».
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <UserSheet user={selected} now={now} isSelf={selected?.id === data.selfId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function UserSheet({ user, now, isSelf, onClose }: { user: AdminUserRow | null; now: number; isSelf: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fetchHistory = useServerFn(getLoginHistory);
  const disableFn = useServerFn(setUserDisabled);
  const [confirming, setConfirming] = useState(false);
  const history = useQuery({
    queryKey: ["admin", "history", user?.id],
    queryFn: () => fetchHistory({ data: { userId: user?.id ?? "" } }),
    enabled: Boolean(user),
  });
  const mutation = useMutation({
    mutationFn: (disabled: boolean) => disableFn({ data: { userId: user?.id ?? "", disabled } }),
    onSuccess: (_r, disabled) => {
      toast.success(disabled ? "Compte désactivé." : "Compte réactivé.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action impossible pour le moment."),
    onSettled: () => setConfirming(false),
  });
  const disabled = Boolean(user?.disabled_at);

  return (
    <Sheet open={Boolean(user)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="glass-strong w-full overflow-y-auto border-l border-border sm:max-w-md">
        {user && (
          <>
            <SheetHeader className="text-left">
              <div className="bg-aurora mb-3 flex h-12 w-12 items-center justify-center rounded-2xl font-display text-lg font-semibold text-primary-foreground shadow-glow" aria-hidden>
                {(user.display_name || user.email).slice(0, 1).toUpperCase()}
              </div>
              <SheetTitle className="text-2xl">{user.display_name || "Sans nom"}</SheetTitle>
              <SheetDescription className="break-all">{user.email}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <Info label="Statut">
                <StatusDot online={isOnline(user.last_seen_at, now)} disabled={disabled} />
              </Info>
              <Info label="Vu">{relative(user.last_seen_at, now)}</Info>
              <Info label="Inscription">{fmt(user.created_at, DAY_FMT)}</Info>
              <Info label="Rôle">{user.is_admin ? "Administrateur" : "Utilisateur"}</Info>
            </div>

            <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Historique de connexion</h3>
            {history.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement…
              </div>
            ) : history.isError ? (
              <p className="text-sm text-danger">Historique indisponible pour le moment.</p>
            ) : history.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune connexion enregistrée.</p>
            ) : (
              <ol className="space-y-2">
                {history.data.map((e, i) => (
                  <motion.li key={e.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="hairline rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs">{e.ip ?? "IP inconnue"}</span>
                      <time className="text-xs text-muted-foreground" dateTime={e.created_at}>
                        {fmt(e.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-foreground/80">{describeUserAgent(e.user_agent)}</p>
                    {e.user_agent && <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={e.user_agent}>{e.user_agent}</p>}
                  </motion.li>
                ))}
              </ol>
            )}

            <div className="mt-8 border-t border-border pt-6">
              {isSelf ? (
                <p className="text-sm text-muted-foreground">C'est ton compte : tu ne peux pas le désactiver toi-même.</p>
              ) : disabled ? (
                <Button variant="glass" className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : <UserCheck />} Réactiver le compte
                </Button>
              ) : (
                <Button variant="destructive" className="w-full" disabled={mutation.isPending} onClick={() => setConfirming(true)}>
                  <Ban /> Désactiver le compte
                </Button>
              )}
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Un compte désactivé ne peut plus se connecter. Ses données restent intactes et il peut être réactivé.
              </p>
            </div>

            <AlertDialog open={confirming} onOpenChange={setConfirming}>
              <AlertDialogContent className="glass-strong">
                <AlertDialogHeader>
                  <AlertDialogTitle>Désactiver ce compte ?</AlertDialogTitle>
                  <AlertDialogDescription>{user.email} ne pourra plus se connecter tant que le compte n'est pas réactivé.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:brightness-110" onClick={() => mutation.mutate(true)}>
                    Désactiver
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hairline rounded-2xl p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  );
}
