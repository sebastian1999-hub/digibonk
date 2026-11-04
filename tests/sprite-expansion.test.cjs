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
test('detailed portraits preserve the original world atlases and techniques choose distinct available attack poses', () => {
  for (const name of ['Agumon', 'Renamon', 'WarGreymon']) {
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
