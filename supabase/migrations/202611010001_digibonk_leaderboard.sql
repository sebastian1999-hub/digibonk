-- Digibonk only. Reuses existing private membership, never changes other games.
begin;
create table if not exists public.digibonk_species (id text primary key);
alter table public.digibonk_species enable row level security;
revoke all on public.digibonk_species from public,anon,authenticated;
insert into public.digibonk_species(id) values
('Zurumon'),('Choromon'),('Nyokimon'),('Pabumon'),('Pichimon'),('Punimon'),('Botamon'),('Poyomon'),('Mokumon'),('YukimiBotamon'),('Yuramon'),('Petitmon'),('Kapurimon'),('Koromon'),('Tanemon'),('Tsunomon'),('Tokomon'),('Nyaromon'),('Pagumon'),('Yokomon'),('Bukamon'),('DemiMeramon'),('Motimon'),('Babydmon'),('Sunmon'),('Moonmon'),('Agumon'),('Armadillomon'),('Elecmon'),('Otamamon'),('Gaomon'),('Gazimon'),('Gabumon'),('Kamemon'),('Gizamon'),('Candlemon'),('Kunemon'),('Gotsumon'),('Goburimon'),('Gomamon'),('Terriermon'),('Tentomon'),('ToyAgumon'),('Dracomon'),('Tapirmon'),('Hagurumon'),('Patamon'),('Palmon'),('DemiDevimon'),('Biyomon'),('Falcomon'),('Salamon'),('Floramon'),('Mushroommon'),('SnowAgumon'),('Renamon'),('Coronamon'),('Lunamon'),('BlackAgumon'),('Psychemon'),('Aruraumon'),('Tsukaimon'),('Veemon'),('Guilmon'),('Ankylomon'),('Ikkakumon'),('Wizardmon'),('Woodmon'),('Airdramon'),('Angemon'),('Ogremon'),('Gaogamon'),('Kabuterimon'),('Gargomon'),('Garurumon'),('Garurumon (Black)'),('Guardromon'),('Kiwimon'),('Kyubimon'),('Greymon'),('Clockmon'),('Kuwagamon'),('Gekomon'),('Gesomon'),('Centarumon'),('Kokatorimon'),('Thunderballmon'),('Shellmon'),('GeoGreymon'),('Seadramon'),('Sukamon'),('Starmon'),('Darcmon'),('DarkTyrannomon'),('Tyrannomon'),('Gatomon'),('Devidramon'),('Devimon'),('Togemon'),('Tortomon'),('Numemon'),('Bakemon'),('Birdramon'),('Vegiemon'),('Peckmon'),('Meramon'),('Mojyamon'),('Monochromon'),('Frigimon'),('Unimon'),('Youkomon'),('Lynxmon'),('Raremon'),('Leomon'),('RedVegiemon'),('Coredramon (Blue)'),('Coredramon (Green)'),('Firamon'),('Lekismon'),('IceDevimon'),('Gururumon'),('Geremon'),('BlueMeramon'),('Sorcermon'),('Akatorimon'),('Saberdramon'),('Icemon'),('Veedramon'),('Growlmon'),('MegaKabuterimon'),('Scorpiomon'),('Andromon'),('Etemon'),('Angewomon'),('Okuwamon'),('Garudamon'),('Garbagemon'),('Cyberdramon'),('Cherrymon'),('SkullGreymon'),('Zudomon'),('Dragomon'),('SkullMeramon'),('Deramon'),('ShogunGekomon'),('Triceramon'),('Knightmon'),('Parrotmon'),('Divermon'),('Pandamon'),('BigMamemon'),('Piximon'),('Phantomon'),('Vademon'),('Whamon'),('MagnaAngemon'),('MachGaogamon'),('Mamemon'),('Mammothmon'),('MegaSeadramon'),('Megadramon'),('MetalGreymon (Virus)'),('MetalGreymon'),('MetalTyrannomon'),('Monzaemon'),('Yatagaramon'),('RizeGreymon'),('Rapidmon'),('Lillymon'),('LadyDevimon'),('WaruMonzaemon'),('WereGarurumon'),('WereGarurumon (Black)'),('Wingdramon'),('Groundramon'),('Flaremon'),('Crescemon'),('SuperStarmon'),('BlackRapidmon'),('Vikemon'),('Valkyrimon'),('WarGreymon'),('GigaSeadramon'),('GranKuwagamon'),('Gryphonmon'),('Crossmon'),('SaberLeomon'),('ShineGreymon'),('SkullMammothmon'),('MegaGargomon'),('HiAndromon'),('BanchoLeomon'),('Piedmon'),('Puppetmon'),('Pharaohmon'),('Pukumon'),('BlackWarGreymon'),('PrinceMamemon'),('Plesiomon'),('HerculesKabuterimon'),('Phoenixmon'),('MirageGaogamon'),('Machinedramon'),('MetalEtemon'),('MetalGarurumon'),('MetalGarurumon (Black)'),('MetalSeadramon'),('Rosemon'),('ZeedGarurumon'),('VictoryGreymon'),('Slayerdramon'),('Breakdramon'),('Apollomon'),('Dianamon'),('Imperialdramon (Fighter Mode)'),('Gallantmon')
on conflict do nothing;
create table if not exists public.digibonk_records (
 user_id uuid primary key references auth.users(id) on delete cascade,
 run_id text not null check(char_length(run_id) between 1 and 100),
 score bigint not null check(score between 0 and 100000000),
 survival_seconds integer not null check(survival_seconds between 0 and 86400),
 kills integer not null check(kills between 0 and 1000000),
 level integer not null check(level between 1 and 1000),
 species text not null references public.digibonk_species(id),
 game_version text not null,
 achieved_at timestamptz not null default now()
);
alter table public.digibonk_records enable row level security;
revoke all on public.digibonk_records from public,anon,authenticated;
create or replace function public.digibonk_leaderboard()
returns table(rank bigint,username text,display_name text,score bigint,survival_seconds integer,kills integer,level integer,species text,achieved_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.dwc_is_member() then raise exception 'Private group access required' using errcode='42501'; end if;
 return query select row_number() over(order by r.score desc,r.survival_seconds desc,r.achieved_at asc,m.username),m.username,m.display_name,r.score,r.survival_seconds,r.kills,r.level,r.species,r.achieved_at
 from public.digibonk_records r join public.dwc_members m on m.user_id=r.user_id
 where m.active order by r.score desc,r.survival_seconds desc,r.achieved_at asc,m.username limit 100;
end;$$;
create or replace function public.digibonk_submit_run(p_run jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_score bigint; v_time integer; v_kills integer; v_level integer; v_species text; v_id text; changed integer;
begin
 if auth.uid() is null or not public.dwc_is_member() then raise exception 'Private group access required' using errcode='42501'; end if;
 if p_run->>'finished' is distinct from 'true' or p_run->>'version' is distinct from '1.3.0' then raise exception 'Unsupported completed run' using errcode='22023'; end if;
 v_score:=(p_run->>'score')::bigint; v_time:=(p_run->>'time')::integer; v_kills:=(p_run->>'kills')::integer; v_level:=(p_run->>'level')::integer; v_species:=p_run->>'species'; v_id:=p_run->>'id';
 if v_score is null or v_time is null or v_kills is null or v_level is null or v_species is null or v_id is null then raise exception 'Incomplete run' using errcode='22023'; end if;
 insert into public.digibonk_records(user_id,run_id,score,survival_seconds,kills,level,species,game_version)
 values(auth.uid(),v_id,v_score,v_time,v_kills,v_level,v_species,p_run->>'version')
 on conflict(user_id) do update set run_id=excluded.run_id,score=excluded.score,survival_seconds=excluded.survival_seconds,kills=excluded.kills,level=excluded.level,species=excluded.species,game_version=excluded.game_version,achieved_at=now()
 where excluded.score>digibonk_records.score or (excluded.score=digibonk_records.score and excluded.survival_seconds>digibonk_records.survival_seconds);
 get diagnostics changed=row_count;
 return jsonb_build_object('accepted',true,'new_best',changed>0);
end;$$;
revoke all on function public.digibonk_leaderboard() from public,anon;
revoke all on function public.digibonk_submit_run(jsonb) from public,anon;
grant execute on function public.digibonk_leaderboard(),public.digibonk_submit_run(jsonb) to authenticated;
commit;
