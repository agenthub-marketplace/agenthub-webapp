-- AgentHub advanced agents invariant smoke test.
--
-- Validates the controlled beta path for the three "real agent" candidates:
-- - Support Triage Agent: workflow_automation
-- - Lead Qualification Agent: workflow_automation
-- - CRM Enrichment API Agent: creator_endpoint
--
-- This is a DB-level invariant smoke. It is transaction-wrapped and rolled
-- back, so it does not persist smoke data or enable advanced runtimes outside
-- this session.

begin;

do $$
declare
  v_admin_user_id uuid := '10000000-0000-4000-8000-000000000002';
  v_creator_id uuid;
  v_user_id uuid := '10000000-0000-4000-8000-000000000003';
  v_category_id uuid;
  v_agent_id uuid;
  v_version_id uuid;
  v_workflow_id uuid;
  v_endpoint_id uuid := gen_random_uuid();
  v_endpoint_config_id uuid;
  v_rental_id uuid;
  v_payment_id uuid;
  v_run_id uuid;
  v_workflow_run_id uuid;
  v_missing_gate_count integer;
  v_reviewable_count integer := 0;
  v_earned_count integer;
  v_slugs text[] := array[
    'agenthub-smoke-support-triage-agent',
    'agenthub-smoke-lead-qualification-agent',
    'agenthub-smoke-crm-enrichment-api-agent'
  ];
begin
  select id
  into v_creator_id
  from public.creator_profiles
  where user_id = '10000000-0000-4000-8000-000000000001'
  limit 1;

  if v_creator_id is null then
    raise exception 'advanced-smoke-missing-seed-creator-profile';
  end if;

  select id
  into v_category_id
  from public.agent_categories
  order by created_at
  limit 1;

  if v_category_id is null then
    raise exception 'advanced-smoke-missing-agent-category';
  end if;

  update public.agent_runtime_settings
  set enabled = true, run_enabled = true, updated_at = now()
  where runtime_type in ('workflow_automation', 'creator_endpoint');

  if (
    select count(*)
    from public.agent_runtime_settings
    where runtime_type in ('workflow_automation', 'creator_endpoint')
      and enabled = true
      and run_enabled = true
  ) <> 2 then
    raise exception 'advanced-smoke-runtime-settings-not-enabled';
  end if;

  insert into public.creator_runtime_access (
    creator_id,
    runtime_type,
    enabled,
    notes,
    granted_by
  )
  values
    (v_creator_id, 'workflow_automation', true, 'Advanced agent DB smoke allowlist.', v_admin_user_id),
    (v_creator_id, 'creator_endpoint', true, 'Advanced agent DB smoke allowlist.', v_admin_user_id)
  on conflict (creator_id, runtime_type) do update
  set
    enabled = excluded.enabled,
    notes = excluded.notes,
    granted_by = excluded.granted_by,
    updated_at = now();

  if (
    select count(*)
    from public.creator_runtime_access
    where creator_id = v_creator_id
      and runtime_type in ('workflow_automation', 'creator_endpoint')
      and enabled = true
  ) <> 2 then
    raise exception 'advanced-smoke-creator-not-allowlisted';
  end if;

  insert into public.creator_api_endpoints (
    id,
    creator_id,
    name,
    endpoint_url,
    status,
    verification_notes,
    approved_by,
    approved_at
  )
  values (
    v_endpoint_id,
    v_creator_id,
    'AgentHub advanced smoke CRM endpoint',
    'https://example.com/agenthub-crm-smoke',
    'approved',
    'DB smoke endpoint approved for invariant validation only.',
    v_admin_user_id,
    now()
  );

  -- Agent 1: Support Triage Agent, workflow_automation.
  v_agent_id := gen_random_uuid();
  v_version_id := gen_random_uuid();
  v_workflow_id := gen_random_uuid();
  v_rental_id := gen_random_uuid();
  v_payment_id := gen_random_uuid();
  v_run_id := gen_random_uuid();
  v_workflow_run_id := gen_random_uuid();

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
    v_slugs[1],
    'Support Triage Agent',
    'Classifies support requests and decides priority/category.',
    'Turns raw support messages into a priority, category, response and internal checklist.',
    'approved',
    'task',
    1200,
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
    v_version_id,
    v_agent_id,
    1,
    array['Classify support category', 'Decide priority', 'Draft response'],
    array['Raw support request', 'Business impact'],
    array['Priority and category', 'Customer reply', 'Internal checklist'],
    array['Does not contact the customer', 'Human review required for sensitive cases'],
    'Support input stays in AgentHub workflow history.',
    'Initial advanced beta smoke version.',
    'guided',
    '{"type":"context","items":["Support request","Impact and deadline"]}'::jsonb,
    '{"summary":"Priority, category, customer response and follow-up checklist.","examples":["bug/high + reply + internal checklist"]}'::jsonb,
    'llm_prompt',
    'workflow_automation',
    '{"requires_files":false,"stores_user_data":true,"external_tools":[]}'::jsonb
  );

  update public.agents set active_version_id = v_version_id where id = v_agent_id;

  insert into public.agent_version_workflows (
    id,
    agent_id,
    agent_version_id,
    creator_id,
    status,
    definition
  )
  values (
    v_workflow_id,
    v_agent_id,
    v_version_id,
    v_creator_id,
    'approved',
    '{
      "version": 1,
      "steps": [
        {"key":"support_triage_decision","label":"Classer la demande support par categorie et priorite","type":"llm_step","endpointId":null},
        {"key":"support_triage_response","label":"Generer une reponse client courte et une checklist interne","type":"llm_step","endpointId":null}
      ]
    }'::jsonb
  );

  insert into public.security_reviews (
    asset_type,
    asset_id,
    runtime_type,
    agent_id,
    agent_version_id,
    workflow_id,
    status,
    checklist,
    findings,
    notes,
    reviewed_by,
    reviewed_at
  )
  values (
    'workflow_asset',
    v_workflow_id,
    'workflow_automation',
    v_agent_id,
    v_version_id,
    v_workflow_id,
    'passed',
    '{"llm_only":true,"no_external_tools":true}'::jsonb,
    '[]'::jsonb,
    'DB smoke security review passed.',
    v_admin_user_id,
    now()
  );

  insert into public.payments (id, user_id, agent_id, agent_version_id, amount_cents, currency, status, stripe_checkout_session_id)
  values (v_payment_id, v_user_id, v_agent_id, v_version_id, 1200, 'eur', 'paid', 'cs_test_support_triage_advanced_smoke');

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
    v_version_id,
    v_creator_id,
    v_payment_id,
    'active',
    'task',
    1200,
    'eur',
    'Support triage advanced smoke access.',
    '{"support_request":"Export PDF error 500 before client meeting"}'::jsonb
  );

  update public.payments set rental_request_id = v_rental_id where id = v_payment_id;

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
    v_version_id,
    v_user_id,
    'workflow_automation',
    'Agent workflow',
    'Export PDF error 500 before client meeting.',
    '{"source":"advanced-agent-smoke","decision":"bug/high"}'::jsonb,
    'Category: bug. Priority: high. Draft reply and internal checklist generated.',
    'succeeded',
    'agenthub_workflow',
    'agenthub-workflow-v0',
    43,
    78,
    now()
  );

  insert into public.agent_workflow_runs (
    id,
    agent_run_id,
    rental_request_id,
    agent_id,
    agent_version_id,
    workflow_id,
    user_id,
    status,
    input_text,
    final_output,
    current_step_index,
    completed_at
  )
  values (
    v_workflow_run_id,
    v_run_id,
    v_rental_id,
    v_agent_id,
    v_version_id,
    v_workflow_id,
    v_user_id,
    'succeeded',
    'Export PDF error 500 before client meeting.',
    'Category: bug. Priority: high. Draft reply and internal checklist generated.',
    1,
    now()
  );

  insert into public.agent_workflow_steps (
    workflow_run_id,
    step_index,
    step_key,
    step_label,
    step_type,
    status,
    output_text,
    completed_at
  )
  values
    (v_workflow_run_id, 0, 'support_triage_decision', 'Classer la demande support par categorie et priorite', 'llm_step', 'succeeded', 'bug/high', now()),
    (v_workflow_run_id, 1, 'support_triage_response', 'Generer une reponse client courte et une checklist interne', 'llm_step', 'succeeded', 'reply/checklist', now());

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
  values
    ('payment_paid', 'pending_access', v_creator_id, v_agent_id, v_version_id, v_rental_id, v_payment_id, 1200, 1200, 'eur', '{"source":"advanced-agent-smoke"}'::jsonb),
    ('access_created', 'earned', v_creator_id, v_agent_id, v_version_id, v_rental_id, v_payment_id, 1200, 1200, 'eur', '{"source":"advanced-agent-smoke"}'::jsonb);

  if public.can_user_review_rental_request(v_rental_id, v_agent_id, v_user_id) then
    v_reviewable_count := v_reviewable_count + 1;
  else
    raise exception 'advanced-smoke-support-triage-not-reviewable';
  end if;

  insert into public.agent_reviews (agent_id, rental_request_id, user_id, rating, title, body)
  values (v_agent_id, v_rental_id, v_user_id, 5, 'Support triage smoke review', 'Review after successful workflow run.');

  -- Agent 2: Lead Qualification Agent, workflow_automation.
  v_agent_id := gen_random_uuid();
  v_version_id := gen_random_uuid();
  v_workflow_id := gen_random_uuid();
  v_rental_id := gen_random_uuid();
  v_payment_id := gen_random_uuid();
  v_run_id := gen_random_uuid();
  v_workflow_run_id := gen_random_uuid();

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
    v_slugs[2],
    'Lead Qualification Agent',
    'Scores B2B leads and decides the next commercial action.',
    'Evaluates ICP fit, urgency, budget signal and drafts a next-step message.',
    'approved',
    'task',
    1500,
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
    v_version_id,
    v_agent_id,
    1,
    array['Evaluate ICP fit', 'Score lead', 'Draft next action'],
    array['Lead context', 'Product fit criteria'],
    array['Qualification decision', 'Score', 'Follow-up message'],
    array['Does not update CRM', 'Score is assistive only'],
    'Lead context stays in AgentHub workflow history.',
    'Initial advanced beta smoke version.',
    'guided',
    '{"type":"context","items":["Lead context","Commercial criteria"]}'::jsonb,
    '{"summary":"Qualification status, score and next commercial action.","examples":["qualified yes, score 82, call next"]}'::jsonb,
    'llm_prompt',
    'workflow_automation',
    '{"requires_files":false,"stores_user_data":true,"external_tools":[]}'::jsonb
  );

  update public.agents set active_version_id = v_version_id where id = v_agent_id;

  insert into public.agent_version_workflows (id, agent_id, agent_version_id, creator_id, status, definition)
  values (
    v_workflow_id,
    v_agent_id,
    v_version_id,
    v_creator_id,
    'approved',
    '{
      "version": 1,
      "steps": [
        {"key":"lead_fit_decision","label":"Evaluer ICP urgence budget et fit produit","type":"llm_step","endpointId":null},
        {"key":"lead_next_action","label":"Decider qualified maybe no scorer 0-100 et proposer le prochain message","type":"llm_step","endpointId":null}
      ]
    }'::jsonb
  );

  insert into public.security_reviews (
    asset_type,
    asset_id,
    runtime_type,
    agent_id,
    agent_version_id,
    workflow_id,
    status,
    checklist,
    findings,
    notes,
    reviewed_by,
    reviewed_at
  )
  values (
    'workflow_asset',
    v_workflow_id,
    'workflow_automation',
    v_agent_id,
    v_version_id,
    v_workflow_id,
    'passed',
    '{"llm_only":true,"no_crm_write":true}'::jsonb,
    '[]'::jsonb,
    'DB smoke security review passed.',
    v_admin_user_id,
    now()
  );

  insert into public.payments (id, user_id, agent_id, agent_version_id, amount_cents, currency, status, stripe_checkout_session_id)
  values (v_payment_id, v_user_id, v_agent_id, v_version_id, 1500, 'eur', 'paid', 'cs_test_lead_qualification_advanced_smoke');

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
    v_version_id,
    v_creator_id,
    v_payment_id,
    'active',
    'task',
    1500,
    'eur',
    'Lead qualification advanced smoke access.',
    '{"lead":"SaaS HR 120 employees with 30-day timeline"}'::jsonb
  );

  update public.payments set rental_request_id = v_rental_id where id = v_payment_id;

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
    v_version_id,
    v_user_id,
    'workflow_automation',
    'Agent workflow',
    'SaaS HR 120 employees with 30-day timeline.',
    '{"source":"advanced-agent-smoke","decision":"qualified/82"}'::jsonb,
    'Qualified: yes. Score: 82. Next action: discovery call.',
    'succeeded',
    'agenthub_workflow',
    'agenthub-workflow-v0',
    43,
    57,
    now()
  );

  insert into public.agent_workflow_runs (
    id,
    agent_run_id,
    rental_request_id,
    agent_id,
    agent_version_id,
    workflow_id,
    user_id,
    status,
    input_text,
    final_output,
    current_step_index,
    completed_at
  )
  values (
    v_workflow_run_id,
    v_run_id,
    v_rental_id,
    v_agent_id,
    v_version_id,
    v_workflow_id,
    v_user_id,
    'succeeded',
    'SaaS HR 120 employees with 30-day timeline.',
    'Qualified: yes. Score: 82. Next action: discovery call.',
    1,
    now()
  );

  insert into public.agent_workflow_steps (
    workflow_run_id,
    step_index,
    step_key,
    step_label,
    step_type,
    status,
    output_text,
    completed_at
  )
  values
    (v_workflow_run_id, 0, 'lead_fit_decision', 'Evaluer ICP urgence budget et fit produit', 'llm_step', 'succeeded', 'strong ICP fit', now()),
    (v_workflow_run_id, 1, 'lead_next_action', 'Decider qualified maybe no scorer 0-100 et proposer le prochain message', 'llm_step', 'succeeded', 'qualified yes score 82', now());

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
  values
    ('payment_paid', 'pending_access', v_creator_id, v_agent_id, v_version_id, v_rental_id, v_payment_id, 1500, 1500, 'eur', '{"source":"advanced-agent-smoke"}'::jsonb),
    ('access_created', 'earned', v_creator_id, v_agent_id, v_version_id, v_rental_id, v_payment_id, 1500, 1500, 'eur', '{"source":"advanced-agent-smoke"}'::jsonb);

  if public.can_user_review_rental_request(v_rental_id, v_agent_id, v_user_id) then
    v_reviewable_count := v_reviewable_count + 1;
  else
    raise exception 'advanced-smoke-lead-qualification-not-reviewable';
  end if;

  insert into public.agent_reviews (agent_id, rental_request_id, user_id, rating, title, body)
  values (v_agent_id, v_rental_id, v_user_id, 5, 'Lead qualification smoke review', 'Review after successful workflow run.');

  -- Agent 3: CRM Enrichment API Agent, creator_endpoint.
  v_agent_id := gen_random_uuid();
  v_version_id := gen_random_uuid();
  v_endpoint_config_id := gen_random_uuid();
  v_rental_id := gen_random_uuid();
  v_payment_id := gen_random_uuid();
  v_run_id := gen_random_uuid();

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
    v_slugs[3],
    'CRM Enrichment API Agent',
    'Calls an approved creator API to enrich CRM context.',
    'Normalizes CRM input and stores the creator API result in AgentHub history.',
    'approved',
    'task',
    1800,
    'eur',
    'medium',
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
    v_version_id,
    v_agent_id,
    1,
    array['Normalize CRM request', 'Call approved creator API', 'Return enrichment'],
    array['Company name', 'Website', 'Target segment'],
    array['Enriched profile', 'ICP hypothesis', 'Missing data'],
    array['Endpoint must remain available', 'No secrets should be submitted'],
    'Context may be sent server-side to the approved creator endpoint.',
    'Initial advanced beta smoke version.',
    'guided',
    '{"type":"context","items":["Company","Website","Segment"]}'::jsonb,
    '{"summary":"Enriched CRM profile and next commercial action.","examples":["ICP hypothesis, missing data, outreach angle"]}'::jsonb,
    'llm_prompt',
    'creator_endpoint',
    '{"requires_files":false,"stores_user_data":true,"external_tools":[]}'::jsonb
  );

  update public.agents set active_version_id = v_version_id where id = v_agent_id;

  insert into public.agent_version_creator_endpoints (
    id,
    agent_id,
    agent_version_id,
    creator_id,
    endpoint_id,
    status,
    request_schema
  )
  values (
    v_endpoint_config_id,
    v_agent_id,
    v_version_id,
    v_creator_id,
    v_endpoint_id,
    'approved',
    '{"type":"object","required":["input_text"]}'::jsonb
  );

  insert into public.security_reviews (
    asset_type,
    asset_id,
    runtime_type,
    agent_id,
    agent_version_id,
    creator_endpoint_config_id,
    creator_api_endpoint_id,
    status,
    checklist,
    findings,
    notes,
    reviewed_by,
    reviewed_at
  )
  values (
    'creator_endpoint',
    v_endpoint_config_id,
    'creator_endpoint',
    v_agent_id,
    v_version_id,
    v_endpoint_config_id,
    v_endpoint_id,
    'passed',
    '{"https":true,"private_ip_blocked":true,"hmac_required":true}'::jsonb,
    '[]'::jsonb,
    'DB smoke endpoint security review passed.',
    v_admin_user_id,
    now()
  );

  insert into public.payments (id, user_id, agent_id, agent_version_id, amount_cents, currency, status, stripe_checkout_session_id)
  values (v_payment_id, v_user_id, v_agent_id, v_version_id, 1800, 'eur', 'paid', 'cs_test_crm_endpoint_advanced_smoke');

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
    v_version_id,
    v_creator_id,
    v_payment_id,
    'active',
    'task',
    1800,
    'eur',
    'CRM endpoint advanced smoke access.',
    '{"company":"Notion","site":"notion.so","segment":"operations teams"}'::jsonb
  );

  update public.payments set rental_request_id = v_rental_id where id = v_payment_id;

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
    v_version_id,
    v_user_id,
    'creator_endpoint',
    'Creator endpoint',
    'Company Notion, site notion.so, segment operations teams.',
    '{"source":"advanced-agent-smoke","endpoint_config_id":"crm"}'::jsonb,
    'CRM enrichment: ICP hypothesis, missing data and next action generated.',
    'succeeded',
    'agenthub_creator_endpoint',
    'agenthub-creator-endpoint-v0',
    57,
    72,
    now()
  );

  insert into public.agent_endpoint_runs (
    agent_run_id,
    rental_request_id,
    agent_id,
    agent_version_id,
    endpoint_config_id,
    endpoint_id,
    user_id,
    status,
    request_snapshot,
    response_excerpt,
    completed_at
  )
  values (
    v_run_id,
    v_rental_id,
    v_agent_id,
    v_version_id,
    v_endpoint_config_id,
    v_endpoint_id,
    v_user_id,
    'succeeded',
    '{"source":"advanced-agent-smoke"}'::jsonb,
    'CRM enrichment: ICP hypothesis, missing data and next action generated.',
    now()
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
  values
    ('payment_paid', 'pending_access', v_creator_id, v_agent_id, v_version_id, v_rental_id, v_payment_id, 1800, 1800, 'eur', '{"source":"advanced-agent-smoke"}'::jsonb),
    ('access_created', 'earned', v_creator_id, v_agent_id, v_version_id, v_rental_id, v_payment_id, 1800, 1800, 'eur', '{"source":"advanced-agent-smoke"}'::jsonb);

  if public.can_user_review_rental_request(v_rental_id, v_agent_id, v_user_id) then
    v_reviewable_count := v_reviewable_count + 1;
  else
    raise exception 'advanced-smoke-crm-endpoint-not-reviewable';
  end if;

  insert into public.agent_reviews (agent_id, rental_request_id, user_id, rating, title, body)
  values (v_agent_id, v_rental_id, v_user_id, 5, 'CRM endpoint smoke review', 'Review after successful endpoint run.');

  select count(*)
  into v_missing_gate_count
  from public.agents a
  join public.agent_versions av on av.id = a.active_version_id
  left join public.agent_version_workflows aw
    on aw.agent_version_id = av.id
    and aw.status = 'approved'
  left join public.agent_version_creator_endpoints ace
    on ace.agent_version_id = av.id
    and ace.status = 'approved'
  left join public.creator_api_endpoints cae
    on cae.id = ace.endpoint_id
    and cae.status = 'approved'
  left join public.security_reviews sr
    on sr.agent_version_id = av.id
    and sr.runtime_type = av.runtime_type
    and sr.status in ('passed', 'waived')
  where a.slug = any(v_slugs)
    and a.status = 'approved'
    and av.runtime_type in ('workflow_automation', 'creator_endpoint')
    and (
      sr.id is null
      or (av.runtime_type = 'workflow_automation' and aw.id is null)
      or (av.runtime_type = 'creator_endpoint' and (ace.id is null or cae.id is null))
    );

  if v_missing_gate_count <> 0 then
    raise exception 'advanced-smoke-approved-agent-missing-gate count=%', v_missing_gate_count;
  end if;

  select count(*)
  into v_earned_count
  from public.creator_revenue_ledger l
  join public.agents a on a.id = l.agent_id
  where a.slug = any(v_slugs)
    and l.event_type = 'access_created'
    and l.status = 'earned';

  if v_earned_count <> 3 then
    raise exception 'advanced-smoke-earned-ledger-count-mismatch count=%', v_earned_count;
  end if;

  if v_reviewable_count <> 3 then
    raise exception 'advanced-smoke-reviewable-count-mismatch count=%', v_reviewable_count;
  end if;

  if (
    select count(*)
    from public.agent_reviews ar
    join public.agents a on a.id = ar.agent_id
    where a.slug = any(v_slugs)
  ) <> 3 then
    raise exception 'advanced-smoke-review-count-mismatch';
  end if;

  raise notice 'agenthub-advanced-agents-smoke-ok agents=%', array_to_string(v_slugs, ',');
end $$;

rollback;
