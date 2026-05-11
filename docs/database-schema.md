# Beta Database Schema

This document mirrors the first Supabase beta migration in `supabase/migrations/0001_beta_schema.sql`. The schema uses UUID primary keys, check constraints for beta enums, indexes for common access paths, and baseline row-level security.

## Core status values

```sql
-- roles
'user', 'creator', 'admin'

-- agent statuses
'draft', 'submitted', 'in_review', 'approved', 'rejected', 'suspended'

-- rental request statuses
'pending', 'accepted', 'in_progress', 'delivered', 'rejected', 'cancelled'

-- risk levels
'low', 'medium', 'high', 'forbidden_beta'

-- beta pricing types
'task', 'project'
```

## Tables

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role in ('user', 'creator', 'admin'))
);

create table creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  public_name text not null,
  bio text,
  website_url text,
  verification_notes text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creator_profiles(id) on delete cascade,
  category_id uuid references agent_categories(id) on delete set null,
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
  updated_at timestamptz not null default now()
);

create table agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
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
  unique (agent_id, version_number)
);

create table rental_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete restrict,
  user_id uuid not null references profiles(id) on delete cascade,
  creator_id uuid not null references creator_profiles(id) on delete restrict,
  status text not null default 'pending',
  pricing_type text not null,
  quoted_price_cents integer,
  currency text not null default 'eur',
  request_brief text not null,
  required_inputs jsonb not null default '{}'::jsonb,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rental_results (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null unique references rental_requests(id) on delete cascade,
  delivered_by uuid references profiles(id) on delete set null,
  summary text not null,
  deliverable_url text,
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  rental_request_id uuid not null unique references rental_requests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table admin_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  agent_version_id uuid references agent_versions(id) on delete set null,
  admin_id uuid not null references profiles(id) on delete restrict,
  decision text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## Indexes

```sql
create index profiles_role_idx on profiles(role);
create index agents_status_idx on agents(status);
create index agents_slug_idx on agents(slug);
create index agents_category_id_idx on agents(category_id);
create index agents_creator_id_idx on agents(creator_id);
create index rental_requests_user_id_idx on rental_requests(user_id);
create index rental_requests_agent_id_idx on rental_requests(agent_id);
create index agent_reviews_agent_id_idx on agent_reviews(agent_id);
```

## RLS baseline

- Public users can read approved agents and their active public versions.
- Authenticated users can read and update their own profile, but non-admins cannot change roles.
- Creators can read and manage their own draft/submitted/rejected agents and versions.
- Admins can read and update all agents, profiles, creator profiles, and rental requests.
- Users can read their own rental requests.
- Additional write policies for rental requests, results, reviews, admin reviews, and audit logs are intentionally deferred until the corresponding workflows are implemented.

## Beta safety notes

The beta is a curated marketplace. Agents must be manually reviewed before marketplace approval. The schema stores `risk_level` so admins can keep high-risk and forbidden-beta listings out of public discovery. AgentHub does not execute arbitrary creator code in beta.
