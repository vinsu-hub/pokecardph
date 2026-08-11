-- 0017 put the seeded live Who's That Pokémon event on Card Haven PH, which
-- collides with verify-events.mjs's own fixture (it always targets the
-- alphabetically-first two shops, Card Haven PH and Foil & Flame Cards, for
-- its "one event per shop per week" test rows). Moving the real seed to
-- PokeVault PH — never touched by that fixture — so the regression script
-- and the real seed data can never collide again.
update pokemon_events
   set shop_id = (select id from shops where name = 'PokeVault PH')
 where gift_name = 'Pikachu VMAX (Celebrations)';
