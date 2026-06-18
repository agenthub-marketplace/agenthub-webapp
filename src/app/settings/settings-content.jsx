'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Bell, Lock, Monitor, Shield, User } from 'lucide-react';
import Flag from '@/components/Flag';
import { languages } from '@/lib/mock-data';
import { useT } from '@/lib/i18n';

function SettingsPage({ profile }) {
  const { lang, setLang } = useT();
  const [tab, setTab] = useState('profile');
  const roleLabel = profile?.role === 'admin' ? 'Admin' : profile?.role === 'creator' ? 'Créateur' : 'Utilisateur';
  const initials = (profile?.displayName || profile?.email || 'AH').slice(0, 2).toUpperCase();

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sécurité', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'privacy', label: 'Données & confidentialité', icon: Shield },
  ];

  return (
    <div className="min-h-screen ">
      <Navbar profile={profile} />
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
                <div className="flex flex-col gap-4 rounded-xl border border-[#251A40] bg-[#0A0816] p-5 sm:flex-row sm:items-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center font-stat text-2xl text-white">{initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-label uppercase tracking-[0.18em] text-[#A78BCF]">Compte connecté</p>
                    <p className="mt-1 truncate font-display text-xl font-bold text-[#F5F1FA]">{profile?.displayName || 'Profil AgentHub'}</p>
                    <p className="truncate text-sm text-[#D6C5E8]">{profile?.email}</p>
                    <span className="mt-3 inline-flex rounded-full border border-[#6B3FA0]/50 bg-[#1A152F] px-3 py-1 text-xs text-[#D6C5E8]">{roleLabel}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-[#D6C5E8]">
                  Les informations publiques de votre profil se consultent depuis la page profil. La modification complète du profil sera branchée après la beta fermée.
                </p>
                <Button asChild variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                  <Link href="/profile">Ouvrir mon profil</Link>
                </Button>
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
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold">Sécurité</h2>
                <div className="rounded-xl border border-[#251A40] bg-[#0A0816] p-5">
                  <p className="font-display text-lg font-semibold text-[#F5F1FA]">Mot de passe et session</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#D6C5E8]">
                    La réinitialisation du mot de passe et la déconnexion passent par Supabase Auth. Les champs de changement direct ne sont pas affichés tant que l’action serveur n’est pas branchée.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white border-0">
                      <Link href="/auth/reset-password">Réinitialiser le mot de passe</Link>
                    </Button>
                    <Button asChild variant="outline" className="bg-transparent border-[#251A40] text-[#D6C5E8] hover:bg-[#1A152F]">
                      <Link href="/auth/logout">Se déconnecter</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'notifications' && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold mb-5">Notifications</h2>
                <div className="rounded-xl border border-[#251A40] bg-[#0A0816] p-5">
                  <p className="font-display text-lg font-semibold text-[#F5F1FA]">Centre de notifications beta</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#D6C5E8]">
                    Les notifications visibles dans AgentHub et AgentHub Code sont calculées depuis les événements produit branchés : agents à valider, changements demandés, activations, runs et messages système.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#A78BCF]">
                    Les notifications email et les préférences fines ne sont pas actives en beta. Elles seront ajoutées avec un vrai système de préférences persistées.
                  </p>
                </div>
                <Button asChild variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                  <Link href="/agenthub/dashboard">Retour au dashboard</Link>
                </Button>
              </div>
            )}

            {tab === 'sessions' && (
              <div className="space-y-3">
                <h2 className="font-display text-xl font-bold mb-2">Sessions actives</h2>
                <div className="flex items-center justify-between p-4 bg-[#0A0816] border border-[#251A40] rounded-xl">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-[#A78BCF]"/>
                    <div>
                      <p className="text-sm text-[#F5F1FA] font-display flex items-center gap-2">Session actuelle<span className="w-2 h-2 rounded-full bg-[#10B981] pulse-dot"/></p>
                      <p className="text-xs text-[#A78BCF]">Connecté avec {profile?.email}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-[#D6C5E8]">
                  La liste multi-appareils n’est pas encore exposée par l’interface beta. Pour fermer la session active, utilisez la déconnexion.
                </p>
                <Button asChild variant="outline" className="bg-transparent border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 mt-2">
                  <Link href="/auth/logout">Se déconnecter</Link>
                </Button>
              </div>
            )}

            {tab === 'privacy' && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-bold">Données & confidentialité</h2>
                <div className="p-5 rounded-xl bg-[#0A0816] border border-[#251A40]">
                  <p className="text-sm text-[#F5F1FA] mb-3 font-display font-semibold">Données utilisées en beta</p>
                  <ul className="space-y-2 text-sm text-[#D6C5E8]">
                    <li>Profil de compte : email, rôle et nom public.</li>
                    <li>Accès agents : locations, paiements sandbox et statuts d’activation.</li>
                    <li>Workspace : runs, résultats générés et historique visible par le propriétaire.</li>
                    <li>Avis vérifiés : note, commentaire et agent associé.</li>
                  </ul>
                </div>
                <div className="p-5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                  <p className="text-sm text-[#F59E0B] mb-3 font-display font-semibold">Export et suppression</p>
                  <p className="text-sm leading-relaxed text-[#D6C5E8]">
                    L’export JSON et la suppression de compte ne sont pas encore automatisés dans l’interface beta. Les demandes restent traitées manuellement pour éviter toute suppression accidentelle.
                  </p>
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
