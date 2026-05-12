import Link from "next/link";
import { ArrowLeft, Bot, Send } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { submitAgentForReviewAction } from "@/server/agents/actions";
import type { AgentCategoryOption } from "@/server/agents/creator-agents";

type CreatorAgentFormViewProps = {
  categories: AgentCategoryOption[];
  creatorProfileMissing: boolean;
  locale: Locale;
  profileError: string | null;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const copy = {
  fr: {
    eyebrow: "Soumission createur",
    title: "Soumettre un agent pour validation",
    description:
      "Decrivez clairement ce que l'agent livre, pour qui il est utile et quelles limites l'equipe AgentHub doit verifier.",
    back: "Retour creator",
    basics: "Informations principales",
    operations: "Execution et limites",
    name: "Nom",
    category: "Categorie",
    shortDescription: "Description courte",
    longDescription: "Description detaillee",
    targetUser: "Utilisateur cible",
    does: "Ce que l'agent fait",
    doesNotDo: "Ce que l'agent ne fait pas",
    requiredInputs: "Inputs requis",
    deliverables: "Livrables",
    sampleOutput: "Exemple de sortie",
    pricingType: "Type de prix",
    pricingHint: "Indication de prix",
    riskLevel: "Niveau de risque",
    executionMethod: "Methode d'execution",
    knownLimits: "Limites connues",
    submit: "Submit for review",
    lineHint: "Une ligne par element.",
    noCategories:
      "Aucune categorie n'est disponible. Ajoutez les categories Supabase avant de soumettre un agent.",
    creatorProfileRequiredTitle: "Profil createur requis",
    creatorProfileRequiredDescription:
      "Ce compte peut acceder a l'espace createur, mais il ne peut soumettre des agents que s'il possede son propre creator_profile. Les admins valident les agents depuis /admin et ne bypassent pas la propriete createur ici.",
    profileLoadError:
      "Impossible de verifier votre profil createur. Reessayez ou contactez l'equipe.",
    errors: {
      "missing-config": "La configuration Supabase est manquante.",
      required: "Tous les champs sont requis.",
      "invalid-pricing": "Le type de prix est invalide.",
      "invalid-risk": "Le niveau de risque est invalide.",
      "forbidden-risk": "Les agents forbidden_beta ne peuvent pas etre soumis directement.",
      "creator-profile-error": "Impossible de lire votre profil createur.",
      "creator-profile-missing":
        "Aucun profil createur n'est lie a ce compte. Reconnectez-vous ou contactez l'equipe.",
      "agent-insert-failed": "La creation de l'agent a echoue.",
      "version-insert-failed": "La creation de la version de validation a echoue.",
      "agent-submit-failed": "La soumission de l'agent a echoue.",
    },
  },
  en: {
    eyebrow: "Creator submission",
    title: "Submit an agent for review",
    description:
      "Describe what the agent delivers, who it is for, and which limits AgentHub should validate before publication.",
    back: "Back to creator",
    basics: "Core information",
    operations: "Execution and limits",
    name: "Name",
    category: "Category",
    shortDescription: "Short description",
    longDescription: "Detailed description",
    targetUser: "Target user",
    does: "What the agent does",
    doesNotDo: "What the agent does not do",
    requiredInputs: "Required inputs",
    deliverables: "Deliverables",
    sampleOutput: "Sample output",
    pricingType: "Pricing type",
    pricingHint: "Pricing hint",
    riskLevel: "Risk level",
    executionMethod: "Execution method",
    knownLimits: "Known limits",
    submit: "Submit for review",
    lineHint: "One item per line.",
    noCategories:
      "No categories are available. Add Supabase categories before submitting an agent.",
    creatorProfileRequiredTitle: "Creator profile required",
    creatorProfileRequiredDescription:
      "This account can access the creator area, but it can only submit agents when it has its own creator_profile. Admins review agents from /admin and do not bypass creator ownership here.",
    profileLoadError: "Could not verify your creator profile. Try again or contact the team.",
    errors: {
      "missing-config": "Supabase configuration is missing.",
      required: "All fields are required.",
      "invalid-pricing": "The pricing type is invalid.",
      "invalid-risk": "The risk level is invalid.",
      "forbidden-risk": "forbidden_beta agents cannot be submitted directly.",
      "creator-profile-error": "Could not read your creator profile.",
      "creator-profile-missing":
        "No creator profile is linked to this account. Sign in again or contact the team.",
      "agent-insert-failed": "Agent creation failed.",
      "version-insert-failed": "Review version creation failed.",
      "agent-submit-failed": "Agent submission failed.",
    },
  },
} as const;

function getSearchValue(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-[#6f675d]">{hint}</span> : null}
    </label>
  );
}

export async function CreatorAgentFormView({
  categories,
  creatorProfileMissing,
  locale,
  profileError,
  searchParams,
}: CreatorAgentFormViewProps) {
  const t = copy[locale];
  const params = searchParams ? await searchParams : undefined;
  const error = getSearchValue(params, "error");
  const action = submitAgentForReviewAction.bind(null, locale);
  const errorMessage = error && error in t.errors ? t.errors[error as keyof typeof t.errors] : null;
  const canSubmit = categories.length > 0 && !creatorProfileMissing && !profileError;

  return (
    <AppShell locale={locale}>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        action={
          <Link
            href={localizedPath("/creator", locale)}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 bg-white")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t.back}
          </Link>
        }
      />

      {creatorProfileMissing ? (
        <EmptyState
          icon={Bot}
          title={t.creatorProfileRequiredTitle}
          description={t.creatorProfileRequiredDescription}
          actionHref={localizedPath("/creator", locale)}
          actionLabel={t.back}
        />
      ) : (
        <form action={action} className="grid gap-6">
        {errorMessage ? (
          <p className="rounded-lg border border-[#e9b7b7] bg-[#f8dede] p-3 text-sm text-[#8a2f2f]">
            {errorMessage}
          </p>
        ) : null}

        {profileError ? (
          <p className="rounded-lg border border-[#e9b7b7] bg-[#f8dede] p-3 text-sm text-[#8a2f2f]">
            {t.profileLoadError}
          </p>
        ) : null}

        {categories.length === 0 ? (
          <p className="rounded-lg border border-[#e9b7b7] bg-[#f8dede] p-3 text-sm text-[#8a2f2f]">
            {t.noCategories}
          </p>
        ) : null}

        <Card className="rounded-lg bg-white">
          <CardHeader>
            <CardTitle>{t.basics}</CardTitle>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label={t.name}>
                <Input name="name" required placeholder="LinkedIn Content Agent" />
              </Field>
              <Field label={t.category}>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  name="category_id"
                  required
                >
                  <option value="" />
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.shortDescription}>
                <Input name="short_description" required />
              </Field>
              <Field label={t.targetUser}>
                <Input name="target_user" required />
              </Field>
              <div className="md:col-span-2">
                <Field label={t.longDescription}>
                  <Textarea name="long_description" required rows={5} />
                </Field>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-lg bg-white">
          <CardHeader>
            <CardTitle>{t.operations}</CardTitle>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label={t.does} hint={t.lineHint}>
                <Textarea name="does" required rows={5} />
              </Field>
              <Field label={t.doesNotDo} hint={t.lineHint}>
                <Textarea name="does_not_do" required rows={5} />
              </Field>
              <Field label={t.requiredInputs} hint={t.lineHint}>
                <Textarea name="required_inputs" required rows={5} />
              </Field>
              <Field label={t.deliverables} hint={t.lineHint}>
                <Textarea name="deliverables" required rows={5} />
              </Field>
              <Field label={t.sampleOutput}>
                <Textarea name="sample_output" required rows={4} />
              </Field>
              <Field label={t.knownLimits} hint={t.lineHint}>
                <Textarea name="known_limits" required rows={4} />
              </Field>
              <Field label={t.pricingType}>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  name="pricing_type"
                  required
                >
                  <option value="task">task</option>
                  <option value="project">project</option>
                </select>
              </Field>
              <Field label={t.riskLevel}>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  name="risk_level"
                  required
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="forbidden_beta">forbidden_beta</option>
                </select>
              </Field>
              <Field label={t.pricingHint}>
                <Input name="pricing_hint" required placeholder="From EUR 99 per task" />
              </Field>
              <Field label={t.executionMethod}>
                <Input name="execution_method" required placeholder="Manual beta delivery via verified endpoint" />
              </Field>
            </div>
          </CardHeader>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716] disabled:opacity-50")}
          >
            <Send className="size-4" aria-hidden="true" />
            {t.submit}
          </button>
        </div>
        </form>
      )}
    </AppShell>
  );
}
