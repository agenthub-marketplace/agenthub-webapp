-- Allow admins to archive suspended agents without deleting linked payments,
-- accesses, reviews, versions, or audit history.
alter table public.agents
drop constraint if exists agents_status_check;

alter table public.agents
add constraint agents_status_check check (
  status in ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'suspended', 'archived')
);
