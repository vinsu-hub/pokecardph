-- ============================================================================
-- Card Detail 1:1 rebuild — condition subgrades + price history
-- Additive only: no existing columns touched, no data migrated.
-- ============================================================================

-- ---- listings.condition_* : four 0-10 subgrades backing the Card Condition
--      animated bars. Nullable — most existing seeded listings won't have
--      these; the UI must degrade gracefully (hide the bar row) when null
--      rather than assume every listing has them.
alter table listings add column if not exists condition_centering smallint
  check (condition_centering between 0 and 10);
alter table listings add column if not exists condition_corners smallint
  check (condition_corners between 0 and 10);
alter table listings add column if not exists condition_edges smallint
  check (condition_edges between 0 and 10);
alter table listings add column if not exists condition_surface smallint
  check (condition_surface between 0 and 10);

-- ---- price_history: synthetic market-price points, grade-aware.
-- card_id (not listing_id) — price history belongs to the CARD+GRADE
-- combination, independent of which shop's listing you're viewing, matching
-- the mockup's chart tracking a grade generally, not one vendor's listing.
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  grade text not null,               -- e.g. 'PSA 6', 'Ungraded' — matches conditionLabel() output
  price numeric not null check (price >= 0),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists price_history_card_grade_idx
  on price_history(card_id, grade, recorded_at);

-- ---- RLS: public read (it's market data, same trust class as `cards`),
--      writes are service-role only (seed script / future real feed), same
--      posture as the public-read cards policy in 0001_base.sql.
alter table price_history enable row level security;

drop policy if exists price_history_public_read on price_history;
create policy price_history_public_read on price_history
  for select using (true);

-- No insert/update/delete policy is created deliberately — RLS defaults to
-- deny, so only the service-role seed script (which bypasses RLS) can write.
