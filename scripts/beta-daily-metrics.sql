-- AgentHub closed beta daily metrics.
-- Read-only. Run in Supabase SQL editor or a read-only SQL session.

-- 1. Daily funnel proxy.
-- Workspace opens are not tracked as events yet, so active accesses and LLM runs
-- are used as backend-side proxies.
select
  'daily_funnel_proxy' as metric_name,
  day::date,
  coalesce(payments_started, 0) as payments_started,
  coalesce(payments_paid, 0) as payments_paid,
  coalesce(payments_cancelled, 0) as payments_cancelled,
  coalesce(payments_blocked, 0) as payments_blocked,
  coalesce(active_access_created, 0) as active_access_created,
  coalesce(llm_runs_started, 0) as llm_runs_started,
  coalesce(llm_runs_succeeded, 0) as llm_runs_succeeded,
  coalesce(llm_runs_failed, 0) as llm_runs_failed,
  coalesce(reviews_created, 0) as reviews_created
from generate_series(
  date_trunc('day', now() - interval '13 days'),
  date_trunc('day', now()),
  interval '1 day'
) as days(day)
left join (
  select
    date_trunc('day', created_at) as day,
    count(*) as payments_started,
    count(*) filter (where status = 'paid') as payments_paid,
    count(*) filter (where status = 'cancelled') as payments_cancelled,
    count(*) filter (where status = 'paid_blocked') as payments_blocked
  from public.payments
  where created_at >= now() - interval '14 days'
  group by 1
) payment_metrics using (day)
left join (
  select
    date_trunc('day', created_at) as day,
    count(*) filter (where status = 'active') as active_access_created
  from public.rental_requests
  where created_at >= now() - interval '14 days'
  group by 1
) access_metrics using (day)
left join (
  select
    date_trunc('day', created_at) as day,
    count(*) as llm_runs_started,
    count(*) filter (where status = 'succeeded') as llm_runs_succeeded,
    count(*) filter (where status = 'failed') as llm_runs_failed
  from public.agent_runs
  where created_at >= now() - interval '14 days'
  group by 1
) run_metrics using (day)
left join (
  select
    date_trunc('day', created_at) as day,
    count(*) as reviews_created
  from public.agent_reviews
  where created_at >= now() - interval '14 days'
  group by 1
) review_metrics using (day)
order by day desc;

-- 2. Current payment/access states.
select
  'current_payment_access_states' as metric_name,
  payments.status as payment_status,
  rental_requests.status as access_status,
  count(*) as count
from public.payments
left join public.rental_requests on rental_requests.id = payments.rental_request_id
where payments.created_at >= now() - interval '14 days'
group by payments.status, rental_requests.status
order by count desc;

-- 3. Agent-level beta performance.
select
  'agent_beta_performance_14d' as metric_name,
  agents.name,
  agents.slug,
  agents.status,
  count(distinct payments.id) as payments_started,
  count(distinct payments.id) filter (where payments.status = 'paid') as payments_paid,
  count(distinct rental_requests.id) filter (where rental_requests.status = 'active') as active_accesses,
  count(distinct agent_runs.id) as llm_runs,
  count(distinct agent_runs.id) filter (where agent_runs.status = 'succeeded') as llm_runs_succeeded,
  count(distinct agent_runs.id) filter (where agent_runs.status = 'failed') as llm_runs_failed,
  count(distinct agent_reviews.id) as reviews,
  round(avg(agent_reviews.rating)::numeric, 2) as average_rating
from public.agents
left join public.payments on payments.agent_id = agents.id
  and payments.created_at >= now() - interval '14 days'
left join public.rental_requests on rental_requests.agent_id = agents.id
  and rental_requests.created_at >= now() - interval '14 days'
left join public.agent_runs on agent_runs.agent_id = agents.id
  and agent_runs.created_at >= now() - interval '14 days'
left join public.agent_reviews on agent_reviews.agent_id = agents.id
  and agent_reviews.created_at >= now() - interval '14 days'
where agents.status <> 'archived'
group by agents.id, agents.name, agents.slug, agents.status
order by llm_runs_succeeded desc, payments_paid desc, agents.name;

-- 4. Agents with active access but no successful LLM run.
select
  'agents_with_access_no_successful_run_14d' as metric_name,
  agents.name,
  agents.slug,
  count(distinct rental_requests.id) as access_count,
  count(agent_runs.id) filter (where agent_runs.status = 'succeeded') as succeeded_run_count
from public.rental_requests
join public.agents on agents.id = rental_requests.agent_id
left join public.agent_runs on agent_runs.rental_request_id = rental_requests.id
where rental_requests.created_at >= now() - interval '14 days'
  and rental_requests.status in ('active', 'stopped')
  and agents.status <> 'archived'
group by agents.id, agents.name, agents.slug
having count(agent_runs.id) filter (where agent_runs.status = 'succeeded') = 0
order by access_count desc, agents.name;

-- 5. User-level beta activity.
select
  'user_beta_activity_14d' as metric_name,
  profiles.id as user_id,
  profiles.email,
  count(distinct payments.id) as payments_started,
  count(distinct payments.id) filter (where payments.status = 'paid') as payments_paid,
  count(distinct rental_requests.id) as accesses_created,
  count(distinct agent_runs.id) as llm_runs,
  count(distinct agent_runs.id) filter (where agent_runs.status = 'succeeded') as llm_runs_succeeded,
  count(distinct agent_reviews.id) as reviews_created,
  max(greatest(
    coalesce(payments.created_at, 'epoch'::timestamptz),
    coalesce(rental_requests.created_at, 'epoch'::timestamptz),
    coalesce(agent_runs.created_at, 'epoch'::timestamptz),
    coalesce(agent_reviews.created_at, 'epoch'::timestamptz)
  )) as last_activity_at
from public.profiles
left join public.payments on payments.user_id = profiles.id
  and payments.created_at >= now() - interval '14 days'
left join public.rental_requests on rental_requests.user_id = profiles.id
  and rental_requests.created_at >= now() - interval '14 days'
left join public.agent_runs on agent_runs.user_id = profiles.id
  and agent_runs.created_at >= now() - interval '14 days'
left join public.agent_reviews on agent_reviews.user_id = profiles.id
  and agent_reviews.created_at >= now() - interval '14 days'
group by profiles.id, profiles.email
having
  count(distinct payments.id) > 0
  or count(distinct rental_requests.id) > 0
  or count(distinct agent_runs.id) > 0
  or count(distinct agent_reviews.id) > 0
order by last_activity_at desc
limit 100;

-- 6. Open issues that need manual review.
select
  'manual_review_queue' as metric_name,
  source,
  issue_type,
  issue_count,
  details
from (
  select
    'payments' as source,
    'pending_over_30_minutes' as issue_type,
    count(*) as issue_count,
    jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'agent_id', agent_id, 'created_at', created_at) order by created_at desc) as details
  from public.payments
  where status = 'pending'
    and created_at < now() - interval '30 minutes'

  union all

  select
    'payments' as source,
    'paid_without_access' as issue_type,
    count(*) as issue_count,
    jsonb_agg(jsonb_build_object('id', payments.id, 'user_id', payments.user_id, 'agent_id', payments.agent_id, 'created_at', payments.created_at) order by payments.created_at desc) as details
  from public.payments
  left join public.rental_requests on rental_requests.id = payments.rental_request_id
  where payments.status = 'paid'
    and rental_requests.id is null

  union all

  select
    'agent_runs' as source,
    'running_over_10_minutes' as issue_type,
    count(*) as issue_count,
    jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'agent_id', agent_id, 'created_at', created_at) order by created_at desc) as details
  from public.agent_runs
  where status = 'running'
    and created_at < now() - interval '10 minutes'
) review_items
where issue_count > 0
order by source, issue_type;
