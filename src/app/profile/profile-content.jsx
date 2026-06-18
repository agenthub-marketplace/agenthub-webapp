'use client';
import Link from 'next/link';
import { Star, Award, ArrowRight, Settings, MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

function ProfilePage({ profile, rentals = [], rentalsError = null }) {
  const { t, lang } = useT();
  const rentalRows = Array.isArray(rentals) ? rentals : [];
  const myReviews = rentalRows
    .filter((rental) => rental.review)
    .map((rental) => ({
      agentName: rental.agent?.name ?? 'AgentHub agent',
      id: rental.review.id,
      rating: rental.review.rating,
      body: rental.review.body,
      title: rental.review.title,
    }));
  const displayName = profile?.displayName || profile?.email?.split('@')[0] || (lang === 'en' ? 'AgentHub user' : 'Utilisateur AgentHub');
  const email = profile?.email || '';
  const initials = (displayName || email || 'AH')
    .replace(/@.*$/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AH';

  const activeAccessCount = rentalRows.filter((rental) => rental.accessOpen).length;
  const successfulRunsCount = rentalRows.filter((rental) => rental.hasSuccessfulRun).length;
  const averageRating =
    myReviews.length > 0
      ? myReviews.reduce((sum, review) => sum + review.rating, 0) / myReviews.length
      : null;
  const memberSince = lang === 'en' ? 'AgentHub member' : 'Membre AgentHub';

  return (
    <div className="min-h-screen ">
      <Navbar profile={profile} />
      <div className="container py-10">
        {/* En-tête */}
        <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center text-white text-3xl font-stat shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-[#F5F1FA]">{displayName}</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A152F] border border-[#8B5CF6]/40 text-[#8B5CF6] text-[10px] font-label">
                  <Award className="w-3 h-3"/>{t('profile.pro')}
                </span>
              </div>
              <p className="text-sm text-[#A78BCF] mb-3">{email ? `${email} · ` : ''}{memberSince}</p>
              <div className="flex gap-3">
                <Link href="/agenthub/workspace">
                  <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]" size="sm">
                    <MessageSquare className="w-3.5 h-3.5 mr-2"/>{t('nav.workspace')}
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA]" size="sm">
                    <Settings className="w-3.5 h-3.5 mr-2"/>{t('profile.edit')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#251A40]">
            <div className="text-center md:text-left">
              <p className="font-stat text-3xl text-[#F5F1FA]">{rentalRows.length}</p>
              <p className="text-xs text-[#A78BCF] mt-1">{t('profile.s.rentals')}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="font-stat text-3xl text-[#F5F1FA]">{successfulRunsCount}</p>
              <p className="text-xs text-[#A78BCF] mt-1">{lang === 'en' ? 'Runs completed' : 'Exécutions réussies'}</p>
            </div>
            <div className="text-center md:text-left col-span-2 md:col-span-1">
              <p className="font-stat text-3xl text-[#F5F1FA]">{activeAccessCount}</p>
              <p className="text-xs text-[#A78BCF] mt-1">{lang === 'en' ? 'Active access' : 'Accès actifs'}</p>
            </div>
          </div>
        </div>

        {rentalsError && (
          <div className="mb-8 rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 text-sm text-[#FDE68A]">
            {lang === 'en'
              ? 'Some profile activity could not be loaded right now.'
              : 'Une partie de l’activité du profil n’a pas pu être chargée pour le moment.'}
          </div>
        )}

        {/* Avis laissés */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('profile.reviewssub')}</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('profile.reviews')}</h2>
              {averageRating !== null && (
                <p className="mt-1 text-xs text-[#A78BCF]">
                  {lang === 'en' ? 'Average rating left' : 'Note moyenne laissée'} · {averageRating.toFixed(1)}/5
                </p>
              )}
            </div>
          </div>
          {myReviews.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {myReviews.map(r => (
                <div key={r.id} className="bg-[#0F0B22] border border-[#1E1340] rounded-2xl p-5">
                  <div className="flex gap-1 mb-2">{Array.from({length:r.rating}).map((_,k)=><Star key={k} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
                  <p className="font-display text-sm font-semibold text-[#F5F1FA]">{r.title || r.agentName}</p>
                  <p className="mt-2 text-sm text-[#B8A8D8] italic leading-relaxed">« {r.body || (lang === 'en' ? 'Verified review left.' : 'Avis vérifié laissé.')} »</p>
                  <p className="mt-3 text-[11px] text-[#4A3D6B]">{r.agentName}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 text-sm text-[#C8B1E4]">
              <p className="font-display text-xl font-bold text-[#F5F1FA]">
                {lang === 'en' ? 'No verified reviews yet.' : 'Aucun avis vérifié pour le moment.'}
              </p>
              <p className="mt-2 max-w-2xl text-[#A78BCF]">
                {lang === 'en'
                  ? 'Use an agent from your workspace, then leave a verified review to build your activity trail.'
                  : 'Utilisez un agent depuis votre workspace, puis laissez un avis vérifié pour construire votre historique.'}
              </p>
            </div>
          )}
        </section>

        {/* Agents favoris */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('profile.favsub')}</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('profile.favorites')}</h2>
            </div>
            <Link href="/agenthub/search" className="hidden md:flex items-center gap-1 text-sm text-[#A78BCF] hover:text-[#F5F1FA]">{t('a.viewall')} <ArrowRight className="w-4 h-4"/></Link>
          </div>
          <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 text-sm text-[#C8B1E4]">
            <p className="font-display text-xl font-bold text-[#F5F1FA]">
              {lang === 'en' ? 'Favorites are not enabled yet.' : 'Les favoris ne sont pas encore activés.'}
            </p>
            <p className="mt-2 max-w-2xl text-[#A78BCF]">
              {lang === 'en'
                ? 'Use your rental history as the reliable shortcut for now. Agents you have rented remain available from My agents.'
                : 'Utilisez votre historique comme raccourci fiable pour le moment. Les agents loués restent disponibles dans Mes agents.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/agenthub/dashboard">
                <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                  {lang === 'en' ? 'Open my agents' : 'Ouvrir mes agents'}
                </Button>
              </Link>
              <Link href="/agenthub/search">
                <Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA]">
                  {lang === 'en' ? 'Browse marketplace' : 'Explorer la marketplace'}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer/>
    </div>
  );
}

export default ProfilePage;
