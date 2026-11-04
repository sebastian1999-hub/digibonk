import * as THREE from './vendor/three.module.js';
const TAU = Math.PI * 2,
  V = (x, y, z) => new THREE.Vector3(x, y, z);
const palettes = {
  fire: ['#ff702b', '#ffe9a6'],
  water: ['#28bce8', '#d4ffff'],
  ice: ['#65a9ff', '#efffff'],
  wind: ['#58d6b7', '#f0ffda'],
  nature: ['#78cb57', '#f4ffba'],
  holy: ['#ffca58', '#fffbea'],
  dark: ['#8137d6', '#ebafff'],
  machine: ['#ee7b5b', '#fff2ca'],
  beast: ['#eea460', '#fff4d4'],
  neutral: ['#81d8cf', '#eeffff'],
};
export function cinematicAttack(a, k, e, s, time, owner, phase) {
  if (!k || a.count > a.budget * 0.72 || (a.r.visibility?.[owner] ?? 1) <= 0) return;
  const family = k.family,
    [color, hot] = palettes[family] || palettes.neutral,
    x = e.x,
    z = e.z,
    g = window.DigibonkCore.heightAt(x, z, s.mapSeed),
    y = g + (e.height || 1.1),
    seed = (e.id || 0) * 0.73;
  const power = 1 + Math.max(0, k.stage) * 0.18,
    flight = phase === 'flight',
    life = flight ? 1 : Math.max(0, Math.min(1, e.life / (e.maxLife || 1))),
    t = 1 - life,
    fade = life * life;
  const curve = (name, points, width, c, alpha) => {
    for (let j = 1; j < points.length; j++)
      a.ribbon(name, points[j - 1], points[j], width, c, alpha, owner);
  };
  if (phase === 'cast') {
    const r = (0.25 + life * 1.2) * power;
    for (let i = 0; i < 5; i++) {
      const angle = (i * TAU) / 5 + time * 2,
        points = [];
      for (let j = 0; j < 4; j++) {
        const p = j / 3,
          rr = r * (1 - p * 0.45),
          q = angle + p * 0.7;
        points.push(V(x + Math.cos(q) * rr, y + p * 0.5, z + Math.sin(q) * rr));
      }
      curve('charge-filament', points, 0.035 * life, color, fade * 0.65);
    }
    a.glow(x, y, z, 0.4 + Math.sin(t * Math.PI) * power, hot, fade * 0.45, owner);
    return;
  }
  if (flight) {
    const dx = e.dx ?? x - (e.prevX ?? e.ox ?? x - 1),
      dz = e.dz ?? z - (e.prevZ ?? e.oz ?? z),
      n = Math.hypot(dx, dz) || 1,
      ux = dx / n,
      uz = dz / n;
    // Two tapered, animated ribbons wrap the travel axis; identity follows the element.
    for (let side = 0; side < 2; side++) {
      const points = [];
      for (let j = 0; j < 7; j++) {
        const q = j / 6,
          back = q * 2.4 * power,
          angle = time * (family === 'dark' ? -6 : 8) + seed + q * 5 + side * Math.PI,
          r = Math.sin(q * Math.PI) * 0.25 * power;
        points.push(
          V(
            x - ux * back + uz * Math.cos(angle) * r,
            y + Math.sin(angle) * r,
            z - uz * back - ux * Math.cos(angle) * r,
          ),
        );
      }
      for (let j = 1; j < points.length; j++)
        a.ribbon(
          'element-wake',
          points[j - 1],
          points[j],
          0.11 * (1 - j / 8) * power,
          side ? hot : color,
          0.55 * (1 - j / 8),
          owner,
        );
    }
    return;
  }
  const ease = 1 - Math.pow(life, 3),
    radius = Math.min(4, e.radius || e.size || 1.5) * power;
  // Brief core flash, followed by an expanding silhouette and a longer dissipating tail.
  if (t < 0.16) {
    const f = 1 - t / 0.16;
    a.glow(x, y, z, (0.8 + t * 8) * power, hot, f * 0.7, owner);
    a.emit(
      'contact-cross',
      'slash',
      null,
      x,
      y,
      z,
      power * 1.5,
      power * 0.55,
      1,
      hot,
      f,
      a.face(seed),
      owner,
    );
  }
  if (family === 'fire') {
    for (let i = 0; i < 7; i++) {
      const angle = (i * TAU) / 7 + seed,
        r = radius * ease * 0.65,
        xx = x + Math.cos(angle) * r,
        zz = z + Math.sin(angle) * r;
      a.flame(
        xx,
        g + 0.1 + Math.sin(t * Math.PI) * 0.6,
        zz,
        (0.3 + Math.sin(t * Math.PI) * 0.9) * power,
        time,
        seed + i,
        k.visual === 'blue-flame',
        owner,
        fade * 0.8,
      );
      const points = [];
      for (let j = 0; j < 4; j++) {
        const q = Math.max(0, t - j * 0.035),
          rr = q * radius * 1.4;
        points.push(
          V(x + Math.cos(angle) * rr, g + 0.2 + q * 4 - q * q * 4, z + Math.sin(angle) * rr),
        );
      }
      curve('ember-arcs', points, 0.05, hot, life * 0.75);
    }
  } else if (family === 'water' || family === 'wind') {
    for (let band = 0; band < 3; band++) {
      const points = [],
        r = (0.2 + ease * (0.7 + band * 0.23)) * radius;
      for (let i = 0; i <= 16; i++) {
        const angle = (i / 16) * TAU + time * (family === 'wind' ? 2 : 0.3) + band;
        points.push(
          V(
            x + Math.cos(angle) * r,
            g + 0.15 + band * 0.2 + Math.sin(angle * 3 + time * 4) * 0.12 * life,
            z + Math.sin(angle) * r,
          ),
        );
      }
      curve(
        'fluid-crown',
        points,
        (family === 'water' ? 0.12 : 0.045) * life,
        band === 1 ? hot : color,
        fade * 0.65,
      );
    }
  } else if (family === 'ice') {
    for (let i = 0; i < 8; i++) {
      const angle = (i * TAU) / 8 + seed,
        r = (0.15 + ease * 0.8) * radius,
        h = Math.sin(Math.min(1, t * 2) * Math.PI) * 1.2 * power + 0.1;
      a.emit(
        'crystal-bloom',
        'shard',
        null,
        x + Math.cos(angle) * r,
        g + h * 0.5,
        z + Math.sin(angle) * r,
        0.13 * life,
        h,
        0.13 * life,
        i % 2 ? hot : color,
        life,
        a.yaw(angle),
        owner,
      );
    }
  } else if (family === 'dark' || family === 'holy') {
    for (let arm = 0; arm < 5; arm++) {
      const points = [];
      for (let j = 0; j <= 8; j++) {
        const q = j / 8,
          angle = (arm * TAU) / 5 + q * 2.2 + time * (family === 'dark' ? -1 : 1),
          r = (family === 'dark' ? (1 - ease) * q + 0.12 : q * ease) * radius;
        points.push(
          V(
            x + Math.cos(angle) * r,
            y + Math.sin(q * Math.PI) * life * 0.7,
            z + Math.sin(angle) * r,
          ),
        );
      }
      curve('astral-petals', points, 0.07 * life, arm % 2 ? hot : color, fade * 0.8);
    }
  } else if (family === 'nature') {
    for (let i = 0; i < 10; i++) {
      const angle = i * 2.399 + seed + t * 1.5,
        r = radius * ease;
      a.emit(
        'bloom-petals',
        'leaf',
        null,
        x + Math.cos(angle) * r,
        y + Math.sin(t * Math.PI) * 1.3 - i * 0.025,
        z + Math.sin(angle) * r,
        0.16 * life,
        0.45 * life,
        1,
        i % 3 ? color : '#ffb5df',
        life,
        a.face(angle + t * 4),
        owner,
      );
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const angle = seed + (i * TAU) / 6,
        r = radius * ease;
      const start = V(x + Math.cos(angle) * r * 0.4, y, z + Math.sin(angle) * r * 0.4),
        end = V(x + Math.cos(angle) * r, y + Math.sin(t * Math.PI) * 0.4, z + Math.sin(angle) * r);
      a.ribbon('kinetic-streak', start, end, 0.09 * life, i % 2 ? hot : color, fade, owner);
    }
  }
}
