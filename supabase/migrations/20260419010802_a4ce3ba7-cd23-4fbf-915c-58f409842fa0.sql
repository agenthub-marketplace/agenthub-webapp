ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS resume_fr text,
  ADD COLUMN IF NOT EXISTS impact_short_term_pct numeric,
  ADD COLUMN IF NOT EXISTS impact_long_term_pct numeric;