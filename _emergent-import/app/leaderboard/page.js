'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentCard from '@/components/AgentCard';
import AgentAvatar from '@/components/AgentAvatar';
import { ShieldCheck, ArrowRight, Trophy, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agentsList, categories } from '@/lib/mock-data';
import { useT } from '@/lib/i18n';

const LB = [
  { rank: 1, name: 'LegalDraft Pro', slug: 'legaldraft-pro', creator: 'Thomas R.', catId: 'legal', rentals: 847, rating: 4.9, verified: true, gradient: 0 },
  { rank: 2, name: 'ContentFlow', slug: 'contentflow', creator: 'Emma L.', catId: 'writing', rentals: 724, rating: 4.9, verified: true, gradient: 3 },
  { rank: 3, name: 'MailMaster', slug: 'mailmaster', creator: 'Marc D.', catId: 'comm', rentals: 651, rating: 4.7, verified: true, gradient: 2 },
  { rank: 4, name: 'MarketingPulse', slug: 'marketingpulse', creator: 'Laura S.', catId: 'marketing', rentals: 589, rating: 4.9, verified: false, gradient: 1 },
  { rank: 5, name: 'DataInsight', slug: 'datainsight', creator: 'Sophia K.', catId: 'analysis', rentals: 512, rating: 4.8, verified: false, gradient: 1 },
  { rank: 6, name: 'CodeHelper', slug: 'codehelper', creator: 'Alex C.', catId: 'dev', rentals: 478, rating: 4.8, verified: false, gradient: 5 },
  { rank: 7, name: 'FinanceAdvisor', slug: 'financeadvisor', creator: 'Nicolas B.', catId: 'finance', rentals: 445, rating: 4.8, verified: true, gradient: 0 },
  { rank: 8, name: 'TranslatePro', slug: 'translatepro', creator: 'Marie P.', catId: 'translation', rentals: 398, rating: 4.7, verified: false, gradient: 6 },
  { rank: 9, name: 'StrategyBot', slug: 'strategybot', creator: 'Paul M.', catId: 'strategy', rentals: 367, rating: 4.6, verified: false, gradient: 4 },
  { rank: 10, name: 'HRAssist', slug: 'hrassist', creator: 'Julie F.', catId: 'hr', rentals: 312, rating: 4.5, verified: false, gradient: 7 },
];

function LeaderboardPage() {
  const { t } = useT();
  const params = useSearchParams();
  const initialCat = params?.get('cat') || 'all';
  const [period, setPeriod] = useState('month');
  const [cat, setCat] = useState(initialCat);
  const [view, setView] = useState('table');

  const filtered = cat === 'all' ? LB : LB.filter(r => r.catId === cat);
  const top3 = filtered.slice(0, 3);
  const catName = (id) => categories.find(c => c.id === id)?.name || id;

  return (
    <div className="min-h-screen ">
      <Navbar />
      <div className="container py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A152F] border border-[#532B88]/40 mb-5">
            <Trophy className="w-3.5 h-3.5 text-[#8B5CF6]"/>
            <span className="text-xs text-[#8B5CF6] font-label">{t('lb.updated')}</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-[#F5F1FA] mb-3">{t('lb.title')}</h1>
          <p className="text-lg text-[#D6C5E8] max-w-2xl mx-auto">{t('lb.sub')}</p>
        </div>

        {/* Filters - pills only */}
        <div className="flex flex-wrap items-center gap-3 mb-10 justify-center">
          <div className="flex gap-1 p-1 bg-[#110D24] border border-[#251A40] rounded-xl">
            {[{v:'week',l:t('lb.week')},{v:'month',l:t('lb.month')}].map(p => (
              <button key={p.v} onClick={()=>setPeriod(p.v)} className={`px-5 py-2 rounded-lg text-sm font-display font-medium transition-all ${period===p.v ? 'bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white' : 'text-[#A78BCF] hover:text-[#F5F1FA]'}`}>{p.l}</button>
            ))}
          </div>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="bg-[#110D24] border border-[#251A40] rounded-xl px-4 py-2 text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none">
            <option value="all">{t('lb.allcat')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1 p-1 bg-[#110D24] border border-[#251A40] rounded-xl">
            <button onClick={()=>setView('table')} className={`p-2 rounded-lg ${view==='table' ? 'bg-[#251A40] text-[#F5F1FA]' : 'text-[#A78BCF]'}`}><List className="w-4 h-4"/></button>
            <button onClick={()=>setView('cards')} className={`p-2 rounded-lg ${view==='cards' ? 'bg-[#251A40] text-[#F5F1FA]' : 'text-[#A78BCF]'}`}><LayoutGrid className="w-4 h-4"/></button>
          </div>
        </div>

        {/* Podium top 3 - numbers only */}
        {top3.length >= 3 && (
          <div className="relative mb-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A152F] via-[#15112A] to-[#0F0B22] border border-[#251A40] p-8 md:p-12">
            <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"/>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#8B5CF6]/8 rounded-full blur-3xl"/>
            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-3xl mx-auto">
              {/* 2nd */}
              <Link href={`/agents/${top3[1].slug}`} className="card-hover bg-[#0F0B22] border border-[#2F184B] rounded-2xl p-5 text-center group order-2 sm:order-1">
                <p className="font-display font-bold text-[#C8B1E4]" style={{ fontSize: '36px', lineHeight: 1 }}>2</p>
                <div className="flex justify-center my-3"><AgentAvatar index={top3[1].gradient} size="md"/></div>
                <p className="font-display font-bold text-[#F4EFFA] mb-1 break-words">{top3[1].name}</p>
                <p className="text-xs text-[#A78BCF]">{top3[1].rentals} {t('lb.col.rentals').toLowerCase()}</p>
                <p className="font-stat text-sm text-[#F59E0B] mt-1">★ {top3[1].rating}</p>
              </Link>
              {/* 1st */}
              <Link href={`/agents/${top3[0].slug}`} className="card-hover bg-[#1A1130] border border-[#532B88] rounded-2xl p-6 text-center glow-soft sm:-mt-4 order-1 sm:order-2" style={{ boxShadow: '0 0 32px rgba(139,92,246,0.25)' }}>
                <p className="font-display font-bold text-[#F4EFFA]" style={{ fontSize: '48px', lineHeight: 1 }}>1</p>
                <div className="flex justify-center my-3"><AgentAvatar index={top3[0].gradient} size="lg"/></div>
                <div className="flex items-center justify-center gap-1.5 mb-1 flex-wrap">
                  <p className="font-display font-bold text-lg text-[#F5F1FA] break-words">{top3[0].name}</p>
                  {top3[0].verified && <ShieldCheck className="w-4 h-4 text-[#10B981]"/>}
                </div>
                <p className="text-xs text-[#A78BCF] mb-2">{lang_par(t)} {top3[0].creator}</p>
                <p className="font-stat text-2xl text-[#F59E0B] mb-1">★ {top3[0].rating}</p>
                <p className="text-sm text-[#D6C5E8]"><span className="font-stat text-[#F5F1FA]">{top3[0].rentals}</span> {t('lb.col.rentals').toLowerCase()}</p>
              </Link>
              {/* 3rd */}
              <Link href={`/agents/${top3[2].slug}`} className="card-hover bg-[#0F0B22] border border-[#2F184B] rounded-2xl p-5 text-center group order-3">
                <p className="font-display font-bold text-[#C8B1E4]" style={{ fontSize: '36px', lineHeight: 1 }}>3</p>
                <div className="flex justify-center my-3"><AgentAvatar index={top3[2].gradient} size="md"/></div>
                <p className="font-display font-bold text-[#F4EFFA] mb-1 break-words">{top3[2].name}</p>
                <p className="text-xs text-[#A78BCF]">{top3[2].rentals} {t('lb.col.rentals').toLowerCase()}</p>
                <p className="font-stat text-sm text-[#F59E0B] mt-1">★ {top3[2].rating}</p>
              </Link>
            </div>
          </div>
        )}

        {/* Table or Cards - simplified columns */}
        {view === 'table' ? (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]">
                  <th className="text-left p-4">{t('lb.col.rank')}</th>
                  <th className="text-left">{t('lb.col.agent')}</th>
                  <th className="text-left">{t('lb.col.creator')}</th>
                  <th className="text-left">{t('lb.col.cat')}</th>
                  <th className="text-right">{t('lb.col.rentals')}</th>
                  <th className="text-right pr-4">{t('lb.col.rating')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.rank} className={`border-b border-[#251A40] hover:bg-[#1A152F] ${row.rank===1 ? 'bg-[#1A1130] border-l-2 border-l-[#532B88]' : ''}`}>
                    <td className="p-4 font-stat text-[#F5F1FA]">{row.rank}</td>
                    <td>
                      <Link href={`/agents/${row.slug}`} className="flex items-center gap-2 hover:text-[#8B5CF6]">
                        <AgentAvatar index={row.gradient} size="xs"/>
                        <span className="font-display font-semibold text-[#F5F1FA]">{row.name}</span>
                        {row.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]"/>}
                      </Link>
                    </td>
                    <td className="text-[#A78BCF]">{row.creator}</td>
                    <td><span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A152F] text-[#D6C5E8]">{catName(row.catId)}</span></td>
                    <td className="text-right font-stat text-[#F5F1FA]">{row.rentals}</td>
                    <td className="text-right pr-4 font-stat text-[#F5F1FA]">★ {row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(row => {
              const a = agentsList.find(x => x.slug === row.slug) || agentsList[0];
              return (
                <div key={row.rank} className="relative">
                  <div className={`absolute -top-2 -left-2 z-10 w-10 h-10 rounded-full flex items-center justify-center font-stat text-base font-bold ${row.rank===1?'bg-[#1A1130] text-[#F4EFFA] border border-[#532B88] glow-soft':'bg-[#0F0B22] text-[#C8B1E4] border border-[#2F184B]'}`}>{row.rank}</div>
                  <AgentCard agent={a}/>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Bottom */}
        <div className="mt-12 text-center bg-gradient-to-br from-[#1A152F] to-[#110D24] border border-[#251A40] rounded-2xl p-8">
          <h3 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA] mb-2">{t('lb.join')}</h3>
          <p className="text-[#A78BCF] mb-5">{t('lb.joinsub')}</p>
          <Link href="/creator/agents/new"><Button className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0 h-11 px-6">{t('lb.createmine')} <ArrowRight className="w-4 h-4 ml-2"/></Button></Link>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

function lang_par(t) { return t('lang') === 'en' ? 'by' : 'par'; }

export default LeaderboardPage;
