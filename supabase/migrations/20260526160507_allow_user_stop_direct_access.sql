-- Allow direct-access rentals to be stopped by moving them to expired.
-- The previous trigger was created for the legacy manual fulfillment workflow
-- and rejected active -> expired, which blocks users from ending access.

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

  if old.status = 'pending' and new.status in ('accepted', 'rejected', 'cancelled') then
    return new;
  end if;

  if old.status = 'accepted' and new.status in ('in_progress', 'expired') then
    return new;
  end if;

  if old.status = 'active' and new.status = 'expired' then
    return new;
  end if;

  if old.status = 'in_progress' and new.status = 'expired' then
    return new;
  end if;

  if old.status = 'delivered' and new.status = 'expired' then
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
