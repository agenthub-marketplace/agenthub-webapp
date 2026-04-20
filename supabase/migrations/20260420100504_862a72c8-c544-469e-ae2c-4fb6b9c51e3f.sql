ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS exchange text,
  ADD COLUMN IF NOT EXISTS asset_type text;

CREATE INDEX IF NOT EXISTS idx_positions_exchange ON public.positions (exchange);
CREATE INDEX IF NOT EXISTS idx_positions_asset_type ON public.positions (asset_type);