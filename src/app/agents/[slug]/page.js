import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { getCurrentProfile } from '@/lib/auth/session';
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

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatOrderPrice(cents, currency = 'eur') {
  if (typeof cents !== 'number' || cents <= 0) {
    return 'Prix non renseigné';
  }

  return new Intl.NumberFormat('fr-FR', {
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: 'currency',
  }).format(cents / 100);
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
  'rental-create-failed': 'Impossible d’activer cet accès beta pour le moment.',
  'price-not-configured': 'Cet agent doit avoir un prix fixe avant d’être loué.',
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

export default async function Page({ params, searchParams }) {
  const { slug } = await params;
  const { agent, error } = await getMarketplaceAgentBySlug(slug);
  const query = searchParams ? await searchParams : {};
  const rentalError = typeof query?.error === 'string' ? query.error : null;
  const orderMessage = typeof query?.order === 'string' ? orderMessages[query.order] : null;
  const paymentCancelled = query?.payment === 'cancelled';
  const profile = await getCurrentProfile();

  if (!agent) {
    return (
      <div className="min-h-screen">
        <Navbar profile={profile} />
        <main className="container py-20">
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-8">
            <ArrowLeft className="w-4 h-4" />
            Retour marketplace
          </Link>
          <div className="max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
            <p className="font-label text-xs text-[#F59E0B] mb-3">AGENT INTROUVABLE</p>
            <h1 className="font-display text-3xl font-bold mb-3">Cet agent n’est pas disponible.</h1>
            <p className="text-[#C8B1E4] mb-6">
              {error ? 'La marketplace est temporairement indisponible.' : 'Ce slug ne correspond à aucun agent approuvé dans Supabase.'}
            </p>
            <Link href="/marketplace">
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
  const setupLabel = WORKSPACE_MODE_LABELS[agent.contract.workspaceMode] || 'Accès immédiat';
  const { state: orderState } = profile ? await getUserAgentOrderState(profile.id, agent.id) : { state: null };
  const canStartOrder = hasPrice && (!orderState || orderState.kind === 'stopped_access');

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour marketplace
        </Link>

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
              <p className="text-[#C8B1E4] leading-relaxed">{agent.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <ListSection title="Ce que l’agent fait" items={agent.capabilities} icon={Check} />
              <ListSection title="Limites connues" items={agent.limitations} icon={AlertTriangle} tone="warning" />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <ListSection title="Inputs nécessaires" items={agent.requiredInputs} icon={Check} />
              <ListSection title="Livrables attendus" items={agent.deliverables} icon={Check} />
            </div>

            <div className="my-6 grid md:grid-cols-2 gap-5">
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">Ce que vous obtenez</h2>
                <p className="text-sm leading-relaxed text-[#C8B1E4]">
                  {agent.contract.outputPromise.summary || 'L’accès ouvre un workspace guidé pour utiliser cet agent avec les consignes fournies par le créateur.'}
                </p>
                {agent.contract.outputPromise.examples.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-[#C8B1E4]">
                    {agent.contract.outputPromise.examples.map((example, index) => (
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
                {agent.contract.setupRequirements.items.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-[#C8B1E4]">
                    {agent.contract.setupRequirements.items.map((item, index) => (
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
            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 glow-soft">
              <p className="font-label text-xs text-[#9B72CF] mb-1">Prix fixe</p>
              {hasPrice ? (
                <p className="font-stat text-4xl text-[#F4EFFA] glow-text mb-1">
                  {agent.priceLabel ?? `€${agent.fromPrice}`}
                  <span className="text-base text-[#9B72CF] ml-1">{priceModeLabel === 'projet' ? 'au projet' : 'à la tâche'}</span>
                </p>
              ) : (
                <p className="font-display text-2xl font-bold text-[#F4EFFA] mb-2">Prix non configuré</p>
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
                Le prix est fixé par le créateur puis validé avant publication. Le paiement Stripe active l’accès uniquement après confirmation webhook.
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
                  <Link href={`/workspace/${orderState.rentalId}`} className="mt-4 block">
                    <Button className="w-full border-0 bg-[#10B981] text-[#07130F] hover:bg-[#34D399]">
                      Ouvrir mon agent
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
