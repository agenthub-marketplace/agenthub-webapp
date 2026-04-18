import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { portfolio, analyses } from "@/lib/demo-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PRISM" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("Romain");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/" });
      else if (data.session.user.email) {
        const local = data.session.user.email.split("@")[0];
        setName(local.charAt(0).toUpperCase() + local.slice(1));
      }
    });
  }, [navigate]);

  return (
    <AppShellWithNav>
      {/* Top bar */}
      <header className="bg-surface px-5 pt-6 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground leading-tight">Bonjour,</p>
          <h1 className="text-[22px] font-bold text-foreground leading-tight">{name}</h1>
        </div>
        <button className="relative">
          <Bell size={22} className="text-foreground" strokeWidth={1.75} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-foreground rounded-full" />
        </button>
      </header>

      <div className="px-4 space-y-2.5 pt-1">
        {/* Portfolio card */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valeur du portefeuille</p>
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

        {/* Risk card */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Risque du portefeuille</p>
            <p className="text-[12px] font-bold uppercase tracking-wider text-warning">Modéré</p>
          </div>
          <div className="flex gap-1.5 mt-4">
            <span className="flex-1 h-1.5 rounded-full bg-border" />
            <span className="flex-1 h-1.5 rounded-full bg-warning" />
            <span className="flex-1 h-1.5 rounded-full bg-border" />
          </div>
          <div className="flex justify-between mt-2 text-[11px]">
            <span className="text-muted-foreground">Faible</span>
            <span className="text-warning font-medium">Modéré</span>
            <span className="text-muted-foreground">Élevé</span>
          </div>
        </section>

        {/* Analyses */}
        <section className="pt-3">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[16px] font-bold text-foreground">Analyses récentes</h2>
            <button className="text-[12px] text-muted-foreground">Voir tout</button>
          </div>
          <div className="space-y-2.5">
            {analyses.map((a) => (
              <article key={a.ticker} className="bg-surface border border-border rounded-[14px] flex overflow-hidden">
                <div className={`w-1 ${a.color === "danger" ? "bg-danger" : a.color === "warning" ? "bg-warning" : "bg-success"}`} />
                <div className="flex-1 p-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-foreground leading-tight">{a.ticker}</p>
                      <p className="text-[12px] text-muted-foreground">{a.company}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{a.time}</p>
                  </div>
                  <p className="mt-2 text-[12px] text-foreground leading-[1.5]">{a.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShellWithNav>
  );
}
