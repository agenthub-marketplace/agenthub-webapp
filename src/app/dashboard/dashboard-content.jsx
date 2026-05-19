'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import AgentCard from '@/components/AgentCard';
import { activeRentals, rentalHistory, agentsList, currentUser, userReviews } from '@/lib/mock-data';
import { Download, Edit3, Heart, Star, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

function timeColor(pct) {
  if (pct < 20) return { txt: 'text-[#EF4444]', bg: 'bg-[#EF4444]', urgent: true };
  if (pct < 50) return { txt: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]', urgent: false };
  return { txt: 'text-[#10B981]', bg: 'bg-[#10B981]', urgent: false };
}

function DashboardPage({ profile }) {
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
  return (
    <div className="min-h-screen ">
      <Navbar profile={profile} />
      <div className="container py-10">
        <div className="mb-8">
          <p className="font-label text-xs text-[#A78BCF] mb-2">{t('db.myaccount')}</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#F5F1FA]">{t('db.hello', { name: currentUser.name.split(' ')[0] })}</h1>
          <p className="text-[#D6C5E8] mt-2">{t('db.subtitle')}</p>
        </div>

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
            <Link href="/search"><Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA] h-11 px-6">{t('db.seeall')} <ArrowRight className="w-4 h-4 ml-2"/></Button></Link>
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
          <div className="grid md:grid-cols-3 gap-5">
            {activeRentals.map(r => {
              const pct = (r.timeRemainingHours/r.totalHours)*100;
              const col = timeColor(pct);
              return (
                <div key={r.id} className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5 card-hover">
                  <div className="flex items-start gap-3 mb-4">
                    <AgentAvatar index={r.gradient} size="md"/>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-lg text-[#F5F1FA]">{r.agentName}</h3>
                      <p className="text-xs text-[#A78BCF]">{r.mode}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5"><span className="text-[#A78BCF]">{lang==='en'?'Time remaining':'Temps restant'}</span><span className={`font-stat ${col.txt}`}>{r.timeRemainingHours >= 24 ? `${Math.floor(r.timeRemainingHours/24)}${lang==='en'?'d':'j'} ${r.timeRemainingHours%24}h` : `${r.timeRemainingHours}h`}</span></div>
                    <div className="h-2 rounded-full bg-[#1A152F]"><div className={`h-full rounded-full ${col.bg}`} style={{ width: `${pct}%` }}/></div>
                  </div>
                  {col.urgent && <p className="text-xs text-[#EF4444] mb-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{t('db.expsoon')}</p>}
                  <div className="flex gap-2">
                    <Link href="/workspace" className="flex-1"><Button size="sm" className="w-full bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0">{t('db.openws')}</Button></Link>
                    <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">{t('a.extend')}</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-x-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#251A40]">
              <p className="font-display font-bold">{lang==='en'?'Rental history':'Historique des locations'}</p>
              <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]"><Download className="w-3.5 h-3.5 mr-1"/>{t('cr.exportcsv')}</Button>
            </div>
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]">
                <th className="text-left p-3">{t('db.h.agent')}</th><th>{t('db.h.mode')}</th><th>{t('db.h.dates')}</th><th className="text-right">{t('db.h.price')}</th><th>{t('db.h.rating')}</th><th className="text-right pr-4">{t('db.h.actions')}</th>
              </tr></thead>
              <tbody>
                {rentalHistory.map(h => (
                  <tr key={h.id} className="border-b border-[#251A40] hover:bg-[#1A152F]">
                    <td className="p-3 text-[#F5F1FA] font-display font-semibold">{h.agent}</td>
                    <td className="text-[#D6C5E8]">{h.mode}</td>
                    <td className="text-[#A78BCF]">{h.dates}</td>
                    <td className="text-right font-stat text-[#F5F1FA]">€{h.price}</td>
                    <td><div className="flex gap-0.5">{Array.from({length:h.rating}).map((_,i)=><Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]"/>)}</div></td>
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
          <div className="space-y-6">
            <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5">
              <p className="font-label text-xs text-[#A78BCF] mb-3">{t('db.pm')}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded bg-gradient-to-br from-[#1A1F71] to-[#0066B2] flex items-center justify-center text-white font-bold text-xs">VISA</div>
                  <div>
                    <p className="text-[#F5F1FA] font-display">{t('db.pmend')}</p>
                    <p className="text-xs text-[#A78BCF]">{t('db.pmexp')}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8]">{t('db.payadd')}</Button>
              </div>
            </div>
            <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#251A40]"><p className="font-display font-bold">{t('db.payhist')}</p></div>
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]"><th className="text-left p-3">{t('db.h.dates')}</th><th>{t('db.h.agent')}</th><th className="text-right">{t('db.h.amount')}</th><th className="text-right pr-4">{t('db.h.invoice')}</th></tr></thead>
                <tbody>
                  {rentalHistory.map(h => (
                    <tr key={h.id} className="border-b border-[#251A40]">
                      <td className="p-3 text-[#D6C5E8]">{h.dates}</td>
                      <td className="text-[#F5F1FA]">{h.agent}</td>
                      <td className="text-right font-stat text-[#F5F1FA]">€{h.price}</td>
                      <td className="text-right pr-4"><button className="text-xs text-[#A78BCF] hover:text-[#F5F1FA] inline-flex items-center gap-1"><Download className="w-3 h-3"/>PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}

export default DashboardPage;
