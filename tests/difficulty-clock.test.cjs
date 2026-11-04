const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const B = require('../game/balance'),
  L = require('../game/loot'),
  Chest = require('../game/chest-system'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    require('../game/skill-system'),
  );
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.spawnClock = r.s.nextBoss = 1e6;
  r.s.player.invulnerable = 1e6;
  return r;
}
function tick(r, seconds) {
  r.s.time += seconds;
  r.updateWorld(seconds, {});
}
test('each run gets 180 active seconds; overdue pressure starts at expiry and increases afterward', () => {
  const r = fresh();
  assert.equal(r.portalClockInfo().remaining, 180);
  tick(r, 179);
  assert.equal(r.portalClockInfo().remaining, 1);
  assert.equal(r.portalClockInfo().phase, 'countdown');
  tick(r, 1);
  assert.equal(r.portalClockInfo().phase, 'overdue');
  assert.ok(B.deadline(r.s.portalCycle.overdue).hp >= 2);
  const first = r.s.portalCycle.overdue;
  tick(r, 60);
  assert.ok(r.s.portalCycle.overdue > first + 59);
  assert.ok(B.deadline(r.s.portalCycle.overdue).hp > 4);
  assert.equal(r.events.filter((e) => e.type === 'portal-deadline').length, 1);
});
test('entering suspends the entry timer; leaving resumes the same time and reentering cannot reset it', () => {
  const r = fresh(),
    id = r.s.world.portals[0].id;
  tick(r, 100);
  assert.ok(r.enterPortal(id));
  tick(r, 10);
  assert.equal(r.s.portalCycle.remaining, 80);
  assert.equal(r.portalClockInfo().phase, 'inside');
  assert.ok(r.leaveRealm());
  tick(r, 5);
  assert.equal(r.s.portalCycle.remaining, 75);
  assert.ok(r.enterPortal(id));
  assert.equal(r.s.portalCycle.remaining, 75);
  r.leaveRealm();
  tick(r, 80);
  const overdue = r.s.portalCycle.overdue;
  assert.ok(overdue >= 5);
  r.enterPortal(id);
  tick(r, 5);
  assert.equal(r.s.portalCycle.overdue, overdue);
  assert.ok(r.s.realm.pressure.overdue >= 5);
});
test('purifying resets only the portal deadline, not elapsed time or global growth; the last portal removes the deadline', () => {
  const r = fresh();
  tick(r, 240);
  const elapsed = r.s.time,
    growth = B.timeGrowth(elapsed);
  r.enterPortal(r.s.world.portals[0].id);
  const tower = r.s.enemies.find((e) => e.tower);
  tower.shielded = false;
  r.s.realm.phase = 'tower';
  assert.ok(r.onTowerDestroyed(tower));
  assert.equal(r.s.portalCycle.remaining, 180);
  assert.equal(r.s.portalCycle.overdue, 0);
  assert.equal(r.s.time, elapsed);
  assert.equal(B.timeGrowth(r.s.time), growth);
  assert.equal(r.onTowerDestroyed(tower), false);
  r.leaveRealm();
  tick(r, 2);
  assert.equal(r.s.portalCycle.remaining, 178);
  r.s.world.cleansed = r.s.world.target;
  tick(r, 20);
  assert.equal(r.s.portalCycle.remaining, 178);
  assert.equal(r.portalClockInfo().phase, 'complete');
});
test('save resume preserves deadlines and overdue pressure; pause, hatch, and choices do not spend time; old saves get one fresh deadline', () => {
  const r = fresh();
  tick(r, 200);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(copy.s.portalCycle, r.s.portalCycle);
  copy.s.choice = { kind: 'level', cards: [] };
  const before = structuredClone(copy.s.portalCycle);
  copy.update(0.05);
  assert.deepEqual(copy.s.portalCycle, before);
  copy.s.choice = null;
  copy.s.hatch = 1;
  copy.update(0.05);
  assert.deepEqual(copy.s.portalCycle, before);
  const old = r.snapshot();
  delete old.portalCycle;
  const migrated = new C.Run(null, { saved: old });
  assert.equal(migrated.s.portalCycle.remaining, 180);
  tick(migrated, 30);
  const reloaded = new C.Run(null, { saved: migrated.snapshot() });
  assert.equal(reloaded.s.portalCycle.remaining, 150);
});
test('late pressure immediately affects new mobs and strengthens existing mobs without restoring their health ratio', () => {
  const r = fresh();
  r.s.time = 179;
  r.spawn();
  const e = r.s.enemies[0];
  e.hp = e.maxHp * 0.4;
  const hp = e.maxHp,
    damage = e.contactDamage;
  r.s.portalCycle.remaining = 1;
  tick(r, 2);
  assert.ok(e.maxHp >= hp * 2);
  assert.ok(e.contactDamage >= damage * 1.5);
  assert.ok(Math.abs(e.hp / e.maxHp - 0.4) < 1e-9);
  r.spawn();
  const newest = r.s.enemies.at(-1),
    base = B.main(r.s.time, newest.stage, !!newest.boss);
  assert.ok(newest.maxHp >= base.hp * 2);
  assert.ok(newest.contactDamage >= base.contact * 1.5);
});
test('global growth accelerates instead of settling, even after all portals; speed, shots and density remain bounded', () => {
  const values = [180, 240, 300, 360, 420].map(B.timeGrowth);
  assert.equal(values[0], 1);
  for (let i = 2; i < values.length; i++)
    assert.ok(values[i] - values[i - 1] > values[i - 1] - values[i - 2]);
  assert.ok(B.timeGrowth(1200) > B.timeGrowth(600) * 4);
  for (const time of [0, 180, 600, 1800, 36000]) {
    const stats = B.main(time, 4);
    for (const value of Object.values(stats)) assert.ok(Number.isFinite(value));
    assert.ok(stats.speed <= 12);
    assert.ok(stats.batch <= 6);
    assert.ok(stats.interval >= 0.18);
  }
  const r = fresh();
  r.s.world.cleansed = r.s.world.target;
  r.s.time = 600;
  r.spawn();
  const e = r.s.enemies[0],
    hp = e.maxHp;
  e.hp = hp * 0.3;
  tick(r, 120);
  assert.ok(e.maxHp > hp);
  assert.ok(Math.abs(e.hp / e.maxHp - 0.3) < 1e-9);
});
test('time keeps scaling a portal while entry level and enemy stages remain fixed, preserving injury and cached progress', () => {
  const r = fresh();
  r.s.level = 6;
  r.s.time = 170;
  r.enterPortal(r.s.world.portals[0].id);
  r.spawnRealmMob(1, 'test');
  const e = r.s.enemies.find((e) => e.realmMob),
    stage = r.s.realm.pressure.enemyStage,
    hp = e.maxHp;
  e.hp = e.maxHp * 0.5;
  const tower = r.s.enemies.find((e) => e.tower);
  tower.hp = tower.maxHp * 0.6;
  r.s.level = 30;
  tick(r, 120);
  assert.equal(r.s.realm.pressure.level, 6);
  assert.equal(r.s.realm.pressure.enemyStage, stage);
  assert.ok(e.maxHp > hp);
  assert.ok(Math.abs(e.hp / e.maxHp - 0.5) < 1e-9);
  assert.ok(Math.abs(tower.hp / tower.maxHp - 0.6) < 1e-9);
  r.leaveRealm();
  r.enterPortal(r.s.world.portals[0].id);
  assert.equal(r.s.realm.pressure.level, 30);
});
test('gamble chance is 20 percent, fails at the exact threshold, saves its chance and does not charge again', () => {
  assert.equal(Chest.riskSuccess, 0.2);
  let won = 0;
  for (let n = 0; n < 1000; n++) {
    const r = fresh();
    r.random = () => 0;
    r.s.choice = r.chestChoices();
    r.revealChest(r.s.choice.roll.id + ':0');
    r.s.coins = 40;
    r.random = () => n / 1000;
    assert.ok(r.riskChest());
    if (r.s.choice.cards.length) won++;
    assert.equal(r.s.choice.roll.riskChance, 0.2);
    assert.equal(r.s.coins, 40);
    assert.equal(r.riskChest(), false);
  }
  assert.equal(won, 200);
});

test('old ambient mobs catch up to current base strength rather than retaining their weak starting stats', () => {
  const r = fresh();
  r.spawn();
  const e = r.s.enemies[0];
  e.hp = e.maxHp * 0.25;
  r.s.world.cleansed = r.s.world.target;
  tick(r, 600);
  const expected = B.main(r.s.time, e.stage, !!e.boss).hp * (e.elite ? 1.8 : 1);
  assert.ok(Math.abs(e.maxHp - expected) < 1e-8);
  assert.ok(Math.abs(e.hp / e.maxHp - 0.25) < 1e-8);
  assert.ok(e.contactDamage >= B.main(r.s.time, e.stage).contact);
});
