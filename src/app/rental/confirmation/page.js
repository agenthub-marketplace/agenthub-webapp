'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useT } from '@/lib/i18n';

function ConfirmationPage() {
  const { t } = useT();
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-20 max-w-2xl text-center">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-[#7C3AED] rounded-full blur-2xl opacity-50"/>
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#532B88] to-[#7C3AED] flex items-center justify-center glow-primary">
            <svg viewBox="0 0 50 50" className="w-14 h-14">
              <polyline className="checkmark-draw" points="12,26 22,36 38,16" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{t('cf.active')}</h1>
        <p className="text-lg text-[#C8B1E4] mb-8">{t('cf.ready')}</p>
        <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mb-8 text-left">
          <div className="flex justify-between mb-2"><span className="text-sm text-[#9B72CF]">{t('rent.agent')}</span><span className="text-[#F4EFFA]">LegalDraft Pro</span></div>
          <div className="flex justify-between mb-2"><span className="text-sm text-[#9B72CF]">{t('rent.mode')}</span><span className="text-[#F4EFFA]">Location 3 jours</span></div>
          <div className="flex justify-between"><span className="text-sm text-[#9B72CF]">{t('cf.totalpaid')}</span><span className="font-stat text-[#F4EFFA]">€24</span></div>
        </div>
        <Link href="/workspace"><Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-12 px-8 text-base">{t('cf.start')}</Button></Link>
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#9B72CF] mt-6"><Mail className="w-3 h-3"/>{t('cf.email', { email: 'marie.dupont@example.com' })}</p>
      </div>
    </div>
  );
}

export default ConfirmationPage;
