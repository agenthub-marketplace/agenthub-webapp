import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Plus, Link2, Trash2, Pencil, X, ArrowUp, ArrowDown } from "lucide-react";
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
  exchange: string | null;
  quantity: number;
  purchase_price: number | null;
  current_price: number | null;
  isin: string | null;
  source: string;
  logo_url: string | null;
};

type Quote = { price: number | null; change: number | null; changePct: number | null; stale?: boolean; source?: "quote" | "candle" | "exchange-prefix" | "none" };
type AddedPositionPayload = { item: Position; quote: Quote | null };

function toQuoteFromAssetPrice(data: {
  price?: number | null;
  change?: number | null;
  change_percent?: number | null;
}): Quote {
  const price = typeof data.price === "number" ? data.price : null;
  const changePct = typeof data.change_percent === "number" ? data.change_percent : null;
  const derivedChange =
    typeof data.change === "number"
      ? data.change
      : price != null && changePct != null && changePct > -100
        ? price - price / (1 + changePct / 100)
        : null;

  return {
    price,
    change: derivedChange,
    changePct,
    source: "exchange-prefix",
  };
}

function Portefeuille() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      navigate({ to: "/" });
      return;
    }
    try {
      const d = await apiFetch<{
        items: Position[];
        totalValue: number;
        quotes?: Record<string, Quote>;
      }>("/api/portfolio");
      setPositions(d.items);
      setTotalValue(d.totalValue);
      // Server now returns live quotes alongside positions — seed them so
      // totals & per-position variations are correct on the first render
      // (including any position that was just added).
      if (d.quotes) setQuotes((prev) => ({ ...prev, ...d.quotes }));
      // Notify other listeners (dashboard, etc.) that portfolio data changed
      window.dispatchEvent(new CustomEvent("portfolio:changed"));
    } catch (e: any) {
      toast.error(e.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch real-time quotes whenever positions change
  useEffect(() => {
    if (positions.length === 0) {
      setQuotes({});
      return;
    }
    const uniquePositions = Array.from(
      new Map(
        positions
          .filter((p) => p.ticker)
          .map((p) => [p.ticker, p]),
      ).values(),
    );
    if (uniquePositions.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        uniquePositions.map(async (position) => {
          try {
            const params = new URLSearchParams({ ticker: position.ticker });
            if (position.exchange) params.set("exchange", position.exchange);

            const data = await apiFetch<{
              price?: number | null;
              change?: number | null;
              change_percent?: number | null;
            }>(`/api/assets/price?${params.toString()}`);

            return [position.ticker, toQuoteFromAssetPrice(data)] as const;
          } catch {
            return [position.ticker, { price: null, change: null, changePct: null, source: "none" as const }] as const;
          }
        }),
      );

      if (!cancelled) {
        setQuotes(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [positions]);

  // Live totals derived from real quotes (fallback to purchase_price / current_price)
  const { liveTotal, dayChangeAbs, dayChangePct } = useMemo(() => {
    let total = 0;
    let prev = 0;
    for (const p of positions) {
      const q = quotes[p.ticker];
      const price = q?.price ?? p.current_price ?? p.purchase_price ?? 0;
      const qty = Number(p.quantity ?? 0);
      const value = Number(price) * qty;
      total += value;
      const change = q?.change ?? 0;
      prev += (Number(price) - Number(change)) * qty;
    }
    const abs = total - prev;
    const pct = prev > 0 ? (abs / prev) * 100 : 0;
    return { liveTotal: total, dayChangeAbs: abs, dayChangePct: pct };
  }, [positions, quotes]);


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

  // Sector / geography aggregations (use live quote price when available)
  const aggregate = (key: "sector" | "geography") => {
    const buckets = new Map<string, number>();
    positions.forEach((p) => {
      const liveP = quotes[p.ticker]?.price;
      const v = Number(liveP ?? p.current_price ?? p.purchase_price ?? 0) * Number(p.quantity);
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
    window.dispatchEvent(new CustomEvent("portfolio:changed"));
  };

  return (
    <AppShellWithNav>
      <header className="page-header flex items-center justify-between">
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
              {liveTotal > 0 ? formatEuro(liveTotal) : totalValue > 0 ? formatEuro(totalValue) : "€ 0"}
            </p>
          )}
          {!loading && liveTotal > 0 && Math.abs(dayChangeAbs) > 0.001 && (
            <div className={`mt-2 flex items-center gap-1 text-[12px] font-semibold ${dayChangeAbs >= 0 ? "text-success" : "text-danger"}`}>
              {dayChangeAbs >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              <span>
                {dayChangeAbs >= 0 ? "+" : ""}{formatEuro(dayChangeAbs)} ({dayChangeAbs >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%) aujourd'hui
              </span>
            </div>
          )}
          
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
          <h2 className="text-[16px] font-bold text-foreground mb-2.5">
            Mes positions{!loading && ` (${positions.length})`}
          </h2>
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
                const q = quotes[p.ticker];
                const livePrice = Number(q?.price ?? p.current_price ?? p.purchase_price ?? 0);
                const qty = Number(p.quantity);
                const value = livePrice * qty;
                const pct = q?.changePct;
                const hasDayPct = typeof pct === "number" && !Number.isNaN(pct);
                const dayUp = hasDayPct && pct >= 0;

                // Performance vs cost basis
                const buy = p.purchase_price != null ? Number(p.purchase_price) : null;
                const hasPerf = buy != null && buy > 0 && q?.price != null;
                const perfAbs = hasPerf ? (livePrice - buy) * qty : 0;
                const perfPct = hasPerf ? ((livePrice - buy) / buy) * 100 : 0;
                const perfUp = perfAbs >= 0;

                return (
                  <article key={p.id} className="bg-surface border border-border rounded-[14px] p-3 flex items-center gap-3">
                    <PositionLogo ticker={p.ticker} companyName={p.name ?? p.company} initialLogo={p.logo_url} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">{p.name ?? p.company}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {qty} titres
                        {q?.price ? ` · ${formatEuro(q.price)}/titre` : ""}
                        {p.sector ? ` · ${p.sector}` : ""}
                        {p.source === "tink" ? " · Tink" : ""}
                        {q?.stale ? " · Données différées" : ""}
                        {q && q.source === "none" ? " · Cours indisponible (marché EU non couvert)" : ""}
                      </p>
                      {hasPerf && (
                        <p className={`text-[11px] font-semibold mt-0.5 ${perfUp ? "text-success" : "text-danger"}`}>
                          {perfUp ? "+" : ""}{formatEuro(perfAbs)} ({perfUp ? "+" : ""}{perfPct.toFixed(2)}%) vs achat
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-foreground">{formatEuro(value)}</p>
                      {hasDayPct && (
                        <div className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${dayUp ? "text-success" : "text-danger"}`}>
                          {dayUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          <span>{dayUp ? "+" : ""}{pct.toFixed(2)}%</span>
                        </div>
                      )}
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

      {showAdd && (
        <AddPositionModal
          onClose={() => setShowAdd(false)}
          onAdded={async ({ item, quote }) => {
            setPositions((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
            if (quote) {
              setQuotes((prev) => ({
                ...prev,
                [item.ticker]: {
                  price: quote.price ?? item.current_price ?? null,
                  change: quote.change ?? null,
                  changePct: quote.changePct ?? null,
                },
              }));
            }
            window.dispatchEvent(new CustomEvent("portfolio:changed"));
            await load();
          }}
        />
      )}
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

// Known company → website-domain mapping for Clearbit logo fallback.
// Falls back to "<lowercased-name>.com" when the company isn't listed.
const COMPANY_DOMAIN: Record<string, string> = {
  lvmh: "lvmh.com",
  "moët hennessy louis vuitton": "lvmh.com",
  hermès: "hermes.com",
  hermes: "hermes.com",
  totalenergies: "totalenergies.com",
  total: "totalenergies.com",
  bnp: "bnpparibas.com",
  "bnp paribas": "bnpparibas.com",
  "société générale": "societegenerale.com",
  "societe generale": "societegenerale.com",
  "air liquide": "airliquide.com",
  "l'oreal": "loreal.com",
  "l'oréal": "loreal.com",
  loreal: "loreal.com",
  airbus: "airbus.com",
  sanofi: "sanofi.com",
  axa: "axa.com",
  kering: "kering.com",
  vinci: "vinci.com",
  orange: "orange.com",
  danone: "danone.com",
  pernod: "pernod-ricard.com",
  "pernod ricard": "pernod-ricard.com",
};

function clearbitDomainFor(companyName: string | null | undefined): string | null {
  if (!companyName) return null;
  const norm = companyName.toLowerCase().replace(/\s+/g, " ").trim();
  if (COMPANY_DOMAIN[norm]) return COMPANY_DOMAIN[norm];
  // Try first significant word + .com (cheap heuristic).
  const firstWord = norm.split(/[\s,.()-]+/)[0];
  if (firstWord && firstWord.length >= 3) return `${firstWord}.com`;
  return null;
}

function PositionLogo({
  ticker,
  companyName,
  initialLogo,
}: {
  ticker: string;
  companyName?: string | null;
  initialLogo?: string | null;
}) {
  const seed = initialLogo ?? logoCache.get(ticker) ?? null;
  const [logo, setLogo] = useState<string | null>(seed);
  // Track which fallback step we're on: 0 = primary, 1 = clearbit, 2 = initials.
  const [fallbackStep, setFallbackStep] = useState(0);

  useEffect(() => {
    if (initialLogo) {
      logoCache.set(ticker, initialLogo);
      setLogo(initialLogo);
      setFallbackStep(0);
      return;
    }
    if (logoCache.has(ticker)) {
      setLogo(logoCache.get(ticker) ?? null);
      setFallbackStep(0);
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
        setFallbackStep(0);
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
  }, [ticker, initialLogo]);

  const handleError = () => {
    if (fallbackStep === 0) {
      const domain = clearbitDomainFor(companyName);
      if (domain) {
        setLogo(`https://logo.clearbit.com/${domain}`);
        setFallbackStep(1);
        return;
      }
    }
    setFallbackStep(2);
  };

  // Step 0/1: try the current logo URL with onError fallback.
  if (logo && fallbackStep < 2) {
    return (
      <img
        src={logo}
        alt=""
        loading="lazy"
        onError={handleError}
        className="w-10 h-10 rounded-full object-contain bg-white border border-border"
      />
    );
  }

  // No primary logo → try Clearbit directly before showing initials.
  if (fallbackStep === 0) {
    const domain = clearbitDomainFor(companyName);
    if (domain) {
      return (
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt=""
          loading="lazy"
          onError={handleError}
          className="w-10 h-10 rounded-full object-contain bg-white border border-border"
        />
      );
    }
  }

  // Final fallback: initials circle.
  const initials = (companyName ?? ticker).slice(0, 4).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center border border-border">
      <span className="text-[12px] font-bold text-foreground">{initials}</span>
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
  name: string;
  ticker: string;
  exchange: string;
  asset_type: string;
  security_type: string;
  sector: string;
  geography: string;
};

function AddPositionModal({ onClose, onAdded }: { onClose: () => void; onAdded: (payload: AddedPositionPayload) => Promise<void> | void }) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [geography, setGeography] = useState("");
  const [exchange, setExchange] = useState("");
  const [assetType, setAssetType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Autocomplete state — driven by name OR ticker input
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const lastQueryRef = useRef("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    lastQueryRef.current = q;
    const t = setTimeout(async () => {
      setSearching(true);
      console.log("[asset-search] → sending query:", q);
      try {
        const d = await apiFetch<{ results: StockSuggestion[] }>(
          "/api/assets/search",
          {
            method: "POST",
            body: JSON.stringify({ query: q }),
          },
        );
        console.log("[asset-search] ← response for", q, "results:", d.results?.length ?? 0, d);
        if (lastQueryRef.current !== q) return;
        setSuggestions(d.results ?? []);
        setShowSug(true);
      } catch (err) {
        console.error("[asset-search] error for", q, err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const pickSuggestion = (s: StockSuggestion) => {
    setName(s.name);
    setTicker(s.ticker);
    setExchange(s.exchange);
    setAssetType(s.asset_type);
    setSector(s.sector || "Autre");
    setGeography(s.geography || "Autre");
    setShowSug(false);
    setSuggestions([]);
    setSearchQuery(s.name);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = await apiFetch<AddedPositionPayload>("/api/portfolio", {
        method: "POST",
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          name,
          sector: sector || null,
          geography: geography || null,
          exchange: exchange || null,
          asset_type: assetType || null,
          quantity: Number(quantity),
          buy_price: price ? Number(price) : null,
        }),
      });
      await onAdded(payload);
      toast.success("Position ajoutée");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground";

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
          {/* Single search input — name OR ticker, debounced 2+ chars */}
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSug(true);
              }}
              onFocus={() => suggestions.length > 0 && setShowSug(true)}
              placeholder="Rechercher un actif (nom ou ticker)"
              className={inputCls}
              autoComplete="off"
            />
            {showSug && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-72 overflow-auto">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={`${s.ticker}-${s.exchange}`}
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-subtle border-b border-border last:border-0"
                  >
                    <p className="text-[14px] font-bold text-foreground truncate">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[12px] text-muted-foreground">{s.ticker}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-subtle text-foreground">
                        {s.exchange}
                      </span>
                      {s.asset_type && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                          {s.asset_type}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searching && (
              <p className="absolute right-3 top-3.5 text-[11px] text-muted-foreground">…</p>
            )}
          </div>

          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'entreprise"
            className={inputCls}
            autoComplete="off"
          />
          <input
            required
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Ticker"
            className={inputCls}
            autoComplete="off"
          />
          <input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Secteur (optionnel)"
            className={inputCls}
          />
          <select
            value={geography}
            onChange={(e) => setGeography(e.target.value)}
            className={`${inputCls} text-foreground appearance-none`}
          >
            <option value="">Géographie</option>
            <option value="Europe - France">Europe - France</option>
            <option value="Europe - Allemagne">Europe - Allemagne</option>
            <option value="Europe - Royaume-Uni">Europe - Royaume-Uni</option>
            <option value="Europe - Pays-Bas">Europe - Pays-Bas</option>
            <option value="États-Unis">États-Unis</option>
            <option value="Asie">Asie</option>
            <option value="Autre">Autre</option>
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              required
              type="number"
              step="0.0001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantité"
              className="h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Prix unitaire"
              className="h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-foreground text-primary-foreground rounded-xl font-semibold text-[14px] disabled:opacity-60"
          >
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
