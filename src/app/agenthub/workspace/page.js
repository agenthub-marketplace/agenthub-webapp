import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { formatCreditsFromCents } from '@/lib/format-credits';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { getUserPaymentOrders, getUserRentals } from '@/server/rentals/user-rentals';
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock, Flame, History, ShieldAlert, Trophy } from 'lucide-react';

const WORKSPACE_MODE_LABELS = {
  instant: 'Accès immédiat',
  guided: 'Workspace guidé',
  document_required: 'Préparation document',
};

function statusLabel(status) {
  return {
    active: 'Actif',
    accepted: 'Actif',
    in_progress: 'Actif',
    delivered: 'Terminé',
    expired: 'Expiré',
    pending: 'En attente',
    rejected: 'Refusé',
    cancelled: 'Annulé',
    stopped: 'Arrêté',
  }[status] ?? status;
}

function formatPrice(cents) {
  return formatCreditsFromCents(cents);
}

function accessStopMessage(value) {
  return {
    stopped: { tone: 'success', text: 'L’accès a été arrêté. Vous pouvez relouer cet agent depuis sa fiche.' },
    error: { tone: 'error', text: 'Impossible d’arrêter cet accès pour le moment.' },
    invalid: { tone: 'error', text: 'Location invalide.' },
    'not-found': { tone: 'error', text: 'Location introuvable.' },
    'already-stopped': { tone: 'info', text: 'Cet accès est déjà arrêté.' },
  }[value] ?? null;
}

function unavailableRentalCopy(rental) {
  if (rental.agent?.status === 'suspended' || rental.agent?.status === 'archived') {
    return {
      label: rental.agent?.status === 'archived' ? 'Agent archivé' : 'Agent suspendu',
      text: 'Ce workspace est fermé pendant la vérification AgentHub.',
      tone: 'warning',
    };
  }

  const byStatus = {
    cancelled: { label: 'Accès annulé', text: 'Cette activation a été annulée.', tone: 'muted' },
    rejected: { label: 'Accès bloqué', text: 'Cet accès ne peut pas être ouvert.', tone: 'warning' },
    stopped: { label: 'Accès arrêté', text: 'Vous avez arrêté cet accès.', tone: 'muted' },
    expired: { label: 'Accès expiré', text: 'Cet accès est expiré.', tone: 'muted' },
    pending: { label: 'Activation en attente', text: 'L’accès n’est pas encore actif.', tone: 'warning' },
  };

  return byStatus[rental.status] ?? { label: 'Accès indisponible', text: 'Cet accès n’est pas ouvert.', tone: 'warning' };
}

function paymentStateCopy(payment) {
  if (payment.status === 'pending') {
    return {
      label: 'Paiement en attente',
      text: 'Un checkout est ouvert pour cet agent. Finalisez le paiement ou attendez son expiration.',
      tone: 'warning',
    };
  }

  if (payment.status === 'paid_blocked') {
    return {
      label: 'Activation bloquée',
      text: payment.activationError
        ? 'Paiement reçu, mais une vérification est nécessaire avant ouverture.'
        : 'Paiement reçu, mais l’accès n’a pas pu être ouvert automatiquement.',
      tone: 'warning',
    };
  }

  if (payment.status === 'cancelled') {
    return { label: 'Paiement annulé', text: 'Le checkout a été annulé avant activation.', tone: 'muted' };
  }

  return { label: 'Activation en attente', text: 'Paiement reçu, activation en cours de confirmation.', tone: 'warning' };
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

function workspaceAgentName(row, fallback = 'Agent AgentHub') {
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
      cta: 'Voir les accès à finaliser',
      detail: 'Une activation ou un accès demande une vérification. Traitez ce point avant de relancer un agent.',
      href: '#a-finaliser',
      label: 'Priorité sécurité',
      score: 35,
      title: 'Résoudre un accès bloqué',
      tone: 'warning',
    };
  }

  if (pendingPayment) {
    return {
      cta: 'Suivre l’activation',
      detail: 'Un paiement est encore en transition. Gardez cet état visible pour éviter de relouer en double.',
      href: '#a-finaliser',
      label: 'Priorité activation',
      score: 45,
      title: 'Attendre la confirmation checkout',
      tone: 'pending',
    };
  }

  if (activeWithoutRun) {
    return {
      cta: 'Ouvrir le workspace',
      detail: `${workspaceAgentName(activeWithoutRun)} est actif mais n’a pas encore de résultat stocké. Lancez une première exécution.`,
      href: `/agenthub/workspace/${activeWithoutRun.id}`,
      label: 'Priorité usage',
      score: 70,
      title: 'Lancer la première exécution',
      tone: 'active',
    };
  }

  if (activeWithRun) {
    return {
      cta: 'Continuer',
      detail: `${workspaceAgentName(activeWithRun)} a déjà un historique. Continuez avec un nouvel input ou laissez un avis si ce n’est pas fait.`,
      href: `/agenthub/workspace/${activeWithRun.id}`,
      label: 'Boucle active',
      score: 85,
      title: 'Continuer l’agent le plus prêt',
      tone: 'active',
    };
  }

  if (restartable) {
    return {
      cta: 'Relouer cet agent',
      detail: `${workspaceAgentName(restartable)} reste dans votre historique. Relancez-le sans rechercher dans toute la marketplace.`,
      href: `/agenthub/agents/${restartable.agent.slug}`,
      label: 'Reprise rapide',
      score: 55,
      title: 'Reprendre un agent déjà testé',
      tone: 'restart',
    };
  }

  return {
    cta: 'Découvrir les agents',
    detail: 'Choisissez un agent approuvé, activez-le, puis revenez ici pour suivre vos exécutions et avis.',
    href: '/agenthub/search',
    label: 'Démarrage',
    score: 15,
    title: 'Choisir un premier agent',
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
              {stats.active} actif{stats.active > 1 ? 's' : ''} · {stats.attention} à finaliser · {stats.history} historique{stats.history > 1 ? 's' : ''}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#F4EFFA] md:text-3xl">{priority.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D6C5E8]">{priority.detail}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              ['Accès actifs', stats.active],
              ['À finaliser', stats.attention],
              ['Agents déjà loués', stats.history],
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
            <p className="font-label text-xs text-[#B794F4]">Score workspace</p>
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
  const fallbackHref = stats.active > 0 ? '#agents-actifs' : stats.history > 0 ? '#historique' : '/agenthub/search';
  const links = [
    {
      detail: `${stats.active} accès ouvert${stats.active > 1 ? 's' : ''}`,
      href: stats.active > 0 ? '#agents-actifs' : '/agenthub/search',
      label: stats.active > 0 ? 'Reprendre' : 'Découvrir',
      title: 'Agents actifs',
    },
    {
      detail: `${stats.attention} élément${stats.attention > 1 ? 's' : ''} à vérifier`,
      href: stats.attention > 0 ? '#a-finaliser' : fallbackHref,
      label: stats.attention > 0 ? 'Surveiller' : 'OK',
      title: 'À finaliser',
    },
    {
      detail: `${stats.history} agent${stats.history > 1 ? 's' : ''} déjà loué${stats.history > 1 ? 's' : ''}`,
      href: stats.history > 0 ? '#historique' : '/agenthub/search',
      label: stats.history > 0 ? 'Relouer' : 'Explorer',
      title: 'Historique',
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
            Ouvrir
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </section>
  );
}

export default async function WorkspacePage({ searchParams }) {
  const profile = await requireAuth('fr', '/agenthub/workspace');
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
  const stopAction = stopAgentAccessAction.bind(null, 'fr');
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
          <p className="font-label mb-2 text-xs text-[#9B72CF]">Mes agents</p>
          <h1 className="font-display text-4xl font-bold text-[#F4EFFA] md:text-5xl">Vos agents accessibles</h1>
          <p className="mt-2 max-w-2xl text-[#C8B1E4]">
            Retrouvez ici les agents déjà activés sur votre compte beta.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
            Impossible de charger vos accès pour le moment.
          </div>
        )}

        {paymentOrdersError && (
          <div className="mb-6 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
            Les états de paiement sont temporairement indisponibles.
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
            <h2 className="font-display text-2xl font-bold text-[#F4EFFA]">Aucun agent actif</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#C8B1E4]">
              Louez un agent approuvé depuis la marketplace pour l’ouvrir ici.
            </p>
            <Link href="/agenthub/search" className="mt-6 inline-flex">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                Découvrir les agents
              </Button>
            </Link>
          </div>
        )}

        {!error && activeRentals.length > 0 && (
          <div id="agents-actifs" className="grid scroll-mt-24 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeRentals.map((rental, index) => (
              <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                <div className="mb-5 flex items-start gap-4">
                  <AgentAvatar index={index} size="md" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-xl font-bold text-[#F4EFFA]">
                      {rental.agent?.name ?? 'Agent AgentHub'}
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
                  {WORKSPACE_MODE_LABELS[rental.agent?.contract?.workspaceMode] || 'Accès immédiat'}
                </p>
                {rental.runSummary?.total > 0 && (
                  <div className="mb-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-2">
                      <p className="font-stat text-lg text-[#F4EFFA]">{rental.runSummary.total}</p>
                      <p className="font-label text-[10px] text-[#9B72CF]">exéc.</p>
                    </div>
                    <div className="rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-2">
                      <p className="font-stat text-lg text-[#6EE7B7]">{rental.runSummary.succeeded}</p>
                      <p className="font-label text-[10px] text-[#6EE7B7]">réussis</p>
                    </div>
                    <div className="rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-2">
                      <p className="font-stat text-lg text-[#F6C177]">{rental.review ? '1' : '0'}</p>
                      <p className="font-label text-[10px] text-[#F6C177]">avis</p>
                    </div>
                  </div>
                )}
                <Link href={`/agenthub/workspace/${rental.id}`}>
                  <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    Ouvrir l’agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {rental.hasSuccessfulRun && !rental.review && (
                  <Link href={`/agenthub/workspace/${rental.id}?tab=review`} className="mt-3 block">
                    <Button variant="outline" className="w-full border-[#F59E0B]/55 bg-[#F59E0B]/10 text-[#F6C177] hover:bg-[#2A1A0D]">
                      Laisser un avis vérifié
                    </Button>
                  </Link>
                )}
                {rental.review && (
                  <div className="mt-3 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-2 text-center text-xs font-semibold text-[#6EE7B7]">
                    Avis vérifié publié
                  </div>
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
              </article>
            ))}
          </div>
        )}

        {!error && (attentionRentals.length > 0 || paymentStateOrders.length > 0) && (
          <section id="a-finaliser" className="mt-8 scroll-mt-24">
            <div className="mb-4 flex items-center gap-2 text-[#F4EFFA]">
              <ShieldAlert className="h-5 w-5 text-[#F59E0B]" />
              <h2 className="font-display text-2xl font-bold">À finaliser</h2>
            </div>
            <p className="mb-4 max-w-2xl text-sm text-[#C8B1E4]">
              Ces éléments demandent une action ou une vérification avant de pouvoir ouvrir l’agent.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {attentionRentals.map((rental) => {
                const state = unavailableRentalCopy(rental);

                return (
                  <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">
                          {rental.agent?.name ?? 'Agent AgentHub'}
                        </h3>
                        <p className="mt-1 text-sm text-[#C8B1E4]">{state.text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1 text-xs font-label text-[#F6C177]">
                        {state.label}
                      </span>
                    </div>
                    {rental.agent?.slug && (
                      <Link href={`/agenthub/agents/${rental.agent.slug}`}>
                        <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                          Voir la fiche agent
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
                          {payment.agent?.name ?? 'Agent AgentHub'}
                        </h3>
                        <p className="mt-1 text-sm text-[#C8B1E4]">{state.text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1 text-xs font-label text-[#F6C177]">
                        {state.label}
                      </span>
                    </div>
                    {payment.status === 'paid' && payment.checkoutSessionId ? (
                      <Link href={`/checkout/success?session_id=${encodeURIComponent(payment.checkoutSessionId)}`}>
                        <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                          Vérifier l’activation
                        </Button>
                      </Link>
                    ) : payment.agent?.slug ? (
                      <Link href={`/agenthub/agents/${payment.agent.slug}`}>
                        <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                          Voir la fiche agent
                        </Button>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-sm text-[#F6C177]">
                        <AlertTriangle className="h-4 w-4" />
                        Support AgentHub requis
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!error && uniqueHistoryRentals.length > 0 && (
          <section id="historique" className="mt-8 scroll-mt-24">
            <div className="mb-4 flex items-center gap-2 text-[#F4EFFA]">
              <History className="h-5 w-5 text-[#9B72CF]" />
              <h2 className="font-display text-2xl font-bold">Historique des agents loués</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {uniqueHistoryRentals.map((rental) => {
                const state = unavailableRentalCopy(rental);

                return (
                  <article key={rental.id} className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F4EFFA]">
                          {rental.agent?.name ?? 'Agent AgentHub'}
                        </h3>
                        <p className="mt-1 text-sm text-[#C8B1E4]">{state.text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1 text-xs font-label text-[#F6C177]">
                        {state.label}
                      </span>
                    </div>
                    {rental.agent?.slug && (
                      <Link href={`/agenthub/agents/${rental.agent.slug}`}>
                        <Button variant="outline" className="w-full border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F]">
                          Voir la fiche agent
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
