-- Allow the AgentHub Code admin review queue to inspect submitted versions
-- before they become an agent's active marketplace version.
grant select on public.agent_versions to authenticated;

alter table public.agent_versions enable row level security;

drop policy if exists "Admins can read all agent versions" on public.agent_versions;

create policy "Admins can read all agent versions"
on public.agent_versions
for select
to authenticated
using (public.is_admin());
