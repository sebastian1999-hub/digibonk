import * as THREE from './vendor/three.module.js';

const TAU = Math.PI * 2;
const snow = '#e3efff',
  ice = '#91bbd4',
  bark = '#62483f',
  brass = '#c38b43',
  iron = '#364556';
const box = new THREE.BoxGeometry(1, 1, 1);
const stone = new THREE.DodecahedronGeometry(1);
const jewel = new THREE.OctahedronGeometry(1);
const ball = new THREE.SphereGeometry(1, 10, 7);
const hoop = new THREE.TorusGeometry(1, 0.105, 6, 20);
const peg = new THREE.CylinderGeometry(1, 1, 1, 10);

// Make a closed solid from horizontal rings. Vary their centres for twisted forms
// and their individual vertices for overhanging branches and irregular snow lips.
function loft(rings, sides, color, shape) {
  const positions = [],
    colors = [];
  const tint = new THREE.Color();
  const layers = rings.map(([y, r, x = 0, z = 0], layer) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i * TAU) / sides;
      const [radius, height] = shape ? shape(layer, i, r, y, a) : [r, y];
      return [x + radius * Math.cos(a), height, z + radius * Math.sin(a)];
    }),
  );
  function triangle(a, b, c, layer, index, half) {
    tint.set(typeof color === 'function' ? color(layer, index, half) : color);
    positions.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) colors.push(tint.r, tint.g, tint.b);
  }
  for (let j = 0; j < layers.length - 1; j++) {
    for (let i = 0; i < sides; i++) {
      const n = (i + 1) % sides,
        lo = layers[j],
        hi = layers[j + 1];
      triangle(lo[i], hi[i], lo[n], j, i, 0);
      triangle(lo[n], hi[i], hi[n], j, i, 1);
    }
  }
  for (let i = 1; i < sides - 1; i++) {
    const top = layers.at(-1);
    triangle(layers[0][0], layers[0][i], layers[0][i + 1], 0, i, 0);
    triangle(top[0], top[i + 1], top[i], layers.length - 1, i, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Bake each complete prop into one vertex-coloured mesh, including its small hardware.
class Model {
  positions = [];
  normals = [];
  colors = [];
  indices = [];
  add(geometry, color, at = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const transform = new THREE.Object3D();
    transform.position.fromArray(at);
    transform.scale.fromArray(scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(transform.matrix);
    const v = new THREE.Vector3(),
      tint = new THREE.Color(color ?? '#ffffff');
    const { position, normal, color: palette } = geometry.attributes;
    const offset = this.positions.length / 3;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(transform.matrix);
      this.positions.push(v.x, v.y, v.z);
      v.fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix);
      this.normals.push(v.x, v.y, v.z);
      if (palette) this.colors.push(palette.getX(i), palette.getY(i), palette.getZ(i));
      else this.colors.push(tint.r, tint.g, tint.b);
    }
    const index = geometry.index;
    for (let i = 0; i < (index?.count ?? position.count); i++) {
      this.indices.push(offset + (index ? index.getX(i) : i));
    }
  }
  beam(start, end, radius, color, taper = 1) {
    const a = new THREE.Vector3(...start),
      b = new THREE.Vector3(...end);
    const axis = b.clone().sub(a);
    const rotation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      axis.clone().normalize(),
    );
    const e = new THREE.Euler().setFromQuaternion(rotation);
    this.add(
      new THREE.CylinderGeometry(radius * taper, radius, axis.length(), 7),
      color,
      a.lerp(b, 0.5).toArray(),
      [1, 1, 1],
      [e.x, e.y, e.z],
    );
  }
  finish() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}

function pine(m, festive) {
  m.add(peg, bark, [0, 0.54, 0], [0.18, 1.15, 0.18]);
  for (let k = 0; k < 4; k++) {
    const r = 1.2 - k * 0.21,
      y = 0.63 + k * 0.7;
    const crown = loft(
      [
        [0, r * 0.71],
        [0.1, r],
        [0.32, r * 0.88],
        [0.44, r * 0.83],
        [1.22, 0.04],
      ],
      16,
      (layer, i) => (layer < 2 ? (i % 2 ? '#164d49' : '#236859') : layer === 2 ? ice : snow),
      (layer, i, radius, h, a) => [
        radius * (i % 2 ? 0.88 : 1.05) * (1 + 0.055 * Math.sin(3 * a + k)),
        h + (layer < 4 ? (i % 2 ? 0.07 : -0.11) + 0.075 * Math.sin(3 * a + k) : 0),
      ],
    );
    m.add(crown, null, [0.03 * k, y, 0], [1, 1, 1], [0, k * 0.42, 0]);
    if (festive && k < 3) {
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5 + k * 0.81;
        m.add(
          jewel,
          ['#c52c49', '#f6b23f', '#27c5bd'][(i + k) % 3],
          [Math.cos(a) * r * 0.91, y + 0.08, Math.sin(a) * r * 0.91],
          [0.105, 0.15, 0.105],
        );
      }
    }
  }
}

function broadleaf(m) {
  m.add(
    loft(
      [
        [0, 0.32],
        [0.22, 0.36],
        [1, 0.23, -0.15],
        [1.94, 0.16, 0.12],
        [2.55, 0.09],
      ],
      8,
      bark,
    ),
  );
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.4,
      x = Math.cos(a),
      z = Math.sin(a);
    m.beam([0, 1.12 + i * 0.09, 0], [0.87 * x, 2.32 + i * 0.11, 0.87 * z], 0.17, bark, 0.48);
    m.beam([0, 0.32, 0], [0.64 * x, 0.03, 0.64 * z], 0.16, bark, 0.32);
    const y = 2.45 + i * 0.1;
    m.add(
      stone,
      i % 2 ? '#367967' : '#29665e',
      [0.75 * x, y, 0.75 * z],
      [0.87, 0.66, 0.82],
      [0, a, 0],
    );
    m.add(stone, snow, [0.75 * x, y + 0.29, 0.75 * z], [0.81, 0.45, 0.77], [0, a, 0]);
  }
  m.add(stone, '#468975', [0.05, 3.18, 0], [1, 0.77, 1]);
  m.add(stone, snow, [0.02, 3.48, 0], [0.97, 0.54, 0.94]);
  m.add(peg, brass, [-0.09, 1.04, 0], [0.26, 0.12, 0.26]);
}

function outcrop(m, crystal) {
  for (const [x, z, size, angle] of [
    [0, 0, 1.16, 0.3],
    [-0.77, 0.25, 0.63, 1.1],
    [0.68, 0.38, 0.73, -0.4],
  ]) {
    m.add(
      stone,
      '#53657b',
      [x, size * 0.47, z],
      [size, size * 0.77, size * 0.81],
      [0.09, angle, -0.12],
    );
    m.add(
      stone,
      snow,
      [x - 0.03, size * 0.85, z],
      [size * 0.94, size * 0.44, size * 0.8],
      [0.09, angle, -0.12],
    );
  }
  if (!crystal) return;
  for (const [x, z, h, tilt, color] of [
    [0, -0.13, 3.25, -0.09, '#32b8d1'],
    [-0.54, 0.1, 1.9, 0.46, '#7073c8'],
    [0.52, 0.15, 2.28, -0.41, '#4387ca'],
  ]) {
    const shard = loft(
      [
        [0, 0.27],
        [0.31, 0.37],
        [h * 0.76, 0.34],
        [h, 0.018, 0.13],
      ],
      5,
      (layer, i) => (i === 1 || (layer === 2 && i % 2 === 0) ? '#b0f6ff' : color),
    );
    m.add(shard, null, [x, 0.35, z], [1, 1, 1], [0.06, 0.15, tilt]);
  }
}

function egg(m, at, scale, shell, marking) {
  const g = loft(
    [
      [0, 0.46],
      [0.23, 0.84],
      [0.6, 1],
      [1.02, 0.99],
      [1.43, 0.82],
      [1.82, 0.52],
      [2.06, 0.18],
      [2.1, 0.025],
    ],
    16,
    (j, i, half) =>
      (j === 2 && i % 4 === 1 && half === 0) || (j === 4 && i % 4 === 3 && half === 1)
        ? marking
        : shell,
  );
  m.add(g, null, at, scale);
}

function nursery(m) {
  m.add(peg, iron, [0, 0.12, 0], [1.49, 0.25, 1.49]);
  egg(m, [0, 0.15, 0], [1.58, 1.49, 1.58], '#ece0b8', '#2453a4');
  const cap = loft(
    [
      [2.64, 1.03],
      [2.74, 0.99],
      [3.05, 0.65],
      [3.27, 0.31],
      [3.35, 0.06],
    ],
    20,
    (j) => (j === 0 ? ice : snow),
    (j, i, r, h, a) => {
      const sag = j < 2 ? 0.18 * (0.5 + 0.5 * Math.sin(3 * a + 0.4)) : 0;
      return [r + sag * 0.86, h - sag];
    },
  );
  m.add(cap);
  m.add(
    loft(
      [
        [2.29, 1.32],
        [2.44, 1.26],
        [2.48, 1.22],
      ],
      24,
      '#b2384c',
    ),
  );
  m.add(box, '#a62c44', [0.96, 2.2, 0.93], [0.22, 0.57, 0.12], [0.15, 0.62, -0.36]);
  // Raised portholes and their mullions continue around the back of the shell.
  for (const angle of [1.25, 2.8, 4.55]) {
    const sx = Math.sin(angle),
      cz = Math.cos(angle);
    m.add(ball, '#ffbb50', [sx * 1.53, 1.46, cz * 1.53], [0.31, 0.3, 0.09], [0, angle, 0]);
    m.add(hoop, brass, [sx * 1.58, 1.46, cz * 1.58], [0.34, 0.33, 0.34], [0, angle, 0]);
    m.add(box, bark, [sx * 1.64, 1.46, cz * 1.64], [0.05, 0.58, 0.055], [0, angle, 0]);
  }
  m.add(box, '#594348', [0, 0.74, 1.39], [1, 1.46, 0.39]);
  m.add(box, '#a8503d', [0, 0.7, 1.6], [0.77, 1.29, 0.08]);
  m.add(ball, '#ffd273', [0, 1.11, 1.65], [0.22, 0.21, 0.045]);
  m.add(box, brass, [0.24, 0.58, 1.67], [0.11, 0.09, 0.1]);
  m.add(box, '#718298', [0, 0.09, 1.73], [1.25, 0.18, 0.62]);
  m.add(box, '#ad3746', [0, 1.61, 1.44], [1.45, 0.2, 0.79], [0.14, 0, 0]);
  m.add(box, snow, [0, 1.72, 1.42], [1.46, 0.11, 0.8], [0.14, 0, 0]);
  m.add(hoop, '#286853', [0, 0.75, 1.69], [0.2, 0.2, 0.45]);
  m.add(peg, brass, [0, 3.4, 0], [0.07, 0.49, 0.07]);
  m.add(hoop, brass, [0, 3.53, 0], [0.36, 0.36, 0.36], [1.1, 0.32, 0]);
  m.add(jewel, '#f4b04e', [0, 3.7, 0], [0.145, 0.19, 0.145]);
}

function shrine(m) {
  for (const [y, r, h, color] of [
    [0.1, 1.52, 0.2, '#495669'],
    [0.27, 1.32, 0.17, '#8694a1'],
    [0.41, 0.8, 0.12, brass],
  ]) {
    m.add(peg, color, [0, y, 0], [r, h, r]);
  }
  for (const s of [-1, 1]) {
    const arch = loft(
      [
        [0, 0.28],
        [0.35, 0.34],
        [1.77, 0.22, s * 0.15],
        [2.26, 0.23],
        [2.72, 0.17, -s * 0.31],
        [2.91, 0.12, -s * 0.6],
      ],
      8,
      (j) => (j === 1 || j === 4 ? '#77869c' : '#40576a'),
    );
    m.add(arch, null, [s * 1.03, 0.33, 0], [1.15, 1, 1.15]);
    m.add(peg, brass, [s * 1.04, 0.76, 0], [0.39, 0.15, 0.39]);
    m.add(jewel, '#80ece8', [s * 1.1, 2.28, 0.21], [0.105, 0.28, 0.105]);
    m.add(stone, snow, [s * 0.61, 3.14, 0], [0.37, 0.16, 0.31], [0, 0, s * 0.4]);
  }
  egg(m, [0, 0.94, 0], [0.54, 0.83, 0.54], '#3cbdc5', '#e6fcde');
  m.add(hoop, brass, [0, 1.81, 0], [0.77, 0.77, 0.4], [1.14, 0.12, 0.28]);
  m.add(jewel, '#c2fff4', [0, 0.65, 0], [0.22, 0.23, 0.22]);
}

function kiosk(m) {
  const red = '#ac283f';
  m.add(box, '#494559', [0, 0.13, 0], [1.58, 0.26, 1.5]);
  m.add(box, '#34707d', [0, 1.65, 0], [1.22, 2.72, 1.18]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const side = (x, y, z, scale, color) =>
      m.add(
        box,
        color,
        [x * Math.cos(a) + z * Math.sin(a), y, z * Math.cos(a) - x * Math.sin(a)],
        scale,
        [0, a, 0],
      );
    side(0, 0.56, 0.64, [1.41, 0.72, 0.12], red);
    side(-0.66, 1.65, 0.65, [0.13, 2.95, 0.13], red);
    for (const x of [-0.2, 0.2]) side(x, 1.95, 0.63, [0.06, 1.95, 0.08], red);
    for (const y of [1.03, 1.69, 2.31, 2.9]) side(0, y, 0.63, [1.28, 0.09, 0.09], red);
    side(0, 3.12, 0.75, [0.99, 0.21, 0.08], '#ffe6a6');
  }
  m.add(box, red, [0, 3.12, 0], [1.48, 0.46, 1.32]);
  m.add(box, brass, [0.44, 1.35, 0.73], [0.08, 0.3, 0.08]);
  m.add(
    loft(
      [
        [0, 1],
        [0.17, 1.08],
        [0.43, 0.73],
        [0.54, 0.32],
      ],
      4,
      (j) => (j === 0 ? red : snow),
    ),
    null,
    [0, 3.28, 0],
    [1.12, 1, 1.12],
    [0, Math.PI / 4, 0],
  );
}

function brazier(m) {
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    m.beam(
      [0.95 * Math.cos(a), 0.1, 0.95 * Math.sin(a)],
      [0.66 * Math.cos(a), 0.91, 0.66 * Math.sin(a)],
      0.16,
      iron,
    );
  }
  m.add(
    loft(
      [
        [0.47, 0.43],
        [0.62, 0.69],
        [1.11, 1.06],
        [1.22, 1.08],
      ],
      12,
      (j) => (j === 2 ? brass : iron),
    ),
  );
  for (const [x, z, h, r, color] of [
    [0, 0, 1.96, 0.55, '#f07825'],
    [-0.44, 0.15, 1.35, 0.35, '#e44926'],
    [0.43, 0.15, 1.15, 0.31, '#ffa72c'],
    [0.02, 0.41, 1.12, 0.25, '#ffe790'],
  ]) {
    m.add(
      loft(
        [
          [0, r * 0.7],
          [0.22, r],
          [h * 0.58, r * 0.64, -0.09],
          [h, 0.014, 0.17],
        ],
        7,
        color,
      ),
      null,
      [x, 1.14, z],
    );
  }
}

function wizardShop(m) {
  m.add(box, bark, [0, 0.13, 0], [2.66, 0.26, 1.86]);
  for (const x of [-1.1, 1.1])
    for (const z of [-0.68, 0.68]) {
      m.add(peg, '#805b42', [x, 1.16, z], [0.11, 2.2, 0.11]);
      m.add(peg, brass, [x, 1.88, z], [0.14, 0.16, 0.14]);
    }
  m.add(box, '#584075', [0, 1.08, -0.72], [2.25, 1.76, 0.16]);
  m.add(box, '#966742', [0, 0.58, 0.47], [2.45, 0.83, 0.61]);
  m.add(box, brass, [0, 1.03, 0.49], [2.62, 0.13, 0.79]);
  for (const [x, c] of [
    [-0.76, '#40c0ad'],
    [-0.43, '#914b9a'],
    [0.55, '#b45146'],
  ]) {
    m.add(ball, c, [x, 1.31, 0.48], [0.14, 0.21, 0.14]);
    m.add(peg, brass, [x, 1.53, 0.48], [0.07, 0.12, 0.07]);
  }
  const hat = loft(
    [
      [0, 1.47],
      [0.15, 1.55],
      [0.35, 0.95],
      [0.53, 0.89],
      [1.11, 0.65, -0.15],
      [1.48, 0.39, -0.13],
      [1.62, 0.24, 0.11],
      [1.54, 0.12, 0.42],
      [1.39, 0.025, 0.62],
    ],
    14,
    (j, i) => (j === 2 ? brass : j === 1 && i > 6 ? snow : j % 2 ? '#5a408b' : '#744f9c'),
    (j, i, r, h, a) => [r, h + (j < 2 ? 0.11 * Math.sin(3 * a) : 0)],
  );
  m.add(hat, null, [0, 2.06, 0], [1.09, 1, 0.88]);
  const moon = new THREE.Shape();
  moon.moveTo(0.12, 0.24);
  moon.bezierCurveTo(-0.41, 0.31, -0.4, -0.32, 0.02, -0.3);
  moon.quadraticCurveTo(0.23, -0.28, 0.29, -0.13);
  moon.bezierCurveTo(-0.09, -0.23, -0.13, 0.1, 0.12, 0.24);
  m.add(
    new THREE.ExtrudeGeometry(moon, { depth: 0.065, bevelEnabled: false, curveSegments: 8 }),
    '#ffcc61',
    [0.74, 3.36, 0.03],
    [1, 1, 1],
    [0, 0.35, 0],
  );
  m.add(box, '#ffd576', [0.12, 2.85, 0.63], [0.11, 0.31, 0.07], [-0.3, 0, -0.52]);
  m.add(box, '#ffd576', [0.21, 2.99, 0.59], [0.12, 0.19, 0.07], [-0.3, 0, 0.16]);
  m.beam([-1.12, 1.96, 0.72], [-1.37, 1.89, 0.88], 0.045, brass);
  m.add(jewel, '#ffd277', [-1.37, 1.56, 0.88], [0.19, 0.32, 0.19]);
}

const models = {
  pine: (m) => pine(m, false),
  festive: (m) => pine(m, true),
  tree: broadleaf,
  rock: (m) => outcrop(m, false),
  crystal: (m) => outcrop(m, true),
  nursery,
  shrine,
  phone: kiosk,
  fire: brazier,
  shop: wizardShop,
};

export function winterPond(pond, seed) {
  const positions = [],
    colors = [],
    indices = [];
  const sides = 48,
    bands = 9,
    tint = new THREE.Color();
  const deep = new THREE.Color('#1e6190'),
    shore = new THREE.Color('#63b9bd');
  for (let j = 0; j <= bands; j++) {
    const t = j / bands;
    for (let i = 0; i < sides; i++) {
      const a = ((i + (j % 2) * 0.38) * TAU) / sides;
      const x = Math.cos(a) * t * pond.r,
        z = Math.sin(a) * t * pond.r;
      const wave = Math.sin(x * 1.8 + z * 0.47 + (seed % 19)) * 0.024;
      positions.push(x, wave, z);
      tint
        .copy(deep)
        .lerp(shore, t ** 2.4)
        .multiplyScalar(0.97 + wave * 1.7);
      colors.push(tint.r, tint.g, tint.b);
      if (j === bands) continue;
      const lo = j * sides + i,
        next = j * sides + ((i + 1) % sides);
      indices.push(lo, next, lo + sides, next, next + sides, lo + sides);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const water = new THREE.Mesh(
    g,
    new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 64, specular: '#acddef' }),
  );
  water.position.set(pond.x, 0.025, pond.z);
  water.receiveShadow = true;
  const floes = new Model();
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4 + pond.x;
    const d = pond.r * (0.77 + 0.07 * Math.sin(i * 2));
    const r = pond.r * (0.1 + 0.025 * (i % 3));
    const floe = loft(
      [
        [-0.13, 0.92],
        [0.09, 1],
        [0.19, 0.9],
      ],
      6,
      (j) => (j === 0 ? '#74adc9' : snow),
      (_, k, radius, h) => [radius * (0.86 + 0.14 * Math.sin(k * 2 + i)), h],
    );
    floes.add(
      floe,
      null,
      [d * Math.cos(angle), 0, d * Math.sin(angle)],
      [r * 1.35, 1, r],
      [0, angle, 0],
    );
  }
  const iceMesh = new THREE.Mesh(
    floes.finish(),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  iceMesh.castShadow = iceMesh.receiveShadow = true;
  water.add(iceMesh);
  return water;
}

export function sealInlay(portals, radius, sealColor, heightAt) {
  const m = new Model();
  const metal = '#586681';
  m.add(peg, metal, [0, 0.08, 0], [radius * 0.45, 0.18, radius * 0.45]);
  m.add(new THREE.CylinderGeometry(radius * 0.43, radius * 0.44, 0.1, 40), '#364560', [0, 0.19, 0]);
  for (const [r, tube, color] of [
    [0.44, 0.07, brass],
    [0.4, 0.045, '#8195aa'],
    [0.97, 0.065, sealColor],
  ]) {
    m.add(
      new THREE.TorusGeometry(radius * r, tube, 5, 80),
      color,
      [0, r > 0.9 ? 0.12 : 0.26, 0],
      [1, 1, 1],
      [-Math.PI / 2, 0, 0],
    );
  }
  const crown = new THREE.Shape();
  crown.moveTo(-1.7, -1.05);
  crown.lineTo(-2.15, 1.05);
  crown.lineTo(-0.92, 0.3);
  crown.lineTo(0, 1.55);
  crown.lineTo(0.92, 0.3);
  crown.lineTo(2.15, 1.05);
  crown.lineTo(1.7, -1.05);
  crown.closePath();
  m.add(
    new THREE.ExtrudeGeometry(crown, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.05,
      bevelSegments: 1,
      curveSegments: 5,
    }),
    brass,
    [0, 0.27, 0],
    [1, 1, 1],
    [-Math.PI / 2, 0, -0.64],
  );
  for (const [i, portal] of portals.entries()) {
    const angle = (i * TAU) / portals.length;
    const x = Math.sin(angle),
      z = Math.cos(angle);
    m.add(
      box,
      metal,
      [x * radius * 0.6, 0.1, z * radius * 0.6],
      [0.23, 0.16, radius * 0.29],
      [0, angle, 0],
    );
    m.add(peg, brass, [x * radius * 0.76, 0.16, z * radius * 0.76], [0.43, 0.24, 0.43]);
    m.add(
      jewel,
      portal.closed ? '#8ff7c3' : '#a991cc',
      [x * radius * 0.76, 0.36, z * radius * 0.76],
      [0.33, 0.27, 0.33],
    );
  }
  const g = m.finish(),
    vertices = g.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    vertices.setY(i, vertices.getY(i) + heightAt(vertices.getX(i), vertices.getZ(i)));
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const seal = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  seal.castShadow = seal.receiveShadow = true;
  return seal;
}

export function addWinterProps(parent, kind, props, focus) {
  if (!props.length) return;
  const model = new Model();
  models[kind](model);
  const geometry = model.finish();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  // Preserve sight of the Digimon when it passes directly behind a large solid.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.sceneryFocus = { value: focus };
    shader.vertexShader =
      'varying vec3 sceneryView;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nsceneryView = mvPosition.xyz;',
      );
    shader.fragmentShader =
      'uniform vec3 sceneryFocus;\nvarying vec3 sceneryView;\n' +
      shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
        if (sceneryView.z > sceneryFocus.z) {
          vec2 delta = sceneryView.xy * sceneryFocus.z / sceneryView.z - sceneryFocus.xy;
          float reveal = 1.0 - smoothstep(0.85, 1.9, length(delta));
          if (fract(dot(floor(gl_FragCoord.xy), vec2(0.75488, 0.56984))) < reveal * 0.76) discard;
        }`,
      );
  };
  // Cull patches of forest independently for both the camera and the shadow pass.
  const cells = new Map();
  for (const prop of props) {
    const key = Math.floor(prop.x / 48) + ',' + Math.floor(prop.z / 48);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(prop);
  }
  const pose = new THREE.Object3D(),
    tint = new THREE.Color();
  for (const cell of cells.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, cell.length);
    for (const [i, prop] of cell.entries()) {
      pose.position.set(prop.x, prop.y - 0.04, prop.z);
      pose.rotation.y = prop.angle ?? 0.2;
      pose.scale.setScalar(prop.size / 4);
      pose.updateMatrix();
      mesh.setMatrixAt(i, pose.matrix);
      mesh.setColorAt(i, tint.setScalar(0.96 + 0.04 * Math.cos(pose.rotation.y)));
    }
    mesh.name = 'winter-' + kind;
    mesh.userData.obstacleType = kind;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
}
