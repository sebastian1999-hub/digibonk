const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { pathToFileURL } = require('node:url'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const skills = require('../game/skill-system'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    skills,
  ),
  added = [
    'terra-force',
    'giga-destroyer',
    'cocytus-breath',
    'harpoon-torpedo',
    'heavens-knuckle',
    'celestial-arrow',
    'seven-heavens',
    'electro-shocker',
    'flower-cannon',
    'death-claw',
    'night-raid',
    'shadow-wing',
    'fist-beast-king',
    'royal-saber',
  ];
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.spawnClock = 1000;
  r.s.nextBoss = 1000;
  return r;
}
test('fourteen new attacks have distinct visual profiles and a compatible evolution', () => {
  assert.equal(Object.keys(skills.skills).length, 64);
  for (const id of added) {
    const s = skills.skills[id];
    assert.equal(s.kind, 'damage');
    assert.notEqual(s.visual, 'support');
    assert.ok(
      box.window.SPECIES_CATALOG.some((p) => skills.compatible({ ...p, species: p.id }, s)),
      id,
    );
  }
  for (const id of [
    'tidal-wave',
    'mega-flame',
    'ice-breath',
    'giga-destroyer',
    'celestial-arrow',
    'night-raid',
  ])
    assert.ok(skills.skills[id].visual);
  assert.notEqual(skills.skills['tidal-wave'].visual, skills.skills['water-jet'].visual);
  assert.notEqual(skills.skills['blue-fire'].visual, skills.skills['ice-breath'].visual);
});
test('named signatures match the Digimon including MetalGreymon despite its fire family', () => {
  for (const [name, id] of [
    ['WarGreymon', 'terra-force'],
    ['MetalGreymon', 'giga-destroyer'],
    ['MetalGarurumon', 'cocytus-breath'],
    ['Angemon', 'heavens-knuckle'],
    ['Angewomon', 'celestial-arrow'],
    ['Gallantmon', 'royal-saber'],
    ['Ikkakumon', 'harpoon-torpedo'],
    ['Kabuterimon', 'electro-shocker'],
    ['Devimon', 'death-claw'],
  ]) {
    const p = C.species.get(name);
    assert.ok(p, name);
    assert.equal(C.signature(name).id, id);
    assert.ok(skills.compatible({ ...p, species: p.id }, skills.skills[id]));
  }
});
test('existing adult saves migrate signatures without losing rank, life, money or support', () => {
  for (const [name, oldId, newId] of [
    ['WarGreymon', 'inferno', 'terra-force'],
    ['MetalGreymon', 'inferno', 'giga-destroyer'],
  ]) {
    const r = fresh();
    Object.assign(r.s.player, {
      species: name,
      stage: C.species.get(name).stage,
      hp: 80,
      weapons: [
        { id: oldId, rank: 7, clock: 2 },
        { id: 'heal', rank: 3, clock: 1 },
      ],
    });
    r.s.coins = 123;
    r.s.xp = 4;
    const save = r.snapshot();
    delete save.techniqueRevision;
    const loaded = new C.Run(null, { saved: save });
    assert.equal(loaded.s.player.weapons[0].id, newId);
    assert.equal(loaded.s.player.weapons[0].rank, 7);
    assert.equal(loaded.s.player.weapons[1].id, 'heal');
    assert.equal(loaded.s.coins, 123);
    assert.equal(loaded.s.xp, 4);
    assert.equal(loaded.s.player.hp, 80);
    assert.deepEqual(
      new C.Run(null, { saved: loaded.snapshot() }).s.player.weapons,
      loaded.s.player.weapons,
    );
  }
});
test('new ranged and melee techniques really damage targets and keep projectiles bounded', () => {
  for (const id of added) {
    const r = fresh(),
      skill = skills.skills[id],
      p = box.window.SPECIES_CATALOG.find((p) => skills.compatible({ ...p, species: p.id }, skill));
    Object.assign(r.s.player, {
      species: p.id,
      stage: p.stage,
      basicClock: 999,
      crit: 0,
      weapons: [{ id, rank: 1, clock: 0 }],
    });
    const enemy = {
      id: 90,
      species: 'Agumon',
      stage: 1,
      x: skill.mode === 'melee' ? 2 : 5,
      z: 0,
      hp: 10000,
      maxHp: 10000,
      speed: 0,
      hit: 0,
      shotClock: 1000,
    };
    r.s.enemies = [enemy];
    for (let i = 0; i < 18; i++) r.update(0.05);
    assert.ok(enemy.hp <= 10000 - Math.round(skill.power * 10), id);
    assert.ok(r.s.shots.length <= 180);
    assert.ok(r.s.fx.length <= 100);
  }
});
test('Wizardmon only removes equipped techniques even in a full Mega build', () => {
  const r = fresh();
  r.s.player.species = 'WarGreymon';
  r.s.player.stage = 4;
  r.s.player.weapons = [
    { id: 'inferno', rank: 4, clock: 0 },
    { id: 'heal', rank: 3, clock: 0 },
    { id: 'guard', rank: 3, clock: 0 },
    { id: 'haste', rank: 3, clock: 0 },
  ];
  r.s.choice = r.choices('shop');
  assert.ok(r.s.choice.cards.every((c) => ['weapon-remove', 'weapon-decline'].includes(c.type)));
  assert.ok(r.choose('remove-inferno'));
  assert.equal(r.s.player.weapons.length, 3);
  assert.ok(r.s.player.weapons.some((w) => w.id === 'heal'));
  assert.ok(r.choices().cards.some((c) => c.type === 'weapon'));
});

test('all attack geometry, instances and alpha remain finite; opacity and effect budgets apply', async () => {
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => (k in o ? o[k] : () => {}) },
  );
  global.document = {
    createElement: () => ({ width: 128, height: 128, getContext: () => context }),
  };
  global.window = { SkillSystem: skills, DigibonkCore: { heightAt: () => 0 } };
  const THREE = await import(pathToFileURL(require.resolve('../game/vendor/three.module.js')).href),
    { AttackVisuals } = await import(
      pathToFileURL(require.resolve('../game/attack-visuals.js')).href
    ),
    r = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100),
      visibility: { player: 1, enemy: 1 },
    },
    fx = new AttackVisuals(r),
    state = Object.freeze({ mapSeed: 1 });
  r.camera.position.set(0, 12, 14);
  r.camera.lookAt(0, 0, 0);
  fx.begin();
  let id = 0;
  for (const skill of Object.values(skills.skills).filter((s) => s.kind === 'damage')) {
    const shot = Object.freeze({
      id: ++id,
      x: 2,
      z: 2,
      ox: 0,
      oz: 0,
      prevX: 1.9,
      prevZ: 2,
      skillId: skill.id,
    });
    fx.projectile(shot, state, 10);
    for (const kind of ['cast', 'burst', 'slash'])
      fx.impact(
        Object.freeze({ id: ++id, kind, x: 2, z: 2, life: 0.5, maxLife: 1, skillId: skill.id }),
        state,
        10,
      );
  }
  fx.finish();
  assert.ok(fx.count > 0 && fx.count <= fx.budget);
  for (const b of fx.batches.values()) {
    assert.ok(b.mesh.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(b.mesh.instanceMatrix.array.every(Number.isFinite));
    assert.ok(b.alpha.array.every((a) => Number.isFinite(a) && a >= 0 && a <= 1));
  }
  const batches = fx.batches.size;
  fx.begin();
  r.visibility.player = 0;
  for (const skill of Object.values(skills.skills))
    fx.projectile({ id: ++id, x: 0, z: 0, ox: -2, oz: 0, skillId: skill.id }, state, 12);
  fx.finish();
  assert.equal(fx.count, 0);
  assert.ok([...fx.batches.values()].every((b) => b.mesh.count === 0 && !b.mesh.visible));
  r.visibility.player = 1;
  fx.begin();
  for (let i = 0; i < 1500; i++)
    fx.projectile({ id: i, x: 0, z: 0, ox: -2, oz: 0, skillId: 'tidal-wave' }, state, 12);
  fx.finish();
  assert.ok(fx.count <= fx.budget);
  assert.ok(fx.batches.size <= batches + 2);
  for (const b of fx.batches.values()) assert.ok(b.count <= b.capacity);
});

test('motion trails stay bounded, follow shots without changing them and are cleared between scenes', async () => {
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => (k in o ? o[k] : () => {}) },
  );
  global.document = { createElement: () => ({ getContext: () => context }) };
  global.window = { SkillSystem: skills, DigibonkCore: { heightAt: () => 0 } };
  const T = await import(pathToFileURL(require.resolve('../game/vendor/three.module.js')).href),
    { AttackVisuals } = await import(
      pathToFileURL(require.resolve('../game/attack-visuals.js')).href
    ),
    r = {
      scene: new T.Scene(),
      camera: new T.PerspectiveCamera(),
      visibility: { player: 1, enemy: 1 },
    },
    fx = new AttackVisuals(r);
  r.camera.position.set(0, 12, 14);
  r.camera.lookAt(0, 0, 0);
  const state = Object.freeze({ mapSeed: 4, sceneSerial: 1 });
  for (let frame = 0; frame < 20; frame++) {
    fx.begin();
    for (let id = 0; id < 260; id++)
      fx.projectile(
        Object.freeze({ id, x: frame * 0.4, z: id * 0.01, ox: 0, oz: 0, skillId: 'fireball' }),
        state,
        frame * 0.04,
      );
    fx.finish();
    assert.ok(fx.trails.size <= 240);
    for (const points of fx.trails.values()) assert.ok(points.length <= 10);
    assert.ok(fx.count <= 4600);
  }
  assert.ok(fx.batches.get('motion-trails').count > 0);
  fx.begin();
  fx.projectile({ id: 1, x: 0, z: 0, skillId: 'fireball' }, { mapSeed: 5, sceneSerial: 2 }, 1);
  fx.finish();
  assert.equal(fx.trails.size, 1);
  assert.ok([...fx.trails.keys()][0].startsWith('2:'));
  fx.begin();
  fx.finish();
  assert.equal(fx.trails.size, 0);
});
test('effect warmup prepares material variants even when effects are hidden and restores normal opacity behaviour', async () => {
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => (k in o ? o[k] : () => {}) },
  );
  global.document = { createElement: () => ({ getContext: () => context }) };
  global.window = { SkillSystem: skills, DigibonkCore: { heightAt: () => 0 } };
  const T = await import(pathToFileURL(require.resolve('../game/vendor/three.module.js')).href),
    { AttackVisuals } = await import(
      pathToFileURL(require.resolve('../game/attack-visuals.js')).href
    ),
    r = {
      scene: new T.Scene(),
      camera: new T.PerspectiveCamera(),
      visibility: { player: 0, enemy: 0 },
    },
    fx = new AttackVisuals(r);
  r.camera.position.set(0, 12, 14);
  fx.warmup({ mapSeed: 1 });
  assert.ok(fx.warmed);
  assert.equal(fx.warming, false);
  assert.equal(r.visibility.player, 0);
  assert.ok(fx.batches.get('ice-crystal').mesh.material.isMeshPhongMaterial);
  const fire = fx.batches.get('fire').mesh.material,
    water = fx.batches.get('water-wave').mesh.material;
  assert.notEqual(fire.customProgramCacheKey(), water.customProgramCacheKey());
  fx.begin();
  fx.projectile({ id: 1, x: 0, z: 0, skillId: 'mega-flame' }, { mapSeed: 1 }, 1);
  fx.finish();
  assert.equal(fx.count, 0);
  assert.ok([...fx.batches.values()].every((b) => !b.mesh.visible));
});
