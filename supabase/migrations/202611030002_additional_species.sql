-- Additional World DS species in Digibonk 1.12.0. Preserve all existing records.
insert into public.digibonk_species(id) values
('Dorumon'),('Impmon'),('Dorugamon'),('DoruGreymon'),('Myotismon'),('Taomon'),
('Beelzemon'),('Dorugoramon'),('Omnimon'),('VenomMyotismon'),('Sakuyamon'),('Seraphimon')
on conflict(id) do nothing;
