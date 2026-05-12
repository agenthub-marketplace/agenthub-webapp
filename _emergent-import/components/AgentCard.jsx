'use client';
import Link from 'next/link';
import { Star, ShieldCheck, TrendingUp } from 'lucide-react';
import AgentAvatar from '@/components/AgentAvatar';
import { useT } from '@/lib/i18n';

export default function AgentCard({ agent, variant = 'dark' }) {
  const { t } = useT();
  const isLight = variant === 'light';
  const card = isLight
    ? 'bg-white border border-[#E8DFCB] shadow-[0_4px_24px_rgba(107,63,160,0.08)]'
    : 'bg-[#110D24] border border-[#251A40]';
  const title = isLight ? 'text-[#1A152F]' : 'text-[#F5F1FA]';
  const pitch = isLight ? 'text-[#6B5E7D]' : 'text-[#A78BCF]';
  const muted = isLight ? 'text-[#8A7CA0]' : 'text-[#A78BCF]';
  const chip = isLight ? 'bg-[#F4EFE0] text-[#5B4880]' : 'bg-[#1A152F] text-[#D6C5E8]';
  const divider = isLight ? 'border-[#E8DFCB]' : 'border-[#251A40]';
  const avatarChip = isLight ? 'bg-[#F4EFE0] border-[#E8DFCB] text-[#5B4880]' : 'bg-[#1A152F] border-[#251A40] text-[#D6C5E8]';
  return (
    <Link href={`/agents/${agent.slug}`} className="block group">
      <div className={`card-hover ${card} rounded-2xl p-5 h-full flex flex-col`}>
        <div className="flex items-start justify-between mb-4">
          <AgentAvatar index={agent.gradient} size="lg" />
          <div className="flex flex-col gap-1.5 items-end">
            {agent.certified && (
              <span className={`flex items-center gap-1 text-[10px] font-label px-2 py-1 rounded-full border ${isLight ? 'bg-[#ECFDF5] border-[#10B981]/40' : 'bg-[#1A152F] border-[#10B981]/30'} text-[#10B981]`}><ShieldCheck className="w-3 h-3"/>{t('g.certified')}</span>
            )}
            {agent.trending && (
              <span className={`flex items-center gap-1 text-[10px] font-label px-2 py-1 rounded-full border ${isLight ? 'bg-[#FFFBEB] border-[#F59E0B]/40' : 'bg-[#1A152F] border-[#F59E0B]/30'} text-[#F59E0B]`}><TrendingUp className="w-3 h-3"/>{t('g.trending')}</span>
            )}
          </div>
        </div>
        <h3 className={`font-display font-bold text-lg mb-1 ${title}`}>{agent.name}</h3>
        <p className={`text-sm mb-3 line-clamp-1 ${pitch}`}>{agent.pitch}</p>
        <span className={`inline-block self-start text-[10px] font-label px-2 py-1 rounded-full mb-3 ${chip}`}>{agent.category}</span>
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
          <span className={`font-stat text-sm ${title}`}>{agent.rating}</span>
          <span className={`text-xs ${muted}`}>({agent.reviews} {t('g.reviews')})</span>
        </div>
        <div className={`mt-auto pt-3 border-t ${divider} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-stat border ${avatarChip}`}>{agent.creator.avatar}</div>
            <span className={`text-xs ${muted}`}>{agent.creator.name}</span>
          </div>
          <div className="text-right">
            <span className={`font-stat text-base ${title}`}>{t('g.from')} €{agent.fromPrice}</span>
            <span className={`text-xs ${muted}`}>/{agent.priceMode}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
