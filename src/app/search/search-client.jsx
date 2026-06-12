'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronDown, Filter, Search, X } from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { AGENT_RUNTIME_TYPE_LABELS } from '@/lib/agent-contract';
import { formatCredits } from '@/lib/format-credits';
import { translate, useT } from '@/lib/i18n';

export default function SearchClient({ initialAgents = [], initialCategories = [], loadError = null, locale = null, profile = null }) {
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  const effectiveLang = locale || lang;
  const copy = (key, vars) => (locale ? translate(locale, key, vars) : t(key, vars));
  const queryParam = searchParams.get('q') ?? '';
  const [queryState, setQueryState] = useState(() => ({ source: queryParam, value: queryParam }));
  const query = queryState.source === queryParam ? queryState.value : queryParam;
  const setQuery = (value) => setQueryState({ source: queryParam, value });
  const [selectedCats, setSelectedCats] = useState([]);
  const [agentTypes, setAgentTypes] = useState([]);
  const [maxPrice, setMaxPrice] = useState([200]);
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [sort, setSort] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);

  const agentTypeOptions = [
    { id: 'llm_prompt', label: AGENT_RUNTIME_TYPE_LABELS.llm_prompt },
    { id: 'document_file', label: AGENT_RUNTIME_TYPE_LABELS.document_file },
    { id: 'workflow_automation', label: AGENT_RUNTIME_TYPE_LABELS.workflow_automation },
    { id: 'creator_endpoint', label: AGENT_RUNTIME_TYPE_LABELS.creator_endpoint },
    { id: 'static_guided', label: AGENT_RUNTIME_TYPE_LABELS.static_guided },
  ];

  const filtered = useMemo(() => {
    let result = [...initialAgents];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter((agent) =>
        [
          agent.name,
          agent.pitch,
          agent.category,
          agent.creator?.name,
          AGENT_RUNTIME_TYPE_LABELS[agent.contract?.runtimeType],
          agent.contract?.outputPromise?.summary,
          ...(agent.capabilities ?? []),
          ...(agent.requiredInputs ?? []),
          ...(agent.deliverables ?? []),
          ...(agent.limitations ?? []),
          ...(agent.contract?.outputPromise?.examples ?? []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (selectedCats.length) {
      result = result.filter((agent) => selectedCats.includes(agent.categoryId));
    }

    if (agentTypes.length) {
      result = result.filter((agent) => {
        const agentType = agent.contract?.runtimeType || 'static_guided';
        return agentTypes.includes(agentType);
      });
    }

    result = result.filter((agent) => agent.fromPrice === null || agent.fromPrice <= maxPrice[0]);

    if (certifiedOnly) {
      result = result.filter((agent) => agent.certified);
    }

    if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    else if (sort === 'priceAsc') result.sort((a, b) => (a.fromPrice ?? Number.MAX_SAFE_INTEGER) - (b.fromPrice ?? Number.MAX_SAFE_INTEGER));
    else if (sort === 'priceDesc') result.sort((a, b) => (b.fromPrice ?? -1) - (a.fromPrice ?? -1));
    else if (sort === 'rentals') result.sort((a, b) => b.rentals - a.rentals);

    return result;
  }, [initialAgents, query, selectedCats, agentTypes, maxPrice, certifiedOnly, sort]);

  const getAgentTypeLabel = (type) => agentTypeOptions.find((option) => option.id === type)?.label ?? type;

  const activeChips = [
    ...selectedCats.map((id) => ({
      id: `c-${id}`,
      label: initialCategories.find((category) => category.id === id)?.name,
      remove: () => setSelectedCats(selectedCats.filter((selected) => selected !== id)),
    })),
    ...agentTypes.map((type) => ({
      id: `type-${type}`,
      label: getAgentTypeLabel(type),
      remove: () => setAgentTypes(agentTypes.filter((selected) => selected !== type)),
    })),
    ...(maxPrice[0] < 200 ? [{ id: 'price', label: `${copy('srch.maxprice')} ${formatCredits(maxPrice[0])}`, remove: () => setMaxPrice([200]) }] : []),
    ...(certifiedOnly ? [{ id: 'cert', label: copy('srch.certifiedonly'), remove: () => setCertifiedOnly(false) }] : []),
  ].filter((chip) => chip.label);

  const resetAll = () => {
    setSelectedCats([]);
    setAgentTypes([]);
    setMaxPrice([200]);
    setCertifiedOnly(false);
  };

  const clearSearch = () => {
    setQuery('');
    resetAll();
  };

  const hasSearch = query.trim().length > 0;
  const resultLabel = filtered.length === 0
    ? hasSearch
      ? `Aucun résultat pour « ${query.trim()} »`
      : 'Aucun résultat'
    : `${filtered.length} ${filtered.length > 1 ? 'agents trouvés' : 'agent trouvé'}`;
  const suggestionQueries = ['documents', 'email', 'business', 'automatisation'];

  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <div className="container px-4 py-8">
        <div className="relative mb-6">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9B72CF]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un agent, un besoin, une tâche..."
            className="h-14 w-full rounded-2xl border border-[#2F184B] bg-[#0F0A1E] pl-14 pr-4 text-[#F4EFFA] transition-all placeholder:text-[#9B72CF]/70 focus:border-[#532B88] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
          />
        </div>

        {loadError && (
          <div className="mb-5 rounded-2xl border border-[#F59E0B]/40 bg-[#1A1130] px-4 py-3 text-sm text-[#F59E0B]">
            {effectiveLang === 'en'
              ? 'Marketplace data is temporarily unavailable.'
              : 'Les données de la marketplace sont temporairement indisponibles.'}
          </div>
        )}

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.id}
                onClick={chip.remove}
                className="flex items-center gap-1.5 rounded-full border border-[#532B88]/50 bg-[#1A1130] px-3 py-1.5 text-xs text-[#F4EFFA] transition-colors hover:border-[#7C3AED]"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button onClick={resetAll} className="text-xs text-[#9B72CF] underline hover:text-[#F4EFFA]">
              {copy('srch.reset')}
            </button>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[#C8B1E4]">{resultLabel}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 rounded-lg border border-[#2F184B] bg-[#0F0A1E] px-3 py-2 text-sm text-[#C8B1E4] lg:hidden">
              <Filter className="h-4 w-4" />
              {copy('srch.filters')}
            </button>
            <div className="relative">
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="cursor-pointer appearance-none rounded-lg border border-[#2F184B] bg-[#0F0A1E] px-4 py-2 pr-9 text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none">
                <option value="popularity">{copy('srch.sort.pop')}</option>
                <option value="rating">{copy('srch.sort.rating')}</option>
                <option value="priceAsc">{copy('srch.sort.priceasc')}</option>
                <option value="priceDesc">{copy('srch.sort.pricedesc')}</option>
                <option value="rentals">{copy('srch.sort.renewal')}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B72CF]" />
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className={`${showFilters ? 'fixed inset-0 z-50 overflow-y-auto bg-[#080612] p-6 lg:static lg:bg-transparent lg:p-0' : 'hidden'} w-full shrink-0 lg:block lg:w-72`}>
            <div className="space-y-6 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5 lg:sticky lg:top-20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#F5F1FA]">Affiner</h3>
                  <p className="mt-1 text-xs text-[#9B72CF]">Seulement les critères utiles.</p>
                </div>
                <button onClick={() => setShowFilters(false)} className="lg:hidden">
                  <X className="h-5 w-5 text-[#9B72CF]" />
                </button>
              </div>

              {initialCategories.length > 0 && (
                <div>
                  <h4 className="font-label mb-3 text-xs text-[#F4EFFA]">{copy('srch.category')}</h4>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-2">
                    {initialCategories.map((category) => (
                      <label key={category.id} className="group flex cursor-pointer items-center gap-2">
                        <Checkbox checked={selectedCats.includes(category.id)} onCheckedChange={(checked) => setSelectedCats(checked ? [...selectedCats, category.id] : selectedCats.filter((id) => id !== category.id))} className="border-[#2F184B] data-[state=checked]:border-[#532B88] data-[state=checked]:bg-[#532B88]" />
                        <span className="text-sm text-[#C8B1E4] transition-colors group-hover:text-[#F4EFFA]">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-label mb-3 text-xs text-[#F4EFFA]">Type d’agent</h4>
                {agentTypeOptions.map((type) => (
                  <label key={type.id} className="mb-2 flex cursor-pointer items-center gap-2">
                    <Checkbox checked={agentTypes.includes(type.id)} onCheckedChange={(checked) => setAgentTypes(checked ? [...agentTypes, type.id] : agentTypes.filter((selected) => selected !== type.id))} className="border-[#2F184B] data-[state=checked]:border-[#532B88] data-[state=checked]:bg-[#532B88]" />
                    <span className="text-sm text-[#C8B1E4]">{type.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <h4 className="font-label mb-3 flex items-center justify-between gap-3 text-xs text-[#F4EFFA]">
                  <span>{copy('srch.maxprice')}</span>
                  <span className="font-stat text-[#9B72CF] normal-case">{formatCredits(maxPrice[0])}</span>
                </h4>
                <Slider value={maxPrice} onValueChange={setMaxPrice} min={0} max={200} step={1} />
              </div>

              <div>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={certifiedOnly} onCheckedChange={(checked) => setCertifiedOnly(Boolean(checked))} className="border-[#2F184B] data-[state=checked]:border-[#532B88] data-[state=checked]:bg-[#532B88]" />
                  <span className="text-sm text-[#C8B1E4]">{copy('srch.certifiedonly')}</span>
                </label>
              </div>

              {activeChips.length > 0 && (
                <button onClick={resetAll} className="text-xs font-semibold text-[#C8B1E4] underline-offset-4 hover:text-white hover:underline">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
            </div>
            {!loadError && filtered.length === 0 && (
              <div className="rounded-3xl border border-[#251A40] bg-[#0F0A1E] px-6 py-12 text-center">
                <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">
                  {initialAgents.length === 0
                    ? effectiveLang === 'en'
                      ? 'No approved agents are live yet.'
                      : 'Aucun agent en ligne pour le moment.'
                    : 'Aucun agent trouvé'}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#A78BCF]">
                  {initialAgents.length === 0
                    ? 'Les agents approuvés apparaîtront ici dès leur mise en ligne.'
                    : hasSearch
                      ? 'Essaie un terme plus large ou retire les filtres actifs pour revenir aux agents disponibles.'
                      : 'Aucun agent ne correspond aux filtres sélectionnés.'}
                </p>

                {initialAgents.length > 0 && (
                  <>
                    <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
                      >
                        Réinitialiser la recherche
                      </button>
                      <Link
                        href="/agenthub/search"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#2F184B] px-5 text-sm font-semibold text-[#D6C5E8] transition-colors hover:bg-[#15112A] hover:text-white"
                      >
                        Voir tous les agents
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                      {suggestionQueries.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            resetAll();
                            setQuery(suggestion);
                          }}
                          className="rounded-full border border-[#2F184B] px-3 py-1.5 text-xs font-semibold text-[#A78BCF] transition-colors hover:border-[#8B5CF6] hover:text-white"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer compact />
    </div>
  );
}
