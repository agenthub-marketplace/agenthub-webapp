-- AgentHub advanced agents production readiness report.
--
-- Read-only query for Supabase SQL editor or psql against the target database.
-- It checks the three beta advanced agents without mutating any data.

with targets(agent_name, expected_runtime_type) as (
  values
    ('Support Triage Agent', 'workflow_automation'),
    ('Lead Qualification Agent', 'workflow_automation'),
    ('CRM Enrichment API Agent', 'creator_endpoint')
),
target_agents as (
  select
    t.agent_name,
    t.expected_runtime_type,
    a.id as agent_id,
    a.slug,
    a.name,
    a.status as agent_status,
    a.creator_id,
    a.active_version_id as agent_version_id,
    av.runtime_type,
    av.execution_mode,
    av.workspace_mode
  from targets t
  left join lateral (
    select a.*
    from public.agents a
    where lower(a.name) = lower(t.agent_name)
    order by
      case when a.status = 'approved' then 0 else 1 end,
      a.updated_at desc
    limit 1
  ) a on true
  left join public.agent_versions av on av.id = a.active_version_id
),
readiness as (
  select
    ta.*,
    coalesce(rs.enabled, false) as runtime_enabled,
    coalesce(rs.run_enabled, false) as runtime_run_enabled,
    exists (
      select 1
      from public.creator_runtime_access cra
      where cra.creator_id = ta.creator_id
        and cra.runtime_type = ta.expected_runtime_type
        and cra.enabled = true
    ) as creator_allowlisted,
    exists (
      select 1
      from public.agent_version_workflows aw
      where aw.agent_version_id = ta.agent_version_id
        and aw.status = 'approved'
    ) as workflow_approved,
    exists (
      select 1
      from public.agent_version_creator_endpoints ace
      join public.creator_api_endpoints cae on cae.id = ace.endpoint_id
      where ace.agent_version_id = ta.agent_version_id
        and ace.status = 'approved'
        and cae.status = 'approved'
    ) as endpoint_approved,
    exists (
      select 1
      from public.security_reviews sr
      where sr.agent_version_id = ta.agent_version_id
        and sr.runtime_type = ta.expected_runtime_type
        and sr.status in ('passed', 'waived')
    ) as security_review_passed,
    (
      select count(*)
      from public.payments p
      join public.rental_requests rr on rr.id = p.rental_request_id
      where p.agent_id = ta.agent_id
        and p.status = 'paid'
        and rr.status = 'active'
    ) as paid_active_access_count,
    (
      select count(*)
      from public.payments p
      left join public.rental_requests rr on rr.id = p.rental_request_id
      where p.agent_id = ta.agent_id
        and p.status = 'paid'
        and (rr.id is null or rr.status <> 'active')
    ) as paid_without_active_access_count,
    (
      select count(*)
      from public.payments p
      where p.agent_id = ta.agent_id
        and p.status in ('pending', 'paid_blocked')
    ) as payment_watch_count,
    (
      select count(*)
      from public.agent_runs ar
      where ar.agent_id = ta.agent_id
        and ar.status = 'succeeded'
    ) as successful_run_count,
    (
      select count(*)
      from public.agent_runs ar
      where ar.agent_id = ta.agent_id
        and ar.status = 'running'
        and ar.created_at < now() - interval '10 minutes'
    ) as stale_agent_run_count,
    (
      select count(*)
      from public.agent_workflow_runs wr
      where wr.agent_id = ta.agent_id
        and wr.status in ('queued', 'running')
        and wr.created_at < now() - interval '10 minutes'
    ) as stale_workflow_run_count,
    (
      select count(*)
      from public.agent_endpoint_runs er
      where er.agent_id = ta.agent_id
        and er.status = 'running'
        and er.created_at < now() - interval '10 minutes'
    ) as stale_endpoint_run_count,
    (
      select count(*)
      from public.agent_reviews ar
      where ar.agent_id = ta.agent_id
    ) as verified_review_count,
    (
      select count(*)
      from public.creator_revenue_ledger crl
      where crl.agent_id = ta.agent_id
        and crl.event_type = 'access_created'
        and crl.status = 'earned'
    ) as earned_ledger_count
  from target_agents ta
  left join public.agent_runtime_settings rs on rs.runtime_type = ta.expected_runtime_type
)
select
  agent_name,
  slug,
  agent_id,
  agent_version_id,
  expected_runtime_type,
  runtime_type,
  execution_mode,
  workspace_mode,
  agent_status,
  runtime_enabled,
  runtime_run_enabled,
  creator_allowlisted,
  workflow_approved,
  endpoint_approved,
  security_review_passed,
  paid_active_access_count,
  paid_without_active_access_count,
  payment_watch_count,
  successful_run_count,
  verified_review_count,
  earned_ledger_count,
  stale_agent_run_count + stale_workflow_run_count + stale_endpoint_run_count as stale_run_count,
  array_to_string(
    array_remove(
      array[
        case when agent_id is null then 'agent_missing' end,
        case when agent_id is not null and agent_status <> 'approved' then 'agent_not_approved' end,
        case when agent_id is not null and agent_version_id is null then 'active_version_missing' end,
        case when runtime_type is distinct from expected_runtime_type then 'runtime_type_mismatch' end,
        case when execution_mode <> 'llm_prompt' then 'execution_mode_not_llm_prompt' end,
        case when not runtime_enabled then 'runtime_disabled' end,
        case when not runtime_run_enabled then 'runtime_run_disabled' end,
        case when not creator_allowlisted then 'creator_not_allowlisted' end,
        case
          when expected_runtime_type = 'workflow_automation' and not workflow_approved
          then 'workflow_asset_not_approved'
        end,
        case
          when expected_runtime_type = 'creator_endpoint' and not endpoint_approved
          then 'creator_endpoint_not_approved'
        end,
        case when not security_review_passed then 'security_review_missing' end,
        case when paid_active_access_count = 0 then 'no_paid_active_access' end,
        case when paid_without_active_access_count > 0 then 'paid_without_active_access' end,
        case when payment_watch_count > 0 then 'payment_watch_items' end,
        case when successful_run_count = 0 then 'no_successful_run' end,
        case when verified_review_count = 0 then 'no_verified_review' end,
        case when earned_ledger_count = 0 then 'no_earned_ledger' end,
        case when stale_agent_run_count + stale_workflow_run_count + stale_endpoint_run_count > 0 then 'stale_running_run' end
      ],
      null
    ),
    ', '
  ) as blockers
from readiness
order by
  case agent_name
    when 'Support Triage Agent' then 1
    when 'Lead Qualification Agent' then 2
    when 'CRM Enrichment API Agent' then 3
    else 99
  end;
