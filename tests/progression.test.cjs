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
    assert.equal(r.s.choice.kind, 'evolution');
    assert.equal(r.s.choice.cards.length, 1);
    r.choose(r.s.choice.cards[0].id);
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
  assert.equal(L.relics.length, 44);
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
