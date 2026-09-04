-- Beta rental creation without payments.
--
-- Product wording is "rent an agent", but the current beta stores this as a
-- rental_request with status pending until Stripe and fulfillment are added.
-- Users may only create rentals for themselves and only on approved agents.

grant select, insert on public.rental_requests to authenticated;

alter table public.rental_requests enable row level security;

drop policy if exists "Users can create their own beta rental requests" on public.rental_requests;

create policy "Users can create their own beta rental requests"
on public.rental_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.agents a
    where a.id = rental_requests.agent_id
      and a.creator_id = rental_requests.creator_id
      and a.status = 'approved'
      and a.pricing_type = rental_requests.pricing_type
  )
);
