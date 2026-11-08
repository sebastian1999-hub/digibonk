const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const skills = require('../game/skill-system');

async function setup() {
  const context = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => o[k] || (() => {}) },
  );
  global.document = { createElement: () => ({ getContext: () => context }) };
  global.window = { SkillSystem: skills, DigibonkCore: { heightAt: () => 0 } };
  const T = await import(pathToFileURL(require.resolve('../game/vendor/three.module.js')).href);
  const { AttackVisuals } = await import(
    pathToFileURL(require.resolve('../game/attack-visuals.js')).href
  );
  const camera = new T.PerspectiveCamera(47, 1, 0.1, 650);
  camera.position.set(20, 31, 24);
  camera.lookAt(0, 0, 0);
  return new AttackVisuals({ scene: new T.Scene(), camera, visibility: { player: 1, enemy: 1 } });
}

test('each of the 64 techniques renders individually throughout its life without mutating combat data', async () => {
  const a = await setup(),
    state = Object.freeze({ mapSeed: 83461, sceneSerial: 1 });
  for (const skill of Object.values(skills.skills)) {
    for (const t of [0, 0.08, 0.28, 0.49, 0.64, 0.85, 0.98]) {
      a.begin();
      const e = Object.freeze({
        id: 27,
        skillId: skill.id,
        kind: skill.kind === 'damage' ? 'burst' : 'heal',
        x: 2,
        z: 1,
        dx: 0,
        dz: -1,
        fromX: -2,
        fromZ: 1,
        radius: 3.5,
        size: 1.5,
        life: 0.9 * (1 - t),
        maxLife: 0.9,
      });
      assert.equal(a.impact(e, state, 2 + t), true, skill.id);
      a.finish();
      assert.ok(a.count > 0 && a.count < 240, `${skill.id} at ${t}: ${a.count}`);
      for (const b of a.batches.values())
        if (b.count) {
          assert.ok(
            b.mesh.instanceMatrix.array.subarray(0, b.count * 16).every(Number.isFinite),
            skill.id,
          );
          assert.ok(
            b.alpha.array.subarray(0, b.count).every((v) => v >= 0 && v <= 1),
            skill.id,
          );
        }
    }
  }
});

test('delayed field strikes start at the gameplay damage time, and dead effects emit nothing', async () => {
  const a = await setup(),
    state = { mapSeed: 1 };
  const event = {
    id: 9,
    skillId: 'ice-statue',
    kind: 'burst',
    x: 0,
    z: 0,
    radius: 3.5,
    maxLife: 0.9,
  };
  a.begin();
  a.impact({ ...event, life: 0.501 }, state, 1);
  a.finish();
  assert.equal(a.batches.get('ice-crystal')?.count || 0, 0, 'no ice eruption before damage');
  a.begin();
  a.impact({ ...event, life: 0.47 }, state, 1.1);
  a.finish();
  assert.ok(a.batches.get('ice-crystal').count > 0, 'eruption after 0.4 seconds');
  a.begin();
  a.impact({ ...event, life: 0 }, state, 2);
  a.finish();
  assert.equal(a.count, 0);
});

test('hidden enemy effects are hidden and attack rendering leaves gameplay RNG untouched', async () => {
  const a = await setup();
  // Three.js allocates UUIDs using Math.random during resource creation, before rendering.
  a.warmup({ mapSeed: 3 });
  a.r.visibility.enemy = 0;
  const state = Object.freeze({ mapSeed: 3, rng: 1234 });
  const random = Math.random;
  Math.random = () => {
    throw new Error('render consumed RNG');
  };
  try {
    a.begin();
    for (const skill of Object.values(skills.skills))
      a.impact(
        Object.freeze({
          id: 1,
          skillId: skill.id,
          kind: 'burst',
          x: 0,
          z: 0,
          life: 0.4,
          maxLife: 0.9,
          enemy: true,
        }),
        state,
        2,
      );
    a.finish();
    assert.equal(a.count, 0);
    a.r.visibility.enemy = 1;
    for (const skill of Object.values(skills.skills)) {
      a.begin();
      a.impact(
        { id: 3, skillId: skill.id, kind: 'burst', x: 0, z: 0, life: 0.4, maxLife: 0.9 },
        state,
        2,
      );
      a.finish();
    }
    assert.equal(state.rng, 1234);
  } finally {
    Math.random = random;
  }
});

test('all enhanced projectiles reuse warmed resources and respect independent player/enemy opacity', async () => {
  const a = await setup(),
    state = Object.freeze({ mapSeed: 3, sceneSerial: 1, rng: 55 });
  a.warmup(state);
  const textures = a.textures.size,
    batches = a.batches.size;
  const random = Math.random;
  Math.random = () => {
    throw new Error('unwarmed render allocation or random particle');
  };
  try {
    for (const k of Object.values(skills.skills).filter((k) => k.kind === 'damage')) {
      const shot = { id: 5, skillId: k.id, x: 1, z: 0, prevX: 0.9, prevZ: 0 };
      for (const owner of ['player', 'enemy']) {
        a.trails.clear();
        a.r.visibility[owner] = 1;
        a.begin();
        a.projectile(Object.freeze(shot), state, 1, owner);
        a.finish();
        const alpha = new Map(
          [...a.batches].map(([name, b]) => [name, [...b.alpha.array.slice(0, b.count)]]),
        );
        a.r.visibility[owner] = 0.4;
        a.begin();
        a.projectile(Object.freeze(shot), state, 1, owner);
        a.finish();
        for (const [name, b] of a.batches) {
          assert.equal(b.count, alpha.get(name).length, k.id + ' ' + name);
          for (let i = 0; i < b.count; i++)
            assert.ok(Math.abs(b.alpha.array[i] - alpha.get(name)[i] * 0.4) < 0.00001, k.id);
        }
        for (let frame = 1; frame < 12; frame++) {
          a.begin();
          a.projectile(
            Object.freeze({ ...shot, x: 1 + frame * 0.2, prevX: 0.8 + frame * 0.2 }),
            state,
            1 + frame / 30,
            owner,
          );
          a.finish();
        }
        a.r.visibility[owner] = 1;
      }
    }
  } finally {
    Math.random = random;
  }
  assert.equal(a.textures.size, textures, 'textures are cached before combat');
  assert.equal(a.batches.size, batches, 'no surprise material creation in combat');
  assert.equal(state.rng, 55);
});

test('gallery viewports retain both moving trails, then prune missing shots and expired scenes', async () => {
  const a = await setup(),
    state = { mapSeed: 1, sceneSerial: 1 };
  for (let frame = 0; frame < 12; frame++) {
    a.trailKeys.clear();
    for (const id of [1, 2]) {
      a.begin({ preserveTrails: true });
      a.projectile(
        { id, skillId: 'fireball', x: frame * 0.2, z: id, prevX: frame * 0.2 - 0.2, prevZ: id },
        state,
        frame / 30,
      );
      a.finish({ preserveTrails: true });
      if (frame > 1) assert.ok(a.batches.get('motion-trails').count > 0);
    }
    a.finish();
  }
  assert.equal(a.trails.size, 2);
  for (const trail of a.trails.values()) assert.ok(trail.length <= 10 && trail.length > 1);
  a.begin();
  a.projectile({ id: 1, skillId: 'fireball', x: 1, z: 1, prevX: 0.9, prevZ: 1 }, state, 0.05);
  a.finish();
  assert.equal(a.trails.size, 1);
  assert.equal([...a.trails.values()][0].length, 1, 'scrubbing backwards drops future samples');
  assert.equal(a.batches.get('motion-trails').count, 0, 'no oversized trails after a rewind');
  a.begin();
  a.finish();
  assert.equal(a.trails.size, 0);
});

test('vertical thunder has lateral branches after the strike while retaining the field delay', async () => {
  const a = await setup(),
    state = { mapSeed: 1 };
  const effect = {
    id: 17,
    skillId: 'electric-cloud',
    kind: 'burst',
    x: 0,
    z: 0,
    radius: 3.5,
    maxLife: 0.9,
  };
  a.begin();
  a.impact({ ...effect, life: 0.51 }, state, 2);
  a.finish();
  assert.equal(a.batches.get('art-ribbon')?.count || 0, 0, 'no early lightning');
  a.begin();
  a.impact({ ...effect, life: 0.35 }, state, 2);
  a.finish();
  const b = a.batches.get('art-ribbon');
  const high = [];
  for (let i = 0; i < b.count; i++)
    if (b.mesh.instanceMatrix.array[i * 16 + 13] > 2)
      high.push(b.mesh.instanceMatrix.array[i * 16 + 12]);
  assert.ok(
    high.some((x) => Math.abs(x) > 0.1),
    'sky-to-ground bolt zigzags sideways',
  );
});
