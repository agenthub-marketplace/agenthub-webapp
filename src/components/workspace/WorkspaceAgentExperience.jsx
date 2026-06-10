import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, ClipboardList, History, Layers, Play, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { polishFrenchCopy, polishFrenchList } from '@/lib/french-copy';

function DetailList({ emptyText, icon: Icon = Check, items = [], tone = 'success' }) {
  const color = tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

  if (!items.length) {
    return <p className="text-sm text-[#9B72CF]">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2 text-sm text-[#C8B1E4]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ children, eyebrow, title }) {
  return (
    <section className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
      <p className="font-label mb-2 text-xs text-[#9B72CF]">{eyebrow}</p>
      <h2 className="font-display text-2xl font-bold text-[#F4EFFA]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const tabIcons = {
  clipboard: ClipboardList,
  history: History,
  layers: Layers,
  play: Play,
  sliders: SlidersHorizontal,
};

export default function WorkspaceAgentExperience({
  activeTab = 'overview',
  accessLabel,
  agent,
  baseHref,
  contract,
  locale = 'fr',
  reviewSlot,
  runnerSlot,
  setupLabel,
  workspaceManifest,
}) {
  const isEnglish = locale === 'en';
  const labels = isEnglish
    ? {
        agentReady: 'Agent ready',
        continueToUse: 'Continue to use',
        detailsEyebrow: 'Usage frame',
        detailsTitle: 'Useful details',
        deliverables: 'Expected deliverables',
        deliverablesEmpty: 'No deliverables listed.',
        examples: 'Usage examples',
        examplesEmpty: 'No example yet.',
        limitations: 'Important limitations',
        limitationsEmpty: 'No published limitation.',
        mainCapabilities: 'Main capabilities',
        mainCapabilitiesEmpty: 'No detailed capability was provided.',
        objective: 'Objective',
        overviewEyebrow: 'At a glance',
        overviewTitle: 'What this agent provides',
        prepare: 'Set up',
        requiredInputs: 'Inputs to prepare',
        requiredInputsEmpty: 'No specific input was provided.',
        review: 'Review',
        reviewEyebrow: 'Verified feedback',
        reviewTitle: 'Review after use',
        setup: 'Setup',
        setupEmpty: 'No extra setup is required before use.',
        setupEyebrow: 'Preparation',
        setupTitle: 'Set up',
        tabs: {
          details: 'Details',
          overview: 'Overview',
          review: 'Review',
          setup: 'Setup',
          use: 'Use',
        },
        useNow: 'Use now',
      }
    : {
        agentReady: 'Agent prêt',
        continueToUse: 'Continuer vers l’utilisation',
        detailsEyebrow: 'Cadre d’usage',
        detailsTitle: 'Détails utiles',
        deliverables: 'Livrables attendus',
        deliverablesEmpty: 'Livrables non renseignés.',
        examples: 'Exemples d’usage',
        examplesEmpty: 'Aucun exemple fourni pour le moment.',
        limitations: 'Limites importantes',
        limitationsEmpty: 'Aucune limite publiée.',
        mainCapabilities: 'Capacités principales',
        mainCapabilitiesEmpty: 'Aucune capacité détaillée n’a été renseignée.',
        objective: 'Objectif',
        overviewEyebrow: 'En bref',
        overviewTitle: 'Ce que cet agent apporte',
        prepare: 'Mettre en place',
        requiredInputs: 'À préparer',
        requiredInputsEmpty: 'Aucun input spécifique n’a été renseigné.',
        review: 'Avis',
        reviewEyebrow: 'Retour vérifié',
        reviewTitle: 'Avis après utilisation',
        setup: 'Setup',
        setupEmpty: 'Aucun setup supplémentaire n’est requis avant utilisation.',
        setupEyebrow: 'Préparation',
        setupTitle: 'Mise en place',
        tabs: {
          details: 'Détails',
          overview: 'Présentation',
          review: 'Avis',
          setup: 'Mise en place',
          use: 'Utiliser',
        },
        useNow: 'Utiliser maintenant',
      };
  const description = isEnglish ? agent.description || agent.summary : polishFrenchCopy(agent.description || agent.summary);
  const summary = isEnglish ? agent.summary : polishFrenchCopy(agent.summary);
  const capabilities = isEnglish ? agent.capabilities ?? [] : polishFrenchList(agent.capabilities ?? []);
  const deliverables = isEnglish ? agent.deliverables ?? [] : polishFrenchList(agent.deliverables ?? []);
  const limitations = isEnglish ? agent.limitations ?? [] : polishFrenchList(agent.limitations ?? []);
  const requiredInputs = isEnglish ? agent.requiredInputsList ?? [] : polishFrenchList(agent.requiredInputsList ?? []);
  const setupItems = workspaceManifest?.setup?.requiredInputs?.length
    ? workspaceManifest.setup.requiredInputs
    : isEnglish
      ? contract.setupRequirements?.items ?? []
      : polishFrenchList(contract.setupRequirements?.items ?? []);
  const outputExamples = isEnglish ? contract.outputPromise?.examples ?? [] : polishFrenchList(contract.outputPromise?.examples ?? []);

  const tabs = workspaceManifest?.tabs?.length
    ? workspaceManifest.tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: tabIcons[tab.icon] ?? Layers,
      }))
    : [
        { id: 'overview', label: labels.tabs.overview, icon: Layers },
        { id: 'setup', label: labels.tabs.setup, icon: SlidersHorizontal },
        { id: 'use', label: labels.tabs.use, icon: Play },
        { id: 'details', label: labels.tabs.details, icon: ClipboardList },
        { id: 'review', label: labels.tabs.review, icon: History },
      ];
  const setupWarnings = workspaceManifest?.setup?.warnings ?? [];
  const runnerTitle = workspaceManifest?.runner?.title;
  const runnerDescription = workspaceManifest?.runner?.description;
  const trustDisclosure = workspaceManifest?.trust?.creatorInfraDisclosure || workspaceManifest?.trust?.dataDisclosure;
  const trustTitle = workspaceManifest?.trust?.title || (isEnglish ? 'Execution boundary' : 'Périmètre d’exécution');
  const executionBoundary = workspaceManifest?.trust?.executionBoundary ?? [];
  const usesCreatorInfra = workspaceManifest?.infraMode === 'creator_hosted' || workspaceManifest?.infraMode === 'hybrid';

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-label mb-3 text-xs text-[#10B981]">{labels.agentReady}</p>
            <h1 className="font-display text-3xl font-bold text-[#F4EFFA] md:text-4xl">
              {agent.name ?? 'AgentHub agent'}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#C8B1E4]">
              {description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[accessLabel, setupLabel].filter(Boolean).map((label) => (
                <span key={label} className="rounded-full border border-[#2F184B] bg-[#080612] px-3 py-1.5 text-xs font-semibold text-[#D6C5E8]">
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href={`${baseHref}?tab=setup`}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
            >
              {labels.prepare}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`${baseHref}?tab=use`}
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-[#6B3FA0] bg-transparent px-5 text-sm font-semibold text-[#D6C5E8] transition-colors hover:bg-[#1A152F]"
            >
              {labels.useNow}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-3 lg:sticky lg:top-24 lg:h-fit" aria-label="Sections workspace">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={tab.id === 'overview' ? baseHref : `${baseHref}?tab=${tab.id}`}
                  className={`flex min-w-max cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors lg:min-w-0 ${
                    active
                      ? 'bg-[#251A40] text-[#F4EFFA]'
                      : 'text-[#9B72CF] hover:bg-[#15112A] hover:text-[#F4EFFA]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {activeTab === 'overview' && (
            <Panel eyebrow={labels.overviewEyebrow} title={labels.overviewTitle}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.objective}</h3>
                  <p className="text-sm leading-6 text-[#C8B1E4]">{summary}</p>
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.mainCapabilities}</h3>
                  <DetailList items={capabilities.slice(0, 4)} emptyText={labels.mainCapabilitiesEmpty} />
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'setup' && (
            <Panel eyebrow={labels.setupEyebrow} title={workspaceManifest?.setup?.title || labels.setupTitle}>
              {workspaceManifest?.setup?.description && (
                <p className="mb-5 text-sm leading-6 text-[#C8B1E4]">{workspaceManifest.setup.description}</p>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.requiredInputs}</h3>
                  <DetailList items={requiredInputs} emptyText={labels.requiredInputsEmpty} />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.setup}</h3>
                  <DetailList items={setupItems} emptyText={labels.setupEmpty} />
                </div>
              </div>
              {(setupWarnings.length > 0 || trustDisclosure) && (
                <div className="mt-5 rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                    <h3 className="font-display text-lg font-bold text-[#F4EFFA]">
                      {trustTitle}
                    </h3>
                  </div>
                  <DetailList
                    icon={AlertTriangle}
                    items={[trustDisclosure, ...executionBoundary, ...setupWarnings].filter(Boolean)}
                    emptyText=""
                    tone="warning"
                  />
                </div>
              )}
              <Link
                href={`${baseHref}?tab=use`}
                className="mt-5 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#532B88] px-5 text-sm font-bold text-white transition-colors hover:bg-[#7C3AED]"
              >
                {labels.continueToUse}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Panel>
          )}

          {activeTab === 'use' && (
            <div className="space-y-5">
              {(runnerTitle || runnerDescription || trustDisclosure) && (
                <Panel eyebrow={isEnglish ? 'Runtime' : 'Runtime'} title={runnerTitle || labels.tabs.use}>
                  {runnerDescription && <p className="text-sm leading-6 text-[#C8B1E4]">{runnerDescription}</p>}
                  {trustDisclosure && (
                    <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
                      usesCreatorInfra
                        ? 'border-[#F59E0B]/35 bg-[#1A1208] text-[#F6C177]'
                        : 'border-[#2F184B] bg-[#080612] text-[#C8B1E4]'
                    }`}>
                      <div className="mb-2 flex items-center gap-2">
                        <ShieldCheck className={`h-4 w-4 ${usesCreatorInfra ? 'text-[#F59E0B]' : 'text-[#10B981]'}`} />
                        <p className="font-label text-xs">{trustTitle}</p>
                      </div>
                      <p>{trustDisclosure}</p>
                      {executionBoundary.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {executionBoundary.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span aria-hidden="true">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Panel>
              )}
              {runnerSlot}
            </div>
          )}

          {activeTab === 'details' && (
            <Panel eyebrow={labels.detailsEyebrow} title={labels.detailsTitle}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.deliverables}</h3>
                  <DetailList items={deliverables} emptyText={labels.deliverablesEmpty} />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.examples}</h3>
                  <DetailList items={outputExamples} emptyText={labels.examplesEmpty} />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5 md:col-span-2">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.limitations}</h3>
                  <DetailList icon={AlertTriangle} items={limitations} emptyText={labels.limitationsEmpty} tone="warning" />
                </div>
              </div>
            </Panel>
          )}

          {activeTab === 'review' && (
            <Panel eyebrow={labels.reviewEyebrow} title={labels.reviewTitle}>
              {reviewSlot}
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
