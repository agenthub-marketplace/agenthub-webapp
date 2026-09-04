'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Trash2, Download, Lock, Bell, Shield, User } from 'lucide-react';
import Flag from '@/components/Flag';
import { languages } from '@/lib/mock-data';
import { useT } from '@/lib/i18n';

function SettingsPage() {
  const { lang, setLang } = useT();
  const [tab, setTab] = useState('profile');
  const [notifs, setNotifs] = useState({
    rental_app: true, rental_email: true, message_app: true, message_email: false,
    community_app: true, community_email: false, billing_app: true, billing_email: true,
  });

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'privacy', label: 'Données & confidentialité', icon: Shield },
  ];

  return (
    <div className="min-h-screen ">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <h1 className="font-display text-4xl font-bold mb-2 text-[#F5F1FA]">Paramètres</h1>
        <p className="text-[#D6C5E8] mb-8">Gérez votre compte, vos préférences et votre sécurité.</p>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          <aside className="space-y-1">
            {tabs.map(tb => (
              <button key={tb.id} onClick={()=>setTab(tb.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${tab === tb.id ? 'bg-[#1A152F] text-[#F5F1FA]' : 'text-[#A78BCF] hover:bg-[#15112A] hover:text-[#F5F1FA]'}`}>
                <tb.icon className="w-4 h-4"/>{tb.label}
              </button>
            ))}
          </aside>

          <main className="bg-[#110D24] border border-[#251A40] rounded-2xl p-6">
            {tab === 'profile' && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold">Profil</h2>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center font-stat text-2xl text-white">MD</div>
                  <Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">Changer la photo</Button>
                </div>
                <div><label className="font-label text-xs text-[#A78BCF] mb-1.5 block">Nom complet</label><input defaultValue="Marie Dupont" className="w-full h-11 px-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/></div>
                <div><label className="font-label text-xs text-[#A78BCF] mb-1.5 block">Email</label><input defaultValue="marie.dupont@example.com" className="w-full h-11 px-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/></div>
                <div>
                  <label className="font-label text-xs text-[#A78BCF] mb-2 block">Langue de l’interface</label>
                  <div className="flex gap-2">
                    {languages.map(l => (
                      <button key={l.code} onClick={()=>setLang(l.code)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${lang===l.code ? 'border-[#8B5CF6] bg-[#1A152F] glow-soft' : 'border-[#251A40] hover:border-[#6B3FA0]'}`}>
                        <Flag code={l.flag}/><span className="text-sm">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0">Enregistrer</Button>
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold">Sécurité</h2>
                <div><label className="font-label text-xs text-[#A78BCF] mb-1.5 block">Mot de passe actuel</label><input type="password" className="w-full h-11 px-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/></div>
                <div><label className="font-label text-xs text-[#A78BCF] mb-1.5 block">Nouveau mot de passe</label><input type="password" className="w-full h-11 px-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/>
                  <div className="mt-2 flex gap-1"><div className="flex-1 h-1 rounded bg-[#10B981]"/><div className="flex-1 h-1 rounded bg-[#10B981]"/><div className="flex-1 h-1 rounded bg-[#251A40]"/><div className="flex-1 h-1 rounded bg-[#251A40]"/></div>
                  <p className="text-xs text-[#10B981] mt-1">Force : moyenne</p>
                </div>
                <div><label className="font-label text-xs text-[#A78BCF] mb-1.5 block">Confirmer</label><input type="password" className="w-full h-11 px-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/></div>
                <Button className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0">Mettre à jour le mot de passe</Button>
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                <h2 className="font-display text-xl font-bold mb-5">Notifications</h2>
                <table className="w-full text-sm">
                  <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]"><th className="text-left py-2">Type</th><th>Dans l’app</th><th>Email</th></tr></thead>
                  <tbody>
                    {[
                      { k: 'rental', label: 'Locations et rappels d’expiration' },
                      { k: 'message', label: 'Messages reçus' },
                      { k: 'community', label: 'Activité communauté' },
                      { k: 'billing', label: 'Facturation', locked: true },
                    ].map(row => (
                      <tr key={row.k} className="border-b border-[#251A40]">
                        <td className="py-3 text-[#F5F1FA]">{row.label}{row.locked && <span className="ml-2 text-[10px] text-[#A78BCF]">(obligatoire)</span>}</td>
                        <td className="text-center"><input type="checkbox" checked={notifs[row.k+'_app']} disabled={row.locked} onChange={e=>setNotifs({...notifs,[row.k+'_app']:e.target.checked})} className="accent-[#8B5CF6] w-4 h-4"/></td>
                        <td className="text-center"><input type="checkbox" checked={notifs[row.k+'_email']} disabled={row.locked} onChange={e=>setNotifs({...notifs,[row.k+'_email']:e.target.checked})} className="accent-[#8B5CF6] w-4 h-4"/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'sessions' && (
              <div className="space-y-3">
                <h2 className="font-display text-xl font-bold mb-2">Sessions actives</h2>
                {[
                  { d:'Chrome — MacBook Pro', l:'Paris, France', t:'En cours', current: true, icon: Monitor },
                  { d:'Safari — iPhone 14', l:'Paris, France', t:'il y a 2 jours', icon: Smartphone },
                  { d:'Edge — Windows PC', l:'Lyon, France', t:'il y a 5 jours', icon: Monitor },
                ].map((s,i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#0A0816] border border-[#251A40] rounded-xl">
                    <div className="flex items-center gap-3">
                      <s.icon className="w-5 h-5 text-[#A78BCF]"/>
                      <div>
                        <p className="text-sm text-[#F5F1FA] font-display flex items-center gap-2">{s.d}{s.current && <span className="w-2 h-2 rounded-full bg-[#10B981] pulse-dot"/>}</p>
                        <p className="text-xs text-[#A78BCF]">{s.l} · {s.t}</p>
                      </div>
                    </div>
                    {!s.current && <Button size="sm" variant="outline" className="bg-transparent border-[#251A40] text-[#A78BCF] hover:border-[#EF4444] hover:text-[#EF4444]">Déconnecter</Button>}
                  </div>
                ))}
                <Button variant="outline" className="bg-transparent border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 mt-2">Déconnecter toutes les autres sessions</Button>
              </div>
            )}

            {tab === 'privacy' && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold">Données & confidentialité</h2>
                <Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]"><Download className="w-4 h-4 mr-2"/>Télécharger mes données (JSON)</Button>
                <div className="p-5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                  <p className="text-sm text-[#F59E0B] mb-3 font-display font-semibold">Supprimer mon profil mémoire</p>
                  <p className="text-xs text-[#D6C5E8] mb-3">Tous les agents devront réapprendre vos préférences à chaque session.</p>
                  <Button size="sm" variant="outline" className="bg-transparent border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10">Supprimer mon profil mémoire</Button>
                </div>
                <div className="p-5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30">
                  <p className="text-sm text-[#EF4444] mb-3 font-display font-semibold">Supprimer mon compte</p>
                  <p className="text-xs text-[#D6C5E8] mb-3">Délai de grâce de 30 jours. Cette action est irréversible après ce délai.</p>
                  <Button size="sm" variant="outline" className="bg-transparent border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"><Trash2 className="w-3.5 h-3.5 mr-1"/>Supprimer mon compte</Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

export default SettingsPage;
