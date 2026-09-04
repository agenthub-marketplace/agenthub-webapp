-- AgentHub Code workflow automation runtime beta.
--
-- Additive foundation for a controlled workflow runtime:
-- - creator allowlist for workflow_automation;
-- - reviewed creator webhook endpoints;
-- - version-bound workflow definitions;
-- - durable workflow queue and step trace;
-- - service-role RPC for atomic worker claiming.

create table if not exists public.creator_runtime_access (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  runtime_type text not null,
  enabled boolean not null default false,
  notes text,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_runtime_access_runtime_type_check check (
    runtime_type in ('workflow_automation')
  ),
  unique (creator_id, runtime_type)
);

drop trigger if exists creator_runtime_access_set_updated_at on public.creator_runtime_access;
create trigger creator_runtime_access_set_updated_at
before update on public.creator_runtime_access
for each row
execute function public.set_updated_at();

create table if not exists public.creator_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  name text not null,
  endpoint_url text not null,
  status text not null default 'submitted',
  verification_notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_webhook_endpoints_status_check check (
    status in ('submitted', 'approved', 'rejected', 'suspended')
  ),
  constraint creator_webhook_endpoints_url_check check (
    endpoint_url ~* '^https://'
    and endpoint_url !~* '^https://(localhost|127\.|10\.|169\.254\.|100\.64\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|198\.18\.|22[4-9]\.|23[0-9]\.|24[0-9]\.|25[0-5]\.|0\.0\.0\.0|\[::\]|\[::1\]|\[fe80:|\[fc|\[fd)'
  ),
  unique (creator_id, endpoint_url)
);

drop trigger if exists creator_webhook_endpoints_set_updated_at on public.creator_webhook_endpoints;
create trigger creator_webhook_endpoints_set_updated_at
before update on public.creator_webhook_endpoints
for each row
execute function public.set_updated_at();

create table if not exists public.agent_version_workflows (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid not null,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  status text not null default 'submitted',
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_version_workflows_status_check check (
    status in ('submitted', 'approved', 'rejected', 'suspended')
  ),
  constraint agent_version_workflows_definition_object_check check (jsonb_typeof(definition) = 'object'),
  unique (agent_version_id),
  foreign key (agent_id, agent_version_id)
    references public.agent_versions(agent_id, id)
    on delete cascade,
  foreign key (agent_id, creator_id)
    references public.agents(id, creator_id)
    on delete cascade
);

drop trigger if exists agent_version_workflows_set_updated_at on public.agent_version_workflows;
create trigger agent_version_workflows_set_updated_at
before update on public.agent_version_workflows
for each row
execute function public.set_updated_at();

create table if not exists public.agent_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null unique references public.agent_runs(id) on delete cascade,
  rental_request_id uuid not null references public.rental_requests(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  agent_version_id uuid not null references public.agent_versions(id) on delete restrict,
  workflow_id uuid not null references public.agent_version_workflows(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued',
  input_text text not null,
  final_output text,
  error_code text,
  current_step_index integer not null default 0,
  locked_by text,
  locked_until timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_workflow_runs_status_check check (
    status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')
  ),
  constraint agent_workflow_runs_input_text_check check (char_length(input_text) between 3 and 4000),
  constraint agent_workflow_runs_final_output_check check (final_output is null or char_length(final_output) <= 12000),
  constraint agent_workflow_runs_current_step_index_check check (current_step_index >= 0)
);

drop trigger if exists agent_workflow_runs_set_updated_at on public.agent_workflow_runs;
create trigger agent_workflow_runs_set_updated_at
before update on public.agent_workflow_runs
for each row
execute function public.set_updated_at();

create table if not exists public.agent_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.agent_workflow_runs(id) on delete cascade,
  step_index integer not null,
  step_key text not null,
  step_label text not null,
  step_type text not null,
  endpoint_id uuid references public.creator_webhook_endpoints(id) on delete restrict,
  status text not null default 'queued',
  input_snapshot jsonb,
  output_text text,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_workflow_steps_index_check check (step_index >= 0),
  constraint agent_workflow_steps_type_check check (step_type in ('llm_step', 'webhook_step')),
  constraint agent_workflow_steps_status_check check (
    status in ('queued', 'running', 'succeeded', 'failed', 'skipped')
  ),
  constraint agent_workflow_steps_output_check check (output_text is null or char_length(output_text) <= 12000),
  constraint agent_workflow_steps_webhook_endpoint_check check (
    (step_type = 'webhook_step' and endpoint_id is not null)
    or (step_type = 'llm_step' and endpoint_id is null)
  ),
  unique (workflow_run_id, step_index)
);

drop trigger if exists agent_workflow_steps_set_updated_at on public.agent_workflow_steps;
create trigger agent_workflow_steps_set_updated_at
before update on public.agent_workflow_steps
for each row
execute function public.set_updated_at();

create index if not exists creator_runtime_access_creator_idx
on public.creator_runtime_access(creator_id, runtime_type);

create index if not exists creator_webhook_endpoints_creator_idx
on public.creator_webhook_endpoints(creator_id, status);

create index if not exists agent_version_workflows_version_idx
on public.agent_version_workflows(agent_version_id, status);

create index if not exists agent_workflow_runs_user_created_idx
on public.agent_workflow_runs(user_id, created_at desc);

create index if not exists agent_workflow_runs_rental_created_idx
on public.agent_workflow_runs(rental_request_id, created_at desc);

create index if not exists agent_workflow_runs_status_lock_idx
on public.agent_workflow_runs(status, locked_until, created_at);

create unique index if not exists agent_workflow_runs_one_active_per_user_rental_idx
on public.agent_workflow_runs(user_id, rental_request_id)
where status in ('queued', 'running');

create index if not exists agent_workflow_steps_run_idx
on public.agent_workflow_steps(workflow_run_id, step_index);

alter table public.creator_runtime_access enable row level security;
alter table public.creator_webhook_endpoints enable row level security;
alter table public.agent_version_workflows enable row level security;
alter table public.agent_workflow_runs enable row level security;
alter table public.agent_workflow_steps enable row level security;

revoke all on public.creator_runtime_access from anon, authenticated;
revoke all on public.creator_webhook_endpoints from anon, authenticated;
revoke all on public.agent_version_workflows from anon, authenticated;
revoke all on public.agent_workflow_runs from anon, authenticated;
revoke all on public.agent_workflow_steps from anon, authenticated;

grant select on public.creator_runtime_access to authenticated;
grant select, insert, update on public.creator_webhook_endpoints to authenticated;
grant select, insert, update on public.agent_version_workflows to authenticated;
grant select (
  id,
  agent_run_id,
  rental_request_id,
  agent_id,
  agent_version_id,
  workflow_id,
  user_id,
  status,
  input_text,
  final_output,
  error_code,
  current_step_index,
  started_at,
  completed_at,
  created_at,
  updated_at
) on public.agent_workflow_runs to authenticated;
grant select (
  id,
  workflow_run_id,
  step_index,
  step_key,
  step_label,
  step_type,
  status,
  output_text,
  error_code,
  started_at,
  completed_at,
  created_at,
  updated_at
) on public.agent_workflow_steps to authenticated;

grant select, insert, update, delete on public.creator_runtime_access to service_role;
grant select, insert, update, delete on public.creator_webhook_endpoints to service_role;
grant select, insert, update, delete on public.agent_version_workflows to service_role;
grant select, insert, update, delete on public.agent_workflow_runs to service_role;
grant select, insert, update, delete on public.agent_workflow_steps to service_role;

drop policy if exists "Creators can read their workflow runtime access" on public.creator_runtime_access;
create policy "Creators can read their workflow runtime access"
on public.creator_runtime_access
for select
to authenticated
using (public.owns_creator_profile(creator_id));

drop policy if exists "Admins can manage creator runtime access" on public.creator_runtime_access;
create policy "Admins can manage creator runtime access"
on public.creator_runtime_access
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Creators can read their webhook endpoints" on public.creator_webhook_endpoints;
create policy "Creators can read their webhook endpoints"
on public.creator_webhook_endpoints
for select
to authenticated
using (public.owns_creator_profile(creator_id));

drop policy if exists "Creators can submit their webhook endpoints" on public.creator_webhook_endpoints;
create policy "Creators can submit their webhook endpoints"
on public.creator_webhook_endpoints
for insert
to authenticated
with check (
  public.owns_creator_profile(creator_id)
  and status = 'submitted'
  and exists (
    select 1
    from public.creator_runtime_access cra
    where cra.creator_id = creator_webhook_endpoints.creator_id
      and cra.runtime_type = 'workflow_automation'
      and cra.enabled = true
  )
);

drop policy if exists "Creators can update submitted webhook endpoints" on public.creator_webhook_endpoints;
create policy "Creators can update submitted webhook endpoints"
on public.creator_webhook_endpoints
for update
to authenticated
using (
  public.owns_creator_profile(creator_id)
  and status in ('submitted', 'rejected')
)
with check (
  public.owns_creator_profile(creator_id)
  and status = 'submitted'
);

drop policy if exists "Admins can manage webhook endpoints" on public.creator_webhook_endpoints;
create policy "Admins can manage webhook endpoints"
on public.creator_webhook_endpoints
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Creators can read their workflow definitions" on public.agent_version_workflows;
create policy "Creators can read their workflow definitions"
on public.agent_version_workflows
for select
to authenticated
using (public.owns_creator_profile(creator_id));

drop policy if exists "Creators can submit their workflow definitions" on public.agent_version_workflows;
create policy "Creators can submit their workflow definitions"
on public.agent_version_workflows
for insert
to authenticated
with check (
  public.owns_creator_profile(creator_id)
  and public.owns_agent(agent_id)
  and status = 'submitted'
  and exists (
    select 1
    from public.creator_runtime_access cra
    where cra.creator_id = agent_version_workflows.creator_id
      and cra.runtime_type = 'workflow_automation'
      and cra.enabled = true
  )
);

drop policy if exists "Creators can update submitted workflow definitions" on public.agent_version_workflows;
create policy "Creators can update submitted workflow definitions"
on public.agent_version_workflows
for update
to authenticated
using (
  public.owns_creator_profile(creator_id)
  and public.owns_agent(agent_id)
  and status in ('submitted', 'rejected')
)
with check (
  public.owns_creator_profile(creator_id)
  and public.owns_agent(agent_id)
  and status = 'submitted'
);

drop policy if exists "Admins can manage workflow definitions" on public.agent_version_workflows;
create policy "Admins can manage workflow definitions"
on public.agent_version_workflows
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read their own workflow runs" on public.agent_workflow_runs;
create policy "Users can read their own workflow runs"
on public.agent_workflow_runs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read workflow runs" on public.agent_workflow_runs;
create policy "Admins can read workflow runs"
on public.agent_workflow_runs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Users can read their own workflow steps" on public.agent_workflow_steps;
create policy "Users can read their own workflow steps"
on public.agent_workflow_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.agent_workflow_runs awr
    where awr.id = workflow_run_id
      and awr.user_id = auth.uid()
  )
);

drop policy if exists "Admins can read workflow steps" on public.agent_workflow_steps;
create policy "Admins can read workflow steps"
on public.agent_workflow_steps
for select
to authenticated
using (public.is_admin());

create or replace function public.claim_next_agent_workflow_run(
  p_worker_id text,
  p_lock_seconds integer default 120,
  p_agent_run_id uuid default null
)
returns table (
  id uuid,
  agent_run_id uuid,
  rental_request_id uuid,
  agent_id uuid,
  agent_version_id uuid,
  workflow_id uuid,
  user_id uuid,
  input_text text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidate as (
    select awr.id
    from public.agent_workflow_runs awr
    join public.agent_version_workflows avw on avw.id = awr.workflow_id
    join public.agent_runtime_settings ars on ars.runtime_type = 'workflow_automation'
    where awr.status in ('queued', 'running')
      and (awr.locked_until is null or awr.locked_until < now())
      and (p_agent_run_id is null or awr.agent_run_id = p_agent_run_id)
      and avw.status = 'approved'
      and ars.enabled = true
      and ars.run_enabled = true
    order by awr.created_at asc
    limit 1
    for update skip locked
  )
  update public.agent_workflow_runs awr
  set
    status = 'running',
    locked_by = coalesce(nullif(trim(p_worker_id), ''), 'agent-workflow-worker'),
    locked_until = now() + make_interval(secs => greatest(30, least(coalesce(p_lock_seconds, 120), 300))),
    started_at = coalesce(awr.started_at, now())
  from candidate
  where awr.id = candidate.id
  returning
    awr.id,
    awr.agent_run_id,
    awr.rental_request_id,
    awr.agent_id,
    awr.agent_version_id,
    awr.workflow_id,
    awr.user_id,
    awr.input_text;
end;
$$;

revoke all on function public.claim_next_agent_workflow_run(text, integer, uuid) from public, anon, authenticated;
grant execute on function public.claim_next_agent_workflow_run(text, integer, uuid) to service_role;
