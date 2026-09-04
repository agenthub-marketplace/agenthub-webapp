-- AgentHub Code runtime type foundation.
--
-- Non-destructive:
-- - keep execution_mode for existing LLM runner compatibility;
-- - add runtime_type as the product-level runtime routing field;
-- - add internal runtime settings for progressive activation.

alter table public.agent_versions
add column if not exists runtime_type text;

update public.agent_versions
set runtime_type = case
  when execution_mode = 'llm_prompt' then 'llm_prompt'
  when execution_mode = 'guided_workspace' then 'static_guided'
  else 'static_guided'
end
where runtime_type is null;

alter table public.agent_versions
alter column runtime_type set default 'llm_prompt';

alter table public.agent_versions
alter column runtime_type set not null;

alter table public.agent_versions
drop constraint if exists agent_versions_runtime_type_check,
add constraint agent_versions_runtime_type_check
  check (runtime_type in ('static_guided', 'llm_prompt', 'document_file', 'workflow_automation', 'creator_endpoint'));

grant select (runtime_type) on public.agent_versions to anon, authenticated;

create table if not exists public.agent_runtime_settings (
  runtime_type text primary key,
  enabled boolean not null default false,
  creator_visible boolean not null default false,
  run_enabled boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_runtime_settings_runtime_type_check check (
    runtime_type in ('static_guided', 'llm_prompt', 'document_file', 'workflow_automation', 'creator_endpoint')
  )
);

drop trigger if exists agent_runtime_settings_set_updated_at on public.agent_runtime_settings;
create trigger agent_runtime_settings_set_updated_at
before update on public.agent_runtime_settings
for each row
execute function public.set_updated_at();

insert into public.agent_runtime_settings (runtime_type, enabled, creator_visible, run_enabled, description)
values
  ('static_guided', true, false, false, 'legacy guided workspace, no runtime execution'),
  ('llm_prompt', true, true, true, 'text-only LLM prompt runtime'),
  ('document_file', false, false, false, 'future document/file runtime'),
  ('workflow_automation', false, false, false, 'future internal workflow automation runtime'),
  ('creator_endpoint', false, false, false, 'future creator API endpoint runtime')
on conflict (runtime_type) do update
set
  enabled = excluded.enabled,
  creator_visible = excluded.creator_visible,
  run_enabled = excluded.run_enabled,
  description = excluded.description;

alter table public.agent_runtime_settings enable row level security;

revoke all on public.agent_runtime_settings from anon, authenticated;

grant select, update on public.agent_runtime_settings to authenticated;
grant select, insert, update, delete on public.agent_runtime_settings to service_role;

drop policy if exists "Admins can read runtime settings" on public.agent_runtime_settings;
create policy "Admins can read runtime settings"
on public.agent_runtime_settings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update runtime settings" on public.agent_runtime_settings;
create policy "Admins can update runtime settings"
on public.agent_runtime_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop function if exists public.resubmit_creator_agent_changes(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  text,
  jsonb,
  jsonb,
  text,
  jsonb
);

create or replace function public.resubmit_creator_agent_changes(
  p_agent_id uuid,
  p_category_id uuid,
  p_name text,
  p_summary text,
  p_description text,
  p_pricing_type text,
  p_starting_price_cents integer,
  p_risk_level text,
  p_capabilities text[],
  p_required_inputs text[],
  p_deliverables text[],
  p_limitations text[],
  p_changelog text,
  p_workspace_mode text,
  p_setup_requirements jsonb,
  p_output_promise jsonb,
  p_execution_mode text,
  p_runtime_type text,
  p_data_policy jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select a.id, a.active_version_id, a.status
  into v_agent
  from public.agents a
  join public.creator_profiles cp on cp.id = a.creator_id
  where a.id = p_agent_id
    and cp.user_id = auth.uid()
  for update of a;

  if not found then
    raise exception 'Agent not found' using errcode = '42501';
  end if;

  if v_agent.status not in ('submitted', 'in_review', 'rejected') then
    raise exception 'Agent is not editable' using errcode = '42501';
  end if;

  if v_agent.active_version_id is null then
    raise exception 'Agent has no active version' using errcode = '23514';
  end if;

  if coalesce(length(trim(p_name)), 0) = 0
    or coalesce(length(trim(p_summary)), 0) = 0
    or coalesce(length(trim(p_description)), 0) = 0
  then
    raise exception 'Required text fields are missing' using errcode = '23514';
  end if;

  if coalesce(length(trim(p_changelog)), 0) < 10 then
    raise exception 'Resubmission changelog is required' using errcode = '23514';
  end if;

  if p_pricing_type not in ('task', 'project') then
    raise exception 'Invalid pricing type' using errcode = '23514';
  end if;

  if p_starting_price_cents is null or p_starting_price_cents <= 0 then
    raise exception 'Invalid starting price' using errcode = '23514';
  end if;

  if p_risk_level not in ('low', 'medium', 'high') then
    raise exception 'Invalid beta risk level' using errcode = '23514';
  end if;

  if p_workspace_mode not in ('instant', 'guided', 'document_required') then
    raise exception 'Invalid workspace mode' using errcode = '23514';
  end if;

  if p_execution_mode not in ('guided_workspace', 'llm_prompt') then
    raise exception 'Invalid execution mode' using errcode = '23514';
  end if;

  if p_runtime_type not in ('static_guided', 'llm_prompt', 'document_file', 'workflow_automation', 'creator_endpoint') then
    raise exception 'Invalid runtime type' using errcode = '23514';
  end if;

  if coalesce(cardinality(p_capabilities), 0) = 0
    or coalesce(cardinality(p_required_inputs), 0) = 0
    or coalesce(cardinality(p_deliverables), 0) = 0
    or coalesce(cardinality(p_limitations), 0) = 0
  then
    raise exception 'Version details are required' using errcode = '23514';
  end if;

  update public.agent_versions
  set
    capabilities = p_capabilities,
    required_inputs = p_required_inputs,
    deliverables = p_deliverables,
    limitations = p_limitations,
    data_handling_notes = format('Risk level declared by creator: %s', p_risk_level),
    changelog = trim(p_changelog),
    workspace_mode = p_workspace_mode,
    setup_requirements = p_setup_requirements,
    output_promise = p_output_promise,
    execution_mode = p_execution_mode,
    runtime_type = p_runtime_type,
    data_policy = p_data_policy
  where id = v_agent.active_version_id
    and agent_id = p_agent_id;

  if not found then
    raise exception 'Active validation version not found' using errcode = '23514';
  end if;

  update public.agents
  set
    category_id = p_category_id,
    name = trim(p_name),
    summary = trim(p_summary),
    description = trim(p_description),
    pricing_type = p_pricing_type,
    starting_price_cents = p_starting_price_cents,
    risk_level = p_risk_level,
    status = 'submitted'
  where id = p_agent_id;
end;
$$;

revoke all on function public.resubmit_creator_agent_changes(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb
) from public, anon;

grant execute on function public.resubmit_creator_agent_changes(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text,
  text[],
  text[],
  text[],
  text[],
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb
) to authenticated;
