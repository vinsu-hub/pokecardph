-- Price rebalancing: 28 active listings clustered almost entirely in
-- ₱1,000–5,000 (only 1 card under ₱1,000, only 1 over ₱5,000) — the other two
-- price-filter bands on /browse looked broken to a buyer trying them.
-- Adjusts four existing listings' prices only; no listings added or removed.
update listings set price = 850 where id = (
  select l.id from listings l join cards c on c.id = l.card_id
  where c.name = 'Leafeon VSTAR' and l.price = 1297
);
update listings set price = 720 where id = (
  select l.id from listings l join cards c on c.id = l.card_id
  where c.name = 'Gengar VMAX' and l.price = 1354
);
update listings set price = 5600, compare_price = case when compare_price is not null then compare_price + 1100 else null end where id = (
  select l.id from listings l join cards c on c.id = l.card_id
  where c.name = 'Charizard ex' and l.price = 4500
);
update listings set price = 5800, compare_price = case when compare_price is not null then compare_price + 1078 else null end where id = (
  select l.id from listings l join cards c on c.id = l.card_id
  where c.name = 'Blastoise ex' and l.price = 4722
);

-- Shop About blurbs — `shops.description` has existed since Phase 2 and was
-- never populated; Card Detail's new "About the Store" section (see
-- 0015-era app changes) reads directly from this column.
update shops set description = 'Card Haven PH has been the go-to spot for budget-friendly, everyday pulls since we opened our stall in Cubao — non-graded singles, playset fillers, and the odd chase card, all hand-checked before listing.' where name = 'Card Haven PH';
update shops set description = 'PokeVault PH specializes in professionally graded slabs — PSA, BGS, and CGC — sourced and authenticated for collectors who want certainty on condition before they buy.' where name = 'PokeVault PH';
update shops set description = 'Foil & Flame Cards curates high-end alt-art and secret-rare chase cards, from Moonbreon to modern 151 pulls, for collectors building a showcase binder rather than a playset.' where name = 'Foil & Flame Cards';
