const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const C = require('../game/run-core').create(
  box.window.SPECIES_CATALOG,
  box.window.EVOLUTION_ROUTES,
  require('../game/skill-system'),
);
function fresh() {
  const r = new C.Run('Botamon', { seed: 123, id: 'chest-test' });
  r.s.hatch = 0;
  r.random = () => 0;
  r.s.choice = r.chestChoices();
  return r;
}
function reveal(r) {
  return r.revealChest(r.s.choice.roll.id + ':' + r.s.choice.roll.revision);
}
test('carousel outcome survives reload, cannot be collected during spin, and stale reveal tokens fail', () => {
  const r = fresh(),
    id = r.s.choice.cards[0].id;
  assert.equal(r.choose(id), false);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(copy.s.choice, r.s.choice);
  assert.equal(copy.revealChest('wrong'), false);
  assert.ok(reveal(copy));
  assert.ok(copy.choose(id));
  assert.equal(copy.choose(id), false);
  assert.equal(copy.s.relics[0].rank, 1);
});
test('epic outcome has maximum actual rank and no gamble; a fully maxed build recycles bits', () => {
  const r = fresh();
  r.random = () => 0.97;
  r.s.choice = r.chestChoices();
  assert.equal(r.s.choice.cards[0].quality, 3);
  reveal(r);
  assert.equal(r.canRiskChest(), false);
  assert.ok(r.choose(r.s.choice.cards[0].id));
  assert.equal(r.s.relics[0].rank, 3);
  r.s.relics = require('../game/loot').relics.map((x) => ({ id: x.id, rank: 3 }));
  r.s.buddies = require('../game/loot').companions.map((x) => ({ species: x.id, clock: 0 }));
  r.s.choice = r.chestChoices();
  reveal(r);
  const before = r.s.coins;
  assert.ok(r.choose(r.s.choice.cards[0].id));
  assert.equal(r.s.coins, before + 10);
});

test('Wizardmon sells a new technique once and saves the purchase', () => {
  const r = fresh();
  r.s.choice = null;
  r.s.coins = 200;
  r.s.player.species = 'Agumon';
  r.s.player.stage = 1;
  const shop = r.map.pois.find((p) => p.type === 'merchant');
  Object.assign(r.s.player, { x: shop.x, z: shop.z });
  assert.ok(r.interact().ok);
  const card = r.s.choice.cards[0];
  assert.equal(card.type, 'weapon');
  assert.ok(r.choose(card.id));
  assert.equal(r.s.coins, 160);
  assert.equal(r.s.shopPurchases, 1);
  assert.ok(r.s.player.weapons.some((w) => w.id === card.weapon));
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(copy.s.player.weapons, r.s.player.weapons);
});

test('quality improves damage, area, health and projectile amount while respecting remaining caps', () => {
  const r = fresh();
  for (const base of [
    { id: 'power', stat: 'damage', factor: 1.1 },
    { id: 'area', stat: 'area', factor: 1.15 },
    { id: 'heart', stat: 'maxHp', amount: 20 },
  ]) {
    const pool = r.shopQualityPool({ ...base, type: 'stat' });
    assert.equal(pool.length, 3);
    assert.ok((pool[2].factor || pool[2].amount) > (pool[0].factor || pool[0].amount));
  }
  r.s.player.projectileBonus = 4;
  const pool = r.shopQualityPool({
    id: 'projectile',
    stat: 'projectileBonus',
    amount: 1,
    type: 'stat',
  });
  assert.equal(pool.length, 1);
  assert.equal(pool[0].amount, 1);
  r.s.choice = r.shopRoll({ id: 'projectile', stat: 'projectileBonus', amount: 1, type: 'stat' });
  reveal(r);
  assert.equal(r.canRiskChest(), false);
  assert.ok(r.choose(r.s.choice.cards[0].id));
  assert.equal(r.s.player.projectileBonus, 5);
});

test('chests offer and award new relics beyond four and old chest prices rise to 30', () => {
  const r = fresh(),
    L = require('../game/loot');
  r.s.relics = L.relics.slice(0, 4).map((x) => ({ id: x.id, rank: 3 }));
  const card = r
    .chestPool()
    .find((c) => c.type === 'artifact' && !r.s.relics.some((x) => x.id === c.item));
  assert.ok(card);
  r.s.choice = { kind: 'chest', cards: [card] };
  assert.ok(r.choose(card.id));
  assert.equal(r.s.relics.length, 5);
  const chest = r.map.pois.find((p) => p.type === 'chest');
  r.s.poiPrices[chest.id] = 15;
  assert.equal(r.poiCost(chest), 30);
});

test('gamble is disabled and the original reward remains collectible', () => {
  const r = fresh();
  reveal(r);
  const before = structuredClone(r.s.choice);
  assert.equal(r.canRiskChest(), false);
  assert.equal(r.riskChest(), false);
  assert.deepEqual(r.s.choice, before);
  assert.ok(r.choose(before.cards[0].id));
});
test('fortune charm increases actual legendary odds by two points per rank', () => {
  const r = fresh(),
    pool = r.chestPool(),
    base = r.chestOdds(pool).find((o) => o.quality === 4).chance;
  assert.ok(pool.some((c) => c.item === 'fortune-charm'));
  for (const rank of [1, 2, 3]) {
    r.s.relics = [{ id: 'fortune-charm', rank }];
    const odds = r.chestOdds(pool);
    assert.ok(Math.abs(odds.find((o) => o.quality === 4).chance - base - rank * 0.02) < 1e-10);
    assert.ok(Math.abs(odds.reduce((n, o) => n + o.chance, 0) - 1) < 1e-10);
    const noLegend = r.chestOdds(pool.filter((c) => c.quality !== 4));
    assert.ok(noLegend.every((o) => o.quality !== 4));
  }
  const saved = new C.Run(null, { saved: r.snapshot() });
  assert.equal(saved.relicRank('fortune-charm'), 3);
});
