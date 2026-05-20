-- Harden public marketplace reads and beta risk boundaries.
--
-- RLS filters rows, not columns. The marketplace needs public reads for
-- approved listings, but anonymous visitors should not receive internal
-- agent version fields such as endpoint_url/model_notes or creator profile
-- management fields such as verification_notes.

revoke select on public.agent_versions from anon, authenticated;

grant select (
  id,
  agent_id,
  capabilities,
  required_inputs,
  deliverables,
  limitations,
  data_handling_notes,
  created_at
) on public.agent_versions to anon, authenticated;

revoke select on public.creator_profiles from anon, authenticated;

grant select (
  id,
  public_name,
  bio,
  website_url,
  verified_at
) on public.creator_profiles to anon;

grant select (
  id,
  public_name,
  bio,
  website_url,
  verified_at
) on public.creator_profiles to authenticated;

create or replace function public.get_own_creator_profile_id()
returns uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select cp.id
  from public.creator_profiles cp
  where cp.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_own_creator_profile_id() from public, anon;
grant execute on function public.get_own_creator_profile_id() to authenticated;

-- The Next.js server action already rejects forbidden_beta submissions, but
-- authenticated creators can also reach public.agents through the Supabase
-- Data API. Keep the same beta safety invariant at the database boundary.

drop policy if exists "Creators can insert their own agents" on public.agents;
drop policy if exists "Creators can update their own agents" on public.agents;

create policy "Creators can insert their own agents"
on public.agents
for insert
to authenticated
with check (
  public.owns_creator_profile(creator_id)
  and status in ('draft', 'submitted')
  and risk_level <> 'forbidden_beta'
);

create policy "Creators can update their own agents"
on public.agents
for update
to authenticated
using (
  public.is_creator_for_agent(id)
  and status in ('draft', 'submitted', 'rejected')
)
with check (
  public.owns_creator_profile(creator_id)
  and status in ('draft', 'submitted')
  and risk_level <> 'forbidden_beta'
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.prevent_forbidden_beta_agent_publication()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Defense in depth: direct SQL/Data API paths and admin actions must never
  -- move forbidden_beta agents into the review/publication path. They may be
  -- rejected or suspended, but not submitted, reviewed, or approved.
  if new.risk_level = 'forbidden_beta'
    and new.status in ('submitted', 'in_review', 'approved')
  then
    raise exception 'forbidden_beta agents cannot be submitted or published in beta'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_forbidden_beta_agent_publication() from public, anon, authenticated;

drop trigger if exists agents_prevent_forbidden_beta_publication on public.agents;

create trigger agents_prevent_forbidden_beta_publication
before insert or update of risk_level, status on public.agents
for each row
execute function private.prevent_forbidden_beta_agent_publication();
