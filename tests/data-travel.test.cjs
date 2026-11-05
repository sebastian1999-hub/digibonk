const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const load = () => import(pathToFileURL(require.resolve('../game/data-travel.js')).href);

test('data fragments reconstruct exactly, dissolve completely and remain finite', async () => {
  const { dataFragment } = await load();
  for (let i = 0; i < 120; i++) {
    const start = dataFragment(i, 0),
      end = dataFragment(i, 1);
    assert.equal(Math.abs(start.x), 0);
    assert.equal(Math.abs(start.y), 0);
    assert.equal(start.alpha, 1);
    assert.equal(end.alpha, 0);
    for (let t = 0; t <= 1; t += 0.05) {
      const f = dataFragment(i, t);
      assert.ok(Object.values(f).every(Number.isFinite));
      assert.ok(f.alpha >= 0 && f.alpha <= 1);
    }
  }
});

test('travel freezes gameplay, hides source and restores arrival, including reduced motion', async () => {
  const { animateDataTravel } = await load();
  const previousRAF = global.requestAnimationFrame;
  const previousMatch = global.matchMedia;
  try {
    for (const reduced of [false, true]) {
      let now = performance.now();
      global.requestAnimationFrame = (fn) => {
        now += 100;
        queueMicrotask(() => fn(now));
      };
      global.matchMedia = () => ({ matches: reduced });
      let draws = 0;
      const ctx = new Proxy(
        {
          drawImage: (...args) => {
            assert.ok(args.slice(1).every(Number.isFinite));
            draws++;
          },
          createLinearGradient: () => ({ addColorStop() {} }),
        },
        { get: (o, key) => (key in o ? o[key] : () => {}) },
      );
      const renderer = {
        fxCtx: ctx,
        units: new Map([
          [
            'player',
            {
              group: { position: { x: 1, y: 0, z: 1 } },
              mesh: {
                position: { y: 1 },
                scale: { x: 2, y: 2 },
                material: { map: { image: { width: 100, height: 100 } } },
                geometry: {
                  attributes: { uv: { getX: (i) => i % 2, getY: (i) => (i < 2 ? 1 : 0) } },
                },
              },
            },
          ],
        ]),
        render(run, dt) {
          assert.equal(dt, 0);
        },
        screen: (x, y) => ({ x: 200 + x, y: 300 - y * 30 }),
      };
      const run = { s: { time: 10, player: { hp: 25 }, enemies: [{ hp: 50 }] } };
      const before = JSON.stringify(run);
      await animateDataTravel(renderer, run, false);
      assert.equal(renderer.travelHidden, true);
      await animateDataTravel(renderer, run, true);
      assert.equal(renderer.travelHidden, false);
      assert.equal(JSON.stringify(run), before);
      assert.ok(draws > 120);
    }
  } finally {
    global.requestAnimationFrame = previousRAF;
    global.matchMedia = previousMatch;
  }
});
