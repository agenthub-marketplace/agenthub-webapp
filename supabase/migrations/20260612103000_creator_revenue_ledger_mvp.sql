-- Creator revenue ledger MVP.
--
-- This is an additive, server-written audit layer for future creator payouts.
-- It does not enable Stripe Connect, payouts, refunds, or creator withdrawals.

create table if not exists public.creator_revenue_ledger (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete restrict,
  agent_id uuid not null references public.agents(id) on delete restrict,
  agent_version_id uuid references public.agent_versions(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict,
  rental_request_id uuid references public.rental_requests(id) on delete restrict,
  event_type text not null,
  status text not null,
  gross_amount_cents integer not null default 0,
  platform_fee_cents integer,
  creator_gross_cents integer,
  creator_net_cents integer,
  currency text not null default 'eur',
  hold_until timestamptz,
  payout_ready_at timestamptz,
  payout_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint creator_revenue_ledger_event_type_check check (
    event_type in (
      'payment_paid',
      'access_created',
      'activation_blocked',
      'access_stopped',
      'payout_hold_created',
      'payout_ready'
    )
  ),
  constraint creator_revenue_ledger_status_check check (
    status in (
      'pending_access',
      'blocked',
      'earned',
      'hold',
      'payout_ready',
      'paid_out',
      'refunded',
      'cancelled'
    )
  ),
  constraint creator_revenue_ledger_amounts_check check (
    gross_amount_cents >= 0
    and (platform_fee_cents is null or platform_fee_cents >= 0)
    and (creator_gross_cents is null or creator_gross_cents >= 0)
    and (creator_net_cents is null or creator_net_cents >= 0)
  ),
  constraint creator_revenue_ledger_money_events_payment_check check (
    event_type not in ('payment_paid', 'access_created', 'activation_blocked', 'payout_hold_created', 'payout_ready')
    or payment_id is not null
  ),
  constraint creator_revenue_ledger_access_events_rental_check check (
    event_type not in ('access_created', 'access_stopped', 'payout_hold_created', 'payout_ready')
    or rental_request_id is not null
  )
);

create unique index if not exists creator_revenue_ledger_payment_event_idx
on public.creator_revenue_ledger(payment_id, event_type);

create unique index if not exists creator_revenue_ledger_earned_payment_idx
on public.creator_revenue_ledger(payment_id)
where event_type = 'access_created';

create index if not exists creator_revenue_ledger_creator_created_idx
on public.creator_revenue_ledger(creator_id, created_at desc);

create index if not exists creator_revenue_ledger_agent_created_idx
on public.creator_revenue_ledger(agent_id, created_at desc);

create index if not exists creator_revenue_ledger_payment_idx
on public.creator_revenue_ledger(payment_id);

create index if not exists creator_revenue_ledger_rental_request_idx
on public.creator_revenue_ledger(rental_request_id);

create index if not exists creator_revenue_ledger_status_idx
on public.creator_revenue_ledger(status);

alter table public.creator_revenue_ledger enable row level security;

revoke all on public.creator_revenue_ledger from anon, authenticated;
grant select, insert, update on public.creator_revenue_ledger to service_role;
