-- Tighten the direct-access payment state machine without deleting data.
--
-- - paid_blocked represents a confirmed payment that could not safely create
--   an access record.
-- - activation_error stores the support/debug reason.
-- - stopped is the user-controlled terminal state for manually ended access.
-- Existing expired rows remain valid as legacy data.

alter table public.payments
add column if not exists activation_error text;

alter table public.payments
drop constraint if exists payments_status_check,
add constraint payments_status_check check (
  status in ('pending', 'paid', 'failed', 'cancelled', 'paid_blocked')
);

alter table public.payments
drop constraint if exists payments_activation_error_check,
add constraint payments_activation_error_check check (
  activation_error is null
  or activation_error in (
    'agent_not_approved',
    'duplicate_access',
    'missing_agent_version',
    'snapshot_mismatch',
    'unknown_error'
  )
);

grant select (activation_error) on public.payments to authenticated;
grant select, update (activation_error) on public.payments to service_role;

alter table public.rental_requests
drop constraint if exists rental_requests_status_check;

alter table public.rental_requests
add constraint rental_requests_status_check check (
  status in (
    'pending',
    'accepted',
    'in_progress',
    'delivered',
    'rejected',
    'cancelled',
    'active',
    'expired',
    'stopped'
  )
);

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

  if old.status = 'accepted' and new.status in ('in_progress', 'expired', 'stopped') then
    return new;
  end if;

  if old.status = 'active' and new.status in ('expired', 'stopped') then
    return new;
  end if;

  if old.status = 'in_progress' and new.status in ('expired', 'stopped') then
    return new;
  end if;

  if old.status = 'delivered' and new.status in ('expired', 'stopped') then
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
  );
$$;
