-- Public marketplace read permissions.
--
-- Approved agents are public marketplace listings. Anonymous visitors must be
-- able to read the listing, its active version, category, and public creator
-- name without gaining access to private creator profile management fields.

grant select on public.agent_categories to anon, authenticated;
grant select on public.agents to anon, authenticated;
grant select on public.agent_versions to anon, authenticated;
grant select on public.creator_profiles to anon, authenticated;

alter table public.agent_categories enable row level security;
alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;
alter table public.creator_profiles enable row level security;

drop policy if exists "Public can read marketplace creator profiles" on public.creator_profiles;

create policy "Public can read marketplace creator profiles"
on public.creator_profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.creator_id = public.creator_profiles.id
      and a.status = 'approved'
  )
);
