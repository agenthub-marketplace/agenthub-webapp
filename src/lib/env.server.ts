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
};
