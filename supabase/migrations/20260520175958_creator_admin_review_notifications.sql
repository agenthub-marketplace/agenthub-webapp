-- Expose admin review feedback to the creator who owns the reviewed agent.
--
-- The admin_reviews table is the beta source of truth for manual approval,
-- rejection, and requested changes. Creators need to read feedback for their
-- own agents, while admins need read access for review history. Do not expose
-- admin_id or other internal moderation fields through broad public grants.

revoke select on public.admin_reviews from anon, authenticated;

grant select (
  id,
  agent_id,
  decision,
  notes,
  created_at
) on public.admin_reviews to authenticated;

alter table public.admin_reviews enable row level security;

drop policy if exists "Creators can read admin reviews for their agents" on public.admin_reviews;
drop policy if exists "Admins can read admin reviews" on public.admin_reviews;

create policy "Creators can read admin reviews for their agents"
on public.admin_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.id = admin_reviews.agent_id
      and public.owns_creator_profile(a.creator_id)
  )
);

create policy "Admins can read admin reviews"
on public.admin_reviews
for select
to authenticated
using (public.is_admin());
