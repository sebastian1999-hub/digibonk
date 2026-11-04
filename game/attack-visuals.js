import { drawAttack } from './attack-choreography.js';
import { attackTexture } from './attack-textures.js';
import { warmStatusVisuals } from './status-visuals.js';
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
    if (kind.startsWith('fx-')) {
      const texture = attackTexture(kind);
      this.textures.set(kind, texture);
      return texture;
    }
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
        ...(solid ? { shininess: 45, specular: '#56758a', flatShading: true } : {}),
        color: solid ? '#929292' : '#ffffff',
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
    // Instanced batches share an origin, so distance sorting cannot order their layers.
    // Ground marks → opaque silhouettes → smoke → flame → sharp light accents.
    mesh.renderOrder = name.endsWith('-ground')
      ? 3
      : texture === 'fx-smoke'
        ? 4
        : additive
          ? 9
          : texture?.includes('flame')
            ? 8
            : texture
              ? 7
              : 5;
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
      ux = Math.sin(angle),
      uz = Math.cos(angle);
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
      '#72dfff',
      0.9 * alpha,
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
      '#eaffff',
      alpha,
      q,
      owner,
    );
    // A clean curling crest and a few falling drops replace the noisy foam stamps.
    for (let i = 0; i < 7; i++) {
      const side = ((i / 6) * 2 - 1) * width,
        phase = (time * 1.7 + i * 0.17) % 1;
      const xx = x + uz * side + ux * 0.63,
        zz = z - ux * side + uz * 0.63;
      this.emit(
        'wave-drops',
        'quad',
        'fx-droplet',
        xx + ux * phase * 0.4,
        y + (2.55 - phase * 0.75) * height,
        zz + uz * phase * 0.4,
        0.26,
        0.13,
        1,
        '#d9ffff',
        (1 - phase) * alpha,
        this.face(-Math.PI / 2),
        owner,
      );
    }
    this.decal(
      'wave-wake',
      x - ux * 0.5,
      y + 0.05,
      z - uz * 0.5,
      width * 2.2,
      '#88e9ef',
      alpha * 0.32,
      owner,
    );
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
        width = (fire ? 0.2 : water ? 0.14 : 0.1) * power * age;
      this.ribbon(
        'motion-trails',
        new THREE.Vector3(points[i - 1].x, points[i - 1].y, points[i - 1].z),
        new THREE.Vector3(points[i].x, points[i].y, points[i].z),
        width,
        color,
        age * 0.35,
        owner,
      );
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
        for (const life of [0.95, 0.5, 0.15])
          for (const kind of ['cast', 'burst', 'slash', 'heal'])
            this.impact(
              { id: id--, skillId: skill.id, kind, x: 0, z: 0, life, maxLife: 1, size: 1.2 },
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
      window.SkillSystem.skills[shot.dark ? 'dark-pulse' : 'bubble'];
    if (skill.kind !== 'damage') return;
    const y = window.DigibonkCore.heightAt(shot.x, shot.z, s.mapSeed) + (shot.height ?? 1.2);
    this.trail(
      shot,
      s,
      time,
      owner,
      skill.visual,
      shot.x,
      y,
      shot.z,
      1 + Math.max(0, skill.stage) * 0.14,
    );
    drawAttack(this, skill, shot, s, time, owner, 'flight');
  }
  impact(effect, s, time) {
    this.shaderTime.value = time;
    const skill =
      window.SkillSystem.skills[effect.skillId] ||
      (effect.kind === 'slash' ? window.SkillSystem.skills.claw : null);
    if (!skill) return false;
    if (!['cast', 'burst', 'slash', 'heal'].includes(effect.kind)) {
      // Damage text still renders, but its old seven-orb burst duplicated every hit.
      return effect.kind === 'hit';
    }
    return drawAttack(
      this,
      skill,
      effect,
      s,
      time,
      effect.enemy ? 'enemy' : 'player',
      effect.kind === 'cast' ? 'cast' : 'impact',
    );
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
