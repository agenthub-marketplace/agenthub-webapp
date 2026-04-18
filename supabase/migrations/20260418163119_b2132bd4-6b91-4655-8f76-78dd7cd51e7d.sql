-- Explicitly deny INSERT, UPDATE, DELETE on subscriptions for authenticated/anon users.
-- Service role bypasses RLS, so the Stripe webhook continues to work.

CREATE POLICY "Deny client inserts on subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client updates on subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client deletes on subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated, anon
USING (false);