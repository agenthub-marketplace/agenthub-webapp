'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Mail } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function Footer({ variant = 'agenthub', compact = false }) {
  const { t, lang } = useT();
  const isCode = variant === 'code';
  const isEnglish = lang === 'en';
  const marketplacePath = isEnglish ? '/en/search' : '/agenthub/search';
  const workspacePath = isEnglish ? '/en/workspace' : '/agenthub/workspace';
  const primaryLinks = isCode
    ? [
        { label: 'Pilotage AgentHub Code', href: '/code/dashboard' },
        { label: 'Mes agents', href: '/code/agents' },
        { label: 'Créer un agent', href: '/code/agents/new' },
        { label: 'Documentation', href: '/code/docs' },
      ]
    : [
        { label: t('nav.discoveragents'), href: marketplacePath },
        { label: t('nav.workspace'), href: workspacePath },
        { label: t('nav.leaderboard'), href: '/leaderboard' },
        { label: isEnglish ? 'Profile' : 'Profil', href: '/profile' },
        { label: isEnglish ? 'Settings' : 'Paramètres', href: '/settings' },
      ];
  const cta = isCode
    ? {
        href: '/code/agents/new',
        label: 'Publier un agent',
        text: 'Prépare une fiche, son contrat d’usage et son runtime avant validation.',
      }
    : {
        href: marketplacePath,
        label: isEnglish ? 'Explore agents' : 'Explorer les agents',
        text: isEnglish
          ? 'Find an agent by need, activate it, then keep it in your workspace.'
          : 'Trouve un agent par besoin, active-le, puis retrouve-le dans ton espace.',
      };
  const socials = [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/agenthub', icon: ArrowUpRight },
    { label: 'Contact', href: 'mailto:contact@agenthub.ai', icon: Mail },
  ];

  return (
    <footer className={`${compact ? 'mt-14' : 'mt-24'} border-t border-[#251A40] bg-[#070511]`}>
      <div className={`container px-4 ${compact ? 'py-8' : 'py-12'}`}>
        <div className={`${compact ? 'flex flex-col gap-6 border-b border-[#251A40] pb-6 lg:flex-row lg:items-center lg:justify-between' : 'grid gap-8 border-b border-[#251A40] pb-10 lg:grid-cols-[1.15fr_1fr_0.85fr] lg:items-start'}`}>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/95">
                <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" />
              </div>
              <span className="font-display text-2xl font-bold text-[#F5F1FA]">{isCode ? 'AgentHub Code' : 'AgentHub'}</span>
            </div>
            {!compact && <p className="max-w-sm text-sm leading-6 text-[#A78BCF]">
              {isCode
                ? "L’espace créateur pour préparer, publier et suivre des agents prêts à être utilisés sur AgentHub."
                : t('ft.tagline')}
            </p>}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={social.label}
                  className="footer-social-link inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-[#251A40] bg-[#110D24] px-3 text-xs font-semibold text-[#A78BCF] transition-colors hover:border-[#8B5CF6] hover:text-[#F5F1FA]"
                >
                  <social.icon className="h-3.5 w-3.5" />
                  {social.label}
                </Link>
              ))}
            </div>
          </div>

          <nav aria-label="Navigation secondaire">
            <h4 className="font-label mb-4 text-xs text-[#F5F1FA]">Accès utiles</h4>
            <ul className={`${compact ? 'flex flex-wrap gap-x-5 gap-y-2' : 'grid gap-2 sm:grid-cols-2'}`}>
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#A78BCF] transition-colors hover:text-[#F5F1FA]"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {!compact && <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-5">
            <p className="font-label text-xs text-[#A78BCF]">{isCode ? 'Créer' : 'Commencer'}</p>
            <p className="mt-3 text-sm leading-6 text-[#D6C5E8]">{cta.text}</p>
            <Link
              href={cta.href}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#110D24] transition-colors hover:bg-[#F2E9D8]"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-[#A78BCF]">{t('ft.rights')}</p>
          <a href="mailto:contact@agenthub.ai" className="text-xs font-medium text-[#A78BCF] transition-colors hover:text-[#F5F1FA]">
            contact@agenthub.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
