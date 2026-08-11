-- ============================================================================
-- PokeCard PH — Phase 1 base schema
-- Source: CONTEXT/POKECARD_PH_MASTER_PROMPT.md §3
--
-- RLS is enabled on every table. Policies follow §3's intent summary.
--
-- Load-bearing modelling choice: `cards` is SHARED CATALOG REFERENCE DATA,
-- not per-listing. One Charizard row, many shops' `listings` pointing at it.
-- That is what later makes cross-vendor search, price history, and trade
-- matching by card_id overlap possible at all. Do not denormalise it.
-- ============================================================================

-- ---------------------------------------------------------------- users ----

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('buyer','vendor')),
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  location text,
  tier text default 'free' check (tier in ('free','premium')),
  rating numeric default 0,
  review_count int default 0,
  follower_count int default 0,
  joined_at timestamptz default now()
);
create index if not exists shops_vendor_idx on shops(vendor_id);

-- -------------------------------------------------------------- catalog ----

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  set_name text not null,
  card_number text,
  rarity text,
  language text default 'English',
  image_url text
);
-- Typeahead on the Add Listing wizard searches these two together.
create index if not exists cards_name_idx on cards (lower(name));
create index if not exists cards_set_idx on cards (lower(set_name));

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  card_id uuid not null references cards(id),
  listing_type text not null check (listing_type in ('graded','non_graded')),
  grading_company text,
  grade text,
  cert_number text,
  population int,
  price numeric not null check (price >= 0),
  compare_price numeric,
  quantity int default 1 check (quantity >= 0),
  condition_notes text,
  description text,
  photos jsonb default '[]'::jsonb,
  normal_map_url text,                 -- Phase 7: photometric scan output
  status text default 'draft' check (status in ('draft','active','sold','removed')),
  created_at timestamptz default now()
);
create index if not exists listings_shop_idx on listings(shop_id);
create index if not exists listings_card_idx on listings(card_id);
-- Home/Browse and Search both filter on active-only; this is the hot path.
create index if not exists listings_active_idx on listings(status) where status = 'active';

-- --------------------------------------------------------------- orders ----

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id),
  subtotal numeric not null,
  shipping_fee numeric default 0,
  platform_fee numeric default 0,
  total numeric not null,
  payment_method text,
  status text default 'pending' check (
    status in ('pending','paid','preparing','shipped','completed','cancelled')
  ),
  shipping_address jsonb,
  tracking_number text,
  courier text,
  created_at timestamptz default now()
);
create index if not exists orders_buyer_idx on orders(buyer_id);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  listing_id uuid not null references listings(id),
  shop_id uuid not null references shops(id),
  quantity int default 1,
  price_at_purchase numeric not null
);
create index if not exists order_items_order_idx on order_items(order_id);
-- Vendors read their own sales through this.
create index if not exists order_items_shop_idx on order_items(shop_id);

-- --------------------------------------------------------------- trades ----
-- Minimal Phase 1 shape. Phase 3 expands these substantially — see
-- PokeCard PH - Trade Engine. Created here so the base migration matches the
-- master prompt; nothing writes to them until Phase 3.

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references profiles(id),
  shop_id uuid not null references shops(id),
  status text default 'proposed' check (
    status in ('proposed','accepted','plan_created','meetup_scheduled',
               'cards_verified','value_confirmed','completed','cancelled')
  ),
  meetup_location text,
  meetup_date date,
  meetup_time time,
  value_difference numeric,
  created_at timestamptz default now()
);

create table if not exists trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  listing_id uuid not null references listings(id),
  side text not null check (side in ('offered','requested'))
);

-- ------------------------------------------------------------- messages ----

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id),
  shop_id uuid not null references shops(id),
  created_at timestamptz default now(),
  unique (buyer_id, shop_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- -------------------------------------------------------------- billing ----
-- Phase 5 fills these in. Created here per the master prompt's base schema.

create table if not exists billing_tiers (
  id serial primary key,
  min_gmv numeric not null,
  max_gmv numeric,
  base_fee numeric not null,
  overage_rate numeric default 0,
  active boolean default true
);

create table if not exists vendor_gmv_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  period date not null,
  gmv numeric not null,
  unique (shop_id, period)
);

create table if not exists vendor_monthly_billing (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  period_start date,
  period_end date,
  gmv numeric not null,
  tier_fee numeric not null,
  growth_surcharge numeric default 0,
  amount_due numeric not null,
  status text default 'pending' check (status in ('pending','invoiced','paid','overdue')),
  invoice_id text,
  created_at timestamptz default now()
);

-- ============================================================================
-- Row Level Security — enabled on every table, no exceptions.
-- ============================================================================

alter table profiles               enable row level security;
alter table shops                  enable row level security;
alter table cards                  enable row level security;
alter table listings               enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table trades                 enable row level security;
alter table trade_items            enable row level security;
alter table conversations          enable row level security;
alter table messages               enable row level security;
alter table billing_tiers          enable row level security;
alter table vendor_gmv_history     enable row level security;
alter table vendor_monthly_billing enable row level security;

-- Helper: the set of shop ids owned by the current user. SECURITY DEFINER so
-- policies on other tables can join through it without needing their own
-- select rights on `shops`.
create or replace function public.my_shop_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from shops where vendor_id = auth.uid();
$$;

-- ---- profiles: own row only ----
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select using (id = auth.uid());
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());

-- ---- shops: public read, vendor writes their own ----
drop policy if exists shops_public_read on shops;
create policy shops_public_read on shops for select using (true);
drop policy if exists shops_vendor_write on shops;
create policy shops_vendor_write on shops
  for all using (vendor_id = auth.uid()) with check (vendor_id = auth.uid());

-- ---- cards: shared catalog, public read; writes are service-role only ----
drop policy if exists cards_public_read on cards;
create policy cards_public_read on cards for select using (true);

-- ---- listings: public sees active; vendor CRUDs their own shop's ----
drop policy if exists listings_public_read on listings;
create policy listings_public_read on listings
  for select using (status = 'active' or shop_id in (select my_shop_ids()));
drop policy if exists listings_vendor_write on listings;
create policy listings_vendor_write on listings
  for all using (shop_id in (select my_shop_ids()))
  with check (shop_id in (select my_shop_ids()));

-- ---- orders: buyer reads own; vendor reads orders containing their items ----
drop policy if exists orders_buyer_read on orders;
create policy orders_buyer_read on orders
  for select using (
    buyer_id = auth.uid()
    or exists (
      select 1 from order_items oi
      where oi.order_id = orders.id and oi.shop_id in (select my_shop_ids())
    )
  );
drop policy if exists orders_buyer_insert on orders;
create policy orders_buyer_insert on orders
  for insert with check (buyer_id = auth.uid());
-- Vendors advance status; they must not be able to rewrite buyer or total.
-- Column-level protection is enforced in the server action, not here.
drop policy if exists orders_vendor_update on orders;
create policy orders_vendor_update on orders
  for update using (
    exists (
      select 1 from order_items oi
      where oi.order_id = orders.id and oi.shop_id in (select my_shop_ids())
    )
  );

-- ---- order_items: buyer sees own order's; vendor sees own shop's ----
drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items
  for select using (
    shop_id in (select my_shop_ids())
    or exists (
      select 1 from orders o where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );
drop policy if exists order_items_insert on order_items;
create policy order_items_insert on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

-- ---- trades: proposer or the shop's vendor ----
drop policy if exists trades_participants on trades;
create policy trades_participants on trades
  for all using (proposer_id = auth.uid() or shop_id in (select my_shop_ids()))
  with check (proposer_id = auth.uid() or shop_id in (select my_shop_ids()));

drop policy if exists trade_items_participants on trade_items;
create policy trade_items_participants on trade_items
  for all using (
    exists (
      select 1 from trades t
      where t.id = trade_items.trade_id
        and (t.proposer_id = auth.uid() or t.shop_id in (select my_shop_ids()))
    )
  );

-- ---- messages: the two participants only ----
drop policy if exists conversations_participants on conversations;
create policy conversations_participants on conversations
  for all using (buyer_id = auth.uid() or shop_id in (select my_shop_ids()))
  with check (buyer_id = auth.uid() or shop_id in (select my_shop_ids()));

drop policy if exists messages_participants on messages;
create policy messages_participants on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.shop_id in (select my_shop_ids()))
    )
  );

-- ---- billing: tiers public (pricing page); vendor reads own rows only.
-- No client-side writes anywhere — scheduled functions own these tables.
drop policy if exists billing_tiers_public_read on billing_tiers;
create policy billing_tiers_public_read on billing_tiers for select using (true);

drop policy if exists gmv_vendor_read on vendor_gmv_history;
create policy gmv_vendor_read on vendor_gmv_history
  for select using (shop_id in (select my_shop_ids()));

drop policy if exists billing_vendor_read on vendor_monthly_billing;
create policy billing_vendor_read on vendor_monthly_billing
  for select using (shop_id in (select my_shop_ids()));
