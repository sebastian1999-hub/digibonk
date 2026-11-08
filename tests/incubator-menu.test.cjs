const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
class Node {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attrs = {};
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  setAttribute(key, value) {
    this.attrs[key] = value;
  }
}
const find = (node, cls) =>
  [node, ...node.children.flatMap((n) => find(n, cls))].filter((n) =>
    n.className?.split(' ').includes(cls),
  );
async function setup(overrides = {}) {
  global.document = { createElement: (tag) => new Node(tag) };
  const { renderIncubatorMenu } = await import(
    pathToFileURL(require.resolve('../game/incubator-menu.js')).href
  );
  const P = require('../game/progression');
  const ctx = {
    P,
    meta: P.fresh(),
    mode: 'play',
    selected: 'Botamon',
    confirmed: false,
    stage: 0,
    C: {
      eggChoices: Array.from({ length: 12 }, (_, i) => ({ id: i ? 'Egg' + i : 'Botamon' })),
      evolutionLine: () => ['Baby', 'Rookie', 'Adult', 'Ultimate', 'Mega'],
      evolutionOptions: () => ['Rookie', 'Other'],
    },
    select() {},
    open() {},
    chooseStage() {},
    saveLine() {},
    buy() {},
    play() {},
    ...overrides,
  };
  const host = new Node('div');
  const result = renderIncubatorMenu(host, ctx);
  return { host, result, ctx };
}
test('twelve animated pods hide actions until selection and prevent play with locked eggs', async () => {
  let selected;
  let s = await setup({ select: (id) => (selected = id) });
  assert.equal(s.result.eggs.length, 12);
  assert.equal(find(s.host, 'pod-actions')[0].hidden, true);
  find(s.host, 'digital-pod')[1].onclick();
  assert.equal(selected, 'Egg1');
  s = await setup({ confirmed: true, selected: 'Egg1' });
  assert.equal(find(s.host, 'pod-actions')[0].hidden, false);
  assert.equal(find(s.host, 'play')[0].disabled, true);
  assert.equal(find(s.host, 'selected').length, 1);
});
test('six stages and arrows preserve the chosen prefix when selecting an evolution', async () => {
  let preferred, stage;
  const s = await setup({
    mode: 'incubator',
    stage: 2,
    saveLine: (p) => (preferred = p),
    chooseStage: (i) => (stage = i),
  });
  assert.equal(find(s.host, 'incubator-stage').length, 6);
  find(s.host, 'next')[0].onclick();
  assert.deepEqual(preferred, ['Baby', 'Other']);
  find(s.host, 'incubator-stage')[5].onclick();
  assert.equal(stage, 5);
  assert.equal(s.result.portraits.at(-1).species, 'Rookie');
});
test('four upgrades respect funds and max ranks; locked eggs offer unlocking', async () => {
  const P = require('../game/progression'),
    meta = P.fresh();
  meta.bits = 100;
  meta.eggs.Botamon.damage = 10;
  const s = await setup({ mode: 'incubator', meta });
  const upgrades = find(s.host, 'incubator-upgrade');
  assert.equal(upgrades.length, 4);
  assert.equal(upgrades[0].disabled, true);
  assert.equal(upgrades[1].disabled, false);
  const locked = await setup({ mode: 'incubator', selected: 'Egg1' });
  assert.ok(find(locked.host, 'incubator-upgrade').every((n) => n.disabled));
  assert.equal(find(locked.host, 'incubator-status')[0].children[1].disabled, true);
});
