(() => {
  const width = 192, height = 144;
  // All cells share a ground anchor so the displacement drawn into each frame is preserved.
  const bounds = { x: 0, y: 0, w: width, h: height };
  function row(index, durations) {
    return durations.map((duration, i) => ({
      x: i * width, y: index * height, w: width, h: height, bounds, offset: [0, 0], duration,
    }));
  }
  const hover = row(0, [0.18, 0.18, 0.18, 0.18, 0.18, 0.18]);
  window.SPRITE_DATA[window.DigibonkWorld.FINAL_BOSS_NAME] = {
    sheet: 'assets/campeones-domingo/rey-del-albornoz/trono-animado.png',
    width, height, referenceHeight: 128 / height, pixelArt: true,
    actions: {
      idle: hover, run: hover, hit: hover,
      attack: row(1, [0.08, 0.08, 0.09, 0.1, 0.1, 0.1]),
    },
  };
})();
