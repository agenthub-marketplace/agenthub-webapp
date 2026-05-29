'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function Footer({ variant = 'agenthub' }) {
  const { t } = useT();
  const isCode = variant === 'code';
  const cols = [
    {
      title: t('ft.product'),
      links: [
        { label: t('nav.discoveragents'), href: '/agenthub/search' },
        { label: t('nav.leaderboard'), href: '/leaderboard' },
        { label: t('nav.workspace'), href: '/agenthub/workspace' },
        { label: t('nav.creatormode'), href: '/code' },
      ],
    },
    {
      title: t('ft.resources'),
      links: [
        { label: t('ft.help'), href: '#' },
        { label: t('ft.docs'), href: isCode ? '/code/docs' : '#' },
        { label: t('ft.blog'), href: '#' },
        { label: t('ft.apidocs'), href: isCode ? '/code/docs' : '#' },
      ],
    },
    {
      title: t('ft.company'),
      links: [
        { label: t('ft.about'), href: '#' },
        { label: t('ft.careers'), href: '#' },
        { label: t('ft.press'), href: '#' },
        { label: t('ft.contact'), href: '#' },
      ],
    },
  ];
  const socials = [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/agenthub', mark: 'in' },
    { label: 'Mail', href: 'mailto:contact@agenthub.ai', icon: Mail },
  ];

  return (
    <footer className="border-t border-[#251A40] mt-24 bg-[#0A0816] ">
      <div className="container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/95 flex items-center justify-center">
                <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" />
              </div>
              <span className="font-display text-xl font-bold">AgentHub</span>
            </div>
            <p className="text-sm text-[#A78BCF] leading-relaxed">
              {isCode
                ? "La marketplace d'agents IA, créée par des développeurs pour des développeurs."
                : t('ft.tagline')}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={social.label}
                  className="footer-social-link flex h-9 w-9 items-center justify-center rounded-xl border border-[#251A40] bg-[#110D24] text-[#A78BCF] transition-colors hover:border-[#8B5CF6] hover:text-[#F5F1FA]"
                >
                  {social.icon ? <social.icon className="h-4 w-4" /> : <span className="font-display text-sm font-bold">{social.mark}</span>}
                </Link>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="font-label text-xs text-[#F5F1FA] mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-[#A78BCF] hover:text-[#F5F1FA]">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#251A40] pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#A78BCF]">{t('ft.rights')}</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-xs text-[#A78BCF] hover:text-[#F5F1FA]">{t('ft.privacy')}</Link>
            <Link href="#" className="text-xs text-[#A78BCF] hover:text-[#F5F1FA]">{t('ft.terms')}</Link>
            <Link href="#" className="text-xs text-[#A78BCF] hover:text-[#F5F1FA]">{t('ft.cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
