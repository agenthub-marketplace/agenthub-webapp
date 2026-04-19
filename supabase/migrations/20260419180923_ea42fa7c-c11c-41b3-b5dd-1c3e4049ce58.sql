ALTER TABLE public.alert_reactions DROP CONSTRAINT IF EXISTS alert_reactions_action_check;
ALTER TABLE public.alert_reactions
  ADD CONSTRAINT alert_reactions_action_check
  CHECK (action = ANY (ARRAY['conserve'::text, 'renforce'::text, 'vend'::text, 'rien'::text]));