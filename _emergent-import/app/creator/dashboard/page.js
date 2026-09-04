'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { TrendingUp, Star, Plus, Edit3, Pause, Copy, Download, Mail, Wallet } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { reviewsByAgent } from '@/lib/mock-data';

const revenueData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  amount: Math.round(20 + Math.sin(i / 3) * 25 + Math.random() * 50 + i * 1.5),
}));

const myAgents = [
  { name: 'LegalDraft Pro', status: 'pub', rating: 4.9, rentals: 127, earned: 840 },
  { name: 'ContractHelper', status: 'pub', rating: 4.7, rentals: 89, earned: 540 },
  { name: 'NDAssist', status: 'pen', rating: null, rentals: null, earned: null },
];

const earningTxs = [
  { date: '28 mai 2026', agent: 'LegalDraft Pro', duration: '3 j', gross: 24, commission: 2.4, net: 21.6 },
  { date: '24 mai 2026', agent: 'ContractHelper', duration: 'À la tâche', gross: 2, commission: 0.2, net: 1.8 },
  { date: '20 mai 2026', agent: 'LegalDraft Pro', duration: '7 j', gross: 56, commission: 5.6, net: 50.4 },
  { date: '18 mai 2026', agent: 'LegalDraft Pro', duration: '1 j', gross: 8, commission: 0.8, net: 7.2 },
  { date: '14 mai 2026', agent: 'ContractHelper', duration: 'À la tâche', gross: 2, commission: 0.2, net: 1.8 },
];

function Page() {
  const { t } = useT();
  const [tab, setTab] = useState('agents');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const reviews = reviewsByAgent['legaldraft-pro'];

  const stats = [
    { label: t('cr.earningsmonth'), value: '€1 240', delta: '+18 %', sub: t('cr.vslast') },
    { label: t('cr.activerentnow'), value: '7', delta: null, sub: null },
    { label: t('cr.alltime'), value: '342', delta: null, sub: null },
    { label: t('cr.avgrating'), value: '4,8 / 5', delta: null, sub: null },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-label text-xs text-[#9B72CF] mb-2">{t('nav.creatormode')}</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold">{t('cr.title')}</h1>
            <p className="text-[#C8B1E4] mt-2">{t('cr.subtitle')}</p>
          </div>
          <Link href="/creator/agents/new">
            <Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-11 px-5"><Plus className="w-4 h-4 mr-2"/>{t('cr.create')}</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5 card-hover">
              <p className="font-label text-xs text-[#9B72CF] mb-2">{s.label}</p>
              <p className="font-stat text-3xl text-[#F4EFFA] glow-text">{s.value}</p>
              {s.delta && <p className="text-xs text-[#10B981] mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/>{s.delta} <span className="text-[#9B72CF]">{s.sub}</span></p>}
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">{t('cr.revchart')}</h2>
            <span className="text-xs text-[#9B72CF]">{t('cr.last30')}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#532B88" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2F184B" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="day" stroke="#9B72CF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis stroke="#9B72CF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`}/>
                <Tooltip contentStyle={{ background: '#1A1130', border: '1px solid #532B88', borderRadius: 12, color: '#F4EFFA' }} labelStyle={{ color: '#9B72CF' }} formatter={v => [`€${v}`, 'Revenu']} labelFormatter={l => `Jour ${l}`}/>
                <Line type="monotone" dataKey="amount" stroke="url(#violetGrad)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#7C3AED', strokeWidth: 2, stroke: '#F4EFFA' }} style={{ filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.6))' }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#2F184B] mb-6 overflow-x-auto">
          {[
            { id: 'agents', label: t('cr.myagents') },
            { id: 'earnings', label: t('cr.earnings') },
            { id: 'reviews', label: t('cr.reviews') },
          ].map(tb => (
            <button key={tb.id} onClick={()=>setTab(tb.id)} className={`px-5 py-3 text-sm font-display font-semibold transition-all relative whitespace-nowrap ${tab === tb.id ? 'text-[#F4EFFA]' : 'text-[#9B72CF] hover:text-[#C8B1E4]'}`}>
              {tb.label}
              {tab === tb.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED] glow-soft"/>}
            </button>
          ))}
        </div>

        {tab === 'agents' && (
          <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1130]">
                <tr className="text-[10px] font-label text-[#9B72CF]">
                  <th className="text-left p-4">{t('cr.colname')}</th>
                  <th className="text-left">{t('cr.colstatus')}</th>
                  <th className="text-right">{t('cr.colrating')}</th>
                  <th className="text-right">{t('cr.colrentals')}</th>
                  <th className="text-right">{t('cr.colearned')}</th>
                  <th className="text-right pr-4">{t('cr.colactions')}</th>
                </tr>
              </thead>
              <tbody>
                {myAgents.map(a => (
                  <tr key={a.name} className="border-t border-[#2F184B]">
                    <td className="p-4 text-[#F4EFFA] font-display font-semibold">{a.name}</td>
                    <td>
                      {a.status === 'pub' && <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">{t('cr.status.pub')}</span>}
                      {a.status === 'pen' && <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]">{t('cr.status.pen')}</span>}
                      {a.status === 'sus' && <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]">{t('cr.status.sus')}</span>}
                    </td>
                    <td className="text-right font-stat text-[#F4EFFA]">{a.rating ? <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>{a.rating}</span> : '—'}</td>
                    <td className="text-right font-stat text-[#F4EFFA]">{a.rentals ?? '—'}</td>
                    <td className="text-right font-stat text-[#F4EFFA]">{a.earned ? `€${a.earned}` : '—'}</td>
                    <td className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Link href={`/creator/agents/${a.name.toLowerCase().replace(/\s+/g,'-')}/edit`} className="p-2 rounded-md hover:bg-[#1A1130] text-[#9B72CF] hover:text-[#F4EFFA]" title={t('cr.edit')}><Edit3 className="w-4 h-4"/></Link>
                        <button className="p-2 rounded-md hover:bg-[#1A1130] text-[#9B72CF] hover:text-[#F59E0B]" title={t('cr.suspend')}><Pause className="w-4 h-4"/></button>
                        <button className="p-2 rounded-md hover:bg-[#1A1130] text-[#9B72CF] hover:text-[#F4EFFA]" title={t('cr.duplicate')}><Copy className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6">
                <p className="font-label text-xs text-[#9B72CF] mb-2">{t('cr.balance')}</p>
                <p className="font-stat text-4xl text-[#F4EFFA] glow-text mb-4">€1 240</p>
                <Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-soft"><Wallet className="w-4 h-4 mr-2"/>{t('cr.withdraw')}</Button>
              </div>
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6">
                <p className="font-label text-xs text-[#9B72CF] mb-2">{t('cr.pending')}</p>
                <p className="font-stat text-4xl text-[#F4EFFA] mb-2">€89</p>
                <p className="text-xs text-[#9B72CF]">{t('cr.processing')}</p>
              </div>
            </div>
            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2F184B]">
                <h3 className="font-display font-bold">{t('cr.tx')}</h3>
                <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#1A1130] hover:bg-[#2F184B] text-[#C8B1E4]"><Download className="w-3.5 h-3.5"/>{t('cr.exportcsv')}</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#1A1130]"><tr className="text-[10px] font-label text-[#9B72CF]">
                  <th className="text-left p-3">Date</th><th className="text-left">Agent</th><th>Durée</th><th className="text-right">Brut</th><th className="text-right">Commission (10 %)</th><th className="text-right pr-4">Net</th>
                </tr></thead>
                <tbody>
                  {earningTxs.map((tx,i) => (
                    <tr key={i} className="border-t border-[#2F184B]">
                      <td className="p-3 text-[#C8B1E4]">{tx.date}</td>
                      <td className="text-[#F4EFFA]">{tx.agent}</td>
                      <td className="text-center text-[#C8B1E4]">{tx.duration}</td>
                      <td className="text-right font-stat text-[#F4EFFA]">€{tx.gross}</td>
                      <td className="text-right font-stat text-[#EF4444]">-€{tx.commission}</td>
                      <td className="text-right pr-4 font-stat text-[#10B981]">€{tx.net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#532B88] to-[#7C3AED] flex items-center justify-center font-stat text-sm text-white">{r.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-display font-semibold">{r.author}</p>
                      <span className="text-xs text-[#9B72CF]">{r.date} · {r.mode}</span>
                    </div>
                    <div className="flex gap-0.5 mb-1">{Array.from({length:r.stars}).map((_,i)=><Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
                  </div>
                </div>
                <p className="text-[#C8B1E4] mb-3">{r.text}</p>
                {replyingTo === r.id ? (
                  <div className="flex gap-2">
                    <input value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Votre réponse..." className="flex-1 px-3 py-2 bg-[#080612] border border-[#2F184B] rounded-md text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
                    <Button size="sm" onClick={()=>{ setReplyingTo(null); setReplyText(''); }} className="bg-[#532B88] hover:bg-[#7C3AED] text-white">{t('cr.reply')}</Button>
                  </div>
                ) : (
                  <button onClick={()=>setReplyingTo(r.id)} className="text-xs text-[#9B72CF] hover:text-[#F4EFFA] inline-flex items-center gap-1"><Mail className="w-3 h-3"/>{t('cr.reply')}</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default Page;
