-- ============================================================================
-- Phase 5 — Monetization
-- Source: CONTEXT/POKECARD_PH_PHASE5_MONETIZATION.md
--
-- billing_tiers, vendor_gmv_history and vendor_monthly_billing already exist
-- as empty shells from 0001, so this is largely additive.
-- ============================================================================

-- ---- trial tracking on shops --------------------------------------------

alter table shops add column if not exists trial_ends_at timestamptz;
alter table shops add column if not exists trial_gmv_cap numeric default 5000;
alter table shops add column if not exists trial_gmv_used numeric default 0;
alter table shops add column if not exists onboarded_at timestamptz;
alter table shops add column if not exists billing_status text default 'trial';

do $$ begin
  alter table shops add constraint shops_billing_status_check
    check (billing_status in ('trial','active','past_due','restricted'));
exception when duplicate_object then null; end $$;

-- Existing shops predate the trial system; start their clock now rather than
-- leaving them in a null state the billing jobs can't reason about.
update shops
   set onboarded_at = coalesce(onboarded_at, joined_at, now()),
       trial_ends_at = coalesce(trial_ends_at, coalesce(joined_at, now()) + interval '60 days')
 where trial_ends_at is null;

-- ---- config --------------------------------------------------------------
-- Editable rows, not constants: retuning pricing must not need a redeploy.

create table if not exists billing_config (
  key text primary key,
  value numeric not null
);

insert into billing_config (key, value) values
  ('growth_threshold', 0.25),
  ('growth_surcharge_rate', 0.02)
on conflict (key) do nothing;

create table if not exists vendor_payouts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  amount numeric not null,
  method text check (method in ('gcash','maya','bank_transfer')),
  status text default 'pending' check (status in ('pending','processing','completed','failed')),
  reference_id text,
  period_start date,
  period_end date,
  created_at timestamptz default now()
);
create index if not exists vendor_payouts_shop_idx on vendor_payouts(shop_id);

-- 0001's check has no 'waived_trial', which the invoicer needs for shops
-- still inside their trial window.
alter table vendor_monthly_billing drop constraint if exists vendor_monthly_billing_status_check;
alter table vendor_monthly_billing add constraint vendor_monthly_billing_status_check
  check (status in ('pending','waived_trial','invoiced','paid','overdue'));
alter table vendor_monthly_billing add column if not exists invoice_url text;
alter table vendor_monthly_billing add column if not exists paid_at timestamptz;

-- ---- the tier ladder -----------------------------------------------------

insert into billing_tiers (min_gmv, max_gmv, base_fee, overage_rate)
select * from (values
  (0,      5000,   275,   0),
  (5001,   15000,  800,   0),
  (15001,  30000,  1500,  0),
  (30001,  50000,  2300,  0),
  (50001,  100000, 4200,  0),
  (100001, 200000, 7600,  0),
  (200001, 350000, 12000, 0),
  (350001, 500000, 17000, 0),
  (500001, null,   17500, 0.03)
) as v(min_gmv, max_gmv, base_fee, overage_rate)
where not exists (select 1 from billing_tiers);

-- ---- billing functions ---------------------------------------------------

create or replace function public.resolve_billing(gmv numeric)
returns numeric
language sql
stable
set search_path = public
as $$
  select
    case
      when overage_rate > 0 then base_fee + ((gmv - min_gmv) * overage_rate)
      else base_fee
    end
  from billing_tiers
  where gmv >= min_gmv
    and (max_gmv is null or gmv <= max_gmv)
    and active = true
  order by min_gmv desc
  limit 1;
$$;

create or replace function public.resolve_monthly_bill(p_shop_id uuid, p_period date)
returns table(tier_fee numeric, growth_surcharge numeric, total numeric)
language plpgsql
stable
set search_path = public
as $$
declare
  v_this numeric;
  v_last numeric;
  v_fee numeric;
  v_growth numeric;
  v_surcharge numeric := 0;
  v_threshold numeric;
  v_rate numeric;
begin
  select gmv into v_this from vendor_gmv_history
   where shop_id = p_shop_id and period = p_period;
  v_this := coalesce(v_this, 0);

  select gmv into v_last from vendor_gmv_history
   where shop_id = p_shop_id and period = (p_period - interval '1 month')::date;

  v_fee := resolve_billing(v_this);

  select value into v_threshold from billing_config where key = 'growth_threshold';
  select value into v_rate from billing_config where key = 'growth_surcharge_rate';

  -- Surcharge applies to the INCREASE, not the whole month, and only when
  -- growth clears the threshold. A shop that shrinks is never surcharged.
  if v_last is not null and v_last > 0 then
    v_growth := (v_this - v_last) / v_last;
    if v_growth > v_threshold then
      v_surcharge := (v_this - v_last) * v_rate;
    end if;
  end if;

  return query select v_fee, v_surcharge, v_fee + v_surcharge;
end;
$$;

grant execute on function public.resolve_billing(numeric) to anon, authenticated;
grant execute on function public.resolve_monthly_bill(uuid, date) to authenticated;

-- ---- RLS -----------------------------------------------------------------

alter table billing_config  enable row level security;
alter table vendor_payouts  enable row level security;

-- Public read: the pricing ladder is shown to vendors so they can see what
-- growth costs them. Writes are service-role only — no policy grants them.
drop policy if exists billing_config_public_read on billing_config;
create policy billing_config_public_read on billing_config for select using (true);

drop policy if exists payouts_vendor_read on vendor_payouts;
create policy payouts_vendor_read on vendor_payouts
  for select using (shop_id in (select my_shop_ids()));

-- gmv history and monthly billing already have vendor-scoped SELECT policies
-- from 0001. Deliberately no INSERT/UPDATE policy on any of these three:
-- scheduled server-side functions own them, and a vendor must never be able
-- to write their own invoice.
