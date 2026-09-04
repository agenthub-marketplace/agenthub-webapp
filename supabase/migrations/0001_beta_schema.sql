-- AgentHub beta schema foundation.
-- Scope: core tables, check constraints, indexes, and baseline RLS policies.
-- Seed data and application auth helpers are planned as follow-up steps.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('user', 'creator', 'admin'))
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  public_name text not null,
  bio text,
  website_url text,
  verification_notes text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger creator_profiles_set_updated_at
before update on public.creator_profiles
for each row
execute function public.set_updated_at();

create table public.agent_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger agent_categories_set_updated_at
before update on public.agent_categories
for each row
execute function public.set_updated_at();

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  category_id uuid references public.agent_categories(id) on delete set null,
  active_version_id uuid,
  slug text not null unique,
  name text not null,
  summary text not null,
  description text not null,
  status text not null default 'draft',
  pricing_type text not null,
  starting_price_cents integer,
  currency text not null default 'eur',
  risk_level text not null default 'medium',
  estimated_turnaround text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_status_check check (
    status in ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'suspended')
  ),
  constraint agents_pricing_type_check check (pricing_type in ('task', 'project')),
  constraint agents_risk_level_check check (
    risk_level in ('low', 'medium', 'high', 'forbidden_beta')
  ),
  constraint agents_starting_price_cents_check check (
    starting_price_cents is null or starting_price_cents >= 0
  ),
  unique (id, creator_id)
);

create trigger agents_set_updated_at
before update on public.agents
for each row
execute function public.set_updated_at();

create table public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  version_number integer not null,
  endpoint_url text,
  model_notes text,
  capabilities text[] not null default '{}',
  required_inputs text[] not null default '{}',
  deliverables text[] not null default '{}',
  limitations text[] not null default '{}',
  data_handling_notes text,
  changelog text,
  created_at timestamptz not null default now(),
  constraint agent_versions_version_number_check check (version_number > 0),
  unique (agent_id, version_number),
  unique (agent_id, id)
);

alter table public.agents
add constraint agents_active_version_id_fkey
foreign key (id, active_version_id)
references public.agent_versions(agent_id, id)
on delete set null (active_version_id);

create table public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete restrict,
  status text not null default 'pending',
  pricing_type text not null,
  quoted_price_cents integer,
  currency text not null default 'eur',
  request_brief text not null,
  required_inputs jsonb not null default '{}'::jsonb,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_requests_status_check check (
    status in ('pending', 'accepted', 'in_progress', 'delivered', 'rejected', 'cancelled')
  ),
  constraint rental_requests_pricing_type_check check (pricing_type in ('task', 'project')),
  constraint rental_requests_quoted_price_cents_check check (
    quoted_price_cents is null or quoted_price_cents >= 0
  ),
  unique (id, agent_id, user_id),
  foreign key (agent_id, creator_id)
    references public.agents(id, creator_id)
    on delete restrict
);

create trigger rental_requests_set_updated_at
before update on public.rental_requests
for each row
execute function public.set_updated_at();

create table public.rental_results (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null unique references public.rental_requests(id) on delete cascade,
  delivered_by uuid references public.profiles(id) on delete set null,
  summary text not null,
  deliverable_url text,
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rental_results_set_updated_at
before update on public.rental_results
for each row
execute function public.set_updated_at();

create table public.agent_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  rental_request_id uuid not null unique references public.rental_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null,
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_reviews_rating_check check (rating between 1 and 5),
  foreign key (rental_request_id, agent_id, user_id)
    references public.rental_requests(id, agent_id, user_id)
    on delete cascade
);

create trigger agent_reviews_set_updated_at
before update on public.agent_reviews
for each row
execute function public.set_updated_at();

create table public.admin_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid references public.agent_versions(id) on delete set null,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null,
  risk_level text not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint admin_reviews_decision_check check (
    decision in ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'suspended')
  ),
  constraint admin_reviews_risk_level_check check (
    risk_level in ('low', 'medium', 'high', 'forbidden_beta')
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index agents_status_idx on public.agents(status);
create index agents_slug_idx on public.agents(slug);
create index agents_category_id_idx on public.agents(category_id);
create index agents_creator_id_idx on public.agents(creator_id);
create index rental_requests_user_id_idx on public.rental_requests(user_id);
create index rental_requests_agent_id_idx on public.rental_requests(agent_id);
create index agent_reviews_agent_id_idx on public.agent_reviews(agent_id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_profile_sensitive_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- RLS restricts which rows a client can update, not which columns in that row.
  -- These profile fields are server-controlled and must not be changed by direct
  -- client updates. Future role changes must go through a secure admin/server-side
  -- flow, not a direct client update against public.profiles.
  if current_user not in ('postgres', 'supabase_admin')
    and auth.role() is distinct from 'service_role'
    and (
      new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.created_at is distinct from old.created_at
    )
  then
    raise exception 'Sensitive profile fields are server-controlled' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_sensitive_field_change
before update on public.profiles
for each row
execute function public.prevent_profile_sensitive_field_change();

create or replace function public.prevent_non_admin_creator_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.verified_at is distinct from old.verified_at
    or new.verification_notes is distinct from old.verification_notes
  ) and current_user not in ('postgres', 'supabase_admin')
    and auth.role() is distinct from 'service_role'
    and not public.is_admin()
  then
    raise exception 'Only admins can change creator verification fields' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger creator_profiles_prevent_non_admin_verification_change
before update on public.creator_profiles
for each row
execute function public.prevent_non_admin_creator_verification_change();

create or replace function public.is_creator_for_agent(target_agent_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.agents a
    join public.creator_profiles cp on cp.id = a.creator_id
    where a.id = target_agent_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function public.owns_agent(target_agent_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.agents a
    join public.creator_profiles cp on cp.id = a.creator_id
    where a.id = target_agent_id
      and cp.user_id = auth.uid()
  );
$$;

create or replace function public.owns_creator_profile(target_creator_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.creator_profiles
    where id = target_creator_id
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.agent_categories enable row level security;
alter table public.agents enable row level security;
alter table public.agent_versions enable row level security;
alter table public.rental_requests enable row level security;
alter table public.rental_results enable row level security;
alter table public.agent_reviews enable row level security;
alter table public.admin_reviews enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can update all profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read categories"
on public.agent_categories
for select
to anon, authenticated
using (true);

create policy "Creators can read their own creator profile"
on public.creator_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "Creators can update their own creator profile"
on public.creator_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can read all creator profiles"
on public.creator_profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can update all creator profiles"
on public.creator_profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read approved agents"
on public.agents
for select
to anon, authenticated
using (status = 'approved');

create policy "Creators can read their own agents"
on public.agents
for select
to authenticated
using (public.is_creator_for_agent(id));

create policy "Creators can insert their own agents"
on public.agents
for insert
to authenticated
with check (
  public.owns_creator_profile(creator_id)
  and status in ('draft', 'submitted')
);

create policy "Creators can update their own agents"
on public.agents
for update
to authenticated
using (
  public.is_creator_for_agent(id)
  and status in ('draft', 'submitted', 'rejected')
)
with check (
  public.owns_creator_profile(creator_id)
  and status in ('draft', 'submitted')
);

create policy "Creators can delete their own draft agents"
on public.agents
for delete
to authenticated
using (
  status = 'draft'
  and public.is_creator_for_agent(id)
);

create policy "Admins can read all agents"
on public.agents
for select
to authenticated
using (public.is_admin());

create policy "Admins can update all agents"
on public.agents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read approved agent versions"
on public.agent_versions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.status = 'approved'
      and a.active_version_id = public.agent_versions.id
  )
);

create policy "Creators can read their own agent versions"
on public.agent_versions
for select
to authenticated
using (public.is_creator_for_agent(agent_id));

create policy "Creators can insert their own agent versions"
on public.agent_versions
for insert
to authenticated
with check (
  public.owns_agent(agent_id)
  and exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.status in ('draft', 'submitted', 'rejected')
  )
);

create policy "Creators can update their own agent versions"
on public.agent_versions
for update
to authenticated
using (
  public.owns_agent(agent_id)
  and exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.status in ('draft', 'submitted', 'rejected')
  )
)
with check (
  public.owns_agent(agent_id)
  and exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.status in ('draft', 'submitted', 'rejected')
  )
);

create policy "Creators can delete their own agent versions"
on public.agent_versions
for delete
to authenticated
using (
  public.owns_agent(agent_id)
  and exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.status in ('draft', 'rejected')
  )
);

create policy "Admins can read all agent versions"
on public.agent_versions
for select
to authenticated
using (public.is_admin());

create policy "Admins can update all agent versions"
on public.agent_versions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read their own rental requests"
on public.rental_requests
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can read all rental requests"
on public.rental_requests
for select
to authenticated
using (public.is_admin());

-- TODO: Add creator rental request read/update policies once the creator
-- fulfillment workflow is implemented.
-- TODO: Add safe insert policies for rental_requests once request validation,
-- pricing acceptance, and payment boundaries are specified.
-- TODO: Add policies for rental_results, agent_reviews, admin_reviews, and
-- audit_logs when their write paths are implemented.
