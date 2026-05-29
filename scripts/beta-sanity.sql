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
