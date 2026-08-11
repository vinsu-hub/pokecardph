-- ============================================================================
-- Phase 3 — Trade Engine
-- Source: CONTEXT/POKECARD_PH_PHASE3_TRADE_ENGINE.md §2
--
-- `trades` and `trade_items` already exist from 0001_base.sql in their
-- Phase-1 minimal shape, so this ALTERs them rather than creating them.
-- ============================================================================

-- A buyer's own tradeable inventory — their personal cards, NOT shop listings.
-- Distinct table because listings belong to shops and these belong to people;
-- collapsing them would force a fake shop for every buyer.
create table if not exists trade_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  card_id uuid not null references cards(id),
  condition text,
  grading_company text,
  grade text,
  estimated_value numeric,
  photos jsonb default '[]'::jsonb,
  status text default 'available' check (status in ('available','pending_trade','traded')),
  created_at timestamptz default now()
);
create index if not exists trade_cards_owner_idx on trade_cards(owner_id);
create index if not exists trade_cards_card_idx on trade_cards(card_id);

-- Append-only log. Every status transition writes one of these in the same
-- transaction as the transition itself — that is what makes the Activity feed
-- trustworthy instead of something that can drift from actual state.
create table if not exists trade_activity (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  actor_id uuid not null references profiles(id),
  action text not null,
  note text,
  created_at timestamptz default now()
);
create index if not exists trade_activity_trade_idx on trade_activity(trade_id, created_at);

create table if not exists meetup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text,
  latitude numeric,
  longitude numeric,
  is_partner_shop boolean default false,
  hours text
);

-- ---- expand trades -------------------------------------------------------

alter table trades add column if not exists value_owed_by text;
alter table trades add column if not exists meetup_location_name text;
alter table trades add column if not exists meetup_location_address text;
alter table trades add column if not exists updated_at timestamptz default now();

do $$ begin
  alter table trades add constraint trades_value_owed_by_check
    check (value_owed_by in ('proposer','vendor') or value_owed_by is null);
exception when duplicate_object then null; end $$;

-- The Phase-1 check has no 'declined'; a vendor must be able to decline.
alter table trades drop constraint if exists trades_status_check;
alter table trades add constraint trades_status_check check (
  status in ('proposed','accepted','plan_created','meetup_scheduled',
             'cards_verified','value_confirmed','completed','cancelled','declined')
);

-- ---- expand trade_items --------------------------------------------------

alter table trade_items add column if not exists trade_card_id uuid references trade_cards(id);
alter table trade_items add column if not exists estimated_value numeric;
alter table trade_items alter column listing_id drop not null;

-- One table, two fundamentally different things either side of it: the offered
-- side references the proposer's personal cards, the requested side references
-- the vendor's listings. Enforced structurally so a malformed trade can't be
-- written at all.
do $$ begin
  alter table trade_items add constraint trade_items_side_xor check (
    (side = 'offered'   and trade_card_id is not null and listing_id is null) or
    (side = 'requested' and listing_id    is not null and trade_card_id is null)
  );
exception when duplicate_object then null; end $$;

-- ---- RLS -----------------------------------------------------------------

alter table trade_cards      enable row level security;
alter table trade_activity   enable row level security;
alter table meetup_locations enable row level security;

-- Owner CRUDs their own; publicly readable when available, so a vendor can
-- see what is being offered to them.
drop policy if exists trade_cards_owner_write on trade_cards;
create policy trade_cards_owner_write on trade_cards
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists trade_cards_public_available on trade_cards;
create policy trade_cards_public_available on trade_cards
  for select using (status = 'available' or owner_id = auth.uid());

-- Readable/insertable only by the two parties to the parent trade.
drop policy if exists trade_activity_participants on trade_activity;
create policy trade_activity_participants on trade_activity
  for select using (
    exists (
      select 1 from trades t
      where t.id = trade_activity.trade_id
        and (t.proposer_id = auth.uid() or t.shop_id in (select my_shop_ids()))
    )
  );

drop policy if exists trade_activity_insert on trade_activity;
create policy trade_activity_insert on trade_activity
  for insert with check (
    actor_id = auth.uid()
    and exists (
      select 1 from trades t
      where t.id = trade_activity.trade_id
        and (t.proposer_id = auth.uid() or t.shop_id in (select my_shop_ids()))
    )
  );

-- Public read, seeded manually. No client writes.
drop policy if exists meetup_locations_public_read on meetup_locations;
create policy meetup_locations_public_read on meetup_locations for select using (true);

-- ---- seed meetup locations ----------------------------------------------
-- Real, safe, public places in Metro Manila so the picker has something
-- meaningful to show rather than lorem rows.

insert into meetup_locations (name, address, city, is_partner_shop, hours)
select * from (values
  ('ABC Card Shop',        '2F CityMall, J.P. Rizal St., Makati City', 'Makati City',      true,  'Open 10:00 AM – 9:00 PM'),
  ('GameHub Cards & Collectibles', 'Unit 12, Farmers Plaza, Quezon City', 'Quezon City',   true,  'Open 10:00 AM – 8:00 PM'),
  ('SM Megamall — Public Area',    'Ortigas Center, Mandaluyong City',    'Mandaluyong City', false, 'Open 10:00 AM – 10:00 PM')
) as v(name, address, city, is_partner_shop, hours)
where not exists (select 1 from meetup_locations);
