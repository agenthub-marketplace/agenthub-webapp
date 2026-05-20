-- Harden beta rental creation before Stripe.
--
-- The public client can reach exposed tables through the Data API, so RLS must
-- enforce the same pricing, ownership, and no-self-rental guarantees as the
-- server action. Column-scoped grants prevent clients from setting internal
-- notes or future server-controlled fields directly.

revoke insert on public.rental_requests from authenticated;

grant insert (
  agent_id,
  user_id,
  creator_id,
  status,
  pricing_type,
  quoted_price_cents,
  currency,
  request_brief,
  required_inputs
) on public.rental_requests to authenticated;

drop policy if exists "Users can create their own beta rental requests" on public.rental_requests;

create policy "Users can create their own beta rental requests"
on public.rental_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and request_brief = 'Beta rental created without payment. Stripe checkout will replace this step later.'
  and required_inputs = '{}'::jsonb
  and exists (
    select 1
    from public.agents a
    where a.id = rental_requests.agent_id
      and a.creator_id = rental_requests.creator_id
      and a.status = 'approved'
      and a.pricing_type = rental_requests.pricing_type
      and a.starting_price_cents is not distinct from rental_requests.quoted_price_cents
      and a.currency = rental_requests.currency
      and not public.owns_creator_profile(a.creator_id)
  )
);

-- Users keep read access to agent listing basics for rentals they already own,
-- even if the agent later leaves the public approved marketplace.
drop policy if exists "Users can read agents they rented" on public.agents;

create policy "Users can read agents they rented"
on public.agents
for select
to authenticated
using (
  exists (
    select 1
    from public.rental_requests rr
    where rr.agent_id = agents.id
      and rr.user_id = auth.uid()
  )
);
