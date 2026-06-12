-- AgentHub closed beta sanity checks.
-- Read-only. Run in Supabase SQL editor or a read-only SQL session.

-- 1. Expected beta agents and approval/execution readiness.
with expected_agents(name) as (
  values
    ('LinkedIn Content Studio'),
    ('Sales Email Builder'),
    ('Text Rewrite Assistant'),
    ('Business SWOT Analyst'),
    ('Meeting Notes Checklist')
)
select
  'beta_agents_readiness' as check_name,
  expected_agents.name as expected_agent,
  agents.id,
  agents.slug,
  agents.status,
  agents.starting_price_cents,
  agent_versions.execution_mode,
  agent_versions.workspace_mode,
  agent_versions.data_policy
from expected_agents
left join public.agents on agents.name = expected_agents.name
  and agents.status <> 'archived'
left join public.agent_versions on agent_versions.id = agents.active_version_id
order by expected_agents.name;

-- 2. Agent Contract quality signals for non-archived beta agents.
select
  'agent_contract_quality' as check_name,
  agents.name,
  agents.slug,
  agents.status,
  agents.risk_level,
  agents.starting_price_cents,
  agent_versions.execution_mode,
  agent_versions.workspace_mode,
  coalesce(nullif(trim(agent_versions.output_promise->>'summary'), ''), null) is not null as has_output_promise,
  coalesce(jsonb_array_length(coalesce(agent_versions.output_promise->'examples', '[]'::jsonb)), 0) > 0 as has_output_examples,
  coalesce(array_length(agent_versions.capabilities, 1), 0) > 0 as has_capabilities,
  coalesce(array_length(agent_versions.required_inputs, 1), 0) > 0 as has_required_inputs,
  coalesce(array_length(agent_versions.deliverables, 1), 0) > 0 as has_deliverables,
  coalesce(array_length(agent_versions.limitations, 1), 0) > 0 as has_limitations,
  coalesce((agent_versions.data_policy->>'requires_files')::boolean, false) = false as no_files_required,
  coalesce(jsonb_array_length(coalesce(agent_versions.data_policy->'external_tools', '[]'::jsonb)), 0) = 0 as no_external_tools,
  (
    agents.status = 'approved'
    and agents.risk_level <> 'forbidden_beta'
    and agents.starting_price_cents > 0
    and agent_versions.execution_mode = 'llm_prompt'
    and coalesce(nullif(trim(agent_versions.output_promise->>'summary'), ''), null) is not null
    and coalesce(array_length(agent_versions.deliverables, 1), 0) > 0
    and coalesce(array_length(agent_versions.limitations, 1), 0) > 0
    and coalesce((agent_versions.data_policy->>'requires_files')::boolean, false) = false
    and coalesce(jsonb_array_length(coalesce(agent_versions.data_policy->'external_tools', '[]'::jsonb)), 0) = 0
  ) as ready_for_closed_beta
from public.agents
join public.agent_versions on agent_versions.id = agents.active_version_id
where agents.status <> 'archived'
order by ready_for_closed_beta asc, agents.updated_at desc
limit 50;

-- 3. Payments that stayed pending long enough to need review.
select
  'old_pending_payments' as check_name,
  id,
  user_id,
  agent_id,
  amount_cents,
  currency,
  stripe_checkout_session_id,
  created_at
from public.payments
where status = 'pending'
  and created_at < now() - interval '30 minutes'
order by created_at desc
limit 50;

-- 4. Paid payments that have no access linked.
select
  'paid_without_access' as check_name,
  payments.id,
  payments.user_id,
  payments.agent_id,
  payments.agent_version_id,
  payments.rental_request_id,
  payments.activation_error,
  payments.created_at,
  payments.updated_at
from public.payments
left join public.rental_requests on rental_requests.id = payments.rental_request_id
where payments.status = 'paid'
  and rental_requests.id is null
order by payments.updated_at desc
limit 50;

-- 5. Duplicate open checkout/payment records by user and agent.
select
  'duplicate_open_payments' as check_name,
  user_id,
  agent_id,
  count(*) as open_payment_count,
  array_agg(id order by created_at desc) as payment_ids
from public.payments
where status = 'pending'
group by user_id, agent_id
having count(*) > 1
order by open_payment_count desc;

-- 6. Duplicate active access by user and agent.
select
  'duplicate_active_access' as check_name,
  user_id,
  agent_id,
  count(*) as active_access_count,
  array_agg(id order by created_at desc) as rental_request_ids
from public.rental_requests
where status = 'active'
group by user_id, agent_id
having count(*) > 1
order by active_access_count desc;

-- 7. Recently failed LLM runs.
select
  'recent_failed_agent_runs' as check_name,
  id,
  user_id,
  rental_request_id,
  agent_id,
  action_key,
  error_code,
  model,
  created_at,
  completed_at
from public.agent_runs
where status = 'failed'
  and created_at >= now() - interval '24 hours'
order by created_at desc
limit 50;

-- 8. LLM runs stuck in running.
select
  'stale_running_agent_runs' as check_name,
  id,
  user_id,
  rental_request_id,
  agent_id,
  action_key,
  model,
  created_at
from public.agent_runs
where status = 'running'
  and created_at < now() - interval '10 minutes'
order by created_at desc
limit 50;

-- 9. LLM volume by user over the last 24 hours.
select
  'agent_runs_by_user_24h' as check_name,
  user_id,
  count(*) as run_count,
  count(*) filter (where status = 'succeeded') as succeeded_count,
  count(*) filter (where status = 'failed') as failed_count,
  max(created_at) as last_run_at
from public.agent_runs
where created_at >= now() - interval '24 hours'
group by user_id
order by run_count desc
limit 50;

-- 10. LLM volume by agent over the last 7 days.
select
  'agent_runs_by_agent_7d' as check_name,
  agents.name,
  agents.slug,
  agent_runs.agent_id,
  count(*) as run_count,
  count(*) filter (where agent_runs.status = 'succeeded') as succeeded_count,
  count(*) filter (where agent_runs.status = 'failed') as failed_count
from public.agent_runs
join public.agents on agents.id = agent_runs.agent_id
where agent_runs.created_at >= now() - interval '7 days'
group by agents.name, agents.slug, agent_runs.agent_id
order by run_count desc
limit 50;

-- 11. Duplicate reviews for the same access.
select
  'duplicate_reviews_by_access' as check_name,
  rental_request_id,
  count(*) as review_count,
  array_agg(id order by created_at desc) as review_ids
from public.agent_reviews
group by rental_request_id
having count(*) > 1
order by review_count desc;

-- 12. Reviews attached to an access status that should not allow reviews.
select
  'reviews_on_invalid_access' as check_name,
  agent_reviews.id as review_id,
  agent_reviews.user_id,
  agent_reviews.agent_id,
  agent_reviews.rental_request_id,
  rental_requests.status as access_status,
  agent_reviews.created_at
from public.agent_reviews
join public.rental_requests on rental_requests.id = agent_reviews.rental_request_id
where rental_requests.status not in ('active', 'stopped', 'expired', 'delivered')
order by agent_reviews.created_at desc
limit 50;

-- 13. Auth users without application profiles.
select
  'auth_users_missing_profiles' as check_name,
  auth.users.id,
  auth.users.email,
  auth.users.created_at,
  auth.users.email_confirmed_at,
  auth.users.last_sign_in_at
from auth.users
left join public.profiles on profiles.id = auth.users.id
where profiles.id is null
order by auth.users.created_at desc
limit 50;

-- 14. Unconfirmed auth users.
select
  'unconfirmed_auth_users' as check_name,
  id,
  email,
  created_at,
  confirmation_sent_at
from auth.users
where email_confirmed_at is null
  and deleted_at is null
order by created_at desc
limit 50;

-- 15. Recent sign-ins for beta monitoring.
select
  'recent_sign_ins' as check_name,
  id,
  email,
  last_sign_in_at
from auth.users
where last_sign_in_at is not null
order by last_sign_in_at desc
limit 50;

-- 16. Paid payments that should have a creator revenue ledger event.
select
  'ledger_missing_payment_paid' as check_name,
  payments.id as payment_id,
  payments.user_id,
  payments.agent_id,
  payments.agent_version_id,
  payments.rental_request_id,
  payments.amount_cents,
  payments.currency,
  payments.status,
  payments.updated_at
from public.payments
left join public.creator_revenue_ledger
  on creator_revenue_ledger.payment_id = payments.id
  and creator_revenue_ledger.event_type = 'payment_paid'
where payments.status in ('paid', 'paid_blocked')
  and creator_revenue_ledger.id is null
order by payments.updated_at desc
limit 50;

-- 17. Active paid accesses that should have an earned ledger event.
select
  'ledger_missing_access_created' as check_name,
  rental_requests.id as rental_request_id,
  rental_requests.user_id,
  rental_requests.agent_id,
  rental_requests.agent_version_id,
  payments.id as payment_id,
  payments.amount_cents,
  payments.currency,
  rental_requests.created_at
from public.rental_requests
join public.payments on payments.rental_request_id = rental_requests.id
left join public.creator_revenue_ledger
  on creator_revenue_ledger.payment_id = payments.id
  and creator_revenue_ledger.event_type = 'access_created'
where rental_requests.status = 'active'
  and payments.status = 'paid'
  and creator_revenue_ledger.id is null
order by rental_requests.created_at desc
limit 50;

-- 18. Revenue ledger blocked events that need support review.
select
  'ledger_blocked_events' as check_name,
  creator_revenue_ledger.id,
  creator_revenue_ledger.creator_id,
  creator_revenue_ledger.agent_id,
  creator_revenue_ledger.payment_id,
  creator_revenue_ledger.rental_request_id,
  creator_revenue_ledger.gross_amount_cents,
  creator_revenue_ledger.currency,
  creator_revenue_ledger.metadata,
  creator_revenue_ledger.created_at
from public.creator_revenue_ledger
where creator_revenue_ledger.status = 'blocked'
order by creator_revenue_ledger.created_at desc
limit 50;

-- 19. Duplicate revenue ledger events by payment/type.
select
  'ledger_duplicate_payment_events' as check_name,
  payment_id,
  event_type,
  count(*) as event_count,
  array_agg(id order by created_at desc) as ledger_ids
from public.creator_revenue_ledger
where payment_id is not null
group by payment_id, event_type
having count(*) > 1
order by event_count desc;

-- 20. Reviewable agents without a final persisted security precheck.
select
  'security_precheck_missing_final' as check_name,
  agents.id as agent_id,
  agents.name,
  agents.slug,
  agents.status,
  agents.active_version_id as agent_version_id,
  latest_precheck.status as latest_precheck_status,
  latest_precheck.created_at as latest_precheck_created_at
from public.agents
left join lateral (
  select
    agent_security_prechecks.status,
    agent_security_prechecks.created_at
  from public.agent_security_prechecks
  where agent_security_prechecks.agent_version_id = agents.active_version_id
  order by agent_security_prechecks.created_at desc
  limit 1
) latest_precheck on true
where agents.status in ('submitted', 'in_review')
  and (
    latest_precheck.status is null
    or latest_precheck.status not in ('passed', 'warning', 'failed')
  )
order by agents.updated_at desc
limit 50;

-- 21. Security prechecks that are stale, errored, or stuck.
select
  'security_precheck_needs_attention' as check_name,
  agent_security_prechecks.id,
  agent_security_prechecks.agent_id,
  agents.name,
  agents.slug,
  agent_security_prechecks.agent_version_id,
  agent_security_prechecks.runtime_type,
  agent_security_prechecks.status,
  agent_security_prechecks.error_code,
  agent_security_prechecks.created_at,
  agent_security_prechecks.completed_at
from public.agent_security_prechecks
join public.agents on agents.id = agent_security_prechecks.agent_id
where agent_security_prechecks.status in ('stale', 'error')
  or (
    agent_security_prechecks.status in ('pending', 'running')
    and agent_security_prechecks.created_at < now() - interval '10 minutes'
  )
order by agent_security_prechecks.created_at desc
limit 50;

-- 22. Final security prechecks that recommend blocking or changes.
select
  'security_precheck_blocking_findings' as check_name,
  agent_security_prechecks.id,
  agent_security_prechecks.agent_id,
  agents.name,
  agents.slug,
  agent_security_prechecks.agent_version_id,
  agent_security_prechecks.runtime_type,
  agent_security_prechecks.status,
  agent_security_prechecks.risk_level_suggested,
  agent_security_prechecks.recommended_action,
  agent_security_prechecks.risk_score,
  agent_security_prechecks.summary,
  agent_security_prechecks.created_at
from public.agent_security_prechecks
join public.agents on agents.id = agent_security_prechecks.agent_id
where agent_security_prechecks.status in ('warning', 'failed')
  and agent_security_prechecks.recommended_action in (
    'block_publication',
    'reject_candidate',
    'request_changes',
    'require_security_review',
    'manual_review'
  )
order by agent_security_prechecks.created_at desc
limit 50;
