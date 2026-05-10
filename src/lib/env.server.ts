import "server-only";

type ServerEnv = {
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

export const serverEnv: ServerEnv = {
  supabaseServiceRoleKey: readOptional("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: readOptional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: readOptional("STRIPE_WEBHOOK_SECRET"),
  stripeConnectClientId: readOptional("STRIPE_CONNECT_CLIENT_ID"),
  agentGatewaySecret: readOptional("AGENT_GATEWAY_SECRET"),
  agentWebhookSecret: readOptional("AGENT_WEBHOOK_SECRET"),
};
