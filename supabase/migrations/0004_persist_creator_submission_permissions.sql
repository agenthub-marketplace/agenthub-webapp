-- Persist Supabase fixes required by the beta creator submission workflow.
--
-- The profiles SELECT/RLS recursion fix is already persisted in:
-- 0003_fix_profiles_select_permissions.sql.
--
-- This migration keeps the remaining production fixes aligned locally:
-- categories must be present and readable, creators must be able to read their
-- own creator_profile, and authenticated creators need table grants before RLS
-- policies can allow inserts/updates/deletes on agents and agent_versions.

insert into public.agent_categories (slug, name, description)
values
  (
    'legal-documents',
    'Legal documents',
    'Review support for contracts, policies, and legal-adjacent business documents.'
  ),
  (
    'accounting-admin',
    'Accounting & admin',
    'Administrative and accounting-adjacent document workflows.'
  ),
  (
    'hr-recruiting',
    'HR & recruiting',
    'Hiring, candidate screening, and people operations support.'
  ),
  (
    'business-documents',
    'Business documents',
    'Proposals, reports, SOPs, and operational documents.'
  ),
  (
    'research-analysis',
    'Research & analysis',
    'Market, competitor, and business research workflows.'
  )
on conflict (slug) do nothing;

grant select on public.agent_categories to authenticated;

alter table public.agent_categories enable row level security;

drop policy if exists "Authenticated users can read agent categories" on public.agent_categories;

create policy "Authenticated users can read agent categories"
on public.agent_categories
for select
to authenticated
using (true);

grant select on public.creator_profiles to authenticated;

alter table public.creator_profiles enable row level security;

drop policy if exists "Creators can read their own creator profile" on public.creator_profiles;

create policy "Creators can read their own creator profile"
on public.creator_profiles
for select
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.agents to authenticated;
grant select, insert, update, delete on public.agent_versions to authenticated;
