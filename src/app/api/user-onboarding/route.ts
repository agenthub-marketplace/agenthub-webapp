import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  GUIDANCE_LEVELS,
  HELP_TYPES,
  MAIN_DOMAINS,
  PREFERRED_LANGUAGES,
  PREFERRED_OUTPUTS,
  PRIMARY_GOALS,
  type GuidanceLevel,
  type HelpType,
  type MainDomain,
  type PreferredLanguage,
  type PreferredOutput,
  type PrimaryGoal,
} from "@/lib/onboarding/constants";
import { getRecommendationTags } from "@/lib/onboarding/recommendations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OnboardingRow = {
  primary_goal: PrimaryGoal | null;
  main_domain: MainDomain | null;
  preferred_help_types: HelpType[] | null;
  preferred_outputs: PreferredOutput[] | null;
  guidance_level: GuidanceLevel | null;
  preferred_language: PreferredLanguage | null;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  tutorial_completed_at: string | null;
  tutorial_skipped_at: string | null;
};

const primaryGoalValues = new Set(PRIMARY_GOALS.map((option) => option.value));
const mainDomainValues = new Set(MAIN_DOMAINS.map((option) => option.value));
const helpTypeValues = new Set(HELP_TYPES.map((option) => option.value));
const outputValues = new Set(PREFERRED_OUTPUTS.map((option) => option.value));
const guidanceLevelValues = new Set(GUIDANCE_LEVELS.map((option) => option.value));
const languageValues = new Set(PREFERRED_LANGUAGES.map((option) => option.value));

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
  );
}

function mapRow(row: OnboardingRow | null) {
  if (!row) {
    return null;
  }

  return {
    primaryGoal: row.primary_goal,
    mainDomain: row.main_domain,
    preferredHelpTypes: row.preferred_help_types ?? [],
    preferredOutputs: row.preferred_outputs ?? [],
    guidanceLevel: row.guidance_level,
    preferredLanguage: row.preferred_language,
    onboardingCompletedAt: row.onboarding_completed_at,
    onboardingSkippedAt: row.onboarding_skipped_at,
    tutorialCompletedAt: row.tutorial_completed_at,
    tutorialSkippedAt: row.tutorial_skipped_at,
  };
}

async function getContext() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { profile: null, supabase: null };
  }

  const supabase = await createSupabaseServerClient();
  return { profile, supabase };
}

async function getOwnOnboardingRow(userId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { data: null, error: null };
  }

  return supabase
    .from("user_onboarding_profiles")
    .select(
      "primary_goal,main_domain,preferred_help_types,preferred_outputs,guidance_level,preferred_language,onboarding_completed_at,onboarding_skipped_at,tutorial_completed_at,tutorial_skipped_at"
    )
    .eq("user_id", userId)
    .maybeSingle<OnboardingRow>();
}

async function writeOwnOnboardingRow(
  userId: string,
  values: Record<string, unknown>
) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: { message: "missing-supabase-config" } };
  }

  const existing = await supabase
    .from("user_onboarding_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) {
    return { error: existing.error };
  }

  if (existing.data) {
    return supabase
      .from("user_onboarding_profiles")
      .update(values)
      .eq("user_id", userId);
  }

  const inserted = await supabase
    .from("user_onboarding_profiles")
    .insert({
      user_id: userId,
      ...values,
    });

  if (isDuplicateKeyError(inserted.error)) {
    return supabase
      .from("user_onboarding_profiles")
      .update(values)
      .eq("user_id", userId);
  }

  return inserted;
}

function isValidSingle<T extends string>(value: unknown, allowed: Set<T>): value is T {
  return typeof value === "string" && allowed.has(value as T);
}

function isValidArray<T extends string>(value: unknown, allowed: Set<T>, maxItems = 8): value is T[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isValidSingle(item, allowed));
}

function validatePayload(payload: Record<string, unknown>) {
  if (!isValidSingle(payload.primaryGoal, primaryGoalValues)) {
    return { error: "invalid-primary-goal" };
  }

  if (!isValidSingle(payload.mainDomain, mainDomainValues)) {
    return { error: "invalid-main-domain" };
  }

  if (!isValidArray(payload.preferredHelpTypes, helpTypeValues)) {
    return { error: "invalid-help-types" };
  }

  if (!isValidArray(payload.preferredOutputs, outputValues)) {
    return { error: "invalid-preferred-outputs" };
  }

  if (!isValidSingle(payload.guidanceLevel, guidanceLevelValues)) {
    return { error: "invalid-guidance-level" };
  }

  if (!isValidSingle(payload.preferredLanguage, languageValues)) {
    return { error: "invalid-preferred-language" };
  }

  return {
    data: {
      primary_goal: payload.primaryGoal,
      main_domain: payload.mainDomain,
      preferred_help_types: payload.preferredHelpTypes,
      preferred_outputs: payload.preferredOutputs,
      guidance_level: payload.guidanceLevel,
      preferred_language: payload.preferredLanguage,
    },
  };
}

export async function GET() {
  const { profile } = await getContext();

  if (!profile || profile.role !== "user") {
    return json({
      authenticated: Boolean(profile),
      eligible: false,
      profile: null,
      recommendationTags: [],
      shouldShowModal: false,
    });
  }

  const { data, error } = await getOwnOnboardingRow(profile.id);

  if (error) {
    return json({ error: "onboarding-load-failed" }, 500);
  }

  const onboarding = mapRow(data);
  const shouldShowModal = !onboarding?.onboardingCompletedAt && !onboarding?.onboardingSkippedAt;

  return json({
    authenticated: true,
    eligible: true,
    profile: onboarding,
    recommendationTags: getRecommendationTags(onboarding ?? {}),
    shouldShowModal,
  });
}

export async function POST(request: Request) {
  const { profile, supabase } = await getContext();

  if (!profile) {
    return json({ error: "unauthenticated" }, 401);
  }

  if (profile.role !== "user") {
    return json({ error: "not-eligible" }, 403);
  }

  if (!supabase) {
    return json({ error: "missing-supabase-config" }, 500);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  if (action === "save_profile") {
    const validation = validatePayload(body ?? {});

    if ("error" in validation) {
      return json({ error: validation.error }, 400);
    }

    const completedAt = new Date().toISOString();
    const { error } = await writeOwnOnboardingRow(
      profile.id,
      {
        ...validation.data,
        onboarding_completed_at: completedAt,
      }
    );

    if (error) {
      console.error("Failed to save user onboarding profile", error);
      return json({ error: "onboarding-save-failed" }, 500);
    }

    const mappedProfile = {
      primaryGoal: validation.data.primary_goal,
      mainDomain: validation.data.main_domain,
      preferredHelpTypes: validation.data.preferred_help_types,
      preferredOutputs: validation.data.preferred_outputs,
      guidanceLevel: validation.data.guidance_level,
      preferredLanguage: validation.data.preferred_language,
      onboardingCompletedAt: completedAt,
      onboardingSkippedAt: null,
      tutorialCompletedAt: null,
      tutorialSkippedAt: null,
    };

    return json({
      ok: true,
      recommendationTags: getRecommendationTags(mappedProfile),
    });
  }

  if (action === "skip_onboarding" || action === "complete_tutorial" || action === "skip_tutorial") {
    const column =
      action === "skip_onboarding"
        ? "onboarding_skipped_at"
        : action === "complete_tutorial"
          ? "tutorial_completed_at"
          : "tutorial_skipped_at";

    const { error } = await writeOwnOnboardingRow(
      profile.id,
      {
        [column]: new Date().toISOString(),
      }
    );

    if (error) {
      console.error("Failed to update user onboarding profile", error);
      return json({ error: "onboarding-update-failed" }, 500);
    }

    return json({ ok: true });
  }

  return json({ error: "unknown-action" }, 400);
}
