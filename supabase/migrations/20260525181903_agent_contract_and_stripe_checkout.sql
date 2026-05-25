-- Agent Contract v1 + Stripe checkout foundation.
--
-- Non-destructive changes:
-- - enrich agent_versions with optional contract fields used by marketplace and workspace;
-- - add payments as the Stripe source of truth before access creation;
-- - keep rental_requests as the current access table for now.

alter table public.agent_versions
add column if not exists workspace_mode text not null default 'instant',
add column if not exists setup_requirements jsonb not null default '{"type":"none","items":[]}'::jsonb,
add column if not exists output_promise jsonb not null default '{"summary":"","examples":[]}'::jsonb,
add column if not exists execution_mode text not null default 'guided_workspace',
add column if not exists data_policy jsonb not null default '{"stores_user_data":false,"requires_files":false,"external_tools":[]}'::jsonb;

alter table public.agent_versions
drop constraint if exists agent_versions_workspace_mode_check,
add constraint agent_versions_workspace_mode_check
  check (workspace_mode in ('instant', 'guided', 'document_required'));

alter table public.agent_versions
drop constraint if exists agent_versions_execution_mode_check,
add constraint agent_versions_execution_mode_check
  check (execution_mode in ('guided_workspace', 'llm_prompt'));

alter table public.agent_versions
drop constraint if exists agent_versions_setup_requirements_check,
add constraint agent_versions_setup_requirements_check
  check (
    jsonb_typeof(setup_requirements) = 'object'
    and setup_requirements ? 'type'
    and setup_requirements->>'type' in ('none', 'context', 'document')
    and (
      not setup_requirements ? 'items'
      or jsonb_typeof(setup_requirements->'items') = 'array'
    )
  );

alter table public.agent_versions
drop constraint if exists agent_versions_output_promise_check,
add constraint agent_versions_output_promise_check
  check (
    jsonb_typeof(output_promise) = 'object'
    and (
      not output_promise ? 'examples'
      or jsonb_typeof(output_promise->'examples') = 'array'
    )
  );

alter table public.agent_versions
drop constraint if exists agent_versions_data_policy_check,
add constraint agent_versions_data_policy_check
  check (jsonb_typeof(data_policy) = 'object');

grant select (
  workspace_mode,
  setup_requirements,
  output_promise,
  execution_mode,
  data_policy
) on public.agent_versions to anon, authenticated;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  agent_version_id uuid references public.agent_versions(id) on delete set null,
  rental_request_id uuid unique references public.rental_requests(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_cents_check check (amount_cents > 0),
  constraint payments_status_check check (status in ('pending', 'paid', 'failed', 'cancelled'))
);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_agent_id_idx on public.payments(agent_id);
create index if not exists payments_agent_version_id_idx on public.payments(agent_version_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_checkout_session_idx on public.payments(stripe_checkout_session_id);

create unique index if not exists payments_one_open_checkout_per_user_agent_idx
on public.payments(user_id, agent_id)
where status in ('pending', 'paid') and rental_request_id is null;

alter table public.payments enable row level security;

revoke all on public.payments from anon, authenticated;

grant select (
  id,
  user_id,
  agent_id,
  agent_version_id,
  rental_request_id,
  stripe_checkout_session_id,
  amount_cents,
  currency,
  status,
  created_at,
  updated_at
) on public.payments to authenticated;

drop policy if exists "Users can read their own payments" on public.payments;
create policy "Users can read their own payments"
on public.payments
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read all payments" on public.payments;
create policy "Admins can read all payments"
on public.payments
for select
to authenticated
using (public.is_admin());

alter table public.rental_requests
add column if not exists payment_id uuid unique references public.payments(id) on delete set null,
add column if not exists agent_version_id uuid references public.agent_versions(id) on delete set null;

create index if not exists rental_requests_payment_id_idx on public.rental_requests(payment_id);
create index if not exists rental_requests_agent_version_id_idx on public.rental_requests(agent_version_id);

create unique index if not exists rental_requests_one_open_access_per_user_agent_idx
on public.rental_requests(user_id, agent_id)
where status in ('active', 'accepted', 'in_progress', 'delivered');

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
  text
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
  jsonb
) to authenticated;
