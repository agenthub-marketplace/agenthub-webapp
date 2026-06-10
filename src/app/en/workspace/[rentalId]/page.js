import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import WorkspaceRunActions from '@/components/workspace/WorkspaceRunActions';
import DocumentWorkspaceActions from '@/components/workspace/DocumentWorkspaceActions';
import WorkflowWorkspaceActions from '@/components/workspace/WorkflowWorkspaceActions';
import CreatorEndpointWorkspaceActions from '@/components/workspace/CreatorEndpointWorkspaceActions';
import WorkspaceAgentExperience from '@/components/workspace/WorkspaceAgentExperience';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { getWorkspaceActionLabels } from '@/lib/workspace-actions';
import { buildWorkspaceRuntimeContract } from '@/server/agents/workspace-runtime-contract';
import { getUserRentalById } from '@/server/rentals/user-rentals';
import { getUserAgentRuns } from '@/server/llm/runs';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { submitRentalReviewAction } from '@/server/reviews/actions';
import { ArrowLeft, Check, Clock, Euro, ShieldCheck, Star } from 'lucide-react';

const WORKSPACE_MODE_LABELS = {
  instant: 'Instant access',
  guided: 'Guided workspace',
  document_required: 'Document preparation',
};

const SETUP_REQUIREMENT_LABELS = {
  none: 'No setup required',
  context: 'Context to prepare',
  document: 'Document to prepare',
};

function optionLabel(labels, value) {
  return labels[value] ?? value;
}

function formatPrice(cents, currency = 'eur') {
  if (typeof cents !== 'number' || cents <= 0) {
    return 'Price not configured';
  }

  return new Intl.NumberFormat('en-US', {
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: 'currency',
  }).format(cents / 100);
}

function unavailableCopy(rental) {
  if (rental.agent?.status === 'suspended' || rental.agent?.status === 'archived') {
    return {
      eyebrow: rental.agent?.status === 'archived' ? 'AGENT ARCHIVED' : 'AGENT SUSPENDED',
      title: rental.agent?.status === 'archived' ? 'Agent archived' : 'Agent suspended',
      message:
        'This agent has been removed by AgentHub. Your workspace stays closed until the review is complete.',
    };
  }

  const byStatus = {
    cancelled: {
      eyebrow: 'ACCESS CANCELLED',
      title: 'Access cancelled',
      message: 'This activation was cancelled. You can choose another approved agent from the marketplace.',
    },
    rejected: {
      eyebrow: 'ACCESS BLOCKED',
      title: 'Access blocked',
      message: 'This access cannot be opened. Contact AgentHub if you think this decision is incorrect.',
    },
    stopped: {
      eyebrow: 'ACCESS STOPPED',
      title: 'Access stopped',
      message: 'You stopped this access. You can rent this agent again from its listing if it is available.',
    },
    expired: {
      eyebrow: 'ACCESS EXPIRED',
      title: 'Access expired',
      message: 'This access has expired. You can rent this agent again from its listing if it is available.',
    },
    pending: {
      eyebrow: 'ACCESS PENDING',
      title: 'Access pending',
      message: 'This access is not active yet. Come back here when activation is complete.',
    },
  };

  return (
    byStatus[rental.status] ?? {
      eyebrow: 'AGENT WORKSPACE',
      title: 'Access unavailable',
      message: 'This access is not active or the related agent is no longer published. You can find your other agents from your workspace.',
    }
  );
}

function WorkspaceUnavailable({ eyebrow = 'AGENT WORKSPACE', message, profile, title }) {
  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
          <p className="font-label mb-3 text-xs text-[#F59E0B]">{eyebrow}</p>
          <h1 className="font-display mb-3 text-3xl font-bold text-[#F4EFFA]">{title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#C8B1E4]">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/en/workspace">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">My agents</Button>
            </Link>
            <Link href="/en/search">
              <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                Browse agents
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
  const profile = await requireAuth('en', `/en/workspace/${rentalId}`);
  const { rental, error } = await getUserRentalById(profile.id, rentalId);

  if (error) {
    return (
      <WorkspaceUnavailable
        profile={profile}
        title="Unable to load this access"
        message="The access may have been created, but the workspace data is temporarily unavailable. Please try again in a few seconds."
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
  const contract = rental.agent.contract;
  const accessLabel = optionLabel(WORKSPACE_MODE_LABELS, contract.workspaceMode) || 'Instant access';
  const setupLabel = optionLabel(SETUP_REQUIREMENT_LABELS, contract.setupRequirements.type);
  const actions = getWorkspaceActionLabels({
    locale: 'en',
    templateActions: rental.agent?.workspaceActions ?? [],
    templateActionsEn: rental.agent?.workspaceActionsEn ?? [],
    workspaceMode: contract.workspaceMode,
  });
  const { runs: agentRuns } = await getUserAgentRuns(profile.id, rental.id);
  const runtimeContract = await buildWorkspaceRuntimeContract({
    actions,
    agentRuns,
    locale: 'en',
    rental,
  });
  const reviewAction = submitRentalReviewAction.bind(null, 'en');
  const stopAction = stopAgentAccessAction.bind(null, 'en');
  const requestedTab = typeof query?.tab === 'string' ? query.tab : 'overview';
  const activeTab = ['overview', 'setup', 'use', 'details', 'review'].includes(requestedTab) ? requestedTab : 'overview';
  const runnerSlot = runtimeContract.runner.kind === 'creator_endpoint' ? (
    <CreatorEndpointWorkspaceActions
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="en"
      maxInputChars={runtimeContract.limits.maxInputChars}
      rentalId={rental.id}
    />
  ) : runtimeContract.runner.kind === 'workflow' ? (
    <WorkflowWorkspaceActions
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="en"
      maxInputChars={runtimeContract.limits.maxInputChars}
      rentalId={rental.id}
    />
  ) : runtimeContract.runner.kind === 'document' ? (
    <DocumentWorkspaceActions
      actions={runtimeContract.actions}
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="en"
      maxFileBytes={runtimeContract.limits.maxFileBytes}
      maxInputChars={runtimeContract.limits.maxInputChars}
      rentalId={rental.id}
    />
  ) : (
    <WorkspaceRunActions
      actions={runtimeContract.actions}
      enabled={runtimeContract.enabled}
      disabledMessage={runtimeContract.runner.disabledMessage}
      initialRuns={runtimeContract.history}
      locale="en"
      maxInputChars={runtimeContract.limits.maxInputChars}
      rentalId={rental.id}
    />
  );
  const reviewSlot = (
    <>
      {reviewSubmitted && (
        <div className="mb-4 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
          Your verified review has been published.
        </div>
      )}
      {reviewError && (
        <div className="mb-4 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
          Unable to publish this review right now.
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
          <input type="hidden" name="return_to" value={`/en/workspace/${rental.id}?tab=review`} />
          <select name="rating" required className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none focus:border-[#7C3AED]">
            <option value="">Rating</option>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Very good</option>
            <option value="3">3 - Good</option>
            <option value="2">2 - Needs work</option>
            <option value="1">1 - Unsatisfied</option>
          </select>
          <input name="title" placeholder="Short title" className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]" />
          <textarea name="body" required minLength={5} rows={4} placeholder="Your feedback after using this agent..." className="w-full rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-2.5 text-sm text-[#F4EFFA] outline-none placeholder:text-[#6F5B8F] focus:border-[#7C3AED]" />
          <Button type="submit" className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
            Publish review
          </Button>
        </form>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-8">
        <Link href="/en/workspace" className="mb-8 inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA]">
          <ArrowLeft className="h-4 w-4" />
          Back to my agents
        </Link>

        {accessCreated && (
          <div className="mb-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            Your access is active. You can find this agent from your workspace.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
            <AgentAvatar index={0} size="xl" className="mb-5" />
            <p className="font-label mb-2 text-xs text-[#10B981]">Active access</p>
            <h1 className="font-display text-3xl font-bold text-[#F4EFFA]">
              {rental.agent?.name ?? 'AgentHub agent'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#C8B1E4]">{rental.agent?.summary}</p>
            <div className="mt-6 space-y-3 text-sm text-[#C8B1E4]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#10B981]" />
                {accessLabel}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9B72CF]" />
                Activated on {new Date(rental.createdAt).toLocaleDateString('en-US')}
              </div>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-[#9B72CF]" />
                {formatPrice(rental.priceCents, rental.currency)}
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                Status: {rental.status === 'active' ? 'active' : rental.status}
              </div>
            </div>
            {rental.agent?.slug && (
              <Link href={`/en/agents/${rental.agent.slug}`} className="mt-6 block">
                <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                  View agent listing
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
                Stop access
              </Button>
            </form>
          </aside>

          <WorkspaceAgentExperience
            activeTab={activeTab}
            accessLabel={accessLabel}
            agent={rental.agent}
            baseHref={`/en/workspace/${rental.id}`}
            contract={contract}
            locale="en"
            reviewSlot={reviewSlot}
            runnerSlot={runnerSlot}
            setupLabel={setupLabel}
            workspaceManifest={runtimeContract.workspaceManifest}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
