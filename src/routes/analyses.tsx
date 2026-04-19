import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch, timeAgo, formatEuro } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getAlertColors } from "@/lib/alert-colors";

type Filter = "toutes" | "urgentes" | "non-lues";
type Reaction = "conserve" | "renforce" | "vend" | "rien";

export const Route = createFileRoute("/analyses")({
  validateSearch: (s: Record<string, unknown>): { filter?: Filter; alertId?: string } => ({
    filter: (s.filter as Filter) || undefined,
    alertId: typeof s.alertId === "string" ? s.alertId : undefined,
  }),
  head: () => ({ meta: [{ title: "Analyses — PRISM" }] }),
  component: Analyses,
});

type Scenario = {
  description?: string | null;
  probabilite?: number | string | null;
  pourcentage?: number | string | null;
  impact_percent?: number | null;
  base_historique?: string | null;
} | null;
type Correlation = {
  company?: string | null;
  ticker?: string | null;
  raison?: string | null;
  reason?: string | null;
  impact_percent?: number | string | null;
  pourcentage?: number | string | null;
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
  scenario_optimiste_lt: Scenario;
  scenario_neutre_lt: Scenario;
  scenario_pessimiste_lt: Scenario;
  correlations_directes: Correlation[] | null;
  correlations_indirectes: Correlation[] | null;
  user_position: UserPosition | null;
};

type Stats = { counts: Record<Reaction, number>; total: number; my_action: Reaction | null };


function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[%\s+]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
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
            <AlertCard
              key={a.id}
              a={a}
              onDelete={() => setToDelete(a.id)}
              onMarkRead={markAsRead}
              autoOpen={search.alertId === a.id}
            />
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

function AlertCard({
  a, onDelete, onMarkRead, autoOpen,
}: { a: Alert; onDelete: () => void; onMarkRead: (id: string) => void; autoOpen?: boolean }) {
  const [open, setOpen] = useState(!!autoOpen);
  const cardRef = useRef<HTMLElement | null>(null);

  // When deep-linked via ?alertId=..., expand and scroll into view once.
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      if (!a.is_read) onMarkRead(a.id);
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && !a.is_read) onMarkRead(a.id);
      return next;
    });
  };
  const colors = getAlertColors(a.impact_short_term, a.urgency);
  const sideColor = colors.border.hex;
  const badge = colors.badge;
  const pos = a.user_position;
  const titre = (a.title ?? "").trim();
  // Derive company name: position → parse from title (e.g. "Apple : CA record..." → "Apple").
  const companyFromTitle = (() => {
    if (!titre) return "";
    const m = titre.match(/^([^:•\-—|]+?)\s*[:•\-—|]/);
    return (m?.[1] ?? "").trim();
  })();
  // Ticker MUST come from a real position match. `isins` contains ISIN codes
  // (e.g. US0378331005), not tickers — never display them as a ticker, and
  // never invent one from the title (e.g. "CA record" → "CA" was wrong).
  const tickerLabel = pos?.ticker ?? null;
  const companyLabel = pos?.company ?? (companyFromTitle || "Analyse");
  const summary = ((a.resume_fr ?? a.content) ?? "").trim();

  return (
    <article
      ref={cardRef}
      className="bg-surface rounded-2xl overflow-hidden border border-border shadow-sm"
      style={{ borderLeft: `4px solid ${sideColor}` }}
    >
      {/* Collapsed header — always visible, click to expand */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full text-left p-4 hover:bg-subtle/40 transition relative"
      >
        {/* Row 1: company + ticker LEFT / badge + trash + chevron RIGHT */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">
              {companyLabel}
            </h3>
            {tickerLabel && (
              <span className="text-[12px] text-muted-foreground shrink-0 uppercase">{tickerLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!a.is_read && (
              <span
                aria-label="Non lue"
                title="Non lue"
                className="rounded-full"
                style={{ width: 7, height: 7, background: sideColor }}
              />
            )}
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.06em]"
              style={{ background: badge.bg, color: badge.fg }}
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

      {/* Expandable analysis — display:none when collapsed to avoid mobile white-space bug */}
      {open && (
        <div>
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

            {/* 1. IMPACT — pondéré sur les 3 scénarios court terme */}
            {(() => {
              const scen = [
                { key: "opt", label: "Optimiste", s: a.scenario_optimiste },
                { key: "neu", label: "Neutre", s: a.scenario_neutre },
                { key: "pes", label: "Pessimiste", s: a.scenario_pessimiste },
              ];
              const rows = scen.map(({ key, label, s }) => ({
                key,
                label,
                pct: toNum(s?.pourcentage ?? s?.impact_percent),
                prob: toNum(s?.probabilite),
              }));
              let weightedPct: number | null = null;
              let probSum = 0;
              let acc = 0;
              for (const r of rows) {
                if (r.pct != null && r.prob != null) {
                  acc += r.pct * (r.prob / 100);
                  probSum += r.prob;
                }
              }
              if (probSum > 0) weightedPct = acc;

              const gain = pos && weightedPct != null
                ? pos.quantity * pos.current_price * (weightedPct / 100)
                : null;
              const portfolioValue = pos?.portfolio_value ?? 0;
              const adjustedPortfolio = gain != null ? portfolioValue + gain : portfolioValue;
              const portfolioImpactPct = gain != null && portfolioValue > 0
                ? (gain / portfolioValue) * 100
                : null;
              const gainPositive = (gain ?? 0) >= 0;
              const gainColor = gainPositive ? "var(--success)" : "var(--danger)";
              const portfPositive = (portfolioImpactPct ?? 0) >= 0;
              const portfColor = portfPositive ? "var(--success)" : "var(--danger)";

              const colorForPct = (n: number | null) =>
                n == null ? "#888888" : n >= 0 ? "var(--success)" : "var(--danger)";

              return (
                <section className="space-y-2">
                  <SectionLabel>Impact</SectionLabel>
                  <div className="rounded-xl border border-border bg-surface overflow-hidden">
                    <div className="grid grid-cols-2">
                      <div
                        className="p-3 space-y-1.5"
                        style={{
                          borderLeft: `3px solid ${pos ? gainColor : "#EBEBEB"}`,
                          borderRight: "1px solid #F0F0F0",
                        }}
                      >
                        <p className="text-[10px] text-muted-foreground">Impact sur votre position</p>
                        {pos ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">
                              {pos.quantity.toLocaleString("fr-FR")} {pos.quantity > 1 ? "actions" : "action"} · {formatEuro(pos.position_value)}
                            </p>
                            <p
                              className="text-[20px] font-bold leading-none"
                              style={{ color: gain != null ? gainColor : "#111111" }}
                            >
                              {gain != null
                                ? `${gainPositive ? "+" : "-"}${formatEuro(Math.abs(gain))}`
                                : "—"}
                            </p>
                            {weightedPct != null && (
                              <p className="text-[12px] font-semibold" style={{ color: gainColor }}>
                                {gainPositive ? "↑" : "↓"} {fmtPct(weightedPct)} estimé
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">Impact pondéré · 3 scénarios</p>

                            {weightedPct != null && (
                              <div
                                className="mt-1.5 rounded-md px-2 py-1.5 space-y-0.5"
                                style={{ background: "#F5F5F5" }}
                              >
                                <p className="text-[10px] text-muted-foreground">Détail pondération</p>
                                {rows.map((r) => {
                                  const contrib = r.pct != null && r.prob != null
                                    ? r.pct * (r.prob / 100)
                                    : null;
                                  return (
                                    <div key={r.key} className="flex items-baseline justify-between gap-2 text-[10px]">
                                      <span>
                                        <span className="text-foreground">{r.label} </span>
                                        <span style={{ color: colorForPct(r.pct) }} className="font-semibold">
                                          {fmtPct(r.pct)}
                                        </span>
                                      </span>
                                      <span className="text-muted-foreground">
                                        {r.prob != null ? `× ${Math.round(r.prob)}%` : "× —"}
                                        {contrib != null ? ` = ${fmtPct(contrib)}` : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Aucune position directe sur ce titre
                          </p>
                        )}
                      </div>
                      <div
                        className="p-3 space-y-1.5"
                        style={{ borderLeft: "3px solid #EBEBEB" }}
                      >
                        <p className="text-[10px] text-muted-foreground">Portefeuille global</p>
                        {portfolioValue > 0 ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">
                              Valeur actuelle {formatEuro(portfolioValue)}
                            </p>
                            <p className="text-[20px] font-bold leading-none" style={{ color: "#111111" }}>
                              {formatEuro(adjustedPortfolio)}
                            </p>
                            {portfolioImpactPct != null && (
                              <p className="text-[12px] font-semibold" style={{ color: portfColor }}>
                                {portfPositive ? "↑" : "↓"} {fmtPct(portfolioImpactPct)} du portefeuille
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">Valeur ajustée estimée</p>
                          </>
                        ) : <p className="text-[11px] text-muted-foreground">Valeur actuelle indisponible</p>}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* 2. SCÉNARIOS COURT TERME 48H */}
            {(a.scenario_optimiste || a.scenario_neutre || a.scenario_pessimiste) && (
              <section className="space-y-2">
                <SectionLabel>Scénarios · Court terme 48h</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  <ScenarioBox variant="optimiste"  label="Optimiste"  s={a.scenario_optimiste} />
                  <ScenarioBox variant="neutre"     label="Neutre"     s={a.scenario_neutre} />
                  <ScenarioBox variant="pessimiste" label="Pessimiste" s={a.scenario_pessimiste} />
                </div>
              </section>
            )}

            {/* 2b. SCÉNARIOS LONG TERME 6 MOIS */}
            {(a.scenario_optimiste_lt || a.scenario_neutre_lt || a.scenario_pessimiste_lt) && (
              <section className="space-y-2">
                <SectionLabel>Scénarios · Long terme 6 mois</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  <ScenarioBox variant="optimiste"  label="Optimiste"  s={a.scenario_optimiste_lt} />
                  <ScenarioBox variant="neutre"     label="Neutre"     s={a.scenario_neutre_lt} />
                  <ScenarioBox variant="pessimiste" label="Pessimiste" s={a.scenario_pessimiste_lt} />
                </div>
              </section>
            )}

            {/* 3. CORRÉLATIONS — collapsible single card */}
            {((a.correlations_directes?.length ?? 0) > 0 ||
              (a.correlations_indirectes?.length ?? 0) > 0) && (
              <CorrelationsBlock
                directes={a.correlations_directes ?? []}
                indirectes={a.correlations_indirectes ?? []}
              />
            )}

            {/* 5. RÉACTION DE LA COMMUNAUTÉ */}
            <CommunityReaction alertId={a.id} ticker={tickerLabel ?? ""} />

            {/* 6. SOURCE LINK */}
            {a.source_url && (
              <div className="flex justify-end pt-1">
                <a
                  href={a.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition underline underline-offset-2"
                >
                  Lire la source →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function CorrelationsBlock({
  directes,
  indirectes,
}: { directes: Correlation[]; indirectes: Correlation[] }) {
  const [open, setOpen] = useState(false);
  const [userTickers, setUserTickers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("positions").select("ticker, isin");
      if (cancelled) return;
      const set = new Set<string>();
      for (const p of data ?? []) {
        if (p.ticker) set.add(p.ticker.toUpperCase());
        if (p.isin) set.add(p.isin.toUpperCase());
      }
      setUserTickers(set);
    })();
    return () => { cancelled = true; };
  }, []);

  const inPortfolio = (c: Correlation) =>
    !!c.ticker && userTickers.has(c.ticker.toUpperCase());

  const matched = directes.filter(inPortfolio);
  const top = directes.slice(0, 3);
  const sectorCount = indirectes.length;
  const companyCount = directes.length;

  return (
    <section className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-full flex items-center justify-between p-3.5"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "var(--success)" }}
          />
          <span className="text-[13px] font-bold text-foreground">Corrélations</span>
          {(companyCount > 0 || sectorCount > 0) && (
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-[10px] text-muted-foreground"
              style={{ background: "#F5F5F5" }}
            >
              {companyCount} entreprise{companyCount > 1 ? "s" : ""} · {sectorCount} secteur{sectorCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
            {/* Sub 1: portfolio matches */}
            {directes.length > 0 && (
              <div className="space-y-2">
                <SectionLabel>Corrélations directes · Votre portefeuille</SectionLabel>
                {matched.length > 0 ? (
                  <CorrelationList items={matched} portfolioBadge />
                ) : (
                  <div
                    className="rounded-[10px] py-3 text-center text-[11px] text-muted-foreground"
                    style={{ background: "#FAFAFA" }}
                  >
                    Aucune corrélation directe significative sur votre portefeuille
                  </div>
                )}
              </div>
            )}

            {/* Sub 2: top impacted */}
            {top.length > 0 && (
              <div className="space-y-2">
                <SectionLabel>Corrélations directes · Top entreprises impactées</SectionLabel>
                <CorrelationList items={top} />
              </div>
            )}

            {/* Sub 3: sectors */}
            {indirectes.length > 0 && (
              <div className="space-y-2">
                <SectionLabel>Secteurs impactés</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  {indirectes.slice(0, 6).map((s, i) => (
                    <SectorBars key={i} c={s} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectorBars({ c }: { c: Correlation }) {
  const pct = toNum(c.pourcentage ?? c.impact_percent);
  const dir = (c.direction ?? "").toLowerCase();
  const positive = dir.includes("pos") || (dir === "" && (pct ?? 0) > 0);
  const negative = dir.includes("neg") || dir.includes("nég") || (dir === "" && (pct ?? 0) < 0);
  const neutral = !positive && !negative;

  // Intensity from |pct|: ≥5 = Fort (4 bars), ≥2 = Modéré (2), else Faible (1).
  const abs = Math.abs(pct ?? 0);
  const filled = abs >= 5 ? 4 : abs >= 2 ? 2 : abs > 0 ? 1 : 0;
  const intensityLabel = filled === 4 ? "Impact fort" : filled === 2 ? "Impact modéré" : filled === 1 ? "Impact faible" : "Impact neutre";
  const arrow = positive ? "↑" : negative ? "↓" : "";

  const palette = positive
    ? { full: "#2E7D32", empty: "#C8E6C9" }
    : negative
    ? { full: "#E53935", empty: "#FFCDD2" }
    : { full: "#F57C00", empty: "#FFE0B2" };

  const sectorName = c.raison ?? c.reason ?? c.company ?? "Secteur";

  return (
    <div className="rounded-[10px] border border-border bg-surface p-3 space-y-2">
      <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight">{sectorName}</p>
      <div className="flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="flex-1 rounded-[2px]"
            style={{ height: 6, background: i < filled ? palette.full : palette.empty }}
          />
        ))}
      </div>
      <p className="text-[10px] font-medium" style={{ color: palette.full }}>
        {intensityLabel} {arrow}
      </p>
    </div>
  );
}

function ScenarioBox({
  variant, label, s,
}: { variant: "optimiste" | "neutre" | "pessimiste"; label: string; s: Scenario }) {
  const styles = {
    optimiste:  { bg: "#F9FFF9", border: "#C8E6C9", text: "var(--success)", num: "var(--success)" },
    neutre:     { bg: "#FAFAFA", border: "#E0E0E0", text: "#666",            num: "#555" },
    pessimiste: { bg: "#FFF9F9", border: "#FFCDD2", text: "var(--danger)",  num: "var(--danger)" },
  }[variant];
  const pct = toNum(s?.pourcentage ?? s?.impact_percent);
  const proba = toNum(s?.probabilite);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <div className="p-2.5 space-y-1">
        <p
          className="text-[9px] uppercase tracking-[0.06em] font-bold"
          style={{ color: styles.text }}
        >
          {label}
        </p>
        {pct != null && (
          <p className="text-[16px] font-bold leading-tight" style={{ color: styles.num }}>
            {fmtPct(pct)}
          </p>
        )}
        {proba != null && (
          <p className="text-[10px]" style={{ color: "#888" }}>
            Prob. {fmtPct(proba, false)}
          </p>
        )}
        {(s?.description || s?.base_historique) && (
          <p className="text-[10px] leading-[1.5] line-clamp-3 pt-1" style={{ color: "#888" }}>
            {s?.description || s?.base_historique}
          </p>
        )}
      </div>
    </div>
  );
}

function CorrelationList({ items, portfolioBadge }: { items: Correlation[]; portfolioBadge?: boolean }) {
  return (
    <ul className="rounded-[10px] border border-border overflow-hidden bg-surface">
      {items.map((c, i) => {
        const pct = toNum(c.pourcentage ?? c.impact_percent);
        const dir = (c.direction ?? "").toLowerCase();
        const positive = dir.includes("pos") || (dir === "" && (pct ?? 0) >= 0);
        const dotColor = positive ? "var(--success)" : "var(--danger)";
        const last = i === items.length - 1;
        return (
          <li
            key={i}
            className="flex items-center justify-between gap-2 px-3 py-[9px]"
            style={!last ? { borderBottom: "1px solid #F5F5F5" } : undefined}
          >
            <div className="flex items-start gap-2 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                style={{ background: dotColor }}
              />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {c.company ?? "—"}
                  {c.ticker && (
                    <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">· {c.ticker}</span>
                  )}
                  {portfolioBadge && (
                    <span className="ml-1.5 text-[10px]" style={{ color: "var(--success)" }}>
                      · En portefeuille
                    </span>
                  )}
                </p>
                {(c.raison ?? c.reason) && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
                    {c.raison ?? c.reason}
                  </p>
                )}
              </div>
            </div>
            {pct != null && (
              <span
                className="shrink-0 text-[12px] font-bold"
                style={{ color: positive ? "var(--success)" : "var(--danger)" }}
              >
                {fmtPct(pct)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CommunityReaction({ alertId }: { alertId: string; ticker: string }) {
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
      const total = counts.conserve + counts.renforce + counts.vend + counts.rien;
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
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const hasVoted = stats?.my_action != null;

  return (
    <section className="space-y-2 pt-1">
      <SectionLabel>Réaction · {total} profil{total === 1 ? "" : "s"} similaire{total === 1 ? "" : "s"}</SectionLabel>

      {!hasVoted ? (
        <>
          <p className="text-[12px] text-muted-foreground">Que faites-vous de cette position ?</p>
          <div className="grid grid-cols-2 gap-2">
            <VoteBtn label="Je conserve" onClick={() => send("conserve")} disabled={busy} />
            <VoteBtn label="Je renforce" onClick={() => send("renforce")} disabled={busy} />
            <VoteBtn label="Je vends"    onClick={() => send("vend")}     disabled={busy} />
            <VoteBtn label="Je ne fais rien" onClick={() => send("rien")} disabled={busy} />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <ResultBar label="Ont conservé" pct={pct(stats!.counts.conserve)} barColor="#111111" highlight={stats!.my_action === "conserve"} />
          <ResultBar label="Ont renforcé" pct={pct(stats!.counts.renforce)} barColor="var(--success)" highlight={stats!.my_action === "renforce"} />
          <ResultBar label="Ont vendu"    pct={pct(stats!.counts.vend)}     barColor="var(--danger)"  highlight={stats!.my_action === "vend"} />
          <ResultBar label="N'ont rien fait" pct={pct(stats!.counts.rien)}  barColor="var(--muted-foreground)" highlight={stats!.my_action === "rien"} />
        </div>
      )}
    </section>
  );
}

function VoteBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-[10px] border border-border bg-surface px-2 py-2.5 text-[12px] font-medium text-foreground hover:border-foreground/40 transition disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ResultBar({
  label, pct, barColor, highlight,
}: { label: string; pct: number; barColor: string; highlight: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className={`text-[11px] ${highlight ? "font-bold text-foreground" : "text-muted-foreground"}`}>
          {label}
        </span>
        <span className={`text-[11px] tabular-nums ${highlight ? "font-bold text-foreground" : "text-muted-foreground"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F0F0F0" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor, opacity: highlight ? 1 : 0.5 }}
        />
      </div>
    </div>
  );
}
