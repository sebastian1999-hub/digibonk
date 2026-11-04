const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const skills = require('../game/skill-system'),
  loot = require('../game/loot'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    skills,
  );
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.spawnClock = r.s.nextBoss = 1000;
  r.s.player.basicClock = 1000;
  r.s.player.crit = 0;
  return r;
}
function grant(r, id, rank = 1) {
  r.s.choice = { kind: 'chest', cards: [{ id: 'grant', type: 'artifact', item: id, rank }] };
  assert.ok(r.choose('grant'));
}
function enemy(id = 99, x = 2, z = 0) {
  return {
    id,
    species: 'Agumon',
    stage: 1,
    x,
    z,
    hp: 10000,
    maxHp: 10000,
    speed: 0,
    hit: 0,
    shotClock: 1000,
    ranged: false,
  };
}

test('extra projectiles add one real hit to every damage technique against a single enemy', () => {
  for (const skill of Object.values(skills.skills).filter((k) => k.kind === 'damage')) {
    const hits = [];
    for (const bonus of [0, 1]) {
      const r = fresh();
      r.s.player.weapons = [{ id: skill.id, rank: 1, clock: 0 }];
      r.s.player.projectileBonus = bonus;
      r.s.player.hp = r.s.player.maxHp = 100000;
      r.s.enemies = [enemy(99, r.s.player.x + 2, r.s.player.z)];
      let count = 0;
      r.hurt = (target, damage, id) => {
        if (id === skill.id) count++;
      };
      r.update(0.01);
      r.s.player.weapons[0].clock = 100;
      for (let i = 0; i < 90; i++) r.update(0.01);
      hits.push(count);
    }
    assert.equal(hits[1], hits[0] + 1, skill.id + ' ' + hits);
  }
});
test('area increases projectile visuals, melee size and area spell reach', () => {
  for (const id of ['fireball', 'claw', 'fire-tower']) {
    const result = [];
    for (const area of [1, 2]) {
      const r = fresh();
      r.s.player.area = area;
      r.s.player.weapons = [{ id, rank: 1, clock: 0 }];
      r.s.enemies = [enemy(99, r.s.player.x + 2, r.s.player.z)];
      r.update(0.001);
      const shot = r.s.shots.find((x) => x.skillId === id),
        fx = r.s.fx.find((x) => x.skillId === id && ['burst', 'slash'].includes(x.kind));
      result.push(shot?.visualScale || fx?.visualScale);
    }
    assert.deepEqual(result, [1, 2], id);
  }
});

test('new techniques appear only with a free slot and Wizardmon can free one without payment', () => {
  const r = fresh();
  r.s.player.species = 'WarGreymon';
  r.s.player.stage = 4;
  r.s.player.weapons = [
    { id: 'bubble', rank: 1 },
    { id: 'claw', rank: 1 },
    { id: 'heal', rank: 1 },
    { id: 'guard', rank: 1 },
  ];
  for (let i = 0; i < 100; i++) assert.ok(r.choices().cards.every((c) => c.type !== 'weapon'));
  r.s.coins = 0;
  const shop = r.map.pois.find((p) => p.type === 'merchant');
  Object.assign(r.s.player, { x: shop.x, z: shop.z });
  assert.ok(r.interact().ok);
  assert.equal(r.s.coins, 0);
  assert.ok(r.choose('remove-technique-menu'));
  assert.ok(r.choose('remove-bubble'));
  assert.equal(r.s.player.weapons.length, 3);
  assert.equal(r.s.coins, 0);
  assert.ok(r.choices().cards.some((c) => c.type === 'weapon'));
});
test('Wizardmon without new compatible techniques does not charge', () => {
  const r = fresh();
  r.s.coins = 200;
  const shop = r.map.pois.find((p) => p.type === 'merchant');
  Object.assign(r.s.player, { x: shop.x, z: shop.z });
  const before = r.s.coins;
  assert.equal(r.interact().ok, true);
  assert.ok(r.s.choice.cards.some((c) => c.type === 'weapon-remove-menu'));
  assert.equal(r.s.coins, before);
});

test('experience curve grows faster late and level 400 is a hard saved cap', () => {
  const api = require('../game/run-core');
  for (let level = 1; level < 399; level++)
    assert.ok(api.xpNeeded(level + 1) > api.xpNeeded(level));
  assert.equal(api.xpNeeded(1), 9);
  assert.ok(api.xpNeeded(200) > 10000);
  const r = fresh();
  r.s.player.stage = 4;
  r.s.level = 399;
  r.s.xp = api.xpNeeded(399);
  r.maybeLevel();
  assert.equal(r.s.level, 400);
  assert.equal(r.s.xp, 0);
  r.s.choice = null;
  r.s.xp = 1e12;
  r.maybeLevel();
  assert.equal(r.s.level, 400);
  assert.equal(r.s.xp, 0);
  const saved = r.snapshot();
  saved.level = 450;
  saved.xp = 1000;
  const restored = new C.Run(null, { saved });
  assert.equal(restored.s.level, 400);
  assert.equal(restored.s.xp, 0);
});
