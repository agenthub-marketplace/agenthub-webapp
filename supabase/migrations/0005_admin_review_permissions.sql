-- Persist permissions required by the beta admin review workflow.
--
-- Admin users can update agent statuses through RLS on public.agents already.
-- This migration adds the missing write access for review decisions and audit
-- entries so admin server actions can persist approval/rejection history.

grant insert on public.admin_reviews to authenticated;
grant insert on public.audit_logs to authenticated;

alter table public.admin_reviews enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Admins can insert admin reviews" on public.admin_reviews;
drop policy if exists "Admins can insert audit logs" on public.audit_logs;

create policy "Admins can insert admin reviews"
on public.admin_reviews
for insert
to authenticated
with check (
  public.is_admin()
  and admin_id = auth.uid()
);

create policy "Admins can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (
  public.is_admin()
  and actor_id = auth.uid()
);
