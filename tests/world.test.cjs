const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const base = require('../game/run-core'),
  skills = require('../game/skill-system'),
  C = base.create(box.window.SPECIES_CATALOG, box.window.EVOLUTION_ROUTES, skills),
  W = require('../game/world-rules');
function fresh(name = 'Agumon', stage = 1) {
  const r = new C.Run('Botamon', { seed: 123, id: 'world-test' });
  r.s.hatch = 0;
  Object.assign(r.s.player, { species: name, stage, crit: 0 });
  r.s.spawnClock = 1000;
  r.s.nextBoss = 1000;
  return r;
}
function mob(x = 2, z = 0) {
  return { id: 90, x, z, hp: 200, maxHp: 200, hit: 0, speed: 0, shotClock: 100, stage: 1 };
}
test('evolution branches unlock materially different styles including mechanical Greymon', () => {
  for (const [name, stage, expected] of [
    ['Botamon', -1, null],
    ['Greymon', 2, 'vanguard'],
    ['Garurumon', 2, 'hunter'],
    ['Angemon', 2, 'guardian'],
    ['Kabuterimon', 2, 'controller'],
    ['MetalGreymon', 3, 'artillery'],
    ['Gomamon', 1, 'tide'],
  ])
    assert.equal(fresh(name, stage).style()?.id || null, expected);
  for (const s of box.window.SPECIES_CATALOG.filter((s) => s.stage >= 1))
    assert.ok(W.styleFor(s.id, s.stage, skills.family(s.id)));
});
test('vanguard charges collide once, hunter fires a burst, tide pushes and slows', () => {
  const a = fresh('Greymon', 2);
  a.s.enemies = [mob()];
  assert.ok(a.castStyle());
  assert.equal(a.castStyle(), false);
  a.updateStyleFields(0.01);
  const hp = a.s.enemies[0].hp;
  assert.ok(hp < 200);
  a.updateStyleFields(0.01);
  assert.equal(a.s.enemies[0].hp, hp);
  const h = fresh('Garurumon', 2);
  h.s.enemies = [mob(5)];
  assert.ok(h.castStyle());
  assert.equal(h.s.shots.length, 3);
  const w = fresh('Gomamon');
  w.s.enemies = [mob()];
  w.castStyle();
  assert.ok(w.s.enemies[0].hp < 200);
  assert.ok(w.s.enemies[0].x > 2);
  assert.equal(w.s.enemies[0].slowLeft, 2.5);
});
test('guardian heals within its seal and reflects at most three enemy projectiles', () => {
  const r = fresh('Angemon', 2);
  r.s.enemies = [mob(6)];
  r.s.player.hp = 50;
  r.castStyle();
  r.updateStyleFields(0.5);
  assert.equal(r.s.player.hp, 50.5);
  for (let i = 0; i < 4; i++) {
    const shot = { x: 0, z: 0, life: 2 };
    assert.equal(r.reflectProjectile(shot), i < 3);
  }
  assert.equal(r.s.shots.length, 3);
  assert.equal(r.incomingStyleDamage(), 0.75);
  r.s.player.x = 10;
  assert.equal(r.incomingStyleDamage(), 1);
});
test('controller slows only enemies in the garden; artillery strikes after its warning', () => {
  const r = fresh('Kabuterimon', 2);
  r.s.enemies = [mob(4)];
  r.castStyle();
  assert.equal(r.enemyWorldSpeed(r.s.enemies[0]), 0.45);
  assert.equal(r.enemyWorldSpeed(mob(30)), 1);
  const a = fresh('MetalGreymon', 3);
  a.s.enemies = [mob(4)];
  a.castStyle();
  assert.equal(a.s.enemies[0].hp, 200);
  a.updateStyleFields(0.9);
  assert.equal(a.s.enemies[0].hp, 200);
  a.updateStyleFields(0.11);
  assert.ok(a.s.enemies[0].hp < 200);
  assert.equal(a.s.styleFields.length, 0);
});
test('flood and glitch have explicit effects, water forms ignore flood, old saves migrate safely', () => {
  const r = fresh();
  r.currentSector().kind = 'flood';
  assert.equal(r.playerWorldSpeed(), 0.85);
  r.s.player.species = 'Gomamon';
  assert.equal(r.playerWorldSpeed(), 1);
  r.currentSector().kind = 'glitch';
  assert.equal(r.enemyWorldSpeed(mob(0)), 1.18);
  const old = r.snapshot();
  delete old.sectors;
  delete old.world;
  delete old.worldHazards;
  delete old.styleFields;
  const loaded = new C.Run(null, { saved: old });
  assert.equal(loaded.s.sectors.length, 9);
  assert.equal(loaded.s.world.phase, 'portals');
  assert.equal(loaded.s.world.portals.length, 6);
});

test('Devimon waits at the center, has a second-phase attack and victory continues the run', () => {
  const r = fresh('Angemon', 2);
  r.s.world.cleansed = 6;
  r.spawnDevimon();
  const boss = r.s.enemies.find((e) => e.finalBoss);
  r.s.player.x = 80;
  r.update(0.05);
  assert.equal(boss.engaged, false);
  assert.equal(boss.x, 0);
  r.s.player.x = 15;
  r.update(0.05);
  assert.equal(boss.engaged, true);
  boss.darkClock = 0;
  boss.hp = boss.maxHp * 0.4;
  r.updateDevimon(boss, 0.05);
  assert.ok(r.s.hostile.filter((h) => h.dark).length >= 7);
  r.s.player.crit = 0;
  const coins = r.s.coins,
    score = r.s.score;
  r.hurt(boss, 10000000, 'holy-ray');
  assert.equal(r.s.world.phase, 'endless');
  assert.equal(r.s.done, false);
  assert.equal(r.s.coins - coins, 250);
  assert.equal(r.s.score - score, 5000);
  r.hurt(boss, 10000000);
  assert.equal(r.s.coins - coins, 250);
  r.s.xp = 0;
  r.s.choice = null;
  const time = r.s.time;
  r.update(0.05, { x: 1 });
  assert.ok(r.s.time > time);
  const after = new C.Run(null, { saved: r.snapshot() });
  assert.equal(after.s.world.phase, 'endless');
  assert.equal(after.spawnDevimon(), false);
});
test('expanded map keeps landmarks and all required nodes reachable without hidden path corridors', () => {
  assert.equal(base.WORLD, 220);
  assert.ok(C.species.has('Devimon'));
  assert.ok(C.species.has('DemiDevimon'));
  for (const seed of [12, 123]) {
    const r = new C.Run('Botamon', { seed });
    assert.equal(r.map.pois.filter((p) => p.type === 'chest').length, 6);
    for (const id of ['fire', 'merchant', 'altar-1', 'altar-2'])
      assert.ok(r.map.pois.some((p) => p.id === id));
    for (const zone of r.s.world.portals.map((p) => ({ ...p, anchor: p }))) {
      const unit = { x: 0, z: 0 };
      for (
        let i = 0;
        i < 3000 && Math.hypot(unit.x - zone.anchor.x, unit.z - zone.anchor.z) > 1;
        i++
      ) {
        const d = C.enemyDirection(unit, zone.anchor, seed);
        r.move(unit, d.x, d.z, 12, 0.05, 0.55, true);
      }
      assert.ok(
        Math.hypot(unit.x - zone.anchor.x, unit.z - zone.anchor.z) < 1.1,
        seed + ' ' + zone.name,
      );
    }
  }
});

test('the final boss retains its slot and quest state even when the enemy budget is full', () => {
  const r = fresh();
  r.s.enemies = Array.from({ length: 220 }, (_, i) => ({ ...mob(), id: 100 + i }));
  r.spawnDevimon();
  assert.equal(r.s.enemies.length, 220);
  const saved = new C.Run(null, { saved: r.snapshot() });
  assert.ok(saved.s.enemies.some((e) => e.id === saved.s.world.devimonId && e.finalBoss));
  assert.equal(saved.spawnDevimon(), false);
});
function finishWaves(r) {
  for (let n = 1; n <= 3; n++) {
    r.updateRealmWaves(5);
    assert.equal(r.s.realm.wave, n);
    for (let tick = 0; tick < 1000 && (r.s.realm.pendingSpawns || 0) > 0; tick++)
      r.updateRealmWaves(0.1);
    const mobs = r.s.enemies.filter((e) => e.waveToken === r.s.realm.waveToken && e.hp > 0);
    assert.ok(mobs.length >= 6);
    for (const e of mobs) r.hurt(e, 1e8);
    r.updateRealmWaves(0.01);
  }
  r.updateRealmWaves(5);
  assert.equal(r.s.realm.phase, 'cleared');
}
test('six independent themed portals start on a stable main map and restore on save', () => {
  const r = fresh();
  assert.equal(r.s.world.portals.length, 6);
  assert.equal(new Set(r.s.world.portals.map((p) => p.seed)).size, 6);
  assert.equal(r.s.sectors.filter((z) => z.kind).length, 0);
  for (const k of ['fire', 'flood', 'glitch'])
    assert.equal(r.s.world.portals.filter((p) => p.kind === k).length, 2);
  const portal = r.s.world.portals[0];
  Object.assign(r.s.player, { x: portal.x, z: portal.z });
  assert.equal(r.nearestPoi().type, 'portal');
  assert.ok(r.interact().sceneChanged);
  assert.notEqual(r.s.mapSeed, r.s.mainScene.mapSeed);
  assert.equal(r.s.sectors.filter((z) => z.kind === portal.kind).length, 9);
  assert.ok(Math.hypot(r.s.realm.towerPosition.x, r.s.realm.towerPosition.z) >= 99);
  const restored = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(restored.s.realm, r.s.realm);
  assert.equal(restored.map.pois.length, 2);
  assert.equal(restored.map.towerObstacle.type, 'tower');
});
test('scene snapshots isolate enemies and loot while preserving earned stats and unfinished waves', () => {
  const r = fresh(),
    portal = r.s.world.portals[0];
  r.s.enemies = [mob(10)];
  r.s.gems = [{ id: 80, x: 5, z: 5, value: 3 }];
  r.s.player.x = portal.x;
  r.s.player.z = portal.z;
  const position = { x: portal.x, z: portal.z };
  r.enterPortal(portal.id);
  r.updateRealmWaves(3);
  const t = r.s.enemies.find((e) => e.tower);
  r.hurt(t, 1e8);
  assert.equal(t.hp, t.maxHp);
  assert.equal(r.move(t, 1, 0, 10, 1), false);
  assert.ok(!r.combatTargets(r.s.enemies).includes(t));
  r.s.coins += 15;
  r.s.player.damage += 2;
  r.leaveRealm();
  assert.equal(r.s.coins, 15);
  assert.equal(r.s.player.damage, 12);
  assert.ok(!r.s.enemies.some((e) => e.id === 90));
  assert.equal(r.s.enemies.length, 0);
  assert.ok(r.s.spawnClock >= 1.5 && r.s.spawnClock <= 3);
  assert.equal(r.s.gems[0].id, 80);
  assert.deepEqual({ x: r.s.player.x, z: r.s.player.z }, position);
  r.enterPortal(portal.id);
  assert.equal(r.s.realm.wave, 1);
  assert.ok(r.s.enemies.some((e) => e.tower));
  assert.doesNotThrow(() => JSON.stringify(r.snapshot()));
});
test('three finite waves destroy the tower, reward once and defer safe return', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[0].id);
  const t = r.s.enemies.find((e) => e.tower);
  finishWaves(r);
  assert.equal(t.shielded, false);
  r.s.realm.focusTower = true;
  assert.equal(t.hp, 0);
  assert.equal(r.s.world.cleansed, 1);
  const coins = r.s.coins,
    xp = r.s.totalXp,
    score = r.s.score;
  r.hurt(t, 1e8);
  assert.equal(r.s.realm.phase, 'cleared');
  assert.equal(r.s.coins - coins, 0);
  assert.equal(r.s.totalXp - xp, 0);
  assert.equal(r.s.score - score, 0);
  r.hurt(t, 1e8);
  assert.equal(r.s.coins - coins, 0);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.equal(copy.s.world.cleansed, 1);
  assert.ok(copy.s.realm);
  copy.updateWorld(2, {});
  assert.ok(copy.s.pendingRealmReturn);
  assert.ok(copy.s.realm);
  copy.leaveRealm();
  assert.equal(copy.s.realm, null);
  assert.equal(copy.s.world.portals.filter((p) => p.closed).length, 1);
  assert.equal(copy.enterPortal(copy.s.world.portals.find((p) => p.closed).id), false);
});
test('all six tower objectives spawn Devimon only after returning to the main map', () => {
  const r = fresh('MetalGreymon', 3),
    main = r.s.mapSeed;
  for (let i = 0; i < 6; i++) {
    assert.ok(r.enterPortal(r.s.world.portals[i].id));
    finishWaves(r);
    r.hurt(
      r.s.enemies.find((e) => e.tower),
      1e8,
    );
    assert.equal(r.s.enemies.filter((e) => e.finalBoss).length, 0);
    assert.equal(r.spawnDevimon(), false);
    r.updateWorld(2, {});
    assert.ok(r.s.pendingRealmReturn);
    r.leaveRealm();
    assert.equal(r.s.realm, null);
    assert.equal(r.s.mapSeed, main);
    assert.equal(r.s.enemies.filter((e) => e.finalBoss).length, i === 5 ? 1 : 0);
  }
  assert.equal(r.s.world.phase, 'devimon');
  assert.equal(r.spawnDevimon(), false);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.equal(copy.s.world.cleansed, 6);
  assert.equal(copy.s.enemies.find((e) => e.finalBoss).x, 0);
});
test('realm waves suppress ambient spawning and tower collision is navigable', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[1].id);
  r.s.spawnClock = 0;
  r.s.nextBoss = 0;
  r.s.time = 1000;
  r.update(0.05, {});
  assert.equal(r.s.enemies.length, 1);
  finishWaves(r);
  const tower = r.s.enemies.find((e) => e.tower);
  assert.equal(base.walkable(tower.x, tower.z, r.s.mapSeed, 0.5), false);
  const unit = { x: 0, z: 0 },
    target = { x: tower.x + 4, z: tower.z };
  for (let i = 0; i < 6000 && Math.hypot(unit.x - target.x, unit.z - target.z) > 1.1; i++) {
    const d = C.enemyDirection(unit, target, r.s.mapSeed);
    r.move(unit, d.x, d.z, 12, 0.05, 0.55, true);
  }
  assert.ok(Math.hypot(unit.x - target.x, unit.z - target.z) < 1.2);
});

test('cleared portal returns safely without reusing realm actors', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[2].id);
  finishWaves(r);
  const t = r.s.enemies.find((e) => e.tower);
  Object.assign(r.s.player, { x: t.x + 2.5, z: t.z, invulnerable: 100 });
  r.s.realm.focusTower = true;
  assert.equal(t.hp, 0);
  r.s.gems = [];
  r.s.xp = 0;
  r.s.player.basicClock = 0;
  r.update(0.05, {});
  assert.equal(r.s.realm.phase, 'cleared');
  assert.ok(r.s.enemies.every((e) => e.hp <= 0));
  r.s.choice = null;
  r.s.xp = 0;
  for (let i = 0; i < 40; i++) {
    r.s.choice = null;
    r.s.xp = 0;
    r.update(0.05, {});
  }
  assert.ok(r.s.pendingRealmReturn);
  assert.ok(r.s.sectors.every((z) => z.kind));
  r.leaveRealm();
  assert.equal(r.s.realm, null);
  assert.equal(r.s.world.cleansed, 1);
  assert.ok(!r.s.enemies.some((e) => e.tower));
});

test('wave kills damage the tower proportionally and saving preserves the damage', () => {
  const r = fresh();
  r.enterPortal(r.s.world.portals[0].id);
  r.updateRealmWaves(3);
  for (let i = 0; i < 1000 && r.s.realm.pendingSpawns; i++) r.updateRealmWaves(0.1);
  const tower = r.s.enemies.find((e) => e.tower),
    enemies = r.s.enemies.filter((e) => e.realmMob),
    before = tower.hp;
  r.hurt(enemies[0], 1e8);
  assert.ok(tower.hp < before && tower.hp > (before * 2) / 3);
  const hp = tower.hp;
  r.hurt(enemies[0], 1e8);
  assert.equal(tower.hp, hp);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.equal(copy.s.enemies.find((e) => e.tower).hp, hp);
  for (const e of enemies.slice(1)) r.hurt(e, 1e8);
  assert.ok(Math.abs(tower.hp / tower.maxHp - 2 / 3) < 1e-8);
  assert.equal(r.s.realm.phase, 'waves');
});

test('passives work while moving without stationary timers or active fields', () => {
  const v = fresh('Greymon', 2);
  v.s.player.stillTime = 0;
  v.s.player.moveMomentum = 0;
  assert.equal(v.incomingStyleDamage(), 0.8);
  const a = fresh('MetalGreymon', 3);
  a.s.player.stillTime = 0;
  assert.equal(a.styleRangeMultiplier(), 1.2);
  const h = fresh('Garurumon', 2);
  h.s.player.moveMomentum = 0;
  assert.equal(h.playerWorldSpeed(), 1.15);
  h.s.enemies = [mob(4)];
  h.updateWorld(0.05, {});
  assert.equal(h.s.player.preyId, 90);
  const g = fresh('Angemon', 2);
  g.s.player.hp = 50;
  g.s.player.x = 10;
  g.updateStyleFields(1);
  assert.equal(g.s.player.hp, 51);
  g.s.player.hp = 100;
  g.updateStyleFields(1);
  assert.equal(g.s.player.hp, 100);
  const c = fresh('Kabuterimon', 2);
  assert.equal(c.enemyWorldSpeed(mob(4)), 0.85);
  assert.equal(c.enemyWorldSpeed(mob(20)), 1);
  for (const style of Object.values(W.styles))
    assert.ok(!/quieto|moverte|dentro de tu sello|tu jardín/i.test(style.passive));
});

test('collectors reserve distinct nearest fragments, carry them home and recover lost targets', () => {
  const r = fresh(),
    p = r.s.player;
  p.orbits = 2;
  r.s.gems = [
    { id: 901, x: p.x + 12, z: p.z, value: 5 },
    { id: 902, x: p.x + 20, z: p.z, value: 7 },
  ];
  r.updateCollectors(0.05);
  assert.deepEqual(
    r.s.collectors.map((o) => o.target),
    [901, 902],
  );
  const xp = r.s.totalXp;
  for (let i = 0; i < 200; i++) {
    r.updateCollectors(0.05);
    r.s.gems = r.s.gems.filter((g) => {
      if (Math.hypot(g.x - p.x, g.z - p.z) < 1.05) {
        r.collectGem(g);
        return false;
      }
      return true;
    });
  }
  assert.equal(r.s.gems.length, 0);
  assert.equal(r.s.totalXp - xp, 12 * p.xpMult);
  r.s.gems = [{ id: 903, x: p.x + 30, z: p.z, value: 2 }];
  r.updateCollectors(0.05);
  r.s.gems = [];
  r.updateCollectors(0.05);
  assert.ok(r.s.collectors.every((o) => o.target === null));
  const restored = new C.Run(null, { saved: r.snapshot() });
  restored.updateCollectors(0.05);
  assert.equal(restored.s.collectors.length, 2);
});

test('Q abilities scale damage, area, haste and projectiles with current build', () => {
  for (const name of [
    'Greymon',
    'Garurumon',
    'Angemon',
    'Kabuterimon',
    'MetalGreymon',
    'Gomamon',
  ]) {
    const r = fresh(name, 2),
      p = r.s.player;
    r.s.enemies = [mob(4)];
    const base = r.styleDamage();
    p.damage *= 2;
    p.stage = 4;
    p.weapons = [{ id: 'energy-bolt', rank: 5, clock: 0 }];
    p.area = 2;
    p.haste = 2;
    p.projectileBonus = 2;
    assert.ok(r.styleDamage() > base * 2);
    r.castStyle();
    assert.equal(p.styleCooldown, r.style().cooldown / 2);
    if (r.style().id === 'hunter') assert.equal(r.s.shots.length, 5);
    for (const f of r.s.styleFields) assert.ok(f.radius >= 6);
  }
});

test('run upgrades survive Rookie to Mega and save reload without reducing speed', () => {
  let r = fresh('Agumon', 1);
  const stats = {
    area: 2.4,
    haste: 2.1,
    speed: 15,
    crit: 0.6,
    magnet: 18,
    projectileBonus: 3,
    orbits: 4,
    regen: 2,
    xpMult: 1.7,
  };
  Object.assign(r.s.player, stats);
  r.s.player.damage = 80;
  r.s.player.maxHp = 300;
  for (const species of ['Greymon', 'MetalGreymon', 'WarGreymon']) {
    const before = { ...r.s.player };
    r.s.choice = { kind: 'evolution', cards: [{ id: species, type: 'evolution', species }] };
    assert.ok(r.choose(species));
    for (const [key, value] of Object.entries(stats))
      assert.equal(r.s.player[key], value, key + ' after ' + species);
    assert.ok(r.s.player.damage >= before.damage);
    assert.ok(r.s.player.maxHp >= before.maxHp);
    r = new C.Run(null, { saved: r.snapshot() });
    for (const [key, value] of Object.entries(stats))
      assert.equal(r.s.player[key], value, key + ' after reload');
  }
});

test('chain attacks use accumulated area for their reach in every evolutionary stage', () => {
  for (const stage of [1, 4])
    for (const area of [1, 2]) {
      const r = fresh('Agumon', stage);
      r.s.player.area = area;
      const e = mob(20);
      r.s.enemies = [e];
      r.castPattern({ id: 'energy-bolt', pattern: 'chain' }, 1, e, 10);
      assert.equal(e.hp < 200, area === 2);
    }
});

test('shield absorbs overflow, recharges after four seconds and scales with health', () => {
  const r = fresh('Gomamon'),
    p = r.s.player;
  p.hp = p.maxHp = 100;
  p.shieldRatio = 0.5;
  p.shield = 50;
  const hp = p.hp;
  r.hitPlayer(30);
  assert.equal(p.hp, hp);
  assert.equal(p.shield, 20);
  p.invulnerable = 0;
  r.hitPlayer(30);
  assert.equal(p.hp, hp - 10);
  assert.equal(p.shield, 0);
  r.s.enemies = [];
  p.weapons = [];
  r.update(0.1);
  assert.equal(p.shield, 0);
  p.shieldDelay = 0;
  p.maxHp = 200;
  r.update(0.1);
  assert.ok(p.shield > 0);
  assert.ok(p.shield <= 100);
  const saved = r.snapshot();
  delete saved.player.shieldRatio;
  delete saved.player.shield;
  saved.player.armor = 5;
  const loaded = new C.Run(null, { saved });
  assert.equal(loaded.s.player.shieldRatio, 0.75);
  assert.equal(loaded.s.player.shield, 150);
  assert.equal(loaded.s.player.armor, undefined);
});
