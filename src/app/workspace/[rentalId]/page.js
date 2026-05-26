import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';
import { getUserRentalById } from '@/server/rentals/user-rentals';
import { stopAgentAccessAction } from '@/server/rentals/actions';
import { submitRentalReviewAction } from '@/server/reviews/actions';
import { AlertTriangle, ArrowLeft, Bot, Check, Clock, Euro, MessageSquareText, ShieldCheck, Star } from 'lucide-react';

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

function formatPrice(cents, currency = 'eur') {
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

function ListBlock({ emptyText, icon: Icon = Check, items = [], title, tone = 'success' }) {
  const color = tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

  return (
    <div className="rounded-2xl border border-[#2F184B] bg-[#0A0816] p-5">
      <h3 className="font-display mb-3 text-lg font-bold text-[#F4EFFA]">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-[#C8B1E4]">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#9B72CF]">{emptyText}</p>
      )}
    </div>
  );
}

function workspaceActions(mode) {
  const actions = {
    instant: ['Lire la promesse de résultat', 'Vérifier les inputs utiles', 'Consulter les livrables attendus'],
    guided: ['Définir mon objectif', 'Préparer le contexte utile', 'Suivre la checklist de démarrage'],
    document_required: ['Préparer le document côté utilisateur', 'Vérifier les informations nécessaires', 'Lire les limites de l’analyse'],
  };

  return actions[mode] ?? actions.instant;
}

function unavailableCopy(rental) {
  if (rental.agent?.status === 'suspended') {
    return {
      eyebrow: 'AGENT SUSPENDU',
      title: 'Agent suspendu',
      message:
        'Cet agent a été suspendu par AgentHub. Votre workspace reste fermé tant que la vérification n’est pas terminée.',
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
      <Navbar profile={profile} />
      <main className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
          <p className="font-label mb-3 text-xs text-[#F59E0B]">{eyebrow}</p>
          <h1 className="font-display mb-3 text-3xl font-bold text-[#F4EFFA]">{title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#C8B1E4]">{message}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/workspace">
              <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">Mes agents</Button>
            </Link>
            <Link href="/search">
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
  const profile = await requireAuth('fr', `/workspace/${rentalId}`);
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
  const contract = rental.agent.contract;
  const accessLabel = optionLabel(WORKSPACE_MODE_LABELS, contract.workspaceMode) || 'Accès immédiat';
  const setupLabel = optionLabel(SETUP_REQUIREMENT_LABELS, contract.setupRequirements.type);
  const reviewAction = submitRentalReviewAction.bind(null, 'fr');
  const stopAction = stopAgentAccessAction.bind(null, 'fr');

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="container py-8">
        <Link href="/workspace" className="mb-8 inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA]">
          <ArrowLeft className="h-4 w-4" />
          Retour à mes agents
        </Link>

        {accessCreated && (
          <div className="mb-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            Votre accès est activé. Vous pouvez retrouver cet agent depuis “Mes agents”.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
            <AgentAvatar index={0} size="xl" className="mb-5" />
            <p className="font-label mb-2 text-xs text-[#10B981]">Accès actif</p>
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
                Activé le {new Date(rental.createdAt).toLocaleDateString('fr-FR')}
              </div>
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-[#9B72CF]" />
                {formatPrice(rental.priceCents, rental.currency)}
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#10B981]" />
                Statut : {rental.status === 'active' ? 'actif' : rental.status}
              </div>
            </div>
            {rental.agent?.slug && (
              <Link href={`/agents/${rental.agent.slug}`} className="mt-6 block">
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

          <section className="space-y-6">
            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <p className="font-label mb-2 text-xs text-[#9B72CF]">Accès direct</p>
              <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Démarrer avec cet agent</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">
                {contract.outputPromise.summary || 'Suivez les consignes du créateur, préparez les inputs nécessaires puis utilisez ce workspace comme guide d’accès à l’agent.'}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {workspaceActions(contract.workspaceMode).map((label) => (
                  <button key={label} type="button" className="rounded-xl border border-[#2F184B] bg-[#080612] px-3 py-3 text-left text-xs font-label text-[#C8B1E4]">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ListBlock title="Ce que l’agent peut aider à faire" items={rental.agent.capabilities} emptyText="Aucune capacité détaillée n’a été renseignée." />
              <ListBlock title="Inputs à préparer" items={rental.agent.requiredInputsList} emptyText="Aucun input spécifique n’a été renseigné." />
              <ListBlock title="Livrables attendus" items={rental.agent.deliverables} emptyText="Livrables non renseignés." />
              <ListBlock title="Exemples d’usage" items={contract.outputPromise.examples} emptyText="Aucun exemple fourni pour le moment." />
              <ListBlock title="Limites importantes" items={rental.agent.limitations} emptyText="Aucune limite publiée." icon={AlertTriangle} tone="warning" />
            </div>

            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Workspace guidé</h2>
                  <p className="text-sm text-[#9B72CF]">{setupLabel}</p>
                </div>
              </div>
              {contract.setupRequirements.items.length > 0 ? (
                <ul className="space-y-2 text-sm text-[#C8B1E4]">
                  {contract.setupRequirements.items.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-[#2F184B] bg-[#080612] p-5 text-sm leading-relaxed text-[#C8B1E4]">
                  L’accès est actif. Aucun setup supplémentaire n’est requis avant utilisation.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1130] text-[#9B72CF]">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#F4EFFA]">Avis vérifié</h2>
                  <p className="text-sm text-[#9B72CF]">Disponible car vous possédez un accès actif.</p>
                </div>
              </div>
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
                  <input type="hidden" name="return_to" value={`/workspace/${rental.id}`} />
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
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
