const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
let PGlite;
for (const location of [
  '../.build/database-test/node_modules/@electric-sql/pglite',
  '../../.qa-supabase/node_modules/@electric-sql/pglite',
]) {
  try {
    ({ PGlite } = require(path.resolve(__dirname, location)));
    break;
  } catch {}
}
if (process.env.CI && !PGlite) throw Error('PostgreSQL test runtime is required in CI');

test(
  'weekly ranking uses Madrid Mondays, preserves history, accepts lower new-week records and isolates accounts',
  { skip: !PGlite },
  async () => {
    const db = new PGlite(),
      a = '11111111-1111-4111-8111-111111111111',
      b = '22222222-2222-4222-8222-222222222222',
      outsider = '33333333-3333-4333-8333-333333333333';
    const migration = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/202611070003_weekly_leaderboard.sql'),
      'utf8',
    );
    try {
      await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.dwc_members(user_id uuid primary key,username text,display_name text,active boolean);
      create function public.dwc_is_member() returns boolean language sql security definer as $$select exists(select 1 from public.dwc_members where user_id=auth.uid() and active)$$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid(),public.dwc_is_member() to anon,authenticated;
      insert into auth.users values('${a}'),('${b}'),('${outsider}');
      insert into public.dwc_members values('${a}','alice','Alice',true),('${b}','bob','Bob',true);`);
      await db.exec(
        fs.readFileSync(
          path.join(__dirname, '../supabase/migrations/202611010001_digibonk_leaderboard.sql'),
          'utf8',
        ),
      );
      await db.exec(
        `insert into public.digibonk_records values('${a}','old-best',10000,600,10,10,'Agumon','1.3.0',now()-interval '8 days');`,
      );
      await db.exec(migration);
      async function asUser(uid, action, role = 'authenticated') {
        await db.exec('begin; set local role ' + role);
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
        try {
          const result = await action();
          await db.exec('commit');
          return result;
        } catch (e) {
          await db.exec('rollback');
          throw e;
        }
      }
      const board = () =>
        db.query('select * from public.digibonk_leaderboard()').then((r) => r.rows);
      const submit = (uid, id, score, extra = {}) =>
        asUser(uid, () =>
          db
            .query('select public.digibonk_submit_run($1::jsonb) as result', [
              JSON.stringify({
                id,
                score,
                time: 100,
                kills: 10,
                level: 4,
                species: 'Agumon',
                version: '1.3.0',
                finished: true,
                ...extra,
              }),
            ])
            .then((r) => r.rows[0].result),
        );
      assert.deepEqual(await asUser(a, board), []);
      assert.equal((await submit(a, 'current-a', 200)).new_best, true);
      await submit(b, 'current-b', 300);
      assert.deepEqual(
        (await asUser(a, board)).map((r) => r.username),
        ['bob', 'alice'],
      );
      await submit(a, 'better-a', 400);
      assert.equal((await asUser(a, board))[0].score, 400);
      assert.equal(
        (await submit(a, 'better-a', 9000)).new_best,
        false,
        'replays cannot mutate a run',
      );
      const oldDate = (await db.query("select (now()-interval '8 days')::text as date")).rows[0]
        .date;
      await submit(a, 'offline-old', 20000, { finished_at: oldDate });
      assert.equal(
        (await asUser(a, board))[0].score,
        400,
        'late uploads stay in their completed week',
      );
      assert.equal(
        (await db.query('select count(*)::int as n from public.digibonk_weekly_runs')).rows[0].n,
        5,
      );
      await assert.rejects(asUser(outsider, board), (e) => e.code === '42501');
      await assert.rejects(asUser(null, board, 'anon'), (e) => e.code === '42501');
      await assert.rejects(
        asUser(a, () => db.query('select * from public.digibonk_weekly_runs')),
        (e) => e.code === '42501',
      );
      await assert.rejects(
        submit(a, 'future', 100, { finished_at: '2100-01-01T00:00:00Z' }),
        (e) => e.code === '22023',
      );
      for (const [date, week] of [
        ['2026-03-29T21:59:59Z', '2026-03-23'],
        ['2026-03-29T22:00:00Z', '2026-03-30'],
        ['2026-10-25T22:59:59Z', '2026-10-19'],
        ['2026-10-25T23:00:00Z', '2026-10-26'],
        ['2027-01-03T23:00:00Z', '2027-01-04'],
      ]) {
        assert.equal(
          (await db.query('select public.digibonk_week_start($1)::text as week', [date])).rows[0]
            .week,
          week,
        );
      }
      // Move every retained result into the previous week: the new season is empty without deleting anything.
      await db.exec(
        "update public.digibonk_weekly_runs set achieved_at=achieved_at-interval '7 days',week_start=public.digibonk_week_start(achieved_at-interval '7 days')",
      );
      assert.deepEqual(await asUser(a, board), []);
      await submit(a, 'new-season', 50);
      assert.equal((await asUser(a, board))[0].score, 50);
      assert.equal(
        (await db.query('select score from public.digibonk_records where user_id=$1', [a])).rows[0]
          .score,
        20000,
      );
      await db.exec(migration);
      assert.equal((await asUser(a, board))[0].score, 50, 'reapplying the migration is safe');
    } finally {
      await db.close();
    }
  },
);
