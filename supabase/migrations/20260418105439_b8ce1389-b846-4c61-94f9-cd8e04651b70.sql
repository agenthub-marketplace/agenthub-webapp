-- Positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company TEXT NOT NULL,
  sector TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC,
  current_price NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own positions" ON public.positions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own positions" ON public.positions FOR DELETE USING (auth.uid() = user_id);

-- Broker connections table (Tink)
CREATE TABLE public.broker_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'tink',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  credentials_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own broker conns" ON public.broker_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own broker conns" ON public.broker_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own broker conns" ON public.broker_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own broker conns" ON public.broker_connections FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER broker_conns_updated_at BEFORE UPDATE ON public.broker_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_positions_user ON public.positions(user_id);
CREATE INDEX idx_broker_conns_user ON public.broker_connections(user_id);