import * as THREE from './vendor/three.module.js';
const TAU = Math.PI * 2,
  V = (x, y, z) => new THREE.Vector3(x, y, z),
  floorRotation = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2);
// Geometry is instanced through the shared effect budget and opacity controls.
export function drawNextOrderVFX(a, skill, e, s, time, owner, phase) {
  const x = e.x,
    z = e.z,
    g = window.DigibonkCore.heightAt(x, z, s.mapSeed),
    life = phase === 'projectile' ? 1 : Math.max(0, e.life / (e.maxLife || 1)),
    t = phase === 'projectile' ? 0.35 : 1 - life,
    r = e.radius || 3.5,
    color = skill.color,
    y = g + 1,
    seed = e.id || 0,
    type = skill.visual;
  if (phase === 'cast') {
    a.decal('next-order-charge', x, g + 0.1, z, 1.3 + 2 * t, color, life * 0.45, owner, true);
    a.glow(x, y, z, 1.5, color, life * 0.4, owner);
    return true;
  }
  const glow = (xx, yy, zz, size, c = color, alpha = life) =>
      a.glow(xx, yy, zz, size, c, alpha * 0.45, owner),
    beam = (name, from, to, width, c = color, alpha = life) =>
      a.beam(name, from, to, width, c, alpha, owner),
    ring = (xx, yy, zz, size, c = color, alpha = life) =>
      a.emit(
        'element-rings',
        'ring',
        null,
        xx,
        yy,
        zz,
        size,
        size,
        size,
        c,
        alpha,
        floorRotation,
        owner,
      ),
    shard = (xx, yy, zz, sx, sy, sz, c = color) =>
      a.emit(
        'element-shards',
        'shard',
        null,
        xx,
        yy,
        zz,
        sx,
        sy,
        sz,
        c,
        life,
        a.yaw(time + xx),
        owner,
      );
  if (
    type === 'wind-cutter' ||
    type === 'saint-ray' ||
    type === 'laser-barrage' ||
    type === 'soul-chaser'
  ) {
    const dx = x - (e.prevX ?? e.ox ?? x - 1),
      dz = z - (e.prevZ ?? e.oz ?? z),
      n = Math.hypot(dx, dz) || 1,
      ux = dx / n,
      uz = dz / n;
    if (type === 'wind-cutter') {
      for (let i = 0; i < 3; i++)
        a.emit(
          'wind-crescents',
          'slash',
          null,
          x - ux * i * 0.35,
          y + i * 0.1,
          z - uz * i * 0.35,
          1.4,
          1.4,
          1,
          i % 2 ? '#f5ffe9' : '#82e6ca',
          life,
          a.face(time * 7 + i * 1.4),
          owner,
        );
    } else if (type === 'soul-chaser') {
      a.emit('soul-head', 'sphere', null, x, y, z, 0.28, 0.4, 0.28, '#d3b5ff', life, null, owner);
      for (let i = 0; i < 5; i++)
        a.emit(
          'soul-stream',
          'quad',
          'smoke',
          x - ux * i * 0.4,
          y + Math.sin(time * 10 + i) * 0.2,
          z - uz * i * 0.4,
          0.7 - i * 0.07,
          0.7 - i * 0.07,
          1,
          '#a06ce5',
          life * (1 - i * 0.13),
          null,
          owner,
        );
    } else {
      for (let i = -1; i <= 1; i++) {
        const shift = i * 0.22;
        beam(
          'triple-lance',
          V(x - ux * 3 + uz * shift, y + shift, z - uz * 3 - ux * shift),
          V(x + uz * shift, y + shift, z - ux * shift),
          i === 0 ? 0.06 : 0.025,
          type === 'saint-ray' ? '#fff5c6' : '#ffa1e4',
        );
      }
      ring(x, y, z, 0.4, color, life * 0.5);
    }
    glow(x, y, z, 2.3);
    return true;
  }
  if (type === 'breath-cone' || type === 'holy-breath' || type === 'sonic-fist') {
    const dx = e.dx ?? 1,
      dz = e.dz ?? 0,
      n = Math.hypot(dx, dz) || 1,
      ux = dx / n,
      uz = dz / n;
    for (let i = 1; i <= 9; i++) {
      const d = (i / 9) * r,
        xx = x + ux * d,
        zz = z + uz * d;
      if (type === 'breath-cone') {
        for (let side = -1; side <= 1; side++)
          a.flame(
            xx + uz * side * d * 0.3,
            g + 0.1,
            zz - ux * side * d * 0.3,
            0.4 + d * 0.12,
            time,
            seed + i,
            false,
            owner,
            life,
          );
      } else if (type === 'holy-breath') {
        for (let side = -1; side <= 1; side++)
          beam(
            'holy-breath-rays',
            V(x, y, z),
            V(xx + uz * side * d * 0.35, y + Math.sin(i) * 0.3, zz - ux * side * d * 0.35),
            0.035,
            '#fff4bc',
            life * 0.7,
          );
      } else {
        a.emit(
          'sonic-fists',
          'fist',
          null,
          xx,
          y,
          zz,
          0.25 + d * 0.05,
          0.25 + d * 0.05,
          0.25 + d * 0.05,
          '#edca9f',
          life,
          a.yaw(time),
          owner,
        );
        ring(xx, y, zz, 0.2 + d * 0.1, '#ffe7be', life * 0.5);
      }
    }
    return true;
  }
  if (type === 'fire-pillar' || type === 'magma-fall') {
    const fall = Math.max(0, 1 - t / 0.45);
    if (type === 'magma-fall') {
      const yy = g + 0.6 + fall * 8;
      a.emit(
        'falling-magma',
        'sphere',
        'sun',
        x,
        yy,
        z,
        0.7,
        0.7,
        0.7,
        '#fff1bc',
        life,
        a.yaw(time),
        owner,
      );
      for (let i = 0; i < 4; i++)
        a.flame(x, g + 0.3 + fall * 8 + i * 0.6, z, 0.8, time, seed + i, false, owner, life);
    } else
      for (let i = 0; i < 7; i++) {
        const angle = (i * TAU) / 7,
          rr = r * 0.35;
        a.flame(
          x + Math.cos(angle) * rr,
          g + 0.1,
          z + Math.sin(angle) * rr,
          1.1 + Math.sin(t * Math.PI),
          time,
          seed + i,
          false,
          owner,
          life,
        );
      }
    if (t > 0.35) {
      ring(x, g + 0.12, z, r * Math.min(1, (t - 0.35) * 3), '#ffb453', life);
      for (let i = 0; i < 10; i++) {
        const q = i * 2.3999;
        shard(
          x + Math.cos(q) * t * r,
          g + 0.4 + Math.sin(t * Math.PI) * 1.5,
          z + Math.sin(q) * t * r,
          0.06,
          0.22,
          0.06,
          '#ffd68a',
        );
      }
    }
    glow(x, y, z, 4, '#ff9c35');
    return true;
  }
  if (type === 'waterfall' || type === 'rainfall') {
    if (type === 'waterfall') {
      a.emit(
        'waterfall-curtain',
        'quad',
        'water',
        x,
        g + 2.1,
        z,
        2.1,
        4,
        1,
        '#8fe9ff',
        life * 0.65,
        null,
        owner,
      );
      for (let i = -2; i <= 2; i++) {
        const xx = x + i * 0.4;
        beam(
          'waterfall-stream',
          V(xx, g + 0.2, z),
          V(xx + Math.sin(time * 8 + i) * 0.12, g + 5 * life, z),
          0.22,
          '#5dd5f4',
          life * 0.75,
        );
        beam(
          'waterfall-highlights',
          V(xx, g + 0.3, z + 0.1),
          V(xx, g + 4.7 * life, z + 0.1),
          0.04,
          '#e3ffff',
        );
      }
      a.wave(x, g + 0.05, z, 1.2, time * 0.5, time, owner, life, 0.5);
    } else
      for (let i = 0; i < 28; i++) {
        const angle = i * 2.3999,
          rr = Math.sqrt(i / 28) * r,
          xx = x + Math.cos(angle) * rr,
          zz = z + Math.sin(angle) * rr,
          yy = g + ((time * 7 + i * 0.7) % 4);
        beam(
          'rain-streaks',
          V(xx, yy, zz),
          V(xx - 0.15, yy + 0.8, zz + 0.15),
          0.025,
          '#b8f4ff',
          life * 0.8,
        );
        if (i % 5 === 0) ring(xx, g + 0.1, zz, 0.2 + ((time + i) % 1) * 0.4, '#c5ffff', life * 0.6);
      }
    for (let i = 0; i < 3; i++)
      ring(x, g + 0.1 + i * 0.01, z, 0.5 + t * r + i * 0.4, '#a6eaff', life * 0.6);
    return true;
  }
  if (type === 'ice-statue' || type === 'aurora') {
    for (let i = 0; i < 12; i++) {
      const q = i * 2.4,
        rr = (0.3 + (i % 3) * 0.7) * Math.min(1, r / 3),
        height = (1.3 + (i % 4) * 0.5) * Math.sin(t * Math.PI);
      shard(
        x + Math.cos(q) * rr,
        g + height * 0.5,
        z + Math.sin(q) * rr,
        0.25,
        height,
        0.25,
        i % 2 ? '#ceffff' : '#79c9ee',
      );
    }
    ring(x, g + 0.12, z, t * r, '#afffff');
    if (type === 'aurora')
      for (let band = 0; band < 3; band++) {
        let last = null;
        for (let i = 0; i <= 18; i++) {
          const q = (i / 18) * Math.PI,
            point = V(
              x + Math.cos(q) * (r + band * 0.2),
              g + 1 + Math.sin(q) * 2 + Math.sin(time * 3 + q * 3) * 0.2,
              z + Math.sin(q) * (r * 0.3 + band * 0.3),
            );
          if (last)
            a.ribbon(
              'aurora-curtains',
              last,
              point,
              0.5 + band * 0.15,
              ['#8ef5db', '#b299ff', '#a7e6ff'][band],
              life * 0.5,
              owner,
            );
          last = point;
        }
      }
    return true;
  }
  if (type === 'thunder-cloud' || type === 'hurricane') {
    if (type === 'thunder-cloud') {
      for (let i = 0; i < 5; i++)
        a.emit(
          'storm-clouds',
          'quad',
          'smoke',
          x + Math.sin(i * 2) * 1.2,
          g + 4 + (i % 2) * 0.3,
          z + Math.cos(i * 2) * 0.8,
          2.3,
          1.4,
          1,
          '#40566b',
          life * 0.85,
          null,
          owner,
        );
      let last = V(x, g + 4, z);
      for (let i = 1; i <= 7; i++) {
        const point = V(
          x + Math.sin(i * 13 + Math.floor(time * 16)) * 0.35,
          g + 4 - i * 0.55,
          z + Math.cos(i * 7 + time * 13) * 0.25,
        );
        beam('cloud-lightning', last, point, 0.055, '#d9ffff');
        last = point;
      }
      glow(x, y, z, 4, '#7adeff');
    } else {
      for (let i = 0; i < 4; i++)
        a.emit(
          'hurricane-spirals',
          'helix',
          null,
          x,
          g,
          z,
          1 + i * 0.3,
          1.2 + i * 0.25,
          1 + i * 0.3,
          i % 2 ? '#d7ffdd' : '#7dd4ca',
          life * 0.7,
          a.yaw(time * 5 + i * 1.5),
          owner,
        );
      for (let i = 0; i < 12; i++) {
        const q = time * 7 + i,
          rr = 1.2 + (i % 3) * 0.4;
        shard(
          x + Math.cos(q) * rr,
          g + 0.3 + (i / 12) * 3,
          z + Math.sin(q) * rr,
          0.08,
          0.18,
          0.08,
          '#d9f8bf',
        );
      }
    }
    return true;
  }
  if (type === 'poison-cloud' || type === 'root-cage' || type === 'thorn-chain') {
    if (type === 'poison-cloud') {
      for (let i = 0; i < 7; i++) {
        const q = i * 2.4,
          rr = (0.4 + t) * r * 0.5;
        a.emit(
          'toxic-mist',
          'quad',
          'smoke',
          x + Math.cos(q) * rr,
          g + 0.8 + Math.sin(time * 3 + i) * 0.3,
          z + Math.sin(q) * rr,
          2.3,
          2.1,
          1,
          i % 2 ? '#a8ca5b' : '#7fa43d',
          life * 0.6,
          null,
          owner,
        );
        a.emit(
          'toxic-bubbles',
          'quad',
          'bubble',
          x + Math.cos(q) * rr,
          g + 0.3 + t * 2,
          z + Math.sin(q) * rr,
          0.25,
          0.25,
          1,
          '#b4ed6c',
          life,
          null,
          owner,
        );
      }
    } else {
      const from = V(e.fromX ?? x - 1, g + 0.2, e.fromZ ?? z);
      for (let i = 0; i < 8; i++) {
        const q = (i * TAU) / 8,
          rr = r * 0.55,
          base = V(x + Math.cos(q) * rr, g + 0.1, z + Math.sin(q) * rr),
          tip = V(
            x + Math.cos(q) * rr * 0.7,
            g + Math.sin(t * Math.PI) * (1.5 + (i % 3) * 0.4),
            z + Math.sin(q) * rr * 0.7,
          );
        beam('rising-roots', base, tip, 0.11, '#6e8e42');
        shard(tip.x, tip.y, tip.z, 0.13, 0.45, 0.13, '#c1ed78');
      }
      if (type === 'thorn-chain') beam('thorn-whip', from, V(x, y, z), 0.12, '#a5d866');
    }
    return true;
  }
  if (type === 'black-hole' || type === 'soul-rain') {
    if (type === 'black-hole') {
      a.emit(
        'singularity-heart',
        'sphere',
        null,
        x,
        y,
        z,
        0.5 + life * 0.3,
        0.5 + life * 0.3,
        0.5 + life * 0.3,
        '#140d25',
        life,
        null,
        owner,
      );
      for (let i = 0; i < 4; i++) {
        const q = time * -4 + (i * TAU) / 4,
          rr = (1 - t) * r;
        beam(
          'void-streams',
          V(x + Math.cos(q) * rr, y + Math.sin(q) * 0.4, z + Math.sin(q) * rr),
          V(x, y, z),
          0.035,
          '#c08cf8',
        );
        ring(x, g + 0.1, z, rr, '#a96ce6', life * 0.6);
      }
    } else
      for (let i = 0; i < 16; i++) {
        const q = i * 2.4,
          rr = Math.sqrt(i / 16) * r,
          yy = g + 0.5 + (((1 - t) * 6 + i * 0.3) % 5);
        a.emit(
          'falling-souls',
          'sphere',
          null,
          x + Math.cos(q) * rr,
          yy,
          z + Math.sin(q) * rr,
          0.15,
          0.3,
          0.15,
          '#d2b3ff',
          life,
          null,
          owner,
        );
        beam(
          'soul-rain-trails',
          V(x + Math.cos(q) * rr, yy, z + Math.sin(q) * rr),
          V(x + Math.cos(q) * rr, yy + 1, z + Math.sin(q) * rr),
          0.045,
          '#9561cf',
          life * 0.6,
        );
      }
    glow(x, y, z, 4, '#ab69ea');
    return true;
  }
  if (type === 'judgement') {
    const width = Math.sin(t * Math.PI) * 0.45;
    beam('judgement-column', V(x, g + 0.1, z), V(x, g + 9, z), width, '#fff0a8', life * 0.8);
    beam('judgement-core', V(x, g + 0.1, z), V(x, g + 9, z), width * 0.2, '#ffffff');
    for (let i = 0; i < 4; i++) ring(x, g + 0.1 + i * 1.3, z, 0.8 + i * 0.25, '#ffe8a8');
    a.decal('judgement-seal', x, g + 0.12, z, r, '#ffe4a0', life * 0.75, owner, true);
    return true;
  }
  if (type === 'metal-impact') {
    const fall = Math.max(0, 1 - t / 0.45),
      yy = g + 0.8 + fall * 6;
    a.emit(
      'megaton-head',
      'fist',
      null,
      x,
      yy,
      z,
      1,
      1,
      1,
      '#a8bbc0',
      life,
      a.yaw(time * 0.5),
      owner,
    );
    beam('hammer-shaft', V(x, yy, z), V(x, yy + 2, z), 0.12, '#566d76');
    ring(x, g + 0.12, z, t * r, '#ffc882');
    for (let i = 0; i < 7; i++) {
      const q = i * 2.4;
      shard(
        x + Math.cos(q) * t * r,
        g + Math.sin(t * Math.PI) * 1.7,
        z + Math.sin(q) * t * r,
        0.12,
        0.18,
        0.12,
        '#cfb59a',
      );
    }
    return true;
  }
  if (type === 'digital-grid') {
    for (let i = -3; i <= 3; i++) {
      const d = (i * r) / 3;
      beam(
        'dimension-grid',
        V(x - r, g + 0.15, z + d),
        V(x + r, g + 0.15, z + d),
        0.025,
        '#f3a7ed',
      );
      beam(
        'dimension-grid',
        V(x + d, g + 0.15, z - r),
        V(x + d, g + 0.15, z + r),
        0.025,
        '#a4eaff',
      );
      if (i % 2 === 0)
        for (let j = -1; j <= 1; j++)
          a.emit(
            'digital-pillars',
            'beam',
            null,
            x + d,
            g + 0.2 + life * 0.6,
            z + j * r * 0.65,
            0.16,
            life * 1.5,
            0.16,
            '#e6afff',
            life * 0.65,
            null,
            owner,
          );
    }
    ring(x, g + 0.18, z, t * r, '#d1afff');
    return true;
  }
  if (type === 'earthquake') {
    for (let i = 0; i < 16; i++) {
      const q = i * 2.4,
        rr = Math.sqrt(i / 16) * r,
        height = Math.sin(t * Math.PI) * (1 + (i % 3) * 0.35);
      a.emit(
        'earthquake-rocks',
        'shard',
        null,
        x + Math.cos(q) * rr,
        g + height * 0.5,
        z + Math.sin(q) * rr,
        0.35,
        height + 0.1,
        0.3,
        i % 2 ? '#b5a58a' : '#7d786a',
        life,
        a.yaw(q),
        owner,
      );
    }
    for (let i = 0; i < 3; i++)
      ring(x, g + 0.1 + i * 0.01, z, (t + i * 0.2) * r, '#dec999', life * 0.65);
    return true;
  }
  return false;
}
