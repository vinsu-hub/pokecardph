-- ============================================================================
-- Phase 4 — bid placement, anti-snipe, and the auction closer
--
-- These live in Postgres rather than the API route because both need
-- guarantees the JS client cannot give:
--   * SELECT ... FOR UPDATE, so two simultaneous bids can't both read the same
--     current_bid and both win
--   * one transaction spanning the bid insert and the auction update
--
-- The route wraps these; it never re-implements them.
-- ============================================================================

create or replace function public.place_bid(
  p_auction_id uuid,
  p_amount numeric,
  p_max_proxy numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a            auctions%rowtype;
  v_shop       uuid;
  v_min        numeric;
  v_bid_id     uuid;
  v_rival_max  numeric;
  v_settle     numeric;
  v_extended   boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in to place a bid');
  end if;

  -- Lock the row. Everything below reads a value nobody else can change until
  -- this transaction commits.
  select * into a from auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Auction not found');
  end if;

  -- Flip a scheduled auction live if its start has passed, so the first bidder
  -- isn't blocked by a cron that hasn't ticked yet.
  if a.status = 'scheduled' and now() >= a.start_time then
    update auctions set status = 'live' where id = a.id;
    a.status := 'live';
  end if;

  if a.status <> 'live' then
    return jsonb_build_object('ok', false, 'error', 'This auction is not open for bidding');
  end if;
  if now() >= a.end_time then
    return jsonb_build_object('ok', false, 'error', 'This auction has ended');
  end if;

  -- A vendor may not bid on their own shop's listing.
  select l.shop_id into v_shop from listings l where l.id = a.listing_id;
  if exists (select 1 from shops s where s.id = v_shop and s.vendor_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'You cannot bid on your own listing');
  end if;

  v_min := coalesce(a.current_bid, a.starting_bid) +
           case when a.current_bid is null then 0 else a.bid_increment end;

  if p_amount < v_min then
    return jsonb_build_object('ok', false, 'error',
      format('Bid must be at least %s', v_min));
  end if;

  -- ---- proxy resolution -------------------------------------------------
  -- Standard rules: the highest maximum wins and pays only what it takes to
  -- beat the next-highest by one increment. Resolved here, never client-side,
  -- and never exposed — see the public_bid_history view.
  select max(b.max_proxy_amount) into v_rival_max
  from bids b
  where b.auction_id = a.id
    and b.bidder_id <> auth.uid()
    and b.max_proxy_amount is not null;

  v_settle := p_amount;

  if v_rival_max is not null and coalesce(p_max_proxy, p_amount) <= v_rival_max then
    -- The standing proxy still wins; this bid only pushes the price up.
    v_settle := least(coalesce(p_max_proxy, p_amount) + a.bid_increment, v_rival_max);
    insert into bids (auction_id, bidder_id, amount, max_proxy_amount)
    values (a.id, auth.uid(), p_amount, p_max_proxy)
    returning id into v_bid_id;

    update auctions
       set current_bid = v_settle,
           bid_count   = bid_count + 1
     where id = a.id;

    return jsonb_build_object(
      'ok', true, 'outbid', true, 'current_bid', v_settle,
      'message', 'You were immediately outbid by a standing maximum bid');
  end if;

  if v_rival_max is not null then
    -- This bidder's maximum beats the rival's; settle just above it.
    v_settle := least(coalesce(p_max_proxy, p_amount), v_rival_max + a.bid_increment);
  end if;

  insert into bids (auction_id, bidder_id, amount, max_proxy_amount)
  values (a.id, auth.uid(), v_settle, p_max_proxy)
  returning id into v_bid_id;

  -- ---- anti-snipe -------------------------------------------------------
  -- A bid inside the final two minutes pushes the end out by two, so an
  -- auction can't be won by being fastest in the last second.
  if now() > a.end_time - interval '2 minutes' then
    update auctions set end_time = a.end_time + interval '2 minutes' where id = a.id;
    v_extended := true;
  end if;

  update auctions
     set current_bid    = v_settle,
         current_bid_id = v_bid_id,
         bid_count      = bid_count + 1
   where id = a.id;

  return jsonb_build_object(
    'ok', true, 'outbid', false, 'current_bid', v_settle, 'extended', v_extended);
end;
$$;

revoke all on function public.place_bid(uuid, numeric, numeric) from public;
grant execute on function public.place_bid(uuid, numeric, numeric) to authenticated;

-- ============================================================================
-- Auction closer. Idempotent — safe to run every minute.
-- ============================================================================

create or replace function public.close_due_auctions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a          auctions%rowtype;
  v_started  int := 0;
  v_unsold   int := 0;
  v_sold     int := 0;
  v_buyer    uuid;
  v_order    uuid;
begin
  -- scheduled -> live
  update auctions set status = 'live'
   where status = 'scheduled' and start_time <= now();
  get diagnostics v_started = row_count;

  for a in
    select * from auctions
     where status = 'live' and end_time <= now()
     for update skip locked
  loop
    if a.current_bid is null
       or (a.reserve_price is not null and a.current_bid < a.reserve_price) then
      -- No bids, or the reserve was never met. The gift of a relist stays
      -- with the vendor; nothing auto-relists.
      update auctions set status = 'ended_unsold' where id = a.id;
      v_unsold := v_unsold + 1;
    else
      select b.bidder_id into v_buyer from bids b where b.id = a.current_bid_id;

      insert into orders (buyer_id, subtotal, shipping_fee, platform_fee, total, status)
      values (v_buyer, a.current_bid, 0, 0, a.current_bid, 'pending')
      returning id into v_order;

      insert into order_items (order_id, listing_id, shop_id, quantity, price_at_purchase)
      select v_order, l.id, l.shop_id, 1, a.current_bid
        from listings l where l.id = a.listing_id;

      update auctions
         set status = 'ended_sold',
             win_confirm_deadline = now() + interval '48 hours'
       where id = a.id;

      update listings set status = 'sold' where id = a.listing_id;
      v_sold := v_sold + 1;
    end if;
  end loop;

  return jsonb_build_object('started', v_started, 'sold', v_sold, 'unsold', v_unsold);
end;
$$;

revoke all on function public.close_due_auctions() from public;
