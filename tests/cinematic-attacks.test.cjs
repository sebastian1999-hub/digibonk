const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { pathToFileURL } = require('url');
test('all attack animations stay finite throughout cast, flight and impact and obey opacity and budget', async () => {
  const ctx = new Proxy(
    {
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => (k in o ? o[k] : () => {}) },
  );
  global.document = { createElement: () => ({ getContext: () => ctx }) };
  const skills = require('../game/skill-system');
  global.window = { SkillSystem: skills, DigibonkCore: { heightAt: () => 0 } };
  const THREE = await import(pathToFileURL(require.resolve('../game/vendor/three.module.js')).href),
    { AttackVisuals } = await import(
      pathToFileURL(require.resolve('../game/attack-visuals.js')).href
    );
  const renderer = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      visibility: { player: 1, enemy: 1 },
    },
    fx = new AttackVisuals(renderer);
  let id = 1;
  for (const skill of Object.values(skills.skills).filter((k) => k.kind === 'damage'))
    for (const t of [0, 0.1, 0.3, 0.6, 0.95, 1]) {
      fx.begin();
      const e = {
        id: id++,
        skillId: skill.id,
        x: 2,
        z: 3,
        prevX: 1,
        prevZ: 2,
        ox: 0,
        oz: 0,
        life: 1 - t,
        maxLife: 1,
        size: 2,
      };
      fx.projectile(e, { mapSeed: 1 }, t);
      for (const kind of ['cast', 'burst', 'slash']) fx.impact({ ...e, kind }, { mapSeed: 1 }, t);
      fx.finish();
      for (const b of fx.batches.values()) {
        assert.ok(b.mesh.instanceMatrix.array.every(Number.isFinite), skill.id);
        assert.ok(b.alpha.array.every(Number.isFinite), skill.id);
      }
      assert.ok(fx.count <= fx.budget);
    }
  renderer.visibility.player = 0;
  fx.begin();
  fx.projectile({ id: 1, skillId: 'fireball', x: 0, z: 0 }, { mapSeed: 1 }, 1);
  fx.finish();
  assert.equal(fx.count, 0);
});
