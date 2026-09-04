import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ClipboardList, History, Layers, Play, ShieldCheck, SlidersHorizontal, Trophy } from 'lucide-react';
import { polishFrenchCopy, polishFrenchList } from '@/lib/french-copy';
import CopyTextButton from './CopyTextButton';

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

function BlueprintFieldGrid({ emptyText, exampleLabel, fields = [], optionalLabel, requiredLabel, title }) {
  if (!fields.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
      <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-[#F4EFFA]">{field.label}</p>
              <span className={`font-label rounded-full border px-2 py-1 text-[10px] ${
                field.required
                  ? 'border-[#F59E0B]/35 bg-[#1A1208] text-[#F6C177]'
                  : 'border-[#2F184B] bg-[#0F0A1E] text-[#9B72CF]'
              }`}>
                {field.required ? requiredLabel : optionalLabel}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#C8B1E4]">{field.helper}</p>
            {field.example && (
              <p className="mt-3 rounded-xl border border-[#2F184B] bg-[#0F0A1E] p-3 text-xs leading-5 text-[#9B72CF]">
                <span className="font-semibold text-[#B794F4]">{exampleLabel}</span> {field.example}
              </p>
            )}
          </div>
        ))}
      </div>
      {!fields.length && <p className="text-sm text-[#9B72CF]">{emptyText}</p>}
    </div>
  );
}

function SetupBriefCard({ blueprint, labels, primaryActionLabel }) {
  const fields = blueprint?.inputSchema?.fields ?? [];
  const sections = blueprint?.outputSchema?.sections ?? [];

  if (!fields.length && !sections.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#7C3AED]/55 bg-[#160D2C] p-5 md:col-span-2">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-label text-xs text-[#C4B5FD]">{labels.setupBriefEyebrow}</p>
          <h3 className="font-display mt-1 text-lg font-bold text-[#F4EFFA]">{labels.setupBriefTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#C8B1E4]">{labels.setupBriefDetail}</p>
        </div>
        {primaryActionLabel && (
          <span className="font-label w-fit rounded-full border border-[#7C3AED]/45 bg-[#251A40] px-3 py-1.5 text-[10px] text-[#E9D5FF]">
            {primaryActionLabel}
          </span>
        )}
      </div>

      {fields.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {fields.slice(0, 6).map((field, index) => (
            <div key={field.key} className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
              <div className="mb-2 flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#F4EFFA]">{field.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#C8B1E4]">{field.helper}</p>
                </div>
              </div>
              {field.example && (
                <p className="mt-3 rounded-xl border border-[#2F184B] bg-[#0F0A1E] p-3 text-xs leading-5 text-[#B794F4]">
                  <span className="font-semibold text-[#E9D5FF]">{labels.blueprintExample}</span> {field.example}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
          <p className="font-label mb-2 text-xs text-[#C4B5FD]">{labels.setupBriefOutput}</p>
          <ul className="grid gap-2 text-sm leading-6 text-[#D6C5E8] md:grid-cols-2">
            {sections.slice(0, 4).map((section) => (
              <li key={section.key} className="flex gap-2">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#A78BFA]" />
                <span>{section.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BlueprintSectionGrid({ emptyText, sections = [], title }) {
  if (!sections.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
      <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.key} className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
            <p className="text-sm font-bold text-[#F4EFFA]">{section.label}</p>
            <p className="mt-2 text-xs leading-5 text-[#C8B1E4]">{section.expectedContent}</p>
          </div>
        ))}
      </div>
      {!sections.length && <p className="text-sm text-[#9B72CF]">{emptyText}</p>}
    </div>
  );
}

function LaunchGuidance({ blueprint, labels }) {
  const checklist = blueprint?.runChecklist ?? [];
  const inputFields = blueprint?.inputSchema?.fields ?? [];
  const warnings = blueprint?.trustBoundary?.userWarnings ?? [];

  if (!checklist.length && !inputFields.length && !warnings.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-label mb-2 text-xs text-[#B794F4]">{labels.launchBriefEyebrow}</p>
          <h3 className="font-display text-lg font-bold text-[#F4EFFA]">{labels.launchBriefTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-[#C8B1E4]">{labels.launchBriefDetail}</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#10B981]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {checklist.length > 0 && (
          <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
            <h4 className="font-display mb-3 text-sm font-bold text-[#F4EFFA]">{labels.launchChecklist}</h4>
            <DetailList items={checklist.slice(0, 5)} emptyText={labels.setupChecklistEmpty} />
          </div>
        )}
        {inputFields.length > 0 && (
          <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
            <h4 className="font-display mb-3 text-sm font-bold text-[#F4EFFA]">{labels.launchInputs}</h4>
            <DetailList items={inputFields.slice(0, 4).map((field) => field.label)} emptyText={labels.blueprintEmpty} />
          </div>
        )}
        {warnings.length > 0 && (
          <div className="rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-4 md:col-span-2">
            <h4 className="font-display mb-3 text-sm font-bold text-[#F4EFFA]">{labels.trustWarnings}</h4>
            <DetailList icon={AlertTriangle} items={warnings} emptyText="" tone="warning" />
          </div>
        )}
      </div>
    </div>
  );
}

function FirstRunKit({
  blueprint,
  labels,
  outputExamples = [],
  primaryActionLabel,
  requiredInputs = [],
  setupItems = [],
}) {
  const inputFields = blueprint?.inputSchema?.fields ?? [];
  const inputExamples = inputFields
    .map((field) => field?.example || field?.helper || field?.label)
    .filter(Boolean);
  const contextItems = [...inputExamples, ...requiredInputs, ...setupItems].filter(Boolean).slice(0, 4);
  const outputItems = outputExamples.filter(Boolean).slice(0, 3);
  const checkItems = (blueprint?.runChecklist ?? []).filter(Boolean).slice(0, 4);
  const starterPromptSections = [
    `${labels.firstRunPromptGoal}\n${primaryActionLabel || labels.primaryAction}`,
    contextItems.length > 0
      ? `${labels.firstRunPromptContext}\n${contextItems.map((item) => `- ${item}`).join('\n')}`
      : null,
    outputItems.length > 0
      ? `${labels.firstRunPromptOutput}\n${outputItems.map((item) => `- ${item}`).join('\n')}`
      : null,
    checkItems.length > 0
      ? `${labels.firstRunPromptChecks}\n${checkItems.map((item) => `- ${item}`).join('\n')}`
      : null,
  ].filter(Boolean);
  const starterPrompt = starterPromptSections.join('\n\n');

  if (!contextItems.length && !outputItems.length && !checkItems.length && !primaryActionLabel) {
    return null;
  }

  const columns = [
    {
      empty: labels.firstRunKitEmpty,
      items: contextItems,
      title: labels.firstRunKitInputTitle,
    },
    {
      empty: labels.firstRunKitEmpty,
      items: outputItems,
      title: labels.firstRunKitOutputTitle,
    },
    {
      empty: labels.firstRunKitEmpty,
      items: checkItems,
      title: labels.firstRunKitChecklistTitle,
    },
  ];

  return (
    <section className="rounded-3xl border border-[#8B5CF6]/45 bg-[#160F2A] p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-label text-xs text-[#C4B5FD]">{labels.firstRunKitEyebrow}</p>
          <h2 className="font-display mt-1 text-xl font-bold text-[#F4EFFA]">{labels.firstRunKitTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C8B1E4]">{labels.firstRunKitDetail}</p>
        </div>
        {primaryActionLabel && (
          <span className="inline-flex w-fit rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-1.5 text-xs font-semibold text-[#6EE7B7]">
            {primaryActionLabel}
          </span>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map((column, columnIndex) => (
          <div key={column.title} className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#251A40] text-xs font-bold text-[#C4B5FD]">
                {columnIndex + 1}
              </span>
              <h3 className="font-display text-base font-bold text-[#F4EFFA]">{column.title}</h3>
            </div>
            <DetailList items={column.items} emptyText={column.empty} />
          </div>
        ))}
      </div>
      {starterPrompt && (
        <div className="mt-4 rounded-2xl border border-[#8B5CF6]/35 bg-[#0F0A1E] p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-label text-xs text-[#C4B5FD]">{labels.firstRunPromptEyebrow}</p>
              <h3 className="font-display text-base font-bold text-[#F4EFFA]">{labels.firstRunPromptTitle}</h3>
            </div>
            <CopyTextButton
              copiedLabel={labels.copied}
              errorLabel={labels.copyFailed}
              label={labels.copyPrompt}
              text={starterPrompt}
            />
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-[#2F184B] bg-[#080612] p-4 text-xs leading-5 text-[#D6C5E8]">
            {starterPrompt}
          </pre>
        </div>
      )}
    </section>
  );
}

function TrustBoundaryGrid({ blueprint, labels, trustDisclosure, usesCreatorInfra }) {
  const agentHubItems = blueprint?.trustBoundary?.dataSentToAgentHub ?? [];
  const creatorInfraItems = blueprint?.trustBoundary?.dataSentToCreatorInfra ?? [];
  const userWarnings = blueprint?.trustBoundary?.userWarnings ?? [];
  const creatorItems = creatorInfraItems.length > 0
    ? creatorInfraItems
    : usesCreatorInfra && trustDisclosure
      ? [trustDisclosure]
      : [];

  if (!agentHubItems.length && !creatorItems.length && !userWarnings.length) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-label text-xs text-[#B794F4]">{labels.trustBoundaryEyebrow}</p>
          <h3 className="font-display mt-1 text-lg font-bold text-[#F4EFFA]">{labels.trustBoundaryTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#C8B1E4]">{labels.trustBoundaryDetail}</p>
        </div>
        <ShieldCheck className={`h-5 w-5 shrink-0 ${usesCreatorInfra ? 'text-[#F59E0B]' : 'text-[#10B981]'}`} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
          <h4 className="font-display mb-3 text-sm font-bold text-[#F4EFFA]">{labels.trustAgentHub}</h4>
          <DetailList items={agentHubItems} emptyText={labels.blueprintEmpty} />
        </div>
        <div className={`rounded-2xl border p-4 ${
          creatorItems.length > 0
            ? 'border-[#F59E0B]/35 bg-[#1A1208]'
            : 'border-[#2F184B] bg-[#080612]'
        }`}>
          <h4 className="font-display mb-3 text-sm font-bold text-[#F4EFFA]">{labels.trustCreatorInfra}</h4>
          <DetailList icon={creatorItems.length > 0 ? AlertTriangle : Check} items={creatorItems} emptyText={labels.trustCreatorInfraEmpty} tone={creatorItems.length > 0 ? 'warning' : 'success'} />
        </div>
        <div className="rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-4">
          <h4 className="font-display mb-3 text-sm font-bold text-[#F4EFFA]">{labels.trustUserWarnings}</h4>
          <DetailList icon={AlertTriangle} items={userWarnings} emptyText={labels.trustWarningsEmpty} tone="warning" />
        </div>
      </div>
    </div>
  );
}

function FallbackOverviewCard({ items = [], labels }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">{labels.fallbackPathTitle}</h3>
      </div>
      <p className="mb-4 text-sm leading-6 text-[#F6C177]">{labels.fallbackOverviewDetail}</p>
      <DetailList icon={AlertTriangle} items={items} emptyText={labels.fallbackPathEmpty} tone="warning" />
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

function workspaceActionText(item) {
  if (typeof item === 'string') {
    return item;
  }

  if (item && typeof item === 'object') {
    return item.label || item.title || item.text || item.key || '';
  }

  return '';
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

  const expectedOutputSections = workspaceRecipe.blueprint?.outputSchema?.sections ?? [];
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
          {expectedOutputSections.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#6B3FA0]/35 bg-[#080612] p-3">
              <p className="font-label text-[10px] text-[#9B72CF]">{labels.historyOutputReviewTitle}</p>
              <ul className="mt-2 grid gap-2 text-xs leading-5 text-[#D6C5E8] md:grid-cols-2">
                {expectedOutputSections.slice(0, 4).map((section) => (
                  <li key={section.key} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9B72CF]" />
                    <span>{section.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            {workspaceRecipe.nextActions.map(workspaceActionText).filter(Boolean).map((action, index) => (
                <li key={`${action}-${index}`} className="flex gap-3">
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

function workspaceLoopTier(score, labels) {
  if (score >= 100) {
    return {
      detail: labels.loopTierCompleteDetail,
      name: labels.loopTierComplete,
    };
  }

  if (score >= 75) {
    return {
      detail: labels.loopTierProofDetail,
      name: labels.loopTierProof,
    };
  }

  if (score >= 50) {
    return {
      detail: labels.loopTierRunningDetail,
      name: labels.loopTierRunning,
    };
  }

  return {
    detail: labels.loopTierStartDetail,
    name: labels.loopTierStart,
  };
}

function WorkspaceSessionLoop({ baseHref, labels, sessionState, workspaceRecipe }) {
  const hasRun = Boolean(sessionState?.hasSuccessfulRun || workspaceRecipe?.lastRun?.status === 'succeeded');
  const hasReview = Boolean(sessionState?.hasReview);
  const setupReady = !workspaceRecipe?.readiness?.blockers?.length && !workspaceRecipe?.disabledReason;
  const steps = [
    {
      done: true,
      key: 'access',
      label: labels.loopAccess,
    },
    {
      done: setupReady,
      key: 'setup',
      label: labels.loopSetup,
    },
    {
      done: hasRun,
      key: 'run',
      label: labels.loopRun,
    },
    {
      done: hasReview,
      key: 'review',
      label: labels.loopReview,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const score = Math.round((doneCount / steps.length) * 100);
  const tier = workspaceLoopTier(score, labels);
  const nextOpenStep = steps.find((step) => !step.done);
  const stepGain = Math.round(100 / steps.length);
  const nextAction = (() => {
    if (workspaceRecipe?.disabledReason) {
      return {
        detail: workspaceRecipe.disabledReason,
        href: `${baseHref}?tab=setup`,
        label: labels.loopFixSetup,
        title: labels.loopBlocked,
      };
    }

    if (!setupReady) {
      return {
        detail: labels.loopSetupDetail,
        href: `${baseHref}?tab=setup`,
        label: labels.loopPrepare,
        title: labels.loopSetupNext,
      };
    }

    if (!hasRun) {
      return {
        detail: labels.loopRunDetail,
        href: `${baseHref}?tab=use`,
        label: labels.loopRunCta,
        title: labels.loopRunNext,
      };
    }

    if (!hasReview) {
      return {
        detail: labels.loopReviewDetail,
        href: `${baseHref}?tab=review`,
        label: labels.loopReviewCta,
        title: labels.loopReviewNext,
      };
    }

    return {
      detail: labels.loopReplayDetail,
      href: `${baseHref}?tab=use`,
      label: labels.loopReplayCta,
      title: labels.loopComplete,
    };
  })();

  return (
    <section className="rounded-3xl border border-[#6B3FA0]/45 bg-[radial-gradient(circle_at_top_left,#2A1750_0%,#120C24_46%,#080612_100%)] p-5 shadow-[0_18px_55px_rgba(8,6,18,0.28)]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-label rounded-full border border-[#8B5CF6]/45 bg-[#1A152F] px-3 py-1.5 text-xs text-[#D8B4FE]">
              {labels.loopEyebrow}
            </span>
            <span className="rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-1.5 text-xs font-semibold text-[#6EE7B7]">
              {doneCount}/{steps.length} {labels.loopStepsDone}
            </span>
            <span className="rounded-full border border-[#8B5CF6]/40 bg-[#251A40] px-3 py-1.5 text-xs font-semibold text-[#D8B4FE]">
              {labels.loopLevel} · {tier.name}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#F4EFFA]">{nextAction.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#C8B1E4]">{nextAction.detail}</p>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[#9B72CF]">{tier.detail}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                  step.done
                    ? 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]'
                    : 'border-[#2F184B] bg-[#080612] text-[#9B72CF]'
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${step.done ? 'text-[#10B981]' : 'text-[#4A3D6B]'}`} />
                <span className="min-w-0 flex-1">{step.label}</span>
                {!step.done && step.key === nextOpenStep?.key && (
                  <span className="font-stat rounded-full bg-[#251A40] px-2 py-0.5 text-[10px] text-[#D8B4FE]">
                    +{stepGain}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#8B5CF6]/35 bg-[#0F0A1E] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-label text-xs text-[#B794F4]">{labels.loopScore}</p>
            <Trophy className="h-5 w-5 text-[#C4B5FD]" />
          </div>
          <p className="font-stat text-5xl text-[#F4EFFA]">{score}%</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#251A40]">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${score}%` }} />
          </div>
          <Link
            href={nextAction.href}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
          >
            {nextAction.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
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
  sessionState,
  setupLabel,
  workspaceManifest,
  workspaceRecipe,
}) {
  const isEnglish = locale === 'en';
  const labels = isEnglish
    ? {
        agentReady: 'Agent ready',
        blueprintInputs: 'Agent-specific inputs',
        blueprintOutputs: 'Expected output structure',
        blueprintEmpty: 'No agent-specific blueprint yet.',
        blueprintExample: 'Example:',
        continueToUse: 'Continue to use',
        detailsEyebrow: 'Usage frame',
        detailsTitle: 'Useful details',
        deliverables: 'Expected deliverables',
        deliverablesEmpty: 'No deliverables listed.',
        examples: 'Usage examples',
        examplesEmpty: 'No example yet.',
        fallbackPathEmpty: 'No fallback path is required for this workspace.',
        fallbackOverviewDetail: 'This agent can rely on approved creator infrastructure. AgentHub keeps access, server-side proxying, audit and history in the workspace.',
        fallbackPathTitle: 'Fallback path',
        firstRunKitChecklistTitle: 'Final check',
        firstRunKitDetail: 'Use this mini brief to prepare a first input that is complete enough to produce a useful stored result.',
        firstRunKitEmpty: 'No specific item yet.',
        firstRunKitEyebrow: 'First run kit',
        firstRunKitInputTitle: 'Context to paste',
        firstRunKitOutputTitle: 'Expected output',
        firstRunKitTitle: 'Prepare a useful first run',
        firstRunPromptChecks: 'Checks before sending',
        firstRunPromptContext: 'Context I will provide',
        firstRunPromptEyebrow: 'Starter prompt',
        firstRunPromptGoal: 'Goal',
        firstRunPromptHint: 'Copy into the run input',
        firstRunPromptOutput: 'Expected output',
        firstRunPromptTitle: 'Ready-to-paste input',
        copied: 'Copied',
        copyFailed: 'Copy failed',
        copyPrompt: 'Copy prompt',
        limitations: 'Important limitations',
        limitationsEmpty: 'No published limitation.',
        mainCapabilities: 'Main capabilities',
        mainCapabilitiesEmpty: 'No detailed capability was provided.',
        objective: 'Objective',
        outcomeChecklistEmpty: 'Use this workspace once before judging the result.',
        outcomeChecklistTitle: 'Before leaving feedback',
        optional: 'Optional',
        overviewEyebrow: 'At a glance',
        overviewTitle: 'What this agent provides',
        prepare: 'Set up',
        requiredInputs: 'Inputs to prepare',
        requiredInputsEmpty: 'No specific input was provided.',
        required: 'Required',
        review: 'Review',
        reviewEyebrow: 'Verified feedback',
        reviewTitle: 'Review after use',
        historyDetail: 'Stored runs visible for this access.',
        historyOutputReviewTitle: 'Compare the latest result against',
        historyState: 'Run history',
        inputChars: 'input characters',
        lastRunState: 'Latest run',
        latestInput: 'Latest input',
        latestOutput: 'Latest output',
        latestRunReviewDetail: 'Base your review on the stored result, not only on the listing promise.',
        latestRunReviewTitle: 'Latest result to evaluate',
        launchBriefDetail: 'Use this as the final check before sending user context to the runtime.',
        launchBriefEyebrow: 'Before running',
        launchBriefTitle: 'Use this workspace correctly',
        launchChecklist: 'Launch checklist',
        launchInputs: 'Context to include',
        reviewOutputTitle: 'Expected result to check',
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
        noLastRunDetail: 'Use this workspace once to create history.',
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
          document: 'Guided AI assistant',
          endpoint: 'Creator API agent',
          workflow: 'Workflow agent',
        },
        runtimeState: 'Runtime',
        setup: 'Setup',
        setupChecklistEmpty: 'No launch checklist is required.',
        setupChecklistTitle: 'Launch checklist',
        setupBriefDetail: 'Use this short brief to gather the right context before opening the execution tab.',
        setupBriefEyebrow: 'Agent setup brief',
        setupBriefOutput: 'Expected result should include',
        setupBriefTitle: 'Prepare the first useful run',
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
        trustAgentHub: 'Kept in AgentHub',
        trustBoundaryDetail: 'This clarifies which parts of the run stay inside AgentHub and which parts may depend on approved creator infrastructure.',
        trustBoundaryEyebrow: 'Trust boundary',
        trustBoundaryTitle: 'Where your data goes',
        trustCreatorInfra: 'Creator infrastructure',
        trustCreatorInfraEmpty: 'No creator infrastructure is required for this workspace.',
        trustUserWarnings: 'User warnings',
        trustWarningsEmpty: 'No specific warning for this workspace.',
        trustWarnings: 'Trust warnings',
        unknownInfra: 'Unknown infrastructure',
        workspaceBlocked: 'Execution blocked',
        workspaceReady: 'Ready to run',
        loopAccess: 'Access active',
        loopBlocked: 'Setup needs attention',
        loopComplete: 'Workspace loop complete',
        loopEyebrow: 'Workspace loop',
        loopFixSetup: 'Review setup',
        loopLevel: 'Level',
        loopPrepare: 'Prepare context',
        loopReplayCta: 'Start another session',
        loopReplayDetail: 'You have a result and a verified review. Keep comparing outputs or try another input.',
        loopReview: 'Review left',
        loopReviewCta: 'Leave review',
        loopReviewDetail: 'A run is stored. Leave a verified review while the output is still fresh.',
        loopReviewNext: 'Next: verified review',
        loopRun: 'Run completed',
        loopRunCta: 'Start now',
        loopRunDetail: 'The workspace is ready. Send a first input to create stored history.',
        loopRunNext: 'Next: first run',
        loopScore: 'Session score',
        loopSetup: 'Setup ready',
        loopSetupDetail: 'Check the required context and runtime notes before launching.',
        loopSetupNext: 'Next: prepare the run',
        loopStepsDone: 'steps done',
        loopTierComplete: 'Proof complete',
        loopTierCompleteDetail: 'This access has a stored result and a verified review. You can now compare another input or another agent.',
        loopTierProof: 'Proof needed',
        loopTierProofDetail: 'The workspace has produced a result. The next useful signal is a verified review.',
        loopTierRunning: 'Running',
        loopTierRunningDetail: 'The setup is ready. Create a stored result to unlock review eligibility.',
        loopTierStart: 'Starting',
        loopTierStartDetail: 'Prepare the context, then run the workspace once to create useful history.',
      }
    : {
        agentReady: 'Agent prêt',
        blueprintInputs: 'Inputs spécifiques à cet agent',
        blueprintOutputs: 'Structure de sortie attendue',
        blueprintEmpty: 'Aucun blueprint spécifique disponible pour le moment.',
        blueprintExample: 'Exemple :',
        continueToUse: 'Continuer vers l’utilisation',
        detailsEyebrow: 'Cadre d’usage',
        detailsTitle: 'Détails utiles',
        deliverables: 'Livrables attendus',
        deliverablesEmpty: 'Livrables non renseignés.',
        examples: 'Exemples d’usage',
        examplesEmpty: 'Aucun exemple fourni pour le moment.',
        fallbackPathEmpty: 'Aucun parcours de fallback requis pour ce workspace.',
        fallbackOverviewDetail: 'Cet agent peut s’appuyer sur une infrastructure créateur approuvée. AgentHub conserve l’accès, le proxy serveur, l’audit et l’historique dans le workspace.',
        fallbackPathTitle: 'Parcours de fallback',
        firstRunKitChecklistTitle: 'Dernier contrôle',
        firstRunKitDetail: 'Utilisez ce mini brief pour préparer un premier input assez complet et obtenir un résultat stocké exploitable.',
        firstRunKitEmpty: 'Aucun élément spécifique pour l’instant.',
        firstRunKitEyebrow: 'Kit de première exécution',
        firstRunKitInputTitle: 'Contexte à coller',
        firstRunKitOutputTitle: 'Résultat attendu',
        firstRunKitTitle: 'Préparer une première exécution utile',
        firstRunPromptChecks: 'Contrôles avant envoi',
        firstRunPromptContext: 'Contexte que je vais fournir',
        firstRunPromptEyebrow: 'Prompt de départ',
        firstRunPromptGoal: 'Objectif',
        firstRunPromptHint: 'À coller dans le champ d’exécution',
        firstRunPromptOutput: 'Résultat attendu',
        firstRunPromptTitle: 'Input prêt à coller',
        copied: 'Copié',
        copyFailed: 'Copie impossible',
        copyPrompt: 'Copier le prompt',
        limitations: 'Limites importantes',
        limitationsEmpty: 'Aucune limite publiée.',
        mainCapabilities: 'Capacités principales',
        mainCapabilitiesEmpty: 'Aucune capacité détaillée n’a été renseignée.',
        objective: 'Objectif',
        outcomeChecklistEmpty: 'Utilisez ce workspace au moins une fois avant de juger le résultat.',
        outcomeChecklistTitle: 'Avant de laisser un avis',
        optional: 'Optionnel',
        overviewEyebrow: 'En bref',
        overviewTitle: 'Ce que cet agent apporte',
        prepare: 'Mettre en place',
        requiredInputs: 'À préparer',
        requiredInputsEmpty: 'Aucun input spécifique n’a été renseigné.',
        required: 'Requis',
        review: 'Avis',
        reviewEyebrow: 'Retour vérifié',
        reviewTitle: 'Avis après utilisation',
        historyDetail: 'Exécutions stockées et visibles pour cet accès.',
        historyOutputReviewTitle: 'Comparer le dernier résultat avec',
        historyState: 'Historique d’exécution',
        inputChars: 'caractères input',
        lastRunState: 'Dernière exécution',
        latestInput: 'Dernier input',
        latestOutput: 'Dernière sortie',
        latestRunReviewDetail: 'Basez votre avis sur le résultat stocké, pas seulement sur la promesse de la fiche.',
        latestRunReviewTitle: 'Dernier résultat à évaluer',
        launchBriefDetail: 'Utilisez ce rappel comme dernier contrôle avant d’envoyer le contexte utilisateur au moteur d’exécution.',
        launchBriefEyebrow: 'Avant lancement',
        launchBriefTitle: 'Utiliser ce workspace correctement',
        launchChecklist: 'Checklist de lancement',
        launchInputs: 'Contexte à inclure',
        reviewOutputTitle: 'Résultat attendu à vérifier',
        lastRunStatuses: {
          failed: 'Échec',
          running: 'En cours',
          succeeded: 'Terminée',
        },
        locale: 'fr',
        agenthubInfraDetail: 'L’exécution reste derrière les contrôles AgentHub.',
        creatorInfraDetail: 'L’exécution peut utiliser une infrastructure créateur approuvée via les serveurs AgentHub.',
        infraModes: {
          agenthub_hosted: 'Hébergé AgentHub',
          creator_hosted: 'Infra créateur',
          hybrid: 'Exécution hybride',
        },
        infrastructure: 'Infrastructure',
        limits: 'Limites',
        noSpecificLimit: 'Aucune limite d’exécution spécifique.',
        noLastRun: 'Aucune exécution',
        noLastRunDetail: 'Utilisez le workspace une première fois pour créer l’historique.',
        nextActions: 'Prochaines actions',
        primaryAction: 'Action principale',
        primaryActionDetail: 'Ce que le workspace lancera en premier.',
        readyToRun: 'Les contrôles AgentHub autorisent l’exécution.',
        recipeSummaryEyebrow: 'Recette workspace',
        recipeSummaryTitle: 'Disponibilité de l’exécution',
        readinessBlockers: 'Blocages à résoudre',
        readinessScoreTitle: 'Score de préparation',
        runtimeLimits: 'Limites d’exécution',
        startupPlanEyebrow: 'Parcours de démarrage',
        startupPlanHint: 'Adapté au type d’agent',
        startupPlanTitle: 'Comment utiliser ce workspace',
        runtimePanels: {
          assistant: 'Assistant IA guidé',
          document: 'Assistant IA guidé',
          endpoint: 'Agent API creator',
          workflow: 'Agent workflow',
        },
        runtimeState: 'État d’exécution',
        setup: 'Setup',
        setupChecklistEmpty: 'Aucune checklist de lancement requise.',
        setupChecklistTitle: 'Checklist de lancement',
        setupBriefDetail: 'Utilisez ce brief court pour rassembler le bon contexte avant d’ouvrir l’onglet d’exécution.',
        setupBriefEyebrow: 'Brief de mise en place',
        setupBriefOutput: 'Le résultat attendu doit inclure',
        setupBriefTitle: 'Préparer la première exécution utile',
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
        trustAgentHub: 'Conservé dans AgentHub',
        trustBoundaryDetail: 'Ce bloc clarifie ce qui reste dans AgentHub et ce qui peut dépendre d’une infrastructure créateur approuvée.',
        trustBoundaryEyebrow: 'Frontière de confiance',
        trustBoundaryTitle: 'Où vont les données',
        trustCreatorInfra: 'Infrastructure créateur',
        trustCreatorInfraEmpty: 'Aucune infrastructure créateur n’est requise pour ce workspace.',
        trustUserWarnings: 'Avertissements utilisateur',
        trustWarningsEmpty: 'Aucun avertissement spécifique pour ce workspace.',
        trustWarnings: 'Avertissements confiance',
        unknownInfra: 'Infrastructure inconnue',
        workspaceBlocked: 'Exécution bloquée',
        workspaceReady: 'Prêt à exécuter',
        loopAccess: 'Accès actif',
        loopBlocked: 'Setup à surveiller',
        loopComplete: 'Boucle workspace complète',
        loopEyebrow: 'Boucle workspace',
        loopFixSetup: 'Vérifier le setup',
        loopLevel: 'Niveau',
        loopPrepare: 'Préparer le contexte',
        loopReplayCta: 'Démarrer une autre session',
        loopReplayDetail: 'Vous avez un résultat et un avis vérifié. Continuez à comparer les sorties ou testez un nouvel input.',
        loopReview: 'Avis laissé',
        loopReviewCta: 'Laisser un avis',
        loopReviewDetail: 'Une exécution est stockée. Laissez un avis vérifié tant que le résultat est encore frais.',
        loopReviewNext: 'Prochaine étape : avis vérifié',
        loopRun: 'Exécution terminée',
        loopRunCta: 'Démarrer maintenant',
        loopRunDetail: 'Le workspace est prêt. Envoyez un premier input pour créer un historique exploitable.',
        loopRunNext: 'Prochaine étape : première exécution',
        loopScore: 'Score session',
        loopSetup: 'Setup prêt',
        loopSetupDetail: 'Vérifiez le contexte requis et les notes d’exécution avant de lancer.',
        loopSetupNext: 'Prochaine étape : préparer l’exécution',
        loopStepsDone: 'étapes validées',
        loopTierComplete: 'Preuve complète',
        loopTierCompleteDetail: 'Cet accès possède un résultat stocké et un avis vérifié. Vous pouvez maintenant comparer un autre input ou un autre agent.',
        loopTierProof: 'Preuve à compléter',
        loopTierProofDetail: 'Le workspace a produit un résultat. Le prochain signal utile est un avis vérifié.',
        loopTierRunning: 'En exécution',
        loopTierRunningDetail: 'Le setup est prêt. Créez un résultat stocké pour débloquer l’avis vérifié.',
        loopTierStart: 'Démarrage',
        loopTierStartDetail: 'Préparez le contexte, puis exécutez le workspace une fois pour créer un historique utile.',
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
  const workspaceBlueprint = workspaceRecipe?.blueprint ?? workspaceManifest?.blueprint ?? null;
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
              {agent.name ?? (isEnglish ? 'AgentHub agent' : 'Agent AgentHub')}
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

      <WorkspaceSessionLoop
        baseHref={baseHref}
        labels={labels}
        sessionState={sessionState}
        workspaceRecipe={workspaceRecipe}
      />

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
              <TrustBoundaryGrid
                blueprint={workspaceBlueprint}
                labels={labels}
                trustDisclosure={trustDisclosure}
                usesCreatorInfra={usesCreatorInfra}
              />
              <FallbackOverviewCard items={workspaceRecipe?.fallbackPath ?? []} labels={labels} />
            </Panel>
          )}

          {activeTab === 'setup' && (
            <Panel eyebrow={labels.setupEyebrow} title={workspaceManifest?.setup?.title || labels.setupTitle}>
              <RecipeBlocks blocks={recipeBlocksForTab('setup')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
              {workspaceManifest?.setup?.description && (
                <p className="mb-5 text-sm leading-6 text-[#C8B1E4]">{workspaceManifest.setup.description}</p>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                <SetupBriefCard
                  blueprint={workspaceBlueprint}
                  labels={labels}
                  primaryActionLabel={workspaceRecipe?.primaryActionLabel}
                />
                <div className="rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5 md:col-span-2">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.setupChecklistTitle}</h3>
                  <DetailList items={workspaceRecipe?.setupChecklist ?? []} emptyText={labels.setupChecklistEmpty} />
                </div>
                <div className="md:col-span-2">
                  <BlueprintFieldGrid
                    emptyText={labels.blueprintEmpty}
                    exampleLabel={labels.blueprintExample}
                    fields={workspaceBlueprint?.inputSchema?.fields ?? []}
                    optionalLabel={labels.optional}
                    requiredLabel={labels.required}
                    title={labels.blueprintInputs}
                  />
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
              <FirstRunKit
                blueprint={workspaceBlueprint}
                labels={labels}
                outputExamples={outputExamples}
                primaryActionLabel={workspaceRecipe?.primaryActionLabel}
                requiredInputs={requiredInputs}
                setupItems={setupItems}
              />
              {(runnerTitle || runnerDescription || trustDisclosure) && (
                <Panel eyebrow={isEnglish ? 'Runtime' : 'Type d’exécution'} title={runnerTitle || labels.tabs.use}>
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
              <LaunchGuidance blueprint={workspaceBlueprint} labels={labels} />
              {runnerSlot}
            </div>
          )}

          {activeTab === 'details' && (
            <Panel eyebrow={labels.detailsEyebrow} title={labels.detailsTitle}>
              <RecipeBlocks blocks={recipeBlocksForTab('details')} requiredText={labels.recipeRequired} title={labels.recipeTitle} />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <BlueprintSectionGrid
                    emptyText={labels.blueprintEmpty}
                    sections={workspaceBlueprint?.outputSchema?.sections ?? []}
                    title={labels.blueprintOutputs}
                  />
                </div>
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
              {workspaceBlueprint?.outputSchema?.sections?.length > 0 && (
                <div className="mb-5 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.reviewOutputTitle}</h3>
                  <DetailList
                    items={workspaceBlueprint.outputSchema.sections.slice(0, 5).map((section) => section.label)}
                    emptyText={labels.blueprintEmpty}
                  />
                </div>
              )}
              {workspaceRecipe?.historyPreview && (
                <div className="mb-5 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
                  <p className="font-label mb-2 text-xs text-[#B794F4]">{labels.latestRunReviewTitle}</p>
                  <p className="mb-4 text-sm leading-6 text-[#C8B1E4]">{labels.latestRunReviewDetail}</p>
                  <div className="grid gap-3 md:grid-cols-2">
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
              {workspaceBlueprint?.supportHints?.length > 0 && (
                <div className="mb-5 rounded-2xl border border-[#F59E0B]/35 bg-[#1A1208] p-5">
                  <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{labels.trustWarnings}</h3>
                  <DetailList icon={AlertTriangle} items={workspaceBlueprint.supportHints} emptyText="" tone="warning" />
                </div>
              )}
              {reviewSlot}
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
