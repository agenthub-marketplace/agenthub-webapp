'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Check, Sparkles, CreditCard } from 'lucide-react';

function OnboardingCreator() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [rentals, setRentals] = useState([20]);
  const [price, setPrice] = useState([8]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const earn = (rentals[0] * price[0] * 0.9).toFixed(0);
  const progress = ((step+1)/5)*100;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0816]">
      <div className="absolute inset-0 hero-gradient opacity-50 pointer-events-none"/>
      <div className="relative h-1.5 bg-[#1A152F]"><div className="h-full bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] transition-all" style={{ width: `${progress}%` }}/></div>

      <div className="relative container max-w-2xl flex-1 flex flex-col py-10">
        <div className="flex items-center justify-between mb-8">
          {step > 0 ? <button onClick={()=>setStep(step-1)} className="flex items-center gap-1 text-sm text-[#A78BCF] hover:text-[#F5F1FA]"><ArrowLeft className="w-4 h-4"/>Précédent</button> : <Link href="/" className="flex items-center gap-1 text-sm text-[#A78BCF] hover:text-[#F5F1FA]"><ArrowLeft className="w-4 h-4"/>Retour</Link>}
          <p className="text-sm text-[#A78BCF]">Étape {step+1} / 5</p>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {step === 0 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Gagnez de l’argent avec vos agents IA</h1>
              <p className="text-[#D6C5E8] mb-8">Simulez vos revenus potentiels</p>
              <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-6 space-y-6">
                <div>
                  <p className="font-label text-xs text-[#A78BCF] mb-2">Locations estimées par mois : <span className="font-stat text-[#F5F1FA] normal-case ml-1">{rentals[0]}</span></p>
                  <Slider value={rentals} onValueChange={setRentals} min={5} max={100} step={5}/>
                </div>
                <div>
                  <p className="font-label text-xs text-[#A78BCF] mb-2">Prix par jour : <span className="font-stat text-[#F5F1FA] normal-case ml-1">€{price[0]}</span></p>
                  <Slider value={price} onValueChange={setPrice} min={2} max={50} step={1}/>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#6B3FA0]/10 border border-[#8B5CF6]/40">
                  <p className="text-sm text-[#D6C5E8] mb-1">Revenus mensuels estimés :</p>
                  <p className="font-stat text-4xl text-[#F5F1FA] glow-text">€{earn} <span className="text-base text-[#A78BCF] font-normal">net (commission 10 %)</span></p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <CreditCard className="w-16 h-16 text-[#8B5CF6] mx-auto mb-6"/>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Connectez votre compte bancaire</h1>
              <p className="text-[#D6C5E8] mb-8">Pour recevoir vos paiements automatiquement</p>
              {!stripeConnected ? (
                <Button onClick={()=>setStripeConnected(true)} className="bg-white text-black hover:opacity-90 h-12 px-6 font-semibold">Se connecter avec Stripe</Button>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30">
                  <Check className="w-5 h-5 text-[#10B981]"/><span className="text-[#10B981] font-display">Stripe connecté</span>
                </div>
              )}
              <p className="text-xs text-[#A78BCF] mt-6">Ou <button className="underline">passer cette étape</button> (vous ne pourrez pas être payé)</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Votre profil créateur</h1>
              <p className="text-[#D6C5E8] mb-8">Présentez-vous à la communauté</p>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[#251A40] rounded-2xl p-8 text-center hover:border-[#6B3FA0] cursor-pointer transition-colors">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#1A152F] flex items-center justify-center mb-2"><Sparkles className="w-6 h-6 text-[#A78BCF]"/></div>
                  <p className="text-sm text-[#D6C5E8]">Ajouter une photo de profil</p>
                </div>
                <input placeholder="Nom affiché" className="w-full h-11 px-4 bg-[#110D24] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/>
                <textarea rows={3} placeholder="Bio courte (200 caractères)" className="w-full p-4 bg-[#110D24] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none resize-none"/>
                <input placeholder="Spécialités (séparées par des virgules)" className="w-full h-11 px-4 bg-[#110D24] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/>
                <input placeholder="URL portfolio (optionnel)" className="w-full h-11 px-4 bg-[#110D24] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Comment ça fonctionne ?</h1>
              <div className="space-y-4 mt-8">
                {[
                  { n:'01', t:'Vous publiez votre agent', d:'Configurez son comportement, son prompt et ses tarifs en 7 étapes.' },
                  { n:'02', t:'Nos équipes valident', d:'Sous 24 à 48h pour garantir la qualité de la marketplace.' },
                  { n:'03', t:'Vous gagnez à chaque location', d:'90 % de chaque transaction vous revient. Versement automatique.' },
                ].map(s => (
                  <div key={s.n} className="flex gap-4 p-5 bg-[#110D24] border border-[#251A40] rounded-2xl">
                    <span className="font-stat text-3xl text-[#8B5CF6]">{s.n}</span>
                    <div><p className="font-display font-bold text-[#F5F1FA] mb-1">{s.t}</p><p className="text-sm text-[#A78BCF]">{s.d}</p></div>
                  </div>
                ))}
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
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-[#F5F1FA]">Vous êtes prêt à publier</h1>
              <p className="text-[#D6C5E8] mb-8">Créez votre premier agent IA</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={()=>router.push('/code/agents/new')} className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0 glow-primary h-12 px-7">Créer mon premier agent <ArrowRight className="w-4 h-4 ml-2"/></Button>
                <Button onClick={()=>router.push('/agenthub/search')} variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F] h-12 px-6">Explorer d’abord</Button>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="mt-8 flex justify-end">
            <Button onClick={()=>setStep(step+1)} className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0 glow-soft h-12 px-7">Suivant <ArrowRight className="w-4 h-4 ml-2"/></Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingCreator;
