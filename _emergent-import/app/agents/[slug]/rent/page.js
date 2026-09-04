'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getAgentBySlug } from '@/lib/mock-data';
import { Check, Lock, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useT } from '@/lib/i18n';

function RentPage() {
  const { t } = useT();
  const { slug } = useParams();
  const router = useRouter();
  const agent = getAgentBySlug(slug);
  const [mode, setMode] = useState('day');
  const [duration, setDuration] = useState(3);
  const prices = { hour: 3, day: 8, task: 2, project: 25 };
  const total = useMemo(() => mode === 'day' ? prices.day * duration : prices[mode], [mode, duration]);

  const modes = [
    { id: 'hour', title: t('rent.h.title'), price: 3, desc: t('rent.h.d'), dur: t('rent.h.dur') },
    { id: 'day', title: t('rent.d.title'), price: 8, desc: t('rent.d.d'), dur: t('rent.d.dur') },
    { id: 'task', title: t('rent.t.title'), price: 2, desc: t('rent.t.d'), dur: t('rent.t.dur') },
    { id: 'project', title: t('rent.p.title'), price: 25, desc: t('rent.p.d'), dur: t('rent.p.dur') },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-4xl">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t('rent.title', { name: agent.name })}</h1>
        <p className="text-[#9B72CF] mb-8">{t('rent.sub')}</p>

        <h2 className="font-display text-xl font-bold mb-4">{t('rent.step1')}</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {modes.map(m => (
            <button key={m.id} onClick={()=>setMode(m.id)} className={`text-left p-5 rounded-2xl border-2 transition-all bg-[#0F0A1E] ${mode === m.id ? 'border-[#7C3AED] glow-soft' : 'border-[#2F184B] hover:border-[#532B88]/50'}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-bold text-lg">{m.title}</h3>
                {mode === m.id && <div className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center"><Check className="w-3 h-3 text-white"/></div>}
              </div>
              <p className="font-stat text-2xl text-[#F4EFFA] mb-2">€{m.price}</p>
              <p className="text-xs text-[#C8B1E4] mb-1">{m.desc}</p>
              <p className="text-[10px] font-label text-[#9B72CF]">{m.dur}</p>
            </button>
          ))}
        </div>

        {mode === 'day' && (
          <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl p-5 mb-6">
            <p className="font-label text-xs text-[#9B72CF] mb-3">{t('ap.duration')} : <span className="font-stat normal-case text-[#F4EFFA] ml-1">{duration} {t('ap.days')}</span></p>
            <Slider value={[duration]} onValueChange={v=>setDuration(v[0])} min={1} max={14} step={1}/>
          </div>
        )}

        <h2 className="font-display text-xl font-bold mb-4">{t('rent.step2')}</h2>
        <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mb-6">
          <div className="flex justify-between text-sm mb-2"><span className="text-[#9B72CF]">{t('rent.agent')}</span><span className="text-[#F4EFFA]">{agent.name}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-[#9B72CF]">{t('rent.mode')}</span><span className="text-[#F4EFFA]">{mode === 'day' ? `${duration} ${t('ap.days')}` : modes.find(m=>m.id===mode).title}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-[#9B72CF]">{t('rent.base')}</span><span className="text-[#F4EFFA]">€{total}</span></div>
          <div className="border-t border-[#2F184B] mt-3 pt-3 flex justify-between"><span className="font-display font-bold">{t('rent.totalttc')}</span><span className="font-stat text-2xl text-[#F4EFFA] glow-text">€{total}</span></div>
        </div>

        <h2 className="font-display text-xl font-bold mb-4">{t('rent.step3')}</h2>
        <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button className="py-3 rounded-lg bg-black text-white text-sm font-semibold border border-[#2F184B] hover:border-[#532B88] transition-colors">Apple Pay</button>
            <button className="py-3 rounded-lg bg-white text-black text-sm font-semibold hover:opacity-90 transition-opacity">Google Pay</button>
          </div>
          <div className="text-center text-xs text-[#9B72CF]">— {t('rent.payother')} —</div>
          <div>
            <label className="text-xs font-label text-[#9B72CF] mb-1.5 block">{t('rent.cardnum')}</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B72CF]"/>
              <input placeholder="4242 4242 4242 4242" className="w-full h-11 pl-10 pr-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] placeholder:text-[#9B72CF]/50 focus:border-[#532B88] focus:outline-none"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-label text-[#9B72CF] mb-1.5 block">{t('rent.expiry')}</label><input placeholder="MM/AA" className="w-full h-11 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] placeholder:text-[#9B72CF]/50 focus:border-[#532B88] focus:outline-none"/></div>
            <div><label className="text-xs font-label text-[#9B72CF] mb-1.5 block">CVC</label><input placeholder="123" className="w-full h-11 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] placeholder:text-[#9B72CF]/50 focus:border-[#532B88] focus:outline-none"/></div>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#C8B1E4] cursor-pointer">
            <input type="checkbox" className="accent-[#532B88]"/>{t('rent.savecard')}
          </label>
        </div>

        <Button onClick={()=>router.push('/rental/confirmation')} className="w-full bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-14 text-base font-semibold">{t('rent.complete')} — €{total}</Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#9B72CF] mt-4"><Lock className="w-3 h-3"/><ShieldCheck className="w-3 h-3"/>{t('rent.secure')}</p>
      </div>
    </div>
  );
}

export default RentPage;
