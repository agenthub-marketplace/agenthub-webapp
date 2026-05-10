# Draft Database Schema

This is a draft SQL-like schema for Supabase PostgreSQL. It is not a migration yet.

```sql
create type user_role as enum ('user', 'creator', 'admin');
create type agent_status as enum (
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'suspended'
);
create type pricing_type as enum ('task', 'duration', 'project');
create type order_status as enum (
  'pending_payment',
  'paid',
  'in_progress',
  'completed',
  'failed',
  'refunded',
  'disputed',
  'cancelled'
);

create table profiles (
  id uuid primary key references auth.users(id),
  email text not null,
  display_name text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  public_name text not null,
  bio text,
  website_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creator_profiles(id),
  category_id uuid references agent_categories(id),
  slug text not null unique,
  name text not null,
  summary text not null,
  description text not null,
  status agent_status not null default 'draft',
  pricing_type pricing_type not null,
  starting_price_cents integer,
  currency text not null default 'eur',
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  version integer not null,
  endpoint_url text,
  capabilities text[] not null default '{}',
  deliverables text[] not null default '{}',
  changelog text,
  validation_notes text,
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  user_id uuid not null references profiles(id),
  creator_id uuid not null references creator_profiles(id),
  status order_status not null default 'pending_payment',
  pricing_type pricing_type not null,
  amount_cents integer not null,
  currency text not null default 'eur',
  task_brief text not null,
  deliverable_url text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  agent_id uuid not null references agents(id),
  status text not null,
  gateway_request_id text,
  input_summary text,
  output_summary text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  order_id uuid not null references orders(id),
  user_id uuid not null references profiles(id),
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (order_id, user_id)
);

create table admin_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  agent_version_id uuid references agent_versions(id),
  admin_id uuid not null references profiles(id),
  decision agent_status not null,
  notes text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

Row-level security policies should be added with the first real Supabase migration.
