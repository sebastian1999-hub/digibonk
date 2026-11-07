const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
test('interface scale clamps stored settings, updates live, persists and restores 100 percent', () => {
  const nodes = new Map(['#ui-scale', '#ui-scale-value', '#ui-scale-reset'].map((id) => [id, {}]));
  let applied,
    saves = 0,
    resizes = 0;
  const box = {
    document: {
      querySelector: (id) => nodes.get(id),
      documentElement: {
        style: {
          setProperty: (_, value) => {
            applied = value;
          },
        },
      },
    },
    window: { dispatchEvent: () => resizes++ },
    Event: class {},
  };
  vm.createContext(box);
  vm.runInContext(
    fs.readFileSync(require.resolve('../game/ui-scale.js'), 'utf8').replaceAll('export ', ''),
    box,
  );
  for (const invalid of [undefined, null, '130', Infinity, NaN])
    assert.equal(box.normalizeUiScale(invalid), 1);
  assert.equal(box.normalizeUiScale(0), 0.7);
  assert.equal(box.normalizeUiScale(5), 1.3);
  const settings = { uiScale: 0.85 };
  box.bindUiScale(settings, () => saves++);
  assert.equal(applied, 0.85);
  assert.equal(nodes.get('#ui-scale-value').textContent, '85 %');
  nodes.get('#ui-scale').value = '130';
  nodes.get('#ui-scale').oninput();
  assert.equal(settings.uiScale, 1.3);
  assert.equal(saves, 1);
  box.bindUiScale(settings, () => saves++);
  assert.equal(nodes.get('#ui-scale').value, '130', 'saved preference is restored on startup');
  nodes.get('#ui-scale-reset').onclick();
  assert.equal(applied, 1);
  assert.equal(settings.uiScale, 1);
  assert.equal(saves, 2);
  assert.equal(resizes, 4);
});
