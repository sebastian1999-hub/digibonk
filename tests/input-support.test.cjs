const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  Input = require('../game/input-state'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const skills = require('../game/skill-system'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    skills,
  );
function run() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.player.species = 'Botamon';
  r.s.player.stage = -1;
  r.s.spawnClock = 100;
  return r;
}
test('holding Down or S through a choice preserves movement without repeating the dash', () => {
  for (const [code, key] of [
    ['KeyS', 's'],
    ['ArrowDown', 'ArrowDown'],
  ]) {
    const input = new Input();
    input.down({ code, key });
    input.down({ code: 'Space', key: ' ' });
    const r = run();
    r.s.choice = {
      kind: 'level',
      cards: [{ id: 'power', type: 'stat', stat: 'damage', factor: 1.1 }],
    };
    const before = r.s.player.z;
    r.update(0.05, { z: 1 });
    assert.equal(r.s.player.z, before);
    r.choose('power');
    input.resumeMovement();
    assert.equal(input.has(code === 'KeyS' ? 's' : 'arrowdown'), true);
    assert.equal(input.has(' '), false);
    r.update(0.05, { z: input.has('s') || input.has('arrowdown') ? 1 : 0 });
    assert.ok(r.s.player.z > before);
    input.up({ code, key });
    assert.equal(input.size, 0);
  }
});
test('keyup uses physical key codes even if Shift or the character changes; blur clears all keys', () => {
  const input = new Input();
  input.down({ code: 'KeyW', key: 'w' });
  input.up({ code: 'KeyW', key: 'W' });
  input.down({ code: 'KeyS', key: 's' });
  input.resumeMovement();
  assert.ok(input.has('s'));
  assert.equal(input.has('w'), false);
  input.clear();
  assert.equal(input.size, 0);
});
test('every support description matches its healing, protection or buff and cooldown', () => {
  for (const skill of Object.values(skills.skills).filter((s) => s.kind !== 'damage'))
    for (const rank of [1, 5, 9]) {
      const text = C.describeTechnique(skill.id, rank, { haste: 1 });
      assert.ok(text.length > 20 && text.length < 160, skill.id);
      assert.ok(!text.includes('Recarga:'), skill.id);
      const r = run();
      r.s.player.maxHp = 1000;
      r.s.player.hp = 500;
      r.s.player.weapons = [{ id: skill.id, rank, clock: 0 }];
      r.update(0.05);
      const effect = C.supportEffect(skill, rank);
      assert.equal(r.s.player.weapons[0].clock, effect.cooldown);
      if (skill.kind === 'heal') assert.equal(r.s.player.hp, 500 + 1000 * effect.heal);
      if (skill.kind === 'shield') assert.equal(r.s.player.shieldLeft, effect.duration);
      if (skill.kind === 'buff') assert.equal(r.s.player.rallyLeft, effect.duration);
      if (skill.kind === 'restore') assert.equal(r.s.player.focusLeft, effect.duration);
      if (skill.kind === 'haste') {
        assert.equal(r.s.player.hasteLeft, effect.duration);
        assert.equal(r.s.player.focusLeft, 0);
      }
    }
});
test('healing waits until the described health threshold and higher ranks improve support', () => {
  const r = run();
  r.s.player.hp = 90;
  r.s.player.weapons = [{ id: 'heal', rank: 1, clock: 0 }];
  r.update(0.05);
  assert.equal(r.s.player.hp, 90);
  assert.equal(r.s.player.weapons[0].clock, -0.05);
  r.s.player.hp = 80;
  r.update(0.05);
  assert.ok(Math.abs(r.s.player.hp - 91.2) < 0.0001);
  assert.ok(
    C.supportEffect(skills.skills.heal, 9).heal > C.supportEffect(skills.skills.heal, 1).heal,
  );
  assert.ok(
    C.supportEffect(skills.skills.haste, 9).duration >
      C.supportEffect(skills.skills.haste, 1).duration,
  );
  assert.ok(
    C.supportEffect(skills.skills['great-heal'], 1).heal >
      C.supportEffect(skills.skills.heal, 1).heal,
  );
});

test('held movement survives menu and portal suspension without relying on key repeat', () => {
  const k = new Input();
  k.down({ code: 'KeyW' });
  k.down({ code: 'KeyD' });
  k.down({ code: 'Space' });
  k.suspend();
  assert.equal(k.size, 0);
  k.track({ code: 'ArrowDown' });
  k.up({ code: 'KeyD' });
  k.suspend();
  k.restoreMovement();
  assert.ok(k.pressed('up'));
  assert.ok(k.pressed('down'));
  assert.equal(k.pressed('right'), false);
  assert.equal(k.pressed('dash'), false);
  k.up({ code: 'KeyW' });
  k.up({ code: 'ArrowDown' });
  k.restoreMovement();
  assert.equal(k.size, 0);
  k.down({ code: 'KeyS' });
  k.clear();
  k.restoreMovement();
  assert.equal(k.size, 0);
  k.down({ code: 'KeyS' });
  assert.ok(k.pressed('down'));
});
