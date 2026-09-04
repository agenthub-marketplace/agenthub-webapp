-- Allow server-only admin console loaders to join creator profiles with account emails.
-- RLS still protects browser/client access; this grant is only usable with the
-- server-side service role key.
grant select on table public.creator_profiles to service_role;
grant select on table public.profiles to service_role;
