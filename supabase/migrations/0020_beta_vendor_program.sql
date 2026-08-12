-- ============================================================================
-- Beta Vendor Program — a shareable, time-boxed signup path offering a
-- launch-window cohort ("Founding Vendors") 3 months free with no GMV cap.
-- Reuses the shops row shape from standard onboarding; is_beta_vendor is the
-- only differentiator carried forward into billing logic and UI.
-- ============================================================================

alter table shops add column if not exists is_beta_vendor boolean not null default false;
alter table shops add column if not exists beta_registered_at timestamptz;

-- One vendor, one shop — was previously enforced only in application code
-- (both onboarding paths check `user.shopId` before inserting). Added here
-- because this migration already touches shop-creation, and a double-submit
-- race could otherwise insert two shops for one vendor via either path.
alter table shops add constraint shops_vendor_id_unique unique (vendor_id);

-- Singleton config row: `id boolean primary key default true` + `check (id)`
-- means only `id = true` can ever satisfy the constraint and a second row is
-- physically impossible — "is the window open" becomes one deterministic
-- read with no WHERE clause to get wrong, and dates are retuned with a plain
-- UPDATE, no admin UI needed.
create table if not exists beta_program_config (
  id boolean primary key default true,
  constraint beta_program_config_singleton check (id),
  window_start timestamptz not null,
  window_end timestamptz not null,
  trial_days int not null default 90,
  cohort_name text not null default 'Founding Vendors',
  updated_at timestamptz not null default now()
);

insert into beta_program_config (id, window_start, window_end, trial_days, cohort_name)
values (true, '2026-08-15T00:00:00+08:00', '2026-11-15T23:59:59+08:00', 90, 'Founding Vendors')
on conflict (id) do nothing;

alter table beta_program_config enable row level security;
drop policy if exists beta_program_config_public_read on beta_program_config;
create policy beta_program_config_public_read on beta_program_config
  for select using (true);
-- No write policy — same posture as billing_config/billing_tiers: only the
-- Supabase dashboard / service role can change the window, never the client.
