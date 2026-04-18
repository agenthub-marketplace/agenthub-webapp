import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { portfolio, sectors, geo, positions } from "@/lib/demo-data";

export const Route = createFileRoute("/portefeuille")({
  head: () => ({ meta: [{ title: "Portefeuille — PRISM" }] }),
  component: Portefeuille,
});

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1 w-full bg-border rounded-full mt-1.5 overflow-hidden">
      <div className="h-full bg-foreground rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

function AllocCard({ title, items }: { title: string; items: { name: string; pct: number }[] }) {
  return (
    <section className="bg-surface border border-border rounded-2xl p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.name}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-foreground">{s.name}</span>
              <span className="font-bold text-foreground">{s.pct}%</span>
            </div>
            <Bar pct={s.pct} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Portefeuille() {
  return (
    <AppShellWithNav>
      <header className="bg-surface px-5 pt-6 pb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-foreground">Portefeuille</h1>
        <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center">
          <Plus size={18} className="text-foreground" strokeWidth={2} />
        </button>
      </header>

      <div className="px-4 space-y-2.5 pt-1">
        <section className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valeur totale</p>
          <p className="text-[34px] font-bold text-foreground mt-2 leading-none">{portfolio.value}</p>
          <div className="flex gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-[12px] font-medium bg-success-soft text-success">{portfolio.monthChange}</span>
            <span className="px-3 py-1 rounded-full text-[12px] font-medium bg-subtle text-muted-foreground">{portfolio.todayChange}</span>
          </div>
          <div className="border-t border-border mt-4 pt-4 flex items-center justify-between text-[12px]">
            {portfolio.allocation.map((a) => (
              <div key={a.label} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${a.tone === "dark" ? "bg-foreground" : a.tone === "mid" ? "bg-muted-foreground" : "bg-muted-strong"}`} />
                <span className="text-foreground">{a.label} <span className="text-muted-foreground">{a.pct}</span></span>
              </div>
            ))}
          </div>
        </section>

        <AllocCard title="Exposition sectorielle" items={sectors} />
        <AllocCard title="Exposition géographique" items={geo} />

        <section className="pt-3">
          <h2 className="text-[16px] font-bold text-foreground mb-2.5">Mes positions</h2>
          <div className="space-y-2.5">
            {positions.map((p) => (
              <article key={p.ticker} className="bg-surface border border-border rounded-[14px] p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-subtle flex items-center justify-center">
                  <span className="text-[12px] font-bold text-foreground">{p.ticker}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">{p.company}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.qty} · {p.sector}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-foreground">{p.value}</p>
                  <p className={`text-[12px] font-bold ${p.up ? "text-success" : "text-danger"}`}>{p.perf}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShellWithNav>
  );
}
