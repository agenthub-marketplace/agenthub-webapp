export type WorkspaceMode = "instant" | "guided" | "document_required";
export type SetupRequirementType = "none" | "context" | "document";
export type ExecutionMode = "guided_workspace" | "llm_prompt";
export type AgentRuntimeType = "static_guided" | "llm_prompt" | "document_file" | "workflow_automation" | "creator_endpoint";

export type SetupRequirements = {
  type: SetupRequirementType;
  items: string[];
};

export type OutputPromise = {
  summary: string;
  examples: string[];
};

export type DataPolicy = {
  stores_user_data: boolean;
  requires_files: boolean;
  external_tools: string[];
};

export type AgentContract = {
  workspaceMode: WorkspaceMode;
  setupRequirements: SetupRequirements;
  outputPromise: OutputPromise;
  executionMode: ExecutionMode;
  runtimeType: AgentRuntimeType;
  dataPolicy: DataPolicy;
};

export const WORKSPACE_MODE_LABELS: Record<WorkspaceMode, string> = {
  instant: "Accès immédiat",
  guided: "Guidé dans workspace",
  document_required: "Document requis",
};

export const WORKSPACE_MODE_OPTIONS: { value: WorkspaceMode; label: string }[] = [
  { value: "instant", label: "Accès immédiat" },
  { value: "guided", label: "Guidé dans workspace" },
  { value: "document_required", label: "Document requis" },
];

export const SETUP_REQUIREMENT_OPTIONS: { value: SetupRequirementType; label: string }[] = [
  { value: "none", label: "Aucun setup" },
  { value: "context", label: "Contexte à préciser dans le workspace" },
  { value: "document", label: "Document à fournir dans le workspace" },
];

export const EXECUTION_MODE_OPTIONS: { value: ExecutionMode; label: string }[] = [
  { value: "guided_workspace", label: "Workspace guidé statique (sans IA)" },
  { value: "llm_prompt", label: "LLM Runner texte (OpenAI)" },
];

export const AGENT_RUNTIME_TYPE_LABELS: Record<AgentRuntimeType, string> = {
  static_guided: "Static guided",
  llm_prompt: "LLM Prompt",
  document_file: "Document / File",
  workflow_automation: "Workflow Automation",
  creator_endpoint: "Creator Endpoint",
};

export const DEFAULT_AGENT_CONTRACT: AgentContract = {
  workspaceMode: "instant",
  setupRequirements: {
    type: "none",
    items: [],
  },
  outputPromise: {
    summary: "",
    examples: [],
  },
  executionMode: "guided_workspace",
  runtimeType: "static_guided",
  dataPolicy: {
    stores_user_data: false,
    requires_files: false,
    external_tools: [],
  },
};

export function readLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isWorkspaceMode(value: string): value is WorkspaceMode {
  return value === "instant" || value === "guided" || value === "document_required";
}

export function isSetupRequirementType(value: string): value is SetupRequirementType {
  return value === "none" || value === "context" || value === "document";
}

export function isExecutionMode(value: string): value is ExecutionMode {
  return value === "guided_workspace" || value === "llm_prompt";
}

export function isAgentRuntimeType(value: string): value is AgentRuntimeType {
  return (
    value === "static_guided" ||
    value === "llm_prompt" ||
    value === "document_file" ||
    value === "workflow_automation" ||
    value === "creator_endpoint"
  );
}

export function buildSetupRequirements(type: SetupRequirementType, itemsText: string): SetupRequirements {
  return {
    type,
    items: type === "none" ? [] : readLines(itemsText),
  };
}

export function buildOutputPromise(summary: string, examplesText: string): OutputPromise {
  return {
    summary: summary.trim(),
    examples: readLines(examplesText),
  };
}

export function buildDataPolicy(workspaceMode: WorkspaceMode, executionMode: ExecutionMode = DEFAULT_AGENT_CONTRACT.executionMode): DataPolicy {
  return {
    stores_user_data: executionMode === "llm_prompt" || workspaceMode !== "instant",
    requires_files: workspaceMode === "document_required",
    external_tools: [],
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function normalizeAgentContract(input: {
  workspaceMode?: string | null;
  setupRequirements?: unknown;
  outputPromise?: unknown;
  executionMode?: string | null;
  runtimeType?: string | null;
  dataPolicy?: unknown;
}): AgentContract {
  const setup = asObject(input.setupRequirements);
  const output = asObject(input.outputPromise);
  const data = asObject(input.dataPolicy);
  const workspaceMode = input.workspaceMode && isWorkspaceMode(input.workspaceMode) ? input.workspaceMode : DEFAULT_AGENT_CONTRACT.workspaceMode;
  const executionMode = input.executionMode && isExecutionMode(input.executionMode) ? input.executionMode : DEFAULT_AGENT_CONTRACT.executionMode;
  const runtimeType =
    input.runtimeType && isAgentRuntimeType(input.runtimeType)
      ? input.runtimeType
      : executionMode === "llm_prompt"
        ? "llm_prompt"
        : "static_guided";
  const setupType = typeof setup.type === "string" && isSetupRequirementType(setup.type) ? setup.type : DEFAULT_AGENT_CONTRACT.setupRequirements.type;

  return {
    workspaceMode,
    setupRequirements: {
      type: setupType,
      items: asStringArray(setup.items),
    },
    outputPromise: {
      summary: typeof output.summary === "string" ? output.summary : "",
      examples: asStringArray(output.examples),
    },
    executionMode,
    runtimeType,
    dataPolicy: {
      stores_user_data: typeof data.stores_user_data === "boolean" ? data.stores_user_data : DEFAULT_AGENT_CONTRACT.dataPolicy.stores_user_data,
      requires_files: typeof data.requires_files === "boolean" ? data.requires_files : DEFAULT_AGENT_CONTRACT.dataPolicy.requires_files,
      external_tools: asStringArray(data.external_tools),
    },
  };
}
