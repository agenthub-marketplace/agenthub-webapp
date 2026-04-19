
-- 1. Add long-term scenario columns
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS scenario_optimiste_lt jsonb,
  ADD COLUMN IF NOT EXISTS scenario_neutre_lt jsonb,
  ADD COLUMN IF NOT EXISTS scenario_pessimiste_lt jsonb;

-- 2. Fix reaction stats: when alert has no isins, count ALL reactions.
CREATE OR REPLACE FUNCTION public.get_alert_reaction_stats(_alert_id uuid)
RETURNS TABLE(action text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ar.action, COUNT(*)::bigint
  FROM public.alert_reactions ar
  JOIN public.alerts a ON a.id = ar.alert_id
  WHERE ar.alert_id = _alert_id
    AND (
      -- broadcast alert (no tags) → count all reactions
      COALESCE(array_length(a.isins, 1), 0) = 0
      OR EXISTS (
        SELECT 1 FROM public.positions p
        WHERE p.user_id = ar.user_id
          AND (p.isin = ANY(a.isins) OR p.ticker = ANY(a.isins))
      )
    )
  GROUP BY ar.action;
$$;
