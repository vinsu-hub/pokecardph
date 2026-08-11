-- ============================================================================
-- Phase 2 — Vendor core loop
-- Source: CONTEXT/POKECARD_PH_PHASE2_VENDOR.md §2
-- No new tables; columns only.
-- ============================================================================

alter table shops add column if not exists banner_url text;
alter table shops add column if not exists description text;
alter table shops add column if not exists positive_feedback_pct numeric default 100;
alter table shops add column if not exists avg_response_time text;

-- listings.compare_price and .population already exist from 0001.
