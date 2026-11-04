const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  { pathToFileURL } = require('url');
test('intro loops only in menu, respects volume and mute, and resumes after user gesture', async () => {
  const handlers = {};
  global.document = { addEventListener: (event, fn) => (handlers[event] = fn) };
  global.window = {
    Audio: class {
      constructor(src) {
        this.src = src;
        this.paused = true;
      }
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    },
  };
  const { Music } = await import(pathToFileURL(require.resolve('../game/music.js')).href),
    m = new Music();
  m.tick(false, true);
  assert.equal(m.menuTrack.paused, false);
  assert.equal(m.menuTrack.loop, true);
  m.setVolume(0.2);
  assert.equal(m.menuTrack.volume, 0.2);
  m.tick(true, false);
  assert.equal(m.menuTrack.paused, true);
  handlers.pointerdown();
  m.tick(false, true);
  assert.equal(m.menuTrack.paused, false);
  m.enabled = false;
  m.tick(false, true);
  assert.equal(m.menuTrack.paused, true);
});

test('main map recording loops during island play and pauses in portals, menus and mute', async () => {
  const { Music } = await import(pathToFileURL(require.resolve('../game/music.js')).href);
  const m = new Music();
  m.tick(true, false, true);
  assert.equal(m.mapTrack.paused, false);
  assert.equal(m.mapTrack.loop, true);
  m.setVolume(0.4);
  assert.equal(m.mapTrack.volume, 0.4);
  m.tick(true, false, false);
  assert.equal(m.mapTrack.paused, true);
  m.tick(false, true, false);
  assert.equal(m.menuTrack.paused, false);
  assert.equal(m.mapTrack.paused, true);
  m.tick(true, false, true);
  m.setEnabled(false);
  m.tick(true, false, true);
  assert.equal(m.mapTrack.paused, true);
});
