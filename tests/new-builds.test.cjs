const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  box = { window: {} };
for (const n of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + n + '.js'), 'utf8'), box);
const skills = require('../game/skill-system'),
  loot = require('../game/loot'),
  C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    skills,
  );
function fresh() {
  const r = new C.Run('Botamon', { seed: 123 });
  r.s.hatch = 0;
  r.s.spawnClock = r.s.nextBoss = 1000;
  r.s.player.basicClock = 1000;
  r.s.player.crit = 0;
  return r;
}
function grant(r, id, rank = 1) {
  r.s.choice = { kind: 'chest', cards: [{ id: 'grant', type: 'artifact', item: id, rank }] };
  assert.ok(r.choose('grant'));
}
function enemy(id = 99, x = 2, z = 0) {
  return {
    id,
    species: 'Agumon',
    stage: 1,
    x,
    z,
    hp: 10000,
    maxHp: 10000,
    speed: 0,
    hit: 0,
    shotClock: 1000,
    ranged: false,
  };
}
test('48 distinct relics include nine legendary drops with real PNG icons', () => {
  assert.equal(loot.relics.length, 48);
  assert.equal(new Set(loot.relics.map((r) => r.id)).size, 48);
  assert.equal(loot.relics.filter((r) => r.legendary).length, 9);
  const r = fresh(),
    pool = r.chestPool();
  assert.ok(pool.some((c) => c.quality === 4));
  for (const item of loot.relics) {
    assert.ok(item.description(1).length > 20);
    const png = fs.readFileSync(require.resolve('../game/' + loot.icon(item.id)));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
  }
  grant(r, 'phoenix-core');
  assert.equal(r.chestPool().find((c) => c.item === 'phoenix-core').rank, 2);
});
test('passive critical and haste upgrades apply their rank difference exactly once across saves', () => {
  const r = fresh();
  grant(r, 'critical-chip');
  assert.equal(r.s.player.crit, 0.04);
  grant(r, 'critical-chip', 3);
  assert.equal(r.s.player.crit, 0.12);
  grant(r, 'haste-chip', 2);
  assert.ok(Math.abs(r.s.player.haste - 1.16) < 1e-9);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.equal(copy.s.player.crit, 0.12);
  assert.equal(copy.s.player.haste, r.s.player.haste);
  assert.equal(copy.choose('grant'), false);
});
test('phoenix prevents one lethal hit and its consumed state survives saving', () => {
  const r = fresh();
  grant(r, 'phoenix-core');
  r.s.player.hp = 1;
  r.hitPlayer(1000);
  assert.equal(r.s.done, false);
  assert.equal(r.s.player.hp, 50);
  assert.equal(r.s.phoenixUsed, true);
  const copy = new C.Run(null, { saved: r.snapshot() });
  copy.s.player.invulnerable = 0;
  copy.hitPlayer(1000);
  assert.equal(copy.s.done, true);
});
test('critical lifesteal, storm chains and kill bursts have cooldowns and cannot recursively flood effects', () => {
  const r = fresh();
  grant(r, 'life-steal', 3);
  grant(r, 'storm-core');
  grant(r, 'kill-burst', 3);
  r.s.player.crit = 0.85;
  r.random = () => 0;
  r.s.player.hp = 50;
  r.s.enemies = [enemy(90), enemy(91, 3), enemy(92, 4), enemy(93, 5)];
  r.hurt(r.s.enemies[0], 10);
  assert.equal(r.s.player.hp, 53);
  assert.ok(r.s.enemies[1].hp < 10000);
  const hp = r.s.enemies[1].hp;
  r.hurt(r.s.enemies[0], 10);
  assert.equal(r.s.player.hp, 53);
  assert.equal(r.s.enemies[1].hp, hp);
  r.s.kills = 7;
  r.s.enemies[0].hp = 1;
  r.hurt(r.s.enemies[0], 10);
  assert.ok(r.s.enemies[1].hp < hp);
  assert.ok(r.s.fx.length <= 100);
});
test('legendary meteor and time effects damage targets and actually remove hostile projectiles', () => {
  const r = fresh();
  grant(r, 'meteor-core');
  grant(r, 'time-core');
  r.s.enemies = [enemy()];
  r.s.hostile = [
    { x: 1, z: 0 },
    { x: 30, z: 0 },
  ];
  r.updateRelicEffects(0.05);
  assert.equal(r.s.enemies[0].hp, 10000);
  r.updatePatternFields(0.5);
  assert.ok(r.s.enemies[0].hp < 10000);
  assert.equal(r.s.enemies[0].slowLeft, 5);
  assert.equal(r.s.hostile.length, 1);
  const hp = r.s.enemies[0].hp;
  r.updateRelicEffects(0.05);
  assert.equal(r.s.enemies[0].hp, hp);
});
test('all 24 new techniques are learnable by an existing Digimon and cause real damage with bounded effects', () => {
  assert.equal(skills.nextOrder.length, 24);
  for (const [id] of skills.nextOrder) {
    const r = fresh(),
      skill = skills.skills[id],
      form = box.window.SPECIES_CATALOG.find((p) =>
        skills.compatible({ ...p, species: p.id }, skill),
      );
    assert.ok(form, id);
    Object.assign(r.s.player, {
      species: form.id,
      stage: form.stage,
      weapons: [{ id, rank: 1, clock: 0 }],
    });
    r.s.enemies = [enemy()];
    for (let i = 0; i < 25; i++) r.update(0.05);
    assert.ok(r.s.enemies[0].hp < 10000, id);
    assert.ok(r.s.fx.length <= 100);
    assert.ok(r.s.shots.length <= 180);
    assert.ok(r.s.attackFields.length <= 48);
  }
});
test('poison really ticks, slows apply, and delayed attacks are isolated between portal scenes', () => {
  const r = fresh(),
    e = enemy();
  r.s.enemies = [e];
  r.applyTechniqueStatus(e, 'poison-powder', 100);
  r.updatePatternFields(0.5);
  assert.equal(e.hp, 9988);
  r.applyTechniqueStatus(e, 'ice-statue', 100);
  assert.equal(e.slowLeft, 3);
  r.s.attackFields = [{ x: 2, z: 0, radius: 4, damage: 100, skillId: 'fire-tower', left: 0.4 }];
  r.enterPortal(r.s.world.portals[0].id);
  assert.equal(r.s.attackFields.length, 0);
  r.leaveRealm();
  assert.equal(r.s.attackFields.length, 0);
});
test('learning fills separate same-family slots and a full build explicitly chooses a replacement or declines', () => {
  const r = fresh();
  r.s.player.weapons = [{ id: 'fireball', rank: 3, clock: 0 }];
  r.s.choice = { kind: 'level', cards: [{ id: 'learn', type: 'weapon', weapon: 'heat-breath' }] };
  r.choose('learn');
  assert.equal(r.s.player.weapons.length, 2);
  r.s.player.weapons.push({ id: 'heal', rank: 1, clock: 0 }, { id: 'guard', rank: 1, clock: 0 });
  const before = structuredClone(r.s.player.weapons);
  r.s.choice = { kind: 'level', cards: [{ id: 'learn', type: 'weapon', weapon: 'fire-tower' }] };
  r.choose('learn');
  assert.equal(r.s.choice.kind, 'replace');
  assert.deepEqual(r.s.player.weapons, before);
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.ok(copy.choose('keep-weapons'));
  assert.deepEqual(copy.s.player.weapons, before);
  assert.ok(r.choose('replace-fireball'));
  assert.equal(r.s.player.weapons[0].id, 'fire-tower');
  assert.equal(r.s.player.weapons[0].rank, 4);
  assert.equal(r.s.player.weapons[2].id, 'heal');
});

test('every new passive grants its exact rank-three stat bonus without double applying rank one', () => {
  const additives = {
      'critical-chip': ['crit', 0.04],
      'vitality-chip': ['maxHp', 15],
      'armor-chip': ['shieldRatio', 0.1],
      'regen-chip': ['regen', 0.25],
    },
    factors = {
      'haste-chip': ['haste', 0.08],
      'power-chip': ['damage', 0.08],
      'area-chip': ['area', 0.1],
      'magnet-chip': ['magnet', 0.15],
      'swift-chip': ['speed', 0.06],
      'xp-chip': ['xpMult', 0.08],
    };
  for (const [id, [stat, amount]] of Object.entries(additives)) {
    const r = fresh(),
      base = r.s.player[stat];
    grant(r, id);
    grant(r, id, 3);
    assert.ok(Math.abs(r.s.player[stat] - (base + amount * 3)) < 1e-8, id);
  }
  for (const [id, [stat, amount]] of Object.entries(factors)) {
    const r = fresh(),
      base = r.s.player[stat];
    grant(r, id);
    grant(r, id, 3);
    assert.ok(Math.abs(r.s.player[stat] - base * (1 + amount * 3)) < 1e-8, id);
  }
});
test('critical lens changes damage, dash drive changes cooldown and panic shield triggers below its threshold', () => {
  const r = fresh();
  grant(r, 'critical-lens', 3);
  r.s.player.crit = 0.85;
  r.random = () => 0;
  const e = enemy();
  r.hurt(e, 100);
  assert.equal(e.hp, 9595);
  const d = fresh();
  grant(d, 'dash-drive', 3);
  d.s.enemies = [enemy()];
  d.s.player.weapons = [{ id: 'fireball', rank: 1, clock: 0 }];
  d.update(0.01, { z: 1, dash: true });
  assert.ok(d.s.player.relicHasteLeft > 2.9);
  assert.ok(Math.abs(d.s.player.weapons[0].clock - 2.4 / 1.3) < 1e-8);
  const p = fresh();
  grant(p, 'panic-shell', 3);
  p.s.player.hp = 35;
  p.s.player.shield = 0;
  p.hitPlayer(10);
  assert.equal(p.s.player.shieldLeft, 5);
  assert.equal(p.s.relicClocks.panic, 20);
});
test('singularity attracts gems and damages nearby foes only at its kill threshold', () => {
  const r = fresh();
  grant(r, 'void-core');
  r.s.kills = 11;
  r.s.enemies = [enemy(90), enemy(91, 4)];
  r.s.enemies[0].hp = 1;
  r.s.gems = [{ id: 88, x: 30, z: 0, value: 2 }];
  r.hurt(r.s.enemies[0], 100);
  assert.ok(r.s.gems.every((g) => g.attracted));
  assert.equal(r.s.enemies[1].hp, 9980);
  assert.equal(r.s.relicClocks.void, 8);
});
test('legendary drops are collected directly and cannot be gambled', () => {
  const r = fresh();
  r.random = () => 0.999;
  r.s.choice = r.chestChoices();
  assert.equal(r.s.choice.cards[0].quality, 4);
  r.revealChest(r.s.choice.roll.id + ':0');
  assert.equal(r.canRiskChest(), false);
  assert.equal(r.riskChest(), false);
  assert.ok(r.choose(r.s.choice.cards[0].id));
  assert.ok(loot.relics.find((x) => x.id === r.s.relics[0].id).legendary);
});
