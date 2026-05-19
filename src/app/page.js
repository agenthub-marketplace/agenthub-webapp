'use client';
import Link from 'next/link';
import { Search, ArrowRight, Wallet, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import { agentsList, testimonials } from '@/lib/mock-data';
import { useState } from 'react';
import { useT } from '@/lib/i18n';

function Page() {
  const { t } = useT();
  const [q, setQ] = useState('');

  return (
    <div className="min-h-screen ">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#8B5CF6]/15 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#F2E9D8]/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '4s' }} />

        <div className="container relative pt-20 sm:pt-16 pb-20 sm:pb-28 text-center px-4">
          <h1 className="font-display font-bold tracking-tight mb-4 sm:mb-6 max-w-6xl mx-auto text-[#F5F1FA] leading-[1.1] text-[28px] sm:text-4xl md:text-6xl lg:text-7xl">
            {t('land.title1')} <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-[#A78BCF] via-[#8B5CF6] to-[#F2E9D8]">{t('land.title2')}</span>
          </h1>
          <p className="text-[14px] sm:text-base md:text-lg text-[#D6C5E8] max-w-2xl mx-auto mb-6 sm:mb-10 leading-snug">{t('land.subtitle')}</p>

          <form onSubmit={(e) => { e.preventDefault(); window.location.href = '/search'; }} className="max-w-2xl mx-auto mb-5">
            <div className="flex flex-col sm:relative gap-3 sm:gap-0">
              <div className="relative">
                <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-[#A78BCF]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('land.searchph')} className="w-full h-[52px] sm:h-16 pl-11 sm:pl-14 pr-4 sm:pr-32 text-[14px] sm:text-base bg-[#110D24] border border-[#251A40] rounded-xl sm:rounded-2xl text-[#F5F1FA] placeholder:text-[#A78BCF]/70 focus:border-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"/>
              </div>
              <button type="submit" className="w-full sm:w-auto sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 h-[48px] sm:h-12 px-5 text-sm bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BCF] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                {t('land.search')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="text-xs sm:text-sm text-[#A78BCF]">{t('land.trusted', { n: '12\u202f400' })}</p>
        </div>
      </section>

      <section className="section-light">
        <div className="container pt-14 pb-2">
          <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-2">{t('land.trending')}</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[#F5F1FA]">{t('land.availableagents')}</h2>
            </div>
            <Link href="/search"><Button className="bg-[#1A152F] hover:bg-[#2D1F50] text-white h-11 px-6 border-0">{t('a.viewall')} <ArrowRight className="w-4 h-4 ml-2"/></Button></Link>
          </div>
        </div>
        <div className="marquee-wrapper marquee-mask overflow-hidden py-10 pb-14">
          <div className="marquee-track gap-4 px-4">
            {[...agentsList, ...agentsList].map((a, i) => (
              <div key={`${a.id}-${i}`} className="w-[300px] shrink-0">
                <AgentCard agent={a} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-12">
          <p className="font-label text-xs text-[#A78BCF] mb-3">{t('land.how')}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#F5F1FA]">{t('land.howtitle')}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: '01', title: t('land.step1.t'), desc: t('land.step1.d'), icon: Search },
            { n: '02', title: t('land.step2.t'), desc: t('land.step2.d'), icon: Wallet },
            { n: '03', title: t('land.step3.t'), desc: t('land.step3.d'), icon: Check },
          ].map((s, i) => (
            <div key={i} className="card-hover bg-elevated border border-[#251A40] rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#251A40] flex items-center justify-center"><s.icon className="w-5 h-5 text-[#A78BCF]" /></div>
                <span className="font-stat text-3xl text-cream/50">{s.n}</span>
              </div>
              <h3 className="font-display text-2xl font-bold mb-2 text-[#F5F1FA]">{s.title}</h3>
              <p className="text-[#D6C5E8] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-light">
        <div className="container py-16">
        <div className="text-center mb-12">
          <p className="font-label text-xs text-[#A78BCF] mb-3">{t('land.reviews')}</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#F5F1FA]">{t('land.usersay')}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((tm,i) => (
            <div key={i} className="card-hover bg-[#110D24] border border-[#251A40] rounded-2xl p-7">
              <div className="flex gap-1 mb-4">{Array.from({length:tm.stars}).map((_,k)=><Star key={k} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
              <p className="text-[#F5F1FA] mb-6 leading-relaxed">« {tm.quote} »</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center font-stat text-white">{tm.avatar}</div>
                <div>
                  <p className="font-display font-semibold text-[#F5F1FA]">{tm.name}</p>
                  <p className="text-xs text-[#A78BCF]">{tm.job}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Page;
