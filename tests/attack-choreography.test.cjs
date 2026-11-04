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
