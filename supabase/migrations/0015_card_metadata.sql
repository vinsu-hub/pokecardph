-- Generation + approx. pull rate, sourced from the reference table the user
-- supplied. Both nullable: this is a spec-table enrichment for the 20 cards
-- the table covers, not a required field on every card (the Rayquaza EX PSA
-- slab, for one, isn't in the table and stays null — Card Detail's existing
-- `.filter(([, v]) => v)` on the spec list already omits null rows cleanly).
-- Doubles as the description template for future seller listings: Card Name /
-- Generation / Card Set / Rarity Tier / Approx. Pull Rate.
alter table cards add column if not exists generation text;
alter table cards add column if not exists pull_rate text;

update cards set generation = 'Gen 9 (Scarlet & Violet)', pull_rate = '~1 in 116 to 1 in 227 packs' where name = 'Mew ex';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 1,600 – 2,000 packs' where name = 'Umbreon VMAX';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 per booster box (~1 in 10 packs)' where name = 'Leafeon VSTAR';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 2,000 packs' where name = 'Gengar VMAX';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 1,600 – 2,000 packs' where name = 'Rayquaza VMAX';
update cards set generation = 'Gen 9 (Scarlet & Violet)', pull_rate = 'Guaranteed in specific promo box' where name = 'Pikachu ex';
update cards set generation = 'Gen 9 (Scarlet & Violet)', pull_rate = '~1 in 116 to 1 in 227 packs' where name = 'Charizard ex';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 15 – 20 packs' where name = 'Pikachu VMAX';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 1,600 – 2,000 packs' where name = 'Glaceon VMAX';
update cards set generation = 'Gen 9 (Scarlet & Violet)', pull_rate = '~1 in 100 to 1 in 227 packs' where name = 'Alakazam ex';
update cards set generation = 'Gen 9 (Scarlet & Violet)', pull_rate = '~1 in 100 to 1 in 227 packs' where name = 'Blastoise ex';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 800 packs' where name = 'Espeon V';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 15 – 30 packs' where name = 'Mewtwo VSTAR';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 800 packs' where name = 'Dragonite V';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 800 packs' where name = 'Giratina V';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 10 – 15 packs' where name = 'Zacian V';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 1,600 – 2,000 packs' where name = 'Sylveon VMAX';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 700 packs' where name = 'Lugia V';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 50 – 100 packs' where name = 'Arceus VSTAR';
update cards set generation = 'Gen 8 (Sword & Shield)', pull_rate = '~1 in 250 – 300 packs' where name = 'Charizard VMAX';
