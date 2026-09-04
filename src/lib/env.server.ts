import "server-only";

type ServerEnv = {
  accessMode: "free_beta" | "paid";
  enableFreeBetaAccess: boolean;
  paymentsProvider: "none" | "stripe";
  stripeMode: "test" | "live";
  paymentsConfigError?: string;
  supabaseServiceRoleKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeConnectClientId?: string;
  agentGatewaySecret?: string;
  agentWebhookSecret?: string;
  llmRunsEnabled: boolean;
  openaiApiKey?: string;
  openaiModel: string;
  llmRunMaxInputChars: number;
  llmRunMaxOutputTokens: number;
  llmRunsPerRentalPerDay: number;
  llmRunsPerUserPerDay: number;
  documentRunsEnabled: boolean;
  documentMaxFileBytes: number;
  documentMaxExtractedChars: number;
  documentFileRetentionDays: number;
  documentAllowedMimeTypes: string[];
  workflowRunsEnabled: boolean;
  workflowWorkerSecret?: string;
  workflowWebhookSigningSecret?: string;
  workflowMaxSteps: number;
  workflowMaxWebhookSteps: number;
  workflowStepTimeoutMs: number;
  workflowRunsPerRentalPerDay: number;
  workflowRunsPerUserPerDay: number;
  creatorEndpointRunsEnabled: boolean;
  creatorEndpointSigningSecret?: string;
  creatorEndpointTimeoutMs: number;
  creatorEndpointMaxResponseChars: number;
  creatorEndpointRunsPerRentalPerDay: number;
  creatorEndpointRunsPerUserPerDay: number;
};

const readOptional = (key: string) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

const readBoolean = (key: string) => {
  const value = process.env[key]?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
};

const readInteger = (key: string, fallback: number, { max, min }: { max: number; min: number }) => {
  const value = Number.parseInt(process.env[key] ?? "", 10);

  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

const rawAccessMode = process.env.ACCESS_MODE?.trim().toLowerCase();
const hasExplicitAccessMode = rawAccessMode === "free_beta" || rawAccessMode === "paid";
const rawPaymentsProvider = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();
const hasExplicitPaymentsProvider = rawPaymentsProvider === "none" || rawPaymentsProvider === "stripe";
const rawStripeMode = process.env.STRIPE_MODE?.trim().toLowerCase();
const hasExplicitStripeMode = rawStripeMode === "test" || rawStripeMode === "live";

const readAccessMode = () => {
  if (hasExplicitAccessMode) {
    return rawAccessMode;
  }

  if (readBoolean("ENABLE_FREE_BETA_ACCESS")) {
    return "free_beta";
  }

  return readOptional("STRIPE_SECRET_KEY") ? "paid" : "free_beta";
};

const readPaymentsProvider = (accessMode: "free_beta" | "paid") => {
  if (hasExplicitPaymentsProvider) {
    return rawPaymentsProvider as "none" | "stripe";
  }

  return accessMode === "paid" ? "stripe" : "none";
};

const accessMode = readAccessMode();
const paymentsProvider = readPaymentsProvider(accessMode);
const stripeMode = hasExplicitStripeMode ? rawStripeMode : "test";

function validatePaymentsConfig() {
  if (rawAccessMode && !hasExplicitAccessMode) {
    return "access-mode-invalid";
  }

  if (!hasExplicitAccessMode && !readBoolean("ENABLE_FREE_BETA_ACCESS") && !readOptional("STRIPE_SECRET_KEY")) {
    return "access-mode-missing";
  }

  if (accessMode === "free_beta" && paymentsProvider !== "none") {
    return "free-beta-provider-mismatch";
  }

  if (accessMode === "paid" && paymentsProvider !== "stripe") {
    return "paid-provider-mismatch";
  }

  if (rawPaymentsProvider && !hasExplicitPaymentsProvider) {
    return "payments-provider-invalid";
  }

  if (rawStripeMode && !hasExplicitStripeMode) {
    return "stripe-mode-invalid";
  }

  if (accessMode === "paid" && (!readOptional("STRIPE_SECRET_KEY") || !readOptional("STRIPE_WEBHOOK_SECRET"))) {
    return "stripe-env-missing";
  }

  if (accessMode === "paid" && stripeMode === "test" && !readOptional("STRIPE_SECRET_KEY")?.startsWith("sk_test_")) {
    return "stripe-test-key-required";
  }

  return undefined;
}

export const serverEnv: ServerEnv = {
  accessMode,
  enableFreeBetaAccess: readBoolean("ENABLE_FREE_BETA_ACCESS"),
  paymentsProvider,
  stripeMode,
  paymentsConfigError: validatePaymentsConfig(),
  supabaseServiceRoleKey: readOptional("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: readOptional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: readOptional("STRIPE_WEBHOOK_SECRET"),
  stripeConnectClientId: readOptional("STRIPE_CONNECT_CLIENT_ID"),
  agentGatewaySecret: readOptional("AGENT_GATEWAY_SECRET"),
  agentWebhookSecret: readOptional("AGENT_WEBHOOK_SECRET"),
  llmRunsEnabled: readBoolean("LLM_RUNS_ENABLED"),
  openaiApiKey: readOptional("OPENAI_API_KEY"),
  openaiModel: readOptional("OPENAI_MODEL") ?? "gpt-5.4-mini",
  llmRunMaxInputChars: readInteger("LLM_RUN_MAX_INPUT_CHARS", 4000, { min: 3, max: 4000 }),
  llmRunMaxOutputTokens: readInteger("LLM_RUN_MAX_OUTPUT_TOKENS", 900, { min: 128, max: 2000 }),
  llmRunsPerRentalPerDay: readInteger("LLM_RUNS_PER_RENTAL_PER_DAY", 10, { min: 1, max: 100 }),
  llmRunsPerUserPerDay: readInteger("LLM_RUNS_PER_USER_PER_DAY", 30, { min: 1, max: 300 }),
  documentRunsEnabled: readBoolean("DOCUMENT_RUNS_ENABLED"),
  documentMaxFileBytes: readInteger("DOCUMENT_MAX_FILE_BYTES", 3_500_000, { min: 1, max: 3_500_000 }),
  documentMaxExtractedChars: readInteger("DOCUMENT_MAX_EXTRACTED_CHARS", 30_000, { min: 1_000, max: 30_000 }),
  documentFileRetentionDays: readInteger("DOCUMENT_FILE_RETENTION_DAYS", 7, { min: 1, max: 30 }),
  documentAllowedMimeTypes: (
    readOptional("DOCUMENT_ALLOWED_MIME_TYPES") ??
    "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  workflowRunsEnabled: readBoolean("WORKFLOW_RUNS_ENABLED"),
  workflowWorkerSecret: readOptional("WORKFLOW_WORKER_SECRET"),
  workflowWebhookSigningSecret: readOptional("WORKFLOW_WEBHOOK_SIGNING_SECRET"),
  workflowMaxSteps: readInteger("WORKFLOW_MAX_STEPS", 5, { min: 2, max: 5 }),
  workflowMaxWebhookSteps: readInteger("WORKFLOW_MAX_WEBHOOK_STEPS", 2, { min: 0, max: 2 }),
  workflowStepTimeoutMs: readInteger("WORKFLOW_STEP_TIMEOUT_MS", 15_000, { min: 1_000, max: 15_000 }),
  workflowRunsPerRentalPerDay: readInteger("WORKFLOW_RUNS_PER_RENTAL_PER_DAY", 5, { min: 1, max: 50 }),
  workflowRunsPerUserPerDay: readInteger("WORKFLOW_RUNS_PER_USER_PER_DAY", 15, { min: 1, max: 100 }),
  creatorEndpointRunsEnabled: readBoolean("CREATOR_ENDPOINT_RUNS_ENABLED"),
  creatorEndpointSigningSecret: readOptional("CREATOR_ENDPOINT_SIGNING_SECRET"),
  creatorEndpointTimeoutMs: readInteger("CREATOR_ENDPOINT_TIMEOUT_MS", 15_000, { min: 1_000, max: 15_000 }),
  creatorEndpointMaxResponseChars: readInteger("CREATOR_ENDPOINT_MAX_RESPONSE_CHARS", 12_000, { min: 1_000, max: 12_000 }),
  creatorEndpointRunsPerRentalPerDay: readInteger("CREATOR_ENDPOINT_RUNS_PER_RENTAL_PER_DAY", 5, { min: 1, max: 50 }),
  creatorEndpointRunsPerUserPerDay: readInteger("CREATOR_ENDPOINT_RUNS_PER_USER_PER_DAY", 15, { min: 1, max: 100 }),
};
