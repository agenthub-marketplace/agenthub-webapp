import Link from 'next/link';
import { notFound } from 'next/navigation';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import WorkspaceRunActions from '@/components/workspace/WorkspaceRunActions';
import DocumentWorkspaceActions from '@/components/workspace/DocumentWorkspaceActions';
import WorkflowWorkspaceActions from '@/components/workspace/WorkflowWorkspaceActions';
import CreatorEndpointWorkspaceActions from '@/components/workspace/CreatorEndpointWorkspaceActions';
import WorkspaceAgentExperience from '@/components/workspace/WorkspaceAgentExperience';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { formatCreditsFromCents } from '@/lib/format-credits';
import { getWorkspaceActionLabels } from '@/lib/workspace-actions';
import { buildWorkspaceRuntimeContract } from '@/server/agents/workspace-runtime-contract';
import { getUserRentalById } from '@/server/rentals/user-rentals';
import { getUserAgentRuns } from '@/server/llm/runs';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { submitRentalReviewAction } from '@/server/reviews/actions';
import { ArrowLeft, Check, Clock, Coins, ShieldCheck, Star } from 'lucide-react';

const WORKSPACE_MODE_LABELS = {
  instant: 'Accès immédiat',
  guided: 'Workspace guidé',
  document_required: 'Préparation document',
};

const SETUP_REQUIREMENT_LABELS = {
  none: 'Aucun setup requis',
  context: 'Contexte à préparer',
  document: 'Document à préparer',
};

function optionLabel(labels, value) {
  return labels[value] ?? value;
}

function formatPrice(cents) {
  return formatCreditsFromCents(cents);
}

function unavailableCopy(rental) {
  if (rental.agent?.status === 'suspended' || rental.agent?.status === 'archived') {
    return {
      eyebrow: rental.agent?.status === 'archived' ? 'AGENT ARCHIVÉ' : 'AGENT SUSPENDU',
      title: rental.agent?.status === 'archived' ? 'Agent archivé' : 'Agent suspendu',
      message:
        'Cet agent a été retiré par AgentHub. Votre workspace reste fermé tant que la vérification n’est pas terminée.',
    };
  }

  const byStatus = {
    cancelled: {
      eyebrow: 'ACCÈS ANNULÉ',
      title: 'Accès annulé',
      message: 'Cette activation a été annulée. Vous pouvez choisir un autre agent approuvé depuis la marketplace.',
    },
    rejected: {
      eyebrow: 'ACCÈS BLOQUÉ',
      title: 'Accès bloqué',
      message: 'Cet accès ne peut pas être ouvert. Contactez AgentHub si vous pensez que cette décision est incorrecte.',
    },
    stopped: {
      eyebrow: 'ACCÈS ARRÊTÉ',
      title: 'Accès arrêté',
      message: 'Vous avez arrêté cet accès. Vous pouvez relouer cet agent depuis sa fiche si elle est disponible.',
    },
    expired: {
      eyebrow: 'ACCÈS EXPIRÉ',
      title: 'Accès expiré',
      message: 'Cet accès est expiré. Vous pouvez relouer cet agent depuis sa fiche si elle est disponible.',
    },
    pending: {
      eyebrow: 'ACCÈS EN ATTENTE',
      title: 'Accès en attente',
      message: 'Cet accès n’est pas encore actif. Revenez ici lorsque l’activation sera terminée.',
    },
  };

  return (
    byStatus[rental.status] ?? {
      eyebrow: 'ESPACE AGENT',
      title: 'Accès indisponible',
      message: 'Cet accès n’est pas actif ou l’agent associé n’est plus publié. Retrouvez vos autres agents depuis votre espace.',
    }
  );
}

function WorkspaceUnavailable({ eyebrow = 'ESPACE AGENT', message, profile, title }) {
  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
          <p className="font-label mb-3 text-xs text-[#F59E0B]">{eyebrow}</p>
          <h1 className="font-display mb-3 text-3xl font-bold text-[#F4EFFA]">{title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#C8B1E4]">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/agenthub/workspace">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">Mes agents</Button>
            </Link>
            <Link href="/agenthub/search">
              <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                Découvrir les agents
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function WorkspaceRentalPage({ params, searchParams }) {
  const { rentalId } = await params;
  const query = searchParams ? await searchParams : {};
  const profile = await requireAuth('fr', `/agenthub/workspace/${rentalId}`);
  const { rental, error } = await getUserRentalById(profile.id, rentalId);

  if (error) {
    return (
      <WorkspaceUnavailable
        profile={profile}
        title="Impossible de charger cet accès"
        message="L’accès a bien pu être créé, mais les données du workspace sont temporairement indisponibles. Réessayez dans quelques secondes."
      />
    );
  }

  if (!rental) {
    notFound();
  }

  if (!rental.accessOpen) {
    const state = unavailableCopy(rental);

    return (
      <WorkspaceUnavailable
        profile={profile}
        eyebrow={state.eyebrow}
        title={state.title}
        message={state.message}
      />
    );
  }

  const accessCreated = query?.access === 'created';
  const reviewSubmitted = query?.reviewSubmitted === rental.id;
  const reviewError = typeof query?.reviewError === 'string' ? query.reviewError : null;
  const requestedTab = typeof query?.tab === 'string' ? query.tab : 'overview';
  const activeTab = ['overview', 'setup', 'use', 'details', 'review'].includes(requestedTab) ? requestedTab : 'overview';
  const contract = rental.agent.contract;
  const accessLabel = optionLabel(WORKSPACE_MODE_LABELS, contract.workspaceMode) || 'Accès immédiat';
  const setupLabel = optionLabel(SETUP_REQUIREMENT_LABELS, contract.setupRequirements.type);
  const actions = getWorkspaceActionLabels({
    locale: 'fr',
    templateActions: rental.agent?.workspaceActions ?? [],
    templateActionsEn: rental.agent?.workspaceActionsEn ?? [],
    workspaceMode: contract.workspaceMode,
  });
  const { runs: agentRuns } = await getUserAgentRuns(profile.id, rental.id);
  const runtimeContract = await buildWorkspaceRuntimeContract({
    actions,
    agentRuns,
    locale: 'fr',
    rental,
  });
  const reviewAction = submitRentalReviewAction.bind(null, 'fr');
  const stopAction = stopAgentAccessAction.bind(null, 'fr');
  const runnerSlot = runtimeContract.runner.kind === 'creator_endpoint' ? (
    <CreatorEndpointWorkspaceActions
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="fr"
      maxInputChars={runtimeContract.limits.maxInputChars}
      nextActions={runtimeContract.workspaceRecipe?.nextActions ?? []}
      readiness={runtimeContract.workspaceRecipe?.readiness ?? null}
      rentalId={rental.id}
    />
  ) : runtimeContract.runner.kind === 'workflow' ? (
    <WorkflowWorkspaceActions
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="fr"
      maxInputChars={runtimeContract.limits.maxInputChars}
      nextActions={runtimeContract.workspaceRecipe?.nextActions ?? []}
      readiness={runtimeContract.workspaceRecipe?.readiness ?? null}
      rentalId={rental.id}
    />
  ) : runtimeContract.runner.kind === 'document' ? (
    <DocumentWorkspaceActions
      actions={runtimeContract.actions}
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="fr"
      maxFileBytes={runtimeContract.limits.maxFileBytes}
      maxInputChars={runtimeContract.limits.maxInputChars}
      nextActions={runtimeContract.workspaceRecipe?.nextActions ?? []}
      readiness={runtimeContract.workspaceRecipe?.readiness ?? null}
      rentalId={rental.id}
    />
  ) : (
    <WorkspaceRunActions
      actions={runtimeContract.actions}
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="fr"
      maxInputChars={runtimeContract.limits.maxInputChars}
      nextActions={runtimeContract.workspaceRecipe?.nextActions ?? []}
      readiness={runtimeContract.workspaceRecipe?.readiness ?? null}
      rentalId={rental.id}
    />
  );
  const reviewSlot = (
    <>
      {reviewSubmitted && (
        <div className="mb-4 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
          Votre avis vérifié a été publié.
        </div>
      )}
      {reviewError && (
        <div className="mb-4 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
          Impossible de publier cet avis pour le moment.
        </div>
      )}
      {rental.review ? (
        <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-4">
          <div className="mb-2 flex gap-1 text-[#F59E0B]">
            {Array.from({ length: rental.review.rating }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
          </div>
          {rental.review.title && <p className="font-display font-bold text-[#F4EFFA]">{rental.review.title}</p>}
          {rental.review.body && <p className="mt-2 text-sm text-[#C8B1E4]">{rental.review.body}</p>}
        </div>
      ) : (
        <form action={reviewAction} className="space-y-3">
          <input type="hidden" name="rental_id" value={rental.id} />
          <input type="hidden" name="return_to" value={`/agenthub/workspace/${rental.id}?tab=review`} />
          <select name="rating" required className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none focus:border-[#7C3AED]">
            <option value="">Note</option>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Très bon</option>
            <option value="3">3 - Correct</option>
            <option value="2">2 - À améliorer</option>
            <option value="1">1 - Insatisfaisant</option>
          </select>
          <input name="title" placeholder="Titre court" className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]" />
          <textarea name="body" required minLength={5} rows={4} placeholder="Votre retour après utilisation..." className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]" />
          <Button type="submit" className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
            Publier l’avis
          </Button>
        </form>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <main className="container py-8">
        <Link href="/agenthub/workspace" className="mb-8 inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA]">
          <ArrowLeft className="h-4 w-4" />
          Retour à mes agents
        </Link>

        {accessCreated && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7] sm:flex-row sm:items-center sm:justify-between">
            <p>Votre accès est activé. Vous pouvez retrouver cet agent depuis “Mes agents”.</p>
            <Link
              href={`/agenthub/workspace/${rental.id}?tab=use`}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#10B981] px-4 text-sm font-bold text-[#07130F] transition-colors hover:bg-[#34D399]"
            >
              Utiliser maintenant
            </Link>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="self-start rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-5">
            <div className="flex items-center gap-4">
              <AgentAvatar index={rental.agent?.gradient ?? 0} size="md" />
              <div className="min-w-0">
                <p className="font-label mb-1 text-xs text-[#10B981]">Accès actif</p>
                <h2 className="font-display text-xl font-bold leading-tight text-[#F4EFFA]">
                  {rental.agent?.name ?? 'AgentHub agent'}
                </h2>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-[#C8B1E4]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#10B981]" />
                {accessLabel}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9B72CF]" />
                Activé le {new Date(rental.createdAt).toLocaleDateString('fr-FR')}
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#9B72CF]" />
                {formatPrice(rental.priceCents, rental.currency)}
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                Statut : {rental.status === 'active' ? 'actif' : rental.status}
              </div>
            </div>
            {rental.agent?.slug && (
              <Link href={`/agenthub/agents/${rental.agent.slug}`} className="mt-6 block">
                <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                  Voir la fiche agent
                </Button>
              </Link>
            )}
            <form action={stopAction} className="mt-3">
              <input type="hidden" name="rental_id" value={rental.id} />
              <Button
                type="submit"
                variant="outline"
                className="w-full border-[#EF4444]/45 bg-transparent text-[#FCA5A5] hover:bg-[#2A0D18]"
              >
                Arrêter l’accès
              </Button>
            </form>
          </aside>

          <WorkspaceAgentExperience
            activeTab={activeTab}
            accessLabel={accessLabel}
            agent={rental.agent}
            baseHref={`/agenthub/workspace/${rental.id}`}
            contract={contract}
            reviewSlot={reviewSlot}
            runnerSlot={runnerSlot}
            setupLabel={setupLabel}
            workspaceManifest={runtimeContract.workspaceManifest}
            workspaceRecipe={runtimeContract.workspaceRecipe}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
