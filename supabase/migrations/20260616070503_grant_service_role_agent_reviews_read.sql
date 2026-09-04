-- Allow server-side/admin jobs to verify review readiness.
--
-- Public and authenticated clients keep their existing column-scoped grants
-- and RLS policies from 0008_agent_review_permissions.sql. This grant is only
-- for service-role code paths such as advanced beta readiness monitoring.

grant select on public.agent_reviews to service_role;
