-- Minimal admin read policies for AgentHub Code admin pages.
-- Profiles remain protected from broad table reads; creator email lookup should
-- move through a dedicated SECURITY DEFINER RPC instead of a recursive policy.

grant select on public.creator_profiles to authenticated;
grant select on public.creator_runtime_access to authenticated;
grant select on public.creator_webhook_endpoints to authenticated;
grant select on public.creator_api_endpoints to authenticated;
grant select on public.security_reviews to authenticated;

alter table public.creator_profiles enable row level security;
alter table public.creator_runtime_access enable row level security;
alter table public.creator_webhook_endpoints enable row level security;
alter table public.creator_api_endpoints enable row level security;
alter table public.security_reviews enable row level security;

drop policy if exists "Admins can read all creator profiles" on public.creator_profiles;
create policy "Admins can read all creator profiles"
on public.creator_profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all creator runtime access" on public.creator_runtime_access;
create policy "Admins can read all creator runtime access"
on public.creator_runtime_access
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all creator webhook endpoints" on public.creator_webhook_endpoints;
create policy "Admins can read all creator webhook endpoints"
on public.creator_webhook_endpoints
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all creator api endpoints" on public.creator_api_endpoints;
create policy "Admins can read all creator api endpoints"
on public.creator_api_endpoints
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can read all security reviews" on public.security_reviews;
create policy "Admins can read all security reviews"
on public.security_reviews
for select
to authenticated
using (public.is_admin());
