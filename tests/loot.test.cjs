const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const box = { window: {} };
for (const name of ['species-catalog', 'evolution-routes'])
  vm.runInNewContext(fs.readFileSync(require.resolve('../game/' + name + '.js'), 'utf8'), box);
const C = require('../game/run-core').create(
    box.window.SPECIES_CATALOG,
    box.window.EVOLUTION_ROUTES,
    require('../game/skill-system'),
  ),
  Loot = require('../game/loot');
function fresh() {
  const r = new C.Run('Botamon', { seed: 123, id: 'loot-test' });
  r.s.hatch = 0;
  r.s.player.species = 'Botamon';
  r.s.player.stage = -1;
  r.s.spawnClock = 100;
  return r;
}
function grant(r, id, type = 'artifact') {
  r.s.choice = {
    kind: 'chest',
    cards: [
      type === 'artifact'
        ? { id: 'relic-' + id, type, item: id }
        : { id: 'buddy-' + id, type, buddy: id },
    ],
  };
  assert.ok(r.choose(r.s.choice.cards[0].id));
}
function enemy(overrides = {}) {
  return {
    id: 77,
    x: 1,
    z: 0,
    hp: 100,
    maxHp: 100,
    speed: 0,
    shotClock: 100,
    stage: 1,
    hit: 0,
    ...overrides,
  };
}
test('chests offer dedicated relics and real companions, charge once and preserve the choice on resume', () => {
  const r = fresh(),
    chest = r.map.pois.find((p) => p.type === 'chest');
  Object.assign(r.s.player, { x: chest.x, z: chest.z });
  r.s.coins = 20;
  assert.ok(r.interact().ok);
  assert.equal(r.s.coins, 5);
  assert.equal(r.s.choice.kind, 'chest');
  assert.equal(r.s.choice.cards.length, 1);
  assert.ok(r.s.choice.roll.pool.some((c) => c.type === 'artifact'));
  assert.ok(r.s.choice.roll.pool.some((c) => c.type === 'companion'));
  assert.equal(r.choose(r.s.choice.cards[0].id), false);
  assert.ok(r.revealChest(r.s.choice.roll.id + ':0'));
  assert.ok(r.s.choice.cards.every((c) => ['artifact', 'companion'].includes(c.type)));
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(copy.s.choice, r.s.choice);
  assert.equal(r.choose('forged'), false);
  assert.ok(r.choose(r.s.choice.cards[0].id));
  assert.equal(r.interact().ok, false);
  assert.equal(r.s.coins, 5);
});
test('four relic slots, maximum rank three, and three companions enforce bounded builds', () => {
  const r = fresh();
  for (const id of ['vacuum', 'thorns', 'finisher', 'boss-hunter']) grant(r, id);
  assert.equal(r.s.relics.length, 4);
  for (let i = 0; i < 4; i++) grant(r, 'vacuum');
  assert.equal(r.relicRank('vacuum'), 3);
  for (const card of r.chestChoices().cards)
    if (card.type === 'artifact')
      assert.ok(r.s.relics.some((x) => x.id === card.item) && card.rank <= 3);
  grant(r, 'Terriermon', 'companion');
  grant(r, 'Salamon', 'companion');
  assert.deepEqual(
    r.s.buddies.map((b) => b.species),
    ['Terriermon', 'Salamon'],
  );
  assert.ok(
    r
      .chestChoices()
      .cards.filter((c) => c.type === 'companion')
      .every((c) => c.buddy === 'Hagurumon'),
  );
  grant(r, 'Hagurumon', 'companion');
  assert.equal(r.s.buddies.length, 3);
  assert.equal(r.s.player.weapons.length, 0);
});
test('conditional relic damage and retaliation apply only to the intended enemies', () => {
  const r = fresh();
  r.s.player.crit = 0;
  grant(r, 'boss-hunter');
  const normal = enemy(),
    elite = enemy({ elite: true });
  r.hurt(normal, 20);
  r.hurt(elite, 20);
  assert.equal(normal.hp, 80);
  assert.equal(elite.hp, 78);
  grant(r, 'finisher');
  const weak = enemy({ hp: 29 });
  r.hurt(weak, 20);
  assert.equal(weak.hp, 6);
  grant(r, 'thorns');
  r.s.enemies = [enemy()];
  r.hitPlayer(10);
  assert.equal(r.s.enemies[0].hp, 96);
  r.hitPlayer(10);
  assert.equal(r.s.enemies[0].hp, 96);
});
test('dash relics attract loot and strike once per dash, emergency shield has a cooldown', () => {
  const r = fresh();
  r.s.player.crit = 0;
  grant(r, 'vacuum');
  grant(r, 'dash-burst');
  r.s.enemies = [enemy()];
  r.s.gems = [
    { id: 89, x: 8, z: 0, value: 2 },
    { id: 90, x: 18, z: 0, value: 2 },
  ];
  r.update(0.05, { x: 1, dash: true });
  assert.equal(r.s.gems.find((g) => g.id === 89)?.attracted, true);
  assert.equal(r.s.gems.find((g) => g.id === 90)?.attracted, undefined);
  assert.ok(r.s.enemies[0].hp < 100);
  grant(r, 'battery');
  r.s.kills = 19;
  r.hurt(enemy({ hp: 1 }), 20);
  assert.equal(r.s.player.shieldLeft, 2);
  assert.equal(r.s.relicClocks.battery, 12);
});
test('all three companions have distinct working roles and remain cooldown-limited', () => {
  for (const b of Loot.companions) assert.ok(C.species.has(b.id));
  const r = fresh();
  grant(r, 'Terriermon', 'companion');
  r.s.buddies.at(-1).clock = 0;
  r.s.enemies = [enemy({ x: 5 })];
  r.updateBuddy(0.05);
  assert.equal(r.s.shots.length, 1);
  assert.equal(r.s.shots[0].skillId, 'air-shot');
  r.updateBuddy(0.05);
  assert.equal(r.s.shots.length, 1);
  grant(r, 'Salamon', 'companion');
  r.s.buddies.at(-1).clock = 0;
  r.s.player.hp = 50;
  r.updateBuddy(0.05);
  assert.equal(r.s.player.hp, 56);
  grant(r, 'Hagurumon', 'companion');
  r.s.buddies.at(-1).clock = 0;
  r.s.gems = [{ id: 1, x: 10, z: 0, value: 2 }];
  r.updateBuddy(0.05);
  assert.equal(r.s.gems[0].attracted, true);
  const saved = new C.Run(null, { saved: r.snapshot() });
  assert.deepEqual(saved.s.buddies, r.s.buddies);
  saved.s.done = true;
  const hp = saved.s.player.hp;
  for (const b of saved.s.buddies) b.clock = 0;
  saved.updateBuddy(1);
  assert.equal(saved.s.player.hp, hp);
});
test('old saves acquire empty equipment safely; new runs do not inherit items', () => {
  const r = fresh(),
    old = r.snapshot();
  delete old.relics;
  delete old.buddies;
  delete old.buddy;
  delete old.relicClocks;
  const migrated = new C.Run(null, { saved: old });
  assert.deepEqual(migrated.s.relics, []);
  assert.deepEqual(migrated.s.buddies, []);
  grant(r, 'vacuum');
  grant(r, 'Salamon', 'companion');
  const copy = new C.Run(null, { saved: r.snapshot() });
  assert.equal(copy.relicRank('vacuum'), 1);
  assert.equal(copy.s.buddies[0].species, 'Salamon');
  assert.deepEqual(fresh().s.relics, []);
});

test('closing a chest keeps all companions and consumes the paid chest once', () => {
  const r = fresh();
  grant(r, 'Terriermon', 'companion');
  const chest = r.map.pois.find((p) => p.type === 'chest');
  Object.assign(r.s.player, chest);
  r.s.coins = 20;
  r.interact();
  assert.equal(r.s.coins, 5);
  assert.ok(r.skipChest());
  assert.equal(r.s.choice, null);
  assert.equal(r.s.buddies[0].species, 'Terriermon');
  assert.equal(r.skipChest(), false);
  assert.equal(r.interact().ok, false);
  r.s.choice = { kind: 'level', cards: [] };
  assert.equal(r.skipChest(), false);
});
test('three companions act together, survive portals and migrate a legacy companion', () => {
  const r = fresh();
  for (const id of ['Terriermon', 'Salamon', 'Hagurumon']) grant(r, id, 'companion');
  for (const b of r.s.buddies) b.clock = 0;
  r.s.player.hp = 50;
  r.s.gems = [{ id: 100, x: 8, z: 0, value: 2 }];
  r.s.enemies = [enemy({ x: 5 })];
  r.updateBuddy(0.01);
  assert.equal(r.s.shots.length, 1);
  assert.equal(r.s.player.hp, 56);
  assert.equal(r.s.gems[0].attracted, true);
  r.enterPortal(r.s.world.portals[0].id);
  assert.equal(r.s.buddies.length, 3);
  r.leaveRealm();
  assert.equal(r.s.buddies.length, 3);
  const saved = r.snapshot();
  saved.buddy = saved.buddies[0];
  delete saved.buddies;
  const loaded = new C.Run(null, { saved });
  assert.equal(loaded.s.buddies[0].species, 'Terriermon');
  assert.equal(loaded.s.buddy, undefined);
});
