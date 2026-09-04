'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EXECUTION_MODE_OPTIONS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_OPTIONS } from '@/lib/agent-contract';
import { resubmitAgentChangesAction } from '@/server/agents/actions';
import { ArrowLeft, Send, ShieldAlert } from 'lucide-react';
import { CodeAlert, cleanAdminNotes } from './code-console-ui';
import CreatorGuardrailPreview from './creator-guardrail-preview';
import WorkspaceBlueprintPreview from './workspace-blueprint-preview';

const inputClass =
  'w-full rounded-xl border border-[#D8DDEE] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/15';

const creatorExecutionModeOptions = EXECUTION_MODE_OPTIONS.filter((option) => option.value === 'llm_prompt');

const errorMessages = {
  required: 'Tous les champs sont requis.',
  'invalid-pricing': 'Le type de prix est invalide.',
  'invalid-price': 'Le prix fixe doit être supérieur à 0.',
  'invalid-risk': 'Le niveau de risque est invalide.',
  'invalid-contract': 'L’expérience workspace ou la promesse de résultat est invalide.',
  'workflow-external-promise-without-webhook': 'Ce workflow promet une action externe. Ajoutez une étape webhook approuvable ou retirez cette promesse.',
  'missing-creator-endpoint-disclosure': 'La fiche de l’agent API doit annoncer clairement l’appel à une API/endpoint creator approuvé côté serveur.',
  'forbidden-risk': 'Les agents forbidden_beta ne peuvent pas être soumis directement.',
  'creator-profile-error': 'Impossible de lire votre profil créateur.',
  'creator-profile-missing': 'Aucun profil créateur n’est lié à ce compte.',
  'agent-not-found': 'Agent introuvable.',
  'agent-not-editable': 'Cet agent ne peut pas être modifié dans son état actuel.',
  'agent-load-failed': 'Impossible de charger cet agent.',
  'version-update-failed': 'Impossible de mettre à jour la version de validation.',
  'agent-update-failed': 'Impossible de resoumettre l’agent.',
  'changes-summary-required': 'Expliquez les modifications apportées en au moins 10 caractères.',
  'missing-config': 'Configuration Supabase manquante.',
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

function lines(values) {
  return (values || []).join('\n');
}

function euros(cents) {
  if (typeof cents !== 'number' || cents <= 0) {
    return '';
  }

  return String(cents / 100);
}

function setupItems(agent) {
  return lines(agent?.version?.setupRequirements?.items);
}

function outputExamples(agent) {
  return lines(agent?.version?.outputPromise?.examples);
}

function initialValues(agent) {
  return {
    agent_template: '',
    creator_endpoint_name: '',
    creator_endpoint_url: '',
    deliverables: lines(agent?.version?.deliverables),
    does: lines(agent?.version?.capabilities),
    does_not_do: '',
    execution_mode: agent?.version?.executionMode ?? 'llm_prompt',
    known_limits: lines(agent?.version?.limitations),
    name: agent?.name ?? '',
    output_promise_examples: outputExamples(agent),
    output_promise_summary: agent?.version?.outputPromise?.summary ?? '',
    required_inputs: lines(agent?.version?.requiredInputs),
    risk_level: agent?.riskLevel ?? 'low',
    setup_items: setupItems(agent),
    setup_type: agent?.version?.setupRequirements?.type ?? 'none',
    short_description: agent?.summary ?? '',
    starting_price_eur: euros(agent?.startingPriceCents),
    runtime_type: agent?.version?.runtimeType ?? 'llm_prompt',
    workflow_endpoint_url: '',
    workflow_steps: '',
    workspace_mode: agent?.version?.workspaceMode ?? 'instant',
  };
}

export default function CodeEditAgentContent({ agentResult, categories = [], error }) {
  const agent = agentResult?.agent;
  const [values, setValues] = useState(() => initialValues(agent));
  const adminNotes = cleanAdminNotes(agent?.latestAdminReview?.notes);
  const adminFeedbackTitle = agent?.latestAdminReview?.isChangesRequest
    ? 'Modifications demandées'
    : agent?.latestAdminReview?.decision === 'rejected' || agent?.status === 'rejected'
      ? 'Refus admin'
      : 'Retour admin';
  const fieldProps = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (event) => setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
      <main className="max-w-5xl px-4 py-8 lg:px-8">
        <Link href="/code/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B3FA0] hover:text-[#111827]">
          <ArrowLeft className="h-4 w-4" />
          Retour à mes agents
        </Link>

        <section className="mb-8 overflow-hidden rounded-3xl border border-[#E3E7F2] bg-white p-6 shadow-sm md:p-8">
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">CORRECTION</p>
          <h1 className="font-display text-4xl font-bold text-[#111827] md:text-5xl">Modifier l’agent</h1>
          <p className="mt-3 max-w-2xl text-[#4B5563]">
            Appliquez les retours admin puis resoumettez l’agent. Il repassera en file de validation.
          </p>
        </section>

        {!agent && (
          <CodeAlert tone="error">
            {agentResult?.error === 'creator-profile-missing'
              ? 'Aucun profil créateur n’est lié à ce compte.'
              : 'Impossible de charger cet agent.'}
          </CodeAlert>
        )}

        {error && (
          <div className="mb-5">
            <CodeAlert tone="error">{errorMessages[error] || 'Impossible de resoumettre l’agent.'}</CodeAlert>
          </div>
        )}

        {agent && (
          <form action={resubmitAgentChangesAction.bind(null, 'fr')} className="space-y-6">
            <input type="hidden" name="agent_id" value={agent.id} />
            <input type="hidden" name="runtime_type" value={values.runtime_type} />

            {adminNotes && (
              <section className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-5 text-sm text-[#92400E]">
                <p className="font-label mb-2 text-xs text-[#92400E]">Retour admin</p>
                <h2 className="font-display mb-2 text-xl font-bold text-[#111827]">{adminFeedbackTitle}</h2>
                <p className="whitespace-pre-line leading-relaxed">{adminNotes}</p>
              </section>
            )}

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">Informations principales</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nom">
                  <input {...fieldProps('name')} required className={inputClass} />
                </Field>
                <Field label="Catégorie">
                  <select name="category_id" required className={inputClass} defaultValue={agent.categoryId ?? ''}>
                    <option value="" disabled />
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Description courte" wide>
                  <input {...fieldProps('short_description')} required className={inputClass} />
                </Field>
                <Field label="Description détaillée" wide>
                  <textarea name="long_description" required rows={5} defaultValue={agent.description} className={inputClass} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#111827]">Capacités et limites</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Ce que l’agent fait" hint="Une ligne par élément.">
                  <textarea {...fieldProps('does')} required rows={5} className={inputClass} />
                </Field>
                <Field label="Inputs requis" hint="Une ligne par élément.">
                  <textarea {...fieldProps('required_inputs')} required rows={5} className={inputClass} />
                </Field>
                <Field label="Livrables" hint="Une ligne par élément.">
                  <textarea {...fieldProps('deliverables')} required rows={5} className={inputClass} />
                </Field>
                <Field label="Limites connues" hint="Une ligne par élément.">
                  <textarea {...fieldProps('known_limits')} required rows={5} className={inputClass} />
                </Field>
                <Field label="Type de prix">
                  <select name="pricing_type" required className={inputClass} defaultValue={agent.pricingType}>
                    <option value="task">À la tâche</option>
                    <option value="project">Au projet</option>
                  </select>
                </Field>
                <Field label="Prix fixe affiché">
                  <input {...fieldProps('starting_price_eur')} required type="number" min="1" step="0.01" className={inputClass} />
                </Field>
                <Field label="Niveau de risque">
                  <select {...fieldProps('risk_level')} required className={inputClass}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="forbidden_beta">forbidden_beta</option>
                  </select>
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-2 text-2xl font-bold text-[#111827]">Expérience après activation</h2>
              <p className="mb-5 text-sm text-[#4B5563]">
                Ces éléments expliquent à l’utilisateur ce qu’il obtient après activation. Gardez une promesse simple, concrète et vérifiable.
              </p>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Type d’expérience dans le workspace">
                  <select {...fieldProps('workspace_mode')} required className={inputClass}>
                    {WORKSPACE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ce que l’utilisateur devra faire après activation">
                  <select {...fieldProps('setup_type')} required className={inputClass}>
                    {SETUP_REQUIREMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Promesse de résultat" wide hint="Une phrase courte sur le résultat que l’utilisateur peut attendre.">
                  <input {...fieldProps('output_promise_summary')} className={inputClass} />
                </Field>
                <Field label="Exemples de résultats" hint="Une ligne par exemple.">
                  <textarea {...fieldProps('output_promise_examples')} rows={4} className={inputClass} />
                </Field>
                <Field label="Informations ou éléments nécessaires" hint="Une ligne par élément si un setup est requis.">
                  <textarea {...fieldProps('setup_items')} rows={4} className={inputClass} />
                </Field>
                <Field
                  label="Mode d’exécution prévu"
                  hint="Pour la beta creator, gardez “Assistant texte”. Les documents restent une capacité contrôlée, pas le standard agent avancé beta."
                >
                  <select {...fieldProps('execution_mode')} required className={inputClass}>
                    {creatorExecutionModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <WorkspaceBlueprintPreview values={values} />

            <CreatorGuardrailPreview values={values} />

            <section className="rounded-2xl border border-[#E3E7F2] bg-white p-6 shadow-sm">
              <h2 className="font-display mb-2 text-2xl font-bold text-[#111827]">Modifications apportées</h2>
              <p className="mb-5 text-sm text-[#4B5563]">
                Résumez uniquement ce que vous avez corrigé. L’admin verra ce résumé avec la fiche complète mise à jour.
              </p>
              <Field label="Résumé des corrections" hint="Exemple : limites juridiques clarifiées, prix fixe détaillé, exemples de documents ajoutés." wide>
                <textarea name="changes_summary" required minLength={10} rows={4} className={inputClass} />
              </Field>
            </section>

            <div className="flex flex-col gap-4 rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-4 text-sm text-[#92400E] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <p>Après resoumission, l’admin devra reprendre la validation avant publication.</p>
              </div>
              <Button type="submit" className="border-0 bg-[#111827] text-white hover:bg-[#2B1A44]">
                <Send className="mr-2 h-4 w-4" />
                Resoumettre
              </Button>
            </div>
          </form>
        )}
      </main>
  );
}
