-- LLM Runner v0.
--
-- Text-only execution history for workspace actions. Runs are created and
-- finalized by server-side service-role code only; authenticated users can
-- only read their own runs.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  rental_request_id uuid not null references public.rental_requests(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  agent_version_id uuid not null references public.agent_versions(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_key text not null,
  action_label text not null,
  input_text text not null,
  prompt_snapshot jsonb not null,
  output_text text,
  status text not null default 'running',
  error_code text,
  provider text not null default 'openai',
  model text not null,
  input_chars integer not null,
  output_chars integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_runs_status_check check (status in ('running', 'succeeded', 'failed')),
  constraint agent_runs_input_text_check check (char_length(input_text) between 3 and 4000),
  constraint agent_runs_output_text_check check (output_text is null or char_length(output_text) <= 12000),
  constraint agent_runs_input_chars_check check (input_chars between 3 and 4000),
  constraint agent_runs_output_chars_check check (output_chars is null or output_chars between 0 and 12000),
  constraint agent_runs_token_counts_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (total_tokens is null or total_tokens >= 0)
  )
);

create index if not exists agent_runs_user_created_idx
on public.agent_runs(user_id, created_at desc);

create index if not exists agent_runs_rental_created_idx
on public.agent_runs(rental_request_id, created_at desc);

create index if not exists agent_runs_status_idx
on public.agent_runs(status);

create unique index if not exists agent_runs_one_running_per_user_rental_idx
on public.agent_runs(user_id, rental_request_id)
where status = 'running';

alter table public.agent_runs enable row level security;

grant select on public.agent_versions to service_role;
grant select on public.admin_reviews to service_role;

revoke all on public.agent_runs from anon, authenticated;

grant select (
  id,
  rental_request_id,
  agent_id,
  agent_version_id,
  user_id,
  action_key,
  action_label,
  input_text,
  output_text,
  status,
  error_code,
  created_at,
  completed_at
) on public.agent_runs to authenticated;
grant select, insert, update, delete on public.agent_runs to service_role;

drop policy if exists "Users can read their own agent runs" on public.agent_runs;
create policy "Users can read their own agent runs"
on public.agent_runs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read all agent runs" on public.agent_runs;
create policy "Admins can read all agent runs"
on public.agent_runs
for select
to authenticated
using (public.is_admin());
