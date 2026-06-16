import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { AGENT_RUNTIME_TYPE_LABELS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { getCurrentProfile } from '@/lib/auth/session';
import { euroLabelToCredits, formatCredits, formatCreditsFromCents } from '@/lib/format-credits';
import { polishFrenchCopy, polishFrenchList } from '@/lib/french-copy';
import { buildAgentWorkspaceBlueprint } from '@/server/agents/workspace-blueprint';
import { getMarketplaceAgentBySlug } from '@/server/marketplace/agents';
import { createAgentAccessAction } from '@/server/rentals/actions';
import { getUserAgentOrderState } from '@/server/rentals/user-rentals';
import { AlertTriangle, ArrowLeft, Check, Clock, ShieldCheck, Star } from 'lucide-react';

function ListSection({ title, items, icon: Icon, tone = 'default' }) {
  const iconColor = tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

  return (
    <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
      <h2 className="font-display font-bold text-lg mb-4">{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-[#C8B1E4]">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#9B72CF]">Information not provided yet.</p>
      )}
    </div>
  );
}

function ReviewSection({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">Avis vérifiés</h2>
        <p className="text-sm text-[#9B72CF]">Aucun avis vérifié pour cet agent pour l’instant.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5 space-y-4">
      <h2 className="font-display font-bold text-lg">Avis vérifiés</h2>
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-[#2F184B] bg-[#0A0818] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {Array.from({ length: review.rating }).map((_, index) => (
                  <Star key={index} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
                <span className="ml-1 text-xs text-[#9B72CF]">
                  {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
            {review.title && <p className="font-label text-xs text-[#F4EFFA] mb-1">{review.title}</p>}
            {review.body && <p className="text-sm text-[#C8B1E4] leading-relaxed">{review.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentBlueprintSection({ blueprint }) {
  const inputFields = blueprint.inputSchema.fields ?? [];
  const outputSections = blueprint.outputSchema.sections ?? [];
  const trustItems = [
    ...(blueprint.trustBoundary.dataSentToAgentHub ?? []),
    ...(blueprint.trustBoundary.dataSentToCreatorInfra ?? []),
    ...(blueprint.trustBoundary.userWarnings ?? []),
  ];

  return (
    <div className="my-6 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
      <p className="font-label mb-2 text-xs text-[#B794F4]">WORKSPACE PRÉVU</p>
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Comment cet agent sera utilisé</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C8B1E4]">
            Ce résumé annonce ce que vous devrez fournir, ce que le workspace doit produire, et les données qui restent dans AgentHub.
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#6B3FA0]/45 bg-[#1A1130] px-3 py-1 text-[10px] font-label text-[#C4B5FD]">
          Blueprint agent
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-4">
          <h3 className="font-display mb-3 text-base font-bold text-[#F4EFFA]">À préparer</h3>
          <div className="space-y-3">
            {inputFields.slice(0, 4).map((field) => (
              <div key={field.key} className="text-sm">
                <p className="font-semibold text-[#F4EFFA]">{field.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#9B72CF]">{field.helper}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-4">
          <h3 className="font-display mb-3 text-base font-bold text-[#F4EFFA]">Résultat attendu</h3>
          <div className="space-y-3">
            {outputSections.slice(0, 4).map((section) => (
              <div key={section.key} className="text-sm">
                <p className="font-semibold text-[#F4EFFA]">{section.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#9B72CF]">{section.expectedContent}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#F59E0B]/25 bg-[#1A1208] p-4">
          <h3 className="font-display mb-3 text-base font-bold text-[#F4EFFA]">Confiance et limites</h3>
          <div className="space-y-2">
            {trustItems.slice(0, 4).map((item, index) => (
              <div key={`${item}-${index}`} className="flex gap-2 text-sm text-[#F6C177]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatOrderPrice(cents) {
  return formatCreditsFromCents(cents);
}

function formatOrderDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('fr-FR');
}

const rentalErrors = {
  'agent-load-failed': 'Impossible de charger cet agent pour le moment.',
  'agent-unavailable': 'Cet agent n’est plus disponible à l’accès beta.',
  'agent-runtime-unavailable': 'Cet agent est approuvé, mais son runtime est temporairement désactivé. Réessayez après validation AgentHub.',
  'rental-create-failed': 'Impossible d’activer cet accès beta pour le moment.',
  'price-not-configured': 'Cet agent doit avoir un nombre de crédits fixe avant d’être loué.',
  'self-rental-not-allowed': 'Vous ne pouvez pas louer votre propre agent en beta.',
  'payment-service-unavailable': 'Le service de paiement est indisponible pour le moment.',
  'checkout-create-failed': 'Impossible de créer la session de paiement Stripe.',
  'payment-create-failed': 'Impossible d’enregistrer ce paiement.',
  'stripe-not-configured': 'Stripe n’est pas encore configuré sur cet environnement.',
  'payment-config-invalid': 'La configuration paiement est incohérente sur cet environnement.',
};

const orderMessages = {
  'activation-pending': 'Votre paiement est reçu. L’activation de l’accès est en cours.',
  'payment-pending': 'Un paiement est déjà en attente pour cet agent.',
  'activation-blocked': 'Le paiement est reçu, mais l’activation a été bloquée. Contactez l’équipe AgentHub.',
};

function runtimeDetail(contract) {
  const runtimeType = contract?.runtimeType;
  const label = AGENT_RUNTIME_TYPE_LABELS[runtimeType] || 'Agent AgentHub';

  if (runtimeType === 'creator_endpoint') {
    return {
      label,
      detail: 'Exécution orchestrée par AgentHub avec une API creator approuvée côté serveur.',
    };
  }

  if (runtimeType === 'workflow_automation') {
    return {
      label,
      detail: 'Suite d’étapes contrôlées avec progression et résultat stocké dans le workspace.',
    };
  }

  if (runtimeType === 'document_file') {
    return {
      label,
      detail: 'Prévoit un document PDF/DOCX privé avant analyse dans le workspace.',
    };
  }

  if (runtimeType === 'llm_prompt') {
    return {
      label,
      detail: 'Assistant texte guidé, adapté aux réponses structurées à partir de votre contexte.',
    };
  }

  return {
    label,
    detail: 'Workspace guidé sans exécution IA avancée.',
  };
}

function beforeRentChecklist({ agent, hasPrice, outputPromiseSummary, requiredInputs, runtimeInfo, setupLabel }) {
  const items = [
    {
      detail: runtimeInfo.detail,
      label: `Type : ${runtimeInfo.label}`,
      tone: 'default',
    },
    {
      detail: requiredInputs.length > 0
        ? requiredInputs.slice(0, 2).join(' · ')
        : 'Aucun input spécifique annoncé, mais vous devrez fournir un contexte clair dans le workspace.',
      label: 'Préparez vos informations',
      tone: requiredInputs.length > 0 ? 'default' : 'warning',
    },
    {
      detail: outputPromiseSummary || 'Le workspace guidera l’usage, mais la promesse de résultat doit être relue avant location.',
      label: 'Vérifiez la promesse',
      tone: outputPromiseSummary ? 'default' : 'warning',
    },
    {
      detail: setupLabel,
      label: 'Mise en place',
      tone: 'default',
    },
  ];

  if (!hasPrice) {
    items.push({
      detail: 'Le nombre de crédits doit être configuré avant activation.',
      label: 'Prix indisponible',
      tone: 'warning',
    });
  }

  if (agent.contract.runtimeType === 'creator_endpoint') {
    items.push({
      detail: 'AgentHub orchestre l’appel côté serveur vers une API créateur approuvée. N’envoyez pas de secrets.',
      label: 'Infrastructure créateur',
      tone: 'warning',
    });
  }

  if (agent.contract.runtimeType === 'workflow_automation') {
    items.push({
      detail: 'Le résultat dépend d’une suite d’étapes validées. Prévoyez un contexte assez précis pour permettre les décisions.',
      label: 'Workflow multi-étapes',
      tone: 'default',
    });
  }

  if (agent.contract.runtimeType === 'document_file') {
    items.push({
      detail: 'Préparez un PDF/DOCX avec texte sélectionnable. Les PDF scannés peuvent échouer en beta.',
      label: 'Document requis',
      tone: 'warning',
    });
  }

  return items.slice(0, 6);
}

export default async function Page({ params, searchParams }) {
  const { slug } = await params;
  const [agentResult, profile] = await Promise.all([
    getMarketplaceAgentBySlug(slug),
    getCurrentProfile(),
  ]);
  const { agent, error } = agentResult;
  const query = searchParams ? await searchParams : {};
  const rentalError = typeof query?.error === 'string' ? query.error : null;
  const orderMessage = typeof query?.order === 'string' ? orderMessages[query.order] : null;
  const paymentCancelled = query?.payment === 'cancelled';
  const reviewSubmitted = typeof query?.reviewSubmitted === 'string';

  if (!agent) {
    return (
      <div className="min-h-screen">
        <AgentHubNavbar profile={profile} />
        <main className="container py-20">
          <Link href="/agenthub/search" className="inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-8">
            <ArrowLeft className="w-4 h-4" />
            Retour marketplace
          </Link>
          <div className="max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
            <p className="font-label text-xs text-[#F59E0B] mb-3">AGENT INTROUVABLE</p>
            <h1 className="font-display text-3xl font-bold mb-3">Cet agent n’est pas disponible.</h1>
            <p className="text-[#C8B1E4] mb-6">
              {error ? 'La marketplace est temporairement indisponible.' : 'Ce slug ne correspond à aucun agent approuvé dans Supabase.'}
            </p>
            <Link href="/agenthub/search">
              <Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0">Voir les agents disponibles</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const priceModeLabel = agent.pricingType === 'project' ? 'projet' : 'tâche';
  const hasPrice = typeof agent.fromPrice === 'number' && agent.fromPrice > 0;
  const displayedPrice = hasPrice ? formatCredits(agent.fromPrice) : euroLabelToCredits(agent.priceLabel);
  const setupLabel = WORKSPACE_MODE_LABELS[agent.contract.workspaceMode] || 'Accès immédiat';
  const runtimeInfo = runtimeDetail(agent.contract);
  const description = polishFrenchCopy(agent.description);
  const capabilities = polishFrenchList(agent.capabilities);
  const limitations = polishFrenchList(agent.limitations);
  const requiredInputs = polishFrenchList(agent.requiredInputs);
  const deliverables = polishFrenchList(agent.deliverables);
  const outputPromiseSummary = polishFrenchCopy(agent.contract.outputPromise.summary);
  const outputPromiseExamples = polishFrenchList(agent.contract.outputPromise.examples);
  const setupItems = polishFrenchList(agent.contract.setupRequirements.items);
  const workspaceBlueprint = buildAgentWorkspaceBlueprint({
    actions: [],
    agent: {
      capabilities: agent.capabilities,
      deliverables: agent.deliverables,
      limitations: agent.limitations,
      requiredInputsList: agent.requiredInputs,
    },
    contract: agent.contract,
    documentInputMode: agent.contract.runtimeType === 'document_file',
    locale: 'fr',
  });
  const rentChecklist = beforeRentChecklist({
    agent,
    hasPrice,
    outputPromiseSummary,
    requiredInputs,
    runtimeInfo,
    setupLabel,
  });
  const { state: orderState } = profile ? await getUserAgentOrderState(profile.id, agent.id) : { state: null };
  const canStartOrder = hasPrice && (!orderState || orderState.kind === 'stopped_access');

  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <main className="container py-8">
        <Link href="/agenthub/search" className="inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour marketplace
        </Link>

        {reviewSubmitted && (
          <div className="mb-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            Votre avis a bien été envoyé. Merci pour votre retour.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <section>
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <AgentAvatar index={agent.gradient} size="xl" />
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#10B981]/30 text-[#10B981]">
                    <ShieldCheck className="w-3 h-3" />
                    Certifié
                  </span>
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#532B88]/40 text-[#C8B1E4]">
                    {agent.category}
                  </span>
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#8B5CF6]/40 text-[#C4B5FD]">
                    {runtimeInfo.label}
                  </span>
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#8B5CF6]/40 text-[#C4B5FD]">
                    {setupLabel}
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{agent.name}</h1>
                <p className="text-lg text-[#C8B1E4] mb-5">{agent.pitch}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#9B72CF]">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
                    <span className="font-stat text-[#F4EFFA]">{agent.rating || 'New'}</span>
                    <span>({agent.reviews} avis vérifiés)</span>
                  </span>
                  {agent.estimatedTurnaround && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {agent.estimatedTurnaround}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mb-6">
              <p className="font-label text-xs text-[#9B72CF] mb-3">DESCRIPTION</p>
              <p className="text-[#C8B1E4] leading-relaxed">{description}</p>
            </div>

            <AgentBlueprintSection blueprint={workspaceBlueprint} />

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <ListSection title="Ce que l’agent fait" items={capabilities} icon={Check} />
              <ListSection title="Limites connues" items={limitations} icon={AlertTriangle} tone="warning" />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <ListSection title="Inputs nécessaires" items={requiredInputs} icon={Check} />
              <ListSection title="Livrables attendus" items={deliverables} icon={Check} />
            </div>

            <div className="my-6 grid md:grid-cols-2 gap-5">
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">Type d’agent</h2>
                <p className="text-sm font-semibold text-[#F4EFFA]">{runtimeInfo.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">{runtimeInfo.detail}</p>
              </div>
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">Ce que vous obtenez</h2>
                <p className="text-sm leading-relaxed text-[#C8B1E4]">
                  {outputPromiseSummary || 'L’accès ouvre un workspace guidé pour utiliser cet agent avec les consignes fournies par le créateur.'}
                </p>
                {outputPromiseExamples.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-[#C8B1E4]">
                    {outputPromiseExamples.map((example, index) => (
                      <li key={`${example}-${index}`} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">Setup avant usage</h2>
                <p className="text-sm text-[#C8B1E4]">
                  {optionLabel(SETUP_REQUIREMENT_OPTIONS, agent.contract.setupRequirements.type)}
                </p>
                {setupItems.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-[#C8B1E4]">
                    {setupItems.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <ReviewSection reviews={agent.reviewSummaries} />
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <div className="bg-[#0F0A1E] border border-[#6B3FA0]/45 rounded-2xl p-5">
              <p className="font-label text-[10px] text-[#B794F4] mb-2">AVANT DE LOUER</p>
              <h2 className="font-display font-bold text-lg mb-3">Est-ce le bon agent ?</h2>
              <div className="space-y-3">
                {rentChecklist.map((item) => {
                  const Icon = item.tone === 'warning' ? AlertTriangle : Check;
                  const color = item.tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

                  return (
                    <div key={`${item.label}-${item.detail}`} className="flex gap-2 rounded-xl border border-[#2F184B] bg-[#080612] p-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                      <div>
                        <p className="text-sm font-semibold text-[#F4EFFA]">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[#C8B1E4]">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 glow-soft">
              <p className="font-label text-xs text-[#9B72CF] mb-1">Crédits requis</p>
              {hasPrice ? (
                <p className="font-stat text-4xl text-[#F4EFFA] glow-text mb-1">
                  {displayedPrice}
                  <span className="text-base text-[#9B72CF] ml-1">{priceModeLabel === 'projet' ? 'au projet' : 'à la tâche'}</span>
                </p>
              ) : (
                <p className="font-display text-2xl font-bold text-[#F4EFFA] mb-2">Crédits non configurés</p>
              )}
              {rentalError && (
                <div className="mb-4 rounded-xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-3 text-xs text-[#FCA5A5]">
                  {rentalErrors[rentalError] || 'Impossible d’activer cet accès beta.'}
                </div>
              )}
              {paymentCancelled && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                  Paiement annulé. Aucun accès agent n’a été créé.
                </div>
              )}
              {orderMessage && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                  {orderMessage}
                </div>
              )}
              <p className="text-sm text-[#9B72CF] mb-5">
                Le nombre de crédits est fixé par le créateur puis validé avant publication. L’accès s’active uniquement après confirmation.
              </p>
              {orderState?.kind === 'open_access' && (
                <div className="mb-4 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#C8B1E4]">
                  <p className="font-display font-bold text-[#6EE7B7]">Accès déjà actif</p>
                  <p className="mt-2">
                    Vous avez déjà activé cet agent. Retrouvez-le dans “Mes agents” et ouvrez le workspace quand vous voulez.
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-[#9B72CF]">
                    <span>Statut : {orderState.status === 'active' ? 'actif' : orderState.status}</span>
                    <span>Activé le {formatOrderDate(orderState.createdAt)}</span>
                    <span>Montant : {formatOrderPrice(orderState.priceCents, orderState.currency)}</span>
                  </div>
                  <Link href={`/agenthub/workspace/${orderState.rentalId}?tab=use`} className="mt-4 block">
                    <Button className="w-full border-0 bg-[#10B981] text-[#07130F] hover:bg-[#34D399]">
                      Ouvrir et utiliser
                    </Button>
                  </Link>
                </div>
              )}
              {orderState?.kind === 'payment_pending' && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
                  <p className="font-display font-bold">Paiement en attente</p>
                  <p className="mt-2">
                    Une commande est déjà ouverte pour cet agent. Finalisez le paiement ou attendez son expiration avant de relancer l’activation.
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-[#C8B1E4]">
                    <span>Créé le {formatOrderDate(orderState.createdAt)}</span>
                    <span>Montant : {formatOrderPrice(orderState.amountCents, orderState.currency)}</span>
                  </div>
                </div>
              )}
              {orderState?.kind === 'activation_pending' && (
                <div className="mb-4 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#C8B1E4]">
                  <p className="font-display font-bold text-[#6EE7B7]">Activation en cours</p>
                  <p className="mt-2">
                    Le paiement est enregistré. L’accès sera disponible dès que la confirmation webhook Stripe aura terminé.
                  </p>
                  {orderState.checkoutSessionId && (
                    <Link href={`/checkout/success?session_id=${encodeURIComponent(orderState.checkoutSessionId)}`} className="mt-4 block">
                      <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                        Vérifier l’activation
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {orderState?.kind === 'activation_blocked' && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
                  <p className="font-display font-bold">Activation bloquée</p>
                  <p className="mt-2">
                    Paiement reçu, mais l’activation de l’accès nécessite une vérification. Contactez le support AgentHub avant de relancer.
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-[#C8B1E4]">
                    <span>Créé le {formatOrderDate(orderState.createdAt)}</span>
                    <span>Montant : {formatOrderPrice(orderState.amountCents, orderState.currency)}</span>
                  </div>
                </div>
              )}
              {orderState?.kind === 'stopped_access' && (
                <div className="mb-4 rounded-xl border border-[#6B3FA0]/45 bg-[#1A1130] p-4 text-sm text-[#C8B1E4]">
                  <p className="font-display font-bold text-[#F4EFFA]">Accès arrêté</p>
                  <p className="mt-2">Votre dernier accès est fermé. Vous pouvez relouer cet agent.</p>
                </div>
              )}
              {canStartOrder ? (
                <form action={createAgentAccessAction.bind(null, 'fr')} className="space-y-3">
                  <input type="hidden" name="agent_id" value={agent.id} />
                  <input type="hidden" name="slug" value={agent.slug} />
                  <Button className="w-full bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-12">
                    {orderState?.kind === 'stopped_access' ? 'Relouer cet agent' : 'Louer cet agent'}
                  </Button>
                </form>
              ) : !orderState ? (
                <Button disabled className="w-full bg-[#532B88] text-white border-0 h-12 opacity-50">
                  Location indisponible
                </Button>
              ) : null}
              <p className="mt-3 text-xs text-[#9B72CF]">
                En local sans clé Stripe, l’accès beta peut encore être créé gratuitement pour tester le produit.
              </p>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-3">Créateur</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center font-stat text-sm text-white">
                  {agent.creator.avatar}
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{agent.creator.name}</p>
                  <p className="text-[11px] text-[#9B72CF]">Créateur vérifié AgentHub</p>
                </div>
              </div>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-2">Retours vérifiés</p>
              <div className="text-[#F4EFFA] font-stat text-sm">{agent.reviews} avis</div>
              <p className="text-xs text-[#9B72CF] mt-2">Note moyenne basée sur les avis après activation.</p>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-2">Données</p>
              <p className="text-sm text-[#C8B1E4]">{agent.dataHandlingNotes || 'Classification de données non renseignée.'}</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
