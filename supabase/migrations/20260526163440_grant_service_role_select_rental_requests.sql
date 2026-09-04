-- Stripe webhook service-role flow needs read access on rental_requests
-- for idempotency and duplicate-access checks.

grant select on table public.rental_requests to service_role;

