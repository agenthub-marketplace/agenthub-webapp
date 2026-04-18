import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShellWithNav } from "@/components/BottomNav";

type Filter = "toutes" | "urgentes" | "non-lues";

export const Route = createFileRoute("/analyses")({
  validateSearch: (s: Record<string, unknown>): { filter?: Filter } => ({
    filter: (s.filter as Filter) || undefined,
  }),
  head: () => ({ meta: [{ title: "Analyses — PRISM" }] }),
  component: Analyses,
});

type Analysis = {
  id: string;
  ticker: string;
  company: string;
  meta: string;
  time: string;
  badge?: { label: string; tone: "danger" | "warning" | "success" };
  side: "danger" | "warning" | "success";
  read: boolean;
  urgent: boolean;
  summary: string;
  position?: { perf: string; qty: string; impact: string };
  scenarios?: { color: "success" | "muted" | "danger"; label: string; perf: string; prob: string }[];
  correlations?: { dot: "danger" | "warning" | "success"; name: string; sector: string; pct: string }[];
  reactions?: { label: string; pct: number; colorClass: string; textClass: string }[];
};

const ANALYSES: Analysis[] = [
  {
    id: "tte",
    ticker: "TotalEnergies",
    company: "TTE · Énergie · CAC 40",
    meta: "TTE",
    time: "Il y a 30min",
    badge: { label: "URGENT", tone: "danger" },
    side: "danger",
    read: false,
    urgent: true,
    summary:
      "Le baril de Brent bondit +8,4% suite aux tensions en mer Rouge. Impact direct sur les marges TotalEnergies. Les analystes anticipent une révision haussière des prévisions Q2.",
    position: { perf: "+€ 81", qty: "42 titres · +3,2%", impact: "+0,19%" },
    scenarios: [
      { color: "success", label: "Optimiste", perf: "+12%", prob: "35%" },
      { color: "muted", label: "Neutre", perf: "+5%", prob: "45%" },
      { color: "danger", label: "Pessimiste", perf: "-8%", prob: "20%" },
    ],
    correlations: [
      { dot: "danger", name: "Engie", sector: "Énergie", pct: "+4,1%" },
      { dot: "warning", name: "Vinci", sector: "Industrie", pct: "+1,8%" },
      { dot: "success", name: "Air Liquide", sector: "Chimie", pct: "+0,6%" },
    ],
    reactions: [
      { label: "Conservé", pct: 58, colorClass: "bg-foreground", textClass: "text-foreground" },
      { label: "Renforcé", pct: 31, colorClass: "bg-success", textClass: "text-success" },
      { label: "Vendu", pct: 11, colorClass: "bg-danger", textClass: "text-danger" },
    ],
  },
  {
    id: "asml",
    ticker: "ASML",
    company: "ASML Holding · Semi · AEX",
    meta: "ASML",
    time: "Il y a 1h",
    badge: { label: "URGENT", tone: "danger" },
    side: "danger",
    read: false,
    urgent: true,
    summary:
      "Nouvelles restrictions US sur les exportations vers la Chine. Risque de baisse de 15-20% du backlog 2025 pour ASML. Volatilité attendue à l'ouverture.",
    position: { perf: "-€ 142", qty: "12 titres · -2,1%", impact: "-0,33%" },
    scenarios: [
      { color: "success", label: "Optimiste", perf: "-3%", prob: "25%" },
      { color: "muted", label: "Neutre", perf: "-9%", prob: "50%" },
      { color: "danger", label: "Pessimiste", perf: "-18%", prob: "25%" },
    ],
    correlations: [
      { dot: "danger", name: "STMicro", sector: "Semi", pct: "-3,2%" },
      { dot: "warning", name: "Infineon", sector: "Semi", pct: "-1,4%" },
    ],
    reactions: [
      { label: "Conservé", pct: 47, colorClass: "bg-foreground", textClass: "text-foreground" },
      { label: "Renforcé", pct: 12, colorClass: "bg-success", textClass: "text-success" },
      { label: "Vendu", pct: 41, colorClass: "bg-danger", textClass: "text-danger" },
    ],
  },
  {
    id: "lvmh",
    ticker: "LVMH",
    company: "LVMH Moët Hennessy",
    meta: "LVMH",
    time: "Il y a 2h",
    side: "warning",
    read: false,
    urgent: false,
    summary:
      "Ralentissement du luxe en Asie confirmé. Pression sur les ventes Q2, analystes divisés sur l'impact annuel.",
  },
  {
    id: "bnp",
    ticker: "BNP",
    company: "BNP Paribas",
    meta: "BNP",
    time: "Il y a 4h",
    side: "success",
    read: true,
    urgent: false,
    summary:
      "BCE maintient ses taux stables. BNP bénéficie d'un contexte favorable sur ses marges nettes d'intérêt.",
  },
  {
    id: "sanofi",
    ticker: "Sanofi",
    company: "SAN · Santé · CAC 40",
    meta: "SAN",
    time: "Il y a 6h",
    side: "success",
    read: false,
    urgent: false,
    summary:
      "Phase 3 positive sur traitement immuno-oncologie. Pic de ventes potentiel estimé à 4 Mds€ d'ici 2028.",
  },
];

function Analyses() {
  const search = useSearch({ from: "/analyses" });
  const [filter, setFilter] = useState<Filter>(search.filter ?? "toutes");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "urgentes") return ANALYSES.filter((a) => a.urgent);
    if (filter === "non-lues") return ANALYSES.filter((a) => !a.read);
    return ANALYSES;
  }, [filter]);

  // Tinted header per filter to visually differentiate
  const headerTint =
    filter === "urgentes"
      ? "bg-danger-soft"
      : filter === "non-lues"
      ? "bg-warning-soft"
      : "bg-surface";

  const filterLabel =
    filter === "urgentes"
      ? "Alertes urgentes nécessitant votre attention"
      : filter === "non-lues"
      ? "Nouvelles analyses non consultées"
      : "Toutes les analyses récentes";

  return (
    <AppShellWithNav>
      <header className={`px-5 pt-10 pb-5 transition-colors ${headerTint}`}>
        <h1 className="text-[22px] font-bold text-foreground">Analyses</h1>
        <p className="text-[12px] text-muted-foreground mt-1">{filterLabel}</p>
      </header>

      <div className="px-4 space-y-2.5 pt-3">
        <div className="flex gap-2 pt-1 pb-2">
          <Pill active={filter === "toutes"} onClick={() => setFilter("toutes")}>Toutes</Pill>
          <Pill active={filter === "urgentes"} onClick={() => setFilter("urgentes")}>
            Urgentes
            <span className="ml-1.5 opacity-70">{ANALYSES.filter((a) => a.urgent).length}</span>
          </Pill>
          <Pill active={filter === "non-lues"} onClick={() => setFilter("non-lues")}>
            Non lues
            <span className="ml-1.5 opacity-70">{ANALYSES.filter((a) => !a.read).length}</span>
          </Pill>
        </div>

        {filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center">
            <p className="text-[13px] text-muted-foreground">Aucune analyse pour ce filtre.</p>
          </div>
        )}

        {filtered.map((a, i) => {
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
        })}
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

function ExpandedCard({ a }: { a: Analysis }) {
  const sideColor = a.side === "danger" ? "bg-danger" : a.side === "warning" ? "bg-warning" : "bg-success";
  return (
    <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
      <div className={`w-1 ${sideColor}`} />
      <div className="flex-1 p-[18px] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-foreground leading-tight">{a.ticker}</h3>
            <p className="text-[12px] text-muted-foreground">{a.company}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {a.badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide" style={{ background: `var(--${a.badge.tone}-soft)`, color: `var(--${a.badge.tone})` }}>
                {a.badge.label}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{a.time}</span>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground leading-[1.6]">{a.summary}</p>

        {a.position && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3" style={{ background: "var(--success-soft)" }}>
              <p className="text-[10px] uppercase tracking-wide text-success font-semibold">Votre position</p>
              <p className="text-[15px] font-bold text-success mt-1">{a.position.perf}</p>
              <p className="text-[10px] text-success/80">{a.position.qty}</p>
            </div>
            <div className="rounded-xl p-3 bg-subtle">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Impact portefeuille</p>
              <p className="text-[15px] font-bold text-foreground mt-1">{a.position.impact}</p>
              <p className="text-[10px] text-muted-foreground">sur valeur totale</p>
            </div>
          </div>
        )}

        {a.scenarios && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Scénarios · Court terme 48h</p>
            <div className="grid grid-cols-3 gap-2">
              {a.scenarios.map((s) => <ScenarioCard key={s.label} {...s} />)}
            </div>
          </div>
        )}

        {a.correlations && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Corrélations directes</p>
            <div className="border border-border rounded-xl divide-y divide-border">
              {a.correlations.map((c) => (
                <div key={c.name} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot === "danger" ? "bg-danger" : c.dot === "warning" ? "bg-warning" : "bg-success"}`} />
                    <span className="text-[13px] text-foreground font-medium">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">· {c.sector}</span>
                  </div>
                  <span className={`text-[12px] font-bold ${c.dot === "danger" ? "text-danger" : c.dot === "warning" ? "text-warning" : "text-success"}`}>{c.pct}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {a.reactions && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Réaction · 1 243 profils similaires</p>
            <div className="border border-border rounded-xl p-3 space-y-3">
              {a.reactions.map((r) => <ReactionRow key={r.label} {...r} />)}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function CollapsedCard({ a }: { a: Analysis }) {
  const sideColor = a.side === "danger" ? "bg-danger" : a.side === "warning" ? "bg-warning" : "bg-success";
  return (
    <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
      <div className={`w-1 ${sideColor}`} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] font-bold text-foreground">{a.ticker}</p>
            <p className="text-[11px] text-muted-foreground">{a.company}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">{a.time}</p>
        </div>
        <p className="mt-2 text-[12px] text-foreground leading-[1.5]">{a.summary}</p>
      </div>
    </article>
  );
}

function ScenarioCard({ color, label, perf, prob }: { color: "success" | "muted" | "danger"; label: string; perf: string; prob: string }) {
  const borderColor = color === "success" ? "var(--success)" : color === "danger" ? "var(--danger)" : "var(--muted-foreground)";
  const textClass = color === "success" ? "text-success" : color === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-xl bg-subtle p-2.5 border-t-[3px]" style={{ borderTopColor: borderColor }}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className={`text-[15px] font-bold mt-1 ${textClass}`}>{perf}</p>
      <p className="text-[10px] text-muted-foreground">Prob. {prob}</p>
    </div>
  );
}

function ReactionRow({ label, pct, colorClass, textClass }: { label: string; pct: number; colorClass: string; textClass: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-foreground">{label}</span>
        <span className={`font-bold ${textClass}`}>{pct}%</span>
      </div>
      <div className="h-1 w-full bg-border rounded-full mt-1 overflow-hidden">
        <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
