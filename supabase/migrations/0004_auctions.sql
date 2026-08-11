-- ============================================================================
-- Phase 4 — Auctions & Bidding
-- Source: CONTEXT/POKECARD_PH_PHASE4_AUCTIONS.md §2
-- ============================================================================

alter table listings add column if not exists sale_type text default 'fixed';
alter table listings add column if not exists item_category text default 'card';

do $$ begin
  alter table listings add constraint listings_sale_type_check
    check (sale_type in ('fixed','auction'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table listings add constraint listings_item_category_check
    check (item_category in ('card','sealed_pack','sealed_box','merch','signed_item'));
exception when duplicate_object then null; end $$;

-- Sealed product, merch and signed items have no catalog card, so the FK must
-- become optional. Only item_category = 'card' uses the cards lookup.
alter table listings alter column card_id drop not null;

create table if not exists auctions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references listings(id) on delete cascade,
  starting_bid numeric not null check (starting_bid >= 0),
  bid_increment numeric not null check (bid_increment > 0),
  reserve_price numeric,               -- hidden minimum; null = no reserve
  buy_it_now_price numeric,
  current_bid numeric,
  current_bid_id uuid,
  bid_count int default 0,
  watcher_count int default 0,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'scheduled' check (
    status in ('scheduled','live','ended_sold','ended_unsold','cancelled')
  ),
  win_confirm_deadline timestamptz,
  created_at timestamptz default now(),
  check (end_time > start_time)
);
create index if not exists auctions_status_end_idx on auctions(status, end_time);

create table if not exists bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_id uuid not null references profiles(id),
  amount numeric not null check (amount > 0),
  max_proxy_amount numeric,            -- SECRET. See the view below.
  is_auto_bid boolean default false,
  created_at timestamptz default now()
);
create index if not exists bids_auction_idx on bids(auction_id, created_at desc);

create table if not exists auction_watchers (
  auction_id uuid not null references auctions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (auction_id, user_id)
);

-- ---- RLS -----------------------------------------------------------------

alter table auctions          enable row level security;
alter table bids              enable row level security;
alter table auction_watchers  enable row level security;

drop policy if exists auctions_public_read on auctions;
create policy auctions_public_read on auctions for select using (true);

drop policy if exists auctions_vendor_write on auctions;
create policy auctions_vendor_write on auctions
  for all using (
    exists (select 1 from listings l where l.id = auctions.listing_id
              and l.shop_id in (select my_shop_ids()))
  )
  with check (
    exists (select 1 from listings l where l.id = auctions.listing_id
              and l.shop_id in (select my_shop_ids()))
  );

-- A bidder reads ONLY their own bid rows. Public bid history is served by the
-- view below instead, which never exposes max_proxy_amount.
--
-- This is the policy the whole auction mechanic rests on: if a rival can read
-- your proxy maximum, they outbid you by exactly one increment every time and
-- proxy bidding becomes worthless.
drop policy if exists bids_own_read on bids;
create policy bids_own_read on bids
  for select using (bidder_id = auth.uid());

drop policy if exists bids_own_insert on bids;
create policy bids_own_insert on bids
  for insert with check (bidder_id = auth.uid());

drop policy if exists watchers_own on auction_watchers;
create policy watchers_own on auction_watchers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- Public bid history --------------------------------------------------
-- Amount, time, and a stable masked label per bidder per auction. No real
-- names, no user ids, no proxy maximums. security_invoker stays OFF so the
-- view can read rows the caller's own policy would hide.

create or replace view public_bid_history
with (security_invoker = off) as
select
  b.id,
  b.auction_id,
  b.amount,
  b.created_at,
  b.is_auto_bid,
  'Bidder ****' || right(encode(digest(b.bidder_id::text || b.auction_id::text, 'sha256'), 'hex'), 2)
    as masked_bidder
from bids b;

grant select on public_bid_history to anon, authenticated;
