'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import AgentCard from '@/components/AgentCard';
import { agentsList, userReviews } from '@/lib/mock-data';
import { Download, Edit3, Heart, Star, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { submitRentalReviewAction } from '@/server/reviews/actions';

function statusBadgeClass(status) {
  return (
    {
      pending: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      accepted: 'bg-[#1A152F] border-[#8B5CF6]/30 text-[#C4B5FD]',
      in_progress: 'bg-[#1A152F] border-[#0EA5E9]/30 text-[#7DD3FC]',
      delivered: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      rejected: 'bg-[#1A152F] border-[#EF4444]/30 text-[#FCA5A5]',
      cancelled: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
    }[status] ?? 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]'
  );
}

function rentalStatusLabel(status, lang) {
  const labels = {
    fr: {
      pending: 'À traiter',
      accepted: 'Active',
      in_progress: 'En cours',
      delivered: 'Livrée',
      rejected: 'Refusée',
      cancelled: 'Annulée',
    },
    en: {
      pending: 'To process',
      accepted: 'Active',
      in_progress: 'In progress',
      delivered: 'Delivered',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    },
  };

  return labels[lang === 'en' ? 'en' : 'fr'][status] ?? status;
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
  reviewSubmitted = null,
  reviewError = null,
  rentalCreated = false,
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
  const marketplacePath = effectiveLocale === 'en' ? '/en/marketplace' : '/marketplace';

  const historyRows = betaRentals
    .filter((rental) => ['delivered', 'rejected', 'cancelled'].includes(rental.status))
    .map((rental) => ({
      id: rental.id,
      agent: rental.agent?.name ?? (effectiveLocale === 'en' ? 'AgentHub agent' : 'AgentHub agent'),
      mode: rental.pricingType,
      date: new Date(rental.createdAt).toLocaleDateString(effectiveLocale === 'en' ? 'en-US' : 'fr-FR'),
      price: rental.priceCents ?? 0,
      rating: rental.review?.rating ?? null,
      dates: new Date(rental.createdAt).toLocaleDateString(effectiveLocale === 'en' ? 'en-US' : 'fr-FR'),
    }));

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

    if (reviewError === 'rental-not-delivered') {
      return lang === 'en'
        ? 'This beta rental can be reviewed only after it is delivered.'
        : 'Cette location beta doit être livrée avant de pouvoir être notée.';
    }

    if (reviewError === 'review-already-exists') {
      return lang === 'en' ? 'You already reviewed this rental.' : 'Vous avez déjà laissé un avis pour cette location.';
    }

    if (reviewError === 'self-review-not-allowed') {
      return lang === 'en'
        ? 'You cannot review a beta rental for your own agent.'
        : 'Vous ne pouvez pas noter une location beta de votre propre agent.';
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
      <Navbar profile={profile} />
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
              ? 'Your beta rental is active. Find it anytime from My rentals.'
              : 'Votre location beta est active. Retrouvez-la à tout moment dans Mes locations.'}
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
                {lang === 'en' ? 'Beta rentals are temporarily unavailable.' : 'Les locations beta sont temporairement indisponibles.'}
              </div>
            )}

            {betaRentals.length > 0 && (
              <div className="mb-6">
                <p className="font-label text-xs text-[#A78BCF] mb-3">{lang === 'en' ? 'BETA RENTALS' : 'LOCATIONS BETA'}</p>
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
                          €{Math.round((rental.priceCents ?? 0) / 100)}
                        </span>
                      </div>
                      <p className="text-xs text-[#A78BCF] mb-4">
                        {lang === 'en'
                          ? 'Created without payment during the private beta.'
                          : 'Créée sans paiement pendant la beta privée.'}
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
                          {lang === 'en' ? 'Result is pending creation by the creator.' : 'Le résultat est en préparation côté créateur.'}
                        </div>
                      )}

                      {rental.status === 'delivered' && rental.result && !rental.review && (
                        <form action={reviewAction} className="mt-4 space-y-2">
                          <input type="hidden" name="rental_id" value={rental.id} />
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
                            placeholder={lang === 'en' ? 'Your feedback on the delivery' : 'Votre avis sur la livraison'}
                            className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                          />
                          <Button type="submit" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                            {lang === 'en' ? 'Send review' : 'Publier l’avis'}
                          </Button>
                        </form>
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

                      {rental.agent?.slug && (
                        <Link href={`/agents/${rental.agent.slug}`}>
                          <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                            {lang === 'en' ? 'View agent' : 'Voir l’agent'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!betaRentalsError && betaRentals.length === 0 && (
              <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-8 text-center">
                <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                  {lang === 'en' ? 'No beta rentals yet' : 'Aucune location beta pour l’instant'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#A78BCF]">
                  {lang === 'en'
                    ? 'Rent an approved agent from the marketplace to track it here.'
                    : 'Louez un agent approuvé depuis la marketplace pour le suivre ici.'}
                </p>
                <Link href={marketplacePath} className="mt-5 inline-flex">
                  <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    {lang === 'en' ? 'Explore agents' : 'Explorer les agents'}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-x-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#251A40]">
              <p className="font-display font-bold">{lang==='en'?'Rental history':'Historique des locations'}</p>
              <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]"><Download className="w-3.5 h-3.5 mr-1"/>{t('cr.exportcsv')}</Button>
            </div>
            {historyRows.length === 0 ? (
              <div className="p-6 text-sm text-[#A78BCF]">
                {lang === 'en' ? 'No completed rentals yet.' : 'Aucun historique de location pour l’instant.'}
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
                      <td className="text-right font-stat text-[#F5F1FA]">€{Math.round(h.price / 100)}</td>
                      <td>
                        <div className="flex gap-0.5">
                          {Array.from({ length: h.rating ?? 0 }).map((_,i)=><Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]"/>)}
                        </div>
                      </td>
                      <td className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          <button className="text-xs px-2 py-1 rounded bg-[#1A152F] hover:bg-[#251A40] text-[#D6C5E8]">{t('db.rerent')}</button>
                          <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#A78BCF]"><FileText className="w-3.5 h-3.5"/></button>
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
                <Link href={`/agents/${a.slug}`} className="block bg-[#110D24] border border-[#251A40] rounded-2xl p-5 card-hover">
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
          <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6">
            <p className="font-label text-xs text-[#A78BCF] mb-2">{t('db.pm')}</p>
            <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
              {lang === 'en' ? 'Payments are not active during the private beta.' : 'Les paiements ne sont pas actifs pendant la beta privée.'}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[#A78BCF]">
              {lang === 'en'
                ? 'Beta rentals are currently created without Stripe checkout, stored payment methods, invoices, or charges.'
                : 'Les locations beta sont actuellement créées sans checkout Stripe, moyen de paiement enregistré, facture ou débit.'}
            </p>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}

export default DashboardPage;
