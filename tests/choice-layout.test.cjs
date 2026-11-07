const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');

test('choices fit both viewport dimensions, including five cards and tall seller rewards', () => {
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [1280, 720],
    [960, 540],
    [760, 480],
  ]) {
    for (const [contentWidth, contentHeight] of [
      [1040, 680],
      [1040, 940],
      [1180, 720],
    ]) {
      let scale, onResize, onContentResize;
      const frames = [],
        shell = {
          offsetWidth: 1040,
          scrollWidth: contentWidth,
          offsetHeight: contentHeight,
          scrollHeight: contentHeight,
          style: {
            setProperty: (_, value) => {
              scale = value;
            },
          },
        },
        overlay = {
          hidden: true,
          clientWidth: width,
          clientHeight: height,
          querySelector: () => shell,
        },
        box = {
          document: { documentElement: { style: { getPropertyValue: () => '' } } },
          ResizeObserver: class {
            constructor(callback) {
              onContentResize = callback;
            }
            observe(target) {
              assert.equal(target, shell);
            }
          },
          window: {
            addEventListener: (_, callback) => {
              onResize = callback;
            },
          },
          requestAnimationFrame: (callback) => frames.push(callback),
        };
      vm.createContext(box);
      vm.runInContext(
        fs.readFileSync(require.resolve('../game/choice-layout.js'), 'utf8').replace('export ', ''),
        box,
      );
      const fit = box.installChoiceFitter(overlay);
      fit();
      frames.shift()();
      assert.equal(scale, undefined, 'hidden screens are ignored');
      overlay.hidden = false;
      onContentResize();
      onResize();
      assert.equal(frames.length, 1, 'content and window changes share one frame');
      frames.shift()();
      assert.ok(scale > 0 && scale <= 1);
      assert.ok(contentWidth * scale <= width - 24 + 1e-6);
      assert.ok(contentHeight * scale <= height - 24 + 1e-6);
      overlay.clientHeight = 360;
      onResize();
      frames.shift()();
      assert.ok(contentHeight * scale <= 336 + 1e-6, 'resizing recomputes the fit');
    }
  }
});
