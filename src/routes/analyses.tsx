import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch, timeAgo, formatEuro } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Filter = "toutes" | "urgentes" | "non-lues";
type Reaction = "conserve" | "renforce" | "vend";

export const Route = createFileRoute("/analyses")({
  validateSearch: (s: Record<string, unknown>): { filter?: Filter } => ({
    filter: (s.filter as Filter) || undefined,
  }),
  head: () => ({ meta: [{ title: "Analyses — PRISM" }] }),
  component: Analyses,
});

type Scenario = { description?: string; probabilite?: number; impact_percent?: number } | null;
type Correlation = { company?: string; reason?: string; impact_percent?: number };

type Alert = {
  id: string;
  title: string | null;
  content: string | null;
  urgency: number;
  is_read: boolean;
  sent_at: string;
  isins: string[] | null;
  sectors: string[] | null;
  impact_short_term: string | null;
  impact_long_term: string | null;
  impact_position_euros: number | null;
  impact_portfolio_percent: number | null;
  scenario_optimiste: Scenario;
  scenario_neutre: Scenario;
  scenario_pessimiste: Scenario;
  correlations_directes: Correlation[] | null;
  correlations_indirectes: Correlation[] | null;
};

type Stats = { counts: Record<Reaction, number>; total: number; my_action: Reaction | null };

function badgeFor(urgency: number) {
  if (urgency >= 3) return { label: "URGENT", tone: "danger" as const };
  if (urgency === 2) return { label: "ATTENTION", tone: "warning" as const };
  return { label: "POSITIF", tone: "success" as const };
}

// Border color reflects impact on portfolio (short-term)
function impactSide(impactShort: string | null): "success" | "danger" | "warning" {
  const s = (impactShort ?? "").toLowerCase();
  if (s.includes("positif")) return "success";
  if (s.includes("négatif") || s.includes("negatif")) return "danger";
  return "warning"; // neutre / inconnu
}

function Analyses() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/analyses" });
  const [filter, setFilter] = useState<Filter>(search.filter ?? "toutes");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (search.filter && search.filter !== filter) setFilter(search.filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.filter]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/" }); return; }
      try {
        const d = await apiFetch<{ alerts: Alert[] }>("/api/alerts");
        setAlerts(d.alerts);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur de chargement");
      } finally { setLoading(false); }
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    if (filter === "urgentes") return alerts.filter((a) => a.urgency >= 3);
    if (filter === "non-lues") return alerts.filter((a) => !a.is_read);
    return alerts;
  }, [filter, alerts]);

  const filterLabel =
    filter === "urgentes" ? "Alertes urgentes nécessitant votre attention"
    : filter === "non-lues" ? "Nouvelles analyses non consultées"
    : "Toutes les analyses récentes";

  const urgentCount = alerts.filter((a) => a.urgency >= 3).length;
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    const id = toDelete;
    setToDelete(null);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiFetch(`/api/alerts/${id}`, { method: "DELETE" });
      toast.success("Alerte supprimée");
    } catch (e: any) {
      toast.error(e.message ?? "Suppression impossible");
    }
  }, [toDelete]);

  return (
    <AppShellWithNav>
      <header className="page-header">
        <h1 className="text-[22px] font-bold text-foreground">Analyses</h1>
        <p className="text-[12px] text-muted-foreground mt-1">{filterLabel}</p>
      </header>

      <div className="px-4 space-y-3 pt-3">
        <div className="flex gap-2 pt-1 pb-2">
          <Pill active={filter === "toutes"} onClick={() => setFilter("toutes")}>Toutes</Pill>
          <Pill active={filter === "urgentes"} onClick={() => setFilter("urgentes")}>
            Urgentes<span className="ml-1.5 opacity-70">{urgentCount}</span>
          </Pill>
          <Pill active={filter === "non-lues"} onClick={() => setFilter("non-lues")}>
            Non lues<span className="ml-1.5 opacity-70">{unreadCount}</span>
          </Pill>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              {alerts.length === 0
                ? "Aucune alerte concernant votre portefeuille pour le moment."
                : "Aucune analyse pour ce filtre."}
            </p>
            {alerts.length === 0 && (
              <p className="text-[12px] text-muted-foreground mt-1">
                Les analyses apparaîtront ici dès qu'un événement impactera vos positions.
              </p>
            )}
          </div>
        ) : (
          filtered.map((a) => (
            <AlertCard key={a.id} a={a} onDelete={() => setToDelete(a.id)} />
          ))
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette alerte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Vous ne pourrez plus consulter cette analyse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShellWithNav>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-8 rounded-full text-[12px] font-medium transition ${active ? "bg-foreground text-primary-foreground" : "border border-border text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function AlertCard({ a, onDelete }: { a: Alert; onDelete: () => void }) {
  const side = impactSide(a.impact_short_term);
  const sideColor = side === "danger" ? "bg-danger" : side === "warning" ? "bg-warning" : "bg-success";
  const badge = badgeFor(a.urgency);
  const ticker = a.isins?.[0] ?? "—";

  return (
    <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
      <div className={`w-1 ${sideColor}`} />
      <div className="flex-1 p-[18px] space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-foreground leading-tight truncate">{ticker}</h3>
            {a.title && <p className="text-[12px] text-muted-foreground mt-0.5">{a.title}</p>}
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <div className="flex flex-col items-end gap-1">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                style={{ background: `var(--${badge.tone}-soft)`, color: `var(--${badge.tone})` }}
              >
                {badge.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{timeAgo(a.sent_at)}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft transition"
              aria-label="Supprimer l'alerte"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {a.content && <p className="text-[13px] text-muted-foreground leading-[1.6]">{a.content}</p>}

        {/* Impact on position */}
        {(a.impact_position_euros != null || a.impact_portfolio_percent != null) && (
          <div className="grid grid-cols-2 gap-2">
            {a.impact_position_euros != null && (
              <ImpactBox label="Impact estimé" value={formatEuro(a.impact_position_euros)} positive={a.impact_position_euros >= 0} />
            )}
            {a.impact_portfolio_percent != null && (
              <ImpactBox
                label="Sur le portefeuille"
                value={`${a.impact_portfolio_percent >= 0 ? "+" : ""}${a.impact_portfolio_percent.toFixed(2)}%`}
                positive={a.impact_portfolio_percent >= 0}
              />
            )}
          </div>
        )}

        {/* Short / long term */}
        {(a.impact_short_term || a.impact_long_term) && (
          <div className="grid grid-cols-2 gap-2">
            {a.impact_short_term && <TermBox label="Court terme" value={a.impact_short_term} />}
            {a.impact_long_term && <TermBox label="Long terme" value={a.impact_long_term} />}
          </div>
        )}

        {/* Scenarios */}
        {(a.scenario_optimiste || a.scenario_neutre || a.scenario_pessimiste) && (
          <div className="grid grid-cols-3 gap-2">
            <ScenarioBox tone="success" label="Optimiste" s={a.scenario_optimiste} />
            <ScenarioBox tone="warning" label="Neutre" s={a.scenario_neutre} />
            <ScenarioBox tone="danger" label="Pessimiste" s={a.scenario_pessimiste} />
          </div>
        )}

        {/* Correlations */}
        {((a.correlations_directes?.length ?? 0) > 0 || (a.correlations_indirectes?.length ?? 0) > 0) && (
          <div className="space-y-2">
            {(a.correlations_directes?.length ?? 0) > 0 && (
              <CorrelationList title="Corrélations directes" items={a.correlations_directes!} />
            )}
            {(a.correlations_indirectes?.length ?? 0) > 0 && (
              <CorrelationList title="Corrélations indirectes" items={a.correlations_indirectes!} />
            )}
          </div>
        )}

        {/* Community reaction */}
        <CommunityReaction alertId={a.id} />
      </div>
    </article>
  );
}

function ImpactBox({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="rounded-xl p-3 bg-subtle">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p
        className="text-[14px] font-bold mt-1"
        style={{ color: positive ? "var(--success)" : "var(--danger)" }}
      >
        {value}
      </p>
    </div>
  );
}

function TermBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 bg-subtle">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-[12px] text-foreground mt-1 leading-snug">{value}</p>
    </div>
  );
}

function ScenarioBox({ tone, label, s }: { tone: "success" | "warning" | "danger"; label: string; s: Scenario }) {
  return (
    <div className="rounded-xl bg-subtle overflow-hidden border-t-2" style={{ borderColor: `var(--${tone})` }}>
      <div className="p-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: `var(--${tone})` }}>{label}</p>
          {typeof s?.probabilite === "number" && (
            <span className="text-[10px] font-bold text-foreground">{s.probabilite}%</span>
          )}
        </div>
        {s?.description && <p className="text-[11px] text-foreground leading-snug">{s.description}</p>}
        {typeof s?.impact_percent === "number" && (
          <p className="text-[10px] text-muted-foreground">Impact: {s.impact_percent >= 0 ? "+" : ""}{s.impact_percent}%</p>
        )}
      </div>
    </div>
  );
}

function CorrelationList({ title, items }: { title: string; items: Correlation[] }) {
  return (
    <div className="rounded-xl p-3 bg-subtle space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</p>
      <ul className="space-y-1">
        {items.map((c, i) => (
          <li key={i} className="flex items-start justify-between gap-2 text-[11px]">
            <div className="min-w-0">
              <span className="font-semibold text-foreground">{c.company ?? "—"}</span>
              {c.reason && <span className="text-muted-foreground"> — {c.reason}</span>}
            </div>
            {typeof c.impact_percent === "number" && (
              <span
                className="shrink-0 font-semibold"
                style={{ color: c.impact_percent >= 0 ? "var(--success)" : "var(--danger)" }}
              >
                {c.impact_percent >= 0 ? "+" : ""}{c.impact_percent}%
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommunityReaction({ alertId }: { alertId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<Stats>(`/api/alerts/${alertId}/react`);
      setStats(d);
    } catch { /* silent */ }
  }, [alertId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh on any change to alert_reactions for this alert.
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${alertId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alert_reactions", filter: `alert_id=eq.${alertId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [alertId, load]);

  const send = async (action: Reaction) => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/alerts/${alertId}/react`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Action impossible");
    } finally { setBusy(false); }
  };

  const total = stats?.total ?? 0;
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);

  return (
    <div className="rounded-xl p-3 bg-subtle space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        Réaction de la communauté
      </p>
      <div className="grid grid-cols-3 gap-2">
        <ReactionBtn label="Je conserve" active={stats?.my_action === "conserve"} pct={pct(stats?.counts.conserve ?? 0)} onClick={() => send("conserve")} disabled={busy} />
        <ReactionBtn label="Je renforce" active={stats?.my_action === "renforce"} pct={pct(stats?.counts.renforce ?? 0)} onClick={() => send("renforce")} disabled={busy} />
        <ReactionBtn label="Je vends"    active={stats?.my_action === "vend"}     pct={pct(stats?.counts.vend ?? 0)}     onClick={() => send("vend")}     disabled={busy} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {total === 0 ? "Soyez le premier à réagir parmi les détenteurs." : `${total} détenteur${total > 1 ? "s" : ""} ${total > 1 ? "ont" : "a"} réagi`}
      </p>
    </div>
  );
}

function ReactionBtn({
  label, active, pct, onClick, disabled,
}: { label: string; active: boolean; pct: number; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${active ? "border-foreground text-foreground" : "border-border text-muted-foreground hover:text-foreground"} disabled:opacity-60`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-foreground/10"
        style={{ width: `${pct}%` }}
      />
      <span className="relative flex flex-col items-center gap-0.5">
        <span>{label}</span>
        <span className="text-[10px] opacity-70">{pct}%</span>
      </span>
    </button>
  );
}
