import { cinematicAttack } from './cinematic-attacks.js';
import { warmStatusVisuals } from './status-visuals.js';
import { drawNextOrderVFX } from './next-order-visuals.js';
import * as THREE from './vendor/three.module.js';
const TAU = Math.PI * 2,
  rand = (n) => {
    const v = Math.sin(n * 127.1 + 31.7) * 43758.5453;
    return v - Math.floor(v);
  };
// Render-only randomness never consumes the deterministic gameplay RNG.
export class AttackVisuals {
  constructor(renderer) {
    this.r = renderer;
    this.group = new THREE.Group();
    this.group.name = 'Digimon attack effects';
    renderer.scene.add(this.group);
    this.batches = new Map();
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.up = new THREE.Vector3(0, 1, 0);
    this.dir = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.spin = new THREE.Quaternion();
    this.count = 0;
    this.budget = 4600;
    this.shaderTime = { value: 0 };
    this.textures = new Map();
    this.trails = new Map();
    this.trailKeys = new Set();
    this.geometries = {
      quad: new THREE.PlaneGeometry(1, 1),
      sphere: new THREE.SphereGeometry(1, 18, 12),
      shard: new THREE.OctahedronGeometry(1),
      beam: new THREE.CylinderGeometry(1, 1, 1, 7),
      cone: new THREE.ConeGeometry(1, 1, 10),
      ring: new THREE.TorusGeometry(1, 0.045, 4, 36),
      wave: this.waveGeometry(),
      foam: this.foamGeometry(),
      slash: this.slashGeometry(),
      wing: this.wingGeometry(false),
      bat: this.wingGeometry(true),
      leaf: this.leafGeometry(),
      fist: this.fistGeometry(),
      helix: this.helixGeometry(),
    };
  }
  texture(kind) {
    if (this.textures.has(kind)) return this.textures.get(kind);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = kind.includes('flame') ? 256 : 128;
    const c = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height;
    if (kind.includes('flame')) {
      const cold = kind === 'blue-flame';
      for (let layer = 0; layer < 3; layer++) {
        const g = c.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0, cold ? '#e4ffff' : '#fff6bb');
        g.addColorStop(0.3, cold ? '#7feaff' : '#ffd14b');
        g.addColorStop(0.7, cold ? '#2684f0' : '#ff661e');
        g.addColorStop(1, cold ? '#2133a000' : '#df281000');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(64, 245);
        c.bezierCurveTo(6 + layer * 9, 238, 10 + layer * 8, 150, 38, 120);
        c.bezierCurveTo(29, 163, 59, 116, 55 + layer * 2, 12 + layer * 25);
        c.bezierCurveTo(114 - layer * 8, 86, 63, 116, 102 - layer * 6, 159);
        c.bezierCurveTo(131 - layer * 10, 124, 126 - layer * 8, 231, 64, 245);
        c.fill();
      }
      c.globalCompositeOperation = 'screen';
      c.fillStyle = cold ? '#d8ffff' : '#fff8c4';
      c.beginPath();
      c.moveTo(65, 238);
      c.bezierCurveTo(36, 230, 48, 168, 68, 135);
      c.bezierCurveTo(62, 195, 96, 216, 65, 238);
      c.fill();
    } else if (kind === 'ribbon') {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#ffffff00');
      g.addColorStop(0.35, '#ffffff45');
      g.addColorStop(0.5, '#ffffffff');
      g.addColorStop(0.65, '#ffffff45');
      g.addColorStop(1, '#ffffff00');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    } else if (kind === 'shockwave' || kind === 'seal') {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 63);
      g.addColorStop(0, '#ffffff00');
      g.addColorStop(0.63, '#ffffff00');
      g.addColorStop(0.77, '#ffffff25');
      g.addColorStop(0.88, '#ffffffe0');
      g.addColorStop(0.94, '#ffffff38');
      g.addColorStop(1, '#ffffff00');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      if (kind === 'seal') {
        c.strokeStyle = '#ffffffb0';
        c.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
          const a = (i * TAU) / 12;
          c.beginPath();
          c.moveTo(64 + Math.cos(a) * 36, 64 + Math.sin(a) * 36);
          c.lineTo(64 + Math.cos(a) * 49, 64 + Math.sin(a) * 49);
          c.stroke();
        }
      }
    } else if (kind === 'water') {
      c.fillStyle = '#d3f4ff';
      c.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 13; row++) {
        c.strokeStyle = row % 3 ? '#ffffff80' : '#7dc9e680';
        c.lineWidth = row % 3 ? 1.5 : 3;
        c.beginPath();
        for (let x = 0; x <= 128; x += 4) {
          const y = row * 11 + Math.sin(x * 0.09 + row * 2) * 3;
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
    } else if (kind === 'foam') {
      for (let i = 0; i < 90; i++) {
        const x = rand(i) * 128,
          y = rand(i + 100) * 128,
          r = 2 + rand(i + 200) * 10;
        c.strokeStyle = i % 3 ? '#eaffffbc' : '#8fe6f58a';
        c.lineWidth = 1 + rand(i + 300) * 2;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.stroke();
      }
    } else if (kind === 'sun') {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#d64b12');
      g.addColorStop(0.35, '#ff9b22');
      g.addColorStop(0.6, '#ffd365');
      g.addColorStop(1, '#e96316');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) {
        const x = rand(i + 3) * 128,
          y = rand(i + 80) * 128;
        c.strokeStyle = i % 3 ? '#ffe48c' : '#ff5c0f';
        c.lineWidth = 0.6 + rand(i + 100) * 2;
        c.beginPath();
        c.moveTo(x, y);
        c.bezierCurveTo(x + 12, y - 8, x + 28, y + 10, x + 45, y - 3);
        c.stroke();
      }
    } else if (kind === 'bubble') {
      const g = c.createRadialGradient(45, 35, 3, 64, 64, 57);
      g.addColorStop(0, '#edffff30');
      g.addColorStop(0.72, '#66ddf52a');
      g.addColorStop(0.87, '#a6edff9c');
      g.addColorStop(0.96, '#e9ffffe0');
      g.addColorStop(1, '#65c6ff00');
      c.fillStyle = g;
      c.beginPath();
      c.arc(64, 64, 58, 0, TAU);
      c.fill();
      c.strokeStyle = '#ffffffee';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(62, 62, 44, 3.5, 4.8);
      c.stroke();
    } else if (kind === 'smoke') {
      for (let i = 0; i < 18; i++) {
        const x = 30 + rand(i) * 68,
          y = 30 + rand(i + 40) * 68,
          r = 19 + rand(i + 80) * 24,
          g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, '#ffffff28');
        g.addColorStop(1, '#ffffff00');
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    } else {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 63);
      g.addColorStop(0, '#ffffffef');
      g.addColorStop(0.12, '#ffffffcf');
      g.addColorStop(0.42, '#ffffff48');
      g.addColorStop(1, '#ffffff00');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    if (kind === 'water') {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }
    this.textures.set(kind, texture);
    return texture;
  }
  waveGeometry() {
    const verts = [],
      colors = [],
      uvs = [],
      indices = [],
      nx = 22,
      ny = 14;
    for (let j = 0; j <= ny; j++) {
      const t = j / ny,
        u = 1 - t,
        y = 3 * u * u * t * 3.7 + 3 * u * t * t * 3.6 + t * t * t * 1.65,
        z = u * u * u * -1.3 + 3 * u * u * t * -0.8 + 3 * u * t * t * 2.1 + t * t * t * 0.35;
      for (let i = 0; i <= nx; i++) {
        const x = (i / nx) * 2 - 1;
        verts.push(x, y * (1 - 0.12 * x * x), z + 0.08 * Math.cos(x * 5));
        uvs.push((i / nx) * 2, j / ny);
        const c = new THREE.Color().lerpColors(
          new THREE.Color('#0877bd'),
          new THREE.Color('#a4fff2'),
          Math.pow(t, 0.7),
        );
        colors.push(c.r, c.g, c.b);
        if (i < nx && j < ny) {
          const a = j * (nx + 1) + i,
            b = a + nx + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  foamGeometry() {
    const points = [];
    for (let i = 0; i <= 18; i++) {
      const x = (i / 18) * 2 - 1;
      points.push(new THREE.Vector3(x, 2.66 * (1 - 0.12 * x * x) + Math.sin(i * 1.5) * 0.04, 0.63));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, 0.055, 4, false);
  }
  slashGeometry() {
    const p = [],
      ix = [];
    for (let i = 0; i <= 20; i++) {
      const a = -1.1 + (i / 20) * 2.2,
        width = Math.sin((i / 20) * Math.PI) * 0.22;
      for (const r of [1 - width, 1 + width]) p.push(Math.cos(a) * r - 1, Math.sin(a) * r, 0);
      if (i < 20) {
        const n = i * 2;
        ix.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ix);
    return g;
  }
  wingGeometry(bat) {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.2);
    const pts = bat
      ? [
          [-0.4, 0.4],
          [-2.2, 1],
          [-1.6, -0.5],
          [-1, -0.1],
          [-0.65, -0.55],
          [0, -0.25],
          [0.65, -0.55],
          [1, -0.1],
          [1.6, -0.5],
          [2.2, 1],
          [0.4, 0.4],
        ]
      : [
          [-0.4, 0.3],
          [-1.9, 1.2],
          [-2.3, 0.6],
          [-1.8, 0.35],
          [-2, 0.05],
          [-1.4, 0],
          [-1.55, -0.3],
          [-0.75, -0.15],
          [0, -0.4],
          [0.75, -0.15],
          [1.55, -0.3],
          [1.4, 0],
          [2, 0.05],
          [1.8, 0.35],
          [2.3, 0.6],
          [1.9, 1.2],
          [0.4, 0.3],
        ];
    for (const [x, y] of pts) shape.lineTo(x, y);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }
  leafGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, -1);
    shape.bezierCurveTo(-1, -0.2, -0.6, 0.6, 0, 1);
    shape.bezierCurveTo(0.6, 0.6, 1, -0.2, 0, -1);
    return new THREE.ShapeGeometry(shape);
  }
  fistGeometry() {
    const s = new THREE.Shape();
    s.moveTo(-0.55, -0.65);
    s.lineTo(0.4, -0.65);
    s.lineTo(0.5, -0.15);
    s.lineTo(0.85, 0.05);
    s.quadraticCurveTo(1, 0.4, 0.62, 0.4);
    s.lineTo(0.35, 0.25);
    s.lineTo(0.35, 0.65);
    s.quadraticCurveTo(0.22, 0.86, 0.08, 0.65);
    s.quadraticCurveTo(-0.04, 0.9, -0.2, 0.65);
    s.quadraticCurveTo(-0.37, 0.9, -0.5, 0.6);
    s.quadraticCurveTo(-0.73, 0.78, -0.72, 0.4);
    s.lineTo(-0.7, -0.15);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.06,
      bevelSegments: 1,
      steps: 1,
    });
  }
  helixGeometry() {
    const points = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90,
        r = 0.15 + t * 0.85,
        a = t * TAU * 3;
      points.push(new THREE.Vector3(Math.cos(a) * r, t * 3, Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 100, 0.045, 4, false);
  }
  batch(name, geometry = 'quad', texture = null, additive = false) {
    let b = this.batches.get(name);
    if (b) return b;
    const capacity =
        geometry === 'wave' || geometry === 'foam' ? 160 : geometry === 'helix' ? 250 : 1600,
      g = this.geometries[geometry].clone(),
      alpha = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    g.setAttribute('fxAlpha', alpha);
    const solid = ['ice-crystal', 'missile-body', 'missile-nose', 'missile-fin', 'fists'].includes(
        name,
      ),
      Material = solid ? THREE.MeshPhongMaterial : THREE.MeshBasicMaterial,
      m = new Material({
        ...(solid ? { shininess: 65, specular: '#b9dcf2', flatShading: true } : {}),
        color: '#ffffff',
        map: texture ? this.texture(texture) : null,
        vertexColors: geometry === 'wave',
        transparent: true,
        opacity: 1,
        alphaTest: 0.01,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
    m.onBeforeCompile = (shader) => {
      if (geometry === 'wave') {
        shader.uniforms.fxTime = this.shaderTime;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <uv_vertex>',
          '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv += vec2(0.0, fxTime*0.18);\n#endif',
        );
        shader.vertexShader = 'uniform float fxTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed.y += sin(position.x*9.0+fxTime*4.0)*0.07*min(position.y,1.0); transformed.z += sin(position.x*7.0+fxTime*3.0)*0.04;',
        );
      }
      if (texture === 'water') {
        shader.fragmentShader = 'uniform float fxTime;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
vec2 waterUV=vMapUv+vec2(sin(vMapUv.y*16.0+fxTime*2.0)*0.018,sin(vMapUv.x*13.0-fxTime*3.0)*0.018);vec4 sampledDiffuseColor=texture2D(map,waterUV);float glint=pow(max(0.0,sin(waterUV.x*21.0+waterUV.y*18.0+fxTime*3.0)),16.0)*0.22;sampledDiffuseColor.rgb+=glint;diffuseColor*=sampledDiffuseColor;
#endif`,
        );
      }
      if (texture?.includes('flame') || texture === 'sun') {
        shader.uniforms.fxTime = this.shaderTime;
        shader.fragmentShader =
          'uniform float fxTime;\nfloat fxHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat fxNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(fxHash(i),fxHash(i+vec2(1,0)),f.x),mix(fxHash(i+vec2(0,1)),fxHash(i+vec2(1,1)),f.x),f.y);}\n' +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
 vec2 fxUV=vMapUv;float turbulence=fxNoise(fxUV*vec2(8.0,12.0)+vec2(0.0,-fxTime*5.0));
 fxUV.x+=(turbulence-0.5)*0.14*(0.3+fxUV.y);fxUV.y+=sin(fxUV.x*14.0+fxTime*6.0)*0.015;
 vec4 sampledDiffuseColor=texture2D(map,fxUV);sampledDiffuseColor.rgb*=0.8+turbulence*0.8;sampledDiffuseColor.a*=0.72+turbulence*0.28;diffuseColor*=sampledDiffuseColor;
 #endif`,
        );
      }
      shader.vertexShader =
        'attribute float fxAlpha; varying float vFxAlpha;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvFxAlpha=fxAlpha;',
        );
      shader.fragmentShader =
        'varying float vFxAlpha;\n' +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.a*=vFxAlpha;',
        );
    };
    m.forceSinglePass = true;
    m.customProgramCacheKey = () =>
      'digibonk-fx-v2-' +
      geometry +
      '-' +
      (texture?.includes('flame')
        ? 'flame'
        : texture === 'sun'
          ? 'sun'
          : texture === 'water'
            ? 'water'
            : 'base');
    const mesh = new THREE.InstancedMesh(g, m, capacity);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.renderOrder = texture ? 6 : 5;
    this.group.add(mesh);
    b = { mesh, alpha, capacity, count: 0 };
    this.batches.set(name, b);
    return b;
  }
  begin() {
    this.trailKeys.clear();
    this.count = 0;
    for (const b of this.batches.values()) b.count = 0;
  }
  emit(
    name,
    geometry,
    texture,
    x,
    y,
    z,
    sx,
    sy,
    sz,
    color = '#ffffff',
    alpha = 1,
    rotation = null,
    owner = 'player',
    additive = false,
  ) {
    const visibility = this.warming ? 1 : (this.r.visibility?.[owner] ?? 1);
    if (visibility <= 0 || this.count >= this.budget) return;
    const b = this.batch(name, geometry, texture, additive);
    if (b.count >= b.capacity) return;
    const d = this.dummy;
    d.position.set(x, y, z);
    d.scale.set(Math.max(0.001, sx), Math.max(0.001, sy), Math.max(0.001, sz));
    d.quaternion.copy(rotation || this.r.camera.quaternion);
    d.updateMatrix();
    b.mesh.setMatrixAt(b.count, d.matrix);
    b.mesh.setColorAt(b.count, this.color.set(color));
    b.alpha.setX(b.count, Math.max(0, Math.min(1, alpha * visibility)));
    b.count++;
    this.count++;
  }
  face(angle = 0) {
    return this.r.camera.quaternion
      .clone()
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle));
  }
  yaw(angle) {
    return new THREE.Quaternion().setFromAxisAngle(this.up, angle);
  }
  beam(name, a, b, radius, color, alpha, owner) {
    const delta = new THREE.Vector3().subVectors(b, a),
      length = delta.length();
    if (length < 0.005) return;
    const mid = a.clone().add(b).multiplyScalar(0.5),
      q = new THREE.Quaternion().setFromUnitVectors(this.up, delta.divideScalar(length));
    this.emit(
      name,
      'beam',
      null,
      mid.x,
      mid.y,
      mid.z,
      radius,
      length,
      radius,
      color,
      alpha,
      q,
      owner,
    );
  }
  glow(x, y, z, size, color, alpha, owner) {
    this.emit('glow', 'quad', 'glow', x, y, z, size, size, 1, color, alpha, null, owner, true);
  }
  flame(x, y, z, size, time, seed, cold, owner, alpha = 1) {
    const sway = Math.sin(time * 17 + seed) * 0.16;
    this.emit(
      cold ? 'cold-fire' : 'fire',
      'quad',
      cold ? 'blue-flame' : 'flame',
      x + sway * size,
      y + size * 0.48,
      z,
      size * 0.9,
      size * 1.8,
      1,
      '#ffffff',
      alpha,
      this.face(Math.sin(time * 8 + seed) * 0.12),
      owner,
    );
  }
  wave(x, y, z, width, angle, time, owner, alpha = 1, height = 1) {
    const q = this.yaw(angle),
      ux0 = Math.sin(angle),
      uz0 = Math.cos(angle),
      floor = q
        .clone()
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
        );
    this.emit(
      'wave-wake',
      'quad',
      'foam',
      x - ux0 * 0.6,
      y + 0.025,
      z - uz0 * 0.6,
      width * 2.1,
      3.5,
      1,
      '#a3edff',
      alpha * 0.6,
      floor,
      owner,
    );
    this.emit(
      'water-wave',
      'wave',
      'water',
      x - ux0 * 1.1,
      y - 0.15,
      z - uz0 * 1.1,
      width * 0.9,
      0.55 * height,
      0.65,
      '#c5f9ff',
      0.25 * alpha,
      q,
      owner,
    );
    this.emit(
      'water-wave',
      'wave',
      'water',
      x,
      y,
      z,
      width,
      height,
      1,
      '#ffffff',
      0.76 * alpha,
      q,
      owner,
    );
    this.emit(
      'wave-foam',
      'foam',
      null,
      x,
      y + 0.025,
      z,
      width,
      height,
      1,
      '#efffff',
      0.95 * alpha,
      q,
      owner,
    );
    for (let i = 0; i < 5; i++) {
      const k = ((i / 4) * 2 - 1) * width;
      this.emit(
        'foam-lace',
        'quad',
        'foam',
        x + uz0 * k + ux0 * 0.65,
        y + 2.58 * height * (1 - 0.12 * (k / width) ** 2),
        z - ux0 * k + uz0 * 0.65,
        0.7,
        0.38 * height,
        1,
        '#efffff',
        alpha * 0.65,
        this.r.camera.quaternion,
        owner,
      );
    }
    const ux = Math.sin(angle),
      uz = Math.cos(angle),
      rx = uz,
      rz = -ux;
    for (let i = 0; i < 15; i++) {
      const k = ((i / 14) * 2 - 1) * width;
      this.emit(
        'foam-caps',
        'sphere',
        null,
        x + rx * k + ux * 0.63,
        y + 2.66 * height * (1 - 0.12 * (k / width) ** 2) + Math.sin(time * 5 + i) * 0.04,
        z + rz * k + uz * 0.63,
        0.1,
        0.07,
        0.1,
        '#efffff',
        alpha * 0.85,
        null,
        owner,
      );
    }
    for (let i = 0; i < 11; i++) {
      const k = ((i / 10) * 2 - 1) * width,
        phase = (time * 2 + rand(i + width * 17)) % 1;
      this.emit(
        'spray',
        'shard',
        null,
        x + rx * k + ux * 0.6,
        y + (2.5 + phase * 0.7) * height,
        z + rz * k + uz * 0.6,
        0.045,
        0.1 + phase * 0.18,
        0.045,
        i % 2 ? '#eeffff' : '#80e8ff',
        (1 - phase) * alpha,
        null,
        owner,
      );
    }
  }
  ribbon(name, a, b, width, color, alpha, owner) {
    const d = new THREE.Vector3().subVectors(b, a),
      length = d.length();
    if (length < 0.015) return;
    d.divideScalar(length);
    const normal = new THREE.Vector3().subVectors(this.r.camera.position, a).normalize(),
      side = new THREE.Vector3().crossVectors(normal, d).normalize();
    if (side.lengthSq() < 0.01) return;
    normal.crossVectors(d, side).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(d, side, normal),
      ),
      mid = a.clone().add(b).multiplyScalar(0.5);
    this.emit(
      name,
      'quad',
      'ribbon',
      mid.x,
      mid.y,
      mid.z,
      length,
      width,
      1,
      color,
      alpha,
      q,
      owner,
      true,
    );
  }
  decal(name, x, y, z, size, color, alpha, owner, seal = false) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    this.emit(
      name,
      'quad',
      seal ? 'seal' : 'shockwave',
      x,
      y,
      z,
      size,
      size,
      1,
      color,
      alpha,
      q,
      owner,
    );
  }
  trail(shot, s, time, owner, type, x, y, z, power) {
    if ((this.r.visibility?.[owner] ?? 1) <= 0 && !this.warming) return;
    const sceneKey = (s.sceneSerial ?? '') + ':' + s.mapSeed;
    if (this.trailScene !== sceneKey) {
      this.trails.clear();
      this.trailScene = sceneKey;
    }
    const key = (s.sceneSerial ?? s.mapSeed) + ':' + owner + ':' + shot.id;
    this.trailKeys.add(key);
    let points = this.trails.get(key);
    if (!points) {
      if (this.trails.size >= 240) return;
      points = [];
      this.trails.set(key, points);
    }
    let last = points.at(-1);
    if (last && (Math.hypot(x - last.x, z - last.z) > 4 || time - last.time > 0.25)) {
      points.length = 0;
      last = null;
    }
    if (!last || (time - last.time > 0.025 && Math.hypot(x - last.x, z - last.z) > 0.08)) {
      points.push({ x, y, z, time });
      if (points.length > 10) points.shift();
    }
    while (points.length && time - points[0].time > 0.32) points.shift();
    if (points.length < 2) return;
    const fire = ['flame', 'inferno', 'blue-flame', 'sun', 'missile', 'phoenix'].includes(type),
      water = ['wave', 'jet', 'torpedo', 'bubble', 'ice', 'frost'].includes(type),
      dark = ['dark-orb', 'bats', 'dark-claw'].includes(type),
      color = fire
        ? type === 'blue-flame'
          ? '#66caff'
          : '#ff9f36'
        : water
          ? '#9af0ff'
          : dark
            ? '#b774ef'
            : type === 'flower'
              ? '#ff9ad9'
              : '#fff0b0';
    for (let i = 1; i < points.length; i++) {
      const age = Math.max(0, 1 - (time - points[i].time) / 0.32),
        width = (fire ? 0.55 : water ? 0.25 : 0.2) * power * age;
      this.ribbon(
        'motion-trails',
        new THREE.Vector3(points[i - 1].x, points[i - 1].y, points[i - 1].z),
        new THREE.Vector3(points[i].x, points[i].y, points[i].z),
        width,
        color,
        age * 0.6,
        owner,
      );
    }
  }
  accent(effect, s, time, type, owner) {
    const life = Math.max(0, effect.life / effect.maxLife),
      t = 1 - life,
      x = effect.x,
      z = effect.z,
      y = window.DigibonkCore.heightAt(x, z, s.mapSeed),
      size = Math.min(2, effect.size || 1),
      fire = ['flame', 'inferno', 'sun', 'missile', 'phoenix', 'blue-flame'].includes(type),
      water = ['wave', 'jet', 'torpedo', 'bubble'].includes(type),
      ice = ['ice', 'frost'].includes(type),
      holy = ['stars', 'holy-beam', 'holy-fist', 'arrow'].includes(type),
      dark = ['dark-orb', 'bats', 'dark-claw'].includes(type),
      color = fire
        ? type === 'blue-flame'
          ? '#83d6ff'
          : '#ffc76b'
        : water
          ? '#b5f9ff'
          : ice
            ? '#d1f8ff'
            : holy
              ? '#ffe9a0'
              : dark
                ? '#c189ec'
                : '#c0f5ff';
    if (effect.kind === 'cast') {
      if (holy || dark || type === 'sun')
        this.decal('cast-sigil', x, y + 0.1, z, 2.5 * (0.6 + t), color, life * 0.45, owner, true);
      return;
    }
    if (effect.kind === 'slash') return;
    if (fire) {
      const flash = Math.max(0, 1 - t * 4.5);
      if (flash > 0)
        this.emit(
          'blast-heart',
          'sphere',
          null,
          x,
          y + 0.8,
          z,
          (0.4 + t * 3) * size,
          (0.4 + t * 3) * size,
          (0.4 + t * 3) * size,
          '#fff3c5',
          flash * 0.8,
          null,
          owner,
        );
    }
    this.decal(
      'impact-pressure',
      x,
      y + 0.12,
      z,
      (1 + t * 5) * size,
      color,
      life * 0.5,
      owner,
      holy || dark,
    );
    if (water) {
      for (let i = 0; i < 3; i++)
        this.decal(
          'water-ripples',
          x,
          y + 0.13 + i * 0.008,
          z,
          (1 + t * (4 + i)) * size,
          '#c9ffff',
          life * (0.5 - i * 0.1),
          owner,
        );
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + effect.id,
          rx = Math.cos(a),
          rz = Math.sin(a),
          r = (0.25 + t * 2) * size,
          height = Math.sin(t * Math.PI) * (1.2 + (i % 3) * 0.4) * size;
        this.ribbon(
          'splash-crown',
          new THREE.Vector3(x + rx * r * 0.8, y + 0.2, z + rz * r * 0.8),
          new THREE.Vector3(x + rx * r, y + 0.3 + height, z + rz * r),
          0.25 * life,
          '#dbffff',
          life * 0.75,
          owner,
        );
      }
    } else if (fire || ice || type === 'lightning') {
      for (let i = 0; i < 9; i++) {
        const a = i * 2.3999 + effect.id,
          r = t * (2 + rand(i + effect.id)) * size,
          h = Math.sin(t * Math.PI) * (1 + rand(i + 22) * 2),
          head = new THREE.Vector3(x + Math.cos(a) * r, y + 0.3 + h, z + Math.sin(a) * r),
          tail = new THREE.Vector3(
            x + Math.cos(a) * r * 0.75,
            y + 0.3 + h * 0.7,
            z + Math.sin(a) * r * 0.75,
          );
        this.ribbon('impact-sparks', tail, head, (ice ? 0.09 : 0.04) * life, color, life, owner);
      }
      if (fire)
        this.emit(
          'heat-haze',
          'quad',
          'smoke',
          x,
          y + 1 + t * 2,
          z,
          2 + t * 3,
          2 + t * 3,
          1,
          '#635757',
          life * 0.2,
          null,
          owner,
        );
    } else if (holy) {
      this.ribbon(
        'holy-flare',
        new THREE.Vector3(x - 1.8 * life, y + 1, z),
        new THREE.Vector3(x + 1.8 * life, y + 1, z),
        0.18 * life,
        '#fff4bf',
        life * 0.6,
        owner,
      );
    } else if (dark) {
      for (let i = 0; i < 3; i++) {
        const a = time * 3 + (i * TAU) / 3;
        this.emit(
          'shadow-vortex',
          'quad',
          'smoke',
          x + Math.cos(a) * t,
          y + 0.5 + t,
          z + Math.sin(a) * t,
          1 + t * 2,
          1 + t * 2,
          1,
          '#6d3a9f',
          life * 0.45,
          this.face(a),
          owner,
        );
      }
    }
  }
  warmup(state = { mapSeed: 83461 }) {
    for (const step of this.warmupSteps(state)) {
    }
  }
  async warmupAsync(state, frame) {
    for (const step of this.warmupSteps(state)) await frame();
  }
  *warmupSteps(state = { mapSeed: 83461 }) {
    if (this.warmed) return;
    this.warming = true;
    try {
      let id = -100;
      for (const skill of Object.values(window.SkillSystem.skills)) {
        if (skill.kind !== 'damage') continue;
        this.begin();
        const shot = {
          id: id--,
          skillId: skill.id,
          x: 0,
          z: 0,
          ox: -2,
          oz: 0,
          prevX: -0.1,
          prevZ: 0,
        };
        this.projectile(shot, state, 0);
        for (const kind of ['cast', 'burst', 'slash'])
          this.impact(
            { id: id--, skillId: skill.id, kind, x: 0, z: 0, life: 0.6, maxLife: 1, size: 1.2 },
            state,
            0,
          );
        this.finish();
        yield;
      }
      warmStatusVisuals(this);
      for (const b of this.batches.values()) {
        b.mesh.visible = true;
        b.mesh.count = 0;
      }
      this.trails.clear();
      this.warmed = true;
    } finally {
      this.warming = false;
    }
  }
  projectile(shot, s, time, owner = 'player') {
    this.shaderTime.value = time;
    const skill =
        window.SkillSystem.skills[shot.skillId] ||
        window.SkillSystem.skills[shot.dark ? 'dark-pulse' : 'bubble'],
      type = skill.visual,
      x = shot.x,
      z = shot.z,
      y = window.DigibonkCore.heightAt(x, z, s.mapSeed) + (shot.height || 1.2),
      seed = shot.id * 3.7,
      power = 1 + Math.max(0, skill.stage) * 0.18;
    let dx = owner === 'enemy' ? shot.dx : x - (shot.prevX ?? shot.ox ?? x - 1),
      dz = owner === 'enemy' ? shot.dz : z - (shot.prevZ ?? shot.oz ?? z);
    if (Math.hypot(dx, dz) < 0.001) {
      dx = x - (shot.ox ?? x - 1);
      dz = z - (shot.oz ?? z);
    }
    const length = Math.hypot(dx, dz) || 1,
      ux = dx / length,
      uz = dz / length,
      rx = uz,
      rz = -ux,
      angle = Math.atan2(ux, uz),
      q = new THREE.Quaternion().setFromUnitVectors(this.up, new THREE.Vector3(ux, 0, uz));
    this.trail(shot, s, time, owner, type, x, y, z, power);
    cinematicAttack(this, skill, shot, s, time, owner, 'flight');
    if (this.count < this.budget * 0.78) {
      const color = skill.color || '#c5f4ff';
      for (let i = 0; i < 2; i++) {
        const phase = (time * 3 + i * 0.5 + seed) % 1,
          back = 0.2 + phase * 1.5;
        this.emit(
          'flight-sparks',
          'shard',
          null,
          x - ux * back + rx * 0.13 * Math.sin(seed + i * 3),
          y + 0.1 * Math.cos(seed + i),
          z - uz * back + rz * 0.13 * Math.sin(seed + i * 3),
          0.035,
          0.09 * (1 - phase),
          0.035,
          color,
          (1 - phase) * 0.6,
          this.face(angle),
          owner,
        );
      }
    }
    if (skill.nextOrder) {
      drawNextOrderVFX(this, skill, shot, s, time, owner, 'projectile');
      return;
    }
    if (['flame', 'blue-flame', 'inferno'].includes(type)) {
      const cold = type === 'blue-flame',
        size = type === 'inferno' ? 1.5 : 1;
      this.emit(
        'burning-body',
        'sphere',
        'sun',
        x,
        y,
        z,
        0.5 * power * size,
        0.48 * power * size,
        0.5 * power * size,
        cold ? '#8cddff' : '#fff0c5',
        0.94,
        this.yaw(time * 2),
        owner,
      );
      this.emit(
        'flame-heart',
        'sphere',
        null,
        x + ux * 0.2,
        y,
        z + uz * 0.2,
        0.24 * power,
        0.24 * power,
        0.24 * power,
        cold ? '#d6faff' : '#fff2ba',
        0.9,
        null,
        owner,
      );
      this.glow(x, y, z, power * 2, cold ? '#489fff' : '#ff9b2f', 0.45, owner);
      const view = new THREE.Vector3(ux, 0, uz).applyQuaternion(
          this.r.camera.quaternion.clone().invert(),
        ),
        roll = Math.atan2(view.y, view.x) + Math.PI / 2;
      this.emit(
        cold ? 'cold-fire-streak' : 'fire-streak',
        'quad',
        cold ? 'blue-flame' : 'flame',
        x - ux * 1.4,
        y + 0.1,
        z - uz * 1.4,
        1.25 * power * size,
        4.1 * power * size,
        1,
        '#ffffff',
        0.9,
        this.face(roll),
        owner,
      );
      for (let i = 0; i < 5; i++) {
        const t = i * 0.48,
          fade = 1 - i * 0.14;
        this.flame(
          x - ux * t,
          y + 0.1 + Math.sin(time * 14 + seed + i) * 0.08,
          z - uz * t,
          power * size * fade,
          time,
          seed + i,
          cold,
          owner,
          fade,
        );
      }
      for (let i = 0; i < 5; i++) {
        const a = seed + i * 2.4,
          d = (time * 2 + rand(i + seed)) % 1;
        this.emit(
          'embers',
          'shard',
          null,
          x - ux * d * 3 + Math.cos(a) * d * 0.5,
          y + d * 1.5,
          z - uz * d * 3 + Math.sin(a) * d * 0.5,
          0.04,
          0.1,
          0.04,
          cold ? '#c3faff' : '#ffe392',
          1 - d,
          null,
          owner,
        );
      }
    } else if (type === 'wave') {
      this.wave(x, y - 1, z, 2.1 * power, angle, time, owner);
    } else if (type === 'jet') {
      const head = new THREE.Vector3(x, y, z),
        tail = new THREE.Vector3(x - ux * 4, y - 0.18, z - uz * 4);
      this.beam('water-stream', head, tail, 0.18 * power, '#40c9ed', 0.8, owner);
      this.beam('water-stream-core', head, tail, 0.055 * power, '#e4ffff', 0.9, owner);
      for (let i = 0; i < 8; i++) {
        const t = i * 0.48;
        this.emit(
          'water-bubbles',
          'quad',
          'bubble',
          x - ux * t + rx * Math.sin(time * 18 + i) * 0.12,
          y + Math.cos(time * 14 + i) * 0.12,
          z - uz * t + rz * Math.sin(time * 18 + i) * 0.12,
          0.3,
          0.3,
          1,
          '#b2faff',
          0.8,
          null,
          owner,
        );
      }
      for (let i = 0; i < 4; i++)
        this.emit(
          'spray',
          'shard',
          null,
          x + rx * (rand(i + seed) - 0.5),
          y + rand(i + seed + 3) * 0.6,
          z + rz * (rand(i + seed) - 0.5),
          0.06,
          0.22,
          0.06,
          '#dcffff',
          0.9,
          q,
          owner,
        );
    } else if (type === 'bubble') {
      for (let i = 0; i < 4; i++) {
        const a = seed + i * 2.3;
        this.emit(
          'bubbles',
          'quad',
          'bubble',
          x + Math.cos(a) * 0.35,
          y + Math.sin(time * 4 + a) * 0.3,
          z + Math.sin(a) * 0.35,
          (0.6 + i * 0.13) * power,
          (0.6 + i * 0.13) * power,
          1,
          '#d4ffff',
          0.9,
          null,
          owner,
        );
      }
    } else if (['ice', 'frost'].includes(type)) {
      for (let i = 0; i < (type === 'frost' ? 9 : 5); i++) {
        const t = i * 0.38,
          offset = Math.sin(seed + i * 2) * (0.1 + t * 0.1);
        this.emit(
          'ice-crystal',
          'shard',
          null,
          x - ux * t + rx * offset,
          y + Math.cos(seed + i) * 0.15,
          z - uz * t + rz * offset,
          0.18 * power,
          0.7 * power,
          0.2 * power,
          i % 2 ? '#eaffff' : '#63bce8',
          0.92,
          q,
          owner,
        );
      }
      this.emit(
        'ice-spine',
        'shard',
        null,
        x,
        y,
        z,
        0.075 * power,
        0.8 * power,
        0.075 * power,
        '#efffff',
        0.8,
        q,
        owner,
      );
      this.emit(
        'frost-cloud',
        'quad',
        'smoke',
        x - ux,
        y + 0.3,
        z - uz,
        3 * power,
        2 * power,
        1,
        '#c9f8ff',
        0.75,
        null,
        owner,
      );
      this.glow(x, y, z, 2.1 * power, '#87ceff', 0.4, owner);
    } else if (['lightning', 'laser', 'holy-beam'].includes(type)) {
      const travelled = Math.hypot(x - (shot.ox ?? x - ux * 5), z - (shot.oz ?? z - uz * 5)),
        distance = Math.min(type === 'lightning' ? 7 : 18, Math.max(1, travelled)),
        color = type === 'lightning' ? '#6de8ff' : type === 'laser' ? '#f2a9ff' : '#ffdc65';
      let last = new THREE.Vector3(x - ux * distance, y, z - uz * distance);
      for (let i = 1; i <= 9; i++) {
        const t = i / 9,
          jitter = type === 'lightning' ? Math.sin(i * 7 + Math.floor(time * 13) + seed) * 0.33 : 0,
          point = new THREE.Vector3(
            x - ux * distance * (1 - t) + rx * jitter,
            y + jitter * 0.6,
            z - uz * distance * (1 - t) + rz * jitter,
          );
        this.beam(
          'beam-glow',
          last,
          point,
          type === 'lightning' ? 0.11 : 0.23 * power,
          color,
          0.4,
          owner,
        );
        this.beam(
          'beam-core',
          last,
          point,
          type === 'lightning' ? 0.035 : 0.065 * power,
          '#fffde9',
          1,
          owner,
        );
        if (type === 'lightning' && (i === 3 || i === 6)) {
          const a = new THREE.Vector3(point.x + rx * 0.7, point.y + 0.4, point.z + rz * 0.7),
            b = new THREE.Vector3(a.x + ux * 0.6, a.y - 0.25, a.z + uz * 0.6);
          this.beam('electric-forks', point, a, 0.025, '#b6f5ff', 0.8, owner);
          this.beam('electric-forks', a, b, 0.018, '#dfffff', 0.65, owner);
        }
        last = point;
      }
      if (type !== 'lightning')
        this.ribbon(
          'light-lance',
          new THREE.Vector3(x - ux * distance, y, z - uz * distance),
          new THREE.Vector3(x, y, z),
          0.75 * power,
          color,
          0.55,
          owner,
        );
      this.glow(x, y, z, 2.2 * power, color, 0.7, owner);
      for (let i = 0; i < 3; i++) {
        const ring = this.yaw(angle).multiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
        );
        this.emit(
          'beam-ring',
          'ring',
          null,
          x - ux * i * 0.8,
          y,
          z - uz * i * 0.8,
          0.48 * power,
          0.48 * power,
          0.48 * power,
          color,
          0.8,
          ring,
          owner,
        );
      }
    } else if (type === 'missile' || type === 'torpedo') {
      for (const side of type === 'missile' ? [-1, 1] : [0]) {
        const xx = x + rx * side * 0.55,
          zz = z + rz * side * 0.55;
        this.emit('missile-body', 'beam', null, xx, y, zz, 0.21, 1.6, 0.21, '#dce5df', 1, q, owner);
        this.emit(
          'missile-nose',
          'cone',
          null,
          xx + ux * 0.95,
          y,
          zz + uz * 0.95,
          0.23,
          0.55,
          0.23,
          type === 'missile' ? '#ed7447' : '#bdcbe0',
          1,
          q,
          owner,
        );
        for (let i = 0; i < 3; i++) {
          const a = (i * TAU) / 3;
          this.emit(
            'missile-fin',
            'shard',
            null,
            xx - ux * 0.55 + rx * Math.cos(a) * 0.24,
            y + Math.sin(a) * 0.24,
            zz - uz * 0.55 + rz * Math.cos(a) * 0.24,
            0.24,
            0.18,
            0.24,
            '#526675',
            1,
            q,
            owner,
          );
        }
        if (type === 'missile') {
          this.flame(xx - ux * 1, y - 0.2, zz - uz * 1, 0.9, time, seed, true, owner);
          for (let i = 0; i < 4; i++)
            this.emit(
              'missile-smoke',
              'quad',
              'smoke',
              xx - ux * (1 + i * 0.55),
              y + i * 0.08,
              zz - uz * (1 + i * 0.55),
              0.6 + i * 0.28,
              0.6 + i * 0.28,
              1,
              '#adb6bb',
              0.45 - i * 0.08,
              null,
              owner,
            );
        } else
          for (let i = 0; i < 5; i++)
            this.emit(
              'bubbles',
              'quad',
              'bubble',
              xx - ux * (0.6 + i * 0.45),
              y,
              zz - uz * (0.6 + i * 0.45),
              0.25 + i * 0.05,
              0.25 + i * 0.05,
              1,
              '#bffaff',
              0.7,
              null,
              owner,
            );
      }
    } else if (type === 'dark-claw' || type === 'claw') {
      for (let i = 0; i < 3; i++)
        this.emit(
          'flying-claw',
          'slash',
          null,
          x + rx * (i - 1) * 0.22,
          y + (i - 1) * 0.12,
          z + rz * (i - 1) * 0.22,
          1.8,
          1.1,
          1,
          type === 'dark-claw' ? '#ce90ff' : '#ffe6b8',
          0.9,
          this.face(time * 2 - 0.6),
          owner,
        );
      this.glow(x, y, z, 2, type === 'dark-claw' ? '#8644cc' : '#ffd68a', 0.4, owner);
    } else if (type === 'arrow') {
      this.beam(
        'arrow-shaft',
        new THREE.Vector3(x - ux * 1.5, y, z - uz * 1.5),
        new THREE.Vector3(x, y, z),
        0.045,
        '#fff3b6',
        1,
        owner,
      );
      this.emit(
        'arrow-tip',
        'cone',
        null,
        x + ux * 0.18,
        y,
        z + uz * 0.18,
        0.2,
        0.55,
        0.2,
        '#fff8cf',
        1,
        q,
        owner,
      );
      this.glow(x, y, z, 1.8, '#ffe09d', 0.5, owner);
      for (let i = 0; i < 2; i++)
        this.emit(
          'arrow-feather',
          'leaf',
          null,
          x - ux * 1.2 + rx * (i ? -0.13 : 0.13),
          y,
          z - uz * 1.2 + rz * (i ? -0.13 : 0.13),
          0.2,
          0.4,
          1,
          '#f6edcf',
          1,
          this.face(angle + (i ? -0.5 : 0.5)),
          owner,
        );
    } else if (type === 'tornado' || type === 'air') {
      const vertical = type === 'tornado',
        rotation = vertical ? this.yaw(time * 5) : q.clone().multiply(this.yaw(time * 6));
      for (let i = 0; i < 2; i++)
        this.emit(
          'wind-helix',
          'helix',
          null,
          x,
          y - (vertical ? 1 : 0),
          z,
          power * (vertical ? 1 : 0.6),
          power * (vertical ? 1 : 0.6),
          power * (vertical ? 1 : 0.6),
          i ? '#eefad6' : '#9fded8',
          i ? 0.8 : 0.4,
          rotation.clone().multiply(this.yaw(i * Math.PI)),
          owner,
        );
      for (let i = 0; i < 5; i++) {
        const a = time * 7 + i * 1.5;
        this.emit(
          'wind-leaf',
          'leaf',
          null,
          x + Math.cos(a) * 0.7,
          y + Math.sin(a) * 0.6,
          z + Math.sin(a) * 0.7,
          0.1,
          0.25,
          1,
          '#f4f4d7',
          0.7,
          this.face(a),
          owner,
        );
      }
    } else if (type === 'phoenix' || type === 'bats') {
      const bat = type === 'bats';
      for (let i = 0; i < (bat ? 5 : 1); i++) {
        const phase = time * 18 + i,
          xx = x - ux * i * 0.35 + rx * Math.sin(i * 2) * 0.6,
          zz = z - uz * i * 0.35 + rz * Math.sin(i * 2) * 0.6;
        this.emit(
          bat ? 'bats' : 'phoenix',
          '' + (bat ? 'bat' : 'wing'),
          null,
          xx,
          y + Math.cos(phase) * 0.15,
          zz,
          (bat ? 0.45 : 0.95) * power,
          (0.3 + Math.abs(Math.sin(phase)) * 0.45) * power,
          1,
          bat ? '#341b56' : '#ffd68a',
          1,
          this.face(-angle * 0.4),
          owner,
        );
        if (bat) this.glow(xx, y, zz, 1.1, '#ab55e8', 0.35, owner);
        else {
          this.flame(xx - ux * 0.8, y - 0.3, zz - uz * 0.8, 1.3, time, seed, false, owner);
          this.glow(xx, y, zz, 4, '#ff882b', 0.35, owner);
        }
      }
    } else if (type === 'leaf' || type === 'flower' || type === 'spores') {
      const flower = type === 'flower';
      if (type === 'spores') {
        this.emit(
          'spore-cloud',
          'quad',
          'smoke',
          x,
          y,
          z,
          2.4 * power,
          2 * power,
          1,
          '#b8c963',
          0.7,
          null,
          owner,
        );
        for (let i = 0; i < 8; i++) {
          const a = time + i * 2.4;
          this.emit(
            'spores',
            'sphere',
            null,
            x + Math.cos(a) * 0.7,
            y + Math.sin(a * 2) * 0.5,
            z + Math.sin(a) * 0.7,
            0.08,
            0.08,
            0.08,
            i % 2 ? '#e6eab3' : '#b4c65a',
            0.8,
            null,
            owner,
          );
        }
      } else
        for (let i = 0; i < (flower ? 6 : 2); i++) {
          const a = time * 8 + (i * TAU) / 6,
            xx = x + Math.cos(a) * 0.25,
            yy = y + Math.sin(a) * 0.25;
          this.emit(
            'petals',
            'leaf',
            null,
            xx,
            yy,
            z,
            flower ? 0.35 : 0.23,
            flower ? 0.65 : 1.2,
            1,
            flower ? (i % 2 ? '#ffa1dc' : '#ee64a9') : '#a8e868',
            0.95,
            this.face(a),
            owner,
          );
        }
      this.glow(x, y, z, 1.8, flower ? '#fa7bd3' : '#a7e878', 0.3, owner);
    } else if (type === 'sun' || type === 'stars' || type === 'dark-orb' || type.includes('fist')) {
      const dark = type === 'dark-orb',
        sun = type === 'sun',
        color = dark ? '#a259e6' : sun ? '#ff8f25' : type === 'beast-fist' ? '#ffc06a' : '#ffeb9a',
        size = (sun ? 1.05 : dark ? 0.45 : 0.55) * power;
      this.emit(
        type.includes('fist') ? 'fists' : sun ? 'solar-body' : 'energy-body',
        type.includes('fist') ? 'fist' : 'sphere',
        sun ? 'sun' : null,
        x,
        y,
        z,
        size,
        size,
        size,
        dark ? '#1b1233' : sun ? '#ffffff' : '#fff6c9',
        1,
        this.yaw(time),
        owner,
      );
      this.glow(x, y, z, size * 5, color, 0.55, owner);
      if (sun || dark) {
        for (let arc = 0; arc < 3; arc++) {
          const tilt = arc * 1.1 + time * (dark ? -1 : 1),
            radius = size * (1.35 + arc * 0.12);
          let previous = null;
          for (let j = 0; j <= 8; j++) {
            const a = tilt + (j / 8) * Math.PI * 1.25,
              point = new THREE.Vector3(
                x + Math.cos(a) * radius,
                y + Math.sin(a) * radius * Math.sin(tilt),
                z + Math.sin(a) * radius * Math.cos(tilt),
              );
            if (previous)
              this.beam(
                'orb-filaments',
                previous,
                point,
                sun ? 0.022 : 0.015,
                sun ? '#ffe3a1' : '#bc6fff',
                0.65,
                owner,
              );
            previous = point;
          }
        }
      }
      for (let i = 0; i < (type === 'stars' ? 7 : 5); i++) {
        const a = time * (dark ? -4 : 3) + (i * TAU) / (type === 'stars' ? 7 : 5),
          xx = x + Math.cos(a) * size * 1.35,
          zz = z + Math.sin(a) * size * 1.35;
        if (sun) this.flame(xx, y - size * 0.5, zz, 0.7, time, seed + i, false, owner, 0.75);
        else
          this.emit(
            'energy-orbit',
            'shard',
            null,
            xx,
            y + Math.sin(a * 2) * 0.3,
            zz,
            0.1,
            0.27,
            0.1,
            dark ? '#d49dff' : '#fff7c6',
            0.9,
            this.face(a),
            owner,
          );
      }
    }
  }
  impact(effect, s, time) {
    this.shaderTime.value = time;
    const skill = window.SkillSystem.skills[effect.skillId],
      type = skill?.visual || (effect.kind === 'slash' ? 'claw' : null);
    if (!type || type === 'support') return false;
    if (!['burst', 'slash', 'cast'].includes(effect.kind)) return false;
    const owner = effect.enemy ? 'enemy' : 'player',
      life = Math.max(0, effect.life / effect.maxLife),
      t = 1 - life,
      x = effect.x,
      z = effect.z,
      ground = window.DigibonkCore.heightAt(x, z, s.mapSeed),
      y = ground + 1,
      seed = effect.id * 7,
      size = effect.size || 1,
      dx = effect.dx || 1,
      dz = effect.dz || 0,
      angle = Math.atan2(dx, dz);
    cinematicAttack(
      this,
      skill,
      effect,
      s,
      time,
      owner,
      effect.kind === 'cast' ? 'cast' : 'impact',
    );
    if (skill?.nextOrder)
      return drawNextOrderVFX(
        this,
        skill,
        effect,
        s,
        time,
        owner,
        effect.kind === 'cast' ? 'cast' : 'impact',
      );
    if (type === 'lightning' && Number.isFinite(effect.fromX))
      this.beam(
        'chain-conduction',
        new THREE.Vector3(effect.fromX, ground + 1, effect.fromZ),
        new THREE.Vector3(x, y, z),
        0.045,
        '#b6f8ff',
        life,
        owner,
      );
    this.accent(effect, s, time, type, owner);
    if (effect.kind === 'cast') {
      const color = skill.color || '#fff2ba';
      this.glow(x, y + 0.4, z, 0.5 + t * 1.3, color, life * 0.65, owner);
      if (type === 'sun' || type === 'stars')
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6 + time * 3,
            r = 1.5 * life;
          this.emit(
            'charge',
            'shard',
            null,
            x + Math.cos(a) * r,
            y + t,
            z + Math.sin(a) * r,
            0.07,
            0.17,
            0.07,
            '#fff3b9',
            life,
            null,
            owner,
          );
        }
      return true;
    }
    if (type === 'wave') {
      const radius = effect.radius || Math.max(1.8, size),
        n = effect.radius ? 9 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i * TAU) / n,
          r = 0.25 + t * radius * 0.8;
        this.wave(
          x + Math.sin(a) * r,
          ground + 0.08,
          z + Math.cos(a) * r,
          (effect.radius ? 1.1 : 0.55) + size * 0.12,
          a,
          time,
          owner,
          life,
          0.35 + Math.min(3, size) * 0.15,
        );
      }
      return true;
    }
    if (['flame', 'blue-flame', 'inferno', 'sun', 'phoenix', 'missile'].includes(type)) {
      const cold = type === 'blue-flame',
        sun = type === 'sun',
        radius = (sun ? 3 : 1.8) * (0.3 + t) * Math.min(1.5, size);
      this.glow(x, y, z, radius * 4, cold ? '#58aeff' : '#ff9636', life * 0.65, owner);
      for (let i = 0; i < (sun ? 14 : 9); i++) {
        const a = i * 2.3999 + seed,
          r = radius * Math.sqrt(rand(i + seed)),
          xx = x + Math.cos(a) * r,
          zz = z + Math.sin(a) * r;
        this.flame(
          xx,
          ground + Math.sin(t * Math.PI) * (1 + rand(i + seed + 2)),
          zz,
          (0.7 + life) * Math.min(1.5, size),
          time,
          seed + i,
          cold,
          owner,
          life,
        );
        if (i < 5)
          this.emit(
            'explosion-cells',
            'sphere',
            'sun',
            xx,
            ground + 0.5 + Math.sin(t * Math.PI) * 1.3,
            zz,
            (0.3 + life * 0.7) * size,
            (0.3 + life * 0.7) * size,
            (0.3 + life * 0.7) * size,
            cold ? '#a7ddff' : '#ffe1a0',
            life * 0.65,
            this.yaw(time + i),
            owner,
          );
        this.emit(
          'blast-smoke',
          'quad',
          'smoke',
          xx,
          ground + 1 + t * 2,
          zz,
          0.5 + t * 2,
          0.5 + t * 2,
          1,
          '#606277',
          life * 0.45,
          null,
          owner,
        );
      }
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12;
        this.emit(
          'embers',
          'shard',
          null,
          x + Math.cos(a) * t * 4,
          y + Math.sin(t * Math.PI) * (1 + rand(i + seed) * 2),
          z + Math.sin(a) * t * 4,
          0.045,
          0.12,
          0.045,
          cold ? '#aeedff' : '#ffdf82',
          life,
          null,
          owner,
        );
      }
      return true;
    }
    if (['jet', 'torpedo', 'bubble'].includes(type)) {
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4 + seed,
          r = t * (1.3 + rand(i + seed) * 2);
        this.emit(
          'water-splash',
          'shard',
          null,
          x + Math.cos(a) * r,
          ground + 0.3 + Math.sin(t * Math.PI) * (1 + rand(i + seed + 2) * 2),
          z + Math.sin(a) * r,
          0.08,
          0.3 * life,
          0.08,
          '#beffff',
          life,
          null,
          owner,
        );
        if (i % 3 === 0)
          this.emit(
            'bubbles',
            'quad',
            'bubble',
            x + Math.cos(a) * r,
            y + t,
            z + Math.sin(a) * r,
            0.4 * life,
            0.4 * life,
            1,
            '#c3ffff',
            life,
            null,
            owner,
          );
      }
      return true;
    }
    if (type === 'claw' || type === 'dark-claw') {
      const dark = type === 'dark-claw';
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 0.32;
        this.emit(
          'claw-slash',
          'slash',
          null,
          x + offset,
          y + offset * 0.6,
          z,
          2.6 * (0.6 + t),
          1.8,
          1,
          dark ? '#ca8aff' : '#ffeac1',
          life,
          this.face(-0.65 + t * 1.2),
          owner,
        );
      }
      this.glow(x, y, z, 1.8, dark ? '#9c43e6' : '#ffe0a1', life * 0.3, owner);
      return true;
    }
    if (type === 'ice' || type === 'frost') {
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + seed,
          r = t * 2.4;
        this.emit(
          'ice-crystal',
          'shard',
          null,
          x + Math.cos(a) * r,
          ground + 0.5 + Math.sin(t * Math.PI) * (1 + rand(i + seed) * 2),
          z + Math.sin(a) * r,
          0.15 * life,
          (0.6 + rand(i + seed)) * life,
          0.15 * life,
          i % 2 ? '#dcffff' : '#77c4ef',
          life,
          this.face(a + t * 3),
          owner,
        );
      }
      this.emit(
        'frost-cloud',
        'quad',
        'smoke',
        x,
        y + t,
        z,
        3 + t * 2,
        2 + t,
        1,
        '#b4eaff',
        life * 0.65,
        null,
        owner,
      );
      return true;
    }
    if (type === 'lightning') {
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7 + seed,
          r = 2 * (0.3 + t);
        let from = new THREE.Vector3(x, y, z);
        for (let j = 1; j <= 3; j++) {
          const point = new THREE.Vector3(
            x + (Math.cos(a) * r * j) / 3,
            ground + 0.2 + Math.sin(j * 3 + time * 20) * 0.25,
            z + (Math.sin(a) * r * j) / 3,
          );
          this.beam('electric-impact', from, point, 0.035, '#b6f8ff', life, owner);
          from = point;
        }
      }
      this.glow(x, y, z, 4, '#72dfff', life * 0.65, owner);
      return true;
    }
    if (type === 'flower' || type === 'leaf' || type === 'spores') {
      for (let i = 0; i < 13; i++) {
        const a = i * 2.4 + seed,
          r = t * 3;
        this.emit(
          'petals',
          'leaf',
          null,
          x + Math.cos(a) * r,
          y + Math.sin(t * Math.PI) * (1 + rand(i + seed)),
          z + Math.sin(a) * r,
          0.22 * life,
          0.5 * life,
          1,
          type === 'flower' ? (i % 2 ? '#ffaddf' : '#e562b2') : '#b7dc75',
          life,
          this.face(a + time * 2),
          owner,
        );
      }
      return true;
    }
    if (['dark-orb', 'bats'].includes(type)) {
      this.glow(x, y, z, 5 * t + 1, '#a75de0', life * 0.65, owner);
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        this.emit(
          'bats',
          'bat',
          null,
          x + Math.cos(a) * t * 3,
          y + t,
          z + Math.sin(a) * t * 3,
          0.35 * life,
          0.3 * life,
          1,
          '#552a73',
          life,
          this.face(a),
          owner,
        );
      }
      return true;
    }
    // Holy light and mechanical beams leave short directional rays, not generic explosions.
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6,
        r = (0.4 + t * 2) * Math.min(size, 1.6),
        end = new THREE.Vector3(x + Math.cos(a) * r, y + Math.sin(a) * r, z);
      this.beam(
        'radiant-impact',
        new THREE.Vector3(x, y, z),
        end,
        0.045,
        skill.color || '#fff4c1',
        life,
        owner,
      );
    }
    this.glow(x, y, z, 3 * (0.3 + t), skill.color || '#fff4c1', life * 0.6, owner);
    return true;
  }
  finish() {
    for (const key of this.trails.keys()) if (!this.trailKeys.has(key)) this.trails.delete(key);
    for (const b of this.batches.values()) {
      b.mesh.count = b.count;
      b.mesh.visible = b.count > 0;
      if (b.count) {
        b.mesh.instanceMatrix.needsUpdate = true;
        b.mesh.instanceColor.needsUpdate = true;
        b.alpha.needsUpdate = true;
      }
    }
  }
}
