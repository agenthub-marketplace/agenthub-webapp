import "server-only";

import { randomUUID } from "node:crypto";

import { normalizeAgentContract, type AgentContract } from "@/lib/agent-contract";
import { serverEnv } from "@/lib/env.server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { ACCESS_OPEN_STATUSES } from "@/server/payments/state";

export const DOCUMENT_STORAGE_BUCKET = "agent-documents";
export const DOCUMENT_PDF_MIME = "application/pdf";
export const DOCUMENT_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocumentRuntimeError = {
  error: string;
  statusCode: number;
};

export type DocumentRuntimeContext = {
  agent: AgentRow;
  contract: AgentContract;
  rental: RentalRunRow;
  version: AgentVersionRow;
};

export type AgentRow = {
  description: string;
  id: string;
  name: string;
  slug: string;
  status: string;
  summary: string;
};

type RentalRunRow = {
  agent_id: string;
  agent_version_id: string | null;
  agents: AgentRow | AgentRow[] | null;
  id: string;
  status: string;
  user_id: string;
};

type AgentVersionRow = {
  capabilities: string[] | null;
  data_policy: unknown;
  deliverables: string[] | null;
  execution_mode: string | null;
  id: string;
  limitations: string[] | null;
  output_promise: unknown;
  required_inputs: string[] | null;
  runtime_type: string | null;
  setup_requirements: unknown;
  workspace_mode: string | null;
};

type RuntimeSettingRow = {
  enabled: boolean;
  run_enabled: boolean;
};

function readSingle<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function fail(statusCode: number, error: string): DocumentRuntimeError {
  return { error, statusCode };
}

export function sanitizeFilename(filename: string) {
  const fallback = "document";
  const lastSegment = filename.split(/[/\\]/).pop() ?? fallback;
  const cleaned = lastSegment
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return cleaned || fallback;
}

export function buildDocumentStoragePath(input: { filename: string; rentalId: string; userId: string }) {
  return `${input.userId}/${input.rentalId}/${randomUUID()}-${sanitizeFilename(input.filename)}`;
}

export function documentExpiresAt() {
  return new Date(Date.now() + serverEnv.documentFileRetentionDays * 24 * 60 * 60 * 1000).toISOString();
}

export function validateDocumentFile(input: { buffer: Buffer; filename: string; mimeType: string; size: number }) {
  const safeFilename = sanitizeFilename(input.filename);
  const lowerFilename = safeFilename.toLowerCase();

  if (input.size <= 0 || input.size > serverEnv.documentMaxFileBytes) {
    return fail(413, "file-too-large");
  }

  if (!serverEnv.documentAllowedMimeTypes.includes(input.mimeType)) {
    return fail(415, "unsupported-mime-type");
  }

  if (input.mimeType === DOCUMENT_PDF_MIME) {
    if (!lowerFilename.endsWith(".pdf")) {
      return fail(415, "invalid-file-extension");
    }

    if (input.buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
      return fail(415, "invalid-pdf-signature");
    }

    return null;
  }

  if (input.mimeType === DOCUMENT_DOCX_MIME) {
    if (!lowerFilename.endsWith(".docx")) {
      return fail(415, "invalid-file-extension");
    }

    const zipSignature = input.buffer.subarray(0, 4);
    const isZip =
      zipSignature[0] === 0x50 &&
      zipSignature[1] === 0x4b &&
      ((zipSignature[2] === 0x03 && zipSignature[3] === 0x04) ||
        (zipSignature[2] === 0x05 && zipSignature[3] === 0x06) ||
        (zipSignature[2] === 0x07 && zipSignature[3] === 0x08));

    if (!isZip) {
      return fail(415, "invalid-docx-signature");
    }

    return null;
  }

  return fail(415, "unsupported-mime-type");
}

export async function isDocumentRuntimeRunEnabled() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", "document_file")
    .maybeSingle<RuntimeSettingRow>();

  return !error && Boolean(data?.enabled && data.run_enabled);
}

export async function loadDocumentRuntimeContext(input: {
  profileId: string;
  rentalId: string;
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>;
}): Promise<{ context: DocumentRuntimeContext; error: null } | { context: null; error: DocumentRuntimeError }> {
  const { data: rental, error: rentalError } = await input.supabase
    .from("rental_requests")
    .select("id,user_id,agent_id,agent_version_id,status,agents!rental_requests_agent_id_fkey(id,name,slug,summary,description,status)")
    .eq("id", input.rentalId)
    .maybeSingle<RentalRunRow>();

  const agent = readSingle(rental?.agents ?? null);

  if (rentalError || !rental || !agent || rental.user_id !== input.profileId) {
    return { context: null, error: fail(404, "access-not-found") };
  }

  if (!(ACCESS_OPEN_STATUSES as readonly string[]).includes(rental.status)) {
    return { context: null, error: fail(403, "access-not-active") };
  }

  if (!rental.agent_version_id) {
    return { context: null, error: fail(403, "missing-agent-version") };
  }

  if (agent.status !== "approved") {
    return { context: null, error: fail(403, agent.status === "archived" ? "agent-archived" : "agent-not-approved") };
  }

  const { data: version, error: versionError } = await input.supabase
    .from("agent_versions")
    .select("id,capabilities,required_inputs,deliverables,limitations,workspace_mode,setup_requirements,output_promise,execution_mode,runtime_type,data_policy")
    .eq("id", rental.agent_version_id)
    .eq("agent_id", rental.agent_id)
    .maybeSingle<AgentVersionRow>();

  if (versionError || !version) {
    return { context: null, error: fail(403, "agent-version-not-found") };
  }

  const contract = normalizeAgentContract({
    dataPolicy: version.data_policy,
    executionMode: version.execution_mode,
    outputPromise: version.output_promise,
    runtimeType: version.runtime_type,
    setupRequirements: version.setup_requirements,
    workspaceMode: version.workspace_mode,
  });
  const acceptsDocumentInput =
    contract.runtimeType === "document_file" ||
    (contract.runtimeType === "llm_prompt" && (contract.dataPolicy.requires_files || contract.workspaceMode === "document_required"));

  if (!acceptsDocumentInput) {
    return { context: null, error: fail(403, "agent-not-document-enabled") };
  }

  if (contract.executionMode !== "llm_prompt") {
    return { context: null, error: fail(403, "agent-not-llm-enabled") };
  }

  const { data: runtimeSetting, error: runtimeSettingError } = await input.supabase
    .from("agent_runtime_settings")
    .select("enabled,run_enabled")
    .eq("runtime_type", "document_file")
    .maybeSingle<RuntimeSettingRow>();

  if (runtimeSettingError || !runtimeSetting?.enabled || !runtimeSetting.run_enabled) {
    return { context: null, error: fail(403, "document-runtime-disabled") };
  }

  if (contract.dataPolicy.external_tools.length > 0) {
    return { context: null, error: fail(403, "agent-requires-unsupported-tools") };
  }

  return {
    context: {
      agent,
      contract,
      rental,
      version,
    },
    error: null,
  };
}
