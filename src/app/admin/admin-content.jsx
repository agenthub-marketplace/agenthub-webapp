'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { AGENT_RUNTIME_TYPE_LABELS, EXECUTION_MODE_OPTIONS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { Check, X, Edit, Lock, Search, Eye, Ban, Trash2, Flag, BarChart3 } from 'lucide-react';
import { adminStats } from '@/lib/mock-data';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { approveCreatorEndpointAssetsAction, approveWorkflowAutomationAssetsAction, moderateAgentPublicationAction, reviewAgentAction } from '@/server/admin/actions';

const USERS = [
  { name: 'Marie Dupont', email: 'marie.dupont@example.com', type: 'Utilisateur', joined: '12 août 2025', rentals: 14, status: 'Actif' },
  { name: 'Thomas R.', email: 'thomas.r@example.com', type: 'Créateur', joined: '3 juin 2025', rentals: 1240, status: 'Actif' },
  { name: 'Lucas D.', email: 'lucas.d@example.com', type: 'Utilisateur', joined: '22 sept 2025', rentals: 8, status: 'Actif' },
  { name: 'Sophie M.', email: 'sophie.m@example.com', type: 'Créateur', joined: '15 nov 2025', rentals: 532, status: 'Actif' },
  { name: 'Spam Account', email: 'spam@bad.com', type: 'Utilisateur', joined: '1 juin 2026', rentals: 0, status: 'Suspendu' },
];
const REPORTS = [
  { id: 'r1', type: 'Contenu inapproprié', reporter: 'Emma L.', date: '28 mai 2026', status: 'Ouvert', prio: 'Haute' },
  { id: 'r2', type: 'Spam', reporter: 'Marc D.', date: '25 mai 2026', status: 'En cours', prio: 'Moyenne' },
  { id: 'r3', type: 'Violation CGU', reporter: 'Julie F.', date: '20 mai 2026', status: 'Résolu', prio: 'Basse' },
];
const revData = Array.from({length:30}, (_,i)=>({ day: i+1, amount: Math.round(200 + Math.sin(i/4)*80 + Math.random()*100 + i*3) }));

function formatSubmittedAt(value) {
  return new Date(value).toLocaleDateString('fr-FR');
}

const reviewErrors = {
  'missing-config': 'Configuration Supabase manquante.',
  'invalid-review': 'Décision de validation invalide.',
  'agent-not-found': 'Agent introuvable.',
  'agent-not-reviewable': 'Cet agent n’est plus en attente de validation.',
  'agent-must-be-in-review': 'Prenez d’abord cet agent en revue avant de décider.',
  'changes-notes-required': 'Ajoutez une demande de modification claire avant l’envoi.',
  'forbidden-risk': 'Les agents forbidden_beta ne peuvent pas être approuvés en beta.',
  'runtime-disabled': 'Ce runtime AgentHub Code est désactivé et ne peut pas être approuvé.',
  'workflow-invalid': 'La définition workflow est invalide.',
  'workflow-not-approved': 'Le workflow automation doit être approuvé avant publication.',
  'workflow-approval-failed': 'Impossible d’approuver le workflow automation.',
  'workflow-endpoint-approval-failed': 'Impossible d’approuver l’endpoint webhook creator.',
  'workflow-endpoint-not-approved': 'Un endpoint webhook du workflow n’est pas encore approuvé.',
  'creator-endpoint-invalid': 'La configuration Agent API est invalide.',
  'creator-endpoint-approval-failed': 'Impossible d’approuver l’API creator.',
  'creator-endpoint-config-approval-failed': 'Impossible d’approuver la configuration endpoint.',
  'creator-endpoint-not-approved': 'L’API creator doit être approuvée avant publication.',
  'agent-update-failed': 'Impossible de mettre à jour le statut de l’agent.',
  'review-log-failed': 'Le statut a été changé, mais le journal de review n’a pas pu être créé.',
  'invalid-moderation': 'Action de modération invalide.',
  'agent-moderation-failed': 'Impossible de modifier la publication de cet agent.',
};

const agentStatusLabels = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  in_review: 'En revue',
  approved: 'Publié',
  rejected: 'Rejeté',
  suspended: 'Suspendu',
  archived: 'Archivé',
};

const agentStatusClasses = {
  draft: 'border-[#6B7280]/30 bg-[#6B7280]/10 text-[#D1D5DB]',
  submitted: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
  in_review: 'border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#C4B5FD]',
  approved: 'border-[#10B981]/30 bg-[#10B981]/10 text-[#6EE7B7]',
  rejected: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#FCA5A5]',
  suspended: 'border-[#F97316]/30 bg-[#F97316]/10 text-[#FDBA74]',
  archived: 'border-[#6B7280]/30 bg-[#6B7280]/10 text-[#D1D5DB]',
};

function hasChangesRequest(agent) {
  return agent?.latestAdminReview?.decision === 'in_review' && Boolean(agent.latestAdminReview.notes?.trim());
}

function cleanAdminNotes(notes) {
  return (notes || '')
    .replace(/^\s*Modifications demandées\s*:\s*/i, '')
    .trim();
}

function isCreatorResubmissionNote(note) {
  return Boolean(note && note !== 'Initial creator submission.' && note !== 'Creator resubmission after admin feedback.');
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function statusLabel(agent) {
  if (hasChangesRequest(agent)) {
    return 'MODIFS DEMANDÉES';
  }

  return agent.status;
}

function AdminPage({ agentManagement, error, locale = 'fr', moderated, profile, reviewed, reviewQueue }) {
  const [tab, setTab] = useState(moderated ? 'agents' : 'queue');
  const [selected, setSelected] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionText, setActionText] = useState('');
  const queue = reviewQueue?.queue ?? [];
  const queueError = reviewQueue?.error;
  const managedAgents = agentManagement?.agents ?? [];
  const managedAgentsError = agentManagement?.error;
  const activeSelection = selected && queue.some((item) => item.id === selected.id) ? selected : queue[0] ?? null;

  return (
    <div className="min-h-screen ">
      <Navbar profile={profile} />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-label text-xs text-[#F59E0B] mb-2">Admin</p>
            <h1 className="font-display text-4xl font-bold text-[#F5F1FA]">Panneau d’administration</h1>
          </div>
          <span className="text-[10px] font-label px-3 py-1.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]">Accès restreint</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Revenus aujourd’hui', value: `€${adminStats.revenueToday}` },
            { label: 'Revenus ce mois', value: `€${adminStats.revenueMonth.toLocaleString('fr-FR')}` },
            { label: 'Locations actives', value: adminStats.activeRentalsNow },
            { label: 'Validations', value: queue.length, badge: true },
            { label: 'Nouveaux utilisateurs', value: adminStats.newUsersToday },
          ].map(s => (
            <div key={s.label} className="bg-[#110D24] border border-[#251A40] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#A78BCF] mb-2">{s.label}</p>
              <p className={`font-stat text-2xl glow-text ${s.badge ? 'text-[#F59E0B]' : 'text-[#F5F1FA]'}`}>{s.value}</p>
              {s.badge && <p className="text-[10px] text-[#F59E0B] mt-1">⚠ En attente</p>}
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-[#251A40] mb-6 overflow-x-auto">
          {[
            { id: 'queue', label: 'File de validation' },
            { id: 'agents', label: 'Tous les agents' },
            { id: 'users', label: 'Utilisateurs' },
            { id: 'revenue', label: 'Revenus' },
            { id: 'reports', label: 'Signalements' },
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} className={`px-5 py-3 text-sm font-display font-semibold relative whitespace-nowrap ${tab === t.id ? 'text-[#F5F1FA]' : 'text-[#A78BCF] hover:text-[#D6C5E8]'}`}>
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]"/>}
            </button>
          ))}
        </div>

        {reviewed && (
          <div className="mb-6 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            Décision admin enregistrée.
          </div>
        )}

        {moderated && (
          <div className="mb-6 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            Publication agent mise à jour.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
            {reviewErrors[error] || 'Impossible d’enregistrer la décision admin.'}
          </div>
        )}

        {tab === 'queue' && (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-3">
              {queueError && (
                <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
                  Impossible de charger la file de validation.
                </div>
              )}
              {!queueError && queue.length === 0 && (
                <div className="rounded-xl border border-[#251A40] bg-[#110D24] p-6 text-center">
                  <p className="font-display font-bold text-[#F5F1FA]">Aucun agent en attente</p>
                  <p className="mt-2 text-sm text-[#A78BCF]">Les agents soumis par les créateurs apparaîtront ici.</p>
                </div>
              )}
              {queue.map(p => (
                <button key={p.id} onClick={()=>{ setSelected(p); setActionType(null); }} className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === p.id ? 'border-[#8B5CF6] bg-[#1A152F] glow-soft' : 'border-[#251A40] bg-[#110D24] hover:border-[#6B3FA0]'}`}>
                  <div className="flex justify-between mb-1">
                    <p className="font-display font-bold text-[#F5F1FA]">{p.name}</p>
                    <span className="text-[10px] font-label text-[#F59E0B]">{formatSubmittedAt(p.createdAt)}</span>
                  </div>
                  <p className="text-xs text-[#A78BCF]">par {p.creatorName || 'Créateur inconnu'}</p>
                  <p className="text-xs text-[#D6C5E8] mt-2">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-label">
                    <span className="rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-[#F59E0B]">{statusLabel(p)}</span>
                    <span className="rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-1 text-[#C4B5FD]">{p.riskLevel}</span>
                  </div>
                </button>
              ))}
            </div>
            {activeSelection && (
              <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5 lg:sticky lg:top-20 lg:self-start">
                <h3 className="font-display font-bold text-xl mb-3">{activeSelection.name}</h3>
                <p className="text-xs text-[#A78BCF] mb-4">
                  Soumis par {activeSelection.creatorName || 'Créateur inconnu'} · {formatSubmittedAt(activeSelection.createdAt)}
                </p>
                <div className="mb-4 rounded-lg border border-[#251A40] bg-[#0A0816] p-3">
                  <p className="font-label mb-2 text-xs text-[#A78BCF]">Résumé</p>
                  <p className="text-sm text-[#D6C5E8]">{activeSelection.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-label">
                    {activeSelection.categoryName && <span className="rounded-full bg-[#1A152F] px-2 py-1 text-[#A78BCF]">{activeSelection.categoryName}</span>}
                    <span className="rounded-full bg-[#1A152F] px-2 py-1 text-[#A78BCF]">{activeSelection.pricingType}</span>
                    <span className="rounded-full bg-[#1A152F] px-2 py-1 text-[#A78BCF]">{activeSelection.riskLevel}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="font-label text-xs text-[#A78BCF] mb-2 flex items-center gap-1"><Lock className="w-3 h-3"/>Contrat agent à vérifier</p>
                  <div className="space-y-3 rounded-lg border border-[#251A40] bg-[#0A0816] p-3 text-xs text-[#D6C5E8]">
                    <div className="grid gap-2 md:grid-cols-4">
                      <div className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-2">
                        <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Runtime type</p>
                        <p className="font-label text-[10px] text-[#6EE7B7]">
                          {AGENT_RUNTIME_TYPE_LABELS[activeSelection.contract.runtimeType] || activeSelection.contract.runtimeType}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-2">
                        <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Expérience workspace</p>
                        <p className="font-label text-[10px] text-[#C4B5FD]">
                          {WORKSPACE_MODE_LABELS[activeSelection.contract.workspaceMode] || activeSelection.contract.workspaceMode}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#251A40] bg-[#110D24] p-2">
                        <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Setup utilisateur</p>
                        <p className="font-label text-[10px] text-[#D6C5E8]">
                          {optionLabel(SETUP_REQUIREMENT_OPTIONS, activeSelection.contract.setupRequirements.type)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#251A40] bg-[#110D24] p-2">
                        <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Mode d’exécution</p>
                        <p className="font-label text-[10px] text-[#D6C5E8]">
                          {optionLabel(EXECUTION_MODE_OPTIONS, activeSelection.contract.executionMode)}
                        </p>
                      </div>
                    </div>
                    <div className={`rounded-lg border p-2 ${activeSelection.runtimeSetting?.enabled ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#6EE7B7]' : 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#FCA5A5]'}`}>
                      <p className="font-label mb-1 text-[10px]">Runtime settings</p>
                      {activeSelection.runtimeSetting ? (
                        <p>
                          enabled: {activeSelection.runtimeSetting.enabled ? 'oui' : 'non'} · creator visible:{' '}
                          {activeSelection.runtimeSetting.creatorVisible ? 'oui' : 'non'} · run enabled:{' '}
                          {activeSelection.runtimeSetting.runEnabled ? 'oui' : 'non'}
                        </p>
                      ) : (
                        <p>Configuration runtime introuvable. L’approbation est bloquée par sécurité.</p>
                      )}
                    </div>
                    <div>
                      <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Promesse de résultat</p>
                      <p>{activeSelection.contract.outputPromise.summary || 'Promesse non renseignée.'}</p>
                    </div>
                    {activeSelection.contract.outputPromise.examples.length > 0 && (
                      <div>
                        <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Exemples</p>
                        <ul className="list-disc space-y-1 pl-4">
                          {activeSelection.contract.outputPromise.examples.map((example, index) => (
                            <li key={`${example}-${index}`}>{example}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeSelection.contract.setupRequirements.items.length > 0 && (
                      <div>
                        <p className="font-label mb-1 text-[10px] text-[#A78BCF]">Setup demandé</p>
                        <ul className="list-disc space-y-1 pl-4">
                          {activeSelection.contract.setupRequirements.items.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                {activeSelection.workflow && (
                  <div className="mb-4 rounded-lg border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-label mb-1 text-[10px] text-[#F59E0B]">Agent workflow beta</p>
                        <p>Statut workflow : {activeSelection.workflow.status}</p>
                      </div>
                      <form action={approveWorkflowAutomationAssetsAction}>
                        <input type="hidden" name="agent_id" value={activeSelection.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <Button type="submit" size="sm" className="border-0 bg-[#F59E0B] text-[#111827] hover:bg-[#FBBF24]">
                          Approuver assets workflow
                        </Button>
                      </form>
                    </div>
                    <ol className="space-y-2">
                      {activeSelection.workflow.steps.map((step, index) => (
                        <li key={`${step.label}-${index}`} className="rounded-lg border border-[#F59E0B]/25 bg-[#0A0816] p-2">
                          <span className="font-label text-[10px]">{index + 1}. {step.type}</span>
                          <p className="mt-1 text-[#D6C5E8]">{step.label}</p>
                          {step.endpointId && (
                            <p className="mt-1 text-[10px] text-[#F6C177]">
                              Endpoint : {step.endpointStatus || 'introuvable'}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {activeSelection.creatorEndpoint && (
                  <div className="mb-4 rounded-lg border border-[#C4B5FD]/35 bg-[#8B5CF6]/10 p-3 text-xs text-[#D6C5E8]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-label mb-1 text-[10px] text-[#C4B5FD]">Creator endpoint beta</p>
                        <p>Statut config : {activeSelection.creatorEndpoint.status}</p>
                        <p className="mt-1 text-[10px] text-[#A78BCF]">
                          Endpoint : {activeSelection.creatorEndpoint.endpointStatus || 'introuvable'}
                        </p>
                      </div>
                      <form action={approveCreatorEndpointAssetsAction}>
                        <input type="hidden" name="agent_id" value={activeSelection.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <Button type="submit" size="sm" className="border-0 bg-[#8B5CF6] text-white hover:bg-[#7C3AED]">
                          Approuver endpoint
                        </Button>
                      </form>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#C8B1E4]">
                      L’endpoint est appelé uniquement côté serveur par AgentHub, avec signature HMAC et timeout.
                    </p>
                  </div>
                )}
                <div className="mb-4 rounded-lg border border-[#251A40] bg-[#0A0816] p-3 text-xs text-[#D6C5E8]">
                  <p className="font-label mb-2 text-[10px] text-[#A78BCF]">Checklist admin</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      'Promesse compréhensible',
                      'Limites visibles',
                      'Risque cohérent',
                      'Prix cohérent',
                      'Setup après activation clair',
                      'Data policy cohérente',
                      'Agent non forbidden_beta',
                    ].map((item) => (
                      <span key={item} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-[#10B981]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                {isCreatorResubmissionNote(activeSelection.resubmissionChangelog) && (
                  <div className="mb-4 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-3 text-sm text-[#6EE7B7]">
                    <p className="font-label mb-1 text-[10px] text-[#10B981]">Modifications apportées par le créateur</p>
                    <p className="whitespace-pre-line leading-relaxed">{activeSelection.resubmissionChangelog}</p>
                  </div>
                )}
                {activeSelection.status === 'in_review' && (
                  <div className={`mb-4 rounded-xl border p-3 text-sm ${hasChangesRequest(activeSelection) ? 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F6C177]' : 'border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#C4B5FD]'}`}>
                    <p className="font-label mb-1 text-[10px]">
                      {hasChangesRequest(activeSelection) ? 'Demande de modification en cours' : 'Agent en revue'}
                    </p>
                    <p className="leading-relaxed">
                      {hasChangesRequest(activeSelection)
                        ? cleanAdminNotes(activeSelection.latestAdminReview.notes)
                        : 'Vous pouvez maintenant approuver, demander des modifications ou refuser cet agent.'}
                    </p>
                  </div>
                )}
                {actionType === null && (
                  <div className="space-y-2">
                    {activeSelection.status === 'submitted' && (
                      <form action={reviewAgentAction}>
                        <input type="hidden" name="agent_id" value={activeSelection.id} />
                        <input type="hidden" name="decision" value="start_review" />
                        <input type="hidden" name="locale" value={locale} />
                        <Button type="submit" size="sm" variant="outline" className="w-full bg-transparent border-[#8B5CF6] text-[#C4B5FD] hover:bg-[#8B5CF6]/10">
                          <Eye className="w-4 h-4 mr-1" />
                          Prendre en revue
                        </Button>
                      </form>
                    )}
                    {activeSelection.status === 'in_review' && (
                      <div className="flex gap-2">
                        <form action={reviewAgentAction} className="flex-1">
                          <input type="hidden" name="agent_id" value={activeSelection.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <input type="hidden" name="locale" value={locale} />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!activeSelection.runtimeSetting?.enabled}
                            className="w-full bg-[#10B981] hover:bg-[#059669] text-white border-0 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 mr-1"/>
                            Approuver
                          </Button>
                        </form>
                        <Button
                          size="sm"
                          onClick={() => {
                            setActionText(hasChangesRequest(activeSelection) ? cleanAdminNotes(activeSelection.latestAdminReview.notes) : '');
                            setActionType('changes');
                          }}
                          variant="outline"
                          className="flex-1 bg-transparent border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
                        >
                          <Edit className="w-4 h-4 mr-1"/>
                          {hasChangesRequest(activeSelection) ? 'Modifier la demande' : 'Modifications'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setActionText('');
                            setActionType('reject');
                          }}
                          variant="outline"
                          className="flex-1 bg-transparent border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
                        >
                          <X className="w-4 h-4 mr-1"/>
                          Refuser
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {actionType !== null && actionType !== 'approve' && (
                  <form action={reviewAgentAction} className="space-y-2">
                    <input type="hidden" name="agent_id" value={activeSelection.id} />
                    <input type="hidden" name="decision" value={actionType} />
                    <input type="hidden" name="locale" value={locale} />
                    <textarea name="notes" value={actionText} onChange={e=>setActionText(e.target.value)} rows={3} placeholder={actionType === 'changes' ? 'Modifications à demander…' : 'Raison du refus…'} className="w-full p-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none resize-none"/>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="flex-1 bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white">Envoyer</Button>
                      <Button type="button" size="sm" variant="outline" onClick={()=>setActionType(null)} className="bg-transparent border-[#251A40] text-[#A78BCF]">Annuler</Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#251A40]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A78BCF]"/>
                <input placeholder="Rechercher par email ou nom…" className="w-full max-w-md h-10 pl-10 pr-3 bg-[#0A0816] border border-[#251A40] rounded-lg text-sm text-[#F5F1FA] focus:border-[#8B5CF6] focus:outline-none"/>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]"><th className="text-left p-3">Nom</th><th>Email</th><th>Type</th><th>Inscrit</th><th>Locations</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {USERS.map((u,i) => (
                  <tr key={i} className="border-b border-[#251A40] hover:bg-[#1A152F]">
                    <td className="p-3 text-[#F5F1FA] font-display font-semibold">{u.name}</td>
                    <td className="text-[#D6C5E8]">{u.email}</td>
                    <td><span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A152F] text-[#D6C5E8]">{u.type}</span></td>
                    <td className="text-[#A78BCF] text-xs">{u.joined}</td>
                    <td className="text-center font-stat text-[#F5F1FA]">{u.rentals}</td>
                    <td><span className={`text-[10px] font-label px-2 py-1 rounded-full ${u.status === 'Actif' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'}`}>{u.status}</span></td>
                    <td className="text-right pr-3">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#A78BCF]" title="Voir"><Eye className="w-3.5 h-3.5"/></button>
                        <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#F59E0B]" title="Suspendre"><Ban className="w-3.5 h-3.5"/></button>
                        <button className="p-1.5 rounded hover:bg-[#1A152F] text-[#EF4444]" title="Supprimer"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'agents' && (
          <div id="agents" className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-hidden">
            <div className="border-b border-[#251A40] p-5">
              <p className="font-display text-xl font-bold text-[#F5F1FA]">Tous les agents</p>
              <p className="mt-1 text-xs text-[#A78BCF]">
                Backup sécurité : suspendez temporairement un agent publié pour le retirer de la marketplace. Les agents suspendus peuvent ensuite être archivés pour nettoyer cette liste sans supprimer l’historique.
              </p>
            </div>
            {managedAgentsError && (
              <div className="m-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
                Impossible de charger les agents.
              </div>
            )}
            {!managedAgentsError && managedAgents.length === 0 && (
              <div className="p-8 text-center text-sm text-[#A78BCF]">Aucun agent trouvé.</div>
            )}
            {!managedAgentsError && managedAgents.length > 0 && (
              <div className="divide-y divide-[#251A40]">
                {managedAgents.map((agent) => (
                  <div key={agent.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="font-display font-bold text-[#F5F1FA]">{agent.name}</p>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-label ${agentStatusClasses[agent.status]}`}>
                          {agentStatusLabels[agent.status] || agent.status}
                        </span>
                        {agent.categoryName && (
                          <span className="rounded-full bg-[#1A152F] px-2 py-1 text-[10px] font-label text-[#A78BCF]">
                            {agent.categoryName}
                          </span>
                        )}
                      </div>
                      <p className="max-w-3xl text-sm text-[#D6C5E8]">{agent.summary}</p>
                      <p className="mt-2 text-xs text-[#A78BCF]">
                        Créateur : {agent.creatorName || 'Créateur inconnu'} · {agent.pricingType} · {agent.riskLevel} · {formatSubmittedAt(agent.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {agent.status === 'approved' && (
                        <form action={moderateAgentPublicationAction}>
                          <input type="hidden" name="agent_id" value={agent.id} />
                          <input type="hidden" name="moderation_action" value="suspend" />
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="reason" value="Temporary admin safety suspension" />
                          <Button type="submit" size="sm" variant="outline" className="bg-transparent border-[#F97316] text-[#FDBA74] hover:bg-[#F97316]/10">
                            <Ban className="mr-1 h-4 w-4" />
                            Retirer temporairement
                          </Button>
                        </form>
                      )}
                      {agent.status === 'suspended' && (
                        <>
                          <form action={moderateAgentPublicationAction}>
                            <input type="hidden" name="agent_id" value={agent.id} />
                            <input type="hidden" name="moderation_action" value="restore" />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="reason" value="Admin restored publication after safety review" />
                            <Button type="submit" size="sm" className="border-0 bg-[#10B981] text-white hover:bg-[#059669]">
                              <Check className="mr-1 h-4 w-4" />
                              Remettre en ligne
                            </Button>
                          </form>
                          <form action={moderateAgentPublicationAction}>
                            <input type="hidden" name="agent_id" value={agent.id} />
                            <input type="hidden" name="moderation_action" value="archive" />
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="reason" value="Admin archived suspended agent after safety removal" />
                            <Button type="submit" size="sm" variant="outline" className="bg-transparent border-[#6B7280] text-[#D1D5DB] hover:bg-[#6B7280]/10">
                              <Trash2 className="mr-1 h-4 w-4" />
                              Archiver définitivement
                            </Button>
                          </form>
                        </>
                      )}
                      {!['approved', 'suspended'].includes(agent.status) && (
                        <span className="rounded-lg border border-[#251A40] px-3 py-2 text-xs text-[#7F6B9C]">
                          Action publication indisponible
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'revenue' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#8B5CF6]"/>Revenus 30 jours</h3>
              <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8]">Exporter CSV</Button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#251A40" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="day" stroke="#A78BCF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke="#A78BCF" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v=>`€${v}`}/>
                  <Tooltip contentStyle={{ background: '#1A152F', border: '1px solid #8B5CF6', borderRadius: 12, color: '#F5F1FA' }} formatter={v=>[`€${v}`,'Revenu']}/>
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3">
            {REPORTS.map(r => (
              <div key={r.id} className="bg-[#110D24] border border-[#251A40] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flag className={`w-5 h-5 ${r.prio === 'Haute' ? 'text-[#EF4444]' : r.prio === 'Moyenne' ? 'text-[#F59E0B]' : 'text-[#A78BCF]'}`}/>
                  <div>
                    <p className="font-display font-semibold text-[#F5F1FA]">{r.type}</p>
                    <p className="text-xs text-[#A78BCF]">Signalé par {r.reporter} · {r.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-label px-2 py-1 rounded-full ${r.status === 'Résolu' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : r.status === 'En cours' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30' : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'}`}>{r.status}</span>
                  <Button size="sm" variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8]">Gérer</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
