-- AgentHub Code creator_endpoint runtime beta.
--
-- Additive foundation for a controlled creator API endpoint runtime:
-- - creator allowlist for creator_endpoint;
-- - reviewed creator API endpoints;
-- - version-bound endpoint configuration;
-- - endpoint run trace linked to agent_runs.
--
-- The runtime remains disabled by default in agent_runtime_settings.

alter table public.creator_runtime_access
drop constraint if exists creator_runtime_access_runtime_type_check;

alter table public.creator_runtime_access
add constraint creator_runtime_access_runtime_type_check check (
  runtime_type in ('workflow_automation', 'creator_endpoint')
);

insert into public.agent_runtime_settings (runtime_type, enabled, creator_visible, run_enabled, description)
values (
  'creator_endpoint',
  false,
  false,
  false,
  'controlled creator API endpoint runtime; disabled by default'
)
on conflict (runtime_type) do update
set
  enabled = excluded.enabled,
  creator_visible = excluded.creator_visible,
  run_enabled = excluded.run_enabled,
  description = excluded.description,
  updated_at = now();

create table if not exists public.creator_api_endpoints (
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
  constraint creator_api_endpoints_status_check check (
    status in ('submitted', 'approved', 'rejected', 'suspended')
  ),
  constraint creator_api_endpoints_url_check check (
    endpoint_url ~* '^https://'
    and endpoint_url !~* '^https://(localhost|127\.|10\.|169\.254\.|100\.64\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|198\.18\.|22[4-9]\.|23[0-9]\.|24[0-9]\.|25[0-5]\.|0\.0\.0\.0|\[::\]|\[::1\]|\[fe80:|\[fc|\[fd)'
  ),
  unique (creator_id, endpoint_url)
);

drop trigger if exists creator_api_endpoints_set_updated_at on public.creator_api_endpoints;
create trigger creator_api_endpoints_set_updated_at
before update on public.creator_api_endpoints
for each row
execute function public.set_updated_at();

create table if not exists public.agent_version_creator_endpoints (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid not null,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  endpoint_id uuid not null references public.creator_api_endpoints(id) on delete restrict,
  status text not null default 'submitted',
  request_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_version_creator_endpoints_status_check check (
    status in ('submitted', 'approved', 'rejected', 'suspended')
  ),
  constraint agent_version_creator_endpoints_request_schema_check check (jsonb_typeof(request_schema) = 'object'),
  unique (agent_version_id),
  foreign key (agent_id, agent_version_id)
    references public.agent_versions(agent_id, id)
    on delete cascade,
  foreign key (agent_id, creator_id)
    references public.agents(id, creator_id)
    on delete cascade
);

drop trigger if exists agent_version_creator_endpoints_set_updated_at on public.agent_version_creator_endpoints;
create trigger agent_version_creator_endpoints_set_updated_at
before update on public.agent_version_creator_endpoints
for each row
execute function public.set_updated_at();

create table if not exists public.agent_endpoint_runs (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null unique references public.agent_runs(id) on delete cascade,
  rental_request_id uuid not null references public.rental_requests(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  agent_version_id uuid not null references public.agent_versions(id) on delete restrict,
  endpoint_config_id uuid not null references public.agent_version_creator_endpoints(id) on delete restrict,
  endpoint_id uuid not null references public.creator_api_endpoints(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'running',
  request_snapshot jsonb not null default '{}'::jsonb,
  response_excerpt text,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_endpoint_runs_status_check check (
    status in ('running', 'succeeded', 'failed', 'cancelled')
  ),
  constraint agent_endpoint_runs_response_excerpt_check check (
    response_excerpt is null or char_length(response_excerpt) <= 12000
  ),
  constraint agent_endpoint_runs_request_snapshot_check check (jsonb_typeof(request_snapshot) = 'object')
);

drop trigger if exists agent_endpoint_runs_set_updated_at on public.agent_endpoint_runs;
create trigger agent_endpoint_runs_set_updated_at
before update on public.agent_endpoint_runs
for each row
execute function public.set_updated_at();

create index if not exists creator_api_endpoints_creator_idx
on public.creator_api_endpoints(creator_id, status);

create index if not exists agent_version_creator_endpoints_version_idx
on public.agent_version_creator_endpoints(agent_version_id, status);

create index if not exists agent_endpoint_runs_user_created_idx
on public.agent_endpoint_runs(user_id, created_at desc);

create index if not exists agent_endpoint_runs_rental_created_idx
on public.agent_endpoint_runs(rental_request_id, created_at desc);

create unique index if not exists agent_endpoint_runs_one_active_per_user_rental_idx
on public.agent_endpoint_runs(user_id, rental_request_id)
where status = 'running';

alter table public.creator_api_endpoints enable row level security;
alter table public.agent_version_creator_endpoints enable row level security;
alter table public.agent_endpoint_runs enable row level security;

revoke all on public.creator_api_endpoints from anon, authenticated;
revoke all on public.agent_version_creator_endpoints from anon, authenticated;
revoke all on public.agent_endpoint_runs from anon, authenticated;

grant select, insert, update on public.creator_api_endpoints to authenticated;
grant select, insert, update on public.agent_version_creator_endpoints to authenticated;
grant select (
  id,
  agent_run_id,
  rental_request_id,
  agent_id,
  agent_version_id,
  endpoint_config_id,
  endpoint_id,
  user_id,
  status,
  response_excerpt,
  error_code,
  started_at,
  completed_at,
  created_at,
  updated_at
) on public.agent_endpoint_runs to authenticated;

grant select, insert, update, delete on public.creator_api_endpoints to service_role;
grant select, insert, update, delete on public.agent_version_creator_endpoints to service_role;
grant select, insert, update, delete on public.agent_endpoint_runs to service_role;

drop policy if exists "Creators can read their API endpoints" on public.creator_api_endpoints;
create policy "Creators can read their API endpoints"
on public.creator_api_endpoints
for select
to authenticated
using (public.owns_creator_profile(creator_id));

drop policy if exists "Creators can submit their API endpoints" on public.creator_api_endpoints;
create policy "Creators can submit their API endpoints"
on public.creator_api_endpoints
for insert
to authenticated
with check (
  public.owns_creator_profile(creator_id)
  and status = 'submitted'
  and exists (
    select 1
    from public.creator_runtime_access cra
    where cra.creator_id = creator_api_endpoints.creator_id
      and cra.runtime_type = 'creator_endpoint'
      and cra.enabled = true
  )
);

drop policy if exists "Creators can update submitted API endpoints" on public.creator_api_endpoints;
create policy "Creators can update submitted API endpoints"
on public.creator_api_endpoints
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

drop policy if exists "Admins can manage API endpoints" on public.creator_api_endpoints;
create policy "Admins can manage API endpoints"
on public.creator_api_endpoints
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Creators can read their endpoint configs" on public.agent_version_creator_endpoints;
create policy "Creators can read their endpoint configs"
on public.agent_version_creator_endpoints
for select
to authenticated
using (public.owns_creator_profile(creator_id));

drop policy if exists "Creators can submit their endpoint configs" on public.agent_version_creator_endpoints;
create policy "Creators can submit their endpoint configs"
on public.agent_version_creator_endpoints
for insert
to authenticated
with check (
  public.owns_creator_profile(creator_id)
  and public.owns_agent(agent_id)
  and status = 'submitted'
  and exists (
    select 1
    from public.creator_runtime_access cra
    where cra.creator_id = agent_version_creator_endpoints.creator_id
      and cra.runtime_type = 'creator_endpoint'
      and cra.enabled = true
  )
);

drop policy if exists "Creators can update submitted endpoint configs" on public.agent_version_creator_endpoints;
create policy "Creators can update submitted endpoint configs"
on public.agent_version_creator_endpoints
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

drop policy if exists "Admins can manage endpoint configs" on public.agent_version_creator_endpoints;
create policy "Admins can manage endpoint configs"
on public.agent_version_creator_endpoints
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read their own endpoint runs" on public.agent_endpoint_runs;
create policy "Users can read their own endpoint runs"
on public.agent_endpoint_runs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read endpoint runs" on public.agent_endpoint_runs;
create policy "Admins can read endpoint runs"
on public.agent_endpoint_runs
for select
to authenticated
using (public.is_admin());
