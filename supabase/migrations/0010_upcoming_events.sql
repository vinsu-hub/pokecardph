-- Shops with a scheduled event this week, exposed WITHOUT the go-live time.
-- The events table itself hides `scheduled` rows from the public by RLS; this
-- is the one fact a shop is allowed to advertise: that something is coming.
create or replace function public.upcoming_event_shops()
returns table(shop_id uuid, shop_name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct s.id, s.name
  from pokemon_events e
  join shops s on s.id = e.shop_id
  where e.status = 'scheduled'
    and e.week_start = date_trunc('week', now())::date;
$$;

grant execute on function public.upcoming_event_shops() to anon, authenticated;
