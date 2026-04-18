import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch, timeAgo } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Filter = "toutes" | "urgentes" | "non-lues";

export const Route = createFileRoute("/analyses")({
  validateSearch: (s: Record<string, unknown>): { filter?: Filter } => ({
    filter: (s.filter as Filter) || undefined,
  }),
  head: () => ({ meta: [{ title: "Analyses — PRISM" }] }),
  component: Analyses,
});

type Alert = {
  id: string;
  title: string | null;
  content: string | null;
  urgency: number;
  is_read: boolean;
  sent_at: string;
  isins: string[] | null;
  impact_short_term: string | null;
  impact_long_term: string | null;
};

function tone(urgency: number): "danger" | "warning" | "success" {
  if (urgency >= 3) return "danger";
  if (urgency === 2) return "warning";
  return "success";
}

function badgeFor(urgency: number): { label: string; tone: "danger" | "warning" | "success" } {
  if (urgency >= 3) return { label: "URGENT", tone: "danger" };
  if (urgency === 2) return { label: "ATTENTION", tone: "warning" };
  return { label: "POSITIF", tone: "success" };
}

function Analyses() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/analyses" });
  const [filter, setFilter] = useState<Filter>(search.filter ?? "toutes");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (search.filter && search.filter !== filter) setFilter(search.filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.filter]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      try {
        const d = await apiFetch<{ alerts: Alert[] }>("/api/alerts");
        setAlerts(d.alerts);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    if (filter === "urgentes") return alerts.filter((a) => a.urgency >= 3);
    if (filter === "non-lues") return alerts.filter((a) => !a.is_read);
    return alerts;
  }, [filter, alerts]);

  const filterLabel =
    filter === "urgentes"
      ? "Alertes urgentes nécessitant votre attention"
      : filter === "non-lues"
      ? "Nouvelles analyses non consultées"
      : "Toutes les analyses récentes";

  const urgentCount = alerts.filter((a) => a.urgency >= 3).length;
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <AppShellWithNav>
      <header className="bg-surface px-5 pt-14 pb-5">
        <h1 className="text-[22px] font-bold text-foreground">Analyses</h1>
        <p className="text-[12px] text-muted-foreground mt-1">{filterLabel}</p>
      </header>

      <div className="px-4 space-y-2.5 pt-3">
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
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-[13px] text-muted-foreground">
              {alerts.length === 0 ? "Aucune alerte pour le moment." : "Aucune analyse pour ce filtre."}
            </p>
            {alerts.length === 0 && (
              <p className="text-[12px] text-muted-foreground mt-1">
                Les analyses apparaîtront ici dès qu'un événement impactera vos positions.
              </p>
            )}
          </div>
        ) : (
          filtered.map((a, i) => {
            const isExpanded = expandedId ? expandedId === a.id : i === 0;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setExpandedId(isExpanded ? "__none__" : a.id)}
                className="w-full text-left active:scale-[0.995] transition"
              >
                {isExpanded ? <ExpandedCard a={a} /> : <CollapsedCard a={a} />}
              </button>
            );
          })
        )}
      </div>
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

function ExpandedCard({ a }: { a: Alert }) {
  const side = tone(a.urgency);
  const sideColor = side === "danger" ? "bg-danger" : side === "warning" ? "bg-warning" : "bg-success";
  const badge = badgeFor(a.urgency);
  const ticker = a.isins?.[0] ?? "—";
  return (
    <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
      <div className={`w-1 ${sideColor}`} />
      <div className="flex-1 p-[18px] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-foreground leading-tight">{ticker}</h3>
            <p className="text-[12px] text-muted-foreground">{a.title ?? "Analyse"}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide" style={{ background: `var(--${badge.tone}-soft)`, color: `var(--${badge.tone})` }}>
              {badge.label}
            </span>
            <span className="text-[11px] text-muted-foreground">{timeAgo(a.sent_at)}</span>
          </div>
        </div>

        {a.content && <p className="text-[13px] text-muted-foreground leading-[1.6]">{a.content}</p>}

        {(a.impact_short_term || a.impact_long_term) && (
          <div className="grid grid-cols-2 gap-2">
            {a.impact_short_term && (
              <div className="rounded-xl p-3 bg-subtle">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Court terme</p>
                <p className="text-[12px] text-foreground mt-1 leading-snug">{a.impact_short_term}</p>
              </div>
            )}
            {a.impact_long_term && (
              <div className="rounded-xl p-3 bg-subtle">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Long terme</p>
                <p className="text-[12px] text-foreground mt-1 leading-snug">{a.impact_long_term}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function CollapsedCard({ a }: { a: Alert }) {
  const side = tone(a.urgency);
  const sideColor = side === "danger" ? "bg-danger" : side === "warning" ? "bg-warning" : "bg-success";
  const ticker = a.isins?.[0] ?? "—";
  return (
    <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
      <div className={`w-1 ${sideColor}`} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] font-bold text-foreground">{ticker}</p>
            <p className="text-[11px] text-muted-foreground">{a.title ?? "Analyse"}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{timeAgo(a.sent_at)}</p>
        </div>
        {a.content && <p className="mt-2 text-[12px] text-foreground leading-[1.5] line-clamp-2">{a.content}</p>}
      </div>
    </article>
  );
}
