const { test } = require('node:test'),
  assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
test('account bonus adds to existing bits and persists receipt once across reloads', async () => {
  const { applyAccountRewards: apply } = await import(
    pathToFileURL(require.resolve('../game/account-rewards.js'))
  );
  const original = { bits: 37, eggs: { Botamon: { damage: 2 } } };
  let saved,
    writes = 0;
  const rewards = [{ id: 'gift-1', bits: 10000 }];
  const next = apply(original, rewards, (n) => {
    saved = JSON.stringify(n);
    writes++;
  });
  assert.equal(next.bits, 10037);
  assert.equal(original.bits, 37);
  assert.deepEqual(next.eggs, original.eggs);
  const reloaded = JSON.parse(saved);
  assert.equal(
    apply(reloaded, rewards, () => writes++),
    reloaded,
  );
  assert.equal(writes, 1);
  assert.throws(() =>
    apply(original, rewards, () => {
      throw Error('disk full');
    }),
  );
  assert.equal(original.bits, 37);
  assert.equal(
    apply(
      original,
      [
        { id: 'bad', bits: -1 },
        { id: 'bad2', bits: Infinity },
      ],
      () => assert.fail(),
    ),
    original,
  );
});
