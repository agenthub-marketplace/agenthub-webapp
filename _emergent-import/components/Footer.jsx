'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useT } from '@/lib/i18n';

export default function Footer() {
  const { t } = useT();
  const cols = [
    { title: t('ft.product'), links: [t('nav.discoveragents'), t('nav.leaderboard'), t('nav.workspace'), t('nav.creatormode')] },
    { title: t('ft.resources'), links: [t('ft.help'), t('ft.docs'), t('ft.blog'), t('ft.apidocs')] },
    { title: t('ft.company'), links: [t('ft.about'), t('ft.careers'), t('ft.press'), t('ft.contact')] },
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
            <p className="text-sm text-[#A78BCF] leading-relaxed">{t('ft.tagline')}</p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="font-label text-xs text-[#F5F1FA] mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l}><Link href="#" className="text-sm text-[#A78BCF] hover:text-[#F5F1FA]">{l}</Link></li>
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
