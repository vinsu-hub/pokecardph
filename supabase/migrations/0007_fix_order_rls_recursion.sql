-- ============================================================================
-- Fix: infinite recursion between the orders and order_items policies.
--
-- 0001 defined them referencing each other:
--   orders_buyer_read      -> subquery on order_items
--   order_items_read       -> subquery on orders
-- Each subquery re-triggers the other table's policy, so Postgres raises
-- "infinite recursion detected in policy for relation orders" and every
-- checkout fails with a 500.
--
-- The fix is the same shape already used for shop ownership: SECURITY DEFINER
-- helpers, which run with the definer's rights and therefore do NOT re-enter
-- RLS. The access rules are unchanged — only how they're evaluated.
-- ============================================================================

-- Orders the current user owns as the buyer.
create or replace function public.my_order_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from orders where buyer_id = auth.uid();
$$;

-- Orders containing at least one item sold by one of the current user's shops.
create or replace function public.my_shop_order_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct oi.order_id
  from order_items oi
  where oi.shop_id in (select id from shops where vendor_id = auth.uid());
$$;

grant execute on function public.my_order_ids() to authenticated;
grant execute on function public.my_shop_order_ids() to authenticated;

-- ---- orders --------------------------------------------------------------

drop policy if exists orders_buyer_read on orders;
create policy orders_buyer_read on orders
  for select using (
    buyer_id = auth.uid()
    or id in (select my_shop_order_ids())
  );

drop policy if exists orders_vendor_update on orders;
create policy orders_vendor_update on orders
  for update using (id in (select my_shop_order_ids()));

-- ---- order_items ---------------------------------------------------------

drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items
  for select using (
    shop_id in (select my_shop_ids())
    or order_id in (select my_order_ids())
  );

drop policy if exists order_items_insert on order_items;
create policy order_items_insert on order_items
  for insert with check (order_id in (select my_order_ids()));
