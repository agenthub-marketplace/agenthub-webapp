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

// Left-border color is driven ONLY by urgency.
// 1 = INFO green, 2 = ATTENTION orange, 3+ = URGENT red.
function impactSide(_impactShort: string | null, urgency?: number): "success" | "danger" | "warning" {
  if ((urgency ?? 1) >= 3) return "danger";
  if ((urgency ?? 1) === 2) return "warning";
  return "success";
  // legacy impact-based fallback removed
  const s = (_impactShort ?? "").toLowerCase().trim();
  if (s.startsWith("pos")) return "success";
  if (s.startsWith("neg") || s.startsWith("nég")) return "danger";
  return "warning";
}

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

function AlertCard({
  a, onDelete, onMarkRead,
}: { a: Alert; onDelete: () => void; onMarkRead: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && !a.is_read) onMarkRead(a.id);
      return next;
    });
  };
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
            <span className="text-[12px] text-muted-foreground shrink-0">{tickerLabel}</span>
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

            {/* 1. IMPACT SUR VOTRE POSITION — real values from user portfolio */}
            {pos && (
              <section className="space-y-2">
                <SectionLabel>Impact sur votre position</SectionLabel>
                <div className="rounded-xl border border-border bg-surface overflow-hidden">
                  <div className="grid grid-cols-2">
                    {/* Left: position — real current value & gain/loss vs purchase */}
                    <div
                      className="p-3 space-y-1"
                      style={{
                        borderLeft: `3px solid ${pos.gain_loss_euros >= 0 ? "var(--success)" : "var(--danger)"}`,
                        borderRight: "1px solid #F0F0F0",
                      }}
                    >
                      <p className="text-[10px] text-muted-foreground">Votre position</p>
                      <p className="text-[18px] font-bold text-foreground leading-none">
                        {formatEuro(pos.position_value)}
                      </p>
                      {pos.gain_loss_percent != null && (
                        <p
                          className="text-[11px] font-semibold"
                          style={{ color: pos.gain_loss_euros >= 0 ? "var(--success)" : "var(--danger)" }}
                        >
                          {pos.gain_loss_euros >= 0 ? "↑" : "↓"} {pos.gain_loss_euros >= 0 ? "+" : ""}{formatEuro(pos.gain_loss_euros)} ({fmtPct(pos.gain_loss_percent)})
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {pos.quantity.toLocaleString("fr-FR")} {pos.quantity > 1 ? "titres" : "titre"} · {formatEuro(pos.current_price)}
                      </p>
                    </div>
                    {/* Right: real total portfolio value (sum across all positions) */}
                    <div
                      className="p-3 space-y-1"
                      style={{ borderLeft: "3px solid var(--border)" }}
                    >
                      <p className="text-[10px] text-muted-foreground">Portefeuille global</p>
                      <p className="text-[18px] font-bold text-foreground leading-none">
                        {formatEuro(pos.portfolio_value)}
                      </p>
                      {pos.position_weight_percent != null && (
                        <p className="text-[11px] text-muted-foreground">
                          Poids {fmtPct(pos.position_weight_percent, false)} du total
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {formatEuro(pos.portfolio_value)} au total
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

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
          <p className="text-[10px]" style={{ color: "#AAA" }}>
            Prob. {fmtPct(proba, false)}
          </p>
        )}
        {s?.base_historique && (
          <p className="text-[9px] leading-snug line-clamp-2" style={{ color: "#CCC" }}>
            {s.base_historique}
          </p>
        )}
      </div>
    </div>
  );
}

function CorrelationList({ items }: { items: Correlation[] }) {
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
                    <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">{c.ticker}</span>
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
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const hasVoted = stats?.my_action != null;

  return (
    <section className="space-y-2 pt-1">
      <SectionLabel>Réaction · {total} profil{total === 1 ? "" : "s"} similaire{total === 1 ? "" : "s"}</SectionLabel>

      {!hasVoted ? (
        <>
          <p className="text-[12px] text-muted-foreground">Que faites-vous de cette position ?</p>
          <div className="grid grid-cols-3 gap-2">
            <VoteBtn label="Je conserve" onClick={() => send("conserve")} disabled={busy} />
            <VoteBtn label="Je renforce" onClick={() => send("renforce")} disabled={busy} />
            <VoteBtn label="Je vends"    onClick={() => send("vend")}     disabled={busy} />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <ResultBar label="Ont conservé" pct={pct(stats!.counts.conserve)} barColor="#111111" highlight={stats!.my_action === "conserve"} />
          <ResultBar label="Ont renforcé" pct={pct(stats!.counts.renforce)} barColor="var(--success)" highlight={stats!.my_action === "renforce"} />
          <ResultBar label="Ont vendu"    pct={pct(stats!.counts.vend)}     barColor="var(--danger)"  highlight={stats!.my_action === "vend"} />
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
