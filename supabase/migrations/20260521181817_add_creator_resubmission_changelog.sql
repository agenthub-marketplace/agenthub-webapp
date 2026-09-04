-- Persist a creator-written summary when an agent is resubmitted after admin
-- feedback. The admin can then review the full updated listing plus a concise
-- "what changed" note, without adding another workflow state.

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
  text[]
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
  p_changelog text
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
    changelog = trim(p_changelog)
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
  text
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
  text
) to authenticated;

create or replace function public.get_admin_agent_version_changelogs(p_version_ids uuid[])
returns table(id uuid, changelog text)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select av.id, av.changelog
  from public.agent_versions av
  where public.is_admin()
    and av.id = any(p_version_ids);
$$;

revoke all on function public.get_admin_agent_version_changelogs(uuid[]) from public, anon;
grant execute on function public.get_admin_agent_version_changelogs(uuid[]) to authenticated;
