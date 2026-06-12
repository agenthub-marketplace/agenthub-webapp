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

const recipeStatusStyles = {
  attention: {
    dot: 'bg-[#F59E0B]',
    panel: 'border-[#F59E0B]/35 bg-[#1A1208]',
    text: 'text-[#F6C177]',
  },
  disabled: {
    dot: 'bg-[#EF4444]',
    panel: 'border-[#EF4444]/35 bg-[#1A0810]',
    text: 'text-[#FCA5A5]',
  },
  ready: {
    dot: 'bg-[#10B981]',
    panel: 'border-[#10B981]/25 bg-[#071611]',
    text: 'text-[#6EE7B7]',
  },
};

function RecipeBlocks({ blocks = [], requiredText, title }) {
  const visibleBlocks = blocks.filter((item) => item.status !== 'hidden');

  if (!visibleBlocks.length) {
    return null;
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
      <p className="font-label mb-3 text-xs text-[#9B72CF]">{title}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleBlocks.map((item) => {
          const styles = recipeStatusStyles[item.status] ?? recipeStatusStyles.ready;

          return (
            <div key={item.id} className={`rounded-2xl border p-4 ${styles.panel}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#F4EFFA]">{item.label}</p>
                  {item.detail && <p className={`mt-1 text-xs leading-5 ${styles.text}`}>{item.detail}</p>}
                  {item.required && <p className="font-label mt-2 text-[10px] text-[#9B72CF]">{requiredText}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tabRecipeStatus(blocks = []) {
  const visibleBlocks = blocks.filter((item) => item.status !== 'hidden');

  if (visibleBlocks.some((item) => item.status === 'disabled')) {
    return 'disabled';
  }

  if (visibleBlocks.some((item) => item.status === 'attention')) {
    return 'attention';
  }

  if (visibleBlocks.some((item) => item.required || item.status === 'ready')) {
    return 'ready';
  }

  return null;
}

function formatWorkspaceDate(value, locale) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function StartupPlan({ labels, steps = [] }) {
  if (!steps.length) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label text-xs text-[#B794F4]">{labels.startupPlanEyebrow}</p>
          <h3 className="font-display text-lg font-bold text-[#F4EFFA]">{labels.startupPlanTitle}</h3>
        </div>
        <span className="font-label text-[10px] text-[#9B72CF]">{labels.startupPlanHint}</span>
      </div>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const styles = recipeStatusStyles[step.status] ?? recipeStatusStyles.ready;

          return (
            <li key={`${step.key}-${index}`} className={`rounded-2xl border p-4 ${styles.panel}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles.dot} text-[#080612]`}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#F4EFFA]">{step.label}</p>
                  <p className={`mt-1 text-xs leading-5 ${styles.text}`}>{step.detail}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RecipeSummary({ baseHref, labels, workspaceRecipe }) {
  if (!workspaceRecipe) {
    return null;
  }

  const runtimeLabel = labels.runtimePanels[workspaceRecipe.runtimePanel] ?? workspaceRecipe.runtimePanel;
  const infraLabel = labels.infraModes[workspaceRecipe.readiness?.infraMode] ?? workspaceRecipe.readiness?.infraMode ?? labels.unknownInfra;
  const stateStyle = workspaceRecipe.disabledReason ? recipeStatusStyles.disabled : recipeStatusStyles.ready;
  const limitItems = [
    workspaceRecipe.limits?.maxInputChars ? `${workspaceRecipe.limits.maxInputChars} ${labels.inputChars}` : null,
    workspaceRecipe.runtimePanel === 'document' && workspaceRecipe.limits?.maxFileBytes
      ? `${(workspaceRecipe.limits.maxFileBytes / 1_000_000).toFixed(1)} MB`
      : null,
  ].filter(Boolean);
  const lastRun = workspaceRecipe.lastRun;
  const lastRunStatus = lastRun ? labels.lastRunStatuses[lastRun.status] ?? lastRun.status : labels.noLastRun;
  const lastRunDetail = lastRun
    ? `${lastRun.actionLabel} · ${formatWorkspaceDate(lastRun.completedAt || lastRun.createdAt, labels.locale)}. ${lastRun.hint}`
    : labels.noLastRunDetail;
  const readinessStatus = workspaceRecipe.readiness?.status ?? (workspaceRecipe.disabledReason ? 'blocked' : 'ready');
  const readinessStyle =
    readinessStatus === 'blocked'
      ? recipeStatusStyles.disabled
      : readinessStatus === 'attention'
        ? recipeStatusStyles.attention
        : recipeStatusStyles.ready;
  const readinessScore = Number.isFinite(workspaceRecipe.readiness?.score) ? workspaceRecipe.readiness.score : 0;
  const nextStep = workspaceRecipe.nextStep;
  const nextStepHref = nextStep
    ? nextStep.tab === 'overview'
      ? baseHref
      : `${baseHref}?tab=${nextStep.tab}`
    : null;
  const cards = [
    {
      detail: workspaceRecipe.disabledReason || labels.readyToRun,
      label: labels.runtimeState,
      status: workspaceRecipe.disabledReason ? 'disabled' : 'ready',
      value: runtimeLabel,
    },
    {
      detail: workspaceRecipe.readiness?.disclosureRequired ? labels.creatorInfraDetail : labels.agenthubInfraDetail,
      label: labels.infrastructure,
      status: workspaceRecipe.readiness?.status === 'blocked' ? 'disabled' : 'ready',
      value: infraLabel,
    },
    {
      detail: labels.primaryActionDetail,
      label: labels.primaryAction,
      status: 'ready',
      value: workspaceRecipe.primaryActionLabel,
    },
    {
      detail: labels.historyDetail,
      label: labels.historyState,
      status: workspaceRecipe.historyCount > 0 ? 'ready' : 'attention',
      value: `${workspaceRecipe.historyCount}`,
    },
    {
      detail: lastRunDetail,
      label: labels.lastRunState,
      status: lastRun?.status === 'failed' ? 'disabled' : lastRun?.status === 'running' ? 'attention' : lastRun ? 'ready' : 'attention',
      value: lastRunStatus,
    },
    {
      detail: limitItems.length ? limitItems.join(' · ') : labels.noSpecificLimit,
      label: labels.limits,
      status: 'ready',
      value: labels.runtimeLimits,
    },
  ];

  return (
    <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-label text-xs text-[#9B72CF]">{labels.recipeSummaryEyebrow}</p>
          <h2 className="font-display mt-1 text-xl font-bold text-[#F4EFFA]">{labels.recipeSummaryTitle}</h2>
          {nextStep && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C8B1E4]">{nextStep.detail}</p>}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${stateStyle.panel} ${stateStyle.text}`}>
            <span className={`h-2 w-2 rounded-full ${stateStyle.dot}`} aria-hidden="true" />
            {workspaceRecipe.disabledReason ? labels.workspaceBlocked : labels.workspaceReady}
          </span>
          {nextStepHref && (
            <Link
              href={nextStepHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#6B3FA0] bg-[#251A40] px-4 text-sm font-semibold text-[#F4EFFA] transition-colors hover:bg-[#33205A]"
            >
              {nextStep.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const styles = recipeStatusStyles[card.status] ?? recipeStatusStyles.ready;

          return (
            <div key={card.label} className={`rounded-2xl border p-4 ${styles.panel}`}>
              <p className="font-label text-[10px] text-[#9B72CF]">{card.label}</p>
              <p className="mt-2 text-base font-bold text-[#F4EFFA]">{card.value}</p>
              <p className={`mt-1 text-xs leading-5 ${styles.text}`}>{card.detail}</p>
            </div>
          );
        })}
      </div>
      <div className={`mt-4 rounded-2xl border p-4 ${readinessStyle.panel}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-label text-[10px] text-[#9B72CF]">{labels.readinessScoreTitle}</p>
            <p className="mt-1 text-base font-bold text-[#F4EFFA]">
              {workspaceRecipe.readiness?.scoreLabel ?? labels.workspaceReady} · {readinessScore}/100
            </p>
            <p className={`mt-1 text-xs leading-5 ${readinessStyle.text}`}>
              {workspaceRecipe.readiness?.scoreDetail ?? labels.readyToRun}
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#080612] sm:w-44" aria-hidden="true">
            <div className={`h-full rounded-full ${readinessStyle.dot}`} style={{ width: `${readinessScore}%` }} />
          </div>
        </div>
      </div>
      {workspaceRecipe.historyPreview && (
        <div className="mt-4 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-4">
          <p className="font-label text-[10px] text-[#B794F4]">{workspaceRecipe.historyPreview.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#C8B1E4]">{workspaceRecipe.historyPreview.detail}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {workspaceRecipe.historyPreview.inputPreview && (
              <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-3">
                <p className="font-label text-[10px] text-[#9B72CF]">{labels.latestInput}</p>
                <p className="mt-1 text-xs leading-5 text-[#D6C5E8]">{workspaceRecipe.historyPreview.inputPreview}</p>
              </div>
            )}
            {workspaceRecipe.historyPreview.outputPreview && (
              <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-3">
                <p className="font-label text-[10px] text-[#9B72CF]">{labels.latestOutput}</p>
                <p className="mt-1 text-xs leading-5 text-[#D6C5E8]">{workspaceRecipe.historyPreview.outputPreview}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <StartupPlan labels={labels} steps={workspaceRecipe.startupPlan ?? []} />
      {workspaceRecipe.trustWarnings?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-4">
          <p className="font-label mb-2 text-xs text-[#F6C177]">{labels.trustWarnings}</p>
          <ul className="space-y-1 text-sm text-[#F6C177]">
            {workspaceRecipe.trustWarnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {workspaceRecipe.readiness?.blockers?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#EF4444]/35 bg-[#1A0810] p-4">
          <p className="font-label mb-2 text-xs text-[#FCA5A5]">{labels.readinessBlockers}</p>
          <ul className="space-y-1 text-sm text-[#FCA5A5]">
            {workspaceRecipe.readiness.blockers.map((blocker) => (
              <li key={blocker} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {workspaceRecipe.nextActions?.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-4">
          <p className="font-label mb-2 text-xs text-[#B794F4]">{labels.nextActions}</p>
          <ol className="space-y-2 text-sm text-[#D6C5E8]">
            {workspaceRecipe.nextActions.map((action, index) => (
              <li key={action} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#251A40] text-xs font-bold text-[#C4B5FD]">
                  {index + 1}
                </span>
                <span className="leading-6">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
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
  workspaceRecipe,
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
        fallbackPathEmpty: 'No fallback path is required for this workspace.',
        fallbackPathTitle: 'Fallback path',
        limitations: 'Important limitations',
        limitationsEmpty: 'No published limitation.',
        mainCapabilities: 'Main capabilities',
        mainCapabilitiesEmpty: 'No detailed capability was provided.',
        objective: 'Objective',
        outcomeChecklistEmpty: 'Run this agent once before judging the result.',
        outcomeChecklistTitle: 'Before leaving feedback',
        overviewEyebrow: 'At a glance',
        overviewTitle: 'What this agent provides',
        prepare: 'Set up',
        requiredInputs: 'Inputs to prepare',
        requiredInputsEmpty: 'No specific input was provided.',
        review: 'Review',
        reviewEyebrow: 'Verified feedback',
        reviewTitle: 'Review after use',
        historyDetail: 'Stored runs visible for this access.',
        historyState: 'Run history',
        inputChars: 'input characters',
        lastRunState: 'Latest run',
        latestInput: 'Latest input',
        latestOutput: 'Latest output',
        lastRunStatuses: {
          failed: 'Failed',
          running: 'Running',
          succeeded: 'Completed',
        },
        locale: 'en',
        agenthubInfraDetail: 'Execution stays inside AgentHub runtime gates.',
        creatorInfraDetail: 'Execution may use approved creator infrastructure through AgentHub servers.',
        infraModes: {
          agenthub_hosted: 'AgentHub-hosted',
          creator_hosted: 'Creator-hosted',
          hybrid: 'Hybrid execution',
        },
        infrastructure: 'Infrastructure',
        limits: 'Limits',
        noSpecificLimit: 'No specific runtime limit.',
        noLastRun: 'No run yet',
        noLastRunDetail: 'Run this workspace once to create history.',
        nextActions: 'Next actions',
        primaryAction: 'Main action',
        primaryActionDetail: 'What the workspace will launch first.',
        readyToRun: 'The runtime gates allow execution.',
        recipeSummaryEyebrow: 'Workspace recipe',
        recipeSummaryTitle: 'Runtime readiness',
        readinessBlockers: 'Readiness blockers',
        readinessScoreTitle: 'Readiness score',
        runtimeLimits: 'Runtime limits',
        startupPlanEyebrow: 'Start path',
        startupPlanHint: 'Runtime-specific',
        startupPlanTitle: 'How to use this workspace',
        runtimePanels: {
          assistant: 'Guided AI assistant',
          document: 'Document agent',
          endpoint: 'Creator API agent',
          workflow: 'Workflow agent',
        },
        runtimeState: 'Runtime',
        setup: 'Setup',
        setupChecklistEmpty: 'No launch checklist is required.',
        setupChecklistTitle: 'Launch checklist',
        setupEmpty: 'No extra setup is required before use.',
        setupEyebrow: 'Preparation',
        setupTitle: 'Set up',
        successCriteria: 'Success criteria',
        successCriteriaEmpty: 'No success criteria are available yet.',
        tabs: {
          details: 'Details',
          overview: 'Overview',
          review: 'Review',
          setup: 'Setup',
          use: 'Use',
        },
        tabStatus: {
          attention: 'Needs attention',
          disabled: 'Blocked',
          ready: 'Ready',
        },
        useNow: 'Use now',
        recipeRequired: 'Required check',
        recipeTitle: 'Workspace checklist',
        trustWarnings: 'Trust warnings',
        unknownInfra: 'Unknown infrastructure',
        workspaceBlocked: 'Execution blocked',
        workspaceReady: 'Ready to run',
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
        fallbackPathEmpty: 'Aucun parcours de fallback requis pour ce workspace.',
        fallbackPathTitle: 'Parcours de fallback',
        limitations: 'Limites importantes',
        limitationsEmpty: 'Aucune limite publiée.',
        mainCapabilities: 'Capacités principales',
        mainCapabilitiesEmpty: 'Aucune capacité détaillée n’a été renseignée.',
        objective: 'Objectif',
        outcomeChecklistEmpty: 'Lancez cet agent au moins une fois avant de juger le résultat.',
        outcomeChecklistTitle: 'Avant de laisser un avis',
        overviewEyebrow: 'En bref',
        overviewTitle: 'Ce que cet agent apporte',
        prepare: 'Mettre en place',
        requiredInputs: 'À préparer',
        requiredInputsEmpty: 'Aucun input spécifique n’a été renseigné.',
        review: 'Avis',
        reviewEyebrow: 'Retour vérifié',
        reviewTitle: 'Avis après utilisation',
        historyDetail: 'Exécutions stockées et visibles pour cet accès.',
        historyState: 'Historique d’exécution',
        inputChars: 'caractères input',
        lastRunState: 'Dernière exécution',
        latestInput: 'Dernier input',
        latestOutput: 'Dernière sortie',
        lastRunStatuses: {
          failed: 'Échec',
          running: 'En cours',
          succeeded: 'Terminée',
        },
        locale: 'fr',
        agenthubInfraDetail: 'L’exécution reste dans les gates runtime AgentHub.',
        creatorInfraDetail: 'L’exécution peut utiliser une infrastructure créateur approuvée via les serveurs AgentHub.',
        infraModes: {
          agenthub_hosted: 'Hébergé AgentHub',
          creator_hosted: 'Infra créateur',
          hybrid: 'Exécution hybride',
        },
        infrastructure: 'Infrastructure',
        limits: 'Limites',
        noSpecificLimit: 'Aucune limite runtime spécifique.',
        noLastRun: 'Aucune exécution',
        noLastRunDetail: 'Lancez une première exécution pour créer l’historique.',
        nextActions: 'Prochaines actions',
        primaryAction: 'Action principale',
        primaryActionDetail: 'Ce que le workspace lancera en premier.',
        readyToRun: 'Les gates runtime autorisent l’exécution.',
        recipeSummaryEyebrow: 'Recette workspace',
        recipeSummaryTitle: 'Disponibilité runtime',
        readinessBlockers: 'Blocages readiness',
        readinessScoreTitle: 'Score readiness',
        runtimeLimits: 'Limites runtime',
        startupPlanEyebrow: 'Parcours de démarrage',
        startupPlanHint: 'Adapté au runtime',
        startupPlanTitle: 'Comment utiliser ce workspace',
        runtimePanels: {
          assistant: 'Assistant IA guidé',
          document: 'Agent document',
          endpoint: 'Agent API creator',
          workflow: 'Agent workflow',
        },
        runtimeState: 'Runtime',
        setup: 'Setup',
        setupChecklistEmpty: 'Aucune checklist de lancement requise.',
        setupChecklistTitle: 'Checklist de lancement',
        setupEmpty: 'Aucun setup supplémentaire n’est requis avant utilisation.',
        setupEyebrow: 'Préparation',
        setupTitle: 'Mise en place',
        successCriteria: 'Critères de réussite',
        successCriteriaEmpty: 'Aucun critère de réussite disponible pour le moment.',
        tabs: {
          details: 'Détails',
          overview: 'Présentation',
          review: 'Avis',
          setup: 'Mise en place',
          use: 'Utiliser',
        },
        tabStatus: {
          attention: 'À surveiller',
          disabled: 'Bloqué',
          ready: 'Prêt',
        },
        useNow: 'Utiliser maintenant',
        recipeRequired: 'Point requis',
        recipeTitle: 'Checklist workspace',
        trustWarnings: 'Avertissements confiance',
        unknownInfra: 'Infrastructure inconnue',
        workspaceBlocked: 'Exécution bloquée',
        workspaceReady: 'Prêt à exécuter',
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
  const infraLabel = labels.infraModes[workspaceManifest?.infraMode] ?? null;
  const recipeBlocksForTab = (tab) => workspaceRecipe?.blocks?.filter((item) => item.tab === tab) ?? [];

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
              {[accessLabel, setupLabel, infraLabel].filter(Boolean).map((label) => (
                <span
                  key={label}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    label === infraLabel && usesCreatorInfra
                      ? 'border-[#F59E0B]/45 bg-[#1A1208] text-[#F6C177]'
                      : 'border-[#2F184B] bg-[#080612] text-[#D6C5E8]'
                  }`}
                >
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

      <RecipeSummary baseHref={baseHref} labels={labels} workspaceRecipe={workspaceRecipe} />

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-3 lg:sticky lg:top-24 lg:h-fit" aria-label="Sections workspace">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const tabStatus = tabRecipeStatus(recipeBlocksForTab(tab.id));
              const tabStatusStyle = tabStatus ? recipeStatusStyles[tabStatus] : null;

              return (
                <Link
                  key={tab.id}
                  href={tab.id === 'overview' ? baseHref : `${baseHref}?tab=${tab.id}`}
                  className={`flex min-w-max cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors lg:min-w-0 ${
                    active
                      ? 'bg-[#251A40] text-[#F4EFFA]'
                      : 'text-[#9B72CF] hover:bg-[#15112A] hover:text-[#F4EFFA]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                  {tabStatusStyle && (
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${tabStatusStyle.dot}`}
                      aria-label={labels.tabStatus[tabStatus] ?? tabStatus}
                      title={labels.tabStatus[tabStatus] ?? tabStatus}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {activeTab === 'overview' && (
            <Panel eyebrow={labels.overviewEyebrow} title={labels.overviewTitle}>
              <RecipeBlocks blocks={recipeBlocksForTab('overview')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
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
              <RecipeBlocks blocks={recipeBlocksForTab('setup')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
              {workspaceManifest?.setup?.description && (
                <p className="mb-5 text-sm leading-6 text-[#C8B1E4]">{workspaceManifest.setup.description}</p>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5 md:col-span-2">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.setupChecklistTitle}</h3>
                  <DetailList items={workspaceRecipe?.setupChecklist ?? []} emptyText={labels.setupChecklistEmpty} />
                </div>
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
              {workspaceRecipe?.fallbackPath?.length > 0 && (
                <div className="mt-5 rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                    <h3 className="font-display text-lg font-bold text-[#F4EFFA]">{labels.fallbackPathTitle}</h3>
                  </div>
                  <DetailList
                    icon={AlertTriangle}
                    items={workspaceRecipe.fallbackPath}
                    emptyText={labels.fallbackPathEmpty}
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
              <RecipeBlocks blocks={recipeBlocksForTab('use')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
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
              <RecipeBlocks blocks={recipeBlocksForTab('details')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.deliverables}</h3>
                  <DetailList items={deliverables} emptyText={labels.deliverablesEmpty} />
                </div>
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.examples}</h3>
                  <DetailList items={outputExamples} emptyText={labels.examplesEmpty} />
                </div>
                <div className="rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5 md:col-span-2">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.successCriteria}</h3>
                  <DetailList items={workspaceRecipe?.successCriteria ?? []} emptyText={labels.successCriteriaEmpty} />
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
              <RecipeBlocks blocks={recipeBlocksForTab('review')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
              <div className="mb-5 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
                <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.outcomeChecklistTitle}</h3>
                <DetailList items={workspaceRecipe?.outcomeChecklist ?? []} emptyText={labels.outcomeChecklistEmpty} />
              </div>
              {reviewSlot}
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
