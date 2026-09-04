'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import AgentCard from '@/components/AgentCard';
import { formatCreditsFromCents } from '@/lib/format-credits';
import { CheckCircle2, Clock3, Flame, Star, FileText, ArrowRight, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translate, useT } from '@/lib/i18n';
import {
  formatRecentAgentViewedAt,
  getLegacyRecentAgentStorageKey,
  getRecentAgentStorageKey,
  parseRecentAgentsFromStorage,
  removeRecentAgentsFromStorage,
} from '@/lib/recent-agents';
import { submitRentalReviewAction } from '@/server/reviews/actions';
import { stopAgentAccessAction } from '@/server/rentals/actions';

function statusBadgeClass(status) {
  return (
    {
      pending: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      accepted: 'bg-[#1A152F] border-[#8B5CF6]/30 text-[#C4B5FD]',
      in_progress: 'bg-[#1A152F] border-[#0EA5E9]/30 text-[#7DD3FC]',
      delivered: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      active: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      stopped: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
      expired: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
      rejected: 'bg-[#1A152F] border-[#EF4444]/30 text-[#FCA5A5]',
      cancelled: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
    }[status] ?? 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]'
  );
}

function rentalStatusLabel(status, lang) {
  const labels = {
    fr: {
      pending: 'En attente',
      accepted: 'Active',
      in_progress: 'En cours',
      delivered: 'Terminée',
      active: 'Active',
      stopped: 'Arrêtée',
      expired: 'Expirée',
      rejected: 'Refusée',
      cancelled: 'Annulée',
    },
    en: {
      pending: 'Pending',
      accepted: 'Active',
      in_progress: 'In progress',
      delivered: 'Completed',
      active: 'Active',
      stopped: 'Stopped',
      expired: 'Expired',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    },
  };

  return labels[lang === 'en' ? 'en' : 'fr'][status] ?? status;
}

function paymentStatusLabel(status, lang, hasAccess = false, rentalStatus = null) {
  if (rentalStatus === 'stopped' || rentalStatus === 'expired') {
    return lang === 'en' ? 'Access stopped' : 'Accès arrêté';
  }

  const labels = {
    fr: {
      pending: 'Paiement en attente',
      paid: hasAccess ? 'Accès activé' : 'Activation en cours',
      paid_blocked: 'Activation bloquée',
      failed: 'Paiement échoué',
      cancelled: 'Paiement annulé',
    },
    en: {
      pending: 'Payment pending',
      paid: hasAccess ? 'Access active' : 'Activation pending',
      paid_blocked: 'Activation blocked',
      failed: 'Payment failed',
      cancelled: 'Payment cancelled',
    },
  };

  return labels[lang === 'en' ? 'en' : 'fr'][status] ?? status;
}

function paymentStatusClass(status) {
  return (
    {
      pending: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      paid: 'bg-[#1A152F] border-[#10B981]/30 text-[#6EE7B7]',
      paid_blocked: 'bg-[#1A152F] border-[#F59E0B]/30 text-[#F59E0B]',
      failed: 'bg-[#1A152F] border-[#EF4444]/30 text-[#FCA5A5]',
      cancelled: 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]',
    }[status] ?? 'bg-[#1A152F] border-[#6B7280]/30 text-[#D1D5DB]'
  );
}

function StructuredBrief({ inputs, lang }) {
  if (!inputs || typeof inputs !== 'object') {
    return null;
  }

  const rows = [
    [lang === 'en' ? 'Goal' : 'Objectif', inputs.objective],
    [lang === 'en' ? 'Context' : 'Contexte', inputs.context],
    [lang === 'en' ? 'Deadline' : 'Deadline', inputs.deadline],
    [lang === 'en' ? 'Expected format' : 'Format attendu', inputs.output_format],
    [lang === 'en' ? 'Constraints' : 'Contraintes', inputs.constraints],
  ].filter(([, value]) => typeof value === 'string' && value.trim().length > 0);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-[#2F184B] bg-[#07050F] p-3 text-xs text-[#C8B1E4]">
      <p className="font-label mb-2 text-[10px] text-[#9B72CF]">{lang === 'en' ? 'YOUR BRIEF' : 'VOTRE BESOIN'}</p>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="font-label text-[10px] text-[#7F6B9C]">{label}</p>
            <p className="whitespace-pre-line leading-relaxed">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function rentalAgentName(rental, fallback) {
  if (!rental) {
    return fallback;
  }

  if (typeof rental.agent === 'string') {
    return rental.agent;
  }

  return rental.agent?.name ?? rental.agentName ?? fallback;
}

function rentalAgentKey(rental) {
  if (!rental) {
    return null;
  }

  if (typeof rental.agent === 'string') {
    return rental.slug || rental.agent || rental.id;
  }

  return rental.agent?.slug || rental.slug || rental.agent?.name || rental.id;
}

function rentalRunSummary(rental) {
  const summary = rental?.runSummary;

  return {
    failed: Number.isFinite(summary?.failed) ? summary.failed : 0,
    lastRunAt: summary?.lastRunAt ?? null,
    lastStatus: summary?.lastStatus ?? null,
    succeeded: Number.isFinite(summary?.succeeded) ? summary.succeeded : rental?.hasSuccessfulRun ? 1 : 0,
    total: Number.isFinite(summary?.total) ? summary.total : rental?.hasSuccessfulRun ? 1 : 0,
  };
}

function RentalRunStrip({ lang, summary }) {
  if (!summary || summary.total <= 0) {
    return null;
  }

  const lastStatusLabels = {
    failed: lang === 'en' ? 'last failed' : 'dernier échec',
    running: lang === 'en' ? 'running' : 'en cours',
    succeeded: lang === 'en' ? 'last succeeded' : 'dernier réussi',
  };

  return (
    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-[#2F184B] bg-[#07050F] p-2 text-center">
      <div>
        <p className="font-stat text-lg text-[#F5F1FA]">{summary.total}</p>
        <p className="font-label text-[9px] text-[#7F6B9C]">{lang === 'en' ? 'RUNS' : 'EXÉC.'}</p>
      </div>
      <div>
        <p className="font-stat text-lg text-[#6EE7B7]">{summary.succeeded}</p>
        <p className="font-label text-[9px] text-[#7F6B9C]">{lang === 'en' ? 'OK' : 'OK'}</p>
      </div>
      <div>
        <p className={summary.failed > 0 ? 'font-stat text-lg text-[#FCA5A5]' : 'font-stat text-lg text-[#C8B1E4]'}>
          {summary.failed}
        </p>
        <p className="font-label text-[9px] text-[#7F6B9C]">
          {summary.lastStatus ? lastStatusLabels[summary.lastStatus] ?? summary.lastStatus : lang === 'en' ? 'FAILED' : 'ÉCHECS'}
        </p>
      </div>
    </div>
  );
}

function buildUserMomentum({ agentBasePath, betaRentals, historyRows, lang, marketplacePath, paymentOrders, workspacePath }) {
  const rentals = Array.isArray(betaRentals) ? betaRentals : [];
  const history = Array.isArray(historyRows) ? historyRows : [];
  const orders = Array.isArray(paymentOrders) ? paymentOrders : [];
  const allAccessRows = [...rentals, ...history];
  const exploredAgentCount = new Set(allAccessRows.map(rentalAgentKey).filter(Boolean)).size;
  const activeRentals = rentals.filter((rental) => rental.accessOpen);
  const firstRunnable = activeRentals.find((rental) => !rental.hasSuccessfulRun) ?? activeRentals[0] ?? null;
  const firstReviewable = activeRentals.find((rental) => rental.hasSuccessfulRun && !rental.review) ?? null;
  const stoppedRental = history.find((rental) => !rental.accessOpen && rental.slug) ?? null;
  const blockedPayment = orders.find((payment) => payment.status === 'paid_blocked');
  const pendingPayment = orders.find((payment) => payment.status === 'pending');
  const paidActivationPending = orders.find((payment) => payment.status === 'paid' && !payment.rentalRequestId);
  const successfulRunCount = allAccessRows.filter((rental) => rental.hasSuccessfulRun).length;
  const reviewCount = allAccessRows.filter((rental) => rental.review).length;
  const advancedRuntimeCount = allAccessRows.filter((rental) =>
    ['workflow_automation', 'creator_endpoint'].includes(rental.agent?.contract?.runtimeType),
  ).length;
  const milestones = [
    {
      done: exploredAgentCount > 0,
      key: 'first_access',
      label: lang === 'en' ? 'First agent rented' : 'Premier agent loué',
    },
    {
      done: activeRentals.length > 0,
      key: 'active_access',
      label: lang === 'en' ? 'Active workspace' : 'Workspace actif',
    },
    {
      done: successfulRunCount > 0,
      key: 'first_run',
      label: lang === 'en' ? 'First run completed' : 'Première exécution',
    },
    {
      done: reviewCount > 0,
      key: 'review',
      label: lang === 'en' ? 'Verified review left' : 'Avis vérifié laissé',
    },
    {
      done: exploredAgentCount >= 2,
      key: 'repeat',
      label: lang === 'en' ? 'Second agent explored' : 'Deuxième agent testé',
    },
    {
      done: advancedRuntimeCount > 0,
      key: 'advanced',
      label: lang === 'en' ? 'Advanced agent tried' : 'Agent avancé testé',
    },
  ];
  const doneCount = milestones.filter((item) => item.done).length;
  const score = Math.round((doneCount / milestones.length) * 100);

  if (blockedPayment) {
    return {
      action: { tab: 'payments', type: 'tab' },
      actionLabel: lang === 'en' ? 'Open order status' : 'Voir les commandes',
      detail:
        lang === 'en'
          ? 'One activation is blocked and needs attention before the workspace can be used.'
          : 'Une activation est bloquée et doit être surveillée avant d’utiliser le workspace.',
      label: lang === 'en' ? 'Activation blocked' : 'Activation bloquée',
      milestones,
      score,
      tone: 'warning',
    };
  }

  if (pendingPayment || paidActivationPending) {
    return {
      action: { tab: 'payments', type: 'tab' },
      actionLabel: lang === 'en' ? 'Track activation' : 'Suivre l’activation',
      detail:
        lang === 'en'
          ? 'A checkout is still waiting for confirmation. Keep the order state visible.'
          : 'Un checkout attend encore confirmation. Gardez l’état de commande sous les yeux.',
      label: lang === 'en' ? 'Activation in progress' : 'Activation en cours',
      milestones,
      score,
      tone: 'pending',
    };
  }

  if (firstRunnable && !firstRunnable.hasSuccessfulRun) {
    const agentName = rentalAgentName(firstRunnable, lang === 'en' ? 'This agent' : 'Cet agent');

    return {
      action: { href: `${workspacePath}/${firstRunnable.id}`, type: 'link' },
      actionLabel: lang === 'en' ? 'Open workspace' : 'Ouvrir le workspace',
      detail:
        lang === 'en'
          ? `${agentName} is active. Use it once to unlock the verified review loop.`
          : `${agentName} est actif. Utilisez-le une fois pour débloquer la boucle d’avis vérifié.`,
      label: lang === 'en' ? 'Next: first run' : 'Prochaine étape : première exécution',
      milestones,
      score,
      tone: 'active',
    };
  }

  if (firstReviewable) {
    return {
      action: { href: `${workspacePath}/${firstReviewable.id}?tab=review`, type: 'link' },
      actionLabel: lang === 'en' ? 'Leave review' : 'Laisser un avis',
      detail:
        lang === 'en'
          ? 'A successful run is recorded. Your verified review helps rank the best agents.'
          : 'Une exécution réussie est enregistrée. Votre avis vérifié aide à faire remonter les meilleurs agents.',
      label: lang === 'en' ? 'Review ready' : 'Avis prêt',
      milestones,
      score,
      tone: 'active',
    };
  }

  if (activeRentals.length > 0) {
    return {
      action: { href: `${workspacePath}/${activeRentals[0].id}`, type: 'link' },
      actionLabel: lang === 'en' ? 'Open workspace' : 'Ouvrir le workspace',
      detail:
        lang === 'en'
          ? 'You have active access. Keep using the workspace and compare outputs.'
          : 'Vous avez un accès actif. Continuez dans le workspace et comparez les résultats.',
      label: lang === 'en' ? 'Workspace active' : 'Workspace actif',
      milestones,
      score,
      tone: 'active',
    };
  }

  if (stoppedRental) {
    const agentName = rentalAgentName(stoppedRental, lang === 'en' ? 'a previous agent' : 'un ancien agent');

    return {
      action: { href: stoppedRental.slug ? `${agentBasePath}/agents/${stoppedRental.slug}` : marketplacePath, type: 'link' },
      actionLabel: lang === 'en' ? 'Rent again' : 'Relouer',
      detail:
        lang === 'en'
          ? `${agentName} stays in your history so you can restart without searching the marketplace.`
          : `${agentName} reste dans votre historique pour relancer sans rechercher dans toute la marketplace.`,
      label: lang === 'en' ? 'Ready to restart' : 'Prêt à relancer',
      milestones,
      score,
      tone: 'restart',
    };
  }

  return {
    action: { href: marketplacePath, type: 'link' },
    actionLabel: lang === 'en' ? 'Explore marketplace' : 'Explorer la marketplace',
    detail:
      lang === 'en'
        ? 'Pick one approved agent, activate it, run it from the workspace, then leave a verified review.'
        : 'Choisissez un agent approuvé, activez-le, lancez-le dans le workspace, puis laissez un avis vérifié.',
    label: lang === 'en' ? 'Start your loop' : 'Démarrer la boucle',
    milestones,
    score,
    tone: 'start',
  };
}

function buildUserMissions({ agentPath, betaRentals, historyRows, lang, marketplaceAgents, marketplacePath, paymentOrders, workspacePath }) {
  const rentals = Array.isArray(betaRentals) ? betaRentals : [];
  const history = Array.isArray(historyRows) ? historyRows : [];
  const orders = Array.isArray(paymentOrders) ? paymentOrders : [];
  const marketplace = Array.isArray(marketplaceAgents) ? marketplaceAgents : [];
  const rentedSlugs = new Set([...rentals, ...history].map(rentalAgentKey).filter(Boolean));
  const missions = [];

  const blockedPayment = orders.find((payment) => payment.status === 'paid_blocked');
  if (blockedPayment) {
    missions.push({
      action: { tab: 'payments', type: 'tab' },
      impact: lang === 'en' ? 'Recover access' : 'Récupérer l’accès',
      key: `blocked-${blockedPayment.id}`,
      label: lang === 'en' ? 'Check blocked activation' : 'Vérifier une activation bloquée',
      tone: 'warning',
    });
  }

  const pendingPayment = orders.find((payment) => payment.status === 'pending' || (payment.status === 'paid' && !payment.rentalRequestId));
  if (pendingPayment) {
    missions.push({
      action: { tab: 'payments', type: 'tab' },
      impact: lang === 'en' ? 'Keep checkout visible' : 'Garder le checkout visible',
      key: `pending-${pendingPayment.id}`,
      label: lang === 'en' ? 'Track an activation in progress' : 'Suivre une activation en cours',
      tone: 'pending',
    });
  }

  const runnable = rentals.find((rental) => rental.accessOpen && !rental.hasSuccessfulRun);
  if (runnable) {
    const agentName = rentalAgentName(runnable, lang === 'en' ? 'your active agent' : 'votre agent actif');

    missions.push({
      action: { href: `${workspacePath}/${runnable.id}`, type: 'link' },
      impact: lang === 'en' ? 'Unlock verified review' : 'Débloquer l’avis vérifié',
      key: `run-${runnable.id}`,
      label:
        lang === 'en'
          ? `Use ${agentName} once`
          : `Utiliser ${agentName} une fois`,
      tone: 'active',
    });
  }

  const reviewable = rentals.find((rental) => rental.accessOpen && rental.hasSuccessfulRun && !rental.review);
  if (reviewable) {
    const agentName = rentalAgentName(reviewable, lang === 'en' ? 'this agent' : 'cet agent');

    missions.push({
      action: { href: `${workspacePath}/${reviewable.id}?tab=review`, type: 'link' },
      impact: lang === 'en' ? 'Help rankings' : 'Aider le classement',
      key: `review-${reviewable.id}`,
      label:
        lang === 'en'
          ? `Leave a verified review for ${agentName}`
          : `Laisser un avis vérifié pour ${agentName}`,
      tone: 'review',
    });
  }

  const activeReady = rentals.find((rental) => rental.accessOpen && rental.hasSuccessfulRun);
  if (activeReady) {
    const agentName = rentalAgentName(activeReady, lang === 'en' ? 'your workspace' : 'votre workspace');

    missions.push({
      action: { href: `${workspacePath}/${activeReady.id}`, type: 'link' },
      impact: lang === 'en' ? 'Compare another output' : 'Comparer un autre résultat',
      key: `continue-${activeReady.id}`,
      label:
        lang === 'en'
          ? `Use another action in ${agentName}`
          : `Utiliser une autre action dans ${agentName}`,
      tone: 'active',
    });
  }

  const restartable = history.find((rental) => !rental.accessOpen && rental.slug);
  if (restartable) {
    const agentName = rentalAgentName(restartable, lang === 'en' ? 'a previous agent' : 'un ancien agent');

    missions.push({
      action: { href: agentPath(restartable.slug), type: 'link' },
      impact: lang === 'en' ? 'Restart faster' : 'Relancer plus vite',
      key: `restart-${restartable.id}`,
      label:
        lang === 'en'
          ? `Rent ${agentName} again`
          : `Relouer ${agentName}`,
      tone: 'restart',
    });
  }

  const nextAgent = marketplace.find((agent) => agent.slug && !rentedSlugs.has(agent.slug));
  if (nextAgent) {
    missions.push({
      action: { href: agentPath(nextAgent.slug), type: 'link' },
      impact: lang === 'en' ? 'Explore a new use case' : 'Explorer un nouveau cas',
      key: `discover-${nextAgent.id}`,
      label:
        lang === 'en'
          ? `Try ${nextAgent.name}`
          : `Tester ${nextAgent.name}`,
      tone: 'discover',
    });
  }

  if (missions.length === 0) {
    missions.push({
      action: { href: marketplacePath, type: 'link' },
      impact: lang === 'en' ? 'Start the loop' : 'Démarrer la boucle',
      key: 'start',
      label: lang === 'en' ? 'Find your first approved agent' : 'Trouver votre premier agent approuvé',
      tone: 'discover',
    });
  }

  return missions.slice(0, 4);
}

function userLoopTier(score, lang) {
  const tiers = [
    {
      max: 24,
      name: lang === 'en' ? 'Explorer' : 'Explorateur',
      next: lang === 'en' ? 'Rent an agent and open a workspace.' : 'Louez un agent et ouvrez un workspace.',
    },
    {
      max: 49,
      name: lang === 'en' ? 'Operator' : 'Opérateur',
      next: lang === 'en' ? 'Complete a first workspace run.' : 'Terminez une première exécution workspace.',
    },
    {
      max: 74,
      name: lang === 'en' ? 'Reviewer' : 'Évaluateur',
      next: lang === 'en' ? 'Leave a verified review after a run.' : 'Laissez un avis vérifié après une exécution.',
    },
    {
      max: 99,
      name: lang === 'en' ? 'Power user' : 'Power user',
      next: lang === 'en' ? 'Try a second or advanced agent.' : 'Testez un deuxième agent ou un agent avancé.',
    },
    {
      max: 100,
      name: lang === 'en' ? 'Beta closer' : 'Closer beta',
      next: lang === 'en' ? 'Loop complete. Compare another agent.' : 'Boucle complète. Comparez un autre agent.',
    },
  ];

  return tiers.find((tier) => score <= tier.max) ?? tiers[tiers.length - 1];
}

function UserMomentumPanel({ lang, momentum, onSelectTab }) {
  const tier = userLoopTier(momentum.score, lang);
  const nextMilestone = momentum.milestones.find((item) => !item.done);

  return (
    <section className="mb-10 overflow-hidden rounded-3xl border border-[#6B3FA0]/35 bg-[radial-gradient(circle_at_top_left,#35215B_0%,#110D24_45%,#07050F_100%)] p-5 shadow-[0_18px_60px_rgba(11,7,28,0.38)] md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/40 bg-[#1A152F] px-3 py-1.5 text-xs font-semibold text-[#D8B4FE]">
              <Flame className="h-3.5 w-3.5" />
              {lang === 'en' ? 'User loop' : 'Boucle utilisateur'}
            </span>
            <span className="inline-flex rounded-full border border-[#10B981]/35 bg-[#10B981]/10 px-3 py-1.5 text-xs font-semibold text-[#6EE7B7]">
              {momentum.milestones.filter((item) => item.done).length}/{momentum.milestones.length}{' '}
              {lang === 'en' ? 'steps done' : 'étapes validées'}
            </span>
            <span className="inline-flex rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-semibold text-[#F6C177]">
              {lang === 'en' ? 'Level' : 'Niveau'} · {tier.name}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#F5F1FA] md:text-3xl">{momentum.label}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D6C5E8]">{momentum.detail}</p>
          <div className="mt-4 rounded-2xl border border-[#8B5CF6]/25 bg-[#0A0816]/70 p-4">
            <p className="font-label text-[10px] text-[#A78BCF]">{lang === 'en' ? 'NEXT LEVEL HINT' : 'INDICE PROCHAIN NIVEAU'}</p>
            <p className="mt-1 text-sm leading-6 text-[#D6C5E8]">{tier.next}</p>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {momentum.milestones.map((item) => {
              const isNext = nextMilestone?.key === item.key;

              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    item.done
                      ? 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]'
                      : isNext
                        ? 'border-[#F59E0B]/45 bg-[#F59E0B]/10 text-[#F6C177]'
                        : 'border-[#2F184B] bg-[#0A0816] text-[#9B72CF]'
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      item.done ? 'text-[#10B981]' : isNext ? 'text-[#F59E0B]' : 'text-[#4A3D6B]'
                    }`}
                  />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {isNext && (
                    <span className="shrink-0 rounded-full border border-[#F59E0B]/35 bg-[#0A0816] px-2 py-0.5 text-[10px] font-semibold text-[#F6C177]">
                      {lang === 'en' ? 'Next' : 'À débloquer'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-[#8B5CF6]/30 bg-[#0F0B22] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-label text-xs text-[#A78BCF]">{lang === 'en' ? 'Progress score' : 'Score exploration'}</p>
            <Trophy className="h-5 w-5 text-[#C4B5FD]" />
          </div>
          <p className="font-stat text-5xl text-[#F5F1FA]">{momentum.score}%</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#251A40]">
            <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${momentum.score}%` }} />
          </div>
          <div className="mt-4 rounded-2xl border border-[#2F184B] bg-[#080612] p-3">
            <p className="font-label text-[10px] text-[#A78BCF]">
              {nextMilestone
                ? lang === 'en'
                  ? 'Next measurable step'
                  : 'Prochaine étape mesurable'
                : lang === 'en'
                  ? 'Loop completed'
                  : 'Boucle complétée'}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#F5F1FA]">
              {nextMilestone?.label ?? (lang === 'en' ? 'Compare another agent' : 'Comparer un autre agent')}
            </p>
          </div>
          <div className="mt-5">
            {momentum.action.type === 'link' ? (
              <Link href={momentum.action.href}>
                <Button className="h-11 w-full border-0 bg-[#F5F1FA] text-[#2B1A44] hover:bg-white">
                  {momentum.actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                onClick={() => onSelectTab(momentum.action.tab)}
                className="h-11 w-full border-0 bg-[#F5F1FA] text-[#2B1A44] hover:bg-white"
              >
                {momentum.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function UserMissionQueue({ lang, missions, onSelectTab }) {
  const toneClasses = {
    active: 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]',
    discover: 'border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#D8B4FE]',
    pending: 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F6C177]',
    restart: 'border-[#38BDF8]/35 bg-[#0EA5E9]/10 text-[#7DD3FC]',
    review: 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#F6C177]',
    warning: 'border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]',
  };

  return (
    <section className="mb-10 rounded-3xl border border-[#251A40] bg-[#110D24] p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label text-xs text-[#A78BCF]">{lang === 'en' ? 'TODAY’S MISSIONS' : 'MISSIONS DU JOUR'}</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#F5F1FA]">
            {lang === 'en' ? 'Keep your AgentHub loop moving' : 'Gardez votre boucle AgentHub active'}
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-[#A78BCF]">
          {lang === 'en'
            ? 'These actions come from your real access, payments and history. Complete one, then come back for the next.'
            : 'Ces actions viennent de vos vrais accès, paiements et historique. Terminez-en une, puis revenez pour la suivante.'}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {missions.map((mission, index) => {
          const card = (
            <div className={`h-full rounded-2xl border p-4 transition hover:-translate-y-0.5 ${toneClasses[mission.tone] ?? toneClasses.discover}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A0816] text-sm font-bold text-[#F5F1FA]">
                  {index + 1}
                </span>
                <Target className="h-4 w-4" />
              </div>
              <p className="font-display text-base font-bold text-[#F5F1FA]">{mission.label}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-current">{mission.impact}</p>
              <p className="mt-4 inline-flex items-center text-sm font-semibold text-[#F5F1FA]">
                {lang === 'en' ? 'Open' : 'Ouvrir'}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </p>
            </div>
          );

          if (mission.action.type === 'tab') {
            return (
              <button key={mission.key} type="button" onClick={() => onSelectTab(mission.action.tab)} className="text-left">
                {card}
              </button>
            );
          }

          return (
            <Link key={mission.key} href={mission.action.href}>
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentViewedAgentsPanel({ agentPath, lang, profile }) {
  const [recentAgents, setRecentAgents] = useState([]);
  const recentAgentStorageKey = getRecentAgentStorageKey(profile);
  const legacyRecentAgentStorageKey = getLegacyRecentAgentStorageKey(profile);

  useEffect(() => {
    const loadRecentAgents = () => {
      try {
        setRecentAgents(
          parseRecentAgentsFromStorage(
            window.localStorage,
            recentAgentStorageKey,
            legacyRecentAgentStorageKey,
          ),
        );
      } catch {
        setRecentAgents([]);
      }
    };

    loadRecentAgents();
    const refreshTimer = window.setInterval(loadRecentAgents, 60000);
    window.addEventListener('agenthub:recent-agents-updated', loadRecentAgents);
    window.addEventListener('storage', loadRecentAgents);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('agenthub:recent-agents-updated', loadRecentAgents);
      window.removeEventListener('storage', loadRecentAgents);
    };
  }, [legacyRecentAgentStorageKey, recentAgentStorageKey]);

  if (recentAgents.length === 0) {
    return null;
  }

  const visibleRecentAgents = recentAgents.slice(0, 3);
  const comparisonGoal = 3;
  const comparisonCount = Math.min(recentAgents.length, comparisonGoal);
  const comparisonProgress = Math.round((comparisonCount / comparisonGoal) * 100);
  const remainingComparisons = Math.max(0, comparisonGoal - comparisonCount);
  const clearRecentAgents = () => {
    setRecentAgents([]);

    try {
      removeRecentAgentsFromStorage(window.localStorage, recentAgentStorageKey, legacyRecentAgentStorageKey);
      window.dispatchEvent(new CustomEvent('agenthub:recent-agents-updated'));
    } catch {
      // Local convenience only. The dashboard remains usable without storage.
    }
  };

  return (
    <section className="mb-10 rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-label flex items-center gap-1.5 text-xs text-[#B794F4]">
            <Clock3 className="h-3.5 w-3.5" />
            {lang === 'en' ? 'RECENTLY VIEWED' : 'VUS RÉCEMMENT'}
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#F5F1FA]">
            {lang === 'en' ? 'Resume your agent comparison' : 'Reprendre votre comparaison'}
          </h2>
        </div>
        <div className="max-w-lg text-sm leading-6 text-[#A78BCF]">
          <p>
            {lang === 'en'
              ? 'Agents opened from the marketplace stay here so you can come back without searching again.'
              : 'Les fiches ouvertes depuis la marketplace restent ici pour revenir sans refaire une recherche.'}
          </p>
          <p className="mt-2 font-semibold text-[#D8B4FE]">
            {lang === 'en'
              ? `${recentAgents.length} saved lead${recentAgents.length > 1 ? 's' : ''}`
              : `${recentAgents.length} piste${recentAgents.length > 1 ? 's' : ''} sauvegardée${recentAgents.length > 1 ? 's' : ''}`}
          </p>
          <div className="mt-3 rounded-2xl border border-[#33214F] bg-[#15102A] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-label text-[10px] text-[#D8B4FE]">
                {lang === 'en' ? 'COMPARISON LOOP' : 'BOUCLE COMPARAISON'}
              </p>
              <span className="font-stat text-sm text-[#F5F1FA]">
                {comparisonCount}/{comparisonGoal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#2B1A44]">
              <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${comparisonProgress}%` }} />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#A78BCF]">
              {remainingComparisons === 0
                ? lang === 'en'
                  ? 'Enough signals to choose the agent to test next.'
                  : 'Assez de signaux pour choisir l’agent à tester maintenant.'
                : lang === 'en'
                  ? `Open ${remainingComparisons} more agent${remainingComparisons > 1 ? 's' : ''} to compare with less friction.`
                  : `Ouvrez encore ${remainingComparisons} agent${remainingComparisons > 1 ? 's' : ''} pour comparer sans repartir de zéro.`}
            </p>
          </div>
          <button
            type="button"
            onClick={clearRecentAgents}
            className="mt-3 rounded-full border border-[#33214F] px-3 py-1.5 text-xs font-semibold text-[#A78BCF] transition-colors hover:border-[#8B5CF6] hover:text-white"
          >
            {lang === 'en' ? 'Hide saved leads' : 'Masquer les pistes'}
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {visibleRecentAgents.map((agent, index) => (
          <Link
            key={agent.slug}
            href={agentPath(agent.slug)}
            className="group rounded-2xl border border-[#33214F] bg-[#15102A] p-4 transition hover:-translate-y-0.5 hover:border-[#8B5CF6] hover:bg-[#20143D]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#F4EFFA]">{agent.name}</p>
                <p className="mt-1 truncate text-xs text-[#B794F4]">
                  {agent.category || agent.runtimeLabel || 'AgentHub'}
                </p>
              </div>
              {index === 0 ? (
                <span className="rounded-full border border-[#8B5CF6]/35 bg-[#251A40] px-2 py-1 text-[10px] font-semibold text-[#D8B4FE]">
                  {lang === 'en' ? 'Latest' : 'Dernière piste'}
                </span>
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 text-[#A78BCF] transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
              )}
            </div>
            <p className="line-clamp-2 text-xs leading-5 text-[#A78BCF]">
              {agent.pitch ||
                (lang === 'en'
                  ? 'Agent page opened recently.'
                  : 'Fiche agent consultée récemment.')}
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7F6B9C]">
              {formatRecentAgentViewedAt(agent.viewedAt, lang)}
            </p>
            {index === 0 && (
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D8B4FE]">
                {lang === 'en' ? 'Resume comparison' : 'Reprendre la comparaison'}
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function DashboardPage({
  profile,
  betaRentals = [],
  betaRentalsError = null,
  paymentOrders = [],
  paymentOrdersError = null,
  recommendedAgents = [],
  recommendedAgentsError = null,
  reviewSubmitted = null,
  reviewError = null,
  rentalCreated = false,
  codeAccessRequired = false,
  locale,
}) {
  const { lang: contextLang } = useT();
  const [tab, setTab] = useState('rentals');
  const effectiveLocale = (locale ?? contextLang ?? 'fr') === 'en' ? 'en' : 'fr';
  const lang = effectiveLocale;
  const t = (key, vars) => translate(effectiveLocale, key, vars);
  const marketplaceAgents = Array.isArray(recommendedAgents) ? recommendedAgents : [];
  const recommended = marketplaceAgents.slice(0, 4);
  const verifiedReviewCards = marketplaceAgents
    .flatMap((agent) =>
      (agent.reviewSummaries ?? [])
        .filter((review) => review?.body || review?.title)
        .map((review) => ({
          agentName: agent.name,
          agentSlug: agent.slug,
          body: review.body || review.title,
          id: `${agent.id}-${review.id}`,
          rating: Math.max(1, Math.min(5, Math.round(review.rating || 0))),
        })),
    )
    .slice(0, 6);
  const tabs = [
    { id: 'rentals', label: t('db.t.rentals') },
    { id: 'history', label: t('db.t.history') },
    { id: 'favorites', label: t('db.t.fav') },
    { id: 'memory', label: t('db.t.memory') },
    { id: 'payments', label: t('db.t.payments') },
  ];

  const reviewAction = submitRentalReviewAction.bind(null, effectiveLocale);
  const stopAction = stopAgentAccessAction.bind(null, effectiveLocale);
  const marketplacePath = effectiveLocale === 'en' ? '/en/search' : '/agenthub/search';
  const workspacePath = effectiveLocale === 'en' ? '/en/workspace' : '/agenthub/workspace';
  const agentBasePath = effectiveLocale === 'en' ? '/en' : '/agenthub';
  const agentPath = (slug) => `${agentBasePath}/agents/${slug}`;
  const formatAccessDate = (date) => new Date(date).toLocaleDateString(effectiveLocale === 'en' ? 'en-US' : 'fr-FR');

  const rentedAgentHistory = [];
  const seenAgentSlugs = new Set();

  for (const rental of betaRentals) {
    const slug = rental.agent?.slug;

    if (!slug || seenAgentSlugs.has(slug)) {
      continue;
    }

    seenAgentSlugs.add(slug);
    rentedAgentHistory.push(rental);
  }

  const historyRows = rentedAgentHistory
    .map((rental) => ({
      id: rental.id,
      agent: rental.agent?.name ?? (effectiveLocale === 'en' ? 'AgentHub agent' : 'Agent AgentHub'),
      slug: rental.agent?.slug ?? null,
      status: rental.status,
      accessOpen: rental.accessOpen,
      mode: rental.pricingType,
      date: formatAccessDate(rental.createdAt),
      price: rental.priceCents ?? 0,
      rating: rental.review?.rating ?? null,
      dates: formatAccessDate(rental.createdAt),
    }));
  const activeAccessCount = betaRentals.filter((rental) => rental.accessOpen).length;
  const totalRunCount = betaRentals.reduce((total, rental) => total + rentalRunSummary(rental).total, 0);
  const totalSucceededRunCount = betaRentals.reduce((total, rental) => total + rentalRunSummary(rental).succeeded, 0);
  const failedRunCount = betaRentals.reduce((total, rental) => total + rentalRunSummary(rental).failed, 0);
  const reviewCount = betaRentals.filter((rental) => rental.review).length;
  const pendingPaymentCount = paymentOrders.filter((payment) => payment.status === 'pending').length;
  const cancelledPaymentCount = paymentOrders.filter((payment) => payment.status === 'cancelled').length;
  const blockedPaymentCount = paymentOrders.filter((payment) => payment.status === 'paid_blocked').length;
  const userMomentum = buildUserMomentum({
    agentBasePath,
    betaRentals,
    historyRows,
    lang,
    marketplacePath,
    paymentOrders,
    workspacePath,
  });
  const userMissions = buildUserMissions({
    agentPath,
    betaRentals,
    historyRows,
    lang,
    marketplaceAgents,
    marketplacePath,
    paymentOrders,
    workspacePath,
  });

  const reviewErrorMessage = (() => {
    if (!reviewError) {
      return null;
    }

    if (reviewError === 'invalid-request') {
      return lang === 'en' ? 'Invalid review request.' : 'Requête d’avis invalide.';
    }

    if (reviewError === 'review-body-required') {
      return lang === 'en' ? 'Please write a review message.' : 'Ajoute un commentaire pour l’avis.';
    }

    if (reviewError === 'review-body-too-short') {
      return lang === 'en'
        ? 'Your review must contain at least 5 characters.'
        : 'Votre avis doit contenir au moins 5 caractères.';
    }

    if (reviewError === 'rating-required') {
      return lang === 'en' ? 'Please choose a rating.' : 'Choisissez une note.';
    }

    if (reviewError === 'invalid-rating') {
      return lang === 'en' ? 'The rating must be between 1 and 5.' : 'La note doit être comprise entre 1 et 5.';
    }

    if (reviewError === 'rental-not-reviewable' || reviewError === 'rental-not-delivered') {
      return lang === 'en'
        ? 'You can review only an agent you have accessed.'
        : 'Vous pouvez noter uniquement un agent auquel vous avez accès.';
    }

    if (reviewError === 'review-already-exists') {
      return lang === 'en' ? 'You already reviewed this agent access.' : 'Vous avez déjà laissé un avis pour cet accès agent.';
    }

    if (reviewError === 'self-review-not-allowed') {
      return lang === 'en'
        ? 'You cannot review access to your own agent.'
        : 'Vous ne pouvez pas noter un accès à votre propre agent.';
    }

    if (reviewError === 'review-run-required') {
      return lang === 'en'
        ? 'Use this workspace once before leaving a verified review.'
        : 'Utilisez ce workspace une fois avant de laisser un avis vérifié.';
    }

    if (reviewError === 'review-run-check-failed') {
      return lang === 'en'
        ? 'Unable to verify the execution history for this review right now.'
        : 'Impossible de vérifier l’historique d’exécution pour cet avis pour le moment.';
    }

    if (reviewError === 'review-create-failed') {
      return lang === 'en'
        ? 'Unable to save your review right now.'
        : 'Impossible d’enregistrer l’avis pour le moment.';
    }

    return lang === 'en' ? 'An unexpected error occurred.' : 'Une erreur inattendue est survenue.';
  })();

  const greetingName = (profile?.displayName ?? profile?.email ?? '').split(' ')[0] || t('db.name');
  return (
    <div className="min-h-screen ">
      <AgentHubNavbar profile={profile} />
      <div className="container py-10">
        <div className="mb-8">
          <p className="font-label text-xs text-[#A78BCF] mb-2">{t('db.myaccount')}</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#F5F1FA]">{t('db.hello', { name: greetingName })}</h1>
          <p className="text-[#D6C5E8] mt-2">{t('db.subtitle')}</p>
        </div>

        {reviewSubmitted && (
          <div className="mb-5 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-3 text-sm text-[#6EE7B7]">
            {lang === 'en'
              ? 'Your review has been submitted. Thanks for the feedback.'
              : 'Votre avis a bien été envoyé. Merci pour votre retour.'}
          </div>
        )}

        {rentalCreated && (
          <div className="mb-5 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-3 text-sm text-[#6EE7B7]">
            {lang === 'en'
              ? 'Your access is active. Find it anytime from My agents.'
              : 'Votre accès est actif. Retrouvez-le à tout moment dans Mes agents.'}
          </div>
        )}

        {codeAccessRequired && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 p-4 text-sm text-[#D6C5E8] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display font-semibold text-[#F5F1FA]">
                {lang === 'en'
                  ? 'AgentHub Code is reserved for creators and admins.'
                  : 'AgentHub Code est réservé aux créateurs et admins.'}
              </p>
              <p className="mt-1 text-[#C8B1E4]">
                {lang === 'en'
                  ? 'Create a creator profile to build and submit agents.'
                  : 'Créez un profil créateur pour construire et soumettre des agents.'}
              </p>
            </div>
            <Link href="/onboarding/creator" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#8B5CF6]/50 bg-[#F5F1FA] px-4 py-2 font-semibold text-[#2B1A44] transition-colors hover:bg-white">
              {lang === 'en' ? 'Become a creator' : 'Devenir créateur'}
            </Link>
          </div>
        )}

        {reviewErrorMessage && (
          <div className="mb-5 rounded-2xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-3 text-sm text-[#FCA5A5]">
            {reviewErrorMessage}
          </div>
        )}

        <UserMomentumPanel lang={lang} momentum={userMomentum} onSelectTab={setTab} />
        <UserMissionQueue lang={lang} missions={userMissions} onSelectTab={setTab} />
        <RecentViewedAgentsPanel agentPath={agentPath} lang={lang} profile={profile} />

        {/* Recommended agents row */}
        <section className="mb-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('db.recosub')}</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('db.reco')}</h2>
            </div>
          </div>
          <div className="marquee-wrapper marquee-mask overflow-hidden py-8">
            <div className={recommended.length > 0 ? "marquee-track gap-4" : ""}>
              {recommended.length > 0 ? (
                [...recommended, ...recommended].map((a, i) => (
                  <div key={`${a.id}-${i}`} className="w-[280px] shrink-0">
                    <AgentCard agent={a} agentBasePath={agentBasePath} locale={effectiveLocale} />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 text-sm text-[#C8B1E4]">
                  <p className="font-display text-lg font-semibold text-[#F5F1FA]">
                    {recommendedAgentsError
                      ? lang === 'en'
                        ? 'Live recommendations are unavailable right now.'
                        : 'Les recommandations live sont indisponibles pour le moment.'
                      : lang === 'en'
                        ? 'No approved agents are available yet.'
                        : 'Aucun agent approuvé n’est disponible pour le moment.'}
                  </p>
                  <p className="mt-2 max-w-xl text-[#A78BCF]">
                    {lang === 'en'
                      ? 'Open the marketplace to browse the latest approved agents as soon as they are published.'
                      : 'Ouvrez la marketplace pour retrouver les derniers agents approuvés dès leur publication.'}
                  </p>
                </div>
              )}
            </div>
          </div>
            <div className="text-center mt-6">
            <Link href={marketplacePath}><Button variant="outline" className="bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA] h-11 px-6">{t('db.seeall')} <ArrowRight className="w-4 h-4 ml-2"/></Button></Link>
          </div>
        </section>

        {/* Avis vérifiés — défilement vers la droite */}
        <section className="mb-10">
          <div className="mb-4">
            <p className="font-label text-xs text-[#A78BCF] mb-1.5">{t('db.reviewssub')}</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#F5F1FA]">{t('db.reviewstitle')}</h2>
          </div>
          {verifiedReviewCards.length > 0 ? (
            <div className="marquee-wrapper marquee-mask overflow-hidden py-4">
              <div className="marquee-track reverse gap-5">
                {[...verifiedReviewCards, ...verifiedReviewCards].map((review, i) => (
                  <div key={`${review.id}-${i}`} className="w-[280px] shrink-0 bg-[#0F0B22] border border-[#1E1340] rounded-2xl p-5">
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: review.rating }).map((_, k) => (
                        <Star key={k} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"/>
                      ))}
                    </div>
                    <p className="text-sm text-[#B8A8D8] italic leading-relaxed mb-5 line-clamp-4">« {review.body} »</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-[#1E1340]">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center text-xs font-stat text-white">✓</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-semibold text-[#F5F1FA] truncate">
                          {lang === 'en' ? 'Verified review' : 'Avis vérifié'}
                        </p>
                        <Link href={agentPath(review.agentSlug)} className="block truncate text-[11px] text-[#A78BCF] hover:text-[#F5F1FA]">
                          {review.agentName}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 text-sm text-[#C8B1E4]">
              <p className="font-display text-lg font-semibold text-[#F5F1FA]">
                {lang === 'en' ? 'No verified reviews yet.' : 'Aucun avis vérifié pour le moment.'}
              </p>
              <p className="mt-2 max-w-xl text-[#A78BCF]">
                {lang === 'en'
                  ? 'Use an approved agent from your workspace, then leave the first verified review.'
                  : 'Utilisez un agent approuvé depuis votre workspace, puis laissez le premier avis vérifié.'}
              </p>
            </div>
          )}
        </section>

        <div className="flex gap-1 border-b border-[#251A40] mb-6 overflow-x-auto no-scrollbar">
          {tabs.map(tb => (
            <button key={tb.id} onClick={()=>setTab(tb.id)} className={`px-5 py-3 text-sm font-display font-semibold relative whitespace-nowrap ${tab === tb.id ? 'text-[#F5F1FA]' : 'text-[#A78BCF] hover:text-[#D6C5E8]'}`}>
              {tb.label}
              {tab === tb.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]"/>}
            </button>
          ))}
        </div>

        {tab === 'rentals' && (
          <div>
            {betaRentalsError && (
              <div className="mb-5 rounded-2xl border border-[#F59E0B]/40 bg-[#110D24] px-4 py-3 text-sm text-[#F59E0B]">
                {lang === 'en' ? 'Agent accesses are temporarily unavailable.' : 'Les accès agent sont temporairement indisponibles.'}
              </div>
            )}

            {betaRentals.length > 0 && (
              <div className="mb-6">
                <p className="font-label text-xs text-[#A78BCF] mb-3">{lang === 'en' ? 'RENTED AGENTS' : 'AGENTS LOUÉS'}</p>
                <div className="grid md:grid-cols-3 gap-5">
                  {betaRentals.map((rental) => (
                    <div key={rental.id} className="bg-[#110D24] border border-[#251A40] rounded-2xl p-5 card-hover">
                      <div className="flex items-start gap-3 mb-4">
                        <AgentAvatar index={0} size="md" />
                        <div className="flex-1">
                          <h3 className="font-display font-bold text-lg text-[#F5F1FA]">{rental.agent?.name ?? (lang === 'en' ? 'AgentHub agent' : 'Agent AgentHub')}</h3>
                          <p className="text-xs text-[#A78BCF]">{rental.agent?.summary ?? ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-label ${statusBadgeClass(rental.status)}`}>
                          {rentalStatusLabel(rental.status, lang)}
                        </span>
                        <span className="font-stat text-[#F5F1FA]">
                          {formatCreditsFromCents(rental.priceCents)}
                        </span>
                      </div>
                      <p className="text-xs text-[#A78BCF] mb-4">
                        {lang === 'en'
                          ? 'Access active. Open the workspace to generate and store results.'
                          : 'Accès actif. Ouvrez le workspace pour générer et conserver vos résultats.'}
                      </p>
                      <StructuredBrief inputs={rental.requiredInputs} lang={lang} />
                      <RentalRunStrip lang={lang} summary={rentalRunSummary(rental)} />
                      {rental.result && (
                        <div className="mb-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#D6C5E8]">
                          <p className="font-label mb-1 text-[10px] text-[#6EE7B7]">
                            {lang === 'en' ? 'WORKSPACE RESULT' : 'RÉSULTAT WORKSPACE'}
                          </p>
                          <p className="leading-relaxed">{rental.result.summary}</p>
                        </div>
                      )}
                      {!rental.result && rental.status === 'delivered' && (
                        <div className="mb-4 rounded-xl border border-[#2F184B] bg-[#07050F] p-3 text-xs text-[#C8B1E4]">
                          {lang === 'en' ? 'Legacy completed access without stored workspace result.' : 'Ancien accès terminé sans résultat workspace enregistré.'}
                        </div>
                      )}

                      {['active', 'stopped', 'expired', 'delivered'].includes(rental.status) && !rental.review && (
                        rental.accessOpen ? (
                          <div className="mt-4 rounded-xl border border-[#6B3FA0]/40 bg-[#1A152F] p-3 text-xs leading-5 text-[#C8B1E4]">
                            <p className="font-label mb-1 text-[10px] text-[#B794F4]">
                              {lang === 'en' ? 'REVIEW FROM WORKSPACE' : 'AVIS DEPUIS LE WORKSPACE'}
                            </p>
                            <p>
                              {rental.hasSuccessfulRun
                                ? lang === 'en'
                                  ? 'A successful run is recorded. Publish your verified review from the workspace review tab.'
                                  : 'Une exécution réussie est enregistrée. Publiez votre avis vérifié depuis l’onglet avis du workspace.'
                                : lang === 'en'
                                  ? 'Use the workspace first, then publish your verified review from the workspace history.'
                                  : 'Utilisez d’abord le workspace, puis publiez votre avis vérifié depuis l’historique.'}
                            </p>
                            <Link href={`${workspacePath}/${rental.id}?tab=review`} className="mt-2 inline-flex text-[#D8B4FE] hover:text-white">
                              {lang === 'en' ? 'Open workspace review tab' : 'Ouvrir l’onglet avis du workspace'}
                            </Link>
                          </div>
                        ) : rental.hasSuccessfulRun ? (
                        <form action={reviewAction} className="mt-4 space-y-2">
                          <input type="hidden" name="rental_id" value={rental.id} />
                          <div className="rounded-xl border border-[#6B3FA0]/40 bg-[#1A152F] p-3 text-xs leading-5 text-[#C8B1E4]">
                            <p className="font-label mb-1 text-[10px] text-[#B794F4]">
                              {lang === 'en' ? 'BEFORE REVIEWING' : 'AVANT DE LAISSER UN AVIS'}
                            </p>
                            <p>
                              {lang === 'en'
                                ? 'Base your verified review on the workspace result and execution history.'
                                : 'Basez votre avis vérifié sur le résultat et l’historique d’exécution du workspace.'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-[#A78BCF]">Note</label>
                            <select
                              name="rating"
                              required
                              defaultValue=""
                              className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                            >
                              <option value="" disabled>
                                {lang === 'en' ? 'Choose a rating' : 'Choisir une note'}
                              </option>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            name="title"
                            maxLength={200}
                            placeholder={lang === 'en' ? 'Title (optional)' : 'Titre (optionnel)'}
                            className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                          />
                          <textarea
                            name="body"
                            required
                            minLength={5}
                            maxLength={1200}
                            rows={4}
                            placeholder={lang === 'en' ? 'Your feedback on this agent' : 'Votre avis sur cet agent'}
                            className="w-full rounded-lg bg-[#07050F] border border-[#2F184B] px-3 py-2 text-sm text-[#F5F1FA]"
                          />
                          <Button type="submit" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                            {lang === 'en' ? 'Send review' : 'Publier l’avis'}
                          </Button>
                        </form>
                        ) : (
                          <div className="mt-4 rounded-xl border border-[#6B3FA0]/40 bg-[#1A152F] p-3 text-xs leading-5 text-[#C8B1E4]">
                            <p className="font-label mb-1 text-[10px] text-[#B794F4]">
                              {lang === 'en' ? 'REVIEW UNAVAILABLE' : 'AVIS INDISPONIBLE'}
                            </p>
                            <p>
                              {lang === 'en'
                                ? 'A verified review requires at least one successful workspace execution for this access.'
                                : 'Un avis vérifié nécessite au moins une exécution réussie dans le workspace pour cet accès.'}
                            </p>
                          </div>
                        )
                      )}

                      {rental.review && (
                        <div className="mt-4 rounded-xl border border-[#2F184B] bg-[#0F0A1E] p-3 text-xs text-[#C8B1E4]">
                          <p className="mb-1 text-[11px] font-label text-[#9B72CF]">
                            {lang === 'en' ? 'Your review' : 'Votre avis'}
                          </p>
                          <div className="mb-1 flex gap-1">
                            {Array.from({ length: rental.review.rating }).map((_, index) => (
                              <Star key={index} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                            ))}
                          </div>
                          {rental.review.title && <p className="mb-1 font-label text-[#F4EFFA]">{rental.review.title}</p>}
                          {rental.review.body && <p className="leading-relaxed">{rental.review.body}</p>}
                        </div>
                      )}

                      {rental.accessOpen ? (
                        <div className="space-y-2">
                          <Link href={`${workspacePath}/${rental.id}`}>
                            <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                              {lang === 'en' ? 'Open agent' : 'Ouvrir l’agent'}
                            </Button>
                          </Link>
                          <form action={stopAction}>
                            <input type="hidden" name="rental_id" value={rental.id} />
                            <Button size="sm" variant="outline" className="w-full bg-transparent border-[#EF4444]/45 text-[#FCA5A5] hover:bg-[#2A0D18]">
                              {lang === 'en' ? 'Stop access' : 'Arrêter l’accès'}
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-[#2F184B] bg-[#07050F] px-3 py-2 text-center text-xs text-[#9B72CF]">
                          {lang === 'en'
                            ? 'This access is not currently open.'
                            : 'Cet accès n’est pas ouvert pour le moment.'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!betaRentalsError && betaRentals.length === 0 && (
              <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-8 text-center">
                <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                  {lang === 'en' ? 'No rented agents yet' : 'Aucun agent loué pour l’instant'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#A78BCF]">
                  {lang === 'en'
                    ? 'Rent an approved agent from the marketplace to access it here.'
                    : 'Louez un agent approuvé depuis la marketplace pour y accéder ici.'}
                </p>
                <Link href={marketplacePath} className="mt-5 inline-flex">
                  <Button className="border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                    {lang === 'en' ? 'Explore agents' : 'Explorer les agents'}
                  </Button>
                </Link>
              </div>
            )}

            {historyRows.length > 0 && (
              <section className="mt-8 rounded-2xl border border-[#251A40] bg-[#110D24] p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-label mb-1 text-xs text-[#A78BCF]">
                      {lang === 'en' ? 'RENTAL HISTORY' : 'HISTORIQUE DES AGENTS LOUÉS'}
                    </p>
                    <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                      {lang === 'en' ? 'Find an agent you rented before' : 'Retrouver un agent déjà loué'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('history')}
                    className="text-sm font-display font-semibold text-[#C4B5FD] hover:text-[#F5F1FA]"
                  >
                    {lang === 'en' ? 'View full history' : 'Voir tout l’historique'}
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {historyRows.slice(0, 6).map((rental) => (
                    <article key={`rented-agent-${rental.id}`} className="rounded-xl border border-[#2F184B] bg-[#0A0816] p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-display font-bold text-[#F5F1FA]">{rental.agent}</h4>
                          <p className="mt-1 text-xs text-[#A78BCF]">
                            {lang === 'en' ? 'Last rented on' : 'Dernière location le'} {rental.dates}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-label ${statusBadgeClass(rental.status)}`}>
                          {rentalStatusLabel(rental.status, lang)}
                        </span>
                      </div>
                      {rental.accessOpen ? (
                        <Link href={`${workspacePath}/${rental.id}`}>
                          <Button size="sm" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                            {lang === 'en' ? 'Open my agent' : 'Ouvrir mon agent'}
                          </Button>
                        </Link>
                      ) : rental.slug ? (
                        <Link href={agentPath(rental.slug)}>
                          <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                            {lang === 'en' ? 'Rent again' : 'Relouer cet agent'}
                          </Button>
                        </Link>
                      ) : (
                        <p className="rounded-lg border border-[#2F184B] px-3 py-2 text-center text-xs text-[#9B72CF]">
                          {lang === 'en' ? 'Agent listing unavailable' : 'Fiche agent indisponible'}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="bg-[#110D24] border border-[#251A40] rounded-2xl overflow-x-auto">
            <div className="flex justify-between items-center p-4 border-b border-[#251A40]">
              <p className="font-display font-bold">{lang==='en'?'Rented agents history':'Historique des agents loués'}</p>
            </div>
            {historyRows.length === 0 ? (
              <div className="p-6 text-sm text-[#A78BCF]">
                {lang === 'en' ? 'No rented agent history yet.' : 'Aucun historique d’agent loué pour l’instant.'}
              </div>
            ) : (
              <table className="w-full text-sm min-w-[700px]">
                <thead><tr className="text-[10px] font-label text-[#A78BCF] border-b border-[#251A40]">
                  <th className="text-left p-3">{t('db.h.agent')}</th><th>{t('db.h.mode')}</th><th>{t('db.h.dates')}</th><th className="text-right">{t('db.h.price')}</th><th>{t('db.h.rating')}</th><th className="text-right pr-4">{t('db.h.actions')}</th>
                </tr></thead>
                <tbody>
                  {historyRows.map((h) => (
                    <tr key={h.id} className="border-b border-[#251A40] hover:bg-[#1A152F]">
                      <td className="p-3 text-[#F5F1FA] font-display font-semibold">{h.agent}</td>
                      <td className="text-[#D6C5E8]">{h.mode}</td>
                      <td className="text-[#A78BCF]">{h.dates}</td>
                      <td className="text-right font-stat text-[#F5F1FA]">{formatCreditsFromCents(h.price)}</td>
                      <td>
                        <div className="flex gap-0.5">
                          {Array.from({ length: h.rating ?? 0 }).map((_,i)=><Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]"/>)}
                        </div>
                      </td>
                      <td className="text-right pr-4">
                        <div className="flex justify-end gap-1">
                          {h.accessOpen ? (
                            <Link href={`${workspacePath}/${h.id}`} className="text-xs px-2 py-1 rounded bg-[#1A152F] hover:bg-[#251A40] text-[#D6C5E8]">
                              {lang === 'en' ? 'Open' : 'Ouvrir'}
                            </Link>
                          ) : h.slug ? (
                            <Link href={agentPath(h.slug)} className="text-xs px-2 py-1 rounded bg-[#1A152F] hover:bg-[#251A40] text-[#D6C5E8]">
                              {t('db.rerent')}
                            </Link>
                          ) : null}
                          {h.slug && (
                            <Link href={agentPath(h.slug)} className="p-1.5 rounded hover:bg-[#1A152F] text-[#A78BCF]">
                              <FileText className="w-3.5 h-3.5"/>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 md:p-8">
            <div className="max-w-2xl">
              <p className="font-label mb-2 text-xs text-[#A78BCF]">
                {lang === 'en' ? 'Saved agents' : 'Agents enregistrés'}
              </p>
              <h2 className="font-display text-2xl font-bold text-[#F5F1FA]">
                {lang === 'en' ? 'Favorites are not enabled yet.' : 'Les favoris ne sont pas encore activés.'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#C8B1E4]">
                {lang === 'en'
                  ? 'For now, the reliable shortcut is your rental history. Rented agents stay available there so you can rent them again without searching.'
                  : 'Pour l’instant, le raccourci fiable est votre historique. Les agents déjà loués y restent disponibles pour les relouer sans chercher.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => setTab('history')}
                  className="h-11 border-0 bg-[#F5F1FA] text-[#2B1A44] hover:bg-white"
                >
                  {lang === 'en' ? 'Open history' : 'Voir l’historique'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link href={marketplacePath}>
                  <Button variant="outline" className="h-11 border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA]">
                    {lang === 'en' ? 'Browse marketplace' : 'Explorer la marketplace'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {tab === 'memory' && (
          <div className="space-y-5">
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[#1A152F] to-[#110D24] border border-[#8B5CF6]/30">
              <h2 className="font-display text-2xl font-bold mb-2">
                {lang === 'en' ? 'AgentHub activity profile' : 'Profil d’activité AgentHub'}
              </h2>
              <p className="text-sm text-[#D6C5E8]">
                {lang === 'en'
                  ? 'This beta profile is based only on your real AgentHub activity. Personal memory editing will come later.'
                  : 'Ce profil beta est calculé uniquement depuis votre activité réelle sur AgentHub. L’édition de mémoire personnelle viendra plus tard.'}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: lang === 'en' ? 'Active agents' : 'Agents actifs',
                  value: activeAccessCount,
                  detail: lang === 'en' ? 'open workspaces' : 'workspaces ouverts',
                },
                {
                  label: lang === 'en' ? 'History' : 'Historique',
                  value: historyRows.length,
                  detail: lang === 'en' ? 'agents ready to rent again' : 'agents relouables',
                },
                {
                  label: lang === 'en' ? 'Stored runs' : 'Exécutions stockées',
                  value: totalRunCount,
                  detail:
                    lang === 'en'
                      ? `${totalSucceededRunCount} succeeded · ${failedRunCount} failed`
                      : `${totalSucceededRunCount} réussis · ${failedRunCount} échecs`,
                },
                {
                  label: lang === 'en' ? 'Verified reviews' : 'Avis vérifiés',
                  value: reviewCount,
                  detail: lang === 'en' ? 'feedback left' : 'retours laissés',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#251A40] bg-[#110D24] p-4">
                  <p className="font-label text-xs text-[#A78BCF]">{item.label}</p>
                  <p className="mt-2 font-stat text-3xl text-[#F5F1FA]">{item.value}</p>
                  <p className="mt-1 text-xs text-[#7F6B9C]">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
              <p className="font-display text-lg font-bold text-[#F5F1FA]">
                {lang === 'en' ? 'Next best action' : 'Prochaine meilleure action'}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#C8B1E4]">
                {activeAccessCount > 0
                  ? lang === 'en'
                    ? 'Open an active workspace and complete one run. That is what unlocks meaningful reviews and history.'
                    : 'Ouvrez un workspace actif et terminez une exécution. C’est ce qui débloque les avis utiles et l’historique.'
                  : historyRows.length > 0
                    ? lang === 'en'
                      ? 'Restart an agent from history instead of searching from scratch.'
                      : 'Relancez un agent depuis l’historique plutôt que de repartir de zéro.'
                    : lang === 'en'
                      ? 'Pick one approved agent from the marketplace to start building your activity profile.'
                      : 'Choisissez un agent approuvé dans la marketplace pour démarrer votre profil d’activité.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {activeAccessCount > 0 ? (
                  <Button type="button" onClick={() => setTab('rentals')} className="border-0 bg-[#F5F1FA] text-[#2B1A44] hover:bg-white">
                    {lang === 'en' ? 'Open active agents' : 'Voir les agents actifs'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : historyRows.length > 0 ? (
                  <Button type="button" onClick={() => setTab('history')} className="border-0 bg-[#F5F1FA] text-[#2B1A44] hover:bg-white">
                    {lang === 'en' ? 'Open history' : 'Voir l’historique'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Link href={marketplacePath}>
                    <Button className="border-0 bg-[#F5F1FA] text-[#2B1A44] hover:bg-white">
                      {lang === 'en' ? 'Explore marketplace' : 'Explorer la marketplace'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link href="/settings">
                  <Button variant="outline" className="border-[#6B3FA0] bg-transparent text-[#D6C5E8] hover:bg-[#1A152F] hover:text-[#F5F1FA]">
                    {lang === 'en' ? 'Account settings' : 'Paramètres du compte'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6">
              <p className="font-label text-xs text-[#A78BCF] mb-2">{t('db.pm')}</p>
              <h3 className="font-display text-xl font-bold text-[#F5F1FA]">
                {lang === 'en' ? 'Order status' : 'État de vos commandes'}
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-[#A78BCF]">
                {lang === 'en'
                  ? 'Track pending payments, cancelled checkouts, and activations waiting for Stripe webhook confirmation.'
                  : 'Suivez les paiements en attente, les checkouts annulés et les activations en attente de confirmation Stripe.'}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {[
                [lang === 'en' ? 'Active agents' : 'Agents actifs', activeAccessCount],
                [lang === 'en' ? 'Pending payments' : 'Paiements en attente', pendingPaymentCount],
                [lang === 'en' ? 'Cancelled payments' : 'Paiements annulés', cancelledPaymentCount],
                [lang === 'en' ? 'Blocked activations' : 'Activations bloquées', blockedPaymentCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#251A40] bg-[#110D24] p-4">
                  <p className="font-label text-[10px] text-[#A78BCF]">{label}</p>
                  <p className="mt-2 font-stat text-2xl text-[#F5F1FA]">{value}</p>
                </div>
              ))}
            </div>

            {paymentOrdersError && (
              <div className="rounded-2xl border border-[#F59E0B]/40 bg-[#110D24] px-4 py-3 text-sm text-[#F59E0B]">
                {lang === 'en' ? 'Payment status is temporarily unavailable.' : 'Les états de paiement sont temporairement indisponibles.'}
              </div>
            )}

            {!paymentOrdersError && paymentOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#251A40] bg-[#110D24] p-6 text-sm text-[#A78BCF]">
                {lang === 'en'
                  ? 'No Stripe checkout has been started yet.'
                  : 'Aucun checkout Stripe n’a encore été démarré.'}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {paymentOrders.map((payment) => (
                  <article key={payment.id} className="rounded-2xl border border-[#251A40] bg-[#110D24] p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[#F5F1FA]">
                          {payment.agent?.name ?? (lang === 'en' ? 'AgentHub agent' : 'Agent AgentHub')}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[#A78BCF]">{payment.agent?.summary}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-label ${paymentStatusClass(payment.status)}`}>
                        {paymentStatusLabel(payment.status, lang, Boolean(payment.rentalRequestId), payment.rentalStatus)}
                      </span>
                    </div>
                    <div className="mb-4 flex items-center justify-between text-sm text-[#D6C5E8]">
                      <span>{new Date(payment.createdAt).toLocaleDateString(effectiveLocale === 'en' ? 'en-US' : 'fr-FR')}</span>
                      <span className="font-stat text-[#F5F1FA]">{formatCreditsFromCents(payment.amountCents)}</span>
                    </div>
                    {payment.status === 'paid_blocked' && (
                      <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                        {lang === 'en'
                          ? 'Payment was received, but access activation needs a manual check.'
                          : 'Paiement reçu, mais l’activation de l’accès nécessite une vérification.'}
                      </div>
                    )}
                    {payment.rentalRequestId && !['stopped', 'expired'].includes(payment.rentalStatus ?? '') ? (
                      <Link href={`${workspacePath}/${payment.rentalRequestId}`}>
                        <Button size="sm" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                          {lang === 'en' ? 'Open access' : 'Ouvrir l’accès'}
                        </Button>
                      </Link>
                    ) : ['stopped', 'expired'].includes(payment.rentalStatus ?? '') && payment.agent?.slug ? (
                      <Link href={agentPath(payment.agent.slug)}>
                        <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                          {lang === 'en' ? 'Rent again' : 'Relouer cet agent'}
                        </Button>
                      </Link>
                    ) : payment.status === 'paid' && payment.checkoutSessionId ? (
                      <Link href={`${effectiveLocale === 'en' ? '/en' : ''}/checkout/success?session_id=${encodeURIComponent(payment.checkoutSessionId)}`}>
                        <Button size="sm" className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                          {lang === 'en' ? 'Check activation' : 'Vérifier l’activation'}
                        </Button>
                      </Link>
                    ) : payment.agent?.slug ? (
                      <Link href={agentPath(payment.agent.slug)}>
                        <Button size="sm" variant="outline" className="w-full bg-transparent border-[#6B3FA0] text-[#D6C5E8] hover:bg-[#1A152F]">
                          {lang === 'en' ? 'View agent' : 'Voir l’agent'}
                        </Button>
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}

export default DashboardPage;
