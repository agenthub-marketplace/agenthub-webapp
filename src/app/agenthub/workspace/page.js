import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { formatCreditsFromCents } from '@/lib/format-credits';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { getUserPaymentOrders, getUserRentals } from '@/server/rentals/user-rentals';
import { AlertTriangle, ArrowRight, Bot, Clock, History, ShieldAlert } from 'lucide-react';

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
  if (rental.agent?.status === 'suspended') {
    return {
      label: 'Agent suspendu',
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
    (payment) => payment.status === 'paid_blocked' || payment.status === 'cancelled' || (payment.status === 'paid' && !payment.rentalRequestId),
  );
  const stopMessage = accessStopMessage(typeof query?.accessStop === 'string' ? query.accessStop : null);
  const stopAction = stopAgentAccessAction.bind(null, 'fr');

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

        {!error && activeRentals.length === 0 && (
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  {WORKSPACE_MODE_LABELS[rental.agent?.contract?.workspaceMode] || 'Accès immédiat'}
                </p>
                <Link href={`/agenthub/workspace/${rental.id}`}>
                  <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    Ouvrir l’agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
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

        {!error && uniqueHistoryRentals.length > 0 && (
          <section className="mt-8">
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
                          {rental.agent?.name ?? 'AgentHub agent'}
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

        {!error && (attentionRentals.length > 0 || paymentStateOrders.length > 0) && (
          <section className="mt-8">
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
                          {rental.agent?.name ?? 'AgentHub agent'}
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
                          {payment.agent?.name ?? 'AgentHub agent'}
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
      </main>
      <Footer />
    </div>
  );
}
