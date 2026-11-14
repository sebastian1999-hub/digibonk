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

test('small upgrades dominate with 70/23/6/1 quality weights', () => {
  const r = fresh(),
    counts = [0, 0, 0, 0];
  for (let i = 0; i < 10000; i++) {
    r.random = () => (i + 0.5) / 10000;
    counts[r.rollUpgradeQuality() - 1]++;
  }
  assert.deepEqual(counts, [7000, 2300, 600, 100]);
});
test('quality scales actual stat gains and the saved card preserves its value', () => {
  for (const [random, quality] of [
    [0, 1],
    [0.8, 2],
    [0.95, 3],
    [0.999, 4],
  ]) {
    const r = fresh();
    r.random = () => random;
    const card = r.levelUpgradeCard({ id: 'power', title: 'Daño', stat: 'damage', factor: 1.1 });
    assert.equal(card.quality, quality);
    assert.ok(Math.abs(card.factor - (1 + 0.1 * quality)) < 1e-10);
    r.s.choice = { kind: 'level', cards: [card] };
    const saved = new C.Run(null, { saved: r.snapshot() }),
      before = saved.s.player.damage;
    assert.ok(saved.choose('power'));
    assert.ok(Math.abs(saved.s.player.damage - before * card.factor) < 1e-8);
  }
});
test('projectile card is epic only, grants one extra hit and stacks past five', () => {
  const r = fresh(),
    base = { id: 'projectile', stat: 'projectileBonus', amount: 1 };
  for (const n of [0, 0.7, 0.929, 0.999]) {
    r.random = () => n;
    assert.equal(r.levelUpgradeCard(base), null);
  }
  r.random = () => 0.95;
  const card = r.levelUpgradeCard(base);
  assert.equal(card.quality, 3);
  assert.equal(card.amount, 1);
  r.s.player.projectileBonus = 4;
  r.s.choice = { kind: 'level', cards: [card] };
  assert.ok(r.choose(card.id));
  assert.equal(r.s.player.projectileBonus, 5);
  assert.equal(r.levelUpgradeCard(base).amount, 1);
});
test('higher quality technique cards grant multiple ranks without exceeding rank nine', () => {
  const r = fresh();
  r.random = () => 0.999;
  r.s.player.weapons = ['bubble', 'claw', 'heal', 'guard'].map((id) => ({ id, rank: 1, clock: 0 }));
  r.s.choice = r.choices();
  const card = r.s.choice.cards.find((c) => c.type === 'weapon-rank');
  assert.ok(card);
  assert.equal(card.quality, 4);
  assert.ok(r.choose(card.id));
  assert.equal(r.s.player.weapons.find((w) => w.id === card.weapon).rank, 5);
});

test('selection chip drops in chests and shifts only future stat qualities at every rank', () => {
  const r = fresh();
  assert.ok(r.chestPool().some((c) => c.item === 'selection-chip'));
  const chestOdds = r.chestOdds(r.chestPool());
  for (const rank of [1, 2, 3]) {
    grant(r, 'selection-chip', rank);
    const odds = r.statUpgradeOdds();
    assert.ok(Math.abs(odds.reduce((a, b) => a + b, 0) - 1) < 1e-10);
    assert.ok(Math.abs(odds[0] - (0.7 - rank * 0.05)) < 1e-10);
    assert.ok(odds[1] > 0.23 && odds[2] > 0.06 && odds[3] > 0.01);
    r.random = () => 0.68;
    assert.equal(r.rollUpgradeQuality(), 1);
    assert.equal(r.levelUpgradeCard({ id: 'power', stat: 'damage', factor: 1.1 }).quality, 2);
    const copy = new C.Run(null, { saved: r.snapshot() });
    assert.deepEqual(copy.statUpgradeOdds(), odds);
    const current = r.chestOdds(r.chestPool());
    assert.deepEqual(current, chestOdds);
  }
});
test('already rolled stat cards are unchanged when selection chip is acquired', () => {
  const r = fresh();
  r.random = () => 0.68;
  const card = r.levelUpgradeCard({ id: 'power', stat: 'damage', factor: 1.1 });
  const before = structuredClone(card);
  grant(r, 'selection-chip', 3);
  assert.deepEqual(card, before);
});
