'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useT } from '@/lib/i18n';
import { ArrowLeft, ArrowRight, Check, X, Lock, Upload, Plus, Trash2 } from 'lucide-react';
import { categories } from '@/lib/mock-data';

const STEPS = [
  { id: 1, key: 'Identité' },
  { id: 2, key: 'Ce qu’il fait' },
  { id: 3, key: 'Comportement' },
  { id: 4, key: 'Prompt système' },
  { id: 5, key: 'Modèle IA' },
  { id: 6, key: 'Tarification' },
  { id: 7, key: 'Vérification' },
];

function NewAgentPage() {
  const { t } = useT();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', pitch: '', description: '', category: 'legal', tags: [],
    doesWell: ['', '', ''], doesNot: ['', ''],
    level: 'beginner', tools: [], languages: ['Français'],
    behaviors: { autonomy: 5, length: 5, tone: 5, proactivity: 5, language: 5 },
    prompt: '', model: 'claude-sonnet', apiKey: '',
    pricing: { hour: { on: false, price: 3 }, day: { on: true, price: 8 }, task: { on: false, price: 2 }, project: { on: false, price: 25 } },
    freeDemo: false, demoMessages: 3,
  });
  const [showKey, setShowKey] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const upd = (k, v) => setForm({ ...form, [k]: v });
  const updBeh = (k, v) => setForm({ ...form, behaviors: { ...form.behaviors, [k]: v } });
  const updPrice = (m, k, v) => setForm({ ...form, pricing: { ...form.pricing, [m]: { ...form.pricing[m], [k]: v } } });

  const progress = (step / STEPS.length) * 100;

  const addTag = () => {
    if (tagInput.trim() && form.tags.length < 5) {
      upd('tags', [...form.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const monthlyEarn = () => {
    const avgPrice = Object.values(form.pricing).filter(p => p.on).reduce((s, p) => s + p.price, 0) / Math.max(1, Object.values(form.pricing).filter(p => p.on).length);
    const gross = avgPrice * 20;
    return { gross: gross.toFixed(0), commission: (gross * 0.1).toFixed(0), net: (gross * 0.9).toFixed(0) };
  };
  const earn = monthlyEarn();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8 max-w-3xl">
        <Link href="/creator/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-6"><ArrowLeft className="w-4 h-4"/>Retour au tableau de bord</Link>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold">Étape {step} / {STEPS.length} — <span className="text-[#9B72CF] font-normal">{STEPS[step-1].key}</span></p>
            <p className="font-stat text-sm text-[#7C3AED]">{Math.round(progress)} %</p>
          </div>
          <div className="h-1.5 rounded-full bg-[#1A1130] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#532B88] to-[#7C3AED] transition-all duration-300" style={{ width: `${progress}%` }}/>
          </div>
        </div>

        <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 md:p-8 mb-6">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-4">Identité de l’agent</h2>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 block">Nom <span className="normal-case text-[#7C3AED] ml-1">{form.name.length}/50</span></label>
                <input maxLength={50} value={form.name} onChange={e=>upd('name', e.target.value)} placeholder="Ex. LegalDraft Pro" className="w-full h-11 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 block">Pitch court <span className="normal-case text-[#7C3AED] ml-1">{form.pitch.length}/100</span></label>
                <input maxLength={100} value={form.pitch} onChange={e=>upd('pitch', e.target.value)} placeholder="Une phrase qui décrit ce que fait l’agent" className="w-full h-11 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 block">Description longue <span className="normal-case text-[#7C3AED] ml-1">{form.description.length}/1000</span></label>
                <textarea maxLength={1000} value={form.description} onChange={e=>upd('description', e.target.value)} rows={5} placeholder="Présentez votre agent en détail…" className="w-full px-3 py-2 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] focus:border-[#532B88] focus:outline-none resize-none"/>
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 block">Catégorie</label>
                <select value={form.category} onChange={e=>upd('category', e.target.value)} className="w-full h-11 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] focus:border-[#532B88] focus:outline-none">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 block">Tags ({form.tags.length}/5)</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {form.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1130] border border-[#532B88]/40 text-xs text-[#F4EFFA]">{tag}<button onClick={()=>upd('tags', form.tags.filter((_,k)=>k!==i))}><X className="w-3 h-3"/></button></span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && (e.preventDefault(), addTag())} placeholder="Ajouter un tag" disabled={form.tags.length>=5} className="flex-1 h-10 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none disabled:opacity-50"/>
                  <Button onClick={addTag} disabled={form.tags.length>=5} size="sm" className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0"><Plus className="w-4 h-4"/></Button>
                </div>
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 block">Visuel</label>
                <div className="border-2 border-dashed border-[#2F184B] rounded-xl p-8 text-center hover:border-[#532B88] transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-[#9B72CF] mx-auto mb-2"/>
                  <p className="text-sm text-[#C8B1E4]">Glissez une image ou cliquez pour choisir</p>
                  <p className="text-xs text-[#9B72CF] mt-1">Ou sélectionnez une illustration de la bibliothèque</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-4">Ce que fait l’agent</h2>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-2 block">Ce qu’il fait bien (3 minimum)</label>
                {form.doesWell.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Check className="w-5 h-5 text-[#10B981] mt-2.5 shrink-0"/>
                    <input value={item} onChange={e=>{ const arr=[...form.doesWell]; arr[i]=e.target.value; upd('doesWell', arr); }} className="flex-1 h-10 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
                    {form.doesWell.length > 3 && <button onClick={()=>upd('doesWell', form.doesWell.filter((_,k)=>k!==i))} className="text-[#9B72CF] hover:text-[#EF4444] p-2"><Trash2 className="w-4 h-4"/></button>}
                  </div>
                ))}
                {form.doesWell.length < 5 && <button onClick={()=>upd('doesWell', [...form.doesWell, ''])} className="text-xs text-[#9B72CF] hover:text-[#F4EFFA] flex items-center gap-1"><Plus className="w-3 h-3"/>Ajouter</button>}
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-2 block">Ce qu’il ne fait pas (2 minimum)</label>
                {form.doesNot.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <X className="w-5 h-5 text-[#F59E0B] mt-2.5 shrink-0"/>
                    <input value={item} onChange={e=>{ const arr=[...form.doesNot]; arr[i]=e.target.value; upd('doesNot', arr); }} className="flex-1 h-10 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-sm text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
                  </div>
                ))}
                {form.doesNot.length < 3 && <button onClick={()=>upd('doesNot', [...form.doesNot, ''])} className="text-xs text-[#9B72CF] hover:text-[#F4EFFA] flex items-center gap-1"><Plus className="w-3 h-3"/>Ajouter</button>}
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-2 block">Niveau cible</label>
                <div className="flex gap-2">
                  {[{v:'beginner',l:t('g.beginner')},{v:'intermediate',l:t('g.intermediate')},{v:'advanced',l:t('g.advanced')}].map(o => (
                    <button key={o.v} onClick={()=>upd('level', o.v)} className={`px-4 py-2 rounded-lg border text-sm transition-all ${form.level===o.v ? 'border-[#7C3AED] bg-[#1A1130] text-[#F4EFFA] glow-soft' : 'border-[#2F184B] text-[#9B72CF]'}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-2 block">Outils compatibles</label>
                <div className="flex flex-wrap gap-2">
                  {['Notion','Google Docs','Gmail','Slack','Trello','Excel','Autre'].map(tool => (
                    <button key={tool} onClick={()=>upd('tools', form.tools.includes(tool) ? form.tools.filter(x=>x!==tool) : [...form.tools, tool])} className={`px-3 py-1.5 rounded-full border text-xs transition-all ${form.tools.includes(tool) ? 'border-[#7C3AED] bg-[#1A1130] text-[#F4EFFA]' : 'border-[#2F184B] text-[#9B72CF]'}`}>{tool}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-4">Comportement</h2>
              {[
                { k: 'autonomy', l: 'Autonomie', a: 'Agit seul', b: 'Demande confirmation' },
                { k: 'length', l: 'Longueur de réponse', a: 'Très concise', b: 'Très détaillée' },
                { k: 'tone', l: 'Ton', a: 'Formel', b: 'Décontracté' },
                { k: 'proactivity', l: 'Proactivité', a: 'Réactif', b: 'Proactif' },
                { k: 'language', l: 'Niveau de langue', a: 'Simple', b: 'Technique' },
              ].map(s => (
                <div key={s.k}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#F4EFFA] font-display">{s.l}</span>
                    <span className="font-stat text-sm text-[#7C3AED]">{form.behaviors[s.k]}/10</span>
                  </div>
                  <Slider value={[form.behaviors[s.k]]} onValueChange={v=>updBeh(s.k, v[0])} min={0} max={10} step={1}/>
                  <div className="flex justify-between text-xs text-[#9B72CF] mt-1"><span>{s.a}</span><span>{s.b}</span></div>
                </div>
              ))}
              <div className="bg-[#1A1130] border border-[#532B88]/40 rounded-xl p-4 glow-soft">
                <p className="font-label text-xs text-[#9B72CF] mb-1">Aperçu dynamique</p>
                <p className="text-sm text-[#F4EFFA]">Votre agent répondra de façon {form.behaviors.autonomy>=6?'autonome':'guidée'}, avec un ton {form.behaviors.tone>=6?'décontracté':'formel'}, en réponses {form.behaviors.length>=6?'détaillées':'concises'}.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold mb-2">Prompt système</h2>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1A1130] border border-[#532B88]/40">
                <Lock className="w-4 h-4 text-[#7C3AED] shrink-0"/>
                <p className="text-xs text-[#C8B1E4]">Ce prompt est chiffré en AES-256. Jamais visible par les utilisateurs ou des tiers.</p>
              </div>
              <textarea value={form.prompt} onChange={e=>upd('prompt', e.target.value)} rows={12} placeholder="You are an expert legal assistant..." className="w-full p-4 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] font-mono text-sm focus:border-[#532B88] focus:outline-none resize-none"/>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#9B72CF]">{form.prompt.length} caractères</span>
                <Button variant="outline" className="bg-transparent border-[#532B88] text-[#C8B1E4] hover:bg-[#1A1130]">Tester mon agent</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold mb-4">Modèle IA</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { id: 'claude-sonnet', name: 'Claude Sonnet 4.5', desc: 'Équilibre vitesse / qualité', speed: '⚡⚡⚡', quality: '★★★★' },
                  { id: 'claude-opus', name: 'Claude Opus 4', desc: 'Meilleure qualité', speed: '⚡⚡', quality: '★★★★★' },
                  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Polyvalent et rapide', speed: '⚡⚡⚡⚡', quality: '★★★★' },
                  { id: 'gpt-4o-mini', name: 'GPT-4o mini', desc: 'Économique et rapide', speed: '⚡⚡⚡⚡⚡', quality: '★★★' },
                  { id: 'gemini-pro', name: 'Gemini 2.5 Pro', desc: 'Large contexte', speed: '⚡⚡⚡', quality: '★★★★' },
                ].map(m => (
                  <button key={m.id} onClick={()=>upd('model', m.id)} className={`text-left p-4 rounded-xl border-2 transition-all ${form.model===m.id ? 'border-[#7C3AED] bg-[#1A1130] glow-soft' : 'border-[#2F184B] hover:border-[#532B88]/60'}`}>
                    <p className="font-display font-bold text-[#F4EFFA] mb-1">{m.name}</p>
                    <p className="text-xs text-[#9B72CF] mb-2">{m.desc}</p>
                    <div className="flex justify-between text-xs"><span className="text-[#C8B1E4]">Vitesse {m.speed}</span><span className="text-[#C8B1E4]">{m.quality}</span></div>
                  </button>
                ))}
              </div>
              <div>
                <label className="font-label text-xs text-[#9B72CF] mb-1.5 flex items-center gap-1"><Lock className="w-3 h-3"/>Clé API</label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={e=>upd('apiKey', e.target.value)} placeholder="sk-..." className="w-full h-11 px-3 pr-20 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
                  <button onClick={()=>setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9B72CF]">{showKey?'Masquer':'Afficher'}</button>
                </div>
                <p className="text-xs text-[#9B72CF] mt-2 italic">Les coûts API sont à votre charge. AgentHub ne stocke jamais votre clé en clair.</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-4">Tarification</h2>
              {[
                { id: 'hour', label: t('g.perhour') },
                { id: 'day', label: t('g.perday') },
                { id: 'task', label: t('g.pertask') },
                { id: 'project', label: t('g.perproject') },
              ].map(m => (
                <div key={m.id} className={`p-4 rounded-xl border transition-all ${form.pricing[m.id].on ? 'border-[#7C3AED] bg-[#1A1130]/60' : 'border-[#2F184B] bg-[#0F0A1E]'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display font-semibold">{m.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={form.pricing[m.id].on} onChange={e=>updPrice(m.id, 'on', e.target.checked)} className="sr-only peer"/>
                      <div className="w-11 h-6 bg-[#2F184B] peer-checked:bg-[#532B88] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-5 after:h-5 after:transition-transform peer-checked:after:translate-x-5"/>
                    </label>
                  </div>
                  {form.pricing[m.id].on && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#9B72CF]">€</span>
                      <input type="number" value={form.pricing[m.id].price} onChange={e=>updPrice(m.id, 'price', Number(e.target.value))} className="w-24 h-10 px-3 bg-[#080612] border border-[#2F184B] rounded-lg text-[#F4EFFA] focus:border-[#532B88] focus:outline-none"/>
                    </div>
                  )}
                </div>
              ))}
              <div className="bg-gradient-to-br from-[#532B88]/20 to-[#7C3AED]/10 border border-[#7C3AED]/40 rounded-xl p-5">
                <p className="font-label text-xs text-[#9B72CF] mb-2">Simulateur de revenus</p>
                <p className="text-sm text-[#C8B1E4] mb-2">Si loué <span className="font-stat text-[#F4EFFA]">20 fois/mois</span> :</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>Brut : <span className="font-stat text-[#F4EFFA]">€{earn.gross}</span></span>
                  <span className="text-[#EF4444]">Commission : <span className="font-stat">-€{earn.commission}</span></span>
                  <span>Vos gains : <span className="font-stat text-[#10B981] glow-text">€{earn.net}</span></span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#0F0A1E] border border-[#2F184B]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-semibold">Démo gratuite</p>
                    <p className="text-xs text-[#9B72CF]">Permet aux utilisateurs d’essayer avant location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={form.freeDemo} onChange={e=>upd('freeDemo', e.target.checked)} className="sr-only peer"/>
                    <div className="w-11 h-6 bg-[#2F184B] peer-checked:bg-[#532B88] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-5 after:h-5 after:transition-transform peer-checked:after:translate-x-5"/>
                  </label>
                </div>
                {form.freeDemo && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm text-[#9B72CF]">Nombre de messages :</span>
                    {[2,3,4,5].map(n => (
                      <button key={n} onClick={()=>upd('demoMessages', n)} className={`w-9 h-9 rounded-md border text-sm ${form.demoMessages===n ? 'border-[#7C3AED] bg-[#1A1130] text-[#F4EFFA]' : 'border-[#2F184B] text-[#9B72CF]'}`}>{n}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-bold mb-2">Vérification & soumission</h2>
              <p className="text-[#C8B1E4]">Voici l’aperçu en lecture seule de votre agent.</p>
              <div className="bg-[#080612] border border-[#2F184B] rounded-xl p-5 space-y-3">
                <div><span className="font-label text-xs text-[#9B72CF]">Nom :</span> <span className="text-[#F4EFFA]">{form.name || '—'}</span></div>
                <div><span className="font-label text-xs text-[#9B72CF]">Pitch :</span> <span className="text-[#F4EFFA]">{form.pitch || '—'}</span></div>
                <div><span className="font-label text-xs text-[#9B72CF]">Catégorie :</span> <span className="text-[#F4EFFA]">{categories.find(c=>c.id===form.category)?.name}</span></div>
                <div><span className="font-label text-xs text-[#9B72CF]">Modèle :</span> <span className="text-[#F4EFFA]">{form.model}</span></div>
                <div><span className="font-label text-xs text-[#9B72CF]">Modes actifs :</span> <span className="text-[#F4EFFA]">{Object.entries(form.pricing).filter(([,p])=>p.on).map(([k,p])=>`${k} €${p.price}`).join(', ') || 'aucun'}</span></div>
              </div>
              <div className="p-4 rounded-xl bg-[#1A1130] border border-[#532B88]/40">
                <p className="text-sm text-[#C8B1E4]">Notre équipe révise votre agent sous <span className="font-stat text-[#F4EFFA]">24-48h</span>. Vous serez notifié par email.</p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-12">Soumettre pour validation</Button>
                <Button variant="outline" className="bg-transparent border-[#532B88] text-[#C8B1E4] hover:bg-[#1A1130]">Enregistrer comme brouillon</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={()=>setStep(Math.max(1,step-1))} disabled={step===1} className="bg-transparent border-[#2F184B] text-[#C8B1E4] hover:bg-[#1A1130] disabled:opacity-40"><ArrowLeft className="w-4 h-4 mr-2"/>Précédent</Button>
          {step < STEPS.length && (
            <Button onClick={()=>setStep(Math.min(STEPS.length,step+1))} className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-soft">Suivant <ArrowRight className="w-4 h-4 ml-2"/></Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewAgentPage;
