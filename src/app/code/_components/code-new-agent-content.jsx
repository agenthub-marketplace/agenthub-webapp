'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ClipboardList,
  Eye,
  Layers3,
  Lock,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_OPTIONS } from '@/lib/agent-contract';
import { AGENT_TEMPLATES, templateToCreatorFormValues } from '@/lib/agent-templates';
import { submitAgentForReviewAction } from '@/server/agents/actions';
import { CodeAlert, CodePanel } from './code-console-ui';

const steps = [
  { id: 'template', label: 'Template', title: 'Choisir un template' },
  { id: 'listing', label: 'Listing', title: 'Fiche publique' },
  { id: 'contract', label: 'Contract', title: 'Agent Contract' },
  { id: 'runtime', label: 'Publication', title: 'Choisir le type de publication' },
  { id: 'preview', label: 'Preview', title: 'Preview & submit' },
];

const copy = {
  back: 'Retour au dashboard',
  eyebrow: 'NOUVEL AGENT',
  title: 'Créer une publication AgentHub',
  subtitle: 'Choisissez un template, adaptez la fiche, choisissez le type de publication, puis soumettez à validation.',
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
  'invalid-workflow': 'Le workflow beta est réservé à une phase interne.',
  'invalid-workflow-endpoint': 'Le workflow beta est réservé à une phase interne.',
  'workflow-endpoint-failed': 'Le workflow beta est réservé à une phase interne.',
  'workflow-create-failed': 'Le workflow beta est réservé à une phase interne.',
  'invalid-creator-endpoint': 'L’agent API est réservé à une beta interne.',
  'creator-endpoint-failed': 'L’agent API est réservé à une beta interne.',
  'creator-endpoint-config-failed': 'L’agent API est réservé à une beta interne.',
};

const emptyValues = {
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

function Stepper({ currentStep, setCurrentStep, templateSelected }) {
  return (
    <div className="grid gap-2 md:grid-cols-5">
      {steps.map((step, index) => {
        const active = index === currentStep;
        const done = index < currentStep;
        const locked = index > 0 && !templateSelected;

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

export default function CodeNewAgentContent({
  canUseCreatorEndpoint = false,
  canUseWorkflowAutomation = false,
  categories = [],
  creatorProfileMissing,
  error,
  profileError,
}) {
  const action = submitAgentForReviewAction.bind(null, 'fr');
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(emptyValues);
  const selectedTemplate = useMemo(() => AGENT_TEMPLATES.find((item) => item.key === values.agent_template) ?? null, [values.agent_template]);
  const errorMessage = error && errorMessages[error] ? errorMessages[error] : null;
  const canSubmit = categories.length > 0 && !creatorProfileMissing && !profileError;

  function updateField(name, value) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyTemplate(templateKey) {
    const template = AGENT_TEMPLATES.find((item) => item.key === templateKey);
    const templateValues = templateToCreatorFormValues(template, categories);

    if (!templateValues) {
      updateField('agent_template', '');
      return;
    }

    setValues({
      ...emptyValues,
      ...templateValues,
      agent_template: templateKey,
      execution_mode: 'llm_prompt',
      runtime_type: 'llm_prompt',
    });
  }

  function selectRuntime(runtimeType) {
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
          <div className="rounded-2xl border border-[#DDD6FE] bg-white/80 p-4 text-sm text-[#4B5563] shadow-sm">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
              <span>{copy.safety}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 space-y-4">
        {creatorProfileMissing && <CodeAlert title={copy.missingProfileTitle}>{copy.missingProfile}</CodeAlert>}
        {profileError && <CodeAlert tone="error">{copy.profileError}</CodeAlert>}
        {categories.length === 0 && <CodeAlert tone="error">{copy.noCategories}</CodeAlert>}
        {errorMessage && <CodeAlert tone="error">{errorMessage}</CodeAlert>}
      </div>

      {!creatorProfileMissing && (
        <form action={action} className="space-y-6">
          <input type="hidden" name="agent_template" value={values.agent_template} />
          <input type="hidden" name="execution_mode" value="llm_prompt" />
          <input type="hidden" name="runtime_type" value={values.runtime_type} />

          <Stepper currentStep={currentStep} setCurrentStep={setCurrentStep} templateSelected={Boolean(selectedTemplate)} />

          <section className={currentStep === 0 ? 'grid gap-5 lg:grid-cols-[1fr_360px]' : 'hidden'}>
            <CodePanel>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#6B3FA0] shadow-[0_10px_24px_rgba(109,64,160,0.12)]">
                <Layers3 className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[#111827]">Choisir un point de départ</h2>
              <p className="mt-2 text-sm leading-6 text-[#4B5563]">
                Les templates beta donnent une fiche réaliste, modifiable avant soumission.
              </p>
              <div className="mt-6 grid gap-3">
                {AGENT_TEMPLATES.map((template) => (
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
                      </div>
                      <span className="rounded-full border border-[#D8DDEE] bg-white px-2.5 py-1 text-[10px] font-label text-[#6B7280]">
                        {template.category}
                      </span>
                      {template.data_policy?.requires_files && (
                        <span className="rounded-full border border-[#DDD6FE] bg-[#FAF5FF] px-2.5 py-1 text-[10px] font-label text-[#6B3FA0]">
                          Document beta
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CodePanel>
            <CodePanel>
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">TEMPLATE SÉLECTIONNÉ</p>
              <h3 className="font-display text-xl font-bold text-[#111827]">{selectedTemplate?.label || 'Aucun template'}</h3>
              <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                {selectedTemplate?.detailed_description || 'Choisissez un template pour préremplir le wizard.'}
              </p>
              <Button
                type="button"
                disabled={!selectedTemplate}
                onClick={() => setCurrentStep(1)}
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
            <CodePanel>
              <p className="font-label mb-3 text-xs text-[#6B3FA0]">CONTRÔLE QUALITÉ</p>
              {['Promesse compréhensible', 'Inputs actionnables', 'Livrables précis', 'Limites visibles'].map((item) => (
                <div key={item} className="mb-3 flex items-center gap-2 rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3 text-sm text-[#4B5563]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  {item}
                </div>
              ))}
            </CodePanel>
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
                  Les agents avancés sont ouverts sur allowlist admin. Le runtime document n’est plus un type séparé pour les creators : il est regroupé avec l’assistant guidé.
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
                  <input {...textInput('workflow_endpoint_url', { placeholder: 'https://example.com/agenthub/webhook' })} className={inputClass} />
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
                  <input {...textInput('creator_endpoint_url', { placeholder: 'https://example.com/agenthub/endpoint' })} className={inputClass} />
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
                </div>
                <Button
                  type="submit"
                  disabled={!canSubmit || currentStep !== steps.length - 1}
                  className="h-12 border-0 bg-[#111827] px-6 text-white shadow-sm hover:bg-[#2B1A44] disabled:opacity-50"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Soumettre pour validation
                </Button>
              </div>
            </CodePanel>
          </section>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              className="h-11 border-[#D8DDEE] bg-white px-5 text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8] disabled:opacity-50"
            >
              Retour
            </Button>
            {currentStep < steps.length - 1 && (
              <Button
                type="button"
                disabled={currentStep === 0 && !selectedTemplate}
                onClick={() => setCurrentStep((step) => Math.min(steps.length - 1, step + 1))}
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
