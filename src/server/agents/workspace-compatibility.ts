import "server-only";

import type { AgentRuntimeType } from "@/lib/agent-contract";

export type WorkspaceCompatibilityMode = "agenthub_hosted" | "creator_infra_required" | "hybrid_creator_infra";
export type WorkspaceCompatibilityStatus = "blocked" | "ready" | "review_required";

export type WorkspaceCompatibilityCheck = {
  detail: string | null;
  key: string;
  label: string;
  ok: boolean;
};

export type WorkspaceCompatibilityDiagnostic = {
  checks: WorkspaceCompatibilityCheck[];
  decision: {
    adminAction: string;
    fallbackRequired: boolean;
    key:
      | "agenthub_document_workspace"
      | "agenthub_native_workspace"
      | "agenthub_workflow_workspace"
      | "creator_endpoint_fallback"
      | "hybrid_creator_webhook";
    runtimeOwner: "agenthub" | "creator" | "hybrid";
    userDisclosure: string;
  };
  detail: string;
  label: string;
  mode: WorkspaceCompatibilityMode;
  status: WorkspaceCompatibilityStatus;
  tone: "error" | "success" | "warning";
};

type RuntimeSettingLike = {
  enabled: boolean;
  run_enabled: boolean;
} | null;

type RuntimeHealthLike = {
  ok: boolean;
  status: string;
} | null;

function compatibilityCheck(input: { key: string; label: string; ok: boolean; detail?: string | null }): WorkspaceCompatibilityCheck {
  return {
    detail: input.detail ?? null,
    key: input.key,
    label: input.label,
    ok: input.ok,
  };
}

export function workspaceCompatibilityMode(input: {
  runtimeType: AgentRuntimeType;
  workflowWebhookStepCount?: number;
}): WorkspaceCompatibilityMode {
  if (input.runtimeType === "creator_endpoint") {
    return "creator_infra_required";
  }

  if (input.runtimeType === "workflow_automation" && (input.workflowWebhookStepCount ?? 0) > 0) {
    return "hybrid_creator_infra";
  }

  return "agenthub_hosted";
}

function buildCompatibilityDecision(input: {
  mode: WorkspaceCompatibilityMode;
  runtimeType: AgentRuntimeType;
  status: WorkspaceCompatibilityStatus;
}): WorkspaceCompatibilityDiagnostic["decision"] {
  const statusPrefix =
    input.status === "ready"
      ? "Compatible beta."
      : input.status === "review_required"
        ? "Review admin requise avant beta."
        : "Bloquer avant test utilisateur.";

  if (input.mode === "creator_infra_required") {
    return {
      adminAction: `${statusPrefix} Confirmer endpoint HTTPS approuvé, signature HMAC, health check, security review et message utilisateur.`,
      fallbackRequired: true,
      key: "creator_endpoint_fallback",
      runtimeOwner: "creator",
      userDisclosure: "L’exécution dépend d’une infrastructure créateur approuvée, appelée côté serveur par AgentHub.",
    };
  }

  if (input.mode === "hybrid_creator_infra") {
    return {
      adminAction: `${statusPrefix} Valider chaque webhook creator, les limites de payload, la security review et le comportement d’erreur.`,
      fallbackRequired: true,
      key: "hybrid_creator_webhook",
      runtimeOwner: "hybrid",
      userDisclosure: "AgentHub orchestre le workflow, mais certaines étapes peuvent appeler une infrastructure créateur approuvée.",
    };
  }

  if (input.runtimeType === "document_file") {
    return {
      adminAction: `${statusPrefix} Vérifier bucket privé, extraction texte, limites PDF/DOCX, absence d’OCR et politique de rétention.`,
      fallbackRequired: false,
      key: "agenthub_document_workspace",
      runtimeOwner: "agenthub",
      userDisclosure: "AgentHub traite le document dans un workspace privé avec extraction texte beta.",
    };
  }

  if (input.runtimeType === "workflow_automation") {
    return {
      adminAction: `${statusPrefix} Vérifier worker workflow, étapes LLM, décision visible et historique de run.`,
      fallbackRequired: false,
      key: "agenthub_workflow_workspace",
      runtimeOwner: "agenthub",
      userDisclosure: "AgentHub orchestre les étapes du workflow dans le workspace et stocke le résultat.",
    };
  }

  return {
    adminAction: `${statusPrefix} Review standard : setup, promesse, limites et résultat attendu.`,
    fallbackRequired: false,
    key: "agenthub_native_workspace",
    runtimeOwner: "agenthub",
    userDisclosure: "AgentHub héberge l’exécution et conserve l’historique dans le workspace.",
  };
}

export function buildWorkspaceCompatibilityDiagnostic(input: {
  agentStatus: string;
  assetApproved: boolean;
  endpointHealth?: RuntimeHealthLike;
  runtimeSetting?: RuntimeSettingLike;
  runtimeType: AgentRuntimeType;
  securityReviewStatus?: string | null;
  securityReviewWaived: boolean;
  workflowWebhookHealth?: RuntimeHealthLike;
  workflowWebhookStepCount: number;
}): WorkspaceCompatibilityDiagnostic {
  const runtimeReady = Boolean(input.runtimeSetting?.enabled && input.runtimeSetting.run_enabled);
  const securityReviewRequired = !["llm_prompt", "static_guided"].includes(input.runtimeType);
  const securityReady =
    !securityReviewRequired || input.securityReviewStatus === "passed" || input.securityReviewWaived;
  const published = input.agentStatus === "approved";
  const endpointReady =
    input.runtimeType !== "creator_endpoint" || Boolean(input.endpointHealth?.ok || input.securityReviewWaived);
  const webhookReady =
    input.workflowWebhookStepCount === 0 || Boolean(input.workflowWebhookHealth?.ok || input.securityReviewWaived);

  const checks = [
    compatibilityCheck({
      key: "workspace-runtime",
      label: "Runtime workspace",
      ok: runtimeReady,
      detail: input.runtimeSetting
        ? `enabled=${input.runtimeSetting.enabled}, run_enabled=${input.runtimeSetting.run_enabled}`
        : "runtime setting introuvable",
    }),
    compatibilityCheck({
      key: "workspace-asset",
      label: "Asset exécutable",
      ok: input.assetApproved,
      detail: input.assetApproved ? null : "workflow ou endpoint non approuvé",
    }),
    compatibilityCheck({
      key: "workspace-security",
      label: "Security review",
      ok: securityReady,
      detail: securityReviewRequired
        ? input.securityReviewStatus
          ? `status=${input.securityReviewStatus}`
          : "security review manquante"
        : "non requise pour ce runtime",
    }),
    compatibilityCheck({
      key: "workspace-publication",
      label: "Agent publié",
      ok: published,
      detail: `agent=${input.agentStatus}`,
    }),
    ...(input.runtimeType === "creator_endpoint"
      ? [
          compatibilityCheck({
            key: "workspace-endpoint-health",
            label: "Endpoint utilisable",
            ok: endpointReady,
            detail: input.endpointHealth?.status
              ? `health=${input.endpointHealth.status}`
              : input.securityReviewWaived
                ? "health check waived by security review"
                : "aucun health check endpoint",
          }),
        ]
      : []),
    ...(input.workflowWebhookStepCount > 0
      ? [
          compatibilityCheck({
            key: "workspace-webhook-health",
            label: "Webhook utilisable",
            ok: webhookReady,
            detail: input.workflowWebhookHealth?.status
              ? `health=${input.workflowWebhookHealth.status}`
              : input.securityReviewWaived
                ? "webhook health waived by security review"
                : "aucun health check webhook",
          }),
        ]
      : []),
  ];

  const blocked = checks.filter((check) => !check.ok);
  const status: WorkspaceCompatibilityStatus =
    blocked.length === 0 ? "ready" : blocked.length <= 2 ? "review_required" : "blocked";
  const mode = workspaceCompatibilityMode({
    runtimeType: input.runtimeType,
    workflowWebhookStepCount: input.workflowWebhookStepCount,
  });
  const label =
    mode === "creator_infra_required"
      ? "Infra créateur requise"
      : mode === "hybrid_creator_infra"
        ? "Workspace hybride"
        : "Workspace AgentHub";
  const detail =
    blocked.length > 0
      ? `À corriger avant beta workspace : ${blocked.map((check) => check.label).join(", ")}.`
      : mode === "creator_infra_required"
        ? "AgentHub garde l'accès, l'audit et l'historique; l'exécution passe par un endpoint creator approuvé."
        : mode === "hybrid_creator_infra"
          ? "AgentHub orchestre le workflow et appelle uniquement les webhooks creator approuvés."
          : "AgentHub peut exécuter ce workflow dans le workspace sans infra creator obligatoire.";

  return {
    checks,
    decision: buildCompatibilityDecision({
      mode,
      runtimeType: input.runtimeType,
      status,
    }),
    detail,
    label,
    mode,
    status,
    tone: status === "ready" ? "success" : status === "review_required" ? "warning" : "error",
  };
}
