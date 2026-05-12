'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AgentAvatar from '@/components/AgentAvatar';
import { activeRentals, generateMockReply } from '@/lib/mock-data';
import { Send, Paperclip, Clock, Share2, Download, Mail, ChevronRight, ArrowLeft, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

const MOCK_REPLIES_FR = [
  'Compris. Je m’occupe de cela immédiatement avec un format clair et professionnel.',
  'Excellente question. Voici comment je l’aborderais en gardant un ton formel et précis.',
  'Je vais produire un livrable structuré. Souhaitez-vous une version courte ou détaillée ?',
];
const MOCK_REPLIES_EN = [
  'Understood. I will handle this immediately with a clear, professional format.',
  'Great question. Here is how I would approach it with a precise, formal tone.',
  'I will produce a structured deliverable. Would you like a short or detailed version?',
];

function timeColor(pct) {
  if (pct < 20) return { txt: 'text-[#EF4444]', bg: 'bg-[#EF4444]', urgent: true };
  if (pct < 50) return { txt: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]', urgent: false };
  return { txt: 'text-[#10B981]', bg: 'bg-[#10B981]', urgent: false };
}

function WorkspacePage() {
  const { t, lang } = useT();
  const [state, setState] = useState('select');
  const [activeAgent, setActiveAgent] = useState(activeRentals[0]);
  const [activeConv, setActiveConv] = useState('h1');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'user', text: 'J’ai besoin d’un contrat de prestation de service pour une mission de design web. Mon client est une startup, mon tarif est de 5\u202f000\u202f€ pour 6 semaines.' },
    { role: 'agent', text: `Voici un contrat de prestation de service professionnel pour votre mission de design web\u00a0:\n\nCONTRAT DE PRESTATION DE SERVICES\n\nEntre\u00a0: [Votre nom] (le Prestataire)\nEt\u00a0: [Nom de la startup] (le Client)\n\n1. OBJET DE LA MISSION\nLe Prestataire s\u2019engage \u00e0 r\u00e9aliser des services de design web comprenant la conception UI/UX, la cr\u00e9ation de maquettes responsive et la production des assets visuels.\n\n2. DUR\u00c9E\nDur\u00e9e de la mission\u00a0: 6 semaines \u00e0 compter de la signature du pr\u00e9sent contrat.\n\n3. R\u00c9MUN\u00c9RATION\nMontant total\u00a0: 5\u202f000\u202f\u20ac (cinq mille euros)\nModalit\u00e9s\u00a0: 30\u202f% \u00e0 la signature, 70\u202f% \u00e0 la livraison.\n\n4. PROPRI\u00c9T\u00c9 INTELLECTUELLE\nL\u2019ensemble des livrables devient la propri\u00e9t\u00e9 exclusive du Client apr\u00e8s r\u00e8glement complet.\n\nSouhaitez-vous modifier ou ajouter des clauses\u00a0?` },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, typing]);

  const HISTORY = [
    { id: 'h1', title: t('lang')==='en' ? 'Service contract' : 'Contrat de service', date: t('lang')==='en' ? 'active' : 'actif', count: 4 },
    { id: 'h2', title: t('lang')==='en' ? 'NDA draft' : 'Brouillon NDA', date: lang==='en' ? '4 days ago' : 'il y a 4 jours', count: 8 },
    { id: 'h3', title: lang==='en' ? 'Privacy policy' : 'Politique confidentialité', date: lang==='en' ? '1 week ago' : 'il y a 1 semaine', count: 15 },
    { id: 'h4', title: lang==='en' ? 'Terms of service' : 'Conditions générales', date: lang==='en' ? '2 weeks ago' : 'il y a 2 semaines', count: 6 },
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages(m => [...m, { role: 'user', text: userText }]);
    setInput('');
    setTimeout(() => setTyping(true), 500);
    setTimeout(() => {
      const replies = lang === 'en' ? MOCK_REPLIES_EN : MOCK_REPLIES_FR;
      const reply = userText.toLowerCase().includes('contrat') || userText.toLowerCase().includes('contract') || userText.toLowerCase().includes('nda')
        ? generateMockReply(userText)
        : replies[Math.floor(Math.random()*replies.length)];
      setMessages(m => [...m, { role: 'agent', text: reply }]);
      setTyping(false);
    }, 2000);
  };

  if (state === 'select') {
    return (
      <div className="min-h-screen ">
        <Navbar />
        <div className="container py-12">
          <div className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">{lang==='en' ? 'Your workspace' : 'Votre espace de travail'}</h1>
            <p className="text-lg text-[#D6C5E8]">{lang==='en' ? 'Select an agent to start working' : 'Sélectionnez un agent pour commencer'}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {activeRentals.map(r => {
              const pct = (r.timeRemainingHours / r.totalHours) * 100;
              const col = timeColor(pct);
              const hh = r.timeRemainingHours;
              const timeText = hh >= 24 ? `${Math.floor(hh/24)}${lang==='en'?'d':'j'} ${hh%24}h` : `${hh}h`;
              return (
                <div key={r.id} className="bg-[#110D24] border border-[#251A40] rounded-2xl p-6 card-hover flex flex-col">
                  <AgentAvatar index={r.gradient} size="lg" className="mb-4" />
                  <h3 className="font-display text-2xl font-bold mb-1 text-[#F5F1FA]">{r.agentName}</h3>
                  <p className="text-sm text-[#A78BCF] mb-4">{r.mode}</p>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-[#A78BCF]">{lang==='en'?'Time remaining':'Temps restant'}</span><span className={`font-stat ${col.txt}`}>{timeText}</span></div>
                    <div className="h-2 rounded-full bg-[#1A152F]"><div className={`h-full rounded-full ${col.bg}`} style={{ width: `${pct}%` }}/></div>
                  </div>
                  <p className="text-xs text-[#A78BCF] mb-5">{lang==='en'?'Last used':'Dernière utilisation'} : {r.lastUsed}</p>
                  {col.urgent && <div className="flex items-center gap-2 text-xs text-[#EF4444] mb-3 p-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30"><Clock className="w-3.5 h-3.5"/>{lang==='en'?'Expiring soon — Extend?':'Expire bientôt — Prolonger ?'}</div>}
                  <Button onClick={() => { setActiveAgent(r); setState('chat'); }} className="w-full bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BCF] text-white border-0">{lang==='en'?'Open workspace':'Ouvrir l’espace de travail'}</Button>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/search" className="text-sm text-[#A78BCF] hover:text-[#F5F1FA]">{lang==='en'?'Rent a new agent':'Louer un nouvel agent'} →</Link>
          </div>
        </div>
      </div>
    );
  }

  const pct = (activeAgent.timeRemainingHours / activeAgent.totalHours) * 100;
  const col = timeColor(pct);
  const hh = activeAgent.timeRemainingHours;
  const timeText = hh >= 24 ? `${Math.floor(hh/24)}${lang==='en'?'d':'j'} ${hh%24}h` : `${hh}h`;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={()=>setMobileSidebarOpen(false)}/>
        )}
        {/* LEFT SIDEBAR — Drawer on mobile */}
        <aside className={`${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative top-0 bottom-0 left-0 w-[280px] lg:w-[260px] shrink-0 bg-[#0A0818] border-r border-[#1E1340] flex flex-col z-[56] lg:z-auto transition-transform duration-200 overflow-y-auto`}>
          {/* Header */}
          <div className="p-3 pt-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={()=>setState('select')} className="flex items-center gap-1.5 text-xs text-[#7B6CA0] hover:text-[#F4EFFA] px-1"><ArrowLeft className="w-3.5 h-3.5"/>{t('wsx.back')}</button>
              <button onClick={()=>setMobileSidebarOpen(false)} className="lg:hidden p-1 text-[#A78BCF] hover:text-[#F5F1FA]"><X className="w-4 h-4"/></button>
            </div>
            <div className="px-1">
              <p className="font-display font-bold text-[16px] text-[#F4EFFA] leading-tight">{activeAgent.agentName}</p>
              <span className="inline-block mt-1.5 text-[10px] font-label px-2 py-0.5 rounded-full bg-[#1A1130] text-[#C8B1E4]">{lang==='en'?'Legal':'Juridique'}</span>
            </div>
          </div>

          {/* Time block */}
          <div className="mx-3 my-3 p-4 bg-[#0F0B22] border border-[#1E1340] rounded-xl">
            <p className="font-label text-[11px] text-[#4A3D6B] mb-2">{t('wsx.timeleft')}</p>
            <p className={`font-stat text-[28px] font-bold leading-none ${col.txt}`}>{timeText}</p>
            <div className="mt-3 h-[6px] rounded-full bg-[#1E1340] overflow-hidden">
              <div className={`h-full rounded-full ${col.bg}`} style={{ width: `${pct}%`, background: pct<20 ? 'linear-gradient(90deg,#EF4444,#DC2626)' : pct<50 ? 'linear-gradient(90deg,#F59E0B,#D97706)' : 'linear-gradient(90deg,#10B981,#059669)' }}/>
            </div>
            <p className="text-[12px] text-[#7B6CA0] mt-2 leading-snug">{t('wsx.expires', { mode: activeAgent.mode, date: lang==='en' ? 'Jun 15' : '15 juin' })}</p>
            <button className="mt-3 w-full text-xs py-1.5 rounded-md border border-[#532B88] text-[#C8B1E4] hover:bg-[#1A1130] hover:text-[#F4EFFA] transition-colors">{t('wsx.extend')}</button>
          </div>

          <div className="h-px bg-[#1E1340] mx-3"/>

          {/* Conversations */}
          <div className="px-3 py-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="font-label text-[11px] text-[#4A3D6B]">{t('wsx.conv')}</p>
              <button className="text-[11px] text-[#7B6CA0] hover:text-[#F4EFFA] px-2 py-0.5 rounded hover:bg-[#1A1130]">{t('wsx.new')}</button>
            </div>
            <div className="space-y-0.5">
              {HISTORY.map(h => {
                const active = activeConv === h.id;
                return (
                  <button key={h.id} onClick={()=>setActiveConv(h.id)} className={`w-full text-left h-10 px-3 rounded-lg flex flex-col justify-center transition-colors ${active ? 'bg-[#14103A] border-l-2 border-l-[#532B88]' : 'hover:bg-[#0F0B22]'}`}>
                    <p className={`text-[14px] truncate leading-tight ${active ? 'text-[#F4EFFA]' : 'text-[#B8A8D8]'}`}>{h.title}</p>
                    <p className="text-[12px] text-[#4A3D6B] leading-tight">{h.date}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-[#1E1340] mx-3"/>

          {/* Share */}
          <div className="px-3 py-4">
            <button onClick={()=>setInviteOpen(!inviteOpen)} className="w-full flex items-center gap-2 text-[14px] text-[#7B6CA0] hover:text-[#F4EFFA] px-1 py-1">
              <Share2 className="w-3.5 h-3.5"/>{t('wsx.invite')}
            </button>
            {inviteOpen && (
              <div className="mt-3 space-y-2 px-1">
                <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder={t('wsx.invemail')} className="w-full px-3 py-2 bg-[#0F0B22] border border-[#1E1340] rounded-md text-xs text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
                <Button size="sm" className="w-full bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0 text-xs h-8"><Mail className="w-3 h-3 mr-1"/>{t('a.invite')}</Button>
                <p className="text-[10px] text-[#4A3D6B] italic">{t('wsx.invitenote')}</p>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER CHAT */}
        <main className="flex-1 flex flex-col bg-[#080612] min-w-0 w-full">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-6 h-14 sm:h-16 border-b border-[#1E1340] bg-[#080612]/90 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button onClick={()=>setMobileSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 text-[#A78BCF] hover:text-[#F5F1FA]" aria-label="Open menu"><Menu className="w-5 h-5"/></button>
              <AgentAvatar index={activeAgent.gradient} size="sm"/>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm sm:text-base text-[#F5F1FA] truncate">{activeAgent.agentName}</p>
                <p className={`text-[10px] sm:hidden ${col.txt}`}>{timeText} {t('wsx.timeleft').toLowerCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button variant="outline" size="sm" className={`h-8 sm:h-9 px-2.5 sm:px-3 text-[11px] sm:text-sm ${col.urgent ? 'bg-[#EF4444] border-[#EF4444] text-white hover:bg-[#DC2626]' : pct<50 ? 'bg-transparent border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10' : 'bg-transparent border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10'}`}>{t('wsx.extend')}</Button>
              <button className="hidden sm:flex items-center gap-1.5 px-3 h-9 bg-[#1A152F] border border-[#251A40] rounded-md text-xs text-[#D6C5E8] hover:border-[#8B5CF6]"><Download className="w-3.5 h-3.5"/>{t('a.export')}</button>
              <button onClick={()=>setHistoryOpen(!historyOpen)} className="hidden lg:flex p-2 h-9 w-9 items-center justify-center bg-[#1A152F] border border-[#251A40] rounded-md text-[#A78BCF] hover:text-[#F5F1FA]"><ChevronRight className={`w-4 h-4 ${historyOpen ? '' : 'rotate-180'}`}/></button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8">
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-2 sm:gap-3'}`}>
                  {m.role === 'agent' && <AgentAvatar index={activeAgent.gradient} size="xs" className="shrink-0 mt-1"/>}
                  <div className={m.role === 'user' ? 'max-w-[85%] sm:max-w-[70%] bg-gradient-to-br from-[#532B88] to-[#6B35A8] text-white rounded-2xl rounded-tr-sm px-4 py-3' : 'max-w-[85%] sm:max-w-[75%] bg-[#0F0B22] border-l-2 border-l-[#8B5CF6] border-y border-r border-[#1E1340] rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3 sm:py-4'}>
                    <pre className="whitespace-pre-wrap font-inter text-[13px] sm:text-sm leading-relaxed break-words">{m.text}</pre>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2 sm:gap-3 justify-start">
                  <AgentAvatar index={activeAgent.gradient} size="xs" className="shrink-0"/>
                  <div className="bg-[#0F0B22] border-l-2 border-l-[#8B5CF6] border-y border-r border-[#1E1340] rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3 sm:py-4 flex items-center">
                    <span className="bounce-dot"/><span className="bounce-dot"/><span className="bounce-dot"/>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#1E1340] bg-[#0A0818] px-3 sm:px-6 py-3 sm:py-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center gap-2 bg-[#0C0924] border border-[#1E1340] rounded-xl px-3 sm:px-4 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#8B5CF6]/20">
                <Paperclip className="w-4 h-4 text-[#A78BCF] shrink-0 hidden sm:block"/>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if (e.key === 'Enter') handleSend(); }} placeholder={t('wsx.ask', { name: activeAgent.agentName })} className="flex-1 bg-transparent h-11 sm:h-12 text-[#F5F1FA] placeholder:text-[#A78BCF]/70 focus:outline-none text-sm min-w-0"/>
                <button onClick={handleSend} disabled={!input.trim()} className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BCF] active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"><Send className="w-4 h-4"/></button>
              </div>
              <p className="text-[10px] text-[#4A3D6B] mt-2 text-center hidden sm:block">{t('wsx.enter')}</p>
            </div>
          </div>
        </main>

        {historyOpen && (
          <aside className="w-72 bg-[#0A0818] border-l border-[#1E1340] hidden lg:flex flex-col">
            <div className="p-4 border-b border-[#1E1340] flex items-center justify-between">
              <p className="font-label text-[10px] text-[#A78BCF]">{t('wsx.history')}</p>
              <button onClick={()=>setHistoryOpen(false)} className="text-[#A78BCF] hover:text-[#F5F1FA]"><ChevronRight className="w-4 h-4"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {HISTORY.map(h => (
                <button key={h.id} onClick={()=>setActiveConv(h.id)} className={`w-full text-left p-3 rounded-xl mb-1 ${activeConv === h.id ? 'bg-[#1A152F] border-l-2 border-l-[#8B5CF6]' : 'hover:bg-[#15112A]'}`}>
                  <p className={`text-sm font-display font-semibold truncate ${activeConv === h.id ? 'text-[#F5F1FA]' : 'text-[#D6C5E8]'}`}>{h.title}</p>
                  <p className="text-[10px] text-[#A78BCF] mt-1">{h.date} · {h.count} {t('wsx.messages')}</p>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default WorkspacePage;
