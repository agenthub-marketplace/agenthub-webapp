'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, PenLine, BarChart3, Megaphone, Code2, Briefcase, Sparkles, Target, Scale } from 'lucide-react';
import { agentsList } from '@/lib/mock-data';
import AgentAvatar from '@/components/AgentAvatar';

const STEPS = ['Métier', 'Besoins', 'Niveau IA', 'Outils', 'Prêt'];
const JOBS = [
  { id: 'writer', label: 'Rédacteur freelance', icon: PenLine },
  { id: 'designer', label: 'Graphiste', icon: Sparkles },
  { id: 'consultant', label: 'Consultant indépendant', icon: Briefcase },
  { id: 'dev', label: 'Développeur', icon: Code2 },
  { id: 'entrepreneur', label: 'Entrepreneur', icon: Target },
  { id: 'marketing', label: 'Pro du marketing', icon: Megaphone },
  { id: 'legal', label: 'Juridique / Finance', icon: Scale },
  { id: 'other', label: 'Autre', icon: BarChart3 },
];
const NEEDS = ['Rédaction & copywriting','Analyse & recherche','Emails & communication','Marketing & réseaux sociaux','Stratégie','Développement & code','Traduction','Service client','Autre'];
const LEVELS = [
  { id: 'beginner', t: 'Débutant complet', d: 'Je n’ai jamais utilisé d’outil IA' },
  { id: 'curious', t: 'Curieux', d: 'J’ai utilisé ChatGPT quelques fois' },
  { id: 'regular', t: 'Utilisateur régulier', d: 'J’utilise des outils IA régulièrement' },
  { id: 'advanced', t: 'Avancé', d: 'Je construis ou personnalise des outils IA' },
];
const TOOLS = ['Notion','Google Docs','Gmail','Slack','Trello','Figma','Excel','Autre'];

function OnboardingUser() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [level, setLevel] = useState('');
  const [tools, setTools] = useState([]);
  const progress = ((step+1)/STEPS.length)*100;
  const recommended = agentsList.slice(0,3);

  const canNext = () => {
    if (step === 0) return jobs.length > 0;
    if (step === 1) return needs.length > 0;
    if (step === 2) return level !== '';
    if (step === 3) return tools.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0816]">
      <div className="absolute inset-0 hero-gradient opacity-50 pointer-events-none"/>
      <div className="relative h-1.5 bg-[#1A152F]"><div className="h-full bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] transition-all duration-500" style={{ width: `${progress}%` }}/></div>

      <div className="relative container max-w-2xl flex-1 flex flex-col py-10">
        <div className="flex items-center justify-between mb-8">
          {step > 0 ? <button onClick={()=>setStep(step-1)} className="flex items-center gap-1 text-sm text-[#A78BCF] hover:text-[#F5F1FA]"><ArrowLeft className="w-4 h-4"/>Précédent</button> : <Link href="/" className="flex items-center gap-1 text-sm text-[#A78BCF] hover:text-[#F5F1FA]"><ArrowLeft className="w-4 h-4"/>Retour</Link>}
          <p className="text-sm text-[#A78BCF]">Étape {step+1} / {STEPS.length}</p>
          {step < STEPS.length - 1 && <Link href="/agenthub/dashboard" className="text-sm text-[#A78BCF] hover:text-[#F5F1FA]">Passer</Link>}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {step === 0 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Qu’est-ce qui vous décrit le mieux ?</h1>
              <p className="text-[#D6C5E8] mb-8">Sélectionnez un ou plusieurs profils</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {JOBS.map(j => {
                  const sel = jobs.includes(j.id);
                  return (
                    <button key={j.id} onClick={()=>setJobs(sel ? jobs.filter(x=>x!==j.id) : [...jobs, j.id])} className={`p-5 rounded-2xl border-2 text-left transition-all ${sel ? 'border-[#8B5CF6] bg-[#1A152F] glow-soft' : 'border-[#251A40] bg-[#110D24] hover:border-[#6B3FA0]'}`}>
                      <j.icon className={`w-6 h-6 mb-3 ${sel ? 'text-[#8B5CF6]' : 'text-[#A78BCF]'}`}/>
                      <p className="font-display font-semibold text-sm text-[#F5F1FA]">{j.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">De quoi avez-vous besoin ?</h1>
              <p className="text-[#D6C5E8] mb-8">Sélectionnez tout ce qui s’applique</p>
              <div className="flex flex-wrap gap-3">
                {NEEDS.map(n => {
                  const sel = needs.includes(n);
                  return (
                    <button key={n} onClick={()=>setNeeds(sel ? needs.filter(x=>x!==n) : [...needs, n])} className={`px-5 py-3 rounded-full border-2 transition-all font-display font-medium ${sel ? 'border-[#8B5CF6] bg-[#1A152F] text-[#F5F1FA] glow-soft' : 'border-[#251A40] bg-[#110D24] text-[#A78BCF] hover:border-[#6B3FA0]'}`}>{n}</button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Votre aisance avec l’IA ?</h1>
              <p className="text-[#D6C5E8] mb-8">Choisissez le niveau qui vous correspond</p>
              <div className="space-y-3">
                {LEVELS.map(l => {
                  const sel = level === l.id;
                  return (
                    <button key={l.id} onClick={()=>setLevel(l.id)} className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${sel ? 'border-[#8B5CF6] bg-[#1A152F] glow-soft' : 'border-[#251A40] bg-[#110D24] hover:border-[#6B3FA0]'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-bold text-lg text-[#F5F1FA]">{l.t}</p>
                          <p className="text-sm text-[#A78BCF] mt-1">{l.d}</p>
                        </div>
                        {sel && <div className="w-6 h-6 rounded-full bg-[#8B5CF6] flex items-center justify-center"><Check className="w-4 h-4 text-white"/></div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Vos outils quotidiens ?</h1>
              <p className="text-[#D6C5E8] mb-8">Personnalisons votre expérience</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TOOLS.map(t => {
                  const sel = tools.includes(t);
                  return (
                    <button key={t} onClick={()=>setTools(sel ? tools.filter(x=>x!==t) : [...tools, t])} className={`p-4 rounded-xl border-2 transition-all ${sel ? 'border-[#8B5CF6] bg-[#1A152F] glow-soft' : 'border-[#251A40] bg-[#110D24] hover:border-[#6B3FA0]'}`}>
                      <p className={`font-display font-semibold text-sm ${sel ? 'text-[#F5F1FA]' : 'text-[#D6C5E8]'}`}>{t}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-[#8B5CF6] rounded-full blur-2xl opacity-50"/>
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center glow-primary">
                  <svg viewBox="0 0 50 50" className="w-12 h-12"><polyline className="checkmark-draw" points="12,26 22,36 38,16" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Votre profil est prêt</h1>
              <p className="text-[#D6C5E8] mb-8">Voici 3 agents recommandés pour vous</p>
              <div className="grid sm:grid-cols-3 gap-3 mb-8 text-left">
                {recommended.map(a => (
                  <Link key={a.id} href={`/agenthub/agents/${a.slug}`} className="bg-[#110D24] border border-[#251A40] rounded-xl p-4 card-hover">
                    <AgentAvatar index={a.gradient} size="md" className="mb-3"/>
                    <p className="font-display font-bold text-sm text-[#F5F1FA]">{a.name}</p>
                    <p className="text-xs text-[#A78BCF]">{a.pitch}</p>
                  </Link>
                ))}
              </div>
              <Button onClick={()=>router.push('/agenthub/search')} className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0 glow-primary h-12 px-8">Commencer à explorer <ArrowRight className="w-4 h-4 ml-2"/></Button>
            </div>
          )}
        </div>

        {step < STEPS.length - 1 && (
          <div className="mt-8 flex justify-end">
            <Button onClick={()=>setStep(step+1)} disabled={!canNext()} className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0 glow-soft h-12 px-7 disabled:opacity-40">Suivant <ArrowRight className="w-4 h-4 ml-2"/></Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingUser;
