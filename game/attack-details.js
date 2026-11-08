import * as THREE from './vendor/three.module.js';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (n) => Math.max(0, Math.min(1, n));
const noise = (n) => {
  const q = Math.sin(n * 91.73 + 17.1) * 43758.5453;
  return q - Math.floor(q);
};

// Secondary animation has its own headroom; the projectile silhouette comes first.
// Everything is reconstructed from visual time/id, never from the combat RNG.
export function attackElement(k) {
  const type = k.visual;
  if (['lightning', 'thunder-cloud'].includes(type)) return 'electric';
  if (
    [
      'flame',
      'blue-flame',
      'inferno',
      'sun',
      'phoenix',
      'magma-fall',
      'breath-cone',
      'fire-pillar',
    ].includes(type)
  )
    return 'fire';
  if (type === 'bubble') return 'water';
  if (type === 'flower') return 'flower';
  return k.family;
}

function available(v) {
  return v.a.count < v.a.budget * 0.7 || v.a.warming;
}

function groundLight(v, size, alpha) {
  v.sprite('fx-aura', V(v.x, v.g + 0.035, v.z), size, size, v.color, alpha, 0, true, true);
}

function radialStreaks(v, count, radius, alpha, inward = false) {
  for (let i = 0; i < count; i++) {
    const q = i * 2.39996 + v.seed;
    const reach = radius * (0.7 + noise(i + v.seed) * 0.3);
    const start = inward ? reach : reach * 0.45;
    const end = inward ? reach * 0.4 : reach;
    v.line(
      V(v.x + Math.cos(q) * start, v.y + Math.sin(q) * start * 0.35, v.z + Math.sin(q) * start),
      V(v.x + Math.cos(q) * end, v.y + Math.sin(q) * end * 0.35, v.z + Math.sin(q) * end),
      (i % 3 === 0 ? 0.16 : 0.07) * v.p,
      i % 2 ? v.color : v.hot,
      alpha,
    );
  }
}

export function flightDetails(v) {
  if (!available(v)) return;
  const { p, time, color, hot, ink, k } = v;
  const type = attackElement(k);
  groundLight(v, p * 2.8, 0.15);
  if (type === 'fire') {
    if (k.visual === 'phoenix') {
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const flap = Math.sin(time * 11) * 0.3;
          v.sprite(
            'fx-feather',
            v.point(-0.35 - i * 0.35, side * p * (0.5 + i * 0.22), flap * i),
            p * 1.6,
            p * 0.65,
            i % 2 ? hot : color,
            0.9,
            v.roll + side * (0.5 + i * 0.15 + flap),
          );
        }
      return;
    }
    v.sprite('fx-plasma', v.point(-0.65), p * 3.6, p * 1.65, ink, 0.9, v.roll);
    v.sprite('fx-plasma', v.point(-0.32), p * 2.4, p * 0.72, hot, 0.95, v.roll);
    if (k.visual === 'sun') {
      v.sprite('fx-corona', v.point(), p * 2.2, p * 2.2, color, 0.85, time * 1.4, true);
    }
    for (let i = 0; i < 4; i++) {
      const t = (time * 2.3 + i / 4 + noise(v.seed)) % 1;
      const pos = v.point(
        -0.6 - t * p * 3.4,
        Math.sin(i * 2.4) * t * p * 0.5,
        Math.cos(i * 2.4) * t * p * 0.5,
      );
      v.sprite(
        'fx-speed',
        pos,
        p * (0.7 - t * 0.5),
        p * 0.12,
        i % 2 ? hot : color,
        1 - t,
        v.roll,
        true,
      );
    }
  } else if (type === 'electric') {
    v.sprite('fx-corona', v.point(), p * 1.4, p * 1.4, '#44aaff', 0.65, -time * 4, true);
    v.bolt(v.point(-1.4 * p, -0.4 * p), v.point(0.2, 0.3 * p), 0.09 * p, 0.9);
    v.spark(v.point(), p * 0.85, 0.9, '#d9ffff');
  } else if (type === 'ice') {
    v.sprite('fx-snowflake', v.point(-0.2), p * 1.7, p * 1.7, color, 0.75, time * 1.5);
    for (let i = 0; i < 3; i++) {
      const t = (time * 1.3 + i / 3) % 1;
      v.sprite(
        'fx-snowflake',
        v.point(-0.5 - t * 2.7, Math.sin(i * 2.4) * t, 0.15),
        p * (0.3 + t * 0.5),
        p * (0.3 + t * 0.5),
        hot,
        (1 - t) * 0.6,
        time + i,
      );
    }
  } else if (type === 'water') {
    if (k.visual !== 'wave')
      v.sprite('fx-splash', v.point(-0.1), p * 1.7, p * 1.1, hot, 0.7, v.roll - Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const t = (time * 1.5 + i / 3) % 1;
      v.sprite(
        'fx-ripple',
        v.point(-t * 2.7),
        p * (0.4 + t),
        p * (0.4 + t),
        color,
        (1 - t) * 0.7,
        v.roll,
      );
    }
  } else if (type === 'dark') {
    if (k.visual === 'bats') {
      for (let i = 0; i < 3; i++)
        v.sprite(
          'fx-smoke',
          v.point(-0.5 - i * 0.5, (i - 1) * p * 0.65),
          p * 1.1,
          p * 0.9,
          color,
          0.4 - i * 0.08,
        );
      return;
    }
    v.sprite('fx-corona', v.point(), p * 1.5, p * 1.5, color, 0.85, -time * 2.5);
    v.sprite('fx-void', v.point(0.02, 0, 0.03), p * 0.72, p * 0.72, ink, 1);
    for (let i = 0; i < 4; i++) {
      const t = (time + i / 4) % 1;
      v.sprite(
        'fx-plasma',
        v.point(-0.8 - t * 2, Math.sin(i * 2.4 + time * 4) * 0.35),
        p * 1.2,
        p * 0.35,
        color,
        (1 - t) * 0.65,
        v.roll,
      );
    }
  } else if (type === 'holy') {
    v.sprite('fx-halo', v.point(-0.3), p * 1.8, p * 1.8, color, 0.85, time, true);
    for (const side of [-1, 1]) {
      v.sprite(
        'fx-feather',
        v.point(-0.6, side * p * 0.5),
        p * 1.4,
        p * 0.65,
        hot,
        0.8,
        v.roll + side * 0.3,
      );
    }
  } else if (type === 'nature' || type === 'flower') {
    const n = type === 'flower' ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const angle = time * 4 + (i * TAU) / n;
      const pos = v.point(-0.6, Math.sin(angle) * p * 0.6, Math.cos(angle) * p * 0.6);
      v.sprite('fx-petal', pos, p * 0.95, p * 0.45, i % 2 ? hot : color, 0.8, angle);
      v.spark(v.point(-1.7, Math.sin(angle) * 0.5, Math.cos(angle) * 0.5), p * 0.16, 0.7, color);
    }
  } else if (type === 'wind') {
    for (let i = 0; i < 2; i++)
      v.sprite(
        'fx-crescent',
        v.point(-i * 0.65),
        p * (2.5 - i * 0.4),
        p * 1.8,
        i ? color : hot,
        0.75 - i * 0.2,
        v.roll + time * 0.3,
      );
  } else if (type === 'machine') {
    v.sprite('fx-hex', v.point(-0.1), p * 1.2, p * 1.2, color, 0.7, time * 2);
    v.sprite('fx-speed', v.point(-1.1), p * 3, p * 0.3, hot, 0.9, v.roll, true);
  } else {
    for (const side of [-1, 1])
      v.sprite('fx-speed', v.point(-1.1, side * p * 0.4), p * 2.2, p * 0.2, color, 0.7, v.roll);
  }
}

// Called only once the simulated strike occurs (including the 0.4 s field delay).
export function impactDetails(v) {
  if (!available(v)) return;
  const { t, p, r, color, hot, ink, fade } = v;
  const type = attackElement(v.k);
  const kick = Math.sin(Math.PI * clamp(t / 0.72));
  const spread = 0.25 + (1 - Math.pow(1 - t, 3)) * 0.75;
  groundLight(v, r * 2.3, fade * 0.28);
  if (type === 'fire') {
    v.sprite(
      'fx-corona',
      v.point(0, 0, 0.1),
      p * (1.2 + spread * 2.1),
      p * (1.2 + spread * 2.1),
      ink,
      kick * 0.9,
      v.seed + t,
    );
    for (let i = 0; i < 5; i++) {
      const q = (i * TAU) / 5 + v.seed;
      const pos = V(
        v.x + Math.cos(q) * r * spread * 0.65,
        v.g + 0.5 + kick * p * 0.6,
        v.z + Math.sin(q) * r * spread * 0.65,
      );
      v.sprite(
        'fx-plasma',
        pos,
        p * (1 + kick),
        p * 0.65,
        i % 2 ? hot : color,
        kick * 0.75,
        q + t * 0.3,
      );
    }
    radialStreaks(v, 7, Math.max(r, p * 1.5) * spread, fade * 0.75);
  } else if (type === 'electric') {
    v.sprite(
      'fx-corona',
      v.point(),
      p * (1.1 + spread * 2),
      p * (1.1 + spread * 2),
      '#4ebaff',
      fade * 0.9,
      -v.time * 2,
      true,
    );
    v.sprite(
      'fx-star',
      v.point(),
      p * 1.9 * (1 - t),
      p * 1.9 * (1 - t),
      '#e6ffff',
      fade,
      t * 0.3,
      true,
    );
    radialStreaks(v, 7, Math.max(r, p * 1.3) * spread, fade, false);
  } else if (type === 'ice') {
    v.sprite(
      'fx-snowflake',
      V(v.x, v.g + 0.06, v.z),
      r * 2,
      r * 2,
      color,
      fade * 0.8,
      0,
      false,
      true,
    );
    for (let i = 0; i < 5; i++) {
      const q = i * 2.39996;
      const pos = V(
        v.x + Math.cos(q) * r * spread * 0.7,
        v.g + 0.3 + kick * p,
        v.z + Math.sin(q) * r * spread * 0.7,
      );
      v.sprite('fx-snowflake', pos, p * 0.6, p * 0.6, hot, fade, q + t);
      v.spark(pos, p * 0.35, fade * 0.8);
    }
  } else if (type === 'water') {
    const size = p * (1.1 + kick * 1.8);
    v.sprite('fx-splash', v.point(0, 0, kick * 0.3), size * 1.3, size, color, fade * 0.9);
    v.sprite(
      'fx-splash',
      v.point(0, 0, 0.1 + kick * 0.3),
      size,
      size * 0.85,
      hot,
      fade * 0.85,
      -0.12,
    );
    for (let i = 0; i < 5; i++) {
      const q = i * 2.39996;
      const pos = V(
        v.x + Math.cos(q) * r * spread,
        v.g + 0.2 + kick * (0.7 + i * 0.17),
        v.z + Math.sin(q) * r * spread,
      );
      v.sprite('bubble', pos, p * (0.2 + t * 0.15), p * (0.2 + t * 0.15), hot, fade * 0.85);
    }
  } else if (type === 'dark') {
    const size = Math.max(p * 2, r * 1.35) * (0.5 + kick * 0.6);
    v.sprite('fx-corona', v.point(), size, size, color, fade * 0.85, -t * 2);
    v.sprite('fx-corona', v.point(), size * 0.8, size * 0.8, '#eaa4ff', fade * 0.55, t * 3);
    radialStreaks(v, 9, Math.max(r, p * 1.4) * (1.2 - t * 0.6), fade * 0.8, true);
  } else if (type === 'holy') {
    const size = p * (1 + spread * 1.8);
    v.sprite('fx-halo', v.point(0, 0, 0.3), size, size, color, fade * 0.9, t * 0.6, true);
    for (let i = 0; i < 6; i++) {
      const q = (i * TAU) / 6;
      v.sprite(
        'fx-feather',
        V(
          v.x + Math.cos(q) * r * spread * 0.65,
          v.g + 0.5 + kick * p,
          v.z + Math.sin(q) * r * spread * 0.65,
        ),
        p * 0.9,
        p * 0.45,
        hot,
        fade,
        q - t,
      );
    }
    radialStreaks(v, 6, Math.max(r, p) * spread, fade * 0.7);
  } else if (type === 'nature' || type === 'flower') {
    for (let i = 0; i < 8; i++) {
      const q = i * 2.39996 + t * 1.5;
      const pos = V(
        v.x + Math.cos(q) * r * spread * 0.8,
        v.g + 0.5 + kick * (0.5 + (i % 3) * 0.4),
        v.z + Math.sin(q) * r * spread * 0.8,
      );
      v.sprite('fx-petal', pos, p * 0.85, p * 0.5, i % 3 ? color : hot, fade, q);
      if (i % 2 === 0) v.spark(pos, p * 0.22, fade, hot);
    }
  } else if (type === 'wind') {
    for (let i = 0; i < 3; i++)
      v.sprite(
        'fx-crescent',
        v.point(0, 0, i * p * 0.3),
        r * (1.1 + i * 0.25) * spread,
        r * (0.8 + i * 0.2) * spread,
        i % 2 ? color : hot,
        fade * 0.8,
        v.roll + t * 3 + i * 2.1,
      );
  } else if (type === 'machine') {
    v.sprite(
      'fx-hex',
      v.point(),
      p * (1 + spread * 2.5),
      p * (1 + spread * 2.5),
      color,
      fade * 0.75,
      t * 0.3,
    );
    radialStreaks(v, 11, Math.max(r, p * 1.7) * spread, fade);
    v.sprite(
      'fx-crack',
      V(v.x, v.g + 0.08, v.z),
      r * 1.8,
      r * 1.8,
      ink,
      fade * 0.8,
      0,
      false,
      true,
    );
  } else {
    v.sprite(
      'fx-impact',
      v.point(0.3),
      p * (1.5 + kick * 1.4),
      p * (1.5 + kick * 1.4),
      ink,
      kick * 0.9,
      v.roll,
    );
    v.sprite(
      'fx-impact',
      v.point(0.3, 0, 0.05),
      p * (1.3 + kick * 1.2),
      p * (1.3 + kick * 1.2),
      hot,
      kick * 0.9,
      v.roll,
    );
    radialStreaks(v, 8, Math.max(r, p * 1.3) * spread, fade * 0.75);
  }
}

export function supportDetails(v) {
  if (!available(v)) return;
  const { p, t, fade, color } = v;
  groundLight(v, p * 3.5, fade * 0.2);
  if (v.k.kind === 'shield') {
    v.sprite('fx-shield', v.point(0, 0, 0.4), p * 2.1, p * 2.7, color, fade * 0.9);
    v.sprite('fx-hex', v.point(0, 0, 0.4), p * 2.5, p * 2.5, v.hot, fade * 0.65, t);
  } else if (v.k.kind === 'heal') {
    v.sprite('fx-cross', v.point(0, 0, t * 1.3), p, p, '#ddffe0', fade);
    v.sprite(
      'fx-halo',
      V(v.x, v.g + 0.07, v.z),
      p * 3.2,
      p * 3.2,
      color,
      fade * 0.8,
      0,
      false,
      true,
    );
  } else if (v.k.kind === 'haste') {
    for (let i = 0; i < 4; i++)
      v.sprite(
        'fx-speed',
        v.point(-0.5 - t * 2, (i - 1.5) * 0.35, i * 0.13),
        p * 2.5,
        p * 0.3,
        color,
        fade,
        v.roll,
      );
  } else {
    v.sprite('fx-halo', v.point(0, 0, 0.4 + t), p * 2.2, p * 2.2, color, fade * 0.9, -t * 1.5);
    v.sprite('fx-star', v.point(0, 0, 0.4 + t), p * 1.5, p * 1.5, v.hot, fade * 0.8, t);
  }
}
