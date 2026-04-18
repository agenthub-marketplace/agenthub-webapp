import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reglages")({
  head: () => ({ meta: [{ title: "Réglages — PRISM" }] }),
  component: Reglages,
});

function Reglages() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("romain@prism.app");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/" });
      else if (data.session.user.email) setEmail(data.session.user.email);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <AppShellWithNav>
      <header className="bg-surface px-5 pt-10 pb-5">
        <h1 className="text-[22px] font-bold text-foreground">Réglages</h1>
      </header>

      <div className="px-4 space-y-2.5 pt-3">
        {/* Profil */}
        <section className="bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-full bg-subtle flex items-center justify-center">
            <span className="text-[16px] font-bold text-foreground">RC</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-foreground">Romain Calco</p>
            <p className="text-[12px] text-muted-foreground truncate">{email}</p>
          </div>
          <span className="px-2.5 py-1 bg-subtle rounded-full text-[10px] font-bold text-muted-foreground tracking-wide">PLAN FREE</span>
        </section>

        {/* Abonnement */}
        <section className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Abonnement</p>
          <p className="text-[16px] font-bold text-foreground mt-1">PRISM Pro · 15€/mois</p>
          <ul className="mt-4 space-y-2.5">
            {["Alertes illimitées", "Corrélations indirectes", "Scénarios avancés", "Intelligence collective", "Support prioritaire"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13px] text-foreground">
                <span className="w-4 h-4 rounded-full bg-success-soft flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-success" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button className="w-full mt-5 h-11 bg-foreground text-primary-foreground rounded-xl font-semibold text-[14px]">Passer à Pro</button>
        </section>

        {/* Préférences */}
        <PrefCard
          title="Préférences"
          items={[
            { label: "Notifications push", sub: "Alertes en temps réel" },
            { label: "Sensibilité des alertes", sub: "Modérée" },
            { label: "Brokers connectés", sub: "Aucun broker lié" },
            { label: "Langue", sub: "Français" },
          ]}
        />

        {/* Légal */}
        <PrefCard
          title="Légal"
          items={[
            { label: "Confidentialité & RGPD", sub: "Vos données" },
            { label: "Conditions d'utilisation", sub: "v1.0" },
            { label: "Disclaimer financier", sub: "Information non-conseil" },
          ]}
        />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-surface border border-border rounded-2xl py-4 text-center text-[13px] font-bold text-danger"
        >
          Se déconnecter
        </button>
      </div>
    </AppShellWithNav>
  );
}

function PrefCard({ title, items }: { title: string; items: { label: string; sub: string }[] }) {
  return (
    <section className="bg-surface border border-border rounded-2xl p-5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <ul>
        {items.map((it, i) => (
          <li
            key={it.label}
            className={`flex items-center justify-between py-3 ${i < items.length - 1 ? "border-b border-subtle" : ""}`}
          >
            <div>
              <p className="text-[13px] text-foreground">{it.label}</p>
              <p className="text-[11px] text-muted-foreground">{it.sub}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </li>
        ))}
      </ul>
    </section>
  );
}
