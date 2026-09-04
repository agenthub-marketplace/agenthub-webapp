-- Persisted security precheck artifacts for AgentHub Code admin triage.
--
-- The precheck is advisory: it never approves, rejects, publishes, calls
-- creator endpoints, or executes creator code. Admin review and security
-- review remain the official decision gates.

create table if not exists public.agent_security_prechecks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid not null references public.agent_versions(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  runtime_type text not null,
  related_security_review_id uuid references public.security_reviews(id) on delete set null,
  trigger text not null,
  status text not null default 'pending',
  risk_score integer not null default 0,
  risk_level_suggested text not null,
  security_review_required boolean not null default false,
  recommended_action text not null,
  summary text,
  manifest_snapshot jsonb not null,
  findings jsonb not null default '[]'::jsonb,
  admin_questions jsonb not null default '[]'::jsonb,
  model text,
  prompt_version text,
  error_code text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_security_prechecks_runtime_type_check check (
    runtime_type in ('static_guided', 'llm_prompt', 'document_file', 'workflow_automation', 'creator_endpoint')
  ),
  constraint agent_security_prechecks_trigger_check check (
    trigger in ('submission', 'resubmission', 'admin_manual', 'admin_retry', 'system_refresh')
  ),
  constraint agent_security_prechecks_status_check check (
    status in ('pending', 'running', 'passed', 'warning', 'failed', 'error', 'stale')
  ),
  constraint agent_security_prechecks_risk_level_check check (
    risk_level_suggested in ('low', 'medium', 'high', 'forbidden_beta', 'blocked')
  ),
  constraint agent_security_prechecks_recommended_action_check check (
    recommended_action in ('standard_review', 'request_changes', 'reject_candidate', 'require_security_review', 'manual_review', 'block_publication')
  ),
  constraint agent_security_prechecks_risk_score_range_check check (risk_score between 0 and 100),
  constraint agent_security_prechecks_manifest_object_check check (jsonb_typeof(manifest_snapshot) = 'object'),
  constraint agent_security_prechecks_findings_array_check check (jsonb_typeof(findings) = 'array'),
  constraint agent_security_prechecks_admin_questions_array_check check (jsonb_typeof(admin_questions) = 'array')
);

create index if not exists agent_security_prechecks_agent_version_idx
on public.agent_security_prechecks(agent_version_id, created_at desc);

create index if not exists agent_security_prechecks_agent_status_idx
on public.agent_security_prechecks(agent_id, status, created_at desc);

create index if not exists agent_security_prechecks_runtime_status_idx
on public.agent_security_prechecks(runtime_type, status, created_at desc);

create index if not exists agent_security_prechecks_security_review_idx
on public.agent_security_prechecks(related_security_review_id)
where related_security_review_id is not null;

alter table public.agent_security_prechecks enable row level security;

revoke all on public.agent_security_prechecks from anon, authenticated;

grant select, insert, update on public.agent_security_prechecks to authenticated;
grant select, insert, update, delete on public.agent_security_prechecks to service_role;

drop policy if exists "Admins can read security prechecks" on public.agent_security_prechecks;
create policy "Admins can read security prechecks"
on public.agent_security_prechecks
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create security prechecks" on public.agent_security_prechecks;
create policy "Admins can create security prechecks"
on public.agent_security_prechecks
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update security prechecks" on public.agent_security_prechecks;
create policy "Admins can update security prechecks"
on public.agent_security_prechecks
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
