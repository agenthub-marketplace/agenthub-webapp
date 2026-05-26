-- Stripe webhook service-role flow must verify agent status and price snapshots.

grant select on table public.agents to service_role;

