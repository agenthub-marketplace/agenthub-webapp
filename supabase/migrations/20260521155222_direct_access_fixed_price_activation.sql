-- Direct access beta model:
-- users no longer submit a custom brief before creating an access.
-- A beta access can be activated only for an approved agent with a fixed price.
-- The inserted quoted price must match the agent price so clients cannot tamper with it.

drop policy if exists "Users can create their own beta rental requests" on public.rental_requests;

create policy "Users can create their own beta rental requests"
  on public.rental_requests
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'active'
    and length(trim(request_brief)) between 10 and 4000
    and jsonb_typeof(required_inputs) = 'object'
    and required_inputs ?& array['access_type', 'pricing_type']
    and not exists (
      select 1
      from jsonb_object_keys(required_inputs) as input_key(key)
      where input_key.key not in ('access_type', 'pricing_type')
    )
    and required_inputs->>'access_type' = 'direct_agent_access'
    and required_inputs->>'pricing_type' in ('task', 'project')
    and exists (
      select 1
      from public.agents a
      where a.id = rental_requests.agent_id
        and a.creator_id = rental_requests.creator_id
        and a.status = 'approved'
        and a.pricing_type = rental_requests.pricing_type
        and a.pricing_type = (required_inputs->>'pricing_type')
        and a.currency = rental_requests.currency
        and a.starting_price_cents is not null
        and a.starting_price_cents > 0
        and rental_requests.quoted_price_cents = a.starting_price_cents
        and not public.owns_creator_profile(a.creator_id)
    )
  );
