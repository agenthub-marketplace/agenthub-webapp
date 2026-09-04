-- Harden creator-facing rental privacy.
--
-- The direct-access beta model does not require creators to read raw user
-- request/workspace rows. Keep user-owned rental reads intact, but remove
-- creator RLS access to rental_requests and legacy rental_results so user
-- private briefs, inputs, and deliverables are not exposed through the Data API.

drop policy if exists "Creators can read their own rental requests" on public.rental_requests;
drop policy if exists "Creators can read their own rental results" on public.rental_results;
