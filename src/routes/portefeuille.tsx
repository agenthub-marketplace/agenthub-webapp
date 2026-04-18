import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Link2, Trash2, X } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { sectors, geo } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/portefeuille")({
  head: () => ({ meta: [{ title: "Portefeuille — PRISM" }] }),
  component: Portefeuille,
});

type Position = {
  id: string;
  ticker: string;
  company: string;
  sector: string | null;
  quantity: number;
  purchase_price: number | null;
  current_price: number | null;
  source: string;
};

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
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      navigate({ to: "/" });
      return;
    }
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erreur de chargement");
      return;
    }
    setPositions((data ?? []) as Position[]);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Detect Tink callback (?code=... on this page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    (async () => {
      toast.loading("Connexion à votre banque…", { id: "tink" });
      try {
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch("/api/tink/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ code }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur Tink");
        toast.success(`${json.imported ?? 0} position(s) importée(s)`, { id: "tink" });
        window.history.replaceState({}, "", "/portefeuille");
        load();
      } catch (e: any) {
        toast.error(e.message ?? "Erreur Tink", { id: "tink" });
      }
    })();
  }, [load]);

  const totalValue = positions.reduce((sum, p) => {
    const price = p.current_price ?? p.purchase_price ?? 0;
    return sum + Number(price) * Number(p.quantity);
  }, 0);

  const importTink = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/tink/init", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur Tink");
      window.location.href = json.url;
    } catch (e: any) {
      toast.error(e.message ?? "Erreur Tink");
      setImporting(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("positions").delete().eq("id", id);
    if (error) return toast.error("Erreur suppression");
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AppShellWithNav>
      <header className="bg-surface px-5 pt-10 pb-5 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-foreground">Portefeuille</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center active:scale-95 transition"
          aria-label="Ajouter une position"
        >
          <Plus size={18} className="text-foreground" strokeWidth={2} />
        </button>
      </header>

      <div className="px-4 space-y-2.5 pt-3">
        <section className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valeur totale</p>
          <p className="text-[34px] font-bold text-foreground mt-2 leading-none">
            {totalValue > 0 ? `€ ${totalValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}` : "€ 0"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-2">{positions.length} position(s)</p>
        </section>

        <button
          onClick={importTink}
          disabled={importing}
          className="w-full bg-foreground text-primary-foreground rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold text-[14px] active:scale-[0.99] transition disabled:opacity-60"
        >
          <Link2 size={18} />
          {importing ? "Connexion…" : "Importer mon portefeuille"}
        </button>

        <AllocCard title="Exposition sectorielle" items={sectors} />
        <AllocCard title="Exposition géographique" items={geo} />

        <section className="pt-3">
          <h2 className="text-[16px] font-bold text-foreground mb-2.5">Mes positions</h2>
          {positions.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-6 text-center">
              <p className="text-[13px] text-muted-foreground">Aucune position pour le moment.</p>
              <p className="text-[12px] text-muted-foreground mt-1">Ajoutez-en une avec « + » ou importez via Tink.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {positions.map((p) => {
                const value = Number(p.current_price ?? p.purchase_price ?? 0) * Number(p.quantity);
                return (
                  <article key={p.id} className="bg-surface border border-border rounded-[14px] p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-subtle flex items-center justify-center">
                      <span className="text-[12px] font-bold text-foreground">{p.ticker.slice(0, 4)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">{p.company}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.quantity} titres{p.sector ? ` · ${p.sector}` : ""}{p.source === "tink" ? " · Tink" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-foreground">€ {value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</p>
                    </div>
                    <button onClick={() => remove(p.id)} className="ml-2 text-muted-foreground active:text-danger" aria-label="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showAdd && <AddPositionModal onClose={() => setShowAdd(false)} onAdded={load} />}
    </AppShellWithNav>
  );
}

function AddPositionModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [ticker, setTicker] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const { error } = await supabase.from("positions").insert({
      user_id: session.session.user.id,
      ticker: ticker.toUpperCase(),
      company,
      sector: sector || null,
      quantity: Number(quantity),
      purchase_price: price ? Number(price) : null,
      current_price: price ? Number(price) : null,
      source: "manual",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Position ajoutée");
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[393px] bg-surface rounded-t-[24px] p-5 pb-8 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-bold text-foreground">Ajouter une position</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-2.5">
          <input required value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ticker (ex: TTE)" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <input required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom de l'entreprise" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Secteur (optionnel)" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <div className="grid grid-cols-2 gap-2.5">
            <input required type="number" step="0.0001" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantité" className="h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix unitaire (€)" className="h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          </div>
          <button type="submit" disabled={saving} className="w-full h-12 bg-foreground text-primary-foreground rounded-xl font-semibold text-[14px] disabled:opacity-60">
            {saving ? "..." : "Ajouter"}
          </button>
        </form>
      </div>
    </div>
  );
}
