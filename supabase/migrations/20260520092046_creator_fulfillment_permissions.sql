-- Creator fulfillment permissions for the manual beta.
--
-- Creators need to read rental requests for their own creator_profile and move
-- them through a small manual status workflow. Keep update privileges
-- column-scoped so client-side code cannot alter ownership, prices, notes, or
-- user-controlled data through the Data API.

grant select on public.rental_requests to authenticated;
grant update (status) on public.rental_requests to authenticated;
grant select on public.rental_results to authenticated;

-- The beta delivery flow only accepts a text summary. Keep insert grants
-- column-scoped so direct Data API clients cannot set ids, timestamps, file
-- URLs, notes, or other future server-controlled fields.
revoke insert on public.rental_results from authenticated;
grant insert (
  rental_request_id,
  delivered_by,
  summary
) on public.rental_results to authenticated;

alter table public.rental_requests enable row level security;
alter table public.rental_results enable row level security;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.enforce_rental_request_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('accepted', 'rejected') then
    return new;
  end if;

  if old.status = 'accepted' and new.status = 'in_progress' then
    return new;
  end if;

  if old.status = 'in_progress' and new.status = 'delivered' then
    if exists (
      select 1
      from public.rental_results rr
      where rr.rental_request_id = old.id
    ) then
      return new;
    end if;
  end if;

  raise exception 'Invalid rental request status transition from % to %', old.status, new.status
    using errcode = '23514';
end;
$$;

revoke all on function private.enforce_rental_request_status_transition() from public, anon, authenticated;

create or replace function private.prepare_rental_result_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- rental_results is exposed to authenticated creators through the Data API.
  -- Enforce delivery invariants in the database so direct inserts cannot bypass
  -- the server action/RPC validation.
  if auth.uid() is null then
    raise exception 'Authentication required to deliver a rental result'
      using errcode = '28000';
  end if;

  if new.delivered_by is distinct from auth.uid() then
    raise exception 'Rental result delivered_by must match the authenticated user'
      using errcode = '42501';
  end if;

  new.summary := nullif(trim(new.summary), '');

  if new.summary is null or char_length(new.summary) < 10 then
    raise exception 'Delivery summary is too short' using errcode = '23514';
  end if;

  if char_length(new.summary) > 8000 then
    raise exception 'Delivery summary is too long' using errcode = '23514';
  end if;

  new.delivered_at := now();

  return new;
end;
$$;

revoke all on function private.prepare_rental_result_insert() from public, anon, authenticated;

create or replace function private.complete_rental_delivery_from_result()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- A result row and the rental delivered status must be committed together.
  -- If the rental is not currently in_progress, raise to roll back the result.
  update public.rental_requests
  set status = 'delivered'
  where id = new.rental_request_id
    and status = 'in_progress';

  if not found then
    raise exception 'Rental request is not ready for delivery' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.complete_rental_delivery_from_result() from public, anon, authenticated;

drop trigger if exists rental_requests_enforce_status_transition on public.rental_requests;

create trigger rental_requests_enforce_status_transition
before update of status on public.rental_requests
for each row
execute function private.enforce_rental_request_status_transition();

drop trigger if exists rental_results_prepare_insert on public.rental_results;
drop trigger if exists rental_results_complete_delivery on public.rental_results;

create trigger rental_results_prepare_insert
before insert on public.rental_results
for each row
execute function private.prepare_rental_result_insert();

create trigger rental_results_complete_delivery
after insert on public.rental_results
for each row
execute function private.complete_rental_delivery_from_result();

drop policy if exists "Creators can read their own rental requests" on public.rental_requests;
drop policy if exists "Creators can update their own rental request status" on public.rental_requests;
drop policy if exists "Users can read their own rental results" on public.rental_results;
drop policy if exists "Creators can read their own rental results" on public.rental_results;
drop policy if exists "Creators can insert their own rental results" on public.rental_results;

create policy "Creators can read their own rental requests"
on public.rental_requests
for select
to authenticated
using (public.owns_creator_profile(creator_id));

create policy "Creators can update their own rental request status"
on public.rental_requests
for update
to authenticated
using (
  public.owns_creator_profile(creator_id)
  and status in ('pending', 'accepted', 'in_progress')
)
with check (
  public.owns_creator_profile(creator_id)
  and status in ('accepted', 'in_progress', 'rejected', 'delivered')
);

create policy "Users can read their own rental results"
on public.rental_results
for select
to authenticated
using (
  exists (
    select 1
    from public.rental_requests rr
    where rr.id = rental_results.rental_request_id
      and rr.user_id = auth.uid()
  )
);

create policy "Creators can read their own rental results"
on public.rental_results
for select
to authenticated
using (
  exists (
    select 1
    from public.rental_requests rr
    where rr.id = rental_results.rental_request_id
      and public.owns_creator_profile(rr.creator_id)
  )
);

create policy "Creators can insert their own rental results"
on public.rental_results
for insert
to authenticated
with check (
  delivered_by = auth.uid()
  and exists (
    select 1
    from public.rental_requests rr
    where rr.id = rental_results.rental_request_id
      and rr.status = 'in_progress'
      and public.owns_creator_profile(rr.creator_id)
  )
);

create or replace function public.deliver_creator_rental_result(
  p_rental_request_id uuid,
  p_summary text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_summary text;
begin
  normalized_summary := nullif(trim(p_summary), '');

  if normalized_summary is null or char_length(normalized_summary) < 10 then
    raise exception 'Delivery summary is too short' using errcode = '23514';
  end if;

  if char_length(normalized_summary) > 8000 then
    raise exception 'Delivery summary is too long' using errcode = '23514';
  end if;

  insert into public.rental_results (
    rental_request_id,
    delivered_by,
    summary
  )
  values (
    p_rental_request_id,
    auth.uid(),
    normalized_summary
  );
end;
$$;

revoke all on function public.deliver_creator_rental_result(uuid, text) from public, anon;
grant execute on function public.deliver_creator_rental_result(uuid, text) to authenticated;
