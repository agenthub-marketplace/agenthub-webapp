import Link from 'next/link';
import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';
import AgentAvatar from '@/components/AgentAvatar';
import RecentAgentTracker from '@/components/RecentAgentTracker';
import { Button } from '@/components/ui/button';
import { AGENT_RUNTIME_TYPE_LABELS, SETUP_REQUIREMENT_OPTIONS, WORKSPACE_MODE_LABELS } from '@/lib/agent-contract';
import { getCurrentProfile } from '@/lib/auth/session';
import { euroLabelToCredits, formatCredits, formatCreditsFromCents } from '@/lib/format-credits';
import { polishFrenchCopy, polishFrenchList } from '@/lib/french-copy';
import { buildAgentWorkspaceBlueprint } from '@/server/agents/workspace-blueprint';
import { getMarketplaceAgentBySlug } from '@/server/marketplace/agents';
import { createAgentAccessAction } from '@/server/rentals/actions';
import { getUserAgentOrderState } from '@/server/rentals/user-rentals';
import { AlertTriangle, ArrowLeft, Check, Clock, ShieldCheck, Star, Target } from 'lucide-react';

const AGENT_PAGE_COPY = {
  fr: {
    activate: 'Activer',
    activeAccess: 'Accès déjà actif',
    activeAccessBody: 'Vous avez déjà activé cet agent. Retrouvez-le dans “Mes agents” et ouvrez le workspace quand vous voulez.',
    activatedAt: 'Activé le',
    activationBlocked: 'Activation bloquée',
    activationBlockedBody: 'Paiement reçu, mais l’activation de l’accès nécessite une vérification. Contactez le support AgentHub avant de relancer.',
    activationLoop: 'La boucle à terminer',
    activationPending: 'Activation en cours',
    activationPendingBody: 'Le paiement est enregistré. L’accès sera disponible dès que la confirmation webhook Stripe aura terminé.',
    activationPendingShort: 'Commande déjà ouverte.',
    activationReadyBody: 'Stripe sandbox ou fallback beta crée l’accès après validation.',
    afterActivation: 'APRÈS ACTIVATION',
    agentNotFound: 'Cet agent n’est pas disponible.',
    agentType: 'Type d’agent',
    amount: 'Montant',
    availableAgents: 'Voir les agents disponibles',
    backToMarketplace: 'Retour marketplace',
    beforeRent: 'AVANT DE LOUER',
    blueprint: 'Blueprint agent',
    checkActivation: 'Vérifier l’activation',
    checkPromise: 'Vérifiez la promesse',
    checkBeforeRentDetail: 'Quelques points demandent de l’attention. Lisez les limites et préparez le bon contexte avant de louer.',
    checkBeforeRentLabel: 'À vérifier avant location',
    clarityScore: 'Score de clarté',
    creator: 'Créateur',
    creatorInfra: 'Infrastructure créateur',
    creatorInfraDetail: 'AgentHub orchestre l’appel côté serveur vers une API créateur approuvée. N’envoyez pas de secrets.',
    creatorVerified: 'Créateur vérifié AgentHub',
    data: 'Données',
    dataFallback: 'Classification de données non renseignée.',
    decisionQuick: 'DÉCISION RAPIDE',
    description: 'DESCRIPTION',
    documentRequired: 'Document requis',
    documentRequiredDetail: 'Préparez un PDF/DOCX avec texte sélectionnable. Les PDF scannés peuvent échouer en beta.',
    fitAvoid: 'À éviter si',
    fitBestFor: 'Bon fit pour',
    fitFallbackAvoid: 'Vous avez besoin d’un résultat réglementé définitif, d’une décision automatique sensible ou d’un traitement hors limites beta.',
    fitFallbackBestFor: 'Vous voulez tester rapidement un agent validé avec un contexte clair et un résultat vérifiable.',
    fitFallbackPrepare: 'Préparez un objectif court, quelques informations utiles et le résultat attendu.',
    fitPrepare: 'Préparez avant location',
    fitTitle: 'Est-ce le bon agent pour votre tâche ?',
    focusBeforeCheckout: 'Point clé avant checkout',
    focusReady: 'Prêt pour le checkout',
    focusReadyDetail: 'Le type, le setup et la promesse sont suffisamment clairs pour passer à l’activation.',
    expectedResult: 'Résultat attendu',
    genericRentalError: 'Impossible d’activer cet accès beta.',
    localFallbackNote: 'En local sans clé Stripe, l’accès beta peut encore être créé gratuitement pour tester le produit.',
    missionActiveBody: 'L’accès est prêt. Lancez une action dans le workspace pour créer une preuve stockée.',
    missionActiveReward: 'Débloque l’avis vérifié',
    missionActiveTitle: 'Mission active : utiliser maintenant',
    missionBlockedBody: 'L’activation est bloquée. Gardez cet état visible et corrigez avant de relancer.',
    missionBlockedReward: 'Protège votre accès',
    missionBlockedTitle: 'Mission support : vérifier l’activation',
    missionEyebrow: 'MISSION AGENTHUB',
    missionPendingBody: 'Le checkout est en cours. Revenez ici ou sur la page succès pour confirmer l’accès.',
    missionPendingReward: 'Ouvre le workspace',
    missionPendingTitle: 'Mission paiement : finaliser',
    missionStartBody: 'Louez cet agent, ouvrez le workspace, lancez une action et transformez le résultat en avis vérifié.',
    missionStartReward: 'Ajoute un signal au classement',
    missionStartTitle: 'Mission : tester cet agent',
    missionStoppedBody: 'Vous connaissez déjà cet agent. Relouez-le pour repartir plus vite sans refaire toute la recherche.',
    missionStoppedReward: 'Relance rapide',
    missionStoppedTitle: 'Mission retour : relouer',
    missionUnavailableBody: 'L’agent n’est pas encore prêt à louer. Vérifiez le prix, le runtime ou l’état de publication.',
    missionUnavailableReward: 'Évite un test cassé',
    missionUnavailableTitle: 'Mission bloquée : vérifier les prérequis',
    inputPrep: 'À préparer',
    knownLimits: 'Limites connues',
    noReviews: 'Aucun avis vérifié pour cet agent pour l’instant.',
    notFoundEyebrow: 'AGENT INTROUVABLE',
    notFoundFallback: 'Ce slug ne correspond à aucun agent approuvé dans Supabase.',
    notFoundUnavailable: 'La marketplace est temporairement indisponible.',
    openAndUse: 'Ouvrir et utiliser',
    openWorkspace: 'Ouvrez le workspace depuis cette page ou Mes agents.',
    orderCreatedAt: 'Créé le',
    outputPromiseFallback: 'L’accès ouvre un workspace guidé pour utiliser cet agent avec les consignes fournies par le créateur.',
    paymentCancelled: 'Paiement annulé. Aucun accès agent n’a été créé.',
    paymentPending: 'Paiement en attente',
    paymentPendingBody: 'Une commande est déjà ouverte pour cet agent. Finalisez le paiement ou attendez son expiration avant de relancer l’activation.',
    priceModeProject: 'au projet',
    priceModeTask: 'à la tâche',
    priceMissing: 'Crédits non configurés',
    priceRequired: 'Crédits requis',
    priceText: 'Le nombre de crédits est fixé par le créateur puis validé avant publication. L’accès s’active uniquement après confirmation.',
    priceUnavailable: 'Prix indisponible',
    priceUnavailableDetail: 'Le nombre de crédits doit être configuré avant activation.',
    promiseFallback: 'Le workspace guidera l’usage, mais la promesse de résultat doit être relue avant location.',
    proof: 'Preuve',
    proofDetail: 'Lancez une action, gardez le résultat en historique, puis laissez un avis vérifié.',
    rentAgent: 'Louer cet agent',
    rentDisabled: 'Location indisponible',
    rentAgain: 'Relouer cet agent',
    readyBeforeActivation: 'points prêts avant activation.',
    readyDetail: 'Le type d’agent, les inputs, la promesse et le setup sont clairs. Vous pouvez louer puis exécuter dans le workspace.',
    readyLabel: 'Prêt à louer',
    readyRentAgainLabel: 'Prêt à relouer',
    reviews: 'avis',
    reviewsLabel: 'Retours vérifiés',
    reviewsSuffix: 'avis vérifiés',
    reviewSubmitted: 'Votre avis a bien été envoyé. Merci pour votre retour.',
    rightAgent: 'Est-ce le bon agent ?',
    setupBeforeUse: 'Setup avant usage',
    setupLabel: 'Mise en place',
    status: 'Statut',
    statusActive: 'actif',
    stoppedAccess: 'Accès arrêté',
    stoppedAccessBody: 'Votre dernier accès est fermé. Vous pouvez relouer cet agent.',
    trust: 'Confiance et limites',
    unavailableDecisionDetail: 'Cet agent ne peut pas encore être loué. Le prix, le type d’exécution ou la publication doivent être finalisés.',
    unavailableDecisionLabel: 'Location indisponible',
    useCaseTitle: 'Comment cet agent sera utilisé',
    verified: 'Certifié',
    verifiedReviews: 'Avis vérifiés',
    workspace: 'Workspace',
    workspaceBlueprint: 'WORKSPACE PRÉVU',
    workspaceCopy: 'Ce résumé annonce ce que vous devrez fournir, ce que le workspace doit produire, et les données qui restent dans AgentHub.',
    workspaceOpensWhenActive: 'Le workspace s’ouvre dès que l’accès est actif.',
    whatAgentDoes: 'Ce que l’agent fait',
    whatYouGet: 'Ce que vous obtenez',
    workflowMultiStep: 'Workflow multi-étapes',
    workflowMultiStepDetail: 'Le résultat dépend d’une suite d’étapes validées. Prévoyez un contexte assez précis pour permettre les décisions.',
  },
  en: {
    activate: 'Activate',
    activeAccess: 'Access already active',
    activeAccessBody: 'You already activated this agent. Find it in My agents and open the workspace whenever you need it.',
    activatedAt: 'Activated on',
    activationBlocked: 'Activation blocked',
    activationBlockedBody: 'Payment was received, but access activation needs a manual check. Contact AgentHub support before retrying.',
    activationLoop: 'Loop to complete',
    activationPending: 'Activation in progress',
    activationPendingBody: 'Payment is recorded. Access will be available once Stripe webhook confirmation has finished.',
    activationPendingShort: 'Order already open.',
    activationReadyBody: 'Stripe sandbox or beta fallback creates access after validation.',
    afterActivation: 'AFTER ACTIVATION',
    agentNotFound: 'This agent is not available.',
    agentType: 'Agent type',
    amount: 'Amount',
    availableAgents: 'View available agents',
    backToMarketplace: 'Back to marketplace',
    beforeRent: 'BEFORE RENTING',
    blueprint: 'Agent blueprint',
    checkActivation: 'Check activation',
    checkPromise: 'Check the promise',
    checkBeforeRentDetail: 'A few points need attention. Read the limits and prepare the right context before renting.',
    checkBeforeRentLabel: 'Check before renting',
    clarityScore: 'Clarity score',
    creator: 'Creator',
    creatorInfra: 'Creator infrastructure',
    creatorInfraDetail: 'AgentHub orchestrates the server-side call to an approved creator API. Do not send secrets.',
    creatorVerified: 'Verified AgentHub creator',
    data: 'Data',
    dataFallback: 'Data classification is not provided yet.',
    decisionQuick: 'QUICK DECISION',
    description: 'DESCRIPTION',
    documentRequired: 'Document required',
    documentRequiredDetail: 'Prepare a PDF/DOCX with selectable text. Scanned PDFs can fail in beta.',
    fitAvoid: 'Avoid if',
    fitBestFor: 'Best fit for',
    fitFallbackAvoid: 'You need final regulated advice, sensitive automated decisions, or processing outside beta limits.',
    fitFallbackBestFor: 'You want to test a validated agent with clear context and a result you can inspect.',
    fitFallbackPrepare: 'Prepare a short objective, useful context, and the expected result.',
    fitPrepare: 'Prepare before renting',
    fitTitle: 'Is this the right agent for your task?',
    focusBeforeCheckout: 'Key point before checkout',
    focusReady: 'Ready for checkout',
    focusReadyDetail: 'The type, setup, and result promise are clear enough to move to activation.',
    expectedResult: 'Expected result',
    genericRentalError: 'Unable to activate this beta access.',
    localFallbackNote: 'In local mode without a Stripe key, beta access can still be created for product testing.',
    missionActiveBody: 'Access is ready. Run an action in the workspace to create stored proof.',
    missionActiveReward: 'Unlocks verified review',
    missionActiveTitle: 'Active mission: use now',
    missionBlockedBody: 'Activation is blocked. Keep this state visible and resolve it before retrying.',
    missionBlockedReward: 'Protects your access',
    missionBlockedTitle: 'Support mission: check activation',
    missionEyebrow: 'AGENTHUB MISSION',
    missionPendingBody: 'Checkout is in progress. Come back here or to the success page to confirm access.',
    missionPendingReward: 'Opens workspace',
    missionPendingTitle: 'Payment mission: finish',
    missionStartBody: 'Rent this agent, open the workspace, run an action, then turn the result into a verified review.',
    missionStartReward: 'Adds a ranking signal',
    missionStartTitle: 'Mission: test this agent',
    missionStoppedBody: 'You already know this agent. Rent it again to restart faster without searching.',
    missionStoppedReward: 'Fast restart',
    missionStoppedTitle: 'Return mission: rent again',
    missionUnavailableBody: 'This agent is not ready to rent yet. Check price, runtime, or publication state.',
    missionUnavailableReward: 'Avoids a broken test',
    missionUnavailableTitle: 'Blocked mission: check requirements',
    inputPrep: 'Prepare',
    knownLimits: 'Known limits',
    noReviews: 'No verified reviews for this agent yet.',
    notFoundEyebrow: 'AGENT NOT FOUND',
    notFoundFallback: 'This slug does not match any approved Supabase agent.',
    notFoundUnavailable: 'The marketplace is temporarily unavailable.',
    openAndUse: 'Open and use',
    openWorkspace: 'Open the workspace from this page or My agents.',
    orderCreatedAt: 'Created on',
    outputPromiseFallback: 'Access opens a guided workspace to use this agent with the creator’s instructions.',
    paymentCancelled: 'Payment cancelled. No agent access was created.',
    paymentPending: 'Payment pending',
    paymentPendingBody: 'An order is already open for this agent. Complete payment or wait for expiration before restarting activation.',
    priceModeProject: 'per project',
    priceModeTask: 'per task',
    priceMissing: 'Credits not configured',
    priceRequired: 'Credits required',
    priceText: 'Credits are set by the creator and validated before publication. Access activates only after confirmation.',
    priceUnavailable: 'Price unavailable',
    priceUnavailableDetail: 'Credits must be configured before activation.',
    promiseFallback: 'The workspace will guide usage, but the result promise should be reviewed before renting.',
    proof: 'Proof',
    proofDetail: 'Run an action, keep the result in history, then leave a verified review.',
    rentAgent: 'Rent this agent',
    rentDisabled: 'Renting unavailable',
    rentAgain: 'Rent this agent again',
    readyBeforeActivation: 'points ready before activation.',
    readyDetail: 'The agent type, inputs, promise, and setup are clear. You can rent it and run it in the workspace.',
    readyLabel: 'Ready to rent',
    readyRentAgainLabel: 'Ready to rent again',
    reviews: 'reviews',
    reviewsLabel: 'Verified feedback',
    reviewsSuffix: 'verified reviews',
    reviewSubmitted: 'Your review was submitted. Thanks for the feedback.',
    rightAgent: 'Is this the right agent?',
    setupBeforeUse: 'Setup before use',
    setupLabel: 'Setup',
    status: 'Status',
    statusActive: 'active',
    stoppedAccess: 'Access stopped',
    stoppedAccessBody: 'Your last access is closed. You can rent this agent again.',
    trust: 'Trust and limits',
    unavailableDecisionDetail: 'This agent cannot be rented yet. The price, runtime, or publication must be finalized.',
    unavailableDecisionLabel: 'Renting unavailable',
    useCaseTitle: 'How this agent will be used',
    verified: 'Verified',
    verifiedReviews: 'Verified reviews',
    workspace: 'Workspace',
    workspaceBlueprint: 'PLANNED WORKSPACE',
    workspaceCopy: 'This summary explains what you will provide, what the workspace should produce, and which data stays in AgentHub.',
    workspaceOpensWhenActive: 'The workspace opens once access is active.',
    whatAgentDoes: 'What the agent does',
    whatYouGet: 'What you get',
    workflowMultiStep: 'Multi-step workflow',
    workflowMultiStepDetail: 'The result depends on validated steps. Provide enough context to support the decisions.',
  },
};

function ListSection({ emptyText, title, items, icon: Icon, tone = 'default' }) {
  const iconColor = tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

  return (
    <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
      <h2 className="font-display font-bold text-lg mb-4">{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-2 text-sm text-[#C8B1E4]">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#9B72CF]">{emptyText}</p>
      )}
    </div>
  );
}

function AgentFitSnapshot({ copy, goodFitItems, limitationItems, locale, prepareItems }) {
  const isEnglish = locale === 'en';
  const signalSummary = [
    isEnglish
      ? `${Math.max(goodFitItems.length, 1)} reason${Math.max(goodFitItems.length, 1) > 1 ? 's' : ''} to test`
      : `${Math.max(goodFitItems.length, 1)} raison${Math.max(goodFitItems.length, 1) > 1 ? 's' : ''} de tester`,
    isEnglish
      ? `${Math.max(prepareItems.length, 1)} thing${Math.max(prepareItems.length, 1) > 1 ? 's' : ''} to prepare`
      : `${Math.max(prepareItems.length, 1)} élément${Math.max(prepareItems.length, 1) > 1 ? 's' : ''} à préparer`,
    isEnglish
      ? `${Math.max(limitationItems.length, 1)} limit${Math.max(limitationItems.length, 1) > 1 ? 's' : ''} to know`
      : `${Math.max(limitationItems.length, 1)} limite${Math.max(limitationItems.length, 1) > 1 ? 's' : ''} à connaître`,
  ];
  const columns = [
    {
      empty: copy.fitFallbackBestFor,
      icon: Check,
      items: goodFitItems,
      title: copy.fitBestFor,
      tone: 'success',
    },
    {
      empty: copy.fitFallbackPrepare,
      icon: Clock,
      items: prepareItems,
      title: copy.fitPrepare,
      tone: 'default',
    },
    {
      empty: copy.fitFallbackAvoid,
      icon: AlertTriangle,
      items: limitationItems,
      title: copy.fitAvoid,
      tone: 'warning',
    },
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#6B3FA0]/45 bg-[#0F0A1E]">
      <div className="border-b border-[#2F184B] bg-[#160F2A] px-5 py-4">
        <p className="font-label text-[10px] text-[#B794F4]">{copy.decisionQuick}</p>
        <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-xl font-bold text-[#F4EFFA]">{copy.fitTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {signalSummary.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-[#6B3FA0]/45 bg-[#0F0A1E] px-2.5 py-1 text-[10px] font-semibold text-[#D8B4FE]"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-px bg-[#2F184B] md:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          const accent = column.tone === 'warning' ? 'text-[#F59E0B]' : column.tone === 'success' ? 'text-[#10B981]' : 'text-[#B794F4]';
          const items = column.items.length > 0 ? column.items.slice(0, 3) : [column.empty];

          return (
            <div key={column.title} className="bg-[#0F0A1E] p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2F184B] bg-[#080612]">
                  <Icon className={`h-4 w-4 ${accent}`} />
                </span>
                <p className="font-display text-sm font-bold text-[#F4EFFA]">{column.title}</p>
              </div>
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={`${column.title}-${item}-${index}`} className="text-sm leading-5 text-[#C8B1E4]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewSection({ copy, locale, reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-4">{copy.verifiedReviews}</h2>
        <p className="text-sm text-[#9B72CF]">{copy.noReviews}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5 space-y-4">
      <h2 className="font-display font-bold text-lg">{copy.verifiedReviews}</h2>
      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-[#2F184B] bg-[#0A0818] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {Array.from({ length: review.rating }).map((_, index) => (
                  <Star key={index} className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
                <span className="ml-1 text-xs text-[#9B72CF]">
                  {new Date(review.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                </span>
              </div>
            </div>
            {review.title && <p className="font-label text-xs text-[#F4EFFA] mb-1">{review.title}</p>}
            {review.body && <p className="text-sm text-[#C8B1E4] leading-relaxed">{review.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentBlueprintSection({ blueprint, copy }) {
  const inputFields = blueprint.inputSchema.fields ?? [];
  const outputSections = blueprint.outputSchema.sections ?? [];
  const trustItems = [
    ...(blueprint.trustBoundary.dataSentToAgentHub ?? []),
    ...(blueprint.trustBoundary.dataSentToCreatorInfra ?? []),
    ...(blueprint.trustBoundary.userWarnings ?? []),
  ];

  return (
    <div className="my-6 rounded-2xl border border-[#6B3FA0]/45 bg-[#120C24] p-5">
      <p className="font-label mb-2 text-xs text-[#B794F4]">{copy.workspaceBlueprint}</p>
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#F4EFFA]">{copy.useCaseTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C8B1E4]">
            {copy.workspaceCopy}
          </p>
        </div>
        <span className="w-fit rounded-full border border-[#6B3FA0]/45 bg-[#1A1130] px-3 py-1 text-[10px] font-label text-[#C4B5FD]">
          {copy.blueprint}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-4">
          <h3 className="font-display mb-3 text-base font-bold text-[#F4EFFA]">{copy.inputPrep}</h3>
          <div className="space-y-3">
            {inputFields.slice(0, 4).map((field) => (
              <div key={field.key} className="text-sm">
                <p className="font-semibold text-[#F4EFFA]">{field.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#9B72CF]">{field.helper}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#2F184B] bg-[#080612] p-4">
          <h3 className="font-display mb-3 text-base font-bold text-[#F4EFFA]">{copy.expectedResult}</h3>
          <div className="space-y-3">
            {outputSections.slice(0, 4).map((section) => (
              <div key={section.key} className="text-sm">
                <p className="font-semibold text-[#F4EFFA]">{section.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#9B72CF]">{section.expectedContent}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#F59E0B]/25 bg-[#1A1208] p-4">
          <h3 className="font-display mb-3 text-base font-bold text-[#F4EFFA]">{copy.trust}</h3>
          <div className="space-y-2">
            {trustItems.slice(0, 4).map((item, index) => (
              <div key={`${item}-${index}`} className="flex gap-2 text-sm text-[#F6C177]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatOrderPrice(cents) {
  return formatCreditsFromCents(cents);
}

function formatOrderDate(value, locale = 'fr') {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR');
}

const rentalErrors = {
  'agent-load-failed': 'Impossible de charger cet agent pour le moment.',
  'agent-unavailable': 'Cet agent n’est plus disponible à l’accès beta.',
  'agent-runtime-unavailable': 'Cet agent est approuvé, mais son type d’exécution est temporairement désactivé. Réessayez après validation AgentHub.',
  'rental-create-failed': 'Impossible d’activer cet accès beta pour le moment.',
  'price-not-configured': 'Cet agent doit avoir un nombre de crédits fixe avant d’être loué.',
  'self-rental-not-allowed': 'Vous ne pouvez pas louer votre propre agent en beta.',
  'payment-service-unavailable': 'Le service de paiement est indisponible pour le moment.',
  'checkout-create-failed': 'Impossible de créer la session de paiement Stripe.',
  'payment-create-failed': 'Impossible d’enregistrer ce paiement.',
  'stripe-not-configured': 'Stripe n’est pas encore configuré sur cet environnement.',
  'payment-config-invalid': 'La configuration paiement est incohérente sur cet environnement.',
};

const orderMessages = {
  'activation-pending': 'Votre paiement est reçu. L’activation de l’accès est en cours.',
  'payment-pending': 'Un paiement est déjà en attente pour cet agent.',
  'activation-blocked': 'Le paiement est reçu, mais l’activation a été bloquée. Contactez l’équipe AgentHub.',
};

const USER_RUNTIME_LABELS = {
  en: {
    creator_endpoint: 'API agent',
    document_file: 'Guided AI assistant',
    llm_prompt: 'Guided AI assistant',
    static_guided: 'Guided workspace',
    workflow_automation: 'Workflow agent',
  },
  fr: {
    ...AGENT_RUNTIME_TYPE_LABELS,
    document_file: AGENT_RUNTIME_TYPE_LABELS.llm_prompt,
  },
};

function runtimeDetail(contract, locale = 'fr') {
  const runtimeType = contract?.runtimeType;
  const isEnglish = locale === 'en';
  const label = USER_RUNTIME_LABELS[isEnglish ? 'en' : 'fr'][runtimeType] || (isEnglish ? 'AgentHub agent' : 'Agent AgentHub');

  if (runtimeType === 'creator_endpoint') {
    return {
      label,
      detail: isEnglish
        ? 'Execution is orchestrated by AgentHub with an approved creator API on the server side.'
        : 'Exécution orchestrée par AgentHub avec une API creator approuvée côté serveur.',
    };
  }

  if (runtimeType === 'workflow_automation') {
    return {
      label,
      detail: isEnglish
        ? 'Controlled step sequence with progress and a stored workspace result.'
        : 'Suite d’étapes contrôlées avec progression et résultat stocké dans le workspace.',
    };
  }

  if (runtimeType === 'document_file') {
    return {
      label,
      detail: isEnglish
        ? 'Guided assistant that can use a private PDF/DOCX as workspace context.'
        : 'Assistant guidé qui peut utiliser un PDF/DOCX privé comme contexte dans le workspace.',
    };
  }

  if (runtimeType === 'llm_prompt') {
    return {
      label,
      detail: isEnglish
        ? 'Guided text assistant for structured responses from your context.'
        : 'Assistant texte guidé, adapté aux réponses structurées à partir de votre contexte.',
    };
  }

  return {
    label,
    detail: isEnglish
      ? 'Guided workspace without advanced AI execution.'
      : 'Workspace guidé sans exécution IA avancée.',
  };
}

function beforeRentChecklist({ agent, copy, hasPrice, outputPromiseSummary, requiredInputs, runtimeInfo, setupLabel }) {
  const items = [
    {
      detail: runtimeInfo.detail,
      label: `Type : ${runtimeInfo.label}`,
      tone: 'default',
    },
    {
      detail: requiredInputs.length > 0
        ? requiredInputs.slice(0, 2).join(' · ')
        : copy.dataFallback,
      label: copy.inputPrep,
      tone: requiredInputs.length > 0 ? 'default' : 'warning',
    },
    {
      detail: outputPromiseSummary || copy.promiseFallback,
      label: copy.checkPromise,
      tone: outputPromiseSummary ? 'default' : 'warning',
    },
    {
      detail: setupLabel,
      label: copy.setupLabel,
      tone: 'default',
    },
  ];

  if (!hasPrice) {
    items.push({
      detail: copy.priceUnavailableDetail,
      label: copy.priceUnavailable,
      tone: 'warning',
    });
  }

  if (agent.contract.runtimeType === 'creator_endpoint') {
    items.push({
      detail: copy.creatorInfraDetail,
      label: copy.creatorInfra,
      tone: 'warning',
    });
  }

  if (agent.contract.runtimeType === 'workflow_automation') {
    items.push({
      detail: copy.workflowMultiStepDetail,
      label: copy.workflowMultiStep,
      tone: 'default',
    });
  }

  if (agent.contract.runtimeType === 'document_file') {
    items.push({
      detail: copy.documentRequiredDetail,
      label: copy.documentRequired,
      tone: 'warning',
    });
  }

  return items.slice(0, 6);
}

function buildRentDecision({ canStartOrder, copy, orderState, rentChecklist }) {
  const warningCount = rentChecklist.filter((item) => item.tone === 'warning').length;
  const checkedCount = rentChecklist.length - warningCount;
  const score = rentChecklist.length > 0 ? Math.round((checkedCount / rentChecklist.length) * 100) : 0;

  if (orderState?.kind === 'open_access') {
    return {
      detail: copy.openWorkspace,
      label: copy.activeAccess,
      score: 100,
      tone: 'success',
    };
  }

  if (orderState?.kind === 'activation_blocked') {
    return {
      detail: copy.activationBlockedBody,
      label: copy.activationBlocked,
      score: 55,
      tone: 'warning',
    };
  }

  if (orderState?.kind === 'payment_pending' || orderState?.kind === 'activation_pending') {
    return {
      detail: copy.paymentPendingBody,
      label: copy.paymentPending,
      score: 70,
      tone: 'pending',
    };
  }

  if (!canStartOrder && !orderState) {
    return {
      detail: copy.unavailableDecisionDetail,
      label: copy.unavailableDecisionLabel,
      score,
      tone: 'warning',
    };
  }

  if (warningCount > 0) {
    return {
      detail: copy.checkBeforeRentDetail,
      label: copy.checkBeforeRentLabel,
      score,
      tone: 'warning',
    };
  }

  return {
    detail: copy.readyDetail,
    label: orderState?.kind === 'stopped_access' ? copy.readyRentAgainLabel : copy.readyLabel,
    score: 100,
    tone: 'success',
  };
}

function RentDecisionPanel({ copy, decision, rentChecklist }) {
  const isWarning = decision.tone === 'warning';
  const isPending = decision.tone === 'pending';
  const firstWarning = rentChecklist.find((item) => item.tone === 'warning');
  const Icon = isWarning ? AlertTriangle : ShieldCheck;
  const accentClass = isWarning
    ? 'border-[#F59E0B]/35 bg-[#1A1208] text-[#F6C177]'
    : isPending
      ? 'border-[#8B5CF6]/35 bg-[#17102D] text-[#D8B4FE]'
      : 'border-[#10B981]/35 bg-[#071611] text-[#6EE7B7]';

  return (
    <div className={`rounded-2xl border p-5 ${accentClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-label mb-2 text-[10px] opacity-80">{copy.decisionQuick}</p>
          <h2 className="font-display text-lg font-bold text-[#F4EFFA]">{decision.label}</h2>
          <p className="mt-2 text-xs leading-5 text-[#C8B1E4]">{decision.detail}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-current/25 bg-black/15">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-label text-[10px] opacity-80">{copy.clarityScore}</span>
        <span className="font-stat text-2xl text-[#F4EFFA]">{decision.score}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/25">
        <div className="h-full rounded-full bg-current" style={{ width: `${decision.score}%` }} />
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#C8B1E4]">
        {rentChecklist.length - rentChecklist.filter((item) => item.tone === 'warning').length}/{rentChecklist.length} {copy.readyBeforeActivation}
      </p>
      <div className="mt-4 rounded-xl border border-current/20 bg-black/15 p-3">
        <p className="font-label text-[10px] opacity-80">
          {firstWarning ? copy.focusBeforeCheckout : copy.focusReady}
        </p>
        <p className="mt-1 text-xs leading-5 text-[#E9D5FF]">
          {firstWarning ? `${firstWarning.label} : ${firstWarning.detail}` : copy.focusReadyDetail}
        </p>
      </div>
    </div>
  );
}

function buildAgentMission({ canStartOrder, copy, orderState }) {
  if (orderState?.kind === 'open_access') {
    return {
      body: copy.missionActiveBody,
      reward: copy.missionActiveReward,
      title: copy.missionActiveTitle,
      tone: 'success',
    };
  }

  if (orderState?.kind === 'activation_blocked') {
    return {
      body: copy.missionBlockedBody,
      reward: copy.missionBlockedReward,
      title: copy.missionBlockedTitle,
      tone: 'warning',
    };
  }

  if (orderState?.kind === 'payment_pending' || orderState?.kind === 'activation_pending') {
    return {
      body: copy.missionPendingBody,
      reward: copy.missionPendingReward,
      title: copy.missionPendingTitle,
      tone: 'pending',
    };
  }

  if (orderState?.kind === 'stopped_access') {
    return {
      body: copy.missionStoppedBody,
      reward: copy.missionStoppedReward,
      title: copy.missionStoppedTitle,
      tone: 'restart',
    };
  }

  if (!canStartOrder) {
    return {
      body: copy.missionUnavailableBody,
      reward: copy.missionUnavailableReward,
      title: copy.missionUnavailableTitle,
      tone: 'warning',
    };
  }

  return {
    body: copy.missionStartBody,
    reward: copy.missionStartReward,
    title: copy.missionStartTitle,
    tone: 'default',
  };
}

function AgentMissionCard({ copy, mission, runtimeInfo }) {
  const toneClass = {
    default: 'border-[#8B5CF6]/40 bg-[radial-gradient(circle_at_top_left,#2D1F50_0%,#0F0A1E_55%,#080612_100%)] text-[#D8B4FE]',
    pending: 'border-[#F59E0B]/35 bg-[#1A1208] text-[#F6C177]',
    restart: 'border-[#38BDF8]/35 bg-[#07131C] text-[#7DD3FC]',
    success: 'border-[#10B981]/35 bg-[#071611] text-[#6EE7B7]',
    warning: 'border-[#F59E0B]/35 bg-[#1A1208] text-[#F6C177]',
  }[mission.tone] ?? 'border-[#8B5CF6]/40 bg-[#0F0A1E] text-[#D8B4FE]';

  return (
    <div className={`overflow-hidden rounded-2xl border p-5 ${toneClass}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-label mb-2 text-[10px] opacity-80">{copy.missionEyebrow}</p>
          <h2 className="font-display text-lg font-bold text-[#F4EFFA]">{mission.title}</h2>
          <p className="mt-2 text-xs leading-5 text-[#C8B1E4]">{mission.body}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/25 bg-black/15">
          <Target className="h-5 w-5" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-current/25 bg-black/15 px-2.5 py-1 text-[10px] font-label text-[#F4EFFA]">
          {runtimeInfo.label}
        </span>
        <span className="rounded-full border border-current/25 bg-black/15 px-2.5 py-1 text-[10px] font-label text-[#F4EFFA]">
          {mission.reward}
        </span>
      </div>
    </div>
  );
}

function AfterActivationPanel({ copy, orderState }) {
  const hasAccess = orderState?.kind === 'open_access';
  const hasOrderInProgress = orderState?.kind === 'payment_pending' || orderState?.kind === 'activation_pending';
  const steps = [
    {
      detail: hasAccess
        ? copy.openWorkspace
        : hasOrderInProgress
          ? copy.activationPendingShort
          : copy.activationReadyBody,
      done: hasAccess,
      key: 'activate',
      label: copy.activate,
      status: hasOrderInProgress ? 'pending' : 'idle',
    },
    {
      detail: hasAccess
        ? copy.openWorkspace
        : copy.workspaceOpensWhenActive,
      done: hasAccess,
      key: 'workspace',
      label: copy.workspace,
      status: hasAccess ? 'ready' : 'idle',
    },
    {
      detail: copy.proofDetail,
      done: false,
      key: 'proof',
      label: copy.proof,
      status: hasAccess ? 'next' : 'idle',
    },
  ];

  return (
    <div className="rounded-2xl border border-[#2F184B] bg-[#0F0A1E] p-5">
      <p className="font-label mb-2 text-[10px] text-[#9B72CF]">{copy.afterActivation}</p>
      <h2 className="font-display mb-4 text-lg font-bold text-[#F4EFFA]">{copy.activationLoop}</h2>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isPending = step.status === 'pending' || step.status === 'next';
          const badgeClass = step.done
            ? 'border-[#10B981]/35 bg-[#10B981]/10 text-[#6EE7B7]'
            : isPending
              ? 'border-[#8B5CF6]/40 bg-[#17102D] text-[#D8B4FE]'
              : 'border-[#2F184B] bg-[#080612] text-[#9B72CF]';

          return (
            <div key={step.key} className={`rounded-xl border p-3 ${badgeClass}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current/25 bg-black/15 text-xs font-bold">
                  {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <p className="text-sm font-semibold text-[#F4EFFA]">{step.label}</p>
              </div>
              <p className="pl-8 text-xs leading-5 text-[#C8B1E4]">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function Page({ params, searchParams }) {
  const { slug } = await params;
  const [agentResult, profile] = await Promise.all([
    getMarketplaceAgentBySlug(slug),
    getCurrentProfile(),
  ]);
  const { agent, error } = agentResult;
  const query = searchParams ? await searchParams : {};
  const locale = query?.locale === 'en' ? 'en' : 'fr';
  const isEnglish = locale === 'en';
  const copy = AGENT_PAGE_COPY[locale] ?? AGENT_PAGE_COPY.fr;
  const marketplacePath = isEnglish ? '/en/search' : '/agenthub/search';
  const workspacePath = isEnglish ? '/en/workspace' : '/agenthub/workspace';
  const checkoutSuccessPath = isEnglish ? '/en/checkout/success' : '/checkout/success';
  const rentalError = typeof query?.error === 'string' ? query.error : null;
  const orderMessage = typeof query?.order === 'string' ? orderMessages[query.order] : null;
  const paymentCancelled = query?.payment === 'cancelled';
  const reviewSubmitted = typeof query?.reviewSubmitted === 'string';

  if (!agent) {
    return (
      <div className="min-h-screen">
        <AgentHubNavbar profile={profile} />
        <main className="container py-20">
          <Link href={marketplacePath} className="inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-8">
            <ArrowLeft className="w-4 h-4" />
          {copy.backToMarketplace}
          </Link>
          <div className="max-w-2xl rounded-3xl border border-[#2F184B] bg-[#0F0A1E] p-8">
            <p className="font-label text-xs text-[#F59E0B] mb-3">{copy.notFoundEyebrow}</p>
            <h1 className="font-display text-3xl font-bold mb-3">{copy.agentNotFound}</h1>
            <p className="text-[#C8B1E4] mb-6">
              {error ? copy.notFoundUnavailable : copy.notFoundFallback}
            </p>
            <Link href={marketplacePath}>
              <Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0">
                {copy.availableAgents}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const priceModeLabel = agent.pricingType === 'project' ? 'projet' : 'tâche';
  const hasPrice = typeof agent.fromPrice === 'number' && agent.fromPrice > 0;
  const displayedPrice = hasPrice ? formatCredits(agent.fromPrice) : euroLabelToCredits(agent.priceLabel);
  const setupLabel = WORKSPACE_MODE_LABELS[agent.contract.workspaceMode] || 'Accès immédiat';
  const runtimeInfo = runtimeDetail(agent.contract, locale);
  const description = polishFrenchCopy(agent.description);
  const capabilities = polishFrenchList(agent.capabilities);
  const limitations = polishFrenchList(agent.limitations);
  const requiredInputs = polishFrenchList(agent.requiredInputs);
  const deliverables = polishFrenchList(agent.deliverables);
  const outputPromiseSummary = polishFrenchCopy(agent.contract.outputPromise.summary);
  const outputPromiseExamples = polishFrenchList(agent.contract.outputPromise.examples);
  const setupItems = polishFrenchList(agent.contract.setupRequirements.items);
  const goodFitItems = [
    outputPromiseSummary,
    ...capabilities,
    ...deliverables,
  ].filter(Boolean);
  const prepareFitItems = [
    ...requiredInputs,
    ...setupItems,
  ].filter(Boolean);
  const workspaceBlueprint = buildAgentWorkspaceBlueprint({
    actions: [],
    agent: {
      capabilities: agent.capabilities,
      deliverables: agent.deliverables,
      limitations: agent.limitations,
      requiredInputsList: agent.requiredInputs,
    },
    contract: agent.contract,
    documentInputMode: agent.contract.runtimeType === 'document_file',
    locale,
  });
  const rentChecklist = beforeRentChecklist({
    agent,
    copy,
    hasPrice,
    outputPromiseSummary,
    requiredInputs,
    runtimeInfo,
    setupLabel,
  });
  const { state: orderState } = profile ? await getUserAgentOrderState(profile.id, agent.id) : { state: null };
  const canStartOrder = hasPrice && (!orderState || orderState.kind === 'stopped_access');
  const rentDecision = buildRentDecision({
    canStartOrder,
    copy,
    orderState,
    rentChecklist,
  });
  const agentMission = buildAgentMission({
    canStartOrder,
    copy,
    orderState,
  });

  return (
    <div className="min-h-screen">
      <RecentAgentTracker
        agent={{
          category: agent.category,
          name: agent.name,
          pitch: agent.pitch,
          runtimeLabel: runtimeInfo.label,
          slug: agent.slug,
        }}
        profile={profile}
      />
      <AgentHubNavbar profile={profile} />
      <main className="container py-8">
        <Link href={marketplacePath} className="inline-flex items-center gap-2 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-8">
          <ArrowLeft className="w-4 h-4" />
            {copy.backToMarketplace}
        </Link>

        {reviewSubmitted && (
          <div className="mb-6 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#6EE7B7]">
            {copy.reviewSubmitted}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <section>
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <AgentAvatar index={agent.gradient} size="xl" />
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#10B981]/30 text-[#10B981]">
                    <ShieldCheck className="w-3 h-3" />
                    {copy.verified}
                  </span>
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#532B88]/40 text-[#C8B1E4]">
                    {agent.category}
                  </span>
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#8B5CF6]/40 text-[#C4B5FD]">
                    {runtimeInfo.label}
                  </span>
                  <span className="text-[10px] font-label px-2 py-1 rounded-full bg-[#1A1130] border border-[#8B5CF6]/40 text-[#C4B5FD]">
                    {setupLabel}
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{agent.name}</h1>
                <p className="text-lg text-[#C8B1E4] mb-5">{agent.pitch}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#9B72CF]">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />
                    <span className="font-stat text-[#F4EFFA]">{agent.reviews > 0 ? agent.rating.toFixed(1) : isEnglish ? 'New' : 'Nouveau'}</span>
                    <span>({agent.reviews} {copy.reviewsSuffix})</span>
                  </span>
                  {agent.estimatedTurnaround && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {agent.estimatedTurnaround}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 mb-6">
              <p className="font-label text-xs text-[#9B72CF] mb-3">{copy.description}</p>
              <p className="text-[#C8B1E4] leading-relaxed">{description}</p>
            </div>

            <AgentFitSnapshot
              copy={copy}
              goodFitItems={goodFitItems}
              limitationItems={limitations}
              locale={locale}
              prepareItems={prepareFitItems}
            />

            <AgentBlueprintSection blueprint={workspaceBlueprint} copy={copy} />

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <ListSection title={copy.whatAgentDoes} items={capabilities} icon={Check} emptyText={copy.dataFallback} />
              <ListSection title={copy.knownLimits} items={limitations} icon={AlertTriangle} tone="warning" emptyText={copy.dataFallback} />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <ListSection title={copy.inputPrep} items={requiredInputs} icon={Check} emptyText={copy.dataFallback} />
              <ListSection title={copy.expectedResult} items={deliverables} icon={Check} emptyText={copy.dataFallback} />
            </div>

            <div className="my-6 grid md:grid-cols-2 gap-5">
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">{copy.agentType}</h2>
                <p className="text-sm font-semibold text-[#F4EFFA]">{runtimeInfo.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#C8B1E4]">{runtimeInfo.detail}</p>
              </div>
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">{copy.whatYouGet}</h2>
                <p className="text-sm leading-relaxed text-[#C8B1E4]">
                  {outputPromiseSummary || copy.outputPromiseFallback}
                </p>
                {outputPromiseExamples.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-[#C8B1E4]">
                    {outputPromiseExamples.map((example, index) => (
                      <li key={`${example}-${index}`} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-5">
                <h2 className="font-display font-bold text-lg mb-3">{copy.setupBeforeUse}</h2>
                <p className="text-sm text-[#C8B1E4]">
                  {optionLabel(SETUP_REQUIREMENT_OPTIONS, agent.contract.setupRequirements.type)}
                </p>
                {setupItems.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-[#C8B1E4]">
                    {setupItems.map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <ReviewSection reviews={agent.reviewSummaries} copy={copy} locale={locale} />
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <AgentMissionCard copy={copy} mission={agentMission} runtimeInfo={runtimeInfo} />

            <RentDecisionPanel copy={copy} decision={rentDecision} rentChecklist={rentChecklist} />

            <AfterActivationPanel orderState={orderState} copy={copy} />

            <div className="bg-[#0F0A1E] border border-[#6B3FA0]/45 rounded-2xl p-5">
              <p className="font-label text-[10px] text-[#B794F4] mb-2">{copy.beforeRent}</p>
              <h2 className="font-display font-bold text-lg mb-3">{copy.rightAgent}</h2>
              <div className="space-y-3">
                {rentChecklist.map((item) => {
                  const Icon = item.tone === 'warning' ? AlertTriangle : Check;
                  const color = item.tone === 'warning' ? 'text-[#F59E0B]' : 'text-[#10B981]';

                  return (
                    <div key={`${item.label}-${item.detail}`} className="flex gap-2 rounded-xl border border-[#2F184B] bg-[#080612] p-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                      <div>
                        <p className="text-sm font-semibold text-[#F4EFFA]">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[#C8B1E4]">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-6 glow-soft">
              <p className="font-label text-xs text-[#9B72CF] mb-1">{copy.priceRequired}</p>
              {hasPrice ? (
                <p className="font-stat text-4xl text-[#F4EFFA] glow-text mb-1">
                  {displayedPrice}
                  <span className="text-base text-[#9B72CF] ml-1">{priceModeLabel === 'projet' ? copy.priceModeProject : copy.priceModeTask}</span>
                </p>
              ) : (
                <p className="font-display text-2xl font-bold text-[#F4EFFA] mb-2">{copy.priceMissing}</p>
              )}
              {rentalError && (
                <div className="mb-4 rounded-xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-3 text-xs text-[#FCA5A5]">
                  {rentalErrors[rentalError] || copy.genericRentalError}
                </div>
              )}
              {paymentCancelled && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                  {copy.paymentCancelled}
                </div>
              )}
              {orderMessage && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-3 text-xs text-[#F6C177]">
                  {orderMessage}
                </div>
              )}
              <p className="text-sm text-[#9B72CF] mb-5">
                {copy.priceText}
              </p>
              {orderState?.kind === 'open_access' && (
                <div className="mb-4 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#C8B1E4]">
                  <p className="font-display font-bold text-[#6EE7B7]">{copy.activeAccess}</p>
                  <p className="mt-2">
                    {copy.activeAccessBody}
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-[#9B72CF]">
                    <span>{copy.status} : {orderState.status === 'active' ? copy.statusActive : orderState.status}</span>
                    <span>{copy.activatedAt} {formatOrderDate(orderState.createdAt, locale)}</span>
                    <span>{copy.amount} : {formatOrderPrice(orderState.priceCents, orderState.currency)}</span>
                  </div>
                  <Link href={`${workspacePath}/${orderState.rentalId}?tab=use`} className="mt-4 block">
                    <Button className="w-full border-0 bg-[#10B981] text-[#07130F] hover:bg-[#34D399]">
                      {copy.openAndUse}
                    </Button>
                  </Link>
                </div>
              )}
              {orderState?.kind === 'payment_pending' && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
                  <p className="font-display font-bold">{copy.paymentPending}</p>
                  <p className="mt-2">
                    {copy.paymentPendingBody}
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-[#C8B1E4]">
                    <span>{copy.orderCreatedAt} {formatOrderDate(orderState.createdAt, locale)}</span>
                    <span>{copy.amount} : {formatOrderPrice(orderState.amountCents, orderState.currency)}</span>
                  </div>
                </div>
              )}
              {orderState?.kind === 'activation_pending' && (
                <div className="mb-4 rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 p-4 text-sm text-[#C8B1E4]">
                  <p className="font-display font-bold text-[#6EE7B7]">{copy.activationPending}</p>
                  <p className="mt-2">
                    {copy.activationPendingBody}
                  </p>
                  {orderState.checkoutSessionId && (
                    <Link href={`${checkoutSuccessPath}?session_id=${encodeURIComponent(orderState.checkoutSessionId)}`} className="mt-4 block">
                      <Button className="w-full border-0 bg-[#532B88] text-white hover:bg-[#7C3AED]">
                        {copy.checkActivation}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {orderState?.kind === 'activation_blocked' && (
                <div className="mb-4 rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4 text-sm text-[#F6C177]">
                  <p className="font-display font-bold">{copy.activationBlocked}</p>
                  <p className="mt-2">
                    {copy.activationBlockedBody}
                  </p>
                  <div className="mt-3 grid gap-1 text-xs text-[#C8B1E4]">
                    <span>{copy.orderCreatedAt} {formatOrderDate(orderState.createdAt, locale)}</span>
                    <span>{copy.amount} : {formatOrderPrice(orderState.amountCents, orderState.currency)}</span>
                  </div>
                </div>
              )}
              {orderState?.kind === 'stopped_access' && (
                <div className="mb-4 rounded-xl border border-[#6B3FA0]/45 bg-[#1A1130] p-4 text-sm text-[#C8B1E4]">
                  <p className="font-display font-bold text-[#F4EFFA]">{copy.stoppedAccess}</p>
                  <p className="mt-2">{copy.stoppedAccessBody}</p>
                </div>
              )}
              {canStartOrder ? (
                <form action={createAgentAccessAction.bind(null, locale)} className="space-y-3">
                  <input type="hidden" name="agent_id" value={agent.id} />
                  <input type="hidden" name="slug" value={agent.slug} />
                  <Button className="w-full bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-primary h-12">
                    {orderState?.kind === 'stopped_access' ? copy.rentAgain : copy.rentAgent}
                  </Button>
                </form>
              ) : !orderState ? (
                <Button disabled className="w-full bg-[#532B88] text-white border-0 h-12 opacity-50">
                  {copy.rentDisabled}
                </Button>
              ) : null}
              <p className="mt-3 text-xs text-[#9B72CF]">
                {copy.localFallbackNote}
              </p>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-3">{copy.creator}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] flex items-center justify-center font-stat text-sm text-white">
                  {agent.creator.avatar}
                </div>
                <div>
                  <p className="font-display font-bold text-sm">{agent.creator.name}</p>
                  <p className="text-[11px] text-[#9B72CF]">{copy.creatorVerified}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-2">{copy.reviewsLabel}</p>
              <div className="text-[#F4EFFA] font-stat text-sm">{agent.reviews} {copy.reviews}</div>
              <p className="text-xs text-[#9B72CF] mt-2">
                {isEnglish ? 'Average rating based on post-activation reviews.' : 'Note moyenne basée sur les avis après activation.'}
              </p>
            </div>

            <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-4">
              <p className="font-label text-[10px] text-[#9B72CF] mb-2">{copy.data}</p>
              <p className="text-sm text-[#C8B1E4]">{agent.dataHandlingNotes || copy.dataFallback}</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
