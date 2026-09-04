-- Review permissions for manual beta flow.
--
-- Users can read verified reviews for discovery.
-- Users can submit one review per delivered rental request through their
-- own authenticated context.

revoke select on public.agent_reviews from anon, authenticated;

grant select (
  id,
  agent_id,
  rating,
  title,
  body,
  created_at
) on public.agent_reviews to anon, authenticated;

-- Authenticated dashboard embeds need the rental FK for PostgREST joins, but
-- user_id remains server-controlled and unreadable through the public API.
grant select (rental_request_id) on public.agent_reviews to authenticated;

-- Keep direct Data API writes aligned with the server action. Clients may only
-- provide user-owned review fields; server-controlled timestamps and ids stay
-- outside the insert grant.
revoke insert on public.agent_reviews from authenticated;
grant insert (
  agent_id,
  rental_request_id,
  user_id,
  rating,
  title,
  body
) on public.agent_reviews to authenticated;

alter table public.agent_reviews enable row level security;

drop policy if exists "Public can read verified agent reviews" on public.agent_reviews;
drop policy if exists "Users can create review for delivered rental" on public.agent_reviews;

drop function if exists public.can_user_review_rental_request(uuid, uuid, uuid);

create or replace function public.can_user_review_rental_request(
  p_rental_request_id uuid,
  p_agent_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.rental_requests rr
    where rr.id = p_rental_request_id
      and rr.agent_id = p_agent_id
      and rr.user_id = p_user_id
      and rr.status = 'delivered'
      and not public.owns_creator_profile(rr.creator_id)
  );
$$;

create policy "Public can read verified agent reviews"
on public.agent_reviews
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.id = agent_reviews.agent_id
      and a.status = 'approved'
  )
);

create policy "Users can create review for delivered rental"
on public.agent_reviews
for insert
to authenticated
with check (
  user_id = auth.uid()
  and body is not null
  and char_length(btrim(body)) >= 5
  and char_length(body) <= 4000
  and (title is null or char_length(title) <= 200)
  and rating between 1 and 5
  and public.can_user_review_rental_request(rental_request_id, agent_id, user_id)
);
