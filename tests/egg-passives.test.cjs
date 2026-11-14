const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm');
const box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const core = require('../game/run-core');
const C = core.create(
  box.window.SPECIES_CATALOG,
  box.window.EVOLUTION_ROUTES,
  require('../game/skill-system'),
);
function fresh(egg) {
  const r = new C.Run(egg, { seed: 123 });
  r.s.hatch = 0;
  r.s.player.stage = -1;
  r.s.player.species = egg;
  r.s.player.weapons = [{ id: 'bubble', rank: 1, clock: 0 }];
  return r;
}
function grant(r, card) {
  r.s.choice = { kind: 'level', cards: [{ id: 'grant', ...card }] };
  assert.ok(r.choose('grant'));
}
function copy(r) {
  return new C.Run(null, { saved: r.snapshot() });
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('Choromon banks phase charges and refreshes only once per level across reloads', () => {
  let r = fresh('Choromon');
  r.s.choice = r.choices();
  assert.ok(r.refreshLevel());
  assert.equal(r.s.eggPassive.refresh, 0);
  r = copy(r);
  assert.equal(r.refreshLevel(), false);
  r.s.player.stage = 1;
  r.syncEggPhase();
  assert.equal(r.s.eggPassive.refresh, 2);
  r = copy(r);
  assert.equal(r.s.eggPassive.refresh, 2);
  r.s.choice = r.choices('relic');
  assert.equal(r.refreshLevel(), false);
  r.s.choice = r.choices();
  assert.ok(r.refreshLevel());
  assert.equal(r.s.eggPassive.refresh, 1);
});
test('Zurumon exclusively gambles once, with linear 20–50% chance, and persists outcome', () => {
  for (const egg of C.eggChoices) {
    const r = fresh(egg.id);
    r.s.choice = r.chestChoices();
    r.s.choice.cards = [r.chestPool().find((c) => c.quality === 1)];
    r.s.choice.roll.phase = 'revealed';
    assert.equal(r.canRiskChest(), egg.id === 'Zurumon');
  }
  let r = fresh('Zurumon');
  close(r.riskChance(), 0.2);
  r.s.level = 400;
  close(r.riskChance(), 0.5);
  r.s.level = 450;
  close(r.riskChance(), 0.5);
  r.s.choice = r.chestChoices();
  r.s.choice.cards = [r.chestPool().find((c) => c.quality === 1)];
  r.s.choice.roll.phase = 'revealed';
  r.random = () => 0;
  assert.ok(r.riskChest());
  const result = structuredClone(r.s.choice);
  r = copy(r);
  assert.deepEqual(r.s.choice, result);
  assert.equal(r.riskChest(), false);
});
test('phase passives stack with cards, support advanced starts and never duplicate on load', () => {
  for (const [egg, stat] of [
    ['Pabumon', 'ricochets'],
    ['Poyomon', 'projectileBonus'],
  ]) {
    let r = fresh(egg);
    r.s.player[stat] = 2;
    r.s.player.stage = 3;
    r.syncEggPhase();
    assert.equal(r.s.player[stat], 6);
    r = copy(r);
    assert.equal(r.s.player[stat], 6);
    r.s.player.stage = 4;
    r.syncEggPhase();
    assert.equal(r.s.player[stat], 7);
  }
  let r = fresh('Pichimon');
  r.s.player.orbits = 4;
  r.s.player.stage = 0;
  r.syncEggPhase();
  assert.equal(r.s.player.orbits, 8);
  r.updateCollectors(0);
  assert.equal(r.s.collectors.length, 4);
  assert.equal(r.s.collectors.filter((c) => c.evolved).length, 2);
  r = copy(r);
  assert.equal(r.s.player.orbits, 8);
  r.s.player.stage = 1;
  r.syncEggPhase();
  assert.equal(r.s.player.orbits, 16);
});
test('Petitmon receives level-up offers through 450, other eggs stop at 400', () => {
  let r = fresh('Petitmon');
  r.s.player.stage = 4;
  r.s.level = 399;
  for (let level = 400; level <= 450; level++) {
    r.s.choice = null;
    r.s.xp = core.xpNeeded(r.s.level, 450);
    r.maybeLevel();
    assert.equal(r.s.level, level);
    assert.equal(r.s.choice.kind, 'level');
  }
  r = copy(r);
  assert.equal(r.s.level, 450);
  r.s.choice = null;
  r.s.xp = 1e12;
  r.maybeLevel();
  assert.equal(r.s.level, 450);
  const normal = fresh('Botamon');
  normal.s.level = 400;
  normal.s.xp = 1e12;
  normal.maybeLevel();
  assert.equal(normal.s.level, 400);
});
test('critical overflow derives once from permanent chance, including relics and data cards', () => {
  let r = fresh('Choromon');
  r.s.player.crit = 0.82;
  grant(r, { type: 'stat', stat: 'crit', amount: 0.08 });
  close(r.criticalMultiplier(), 1.85);
  for (let i = 0; i < 5; i++) r = copy(r);
  close(r.criticalMultiplier(), 1.85);
  grant(r, { type: 'artifact', item: 'critical-chip', rank: 2 });
  close(r.criticalMultiplier(), 1.93);
  r.collectGem({ dataCard: 4, stat: 'crit' });
  close(r.criticalMultiplier(), 1.98);
  r.s.player.focusLeft = 10;
  close(r.criticalMultiplier(), 1.98);
  close(fresh('Botamon').criticalMultiplier(), 3.6);
});
test('Specialist tracks permanent run bonuses dynamically, excludes counts and survives evolution/save', () => {
  let r = fresh('Punimon');
  grant(r, { type: 'stat', stat: 'damage', factor: 1.2 });
  close(r.s.player.damage, 12.5);
  grant(r, { type: 'stat', stat: 'projectileBonus', amount: 1 });
  assert.equal(r.s.player.projectileBonus, 1);
  grant(r, { type: 'weapon', weapon: 'claw' });
  close(r.s.player.damage, 12);
  grant(r, { type: 'stat', stat: 'damage', factor: 1.3 });
  close(r.s.player.damage, 15.6);
  grant(r, { type: 'weapon-remove', weapon: 'claw' });
  close(r.s.player.damage, 17);
  r = copy(r);
  close(r.s.player.damage, 17);
  grant(r, { type: 'evolution', species: C.evolutionOptions('Punimon')[0] });
  assert.ok(r.s.player.damage >= 17);
  const damage = r.s.player.damage;
  r = copy(r);
  close(r.s.player.damage, damage);
  r.s.player.crit = 0.82;
  grant(r, { type: 'stat', stat: 'crit', amount: 0.08 });
  const multiplier = r.criticalMultiplier();
  r = copy(r);
  close(r.criticalMultiplier(), multiplier);
});
test('Mokumon buys across lines, cancels without charge, and pays only on replacement', () => {
  let r = fresh('Mokumon');
  r.s.player.stage = 2;
  r.s.coins = 1000;
  r.s.player.weapons = ['bubble', 'claw', 'heal', 'focus'].map((id) => ({ id, rank: 1, clock: 0 }));
  r.s.choice = r.choices('shop');
  const card = r.s.choice.cards.find((c) => c.type === 'market-weapon');
  assert.ok(card);
  assert.ok(r.choose(card.id));
  assert.equal(r.s.coins, 1000);
  r = copy(r);
  assert.ok(r.choose('keep-weapons'));
  assert.equal(r.s.coins, 1000);
  r.s.choice = r.choices('shop');
  const buy = r.s.choice.cards[0];
  assert.ok(r.choose(buy.id));
  assert.ok(r.choose('replace-bubble'));
  assert.equal(r.s.coins, 1000 - buy.price);
  assert.ok(r.s.player.weapons.some((w) => w.id === buy.weapon));
  assert.equal(r.s.player.weapons.length, 4);
});
test('precision wheel uses first stopped position, persists and excludes empty qualities', () => {
  let r = fresh('YukimiBotamon');
  r.s.choice = r.chestChoices();
  const token = r.s.choice.roll.id + ':0';
  assert.equal(r.revealChest(token), false);
  assert.ok(r.stopChestWheel(token, 0.99999));
  assert.equal(r.s.choice.cards[0].quality, 4);
  const card = structuredClone(r.s.choice.cards[0]);
  assert.equal(r.stopChestWheel(token, 0), false);
  r = copy(r);
  assert.deepEqual(r.s.choice.cards[0], card);
  assert.equal(r.stopChestWheel(token, 0), false);
  r.s.level = 400;
  r.s.choice = r.chestChoices();
  close(r.s.choice.roll.wheelSpeed, 1.8);
  r.chestPool = () => [card];
  r.s.choice = r.chestChoices();
  assert.deepEqual(
    r.s.choice.roll.odds.map((o) => o.quality),
    [4],
  );
});
test('Nyokimon drops collectible rarity cards with readable icons and announces exact stat', () => {
  const r = fresh('Nyokimon');
  r.random = () => 0;
  r.dropDataCard({ x: 0, z: 0 });
  const gem = r.s.gems[0];
  assert.equal(gem.dataCard, 1);
  assert.equal(gem.stat, 'damage');
  const before = r.s.player.damage;
  r.collectGem(gem);
  close(r.s.player.damage, before * 1.01);
  assert.ok(r.events.some((e) => e.type === 'data-card'));
  for (const egg of C.eggChoices)
    assert.ok(fs.existsSync(require.resolve('../game/assets/passives/' + egg.id + '.svg')));
  for (let i = 1; i <= 4; i++)
    assert.ok(fs.existsSync(require.resolve('../game/assets/data-card-' + i + '.svg')));
});
test('Yuramon increases actual main-map spawn cap and preserves the horde on load', () => {
  let r = fresh('Yuramon');
  r.s.level = 100;
  r.s.enemies = Array.from({ length: 210 }, (_, id) => ({ id, hp: 10, maxHp: 10, x: 50, z: 50 }));
  r.spawn();
  assert.equal(r.s.enemies.length, 211);
  while (r.s.enemies.length < 310) r.s.enemies.push({ ...r.s.enemies[0], id: r.s.nextId++ });
  r.spawn();
  assert.equal(r.s.enemies.length, 310);
  r = copy(r);
  assert.equal(r.s.enemies.length, 310);
});

test('Yuramon raises the portal cap to 550 and saves staggered navigation deterministically', () => {
  const r = fresh('Yuramon');
  r.s.level = 400;
  r.enterPortal(r.s.world.portals[0].id);
  for (let i = 0; i < 560; i++) r.spawnRealmMob(1, 'cap-test');
  assert.equal(r.s.enemies.length, 550);
  r.s.player.hp = r.s.player.maxHp = 1e9;
  r.s.player.basicClock = 1e9;
  r.s.player.weapons = [];
  r.update(1 / 60);
  const saved = copy(r);
  for (let i = 0; i < 4; i++) {
    r.update(1 / 60, { x: 1 });
    saved.update(1 / 60, { x: 1 });
  }
  assert.deepEqual(saved.snapshot(), r.snapshot());
});

test('Specialist scales critical-damage relics only while one technique is equipped', () => {
  let r = fresh('Punimon');
  grant(r, { type: 'artifact', item: 'critical-lens', rank: 1 });
  close(r.criticalMultiplier(), 1.8 + 0.15 * 1.25);
  grant(r, { type: 'weapon', weapon: 'claw' });
  close(r.criticalMultiplier(), 1.95);
  r = copy(r);
  grant(r, { type: 'weapon-remove', weapon: 'claw' });
  close(r.criticalMultiplier(), 1.8 + 0.15 * 1.25);
});

test('precision wheel keeps common sectors widest and legendary narrowest even with stacked luck', () => {
  const r = fresh('YukimiBotamon');
  r.s.relics = [{ id: 'fortune-charm', rank: 100 }];
  const odds = r.chestChoices().roll.odds;
  assert.ok(odds.every((o, i) => !i || odds[i - 1].chance > o.chance));
  close(
    odds.reduce((n, o) => n + o.chance, 0),
    1,
  );
});

test('loading Mokumon preserves the exact market offer instead of opening the removal menu', () => {
  const r = fresh('Mokumon');
  r.s.player.stage = 2;
  r.s.choice = r.choices('shop');
  assert.deepEqual(copy(r).s.choice, r.s.choice);
  assert.ok(r.s.choice.cards.every((card) => !card.type.startsWith('weapon-remove')));
});

test('legacy Pichimon saves retain collectors and start doubling on the next evolution', () => {
  const r = fresh('Pichimon');
  r.s.player.stage = 2;
  r.s.player.orbits = 4;
  delete r.s.eggPassive;
  const migrated = copy(r);
  assert.equal(migrated.s.player.orbits, 4);
  migrated.s.player.stage = 3;
  migrated.syncEggPhase();
  assert.equal(migrated.s.player.orbits, 8);
  assert.equal(copy(migrated).s.player.orbits, 8);
});
