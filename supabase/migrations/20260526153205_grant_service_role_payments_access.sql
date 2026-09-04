-- Ensure server-side Stripe flow can write payment/access records with service_role.
-- This is intentionally narrow and keeps anon/authenticated locked down.

grant select, insert, update on table public.payments to service_role;
grant select, insert, update on table public.rental_requests to service_role;
