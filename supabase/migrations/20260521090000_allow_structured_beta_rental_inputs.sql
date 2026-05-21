-- Allow structured beta rental inputs before Stripe checkout.
--
-- The previous beta policy intentionally allowed only a fixed placeholder
-- request_brief and an empty required_inputs object. The product now collects
-- a small user brief before creating the unpaid beta rental. Keep the same
-- ownership, approved-agent, pricing, and no-self-rental guarantees while
-- allowing user-provided structured inputs.

drop policy if exists "Users can create their own beta rental requests" on public.rental_requests;

create policy "Users can create their own beta rental requests"
on public.rental_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and length(trim(request_brief)) between 10 and 4000
  and jsonb_typeof(required_inputs) = 'object'
  and required_inputs ?& array['objective', 'context', 'deadline', 'output_format', 'constraints']
  and not exists (
    select 1
    from jsonb_object_keys(required_inputs) as input_key(key)
    where input_key.key not in ('objective', 'context', 'deadline', 'output_format', 'constraints')
  )
  and jsonb_typeof(required_inputs->'objective') = 'string'
  and jsonb_typeof(required_inputs->'context') = 'string'
  and jsonb_typeof(required_inputs->'deadline') = 'string'
  and jsonb_typeof(required_inputs->'output_format') = 'string'
  and jsonb_typeof(required_inputs->'constraints') = 'string'
  and length(trim(required_inputs->>'objective')) between 5 and 240
  and length(trim(required_inputs->>'context')) between 10 and 1200
  and length(trim(required_inputs->>'deadline')) between 2 and 120
  and length(trim(required_inputs->>'output_format')) between 3 and 160
  and length(trim(required_inputs->>'constraints')) between 3 and 1200
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
