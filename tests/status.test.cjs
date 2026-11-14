const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  { pathToFileURL } = require('node:url'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const skills = require('../game/skill-system'),
  R = require('../game/status-rules'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    skills,
  );
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.spawnClock = r.s.nextBoss = 1000;
  r.s.player.crit = 0;
  r.s.player.basicClock = 1000;
  r.s.player.weapons = [];
  r.random = () => 0.99;
  return r;
}
function enemy(extra = {}) {
  return {
    id: 90,
    species: 'Agumon',
    stage: 1,
    x: 5,
    z: 0,
    hp: 10000,
    maxHp: 10000,
    speed: 0,
    hit: 0,
    shotClock: 1000,
    ranged: false,
    ...extra,
  };
}
test('elemental profiles and visible descriptions cover every damaging family and leave support alone', () => {
  assert.equal(Object.keys(R.effects).length, 11);
  for (const skill of Object.values(skills.skills)) {
    if (skill.kind !== 'damage') assert.deepEqual(R.forSkill(skill), []);
    else if (!['neutral', 'any'].includes(skill.family)) {
      assert.ok(R.forSkill(skill).length, skill.id);
      assert.ok(C.describeTechnique(skill.id).length < 80, skill.id);
      assert.ok(skills.stageName(skill.id), skill.id);
      assert.ok(skills.statusSummary(skill).length > 0, skill.id);
    }
  }
  assert.equal(R.forSkill(skills.skills['electro-shocker'])[0].id, 'shock');
  assert.equal(R.forSkill(skills.skills['root-bind'])[0].id, 'root');
});
test('a projectile rolls its elemental state once and area hits also apply states', () => {
  const r = fresh(),
    e = enemy({ x: 1 }),
    other = enemy({ id: 91, x: 2 });
  r.s.enemies = [e, other];
  let calls = 0;
  r.random = () => {
    calls++;
    return 0.99;
  };
  r.s.shots = [
    {
      id: 77,
      x: 0,
      z: 0,
      ox: 0,
      oz: 0,
      target: e.id,
      speed: 30,
      damage: 100,
      area: 3,
      life: 2,
      skillId: 'fireball',
    },
  ];
  r.update(0.05);
  assert.equal(calls, 4);
  assert.equal(e.hp, 9900);
  assert.equal(other.hp, 9945);
  r.random = () => 0;
  r.hurt(e, 10, 'fireball');
  assert.ok(e.statuses.burn);
});
test('burn poison and bleed tick six times, never crit or reapply themselves, and do not stack copies', () => {
  const r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  for (const id of ['burn', 'poison', 'bleed']) r.addEnemyStatus(e, id, 100);
  r.addEnemyStatus(e, 'burn', 50);
  assert.equal(e.statuses.burn.power, 8);
  r.random = () => {
    throw Error('Periodic damage must not roll criticals or states');
  };
  r.updateEnemyStatuses(3);
  assert.equal(e.hp, 9844);
  assert.deepEqual(e.statuses, {});
  assert.equal(e.poisonLeft, 0);
});
test('stronger repeated damage keeps its power, refreshes duration and does not delay the next tick', () => {
  const r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  r.addEnemyStatus(e, 'burn', 50);
  r.updateEnemyStatuses(0.3);
  assert.equal(e.statuses.burn.clock, 0.2);
  r.addEnemyStatus(e, 'burn', 100);
  assert.equal(e.statuses.burn.left, 3);
  assert.equal(e.statuses.burn.clock, 0.2);
  r.updateEnemyStatuses(0.2);
  assert.equal(e.hp, 9992);
});
test('wet empowers and is consumed by one electric hit; curses and fractures use only the stronger vulnerability', () => {
  const r = fresh(),
    e = enemy();
  r.hurt(e, 100, 'water-jet');
  assert.ok(e.statuses.wet);
  r.hurt(e, 100, 'energy-bolt');
  assert.equal(e.hp, 9775);
  assert.equal(e.statuses.wet, undefined);
  r.hurt(e, 100, 'energy-bolt');
  assert.equal(e.hp, 9675);
  r.addEnemyStatus(e, 'curse');
  r.addEnemyStatus(e, 'fracture');
  r.hurt(e, 100);
  assert.equal(e.hp, 9560);
});
test('controls have a shared recovery window, bosses convert hard control into slow and towers are immune', () => {
  const r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  assert.ok(r.addEnemyStatus(e, 'shock'));
  assert.equal(r.addEnemyStatus(e, 'freeze'), false);
  r.updateEnemyStatuses(0.7);
  assert.equal(r.enemyStatusBlocked(e), false);
  assert.equal(r.addEnemyStatus(e, 'root'), false);
  r.updateEnemyStatuses(3);
  assert.ok(r.addEnemyStatus(e, 'freeze'));
  const boss = enemy({ boss: true });
  assert.ok(r.addEnemyStatus(boss, 'shock'));
  assert.equal(boss.statuses.shock, undefined);
  assert.ok(boss.statuses.chill);
  const tower = enemy({ tower: true });
  for (const id of Object.keys(R.effects)) assert.equal(r.addEnemyStatus(tower, id, 100), false);
  assert.equal(tower.statuses, undefined);
});
test('frozen enemies cannot move, attack or shoot; roots stop movement while allowing shooting', () => {
  const r = fresh(),
    e = enemy({ x: 1, speed: 8, ranged: true, shotClock: 0, contactDamage: 10, shotDamage: 20 });
  r.s.enemies = [e];
  r.addEnemyStatus(e, 'freeze');
  r.update(0.05);
  assert.equal(e.x, 1);
  assert.equal(r.s.player.hp, 100);
  assert.equal(r.s.hostile.length, 0);
  const rooted = fresh(),
    root = enemy({ x: 5, speed: 8, ranged: true, shotClock: 0, shotDamage: 20 });
  rooted.s.enemies = [root];
  rooted.addEnemyStatus(root, 'root');
  rooted.update(0.05);
  assert.equal(root.x, 5);
  assert.equal(rooted.s.hostile.length, 1);
});
test('weakness reduces both contact and launched projectile damage without altering base enemy stats', () => {
  const r = fresh(),
    e = enemy({ x: 1, contactDamage: 10 });
  r.s.player.shield = 0;
  r.s.player.shieldDelay = 4;
  r.s.enemies = [e];
  r.addEnemyStatus(e, 'weaken');
  r.update(0.05);
  assert.equal(r.s.player.hp, 92);
  assert.equal(e.contactDamage, 10);
  const ranged = fresh(),
    shot = enemy({ ranged: true, shotClock: 0, shotDamage: 20 });
  ranged.s.enemies = [shot];
  ranged.addEnemyStatus(shot, 'weaken');
  ranged.update(0.05);
  assert.equal(ranged.s.hostile[0].damage, 16);
});
test('boss periodic damage is halved and periodic kills grant rewards only once', () => {
  const r = fresh(),
    boss = enemy({ boss: true });
  r.s.enemies = [boss];
  r.addEnemyStatus(boss, 'burn', 100);
  r.updateEnemyStatuses(0.5);
  assert.equal(boss.hp, 9996);
  const mob = enemy({ hp: 4, maxHp: 4 });
  r.s.enemies = [mob];
  r.addEnemyStatus(mob, 'burn', 100);
  const coins = r.s.coins;
  r.updateEnemyStatuses(0.5);
  assert.equal(r.s.kills, 1);
  assert.equal(r.s.coins, coins + 1);
  r.updateEnemyStatuses(2);
  assert.equal(r.s.kills, 1);
  assert.equal(r.s.coins, coins + 1);
});
test('save resume preserves status timers and controls; choice pause freezes them; legacy poison continues', () => {
  const r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  r.addEnemyStatus(e, 'poison', 100);
  r.addEnemyStatus(e, 'freeze');
  r.updateEnemyStatuses(0.2);
  const copy = new C.Run(null, { saved: r.snapshot() });
  copy.random = () => 0.99;
  assert.deepEqual(copy.s.enemies, r.s.enemies);
  r.s.choice = { kind: 'level', cards: [] };
  const before = structuredClone(e.statuses);
  r.update(0.05);
  assert.deepEqual(e.statuses, before);
  r.s.choice = null;
  for (let i = 0; i < 20; i++) {
    r.updateEnemyStatuses(0.05);
    copy.updateEnemyStatuses(0.05);
  }
  assert.deepEqual(copy.s.enemies, r.s.enemies);
  const old = enemy({ poisonLeft: 2, poisonClock: 0.5, poisonDamage: 12 });
  r.s.enemies = [old];
  r.updateEnemyStatuses(0.5);
  assert.equal(old.hp, 9988);
  assert.ok(old.statuses.poison);
});
test('status particles remain finite and bounded in a full crowd; hiding attack effects keeps the state icons', async () => {
  let iconStrokes = 0;
  const context = new Proxy(
    {
      stroke() {
        iconStrokes++;
      },
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    },
    { get: (o, k) => (k in o ? o[k] : () => {}) },
  );
  global.document = {
    createElement: () => ({ width: 128, height: 128, getContext: () => context }),
  };
  global.window = {
    SkillSystem: skills,
    DigibonkCore: { heightAt: () => 0 },
    DigibonkStatusRules: R,
    DigibonkStatusIcons: require('../game/status-icons'),
  };
  const THREE = await import(pathToFileURL(require.resolve('../game/vendor/three.module.js')).href),
    { AttackVisuals } = await import(
      pathToFileURL(require.resolve('../game/attack-visuals.js')).href
    ),
    { drawEnemyStatuses } = await import(
      pathToFileURL(require.resolve('../game/status-visuals.js')).href
    ),
    renderer = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100),
      visibility: { player: 1 },
      fxCtx: context,
      screen: () => ({ visible: true, x: 100, y: 100 }),
    };
  renderer.attackEffects = new AttackVisuals(renderer);
  const e = enemy({
      statuses: Object.fromEntries(
        Object.entries(R.effects).map(([id, d]) => [id, { left: d.duration, max: d.duration }]),
      ),
    }),
    fx = renderer.attackEffects;
  fx.begin();
  for (let i = 0; i < 220; i++) drawEnemyStatuses(renderer, { ...e, id: i }, { mapSeed: 1 }, 1);
  fx.finish();
  assert.ok(fx.count > 0 && fx.count <= fx.budget);
  for (const b of fx.batches.values()) {
    assert.ok(b.mesh.instanceMatrix.array.every(Number.isFinite));
    assert.ok(b.alpha.array.every((a) => Number.isFinite(a) && a >= 0 && a <= 1));
  }
  fx.begin();
  renderer.visibility.player = 0;
  const before = iconStrokes;
  drawEnemyStatuses(renderer, e, { mapSeed: 1 }, 1);
  fx.finish();
  assert.equal(fx.count, 0);
  assert.ok(iconStrokes > before);
  fx.warmup({ mapSeed: 1 });
  assert.ok(fx.batches.has('frozen-crystals'));
  assert.ok(fx.batches.has('paralysis-sparks'));
});

test('weakness also reduces Devimon special fan projectiles at their source', () => {
  const r = fresh(),
    boss = enemy({ boss: true, finalBoss: true, engaged: true, darkClock: 0, summonClock: 1000 });
  r.s.enemies = [boss];
  r.addEnemyStatus(boss, 'weaken');
  r.updateDevimon(boss, 0.05);
  assert.equal(r.s.hostile.length, 5);
  assert.ok(r.s.hostile.every((shot) => Math.abs(shot.damage - 14.4) < 1e-8));
});

test('five effective seconds of control grant five seconds of immunity without double counting simultaneous states', () => {
  let r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  e.slowLeft = 20;
  e.statuses = {
    freeze: { left: 20 },
    root: { left: 20 },
    burn: { left: 3, clock: 0.5, power: 1 },
  };
  r.updateEnemyControl(e, 2.5);
  assert.equal(e.controlTime, 2.5);
  assert.equal(e.uncontrollable, undefined);
  r = new C.Run(null, { saved: r.snapshot() });
  e = r.s.enemies[0];
  r.updateEnemyControl(e, 2.5);
  assert.equal(e.uncontrollable, true);
  assert.equal(e.slowLeft, 0);
  assert.equal(e.statuses.freeze, undefined);
  assert.equal(e.statuses.root, undefined);
  assert.ok(e.statuses.burn);
  for (const id of ['freeze', 'shock', 'root', 'chill'])
    assert.equal(r.addEnemyStatus(e, id), false);
  assert.equal(r.slowEnemy(e, 100), false);
  assert.equal(r.enemyStatusBlocked(e), false);
  assert.equal(r.enemyStatusMovement(e), 1);
  assert.ok(r.addEnemyStatus(e, 'poison', 10));
  assert.ok(new C.Run(null, { saved: r.snapshot() }).s.enemies[0].uncontrollable);
  r.updateEnemyControl(e, 2);
  r = new C.Run(null, { saved: r.snapshot() });
  e = r.s.enemies[0];
  assert.equal(e.uncontrollableLeft, 3);
  r.s.choice = r.choices();
  r.update(0.05);
  assert.equal(e.uncontrollableLeft, 3);
  r.s.choice = null;
  r.updateEnemyControl(e, 2.95);
  assert.equal(r.slowEnemy(e, 10), false);
  r.updateEnemyControl(e, 0.05);
  assert.equal(e.uncontrollable, false);
  assert.equal(e.controlTime, 0);
  assert.equal(r.addEnemyStatus(e, 'freeze'), true);
  assert.equal(r.slowEnemy(e, 10), true);
  r.updateEnemyControl(e, 5);
  assert.equal(e.uncontrollableLeft, 5);
  assert.equal(e.uncontrollable, true);
});

test('control exposure counts only affected time and survives gaps, but paused menus add no time', () => {
  const r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  e.slowLeft = 0.3;
  r.updateEnemyControl(e, 1);
  assert.equal(e.controlTime, 0.3);
  e.slowLeft = 0;
  r.updateEnemyControl(e, 10);
  assert.equal(e.controlTime, 0.3);
  r.slowEnemy(e, 10);
  r.s.choice = r.choices();
  for (let i = 0; i < 120; i++) r.update(0.05);
  assert.equal(e.controlTime, 0.3);
  r.s.choice = null;
  for (let i = 0; i < 94; i++) r.update(0.05);
  assert.equal(e.uncontrollable, true);
});

test('root fields and boss slows count towards immunity, while damage and world return grace remain', () => {
  const r = fresh(),
    e = enemy({ boss: true });
  r.s.enemies = [e];
  r.s.styleFields = [{ kind: 'roots', x: e.x, z: e.z, radius: 5, life: 10, tick: 10 }];
  assert.equal(r.enemyWorldSpeed(e), 0.7);
  r.updateEnemyControl(e, 5);
  assert.equal(r.enemyWorldSpeed(e), r.portalReturnSpeed());
  assert.equal(r.addEnemyStatus(e, 'shock'), false);
  assert.ok(r.addEnemyStatus(e, 'burn', 100));
  const tower = enemy({ tower: true });
  r.updateEnemyControl(tower, 10);
  assert.equal(tower.uncontrollable, undefined);
});
