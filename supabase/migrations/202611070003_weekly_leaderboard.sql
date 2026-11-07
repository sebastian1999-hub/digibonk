-- Weekly Digibonk seasons. Existing all-time records and other games are preserved.
begin;

create or replace function public.digibonk_week_start(p_at timestamptz default now())
returns date language sql stable set search_path = '' as $$
 select date_trunc('week', p_at at time zone 'Europe/Madrid')::date;
$$;
revoke all on function public.digibonk_week_start(timestamptz) from public, anon, authenticated;

create table if not exists public.digibonk_weekly_runs (
 user_id uuid not null references auth.users(id) on delete cascade,
 run_id text not null check(char_length(run_id) between 1 and 100),
 week_start date not null,
 score bigint not null check(score between 0 and 100000000),
 survival_seconds integer not null check(survival_seconds between 0 and 86400),
 kills integer not null check(kills between 0 and 1000000),
 level integer not null check(level between 1 and 1000),
 species text not null references public.digibonk_species(id),
 game_version text not null,
 achieved_at timestamptz not null,
 primary key(user_id, run_id),
 check(week_start = date_trunc('week', achieved_at at time zone 'Europe/Madrid')::date)
);
create index if not exists digibonk_weekly_runs_ranking
 on public.digibonk_weekly_runs(week_start, user_id, score desc, survival_seconds desc, achieved_at);
alter table public.digibonk_weekly_runs enable row level security;
revoke all on public.digibonk_weekly_runs from public, anon, authenticated;

insert into public.digibonk_weekly_runs
 (user_id,run_id,week_start,score,survival_seconds,kills,level,species,game_version,achieved_at)
select user_id,run_id,public.digibonk_week_start(achieved_at),score,survival_seconds,kills,
 level,species,game_version,achieved_at from public.digibonk_records
on conflict do nothing;

create or replace function public.digibonk_leaderboard()
returns table(rank bigint,username text,display_name text,score bigint,survival_seconds integer,
 kills integer,level integer,species text,achieved_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not public.dwc_is_member() then
  raise exception 'Private group access required' using errcode='42501';
 end if;
 return query
 with best as (
  select distinct on (r.user_id) r.* from public.digibonk_weekly_runs r
  where r.week_start = public.digibonk_week_start()
  order by r.user_id,r.score desc,r.survival_seconds desc,r.achieved_at asc,r.run_id
 )
 select row_number() over(order by r.score desc,r.survival_seconds desc,r.achieved_at,m.username),
  m.username,m.display_name,r.score,r.survival_seconds,r.kills,r.level,r.species,r.achieved_at
 from best r join public.dwc_members m on m.user_id = r.user_id
 where m.active
 order by r.score desc,r.survival_seconds desc,r.achieved_at,m.username limit 100;
end; $$;

create or replace function public.digibonk_submit_run(p_run jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_score bigint; v_time integer; v_kills integer; v_level integer; v_species text; v_id text;
 v_finished timestamptz; v_week date; v_best record; changed integer;
begin
 if auth.uid() is null or not public.dwc_is_member() then
  raise exception 'Private group access required' using errcode='42501';
 end if;
 -- The released desktop client also sends wire protocol 1.3.0; retain that compatibility.
 if p_run->>'finished' is distinct from 'true' or p_run->>'version' is distinct from '1.3.0' then
  raise exception 'Unsupported completed run' using errcode='22023';
 end if;
 v_score := (p_run->>'score')::bigint; v_time := (p_run->>'time')::integer;
 v_kills := (p_run->>'kills')::integer; v_level := (p_run->>'level')::integer;
 v_species := p_run->>'species'; v_id := p_run->>'id';
 if v_score is null or v_time is null or v_kills is null or v_level is null
  or v_species is null or v_id is null then
  raise exception 'Incomplete run' using errcode='22023';
 end if;
 v_finished := coalesce((p_run->>'finished_at')::timestamptz, now());
 if not isfinite(v_finished) or v_finished > now() + interval '5 minutes' then
  raise exception 'Invalid completion date' using errcode='22023';
 end if;
 v_finished := least(v_finished, now());
 v_week := public.digibonk_week_start(v_finished);
 select r.score,r.survival_seconds into v_best from public.digibonk_weekly_runs r
 where r.user_id = auth.uid() and r.week_start = v_week
 order by r.score desc,r.survival_seconds desc limit 1;
 insert into public.digibonk_weekly_runs
  (user_id,run_id,week_start,score,survival_seconds,kills,level,species,game_version,achieved_at)
 values(auth.uid(),v_id,v_week,v_score,v_time,v_kills,v_level,v_species,p_run->>'version',v_finished)
 on conflict(user_id,run_id) do nothing;
 get diagnostics changed = row_count;
 -- Retain the all-time best separately, without using it to rank a new week.
 insert into public.digibonk_records(user_id,run_id,score,survival_seconds,kills,level,species,game_version,achieved_at)
 values(auth.uid(),v_id,v_score,v_time,v_kills,v_level,v_species,p_run->>'version',v_finished)
 on conflict(user_id) do update set run_id=excluded.run_id,score=excluded.score,
 survival_seconds=excluded.survival_seconds,kills=excluded.kills,level=excluded.level,
 species=excluded.species,game_version=excluded.game_version,achieved_at=excluded.achieved_at
 where changed > 0 and (excluded.score > digibonk_records.score
  or (excluded.score = digibonk_records.score and excluded.survival_seconds > digibonk_records.survival_seconds));
 return jsonb_build_object('accepted',true,'week_start',v_week,'new_best',
  changed > 0 and (v_best.score is null or v_score > v_best.score
   or (v_score = v_best.score and v_time > v_best.survival_seconds)));
end; $$;
revoke all on function public.digibonk_leaderboard(), public.digibonk_submit_run(jsonb) from public, anon;
grant execute on function public.digibonk_leaderboard(), public.digibonk_submit_run(jsonb) to authenticated;
commit;
