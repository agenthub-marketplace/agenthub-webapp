'use client';
import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import { getAgentBySlug, agentDiscussions, leaderboard, reviewsByAgent, creatorProfile } from '@/lib/mock-data';
import { Star, ShieldCheck, TrendingUp, Heart, Share2, Check, AlertTriangle, MessageSquare, ChevronUp, Trophy, Medal, Award, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useT } from '@/lib/i18n';

function Page() {
  const { t } = useT();
  const { slug } = useParams();
  const agent = getAgentBySlug(slug);
  const [tab, setTab] = useState('about');
  const [openExample, setOpenExample] = useState(null);
  const [mode, setMode] = useState('day');
  const [duration, setDuration] = useState(3);
  const [filterStars, setFilterStars] = useState(0);
  const [expandedDiscussion, setExpandedDiscussion] = useState(null);
  const [behaviors, setBehaviors] = useState({ autonomy: 7, length: 8, tone: 9, proactivity: 4, language: 7 });

  const prices = { hour: 3, day: 8, task: 2, project: 25 };
  const totalPrice = useMemo(() => {
    if (mode === 'hour' || mode === 'task') return prices[mode];
    if (mode === 'day') return prices.day * duration;
    if (mode === 'project') return prices.project;
    return prices.day;
  }, [mode, duration]);

  const reviews = reviewsByAgent[agent.slug] || reviewsByAgent['legaldraft-pro'];
  const filteredReviews = filterStars === 0 ? reviews : reviews.filter(r => r.stars === filterStars);
  const ratingDist = [5,4,3,2,1].map(s => ({ s, count: reviews.filter(r => r.stars === s).length }));

  const tabs = [
    { id: 'about', label: t('ap.about') },
    { id: 'behavior', label: t('ap.behavior') },
    { id: 'reviews', label: t('ap.reviews') },
    { id: 'community', label: t('ap.community') },
  ];

  const behaviorSummary = () => {
    const auto = behaviors.autonomy >= 6 ? t('ap.autonomously') : t('ap.withconfirm');
    const len = behaviors.length >= 6 ? t('ap.detailed') : t('ap.concise');
    const tone = behaviors.tone >= 6 ? t('ap.formal') : t('ap.casual');
    return t('ap.behaviorsummary', { auto, len, tone });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <AgentAvatar index={agent.gradient} size="xl" />
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  {agent.certified && <span className="flex items-center gap-1 text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#10B981]/30 text-[#10B981]"><ShieldCheck className="w-3 h-3"/>{t('g.certified')}</span>}
                  {agent.trending && <span className="flex items-center gap-1 text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#F59E0B]/30 text-[#F59E0B]"><TrendingUp className="w-3 h-3"/>{t('g.trending')}</span>}
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#532B88]/40 text-[#C8B1E4]">{agent.category}</span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">{agent.name}</h1>
                <p className="text-lg text-[#C8B1E4] mb-4">{agent.pitch}</p>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]"/>
                    <span className="font-stat text-lg">{agent.rating}</span>
                    <span className="text-sm text-[#9B72CF]">({agent.reviews} {t('g.reviews')})</span>
                  </div>
                  <span className="text-sm text-[#9B72CF]">· <span className="font-stat text-[#F4EFFA]">{agent.rentals.toLocaleString('fr-FR')}</span> {t('ap.totalrentals')}</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1130] border border-[#2F184B] rounded-lg text-sm hover:border-[#532B88] transition-colors"><Heart className="w-4 h-4"/>{t('ap.favorite')}</button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1130] border border-[#2F184B] rounded-lg text-sm hover:border-[#532B88] transition-colors"><Share2 className="w-4 h-4"/>{t('ap.share')}</button>
                </div>
              </div>
            </div>

            <div className="flex gap-1 border-b border-[#2F184B] mb-6 overflow-x-auto">
              {tabs.map(tb => (
                <button key={tb.id} onClick={()=>setTab(tb.id)} className={`px-5 py-3 text-sm font-display font-semibold transition-all relative whitespace-nowrap ${tab === tb.id ? 'text-[#F4EFFA]' : 'text-[#9B72CF] hover:text-[#C8B1E4]'}`}>
                  {tb.label}
                  {tab === tb.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED] glow-soft"/>}
                </button>
              ))}
            </div>

            {tab === 'about' && (
              <div className="space-y-6">
                <p className="text-[#C8B1E4] leading-relaxed">LegalDraft Pro est un agent IA spécialisé, entraîné pour assister freelances, consultants et dirigeants de petites entreprises dans la rédaction de documents juridiques professionnels. Des contrats aux conditions générales, il produit un rendu clair, précis et professionnel en quelques minutes.</p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                    <h3 className="font-display font-bold mb-3">{t('ap.doeswell')}</h3>
                    {['Contrats de prestation et freelance','Accords de confidentialité (NDA)','Conditions générales et politiques de confidentialité','Mises en demeure','Lettres de relance de facture'].map(s => (
                      <div key={s} className="flex items-start gap-2 text-sm text-[#C8B1E4] mb-2"><Check className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0"/>{s}</div>
                    ))}
                  </div>
                  <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                    <h3 className="font-display font-bold mb-3">{t('ap.doesnot')}</h3>
                    {['Conseil juridique officiel ou représentation','Dépôts au tribunal ou documents judiciaires','Conseil fiscal ou planification financière'].map(s => (
                      <div key={s} className="flex items-start gap-2 text-sm text-[#C8B1E4] mb-2"><AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0"/>{s}</div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl p-4">
                    <p className="font-label text-xs text-[#9B72CF] mb-2">{t('ap.requiredlevel')}</p>
                    <p className="text-sm text-[#F4EFFA]">{t('g.beginnerfriendly')}</p>
                  </div>
                  <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl p-4">
                    <p className="font-label text-xs text-[#9B72CF] mb-2">{t('ap.languages')}</p>
                    <p className="text-sm text-[#F4EFFA]">{agent.languages.join(', ')}</p>
                  </div>
                  <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl p-4 col-span-2 md:col-span-1">
                    <p className="font-label text-xs text-[#9B72CF] mb-2">{t('ap.tools')}</p>
                    <p className="text-sm text-[#F4EFFA]">{agent.tools.join(', ')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg mb-3">{t('ap.examples')}</h3>
                  {[
                    { q: 'Rédige-moi un contrat de prestation freelance pour une mission de web design', a: 'CONTRAT DE PRESTATION FREELANCE\n\n1. OBJET — Prestation de services de web design incluant UI/UX, layouts responsives et production d’assets visuels.\n2. DURÉE — 6 semaines à compter de la signature.\n3. RÉMUNÉRATION — 5 000 € TTC, 30 % à la signature / 70 % à la livraison.\n4. PROPRIÉTÉ INTELLECTUELLE — L’intégralité du travail devient propriété du Client à réception du paiement intégral.\n5. CONFIDENTIALITÉ — Les deux parties s’engagent à la confidentialité des détails du projet.\n[document complet ci-après]' },
                    { q: 'Rédige un accord de confidentialité entre deux sociétés', a: 'ACCORD DE CONFIDENTIALITÉ\n\nEntre : Société A & Société B\n1. INFORMATIONS CONFIDENTIELLES — toutes informations techniques, financières et commerciales.\n2. OBLIGATIONS — La partie réceptrice ne divulguera, copiera ou utilisera à des fins non liées.\n3. DURÉE — 3 ans à compter de la signature.\n4. RESTITUTION — Tous les supports confidentiels restitués sur demande.\n[document complet ci-après]' },
                  ].map((ex, i) => (
                    <div key={i} className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl mb-3 overflow-hidden">
                      <button onClick={() => setOpenExample(openExample === i ? null : i)} className="w-full flex items-center justify-between p-4 hover:bg-[#1A1130] transition-colors text-left">
                        <span className="text-sm text-[#F4EFFA]">Exemple {i+1} : « {ex.q} »</span>
                        <ChevronUp className={`w-4 h-4 text-[#9B72CF] transition-transform ${openExample === i ? '' : 'rotate-180'}`}/>
                      </button>
                      {openExample === i && (
                        <div className="px-4 pb-4 text-sm text-[#C8B1E4] whitespace-pre-line bg-[#080612]/50 border-t border-[#2F184B] pt-4">{ex.a}</div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}

            {tab === 'behavior' && (
              <div className="space-y-6">
                {[
                  { key: 'autonomy', label: 'Autonomie', left: 'Agit de façon autonome', right: 'Demande confirmation' },
                  { key: 'length', label: 'Longueur de réponse', left: 'Concise', right: 'Détaillée' },
                  { key: 'tone', label: 'Ton', left: 'Formel', right: 'Décontracté' },
                  { key: 'proactivity', label: 'Proactivité', left: 'Réactif', right: 'Proactif' },
                  { key: 'language', label: 'Niveau de langue', left: 'Simple', right: 'Technique' },
                ].map(s => (
                  <div key={s.key} className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-display font-semibold">{s.label}</h4>
                      <span className="font-stat text-[#7C3AED] glow-text">{behaviors[s.key]}/10</span>
                    </div>
                    <Slider value={[behaviors[s.key]]} onValueChange={v => setBehaviors({ ...behaviors, [s.key]: v[0] })} min={0} max={10} step={1} />
                    <div className="flex justify-between text-xs text-[#9B72CF] mt-2"><span>{s.left}</span><span>{s.right}</span></div>
                  </div>
                ))}
                <div className="bg-[#1A1130] border border-[#532B88]/40 rounded-2xl p-5 glow-soft">
                  <p className="font-label text-xs text-[#9B72CF] mb-2">{t('ap.livepreview')}</p>
                  <p className="text-[#F4EFFA] leading-relaxed">{behaviorSummary()}</p>
                </div>
                <p className="text-xs text-[#9B72CF] italic">{t('ap.saved')}</p>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="space-y-6">
                <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6">
                  <div className="flex items-center gap-6 mb-4">
                    <div>
                      <p className="font-stat text-5xl text-[#F4EFFA] glow-text">{agent.rating}</p>
                      <div className="flex gap-0.5 mt-1">{Array.from({length:5}).map((_,i)=><Star key={i} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
                      <p className="text-xs text-[#9B72CF] mt-1">{agent.reviews} {t('g.reviews')}</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {ratingDist.map(d => (
                        <button key={d.s} onClick={()=>setFilterStars(filterStars===d.s?0:d.s)} className="w-full flex items-center gap-2 text-xs hover:opacity-80">
                          <span className="w-6 text-right text-[#9B72CF]">{d.s}★</span>
                          <div className="flex-1 h-2 rounded-full bg-[#1A1130] overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#532B88] to-[#7C3AED]" style={{ width: `${(d.count / reviews.length) * 100}%` }}/>
                          </div>
                          <span className="w-8 text-[#9B72CF]">{d.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {filteredReviews.map(r => (
                  <div key={r.id} className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#532B88] to-[#7C3AED] flex items-center justify-center font-stat text-sm text-white">{r.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-display font-semibold">{r.author}</p>
                          <span className="text-xs text-[#9B72CF]">{r.date}</span>
                        </div>
                        <div className="flex gap-0.5 mb-1">{Array.from({length:r.stars}).map((_,i)=><Star key={i} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>)}</div>
                      </div>
                    </div>
                    <p className="text-[#C8B1E4] mb-2">{r.text}</p>
                    <p className="text-xs text-[#9B72CF]">{r.mode}</p>
                    {r.creatorReply && (
                      <div className="mt-3 ml-6 pl-3 border-l-2 border-[#532B88] bg-[#1A1130]/40 p-3 rounded-r-lg">
                        <p className="text-xs font-display font-semibold text-[#9B72CF] mb-1">{t('ap.replyfrom', { name: creatorProfile.name })}</p>
                        <p className="text-sm text-[#C8B1E4]">{r.creatorReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'community' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Communauté {agent.name}</h2>
                    <p className="text-sm text-[#9B72CF]">{t('ap.community.sub')}</p>
                  </div>
                  <Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0"><MessageSquare className="w-4 h-4 mr-2"/>{t('ap.newdisc')}</Button>
                </div>

                <div className="space-y-3">
                  {agentDiscussions.map(d => (
                    <div key={d.id} className="bg-[#0F0A1E] border border-[#2F184B] rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedDiscussion(expandedDiscussion === d.id ? null : d.id)} className="w-full p-5 flex items-start gap-4 text-left hover:bg-[#1A1130]/40 transition-colors">
                        <div className="flex flex-col items-center gap-1 text-[#9B72CF] hover:text-[#7C3AED]">
                          <ChevronUp className="w-4 h-4"/>
                          <span className="font-stat text-sm">{d.upvotes}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold text-[#F4EFFA] mb-1">{d.title}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#9B72CF]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#532B88] to-[#7C3AED] flex items-center justify-center text-[9px] font-stat text-white">{d.avatar}</span>
                              {d.author}
                            </span>
                            <span>· {d.replies} {t('ap.replies')}</span>
                            <span>· {d.time}</span>
                          </div>
                        </div>
                      </button>
                      {expandedDiscussion === d.id && (
                        <div className="border-t border-[#2F184B] p-5 bg-[#080612]/40">
                          <p className="text-sm text-[#C8B1E4] mb-4">{d.content}</p>
                          <div className="space-y-3">
                            {d.threadReplies.length > 0 ? d.threadReplies.map((r,i) => (
                              <div key={i} className="flex gap-3 pl-3 border-l-2 border-[#2F184B]">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#532B88] to-[#7C3AED] flex items-center justify-center text-xs font-stat text-white shrink-0">{r.avatar}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-display font-semibold">{r.author}</p>
                                    <span className="text-xs text-[#9B72CF]">· {r.time}</span>
                                  </div>
                                  <p className="text-sm text-[#C8B1E4]">{r.text}</p>
                                </div>
                              </div>
                            )) : <p className="text-xs text-[#9B72CF] italic">{t('ap.noreplies')}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-[#F59E0B]"/>{t('ap.topmonth')}</h3>
                      <p className="text-xs text-[#9B72CF]">{t('ap.topbased')}</p>
                    </div>
                    <button className="text-xs text-[#9B72CF] hover:text-[#F4EFFA]">{t('ap.fullboard')} <ArrowRight className="inline w-3 h-3"/></button>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-[10px] font-label text-[#9B72CF] border-b border-[#2F184B]">
                      <th className="text-left py-2">{t('ap.rank')}</th><th className="text-left">{t('ap.agent')}</th><th className="text-right">{t('ap.rentals')}</th><th className="text-right">{t('ap.rating')}</th><th className="text-right">{t('ap.renewal')}</th>
                    </tr></thead>
                    <tbody>
                      {leaderboard.slice(0,5).map(l => (
                        <tr key={l.rank} className={`border-b border-[#2F184B] ${l.current ? 'bg-[#1A1130]' : ''}`}>
                          <td className="py-3">
                            {l.rank === 1 && <Crown className="w-4 h-4 text-[#F59E0B] inline"/>}
                            {l.rank === 2 && <Medal className="w-4 h-4 text-[#C8B1E4] inline"/>}
                            {l.rank === 3 && <Award className="w-4 h-4 text-[#F59E0B]/70 inline"/>}
                            <span className="font-stat ml-1">{l.rank}</span>
                          </td>
                          <td className="text-[#F4EFFA]">{l.name} {l.current && <span className="text-[10px] font-label text-[#7C3AED] ml-2">{t('ap.thisagent')}</span>}</td>
                          <td className="text-right font-stat text-[#F4EFFA]">{l.rentals}</td>
                          <td className="text-right font-stat text-[#F4EFFA]">{l.rating}</td>
                          <td className="text-right font-stat text-[#10B981]">{l.renewal}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-[#9B72CF] mt-4 text-right">{t('ap.updated')}</p>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 glow-soft">
              <div className="flex gap-1 p-1 bg-[#1A1130] rounded-lg mb-5">
                {[
                  { id: 'hour', label: t('g.hour') },
                  { id: 'day', label: t('g.day') },
                  { id: 'task', label: t('g.task') },
                  { id: 'project', label: t('g.project') },
                ].map(m => (
                  <button key={m.id} onClick={()=>setMode(m.id)} className={`flex-1 py-2 rounded-md text-xs font-display font-semibold transition-all capitalize ${mode === m.id ? 'bg-[#532B88] text-white glow-soft' : 'text-[#9B72CF]'}`}>{m.label}</button>
                ))}
              </div>
              <div className="mb-4">
                <p className="font-label text-xs text-[#9B72CF] mb-1">{t('ap.baseprice')}</p>
                <p className="font-stat text-4xl text-[#F4EFFA] glow-text">€{prices[mode]}<span className="text-base text-[#9B72CF] ml-1">/ {t('g.'+mode)}</span></p>
              </div>
              {mode === 'day' && (
                <div className="mb-5">
                  <p className="text-xs text-[#9B72CF] mb-2">{t('ap.duration')} : <span className="font-stat text-[#F4EFFA]">{duration} {t('ap.days')}</span></p>
                  <Slider value={[duration]} onValueChange={v=>setDuration(v[0])} min={1} max={14} step={1}/>
                </div>
              )}
              {mode === 'project' && <p className="text-xs text-[#9B72CF] mb-4">{t('ap.fixed7')}</p>}
              <div className="flex items-center justify-between py-3 border-y border-[#2F184B] mb-5">
                <span className="text-sm text-[#C8B1E4]">{t('ap.total')}</span>
                <span className="font-stat text-2xl text-[#F4EFFA]">€{totalPrice}</span>
              </div>
              <Link href={`/agents/${agent.slug}/rent`}>
                <Button className="w-full bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-12 mb-2">{t('ap.rentnow')}</Button>
              </Link>
              <Button variant="outline" className="w-full bg-transparent border-[#532B88] text-[#C8B1E4] hover:bg-[#1A1130] hover:text-[#F4EFFA] h-11 mb-3">{t('ap.tryfree')}</Button>
              <button className="w-full text-xs text-[#9B72CF] hover:text-[#F4EFFA] flex items-center justify-center gap-1.5"><Heart className="w-3 h-3"/>{t('ap.addfav')}</button>
            </div>

            {/* Creator mini-profile inside sidebar */}
            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-3">Créateur</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center font-stat text-sm text-white">{creatorProfile.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display font-bold text-sm truncate">{creatorProfile.name}</p>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0"/>
                  </div>
                  <p className="text-[11px] text-[#9B72CF]">★ {creatorProfile.avgRating} · {creatorProfile.totalRentals.toLocaleString('fr-FR')} locations</p>
                </div>
              </div>
              <Link href="#" className="text-xs text-[#A78BCF] hover:text-[#F4EFFA] flex items-center gap-1">{t('ap.seeallhis')} <ArrowRight className="w-3 h-3"/></Link>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Page;
