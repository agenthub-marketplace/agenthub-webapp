"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AgentRentalRow = {
  id: string;
  creator_id: string;
  slug: string;
  status: "approved" | string;
  pricing_type: "task" | "project";
  starting_price_cents: number | null;
  currency: string;
};

function redirectWithAgentError(locale: Locale, slug: string, error: string): never {
  redirect(`${localizedPath(`/agents/${slug}`, locale)}?error=${encodeURIComponent(error)}`);
}

export async function createBetaRentalAction(locale: Locale, formData: FormData) {
  const profile = await requireAuth(locale);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(localizedPath("/auth/login", locale));
  }

  const agentId = formData.get("agent_id");
  const slug = formData.get("slug");

  if (typeof agentId !== "string" || typeof slug !== "string" || !agentId || !slug) {
    redirect(localizedPath("/search", locale));
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,creator_id,slug,status,pricing_type,starting_price_cents,currency")
    .eq("id", agentId)
    .eq("status", "approved")
    .maybeSingle<AgentRentalRow>();

  if (agentError) {
    redirectWithAgentError(locale, slug, "agent-load-failed");
  }

  if (!agent) {
    redirectWithAgentError(locale, slug, "agent-unavailable");
  }

  const { error: insertError } = await supabase.from("rental_requests").insert({
    agent_id: agent.id,
    user_id: profile.id,
    creator_id: agent.creator_id,
    status: "pending",
    pricing_type: agent.pricing_type,
    quoted_price_cents: agent.starting_price_cents,
    currency: agent.currency,
    request_brief: "Beta rental created without payment. Stripe checkout will replace this step later.",
    required_inputs: {},
  });

  if (insertError) {
    redirectWithAgentError(locale, slug, "rental-create-failed");
  }

  revalidatePath(localizedPath("/dashboard", locale));
  redirect(`${localizedPath("/dashboard", locale)}?rental=created`);
}
