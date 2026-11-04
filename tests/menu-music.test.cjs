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

test('recordings restart on scene entry but keep their position through pause', async () => {
  const { Music } = await import(pathToFileURL(require.resolve('../game/music.js')).href);
  const m = new Music();
  m.tick(false, true, false);
  m.menuTrack.currentTime = 18;
  m.tick(false, true, false);
  assert.equal(m.menuTrack.currentTime, 18);
  m.tick(true, false, true);
  assert.equal(m.mapTrack.currentTime, 0);
  m.mapTrack.currentTime = 24;
  m.tick(false, false, true);
  m.tick(true, false, true);
  assert.equal(m.mapTrack.currentTime, 24);
  m.tick(true, false, false);
  m.tick(true, false, true);
  assert.equal(m.mapTrack.currentTime, 0);
  m.tick(false, true, false);
  assert.equal(m.menuTrack.currentTime, 0);
});

test('each portal biome uses its own recording and restarts on entry', async () => {
  const { Music } = await import(pathToFileURL(require.resolve('../game/music.js')).href);
  const m = new Music();
  for (const kind of ['fire', 'flood', 'glitch']) {
    m.tick(true, false, false, { kind, portalId: kind });
    assert.equal(m.biomeTracks[kind].paused, false);
    assert.equal(m.biomeTracks[kind].currentTime, 0);
    for (const other of ['fire', 'flood', 'glitch'])
      if (other !== kind) assert.equal(m.biomeTracks[other].paused, true);
    m.biomeTracks[kind].currentTime = 12;
    m.tick(false, false, false, { kind, portalId: kind });
    m.tick(true, false, false, { kind, portalId: kind });
    assert.equal(m.biomeTracks[kind].currentTime, 12);
  }
  m.setVolume(0.15);
  for (const track of Object.values(m.biomeTracks)) assert.equal(track.volume, 0.15);
  m.tick(true, false, true, null);
  for (const track of Object.values(m.biomeTracks)) assert.equal(track.paused, true);
});

test('Devimon recording replaces biome music and restarts for each encounter', async () => {
  const { Music } = await import(pathToFileURL(require.resolve('../game/music.js')).href);
  const m = new Music();
  m.tick(true, false, false, { kind: 'fire', portalId: 1 });
  m.tick(true, false, false, { kind: 'devimon', portalId: 2 });
  assert.equal(m.biomeTracks.fire.paused, true);
  assert.equal(m.biomeTracks.devimon.paused, false);
  assert.equal(m.biomeTracks.devimon.src, 'assets/music/boss-devimon.mp3');
  m.biomeTracks.devimon.currentTime = 20;
  m.tick(false, false, false, { kind: 'devimon', portalId: 2 });
  m.tick(true, false, false, { kind: 'devimon', portalId: 2 });
  assert.equal(m.biomeTracks.devimon.currentTime, 20);
  m.tick(true, false, true);
  assert.equal(m.biomeTracks.devimon.paused, true);
  m.tick(true, false, false, { kind: 'devimon', portalId: 3 });
  assert.equal(m.biomeTracks.devimon.currentTime, 0);
});
