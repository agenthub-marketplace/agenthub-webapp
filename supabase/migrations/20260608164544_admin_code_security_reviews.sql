-- AgentHub Code admin security review foundation.
--
-- Manual review gate for sensitive runtimes. Codex Security findings can be
-- stored later, but an admin/reviewer decision remains the source of truth.

create table if not exists public.security_reviews (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_id uuid not null,
  runtime_type text not null,
  agent_id uuid references public.agents(id) on delete cascade,
  agent_version_id uuid references public.agent_versions(id) on delete cascade,
  workflow_id uuid references public.agent_version_workflows(id) on delete set null,
  creator_endpoint_config_id uuid references public.agent_version_creator_endpoints(id) on delete set null,
  creator_api_endpoint_id uuid references public.creator_api_endpoints(id) on delete set null,
  status text not null default 'pending',
  checklist jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_reviews_asset_type_check check (
    asset_type in ('agent_version', 'workflow_asset', 'creator_endpoint', 'code_package')
  ),
  constraint security_reviews_runtime_type_check check (
    runtime_type in ('document_file', 'workflow_automation', 'creator_endpoint', 'code_package')
  ),
  constraint security_reviews_status_check check (
    status in ('pending', 'in_review', 'passed', 'failed', 'waived')
  ),
  constraint security_reviews_checklist_object_check check (jsonb_typeof(checklist) = 'object'),
  constraint security_reviews_findings_array_check check (jsonb_typeof(findings) = 'array')
);

drop trigger if exists security_reviews_set_updated_at on public.security_reviews;
create trigger security_reviews_set_updated_at
before update on public.security_reviews
for each row
execute function public.set_updated_at();

create index if not exists security_reviews_agent_version_idx
on public.security_reviews(agent_version_id, runtime_type, status, created_at desc);

create index if not exists security_reviews_asset_idx
on public.security_reviews(asset_type, asset_id, created_at desc);

create index if not exists security_reviews_status_idx
on public.security_reviews(status, created_at desc);

alter table public.security_reviews enable row level security;

revoke all on public.security_reviews from anon, authenticated;

grant select, insert, update on public.security_reviews to authenticated;
grant select, insert, update, delete on public.security_reviews to service_role;

drop policy if exists "Admins can read security reviews" on public.security_reviews;
create policy "Admins can read security reviews"
on public.security_reviews
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create security reviews" on public.security_reviews;
create policy "Admins can create security reviews"
on public.security_reviews
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update security reviews" on public.security_reviews;
create policy "Admins can update security reviews"
on public.security_reviews
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
