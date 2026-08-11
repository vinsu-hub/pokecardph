-- The Events tab showed nothing real: both pokemon_events rows were
-- verification debris ("VERIFY GIFT" / "VERIFY EMPTY", both already
-- winner_selected), and the only is_action_event auction was an
-- ended_unsold test row ("Test Pack Battle") backed by a listing with no
-- card_id and an empty description. Removes the debris and seeds one real,
-- currently-live example of each mechanic so the tab has genuine content.

delete from pokemon_events where gift_name in ('VERIFY GIFT', 'VERIFY EMPTY');

-- ---- Who's That Pokémon?: one real live event -----------------------------
insert into pokemon_events (
  shop_id, gift_name, gift_description, correct_answer, answer_aliases,
  week_start, window_start, window_end, actual_start_time,
  guess_duration_minutes, ends_at, status
)
select
  id,
  'Pikachu VMAX (Celebrations)',
  'A Celebrations-era Pikachu VMAX, straight from this week''s restock.',
  'pikachu',
  array['pika'],
  date_trunc('week', now())::date,
  now() - interval '10 minutes',
  now() + interval '50 minutes',
  now() - interval '5 minutes',
  4320,
  now() + interval '3 days',
  'live'
from shops where name = 'Card Haven PH';

-- ---- Action Events: repurpose the one test auction into a real listing ----
-- Same auction/listing rows (avoids the unique auctions.listing_id
-- constraint and the "one event per shop per week" index) — just replaces
-- the placeholder card_id/description/title with real content and puts it
-- live with a fresh multi-day window.
update listings
   set card_id = (select id from cards where name = 'Umbreon VMAX'),
       description = 'Umbreon VMAX — Evolving Skies alt art ("Moonbreon"). One of the most-requested chase cards on the platform, up for grabs in this week''s community bidding war.'
 where id = '8e833d8a-e5ff-4d99-8981-5a7326493d94';

update auctions
   set status = 'live',
       start_time = now() - interval '1 hour',
       end_time = now() + interval '3 days',
       event_title = 'Moonbreon Bidding War',
       event_subtitle = 'Umbreon VMAX — Evolving Skies Alt Art',
       prize_description = 'Umbreon VMAX (Evolving Skies), Alt Art "Moonbreon"',
       current_bid = null,
       current_bid_id = null,
       bid_count = 0
 where id = '5cac42c4-3fc4-4a3b-8d5c-743c7f728559';
