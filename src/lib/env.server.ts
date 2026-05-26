import "server-only";

type ServerEnv = {
  accessMode: "free_beta" | "paid";
  enableFreeBetaAccess: boolean;
  paymentsProvider: "none" | "stripe";
  paymentsConfigError?: string;
  supabaseServiceRoleKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeConnectClientId?: string;
  agentGatewaySecret?: string;
  agentWebhookSecret?: string;
};

const readOptional = (key: string) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

const readBoolean = (key: string) => {
  const value = process.env[key]?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
};

const rawAccessMode = process.env.ACCESS_MODE?.trim().toLowerCase();
const hasExplicitAccessMode = rawAccessMode === "free_beta" || rawAccessMode === "paid";
const rawPaymentsProvider = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();
const hasExplicitPaymentsProvider = rawPaymentsProvider === "none" || rawPaymentsProvider === "stripe";

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

  if (accessMode === "paid" && (!readOptional("STRIPE_SECRET_KEY") || !readOptional("STRIPE_WEBHOOK_SECRET"))) {
    return "stripe-env-missing";
  }

  return undefined;
}

export const serverEnv: ServerEnv = {
  accessMode,
  enableFreeBetaAccess: readBoolean("ENABLE_FREE_BETA_ACCESS"),
  paymentsProvider,
  paymentsConfigError: validatePaymentsConfig(),
  supabaseServiceRoleKey: readOptional("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: readOptional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: readOptional("STRIPE_WEBHOOK_SECRET"),
  stripeConnectClientId: readOptional("STRIPE_CONNECT_CLIENT_ID"),
  agentGatewaySecret: readOptional("AGENT_GATEWAY_SECRET"),
  agentWebhookSecret: readOptional("AGENT_WEBHOOK_SECRET"),
};
