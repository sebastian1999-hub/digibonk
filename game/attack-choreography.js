import * as THREE from './vendor/three.module.js';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const floor = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2);
const clamp = (x) => Math.max(0, Math.min(1, x));
const out = (x) => 1 - Math.pow(1 - clamp(x), 3);
const noise = (x) => {
  const n = Math.sin(x * 127.1 + 43.7) * 43758.54;
  return n - Math.floor(n);
};
const palettes = {
  fire: ['#ff5a16', '#ffbb32', '#fff3bf'],
  water: ['#087bc3', '#35d9f2', '#e2ffff'],
  ice: ['#3079bf', '#74d9ff', '#f2ffff'],
  wind: ['#2e8f8c', '#99edcd', '#f2ffef'],
  nature: ['#407837', '#a5dd49', '#f2ffd4'],
  holy: ['#d68a24', '#ffda6e', '#fff8dd'],
  dark: ['#261334', '#a355e8', '#e5baff'],
  machine: ['#84405c', '#ff9a61', '#ffefcc'],
  beast: ['#966444', '#f3c28a', '#fff2d8'],
  neutral: ['#438c99', '#90e4de', '#f0ffff'],
};

// One visual director owns each attack. No generic spiral/explosion layered over it.
// Only render data is read: timing, random seeds, damage and collision stay in the simulation.
class Painter {
  constructor(a, skill, e, state, time, owner, phase) {
    this.a = a;
    this.k = skill;
    this.e = e;
    this.owner = owner;
    this.time = time;
    this.x = e.x;
    this.z = e.z;
    this.g = window.DigibonkCore.heightAt(e.x, e.z, state.mapSeed);
    this.y = this.g + (e.height ?? 1.2);
    this.seed = Math.abs(e.id || 1);
    this.t = phase === 'flight' ? 0 : clamp(1 - e.life / (e.maxLife || 1));
    this.fade = Math.pow(1 - this.t, 1.5);
    this.p = 0.85 + Math.max(0, skill.stage) * 0.14;
    this.r = Math.min(9, e.radius || (e.size || 1) * 1.7);
    [this.ink, this.color, this.hot] = palettes[skill.family] || palettes.neutral;
    if (skill.visual === 'blue-flame')
      [this.ink, this.color, this.hot] = ['#245fda', '#47cfff', '#e1ffff'];
    if (skill.visual === 'flower')
      [this.ink, this.color, this.hot] = ['#90367e', '#f38ccf', '#ffe4f9'];
    let dx = e.dx ?? e.x - (e.prevX ?? e.ox ?? e.x - 1),
      dz = e.dz ?? e.z - (e.prevZ ?? e.oz ?? e.z);
    if (Math.hypot(dx, dz) < 0.001) {
      dx = e.x - (e.ox ?? e.x - 1);
      dz = e.z - (e.oz ?? e.z);
    }
    const len = Math.hypot(dx, dz) || 1;
    this.ux = dx / len;
    this.uz = dz / len;
    const view = V(this.ux, 0, this.uz).applyQuaternion(a.r.camera.quaternion.clone().invert());
    this.roll = Math.atan2(view.y, view.x);
  }
  point(forward = 0, side = 0, up = 0) {
    return V(
      this.x + this.ux * forward - this.uz * side,
      this.y + up,
      this.z + this.uz * forward + this.ux * side,
    );
  }
  sprite(
    texture,
    pos,
    w,
    h,
    color = this.color,
    alpha = 1,
    roll = 0,
    additive = false,
    ground = false,
  ) {
    this.a.emit(
      'art-' + texture + (additive ? '-light' : '') + (ground ? '-ground' : ''),
      'quad',
      texture,
      pos.x,
      pos.y,
      pos.z,
      w,
      h,
      1,
      color,
      alpha,
      ground ? floor : this.a.face(roll),
      this.owner,
      additive,
    );
  }
  ring(r, alpha, height = 0.07, rune = false, color = this.color) {
    this.sprite(
      rune ? 'fx-rune' : 'fx-ripple',
      V(this.x, this.g + height, this.z),
      r * 2.2,
      r * 2.2,
      color,
      alpha,
      0,
      false,
      true,
    );
  }
  line(a, b, width, color = this.color, alpha = 1) {
    this.a.ribbon('art-ribbon', a, b, width, color, alpha, this.owner);
  }
  arc(center, radius, start, sweep, width, alpha, color = this.color, vertical = false) {
    const steps = 12;
    let last;
    for (let i = 0; i <= steps; i++) {
      const q = start + (sweep * i) / steps;
      const p = vertical
        ? V(center.x + Math.cos(q) * radius, center.y + Math.sin(q) * radius, center.z)
        : V(center.x + Math.cos(q) * radius, center.y, center.z + Math.sin(q) * radius);
      if (last)
        this.line(last, p, width * (0.25 + Math.sin((i / steps) * Math.PI) * 0.75), color, alpha);
      last = p;
    }
  }
  solid(name, geo, pos, sx, sy, sz, color, alpha = 1, rotation = null) {
    this.a.emit(
      name,
      geo,
      null,
      pos.x,
      pos.y,
      pos.z,
      sx,
      sy,
      sz,
      color,
      alpha,
      rotation,
      this.owner,
    );
  }
  spark(pos, size, alpha = 1, color = this.hot) {
    this.sprite('fx-star', pos, size, size, color, alpha, this.seed, true);
  }
  flash() {
    const flash = clamp(1 - this.t / 0.17);
    if (!flash) return;
    this.spark(this.point(), this.p * (0.6 + out(this.t / 0.17) * 1.8), flash);
  }
  debris(count = 7, radius = this.r, color = this.color, drops = false) {
    const t = this.t,
      flight = out(t),
      fade = clamp((1 - t) / 0.65);
    for (let i = 0; i < count; i++) {
      const q = i * 2.39996 + this.seed,
        spread = radius * (0.4 + noise(i + this.seed) * 0.6);
      const pos = V(
        this.x + Math.cos(q) * flight * spread,
        this.g + 0.1 + Math.sin(t * Math.PI) * (0.5 + noise(i + 7) * 1.7),
        this.z + Math.sin(q) * flight * spread,
      );
      if (drops) this.sprite('fx-droplet', pos, 0.28 * fade, 0.16 * fade, color, fade, q - t * 2);
      else
        this.solid(
          'art-debris',
          'shard',
          pos,
          0.06 * fade,
          0.14 * fade,
          0.06 * fade,
          color,
          fade,
          this.a.face(q + t * 4),
        );
    }
  }
  bolt(from, to, width = 0.13, alpha = 1) {
    const axis = to.clone().sub(from),
      side = V(-axis.z, 0, axis.x).normalize();
    let last = from;
    const flicker = Math.floor(this.time * 18);
    for (let i = 1; i <= 7; i++) {
      const q = i / 7,
        j = (noise(i + this.seed + flicker) - 0.5) * Math.sin(q * Math.PI) * 0.8;
      const pos = from.clone().addScaledVector(axis, q).addScaledVector(side, j);
      pos.y += j * 0.5;
      this.line(last, pos, width * 3, '#53b9ff', alpha * 0.25);
      this.line(last, pos, width, '#efffff', alpha);
      if (i === 3 || i === 5)
        this.line(
          pos,
          pos
            .clone()
            .addScaledVector(side, (i === 3 ? 1 : -1) * 0.7)
            .addScaledVector(axis, 0.15),
          width * 0.45,
          '#a4e7ff',
          alpha * 0.7,
        );
      last = pos;
    }
  }
  comet(pos, length, width, roll = this.roll, alpha = 1) {
    this.sprite('fx-comet', pos, length, width, this.ink, alpha, roll);
    this.sprite('fx-comet', pos, length * 0.88, width * 0.75, this.color, alpha, roll);
    this.sprite('fx-comet', pos, length * 0.67, width * 0.34, this.hot, alpha, roll);
  }
}

function flight(v) {
  const { a, k, time, p, color, hot, ink } = v,
    type = k.visual;
  const tip = v.point(),
    yaw = Math.atan2(v.ux, v.uz);
  if (['flame', 'blue-flame', 'inferno', 'sun', 'magma-fall'].includes(type)) {
    const big = type === 'sun' ? 1.75 : type === 'inferno' ? 1.3 : 1;
    v.comet(
      v.point(-0.5),
      p * 3 * big,
      p * 1.25 * big * (1 + Math.sin(time * 22 + v.seed) * 0.045),
    );
    for (let i = 0; i < 4; i++) {
      const q = (time * 1.8 + i * 0.25 + noise(v.seed)) % 1;
      v.spark(
        v.point(-0.8 - q * 2.8, Math.sin(i * 2.4) * q * 0.6, Math.cos(i * 3) * q * 0.4),
        0.17 * (1 - q),
        1 - q,
        color,
      );
    }
    if (type === 'sun')
      for (let i = 0; i < 2; i++)
        v.arc(tip, 0.8 * p, time * 3 + i * Math.PI, Math.PI * 1.2, 0.12, 0.75, hot, true);
  } else if (['bubble', 'jet', 'torpedo', 'wave', 'waterfall', 'rainfall'].includes(type)) {
    if (type === 'wave') {
      a.wave(v.x, v.g + 0.08, v.z, p * 1.15, yaw, time, v.owner, 0.8, 0.65 * p);
      return;
    }
    if (type === 'bubble') {
      for (let i = 0; i < 3; i++)
        v.sprite(
          'bubble',
          v.point(-i * 0.5, Math.sin(time * 4 + i) * 0.13, Math.cos(time * 3 + i) * 0.13),
          p * (0.9 - i * 0.17),
          p * (0.9 - i * 0.17),
          '#b4f5ff',
          0.85 - i * 0.15,
        );
    } else if (type === 'torpedo') missile(v, true);
    else {
      v.sprite('fx-droplet', v.point(-0.5), p * 3.2, p * 0.95, ink, 0.85, v.roll);
      v.sprite('fx-droplet', v.point(-0.35), p * 2.6, p * 0.65, color, 1, v.roll);
      v.line(v.point(-2), tip, 0.12 * p, hot, 0.9);
      for (let i = 0; i < 4; i++) {
        const q = (time * 2 + i * 0.25) % 1;
        v.sprite(
          'bubble',
          v.point(-q * 2.5, Math.sin(i * 3) * 0.3, -q * 0.3),
          0.19 * p,
          0.19 * p,
          hot,
          1 - q,
        );
      }
    }
  } else if (['ice', 'frost', 'ice-statue', 'aurora'].includes(type)) {
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(v.ux, 0.1, v.uz).normalize());
    for (let i = 0; i < 5; i++) {
      const s = i === 0 ? 1 : 0.46,
        pos = v.point(-i * 0.3, Math.sin(i * 2.4) * 0.5, Math.cos(i * 2.4) * 0.3);
      v.solid(
        'ice-crystal',
        'shard',
        pos,
        p * 0.21 * s,
        p * 1.1 * s,
        p * 0.24 * s,
        i % 2 ? hot : color,
        0.92,
        q,
      );
      v.line(pos.clone().add(V(-v.ux * 1.5, 0, -v.uz * 1.5)), pos, 0.1 * s, color, 0.5);
    }
    v.spark(tip, 0.38, 0.75);
  } else if (type === 'lightning' || type === 'thunder-cloud') {
    v.bolt(v.point(-2.7 * p), tip);
    v.spark(tip, 0.65 * p);
  } else if (
    ['laser', 'holy-beam', 'saint-ray', 'laser-barrage', 'arrow', 'stars'].includes(type)
  ) {
    const length = type === 'arrow' ? 2 : type === 'stars' ? 1.6 : 3.8;
    v.line(v.point(-length * p), tip, 0.65 * p, color, 0.35);
    v.line(v.point(-length * p), tip, 0.18 * p, hot, 0.95);
    v.spark(tip, type === 'stars' ? p : p * 0.5);
    if (type === 'arrow') {
      for (const side of [-1, 1]) v.line(v.point(-0.6, side * 0.45), tip, 0.16, hot);
    }
  } else if (type === 'missile') missile(v, false);
  else if (['claw', 'dark-claw', 'wind-cutter', 'air'].includes(type)) {
    for (let i = 0; i < (type === 'air' ? 1 : 3); i++) {
      const pos = v.point(-i * 0.22, (i - 1) * 0.3);
      v.sprite('fx-cut', pos, p * 2, p * 2, color, 0.8 - i * 0.15, v.roll - 0.7);
      v.sprite('fx-cut', pos, p * 1.85, p * 1.85, hot, 0.85 - i * 0.18, v.roll - 0.7);
    }
  } else if (['tornado', 'hurricane'].includes(type)) vortex(v, false);
  else if (['phoenix', 'bats'].includes(type)) {
    const bat = type === 'bats';
    for (let i = 0; i < (bat ? 3 : 1); i++) {
      const pos = v.point(-i * 0.4, (i - (bat ? 1 : 0)) * 0.65, Math.sin(time * 8 + i) * 0.15);
      const flap = 0.48 + Math.abs(Math.sin(time * 11 + i)) * 0.52;
      v.solid(
        'art-wing',
        'wing',
        pos,
        p * (bat ? 0.38 : 0.72),
        p * flap * 0.65,
        1,
        bat ? ink : color,
        0.95,
        a.face(v.roll - Math.PI / 2),
      );
      if (!bat) {
        v.comet(v.point(-1), p * 2.7, p * 0.65);
        v.spark(tip, 0.45);
      } else v.sprite('fx-smoke', v.point(-1 - i * 0.5), p, p, color, 0.28);
    }
  } else if (
    ['leaf', 'flower', 'spores', 'poison-cloud', 'root-cage', 'thorn-chain'].includes(type)
  ) {
    for (let i = 0; i < (type === 'leaf' ? 2 : 5); i++) {
      const q = (i * TAU) / 5 + time * 4;
      const pos =
        type === 'leaf' ? v.point(-i * 0.5) : v.point(0, Math.cos(q) * 0.4, Math.sin(q) * 0.4);
      v.solid(
        'art-petal',
        'leaf',
        pos,
        p * 0.42,
        p * 0.65,
        1,
        i % 2 ? hot : color,
        0.95,
        a.face(q),
      );
    }
    v.spark(tip, 0.3, 0.7);
  } else if (['holy-fist', 'beast-fist', 'sonic-fist', 'metal-impact'].includes(type)) {
    v.solid('fists', 'fist', tip, p * 0.8, p * 0.8, p * 0.8, hot, 1, a.face(v.roll));
    for (let i = -1; i <= 1; i++)
      v.line(v.point(-2, i * 0.3), v.point(-0.3, i * 0.3), 0.1, color, 0.6);
  } else if (['dark-orb', 'soul-chaser', 'soul-rain', 'black-hole'].includes(type)) {
    v.sprite('fx-comet', v.point(-0.6), p * 2.8, p * 1.2, color, 0.75, v.roll);
    v.sprite('fx-void', tip, p * 0.95, p * 0.95, ink, 1);
    v.sprite('fx-ripple', tip, p * 1.15, p * 1.15, color, 0.9, time * 2);
    v.spark(v.point(0.06, 0, 0.05), 0.22, 0.8);
  } else {
    v.comet(v.point(-0.5), p * 2.6, p * 0.8);
  }
}

function missile(v, water) {
  const { p, a } = v,
    q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(v.ux, 0, v.uz));
  v.solid('missile-body', 'beam', v.point(), 0.18 * p, 1.1 * p, 0.18 * p, '#98abbc', 1, q);
  v.solid(
    'missile-nose',
    'cone',
    v.point(0.7 * p),
    0.2 * p,
    0.45 * p,
    0.2 * p,
    water ? '#bdeeff' : '#e97543',
    1,
    q,
  );
  for (let i = -1; i <= 1; i += 2)
    v.solid(
      'missile-fin',
      'shard',
      v.point(-0.4 * p, i * 0.18 * p),
      0.3 * p,
      0.12 * p,
      0.3 * p,
      '#d7e2ed',
      1,
      q,
    );
  if (water) v.sprite('fx-droplet', v.point(-1.15 * p), 2 * p, 0.45 * p, v.color, 0.8, v.roll);
  else v.comet(v.point(-1.15 * p), 1.8 * p, 0.55 * p);
  for (let i = 0; i < 3; i++)
    v.sprite(
      'fx-smoke',
      v.point(-1.6 - i * 0.5, 0, i * 0.04),
      0.4 + i * 0.2,
      0.4 + i * 0.2,
      water ? '#aeeff5' : '#8d8a91',
      0.25 - i * 0.05,
    );
}

function vortex(v, impact) {
  const size = impact ? v.r * (0.4 + out(v.t) * 0.6) : v.p;
  const fade = impact ? v.fade : 0.85;
  for (let i = 0; i < 4; i++) {
    const h = i * size * 0.55,
      r = size * (0.25 + i * 0.22);
    v.arc(
      V(v.x, v.g + 0.3 + h, v.z),
      r,
      v.time * 7 + i * 1.7,
      TAU * 0.8,
      0.15 * size,
      fade,
      i % 2 ? v.hot : v.color,
    );
  }
  if (impact) v.ring(size, fade * 0.55);
}

export function drawAttack(a, skill, e, state, time, owner, phase) {
  if (!skill || (!a.warming && (a.r.visibility?.[owner] ?? 1) <= 0) || a.count >= a.budget)
    return true;
  if (phase !== 'flight' && (!(e.life > 0) || !(e.maxLife > 0))) return true;
  const v = new Painter(a, skill, e, state, time, owner, phase);
  if (phase === 'flight') flight(v);
  else if (phase === 'cast') cast(v);
  else if (skill.kind !== 'damage') support(v);
  else impact(v);
  return true;
}

function cast(v) {
  const t = v.t,
    f = Math.sin(t * Math.PI),
    r = v.p * (0.9 - t * 0.6);
  // The gameplay launches immediately; this is a short muzzle release, not a fake wind-up.
  if (['holy', 'dark'].includes(v.k.family)) v.ring(r, f * 0.6, 0.09, true);
  v.spark(v.point(0.3), v.p * (0.3 + out(t) * 0.55), (1 - t) * 0.8);
  for (let i = 0; i < 3; i++)
    v.line(
      v.point(-t * 0.8, (i - 1) * r, 0),
      v.point(0.25, (i - 1) * r * 0.3, 0),
      0.06,
      v.color,
      (1 - t) * 0.5,
    );
}

function support(v) {
  const { k, t, p } = v,
    rise = out(t);
  const color =
    k.kind === 'heal'
      ? '#9bf3ad'
      : k.kind === 'shield'
        ? '#78deed'
        : k.kind === 'buff'
          ? '#ffcb72'
          : '#b1cfff';
  v.color = color;
  v.ring((0.65 + rise) * p, v.fade * 0.7, 0.08, true, color);
  for (let i = 0; i < 5; i++) {
    const q = (i * TAU) / 5 + t,
      pos = V(
        v.x + Math.cos(q) * p,
        v.g + 0.5 + rise * (1.5 + (i % 2) * 0.5),
        v.z + Math.sin(q) * p,
      );
    if (k.kind === 'heal') {
      v.line(pos.clone().add(V(-0.12, 0, 0)), pos.clone().add(V(0.12, 0, 0)), 0.1, color, v.fade);
      v.line(pos.clone().add(V(0, -0.15, 0)), pos.clone().add(V(0, 0.15, 0)), 0.1, color, v.fade);
    } else v.spark(pos, 0.23, v.fade, color);
  }
  if (k.kind === 'shield')
    v.sprite('bubble', v.point(0, 0, 0.35), p * 2.7, p * 3.3, color, v.fade * 0.6);
  if (k.kind === 'haste')
    for (let i = 0; i < 3; i++)
      v.sprite(
        'fx-cut',
        v.point(-0.4 - i * 0.3, 0, t),
        p * 1.5,
        p * 1.5,
        color,
        v.fade * (1 - i * 0.2),
        v.roll,
      );
}

function impact(v) {
  // Area spells deal damage 0.4 s after casting. Their visible strike uses that same clock.
  if (['pillar', 'meteor', 'rain'].includes(v.k.pattern)) {
    const elapsed = v.t * v.e.maxLife;
    if (elapsed < 0.4) {
      const charge = elapsed / 0.4;
      v.ring(v.r, 0.13 + charge * 0.18, 0.06, true);
      v.ring(v.r * (1 - charge * 0.8), 0.35 + charge * 0.3, 0.08);
      if (v.k.pattern === 'meteor')
        v.comet(
          V(v.x - 1 + charge, v.g + 8 * (1 - charge) + 1, v.z),
          v.p * 3,
          v.p * 1.5,
          -Math.PI / 2 - 0.18,
        );
      else if (v.k.visual === 'thunder-cloud')
        v.sprite('fx-smoke', V(v.x, v.g + 4.5, v.z), v.r * 1.7, v.r * 0.8, '#344c73', 0.5 * charge);
      else
        for (let i = 0; i < 4; i++) {
          const q = (i * TAU) / 4;
          v.spark(
            V(
              v.x + Math.cos(q) * v.r * (1 - charge),
              v.g + 0.2 + charge,
              v.z + Math.sin(q) * v.r * (1 - charge),
            ),
            0.2 + charge * 0.2,
            charge,
          );
        }
      return;
    }
    v.t = clamp((elapsed - 0.4) / (v.e.maxLife - 0.4));
    v.fade = Math.pow(1 - v.t, 1.5);
  }
  if (v.k.pattern === 'cone') {
    cone(v);
    return;
  }
  if (v.k.visual === 'thorn-chain') {
    roots(v, true);
    return;
  }
  if (
    [
      'black-hole',
      'digital-grid',
      'earthquake',
      'root-cage',
      'judgement',
      'metal-impact',
      'thunder-cloud',
      'rainfall',
      'soul-rain',
      'poison-cloud',
      'fire-pillar',
      'waterfall',
      'ice-statue',
      'aurora',
    ].includes(v.k.visual)
  ) {
    field(v);
    return;
  }
  impactElement(v);
}

function impactElement(v) {
  const { t, p, a, color, hot, ink, fade } = v,
    type = v.k.visual,
    r = v.r * out(t),
    bloom = Math.sin(Math.PI * Math.min(1, t / 0.8));
  v.flash();
  if (v.k.id === 'royal-saber') {
    const sweep = out(t / 0.65),
      alpha = Math.sin(Math.PI * Math.min(1, t / 0.9));
    for (const side of [-1, 1]) {
      v.sprite(
        'fx-cut',
        v.point(side * 0.2),
        p * 4,
        p * 4,
        color,
        alpha * 0.9,
        side * (0.3 + sweep * 1.5),
      );
      v.sprite(
        'fx-cut',
        v.point(side * 0.2),
        p * 3.8,
        p * 3.8,
        hot,
        alpha * 0.9,
        side * (0.3 + sweep * 1.5),
      );
    }
    v.debris(7, v.r, color);
    return;
  }
  if (v.k.id === 'seven-heavens') {
    v.ring(r, fade * 0.7, 0.1, true);
    for (let i = 0; i < 7; i++) {
      const q = (i * TAU) / 7,
        rr = r * 0.65,
        pos = V(v.x + Math.cos(q) * rr, v.g + 0.3, v.z + Math.sin(q) * rr);
      const top = pos.clone().add(V(0, (1 - t) * 3 + 0.6, 0));
      v.line(pos, top, 0.22 * p, color, fade * 0.6);
      v.spark(top, 0.55 * p, fade, hot);
    }
    return;
  }
  if (v.k.id === 'heaven-light') {
    v.ring(r, fade * 0.65, 0.08, true);
    v.line(V(v.x, v.g + 0.1, v.z), V(v.x, v.g + 4.5, v.z), 0.55 * p, color, fade * 0.55);
    v.line(V(v.x, v.g + 0.1, v.z), V(v.x, v.g + 4.5, v.z), 0.14 * p, hot, fade);
    v.debris(6, v.r, color);
    return;
  }
  if (type === 'bats') {
    for (let i = 0; i < 5; i++) {
      const q = (i * TAU) / 5 + t * 1.2,
        rr = r * 0.8,
        pos = V(v.x + Math.cos(q) * rr, v.y + Math.sin(q) * 0.7, v.z + Math.sin(q) * rr);
      v.solid(
        'art-bat',
        'bat',
        pos,
        0.3 * p,
        (0.3 + Math.abs(Math.sin(v.time * 14 + i)) * 0.3) * p,
        1,
        ink,
        fade,
        a.face(q),
      );
      v.sprite('fx-comet', pos, 0.8 * p, 0.3 * p, color, fade * 0.6, q);
    }
    return;
  }
  if (
    ['flame', 'blue-flame', 'inferno', 'sun', 'phoenix', 'missile', 'magma-fall'].includes(type)
  ) {
    const cold = type === 'blue-flame';
    v.ring(r, fade * 0.65, 0.08, false, color);
    const burst = clamp(1 - t / 0.56),
      diameter = (0.4 + out(t / 0.35) * 2.2) * p;
    if (burst > 0) {
      v.sprite('fx-blast', v.point(), diameter, diameter * 0.85, ink, burst * 0.9, v.seed + t);
      v.sprite(
        'fx-blast',
        v.point(0, 0, 0.06),
        diameter * 0.86,
        diameter * 0.75,
        color,
        burst,
        -v.seed - t,
      );
      v.sprite(
        'fx-blast',
        v.point(0, 0, 0.08),
        diameter * 0.48,
        diameter * 0.42,
        hot,
        burst,
        v.seed,
      );
    }
    // A dark body keeps the orange edge readable on the bright island floor.
    for (let i = 0; i < 5; i++) {
      const q = i * 2.39996 + v.seed,
        spread = r * (i ? 0.42 : 0),
        rise = 0.35 + t * (0.6 + (i % 3) * 0.35);
      const pos = V(v.x + Math.cos(q) * spread, v.g + rise, v.z + Math.sin(q) * spread);
      const size = (0.5 + bloom * 0.8) * p * (1 + (type === 'sun' ? 0.5 : 0));
      v.sprite('fx-smoke', pos, size * 1.8, size * 1.5, cold ? '#194963' : '#613328', fade * 0.7);
      if (t < 0.7) {
        a.flame(
          pos.x,
          pos.y - 0.4,
          pos.z,
          size,
          v.time,
          v.seed + i,
          cold,
          v.owner,
          clamp(1 - t / 0.7),
        );
      }
    }
    v.debris(9, v.r * 1.2, color);
    if (type === 'sun' || type === 'magma-fall')
      v.sprite(
        'fx-crack',
        V(v.x, v.g + 0.09, v.z),
        v.r * 2,
        v.r * 2,
        ink,
        fade * 0.5,
        0,
        false,
        true,
      );
  } else if (['bubble', 'jet', 'wave', 'torpedo'].includes(type)) {
    if (type === 'wave' && t < 0.75) {
      for (let i = 0; i < 3; i++) {
        const q = (i * TAU) / 3 + v.seed;
        a.wave(
          v.x + Math.sin(q) * r * 0.45,
          v.g + 0.05,
          v.z + Math.cos(q) * r * 0.45,
          p * 0.7,
          q,
          v.time,
          v.owner,
          clamp(1 - t / 0.75),
          (0.2 + bloom * 0.3) * p,
        );
      }
    }
    for (let i = 0; i < 2; i++) {
      const q = clamp((t - i * 0.12) / (1 - i * 0.12));
      v.ring(v.r * out(q), clamp(1 - q) * 0.55, 0.07 + i * 0.03, false, i ? hot : color);
    }
    const n = type === 'bubble' ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const q = (i * TAU) / n + v.seed,
        rr = r * 0.65,
        pos = V(
          v.x + Math.cos(q) * rr,
          v.g + 0.15 + Math.sin(t * Math.PI) * (0.5 + (i % 3) * 0.3),
          v.z + Math.sin(q) * rr,
        );
      v.sprite(
        'fx-droplet',
        pos,
        (0.55 + 0.35 * p) * fade,
        0.35 * fade,
        i % 2 ? color : hot,
        fade,
        q - t * 2,
      );
    }
    v.debris(6, v.r, hot, true);
  } else if (['ice', 'frost'].includes(type)) iceBloom(v);
  else if (type === 'lightning') {
    if (Number.isFinite(v.e.fromX)) v.bolt(V(v.e.fromX, v.y, v.e.fromZ), v.point(), 0.12, fade);
    for (let i = 0; i < 4; i++) {
      const q = (i * TAU) / 4 + v.seed;
      v.bolt(
        v.point(),
        V(v.x + Math.cos(q) * r, v.g + 0.4 + (i % 2), v.z + Math.sin(q) * r),
        0.08,
        fade,
      );
    }
    v.debris(5, v.r, '#d7faff');
  } else if (['claw', 'dark-claw', 'air', 'wind-cutter'].includes(type)) {
    const sweep = out(Math.min(1, t / 0.6));
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.06,
        local = clamp((t - delay) / (1 - delay)),
        alpha = Math.sin(Math.PI * Math.min(1, local / 0.75));
      const pos = v.point(0.3 + sweep * 0.6, (i - 1) * 0.28);
      v.sprite('fx-cut', pos, p * 3.3, p * 3.3, color, alpha * 0.85, v.roll - 1.5 + sweep * 1.2);
      v.sprite('fx-cut', pos, p * 3.1, p * 3.1, hot, alpha * 0.9, v.roll - 1.5 + sweep * 1.2);
    }
    v.debris(4, v.r * 0.7, color);
  } else if (['tornado', 'hurricane'].includes(type)) {
    vortex(v, true);
    v.debris(5, v.r, hot);
  } else if (['leaf', 'flower', 'spores'].includes(type)) {
    v.ring(r, fade * 0.3);
    for (let i = 0; i < 9; i++) {
      const q = i * 2.39996,
        rr = r * (0.4 + noise(i + v.seed) * 0.5),
        pos = V(
          v.x + Math.cos(q) * rr,
          v.g + 0.4 + Math.sin(t * Math.PI) * (0.4 + (i % 3) * 0.4),
          v.z + Math.sin(q) * rr,
        );
      v.solid(
        'art-petal',
        'leaf',
        pos,
        0.3 * p * fade,
        0.45 * p * fade,
        1,
        i % 3 ? color : hot,
        fade,
        a.face(q + t * 3),
      );
    }
    if (type === 'spores')
      v.sprite('fx-smoke', v.point(0, 0, -0.4), r * 2, r * 1.2, color, fade * 0.3);
  } else if (['dark-orb', 'bats', 'soul-chaser'].includes(type)) {
    const radius = p * (0.2 + Math.sin(t * Math.PI) * 0.8);
    v.sprite('fx-void', v.point(), radius * 2, radius * 2, ink, fade);
    v.sprite('fx-ripple', v.point(), radius * 2.3, radius * 2.3, color, fade, -t * 4);
    for (let i = 0; i < 3; i++)
      v.arc(v.point(), r * 0.65, v.time * -4 + i * 2.1, Math.PI * 0.8, 0.1, fade, color, true);
    v.debris(5, v.r, color);
  } else if (['holy-fist', 'beast-fist'].includes(type)) {
    v.ring(r, fade * 0.65);
    v.sprite('fx-cut', v.point(), p * 3, p * 3, hot, fade, v.roll + t * 2);
    v.debris(8, v.r, ink);
  } else {
    // Lances and lasers end in a precise directional fracture, not a round fireball.
    for (let i = 0; i < 5; i++) {
      const q = (i * TAU) / 5 + v.seed,
        length = (0.2 + out(t) * v.r) * p;
      const end = V(
        v.x + Math.cos(q) * length,
        v.y + Math.sin(q) * length * 0.65,
        v.z + Math.sin(q) * length * 0.4,
      );
      v.line(v.point(), end, 0.12 * fade, i % 2 ? color : hot, fade);
    }
    v.sprite('fx-ripple', v.point(), r * 1.2, r * 1.2, color, fade * 0.6, t * 2);
  }
}

function iceBloom(v) {
  const rise = out(v.t / 0.3),
    fade = clamp((1 - v.t) / 0.45);
  v.ring(v.r * out(v.t), v.fade * 0.5);
  for (let i = 0; i < 7; i++) {
    const q = i * 2.39996 + v.seed,
      rr = (i ? 0.6 : 0) * v.r * rise;
    const height = (i ? 0.75 + noise(i + v.seed) * 1.2 : 2) * v.p * rise;
    const pos = V(v.x + Math.cos(q) * rr, v.g + height * 0.5, v.z + Math.sin(q) * rr);
    const tilt = new THREE.Quaternion().setFromUnitVectors(
      V(0, 1, 0),
      V(Math.cos(q) * 0.35, 1, Math.sin(q) * 0.35).normalize(),
    );
    v.solid(
      'ice-crystal',
      'shard',
      pos,
      0.24 * v.p * fade,
      height * 0.65,
      0.25 * v.p * fade,
      i % 2 ? v.hot : v.color,
      fade,
      tilt,
    );
    if (i < 3) v.spark(pos.clone().add(V(0, height * 0.35, 0)), 0.35 * v.fade, v.fade);
  }
  v.debris(6, v.r * 1.2, v.hot);
}

function cone(v) {
  const { t, r, fade, k } = v,
    length = r * out(t / 0.4),
    fist = k.visual === 'sonic-fist';
  if (fist) {
    v.solid('fists', 'fist', v.point(length * 0.65), v.p, v.p, v.p, v.hot, fade, v.a.face(v.roll));
    for (let i = 0; i < 3; i++)
      v.sprite(
        'fx-ripple',
        v.point(length * (0.3 + i * 0.25)),
        1 + i * 0.4,
        1 + i * 0.4,
        v.color,
        fade * 0.6,
        v.roll,
      );
  } else {
    for (let i = 0; i < 7; i++) {
      const q = i / 6,
        spread = (q - 0.5) * length * 0.8,
        pos = v.point(length * (0.4 + noise(i) * 0.4), spread, 0.15 * Math.sin(i));
      if (k.visual === 'holy-breath') {
        v.line(v.point(0.2), pos, 0.3 + q * 0.2, v.color, fade * 0.7);
        v.spark(pos, 0.45, fade);
      } else v.comet(pos, 1 + length * 0.35, 0.4 + length * 0.13, v.roll + (q - 0.5) * 0.5, fade);
    }
  }
}

function roots(v, chain = false) {
  const rise = out(v.t / 0.35),
    fade = clamp((1 - v.t) / 0.5);
  if (chain && Number.isFinite(v.e.fromX)) {
    let last = V(v.e.fromX, v.y, v.e.fromZ),
      target = v.point(),
      axis = target.clone().sub(last),
      origin = last.clone();
    for (let i = 1; i <= 10; i++) {
      const q = i / 10,
        point = origin.clone().addScaledVector(axis, q);
      point.y += Math.sin(q * Math.PI) * Math.sin(v.t * 8) * 0.8;
      v.line(last, point, 0.22, '#517438', fade);
      if (i % 2 === 0)
        v.solid('art-thorn', 'cone', point, 0.15, 0.4, 0.15, '#d3ef93', fade, v.a.face(i));
      last = point;
    }
  } else
    for (let i = 0; i < 6; i++) {
      const q = (i * TAU) / 6,
        base = V(v.x + Math.cos(q) * v.r * 0.7, v.g + 0.05, v.z + Math.sin(q) * v.r * 0.7),
        mid = V(v.x + Math.cos(q) * v.r * 0.5, v.g + rise * 2, v.z + Math.sin(q) * v.r * 0.5),
        tip = V(v.x + Math.cos(q) * v.r * 0.15, v.g + rise * 2.7, v.z + Math.sin(q) * v.r * 0.15);
      v.a.beam('art-root', base, mid, 0.12, '#5e6b38', fade, v.owner);
      v.a.beam('art-root', mid, tip, 0.065, v.color, fade, v.owner);
      v.solid('art-petal', 'leaf', mid, 0.3, 0.5, 1, v.color, fade, v.a.face(q));
    }
  v.debris(4, v.r, v.color);
}

function field(v) {
  const { t, r, p, fade, color, hot, ink } = v,
    type = v.k.visual;
  if (type === 'black-hole') {
    const size = r * Math.sin(Math.PI * Math.min(1, t / 0.98));
    v.sprite('fx-void', v.point(0, 0, -0.25), size * 1.5, size * 1.5, '#100e20', fade);
    v.sprite('fx-ripple', v.point(0, 0, -0.25), size * 1.65, size * 1.65, color, fade, v.time * -2);
    for (let i = 0; i < 3; i++)
      v.arc(
        V(v.x, v.g + 0.2 + i * 0.1, v.z),
        size * (0.7 + i * 0.1),
        v.time * -6 + i * 2,
        Math.PI * 1.2,
        0.12,
        fade,
        color,
      );
    for (let i = 0; i < 6; i++) {
      const q = i * 2.4 + v.time,
        rr = r * (1 - t);
      v.spark(V(v.x + Math.cos(q) * rr, v.g + 0.7, v.z + Math.sin(q) * rr), 0.2, fade);
    }
  } else if (type === 'root-cage') roots(v);
  else if (type === 'ice-statue' || type === 'aurora') {
    iceBloom(v);
    if (type === 'aurora')
      for (let i = 0; i < 3; i++)
        v.arc(
          V(v.x, v.g + 0.5 + i * 0.5, v.z),
          r * out(t),
          v.time + i,
          Math.PI * 1.5,
          0.2,
          fade * 0.5,
          i % 2 ? '#8affde' : '#7c9fff',
        );
  } else if (type === 'fire-pillar') {
    v.flash();
    v.ring(r * out(t), fade * 0.6);
    for (let i = 0; i < 5; i++) {
      const q = (i * TAU) / 5,
        rr = r * 0.38;
      v.a.flame(
        v.x + Math.cos(q) * rr,
        v.g,
        v.z + Math.sin(q) * rr,
        p * (1.5 + Math.sin(t * Math.PI) * 1.4),
        v.time,
        v.seed + i,
        false,
        v.owner,
        fade,
      );
    }
    v.debris(9, r, color);
  } else if (type === 'waterfall' || type === 'judgement' || type === 'thunder-cloud') {
    v.flash();
    v.ring(r * out(t), fade * 0.65, 0.08, type === 'judgement');
    if (type === 'thunder-cloud') {
      v.sprite('fx-smoke', V(v.x, v.g + 4.5, v.z), r * 1.6, r * 0.8, '#465676', fade * 0.6);
      v.bolt(V(v.x, v.g + 4.5, v.z), V(v.x, v.g + 0.2, v.z), 0.2, fade);
    } else {
      for (let i = -1; i <= 1; i++) {
        const pos = V(v.x + i * r * 0.3, v.g + 0.1, v.z);
        const top = pos.clone().add(V(0, 5.5, 0));
        v.line(
          pos,
          top,
          (type === 'judgement' ? 0.6 : 1.1) * p * fade,
          i ? color : hot,
          fade * (i ? 0.5 : 0.85),
        );
      }
      if (type === 'judgement')
        v.sprite('fx-rune', V(v.x, v.g + 4.4, v.z), r * 1.2, r * 1.2, color, fade, 0, false, true);
      else v.debris(12, r, hot, true);
    }
  } else if (['rainfall', 'soul-rain', 'poison-cloud'].includes(type)) {
    v.ring(r, fade * 0.3);
    for (let i = 0; i < 12; i++) {
      const q = i * 2.39996,
        rr = Math.sqrt(noise(i + v.seed)) * r,
        fall = clamp(t * 1.6 - noise(i) * 0.6);
      const pos = V(v.x + Math.cos(q) * rr, v.g + 0.2 + (1 - fall) * 4, v.z + Math.sin(q) * rr);
      if (type === 'poison-cloud') {
        v.sprite('fx-smoke', V(pos.x, v.g + 0.4 + t, pos.z), p * 1.7, p * 1.1, color, fade * 0.17);
        if (i % 3 === 0)
          v.sprite('bubble', V(pos.x, v.g + 0.3 + t * 1.4, pos.z), 0.3, 0.3, hot, fade * 0.7);
      } else
        v.sprite(
          type === 'rainfall' ? 'fx-droplet' : 'fx-comet',
          pos,
          1.1,
          0.25,
          color,
          fade,
          -Math.PI / 2,
        );
    }
    if (type === 'rainfall') v.debris(7, r, hot, true);
  } else if (type === 'digital-grid') {
    v.flash();
    const reach = r * out(t),
      alpha = fade * 0.65;
    for (let i = -2; i <= 2; i++) {
      const q = (i * reach) / 3,
        extent = Math.sqrt(Math.max(0, reach * reach - q * q));
      v.line(
        V(v.x - extent, v.g + 0.12, v.z + q),
        V(v.x + extent, v.g + 0.12, v.z + q),
        0.09,
        '#80f2ee',
        alpha,
      );
      v.line(
        V(v.x + q, v.g + 0.12, v.z - extent),
        V(v.x + q, v.g + 0.12, v.z + extent),
        0.09,
        '#80f2ee',
        alpha,
      );
    }
    for (let i = 0; i < 8; i++) {
      const q = (i * TAU) / 8;
      v.solid(
        'art-pixel',
        'shard',
        V(v.x + Math.cos(q) * reach, v.g + t * 2, v.z + Math.sin(q) * reach),
        0.15 * fade,
        0.15 * fade,
        0.15 * fade,
        hot,
        fade,
        v.a.face(t),
      );
    }
  } else if (type === 'earthquake' || type === 'metal-impact') {
    v.flash();
    v.ring(r * out(t), fade * 0.65, 0.09, false, '#dcbb8d');
    v.sprite('fx-crack', V(v.x, v.g + 0.08, v.z), r * 2, r * 2, '#4a3934', fade, 0, false, true);
    for (let i = 0; i < 8; i++) {
      const q = (i * TAU) / 8,
        rr = r * out(t) * 0.6,
        rise = Math.sin(t * Math.PI) * 0.6;
      v.solid(
        'art-rock',
        'shard',
        V(v.x + Math.cos(q) * rr, v.g + rise, v.z + Math.sin(q) * rr),
        0.25 * p,
        0.5 * p * fade,
        0.3 * p,
        '#8b7966',
        fade,
        v.a.face(q + t),
      );
    }
    if (type === 'metal-impact') {
      v.solid(
        'fists',
        'fist',
        V(v.x, v.g + 0.8 + (1 - out(t / 0.15)) * 2, v.z),
        p * 1.3,
        p,
        p,
        '#cbd9e4',
        fade,
        v.a.face(-Math.PI / 2),
      );
    }
    v.debris(6, r, hot);
  }
}
