const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm');
const { parseNotes } = require('../scripts/sync-patch-notes.cjs');
const source =
  '## Pendiente de publicación\n- Borrador\n## 1.9.0 · Anterior\n- Corrección\n## 1.10.0 · Actual\n- Novedad\n## Pendiente de publicación: más\n- Otro borrador';
test('patch history sorts versions numerically and keeps drafts separate', () => {
  const data = parseNotes(source, '1.10.0');
  assert.deepEqual(data.pending, ['Borrador', 'Otro borrador']);
  assert.deepEqual(
    data.releases.map((r) => r.version),
    ['1.10.0', '1.9.0'],
  );
  assert.deepEqual(parseNotes(source, '1.10.0', false).pending, []);
  assert.throws(() => parseNotes(source, '1.11.0'), /Añade los cambios/);
  const legacy = parseNotes('## 1.18.0 · Nueva\n- Nuevo\n# Digibonk 1.17.0\n- Antiguo\n## Sin versión\n- Excluido', '1.18.0');
  assert.deepEqual(legacy.releases.map(r => [r.version, r.changes]), [
    ['1.18.0', ['Nuevo']], ['1.17.0', ['Antiguo']],
  ]);
});
test('shipped local history matches release notes and the current installed version', () => {
  const read = (name) => fs.readFileSync(require.resolve('../' + name), 'utf8');
  const data = parseNotes(read('RELEASE-NOTES.md'), read('version.txt').trim());
  const box = { window: {} };
  vm.runInNewContext(read('game/patch-notes.js'), box);
  assert.deepEqual(JSON.parse(JSON.stringify(box.window.DigibonkPatchNotes)), data);
  assert.match(read('game/index.html'), /id="menu-patch-notes">Info parche/);
  assert.doesNotMatch(read('game/index.html'), /id="menu-league"/);
  assert.match(read('desktop/build.ps1'), /sync-patch-notes\.cjs.*--published/);
});
