const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const box = { window: {} };
for (const file of [
  'species-catalog',
  'evolution-routes',
  'assets/sprites-data',
  'assets/portrait-data',
])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../game/' + file + '.js'), 'utf8'), box);
const S = require('../game/skill-system'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    S,
  );
const added = [
  'Dorumon',
  'Impmon',
  'Dorugamon',
  'DoruGreymon',
  'Myotismon',
  'Taomon',
  'Beelzemon',
  'Dorugoramon',
  'Omnimon',
  'VenomMyotismon',
  'Sakuyamon',
  'Seraphimon',
];
test('all twelve new species have sprites and reachable evolution paths from an existing egg to Mega', () => {
  assert.equal(C.species.size, 228);
  const seen = new Set(C.eggChoices.map((e) => e.id)),
    queue = [...seen];
  for (const id of queue)
    for (const next of C.forward.get(id) || [])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  for (const name of added) {
    assert.ok(seen.has(name), name);
    assert.ok(C.reachesMega(name), name);
    assert.ok(box.window.SPRITE_DATA[name]);
    const p = { species: name, stage: C.species.get(name).stage };
    assert.ok(S.compatible(p, S.signature(p)), name);
  }
});
test('every baked frame has nonempty bounds inside its atlas cell and every atlas is a valid PNG', () => {
  for (const data of [box.window.SPRITE_DATA, box.window.PORTRAIT_DATA])
    for (const [name, spec] of Object.entries(data)) {
      const bytes = fs.readFileSync(path.join(__dirname, '../game', spec.sheet));
      assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', name);
      if (spec.sourcePack === 'REWORK GIFS 1')
        assert.equal(bytes[25], name === 'VictoryGreymon' ? 6 : 3, name + ' GIF palette');
      const width = bytes.readUInt32BE(16),
        height = bytes.readUInt32BE(20);
      assert.ok(spec.referenceHeight > 0 && spec.referenceHeight <= 1, name);
      for (const frames of Object.values(spec.actions)) {
        assert.ok(frames.length > 0, name);
        for (const f of frames) {
          const b = f.bounds;
          assert.ok(
            b.w > 0 && b.h > 0 && b.x >= 0 && b.y >= 0 && b.x + b.w <= f.w && b.y + b.h <= f.h,
            name,
          );
          assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= width && f.y + f.h <= height, name);
          assert.ok(f.duration > 0);
        }
      }
    }
});
test('mipmapped poses have transparent space reserved between their sampling regions', () => {
  for (const [name, spec] of Object.entries(box.window.SPRITE_DATA)) {
    if (!spec.mipmaps) continue;
    const seen = new Map();
    for (const frame of Object.values(spec.actions).flat()) {
      seen.set([frame.x, frame.y, frame.w, frame.h].join(','), frame);
    }
    const poses = [...seen.values()];
    for (const [i, a] of poses.entries()) {
      for (const b of poses.slice(i + 1)) {
        const separated =
          a.x + a.w + 16 <= b.x || b.x + b.w + 16 <= a.x ||
          a.y + a.h + 16 <= b.y || b.y + b.h + 16 <= a.y;
        assert.ok(separated, name + ' has overlapping mipmap gutters');
      }
    }
  }
});
test('detailed portraits use their own sheets and techniques choose available attack poses', () => {
  for (const name of ['Agumon', 'Renamon']) {
    assert.notEqual(box.window.PORTRAIT_DATA[name].sheet, box.window.SPRITE_DATA[name].sheet);
    assert.equal(box.window.PORTRAIT_DATA[name].sourceGame, 'Digimon World DS');
  }
  assert.equal(S.pose('claw'), 'attack');
  assert.equal(S.pose('mega-flame'), 'attack3');
  assert.equal(S.pose('terra-force'), 'attack4');
  assert.equal(S.pose('giga-destroyer'), 'attack2');
  for (const spec of Object.values(box.window.SPRITE_DATA))
    for (const id of Object.keys(S.skills)) assert.ok(spec.actions[S.pose(id)]?.length);
  assert.equal(S.signature({ species: 'Seraphimon', stage: 4 }).id, 'seven-heavens');
});

test('the imported GIFs supply movement, jumps and all four attack slots to the world and menus', () => {
  const imported = Object.entries(box.window.SPRITE_DATA).filter(([, s]) => s.sourcePack === 'REWORK GIFS 1');
  assert.equal(imported.length, 41);
  for (const [name, s] of imported) {
    assert.equal(box.window.PORTRAIT_DATA[name], undefined, name + ' has a stale menu override');
    assert.equal(s.actions.walk.length, name === 'GigaSeadramon' ? 4 : 3);
    assert.deepEqual(s.actions.run, s.actions.walk);
    assert.equal(s.actions.jump.length, 3);
    const centiseconds = s.actions.jump.reduce((time, f) => time + Math.round(100 * f.duration), 0);
    assert.equal(Math.round(100 * s.dashClipDuration), centiseconds);
    assert.equal(s.actions.attack.length, 3);
    for (const action of ['attack2', 'attack3', 'attack4']) assert.deepEqual(s.actions[action], s.actions.attack);
  }
});
