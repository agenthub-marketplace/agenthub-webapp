-- 1. Prevent users from changing their own plan via the client.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile (no plan change)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. Hide Tink tokens from client-side SELECTs via column-level privileges.
-- Users keep access to safe metadata only; service role still reads everything.
REVOKE SELECT ON public.broker_connections FROM authenticated, anon;
GRANT SELECT (id, user_id, provider, status, expires_at, credentials_id, created_at, updated_at)
  ON public.broker_connections TO authenticated;