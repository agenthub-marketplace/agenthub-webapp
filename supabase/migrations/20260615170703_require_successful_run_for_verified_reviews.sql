-- Keep the RLS insert policy for verified reviews aligned with the server
-- action: an owned access is reviewable only after at least one successful
-- workspace execution has been stored for the same user/rental.
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
      and rr.status in ('active', 'stopped', 'expired', 'delivered')
      and not public.owns_creator_profile(rr.creator_id)
      and exists (
        select 1
        from public.agent_runs ar
        where ar.rental_request_id = rr.id
          and ar.agent_id = rr.agent_id
          and ar.user_id = rr.user_id
          and ar.status = 'succeeded'
      )
  );
$$;
