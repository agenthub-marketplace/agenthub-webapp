'use client';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Star } from 'lucide-react';
import AgentAvatar from '@/components/AgentAvatar';
import { AGENT_RUNTIME_TYPE_LABELS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { euroLabelToCredits, formatCredits } from '@/lib/format-credits';
import { useT } from '@/lib/i18n';

function compactText(value, maxLength = 74) {
  if (!value) {
    return '';
  }

  const text = String(value).trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function marketplaceInfraSignal(agent, lang) {
  const runtimeType = agent.contract?.runtimeType;
  const externalTools = agent.contract?.dataPolicy?.external_tools ?? [];

  if (runtimeType === 'creator_endpoint') {
    return {
      detail: lang === 'en'
        ? 'AgentHub proxies the approved creator endpoint server-side.'
        : 'AgentHub proxifie l’endpoint créateur approuvé côté serveur.',
      label: lang === 'en' ? 'Creator infrastructure' : 'Infra créateur',
      tone: 'warning',
    };
  }

  if (runtimeType === 'workflow_automation' && externalTools.length > 0) {
    return {
      detail: lang === 'en'
        ? 'AgentHub orchestrates the workflow with approved creator steps.'
        : 'AgentHub orchestre le workflow avec des étapes créateur approuvées.',
      label: lang === 'en' ? 'Hybrid workspace' : 'Workspace hybride',
      tone: 'warning',
    };
  }

  if (runtimeType === 'workflow_automation') {
    return {
      detail: lang === 'en'
        ? 'Workflow executed and tracked inside AgentHub.'
        : 'Workflow exécuté et suivi dans AgentHub.',
      label: lang === 'en' ? 'AgentHub workflow' : 'Workflow AgentHub',
      tone: 'success',
    };
  }

  if (runtimeType === 'document_file') {
    return {
      detail: lang === 'en'
        ? 'Private PDF/DOCX text extraction in the workspace.'
        : 'Extraction texte PDF/DOCX privée dans le workspace.',
      label: lang === 'en' ? 'Private document' : 'Document privé',
      tone: 'success',
    };
  }

  return {
    detail: lang === 'en'
      ? 'Execution and history stay inside AgentHub.'
      : 'Exécution et historique restent dans AgentHub.',
    label: lang === 'en' ? 'AgentHub hosted' : 'Hébergé AgentHub',
    tone: 'success',
  };
}

export default function AgentCard({ agent, variant = 'dark' }) {
  const { t, lang } = useT();
  const ratingLabel = agent.reviews > 0 ? Number(agent.rating).toFixed(1) : 'New';
  const hasPrice = typeof agent.fromPrice === 'number' && agent.fromPrice > 0;
  const creditLabel = hasPrice ? formatCredits(agent.fromPrice) : euroLabelToCredits(agent.priceLabel);
  const priceModeLabel = agent.priceMode === 'project'
    ? (lang === 'en' ? 'Agent purchase' : "Agent à l'achat")
    : (lang === 'en' ? 'Agent rental' : 'Agent à la location');
  const workspaceLabel = WORKSPACE_MODE_LABELS[agent.contract?.workspaceMode] || null;
  const runtimeLabel = AGENT_RUNTIME_TYPE_LABELS[agent.contract?.runtimeType] || null;
  const infraSignal = marketplaceInfraSignal(agent, lang);
  const primaryInput = agent.requiredInputs?.find((item) => item?.trim()) || '';
  const primaryDeliverable = agent.deliverables?.find((item) => item?.trim()) || agent.contract?.outputPromise?.summary || '';
  const isLight = variant === 'light';
  const card = isLight
    ? 'bg-white border border-[#E8DFCB] shadow-[0_4px_24px_rgba(107,63,160,0.08)]'
    : 'bg-[#110D24] border border-[#251A40]';
  const title = isLight ? 'text-[#1A152F]' : 'text-[#F5F1FA]';
  const pitch = isLight ? 'text-[#6B5E7D]' : 'text-[#A78BCF]';
  const muted = isLight ? 'text-[#8A7CA0]' : 'text-[#A78BCF]';
  const chip = isLight ? 'bg-[#F4EFE0] text-[#5B4880]' : 'bg-[#1A152F] text-[#D6C5E8]';
  const divider = isLight ? 'border-[#E8DFCB]' : 'border-[#251A40]';
  const fitBox = isLight ? 'border-[#E8DFCB] bg-[#FAF7FF]' : 'border-[#251A40] bg-[#080612]';
  const fitLabel = isLight ? 'text-[#6B3FA0]' : 'text-[#B794F4]';
  const infraBox = infraSignal.tone === 'warning'
    ? isLight
      ? 'border-[#F59E0B]/30 bg-[#FFFBEB] text-[#92400E]'
      : 'border-[#F59E0B]/30 bg-[#1A1208] text-[#F6C177]'
    : isLight
      ? 'border-[#10B981]/25 bg-[#ECFDF5] text-[#047857]'
      : 'border-[#10B981]/20 bg-[#071611] text-[#6EE7B7]';
  return (
    <Link href={`/agenthub/agents/${agent.slug}`} className="block group">
      <div className={`card-hover ${card} flex h-full flex-col rounded-2xl p-5`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <AgentAvatar index={agent.gradient} size="md" />
          <div className="flex flex-wrap justify-end gap-1.5">
            {agent.certified && (
              <span className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${isLight ? 'border-[#10B981]/30 bg-[#ECFDF5] text-[#047857]' : 'border-[#10B981]/25 bg-[#10281F] text-[#6EE7B7]'}`}>
                <ShieldCheck className="h-3 w-3" />
                {t('g.certified')}
              </span>
            )}
          </div>
        </div>
        <h3 className={`font-display mb-2 text-xl font-bold ${title}`}>{agent.name}</h3>
        <p className={`mb-4 line-clamp-2 text-sm leading-6 ${pitch}`}>{agent.pitch}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <span className={`inline-block self-start rounded-full px-2.5 py-1 text-[10px] font-semibold ${chip}`}>{agent.category}</span>
          {runtimeLabel && (
            <span className={`inline-block self-start rounded-full px-2.5 py-1 text-[10px] font-semibold ${isLight ? 'bg-[#F5F3FF] text-[#5B21B6]' : 'bg-[#251A40] text-[#C4B5FD]'}`}>{runtimeLabel}</span>
          )}
          {workspaceLabel && (
            <span className={`inline-block self-start rounded-full px-2.5 py-1 text-[10px] font-semibold ${chip}`}>{workspaceLabel}</span>
          )}
        </div>

        {(primaryInput || primaryDeliverable) && (
          <div className={`mb-4 grid gap-2 rounded-2xl border p-3 text-xs ${fitBox}`}>
            <div>
              <p className={`font-label mb-1 text-[10px] ${fitLabel}`}>{lang === 'en' ? 'Prepare' : 'À préparer'}</p>
              <p className={`line-clamp-1 ${pitch}`}>
                {primaryInput ? compactText(primaryInput) : (lang === 'en' ? 'Clear context for the workspace.' : 'Un contexte clair pour le workspace.')}
              </p>
            </div>
            <div>
              <p className={`font-label mb-1 text-[10px] ${fitLabel}`}>{lang === 'en' ? 'Expected result' : 'Résultat attendu'}</p>
              <p className={`line-clamp-1 ${pitch}`}>
                {primaryDeliverable ? compactText(primaryDeliverable) : (lang === 'en' ? 'Guided workspace output.' : 'Un résultat guidé dans le workspace.')}
              </p>
            </div>
          </div>
        )}

        <div className={`mb-4 rounded-2xl border p-3 text-xs ${infraBox}`}>
          <p className="font-label mb-1 text-[10px]">{lang === 'en' ? 'Infrastructure' : 'Infrastructure'}</p>
          <p className="font-semibold">{infraSignal.label}</p>
          <p className="mt-1 leading-5 opacity-90">{infraSignal.detail}</p>
        </div>

        <div className={`mt-auto border-t pt-4 ${divider}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs ${muted}`}>Créateur</p>
              <p className={`mt-1 text-sm font-semibold ${title}`}>{agent.creator.name}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
              <span className={`text-sm font-semibold ${title}`}>{ratingLabel}</span>
              {agent.reviews > 0 && <span className={`text-xs ${muted}`}>({agent.reviews})</span>}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {hasPrice ? (
              <div>
                <span className={`font-stat block text-base ${title}`}>{creditLabel}</span>
                <span className={`text-xs ${muted}`}>{priceModeLabel}</span>
              </div>
            ) : (
              <span className={`block max-w-32 text-xs font-semibold leading-tight ${muted}`}>
                {t('g.pricepending')}
              </span>
            )}
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${isLight ? 'border-[#E8DFCB] text-[#5B4880] group-hover:border-[#6B3FA0] group-hover:text-[#1A152F]' : 'border-[#251A40] text-[#A78BCF] group-hover:border-[#8B5CF6] group-hover:text-white'}`}>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
