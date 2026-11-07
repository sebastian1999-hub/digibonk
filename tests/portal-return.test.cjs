const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const skills = require('../game/skill-system'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    skills,
  );
function fresh() {
  const run = new C.Run('Botamon', { seed: 123 });
  run.s.hatch = 0;
  Object.assign(run.s.player, { species: 'Agumon', stage: 1, weapons: [], basicClock: 1000 });
  run.s.spawnClock = run.s.nextBoss = 1000;
  return run;
}
function clear(run) {
  const tower = run.s.enemies.find((e) => e.tower);
  tower.shielded = false;
  return run.onTowerDestroyed(tower);
}

test('clearing credits every realm gem with normal XP, score and healing, exactly once', () => {
  const r = fresh(),
    mainGem = { id: 800, x: 90, z: 90, value: 9 };
  r.s.gems = [mainGem];
  r.enterPortal(r.s.world.portals[0].id);
  r.s.player.xpMult = 1.6;
  r.s.player.hp = 50;
  r.s.gems = [
    { id: 801, x: 100, z: 100, value: 1.25, heal: true },
    { id: 802, x: -100, z: -100, value: 2.75 },
  ];
  const before = { xp: r.s.xp, total: r.s.totalXp, score: r.s.score };
  assert.equal(clear(r), true);
  assert.equal(r.s.xp, before.xp + 60 + 4 * 1.6);
  assert.equal(r.s.totalXp, before.total + 60 + 4 * 1.6);
  assert.equal(r.s.score, before.score + 1000 + 2 + 3);
  assert.equal(r.s.player.hp, 58);
  assert.deepEqual(r.s.gems, []);
  assert.equal(clear(r), false);
  const credited = r.s.xp;
  r.leaveRealm();
  assert.equal(r.s.xp, credited);
  assert.deepEqual(r.s.gems, [mainGem], 'island gems are restored without being collected');
  assert.equal(r.leaveRealm(), false);
  assert.equal(r.s.xp, credited);
});

test('the last wave kill includes its own XP drop before automatic tower completion', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[0].id);
  Object.assign(r.s.realm, {
    wave: 3,
    waveToken: 'last-wave',
    waveTotal: 1,
    pendingSpawns: 0,
    waiting: false,
  });
  assert.ok(r.spawnRealmMob(3, 'last-wave'));
  const enemy = r.s.enemies.find((e) => e.realmMob);
  enemy.elite = false;
  const value = Math.round(enemy.xpValue);
  r.s.gems = [{ id: 803, x: 100, z: 100, value: 4 }];
  const xp = r.s.xp;
  r.hurt(enemy, 1e9);
  assert.equal(r.s.realm.phase, 'cleared');
  assert.equal(r.s.xp, xp + 60 + 4 + value);
  assert.deepEqual(r.s.gems, []);
});

test('unfinished exits preserve realm gems; old cleared saves credit remaining gems on return', () => {
  const r = fresh(),
    portal = r.s.world.portals[0].id;
  r.enterPortal(portal);
  r.s.gems = [{ id: 804, x: 100, z: 100, value: 7 }];
  const xp = r.s.xp;
  r.leaveRealm();
  assert.equal(r.s.xp, xp);
  r.enterPortal(portal);
  assert.equal(r.s.gems[0].value, 7);
  clear(r);
  // A save made by an older client can still have uncollected gems after clearing.
  r.s.gems = [{ id: 805, x: 100, z: 100, value: 11 }];
  const loaded = new C.Run(null, { saved: r.snapshot() }),
    before = loaded.s.xp;
  loaded.leaveRealm();
  assert.equal(loaded.s.xp, before + 11);
});

test('every portal exit gives all island enemies a short hold and gradual movement recovery', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[0].id);
  r.leaveRealm();
  r.s.spawnClock = r.s.nextBoss = 1000;
  r.currentSector = () => ({ kind: 'plain' });
  r.spawn();
  assert.equal(r.s.portalReturnGrace, 3.5);
  assert.equal(r.portalReturnSpeed(), 0);
  const enemy = r.s.enemies[0],
    x = enemy.x,
    z = enemy.z;
  r.update(0.05, {});
  assert.equal(enemy.x, x);
  assert.equal(enemy.z, z);
  r.s.portalReturnGrace = 3;
  assert.equal(r.enemyWorldSpeed(enemy), 0);
  r.s.portalReturnGrace = 2.25;
  assert.equal(r.enemyWorldSpeed(enemy), 0.25);
  r.spawn();
  assert.equal(
    r.enemyWorldSpeed(r.s.enemies.at(-1)),
    0.25,
    'new enemies use the same remaining recovery',
  );
  r.s.portalReturnGrace = 1.5;
  assert.equal(r.enemyWorldSpeed(enemy), 0.5);
  r.s.portalReturnGrace = 0.75;
  assert.equal(r.enemyWorldSpeed(enemy), 0.75);
  r.s.portalReturnGrace = 0;
  assert.equal(r.enemyWorldSpeed(enemy), 1);
});

test('return recovery survives saves, pauses during choices and does not slow enemies inside portals', () => {
  const r = fresh(),
    portal = r.s.world.portals[0].id;
  r.enterPortal(portal);
  r.leaveRealm();
  r.s.portalReturnGrace = 2.5;
  const loaded = new C.Run(null, { saved: r.snapshot() });
  assert.equal(loaded.s.portalReturnGrace, 2.5);
  loaded.s.choice = { kind: 'level', cards: [] };
  loaded.update(0.05, {});
  assert.equal(loaded.s.portalReturnGrace, 2.5);
  loaded.s.choice = null;
  loaded.s.xp = 0;
  loaded.update(0.05, {});
  assert.equal(loaded.s.portalReturnGrace, 2.45);
  loaded.enterPortal(portal);
  assert.equal(loaded.portalReturnSpeed(), 1);
});

test('returning schedules a random wait instead of spawning an instant crowd, preserved on save', () => {
  for (const value of [0, 0.5, 0.999]) {
    const r = fresh();
    r.enterPortal(r.s.world.portals[0].id);
    r.random = () => value;
    r.leaveRealm();
    assert.equal(r.s.enemies.length, 0);
    assert.ok(r.s.spawnClock >= 1.5 && r.s.spawnClock < 3);
    const loaded = new C.Run(null, { saved: r.snapshot() });
    assert.equal(loaded.s.spawnClock, r.s.spawnClock);
    for (let i = 0; i < 20; i++) loaded.update(0.05, {});
    assert.equal(
      loaded.s.enemies.length,
      0,
      'the arrival point stays clear during the initial wait',
    );
  }
});

test('ordinary enemy groups arrive after varying positive delays without exceeding the population cap', () => {
  const r = fresh(),
    delays = [];
  for (let i = 0; i < 20; i++) {
    r.s.spawnClock = 0;
    r.update(0.05, {});
    delays.push(r.s.spawnClock);
  }
  assert.ok(delays.every((delay) => delay >= 0.18 && delay < 2));
  assert.ok(new Set(delays.map((delay) => delay.toFixed(4))).size > 10);
  assert.ok(r.s.enemies.length > 0 && r.s.enemies.length <= 210);
});
