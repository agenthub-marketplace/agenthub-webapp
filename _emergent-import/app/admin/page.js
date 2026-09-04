'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, Lock, Search, Eye, Ban, Trash2, Flag, BarChart3 } from 'lucide-react';
import { adminStats } from '@/lib/mock-data';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const PENDING = [
  { id: 'p1', name: 'LegalHelper', creator: 'Sophie M.', submitted: 'il y a 2h', desc: 'Assistant juridique spécialisé en immobilier' },
  { id: 'p2', name: 'CodeReviewer', creator: 'Alex D.', submitted: 'il y a 5h', desc: 'Revue de code avec détection de failles sécurité' },
  { id: 'p3', name: 'MarketingBot', creator: 'Laura P.', submitted: 'il y a 8h', desc: 'Générateur de contenus pour réseaux sociaux' },
];
const USERS = [
  { name: 'Marie Dupont', email: 'marie.dupont@example.com', type: 'Utilisateur', joined: '12 août 2025', rentals: 14, status: 'Actif' },
  { name: 'Thomas R.', email: 'thomas.r@example.com', type: 'Créateur', joined: '3 juin 2025', rentals: 1240, status: 'Actif' },
  { name: 'Lucas D.', email: 'lucas.d@example.com', type: 'Utilisateur', joined: '22 sept 2025', rentals: 8, status: 'Actif' },
  { name: 'Sophie M.', email: 'sophie.m@example.com', type: 'Créateur', joined: '15 nov 2025', rentals: 532, status: 'Actif' },
  { name: 'Spam Account', email: 'spam@bad.com', type: 'Utilisateur', joined: '1 juin 2026', rentals: 0, status: 'Suspendu' },
];
const REPORTS = [
  { id: 'r1', type: 'Contenu inapproprié', reporter: 'Emma L.', date: '28 mai 2026', status: 'Ouvert', prio: 'Haute' },
  { id: 'r2', type: 'Spam', reporter: 'Marc D.', date: '25 mai 2026', status: 'En cours', prio: 'Moyenne' },
  { id: 'r3', type: 'Violation CGU', reporter: 'Julie F.', date: '20 mai 2026', status: 'Résolu', prio: 'Basse' },
];
const revData = Array.from({length:30}, (_,i)=>({ day: i+1, amount: Math.round(200 + Math.sin(i/4)*80 + Math.random()*100 + i*3) }));

function AdminPage() {
  const [tab, setTab] = useState('queue');
  const [selected, setSelected] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionText, setActionText] = useState('');

  return (
    <div className="min-h-screen ">
      <Navbar />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-label text-xs text-[#F59E0B] mb-2">Admin</p>
            <h1 className="font-display text-4xl font-bold text-[#F5F1FA]">Panneau d’administration</h1>
          </div>
          <span className="text-[10px] font-label px-3 py-1.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]">Accès restreint</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Revenus aujourd’hui', value: `€${adminStats.revenueToday}` },
            { label: 'Revenus ce mois', value: `€${adminStats.revenueMonth.toLocaleString('fr-FR')}` },
            { label: 'Locations actives', value: adminStats.activeRentalsNow },
            { label: 'Validations', value: adminStats.pendingValidations, badge: true },
            { label: 'Nouveaux utilisateurs', value: adminStats.newUsersToday },
          ].map(s => (
            <div key={s.label} className="bg-[#110D24] border border-[#251A40] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#A78BCF] mb-2">{s.label}</p>
              <p className={`font-stat text-2xl glow-text ${s.badge ? 'text-[#F59E0B]' : 'text-[#F5F1FA]'}`}>{s.value}</p>
              {s.badge && <p className="text-[10px] text-[#F59E0B] mt-1">⚠ En attente</p>}
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-[#251A40] mb-6 overflow-x-auto">
          {[
            { id: 'queue', label: 'File de validation' },
            { id: 'agents', label: 'Tous les agents' },
            { id: 'users', label: 'Utilisateurs' },
            { id: 'revenue', label: 'Revenus' },
            { id: 'reports', label: 'Signalements' },
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} className={`px-5 py-3 text-sm font-display font-semibold relative whitespace-nowrap ${tab === t.id ? 'text-[#F5F1FA]' : 'text-[#A78BCF] hover:text-[#D6C5E8]'}`}>
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]"/>}
            </button>
          ))}
        </div>

        {tab === 'queue' && (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-3">
              {PENDING.map(p => (
                <button key={p.id} onClick={()=>{ setSelected(p); setActionType(null); }} className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === p.id ? 'border-[#8B5CF6] bg-[#1A152F] glow-soft' : 'border-[#251A40] bg-[#110D24] hover:border-[#6B3FA0]'}`}>
                  <div className="flex justify-between mb-1">
                    <p className="font-display font-bold text-[#F5F1FA]">{p.name}</p>
                    <span className="text-[10px] font-label text-[#F59E0B]">{p.submitted}</span>
                  </div>
                  <p className="text-xs text-[#A78BCF]">par {p.creator}</p>
                  <p className="text-xs text-[#D6C5E8] mt-2">{p.desc}</p>
                </button>
              ))}
            </div>
            {selected && (
              <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5 lg:sticky lg:top-20 lg:self-start">
                <h3 className="font-display font-bold text-xl mb-3">{selected.name}</h3>
                <p className="text-xs text-[#A78BCF] mb-4">Soumis par {selected.creator} · {selected.submitted}</p>
                <div className="mb-4">
                  <p className="font-label text-xs text-[#A78BCF] mb-2 flex items-center gap-1"><Lock className="w-3 h-3"/>Prompt système (Admin uniquement)</p>
                  <pre className="text-xs bg-[#0A0816] border border-[#251A40] rounded-lg p-3 text-[#D6C5E8] overflow-x-auto font-mono">You are an expert legal assistant trained on French and EU contract law...</pre>
                </div>
                {actionType === null && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>setActionType('approve')} className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white border-0"><Check className="w-4 h-4 mr-1"/>Approuver</Button>
                    <Button size="sm" onClick={()=>setActionType('changes')} variant="outline" className="flex-1 bg-transparent border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"><Edit className="w-4 h-4 mr-1"/>Modifications</Button>
                    <Button size="sm" onClick={()=>setActionType('reject')} variant="outline" className="flex-1 bg-transparent border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"><X className="w-4 h-4 mr-1"/>Refuser</Button>
                  </div>
                )}
                {actionType !== null && actionType !== 'approve' && (
                  <div className="space-y-2">
                    <textarea value={actionText} onChange={e=>setActionText(e.target.value)} rows={3} placeholder={actionType === 'changes' ? 'Modifications à demander…' : 'Raison du refus…'} className="w-full p-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none resize-none"/>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={()=>{ setSelected(null); setActionType(null); setActionText(''); }} className="flex-1 bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white">Envoyer</Button>
                      <Button size="sm" variant="outline" onClick={()=>setActionType(null)} className="bg-transparent border-[#251A40] text-[#A78BCF]">Annuler</Button>
                    </div>
                  </div>
                )}
                {actionType === 'approve' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
                    <Check className="w-4 h-4 text-[#10B981]"/>
                    <p className="text-sm text-[#10B981]">Agent approuvé. Créateur notifié.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#251A40]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A78BCF]"/>
                <input placeholder="Rechercher par email ou nom…" className="w-full max-w-md h-10 pl-10 pr-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]"><th className="text-left p-3">Nom</th><th>Email</th><th>Type</th><th>Inscrit</th><th>Locations</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {USERS.map((u,i) => (
                  <tr key={i} className="border-b border-[#251A40] hover:bg-[#1A152F]">
                    <td className="p-3 text-[#F5F1FA] font-display font-semibold">{u.name}</td>
                    <td className="text-[#D6C5E8]">{u.email}</td>
                    <td><span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A152F] text-[#D6C5E8]">{u.type}</span></td>
                    <td className="text-[#A78BCF] text-xs">{u.joined}</td>
                    <td className="text-center font-stat text-[#F5F1FA]">{u.rentals}</td>
                    <td><span className={`text-[10px] font-label px-2 py-1 rounded-full ${u.status === 'Actif' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'}`}>{u.status}</span></td>
                    <td className="text-right pr-3">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#A78BCF]" title="Voir"><Eye className="w-3.5 h-3.5"/></button>
                        <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#F59E0B]" title="Suspendre"><Ban className="w-3.5 h-3.5"/></button>
                        <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#EF4444]" title="Supprimer"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'agents' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5 text-center text-[#A78BCF]">
            <p className="font-display font-semibold mb-1">Liste des agents</p>
            <p className="text-xs">{adminStats.activeRentalsNow} agents publiés. Recherche, filtres et toggle « Mis en avant » disponibles. <span className="text-[#F59E0B]">7/10 emplacements vedette utilisés.</span></p>
          </div>
        )}

        {tab === 'revenue' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#8B5CF6]"/>Revenus 30 jours</h3>
              <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8]">Exporter CSV</Button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#251A40" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="day" stroke="#A78BCF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke="#A78BCF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v=>`€${v}`}/>
                  <Tooltip contentStyle={{ background: '#1A152F', border: '1px solid #8B5CF6', borderRadius: 12, color: '#F5F1FA' }} formatter={v=>[`€${v}`,'Revenu']}/>
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3">
            {REPORTS.map(r => (
              <div key={r.id} className="bg-[#110D24] border border-[#251A40] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flag className={`w-5 h-5 ${r.prio === 'Haute' ? 'text-[#EF4444]' : r.prio === 'Moyenne' ? 'text-[#F59E0B]' : 'text-[#A78BCF]'}`}/>
                  <div>
                    <p className="font-display font-semibold text-[#F5F1FA]">{r.type}</p>
                    <p className="text-xs text-[#A78BCF]">Signalé par {r.reporter} · {r.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-label px-2 py-1 rounded-full ${r.status === 'Résolu' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : r.status === 'En cours' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30' : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'}`}>{r.status}</span>
                  <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8]">Gérer</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
