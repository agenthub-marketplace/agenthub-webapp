create table if not exists public.user_onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  primary_goal text null,
  main_domain text null,
  preferred_help_types jsonb not null default '[]'::jsonb,
  preferred_outputs jsonb not null default '[]'::jsonb,
  guidance_level text null,
  preferred_language text null,
  onboarding_completed_at timestamptz null,
  onboarding_skipped_at timestamptz null,
  tutorial_completed_at timestamptz null,
  tutorial_skipped_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_onboarding_profiles_set_updated_at on public.user_onboarding_profiles;
create trigger user_onboarding_profiles_set_updated_at
before update on public.user_onboarding_profiles
for each row
execute function public.set_updated_at();

alter table public.user_onboarding_profiles enable row level security;

revoke all on public.user_onboarding_profiles from anon, authenticated;

grant select (
  id,
  user_id,
  primary_goal,
  main_domain,
  preferred_help_types,
  preferred_outputs,
  guidance_level,
  preferred_language,
  onboarding_completed_at,
  onboarding_skipped_at,
  tutorial_completed_at,
  tutorial_skipped_at,
  created_at,
  updated_at
) on public.user_onboarding_profiles to authenticated;

grant insert (
  user_id,
  primary_goal,
  main_domain,
  preferred_help_types,
  preferred_outputs,
  guidance_level,
  preferred_language,
  onboarding_completed_at,
  onboarding_skipped_at,
  tutorial_completed_at,
  tutorial_skipped_at
) on public.user_onboarding_profiles to authenticated;

grant update (
  primary_goal,
  main_domain,
  preferred_help_types,
  preferred_outputs,
  guidance_level,
  preferred_language,
  onboarding_completed_at,
  onboarding_skipped_at,
  tutorial_completed_at,
  tutorial_skipped_at,
  updated_at
) on public.user_onboarding_profiles to authenticated;

drop policy if exists "Users can read own onboarding profile" on public.user_onboarding_profiles;
drop policy if exists "Users can insert own onboarding profile" on public.user_onboarding_profiles;
drop policy if exists "Users can update own onboarding profile" on public.user_onboarding_profiles;

create policy "Users can read own onboarding profile"
on public.user_onboarding_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'user'
  )
);

create policy "Users can insert own onboarding profile"
on public.user_onboarding_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'user'
  )
);

create policy "Users can update own onboarding profile"
on public.user_onboarding_profiles
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'user'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'user'
  )
);
