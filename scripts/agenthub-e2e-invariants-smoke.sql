-- AgentHub local invariant smoke test.
--
-- This script validates the DB-level invariants behind the full product flow:
-- creator submission -> security precheck -> admin review -> approved
-- marketplace candidate -> active access -> successful run -> verified review
-- -> creator revenue ledger.
--
-- It is intentionally transaction-wrapped and rolled back, so it does not
-- persist smoke data.

begin;

do $$
declare
  v_admin_user_id uuid := '10000000-0000-4000-8000-000000000002';
  v_agent_id uuid := gen_random_uuid();
  v_agent_version_id uuid := gen_random_uuid();
  v_category_id uuid;
  v_creator_id uuid;
  v_payment_id uuid := gen_random_uuid();
  v_precheck_id uuid;
  v_rental_id uuid := gen_random_uuid();
  v_review_id uuid;
  v_run_id uuid := gen_random_uuid();
  v_user_id uuid := '10000000-0000-4000-8000-000000000003';
  v_amount_cents integer := 1200;
  v_earned_creator_gross_cents integer;
  v_ledger_event_count integer;
  v_missing_earned_ledger_count integer;
begin
  select id
  into v_creator_id
  from public.creator_profiles
  where user_id = '10000000-0000-4000-8000-000000000001'
  limit 1;

  if v_creator_id is null then
    raise exception 'smoke-missing-seed-creator-profile';
  end if;

  select id
  into v_category_id
  from public.agent_categories
  order by created_at
  limit 1;

  if v_category_id is null then
    raise exception 'smoke-missing-agent-category';
  end if;

  insert into public.agents (
    id,
    creator_id,
    category_id,
    slug,
    name,
    summary,
    description,
    status,
    pricing_type,
    starting_price_cents,
    currency,
    risk_level,
    estimated_turnaround
  )
  values (
    v_agent_id,
    v_creator_id,
    v_category_id,
    'agenthub-e2e-smoke-agent',
    'AgentHub E2E Smoke Agent',
    'Temporary agent used by the local invariant smoke test.',
    'Validates the closed-beta marketplace flow without persisting data.',
    'submitted',
    'task',
    v_amount_cents,
    'eur',
    'low',
    'Instant'
  );

  insert into public.agent_versions (
    id,
    agent_id,
    version_number,
    capabilities,
    required_inputs,
    deliverables,
    limitations,
    data_handling_notes,
    changelog,
    workspace_mode,
    setup_requirements,
    output_promise,
    execution_mode,
    runtime_type,
    data_policy
  )
  values (
    v_agent_version_id,
    v_agent_id,
    1,
    array['Classify the request', 'Generate a concise recommendation'],
    array['Short business context'],
    array['Decision summary', 'Next-step checklist'],
    array['Beta smoke output only'],
    'No private data is required for this smoke test.',
    'Initial smoke version.',
    'guided',
    '{"type":"context","items":["Short business context"]}'::jsonb,
    '{"summary":"A concise actionable recommendation.","examples":["Priority, rationale, next steps."]}'::jsonb,
    'llm_prompt',
    'llm_prompt',
    '{"requires_files":false,"stores_user_data":true,"external_tools":[]}'::jsonb
  );

  update public.agents
  set active_version_id = v_agent_version_id
  where id = v_agent_id;

  insert into public.agent_security_prechecks (
    agent_id,
    agent_version_id,
    creator_id,
    runtime_type,
    trigger,
    status,
    risk_score,
    risk_level_suggested,
    security_review_required,
    recommended_action,
    summary,
    manifest_snapshot,
    findings,
    admin_questions,
    model,
    prompt_version,
    created_by,
    completed_at
  )
  values (
    v_agent_id,
    v_agent_version_id,
    v_creator_id,
    'llm_prompt',
    'submission',
    'passed',
    12,
    'low',
    false,
    'standard_review',
    'Smoke precheck passed.',
    '{"source":"agenthub-e2e-invariants-smoke"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    'smoke-model',
    'smoke-v1',
    v_admin_user_id,
    now()
  )
  returning id into v_precheck_id;

  insert into public.admin_reviews (
    agent_id,
    agent_version_id,
    admin_id,
    decision,
    risk_level,
    notes
  )
  values (
    v_agent_id,
    v_agent_version_id,
    v_admin_user_id,
    'approved',
    'low',
    'Smoke admin approval after precheck.'
  )
  returning id into v_review_id;

  update public.agents
  set status = 'approved'
  where id = v_agent_id;

  if not exists (
    select 1
    from public.agents a
    join public.agent_versions av on av.id = a.active_version_id
    join public.agent_runtime_settings ars on ars.runtime_type = av.runtime_type
    where a.id = v_agent_id
      and a.status = 'approved'
      and ars.enabled = true
      and (av.runtime_type = 'static_guided' or ars.run_enabled = true)
  ) then
    raise exception 'smoke-approved-agent-not-marketplace-eligible';
  end if;

  if public.can_user_review_rental_request(v_rental_id, v_agent_id, v_user_id) then
    raise exception 'smoke-review-allowed-before-access';
  end if;

  insert into public.payments (
    id,
    user_id,
    agent_id,
    agent_version_id,
    amount_cents,
    currency,
    status,
    stripe_checkout_session_id
  )
  values (
    v_payment_id,
    v_user_id,
    v_agent_id,
    v_agent_version_id,
    v_amount_cents,
    'eur',
    'paid',
    'cs_test_agenthub_smoke_' || replace(v_payment_id::text, '-', '')
  );

  insert into public.rental_requests (
    id,
    user_id,
    agent_id,
    agent_version_id,
    creator_id,
    payment_id,
    status,
    pricing_type,
    quoted_price_cents,
    currency,
    request_brief,
    required_inputs
  )
  values (
    v_rental_id,
    v_user_id,
    v_agent_id,
    v_agent_version_id,
    v_creator_id,
    v_payment_id,
    'active',
    'task',
    v_amount_cents,
    'eur',
    'AgentHub invariant smoke access.',
    '{"context":"Smoke context"}'::jsonb
  );

  update public.payments
  set rental_request_id = v_rental_id
  where id = v_payment_id;

  if public.can_user_review_rental_request(v_rental_id, v_agent_id, v_user_id) then
    raise exception 'smoke-review-allowed-before-successful-run';
  end if;

  insert into public.agent_runs (
    id,
    rental_request_id,
    agent_id,
    agent_version_id,
    user_id,
    action_key,
    action_label,
    input_text,
    prompt_snapshot,
    output_text,
    status,
    provider,
    model,
    input_chars,
    output_chars,
    completed_at
  )
  values (
    v_run_id,
    v_rental_id,
    v_agent_id,
    v_agent_version_id,
    v_user_id,
    'smoke',
    'Smoke run',
    'Smoke input',
    '{"source":"agenthub-e2e-invariants-smoke"}'::jsonb,
    'Smoke output',
    'succeeded',
    'openai',
    'smoke-model',
    11,
    12,
    now()
  );

  if not public.can_user_review_rental_request(v_rental_id, v_agent_id, v_user_id) then
    raise exception 'smoke-review-not-allowed-after-successful-run';
  end if;

  insert into public.agent_reviews (
    agent_id,
    rental_request_id,
    user_id,
    rating,
    title,
    body
  )
  values (
    v_agent_id,
    v_rental_id,
    v_user_id,
    5,
    'Smoke review',
    'Smoke review after a successful run.'
  );

  insert into public.creator_revenue_ledger (
    event_type,
    status,
    creator_id,
    agent_id,
    agent_version_id,
    rental_request_id,
    payment_id,
    gross_amount_cents,
    creator_gross_cents,
    currency,
    metadata
  )
  values (
    'payment_paid',
    'pending_access',
    v_creator_id,
    v_agent_id,
    v_agent_version_id,
    v_rental_id,
    v_payment_id,
    v_amount_cents,
    v_amount_cents,
    'eur',
    jsonb_build_object(
      'admin_review_id', v_review_id,
      'security_precheck_id', v_precheck_id,
      'source', 'agenthub-e2e-invariants-smoke'
    )
  );

  insert into public.creator_revenue_ledger (
    event_type,
    status,
    creator_id,
    agent_id,
    agent_version_id,
    rental_request_id,
    payment_id,
    gross_amount_cents,
    creator_gross_cents,
    currency,
    metadata
  )
  values (
    'access_created',
    'earned',
    v_creator_id,
    v_agent_id,
    v_agent_version_id,
    v_rental_id,
    v_payment_id,
    v_amount_cents,
    v_amount_cents,
    'eur',
    jsonb_build_object(
      'admin_review_id', v_review_id,
      'security_precheck_id', v_precheck_id,
      'source', 'agenthub-e2e-invariants-smoke'
    )
  );

  select count(*)
  into v_ledger_event_count
  from public.creator_revenue_ledger
  where payment_id = v_payment_id
    and event_type in ('payment_paid', 'access_created');

  if v_ledger_event_count <> 2 then
    raise exception 'smoke-ledger-missing-payment-or-access-event';
  end if;

  select count(*)
  into v_ledger_event_count
  from public.creator_revenue_ledger
  where payment_id = v_payment_id
    and event_type = 'access_created'
    and status = 'earned';

  if v_ledger_event_count <> 1 then
    raise exception 'smoke-ledger-earned-event-not-unique';
  end if;

  select coalesce(sum(creator_gross_cents), 0)
  into v_earned_creator_gross_cents
  from public.creator_revenue_ledger
  where payment_id = v_payment_id
    and event_type = 'access_created'
    and status = 'earned';

  if v_earned_creator_gross_cents <> v_amount_cents then
    raise exception 'smoke-ledger-earned-amount-mismatch';
  end if;

  select count(*)
  into v_missing_earned_ledger_count
  from public.payments p
  join public.rental_requests rr on rr.payment_id = p.id
  left join public.creator_revenue_ledger l
    on l.payment_id = p.id
    and l.event_type = 'access_created'
    and l.status = 'earned'
  where p.id = v_payment_id
    and p.status = 'paid'
    and p.rental_request_id is not null
    and rr.status = 'active'
    and l.id is null;

  if v_missing_earned_ledger_count <> 0 then
    raise exception 'smoke-paid-access-missing-earned-ledger';
  end if;

  raise notice 'agenthub-e2e-invariants-smoke-ok agent=% version=% precheck=% review=% rental=% run=% payment=%',
    v_agent_id,
    v_agent_version_id,
    v_precheck_id,
    v_review_id,
    v_rental_id,
    v_run_id,
    v_payment_id;
end $$;

rollback;
