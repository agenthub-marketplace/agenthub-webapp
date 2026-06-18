import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { getUserPaymentOrders, getUserRentals } from '@/server/rentals/user-rentals';
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock, Flame, History, ShieldAlert, Trophy } from 'lucide-react';

const WORKSPACE_MODE_LABELS = {
  instant: 'Instant access',
  guided: 'Guided workspace',
  document_required: 'Document preparation',
};

function statusLabel(status) {
  return {
    active: 'Active',
    accepted: 'Active',
    in_progress: 'Active',
    delivered: 'Completed',
    expired: 'Expired',
    pending: 'Pending',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    stopped: 'Stopped',
  }[status] ?? status;
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

function accessStopMessage(value) {
  return {
    stopped: { tone: 'success', text: 'Access has been stopped. You can rent this agent again from its listing.' },
    error: { tone: 'error', text: 'Unable to stop this access right now.' },
    invalid: { tone: 'error', text: 'Invalid rental.' },
    'not-found': { tone: 'error', text: 'Rental not found.' },
    'already-stopped': { tone: 'info', text: 'This access is already stopped.' },
  }[value] ?? null;
}

function unavailableRentalCopy(rental) {
  if (rental.agent?.status === 'suspended' || rental.agent?.status === 'archived') {
    return {
      label: rental.agent?.status === 'archived' ? 'Agent archived' : 'Agent suspended',
      text: 'This workspace is closed during AgentHub review.',
      tone: 'warning',
    };
  }

  const byStatus = {
    cancelled: { label: 'Access cancelled', text: 'This activation was cancelled.', tone: 'muted' },
    rejected: { label: 'Access blocked', text: 'This access cannot be opened.', tone: 'warning' },
    stopped: { label: 'Access stopped', text: 'You stopped this access.', tone: 'muted' },
    expired: { label: 'Access expired', text: 'This access has expired.', tone: 'muted' },
    pending: { label: 'Activation pending', text: 'Access is not active yet.', tone: 'warning' },
  };

  return byStatus[rental.status] ?? { label: 'Access unavailable', text: 'This access is not open.', tone: 'warning' };
}

function paymentStateCopy(payment) {
  if (payment.status === 'pending') {
    return {
      label: 'Payment pending',
      text: 'A checkout is open for this agent. Complete payment or wait for it to expire.',
      tone: 'warning',
    };
  }

  if (payment.status === 'paid_blocked') {
    return {
      label: 'Activation blocked',
      text: payment.activationError
        ? 'Payment was received, but a manual check is required before opening access.'
        : 'Payment was received, but access could not open automatically.',
      tone: 'warning',
    };
  }

  if (payment.status === 'cancelled') {
    return { label: 'Payment cancelled', text: 'Checkout was cancelled before activation.', tone: 'muted' };
  }

  return { label: 'Activation pending', text: 'Payment received, activation is still being confirmed.', tone: 'warning' };
}

function dedupeHistoryByAgent(rentals) {
  const byAgent = new Map();

  rentals.forEach((rental) => {
    const key = rental.agent?.slug || rental.agent?.name || rental.agent?.id || rental.id;
    const current = byAgent.get(key);

    if (!current || new Date(rental.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      byAgent.set(key, rental);
    }
  });

  return [...byAgent.values()];
}

function workspaceAgentName(row, fallback = 'AgentHub agent') {
  return row?.agent?.name ?? fallback;
}

function buildWorkspacePriority({ activeRentals, attentionRentals, paymentStateOrders, uniqueHistoryRentals }) {
  const activeWithoutRun = activeRentals.find((rental) => !rental.hasSuccessfulRun);
  const activeWithRun = activeRentals.find((rental) => rental.hasSuccessfulRun) ?? activeRentals[0];
  const restartable = uniqueHistoryRentals.find((rental) => rental.agent?.slug);
  const blockedPayment = paymentStateOrders.find((payment) => payment.status === 'paid_blocked');
  const pendingPayment = paymentStateOrders.find((payment) => payment.status === 'pending' || (payment.status === 'paid' && !payment.rentalRequestId));

  if (blockedPayment || attentionRentals.length > 0) {
    return {
      cta: 'Review items to finalize',
      detail: 'An activation or access needs review. Resolve this before running another agent.',
      href: '#to-finalize',
      label: 'Security priority',
      score: 35,
      title: 'Resolve blocked access',
      tone: 'warning',
    };
  }

  if (pendingPayment) {
    return {
      cta: 'Track activation',
      detail: 'A payment is still transitioning. Keep this state visible to avoid renting twice.',
      href: '#to-finalize',
      label: 'Activation priority',
      score: 45,
      title: 'Wait for checkout confirmation',
      tone: 'pending',
    };
  }

  if (activeWithoutRun) {
    return {
      cta: 'Open workspace',
      detail: `${workspaceAgentName(activeWithoutRun)} is active but has no stored result yet. Run it once first.`,
      href: `/en/workspace/${activeWithoutRun.id}`,
      label: 'Usage priority',
      score: 70,
      title: 'Complete the first run',
      tone: 'active',
    };
  }

  if (activeWithRun) {
    return {
      cta: 'Continue',
      detail: `${workspaceAgentName(activeWithRun)} already has history. Continue with a new input or leave a review if needed.`,
      href: `/en/workspace/${activeWithRun.id}`,
      label: 'Active loop',
      score: 85,
      title: 'Continue the readiest agent',
      tone: 'active',
    };
  }

  if (restartable) {
    return {
      cta: 'Rent this agent again',
      detail: `${workspaceAgentName(restartable)} stays in your history. Restart it without searching the whole marketplace.`,
      href: `/en/agents/${restartable.agent.slug}`,
      label: 'Fast restart',
      score: 55,
      title: 'Resume a previously tested agent',
      tone: 'restart',
    };
  }

  return {
    cta: 'Discover agents',
    detail: 'Choose one approved agent, activate it, then come back here to track runs and reviews.',
    href: '/en/search',
    label: 'Getting started',
    score: 15,
    title: 'Choose your first agent',
    tone: 'start',
  };
}

function WorkspacePriorityPanel({ priority, stats }) {
  const toneClass = {
    active: 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]',
    pending: 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F6C177]',
    restart: 'border-[#38BDF8]/35 bg-[#0EA5E9]/10 text-[#7DD3FC]',
    start: 'border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#D8B4FE]',
    warning: 'border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]',
  }[priority.tone] ?? 'border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#D8B4FE]';

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-[#6B3FA0]/45 bg-[radial-gradient(circle_at_top_left,#35215B_0%,#110D24_46%,#07050F_100%)] p-5 shadow-[0_18px_60px_rgba(11,7,28,0.36)]">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
              <Flame className="h-3.5 w-3.5" />
              {priority.label}
            </span>
            <span className="inline-flex rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-1.5 text-xs font-semibold text-[#6EE7B7]">
              {stats.active} active · {stats.attention} to finalize · {stats.history} in history
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#F4EFFA] md:text-3xl">{priority.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D6C5E8]">{priority.detail}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              ['Active access', stats.active],
              ['To finalize', stats.attention],
              ['Rented before', stats.history],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#2F184B] bg-[#0A0816] p-3">
                <p className="font-label text-[10px] text-[#9B72CF]">{label}</p>
                <p className="mt-1 flex items-center gap-2 text-lg font-bold text-[#F4EFFA]">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#8B5CF6]/35 bg-[#0F0A1E] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-label text-xs text-[#B794F4]">Workspace score</p>
            <Trophy className="h-5 w-5 text-[#C4B5FD]" />
          </div>
          <p className="font-stat text-5xl text-[#F4EFFA]">{priority.score}%</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#251A40]">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${priority.score}%` }} />
          </div>
          <Link href={priority.href}>
            <Button className="mt-5 h-11 w-full border-0 bg-white text-[#110D24] hover:bg-[#F2E9D8]">
              {priority.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function WorkspaceQuickLinks({ stats }) {
  const fallbackHref = stats.active > 0 ? '#active-agents' : stats.history > 0 ? '#history' : '/en/search';
  const links = [
    {
      detail: `${stats.active} open access${stats.active > 1 ? 'es' : ''}`,
      href: stats.active > 0 ? '#active-agents' : '/en/search',
      label: stats.active > 0 ? 'Resume' : 'Discover',
      title: 'Active agents',
    },
    {
      detail: `${stats.attention} item${stats.attention > 1 ? 's' : ''} to check`,
      href: stats.attention > 0 ? '#to-finalize' : fallbackHref,
      label: stats.attention > 0 ? 'Watch' : 'OK',
      title: 'To finalize',
    },
    {
      detail: `${stats.history} previously rented agent${stats.history > 1 ? 's' : ''}`,
      href: stats.history > 0 ? '#history' : '/en/search',
      label: stats.history > 0 ? 'Rent again' : 'Explore',
      title: 'History',
    },
  ];

  return (
    <section className="mb-8 grid gap-3 md:grid-cols-3">
      {links.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className="group rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-4 transition-colors hover:border-[#8B5CF6] hover:bg-[#15112A]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-bold text-[#F4EFFA]">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#9B72CF]">{item.detail}</p>
            </div>
            <span className="rounded-full border border-[#6B3FA0]/45 bg-[#1A152F] px-2.5 py-1 text-[10px] font-label text-[#D8B4FE]">
              {item.label}
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#C8B1E4] group-hover:text-white">
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </section>
  );
}

export default async function WorkspacePage({ searchParams }) {
  const profile = await requireAuth('en', '/en/workspace');
  const query = searchParams ? await searchParams : {};
  const [{ rentals, error }, { payments: paymentOrders, error: paymentOrdersError }] = await Promise.all([
    getUserRentals(profile.id),
    getUserPaymentOrders(profile.id),
  ]);
  const activeRentals = rentals.filter((rental) => rental.accessOpen);
  const historyRentals = rentals.filter(
    (rental) => !rental.accessOpen && ['stopped', 'expired', 'delivered', 'cancelled'].includes(rental.status),
  );
  const uniqueHistoryRentals = dedupeHistoryByAgent(historyRentals);
  const attentionRentals = rentals.filter(
    (rental) => !rental.accessOpen && !['stopped', 'expired', 'delivered', 'cancelled'].includes(rental.status),
  );
  const paymentStateOrders = paymentOrders.filter(
    (payment) =>
      payment.status === 'pending' ||
      payment.status === 'paid_blocked' ||
      payment.status === 'cancelled' ||
      (payment.status === 'paid' && !payment.rentalRequestId),
  );
  const stopMessage = accessStopMessage(typeof query?.accessStop === 'string' ? query.accessStop : null);
  const stopAction = stopAgentAccessAction.bind(null, 'en');
  const workspacePriority = buildWorkspacePriority({
    activeRentals,
    attentionRentals,
    paymentStateOrders,
    uniqueHistoryRentals,
  });
  const workspaceStats = {
    active: activeRentals.length,
    attention: attentionRentals.length + paymentStateOrders.length,
    history: uniqueHistoryRentals.length,
  };

  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      <main className="container py-10">
        <div className="mb-8">
          <p className="font-label mb-2 text-xs text-[#9B72CF]">My agents</p>
          <h1 className="font-display text-4xl font-bold text-[#F4EFFA] md:text-5xl">Your accessible agents</h1>
          <p className="mt-2 max-w-2xl text-[#C8B1E4]">
            Find every beta agent currently active on your account.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
            Could not load your access records right now.
          </div>
        )}

        {paymentOrdersError && (
          <div className="mb-6 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
            Payment states are temporarily unavailable.
          </div>
        )}

        {stopMessage && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              stopMessage.tone === 'error'
                ? 'border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]'
                : 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]'
            }`}
          >
            {stopMessage.text}
          </div>
        )}

        {!error && <WorkspacePriorityPanel priority={workspacePriority} stats={workspaceStats} />}
        {!error && <WorkspaceQuickLinks stats={workspaceStats} />}

        {!error && activeRentals.length === 0 && attentionRentals.length === 0 && paymentStateOrders.length === 0 && (
          <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
              <Bot className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#F4EFFA]">No active agent</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#C8B1E4]">
              Rent an approved agent from the marketplace to open it here.
            </p>
            <Link href="/en/search" className="mt-6 inline-flex">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                Discover agents
              </Button>
            </Link>
          </div>
        )}

        {!error && activeRentals.length > 0 && (
          <div id="active-agents" className="grid scroll-mt-24 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeRentals.map((rental, index) => (
              <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                <div className="mb-5 flex items-start gap-4">
                  <AgentAvatar index={index} size="md" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-xl font-bold text-[#F4EFFA]">
                      {rental.agent?.name ?? 'AgentHub agent'}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-[#C8B1E4]">{rental.agent?.summary}</p>
                  </div>
                </div>
                <div className="mb-5 flex items-center justify-between text-sm">
                  <span className="rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-1 text-xs font-label text-[#6EE7B7]">
                    {statusLabel(rental.status)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#9B72CF]">
                    <Clock className="h-3.5 w-3.5" />
                    {formatPrice(rental.priceCents, rental.currency)}
                  </span>
                </div>
                <p className="mb-5 text-xs text-[#9B72CF]">
                  {WORKSPACE_MODE_LABELS[rental.agent?.contract?.workspaceMode] || 'Instant access'}
                </p>
                {rental.runSummary?.total > 0 && (
                  <div className="mb-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-2">
                      <p className="font-stat text-lg text-[#F4EFFA]">{rental.runSummary.total}</p>
                      <p className="font-label text-[10px] text-[#9B72CF]">runs</p>
                    </div>
                    <div className="rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-2">
                      <p className="font-stat text-lg text-[#6EE7B7]">{rental.runSummary.succeeded}</p>
                      <p className="font-label text-[10px] text-[#6EE7B7]">succeeded</p>
                    </div>
                    <div className="rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-2">
                      <p className="font-stat text-lg text-[#F6C177]">{rental.review ? '1' : '0'}</p>
                      <p className="font-label text-[10px] text-[#F6C177]">review</p>
                    </div>
                  </div>
                )}
                <Link href={`/en/workspace/${rental.id}`}>
                  <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    Open agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {rental.hasSuccessfulRun && !rental.review && (
                  <Link href={`/en/workspace/${rental.id}?tab=review`} className="mt-3 block">
                    <Button variant="outline" className="w-full border-[#F59E0B]/55 bg-[#F59E0B]/10 text-[#F6C177] hover:bg-[#2A1A0D]">
                      Leave verified review
                    </Button>
                  </Link>
                )}
                {rental.review && (
                  <div className="mt-3 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-2 text-center text-xs font-semibold text-[#6EE7B7]">
                    Verified review published
                  </div>
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
              </article>
            ))}
          </div>
        )}

        {!error && (attentionRentals.length > 0 || paymentStateOrders.length > 0) && (
          <section id="to-finalize" className="mt-8 scroll-mt-24">
            <div className="mb-4 flex items-center gap-2 text-[#F4EFFA]">
              <ShieldAlert className="h-5 w-5 text-[#F59E0B]" />
              <h2 className="font-display text-2xl font-bold">To finalize</h2>
            </div>
            <p className="mb-4 max-w-2xl text-sm text-[#C8B1E4]">
              These items need an action or a verification before the agent can be opened.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {attentionRentals.map((rental) => {
                const state = unavailableRentalCopy(rental);

                return (
                  <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">
                          {rental.agent?.name ?? 'AgentHub agent'}
                        </h3>
                        <p className="mt-1 text-sm text-[#C8B1E4]">{state.text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1 text-xs font-label text-[#F6C177]">
                        {state.label}
                      </span>
                    </div>
                    {rental.agent?.slug && (
                      <Link href={`/en/agents/${rental.agent.slug}`}>
                        <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                          View agent listing
                        </Button>
                      </Link>
                    )}
                  </article>
                );
              })}
              {paymentStateOrders.map((payment) => {
                const state = paymentStateCopy(payment);

                return (
                  <article key={payment.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">
                          {payment.agent?.name ?? 'AgentHub agent'}
                        </h3>
                        <p className="mt-1 text-sm text-[#C8B1E4]">{state.text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1 text-xs font-label text-[#F6C177]">
                        {state.label}
                      </span>
                    </div>
                    {payment.status === 'paid' && payment.checkoutSessionId ? (
                      <Link href={`/en/checkout/success?session_id=${encodeURIComponent(payment.checkoutSessionId)}`}>
                        <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                          Check activation
                        </Button>
                      </Link>
                    ) : payment.agent?.slug ? (
                      <Link href={`/en/agents/${payment.agent.slug}`}>
                        <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                          View agent listing
                        </Button>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-sm text-[#F6C177]">
                        <AlertTriangle className="h-4 w-4" />
                        AgentHub support required
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!error && uniqueHistoryRentals.length > 0 && (
          <section id="history" className="mt-8 scroll-mt-24">
            <div className="mb-4 flex items-center gap-2 text-[#F4EFFA]">
              <History className="h-5 w-5 text-[#9B72CF]" />
              <h2 className="font-display text-2xl font-bold">Rented agent history</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {uniqueHistoryRentals.map((rental) => {
                const state = unavailableRentalCopy(rental);

                return (
                  <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">
                          {rental.agent?.name ?? 'AgentHub agent'}
                        </h3>
                        <p className="mt-1 text-sm text-[#C8B1E4]">{state.text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1 text-xs font-label text-[#F6C177]">
                        {state.label}
                      </span>
                    </div>
                    {rental.agent?.slug && (
                      <Link href={`/en/agents/${rental.agent.slug}`}>
                        <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                          View agent listing
                        </Button>
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
