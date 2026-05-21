'use client';
import Link from 'next/link';
import { Star, Award, Heart, ArrowRight, Settings, MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import { agentsList, currentUser, userReviews } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

function ProfilePage({ profile }) {
  const { t, lang } = useT();
  const favorites = agentsList.slice(0, 4);
  const myReviews = userReviews.slice(0, 4); // mock: avis laissés par Marie
  const displayName = profile?.displayName || currentUser.name;
  const email = profile?.email || '';
  const initials = (displayName || email || currentUser.avatar)
    .replace(/@.*$/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || currentUser.avatar;

  const memberSince = lang === 'en' ? 'Member since August 2025' : 'Membre depuis août 2025';

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
                <Link href="/workspace">
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
              <p className="font-stat text-3xl text-[#F5F1FA]">24</p>
              <p className="text-xs text-[#A78BCF] mt-1">{t('profile.s.rentals')}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="font-stat text-3xl text-[#F5F1FA]">4.7</p>
              <p className="text-xs text-[#A78BCF] mt-1">{t('profile.s.rating')}</p>
            </div>
            <div className="text-center md:text-left col-span-2 md:col-span-1">
              <p className="font-stat text-3xl text-[#F5F1FA]">{favorites.length}</p>
              <p className="text-xs text-[#A78BCF] mt-1">{t('profile.s.favorites')}</p>
            </div>
          </div>
        </div>

        {/* Avis laissés */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('profile.reviewssub')}</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('profile.reviews')}</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {myReviews.map(r => (
              <div key={r.id} className="bg-[#0F0B22] border border-[#1E1340] rounded-2xl p-5">
                <div className="flex gap-1 mb-2">{Array.from({length:r.stars}).map((_,k)=><Star key={k} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
                <p className="text-sm text-[#B8A8D8] italic leading-relaxed mb-3">« {r.quote} »</p>
                <p className="text-[11px] text-[#4A3D6B]">{lang==='en' ? r.dateEn : r.dateFr}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agents favoris */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('profile.favsub')}</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('profile.favorites')}</h2>
            </div>
            <Link href="/search" className="hidden md:flex items-center gap-1 text-sm text-[#A78BCF] hover:text-[#F5F1FA]">{t('a.viewall')} <ArrowRight className="w-4 h-4"/></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favorites.map(a => (
              <div key={a.id} className="relative">
                <button className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-[#1A152F]/80 backdrop-blur hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center"><Heart className="w-4 h-4 fill-current"/></button>
                <AgentCard agent={a}/>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer/>
    </div>
  );
}

export default ProfilePage;
