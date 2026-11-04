const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../game/render3d.js'), 'utf8');
function fixture(fail = false) {
  const events = [],
    texture = {};
  let fencePolls = 0;
  const gl = {
    SYNC_GPU_COMMANDS_COMPLETE: 1,
    ALREADY_SIGNALED: 2,
    CONDITION_SATISFIED: 3,
    WAIT_FAILED: 4,
    fenceSync() {
      events.push('fence');
      return {};
    },
    flush() {},
    clientWaitSync() {
      return ++fencePolls > 1 ? 2 : 0;
    },
    deleteSync() {
      events.push('release-fence');
    },
  };
  const Prepare = vm.runInNewContext(
    '(class {' +
      source.slice(source.indexOf(' async prepare('), source.indexOf(' groundTexture()')) +
      '})',
    {
      requestAnimationFrame: (fn) => setImmediate(() => fn()),
      performance,
      window: { SPRITE_DATA: { Botamon: {} }, EGG_SPRITES: { egg: {} } },
      C: { heightAt: () => 0 },
    },
  );
  const r = new Prepare();
  r.buildSteps = function* () {
    events.push('build');
    this.seed = 9;
    yield 0.2;
    yield 0.8;
  };
  r.follow = { set() {} };
  r.atlases = {
    entry() {
      return {
        texture,
        ready: fail
          ? Promise.reject(new Error('missing atlas'))
          : Promise.resolve().then(() => events.push('decoded')),
      };
    },
  };
  r.renderer = {
    initTexture() {
      events.push('upload');
    },
    async compileAsync() {
      events.push('compile');
    },
    getContext() {
      return gl;
    },
  };
  r.render = (run, dt, options) => events.push(options.submit === false ? 'stage' : 'draw');
  r.scene = {};
  r.camera = {};
  return { r, events };
}
test('scene preparation waits for decoded sprites, compiles before drawing and waits for the GPU', async () => {
  const { r, events } = fixture(),
    progress = [];
  await r.prepare({ s: { mapSeed: 9, player: { x: 2, z: 3 } } }, (n) => progress.push(n));
  assert.ok(events.indexOf('decoded') < events.indexOf('upload'));
  assert.ok(events.indexOf('stage') < events.indexOf('compile'));
  assert.ok(events.indexOf('compile') < events.indexOf('draw'));
  assert.ok(events.indexOf('draw') < events.indexOf('fence'));
  assert.equal(events.at(-1), 'release-fence');
  assert.equal(progress.at(-1), 1);
  assert.equal(r.assetsReady, true);
});
test('failed sprite loading rejects preparation without declaring the scene ready', async () => {
  const { r, events } = fixture(true);
  await assert.rejects(r.prepare(null), /missing atlas/);
  assert.notEqual(r.assetsReady, true);
  assert.ok(!events.includes('draw'));
});
