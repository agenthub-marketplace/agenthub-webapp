"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/session";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorProfileForUser } from "@/server/agents/creator-agents";

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
  return createAgentAccessAction(locale, formData);
}

export async function createAgentAccessAction(locale: Locale, formData: FormData) {
  const agentId = formData.get("agent_id");
  const slug = formData.get("slug");

  if (typeof agentId !== "string" || typeof slug !== "string" || !agentId || !slug) {
    redirect(localizedPath("/marketplace", locale));
  }

  const agentPath = localizedPath(`/agents/${slug}`, locale);
  const profile = await requireAuth(locale, agentPath);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(`${localizedPath("/auth/login", locale)}?next=${encodeURIComponent(agentPath)}&error=missing-config`);
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

  if (typeof agent.starting_price_cents !== "number" || agent.starting_price_cents <= 0) {
    redirectWithAgentError(locale, slug, "price-not-configured");
  }

  const creatorProfile = await getCreatorProfileForUser();

  if (!creatorProfile.error && !creatorProfile.creatorProfileMissing && creatorProfile.id === agent.creator_id) {
    redirectWithAgentError(locale, slug, "self-rental-not-allowed");
  }

  const { data: access, error: insertError } = await supabase
    .from("rental_requests")
    .insert({
      agent_id: agent.id,
      user_id: profile.id,
      creator_id: agent.creator_id,
      status: "active",
      pricing_type: agent.pricing_type,
      quoted_price_cents: agent.starting_price_cents,
      currency: agent.currency,
      request_brief: `Direct AgentHub access activated for ${agent.slug}.`,
      required_inputs: {
        access_type: "direct_agent_access",
        pricing_type: agent.pricing_type,
      },
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (insertError || !access) {
    redirectWithAgentError(locale, slug, "rental-create-failed");
  }

  revalidatePath(localizedPath("/dashboard", locale));
  revalidatePath(localizedPath("/workspace", locale));
  redirect(`${localizedPath(`/workspace/${access.id}`, locale)}?access=created`);
}
