// Local simulation benchmark, separate from deterministic correctness tests.
const fs = require('node:fs'),
  vm = require('node:vm'),
  { performance } = require('node:perf_hooks');
const box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const C = require('../game/run-core').create(
  box.window.SPECIES_CATALOG,
  box.window.EVOLUTION_ROUTES,
  require('../game/skill-system'),
);
function fresh(egg) {
  const r = new C.Run(egg, { seed: 123 });
  r.s.hatch = 0;
  r.s.level = 400;
  r.s.player.stage = 4;
  r.s.player.maxHp = r.s.player.hp = 1e10;
  r.s.player.basicClock = r.s.spawnClock = r.s.nextBoss = 1e10;
  r.s.player.weapons = [];
  return r;
}
function measure(name, r, step) {
  const times = [];
  for (let i = 0; i < 150; i++) {
    const start = performance.now();
    step(r);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    name,
    enemies: r.s.enemies.length,
    collectors: r.s.collectors?.length || 0,
    meanMs: +(times.reduce((a, b) => a + b) / times.length).toFixed(2),
    p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(2),
  };
}
const results = [];
for (const portal of [false, true]) {
  const r = fresh('Yuramon');
  if (portal) {
    r.enterPortal(r.s.world.portals[0].id);
    for (let i = 0; i < 600; i++) r.spawnRealmMob(1, 'benchmark');
  } else for (let i = 0; i < 650; i++) r.spawn();
  results.push(
    measure(portal ? 'Yuramon portal' : 'Yuramon principal', r, (x) => x.update(1 / 60)),
  );
}
for (const units of [128, 1024]) {
  const r = fresh('Pichimon');
  r.s.player.orbits = units;
  r.s.eggPassive.phase = 5;
  r.s.gems = Array.from({ length: 240 }, (_, i) => ({
    id: 10000 + i,
    x: 50 + (i % 20),
    z: 50 + Math.floor(i / 20),
    value: 1,
  }));
  results.push(measure('Pichimon ' + units + ' unidades', r, (x) => x.updateCollectors(1 / 60)));
}
console.log(JSON.stringify(results, null, 2));
