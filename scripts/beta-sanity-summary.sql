-- AgentHub closed beta sanity summary.
-- Read-only aggregate counters. Safe to run on production.

with expected_agents(name) as (
  values
    ('LinkedIn Content Studio'),
    ('Sales Email Builder'),
    ('Text Rewrite Assistant'),
    ('Business SWOT Analyst'),
    ('Meeting Notes Checklist')
),
candidate_agents as (
  select
    expected_agents.name,
    agents.id,
    agents.status,
    agents.starting_price_cents,
    agents.risk_level,
    agent_versions.execution_mode,
    agent_versions.output_promise,
    agent_versions.deliverables,
    agent_versions.limitations,
    agent_versions.data_policy,
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
    ) as ready_for_closed_beta,
    row_number() over (
      partition by expected_agents.name
      order by
        (agents.status = 'approved') desc,
        agents.updated_at desc nulls last,
        agents.created_at desc nulls last
    ) as template_rank
  from expected_agents
  left join public.agents on agents.name = expected_agents.name
    and agents.status <> 'archived'
  left join public.agent_versions on agent_versions.id = agents.active_version_id
),
expected_readiness as (
  select *
  from candidate_agents
  where template_rank = 1
),
duplicate_expected_templates as (
  select expected_agents.name
  from expected_agents
  join public.agents on agents.name = expected_agents.name
    and agents.status <> 'archived'
  group by expected_agents.name
  having count(*) > 1
),
duplicate_open_payments as (
  select user_id, agent_id
  from public.payments
  where status = 'pending'
  group by user_id, agent_id
  having count(*) > 1
),
duplicate_active_access as (
  select user_id, agent_id
  from public.rental_requests
  where status = 'active'
  group by user_id, agent_id
  having count(*) > 1
),
duplicate_reviews as (
  select rental_request_id
  from public.agent_reviews
  group by rental_request_id
  having count(*) > 1
)
select 'expected_agents_total' as check_name, count(*)::int as count
from expected_readiness
union all
select 'expected_agents_present', count(*)::int
from expected_readiness
where id is not null
union all
select 'expected_agents_approved', count(*)::int
from expected_readiness
where status = 'approved'
union all
select 'expected_agents_ready_for_closed_beta', count(*)::int
from expected_readiness
where ready_for_closed_beta
union all
select 'duplicate_expected_template_groups', count(*)::int
from duplicate_expected_templates
union all
select 'old_pending_payments', count(*)::int
from public.payments
where status = 'pending'
  and created_at < now() - interval '30 minutes'
union all
select 'paid_without_access', count(*)::int
from public.payments
left join public.rental_requests on rental_requests.id = payments.rental_request_id
where payments.status = 'paid'
  and rental_requests.id is null
union all
select 'duplicate_open_payment_groups', count(*)::int
from duplicate_open_payments
union all
select 'duplicate_active_access_groups', count(*)::int
from duplicate_active_access
union all
select 'recent_failed_agent_runs_24h', count(*)::int
from public.agent_runs
where status = 'failed'
  and created_at >= now() - interval '24 hours'
union all
select 'stale_running_agent_runs', count(*)::int
from public.agent_runs
where status = 'running'
  and created_at < now() - interval '10 minutes'
union all
select 'duplicate_review_groups', count(*)::int
from duplicate_reviews
union all
select 'reviews_on_invalid_access', count(*)::int
from public.agent_reviews
join public.rental_requests on rental_requests.id = agent_reviews.rental_request_id
where rental_requests.status not in ('active', 'stopped', 'expired', 'delivered')
union all
select 'auth_users_missing_profiles', count(*)::int
from auth.users
left join public.profiles on profiles.id = auth.users.id
where profiles.id is null
union all
select 'unconfirmed_auth_users', count(*)::int
from auth.users
where email_confirmed_at is null
  and deleted_at is null;
