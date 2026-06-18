'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronDown, Filter, History, Search, Sparkles, Star, X } from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { AGENT_RUNTIME_TYPE_LABELS } from '@/lib/agent-contract';
import { formatCredits } from '@/lib/format-credits';
import { translate, useT } from '@/lib/i18n';
import {
  formatRecentAgentViewedAt,
  getLegacyRecentAgentStorageKey,
  getRecentAgentStorageKey,
  parseRecentAgentsFromStorage,
  removeRecentAgentsFromStorage,
} from '@/lib/recent-agents';

const RUNTIME_TYPE_LABELS_EN = {
  static_guided: 'Guided workspace',
  llm_prompt: 'Guided AI assistant',
  document_file: 'Guided AI assistant',
  workflow_automation: 'Workflow agent',
  creator_endpoint: 'API agent',
};

const groupedRuntimeTypes = {
  llm_prompt: ['llm_prompt', 'document_file'],
};

const validSortModes = new Set(['popularity', 'rating', 'rentals', 'priceAsc', 'priceDesc']);
const validAgentTypeFilters = new Set(['llm_prompt', 'workflow_automation', 'creator_endpoint', 'static_guided']);

function runtimeMatchesFilter(runtimeType, selectedType) {
  return (groupedRuntimeTypes[selectedType] ?? [selectedType]).includes(runtimeType);
}

function formatSearchCredits(value, locale) {
  if (locale === 'en') {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} credits`;
  }

  return formatCredits(value);
}

function recommendationScore(agent) {
  const runtimeType = agent.contract?.runtimeType || 'static_guided';
  const advancedRuntimeScore = ['workflow_automation', 'creator_endpoint'].includes(runtimeType) ? 18 : 0;
  const documentScore = agent.contract?.dataPolicy?.requires_files ? 6 : 0;
  const ratingScore = Number(agent.rating || 0) * 8;
  const reviewScore = Math.min(agent.reviews || 0, 10) * 2;
  const priceReadyScore = typeof agent.fromPrice === 'number' && agent.fromPrice > 0 ? 6 : 0;
  const certifiedScore = agent.certified ? 5 : 0;

  return advancedRuntimeScore + documentScore + ratingScore + reviewScore + priceReadyScore + certifiedScore;
}

function recommendationReasons(agent, lang) {
  const runtimeType = agent.contract?.runtimeType || 'static_guided';
  const reasons = [];

  if (['workflow_automation', 'creator_endpoint'].includes(runtimeType)) {
    reasons.push(lang === 'en' ? 'Advanced runtime' : 'Agent avancé');
  } else if (runtimeType === 'document_file' || agent.contract?.dataPolicy?.requires_files) {
    reasons.push(lang === 'en' ? 'Document context' : 'Avec document');
  } else {
    reasons.push(lang === 'en' ? 'Fast guided run' : 'Exécution rapide');
  }

  if ((agent.reviews ?? 0) > 0) {
    reasons.push(lang === 'en' ? 'Verified feedback' : 'Avis vérifiés');
  }

  if (agent.contract?.outputPromise?.summary) {
    reasons.push(lang === 'en' ? 'Clear output promise' : 'Promesse claire');
  }

  if (typeof agent.fromPrice === 'number' && agent.fromPrice > 0) {
    reasons.push(lang === 'en' ? 'Price ready' : 'Prix prêt');
  }

  if (agent.certified) {
    reasons.push(lang === 'en' ? 'Certified' : 'Certifié');
  }

  return reasons.slice(0, 3);
}

export default function SearchClient({
  initialAgents = [],
  initialCategories = [],
  loadError = null,
  locale = null,
  profile = null,
  userResume = null,
}) {
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
  const [recentAgents, setRecentAgents] = useState([]);
  const agentBasePath = effectiveLang === 'en' ? '/en' : '/agenthub';
  const recentAgentStorageKey = getRecentAgentStorageKey(profile);
  const legacyRecentAgentStorageKey = getLegacyRecentAgentStorageKey(profile);
  const searchDraftStorageKey = `${recentAgentStorageKey}:search-draft`;
  const [hasHydratedSearchDraft, setHasHydratedSearchDraft] = useState(false);
  const [restoredSearchDraft, setRestoredSearchDraft] = useState(false);

  useEffect(() => {
    const loadRecentAgents = () => {
      try {
        setRecentAgents(
          parseRecentAgentsFromStorage(
            window.localStorage,
            recentAgentStorageKey,
            legacyRecentAgentStorageKey,
          ),
        );
      } catch {
        setRecentAgents([]);
      }
    };

    loadRecentAgents();
    const refreshTimer = window.setInterval(loadRecentAgents, 60000);
    window.addEventListener('agenthub:recent-agents-updated', loadRecentAgents);
    window.addEventListener('storage', loadRecentAgents);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('agenthub:recent-agents-updated', loadRecentAgents);
      window.removeEventListener('storage', loadRecentAgents);
    };
  }, [legacyRecentAgentStorageKey, recentAgentStorageKey]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      if (queryParam.trim()) {
        setHasHydratedSearchDraft(true);
        setRestoredSearchDraft(false);
        return;
      }

      try {
        const rawDraft = window.localStorage.getItem(searchDraftStorageKey);
        const draft = rawDraft ? JSON.parse(rawDraft) : null;

        if (draft && typeof draft === 'object') {
          const nextQuery = typeof draft.query === 'string' ? draft.query : '';
          const nextCategories = Array.isArray(draft.selectedCats)
            ? draft.selectedCats.filter((id) => typeof id === 'string')
            : [];
          const nextAgentTypes = Array.isArray(draft.agentTypes)
            ? draft.agentTypes.filter((type) => validAgentTypeFilters.has(type))
            : [];
          const nextMaxPrice = Number.isFinite(draft.maxPrice) ? Math.max(0, Math.min(200, draft.maxPrice)) : 200;
          const nextSort = validSortModes.has(draft.sort) ? draft.sort : 'popularity';
          const hasUsefulDraft = Boolean(
            nextQuery.trim() ||
            nextCategories.length > 0 ||
            nextAgentTypes.length > 0 ||
            nextMaxPrice < 200 ||
            draft.certifiedOnly,
          );

          if (hasUsefulDraft) {
            setQueryState({ source: queryParam, value: nextQuery });
            setSelectedCats(nextCategories);
            setAgentTypes(nextAgentTypes);
            setMaxPrice([nextMaxPrice]);
            setCertifiedOnly(Boolean(draft.certifiedOnly));
            setSort(nextSort);
            setRestoredSearchDraft(true);
          }
        }
      } catch {
        // Local convenience only. Search must stay usable without storage.
      } finally {
        setHasHydratedSearchDraft(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryParam, searchDraftStorageKey]);

  useEffect(() => {
    if (!hasHydratedSearchDraft) {
      return;
    }

    try {
      const hasUsefulDraft = Boolean(
        query.trim() ||
        selectedCats.length > 0 ||
        agentTypes.length > 0 ||
        maxPrice[0] < 200 ||
        certifiedOnly ||
        sort !== 'popularity',
      );

      if (!hasUsefulDraft) {
        window.localStorage.removeItem(searchDraftStorageKey);
        return;
      }

      window.localStorage.setItem(
        searchDraftStorageKey,
        JSON.stringify({
          agentTypes: agentTypes.filter((type) => validAgentTypeFilters.has(type)),
          certifiedOnly,
          maxPrice: maxPrice[0],
          query,
          selectedCats,
          sort,
          updatedAt: Date.now(),
        }),
      );
    } catch {
      // Local convenience only. Search must stay usable without storage.
    }
  }, [agentTypes, certifiedOnly, hasHydratedSearchDraft, maxPrice, query, searchDraftStorageKey, selectedCats, sort]);

  const agentTypeOptions = [
    { id: 'llm_prompt', label: effectiveLang === 'en' ? RUNTIME_TYPE_LABELS_EN.llm_prompt : AGENT_RUNTIME_TYPE_LABELS.llm_prompt },
    { id: 'workflow_automation', label: effectiveLang === 'en' ? RUNTIME_TYPE_LABELS_EN.workflow_automation : AGENT_RUNTIME_TYPE_LABELS.workflow_automation },
    { id: 'creator_endpoint', label: effectiveLang === 'en' ? RUNTIME_TYPE_LABELS_EN.creator_endpoint : AGENT_RUNTIME_TYPE_LABELS.creator_endpoint },
    { id: 'static_guided', label: effectiveLang === 'en' ? RUNTIME_TYPE_LABELS_EN.static_guided : AGENT_RUNTIME_TYPE_LABELS.static_guided },
  ];
  const getAgentTypeLabel = (type) => agentTypeOptions.find((option) => runtimeMatchesFilter(type, option.id))?.label ?? type;

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
        return agentTypes.some((selectedType) => runtimeMatchesFilter(agentType, selectedType));
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

  const recommendedAgents = useMemo(
    () =>
      [...initialAgents]
        .sort((left, right) => recommendationScore(right) - recommendationScore(left) || left.name.localeCompare(right.name))
        .slice(0, 3),
    [initialAgents],
  );

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
    ...(maxPrice[0] < 200 ? [{ id: 'price', label: `${copy('srch.maxprice')} ${formatSearchCredits(maxPrice[0], effectiveLang)}`, remove: () => setMaxPrice([200]) }] : []),
    ...(certifiedOnly ? [{ id: 'cert', label: copy('srch.certifiedonly'), remove: () => setCertifiedOnly(false) }] : []),
  ].filter((chip) => chip.label);

  const resetAll = () => {
    setSelectedCats([]);
    setAgentTypes([]);
    setMaxPrice([200]);
    setCertifiedOnly(false);
    setRestoredSearchDraft(false);
  };

  const clearSearch = () => {
    setQuery('');
    resetAll();
    setRestoredSearchDraft(false);

    try {
      window.localStorage.removeItem(searchDraftStorageKey);
    } catch {
      // Local convenience only. Search must stay usable without storage.
    }
  };
  const clearRecentAgents = () => {
    setRecentAgents([]);

    try {
      removeRecentAgentsFromStorage(
        window.localStorage,
        recentAgentStorageKey,
        legacyRecentAgentStorageKey,
      );
      window.dispatchEvent(new CustomEvent('agenthub:recent-agents-updated'));
    } catch {
      // Local convenience only. The marketplace remains usable without storage.
    }
  };
  const applyQuickPick = (pick) => {
    if (pick.count === 0) {
      return;
    }

    setQuery(pick.query);
    setSelectedCats([]);
    setAgentTypes(pick.agentTypes);
    setMaxPrice([200]);
    setCertifiedOnly(false);
    setSort(pick.sort ?? 'popularity');
  };

  const hasSearch = query.trim().length > 0;
  const resultLabel = filtered.length === 0
    ? hasSearch
      ? effectiveLang === 'en'
        ? `No results for "${query.trim()}"`
        : `Aucun résultat pour « ${query.trim()} »`
      : effectiveLang === 'en'
        ? 'No results'
        : 'Aucun résultat'
    : effectiveLang === 'en'
      ? `${filtered.length} ${filtered.length > 1 ? 'agents found' : 'agent found'}`
      : `${filtered.length} ${filtered.length > 1 ? 'agents trouvés' : 'agent trouvé'}`;
  const suggestionQueries = effectiveLang === 'en'
    ? ['documents', 'email', 'business', 'automation']
    : ['documents', 'email', 'business', 'automatisation'];
  const countAgentsByTypes = (types) =>
    initialAgents.filter((agent) => types.includes(agent.contract?.runtimeType || 'static_guided')).length;
  const countAgentsByNeed = (terms) => {
    const normalizedTerms = terms.map((term) => term.toLowerCase());

    return initialAgents.filter((agent) =>
      normalizedTerms.some((term) =>
        [
          agent.name,
          agent.pitch,
          agent.category,
          agent.contract?.outputPromise?.summary,
          ...(agent.capabilities ?? []),
          ...(agent.requiredInputs ?? []),
          ...(agent.deliverables ?? []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(term),
      ),
    ).length;
  };
  const needPicks = [
    {
      count: countAgentsByNeed(['linkedin', 'content', 'post', 'contenu', 'marketing']),
      label: effectiveLang === 'en' ? 'Create content' : 'Créer du contenu',
      query: effectiveLang === 'en' ? 'linkedin content post' : 'linkedin contenu post',
    },
    {
      count: countAgentsByNeed(['email', 'sales', 'vente', 'prospection']),
      label: effectiveLang === 'en' ? 'Write emails' : 'Écrire des emails',
      query: effectiveLang === 'en' ? 'sales email' : 'email prospection',
    },
    {
      count: countAgentsByNeed(['document', 'summary', 'résumé', 'notes', 'meeting']),
      label: effectiveLang === 'en' ? 'Analyze text' : 'Analyser un texte',
      query: effectiveLang === 'en' ? 'document summary notes' : 'document résumé notes',
    },
    {
      count: countAgentsByNeed(['triage', 'qualification', 'lead', 'support', 'workflow']),
      label: effectiveLang === 'en' ? 'Automate a decision' : 'Automatiser une décision',
      query: effectiveLang === 'en' ? 'triage qualification workflow' : 'triage qualification workflow',
    },
  ];
  const visibleRecentAgents = recentAgents
    .map((recentAgent) => {
      const liveAgent = initialAgents.find((agent) => agent.slug === recentAgent.slug);
      const runtimeType = liveAgent?.contract?.runtimeType;

      return {
        ...recentAgent,
        category: liveAgent?.category ?? recentAgent.category,
        name: liveAgent?.name ?? recentAgent.name,
        pitch: liveAgent?.pitch ?? recentAgent.pitch,
        runtimeLabel: runtimeType
          ? getAgentTypeLabel(runtimeType)
          : recentAgent.runtimeLabel,
      };
    })
    .filter((agent) => agent.slug && agent.name)
    .slice(0, 3);
  const quickPicks = [
    {
      agentTypes: ['llm_prompt', 'document_file'],
      bestFor: effectiveLang === 'en' ? 'You need a fast text result.' : 'Vous voulez un résultat texte rapide.',
      count: countAgentsByTypes(['llm_prompt', 'document_file']),
      detail: effectiveLang === 'en' ? 'Fast text output from the workspace.' : 'Résultat texte rapide depuis le workspace.',
      label: effectiveLang === 'en' ? 'Guided assistant' : 'Assistant guidé',
      query: effectiveLang === 'en' ? 'writing summary email' : 'email résumé contenu',
    },
    {
      agentTypes: ['workflow_automation'],
      bestFor: effectiveLang === 'en' ? 'You need decisions across steps.' : 'Vous voulez une décision en plusieurs étapes.',
      count: countAgentsByTypes(['workflow_automation']),
      detail: effectiveLang === 'en' ? 'Multi-step agents with tracked decisions.' : 'Agents en plusieurs étapes avec décisions suivies.',
      label: effectiveLang === 'en' ? 'Real workflow agent' : 'Agent workflow réel',
      query: effectiveLang === 'en' ? 'triage qualification workflow' : 'triage qualification workflow',
    },
    {
      agentTypes: ['creator_endpoint'],
      bestFor: effectiveLang === 'en' ? 'You need an approved creator API.' : 'Vous voulez appeler une API creator approuvée.',
      count: countAgentsByTypes(['creator_endpoint']),
      detail: effectiveLang === 'en' ? 'Server-side call to an approved creator API.' : 'Appel serveur vers une API creator approuvée.',
      label: effectiveLang === 'en' ? 'Creator API agent' : 'Agent API creator',
      query: effectiveLang === 'en' ? 'crm enrichment api' : 'crm enrichissement api',
    },
  ];
  const resumeCopy = (() => {
    if (!userResume) {
      return null;
    }

    if (userResume.kind === 'first_run') {
      return {
        cta: effectiveLang === 'en' ? 'Open workspace' : 'Ouvrir le workspace',
        eyebrow: effectiveLang === 'en' ? 'Active agent waiting' : 'Agent actif en attente',
        title:
          effectiveLang === 'en'
            ? `${userResume.agentName} is ready for a first run`
            : `${userResume.agentName} attend une première exécution`,
        detail:
          effectiveLang === 'en'
            ? 'You already activated this agent. Open the workspace before renting another one.'
            : 'Vous avez déjà activé cet agent. Ouvrez le workspace avant d’en louer un autre.',
      };
    }

    if (userResume.kind === 'review') {
      return {
        cta: effectiveLang === 'en' ? 'Leave a review' : 'Laisser un avis',
        eyebrow: effectiveLang === 'en' ? 'Verified review unlocked' : 'Avis vérifié débloqué',
        title:
          effectiveLang === 'en'
            ? `${userResume.agentName} has a stored result`
            : `${userResume.agentName} a déjà un résultat stocké`,
        detail:
          effectiveLang === 'en'
            ? 'Complete the beta loop with a verified review, then compare your next agent.'
            : 'Complétez la boucle beta avec un avis vérifié, puis comparez votre prochain agent.',
      };
    }

    return {
      cta: effectiveLang === 'en' ? 'Continue' : 'Continuer',
      eyebrow: effectiveLang === 'en' ? 'Workspace in progress' : 'Workspace en cours',
      title:
        effectiveLang === 'en'
          ? `${userResume.agentName} is still active`
          : `${userResume.agentName} est encore actif`,
      detail:
        effectiveLang === 'en'
          ? `${userResume.runCount || 0} run(s) stored. Continue it or compare new agents from here.`
          : `${userResume.runCount || 0} exécution(s) stockée(s). Continuez ou comparez de nouveaux agents depuis ici.`,
    };
  })();

  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <div className="container px-4 py-8">
        <div className="relative mb-6">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9B72CF]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={effectiveLang === 'en' ? 'Search an agent, a need, a task...' : 'Rechercher un agent, un besoin, une tâche...'}
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

        {restoredSearchDraft && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#6B3FA0]/45 bg-[#15102A] px-4 py-3 text-sm text-[#D8B4FE] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-label text-[10px] text-[#B794F4]">
                {effectiveLang === 'en' ? 'SEARCH RESUMED' : 'RECHERCHE REPRISE'}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#C8B1E4]">
                {effectiveLang === 'en'
                  ? 'Your last filters were restored locally on this device.'
                  : 'Vos derniers filtres ont été restaurés localement sur cet appareil.'}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6B3FA0] bg-[#0F0A1E] px-3 py-2 text-xs font-semibold text-[#F4EFFA] transition-colors hover:border-[#8B5CF6] hover:bg-[#20143D]"
            >
              {effectiveLang === 'en' ? 'Reset search' : 'Réinitialiser'}
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {resumeCopy && (
          <section className="mb-5 overflow-hidden rounded-3xl border border-[#6B3FA0]/45 bg-[radial-gradient(circle_at_top_left,#35215B_0%,#110D24_48%,#080612_100%)] p-4 shadow-[0_18px_45px_rgba(8,6,18,0.26)] md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#8B5CF6]/35 bg-[#1A152F] text-[#D8B4FE]">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-label text-xs text-[#B794F4]">{resumeCopy.eyebrow}</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-[#F5F1FA]">{resumeCopy.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#C8B1E4]">{resumeCopy.detail}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="rounded-full border border-[#2F184B] bg-[#0A0816] px-3 py-1.5 text-xs font-semibold text-[#A78BCF]">
                  {userResume.activeCount}{' '}
                  {effectiveLang === 'en'
                    ? userResume.activeCount > 1 ? 'active agents' : 'active agent'
                    : userResume.activeCount > 1 ? 'agents actifs' : 'agent actif'}
                </span>
                <Link
                  href={userResume.href}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#F5F1FA] px-4 text-sm font-bold text-[#2B1A44] transition-colors hover:bg-white"
                >
                  {resumeCopy.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {initialAgents.length > 0 && (
          <div className="mb-5 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-label text-xs text-[#B794F4]">
                  {effectiveLang === 'en' ? 'I want to...' : 'Je veux...'}
                </p>
                <p className="mt-1 text-xs text-[#8E75B5]">
                  {effectiveLang === 'en'
                    ? 'Start from a concrete task, then refine by agent type if needed.'
                    : 'Partez d’une tâche concrète, puis affinez par type d’agent si besoin.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {needPicks.map((pick) => (
                  <button
                    key={pick.label}
                    type="button"
                    disabled={pick.count === 0}
                    onClick={() => {
                      if (pick.count === 0) {
                        return;
                      }

                      setQuery(pick.query);
                      setSelectedCats([]);
                      setAgentTypes([]);
                      setMaxPrice([200]);
                      setCertifiedOnly(false);
                      setSort('popularity');
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                      pick.count === 0
                        ? 'cursor-not-allowed border-[#2F184B] bg-[#0B0817] text-[#6B5A84] opacity-70'
                        : 'border-[#33214F] bg-[#15102A] text-[#D8B4FE] hover:border-[#8B5CF6] hover:bg-[#20143D] hover:text-white'
                    }`}
                  >
                    {pick.label}
                    <span className="rounded-full bg-[#2F184B] px-1.5 py-0.5 text-[10px] text-[#A78BCF]">
                      {pick.count > 0 ? pick.count : effectiveLang === 'en' ? 'Soon' : 'Bientôt'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {visibleRecentAgents.length > 0 && (
          <div className="mb-5 rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-3">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-label flex items-center gap-1.5 text-xs text-[#B794F4]">
                  <History className="h-3.5 w-3.5" />
                  {effectiveLang === 'en' ? 'Recently viewed' : 'Vus récemment'}
                </p>
                <p className="mt-1 text-xs text-[#8E75B5]">
                  {effectiveLang === 'en'
                    ? 'Resume an agent you already inspected.'
                    : 'Reprenez une fiche déjà consultée sans refaire toute la recherche.'}
                </p>
              </div>
              <button
                type="button"
                onClick={clearRecentAgents}
                className="self-start rounded-full border border-[#33214F] px-3 py-1.5 text-xs font-semibold text-[#A78BCF] transition-colors hover:border-[#8B5CF6] hover:text-white sm:self-center"
              >
                {effectiveLang === 'en' ? 'Hide' : 'Masquer'}
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {visibleRecentAgents.map((agent) => (
                <Link
                  key={agent.slug}
                  href={`${agentBasePath}/agents/${agent.slug}`}
                  className="group rounded-2xl border border-[#33214F] bg-[#15102A] p-3 transition-colors hover:border-[#8B5CF6] hover:bg-[#20143D]"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#F4EFFA]">{agent.name}</p>
                      <p className="mt-1 truncate text-xs text-[#B794F4]">{agent.category || agent.runtimeLabel || 'AgentHub'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#A78BCF] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-[#A78BCF]">{agent.pitch || agent.runtimeLabel}</p>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7F6B9C]">
                    {formatRecentAgentViewedAt(agent.viewedAt, effectiveLang)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {initialAgents.length > 0 && (
          <section className="mb-5 rounded-3xl border border-[#2F184B] bg-[radial-gradient(circle_at_top_left,#241241_0%,#100B21_42%,#080612_100%)] p-4 shadow-[0_18px_55px_rgba(8,6,18,0.22)] md:p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#1A152F] px-3 py-1.5 text-xs font-semibold text-[#D8B4FE]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {effectiveLang === 'en' ? 'Fast choice' : 'Choix rapide'}
                </span>
                <h1 className="mt-3 font-display text-2xl font-bold text-[#F5F1FA] md:text-3xl">
                  {effectiveLang === 'en' ? 'Find the right agent in one click' : 'Trouvez le bon agent en un clic'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C8B1E4]">
                  {effectiveLang === 'en'
                    ? 'Start from the execution style you need: simple assistant, multi-step workflow, or creator API.'
                    : 'Partez du mode d’exécution dont vous avez besoin : assistant simple, workflow multi-étapes ou API creator.'}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#A78BCF]">
                {filtered.length}/{initialAgents.length} {effectiveLang === 'en' ? 'visible now' : 'visibles maintenant'}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {quickPicks.map((pick) => (
                <button
                  key={pick.label}
                  type="button"
                  disabled={pick.count === 0}
                  onClick={() => applyQuickPick(pick)}
                  className={`group rounded-2xl border p-4 text-left transition-colors ${
                    pick.count === 0
                      ? 'cursor-not-allowed border-[#2F184B] bg-[#0B0817] opacity-65'
                      : 'border-[#2F184B] bg-[#0F0A1E] hover:border-[#8B5CF6] hover:bg-[#17102D]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-bold text-[#F5F1FA]">{pick.label}</p>
                        <span className="rounded-full border border-[#2F184B] px-2 py-0.5 text-[10px] font-semibold text-[#A78BCF]">
                          {pick.count > 0
                            ? effectiveLang === 'en'
                              ? `${pick.count} live`
                              : `${pick.count} live`
                            : effectiveLang === 'en'
                              ? 'Coming soon'
                              : 'Bientôt'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#A78BCF]">{pick.detail}</p>
                      <p className="mt-3 rounded-xl border border-[#33214F] bg-[#080612] px-3 py-2 text-xs font-semibold leading-5 text-[#D8B4FE]">
                        {effectiveLang === 'en' ? 'Choose if: ' : 'À choisir si : '}
                        <span className="font-normal text-[#C8B1E4]">{pick.bestFor}</span>
                      </p>
                    </div>
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2F184B] text-[#A78BCF] transition-colors ${
                      pick.count > 0 ? 'group-hover:border-[#8B5CF6] group-hover:text-white' : ''
                    }`}>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {recommendedAgents.length > 0 && (
              <div className="mt-5 rounded-2xl border border-[#2F184B] bg-[#080612]/80 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-label text-xs text-[#D8B4FE]">
                      {effectiveLang === 'en' ? 'TO TEST NOW' : 'À TESTER MAINTENANT'}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#A78BCF]">
                      {effectiveLang === 'en'
                        ? 'Three live agents ranked by execution depth, review signal and activation readiness.'
                        : 'Trois agents live classés par profondeur d’exécution, signal d’avis et facilité d’activation.'}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#8B5CF6]/35 bg-[#17102D] px-3 py-1 text-[10px] font-label text-[#D8B4FE]">
                    {effectiveLang === 'en' ? 'Beta loop' : 'Boucle beta'}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {recommendedAgents.map((agent, index) => {
                    const reasons = recommendationReasons(agent, effectiveLang);

                    return (
                      <Link
                        key={agent.id}
                        href={`${agentBasePath}/agents/${agent.slug}`}
                        className="group rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-4 transition-colors hover:border-[#8B5CF6] hover:bg-[#17102D]"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <span className="font-stat text-xs text-[#D8B4FE]">0{index + 1}</span>
                          <span className="rounded-full border border-[#2F184B] px-2.5 py-1 text-[10px] font-label text-[#A78BCF]">
                            {agent.contract?.runtimeType ? getAgentTypeLabel(agent.contract.runtimeType) : agent.category}
                          </span>
                        </div>
                        <h2 className="font-display text-base font-bold text-[#F5F1FA]">{agent.name}</h2>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#A78BCF]">{agent.pitch}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {reasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full border border-[#3B2565] bg-[#17102D] px-2 py-1 text-[10px] font-semibold text-[#D8B4FE]"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#A78BCF]">
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                            {agent.reviews > 0 ? `${agent.rating.toFixed(1)} · ${agent.reviews}` : effectiveLang === 'en' ? 'New' : 'Nouveau'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#D8B4FE]">
                            {effectiveLang === 'en' ? 'Open' : 'Ouvrir'}
                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
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
                  <h3 className="font-display text-lg font-bold text-[#F5F1FA]">{effectiveLang === 'en' ? 'Refine' : 'Affiner'}</h3>
                  <p className="mt-1 text-xs text-[#9B72CF]">
                    {effectiveLang === 'en' ? 'Only useful criteria.' : 'Seulement les critères utiles.'}
                  </p>
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
                <h4 className="font-label mb-3 text-xs text-[#F4EFFA]">{effectiveLang === 'en' ? 'Agent type' : 'Type d’agent'}</h4>
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
                  <span className="font-stat text-[#9B72CF] normal-case">{formatSearchCredits(maxPrice[0], effectiveLang)}</span>
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
                  {effectiveLang === 'en' ? 'Reset filters' : 'Réinitialiser les filtres'}
                </button>
              )}
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((agent) => (
                <AgentCard key={agent.id} agent={agent} agentBasePath={agentBasePath} locale={effectiveLang} />
              ))}
            </div>
            {!loadError && filtered.length === 0 && (
              <div className="rounded-3xl border border-[#251A40] bg-[#0F0A1E] px-6 py-12 text-center">
                <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">
                  {initialAgents.length === 0
                    ? effectiveLang === 'en'
                      ? 'No approved agents are live yet.'
                      : 'Aucun agent en ligne pour le moment.'
                    : effectiveLang === 'en'
                      ? 'No agent found'
                      : 'Aucun agent trouvé'}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#A78BCF]">
                  {initialAgents.length === 0
                    ? 'Les agents approuvés apparaîtront ici dès leur mise en ligne.'
                    : hasSearch
                      ? effectiveLang === 'en'
                        ? 'Try a broader term or remove active filters to return to available agents.'
                        : 'Essaie un terme plus large ou retire les filtres actifs pour revenir aux agents disponibles.'
                      : effectiveLang === 'en'
                        ? 'No agent matches the selected filters.'
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
                        {effectiveLang === 'en' ? 'Reset search' : 'Réinitialiser la recherche'}
                      </button>
                      <Link
                        href={effectiveLang === 'en' ? '/en/search' : '/agenthub/search'}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#2F184B] px-5 text-sm font-semibold text-[#D6C5E8] transition-colors hover:bg-[#15112A] hover:text-white"
                      >
                        {effectiveLang === 'en' ? 'View all agents' : 'Voir tous les agents'}
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

                    {recommendedAgents.length > 0 && (
                      <div className="mx-auto mt-8 max-w-3xl text-left">
                        <p className="font-label mb-3 text-center text-xs text-[#B794F4]">
                          {effectiveLang === 'en' ? 'AVAILABLE STARTING POINTS' : 'POINTS DE DÉPART DISPONIBLES'}
                        </p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {recommendedAgents.map((agent) => (
                            <Link
                              key={agent.id}
                              href={`${agentBasePath}/agents/${agent.slug}`}
                              className="group rounded-2xl border border-[#2F184B] bg-[#080612] p-4 transition-colors hover:border-[#8B5CF6] hover:bg-[#17102D]"
                            >
                              <div className="mb-2 flex items-start justify-between gap-3">
                                <h3 className="line-clamp-2 text-sm font-bold text-[#F5F1FA]">{agent.name}</h3>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#A78BCF] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                              </div>
                              <p className="line-clamp-2 text-xs leading-5 text-[#A78BCF]">{agent.pitch}</p>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#D8B4FE]">
                                {agent.category || getAgentTypeLabel(agent.contract?.runtimeType)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
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
