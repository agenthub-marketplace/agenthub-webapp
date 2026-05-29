-- AgentHub Code document_file runtime beta.
--
-- Non-destructive:
-- - private storage bucket only;
-- - no client-side insert/update/delete permissions;
-- - no public file reads or signed URL policies;
-- - document_file remains disabled by runtime settings until explicitly enabled.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-documents',
  'agent-documents',
  false,
  3500000,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.agent_run_files (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  rental_request_id uuid not null references public.rental_requests(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_version_id uuid not null references public.agent_versions(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'agent-documents',
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'uploaded',
  extracted_text text,
  extraction_error text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_run_files_status_check check (status in ('uploaded', 'extracting', 'extracted', 'failed', 'expired')),
  constraint agent_run_files_size_bytes_check check (size_bytes > 0),
  constraint agent_run_files_mime_type_check check (
    mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  constraint agent_run_files_storage_unique unique (storage_bucket, storage_path)
);

drop trigger if exists agent_run_files_set_updated_at on public.agent_run_files;
create trigger agent_run_files_set_updated_at
before update on public.agent_run_files
for each row
execute function public.set_updated_at();

create index if not exists agent_run_files_user_idx
on public.agent_run_files(user_id);

create index if not exists agent_run_files_rental_idx
on public.agent_run_files(rental_request_id);

create index if not exists agent_run_files_run_idx
on public.agent_run_files(agent_run_id);

create index if not exists agent_run_files_status_idx
on public.agent_run_files(status);

create index if not exists agent_run_files_expires_at_idx
on public.agent_run_files(expires_at);

alter table public.agent_run_files enable row level security;

revoke all on public.agent_run_files from anon, authenticated;

grant select (
  id,
  agent_run_id,
  rental_request_id,
  agent_id,
  agent_version_id,
  user_id,
  original_filename,
  mime_type,
  size_bytes,
  status,
  extraction_error,
  expires_at,
  created_at,
  updated_at
) on public.agent_run_files to authenticated;

grant select, insert, update, delete on public.agent_run_files to service_role;

drop policy if exists "Users can read their own agent run file metadata" on public.agent_run_files;
create policy "Users can read their own agent run file metadata"
on public.agent_run_files
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read agent run file metadata" on public.agent_run_files;
create policy "Admins can read agent run file metadata"
on public.agent_run_files
for select
to authenticated
using (public.is_admin());
