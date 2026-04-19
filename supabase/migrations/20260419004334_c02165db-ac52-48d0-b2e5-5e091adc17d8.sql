-- 1. Add new columns to alerts
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS sectors text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS impact_position_euros numeric,
  ADD COLUMN IF NOT EXISTS impact_portfolio_percent numeric,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';

-- 2. Repair UTF-8 mojibake on existing rows (latin1 misinterpreted as utf8)
UPDATE public.alerts SET
  title = convert_from(convert_to(title, 'latin1'), 'utf8')
  WHERE title ~ 'Ã'  AND title IS NOT NULL;
UPDATE public.alerts SET
  content = convert_from(convert_to(content, 'latin1'), 'utf8')
  WHERE content ~ 'Ã' AND content IS NOT NULL;
UPDATE public.alerts SET
  impact_short_term = convert_from(convert_to(impact_short_term, 'latin1'), 'utf8')
  WHERE impact_short_term ~ 'Ã' AND impact_short_term IS NOT NULL;
UPDATE public.alerts SET
  impact_long_term = convert_from(convert_to(impact_long_term, 'latin1'), 'utf8')
  WHERE impact_long_term ~ 'Ã' AND impact_long_term IS NOT NULL;

-- 3. alert_reactions table
CREATE TABLE IF NOT EXISTS public.alert_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('conserve', 'renforce', 'vend')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alert_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_reactions_alert ON public.alert_reactions(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_reactions_user ON public.alert_reactions(user_id);

ALTER TABLE public.alert_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reactions"
  ON public.alert_reactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reactions"
  ON public.alert_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reactions"
  ON public.alert_reactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reactions"
  ON public.alert_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Trigger for updated_at
CREATE TRIGGER trg_alert_reactions_updated_at
  BEFORE UPDATE ON public.alert_reactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Aggregated stats function (security definer to bypass RLS for counting)
CREATE OR REPLACE FUNCTION public.get_alert_reaction_stats(_alert_id uuid)
RETURNS TABLE (action text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.action, COUNT(*)::bigint
  FROM public.alert_reactions ar
  JOIN public.alerts a ON a.id = ar.alert_id
  WHERE ar.alert_id = _alert_id
    AND EXISTS (
      SELECT 1 FROM public.positions p
      WHERE p.user_id = ar.user_id
        AND (p.isin = ANY(a.isins) OR p.ticker = ANY(a.isins))
    )
  GROUP BY ar.action;
$$;

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_reactions;