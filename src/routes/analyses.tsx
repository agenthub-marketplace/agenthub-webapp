import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";

export const Route = createFileRoute("/analyses")({
  head: () => ({ meta: [{ title: "Analyses — PRISM" }] }),
  component: Analyses,
});

function Analyses() {
  return (
    <AppShellWithNav>
      <header className="bg-surface px-5 pt-6 pb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-foreground">Analyses</h1>
        <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
          <SlidersHorizontal size={16} className="text-foreground" />
        </button>
      </header>

      <div className="px-4 space-y-2.5">
        {/* Filter pills */}
        <div className="flex gap-2 pt-1 pb-2">
          <button className="px-4 h-8 rounded-full bg-foreground text-primary-foreground text-[12px] font-medium">Toutes</button>
          <button className="px-4 h-8 rounded-full border border-border text-muted-foreground text-[12px]">Urgentes</button>
          <button className="px-4 h-8 rounded-full border border-border text-muted-foreground text-[12px]">Non lues</button>
        </div>

        {/* Expanded card — TotalEnergies */}
        <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
          <div className="w-1 bg-danger" />
          <div className="flex-1 p-[18px] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-foreground leading-tight">TotalEnergies</h3>
                <p className="text-[12px] text-muted-foreground">TTE · Énergie · CAC 40</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>URGENT</span>
                <span className="text-[11px] text-muted-foreground">Il y a 30min</span>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground leading-[1.6]">
              Le baril de Brent bondit +8,4% suite aux tensions en mer Rouge. Impact direct sur les marges TotalEnergies. Les analystes anticipent une révision haussière des prévisions Q2.
            </p>

            {/* Position impact split */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: "var(--success-soft)" }}>
                <p className="text-[10px] uppercase tracking-wide text-success font-semibold">Votre position</p>
                <p className="text-[15px] font-bold text-success mt-1">+€ 81</p>
                <p className="text-[10px] text-success/80">42 titres · +3,2%</p>
              </div>
              <div className="rounded-xl p-3 bg-subtle">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Impact portefeuille</p>
                <p className="text-[15px] font-bold text-foreground mt-1">+0,19%</p>
                <p className="text-[10px] text-muted-foreground">sur valeur totale</p>
              </div>
            </div>

            {/* Scenarios */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Scénarios · Court terme 48h</p>
              <div className="grid grid-cols-3 gap-2">
                <ScenarioCard color="success" label="Optimiste" perf="+12%" prob="35%" />
                <ScenarioCard color="muted" label="Neutre" perf="+5%" prob="45%" />
                <ScenarioCard color="danger" label="Pessimiste" perf="-8%" prob="20%" />
              </div>
            </div>

            {/* Correlations */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Corrélations directes</p>
              <div className="border border-border rounded-xl divide-y divide-border">
                {[
                  { dot: "danger", name: "Engie", sector: "Énergie", pct: "+4,1%" },
                  { dot: "warning", name: "Vinci", sector: "Industrie", pct: "+1,8%" },
                  { dot: "success", name: "Air Liquide", sector: "Chimie", pct: "+0,6%" },
                ].map((c) => (
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

            {/* Investors */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Réaction · 1 243 profils similaires</p>
              <div className="border border-border rounded-xl p-3 space-y-3">
                <ReactionRow label="Conservé" pct={58} colorClass="bg-foreground" textClass="text-foreground" />
                <ReactionRow label="Renforcé" pct={31} colorClass="bg-success" textClass="text-success" />
                <ReactionRow label="Vendu" pct={11} colorClass="bg-danger" textClass="text-danger" />
              </div>
            </div>
          </div>
        </article>

        {/* Collapsed cards */}
        <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
          <div className="w-1 bg-warning" />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14px] font-bold text-foreground">LVMH</p>
                <p className="text-[11px] text-muted-foreground">LVMH Moët Hennessy</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Il y a 2h</p>
            </div>
            <p className="mt-2 text-[12px] text-foreground leading-[1.5]">
              Ralentissement du luxe en Asie confirmé. Pression sur les ventes Q2, analystes divisés sur l'impact annuel.
            </p>
          </div>
        </article>

        <article className="bg-surface border border-border rounded-2xl flex overflow-hidden">
          <div className="w-1 bg-success" />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14px] font-bold text-foreground">BNP</p>
                <p className="text-[11px] text-muted-foreground">BNP Paribas</p>
              </div>
              <p className="text-[11px] text-muted-foreground">Il y a 4h</p>
            </div>
            <p className="mt-2 text-[12px] text-foreground leading-[1.5]">
              BCE maintient ses taux stables. BNP bénéficie d'un contexte favorable sur ses marges nettes d'intérêt.
            </p>
          </div>
        </article>
      </div>
    </AppShellWithNav>
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
