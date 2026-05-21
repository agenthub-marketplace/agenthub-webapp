'use client';

import { useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import { Search, X, Filter, ChevronDown, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { translate, useT } from '@/lib/i18n';

export default function SearchClient({ initialAgents = [], initialCategories = [], loadError = null, locale = null }) {
  const { t, lang } = useT();
  const effectiveLang = locale || lang;
  const copy = (key, vars) => (locale ? translate(locale, key, vars) : t(key, vars));
  const [query, setQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  const [maxPrice, setMaxPrice] = useState([200]);
  const [modes, setModes] = useState([]);
  const [level, setLevel] = useState('any');
  const [minStars, setMinStars] = useState(0);
  const [certifiedOnly, setCertifiedOnly] = useState(false);
  const [sort, setSort] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...initialAgents];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      result = result.filter((agent) =>
        [agent.name, agent.pitch, agent.category, agent.creator?.name]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (selectedCats.length) {
      result = result.filter((agent) => selectedCats.includes(agent.categoryId));
    }

    result = result.filter((agent) => agent.fromPrice === null || agent.fromPrice <= maxPrice[0]);

    if (modes.length) {
      result = result.filter((agent) => modes.includes(agent.priceMode));
    }

    if (level !== 'any') {
      result = result.filter((agent) => agent.level === level);
    }

    if (minStars > 0) {
      result = result.filter((agent) => agent.rating >= minStars);
    }

    if (certifiedOnly) {
      result = result.filter((agent) => agent.certified);
    }

    if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    else if (sort === 'priceAsc') result.sort((a, b) => (a.fromPrice ?? Number.MAX_SAFE_INTEGER) - (b.fromPrice ?? Number.MAX_SAFE_INTEGER));
    else if (sort === 'priceDesc') result.sort((a, b) => (b.fromPrice ?? -1) - (a.fromPrice ?? -1));
    else if (sort === 'rentals') result.sort((a, b) => b.rentals - a.rentals);

    return result;
  }, [initialAgents, query, selectedCats, maxPrice, modes, level, minStars, certifiedOnly, sort]);

  const activeChips = [
    ...selectedCats.map((id) => ({
      id: `c-${id}`,
      label: initialCategories.find((category) => category.id === id)?.name,
      remove: () => setSelectedCats(selectedCats.filter((selected) => selected !== id)),
    })),
    ...(maxPrice[0] < 200 ? [{ id: 'price', label: `${copy('srch.maxprice')} €${maxPrice[0]}`, remove: () => setMaxPrice([200]) }] : []),
    ...(modes.length ? modes.map((mode) => ({ id: `m-${mode}`, label: mode === 'task' ? copy('g.pertask') : copy('g.perproject'), remove: () => setModes(modes.filter((selected) => selected !== mode)) })) : []),
    ...(level !== 'any' ? [{ id: 'lvl', label: `${copy('srch.level')}: ${copy(`g.${level}`)}`, remove: () => setLevel('any') }] : []),
    ...(minStars > 0 ? [{ id: 'st', label: `${minStars}+ ★`, remove: () => setMinStars(0) }] : []),
    ...(certifiedOnly ? [{ id: 'cert', label: copy('srch.certifiedonly'), remove: () => setCertifiedOnly(false) }] : []),
  ];

  const resetAll = () => {
    setSelectedCats([]);
    setMaxPrice([200]);
    setModes([]);
    setLevel('any');
    setMinStars(0);
    setCertifiedOnly(false);
  };

  const modeOptions = [
    { id: 'task', label: copy('g.pertask') },
    { id: 'project', label: copy('g.perproject') },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="relative mb-6">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B72CF]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full h-14 pl-14 pr-4 bg-[#0F0A1E] border border-[#2F184B] rounded-2xl text-[#F4EFFA] focus:border-[#532B88] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 transition-all"
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
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            {activeChips.map((chip) => (
              <button key={chip.id} onClick={chip.remove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1130] border border-[#532B88]/50 text-xs text-[#F4EFFA] hover:border-[#7C3AED] transition-colors">
                {chip.label} <X className="w-3 h-3" />
              </button>
            ))}
            <button onClick={resetAll} className="text-xs text-[#9B72CF] hover:text-[#F4EFFA] underline">{copy('srch.reset')}</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#9B72CF]"><span className="font-stat text-[#F4EFFA]">{filtered.length}</span> {copy('srch.found')}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex items-center gap-2 px-3 py-2 bg-[#0F0A1E] border border-[#2F184B] rounded-lg text-sm text-[#C8B1E4]"><Filter className="w-4 h-4" />{copy('srch.filters')}</button>
            <div className="relative">
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="appearance-none bg-[#0F0A1E] border border-[#2F184B] rounded-lg px-4 py-2 pr-9 text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none cursor-pointer">
                <option value="popularity">{copy('srch.sort.pop')}</option>
                <option value="rating">{copy('srch.sort.rating')}</option>
                <option value="priceAsc">{copy('srch.sort.priceasc')}</option>
                <option value="priceDesc">{copy('srch.sort.pricedesc')}</option>
                <option value="rentals">{copy('srch.sort.renewal')}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B72CF] pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-[#080612] p-6 overflow-y-auto lg:static lg:p-0 lg:bg-transparent' : 'hidden'} lg:block w-full lg:w-72 shrink-0`}>
            <div className="lg:sticky lg:top-20 bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5 space-y-6">
              <div className="flex items-center justify-between lg:hidden">
                <h3 className="font-display font-bold">{copy('srch.filters')}</h3>
                <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-[#9B72CF]" /></button>
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{copy('srch.category')}</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                  {initialCategories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox checked={selectedCats.includes(category.id)} onCheckedChange={(checked) => setSelectedCats(checked ? [...selectedCats, category.id] : selectedCats.filter((id) => id !== category.id))} className="border-[#2F184B] data-[state=checked]:bg-[#532B88] data-[state=checked]:border-[#532B88]" />
                      <span className="text-sm text-[#C8B1E4] group-hover:text-[#F4EFFA] transition-colors">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{copy('srch.maxprice')} <span className="font-stat text-[#9B72CF] normal-case ml-2">€{maxPrice[0]}</span></h4>
                <Slider value={maxPrice} onValueChange={setMaxPrice} min={0} max={200} step={1} />
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{copy('srch.mode')}</h4>
                {modeOptions.map((mode) => (
                  <label key={mode.id} className="flex items-center gap-2 cursor-pointer mb-2">
                    <Checkbox checked={modes.includes(mode.id)} onCheckedChange={(checked) => setModes(checked ? [...modes, mode.id] : modes.filter((selected) => selected !== mode.id))} className="border-[#2F184B] data-[state=checked]:bg-[#532B88] data-[state=checked]:border-[#532B88]" />
                    <span className="text-sm text-[#C8B1E4]">{mode.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{copy('srch.level')}</h4>
                {[{ v: 'any', l: copy('srch.any') }, { v: 'beginner', l: copy('g.beginner') }, { v: 'intermediate', l: copy('g.intermediate') }, { v: 'advanced', l: copy('g.advanced') }].map((option) => (
                  <label key={option.v} className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="radio" checked={level === option.v} onChange={() => setLevel(option.v)} className="accent-[#532B88]" />
                    <span className="text-sm text-[#C8B1E4]">{option.l}</span>
                  </label>
                ))}
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{copy('srch.minrating')}</h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setMinStars(star === minStars ? 0 : star)}>
                      <Star className={`w-5 h-5 transition-colors ${star <= minStars ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#2F184B]'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#C8B1E4]">{copy('srch.certifiedonly')}</span>
                <Switch checked={certifiedOnly} onCheckedChange={setCertifiedOnly} className="data-[state=checked]:bg-[#532B88]" />
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
            </div>
            {!loadError && filtered.length === 0 && (
              <div className="text-center py-20 text-[#9B72CF]">
                {initialAgents.length === 0
                  ? effectiveLang === 'en'
                    ? 'No approved agents are live yet.'
                    : 'Aucun agent approuvé n’est encore en ligne.'
                  : copy('srch.empty')}
                {initialAgents.length > 0 && <button onClick={resetAll} className="text-[#F4EFFA] underline ml-1">{copy('srch.reset')}</button>}
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
