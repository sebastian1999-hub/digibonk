const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('fs'),
  vm = require('vm'),
  P = require('../game/progression');
const box = { window: {} };
for (const f of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(__dirname + '/../game/' + f + '.js', 'utf8'), box);
const C = require('../game/run-core').create(
  box.window.SPECIES_CATALOG,
  box.window.EVOLUTION_ROUTES,
  require('../game/skill-system'),
);
test('one starter, priced unlocks, capped training and incremental rewards survive serialization', () => {
  const m = P.fresh();
  assert.deepEqual(Object.keys(m.eggs), ['Botamon']);
  assert.equal(P.buy(m, 'Yuramon', null, 1), false);
  m.bits = 10000;
  assert.ok(P.buy(m, 'Yuramon', null, 1));
  assert.equal(P.buy(m, 'Yuramon', null, 1), false);
  for (let i = 0; i < 10; i++) assert.ok(P.buy(m, 'Botamon', 'damage', 0));
  assert.equal(P.buy(m, 'Botamon', 'damage', 0), false);
  const run = { id: 'a', time: 100, kills: 30, world: { cleansed: 1 } };
  assert.equal(P.claim(m, run), 65);
  assert.equal(P.claim(m, run), 0);
  const copy = JSON.parse(JSON.stringify(m));
  run.kills += 3;
  assert.equal(P.claim(copy, run), 1);
});
test('training affects new runs once and starts with one full evolution line', () => {
  const m = P.fresh(),
    r = new C.Run('Botamon', { seed: 1 });
  P.apply(r, m.eggs.Botamon);
  for (let i = 0; i < 5; i++) {
    r.s.player.stage = i - 1;
    r.s.player.species = i === 0 ? 'Botamon' : r.s.history.at(-1).to;
    r.s.hatch = 0;
    r.s.level = [2, 5, 11, 19, 29][i];
    r.s.xp = 100000;
    r.maybeLevel();
    assert.equal(r.s.choice, null);
    assert.ok(r.s.evolution);
    assert.equal(r.s.player.species, C.evolutionLine('Botamon', m.eggs.Botamon)[i]);
    r.s.evolution = null;
  }
  assert.equal(r.s.player.stage, 4);
  const trained = new C.Run('Botamon');
  P.apply(trained, { damage: 2, haste: 2, maxHp: 2, speed: 2 });
  assert.equal(trained.s.player.maxHp, 116);
  assert.ok(Math.abs(trained.s.player.damage - 11.2) < 1e-9);
  const resumed = new C.Run(null, { saved: trained.snapshot() });
  assert.equal(resumed.s.player.maxHp, 116);
});
test('new objects appear in every chest quality and apply real stats', () => {
  const L = require('../game/loot'),
    r = new C.Run('Botamon');
  assert.equal(L.relics.length, 46);
  for (const q of [1, 2, 3, 4])
    assert.ok(
      r.chestPool().some((c) => c.quality === q && L.relics.find((d) => d.id === c.item)?.stat),
    );
  for (const def of L.relics.filter((d) => d.stat)) {
    const run = new C.Run('Botamon'),
      before = run.s.player[def.stat];
    run.s.choice = {
      kind: 'chest',
      cards: [{ id: 'take', type: 'artifact', item: def.id, rank: 1 }],
    };
    assert.ok(run.choose('take'));
    assert.ok(run.s.player[def.stat] > before, def.id);
  }
});

test('chosen unlocked lines evolve automatically and survive save/resume through every stage', () => {
  const training = { damage: 10, haste: 10, maxHp: 10, speed: 10 };
  for (const egg of C.eggChoices) {
    let r = new C.Run(egg.id, { seed: 234 });
    P.apply(r, training);
    const preferred = [];
    let from = egg.id;
    for (let stage = 0; stage < 5; stage++) {
      from = C.evolutionOptions(from, training).at(-1);
      assert.ok(from);
      preferred.push(from);
    }
    const line = C.evolutionLine(egg.id, training, preferred);
    assert.deepEqual(line, preferred);
    r.s.evolutionLine = line;
    r.s.hatch = 0;
    r.s.player.species = egg.id;
    r.s.player.stage = -1;
    for (let stage = 0; stage < 5; stage++) {
      r = new C.Run(null, { saved: r.snapshot() });
      r.s.level = [2, 5, 11, 19, 29][stage];
      r.s.xp = 100000;
      r.maybeLevel();
      assert.equal(r.s.choice, null);
      assert.equal(r.s.player.species, line[stage]);
      assert.equal(r.s.history.length, stage + 1);
      assert.equal(r.s.evolution.to, line[stage]);
      r.s.evolution = null;
    }
  }
});

test('locked and incompatible routes fall back to valid lines; legacy evolution menus migrate', () => {
  const training = P.fresh().eggs.Botamon;
  const line = C.evolutionLine('Botamon', training, Array(5).fill('WarGreymon'));
  assert.equal(line.length, 5);
  let from = 'Botamon';
  for (const next of line) {
    assert.equal(next, C.evolutionOptions(from, training)[0]);
    from = next;
  }
  const r = new C.Run('Botamon');
  r.s.hatch = 0;
  Object.assign(r.s.player, { species: 'Botamon', stage: -1 });
  r.s.level = 3;
  r.s.choice = { kind: 'evolution', cards: [] };
  const loaded = new C.Run(null, { saved: r.snapshot() });
  assert.equal(loaded.s.choice, null);
  assert.equal(loaded.s.player.species, line[0]);
  assert.equal(loaded.s.history.length, 1);
  assert.ok(loaded.s.evolution);
  const resumed = new C.Run(null, { saved: loaded.snapshot() });
  assert.equal(resumed.s.history.length, 1);
});
