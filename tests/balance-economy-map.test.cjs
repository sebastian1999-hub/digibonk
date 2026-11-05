const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  B = require('../game/balance'),
  WORLD = require('../game/run-core').WORLD,
  MapIcons = require('../game/map-icons'),
  box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const C = require('../game/run-core').create(
  box.window.SPECIES_CATALOG,
  box.window.EVOLUTION_ROUTES,
  require('../game/skill-system'),
);
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  Object.assign(r.s.player, { species: 'Agumon', stage: 1 });
  return r;
}
test('intro has lower density, damage and speed, with normal pressure restored after ninety seconds', () => {
  const early = B.main(0, -1),
    normal = B.main(90, -1);
  assert.ok(early.interval > 1);
  assert.ok(early.hp < normal.hp / 2);
  assert.ok(early.speed < normal.speed);
  assert.ok(early.contact < normal.contact);
  assert.equal(early.elite, 0);
  assert.ok(B.main(100, -1).elite > 0);
});
test('level upgrades remain useful after capped attributes and maxed techniques', () => {
  const r = fresh();
  Object.assign(r.s.player, {
    speed: 15,
    crit: 0.85,
    magnet: 24,
    projectileBonus: 5,
    orbits: 6,
    weapons: [
      { id: 'bubble', rank: 9 },
      { id: 'claw', rank: 9 },
      { id: 'heal', rank: 9 },
      { id: 'focus', rank: 9 },
    ],
  });
  for (let i = 0; i < 100; i++) {
    r.s.choice = r.choices();
    const cards = r.s.choice.cards;
    assert.equal(cards.length, 3);
    assert.ok(
      cards.every(
        (c) =>
          c.type === 'stat' && !['speed', 'crit', 'magnet', 'projectile', 'orbit'].includes(c.id),
      ),
    );
    const card = cards[0],
      before = r.s.player[card.stat];
    assert.ok(r.choose(card.id));
    assert.ok(r.s.player[card.stat] > before);
  }
});

test('global shop price survives portals and legacy merchant price migration', () => {
  const r = fresh();
  r.s.coins = 200;
  r.s.player.species = 'Agumon';
  r.s.player.stage = 1;
  const shop = r.map.pois.find((p) => p.type === 'merchant');
  Object.assign(r.s.player, shop);
  r.interact();
  r.choose(r.s.choice.cards[0].id);
  const price = r.shopPrice();
  r.enterPortal(r.s.world.portals[0].id);
  r.leaveRealm();
  assert.equal(r.poiCost(shop), 0);
  const old = r.snapshot();
  delete old.shopPurchases;
  old.poiPrices = { merchant: 90, 'merchant-west': 65 };
  assert.equal(new C.Run(null, { saved: old }).s.shopPurchases, 3);
});
test('portals scale with entry level and elapsed time while each wave increases pressure', () => {
  for (const [level, time, stage] of [
    [1, 0, -1],
    [6, 100, 1],
    [12, 220, 2],
    [30, 600, 4],
  ]) {
    const p = B.pressure({ level, time, stage }),
      first = B.realm(p, 1),
      third = B.realm(p, 3),
      outside = B.main(time, first.stage);
    assert.ok(first.hp >= outside.hp);
    assert.ok(first.contact > 0);
    assert.ok(first.speed > 0);
    assert.ok(third.hp > first.hp);
    assert.ok(third.count > first.count);
    const delayed = B.realm(B.pressure({ level: level + 10, time: time + 120, stage }), 1);
    assert.ok(delayed.hp > first.hp);
    assert.ok(delayed.count >= first.count);
    assert.ok(first.xp >= 2 && first.coins >= 2);
  }
});
test('build improvements earned inside remain useful and pending enemies scale up on reentry without healing', () => {
  const r = fresh();
  r.s.time = 120;
  r.s.level = 8;
  r.enterPortal(r.s.world.portals[0].id);
  r.spawnRealmMob(1, 'test');
  let mob = r.s.enemies.find((e) => e.realmMob),
    tower = r.s.enemies.find((e) => e.tower);
  const profile = structuredClone(r.s.realm.pressure),
    stats = B.realm(profile, 1);
  r.s.player.damage *= 10;
  r.s.level += 4;
  assert.deepEqual(r.s.realm.pressure, profile);
  assert.equal(B.realm(profile, 1).hp, stats.hp);
  mob.hp = mob.maxHp * 0.4;
  tower.shielded = false;
  tower.hp = tower.maxHp * 0.7;
  const oldHp = mob.maxHp,
    towerHp = tower.maxHp;
  r.leaveRealm();
  r.s.time += 180;
  r.s.level += 8;
  assert.ok(r.enterPortal(r.s.world.portals[0].id));
  mob = r.s.enemies.find((e) => e.realmMob);
  tower = r.s.enemies.find((e) => e.tower);
  assert.ok(mob.maxHp > oldHp);
  assert.ok(tower.maxHp > towerHp);
  assert.ok(Math.abs(mob.hp / mob.maxHp - 0.4) < 0.00001);
  assert.ok(Math.abs(tower.hp / tower.maxHp - 0.7) < 0.00001);
  const saved = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(saved.s.realm.pressure, r.s.realm.pressure);
});
test('old unfinished portals acquire entry pressure while preserving wave progress', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[0].id);
  r.updateRealmWaves(3);
  const saved = r.snapshot();
  delete saved.realm.pressure;
  saved.level = 18;
  saved.time = 300;
  const restored = new C.Run(null, { saved });
  assert.equal(restored.s.realm.wave, 1);
  assert.equal(restored.s.realm.pressure.level, 18);
  assert.ok(restored.s.enemies.filter((e) => e.realmMob).every((e) => e.contactDamage > 10));
});
test('map markers distinguish objects by shape, omit consumed chests and show return, tower and closed portals', () => {
  const r = fresh(),
    chest = r.map.pois.find((p) => p.type === 'chest');
  r.s.usedPois.push(chest.id);
  r.s.world.portals[0].closed = true;
  const icons = MapIcons.markers(r.s, r.map);
  for (const type of ['chest', 'shop', 'fire', 'shrine', 'portal', 'closed', 'boss', 'player'])
    assert.ok(
      icons.some((i) => i.type === type),
      type,
    );
  assert.equal(icons.filter((i) => i.type === 'chest').length, 5);
  assert.ok(!icons.some((i) => i.x === chest.x && i.z === chest.z));
  assert.ok(r.enterPortal(r.s.world.portals[1].id));
  const realm = MapIcons.markers(r.s, r.map);
  assert.ok(realm.some((i) => i.type === 'exit'));
  assert.ok(realm.some((i) => i.type === 'tower'));
  assert.ok(!realm.some((i) => i.type === 'boss'));
});

test('first portal has gentler crowds, elites, projectiles and tower; each cleared portal raises all pressure', () => {
  const base = { level: 6, time: 100, stage: 1, shops: 0 };
  const first = B.pressure({ ...base, cleansed: 0 });
  assert.deepEqual(
    [1, 2, 3].map((w) => B.realm(first, w).count),
    [19, 29, 41],
  );
  assert.ok(B.realm(first, 1).eliteChance < 0.06);
  assert.ok(B.realm(first, 1).rangedChance < 0.2);
  assert.ok(B.tower(first) >= 350);
  for (let n = 1; n < 6; n++) {
    const prev = B.pressure({ ...base, cleansed: n - 1 }),
      next = B.pressure({ ...base, cleansed: n });
    for (let wave = 1; wave <= 3; wave++) {
      const a = B.realm(prev, wave),
        b = B.realm(next, wave);
      for (const field of [
        'hp',
        'count',
        'speed',
        'contact',
        'shot',
        'projectileSpeed',
        'eliteChance',
        'rangedChance',
        'reinforcementCount',
      ])
        assert.ok(b[field] > a[field], field);
      assert.ok(b.shotInterval < a.shotInterval);
      assert.ok(b.reinforcementInterval < a.reinforcementInterval);
    }
    assert.ok(B.tower(next) > B.tower(prev));
  }
});
test('old active portal balance migrates while preserving damage and cleared progress', () => {
  const r = fresh();
  r.s.level = 6;
  r.s.time = 100;
  r.enterPortal(r.s.world.portals[0].id);
  r.spawnRealmMob(1, 'test');
  const mob = r.s.enemies.find((e) => e.realmMob),
    tower = r.s.enemies.find((e) => e.tower);
  mob.hp = mob.maxHp * 0.4;
  tower.hp = tower.maxHp * 0.7;
  const saved = r.snapshot();
  saved.realm.pressure.version = 1;
  const restored = new C.Run(null, { saved });
  assert.equal(restored.s.realm.pressure.version, 3);
  const m = restored.s.enemies.find((e) => e.realmMob),
    t = restored.s.enemies.find((e) => e.tower);
  assert.ok(Math.abs(m.hp / m.maxHp - 0.4) < 1e-9);
  assert.ok(Math.abs(t.hp / t.maxHp - 0.7) < 1e-9);
  assert.equal(restored.s.world.cleansed, 0);
});

test('island and portal enemies appear 38–50 units away, including at borders and corners', () => {
  for (const realm of [false, true]) {
    const r = fresh();
    if (realm) assert.ok(r.enterPortal(r.s.world.portals[0].id));
    for (const [x, z] of [
      [0, 0],
      [WORLD - 7, 0],
      [-WORLD + 7, 0],
      [0, WORLD - 7],
      [0, -WORLD + 7],
      [WORLD - 7, WORLD - 7],
      [-WORLD + 7, -WORLD + 7],
      [WORLD - 7, -WORLD + 7],
      [-WORLD + 7, WORLD - 7],
    ]) {
      Object.assign(r.s.player, { x, z });
      let spawned = 0;
      for (let i = 0; i < 20; i++) {
        r.s.enemies = [];
        if (realm) r.spawnRealmMob(1, 'distance-test');
        else r.spawn(i % 2 === 0);
        for (const enemy of r.s.enemies) {
          const distance = Math.hypot(enemy.x - x, enemy.z - z);
          assert.ok(distance >= 38 - 1e-8 && distance <= 50 + 1e-8, `${realm}: ${distance}`);
          assert.ok(Math.abs(enemy.x) <= WORLD - 6 && Math.abs(enemy.z) <= WORLD - 6);
          spawned++;
        }
      }
      assert.ok(spawned >= 15, `not enough valid spawns at ${x},${z}: ${spawned}`);
    }
  }
});
