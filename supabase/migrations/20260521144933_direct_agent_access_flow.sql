-- Direct agent access flow for the private beta.
--
-- Product model update:
-- - creators publish agents and admins validate them;
-- - users rent an approved agent and get access immediately;
-- - creators do not accept, start, or deliver each rental manually.
--
-- Keep legacy fulfillment statuses readable so existing beta data does not
-- break, but add active/expired for the direct-access model that Stripe will
-- later gate.

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
    'expired'
  )
);

-- Reset table privileges for the exposed Data API role. RLS controls rows, but
-- table/column grants still decide what operations the authenticated role can
-- attempt through PostgREST.
revoke all on public.rental_requests from authenticated;

grant select (
  id,
  agent_id,
  user_id,
  creator_id,
  status,
  pricing_type,
  quoted_price_cents,
  currency,
  request_brief,
  required_inputs,
  created_at,
  updated_at
) on public.rental_requests to authenticated;

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

-- Direct beta rentals are created as active access records. Stripe will later
-- replace this unpaid insert path with checkout-confirmed access creation.
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

drop policy if exists "Creators can update their own rental request status" on public.rental_requests;

-- Manual delivery is obsolete for the direct-access model. Keep existing
-- results readable for legacy rows, but block new creator-side result inserts.
revoke insert on public.rental_results from authenticated;
revoke execute on function public.deliver_creator_rental_result(uuid, text) from authenticated;

drop policy if exists "Creators can insert their own rental results" on public.rental_results;

-- Verified reviews now require owned access, not creator delivery. Legacy
-- delivered rentals remain reviewable.
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
      and rr.status in ('active', 'expired', 'delivered')
      and not public.owns_creator_profile(rr.creator_id)
  );
$$;

drop policy if exists "Users can create review for delivered rental" on public.agent_reviews;
drop policy if exists "Users can create review for owned agent access" on public.agent_reviews;

create policy "Users can create review for owned agent access"
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
