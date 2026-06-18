'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ClipboardList,
  Eye,
  Layers3,
  Lock,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_OPTIONS } from '@/lib/agent-contract';
import { AGENT_TEMPLATES, templateToCreatorFormValues } from '@/lib/agent-templates';
import {
  clearNewAgentDraftStorage,
  getLegacyNewAgentDraftStorageKey,
  getNewAgentDraftStorageKey,
} from '@/lib/new-agent-draft-storage';
import { submitAgentForReviewAction } from '@/server/agents/actions';
import { CodeAlert, CodePanel } from './code-console-ui';
import CreatorGuardrailPreview from './creator-guardrail-preview';
import WorkspaceBlueprintPreview from './workspace-blueprint-preview';

const steps = [
  { id: 'start', label: 'Départ', title: 'Template ou libre' },
  { id: 'listing', label: 'Fiche', title: 'Fiche publique' },
  { id: 'contract', label: 'Contrat', title: 'Contrat agent' },
  { id: 'runtime', label: 'Publication', title: 'Choisir le type de publication' },
  { id: 'preview', label: 'Aperçu', title: 'Aperçu final' },
];

const stepPlaybooks = [
  {
    items: ['Choisir un template beta', 'Vérifier le runtime proposé', 'Passer à la fiche publique'],
    time: '2 min',
    title: 'Débloquer un point de départ',
  },
  {
    items: ['Nom + catégorie lisibles', 'Promesse courte et concrète', 'Prix beta supérieur à 0'],
    time: '5 min',
    title: 'Rendre la fiche achetable',
  },
  {
    items: ['Inputs utilisateur précis', 'Livrables vérifiables', 'Limites visibles avant activation'],
    time: '6 min',
    title: 'Sécuriser le contrat agent',
  },
  {
    items: ['Choisir assistant, workflow ou API', 'Décrire les étapes/runtime', 'Éviter toute promesse non branchée'],
    time: '4 min',
    title: 'Préparer la review runtime',
  },
  {
    items: ['Relire la fiche publique', 'Vérifier le workspace prévu', 'Soumettre à validation admin'],
    time: '3 min',
    title: 'Transformer en candidat beta',
  },
];

const copy = {
  back: 'Retour au dashboard',
  eyebrow: 'NOUVEL AGENT',
  title: 'Créer une publication AgentHub',
  subtitle: 'Partez d’un template ou démarrez librement, complétez la fiche, choisissez le type de publication, puis soumettez à validation.',
  noCategories: 'Aucune catégorie Supabase disponible. Ajoutez les catégories beta avant de soumettre un agent.',
  missingProfileTitle: 'Profil créateur requis',
  missingProfile:
    'Ce compte peut accéder à l’espace créateur, mais il ne peut soumettre des agents que s’il possède son propre profil créateur.',
  profileError: 'Impossible de vérifier votre profil créateur. Réessayez ou contactez l’équipe.',
  safety: 'Validation admin obligatoire avant publication. En beta, les agents avancés sont réservés aux creators allowlistés.',
};

const errorMessages = {
  'missing-config': 'Configuration Supabase manquante.',
  required: 'Tous les champs sont requis.',
  'invalid-pricing': 'Le type de prix est invalide.',
  'invalid-price': 'Le prix beta doit être un montant supérieur à 0.',
  'invalid-risk': 'Le niveau de risque est invalide.',
  'invalid-contract': 'Le contrat d’agent est invalide.',
  'forbidden-risk': 'Les agents forbidden_beta ne peuvent pas être soumis directement.',
  'creator-profile-error': 'Impossible de lire votre profil créateur.',
  'creator-profile-missing': 'Aucun profil créateur n’est lié à ce compte.',
  'agent-insert-failed': 'La création de l’agent a échoué.',
  'version-insert-failed': 'La création de la version de validation a échoué.',
  'agent-submit-failed': 'La soumission de l’agent a échoué.',
  'invalid-workflow': 'Le workflow beta doit contenir 2 à 5 étapes au format "llm: ..." ou "webhook: ...".',
  'invalid-workflow-decision': 'Ajoutez une étape LLM qui décide clairement : prioriser, classer, scorer, qualifier ou choisir la suite.',
  'workflow-external-promise-without-webhook': 'Ce workflow promet une action externe. Ajoutez une étape webhook approuvable ou retirez cette promesse.',
  'invalid-workflow-endpoint': 'L’endpoint webhook doit être une URL HTTPS publique, sans localhost ni IP privée.',
  'workflow-endpoint-failed': 'Impossible d’enregistrer l’endpoint webhook du workflow.',
  'workflow-create-failed': 'Impossible d’enregistrer la définition workflow.',
  'missing-creator-endpoint': 'Ajoutez une URL endpoint HTTPS publique pour créer cet agent API.',
  'missing-creator-endpoint-disclosure': 'La fiche de l’agent API doit annoncer clairement l’appel à une API/endpoint creator approuvé côté serveur.',
  'invalid-creator-endpoint': 'L’agent API nécessite une URL HTTPS publique valide, sans localhost ni IP privée.',
  'creator-endpoint-failed': 'Impossible d’enregistrer l’endpoint API creator.',
  'creator-endpoint-config-failed': 'Impossible de lier l’endpoint API à cette version d’agent.',
};

const emptyValues = {
  creation_mode: '',
  agent_template: '',
  workflow_endpoint_name: '',
  workflow_endpoint_url: '',
  workflow_steps: 'llm: Comprendre le besoin utilisateur\nllm: Produire une réponse structurée',
  creator_endpoint_name: '',
  creator_endpoint_url: '',
  name: '',
  category_id: '',
  short_description: '',
  target_user: '',
  long_description: '',
  does: '',
  does_not_do: '',
  required_inputs: '',
  deliverables: '',
  sample_output: '',
  known_limits: '',
  pricing_type: 'task',
  starting_price_eur: '',
  risk_level: 'low',
  pricing_hint: '',
  execution_method: 'Assistant IA guidé: génération texte server-side, document léger en beta contrôlée, aucun outil externe.',
  workspace_mode: 'guided',
  setup_type: 'context',
  output_promise_summary: '',
  output_promise_examples: '',
  setup_items: '',
  execution_mode: 'llm_prompt',
  runtime_type: 'llm_prompt',
};

const meaningfulDraftFields = [
  'agent_template',
  'category_id',
  'creation_mode',
  'creator_endpoint_url',
  'deliverables',
  'does',
  'long_description',
  'name',
  'output_promise_summary',
  'required_inputs',
  'short_description',
  'target_user',
  'workflow_endpoint_url',
];

const inputClass =
  'w-full rounded-xl border border-[#D8DDEE] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15';

function Field({ children, hint, label, wide = false }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="font-label mb-1.5 block text-xs text-[#6B3FA0]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#6B7280]">{hint}</span>}
    </label>
  );
}

function lines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function fieldReady(value, minLength = 3) {
  return String(value ?? '').trim().length >= minLength;
}

function positivePrice(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0;
}

function hasMeaningfulDraft(values) {
  return meaningfulDraftFields.some((field) => String(values?.[field] ?? '').trim().length > 0);
}

function normalizeDraftPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.values || typeof payload.values !== 'object') {
    return null;
  }

  return {
    currentStep: Number.isInteger(payload.currentStep)
      ? Math.min(steps.length - 1, Math.max(0, payload.currentStep))
      : 0,
    savedAt: Number(payload.savedAt) || Date.now(),
    values: {
      ...emptyValues,
      ...payload.values,
    },
  };
}

function formatDraftSavedAt(timestamp) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return 'récemment';
  }
}

function draftStepLabel(currentStep) {
  const step = steps[Math.min(steps.length - 1, Math.max(0, Number(currentStep) || 0))];

  return step ? `${step.label} · ${step.title}` : steps[0].title;
}

function draftAgentLabel(values) {
  const name = String(values?.name ?? '').trim();

  if (name) {
    return name;
  }

  const templateKey = String(values?.agent_template ?? '').trim();
  const template = AGENT_TEMPLATES.find((item) => item.key === templateKey);

  if (template?.label) {
    return `Template · ${template.label}`;
  }

  if (values?.creation_mode === 'free') {
    return 'Création libre';
  }

  return 'Agent sans nom';
}

function readNormalizedDraft(storage, draftKey) {
  try {
    return normalizeDraftPayload(JSON.parse(storage.getItem(draftKey) || 'null'));
  } catch {
    return null;
  }
}

function readDraftFromStorage(storage, draftKey, legacyDraftKey) {
  const scopedDraft = readNormalizedDraft(storage, draftKey);

  if (scopedDraft) {
    return scopedDraft;
  }

  if (legacyDraftKey && legacyDraftKey !== draftKey) {
    return readNormalizedDraft(storage, legacyDraftKey);
  }

  return null;
}

function runtimeAllowed(runtimeType, { canUseCreatorEndpoint, canUseWorkflowAutomation }) {
  if (runtimeType === 'workflow_automation') {
    return canUseWorkflowAutomation;
  }

  if (runtimeType === 'creator_endpoint') {
    return canUseCreatorEndpoint;
  }

  return true;
}

function sanitizeDraftForPermissions(draft, visibleTemplates, permissions) {
  if (!draft) {
    return null;
  }

  const templateIsVisible = !draft.values.agent_template || visibleTemplates.some((template) => template.key === draft.values.agent_template);
  const runtimeIsAllowed = runtimeAllowed(draft.values.runtime_type, permissions);
  const values = {
    ...draft.values,
  };

  if (!templateIsVisible) {
    values.agent_template = '';
    values.creation_mode = hasMeaningfulDraft(values) ? 'free' : '';
  }

  if (!runtimeIsAllowed) {
    values.creator_endpoint_name = '';
    values.creator_endpoint_url = '';
    values.runtime_type = 'llm_prompt';
    values.workflow_endpoint_name = '';
    values.workflow_endpoint_url = '';
    values.workflow_steps = '';
    values.execution_method = emptyValues.execution_method;
  }

  return {
    ...draft,
    currentStep: runtimeIsAllowed ? draft.currentStep : Math.min(draft.currentStep, 3),
    values,
  };
}

function workflowHasDecision(value) {
  return lines(String(value ?? '')).some((line) => /d[ée]cid|class|priorit|score|qualif|router|choisir|triage|cat[ée]gor/i.test(line));
}

function buildMarketplaceQualityChecks(values) {
  const isWorkflow = values.runtime_type === 'workflow_automation';
  const isCreatorEndpoint = values.runtime_type === 'creator_endpoint';
  const workflowSteps = lines(String(values.workflow_steps ?? ''));
  const requiredInputs = lines(String(values.required_inputs ?? ''));
  const deliverables = lines(String(values.deliverables ?? ''));

  return [
    {
      done: fieldReady(values.target_user, 16),
      key: 'audience',
      label: 'Cible précise',
    },
    {
      done: fieldReady(values.output_promise_summary, 24),
      key: 'promise',
      label: 'Promesse concrète',
    },
    {
      done: requiredInputs.length >= 2 && deliverables.length >= 1,
      key: 'inputs_outputs',
      label: 'Inputs et livrables nets',
    },
    {
      done: fieldReady(values.sample_output, 36),
      key: 'sample',
      label: 'Exemple de sortie',
    },
    {
      done: lines(String(values.does_not_do ?? '')).length > 0 && lines(String(values.known_limits ?? '')).length > 0,
      key: 'limits',
      label: 'Limites visibles',
    },
    {
      done:
        (!isWorkflow && !isCreatorEndpoint) ||
        (isWorkflow && workflowSteps.length >= 2 && workflowHasDecision(values.workflow_steps)) ||
        (isCreatorEndpoint && /^https:\/\//i.test(String(values.creator_endpoint_url ?? '').trim())),
      key: 'runtime_testable',
      label: isWorkflow || isCreatorEndpoint ? 'Agent avancé testable' : 'Assistant testable',
    },
  ];
}

function marketplaceQualityLabel(score) {
  if (score >= 84) {
    return 'Très testable';
  }

  if (score >= 67) {
    return 'Presque prêt';
  }

  if (score >= 34) {
    return 'À renforcer';
  }

  return 'Encore flou';
}

function buildCreatorCoach({ categories, currentStep, hasStartingPoint, values }) {
  const workflowSteps = lines(String(values.workflow_steps ?? ''));
  const isWorkflow = values.runtime_type === 'workflow_automation';
  const isCreatorEndpoint = values.runtime_type === 'creator_endpoint';
  const checks = [
    {
      done: hasStartingPoint,
      key: 'start',
      label: 'Point de départ choisi',
      step: 0,
    },
    {
      done:
        fieldReady(values.name, 4) &&
        fieldReady(values.short_description, 12) &&
        fieldReady(values.target_user, 8) &&
        Boolean(values.category_id) &&
        positivePrice(values.starting_price_eur),
      key: 'listing',
      label: 'Fiche publique claire',
      step: 1,
    },
    {
      done:
        fieldReady(values.does, 12) &&
        fieldReady(values.required_inputs, 8) &&
        fieldReady(values.deliverables, 8) &&
        fieldReady(values.output_promise_summary, 12),
      key: 'contract',
      label: 'Contrat agent exploitable',
      step: 2,
    },
    {
      done:
        !isWorkflow ||
        (workflowSteps.length >= 2 && workflowSteps.length <= 5 && workflowHasDecision(values.workflow_steps)),
      key: 'workflow',
      label: isWorkflow ? 'Workflow avec décision LLM' : 'Runtime cohérent',
      step: 3,
    },
    {
      done:
        !isCreatorEndpoint ||
        (fieldReady(values.creator_endpoint_name, 4) && /^https:\/\//i.test(String(values.creator_endpoint_url ?? '').trim())),
      key: 'endpoint',
      label: isCreatorEndpoint ? 'Endpoint API renseigné' : 'Endpoint non requis',
      step: 3,
    },
    {
      done: categories.length > 0,
      key: 'categories',
      label: 'Catégories disponibles',
      step: 1,
    },
  ];
  const doneCount = checks.filter((check) => check.done).length;
  const score = Math.round((doneCount / checks.length) * 100);
  const qualityChecks = buildMarketplaceQualityChecks(values);
  const qualityDoneCount = qualityChecks.filter((check) => check.done).length;
  const qualityScore = Math.round((qualityDoneCount / qualityChecks.length) * 100);
  const qualityLabel = marketplaceQualityLabel(qualityScore);
  const baseCoach = {
    checks,
    qualityChecks,
    qualityLabel,
    qualityScore,
  };
  const nextCheck = checks.find((check) => !check.done);
  const targetStep = nextCheck?.step ?? Math.min(steps.length - 1, Math.max(currentStep, 4));

  if (!nextCheck && currentStep < steps.length - 1) {
    return {
      actionLabel: 'Ouvrir la preview',
      ...baseCoach,
      detail: 'La base est prête. Relisez la fiche publique, le workspace et les garde-fous avant soumission.',
      label: 'Prêt pour la dernière revue',
      score,
      targetStep: steps.length - 1,
      tone: 'success',
    };
  }

  if (!nextCheck) {
    return {
      actionLabel: 'Soumettre en bas',
      ...baseCoach,
      detail: 'La publication est prête côté formulaire. La validation serveur et la review admin restent obligatoires.',
      label: 'Prêt à soumettre',
      score,
      targetStep,
      tone: 'success',
    };
  }

  return {
    actionLabel: `Corriger : ${nextCheck.label}`,
    ...baseCoach,
    detail: `Prochaine action concrète : ${nextCheck.label.toLowerCase()}. Le bouton ouvre directement l’étape concernée.`,
    label: 'Coach de création',
    score,
    targetStep,
    tone: score >= 60 ? 'warning' : 'start',
  };
}

function buildSubmissionGuidance({ canSubmit, categories, creatorCoach, creatorProfileMissing, currentStep, profileError }) {
  if (creatorProfileMissing) {
    return {
      tone: 'error',
      title: 'Profil créateur requis',
      text: 'Finalisez le profil créateur avant de soumettre une publication à la review admin.',
    };
  }

  if (profileError) {
    return {
      tone: 'error',
      title: 'Profil non vérifié',
      text: 'AgentHub ne peut pas vérifier le profil créateur pour le moment. Réessayez avant soumission.',
    };
  }

  if (categories.length === 0) {
    return {
      tone: 'error',
      title: 'Catégorie manquante',
      text: 'Aucune catégorie n’est disponible. La validation serveur refusera la publication tant qu’une catégorie ne peut pas être choisie.',
    };
  }

  if (currentStep < steps.length - 1) {
    return {
      tone: 'info',
      title: 'Preview finale à ouvrir',
      text: 'Passez par l’aperçu final pour relire la fiche publique, le workspace prévu et les garde-fous avant soumission.',
    };
  }

  if (!canSubmit) {
    return {
      tone: 'error',
      title: 'Soumission bloquée',
      text: 'Une condition système bloque encore la soumission. Corrigez les alertes affichées au-dessus du wizard.',
    };
  }

  if (creatorCoach.score < 100) {
    const nextCheck = creatorCoach.checks.find((check) => !check.done);

    return {
      tone: 'warning',
      title: 'Risque de refus serveur',
      text: nextCheck
        ? `Complétez “${nextCheck.label}” avant de soumettre pour éviter un aller-retour admin inutile.`
        : 'Certains champs requis ne sont pas encore assez solides pour une review fluide.',
    };
  }

  if (creatorCoach.qualityScore < 67) {
    return {
      tone: 'warning',
      title: 'Fiche encore faible côté marketplace',
      text: 'La soumission peut passer, mais la fiche risque d’être peu compréhensible pour les testeurs. Renforcez la promesse, les inputs ou les limites.',
    };
  }

  return {
    tone: 'success',
    title: 'Prêt à soumettre',
    text: 'La base formulaire est cohérente. La validation serveur puis la review admin restent obligatoires avant publication.',
  };
}

function CreatorCoachPanel({ coach, currentStep, setCurrentStep }) {
  const isSuccess = coach.tone === 'success';
  const visibleChecks = coach.checks.slice(0, 6);
  const visibleQualityChecks = coach.qualityChecks.slice(0, 6);
  const playbook = stepPlaybooks[currentStep] ?? stepPlaybooks[0];

  return (
    <section className="rounded-3xl border border-[#DDD6FE] bg-[radial-gradient(circle_at_top_left,#F3E8FF_0%,#FFFFFF_44%,#F8FAFC_100%)] p-5 shadow-[0_14px_40px_rgba(109,64,160,0.08)]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4B5FD] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B3FA0]">
              <Sparkles className="h-3.5 w-3.5" />
              Assistant de publication
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isSuccess ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' : 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]'
            }`}
            >
              {coach.score}% prêt
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#111827]">{coach.label}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">{coach.detail}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibleChecks.map((check) => (
              <div
                key={check.key}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  check.done
                    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                    : 'border-[#E3E7F2] bg-white text-[#64748B]'
                }`}
              >
                <Check className={`h-3.5 w-3.5 shrink-0 ${check.done ? 'text-[#10B981]' : 'text-[#CBD5E1]'}`} />
                {check.label}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-[#E9D5FF] bg-white/80 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-label text-[10px] text-[#6B3FA0]">QUALITÉ MARKETPLACE</p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{coach.qualityLabel}</p>
              </div>
              <span className="font-stat rounded-full border border-[#DDD6FE] bg-[#FAF7FF] px-3 py-1 text-sm text-[#6B3FA0]">
                {coach.qualityScore}%
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleQualityChecks.map((check) => (
                <div
                  key={check.key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                    check.done
                      ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                      : 'border-[#E3E7F2] bg-white text-[#64748B]'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 shrink-0 ${check.done ? 'text-[#10B981]' : 'text-[#CBD5E1]'}`} />
                  {check.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#C4B5FD] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-label text-xs text-[#6B3FA0]">Score</p>
            <Trophy className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <p className="font-stat text-5xl text-[#111827]">{coach.score}%</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EDE9FE]">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${coach.score}%` }} />
          </div>
          <Button
            type="button"
            onClick={() => setCurrentStep(coach.targetStep)}
            disabled={currentStep === coach.targetStep && coach.tone !== 'success'}
            className="mt-5 h-11 w-full border-0 bg-[#111827] text-white hover:bg-[#2B1A44] disabled:opacity-50"
          >
            {coach.actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="mt-4 rounded-2xl border border-[#E9D5FF] bg-[#FAF7FF] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-label text-[10px] text-[#6B3FA0]">SPRINT ÉTAPE</p>
              <span className="rounded-full border border-[#DDD6FE] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6B3FA0]">
                {playbook.time}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#111827]">{playbook.title}</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#4B5563]">
              {playbook.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8B5CF6]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeEndpointUrl(value) {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^[`"'“”‘’<]+|[`"'“”‘’>]+$/g, '')
    .replace(/[.,;:]+$/g, '')
    .trim();
}

function Stepper({ currentStep, hasStartingPoint, setCurrentStep }) {
  const activeStep = steps[currentStep] ?? steps[0];
  const progress = hasStartingPoint ? Math.round(((currentStep + 1) / steps.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#DDD6FE] bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-label text-xs text-[#6B3FA0]">
            Étape {currentStep + 1}/{steps.length} · {activeStep.title}
          </p>
          <span className="font-stat text-sm text-[#111827]">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#EDE9FE]">
          <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => {
          const active = index === currentStep;
          const done = index < currentStep;
          const locked = index > 0 && !hasStartingPoint;

          return (
            <button
              key={step.id}
              type="button"
              disabled={locked}
              onClick={() => setCurrentStep(index)}
              className={[
                'rounded-2xl border px-3 py-3 text-left transition-colors',
                active
                  ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#111827]'
                  : done
                    ? 'border-[#C4B5FD] bg-white text-[#374151]'
                    : locked
                      ? 'border-[#E3E7F2] bg-[#F8FAFC] text-[#9CA3AF]'
                      : 'border-[#E3E7F2] bg-white text-[#6B7280]',
              ].join(' ')}
            >
              <span className="font-stat text-xs text-[#6B3FA0]">0{index + 1}</span>
              <span className="mt-1 block text-sm font-semibold">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PublicListingPreview({ values }) {
  return (
    <CodePanel className="h-full">
      <p className="font-label mb-4 text-xs text-[#6B3FA0]">PREVIEW FICHE PUBLIQUE</p>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#C4B5FD] text-white">
        <Bot className="h-7 w-7" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-2xl font-bold text-[#111827]">{values.name || 'Nom de l’agent'}</h3>
        <span className="rounded-full border border-[#D8DDEE] bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-label text-[#6B7280]">
          {values.risk_level}
        </span>
      </div>
      <p className="text-sm leading-6 text-[#4B5563]">{values.short_description || 'Description courte visible dans la marketplace.'}</p>
      <div className="mt-5 grid gap-3 text-sm text-[#4B5563]">
        <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
          <p className="font-label mb-1 text-[10px] text-[#6B3FA0]">Utilisateur cible</p>
          <p>{values.target_user || 'Audience cible'}</p>
        </div>
        <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
          <p className="font-label mb-1 text-[10px] text-[#6B3FA0]">Prix</p>
          <p>{values.starting_price_eur ? `${values.starting_price_eur} €` : 'Prix fixe'} · {values.pricing_type}</p>
        </div>
      </div>
    </CodePanel>
  );
}

function WorkspacePreview({ values }) {
  const actions = lines(values.output_promise_examples).slice(0, 4);
  const fallbackActions = ['Décrire mon besoin', 'Générer la réponse', 'Relire le résultat'];
  const setupItems = lines(values.setup_items).slice(0, 5);

  return (
    <CodePanel className="h-full">
      <p className="font-label mb-4 text-xs text-[#6B3FA0]">PREVIEW WORKSPACE</p>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-xl font-bold text-[#111827]">Démarrer avec cette publication</h3>
          <p className="mt-1 text-sm text-[#4B5563]">{values.output_promise_summary || 'Promesse visible après activation.'}</p>
        </div>
      </div>
      <div className="grid gap-3">
        {(actions.length > 0 ? actions : fallbackActions).map((action, index) => (
          <div key={action} className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
            <span className="font-stat text-xs text-[#6B3FA0]">0{index + 1}</span>
            <p className="mt-1 text-sm font-semibold text-[#111827]">{action}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-[#E3E7F2] bg-white p-3">
        <p className="font-label mb-2 text-[10px] text-[#6B3FA0]">Inputs à préparer</p>
        <ul className="space-y-1 text-sm text-[#4B5563]">
          {(setupItems.length > 0 ? setupItems : ['Contexte utilisateur']).map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-[#10B981]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </CodePanel>
  );
}

function UserValueContractPreview({ values }) {
  const isWorkflow = values.runtime_type === 'workflow_automation';
  const isCreatorEndpoint = values.runtime_type === 'creator_endpoint';
  const runtimeLabel = isWorkflow ? 'Agent workflow' : isCreatorEndpoint ? 'Agent API' : 'Assistant IA guidé';
  const runtimeDetail = isWorkflow
    ? 'Suite d’étapes avec décision LLM, review sécurité et validation admin avant publication.'
    : isCreatorEndpoint
      ? 'Appel serveur signé vers un endpoint creator HTTPS approuvé, jamais depuis le client.'
      : 'Assistant texte/document léger exécuté côté serveur AgentHub, sans outil externe libre.';
  const inputItems = lines(values.required_inputs).slice(0, 3);
  const deliverableItems = lines(values.deliverables).slice(0, 3);
  const limitationItems = lines(values.known_limits || values.does_not_do).slice(0, 3);
  const priceLabel = values.starting_price_eur ? `${values.starting_price_eur} € sandbox` : 'Prix à compléter';
  const promise = values.output_promise_summary || values.short_description || 'Promesse de résultat à clarifier avant soumission.';
  const buyerChecks = [
    {
      label: 'Pour qui',
      value: values.target_user || 'Utilisateur cible à préciser',
    },
    {
      label: 'Ce que le user obtient',
      value: promise,
    },
    {
      label: 'Runtime réel',
      value: `${runtimeLabel} · ${runtimeDetail}`,
    },
    {
      label: 'Prix beta',
      value: `${priceLabel}. Aucun payout réel pendant Stripe sandbox.`,
    },
  ];

  return (
    <CodePanel className="lg:col-span-2 border-[#C4B5FD] bg-[radial-gradient(circle_at_top_left,#F5F3FF_0%,#FFFFFF_48%,#F8FAFC_100%)]">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-label text-xs text-[#6B3FA0]">CONTRAT CÔTÉ ACHETEUR</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#111827]">Ce que l’utilisateur pensera acheter</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
            Cette carte relit la publication comme un user : si elle n’est pas claire ici, elle ne sera pas claire en marketplace.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-[#DDD6FE] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B21B6]">
          {runtimeLabel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {buyerChecks.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#E9D5FF] bg-white p-4">
            <p className="font-label mb-2 text-[10px] text-[#6B3FA0]">{item.label}</p>
            <p className="text-sm leading-6 text-[#374151]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E3E7F2] bg-white p-4">
          <p className="font-label mb-2 text-[10px] text-[#6B3FA0]">Inputs demandés</p>
          <ul className="space-y-2 text-sm text-[#4B5563]">
            {(inputItems.length ? inputItems : ['Contexte utilisateur à préciser']).map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E3E7F2] bg-white p-4">
          <p className="font-label mb-2 text-[10px] text-[#6B3FA0]">Livrables promis</p>
          <ul className="space-y-2 text-sm text-[#4B5563]">
            {(deliverableItems.length ? deliverableItems : ['Livrable à préciser']).map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#FBBF24]/45 bg-[#FFFBEB] p-4">
          <p className="font-label mb-2 text-[10px] text-[#92400E]">Limites à afficher</p>
          <ul className="space-y-2 text-sm text-[#92400E]">
            {(limitationItems.length ? limitationItems : ['Limite à expliciter avant publication']).map((item) => (
              <li key={item} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CodePanel>
  );
}

function SubmissionReadinessPanel({ values }) {
  const isWorkflow = values.runtime_type === 'workflow_automation';
  const isCreatorEndpoint = values.runtime_type === 'creator_endpoint';
  const isAdvancedRuntime = isWorkflow || isCreatorEndpoint;
  const runtimeLabel = isWorkflow ? 'Agent workflow' : isCreatorEndpoint ? 'Agent API' : 'Assistant IA guidé';
  const revenueLabel = values.starting_price_eur ? `${values.starting_price_eur} € · GMV sandbox` : 'GMV sandbox après activation';
  const checks = [
    {
      title: 'Précheck sécurité',
      text: isAdvancedRuntime
        ? 'Un précheck et une security review manuelle sont requis avant publication.'
        : 'Un précheck automatique vérifie la fiche, les limites et les garde-fous avant review admin.',
    },
    {
      title: 'Review admin',
      text: isAdvancedRuntime
        ? 'L’admin doit approuver la fiche, les assets runtime et la décision de sécurité.'
        : 'L’admin valide la fiche publique, le contrat agent et la promesse de résultat.',
    },
    {
      title: 'Workspace',
      text: 'Le workspace sera généré depuis le blueprint affiché ici : inputs, actions, livrables et limites.',
    },
    {
      title: 'Revenus beta',
      text: `${revenueLabel}. Aucun payout réel n’est déclenché pendant la beta Stripe sandbox.`,
    },
  ];
  const advancedNotes = isWorkflow
    ? ['Workflow 2 à 5 étapes', 'Décision LLM obligatoire', 'Webhook optionnel approuvé si présent']
    : isCreatorEndpoint
      ? ['Endpoint HTTPS public requis', 'Appel serveur signé', 'Endpoint approuvé avant publication']
      : ['Ouvert aux creators', 'Réponse texte server-side', 'Pas d’outil externe libre'];

  return (
    <CodePanel className="lg:col-span-2 border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_100%)]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <p className="font-label mb-3 text-xs text-[#6B3FA0]">AVANT SOUMISSION</p>
          <h2 className="font-display text-2xl font-bold text-[#111827]">Chaîne de publication vérifiée</h2>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Cette publication ne va pas directement en marketplace. AgentHub vérifie le niveau runtime, le workspace attendu,
            les limites affichées et les validations nécessaires avant que les utilisateurs puissent louer l’agent.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#E9D5FF] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  <h3 className="font-label text-xs text-[#5B21B6]">{item.title}</h3>
                </div>
                <p className="text-sm leading-6 text-[#4B5563]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#C4B5FD] bg-white p-4 shadow-[0_14px_34px_rgba(109,64,160,0.10)]">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">TYPE DE PUBLICATION</p>
          <h3 className="font-display text-xl font-bold text-[#111827]">{runtimeLabel}</h3>
          <div className="mt-4 space-y-2">
            {advancedNotes.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-[#4B5563]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B5CF6]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          {isAdvancedRuntime && (
            <div className="mt-4 rounded-xl border border-[#FBBF24]/40 bg-[#FFFBEB] p-3 text-xs leading-5 text-[#92400E]">
              Agent avancé beta : publication bloquée tant que les assets runtime et la security review ne sont pas validés.
            </div>
          )}
        </div>
      </div>
    </CodePanel>
  );
}

function PostSubmitTimeline({ values }) {
  const isWorkflow = values.runtime_type === 'workflow_automation';
  const isCreatorEndpoint = values.runtime_type === 'creator_endpoint';
  const isAdvancedRuntime = isWorkflow || isCreatorEndpoint;
  const runtimeLabel = isWorkflow ? 'agent workflow' : isCreatorEndpoint ? 'agent API' : 'assistant guidé';
  const stepsAfterSubmit = [
    {
      detail: 'La validation serveur vérifie les champs obligatoires, le prix, le risque, le contrat agent et le runtime.',
      label: 'Précheck automatique',
    },
    {
      detail: isAdvancedRuntime
        ? `L’admin relit la fiche, les étapes/assets ${runtimeLabel}, puis passe ou refuse la security review.`
        : 'L’admin relit la fiche, la promesse de résultat, les limites et le workspace attendu.',
      label: isAdvancedRuntime ? 'Review admin + sécurité' : 'Review admin',
    },
    {
      detail: 'Une fois approuvé, l’agent devient visible dans la marketplace avec son prix sandbox et ses garde-fous.',
      label: 'Publication marketplace',
    },
    {
      detail: 'Un utilisateur peut louer, ouvrir le workspace, exécuter l’agent, puis laisser un avis vérifié.',
      label: 'Boucle utilisateur',
    },
  ];

  return (
    <CodePanel className="lg:col-span-2 border-[#DDD6FE] bg-white">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label text-xs text-[#6B3FA0]">APRÈS SOUMISSION</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#111827]">Ce qui se passe ensuite</h2>
        </div>
        <span className="inline-flex rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1.5 text-xs font-semibold text-[#5B21B6]">
          Aucun accès user avant approbation
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {stepsAfterSubmit.map((item, index) => (
          <div key={item.label} className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111827] text-xs font-bold text-white">
                {index + 1}
              </span>
              <Check className="h-4 w-4 text-[#10B981]" />
            </div>
            <h3 className="font-display text-sm font-bold text-[#111827]">{item.label}</h3>
            <p className="mt-2 text-xs leading-5 text-[#4B5563]">{item.detail}</p>
          </div>
        ))}
      </div>
    </CodePanel>
  );
}

function RuntimeCard({ disabled, icon: Icon, onClick, selected = false, title, text, tone = 'active' }) {
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        disabled
          ? 'border-[#E3E7F2] bg-[#F8FAFC] opacity-75'
          : selected
            ? 'border-[#8B5CF6] bg-[#F5F3FF] shadow-[0_10px_26px_rgba(109,64,160,0.10)]'
            : 'border-[#E3E7F2] bg-white hover:border-[#8B5CF6] hover:bg-[#FCFAFF]'
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6B3FA0]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-[#D8DDEE] bg-white px-2.5 py-1 text-[10px] font-label text-[#6B7280]">
          {disabled ? tone || 'Interne' : tone}
        </span>
      </div>
      <h3 className="font-display text-lg font-bold text-[#111827]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{text}</p>
    </button>
  );
}

function getTemplateRuntimeLabel(template) {
  if (template.runtime_type === 'workflow_automation') {
    return 'Agent workflow';
  }

  if (template.runtime_type === 'creator_endpoint') {
    return 'Agent API';
  }

  if (template.data_policy?.requires_files) {
    return 'Document beta';
  }

  return 'Assistant IA guidé';
}

const templateGroupLabels = {
  guided: {
    description: 'Pour publier vite une expérience utile basée sur texte, document léger ou actions workspace statiques.',
    label: 'Assistants IA guidés',
  },
  workflow: {
    description: 'Pour créer un vrai agent beta avec plusieurs étapes et au moins une décision LLM structurée.',
    label: 'Agents workflow beta',
  },
  endpoint: {
    description: 'Pour connecter une API creator approuvée via proxy serveur signé.',
    label: 'Agents API beta',
  },
};

function getTemplateGroupKey(template) {
  if (template.runtime_type === 'workflow_automation') {
    return 'workflow';
  }

  if (template.runtime_type === 'creator_endpoint') {
    return 'endpoint';
  }

  return 'guided';
}

function getTemplateOutcome(template) {
  if (template.runtime_type === 'workflow_automation') {
    return 'Décision LLM + étapes validées';
  }

  if (template.runtime_type === 'creator_endpoint') {
    return 'API creator HTTPS approuvée';
  }

  if (template.data_policy?.requires_files) {
    return 'Document ou texte analysé';
  }

  return 'Réponse guidée prête à tester';
}

function getTemplateSetupHint(template) {
  if (!template) {
    return null;
  }

  if (template.runtime_type === 'workflow_automation') {
    return 'Workflow prérempli: les étapes et la décision LLM sont préparées, puis l’admin validera les assets et la review sécurité.';
  }

  if (template.runtime_type === 'creator_endpoint') {
    return 'Agent API prérempli: le nom de l’endpoint est proposé, mais l’URL HTTPS creator reste à renseigner avant soumission.';
  }

  if (template.data_policy?.requires_files) {
    return 'Assistant document prérempli: la fiche, le contrat et les actions workspace sont prêts, sans upload public ni outil externe.';
  }

  return 'Assistant guidé prérempli: vous pouvez encore modifier la fiche publique, le contrat agent, le prix et les actions workspace.';
}

function getTemplatePrefillStats(template) {
  if (!template) {
    return [];
  }

  return [
    { label: 'Capacités', value: template.capabilities?.length ?? 0 },
    { label: 'Inputs', value: template.required_inputs?.length ?? 0 },
    { label: 'Livrables', value: template.deliverables?.length ?? 0 },
    { label: 'Actions', value: template.workspace_actions?.length ?? 0 },
  ];
}

function buildTemplateGroups(templates) {
  return ['guided', 'workflow', 'endpoint']
    .map((key) => ({
      ...templateGroupLabels[key],
      key,
      templates: templates.filter((template) => getTemplateGroupKey(template) === key),
    }))
    .filter((group) => group.templates.length > 0);
}

export default function CodeNewAgentContent({
  canUseCreatorEndpoint = false,
  canUseWorkflowAutomation = false,
  categories = [],
  creatorProfileMissing,
  draftScopeKey = null,
  error,
  profileError,
}) {
  const action = submitAgentForReviewAction.bind(null, 'fr');
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(emptyValues);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSuppressed, setDraftSuppressed] = useState(false);
  const [draftStatus, setDraftStatus] = useState('idle');
  const [savedDraft, setSavedDraft] = useState(null);
  const visibleTemplates = useMemo(
    () =>
      AGENT_TEMPLATES.filter((template) => {
        if (template.runtime_type === 'workflow_automation') {
          return canUseWorkflowAutomation;
        }

        if (template.runtime_type === 'creator_endpoint') {
          return canUseCreatorEndpoint;
        }

        return true;
      }),
    [canUseCreatorEndpoint, canUseWorkflowAutomation],
  );
  const selectedTemplate = useMemo(
    () => visibleTemplates.find((item) => item.key === values.agent_template) ?? null,
    [values.agent_template, visibleTemplates],
  );
  const templateGroups = useMemo(() => buildTemplateGroups(visibleTemplates), [visibleTemplates]);
  const hasStartingPoint = values.creation_mode === 'free' || Boolean(selectedTemplate);
  const creatorCoach = buildCreatorCoach({
    categories,
    currentStep,
    hasStartingPoint,
    values,
  });
  const errorMessage = error && errorMessages[error] ? errorMessages[error] : null;
  const canSubmit = categories.length > 0 && !creatorProfileMissing && !profileError;
  const canSubmitForAdminReview = canSubmit && creatorCoach.score >= 100;
  const submissionGuidance = buildSubmissionGuidance({
    canSubmit,
    categories,
    creatorCoach,
    creatorProfileMissing,
    currentStep,
    profileError,
  });
  const formHasMeaningfulDraft = hasMeaningfulDraft(values);
  const localDraftKey = getNewAgentDraftStorageKey(draftScopeKey);
  const legacyLocalDraftKey = getLegacyNewAgentDraftStorageKey(draftScopeKey);
  const draftCheckpointLabel = !draftReady
    ? 'Recherche du brouillon local...'
    : draftSuppressed
      ? 'Brouillon local ignoré'
      : !formHasMeaningfulDraft
        ? 'Aucun brouillon actif'
        : draftStatus === 'saving'
          ? 'Sauvegarde en cours'
          : draftStatus === 'error'
            ? 'Sauvegarde locale indisponible'
            : draftStatus === 'restored'
              ? 'Brouillon restauré'
              : 'Brouillon autosauvegardé';

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const parsedDraft = readDraftFromStorage(window.localStorage, localDraftKey, legacyLocalDraftKey);
        const safeDraft = sanitizeDraftForPermissions(parsedDraft, visibleTemplates, {
          canUseCreatorEndpoint,
          canUseWorkflowAutomation,
        });

        if (safeDraft && hasMeaningfulDraft(safeDraft.values)) {
          setSavedDraft(safeDraft);
        }
      } catch {
        setSavedDraft(null);
      } finally {
        setDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [canUseCreatorEndpoint, canUseWorkflowAutomation, legacyLocalDraftKey, localDraftKey, visibleTemplates]);

  useEffect(() => {
    if (!draftReady || draftSuppressed || !formHasMeaningfulDraft) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          localDraftKey,
          JSON.stringify({
            currentStep,
            savedAt: Date.now(),
            values,
          }),
        );
        if (legacyLocalDraftKey && legacyLocalDraftKey !== localDraftKey) {
          window.localStorage.removeItem(legacyLocalDraftKey);
        }
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [currentStep, draftReady, draftSuppressed, formHasMeaningfulDraft, legacyLocalDraftKey, localDraftKey, values]);

  useEffect(() => {
    if (!draftReady || draftSuppressed || formHasMeaningfulDraft || savedDraft) {
      return;
    }

    try {
      clearNewAgentDraftStorage(window.localStorage, draftScopeKey);
    } catch {
      // Local storage cleanup is optional; creation remains usable without it.
    }
  }, [draftReady, draftScopeKey, draftSuppressed, formHasMeaningfulDraft, savedDraft]);

  function updateField(name, value) {
    setDraftSuppressed(false);
    setDraftStatus('saving');
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function goToStep(nextStep) {
    if (formHasMeaningfulDraft) {
      setDraftStatus('saving');
    }
    setCurrentStep(nextStep);
  }

  function restoreLocalDraft() {
    if (!savedDraft) {
      return;
    }

    setValues(savedDraft.values);
    setCurrentStep(savedDraft.currentStep);
    setDraftSuppressed(false);
    setSavedDraft(null);
    setDraftStatus('restored');
  }

  function clearLocalDraft() {
    setDraftSuppressed(true);
    setSavedDraft(null);
    setDraftStatus('idle');

    try {
      clearNewAgentDraftStorage(window.localStorage, draftScopeKey);
    } catch {
      // The wizard remains usable even when local storage is unavailable.
    }
  }

  function applyTemplate(templateKey) {
    setDraftSuppressed(false);
    setDraftStatus('saving');
    const template = visibleTemplates.find((item) => item.key === templateKey);
    const templateValues = templateToCreatorFormValues(template, categories);

    if (!templateValues) {
      updateField('agent_template', '');
      return;
    }

    setValues({
      ...emptyValues,
      ...templateValues,
      creation_mode: 'template',
      agent_template: templateKey,
      execution_mode: templateValues.execution_mode ?? 'llm_prompt',
      runtime_type: templateValues.runtime_type ?? 'llm_prompt',
    });
  }

  function startFreeCreation() {
    setDraftSuppressed(false);
    setDraftStatus('saving');
    setValues({
      ...emptyValues,
      creation_mode: 'free',
      agent_template: '',
      execution_mode: 'llm_prompt',
      runtime_type: 'llm_prompt',
    });
  }

  function selectRuntime(runtimeType) {
    setDraftSuppressed(false);
    setDraftStatus('saving');
    setValues((current) => ({
      ...current,
      runtime_type: runtimeType,
      execution_mode: 'llm_prompt',
      execution_method:
        runtimeType === 'workflow_automation'
          ? 'Agent workflow beta: 2 à 5 étapes validées, webhook approuvé si configuré.'
            : runtimeType === 'creator_endpoint'
              ? 'Agent API beta: appel serveur signé vers API creator approuvée.'
              : current.data_policy?.requires_files
              ? 'Assistant IA guidé avec document: PDF/DOCX privé en beta contrôlée, extraction serveur, aucun outil externe.'
              : 'Assistant IA guidé: génération texte server-side, document léger en beta contrôlée, aucun outil externe.',
    }));
  }

  function textInput(name, props = {}) {
    return {
      name,
      value: values[name] ?? '',
      onChange: (event) => updateField(name, event.target.value),
      ...props,
    };
  }

  function endpointInput(name, props = {}) {
    return {
      name,
      value: values[name] ?? '',
      onBlur: (event) => updateField(name, normalizeEndpointUrl(event.target.value)),
      onChange: (event) => updateField(name, event.target.value),
      ...props,
    };
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <Link href="/code" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B3FA0] hover:text-[#111827]">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      <section className="mb-8 overflow-hidden rounded-3xl border border-[#DDD6FE] bg-[linear-gradient(135deg,#FFFFFF_0%,#FAF7FF_62%,#F3E8FF_100%)] p-6 shadow-[0_18px_50px_rgba(109,64,160,0.08)] md:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-end">
          <div>
            <p className="font-label mb-2 text-xs text-[#6B3FA0]">{copy.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-[#4B5563]">{copy.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-[#DDD6FE] bg-white/85 p-4 text-sm text-[#4B5563] shadow-sm">
            <div className="mb-3 flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
              <span>{copy.safety}</span>
            </div>
            <div className="rounded-xl border border-[#E9D5FF] bg-[#FAF7FF] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-label text-[10px] text-[#6B3FA0]">CHECKPOINT CRÉATEUR</p>
                <span className="rounded-full border border-[#DDD6FE] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5B21B6]">
                  {currentStep + 1}/{steps.length}
                </span>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#EDE9FE]">
                <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${creatorCoach.score}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white px-2.5 py-2">
                  <p className="font-semibold text-[#111827]">{creatorCoach.score}% prêt</p>
                  <p className="mt-0.5 text-[#6B7280]">validation serveur</p>
                </div>
                <div className="rounded-lg bg-white px-2.5 py-2">
                  <p className="font-semibold text-[#111827]">{creatorCoach.qualityLabel}</p>
                  <p className="mt-0.5 text-[#6B7280]">lisibilité marketplace</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#6B7280]">{draftCheckpointLabel}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 space-y-4">
        {creatorProfileMissing && <CodeAlert title={copy.missingProfileTitle}>{copy.missingProfile}</CodeAlert>}
        {profileError && <CodeAlert tone="error">{copy.profileError}</CodeAlert>}
        {categories.length === 0 && <CodeAlert tone="error">{copy.noCategories}</CodeAlert>}
        {errorMessage && <CodeAlert tone="error">{errorMessage}</CodeAlert>}
        {savedDraft && (
          <div className="rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] p-4 text-[#4B5563] shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#6B3FA0] shadow-sm">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display font-semibold text-[#111827]">
                    Brouillon local disponible · {draftAgentLabel(savedDraft.values)}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    Dernière sauvegarde le {formatDraftSavedAt(savedDraft.savedAt)} · étape {draftStepLabel(savedDraft.currentStep)}.
                    Restaurer reprend les champs du wizard et l’étape en cours.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={restoreLocalDraft}
                  className="h-10 border-0 bg-[#111827] px-4 text-white shadow-sm hover:bg-[#2B1A44]"
                >
                  Restaurer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearLocalDraft}
                  className="h-10 border-[#D8DDEE] bg-white px-4 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F8FAFC]"
                >
                  Ignorer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!creatorProfileMissing && (
        <form action={action} className="space-y-6">
          <input type="hidden" name="agent_template" value={values.agent_template} />
          <input type="hidden" name="creation_mode" value={values.creation_mode} />
          <input type="hidden" name="execution_mode" value="llm_prompt" />
          <input type="hidden" name="runtime_type" value={values.runtime_type} />

          <Stepper currentStep={currentStep} hasStartingPoint={hasStartingPoint} setCurrentStep={goToStep} />

          {formHasMeaningfulDraft && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E3E7F2] bg-white px-4 py-3 text-sm text-[#64748B] shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <span>
                {draftSuppressed
                  ? 'Brouillon local effacé. La sauvegarde reprendra à la prochaine modification.'
                  : draftStatus === 'saving'
                  ? 'Sauvegarde locale en cours...'
                  : draftStatus === 'error'
                    ? 'Brouillon local non sauvegardé sur ce navigateur.'
                    : draftStatus === 'restored'
                      ? 'Brouillon restauré. Les prochaines modifications seront sauvegardées automatiquement.'
                      : 'Brouillon local sauvegardé automatiquement sur ce navigateur.'}
              </span>
              <button
                type="button"
                onClick={clearLocalDraft}
                className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#E3E7F2] px-3 py-1.5 text-xs font-semibold text-[#6B7280] transition-colors hover:border-[#8B5CF6] hover:text-[#111827] sm:self-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Effacer le brouillon
              </button>
            </div>
          )}

          <CreatorCoachPanel coach={creatorCoach} currentStep={currentStep} setCurrentStep={goToStep} />

          <section className={currentStep === 0 ? 'grid gap-5 lg:grid-cols-[1fr_360px]' : 'hidden'}>
            <CodePanel>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#6B3FA0] shadow-[0_10px_24px_rgba(109,64,160,0.12)]">
                <Layers3 className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[#111827]">Choisir un point de départ</h2>
              <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                Utilisez un template pour accélérer la création ou partez d’un formulaire vide si l’agent est spécifique.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateField('creation_mode', 'template')}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    values.creation_mode === 'template' || selectedTemplate
                      ? 'border-[#8B5CF6] bg-[#F3E8FF] shadow-[0_10px_26px_rgba(109,64,160,0.10)]'
                      : 'border-[#E3E7F2] bg-white hover:border-[#8B5CF6] hover:bg-[#FCFAFF]'
                  }`}
                >
                  <p className="font-display text-lg font-bold text-[#111827]">Démarrer avec un template</p>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    Base préremplie, recommandée pour créer vite un agent beta cohérent.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={startFreeCreation}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    values.creation_mode === 'free'
                      ? 'border-[#8B5CF6] bg-[#F3E8FF] shadow-[0_10px_26px_rgba(109,64,160,0.10)]'
                      : 'border-[#E3E7F2] bg-white hover:border-[#8B5CF6] hover:bg-[#FCFAFF]'
                  }`}
                >
                  <p className="font-display text-lg font-bold text-[#111827]">Créer librement</p>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    Formulaire vide. Le creator définit la fiche, le contrat et le runtime sans préremplissage.
                  </p>
                </button>
              </div>
              <div className="mt-6 space-y-5">
                {templateGroups.map((group) => (
                  <div key={group.key} className="rounded-2xl border border-[#E9D5FF] bg-[#FCFAFF] p-3">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2 px-1">
                      <div>
                        <p className="font-label text-xs text-[#6B3FA0]">{group.label}</p>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#64748B]">{group.description}</p>
                      </div>
                      <span className="rounded-full border border-[#DDD6FE] bg-white px-2.5 py-1 text-[10px] font-label text-[#6B3FA0]">
                        {group.templates.length} template{group.templates.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {group.templates.map((template) => (
                        <button
                          key={template.key}
                          type="button"
                          onClick={() => applyTemplate(template.key)}
                          className={`rounded-2xl border p-4 text-left transition-colors ${
                            values.agent_template === template.key
                              ? 'border-[#8B5CF6] bg-[#F3E8FF] shadow-[0_10px_26px_rgba(109,64,160,0.10)]'
                              : 'border-[#E3E7F2] bg-white hover:border-[#8B5CF6] hover:bg-[#FCFAFF]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-display text-lg font-bold text-[#111827]">{template.label}</h3>
                              <p className="mt-1 text-sm leading-6 text-[#4B5563]">{template.short_description}</p>
                              <p className="mt-2 text-xs font-semibold text-[#6B3FA0]">{getTemplateOutcome(template)}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                              <span className="rounded-full border border-[#D8DDEE] bg-white px-2.5 py-1 text-[10px] font-label text-[#6B7280]">
                                {template.category}
                              </span>
                              <span className="rounded-full border border-[#DDD6FE] bg-[#FAF5FF] px-2.5 py-1 text-[10px] font-label text-[#6B3FA0]">
                                {getTemplateRuntimeLabel(template)}
                              </span>
                              {(template.runtime_type === 'workflow_automation' || template.runtime_type === 'creator_endpoint') && (
                                <span className="rounded-full border border-[#C4B5FD] bg-[#F3E8FF] px-2.5 py-1 text-[10px] font-label text-[#5B21B6]">
                                  Agent avancé
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {(!canUseWorkflowAutomation || !canUseCreatorEndpoint) && (
                <div className="mt-5 rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#4B5563]">
                  Certains templates avancés apparaissent uniquement après allowlist admin du runtime correspondant.
                </div>
              )}
            </CodePanel>
            <CodePanel>
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">POINT DE DÉPART</p>
              <h3 className="font-display text-xl font-bold text-[#111827]">
                {values.creation_mode === 'free' ? 'Création libre' : selectedTemplate?.label || 'Aucun template'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                {values.creation_mode === 'free'
                  ? 'Aucun champ métier n’est prérempli. La validation serveur reste identique : il faudra compléter toute la fiche avant soumission.'
                  : selectedTemplate?.detailed_description || 'Choisissez un template pour préremplir le wizard ou démarrez librement.'}
              </p>
              {selectedTemplate && (
                <div className="mt-5 space-y-4 rounded-2xl border border-[#E9D5FF] bg-[#FCFAFF] p-4">
                  <div>
                    <p className="font-label text-xs text-[#6B3FA0]">Ce template préremplit</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {getTemplatePrefillStats(selectedTemplate).map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-[#DDD6FE] bg-white px-3 py-2">
                          <p className="font-stat text-2xl text-[#111827]">{stat.value}</p>
                          <p className="text-[11px] font-semibold text-[#6B7280]">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#DDD6FE] bg-white px-3 py-3 text-xs leading-5 text-[#4B5563]">
                    <span className="font-semibold text-[#6B3FA0]">À vérifier avant soumission : </span>
                    {getTemplateSetupHint(selectedTemplate)}
                  </div>
                </div>
              )}
              {values.creation_mode === 'free' && (
                <div className="mt-5 rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#4B5563]">
                  Complétez au minimum la fiche publique, le contrat agent, le prix, la promesse de résultat et le runtime avant la review admin.
                </div>
              )}
              <Button
                type="button"
                disabled={!hasStartingPoint}
                onClick={() => goToStep(1)}
                className="mt-6 h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44] disabled:opacity-50"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CodePanel>
          </section>

          <section className={currentStep === 1 ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]' : 'hidden'}>
            <CodePanel>
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">Fiche publique</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nom">
                  <input {...textInput('name', { placeholder: 'LinkedIn Content Studio' })} className={inputClass} />
                </Field>
                <Field label="Catégorie">
                  <select {...textInput('category_id')} className={inputClass}>
                    <option value="" disabled />
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Description courte" wide>
                  <input {...textInput('short_description')} className={inputClass} />
                </Field>
                <Field label="Utilisateur cible">
                  <input {...textInput('target_user')} className={inputClass} />
                </Field>
                <Field label="Prix fixe affiché">
                  <input {...textInput('starting_price_eur', { type: 'number', min: '1', step: '0.01', inputMode: 'decimal' })} className={inputClass} />
                </Field>
                <Field label="Type de prix">
                  <select {...textInput('pricing_type')} className={inputClass}>
                    <option value="task">À la tâche</option>
                    <option value="project">Au projet</option>
                  </select>
                </Field>
                <Field label="Description détaillée" wide>
                  <textarea {...textInput('long_description', { rows: 6 })} className={inputClass} />
                </Field>
                <Field label="Détails de prix" wide>
                  <input {...textInput('pricing_hint')} className={inputClass} />
                </Field>
              </div>
            </CodePanel>
            <PublicListingPreview values={values} />
          </section>

          <section className={currentStep === 2 ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]' : 'hidden'}>
            <CodePanel>
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">Agent Contract</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Ce que l’agent fait" hint="Une ligne par élément.">
                  <textarea {...textInput('does', { rows: 5 })} className={inputClass} />
                </Field>
                <Field label="Ce que l’agent ne fait pas" hint="Une ligne par élément.">
                  <textarea {...textInput('does_not_do', { rows: 5 })} className={inputClass} />
                </Field>
                <Field label="Inputs requis" hint="Une ligne par élément.">
                  <textarea {...textInput('required_inputs', { rows: 4 })} className={inputClass} />
                </Field>
                <Field label="Livrables" hint="Une ligne par élément.">
                  <textarea {...textInput('deliverables', { rows: 4 })} className={inputClass} />
                </Field>
                <Field label="Exemple de sortie">
                  <textarea {...textInput('sample_output', { rows: 4 })} className={inputClass} />
                </Field>
                <Field label="Limites connues" hint="Une ligne par élément.">
                  <textarea {...textInput('known_limits', { rows: 4 })} className={inputClass} />
                </Field>
                <Field label="Niveau de risque">
                  <select {...textInput('risk_level')} className={inputClass}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="forbidden_beta">forbidden_beta</option>
                  </select>
                </Field>
                <Field label="Données nécessaires">
                  <input {...textInput('execution_method')} className={inputClass} />
                </Field>
              </div>
            </CodePanel>
            <CreatorGuardrailPreview values={values} />
          </section>

          <section className={currentStep === 3 ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]' : 'hidden'}>
            <CodePanel>
              <h2 className="font-display text-2xl font-bold text-[#111827]">Choisir le type de publication</h2>
              <p className="mb-5 mt-2 text-sm leading-6 text-[#4B5563]">
                Un assistant guidé génère une réponse avec le modèle AgentHub. Un agent avancé exécute un workflow validé ou appelle une API creator approuvée.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Runtime créateur-visible">
                  <div className="rounded-xl border border-[#8B5CF6] bg-[#F5F3FF] px-3 py-2.5 text-sm font-semibold text-[#111827]">
                    {values.runtime_type === 'workflow_automation'
                      ? 'Agent workflow'
                      : values.runtime_type === 'creator_endpoint'
                        ? 'Agent API'
                        : 'Assistant IA guidé'}
                  </div>
                </Field>
                <Field label="Mode d’exécution">
                  <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#4B5563]">
                    {values.runtime_type === 'workflow_automation'
                      ? 'Workflow validé + worker'
                      : values.runtime_type === 'creator_endpoint'
                        ? 'API creator signée côté serveur'
                        : 'Assistant texte'}
                  </div>
                </Field>
                <Field label="Type d’expérience dans le workspace">
                  <select {...textInput('workspace_mode')} className={inputClass}>
                    {WORKSPACE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ce que l’utilisateur devra faire après activation">
                  <select {...textInput('setup_type')} className={inputClass}>
                    {SETUP_REQUIREMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Promesse de résultat" wide>
                  <input {...textInput('output_promise_summary')} className={inputClass} />
                </Field>
                <Field label="Exemples d’utilisation" hint="Une ligne par exemple.">
                  <textarea {...textInput('output_promise_examples', { rows: 4 })} className={inputClass} />
                </Field>
                <Field label="Informations ou éléments nécessaires" hint="Une ligne par élément.">
                  <textarea {...textInput('setup_items', { rows: 4 })} className={inputClass} />
                </Field>
              </div>
            </CodePanel>
            <div className="space-y-4">
              <RuntimeCard
                icon={Bot}
                onClick={() => selectRuntime('llm_prompt')}
                selected={values.runtime_type === 'llm_prompt'}
                title="Assistant IA guidé"
                tone="Actif"
                text="Génération texte server-side avec actions workspace. Les capacités document restent intégrées ici en beta contrôlée, pas dans un runtime séparé."
              />
              <RuntimeCard
                disabled={!canUseWorkflowAutomation}
                icon={ClipboardList}
                onClick={canUseWorkflowAutomation ? () => selectRuntime('workflow_automation') : undefined}
                selected={values.runtime_type === 'workflow_automation'}
                title="Agent workflow"
                tone={canUseWorkflowAutomation ? 'Beta activée' : 'Accès admin requis'}
                text={
                  canUseWorkflowAutomation
                    ? '2 à 5 étapes validées, LLM interne et webhook creator approuvé si nécessaire. Pas de node editor, pas de n8n.'
                    : 'Demandez ou activez le droit workflow automation depuis Administration > Creators.'
                }
              />
              <RuntimeCard
                disabled={!canUseCreatorEndpoint}
                icon={Send}
                onClick={canUseCreatorEndpoint ? () => selectRuntime('creator_endpoint') : undefined}
                selected={values.runtime_type === 'creator_endpoint'}
                title="Agent API"
                tone={canUseCreatorEndpoint ? 'Beta activée' : 'Accès admin requis'}
                text={
                  canUseCreatorEndpoint
                    ? 'AgentHub appelle un endpoint HTTPS creator via proxy serveur signé. Jamais appelé depuis le client.'
                    : 'Demandez ou activez le droit creator endpoint depuis Administration > Creators.'
                }
              />
              {!canUseWorkflowAutomation && !canUseCreatorEndpoint && (
                <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#4B5563]">
                  Les agents avancés sont ouverts sur allowlist admin. L’analyse de document n’est plus un type séparé pour les creators : elle est regroupée avec l’assistant guidé.
                </div>
              )}
              <RuntimeCard disabled icon={Lock} title="Agent code/package" tone="Plus tard" text="Exécution sandboxée future. Non créable en beta, aucun code creator n’est exécuté par AgentHub aujourd’hui." />
            </div>
          </section>

          <section className={currentStep === 3 && values.runtime_type === 'workflow_automation' ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]' : 'hidden'}>
            <CodePanel>
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">Workflow beta</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Étapes workflow" wide hint="2 à 5 lignes. Format: llm: action ou webhook: action.">
                  <textarea {...textInput('workflow_steps', { rows: 6 })} className={inputClass} />
                </Field>
                <Field label="Nom endpoint webhook" hint="Optionnel si aucune étape webhook.">
                  <input {...textInput('workflow_endpoint_name')} className={inputClass} />
                </Field>
                <Field label="URL endpoint webhook" hint="HTTPS public uniquement. Pas de localhost/IP privée.">
                  <input {...endpointInput('workflow_endpoint_url', { placeholder: 'https://example.com/agenthub/webhook' })} className={inputClass} />
                </Field>
              </div>
            </CodePanel>
            <CodePanel>
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">GARDE-FOUS</p>
              {['Workflow linéaire uniquement', '2 à 5 étapes maximum', 'Webhook signé HMAC', 'Validation admin obligatoire'].map((item) => (
                <div key={item} className="mb-3 flex items-center gap-2 rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3 text-sm text-[#4B5563]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  {item}
                </div>
              ))}
            </CodePanel>
          </section>

          <section className={currentStep === 3 && values.runtime_type === 'creator_endpoint' ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]' : 'hidden'}>
            <CodePanel>
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">Creator endpoint beta</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nom endpoint">
                  <input {...textInput('creator_endpoint_name')} className={inputClass} />
                </Field>
                <Field label="URL endpoint" hint="HTTPS public uniquement. Réponse JSON attendue: { output_text: string }.">
                  <input {...endpointInput('creator_endpoint_url', { placeholder: 'https://example.com/agenthub/endpoint' })} className={inputClass} />
                </Field>
              </div>
            </CodePanel>
            <CodePanel>
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">GARDE-FOUS</p>
              {['Proxy serveur AgentHub', 'Signature HMAC', 'Timeout court', 'Endpoint approuvé par admin'].map((item) => (
                <div key={item} className="mb-3 flex items-center gap-2 rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3 text-sm text-[#4B5563]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  {item}
                </div>
              ))}
            </CodePanel>
          </section>

          <section className={currentStep === 4 ? 'grid gap-6 lg:grid-cols-2' : 'hidden'}>
            <PublicListingPreview values={values} />
            <WorkspacePreview values={values} />
            <UserValueContractPreview values={values} />
            <WorkspaceBlueprintPreview className="lg:col-span-2" values={values} />
            <CreatorGuardrailPreview values={values} />
            <SubmissionReadinessPanel values={values} />
            <PostSubmitTimeline values={values} />
            <CodePanel className="lg:col-span-2">
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
                    <Eye className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#111827]">Prêt pour validation admin</h2>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                    La soumission utilise la validation serveur existante. Aucun agent n’apparaît en marketplace avant approbation.
                  </p>
                  <div
                    className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
                      submissionGuidance.tone === 'success'
                        ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                        : submissionGuidance.tone === 'error'
                          ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                          : submissionGuidance.tone === 'warning'
                            ? 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]'
                            : 'border-[#DDD6FE] bg-[#FAF7FF] text-[#4B5563]'
                    }`}
                  >
                    <p className="font-label mb-1 text-[10px]">{submissionGuidance.title}</p>
                    <p>{submissionGuidance.text}</p>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!canSubmitForAdminReview || currentStep !== steps.length - 1}
                  className="h-12 border-0 bg-[#111827] px-6 text-white shadow-sm hover:bg-[#2B1A44] disabled:opacity-50"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {canSubmitForAdminReview ? 'Soumettre pour validation' : 'Compléter avant soumission'}
                </Button>
              </div>
            </CodePanel>
          </section>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => goToStep(Math.max(0, currentStep - 1))}
              className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8] disabled:opacity-50"
            >
              Retour
            </Button>
            {currentStep < steps.length - 1 && (
              <Button
                type="button"
                disabled={currentStep === 0 && !hasStartingPoint}
                onClick={() => {
                  goToStep(Math.min(steps.length - 1, currentStep + 1));
                }}
                className="h-11 border-0 bg-[#111827] px-5 text-white shadow-sm hover:bg-[#2B1A44] disabled:opacity-50"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}
