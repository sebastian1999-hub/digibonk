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

test('levels never offer unknown attacks and Wizardmon offers only unowned techniques', () => {
  const r = fresh();
  r.s.player.species = 'WarGreymon';
  r.s.player.stage = 4;
  for (let i = 0; i < 100; i++) assert.ok(r.choices().cards.every((c) => c.type !== 'weapon'));
  const shop = r.choices('shop');
  assert.ok(shop.cards.length > 0);
  assert.ok(
    shop.cards.every(
      (c) => c.type === 'weapon' && !r.s.player.weapons.some((w) => w.id === c.weapon),
    ),
  );
});
test('Wizardmon without new compatible techniques does not charge', () => {
  const r = fresh();
  r.s.coins = 200;
  const shop = r.map.pois.find((p) => p.type === 'merchant');
  Object.assign(r.s.player, { x: shop.x, z: shop.z });
  const before = r.s.coins;
  assert.equal(r.interact().ok, false);
  assert.equal(r.s.coins, before);
});
