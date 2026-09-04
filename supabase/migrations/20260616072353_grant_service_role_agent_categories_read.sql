-- Allow server-side/admin manifest generation to resolve agent category labels.
--
-- Public/authenticated client access remains controlled by the existing grants
-- and RLS model. This grant is only for service-role code paths that build
-- review manifests and security prechecks.

grant select on public.agent_categories to service_role;
