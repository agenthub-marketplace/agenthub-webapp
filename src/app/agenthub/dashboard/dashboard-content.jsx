'use client';
import { useState } from 'react';
import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import AgentCard from '@/components/AgentCard';
import { agentsList, userReviews } from '@/lib/mock-data';
import { formatCreditsFromCents } from '@/lib/format-credits';
import { Download, Edit3, Heart, Star, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { submitRentalReviewAction } from '@/server/reviews/actions';
import { stopAgentAccessAction } from '@/server/rentals/actions';

function statusBadgeClass(status) {
  return (
    {
      pending: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      accepted: 'bg-[#1A152F] border-[#8B5CF6]/30 text-[#C4B5FD]',
      in_progress: 'bg-[#1A152F] border-[#0EA5E9]/30 text-[#7DD3FC]',
      delivered: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      active: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      stopped: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
      expired: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
      rejected: 'bg-[#1A152F] border-[#EF4444]/30 text-[#FCA5A5]',
      cancelled: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
    }[status] ?? 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]'
  );
}

function rentalStatusLabel(status, lang) {
  const labels = {
    fr: {
      pending: 'En attente',
      accepted: 'Active',
      in_progress: 'En cours',
      delivered: 'Livrée',
      active: 'Active',
      stopped: 'Arrêtée',
      expired: 'Expirée',
      rejected: 'Refusée',
      cancelled: 'Annulée',
    },
    en: {
      pending: 'Pending',
      accepted: 'Active',
      in_progress: 'In progress',
      delivered: 'Delivered',
      active: 'Active',
      stopped: 'Stopped',
      expired: 'Expired',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    },
  };

  return labels[lang === 'en' ? 'en' : 'fr'][status] ?? status;
}

function paymentStatusLabel(status, lang, hasAccess = false, rentalStatus = null) {
  if (rentalStatus === 'stopped' || rentalStatus === 'expired') {
    return lang === 'en' ? 'Access stopped' : 'Accès arrêté';
  }

  const labels = {
    fr: {
      pending: 'Paiement en attente',
      paid: hasAccess ? 'Accès activé' : 'Activation en cours',
      paid_blocked: 'Activation bloquée',
      failed: 'Paiement échoué',
      cancelled: 'Paiement annulé',
    },
    en: {
      pending: 'Payment pending',
      paid: hasAccess ? 'Access active' : 'Activation pending',
      paid_blocked: 'Activation blocked',
      failed: 'Payment failed',
      cancelled: 'Payment cancelled',
    },
  };

  return labels[lang === 'en' ? 'en' : 'fr'][status] ?? status;
}

function paymentStatusClass(status) {
  return (
    {
      pending: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      paid: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      paid_blocked: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      failed: 'bg-[#1A152F] border-[#EF4444]/30 text-[#FCA5A5]',
      cancelled: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
    }[status] ?? 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]'
  );
}

function StructuredBrief({ inputs, lang }) {
  if (!inputs || typeof inputs !== 'object') {
    return null;
  }

  const rows = [
    [lang === 'en' ? 'Goal' : 'Objectif', inputs.objective],
    [lang === 'en' ? 'Context' : 'Contexte', inputs.context],
    [lang === 'en' ? 'Deadline' : 'Deadline', inputs.deadline],
    [lang === 'en' ? 'Expected format' : 'Format attendu', inputs.output_format],
    [lang === 'en' ? 'Constraints' : 'Contraintes', inputs.constraints],
  ].filter(([, value]) => typeof value === 'string' && value.trim().length > 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-[#2F184B] bg-[#07050F] p-3 text-xs text-[#C8B1E4]">
      <p className="font-label mb-2 text-[10px] text-[#9B72CF]">{lang === 'en' ? 'YOUR BRIEF' : 'VOTRE BESOIN'}</p>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="font-label text-[10px] text-[#7F6B9C]">{label}</p>
            <p className="whitespace-pre-line leading-relaxed">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage({
  profile,
  betaRentals = [],
  betaRentalsError = null,
  paymentOrders = [],
  paymentOrdersError = null,
  reviewSubmitted = null,
  reviewError = null,
  rentalCreated = false,
  codeAccessRequired = false,
  locale,
}) {
  const { t, lang } = useT();
  const [tab, setTab] = useState('rentals');
  const [memory, setMemory] = useState({
    job: lang==='en'?'Freelance consultant':'Consultante freelance',
    needs: lang==='en'?'Writing, Analysis, Strategy':'Rédaction, Analyse, Stratégie',
    level: lang==='en'?'Intermediate':'Intermédiaire',
    tools: 'Notion, Google Docs, Gmail',
    style: lang==='en'?'Direct and concise':'Direct et concis',
    lang: lang==='en'?'English':'Français',
  });
  const [editingKey, setEditingKey] = useState(null);
  const favorites = agentsList.slice(0, 4);
  const recommended = agentsList.slice(0, 4);
  const tabs = [
    { id: 'rentals', label: t('db.t.rentals') },
    { id: 'history', label: t('db.t.history') },
    { id: 'favorites', label: t('db.t.fav') },
    { id: 'memory', label: t('db.t.memory') },
    { id: 'payments', label: t('db.t.payments') },
  ];

  const effectiveLocale = (locale ?? lang ?? 'fr') === 'en' ? 'en' : 'fr';
  const reviewAction = submitRentalReviewAction.bind(null, effectiveLocale);
  const stopAction = stopAgentAccessAction.bind(null, effectiveLocale);
  const marketplacePath = effectiveLocale === 'en' ? '/en/marketplace' : '/agenthub/search';
  const workspacePath = effectiveLocale === 'en' ? '/en/workspace' : '/agenthub/workspace';
  const agentPath = (slug) => `${effectiveLocale === 'en' ? '/en' : '/agenthub'}/agents/${slug}`;
  const formatAccessDate = (date) => new Date(date).toLocaleDateString(effectiveLocale === 'en' ? 'en-US' : 'fr-FR');

  const rentedAgentHistory = [];
  const seenAgentSlugs = new Set();

  for (const rental of betaRentals) {
    const slug = rental.agent?.slug;

    if (!slug || seenAgentSlugs.has(slug)) {
      continue;
    }

    seenAgentSlugs.add(slug);
    rentedAgentHistory.push(rental);
  }

  const historyRows = rentedAgentHistory
    .map((rental) => ({
      id: rental.id,
      agent: rental.agent?.name ?? (effectiveLocale === 'en' ? 'AgentHub agent' : 'AgentHub agent'),
      slug: rental.agent?.slug ?? null,
      status: rental.status,
      accessOpen: rental.accessOpen,
      mode: rental.pricingType,
      date: formatAccessDate(rental.createdAt),
      price: rental.priceCents ?? 0,
      rating: rental.review?.rating ?? null,
      dates: formatAccessDate(rental.createdAt),
    }));
  const activeAccessCount = betaRentals.filter((rental) => rental.accessOpen).length;
  const pendingPaymentCount = paymentOrders.filter((payment) => payment.status === 'pending').length;
  const cancelledPaymentCount = paymentOrders.filter((payment) => payment.status === 'cancelled').length;
  const blockedPaymentCount = paymentOrders.filter((payment) => payment.status === 'paid_blocked').length;

  const reviewErrorMessage = (() => {
    if (!reviewError) {
      return null;
    }

    if (reviewError === 'invalid-request') {
      return lang === 'en' ? 'Invalid review request.' : 'Requête d’avis invalide.';
    }

    if (reviewError === 'review-body-required') {
      return lang === 'en' ? 'Please write a review message.' : 'Ajoute un commentaire pour l’avis.';
    }

    if (reviewError === 'review-body-too-short') {
      return lang === 'en'
        ? 'Your review must contain at least 5 characters.'
        : 'Votre avis doit contenir au moins 5 caractères.';
    }

    if (reviewError === 'rating-required') {
      return lang === 'en' ? 'Please choose a rating.' : 'Choisissez une note.';
    }

    if (reviewError === 'invalid-rating') {
      return lang === 'en' ? 'The rating must be between 1 and 5.' : 'La note doit être comprise entre 1 et 5.';
    }

    if (reviewError === 'rental-not-reviewable' || reviewError === 'rental-not-delivered') {
      return lang === 'en'
        ? 'You can review only an agent you have accessed.'
        : 'Vous pouvez noter uniquement un agent auquel vous avez accès.';
    }

    if (reviewError === 'review-already-exists') {
      return lang === 'en' ? 'You already reviewed this agent access.' : 'Vous avez déjà laissé un avis pour cet accès agent.';
    }

    if (reviewError === 'self-review-not-allowed') {
      return lang === 'en'
        ? 'You cannot review access to your own agent.'
        : 'Vous ne pouvez pas noter un accès à votre propre agent.';
    }

    if (reviewError === 'review-run-required') {
      return lang === 'en'
        ? 'Run this agent once from the workspace before leaving a verified review.'
        : 'Lancez cet agent une fois depuis le workspace avant de laisser un avis vérifié.';
    }

    if (reviewError === 'review-run-check-failed') {
      return lang === 'en'
        ? 'Unable to verify the execution history for this review right now.'
        : 'Impossible de vérifier l’historique d’exécution pour cet avis pour le moment.';
    }

    if (reviewError === 'review-create-failed') {
      return lang === 'en'
        ? 'Unable to save your review right now.'
        : 'Impossible d’enregistrer l’avis pour le moment.';
    }

    return lang === 'en' ? 'An unexpected error occurred.' : 'Une erreur inattendue est survenue.';
  })();

  const greetingName = (profile?.displayName ?? profile?.email ?? '').split(' ')[0] || t('db.name');
  return (
    <div className="min-h-screen ">
      <AgentHubNavbar profile={profile} />
      <div className="container py-10">
        <div className="mb-8">
          <p className="font-label text-xs text-[#A78BCF] mb-2">{t('db.myaccount')}</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#F5F1FA]">{t('db.hello', { name: greetingName })}</h1>
          <p className="text-[#D6C5E8] mt-2">{t('db.subtitle')}</p>
        </div>

        {reviewSubmitted && (
          <div className="mb-5 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-3 text-sm text-[#6EE7B7]">
            {lang === 'en'
              ? 'Your review has been submitted. Thanks for the feedback.'
              : 'Votre avis a bien été envoyé. Merci pour votre retour.'}
          </div>
        )}

        {rentalCreated && (
          <div className="mb-5 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-3 text-sm text-[#6EE7B7]">
            {lang === 'en'
              ? 'Your access is active. Find it anytime from My agents.'
              : 'Votre accès est actif. Retrouvez-le à tout moment dans Mes agents.'}
          </div>
        )}

        {codeAccessRequired && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 p-4 text-sm text-[#D6C5E8] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display font-semibold text-[#F5F1FA]">
                {lang === 'en'
                  ? 'AgentHub Code is reserved for creators and admins.'
                  : 'AgentHub Code est réservé aux créateurs et admins.'}
              </p>
              <p className="mt-1 text-[#C8B1E4]">
                {lang === 'en'
                  ? 'Create a creator profile to build and submit agents.'
                  : 'Créez un profil créateur pour construire et soumettre des agents.'}
              </p>
            </div>
            <Link href="/onboarding/creator" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#8B5CF6]/50 bg-[#F5F1FA] px-4 py-2 font-semibold text-[#2B1A44] transition-colors hover:bg-white">
              {lang === 'en' ? 'Become a creator' : 'Devenir créateur'}
            </Link>
          </div>
        )}

        {reviewErrorMessage && (
          <div className="mb-5 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-3 text-sm text-[#FCA5A5]">
            {reviewErrorMessage}
          </div>
        )}

        {/* Recommended agents row */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('db.recosub')}</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('db.reco')}</h2>
            </div>
          </div>
          <div className="marquee-wrapper marquee-mask overflow-hidden py-8">
            <div className="marquee-track gap-4">
              {[...recommended, ...recommended].map((a, i) => (
                <div key={`${a.id}-${i}`} className="w-[280px] shrink-0">
                  <AgentCard agent={a}/>
                </div>
              ))}
            </div>
          </div>
            <div className="text-center mt-6">
            <Link href={marketplacePath}><Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA] h-11 px-6">{t('db.seeall')} <ArrowRight className="w-4 h-4 ml-2"/></Button></Link>
          </div>
        </section>

        {/* Avis utilisateurs — défilement vers la droite */}
        <section className="mb-10">
          <div className="mb-4">
            <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('db.reviewssub')}</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('db.reviewstitle')}</h2>
          </div>
          <div className="marquee-wrapper marquee-mask overflow-hidden py-4">
            <div className="marquee-track reverse gap-5">
              {[...userReviews, ...userReviews].map((r, i) => (
                <div key={`${r.id}-${i}`} className="w-[280px] shrink-0 bg-[#0F0B22] border border-[#1E1340] rounded-2xl p-5">
                  <div className="flex gap-1 mb-3">{Array.from({length:r.stars}).map((_,k)=><Star key={k} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
                  <p className="text-sm text-[#B8A8D8] italic leading-relaxed mb-5 line-clamp-4">« {r.quote} »</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-[#1E1340]">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center text-xs font-stat text-white">{r.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-[#F5F1FA] truncate">{r.name}</p>
                      <p className="text-[11px] text-[#A78BCF] truncate">{r.job}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#4A3D6B] mt-3">{lang==='en' ? r.dateEn : r.dateFr}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex gap-1 border-b border-[#251A40] mb-6 overflow-x-auto no-scrollbar">
          {tabs.map(tb => (
            <button key={tb.id} onClick={()=>setTab(tb.id)} className={`px-5 py-3 text-sm font-display font-semibold relative whitespace-nowrap ${tab === tb.id ? 'text-[#F5F1FA]' : 'text-[#A78BCF] hover:text-[#D6C5E8]'}`}>
              {tb.label}
              {tab === tb.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]"/>}
            </button>
          ))}
        </div>

        {tab === 'rentals' && (
          <div>
            {betaRentalsError && (
              <div className="mb-5 rounded-2xl border border-[#F59E0B]/40 bg-[#110D24] px-4 py-3 text-sm text-[#F59E0B]">
                {lang === 'en' ? 'Agent accesses are temporarily unavailable.' : 'Les accès agent sont temporairement indisponibles.'}
              </div>
            )}

            {betaRentals.length > 0 && (
              <div className="mb-6">
                <p className="font-label text-xs text-[#A78BCF] mb-3">{lang === 'en' ? 'RENTED AGENTS' : 'AGENTS LOUÉS'}</p>
                <div className="grid md:grid-cols-3 gap-5">
                  {betaRentals.map((rental) => (
                    <div key={rental.id} className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5 card-hover">
                      <div className="flex items-start gap-3 mb-4">
                        <AgentAvatar index={0} size="md" />
                        <div className="flex-1">
                          <h3 className="font-display font-bold text-lg text-[#F5F1FA]">{rental.agent?.name ?? 'AgentHub agent'}</h3>
                          <p className="text-xs text-[#A78BCF]">{rental.agent?.summary ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-label ${statusBadgeClass(rental.status)}`}>
                          {rentalStatusLabel(rental.status, lang)}
                        </span>
                        <span className="font-stat text-[#F5F1FA]">
                          {formatCreditsFromCents(rental.priceCents)}
                        </span>
                      </div>
                      <p className="text-xs text-[#A78BCF] mb-4">
                        {lang === 'en'
                          ? 'Active without payment during the private beta.'
                          : 'Actif sans paiement pendant la beta privée.'}
                      </p>
                      <StructuredBrief inputs={rental.requiredInputs} lang={lang} />
                      {rental.result && (
                        <div className="mb-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#D6C5E8]">
                          <p className="font-label mb-1 text-[10px] text-[#6EE7B7]">
                            {lang === 'en' ? 'DELIVERED RESULT' : 'RÉSULTAT LIVRÉ'}
                          </p>
                          <p className="leading-relaxed">{rental.result.summary}</p>
                        </div>
                      )}
                      {!rental.result && rental.status === 'delivered' && (
                        <div className="mb-4 rounded-xl border border-[#2F184B] bg-[#07050F] p-3 text-xs text-[#C8B1E4]">
                          {lang === 'en' ? 'Legacy delivered access without stored result.' : 'Ancien accès livré sans résultat enregistré.'}
                        </div>
                      )}

                      {['active', 'stopped', 'expired', 'delivered'].includes(rental.status) && !rental.review && (
                        rental.accessOpen ? (
                          <div className="mt-4 rounded-xl border border-[#6B3FA0]/40 bg-[#1A152F] p-3 text-xs leading-5 text-[#C8B1E4]">
                            <p className="font-label mb-1 text-[10px] text-[#B794F4]">
                              {lang === 'en' ? 'REVIEW FROM WORKSPACE' : 'AVIS DEPUIS LE WORKSPACE'}
                            </p>
                            <p>
                              {rental.hasSuccessfulRun
                                ? lang === 'en'
                                  ? 'A successful run is recorded. Publish your verified review from the workspace review tab.'
                                  : 'Une exécution réussie est enregistrée. Publiez votre avis vérifié depuis l’onglet avis du workspace.'
                                : lang === 'en'
                                  ? 'Run the agent first, then publish your verified review from the workspace history.'
                                  : 'Lancez d’abord l’agent, puis publiez votre avis vérifié depuis l’historique du workspace.'}
                            </p>
                            <Link href={`${workspacePath}/${rental.id}?tab=review`} className="mt-2 inline-flex text-[#D8B4FE] hover:text-white">
                              {lang === 'en' ? 'Open workspace review tab' : 'Ouvrir l’onglet avis du workspace'}
                            </Link>
                          </div>
                        ) : rental.hasSuccessfulRun ? (
                        <form action={reviewAction} className="mt-4 space-y-2">
                          <input type="hidden" name="rental_id" value={rental.id} />
                          <div className="rounded-xl border border-[#6B3FA0]/40 bg-[#1A152F] p-3 text-xs leading-5 text-[#C8B1E4]">
                            <p className="font-label mb-1 text-[10px] text-[#B794F4]">
                              {lang === 'en' ? 'BEFORE REVIEWING' : 'AVANT DE LAISSER UN AVIS'}
                            </p>
                            <p>
                              {lang === 'en'
                                ? 'Base your verified review on the workspace result and execution history.'
                                : 'Basez votre avis vérifié sur le résultat et l’historique d’exécution du workspace.'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[#A78BCF]">Note</label>
                            <select
                              name="rating"
                              required
                              defaultValue=""
                              className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                            >
                              <option value="" disabled>
                                {lang === 'en' ? 'Choose a rating' : 'Choisir une note'}
                              </option>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            name="title"
                            maxLength={200}
                            placeholder={lang === 'en' ? 'Title (optional)' : 'Titre (optionnel)'}
                            className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                          />
                          <textarea
                            name="body"
                            required
                            minLength={5}
                            maxLength={1200}
                            rows={4}
                            placeholder={lang === 'en' ? 'Your feedback on this agent' : 'Votre avis sur cet agent'}
                            className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                          />
                          <Button type="submit" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                            {lang === 'en' ? 'Send review' : 'Publier l’avis'}
                          </Button>
                        </form>
                        ) : (
                          <div className="mt-4 rounded-xl border border-[#6B3FA0]/40 bg-[#1A152F] p-3 text-xs leading-5 text-[#C8B1E4]">
                            <p className="font-label mb-1 text-[10px] text-[#B794F4]">
                              {lang === 'en' ? 'REVIEW UNAVAILABLE' : 'AVIS INDISPONIBLE'}
                            </p>
                            <p>
                              {lang === 'en'
                                ? 'A verified review requires at least one successful workspace execution for this access.'
                                : 'Un avis vérifié nécessite au moins une exécution réussie dans le workspace pour cet accès.'}
                            </p>
                          </div>
                        )
                      )}

                      {rental.review && (
                        <div className="mt-4 rounded-xl border border-[#2F184B] bg-[#0F0A1E] p-3 text-xs text-[#C8B1E4]">
                          <p className="mb-1 text-[11px] font-label text-[#9B72CF]">
                            {lang === 'en' ? 'Your review' : 'Votre avis'}
                          </p>
                          <div className="mb-1 flex gap-1">
                            {Array.from({ length: rental.review.rating }).map((_, index) => (
                              <Star key={index} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                            ))}
                          </div>
                          {rental.review.title && <p className="mb-1 font-label text-[#F4EFFA]">{rental.review.title}</p>}
                          {rental.review.body && <p className="leading-relaxed">{rental.review.body}</p>}
                        </div>
                      )}

                      {rental.accessOpen ? (
                        <div className="space-y-2">
                          <Link href={`${workspacePath}/${rental.id}`}>
                            <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                              {lang === 'en' ? 'Open agent' : 'Ouvrir l’agent'}
                            </Button>
                          </Link>
                          <form action={stopAction}>
                            <input type="hidden" name="rental_id" value={rental.id} />
                            <Button size="sm" variant="outline" className="w-full bg-transparent border-[#EF4444]/45 text-[#FCA5A5] hover:bg-[#2A0D18]">
                              {lang === 'en' ? 'Stop access' : 'Arrêter l’accès'}
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-[#2F184B] bg-[#07050F] px-3 py-2 text-center text-xs text-[#9B72CF]">
                          {lang === 'en'
                            ? 'This access is not currently open.'
                            : 'Cet accès n’est pas ouvert pour le moment.'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!betaRentalsError && betaRentals.length === 0 && (
              <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-8 text-center">
                <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                  {lang === 'en' ? 'No rented agents yet' : 'Aucun agent loué pour l’instant'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#A78BCF]">
                  {lang === 'en'
                    ? 'Rent an approved agent from the marketplace to access it here.'
                    : 'Louez un agent approuvé depuis la marketplace pour y accéder ici.'}
                </p>
                <Link href={marketplacePath} className="mt-5 inline-flex">
                  <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    {lang === 'en' ? 'Explore agents' : 'Explorer les agents'}
                  </Button>
                </Link>
              </div>
            )}

            {historyRows.length > 0 && (
              <section className="mt-8 rounded-2xl border border-[#251A40] bg-[#110D24] p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-label mb-1 text-xs text-[#A78BCF]">
                      {lang === 'en' ? 'RENTAL HISTORY' : 'HISTORIQUE DES AGENTS LOUÉS'}
                    </p>
                    <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                      {lang === 'en' ? 'Find an agent you rented before' : 'Retrouver un agent déjà loué'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('history')}
                    className="text-sm font-display font-semibold text-[#C4B5FD] hover:text-[#F5F1FA]"
                  >
                    {lang === 'en' ? 'View full history' : 'Voir tout l’historique'}
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {historyRows.slice(0, 6).map((rental) => (
                    <article key={`rented-agent-${rental.id}`} className="rounded-xl border border-[#2F184B] bg-[#0A0816] p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-display font-bold text-[#F5F1FA]">{rental.agent}</h4>
                          <p className="mt-1 text-xs text-[#A78BCF]">
                            {lang === 'en' ? 'Last rented on' : 'Dernière location le'} {rental.dates}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-label ${statusBadgeClass(rental.status)}`}>
                          {rentalStatusLabel(rental.status, lang)}
                        </span>
                      </div>
                      {rental.accessOpen ? (
                        <Link href={`${workspacePath}/${rental.id}`}>
                          <Button size="sm" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                            {lang === 'en' ? 'Open my agent' : 'Ouvrir mon agent'}
                          </Button>
                        </Link>
                      ) : rental.slug ? (
                        <Link href={agentPath(rental.slug)}>
                          <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                            {lang === 'en' ? 'Rent again' : 'Relouer cet agent'}
                          </Button>
                        </Link>
                      ) : (
                        <p className="rounded-lg border border-[#2F184B] px-3 py-2 text-center text-xs text-[#9B72CF]">
                          {lang === 'en' ? 'Agent listing unavailable' : 'Fiche agent indisponible'}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-x-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#251A40]">
              <p className="font-display font-bold">{lang==='en'?'Rented agents history':'Historique des agents loués'}</p>
              <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]"><Download className="w-3.5 h-3.5 mr-1"/>{t('cr.exportcsv')}</Button>
            </div>
            {historyRows.length === 0 ? (
              <div className="p-6 text-sm text-[#A78BCF]">
                {lang === 'en' ? 'No rented agent history yet.' : 'Aucun historique d’agent loué pour l’instant.'}
              </div>
            ) : (
              <table className="w-full text-sm min-w-[700px]">
                <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]">
                  <th className="text-left p-3">{t('db.h.agent')}</th><th>{t('db.h.mode')}</th><th>{t('db.h.dates')}</th><th className="text-right">{t('db.h.price')}</th><th>{t('db.h.rating')}</th><th className="text-right pr-4">{t('db.h.actions')}</th>
                </tr></thead>
                <tbody>
                  {historyRows.map((h) => (
                    <tr key={h.id} className="border-b border-[#251A40] hover:bg-[#1A152F]">
                      <td className="p-3 text-[#F5F1FA] font-display font-semibold">{h.agent}</td>
                      <td className="text-[#D6C5E8]">{h.mode}</td>
                      <td className="text-[#A78BCF]">{h.dates}</td>
                      <td className="text-right font-stat text-[#F5F1FA]">{formatCreditsFromCents(h.price)}</td>
                      <td>
                        <div className="flex gap-0.5">
                          {Array.from({ length: h.rating ?? 0 }).map((_,i)=><Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]"/>)}
                        </div>
                      </td>
                      <td className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          {h.accessOpen ? (
                            <Link href={`${workspacePath}/${h.id}`} className="text-xs px-2 py-1 rounded bg-[#1A152F] hover:bg-[#251A40] text-[#D6C5E8]">
                              {lang === 'en' ? 'Open' : 'Ouvrir'}
                            </Link>
                          ) : h.slug ? (
                            <Link href={agentPath(h.slug)} className="text-xs px-2 py-1 rounded bg-[#1A152F] hover:bg-[#251A40] text-[#D6C5E8]">
                              {t('db.rerent')}
                            </Link>
                          ) : null}
                          {h.slug && (
                            <Link href={agentPath(h.slug)} className="p-1.5 rounded hover:bg-[#1A152F] text-[#A78BCF]">
                              <FileText className="w-3.5 h-3.5"/>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favorites.map(a => (
              <div key={a.id} className="relative">
                <button className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[#1A152F]/80 backdrop-blur hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center"><Heart className="w-4 h-4 fill-current"/></button>
                <Link href={`/agenthub/agents/${a.slug}`} className="block bg-[#110D24] border border-[#251A40] rounded-2xl p-5 card-hover">
                  <AgentAvatar index={a.gradient} size="lg" className="mb-3"/>
                  <h3 className="font-display font-bold text-[#F5F1FA]">{a.name}</h3>
                  <p className="text-xs text-[#A78BCF]">{a.pitch}</p>
                </Link>
              </div>
            ))}
          </div>
        )}

        {tab === 'memory' && (
          <div>
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[#1A152F] to-[#110D24] border border-[#8B5CF6]/30">
              <h2 className="font-display text-2xl font-bold mb-2">{t('db.memtitle')}</h2>
              <p className="text-sm text-[#D6C5E8]">{t('db.memsub')}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { k: 'job', label: t('db.f.job') },
                { k: 'needs', label: t('db.f.needs') },
                { k: 'level', label: t('db.f.level') },
                { k: 'tools', label: t('db.f.tools') },
                { k: 'style', label: t('db.f.style') },
                { k: 'lang', label: t('db.f.lang') },
              ].map(f => (
                <div key={f.k} className="bg-[#110D24] border border-[#251A40] rounded-xl p-4">
                  <div className="flex justify-between mb-2"><p className="font-label text-xs text-[#A78BCF]">{f.label}</p><button onClick={()=>setEditingKey(editingKey===f.k?null:f.k)} className="text-[#A78BCF] hover:text-[#F5F1FA]"><Edit3 className="w-3.5 h-3.5"/></button></div>
                  {editingKey === f.k ? (
                    <input value={memory[f.k]} onChange={e=>setMemory({...memory, [f.k]: e.target.value})} onBlur={()=>setEditingKey(null)} autoFocus className="w-full bg-[#0A0816] border border-[#8B5CF6] rounded-md px-2 py-1 text-sm text-[#F5F1FA] focus:outline-none"/>
                  ) : (
                    <p className="text-sm text-[#F5F1FA]">{memory[f.k]}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]"><Download className="w-4 h-4 mr-2"/>{t('db.export')}</Button>
              <button className="text-sm text-[#EF4444] hover:underline">{t('db.delprof')}</button>
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6">
              <p className="font-label text-xs text-[#A78BCF] mb-2">{t('db.pm')}</p>
              <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                {lang === 'en' ? 'Order status' : 'État de vos commandes'}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-[#A78BCF]">
                {lang === 'en'
                  ? 'Track pending payments, cancelled checkouts, and activations waiting for Stripe webhook confirmation.'
                  : 'Suivez les paiements en attente, les checkouts annulés et les activations en attente de confirmation Stripe.'}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {[
                [lang === 'en' ? 'Active agents' : 'Agents actifs', activeAccessCount],
                [lang === 'en' ? 'Pending payments' : 'Paiements en attente', pendingPaymentCount],
                [lang === 'en' ? 'Cancelled payments' : 'Paiements annulés', cancelledPaymentCount],
                [lang === 'en' ? 'Blocked activations' : 'Activations bloquées', blockedPaymentCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#251A40] bg-[#110D24] p-4">
                  <p className="font-label text-[10px] text-[#A78BCF]">{label}</p>
                  <p className="mt-2 font-stat text-2xl text-[#F5F1FA]">{value}</p>
                </div>
              ))}
            </div>

            {paymentOrdersError && (
              <div className="rounded-2xl border border-[#F59E0B]/40 bg-[#110D24] px-4 py-3 text-sm text-[#F59E0B]">
                {lang === 'en' ? 'Payment status is temporarily unavailable.' : 'Les états de paiement sont temporairement indisponibles.'}
              </div>
            )}

            {!paymentOrdersError && paymentOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 text-sm text-[#A78BCF]">
                {lang === 'en'
                  ? 'No Stripe checkout has been started yet.'
                  : 'Aucun checkout Stripe n’a encore été démarré.'}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {paymentOrders.map((payment) => (
                  <article key={payment.id} className="rounded-2xl border border-[#251A40] bg-[#110D24] p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F5F1FA]">
                          {payment.agent?.name ?? 'AgentHub agent'}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[#A78BCF]">{payment.agent?.summary}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-label ${paymentStatusClass(payment.status)}`}>
                        {paymentStatusLabel(payment.status, lang, Boolean(payment.rentalRequestId), payment.rentalStatus)}
                      </span>
                    </div>
                    <div className="mb-4 flex items-center justify-between text-sm text-[#D6C5E8]">
                      <span>{new Date(payment.createdAt).toLocaleDateString(effectiveLocale === 'en' ? 'en-US' : 'fr-FR')}</span>
                      <span className="font-stat text-[#F5F1FA]">{formatCreditsFromCents(payment.amountCents)}</span>
                    </div>
                    {payment.status === 'paid_blocked' && (
                      <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                        {lang === 'en'
                          ? 'Payment was received, but access activation needs a manual check.'
                          : 'Paiement reçu, mais l’activation de l’accès nécessite une vérification.'}
                      </div>
                    )}
                    {payment.rentalRequestId && !['stopped', 'expired'].includes(payment.rentalStatus ?? '') ? (
                      <Link href={`${workspacePath}/${payment.rentalRequestId}`}>
                        <Button size="sm" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                          {lang === 'en' ? 'Open access' : 'Ouvrir l’accès'}
                        </Button>
                      </Link>
                    ) : ['stopped', 'expired'].includes(payment.rentalStatus ?? '') && payment.agent?.slug ? (
                      <Link href={agentPath(payment.agent.slug)}>
                        <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                          {lang === 'en' ? 'Rent again' : 'Relouer cet agent'}
                        </Button>
                      </Link>
                    ) : payment.status === 'paid' && payment.checkoutSessionId ? (
                      <Link href={`${effectiveLocale === 'en' ? '/en' : ''}/checkout/success?session_id=${encodeURIComponent(payment.checkoutSessionId)}`}>
                        <Button size="sm" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                          {lang === 'en' ? 'Check activation' : 'Vérifier l’activation'}
                        </Button>
                      </Link>
                    ) : payment.agent?.slug ? (
                      <Link href={agentPath(payment.agent.slug)}>
                        <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                          {lang === 'en' ? 'View agent' : 'Voir l’agent'}
                        </Button>
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}

export default DashboardPage;
