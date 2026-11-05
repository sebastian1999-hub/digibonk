// Deterministic fragments: arrival retraces departure without consuming gameplay RNG.
export function dataFragment(index, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const delay = (index % 7) * 0.035;
  const spread = Math.max(0, (t - delay) / (1 - delay));
  const angle = index * 2.399963;
  return {
    x: Math.cos(angle) * spread * (45 + (index % 11) * 9),
    y: -spread * (90 + (index % 13) * 13),
    alpha: 1 - spread * spread,
    spread,
  };
}

export async function animateDataTravel(renderer, run, arriving) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 220 : arriving ? 1350 : 1050;
  renderer.travelHidden = true;
  const started = performance.now();
  await new Promise((resolve, reject) => {
    function frame(now) {
      try {
        const t = Math.min(1, (now - started) / duration);
        renderer.render(run, 0);
        const unit = renderer.units.get('player');
        const mesh = unit?.mesh;
        const image = mesh?.material.map?.image;
        if (image) {
          const c = renderer.fxCtx;
          const position = unit.group.position;
          const center = renderer.screen(position.x, position.y + mesh.position.y, position.z);
          const top = renderer.screen(position.x, position.y + mesh.scale.y, position.z);
          const bottom = renderer.screen(position.x, position.y, position.z);
          const height = Math.max(12, bottom.y - top.y);
          const edge = renderer.screen(
            position.x + (Math.cos(renderer.cameraYaw || 0) * mesh.scale.x) / 2,
            position.y + mesh.position.y,
            position.z - (Math.sin(renderer.cameraYaw || 0) * mesh.scale.x) / 2,
          );
          const width = Math.max(1, Math.abs(edge.x - center.x) * 2);
          const uv = mesh.geometry.attributes.uv;
          const sx = Math.min(uv.getX(0), uv.getX(1)) * image.width;
          const sy = (1 - uv.getY(0)) * image.height;
          const sw = Math.abs(uv.getX(1) - uv.getX(0)) * image.width;
          const sh = (uv.getY(0) - uv.getY(2)) * image.height;
          const progress = arriving ? 1 - t : t;
          c.save();
          c.imageSmoothingEnabled = false;
          // Assemble the real sprite, not a generic silhouette.
          for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 10; col++) {
              const f = dataFragment(row * 10 + col, reduced ? 0 : progress);
              const dx = center.x - width / 2 + (col * width) / 10 + f.x;
              const dy = top.y + (row * height) / 12 + f.y;
              c.globalAlpha = reduced ? 1 - progress : f.alpha;
              const mirrored = uv.getX(0) > uv.getX(1);
              c.save();
              c.translate(mirrored ? dx + width / 10 : dx, dy);
              if (mirrored) c.scale(-1, 1);
              c.drawImage(
                image,
                sx + ((mirrored ? 9 - col : col) * sw) / 10,
                sy + (row * sh) / 12,
                sw / 10,
                sh / 12,
                0,
                0,
                width / 10 + 0.5,
                height / 12 + 0.5,
              );
              c.restore();
              if (!reduced && f.spread > 0.05) {
                c.globalAlpha *= Math.min(0.85, f.spread * 3);
                c.fillStyle = (row + col) % 3 ? '#6df9ef' : '#e5fdff';
                c.fillRect(dx, dy, width / 10, height / 12);
              }
            }
          }
          if (!reduced) {
            const intensity = Math.sin(t * Math.PI);
            c.globalAlpha = intensity * 0.8;
            c.strokeStyle = '#82fff0';
            c.lineWidth = 2;
            c.shadowColor = '#36e9ff';
            c.shadowBlur = 12;
            for (let i = 0; i < 3; i++) {
              c.beginPath();
              c.ellipse(
                bottom.x,
                bottom.y - i * 7,
                38 + i * 13 + intensity * 20,
                12 + i * 4,
                0,
                t * 2 + i,
                t * 2 + i + Math.PI * 1.65,
              );
              c.stroke();
            }
            const scanY = bottom.y - (1 - progress) * (height + 45);
            const glow = c.createLinearGradient(0, scanY - 24, 0, scanY + 3);
            glow.addColorStop(0, '#48efff00');
            glow.addColorStop(1, '#9afff4aa');
            c.fillStyle = glow;
            c.fillRect(center.x - width / 2 - 15, scanY - 24, width + 30, 27);
            c.shadowBlur = 0;
            c.globalAlpha = intensity;
            c.font = '600 11px monospace';
            c.textAlign = 'center';
            c.fillStyle = '#e4fffa';
            c.fillText(
              arriving ? 'MATERIALIZANDO DATOS' : 'DESMATERIALIZANDO DATOS',
              bottom.x,
              bottom.y + 44,
            );
          }
          c.restore();
        }
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      } catch (error) {
        reject(error);
      }
    }
    requestAnimationFrame(frame);
  });
  if (arriving) {
    renderer.travelHidden = false;
    renderer.render(run, 0);
  }
}
