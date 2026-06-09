'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import AgentHubCodeNavbar from '@/components/AgentHubCodeNavbar';
import { Button } from '@/components/ui/button';
import { EXECUTION_MODE_OPTIONS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_OPTIONS } from '@/lib/agent-contract';
import { AGENT_TEMPLATES, templateToCreatorFormValues } from '@/lib/agent-templates';
import { submitAgentForReviewAction } from '@/server/agents/actions';
import { ArrowLeft, Check, Send, ShieldAlert } from 'lucide-react';

const copy = {
  fr: {
    back: 'Retour au tableau de bord',
    eyebrow: 'Soumission créateur',
    title: 'Soumettre un agent pour validation',
    subtitle: 'Décrivez un agent professionnel, sa valeur, ses limites, son prix et l’expérience utilisateur après activation.',
    template: 'Démarrer depuis un template',
    templatePlaceholder: 'Choisir un template d’agent',
    templateHint: 'Le template préremplit le formulaire. Vous pouvez tout modifier avant soumission.',
    core: 'Informations principales',
    delivery: 'Livraison et validation',
    name: 'Nom',
    category: 'Catégorie',
    shortDescription: 'Description courte',
    longDescription: 'Description détaillée',
    targetUser: 'Utilisateur cible',
    does: 'Ce que l’agent fait',
    doesNotDo: 'Ce que l’agent ne fait pas',
    requiredInputs: 'Inputs requis',
    deliverables: 'Livrables',
    sampleOutput: 'Exemple de sortie',
    pricingType: 'Type de prix',
    startingPrice: 'Prix fixe affiché',
    pricingHint: 'Détails de prix et conditions',
    priceHint:
      'Prix fixe en euros, visible dans la marketplace pour ce mode d’accès. En sandbox, Stripe simule le paiement avant activation.',
    pricingDetailsHint:
      'Expliquez clairement ce qui est inclus dans ce prix fixe et les limites de l’accès.',
    contract: 'Expérience après activation',
    workspaceMode: 'Type d’expérience dans le workspace',
    setupType: 'Ce que l’utilisateur devra faire après activation',
    setupItems: 'Informations ou éléments nécessaires',
    outputPromiseSummary: 'Promesse de résultat',
    outputPromiseExamples: 'Exemples d’utilisation',
    executionMode: 'Mode d’exécution prévu',
    executionModeHint:
      'Pour tester l’assistant guidé dans le workspace, choisissez “Assistant texte”. Les documents restent une capacité contrôlée, pas le standard agent avancé beta.',
    riskLevel: 'Niveau de risque',
    executionMethod: 'Données nécessaires',
    knownLimits: 'Limites connues',
    lineHint: 'Une ligne par élément.',
    submit: 'Soumettre pour validation',
    task: 'À la tâche',
    project: 'Au projet',
    noCategories: 'Aucune catégorie Supabase disponible. Ajoutez les catégories beta avant de soumettre un agent.',
    missingProfileTitle: 'Profil créateur requis',
    missingProfile:
      'Ce compte peut accéder à l’espace créateur, mais il ne peut soumettre des agents que s’il possède son propre creator_profile. Les admins valident depuis /admin et ne contournent pas la propriété créateur ici.',
    profileError: 'Impossible de vérifier votre profil créateur. Réessayez ou contactez l’équipe.',
    safety: 'Les agents forbidden_beta sont refusés. Une validation manuelle admin reste obligatoire avant publication.',
    errors: {
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
    },
  },
  en: {
    back: 'Back to dashboard',
    eyebrow: 'Creator submission',
    title: 'Submit an agent for review',
    subtitle: 'Describe a professional agent, its value, limits, price, and the user experience after activation.',
    template: 'Start from template',
    templatePlaceholder: 'Choose an agent template',
    templateHint: 'The template pre-fills the form. You can edit everything before submitting.',
    core: 'Core information',
    delivery: 'Delivery and validation',
    name: 'Name',
    category: 'Category',
    shortDescription: 'Short description',
    longDescription: 'Detailed description',
    targetUser: 'Target user',
    does: 'What the agent does',
    doesNotDo: 'What the agent does not do',
    requiredInputs: 'Required inputs',
    deliverables: 'Deliverables',
    sampleOutput: 'Sample output',
    pricingType: 'Pricing type',
    startingPrice: 'Displayed fixed price',
    pricingHint: 'Pricing details and terms',
    priceHint:
      'Fixed amount in euros, shown in the marketplace for this access mode. In sandbox, Stripe simulates payment before activation.',
    pricingDetailsHint:
      'Explain what is included in this fixed price and the limits of the access.',
    contract: 'Post-activation experience',
    workspaceMode: 'Workspace experience type',
    setupType: 'What the user must do after activation',
    setupItems: 'Required information or items',
    outputPromiseSummary: 'Output promise',
    outputPromiseExamples: 'Usage examples',
    executionMode: 'Planned execution mode',
    executionModeHint:
      'To test the guided assistant in the workspace, choose “Text assistant”. Documents are a controlled capability, not the advanced agent beta standard.',
    riskLevel: 'Risk level',
    executionMethod: 'Required data',
    knownLimits: 'Known limits',
    lineHint: 'One item per line.',
    submit: 'Submit for review',
    task: 'Task',
    project: 'Project',
    noCategories: 'No Supabase categories are available. Add beta categories before submitting an agent.',
    missingProfileTitle: 'Creator profile required',
    missingProfile:
      'This account can access the creator area, but it can only submit agents when it has its own creator_profile. Admins review from /admin and do not bypass creator ownership here.',
    profileError: 'Could not verify your creator profile. Try again or contact the team.',
    safety: 'forbidden_beta agents are rejected. Manual admin validation remains required before publication.',
    errors: {
      'missing-config': 'Supabase configuration is missing.',
      required: 'All fields are required.',
      'invalid-pricing': 'Invalid pricing type.',
      'invalid-price': 'The beta price must be greater than 0.',
      'invalid-risk': 'Invalid risk level.',
      'invalid-contract': 'Invalid agent contract.',
      'forbidden-risk': 'forbidden_beta agents cannot be submitted directly.',
      'creator-profile-error': 'Could not read your creator profile.',
      'creator-profile-missing': 'No creator profile is linked to this account.',
      'agent-insert-failed': 'Agent creation failed.',
      'version-insert-failed': 'Review version creation failed.',
      'agent-submit-failed': 'Agent submission failed.',
    },
  },
};

function Field({ children, hint, label, wide = false }) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <span className="font-label mb-1.5 block text-xs text-[#6B3FA0]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#6B7280]">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-[#D8DDEE] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15';

const initialFormValues = {
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
  execution_method: '',
  workspace_mode: 'instant',
  setup_type: 'none',
  output_promise_summary: '',
  output_promise_examples: '',
  setup_items: '',
  execution_mode: 'llm_prompt',
  runtime_type: 'llm_prompt',
};

const creatorExecutionModeOptions = EXECUTION_MODE_OPTIONS.filter((option) => option.value === 'llm_prompt');

function Alert({ children, tone = 'warning', title }) {
  const classes =
    tone === 'error'
      ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
      : 'border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]';

  return (
    <div className={`rounded-2xl border p-5 ${classes}`}>
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          {title && <p className="font-display font-semibold text-[#111827]">{title}</p>}
          <p className="text-sm leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}

export default function NewAgentContent({
  categories = [],
  creatorProfileMissing,
  error,
  locale = 'fr',
  profile,
  profileError,
}) {
  const t = copy[locale] || copy.fr;
  const action = submitAgentForReviewAction.bind(null, locale);
  const formRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formValues, setFormValues] = useState(initialFormValues);
  const errorMessage = error && t.errors[error] ? t.errors[error] : null;
  const canSubmit = categories.length > 0 && !creatorProfileMissing && !profileError;
  const dashboardPath = locale === 'en' ? '/en/creator/dashboard' : '/code/dashboard';

  function fieldProps(name) {
    return {
      value: formValues[name] ?? '',
      onChange: (event) => {
        setFormValues((current) => ({
          ...current,
          [name]: event.target.value,
        }));
      },
    };
  }

  function handleTemplateChange(event) {
    const templateKey = event.target.value;
    setSelectedTemplate(templateKey);

    if (!templateKey) {
      setFormValues(initialFormValues);
      return;
    }

    const template = AGENT_TEMPLATES.find((item) => item.key === templateKey);
    const values = templateToCreatorFormValues(template, categories);

    if (!values) {
      return;
    }

    setFormValues((current) => ({
      ...current,
      ...values,
    }));
  }

  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <AgentHubCodeNavbar profile={profile} />
      <main className="container max-w-5xl py-8">
        <Link href={dashboardPath} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B3FA0] hover:text-[#111827]">
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label mb-2 text-xs text-[#6B3FA0]">{t.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-[#4B5563]">{t.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-[#E3E7F2] bg-white p-4 text-sm text-[#4B5563] shadow-sm">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
              <span>{t.safety}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {creatorProfileMissing && <Alert title={t.missingProfileTitle}>{t.missingProfile}</Alert>}
          {profileError && <Alert tone="error">{t.profileError}</Alert>}
          {categories.length === 0 && <Alert tone="error">{t.noCategories}</Alert>}
          {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
        </div>

        {!creatorProfileMissing && (
          <form ref={formRef} action={action} className="mt-8 space-y-6">
            <input type="hidden" name="runtime_type" value={formValues.runtime_type} />
            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <Field label={t.template} hint={t.templateHint}>
                <select name="agent_template" className={inputClass} value={selectedTemplate} onChange={handleTemplateChange}>
                  <option value="">{t.templatePlaceholder}</option>
                  {AGENT_TEMPLATES.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">{t.core}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t.name}>
                  <input name="name" required placeholder="LegalDraft Pro" className={inputClass} {...fieldProps('name')} />
                </Field>
                <Field label={t.category}>
                  <select name="category_id" required className={inputClass} {...fieldProps('category_id')}>
                    <option value="" disabled />
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.shortDescription}>
                  <input name="short_description" required className={inputClass} {...fieldProps('short_description')} />
                </Field>
                <Field label={t.targetUser}>
                  <input name="target_user" required className={inputClass} {...fieldProps('target_user')} />
                </Field>
                <Field label={t.longDescription} wide>
                  <textarea name="long_description" required rows={5} className={inputClass} {...fieldProps('long_description')} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">{t.delivery}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t.does} hint={t.lineHint}>
                  <textarea name="does" required rows={5} className={inputClass} {...fieldProps('does')} />
                </Field>
                <Field label={t.doesNotDo} hint={t.lineHint}>
                  <textarea name="does_not_do" required rows={5} className={inputClass} {...fieldProps('does_not_do')} />
                </Field>
                <Field label={t.requiredInputs} hint={t.lineHint}>
                  <textarea name="required_inputs" required rows={4} className={inputClass} {...fieldProps('required_inputs')} />
                </Field>
                <Field label={t.deliverables} hint={t.lineHint}>
                  <textarea name="deliverables" required rows={4} className={inputClass} {...fieldProps('deliverables')} />
                </Field>
                <Field label={t.sampleOutput}>
                  <textarea name="sample_output" required rows={4} className={inputClass} {...fieldProps('sample_output')} />
                </Field>
                <Field label={t.knownLimits} hint={t.lineHint}>
                  <textarea name="known_limits" required rows={4} className={inputClass} {...fieldProps('known_limits')} />
                </Field>
                <Field label={t.pricingType}>
                  <select name="pricing_type" required className={inputClass} {...fieldProps('pricing_type')}>
                    <option value="task">{t.task}</option>
                    <option value="project">{t.project}</option>
                  </select>
                </Field>
                <Field label={t.startingPrice} hint={t.priceHint}>
                  <input
                    name="starting_price_eur"
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="99"
                    className={inputClass}
                    {...fieldProps('starting_price_eur')}
                  />
                </Field>
                <Field label={t.riskLevel}>
                  <select name="risk_level" required className={inputClass} {...fieldProps('risk_level')}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="forbidden_beta">forbidden_beta</option>
                  </select>
                </Field>
                <Field label={t.pricingHint} hint={t.pricingDetailsHint}>
                  <input name="pricing_hint" required placeholder="Ex: includes one deliverable and one revision" className={inputClass} {...fieldProps('pricing_hint')} />
                </Field>
                <Field label={t.executionMethod}>
                  <input name="execution_method" required placeholder={locale === 'en' ? 'Example: user context, text input, public URLs' : 'Exemple : contexte utilisateur, texte, URLs publiques'} className={inputClass} {...fieldProps('execution_method')} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">{t.contract}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t.workspaceMode}>
                  <select name="workspace_mode" required className={inputClass} {...fieldProps('workspace_mode')}>
                    {WORKSPACE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.setupType}>
                  <select name="setup_type" required className={inputClass} {...fieldProps('setup_type')}>
                    {SETUP_REQUIREMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.outputPromiseSummary} wide>
                  <input
                    name="output_promise_summary"
                    placeholder={locale === 'en' ? 'What the user can expect after opening the workspace' : 'Ce que l’utilisateur peut obtenir en ouvrant le workspace'}
                    className={inputClass}
                    {...fieldProps('output_promise_summary')}
                  />
                </Field>
                <Field label={t.outputPromiseExamples} hint={t.lineHint}>
                  <textarea name="output_promise_examples" rows={4} className={inputClass} {...fieldProps('output_promise_examples')} />
                </Field>
                <Field label={t.setupItems} hint={t.lineHint}>
                  <textarea name="setup_items" rows={4} className={inputClass} {...fieldProps('setup_items')} />
                </Field>
                <Field label={t.executionMode} hint={t.executionModeHint}>
                  <select name="execution_mode" required className={inputClass} {...fieldProps('execution_mode')}>
                    {creatorExecutionModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-12 border-0 bg-[#111827] px-6 text-white shadow-sm hover:bg-[#2B1A44] disabled:opacity-50"
              >
                <Send className="mr-2 h-4 w-4" />
                {t.submit}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
