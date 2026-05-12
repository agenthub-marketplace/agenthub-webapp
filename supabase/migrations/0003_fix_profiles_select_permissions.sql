-- Persist the profile read permission fix used by server-side auth role checks.
--
-- The previous admin-wide profiles policy queried public.profiles from inside a
-- public.profiles policy through public.is_admin(), which can recurse while
-- Postgres evaluates RLS on the same table.
--
-- Authenticated users need both a table-level GRANT and a matching RLS policy:
-- GRANT SELECT allows the operation, and RLS restricts the rows to the user's
-- own profile.
--
-- Admin-wide profile reads should later be implemented through a safe security
-- definer function or trusted server-side flow, not a recursive profiles policy.

drop policy if exists "Admins can read all profiles" on public.profiles;

grant select on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());
