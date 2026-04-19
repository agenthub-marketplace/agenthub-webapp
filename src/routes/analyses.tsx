import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Trash2, ChevronDown } from "lucide-react";
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

type Scenario = {
  description?: string | null;
  probabilite?: number | null;
  impact_percent?: number | null;
  base_historique?: string | null;
} | null;
type Correlation = {
  company?: string | null;
  ticker?: string | null;
  reason?: string | null;
  impact_percent?: number | null;
  direction?: string | null;
};

type UserPosition = {
  company: string;
  ticker: string;
  logo_url: string | null;
  quantity: number;
  current_price: number;
  position_value: number;
  gain_loss_euros: number;
  gain_loss_percent: number | null;
  portfolio_value: number;
  position_weight_percent: number | null;
};

type Alert = {
  id: string;
  title: string | null;
  content: string | null;
  resume_fr: string | null;
  source_url: string | null;
  urgency: number;
  is_read: boolean;
  sent_at: string;
  isins: string[] | null;
  sectors: string[] | null;
  impact_short_term: string | null;
  impact_long_term: string | null;
  impact_short_term_pct: number | null;
  impact_long_term_pct: number | null;
  impact_position_euros: number | null;
  impact_portfolio_percent: number | null;
  scenario_optimiste: Scenario;
  scenario_neutre: Scenario;
  scenario_pessimiste: Scenario;
  correlations_directes: Correlation[] | null;
  correlations_indirectes: Correlation[] | null;
  user_position: UserPosition | null;
};

type Stats = { counts: Record<Reaction, number>; total: number; my_action: Reaction | null };

function badgeFor(urgency: number) {
  if (urgency >= 3) return { label: "URGENT", tone: "danger" as const };
  if (urgency === 2) return { label: "ATTENTION", tone: "warning" as const };
  return { label: "INFO", tone: "success" as const };
}

function impactSide(impactShort: string | null): "success" | "danger" | "warning" {
  const s = (impactShort ?? "").toLowerCase();
  if (s.includes("pos")) return "success";
  if (s.includes("nég") || s.includes("neg")) return "danger";
  return "warning";
}

function fmtPct(n: number | null | undefined, signed = true): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(n % 1 === 0 ? 0 : 1).replace(".", ",")}%`;
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

  const nonEmpty = useMemo(
    () =>
      alerts.filter((a) => {
        const hasTitle = (a.title ?? "").trim().length > 0;
        const hasBody = ((a.resume_fr ?? a.content) ?? "").trim().length > 0;
        return hasTitle && hasBody;
      }),
    [alerts],
  );

  const filtered = useMemo(() => {
    if (filter === "urgentes") return nonEmpty.filter((a) => a.urgency >= 3);
    if (filter === "non-lues") return nonEmpty.filter((a) => !a.is_read);
    return nonEmpty;
  }, [filter, nonEmpty]);

  const filterLabel =
    filter === "urgentes" ? "Alertes urgentes nécessitant votre attention"
    : filter === "non-lues" ? "Nouvelles analyses non consultées"
    : "Toutes les analyses récentes";

  const urgentCount = nonEmpty.filter((a) => a.urgency >= 3 && !a.is_read).length;
  const unreadCount = nonEmpty.filter((a) => !a.is_read).length;
  const totalCount = nonEmpty.length;

  const markAsRead = useCallback(async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    try {
      await apiFetch(`/api/alerts/${id}/read`, { method: "PATCH" });
    } catch {
      // Silent: optimistic state stays; next refresh will reconcile.
    }
  }, []);

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
          <Pill active={filter === "toutes"} onClick={() => setFilter("toutes")}>
            Toutes<span className="ml-1.5 opacity-70">{totalCount}</span>
          </Pill>
          <Pill active={filter === "urgentes"} onClick={() => setFilter("urgentes")}>
            Urgentes<span className="ml-1.5 opacity-70">{urgentCount}</span>
          </Pill>
          <Pill active={filter === "non-lues"} onClick={() => setFilter("non-lues")}>
            Non lues<span className="ml-1.5 opacity-70">{unreadCount}</span>
          </Pill>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 w-full rounded-2xl" />)}
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
            <AlertCard key={a.id} a={a} onDelete={() => setToDelete(a.id)} onMarkRead={markAsRead} />
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">
      {children}
    </p>
  );
}

function AlertCard({ a, onDelete }: { a: Alert; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const side = impactSide(a.impact_short_term);
  const sideColor = side === "danger" ? "var(--danger)" : side === "warning" ? "var(--warning)" : "var(--success)";
  const badge = badgeFor(a.urgency);
  const pos = a.user_position;
  const tickerLabel = pos?.ticker ?? a.isins?.[0] ?? "—";
  const companyLabel = pos?.company ?? tickerLabel;
  const titre = (a.title ?? "").trim();
  const summary = ((a.resume_fr ?? a.content) ?? "").trim();

  return (
    <article
      className="bg-surface rounded-2xl overflow-hidden border border-border shadow-sm"
      style={{ borderLeft: `4px solid ${sideColor}` }}
    >
      {/* Collapsed header — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left p-4 hover:bg-subtle/40 transition"
      >
        {/* Row 1: company + ticker LEFT / badge + trash + chevron RIGHT */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">
              {companyLabel}
            </h3>
            <span className="text-[12px] text-muted-foreground shrink-0">{tickerLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.06em]"
              style={{ background: `var(--${badge.tone}-soft)`, color: `var(--${badge.tone})` }}
            >
              {badge.label}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onDelete(); } }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft transition cursor-pointer"
              aria-label="Supprimer l'alerte"
            >
              <Trash2 className="w-4 h-4" />
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {/* Row 2: timestamp */}
        <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(a.sent_at)}</p>

        {/* Row 3: titre (French Claude title) */}
        {titre && (
          <p className="text-[13px] font-bold text-foreground leading-snug mt-2 line-clamp-2">
            {titre}
          </p>
        )}

        {/* Row 4: content summary */}
        {summary && (
          <p className="text-[12px] text-muted-foreground leading-snug mt-1.5 line-clamp-3">
            {summary}
          </p>
        )}
      </button>

      {/* Expandable analysis */}
      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

            {/* Impact court / long terme global */}
            {(a.impact_short_term_pct != null || a.impact_long_term_pct != null) && (
              <div className="grid grid-cols-2 gap-2">
                {a.impact_short_term_pct != null && (
                  <ImpactPctBox label="Court terme · 48h" value={a.impact_short_term_pct} />
                )}
                {a.impact_long_term_pct != null && (
                  <ImpactPctBox label="Long terme" value={a.impact_long_term_pct} />
                )}
              </div>
            )}

            {/* 1. IMPACT SUR VOTRE POSITION */}
            {pos && (
              <section className="space-y-2">
                <SectionLabel>Impact sur votre position</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3 space-y-0.5" style={{ background: "var(--success-soft)" }}>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Votre position
                    </p>
                    <p className="text-[14px] font-bold text-foreground">
                      {pos.quantity.toLocaleString("fr-FR")} {pos.quantity > 1 ? "titres" : "titre"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Valeur {formatEuro(pos.position_value)}
                    </p>
                    {pos.gain_loss_percent != null && (
                      <p
                        className="text-[12px] font-semibold mt-0.5"
                        style={{ color: pos.gain_loss_euros >= 0 ? "var(--success)" : "var(--danger)" }}
                      >
                        {pos.gain_loss_euros >= 0 ? "+" : ""}{formatEuro(pos.gain_loss_euros)} ({fmtPct(pos.gain_loss_percent)})
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl p-3 bg-subtle space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Portefeuille
                    </p>
                    <p className="text-[14px] font-bold text-foreground">
                      {formatEuro(pos.portfolio_value)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Poids {pos.position_weight_percent != null ? fmtPct(pos.position_weight_percent, false) : "—"}
                    </p>
                    {a.impact_portfolio_percent != null && (
                      <p
                        className="text-[12px] font-semibold mt-0.5"
                        style={{ color: a.impact_portfolio_percent >= 0 ? "var(--success)" : "var(--danger)" }}
                      >
                        Impact {fmtPct(a.impact_portfolio_percent)}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 2. SCÉNARIOS COURT TERME 48H */}
            {(a.scenario_optimiste || a.scenario_neutre || a.scenario_pessimiste) && (
              <section className="space-y-2">
                <SectionLabel>Scénarios court terme · 48h</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  <ScenarioBox tone="success" label="Optimiste"  s={a.scenario_optimiste} />
                  <ScenarioBox tone="warning" label="Neutre"     s={a.scenario_neutre} />
                  <ScenarioBox tone="danger"  label="Pessimiste" s={a.scenario_pessimiste} />
                </div>
              </section>
            )}

            {/* 3. CORRÉLATIONS DIRECTES */}
            {(a.correlations_directes?.length ?? 0) > 0 && (
              <section className="space-y-2">
                <SectionLabel>Corrélations directes</SectionLabel>
                <CorrelationList items={a.correlations_directes!} />
              </section>
            )}

            {/* 4. CORRÉLATIONS INDIRECTES */}
            {(a.correlations_indirectes?.length ?? 0) > 0 && (
              <section className="space-y-2">
                <SectionLabel>Corrélations indirectes</SectionLabel>
                <CorrelationList items={a.correlations_indirectes!} />
              </section>
            )}

            {/* 5. RÉACTION DE LA COMMUNAUTÉ */}
            <CommunityReaction alertId={a.id} ticker={tickerLabel} />

            {/* 6. SOURCE LINK */}
            {a.source_url && (
              <div className="flex justify-end pt-1">
                <a
                  href={a.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition underline-offset-2 hover:underline"
                >
                  Lire la source →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ImpactPctBox({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="rounded-xl p-3 bg-subtle">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p
        className="text-[16px] font-bold mt-1"
        style={{ color: positive ? "var(--success)" : "var(--danger)" }}
      >
        {fmtPct(value)}
      </p>
    </div>
  );
}

function ScenarioBox({ tone, label, s }: { tone: "success" | "warning" | "danger"; label: string; s: Scenario }) {
  return (
    <div
      className="rounded-xl bg-subtle overflow-hidden"
      style={{ borderTop: `3px solid var(--${tone})` }}
    >
      <div className="p-2.5 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: `var(--${tone})` }}>
          {label}
        </p>
        {typeof s?.impact_percent === "number" && (
          <p className="text-[14px] font-bold text-foreground">
            {fmtPct(s.impact_percent)}
          </p>
        )}
        {s?.description && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">{s.description}</p>
        )}
        {typeof s?.probabilite === "number" && (
          <p className="text-[10px] text-muted-foreground">
            Probabilité {fmtPct(s.probabilite, false)}
          </p>
        )}
        {s?.base_historique && (
          <p className="text-[10px] text-muted-foreground italic leading-snug line-clamp-2">
            {s.base_historique}
          </p>
        )}
      </div>
    </div>
  );
}

function CorrelationList({ items }: { items: Correlation[] }) {
  return (
    <ul className="rounded-xl bg-subtle divide-y divide-border overflow-hidden">
      {items.map((c, i) => {
        const positive = (c.impact_percent ?? 0) >= 0;
        return (
          <li key={i} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: positive ? "var(--success)" : "var(--danger)" }}
              />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {c.company ?? "—"}
                  {c.ticker && (
                    <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">{c.ticker}</span>
                  )}
                </p>
                {c.reason && <p className="text-[11px] text-muted-foreground truncate">{c.reason}</p>}
              </div>
            </div>
            {typeof c.impact_percent === "number" && (
              <span
                className="shrink-0 text-[12px] font-bold"
                style={{ color: positive ? "var(--success)" : "var(--danger)" }}
              >
                {fmtPct(c.impact_percent)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CommunityReaction({ alertId, ticker }: { alertId: string; ticker: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<Stats>(`/api/alerts/${alertId}/react`);
      setStats(d);
    } catch { /* silent */ }
  }, [alertId]);

  useEffect(() => { load(); }, [load]);

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
    // optimistic update
    setStats((prev) => {
      if (!prev) return prev;
      const counts = { ...prev.counts };
      if (prev.my_action && prev.my_action !== action) {
        counts[prev.my_action] = Math.max(0, counts[prev.my_action] - 1);
      }
      if (prev.my_action !== action) counts[action] = (counts[action] ?? 0) + 1;
      const total = counts.conserve + counts.renforce + counts.vend;
      return { counts, total, my_action: action };
    });
    setBusy(true);
    try {
      await apiFetch(`/api/alerts/${alertId}/react`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Action impossible");
      await load();
    } finally { setBusy(false); }
  };

  const total = stats?.total ?? 0;
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);

  return (
    <section className="space-y-2 pt-1">
      <SectionLabel>Réaction de la communauté</SectionLabel>
      <p className="text-[11px] text-muted-foreground">
        {total === 0
          ? `Soyez le premier à réagir parmi les détenteurs de ${ticker}`
          : `${total} détenteur${total > 1 ? "s" : ""} de cette position ${total > 1 ? "ont" : "a"} réagi`}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <ReactionBtn label="Je conserve" active={stats?.my_action === "conserve"} pct={pct(stats?.counts.conserve ?? 0)} onClick={() => send("conserve")} disabled={busy} />
        <ReactionBtn label="Je renforce" active={stats?.my_action === "renforce"} pct={pct(stats?.counts.renforce ?? 0)} onClick={() => send("renforce")} disabled={busy} />
        <ReactionBtn label="Je vends"    active={stats?.my_action === "vend"}     pct={pct(stats?.counts.vend ?? 0)}     onClick={() => send("vend")}     disabled={busy} />
      </div>
    </section>
  );
}

function ReactionBtn({
  label, active, pct, onClick, disabled,
}: { label: string; active: boolean; pct: number; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-lg px-2 py-2.5 text-[11px] font-semibold transition border ${active ? "bg-foreground text-primary-foreground border-foreground" : "bg-surface border-border text-foreground hover:border-foreground/40"} disabled:opacity-60`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 ${active ? "bg-primary-foreground/15" : "bg-foreground/[0.06]"}`}
        style={{ width: `${pct}%` }}
      />
      <span className="relative flex flex-col items-center gap-0.5">
        <span>{label}</span>
        <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>{pct}%</span>
      </span>
    </button>
  );
}
