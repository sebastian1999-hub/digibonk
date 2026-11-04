const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const base = require('../game/run-core'),
  B = require('../game/balance'),
  C = base.create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    require('../game/skill-system'),
  );
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.player.hp = r.s.player.maxHp = 1e8;
  r.s.player.invulnerable = 1e6;
  r.s.nextBoss = 1e6;
  return r;
}
test('normal enemies arrive in groups, are individually weaker, and stay within the existing population budget', () => {
  const r = fresh();
  for (let i = 0; i < 600; i++) r.update(1 / 60, {});
  assert.ok(r.s.enemies.length >= 20);
  assert.ok(r.s.enemies.length <= 40);
  assert.ok(B.main(0, -1).hp < 9);
  assert.equal(B.main(0, -1).batch, 3);
  assert.equal(B.main(600, 4).batch, 6);
  for (let i = 0; i < 500; i++) r.spawn();
  assert.equal(r.s.enemies.length, 210);
  const restored = new C.Run(null, { saved: r.snapshot() });
  assert.equal(restored.s.enemies.length, 210);
});
test('portal waves contain crowds with mostly melee enemies and remain completable within their population budget', () => {
  const r = fresh();
  r.s.level = 20;
  r.s.time = 200;
  assert.ok(r.enterPortal(r.s.world.portals[0].id));
  r.updateRealmWaves(3);
  assert.equal(r.s.enemies.filter((e) => e.realmMob).length, 0);
  assert.ok(r.s.realm.pendingSpawns > 0);
  for (let i = 0; i < 2000 && r.s.realm.pendingSpawns > 0; i++) r.updateRealmWaves(0.1);
  const mobs = r.s.enemies.filter((e) => e.realmMob);
  assert.ok(mobs.length >= 20);
  assert.ok(mobs.length <= B.realm(r.s.realm.pressure, 1).count);
  assert.ok(mobs.length <= 150);
  assert.ok(mobs.filter((e) => e.ranged === false).length > mobs.length / 2);
  for (let wave = 1; wave <= 3; wave++) {
    assert.equal(r.s.realm.wave, wave);
    for (let i = 0; i < 2000 && r.s.realm.pendingSpawns > 0; i++) r.updateRealmWaves(0.1);
    for (const enemy of r.s.enemies) if (enemy.realmMob) enemy.hp = 0;
    r.updateRealmWaves(0.01);
    r.updateRealmWaves(5);
  }
  assert.equal(r.s.realm.phase, 'tower');
  assert.equal(r.s.enemies.find((e) => e.tower).shielded, false);
  assert.ok(B.realm(B.pressure({ level: 99, time: 900, stage: 4, cleansed: 5 }), 3).count <= 145);
});

test('crowd separation spreads overlapping enemies without changing bosses or the target direction in open space', () => {
  const a = { id: 1, x: 0, z: 0, hp: 10 },
    b = { id: 2, x: 0, z: 0, hp: 10 },
    grid = C.crowdGrid([a, b]);
  const da = C.crowdDirection(a, { x: 0, z: 0 }, grid),
    db = C.crowdDirection(b, { x: 0, z: 0 }, grid);
  assert.ok(Math.hypot(da.x, da.z) > 0);
  assert.ok(Math.abs(da.x + db.x) < 1e-8 && Math.abs(da.z + db.z) < 1e-8);
  assert.deepEqual(C.crowdDirection({ ...a, boss: true }, { x: 3, z: 4 }, grid), { x: 3, z: 4 });
  assert.deepEqual(C.crowdDirection(a, { x: 3, z: 4 }, C.crowdGrid([a])), { x: 0.6, z: 0.8 });
});

test('regular spawns keep one species per timed cohort and saved portals retain their spawn queue', () => {
  const r = fresh();
  for (let i = 0; i < 30; i++) r.spawn();
  assert.equal(new Set(r.s.enemies.map((e) => e.species)).size, 1);
  r.enterPortal(r.s.world.portals[0].id);
  r.updateRealmWaves(3);
  r.updateRealmWaves(0.3);
  const pending = r.s.realm.pendingSpawns;
  assert.ok(pending > 0);
  assert.equal(r.s.enemies.filter((e) => e.realmMob).length, 1);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.equal(copy.s.realm.pendingSpawns, pending);
  for (let i = 0; i < 30; i++) {
    r.updateRealmWaves(0.1);
    copy.updateRealmWaves(0.1);
  }
  assert.deepEqual(copy.s.enemies, r.s.enemies);
  assert.equal(new Set(r.s.enemies.filter((e) => e.realmMob).map((e) => e.species)).size, 1);
  r.s.enemies.forEach((e) => {
    if (e.realmMob) e.hp = 0;
  });
  r.updateRealmWaves(0.01);
  assert.equal(r.s.realm.waiting, false);
});
