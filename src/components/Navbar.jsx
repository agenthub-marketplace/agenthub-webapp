'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown, Home, Menu, MessageSquare, Search, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Flag from '@/components/Flag';
import { languages } from '@/lib/mock-data';
import { useT } from '@/lib/i18n';

export default function Navbar() {
  const { t, lang, setLang } = useT();
  const pathname = usePathname() || '';
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const currentLang = languages.find((l) => l.code === lang) || languages[0];
  const links = [
    { href: '/search', label: t('nav.discoveragents'), icon: Search },
    { href: '/workspace', label: t('nav.workspace'), icon: MessageSquare },
    { href: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
  ];
  const drawerLinks = [{ href: '/', label: t('nav.m.home'), icon: Home }, ...links];

  return (
    <>
      <nav className={`sticky top-0 z-[60] transition-all duration-200 ${scrolled ? 'nav-blur' : 'bg-[#080612]/90 backdrop-blur-sm border-b border-[#251A40]/70'}`}>
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_18px_rgba(139,92,246,0.45)]">
              <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" priority />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-[#F5F1FA]">AgentHub</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-all ${
                    active
                      ? 'bg-[#1A152F] text-[#F5F1FA]'
                      : 'text-[#A78BCF] hover:bg-[#15112A] hover:text-[#F5F1FA]'
                  }`}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                  {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#8B5CF6] glow-soft" />}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-[#D6C5E8] transition-colors hover:bg-[#15112A]"
              >
                <Flag code={currentLang.flag} />
                <span>{currentLang.code.toUpperCase()}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[#251A40] bg-[#1A152F] shadow-2xl">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          setLang(language.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[#251A40] ${
                          lang === language.code ? 'bg-[#251A40]/50 text-[#F5F1FA]' : 'text-[#A78BCF]'
                        }`}
                      >
                        <Flag code={language.flag} />
                        <span>{language.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Link href="/dashboard" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="border-[#6B3FA0]/70 bg-transparent text-[#F5F1FA] hover:bg-[#1A152F] hover:text-white">
                {t('nav.signin')}
              </Button>
            </Link>
            <Link href="/onboarding/user" className="hidden sm:inline-flex">
              <Button size="sm" className="border-0 bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white glow-soft transition-all hover:from-[#7C3AED] hover:to-[#A78BCF]">
                {t('nav.signup')}
              </Button>
            </Link>

            <button onClick={() => setDrawerOpen(true)} className="sm:hidden rounded-md p-2 text-[#F5F1FA] transition-colors hover:bg-[#15112A]" aria-label="Menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed bottom-0 right-0 top-0 z-[100] flex w-[82%] max-w-[340px] flex-col overflow-y-auto border-l border-[#251A40] bg-[#0F0B22] sm:hidden">
            <div className="flex items-center justify-between border-b border-[#251A40] p-4">
              <span className="font-display text-lg font-bold text-[#F5F1FA]">AgentHub</span>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-[#A78BCF] hover:text-[#F5F1FA]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 py-2">
              {drawerLinks.map((link) => {
                const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                      active
                        ? 'border-l-2 border-[#8B5CF6] bg-[#1A152F] text-[#F4EFFA]'
                        : 'text-[#9B72CF] hover:bg-[#15112A] hover:text-[#F4EFFA]'
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-[#251A40] p-4">
              <div className="mb-4 flex gap-2">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => setLang(language.code)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                      lang === language.code ? 'border-[#8B5CF6] bg-[#1A152F] text-[#F5F1FA]' : 'border-[#251A40] text-[#A78BCF]'
                    }`}
                  >
                    <Flag code={language.flag} />
                    {language.label}
                  </button>
                ))}
              </div>
              <Link href="/dashboard" onClick={() => setDrawerOpen(false)}>
                <Button variant="outline" className="mb-2 w-full border-[#6B3FA0]/70 bg-transparent text-[#F5F1FA] hover:bg-[#1A152F]">
                  {t('nav.signin')}
                </Button>
              </Link>
              <Link href="/onboarding/user" onClick={() => setDrawerOpen(false)}>
                <Button className="w-full border-0 bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white">
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
