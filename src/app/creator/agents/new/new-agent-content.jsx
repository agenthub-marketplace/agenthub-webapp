'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { submitAgentForReviewAction } from '@/server/agents/actions';
import { ArrowLeft, Check, Send, ShieldAlert } from 'lucide-react';

const copy = {
  fr: {
    back: 'Retour au tableau de bord',
    eyebrow: 'Soumission créateur',
    title: 'Soumettre un agent pour validation',
    subtitle: 'Décrivez un agent professionnel, ses livrables, ses limites et son mode de livraison beta.',
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
    startingPrice: 'Prix beta affiché',
    pricingHint: 'Détails de prix et conditions',
    priceHint:
      'Montant de départ en euros, visible dans la marketplace. Pendant la beta, aucun paiement n’est encaissé par AgentHub : vous gérez le cadrage final et la livraison avec le client.',
    pricingDetailsHint:
      'Expliquez ce qui est inclus, les limites, et les cas où vous ajusterez le prix avant livraison.',
    riskLevel: 'Niveau de risque',
    executionMethod: 'Méthode d’exécution',
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
    subtitle: 'Describe a professional agent, its deliverables, limits, and beta delivery method.',
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
    startingPrice: 'Displayed beta price',
    pricingHint: 'Pricing details and terms',
    priceHint:
      'Starting amount in euros, shown in the marketplace. During beta, AgentHub does not collect payments: you handle final scoping and delivery with the customer.',
    pricingDetailsHint:
      'Explain what is included, limits, and when you may adjust the price before delivery.',
    riskLevel: 'Risk level',
    executionMethod: 'Execution method',
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
      <span className="font-label mb-1.5 block text-xs text-[#9B72CF]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-[#7F6B9C]">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none transition-colors placeholder:text-[#6F5B8F] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20';

function Alert({ children, tone = 'warning', title }) {
  const classes =
    tone === 'error'
      ? 'border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]'
      : 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F6C177]';

  return (
    <div className={`rounded-2xl border p-5 ${classes}`}>
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          {title && <p className="font-display font-semibold text-[#F4EFFA]">{title}</p>}
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
  const errorMessage = error && t.errors[error] ? t.errors[error] : null;
  const canSubmit = categories.length > 0 && !creatorProfileMissing && !profileError;
  const dashboardPath = locale === 'en' ? '/en/creator/dashboard' : '/creator/dashboard';

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container max-w-5xl py-8">
        <Link href={dashboardPath} className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA]">
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Link>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-label mb-2 text-xs text-[#9B72CF]">{t.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold text-[#F4EFFA] md:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-2xl text-[#C8B1E4]">{t.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-4 text-sm text-[#C8B1E4]">
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
          <form action={action} className="mt-8 space-y-6">
            <section className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#F4EFFA]">{t.core}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t.name}>
                  <input name="name" required placeholder="LegalDraft Pro" className={inputClass} />
                </Field>
                <Field label={t.category}>
                  <select name="category_id" required className={inputClass} defaultValue="">
                    <option value="" disabled />
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.shortDescription}>
                  <input name="short_description" required className={inputClass} />
                </Field>
                <Field label={t.targetUser}>
                  <input name="target_user" required className={inputClass} />
                </Field>
                <Field label={t.longDescription} wide>
                  <textarea name="long_description" required rows={5} className={inputClass} />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <h2 className="font-display mb-5 text-2xl font-bold text-[#F4EFFA]">{t.delivery}</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t.does} hint={t.lineHint}>
                  <textarea name="does" required rows={5} className={inputClass} />
                </Field>
                <Field label={t.doesNotDo} hint={t.lineHint}>
                  <textarea name="does_not_do" required rows={5} className={inputClass} />
                </Field>
                <Field label={t.requiredInputs} hint={t.lineHint}>
                  <textarea name="required_inputs" required rows={4} className={inputClass} />
                </Field>
                <Field label={t.deliverables} hint={t.lineHint}>
                  <textarea name="deliverables" required rows={4} className={inputClass} />
                </Field>
                <Field label={t.sampleOutput}>
                  <textarea name="sample_output" required rows={4} className={inputClass} />
                </Field>
                <Field label={t.knownLimits} hint={t.lineHint}>
                  <textarea name="known_limits" required rows={4} className={inputClass} />
                </Field>
                <Field label={t.pricingType}>
                  <select name="pricing_type" required className={inputClass} defaultValue="task">
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
                  />
                </Field>
                <Field label={t.riskLevel}>
                  <select name="risk_level" required className={inputClass} defaultValue="low">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="forbidden_beta">forbidden_beta</option>
                  </select>
                </Field>
                <Field label={t.pricingHint} hint={t.pricingDetailsHint}>
                  <input name="pricing_hint" required placeholder="Ex: includes one deliverable and one revision" className={inputClass} />
                </Field>
                <Field label={t.executionMethod}>
                  <input name="execution_method" required placeholder="Manual beta delivery via verified endpoint" className={inputClass} />
                </Field>
              </div>
            </section>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-12 border-0 bg-[#532B88] px-6 text-white glow-primary hover:bg-[#7C3AED] disabled:opacity-50"
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
