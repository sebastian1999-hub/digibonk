-- Transactional deployment smoke test: no test record is retained.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.dwc_members where username='sebas' and active),true);
set local role authenticated;
do $$declare result jsonb; begin
 result:=public.digibonk_submit_run('{"id":"qa-rollback-only","score":0,"time":15,"kills":0,"level":1,"species":"Botamon","version":"1.3.0","finished":true}'::jsonb);
 if result->>'accepted' <> 'true' then raise exception 'Submission failed'; end if;
 if not exists(select 1 from public.digibonk_leaderboard() where username='sebas') then raise exception 'Leaderboard read failed'; end if;
 result:=public.digibonk_submit_run('{"id":"qa-rollback-only","score":0,"time":15,"kills":0,"level":1,"species":"Botamon","version":"1.3.0","finished":true}'::jsonb);
 if result->>'new_best' <> 'false' then raise exception 'Duplicate changed best record'; end if;
end;$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform public.digibonk_leaderboard(); raise exception 'Anonymous access unexpectedly allowed'; exception when insufficient_privilege then null; end;
 if has_function_privilege('anon','public.digibonk_leaderboard()','EXECUTE') then raise exception 'Anonymous RPC permission'; end if;
 if has_table_privilege('authenticated','public.digibonk_records','INSERT') then raise exception 'Direct writes unexpectedly allowed'; end if;
end;$$;
rollback;
select 'OK: authenticated write/read, duplicate protection, anonymous denial; test rolled back' as result;
