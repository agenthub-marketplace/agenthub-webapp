'use client';

import { AlertTriangle, Check, ShieldCheck } from 'lucide-react';
import { evaluateAgentContractQuality } from '@/lib/agent-contract-quality';
import { CodePanel } from './code-console-ui';

function lines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function priceToCents(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function hasUsefulText(value) {
  return typeof value === 'string' && value.trim().length >= 8;
}

function hasWebhookStep(value) {
  return lines(value).some((line) => line.toLowerCase().startsWith('webhook:'));
}

function hasDecisionStep(value) {
  return lines(value).some((line) => /d[ée]cid|class|priorit|score|qualif|router|choisir|triage|cat[ée]gor/i.test(line));
}

function looksLikePublicHttpsUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      url.protocol === 'https:' &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      !host.startsWith('10.') &&
      !host.startsWith('192.168.') &&
      !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

function hasCreatorEndpointDisclosure(value) {
  return /\b(api|endpoint|creator|infrastructure|serveur|https|proxy|sign[ée]?)\b/i.test(value);
}

function hasUnsupportedExternalActionPromise(value) {
  return value
    .split(/\r?\n|[.!?]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      if (/\b(sans|aucun|aucune|ne\s+\w+.*\bpas|n['’]\w+.*\bpas|ne\s+\w+.*\baucun|ne\s+\w+.*\baucune)\b/i.test(line)) {
        return false;
      }

      return /\b(scrape|scraper|connecte|connexion|appelle une api|appel api|webhook|modifie le crm|cr[ée]e un ticket|envoie un email|publie|poste automatiquement)\b/i.test(
        line,
      );
    });
}

function workspaceStrategyPreview(values) {
  const usesWebhook = hasWebhookStep(values.workflow_steps);

  if (values.runtime_type === 'creator_endpoint') {
    return {
      detail: 'AgentHub gardera accès, paiement, historique et avis, mais l’exécution passera par ton endpoint HTTPS approuvé.',
      items: [
        'Endpoint HTTPS public requis',
        'Validation admin + security review obligatoires',
        'Aucun appel direct depuis le navigateur utilisateur',
      ],
      label: 'Infra creator requise',
      tone: 'warning',
    };
  }

  if (values.runtime_type === 'workflow_automation' && usesWebhook) {
    return {
      detail: 'AgentHub orchestrera le workflow et appellera uniquement les webhooks creator approuvés.',
      items: [
        'Chaque webhook doit être validé',
        'Le workflow doit rester linéaire et court',
        'Prévoir un comportement lisible si le webhook échoue',
      ],
      label: 'Workspace hybride',
      tone: 'warning',
    };
  }

  if (values.runtime_type === 'workflow_automation') {
    return {
      detail: 'AgentHub peut exécuter ce workflow dans son workspace avec le worker et les étapes LLM validées.',
      items: [
        '2 à 5 étapes maximum',
        'Décision LLM visible',
        'Historique de run stocké dans AgentHub',
      ],
      label: 'Workspace AgentHub',
      tone: 'success',
    };
  }

  if (values.workspace_mode === 'document_required') {
    return {
      detail: 'L’assistant guidé devra recevoir un document dans le workspace avant génération.',
      items: [
        'PDF/DOCX uniquement en beta document',
        'Pas d’OCR pour les PDF scannés',
        'Ne pas demander de documents réels sensibles aux testeurs',
      ],
      label: 'Workspace document',
      tone: 'warning',
    };
  }

  return {
    detail: 'Le workspace AgentHub natif suffit pour ce runtime et les actions guidées.',
    items: [
      'Contexte utilisateur saisi dans AgentHub',
      'Réponse stockée dans l’historique du workspace',
      'Avis vérifié possible après utilisation',
    ],
    label: 'Workspace AgentHub natif',
    tone: 'success',
  };
}

function buildQualityReport(values) {
  return evaluateAgentContractQuality({
    name: values.name,
    summary: values.short_description,
    startingPriceCents: priceToCents(values.starting_price_eur),
    riskLevel: values.risk_level,
    capabilities: lines(values.does),
    requiredInputs: lines(values.required_inputs),
    deliverables: lines(values.deliverables),
    limitations: [...lines(values.does_not_do), ...lines(values.known_limits)],
    workspaceMode: values.workspace_mode,
    setupRequirements: {
      type: values.setup_type,
      items: lines(values.setup_items),
    },
    outputPromise: {
      summary: values.output_promise_summary,
      examples: lines(values.output_promise_examples),
    },
    executionMode: values.execution_mode,
    runtimeType: values.runtime_type,
    dataPolicy: {
      stores_user_data: values.execution_mode === 'llm_prompt' || values.workspace_mode !== 'instant',
      requires_files: values.workspace_mode === 'document_required',
      external_tools: [],
    },
  });
}

function runtimeGuardrails(values) {
  const checks = [
    {
      id: 'template_selected',
      label: 'Template sélectionné',
      detail: 'Le template donne une base cohérente avant personnalisation.',
      passes: Boolean(values.agent_template),
      severity: 'warning',
    },
  ];

  if (values.runtime_type === 'workflow_automation') {
    const workflowSteps = lines(values.workflow_steps);
    const usesWebhook = hasWebhookStep(values.workflow_steps);
    const activePromiseText = [
      values.short_description,
      values.long_description,
      values.output_promise_summary,
      values.output_promise_examples,
      values.does,
      values.deliverables,
      values.sample_output,
    ].join('\n');

    checks.push(
      {
        id: 'workflow_step_count',
        label: 'Workflow entre 2 et 5 étapes',
        detail: 'Le worker beta exécute uniquement des workflows linéaires courts.',
        passes: workflowSteps.length >= 2 && workflowSteps.length <= 5,
        severity: 'blocker',
      },
      {
        id: 'workflow_decision_step',
        label: 'Décision LLM visible',
        detail: 'Un vrai agent beta doit classer, prioriser, scorer, router ou choisir une action.',
        passes: hasDecisionStep(values.workflow_steps),
        severity: 'warning',
      },
      {
        id: 'workflow_webhook_endpoint',
        label: 'Webhook cohérent',
        detail: 'Si une étape webhook existe, un endpoint HTTPS public devra être soumis puis approuvé.',
        passes: !usesWebhook || looksLikePublicHttpsUrl(values.workflow_endpoint_url),
        severity: 'blocker',
      },
      {
        id: 'workflow_external_promise',
        label: 'Promesse compatible avec le workflow',
        detail: 'Sans étape webhook, le workflow ne doit pas promettre scraping, publication, email envoyé ou modification externe.',
        passes: usesWebhook || !hasUnsupportedExternalActionPromise(activePromiseText),
        severity: 'blocker',
      },
    );
  }

  if (values.runtime_type === 'creator_endpoint') {
    const publicRuntimeText = [
      values.short_description,
      values.long_description,
      values.output_promise_summary,
      values.output_promise_examples,
      values.does,
      values.does_not_do,
      values.known_limits,
    ].join('\n');

    checks.push(
      {
        id: 'endpoint_name_present',
        label: 'Nom endpoint renseigné',
        detail: 'Le nom aide l’admin à identifier l’asset API à approuver.',
        passes: hasUsefulText(values.creator_endpoint_name),
        severity: 'warning',
      },
      {
        id: 'endpoint_url_public_https',
        label: 'Endpoint HTTPS public',
        detail: 'L’agent API nécessite une URL HTTPS publique, sans localhost ni IP privée.',
        passes: looksLikePublicHttpsUrl(values.creator_endpoint_url),
        severity: 'blocker',
      },
      {
        id: 'endpoint_disclosure_present',
        label: 'Disclosure API creator',
        detail: 'La fiche doit annoncer clairement que l’exécution passe par une API/endpoint creator approuvé côté serveur.',
        passes: hasCreatorEndpointDisclosure(publicRuntimeText),
        severity: 'blocker',
      },
    );
  }

  return checks;
}

function GuardrailItem({ check }) {
  const failed = check.status === 'fail' || check.passes === false;
  const blocker = check.severity === 'blocker';

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        failed
          ? blocker
            ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#7F1D1D]'
            : 'border-[#FCD34D] bg-[#FFFBEB] text-[#78350F]'
          : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]'
      }`}
    >
      <div className="flex items-start gap-2">
        {failed ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>
          <p className="font-semibold">{check.label}</p>
          <p className="mt-1 leading-5 opacity-80">{check.detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function CreatorGuardrailPreview({ values }) {
  const qualityReport = buildQualityReport(values);
  const runtimeChecks = runtimeGuardrails(values);
  const workspaceStrategy = workspaceStrategyPreview(values);
  const failedQualityChecks = qualityReport.checks.filter((check) => check.status === 'fail');
  const failedRuntimeChecks = runtimeChecks.filter((check) => !check.passes);
  const blockerCount = qualityReport.blockerCount + failedRuntimeChecks.filter((check) => check.severity === 'blocker').length;
  const warningCount = qualityReport.warningCount + failedRuntimeChecks.filter((check) => check.severity !== 'blocker').length;
  const visibleChecks = [...failedQualityChecks, ...runtimeChecks].slice(0, 8);

  return (
    <CodePanel>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-label mb-2 text-xs text-[#6B3FA0]">GARDE-FOUS CREATOR</p>
          <h3 className="font-display text-xl font-bold text-[#111827]">Précheck avant soumission</h3>
          <p className="mt-2 text-sm leading-6 text-[#4B5563]">
            Ces alertes aident à éviter les retours admin. La validation serveur et la review admin restent la source de vérité.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6B3FA0]">
          <ShieldCheck className="h-5 w-5" />
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
          <p className="font-label text-[10px] text-[#6B7280]">Blockers potentiels</p>
          <p className="font-stat mt-1 text-2xl text-[#111827]">{blockerCount}</p>
        </div>
        <div className="rounded-xl border border-[#E3E7F2] bg-[#F8FAFC] p-3">
          <p className="font-label text-[10px] text-[#6B7280]">Warnings</p>
          <p className="font-stat mt-1 text-2xl text-[#111827]">{warningCount}</p>
        </div>
      </div>
      <div
        className={`mb-4 rounded-2xl border p-4 ${
          workspaceStrategy.tone === 'success'
            ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]'
            : 'border-[#FCD34D] bg-[#FFFBEB] text-[#78350F]'
        }`}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-label text-[10px] opacity-80">STRATÉGIE WORKSPACE</p>
            <h4 className="mt-1 text-sm font-bold">{workspaceStrategy.label}</h4>
            <p className="mt-2 text-sm leading-5 opacity-85">{workspaceStrategy.detail}</p>
            <ul className="mt-3 space-y-1 text-xs leading-5 opacity-85">
              {workspaceStrategy.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {visibleChecks.length === 0 ? (
          <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-sm text-[#14532D]">
            Les garde-fous principaux sont remplis pour une review beta.
          </div>
        ) : (
          visibleChecks.map((check) => <GuardrailItem key={check.id} check={check} />)
        )}
      </div>
    </CodePanel>
  );
}
