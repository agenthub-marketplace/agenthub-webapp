'use client';
import { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import { agentsList, categories } from '@/lib/mock-data';
import { Search, X, Filter, ChevronDown, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';

function Page() {
  const { t } = useT();
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
    let r = [...agentsList];
    if (query) r = r.filter(a => (a.name + ' ' + a.pitch + ' ' + a.category).toLowerCase().includes(query.toLowerCase()));
    if (selectedCats.length) r = r.filter(a => selectedCats.includes(a.categoryId));
    r = r.filter(a => a.fromPrice <= maxPrice[0]);
    if (level !== 'any') r = r.filter(a => a.level === level);
    if (minStars > 0) r = r.filter(a => a.rating >= minStars);
    if (certifiedOnly) r = r.filter(a => a.certified);
    if (sort === 'rating') r.sort((a,b) => b.rating - a.rating);
    else if (sort === 'priceAsc') r.sort((a,b) => a.fromPrice - b.fromPrice);
    else if (sort === 'priceDesc') r.sort((a,b) => b.fromPrice - a.fromPrice);
    else if (sort === 'rentals') r.sort((a,b) => b.rentals - a.rentals);
    return r;
  }, [query, selectedCats, maxPrice, level, minStars, certifiedOnly, sort, modes]);

  const activeChips = [
    ...selectedCats.map(id => ({ id: 'c-'+id, label: categories.find(c=>c.id===id)?.name, remove: () => setSelectedCats(selectedCats.filter(x=>x!==id)) })),
    ...(maxPrice[0] < 200 ? [{ id: 'price', label: `${t('srch.maxprice')} €${maxPrice[0]}`, remove: () => setMaxPrice([200]) }] : []),
    ...(level !== 'any' ? [{ id: 'lvl', label: `${t('srch.level')}: ${t('g.'+level)}`, remove: () => setLevel('any') }] : []),
    ...(minStars > 0 ? [{ id: 'st', label: `${minStars}+ ★`, remove: () => setMinStars(0) }] : []),
    ...(certifiedOnly ? [{ id: 'cert', label: t('srch.certifiedonly'), remove: () => setCertifiedOnly(false) }] : []),
  ];

  const resetAll = () => { setSelectedCats([]); setMaxPrice([200]); setModes([]); setLevel('any'); setMinStars(0); setCertifiedOnly(false); };

  const modeLabels = [t('g.perhour'), t('g.perday'), t('g.pertask'), t('g.perproject')];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="relative mb-6">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B72CF]" />
          <input value={query} onChange={e=>setQuery(e.target.value)} className="w-full h-14 pl-14 pr-4 bg-[#0F0A1E] border border-[#2F184B] rounded-2xl text-[#F4EFFA] focus:border-[#532B88] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 transition-all" />
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            {activeChips.map(c => (
              <button key={c.id} onClick={c.remove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1130] border border-[#532B88]/50 text-xs text-[#F4EFFA] hover:border-[#7C3AED] transition-colors">
                {c.label} <X className="w-3 h-3"/>
              </button>
            ))}
            <button onClick={resetAll} className="text-xs text-[#9B72CF] hover:text-[#F4EFFA] underline">{t('srch.reset')}</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#9B72CF]"><span className="font-stat text-[#F4EFFA]">{filtered.length}</span> {t('srch.found')}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex items-center gap-2 px-3 py-2 bg-[#0F0A1E] border border-[#2F184B] rounded-lg text-sm text-[#C8B1E4]"><Filter className="w-4 h-4"/>{t('srch.filters')}</button>
            <div className="relative">
              <select value={sort} onChange={e=>setSort(e.target.value)} className="appearance-none bg-[#0F0A1E] border border-[#2F184B] rounded-lg px-4 py-2 pr-9 text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none cursor-pointer">
                <option value="popularity">{t('srch.sort.pop')}</option>
                <option value="rating">{t('srch.sort.rating')}</option>
                <option value="priceAsc">{t('srch.sort.priceasc')}</option>
                <option value="priceDesc">{t('srch.sort.pricedesc')}</option>
                <option value="newest">{t('srch.sort.new')}</option>
                <option value="rentals">{t('srch.sort.renewal')}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B72CF] pointer-events-none"/>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-[#080612] p-6 overflow-y-auto lg:static lg:p-0 lg:bg-transparent' : 'hidden'} lg:block w-full lg:w-72 shrink-0`}>
            <div className="lg:sticky lg:top-20 bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5 space-y-6">
              <div className="flex items-center justify-between lg:hidden">
                <h3 className="font-display font-bold">{t('srch.filters')}</h3>
                <button onClick={()=>setShowFilters(false)}><X className="w-5 h-5 text-[#9B72CF]"/></button>
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{t('srch.category')}</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox checked={selectedCats.includes(c.id)} onCheckedChange={(v) => setSelectedCats(v ? [...selectedCats,c.id] : selectedCats.filter(x=>x!==c.id))} className="border-[#2F184B] data-[state=checked]:bg-[#532B88] data-[state=checked]:border-[#532B88]"/>
                      <span className="text-sm text-[#C8B1E4] group-hover:text-[#F4EFFA] transition-colors">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{t('srch.maxprice')} <span className="font-stat text-[#9B72CF] normal-case ml-2">€{maxPrice[0]}</span></h4>
                <Slider value={maxPrice} onValueChange={setMaxPrice} min={0} max={200} step={1}/>
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{t('srch.mode')}</h4>
                {modeLabels.map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer mb-2">
                    <Checkbox checked={modes.includes(m)} onCheckedChange={v => setModes(v ? [...modes,m] : modes.filter(x=>x!==m))} className="border-[#2F184B] data-[state=checked]:bg-[#532B88] data-[state=checked]:border-[#532B88]"/>
                    <span className="text-sm text-[#C8B1E4]">{m}</span>
                  </label>
                ))}
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{t('srch.level')}</h4>
                {[{v:'any',l:t('srch.any')},{v:'beginner',l:t('g.beginner')},{v:'intermediate',l:t('g.intermediate')},{v:'advanced',l:t('g.advanced')}].map(opt => (
                  <label key={opt.v} className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="radio" checked={level===opt.v} onChange={()=>setLevel(opt.v)} className="accent-[#532B88]"/>
                    <span className="text-sm text-[#C8B1E4]">{opt.l}</span>
                  </label>
                ))}
              </div>

              <div>
                <h4 className="font-label text-xs text-[#F4EFFA] mb-3">{t('srch.minrating')}</h4>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={()=>setMinStars(s===minStars?0:s)}>
                      <Star className={`w-5 h-5 transition-colors ${s <= minStars ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#2F184B]'}`}/>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[#C8B1E4]">{t('srch.certifiedonly')}</span>
                <Switch checked={certifiedOnly} onCheckedChange={setCertifiedOnly} className="data-[state=checked]:bg-[#532B88]"/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#C8B1E4]">{t('srch.availnow')}</span>
                <Switch className="data-[state=checked]:bg-[#532B88]"/>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(a => <AgentCard key={a.id} agent={a} />)}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-20 text-[#9B72CF]">{t('srch.empty')} <button onClick={resetAll} className="text-[#F4EFFA] underline ml-1">{t('srch.reset')}</button></div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
              {Array.from({length: 3}).map((_,i) => (
                <div key={i} className="skeleton-shimmer rounded-2xl h-72 border border-[#2F184B]" />
              ))}
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Page;
