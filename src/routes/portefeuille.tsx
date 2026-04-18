import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Link2, Trash2, Pencil, X } from "lucide-react";
import { AppShellWithNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch, formatEuro } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/portefeuille")({
  head: () => ({ meta: [{ title: "Portefeuille — PRISM" }] }),
  component: Portefeuille,
});

type Position = {
  id: string;
  ticker: string;
  company: string;
  name: string | null;
  sector: string | null;
  geography: string | null;
  quantity: number;
  purchase_price: number | null;
  current_price: number | null;
  isin: string | null;
  source: string;
};

function Portefeuille() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/" });
      return;
    }
    try {
      const d = await apiFetch<{ items: Position[]; totalValue: number }>("/api/portfolio");
      setPositions(d.items);
      setTotalValue(d.totalValue);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
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

  // Sector / geography aggregations
  const aggregate = (key: "sector" | "geography") => {
    const buckets = new Map<string, number>();
    positions.forEach((p) => {
      const v = Number(p.current_price ?? p.purchase_price ?? 0) * Number(p.quantity);
      const k = (p[key] ?? "Autre") || "Autre";
      buckets.set(k, (buckets.get(k) ?? 0) + v);
    });
    const total = Array.from(buckets.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(buckets.entries())
      .map(([name, v]) => ({ name, pct: Math.round((v / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  };

  const sectors = aggregate("sector");
  const geos = aggregate("geography");

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
      <header className="bg-surface px-5 pt-14 pb-5 flex items-center justify-between">
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
          {loading ? (
            <Skeleton className="h-9 w-40 mt-2" />
          ) : (
            <p className="text-[34px] font-bold text-foreground mt-2 leading-none">
              {totalValue > 0 ? formatEuro(totalValue) : "€ 0"}
            </p>
          )}
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

        {!loading && positions.length > 0 && (
          <>
            <AllocCard title="Exposition sectorielle" items={sectors} />
            <AllocCard title="Exposition géographique" items={geos} />
          </>
        )}

        <section className="pt-3">
          <h2 className="text-[16px] font-bold text-foreground mb-2.5">Mes positions</h2>
          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-[14px]" />)}
            </div>
          ) : positions.length === 0 ? (
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
                    <PositionLogo ticker={p.ticker} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">{p.name ?? p.company}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.quantity} titres{p.sector ? ` · ${p.sector}` : ""}{p.source === "tink" ? " · Tink" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-foreground">{formatEuro(value)}</p>
                    </div>
                    <button onClick={() => setEditing(p)} className="ml-2 text-muted-foreground active:text-foreground" aria-label="Modifier">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => remove(p.id)} className="ml-1 text-muted-foreground active:text-danger" aria-label="Supprimer">
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
      {editing && <EditPositionModal position={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </AppShellWithNav>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1 w-full bg-border rounded-full mt-1.5 overflow-hidden">
      <div className="h-full bg-foreground rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Module-level cache so we don't refetch logos on re-renders.
const logoCache = new Map<string, string | null>();

function PositionLogo({ ticker }: { ticker: string }) {
  const [logo, setLogo] = useState<string | null>(() => logoCache.get(ticker) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (logoCache.has(ticker)) {
      setLogo(logoCache.get(ticker) ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await apiFetch<{ logo: string | null }>(
          `/api/stocks/logo?symbol=${encodeURIComponent(ticker)}`,
        );
        if (cancelled) return;
        logoCache.set(ticker, d.logo);
        setLogo(d.logo);
      } catch {
        if (!cancelled) {
          logoCache.set(ticker, null);
          setLogo(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-10 h-10 rounded-full object-contain bg-white border border-border"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center border border-border">
      <span className="text-[12px] font-bold text-foreground">{ticker.slice(0, 4)}</span>
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

type StockSuggestion = {
  symbol: string;
  displaySymbol: string;
  name: string;
  geography: string | null;
};

function AddPositionModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [geography, setGeography] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const lastQueryRef = useRef("");

  useEffect(() => {
    const q = name.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    lastQueryRef.current = q;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await apiFetch<{ results: StockSuggestion[] }>(
          `/api/stocks/search?q=${encodeURIComponent(q)}`,
        );
        // Ignore if user kept typing
        if (lastQueryRef.current !== q) return;
        setSuggestions(d.results ?? []);
        setShowSug(true);
      } catch {
        // Silent — autocomplete is best-effort
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [name]);

  const pickSuggestion = async (s: StockSuggestion) => {
    setName(s.name);
    setTicker(s.displaySymbol || s.symbol);
    if (s.geography) setGeography(s.geography);
    setShowSug(false);
    // Enrich with sector via profile endpoint
    try {
      const d = await apiFetch<{
        profile: { sector: string | null; geography: string | null; ticker: string };
      }>(`/api/stocks/profile?symbol=${encodeURIComponent(s.symbol)}`);
      if (d.profile?.sector) setSector(d.profile.sector);
      if (d.profile?.geography) setGeography(d.profile.geography);
      if (d.profile?.ticker) setTicker(d.profile.ticker);
    } catch {
      // best-effort
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/portfolio", {
        method: "POST",
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          name,
          sector: sector || null,
          geography: geography || null,
          quantity: Number(quantity),
          buy_price: price ? Number(price) : null,
        }),
      });
      toast.success("Position ajoutée");
      onAdded();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
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
          <div className="relative">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSug(true)}
              placeholder="Nom de l'entreprise (ex: TotalEnergies)"
              className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground"
              autoComplete="off"
            />
            {showSug && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-60 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={`${s.symbol}-${s.displaySymbol}`}
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-subtle border-b border-border last:border-0"
                  >
                    <p className="text-[13px] font-bold text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.displaySymbol}{s.geography ? ` · ${s.geography}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <p className="absolute right-3 top-3.5 text-[11px] text-muted-foreground">…</p>
            )}
          </div>
          <input required value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ticker (ex: TTE.PA)" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Secteur (optionnel)" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <select value={geography} onChange={(e) => setGeography(e.target.value)} className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground text-foreground">
            <option value="">Géographie (optionnel)</option>
            <option value="Europe">Europe</option>
            <option value="États-Unis">États-Unis</option>
            <option value="Asie">Asie</option>
            <option value="Autre">Autre</option>
          </select>
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

function EditPositionModal({
  position,
  onClose,
  onSaved,
}: {
  position: Position;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ticker, setTicker] = useState(position.ticker ?? "");
  const [name, setName] = useState(position.name ?? position.company ?? "");
  const [sector, setSector] = useState(position.sector ?? "");
  const [geography, setGeography] = useState(position.geography ?? "");
  const [isin, setIsin] = useState(position.isin ?? "");
  const [quantity, setQuantity] = useState(String(position.quantity ?? ""));
  const [price, setPrice] = useState(
    position.purchase_price != null ? String(position.purchase_price) : "",
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/portfolio/${position.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          name,
          sector: sector || null,
          geography: geography || null,
          isin: isin || null,
          quantity: Number(quantity),
          buy_price: price === "" ? null : Number(price),
        }),
      });
      toast.success("Position mise à jour");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[393px] bg-surface rounded-t-[24px] p-5 pb-8 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-bold text-foreground">Modifier la position</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-subtle flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-2.5">
          <input required value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ticker" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'entreprise" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <input value={isin} onChange={(e) => setIsin(e.target.value)} placeholder="ISIN (optionnel)" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Secteur (optionnel)" className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          <select value={geography} onChange={(e) => setGeography(e.target.value)} className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground text-foreground">
            <option value="">Géographie (optionnel)</option>
            <option value="Europe">Europe</option>
            <option value="États-Unis">États-Unis</option>
            <option value="Asie">Asie</option>
            <option value="Autre">Autre</option>
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <input required type="number" step="0.0001" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantité" className="h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix unitaire (€)" className="h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground" />
          </div>
          <button type="submit" disabled={saving} className="w-full h-12 bg-foreground text-primary-foreground rounded-xl font-semibold text-[14px] disabled:opacity-60">
            {saving ? "..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </div>
  );
}
