
-- 1. PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. AUTH TRIGGER → auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. EXTEND POSITIONS
ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS isin text,
  ADD COLUMN IF NOT EXISTS geography text,
  ADD COLUMN IF NOT EXISTS name text;

-- Backfill name from company
UPDATE public.positions SET name = company WHERE name IS NULL;

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON public.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_isin ON public.positions(isin);

-- 4. ALERTS
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text,
  isins text[] DEFAULT '{}',
  urgency int NOT NULL DEFAULT 1,
  impact_short_term text,
  impact_long_term text,
  scenario_optimiste jsonb,
  scenario_neutre jsonb,
  scenario_pessimiste jsonb,
  correlations_directes jsonb,
  correlations_indirectes jsonb,
  investor_reaction jsonb,
  is_read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own alerts" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alerts" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own alerts" ON public.alerts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_alerts_user_sent ON public.alerts(user_id, sent_at DESC);

CREATE TRIGGER alerts_set_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
