'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, ChevronDown, Search, Trophy, MessageSquare, Home, Menu, X, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Flag from '@/components/Flag';
import CreatorIcon from '@/components/icons/CreatorIcon';
import ProfileIcon from '@/components/icons/ProfileIcon';
import { languages, notifications as mockNotifs } from '@/lib/mock-data';
import { useT } from '@/lib/i18n';

export default function Navbar() {
  const { t, lang, setLang } = useT();
  const pathname = usePathname() || '';
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifs, setNotifs] = useState(mockNotifs);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const unread = notifs.filter(n => !n.read).length;
  const currentLang = languages.find(l => l.code === lang) || languages[0];

  const links = [
    { href: '/search', label: t('nav.discoveragents'), icon: Search },
    { href: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { href: '/workspace', label: t('nav.workspace'), icon: MessageSquare },
    { href: '/creator/dashboard', label: t('nav.creatormode'), icon: CreatorIcon },
  ];

  const drawerLinks = [
    { href: '/', label: t('nav.m.home'), icon: Home },
    { href: '/search', label: t('nav.discoveragents'), icon: Search },
    { href: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { href: '/workspace', label: t('nav.workspace'), icon: MessageSquare },
    { href: '/profile', label: t('nav.myprofile'), icon: ProfileIcon },
    { href: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { href: '/creator/dashboard', label: t('nav.creatormode'), icon: CreatorIcon },
    { href: '/settings', label: t('nav.settings'), icon: SettingsIcon },
  ];

  return (
    <>
    <nav className={`sticky top-0 z-[60] transition-all duration-200 ${scrolled ? 'nav-blur' : 'bg-[#080612]/40 backdrop-blur-sm'}`}>
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white/95 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.35)]">
            <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" priority />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold text-[#F5F1FA] tracking-tight">AgentHub</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1">
          {links.map(l => {
            const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${active ? 'text-[#F5F1FA] bg-[#1A152F]' : 'text-[#A78BCF] hover:text-[#F5F1FA] hover:bg-[#15112A]'}`}>
                <l.icon className="w-3.5 h-3.5"/>{l.label}
                {active && <span className="absolute -bottom-px left-3 right-3 h-0.5 bg-[#8B5CF6] rounded-full glow-soft"/>}
              </Link>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Language switcher — desktop only on the bar; mobile is in drawer */}
          <div className="relative hidden sm:block">
            <button onClick={() => { setLangOpen(!langOpen); setNotifOpen(false); }} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-[#15112A] transition-colors text-sm text-[#A78BCF]">
              <Flag code={currentLang.flag} />
              <span className="hidden md:inline">{currentLang.code.toUpperCase()}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)}/>
                <div className="absolute right-0 top-full mt-2 w-44 bg-[#1A152F] border border-[#251A40] rounded-xl shadow-2xl overflow-hidden z-50">
                  {languages.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#251A40] transition-colors ${lang === l.code ? 'text-[#F5F1FA] bg-[#251A40]/50' : 'text-[#A78BCF]'}`}>
                      <Flag code={l.flag} />
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications — desktop */}
          <button onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); }} className="hidden sm:block relative p-2 rounded-md hover:bg-[#15112A] transition-colors text-[#A78BCF]">
            <Bell className="w-5 h-5" />
            {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#8B5CF6] pulse-dot" />}
          </button>

          {/* User avatar dropdown — desktop */}
          <div className="relative hidden sm:block">
            <button onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); setLangOpen(false); }} className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-[#15112A] transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-stat">MD</div>
              <ChevronDown className="w-3 h-3 text-[#A78BCF]" />
            </button>
            {userOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)}/>
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1A152F] border border-[#251A40] rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-[#251A40]">
                    <p className="text-sm font-display font-semibold text-[#F5F1FA]">Marie Dupont</p>
                    <p className="text-xs text-[#A78BCF]">marie.d@email.com</p>
                  </div>
                  <Link href="/profile" onClick={()=>setUserOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA] hover:bg-[#251A40] transition-colors">
                    <ProfileIcon className="w-4 h-4"/>{t('nav.myprofile')}
                  </Link>
                  <Link href="/dashboard" onClick={()=>setUserOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA] hover:bg-[#251A40] transition-colors">
                    <Home className="w-4 h-4"/>{t('nav.dashboard')}
                  </Link>
                  <Link href="/creator/dashboard" onClick={()=>setUserOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA] hover:bg-[#251A40] transition-colors">
                    <CreatorIcon className="w-4 h-4"/>{t('nav.creatormode')}
                  </Link>
                  <Link href="/settings" onClick={()=>setUserOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA] hover:bg-[#251A40] transition-colors">
                    <SettingsIcon className="w-4 h-4"/>{t('nav.settings')}
                  </Link>
                  <button onClick={()=>setUserOpen(false)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-sm text-[#EF4444]/80 hover:text-[#EF4444] hover:bg-[#251A40] border-t border-[#251A40] transition-colors">
                    <LogOut className="w-4 h-4"/>{t('nav.signout')}
                  </button>
                </div>
              </>
            )}
          </div>

          <Link href="/onboarding/user" className="hidden sm:inline-flex">
            <Button className="bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BCF] text-white border-0 glow-soft transition-all" size="sm">
              {t('nav.getstarted')}
            </Button>
          </Link>

          {/* Mobile hamburger */}
          <button onClick={() => setDrawerOpen(true)} className="sm:hidden relative p-2 rounded-md hover:bg-[#15112A] transition-colors text-[#F5F1FA]" aria-label="Menu">
            <Menu className="w-6 h-6" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8B5CF6] pulse-dot" />}
          </button>
        </div>
      </div>

      {/* Notifications panel (desktop) - inside nav OK because no fixed-child issue */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] z-50 bg-[#110D24] border border-[#251A40] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#251A40]">
              <h3 className="font-display font-bold text-[#F5F1FA]">{t('nav.notifications')}</h3>
              <button onClick={() => setNotifs(notifs.map(n => ({ ...n, read: true })))} className="text-xs text-[#A78BCF] hover:text-[#F5F1FA]">{t('nav.markallread')}</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.map(n => (
                <div key={n.id} className={`p-4 border-b border-[#251A40] hover:bg-[#1A152F] cursor-pointer ${!n.read ? 'bg-[#1A152F]/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    {!n.read && <div className="w-2 h-2 mt-1.5 rounded-full bg-[#8B5CF6] shrink-0"/>}
                    <div className="flex-1">
                      <p className="text-sm text-[#F5F1FA] leading-snug">{n.title}</p>
                      <p className="text-xs text-[#A78BCF] mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </nav>

    {/* Mobile drawer (rendered outside nav to escape backdrop-filter containing block) */}
    {drawerOpen && (
      <>
        <div className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={()=>setDrawerOpen(false)}/>
        <div className="sm:hidden fixed top-0 right-0 bottom-0 w-[82%] max-w-[340px] bg-[#0F0B22] border-l border-[#251A40] z-[100] overflow-y-auto animate-[slideIn_220ms_ease] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-[#251A40] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center text-white text-sm font-stat shrink-0">MD</div>
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold text-[#F5F1FA] truncate">Marie Dupont</p>
                <p className="text-[11px] text-[#A78BCF] truncate">marie.d@email.com</p>
              </div>
            </div>
            <button onClick={()=>setDrawerOpen(false)} className="p-2 text-[#A78BCF] hover:text-[#F5F1FA] shrink-0"><X className="w-5 h-5"/></button>
          </div>

          <nav className="py-2 flex-1">
            {drawerLinks.map(l => {
              const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href));
              return (
                <Link key={l.href} href={l.href} onClick={()=>setDrawerOpen(false)} className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${active ? 'text-[#F4EFFA] bg-[#1A152F] border-l-2 border-[#8B5CF6]' : 'text-[#9B72CF] hover:text-[#F4EFFA] hover:bg-[#15112A]'}`}>
                  <l.icon className="w-5 h-5"/>{l.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#251A40] p-4 shrink-0">
            <p className="text-[10px] font-label text-[#A78BCF] mb-2">{t('ft.lang')}</p>
            <div className="flex gap-2">
              {languages.map(l => (
                <button key={l.code} onClick={()=>setLang(l.code)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${lang === l.code ? 'border-[#8B5CF6] bg-[#1A152F] text-[#F5F1FA]' : 'border-[#251A40] text-[#A78BCF]'}`}>
                  <Flag code={l.flag}/>{l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-6 shrink-0">
            <Link href="/onboarding/user" onClick={()=>setDrawerOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] hover:from-[#7C3AED] hover:to-[#A78BCF] text-white border-0 mb-2">{t('nav.getstarted')}</Button>
            </Link>
            <button onClick={()=>setDrawerOpen(false)} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-[#EF4444]/80 hover:text-[#EF4444] transition-colors">
              <LogOut className="w-4 h-4"/>{t('nav.signout')}
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}
