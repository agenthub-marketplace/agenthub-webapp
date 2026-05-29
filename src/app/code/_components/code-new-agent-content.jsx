'use client';

import { useRef } from 'react';
import Link from 'next/link';
import AgentHubCodeNavbar from '@/components/AgentHubCodeNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { EXECUTION_MODE_OPTIONS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_OPTIONS } from '@/lib/agent-contract';
import { AGENT_TEMPLATES, templateToCreatorFormValues } from '@/lib/agent-templates';
import { submitAgentForReviewAction } from '@/server/agents/actions';
import { ArrowLeft, Check, Send } from 'lucide-react';
import { CodeAlert } from './code-console-ui';

const copy = {
  back: 'Retour au dashboard',
  eyebrow: 'NOUVEL AGENT',
  title: 'Créer un agent IA',
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
    'Pour tester le runner LLM dans le workspace, choisissez “LLM Runner texte (OpenAI)”. L’agent doit rester sans fichier requis ni outil externe.',
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
    'Ce compte peut accéder à l’espace créateur, mais il ne peut soumettre des agents que s’il possède son propre profil créateur.',
  profileError: 'Impossible de vérifier votre profil créateur. Réessayez ou contactez l’équipe.',
  safety: 'Les agents forbidden_beta sont refusés. Une validation manuelle admin reste obligatoire avant publication.',
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

export default function CodeNewAgentContent({
  categories = [],
  creatorProfileMissing,
  error,
  profile,
  profileError,
}) {
  const action = submitAgentForReviewAction.bind(null, 'fr');
  const formRef = useRef(null);
  const errorMessage = error && errorMessages[error] ? errorMessages[error] : null;
  const canSubmit = categories.length > 0 && !creatorProfileMissing && !profileError;

  function handleTemplateChange(event) {
    const template = AGENT_TEMPLATES.find((item) => item.key === event.target.value);
    const values = templateToCreatorFormValues(template, categories);
    const form = formRef.current;

    if (!values || !form) {
      return;
    }

    Object.entries(values).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);

      if (field && 'value' in field) {
        field.value = value;
      }
    });
  }

  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <AgentHubCodeNavbar profile={profile} />
      <main className="container max-w-5xl py-8">
        <Link href="/code/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B3FA0] hover:text-[#111827]">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>

        <section className="mb-8 overflow-hidden rounded-3xl border border-[#E3E7F2] bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-5 md:grid-cols-[1fr_280px] md:items-end">
            <div>
              <p className="font-label mb-2 text-xs text-[#6B3FA0]">{copy.eyebrow}</p>
              <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">{copy.title}</h1>
              <p className="mt-3 max-w-2xl text-[#4B5563]">{copy.subtitle}</p>
            </div>
            <div className="rounded-2xl border border-[#E3E7F2] bg-[#F8FAFC] p-4 text-sm text-[#4B5563]">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                <span>{copy.safety}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {creatorProfileMissing && <CodeAlert title={copy.missingProfileTitle}>{copy.missingProfile}</CodeAlert>}
          {profileError && <CodeAlert tone="error">{copy.profileError}</CodeAlert>}
          {categories.length === 0 && <CodeAlert tone="error">{copy.noCategories}</CodeAlert>}
          {errorMessage && <CodeAlert tone="error">{errorMessage}</CodeAlert>}
        </div>

        {!creatorProfileMissing && (
          <form ref={formRef} action={action} className="mt-8 space-y-6">
            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <Field label={copy.template} hint={copy.templateHint}>
                <select name="agent_template" className={inputClass} defaultValue="" onChange={handleTemplateChange}>
                  <option value="">{copy.templatePlaceholder}</option>
                  {AGENT_TEMPLATES.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </Field>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">{copy.core}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={copy.name}>
                  <input name="name" required placeholder="LegalDraft Pro" className={inputClass} />
                </Field>
                <Field label={copy.category}>
                  <select name="category_id" required className={inputClass} defaultValue="">
                    <option value="" disabled />
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={copy.shortDescription}>
                  <input name="short_description" required className={inputClass} />
                </Field>
                <Field label={copy.targetUser}>
                  <input name="target_user" required className={inputClass} />
                </Field>
                <Field label={copy.longDescription} wide>
                  <textarea name="long_description" required rows={5} className={inputClass} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">{copy.delivery}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={copy.does} hint={copy.lineHint}>
                  <textarea name="does" required rows={5} className={inputClass} />
                </Field>
                <Field label={copy.doesNotDo} hint={copy.lineHint}>
                  <textarea name="does_not_do" required rows={5} className={inputClass} />
                </Field>
                <Field label={copy.requiredInputs} hint={copy.lineHint}>
                  <textarea name="required_inputs" required rows={4} className={inputClass} />
                </Field>
                <Field label={copy.deliverables} hint={copy.lineHint}>
                  <textarea name="deliverables" required rows={4} className={inputClass} />
                </Field>
                <Field label={copy.sampleOutput}>
                  <textarea name="sample_output" required rows={4} className={inputClass} />
                </Field>
                <Field label={copy.knownLimits} hint={copy.lineHint}>
                  <textarea name="known_limits" required rows={4} className={inputClass} />
                </Field>
                <Field label={copy.pricingType}>
                  <select name="pricing_type" required className={inputClass} defaultValue="task">
                    <option value="task">{copy.task}</option>
                    <option value="project">{copy.project}</option>
                  </select>
                </Field>
                <Field label={copy.startingPrice} hint={copy.priceHint}>
                  <input
                    name="starting_price_eur"
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="99"
                    className={inputClass}
                  />
                </Field>
                <Field label={copy.riskLevel}>
                  <select name="risk_level" required className={inputClass} defaultValue="low">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="forbidden_beta">forbidden_beta</option>
                  </select>
                </Field>
                <Field label={copy.pricingHint} hint={copy.pricingDetailsHint}>
                  <input name="pricing_hint" required placeholder="Ex: includes one deliverable and one revision" className={inputClass} />
                </Field>
                <Field label={copy.executionMethod}>
                  <input name="execution_method" required placeholder="Exemple : contexte utilisateur, texte, URLs publiques" className={inputClass} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">{copy.contract}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={copy.workspaceMode}>
                  <select name="workspace_mode" required className={inputClass} defaultValue="instant">
                    {WORKSPACE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={copy.setupType}>
                  <select name="setup_type" required className={inputClass} defaultValue="none">
                    {SETUP_REQUIREMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={copy.outputPromiseSummary} wide>
                  <input
                    name="output_promise_summary"
                    placeholder="Ce que l’utilisateur peut obtenir en ouvrant le workspace"
                    className={inputClass}
                  />
                </Field>
                <Field label={copy.outputPromiseExamples} hint={copy.lineHint}>
                  <textarea name="output_promise_examples" rows={4} className={inputClass} />
                </Field>
                <Field label={copy.setupItems} hint={copy.lineHint}>
                  <textarea name="setup_items" rows={4} className={inputClass} />
                </Field>
                <Field label={copy.executionMode} hint={copy.executionModeHint}>
                  <select name="execution_mode" required className={inputClass} defaultValue="llm_prompt">
                    {EXECUTION_MODE_OPTIONS.map((option) => (
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
                {copy.submit}
              </Button>
            </div>
          </form>
        )}
      </main>
      <Footer variant="code" />
    </div>
  );
}
