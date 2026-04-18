import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch, formatEuro, timeAgo } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PRISM" }] }),
  component: Dashboard,
});

type Alert = {
  id: string;
  title: string | null;
  content: string | null;
  urgency: number;
  is_read: boolean;
  sent_at: string;
  isins: string[] | null;
};

type RiskLevel = "Faible" | "Modéré" | "Élevé";

type DashboardData = {
  totalValue: number;
  riskScore: number;
  riskLevel: RiskLevel;
  recentAlerts: Alert[];
};

function riskTone(level: RiskLevel): { tone: "success" | "warning" | "danger"; bar: 0 | 1 | 2 } {
  if (level === "Faible") return { tone: "success", bar: 0 };
  if (level === "Modéré") return { tone: "warning", bar: 1 };
  return { tone: "danger", bar: 2 };
}

function alertTone(urgency: number): "danger" | "warning" | "success" {
  if (urgency >= 3) return "danger";
  if (urgency === 2) return "warning";
  return "success";
}

function Dashboard() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/" });
        return;
      }
      if (sess.session.user.email) {
        const local = sess.session.user.email.split("@")[0];
        setName(local.charAt(0).toUpperCase() + local.slice(1));
      }
      try {
        const d = await apiFetch<DashboardData>("/api/dashboard");
        setData(d);
      } catch (e: any) {
        toast.error(e.message ?? "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const risk = data ? riskTone(data.riskLevel) : null;
  const hasUnread = (data?.recentAlerts ?? []).some((a) => !a.is_read);

  return (
    <AppShellWithNav>
      <header className="bg-surface px-5 pt-14 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground leading-tight">Bonjour,</p>
          <h1 className="text-[22px] font-bold text-foreground leading-tight">{name || "—"}</h1>
        </div>
        <Link to="/analyses" search={{ filter: "non-lues" }} className="relative" aria-label="Notifications non lues">
          <Bell size={22} className="text-foreground" strokeWidth={1.75} />
          {hasUnread && <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full" />}
        </Link>
      </header>

      <div className="px-4 space-y-2.5 pt-3">
        {/* Portfolio card */}
        <Link to="/portefeuille" className="block bg-surface border border-border rounded-2xl p-5 active:scale-[0.99] transition">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valeur du portefeuille</p>
          {loading ? (
            <Skeleton className="h-9 w-40 mt-2" />
          ) : (
            <p className="text-[34px] font-bold text-foreground mt-2 leading-none">
              {formatEuro(data?.totalValue ?? 0)}
            </p>
          )}
          <p className="text-[12px] text-muted-foreground mt-3">
            {data && data.totalValue === 0 ? "Aucune position. Ajoutez-en depuis Portefeuille." : "Vue d'ensemble de votre portefeuille"}
          </p>
        </Link>

        {/* Risk card */}
        <Link to="/analyses" search={{ filter: "urgentes" }} className="block bg-surface border border-border rounded-2xl p-5 active:scale-[0.99] transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Risque du portefeuille</p>
            {loading || !risk ? (
              <Skeleton className="h-3 w-16" />
            ) : (
              <p className={`text-[12px] font-bold uppercase tracking-wider text-${risk.tone}`}>{risk.label}</p>
            )}
          </div>
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  risk && risk.bar === i
                    ? risk.tone === "success"
                      ? "bg-success"
                      : risk.tone === "warning"
                      ? "bg-warning"
                      : "bg-danger"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[11px]">
            <span className="text-muted-foreground">Faible</span>
            <span className="text-muted-foreground">Modéré</span>
            <span className="text-muted-foreground">Élevé</span>
          </div>
        </Link>

        {/* Analyses */}
        <section className="pt-3">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[16px] font-bold text-foreground">Analyses récentes</h2>
            <Link to="/analyses" search={{ filter: "toutes" }} className="text-[12px] text-muted-foreground active:text-foreground">
              Voir tout
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-[14px]" />)}
            </div>
          ) : (data?.recentAlerts ?? []).length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-6 text-center">
              <p className="text-[13px] text-muted-foreground">Aucune alerte pour le moment.</p>
              <p className="text-[12px] text-muted-foreground mt-1">Les analyses apparaîtront ici dès qu'un événement impactera vos positions.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data!.recentAlerts.map((a) => {
                const tone = alertTone(a.urgency);
                const filter = tone === "danger" ? "urgentes" : "toutes";
                const ticker = a.isins?.[0] ?? "—";
                return (
                  <Link
                    key={a.id}
                    to="/analyses"
                    search={{ filter }}
                    className="bg-surface border border-border rounded-[14px] flex overflow-hidden active:scale-[0.99] transition"
                  >
                    <div className={`w-1 ${tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-success"}`} />
                    <div className="flex-1 p-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[14px] font-bold text-foreground leading-tight">{ticker}</p>
                          <p className="text-[12px] text-muted-foreground">{a.title ?? "Analyse"}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{timeAgo(a.sent_at)}</p>
                      </div>
                      {a.content && <p className="mt-2 text-[12px] text-foreground leading-[1.5] line-clamp-3">{a.content}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShellWithNav>
  );
}
