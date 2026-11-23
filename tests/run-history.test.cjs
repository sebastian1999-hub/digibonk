const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const context = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), context);
const C = require('../game/run-core').create(
  context.window.SPECIES_CATALOG,
  context.window.EVOLUTION_ROUTES,
  require('../game/skill-system'),
);
const historyModule = import(pathToFileURL(require.resolve('../game/run-history.js')));

test('history keeps the last three completed runs by finish order and ignores repeated saves', async () => {
  const { recordRun } = await historyModule;
  let history = [];
  for (let i = 0; i < 4; i++) {
    const { s } = new C.Run('Botamon', { id: 'run-' + i, seed: i });
    assert.equal(recordRun(history, s, 25), history);
    s.done = true;
    s.score = 1000 - i;
    history = recordRun(history, s, 25);
    assert.equal(recordRun(history, s, 25), history);
    s.player.species = 'Changed';
    assert.notEqual(history[0].species, s.player.species);
  }
  assert.deepEqual(history.map((entry) => entry.id), ['run-3', 'run-2', 'run-1']);
});

test('damage is recorded by source and impact phase, without overkill, across saved runs', async () => {
  const { damageRows } = await historyModule;
  const run = new C.Run('Botamon', { seed: 123 });
  const hit = { hp: 15, maxHp: 15, x: 1, z: 1, stage: 0 };
  run.s.player.stage = 1;
  run.hurt(hit, 40, 'fireball');
  run.hurt(hit, 40, 'fireball');
  run.hurt({ ...hit, hp: 15, shielded: true }, 40, 'fireball');
  const copy = new C.Run(null, { saved: run.snapshot() });
  copy.s.player.stage = 2;
  copy.hurt({ ...hit, hp: 15 }, 100, 'air-shot', false, 'collectors');
  copy.hurt({ ...hit, hp: 15 }, 10, 'fireball', true, 'technique:fireball');
  assert.deepEqual(damageRows(copy.s.combatReport.damage), [
    { source: 'technique:fireball', damage: 25, hits: 2, kills: 1 },
    { source: 'collectors', damage: 15, hits: 1, kills: 1 },
  ]);
  assert.equal(damageRows(copy.s.combatReport.damage, ['1'])[0].damage, 15);
  const legacy = run.snapshot();
  legacy.time = 120;
  delete legacy.combatReport;
  assert.equal(new C.Run(null, { saved: legacy }).s.combatReport.since, 120);
});
