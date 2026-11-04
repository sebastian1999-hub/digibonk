import { evolutionHeight } from './evolution-scale.js';
import { drawEnemyStatuses } from './status-visuals.js';
import { AttackVisuals } from './attack-visuals.js';
import { WorldVisuals } from './world-visuals.js';
import * as THREE from './vendor/three.module.js';
const C = window.DigibonkCore;
const COLORS = {
  fire: 0xf2a35b,
  ice: 0x9eddef,
  holy: 0xffe69c,
  wind: 0xdcebb0,
  water: 0x75c8d6,
  nature: 0xa9ce75,
  dark: 0xaf8ccb,
  machine: 0xafe0ce,
  beast: 0xe2bd7b,
  neutral: 0xbde4d4,
};
class Atlases {
  constructor() {
    this.entries = new Map();
    this.crops = new Map();
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }
  entry(name, egg = false) {
    const key = (egg ? 'egg:' : '') + name;
    if (this.entries.has(key)) return this.entries.get(key);
    const spec = egg ? window.EGG_SPRITES[name] : window.SPRITE_DATA[name];
    if (!spec) return null;
    const image = new Image(),
      entry = { spec, image, texture: null };
    this.entries.set(key, entry);
    entry.ready = new Promise((resolve, reject) => {
      image.onerror = () => {
        this.entries.delete(key);
        reject(new Error('No se pudo cargar ' + name));
      };
      image.onload = () => {
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        entry.texture = texture;
        resolve(entry);
      };
    });
    image.src = spec.sheet;
    return entry;
  }
  frame(name, action, time, egg = false) {
    const entry = this.entry(name, egg);
    if (!entry?.texture) return null;
    const frames = entry.spec.actions[action] || entry.spec.actions.idle;
    if (!frames?.length) return null;
    const duration = frames.reduce((n, f) => n + (f.duration || 0.12), 0);
    let t = ((time % duration) + duration) % duration,
      frame = frames.at(-1);
    for (const f of frames) {
      t -= f.duration || 0.12;
      if (t < 0) {
        frame = f;
        break;
      }
    }
    const key =
      (egg ? 'egg:' : '') + name + ':' + frame.x + ':' + frame.y + ':' + frame.w + ':' + frame.h;
    let crop = frame.bounds || this.crops.get(key);
    if (!crop) {
      this.canvas.width = frame.w;
      this.canvas.height = frame.h;
      this.ctx.clearRect(0, 0, frame.w, frame.h);
      this.ctx.drawImage(entry.image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
      const data = this.ctx.getImageData(0, 0, frame.w, frame.h).data;
      let left = frame.w,
        right = -1,
        top = frame.h,
        bottom = -1;
      for (let y = 0; y < frame.h; y++)
        for (let x = 0; x < frame.w; x++)
          if (data[(y * frame.w + x) * 4 + 3] > 30) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      crop =
        right < 0
          ? { x: 0, y: 0, w: frame.w, h: frame.h }
          : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
      this.crops.set(key, crop);
    }
    const iw = entry.image.naturalWidth,
      ih = entry.image.naturalHeight;
    return {
      texture: entry.texture,
      u0: (frame.x + crop.x) / iw,
      u1: (frame.x + crop.x + crop.w) / iw,
      v0: 1 - (frame.y + crop.y + crop.h) / ih,
      v1: 1 - (frame.y + crop.y) / ih,
      w: crop.w / frame.h,
      h: crop.h / frame.h,
      referenceHeight: entry.spec.referenceHeight,
    };
  }
}
export class Renderer3D {
  constructor(canvas, fxCanvas) {
    this.canvas = canvas;
    this.fxCanvas = fxCanvas;
    this.fxCtx = fxCanvas.getContext('2d');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#aec8bd');
    this.scene.fog = new THREE.FogExp2('#aec8bd', 0.0085);
    this.camera = new THREE.PerspectiveCamera(47, 1, 0.1, 650);
    this.cameraYaw = 0.68;
    this.targetYaw = 0.68;
    this.follow = new THREE.Vector3();
    this.atlases = new Atlases();
    this.units = new Map();
    this.unitPool = [];
    this.visuals = new Map();
    this.pools = new Map();
    this.geo = {
      sphere: new THREE.IcosahedronGeometry(1, 1),
      gem: new THREE.OctahedronGeometry(1),
      cone: new THREE.ConeGeometry(0.45, 1.5, 5),
      ring: new THREE.TorusGeometry(1, 0.07, 5, 32),
      beam: new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
      cube: new THREE.BoxGeometry(1, 1, 1),
    };
    this.shadowTexture = this.makeShadow();
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
      toneMapped: false,
    });
    this.scene.add(new THREE.HemisphereLight(0xe6f2d7, 0x526d61, 2.3));
    const sun = new THREE.DirectionalLight(0xffe4b1, 3.1);
    sun.position.set(-100, 260, 140);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -300;
    sun.shadow.camera.right = sun.shadow.camera.top = 300;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 800;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    this.sun = sun;
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.pointLight = new THREE.PointLight(0x96d8ce, 3, 13, 2);
    this.scene.add(this.pointLight);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.worldEffects = new WorldVisuals(this);
    this.attackEffects = new AttackVisuals(this);
    document.body.dataset.renderer = 'webgl2';
  }
  makeShadow() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d'),
      g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(25,49,36,.65)');
    g.addColorStop(0.6, 'rgba(25,49,36,.3)');
    g.addColorStop(1, 'rgba(25,49,36,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.fxCanvas.width = Math.round(this.width * (devicePixelRatio || 1));
    this.fxCanvas.height = Math.round(this.height * (devicePixelRatio || 1));
    this.fxCtx.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
  }
  material(color, options = {}) {
    return new THREE.MeshLambertMaterial({ color, flatShading: !options.smooth, ...options });
  }
  mesh(geometry, material, x, y, z, scale = null) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    this.world.add(m);
    return m;
  }
  build(seed) {
    for (const step of this.buildSteps(seed)) {
    }
  }
  *buildSteps(seed) {
    if (this.seed === seed) return;
    this.map = C.mapFor(seed);
    const materials = new Set(),
      geometries = new Set();
    this.world.traverse((o) => {
      if (o.isMesh) {
        if (o.geometry && !Object.values(this.geo).includes(o.geometry)) geometries.add(o.geometry);
        if (o.material) materials.add(o.material);
      }
    });
    this.worldEffects.clear();
    this.worldEffects.key = '';
    this.world.clear();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    yield 0.08;
    const terrain = new THREE.PlaneGeometry(C.WORLD * 2, C.WORLD * 2, 220, 220);
    terrain.rotateX(-Math.PI / 2);
    const vertices = terrain.attributes.position,
      colors = [],
      terrainColor = new THREE.Color(),
      terrainCool = new THREE.Color('#547f77'),
      terrainGold = new THREE.Color('#a7a26a');
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        z = vertices.getZ(i),
        h = C.heightAt(x, z, seed);
      vertices.setY(i, h);
      const color = terrainColor.set('#779856'),
        cool = terrainCool,
        gold = terrainGold;
      color.lerp(cool, Math.max(0, Math.min(1, (x - 12) / 85)));
      color.lerp(gold, Math.max(0, Math.min(1, (-z - 15) / 90)));
      color.multiplyScalar(
        0.91 +
          Math.sin(x * 0.17 + Math.cos(z * 0.12)) * 0.035 +
          (C.hash(Math.floor(x / 3), Math.floor(z / 3), seed) % 70) / 1000,
      );
      colors.push(color.r, color.g, color.b);
      if (i % 4096 === 0) yield 0.1 + (i / vertices.count) * 0.25;
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    this.terrain = new THREE.Mesh(
      terrain,
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true,
        map: this.groundTexture(),
      }),
    );
    this.terrain.receiveShadow = true;
    this.world.add(this.terrain);
    yield 0.36;
    const ocean = this.mesh(
      new THREE.PlaneGeometry(1000, 1000),
      this.material('#7caaa7'),
      0,
      -8,
      0,
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.castShadow = false;
    this.water = [];
    for (const pond of C.ponds) {
      const water = this.mesh(
        new THREE.CircleGeometry(pond.r, 48),
        this.material('#72b6b7', { transparent: true, opacity: 0.85 }),
        pond.x,
        0.02,
        pond.z,
      );
      water.rotation.x = -Math.PI / 2;
      water.castShadow = false;
      this.water.push(water);
    }
    const edgeMaterial = this.material('#677f66'),
      postMaterial = this.material('#c2ba96'),
      borderDummy = new THREE.Object3D(),
      walls = [],
      posts = [],
      rails = [];
    const borderPart = (list, x, y, z, scale) => {
      borderDummy.position.set(x, y, z);
      borderDummy.scale.set(...scale);
      borderDummy.updateMatrix();
      list.push(borderDummy.matrix.clone());
    };
    for (let side = 0; side < 4; side++)
      for (let k = -C.WORLD; k < C.WORLD; k += 5) {
        const x = side < 2 ? k : side === 2 ? -C.WORLD : C.WORLD,
          z = side < 2 ? (side === 0 ? -C.WORLD : C.WORLD) : k,
          h = C.heightAt(x, z, seed);
        borderPart(
          walls,
          x,
          h / 2 - 3,
          z,
          side < 2 ? [5, Math.max(1, h + 6), 2] : [2, Math.max(1, h + 6), 5],
        );
        const px = side < 2 ? k : side === 2 ? -C.WORLD + 2 : C.WORLD - 2,
          pz = side < 2 ? (side === 0 ? -C.WORLD + 2 : C.WORLD - 2) : k;
        borderPart(posts, px, h + 0.9, pz, [0.35, 1.8, 0.35]);
        borderPart(
          rails,
          side < 2 ? px + 2.5 : px,
          h + 1.1,
          side < 2 ? pz : pz + 2.5,
          side < 2 ? [5, 0.14, 0.16] : [0.16, 0.14, 5],
        );
      }
    for (const [parts, material] of [
      [walls, edgeMaterial],
      [posts, postMaterial],
      [rails, postMaterial],
    ]) {
      const mesh = new THREE.InstancedMesh(this.geo.cube, material, parts.length);
      for (let i = 0; i < parts.length; i++) mesh.setMatrixAt(i, parts[i]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.world.add(mesh);
    }
    yield 0.44;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.35, 3, 6),
      crownGeo = new THREE.ConeGeometry(1.8, 4, 7),
      rockGeo = new THREE.DodecahedronGeometry(1),
      crystalGeo = new THREE.ConeGeometry(0.75, 2.8, 5),
      trunks = [],
      crowns = [],
      rocks = [],
      crystals = [];
    for (const o of this.map.obstacles) {
      if (o.type === 'tree') {
        trunks.push(o);
        crowns.push(o);
      } else if (o.type === 'rock') rocks.push(o);
      else if (o.type === 'crystal') crystals.push(o);
    }
    const dummy = new THREE.Object3D();
    const instance = (list, geo, color, place) => {
      const mesh = new THREE.InstancedMesh(
        geo,
        this.material(color, { flatShading: geo.type !== 'SphereGeometry' }),
        list.length,
      );
      for (let i = 0; i < list.length; i++) {
        dummy.position.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        place(dummy, list[i], i);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const tint = new THREE.Color(color);
        tint.multiplyScalar(0.85 + (C.hash(i, 7, seed) % 30) / 100);
        mesh.setColorAt(i, tint);
      }
      mesh.userData.obstacleType = list === rocks ? 'rock' : null;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.world.add(mesh);
    };
    instance(trunks, trunkGeo, '#817458', (d, o) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 1.4 * o.size, o.z);
      d.scale.set(o.size, o.size, o.size);
    });
    instance(crowns, crownGeo, '#567f65', (d, o) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 3.3 * o.size, o.z);
      d.scale.set(o.size, o.size, o.size);
    });
    instance(crowns, crownGeo, '#74976e', (d, o) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 4.5 * o.size, o.z);
      d.scale.set(o.size * 0.76, o.size * 0.85, o.size * 0.76);
    });
    instance(rocks, rockGeo, '#a1af9e', (d, o, i) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + o.size * 0.6, o.z);
      d.rotation.set(0.2, i, 0.1);
      d.scale.set(o.size * 1.4, o.size, o.size);
    });
    instance(crystals, crystalGeo, '#8fc8ca', (d, o) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 1.2 * o.size, o.z);
      d.scale.set(o.size, o.size, o.size);
    });

    yield 0.52;
    this.poiMeshes = new Map();
    for (const poi of this.map.pois) {
      const h = C.heightAt(poi.x, poi.z, seed);
      const group = new THREE.Group();
      group.position.set(poi.x, h, poi.z);
      this.world.add(group);
      const add = (geo, color, x, y, z, scale) => {
        const m = new THREE.Mesh(geo, this.material(color));
        m.position.set(x, y, z);
        if (scale) m.scale.set(...scale);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        return m;
      };
      const ring = add(
        this.geo.ring,
        poi.type === 'fire' ? '#e9b66f' : poi.type === 'altar' ? '#8dd4ce' : '#d4bd77',
        0,
        0.06,
        0,
        [2.6, 2.6, 2.6],
      );
      ring.rotation.x = -Math.PI / 2;
      if (poi.type === 'chest') {
        add(this.geo.cube, '#947448', 0, 0.42, 0, [1.5, 0.8, 1]);
        add(this.geo.cube, '#e7bf68', 0, 0.9, 0, [1.55, 0.2, 1.04]);
        add(this.geo.cube, '#edcf81', 0, 0.65, 0.53, [0.2, 0.4, 0.1]);
      } else if (poi.type === 'fire') {
        for (let i = 0; i < 7; i++) {
          const a = (i * Math.PI * 2) / 7;
          add(rockGeo, '#a5ac94', Math.cos(a) * 1.2, 0.28, Math.sin(a) * 1.2, [0.45, 0.35, 0.4]);
        }
        add(crystalGeo, '#e6a96a', 0, 0.8, 0, [0.6, 0.7, 0.6]);
        add(crystalGeo, '#f7d88c', 0, 1, 0, [0.35, 0.6, 0.35]);
      } else if (poi.type === 'altar') {
        for (const side of [-1, 1]) add(this.geo.cube, '#b9c4ad', side * 1.5, 2, 0, [0.6, 4, 0.7]);
        add(this.geo.cube, '#d8d9bb', 0, 4.2, 0, [3.9, 0.6, 1]);
        add(this.geo.gem, '#9bdbd6', 0, 2.3, 0, [0.55, 0.85, 0.55]);
      } else {
        for (const side of [-1, 1])
          add(trunkGeo, '#9d9167', side * 1.9, 1.7, -0.8, [0.5, 1.2, 0.5]);
        const roof = add(new THREE.ConeGeometry(3, 1.3, 4), '#708ba8', 0, 3.6, -0.8);
        roof.rotation.y = Math.PI / 4;
        add(this.geo.cube, '#c4b28a', 0, 0.6, -0.8, [3, 1.2, 1.2]);
      }
      this.poiMeshes.set(poi.id, group);
    }
    // Flower tufts give the terrain detail without adding collision objects.
    yield 0.62;
    const flowers = [];
    for (let i = 0; i < 1800; i++) {
      const x = (C.hash(i, 3, seed) % ((C.WORLD * 2 - 10) * 100)) / 100 - C.WORLD + 5,
        z = (C.hash(i, 8, seed) % ((C.WORLD * 2 - 10) * 100)) / 100 - C.WORLD + 5;
      if (C.walkable(x, z, seed, 0.1)) flowers.push({ x, z });
    }
    instance(flowers, new THREE.ConeGeometry(0.13, 0.6, 3), '#d5d4a4', (d, o, i) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 0.2, o.z);
      d.rotation.y = i;
    });
    yield 0.72;
    this.decorate(seed, instance);
    this.seed = seed;
    yield 0.8;
  }
  async prepare(run, progress = () => {}) {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (const value of this.buildSteps(run?.s.mapSeed ?? 83461)) {
      progress(value, 'Preparando escenario');
      await frame();
    }
    const s = run?.s;
    this.follow.set(
      s?.player.x || 0,
      C.heightAt(s?.player.x || 0, s?.player.z || 0, this.seed) + 1,
      s?.player.z || 0,
    );
    if (!this.assetsReady) {
      const entries = [
        ...Object.keys(window.SPRITE_DATA).map((name) => [name, false]),
        ...Object.keys(window.EGG_SPRITES).map((name) => [name, true]),
      ];
      let next = 0,
        done = 0;
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, async () => {
          while (next < entries.length) {
            const [name, egg] = entries[next++],
              entry = this.atlases.entry(name, egg);
            await entry?.ready;
            if (entry?.texture) {
              this.renderer.initTexture(entry.texture);
              if (entry.spec?.actions)
                for (const [action, frames] of Object.entries(entry.spec.actions)) {
                  let at = 0;
                  for (const f of frames) {
                    this.atlases.frame(name, action, at + 0.001, egg);
                    at += f.duration || 0.12;
                  }
                  await frame();
                }
            }
            done++;
            progress(0.8 + (done / entries.length) * 0.1, 'Cargando Digimon');
            if (done % 6 === 0) await frame();
          }
        }),
      );
      const failed = results.find((result) => result.status === 'rejected');
      if (failed) throw failed.reason;
      this.assetsReady = true;
    }
    progress(0.92, 'Preparando gráficos');
    this.render(run, 0, { menu: !run, submit: false });
    if (this.attackEffects?.warmupAsync)
      await this.attackEffects.warmupAsync(s || { mapSeed: this.seed }, frame);
    await frame();
    await this.renderer.compileAsync(this.scene, this.camera);
    this.render(run, 0, { menu: !run });
    await frame();
    this.render(run, 0, { menu: !run });
    await this.waitForGPU(frame);
    progress(1, 'Todo listo');
    await frame();
  }
  async waitForGPU(frame) {
    const gl = this.renderer.getContext(),
      fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence) throw new Error('No se pudo preparar el escenario en la GPU');
    gl.flush();
    const started = performance.now();
    try {
      while (true) {
        const status = gl.clientWaitSync(fence, 0, 0);
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) return;
        if (status === gl.WAIT_FAILED || performance.now() - started > 15000)
          throw new Error('La GPU no terminó de preparar el escenario');
        await frame();
      }
    } finally {
      gl.deleteSync(fence);
    }
  }
  groundTexture() {
    if (this.grassTexture) return this.grassTexture;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e1dfbf';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1500; i++) {
      const x = C.hash(i, 1, 43) % 128,
        y = C.hash(i, 2, 43) % 128;
      ctx.fillStyle = i % 3 ? '#cbcba344' : '#f8f3d34a';
      ctx.fillRect(x, y, 1, 2 + (i % 3));
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(32, 32);
    t.anisotropy = 4;
    this.grassTexture = t;
    return t;
  }
  decorate(seed, instance) {
    const stone = this.material('#8c9b83'),
      gold = this.material('#bdba86'),
      pale = this.material('#d1d3b1');
    // Buried paving around the starting clearing and sanctuaries follows the terrain.
    const centers = [
      { x: 0, z: 0, r: 5.5 },
      ...this.map.pois.filter((p) => p.type === 'altar').map((p) => ({ ...p, r: 4.5 })),
    ];
    for (const center of centers) {
      for (let i = 0; i < 18; i++) {
        const a = (i * Math.PI * 2) / 18,
          x = center.x + Math.cos(a) * center.r,
          z = center.z + Math.sin(a) * center.r,
          m = this.mesh(
            this.geo.cube,
            i % 3 ? stone : pale,
            x,
            C.heightAt(x, z, seed) + 0.025,
            z,
            [0.9, 0.12, 0.65],
          );
        m.rotation.y = -a;
      }
      const m = this.mesh(
        new THREE.RingGeometry(center.r - 1.1, center.r - 1.04, 64),
        this.material('#c5bc83', { side: THREE.DoubleSide }),
        center.x,
        C.heightAt(center.x, center.z, seed) + 0.07,
        center.z,
      );
      m.rotation.x = -Math.PI / 2;
    }
    // Shore stones and reeds are decorative and have no hidden collision footprint.
    const shore = [],
      reeds = [];
    for (const pond of C.ponds) {
      for (let i = 0; i < 65; i++) {
        const a = (i * Math.PI * 2) / 65,
          r = pond.r + 1.2 + (C.hash(i, 9, seed) % 100) / 160,
          x = pond.x + Math.cos(a) * r,
          z = pond.z + Math.sin(a) * r;
        shore.push({ x, z, size: 0.25 + (i % 4) * 0.1 });
        if (i % 3 === 0)
          for (let j = 0; j < 3; j++) reeds.push({ x: x + j * 0.18, z: z + j * 0.12 });
      }
      for (let i = 0; i < 3; i++) {
        const ring = this.mesh(
          new THREE.RingGeometry(pond.r * (0.43 + i * 0.19), pond.r * (0.43 + i * 0.19) + 0.06, 64),
          this.material('#b4d8cd', { transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
          pond.x,
          0.045,
          pond.z,
        );
        ring.rotation.x = -Math.PI / 2;
        ring.castShadow = false;
      }
    }
    instance(shore, new THREE.DodecahedronGeometry(1), '#b3b49a', (d, o) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 0.12, o.z);
      d.scale.set(o.size * 1.4, o.size * 0.65, o.size);
    });
    instance(reeds, new THREE.ConeGeometry(0.07, 1.5, 4), '#627f48', (d, o, i) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 0.55, o.z);
      d.rotation.z = Math.sin(i) * 0.12;
    });
    const patches = [];
    for (let i = 0; i < 5600; i++) {
      const x = (C.hash(i, 15, seed) % ((C.WORLD * 2 - 12) * 100)) / 100 - C.WORLD + 6,
        z = (C.hash(i, 16, seed) % ((C.WORLD * 2 - 12) * 100)) / 100 - C.WORLD + 6;
      if (C.walkable(x, z, seed, 0.15)) patches.push({ x, z });
    }
    instance(patches, new THREE.ConeGeometry(0.2, 0.6, 3), '#89a763', (d, o, i) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 0.15, o.z);
      d.rotation.y = i;
      d.scale.set(1, 0.6 + (i % 3) * 0.3, 1);
    });
    const borderFlowers = patches.filter((o, i) => i % 6 === 0);
    instance(borderFlowers, new THREE.IcosahedronGeometry(0.16, 0), '#d9bf81', (d, o) => {
      d.position.set(o.x, C.heightAt(o.x, o.z, seed) + 0.38, o.z);
    });
    // Silhouettes beyond the fence give the island a horizon and distant depth.
    for (let i = 0; i < 22; i++) {
      const a = (i * Math.PI * 2) / 22,
        r = C.WORLD + 55 + (i % 4) * 15,
        m = this.mesh(
          new THREE.ConeGeometry(20 + (i % 3) * 6, 28 + (i % 5) * 8, 5),
          this.material(i % 2 ? '#78938a' : '#8ba296'),
          Math.cos(a) * r,
          -5,
          Math.sin(a) * r,
        );
      m.castShadow = false;
    }
  }
  acquireUnit() {
    let unit = this.unitPool.pop();
    if (unit) return unit;
    const group = new THREE.Group(),
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          transparent: true,
          alphaTest: 0.08,
          depthWrite: true,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      ),
      shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), this.shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.065;
    group.add(shadow, mesh);
    return { group, mesh, shadow };
  }
  unit(key, name, action, x, z, size, time, left = false, options = {}) {
    let unit = this.units.get(key);
    if (!unit) {
      unit = this.acquireUnit();
      this.units.set(key, unit);
      this.scene.add(unit.group);
    }
    unit.keep = true;
    unit.group.position.set(x, C.heightAt(x, z, this.seed), z);
    unit.mesh.rotation.set(0, this.cameraYaw, 0);
    const frame = this.atlases.frame(name, action, time, !!options.egg);
    if (!frame) {
      unit.mesh.visible = false;
      return;
    }
    unit.mesh.visible = true;
    if (unit.mesh.material.map !== frame.texture) {
      unit.mesh.material.map = frame.texture;
      unit.mesh.material.needsUpdate = true;
    }
    unit.mesh.material.color.set(options.hit ? '#ffd1a0' : options.flash ? '#ffffff' : '#ffffff');
    unit.mesh.material.opacity = options.opacity ?? 1;
    const reference = frame.referenceHeight || frame.h,
      scale = size / reference,
      w = frame.w * scale,
      h = frame.h * scale;
    unit.mesh.scale.set(w, h, 1);
    unit.mesh.position.y = h / 2 + (options.jump || 0);
    const uv = unit.mesh.geometry.attributes.uv,
      u0 = left ? frame.u0 : frame.u1,
      u1 = left ? frame.u1 : frame.u0;
    uv.setXY(0, u0, frame.v1);
    uv.setXY(1, u1, frame.v1);
    uv.setXY(2, u0, frame.v0);
    uv.setXY(3, u1, frame.v0);
    uv.needsUpdate = true;
    unit.shadow.scale.setScalar(Math.max(0.55, size / 3) * (options.boss ? 1.15 : 1));
  }
  pooled(key, type, color) {
    let item = this.visuals.get(key);
    if (item) {
      item.keep = true;
      item.category = this.opacityCategory;
      item.mesh.material.opacity = 0.85;
      return item;
    }
    const pool = this.pools.get(type) || [];
    item = pool.pop();
    if (!item) {
      const geom = type.includes('ring')
          ? this.geo.ring
          : type.includes('gem') || type.includes('ice')
            ? this.geo.gem
            : type.includes('fire')
              ? this.geo.sphere
              : type.includes('beam')
                ? this.geo.beam
                : this.geo.sphere,
        material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          toneMapped: false,
        });
      item = { mesh: new THREE.Mesh(geom, material), type };
    }
    item.keep = true;
    item.category = this.opacityCategory;
    item.mesh.material.color.set(color);
    item.mesh.material.opacity = 0.85;
    item.mesh.scale.set(1, 1, 1);
    item.mesh.rotation.set(0, 0, 0);
    this.visuals.set(key, item);
    this.scene.add(item.mesh);
    return item;
  }
  screen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.width,
      y: (-0.5 * v.y + 0.5) * this.height,
      visible: v.z < 1,
    };
  }
  render(run, dt, { menu = false, submit = true } = {}) {
    const s = run?.s,
      p = s?.player || { x: 0, z: 0, stage: -1, species: 'Botamon' },
      seed = s?.mapSeed ?? 83461;
    const switched = this.seed !== seed;
    this.build(seed);
    if (switched) this.follow.set(p.x, C.heightAt(p.x, p.z, seed) + 1, p.z);
    const time = s?.time || performance.now() / 1000;
    this.cameraYaw += (this.targetYaw - this.cameraYaw) * Math.min(1, dt * 7);
    const goal = new THREE.Vector3(p.x, C.heightAt(p.x, p.z, seed) + 1, p.z);
    this.follow.lerp(goal, Math.min(1, dt * 7));
    let dist = menu ? 40 : s?.evolution ? 20 : s?.realm ? 39 : 31;
    const yaw = menu ? 0.63 + Math.sin(performance.now() / 30000) * 0.14 : this.cameraYaw;
    this.camera.position.set(
      this.follow.x + Math.sin(yaw) * dist,
      this.follow.y + (s?.evolution ? 21 : s?.realm ? 39 : 31),
      this.follow.z + Math.cos(yaw) * dist,
    );
    this.camera.lookAt(this.follow.x, this.follow.y + 0.3, this.follow.z);
    this.pointLight.position.set(p.x, goal.y + 3, p.z);
    for (const unit of this.units.values()) unit.keep = false;
    for (const v of this.visuals.values()) v.keep = false;
    this.opacityCategory = null;
    this.fxCtx.clearRect(0, 0, this.width, this.height);
    this.attackEffects.begin();
    this.worldEffects.render(s, time);
    for (const [id, group] of this.poiMeshes) {
      group.visible = !(s?.usedPois || []).includes(id);
      const ring = group.children[0];
      if (ring) ring.rotation.z = time * 0.2;
      const poi = this.map.pois.find((p) => p.id === id);
      if (group.visible && poi.species)
        this.unit(
          'npc-' + id,
          poi.species,
          'idle',
          poi.x,
          poi.z + 1.3,
          evolutionHeight(C.species.get(poi.species)?.stage),
          time,
          true,
        );
    }
    const fx = s?.evolution,
      fromPhase = fx && fx.left > fx.duration * 0.48,
      playerName = s?.hatch > 0 ? s.skin : fromPhase ? fx.from : p.species,
      playerEgg = s?.hatch > 0,
      action = s?.done
        ? 'ko'
        : p.celebrateLeft > 0 && p.action !== 'run'
          ? 'happy'
          : s?.hatch > 0
            ? 'idle'
            : fx
              ? 'shout'
              : s?.time - p.attackAt < 0.55
                ? window.SkillSystem.pose(p.lastSkill)
                : p.action || 'idle',
      left =
        (p.lastDX || 0) * Math.cos(this.cameraYaw) - (p.lastDZ || 0) * Math.sin(this.cameraYaw) < 0,
      jump =
        p.dashLeft > 0
          ? Math.sin((p.dashLeft / 0.32) * Math.PI) * 1.5
          : playerEgg
            ? Math.sin(time * 3) * 0.15
            : 0;
    this.unit(
      'player',
      playerName || 'Botamon',
      action,
      p.x,
      p.z,
      playerEgg ? 1.6 : evolutionHeight(p.stage),
      fx ? (fx.duration - fx.left) * 2 : s?.time - p.attackAt < 0.55 ? s.time - p.attackAt : time,
      left,
      { egg: playerEgg, jump, opacity: p.invulnerable > 0 && Math.floor(time * 18) % 2 ? 0.55 : 1 },
    );
    for (const buddy of s?.buddies || []) {
      const cast = s.time - buddy.attackAt < 0.4;
      this.unit(
        'companion-' + buddy.species,
        buddy.species,
        s.done ? 'happy' : cast ? 'attack2' : buddy.action || 'idle',
        buddy.x,
        buddy.z,
        evolutionHeight(C.species.get(buddy.species)?.stage),
        time,
        buddy.face,
      );
      const ring = this.pooled('companion-marker-' + buddy.species, 'ring', 0x92e6d6).mesh;
      ring.position.set(buddy.x, C.heightAt(buddy.x, buddy.z, seed) + 0.11, buddy.z);
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(0.7);
      ring.material.opacity = 0.65;
    }
    if (s && !s.done && s.hatch <= 0 && !s.evolution) {
      const role = run.style();
      if (role) {
        const at = this.screen(p.x, C.heightAt(p.x, p.z, seed) + 0.55, p.z),
          c = this.fxCtx,
          ready = Math.max(0, Math.min(1, 1 - p.styleCooldown / role.cooldown)),
          w = 54,
          x = at.x - w / 2,
          y = at.y + 20;
        if (at.visible) {
          c.save();
          c.fillStyle = '#12282ff2';
          c.strokeStyle = ready >= 1 ? '#baf1d0' : '#486e79';
          c.lineWidth = 1.5;
          c.beginPath();
          c.roundRect(x - 2, y - 2, w + 4, 10, 4);
          c.fill();
          c.stroke();
          c.fillStyle = ready >= 1 ? '#a7ecc5' : '#88d7ed';
          c.beginPath();
          c.roundRect(x, y, w * ready, 6, 2);
          c.fill();
          c.font = 'bold 9px Segoe UI';
          c.textAlign = 'center';
          c.fillStyle = '#eff6df';
          c.strokeStyle = '#12282f';
          c.lineWidth = 3;
          const text =
            (this.bindings?.label('special') || 'Q') +
            ' · ' +
            (ready >= 1 ? 'LISTA' : Math.ceil(p.styleCooldown) + ' s');
          c.strokeText(text, at.x, y + 21);
          c.fillText(text, at.x, y + 21);
          c.restore();
        }
      }
    }
    for (const e of s?.enemies || []) {
      if (e.tower) continue;
      const left =
        (p.x - e.x) * Math.cos(this.cameraYaw) - (p.z - e.z) * Math.sin(this.cameraYaw) < 0;
      this.unit(
        'enemy-' + e.id,
        e.species,
        e.hit > 0
          ? 'hit'
          : run.enemyStatusBlocked(e)
            ? 'idle'
            : s.time - (e.attackAt ?? -100) < 0.55
              ? window.SkillSystem.pose(e.lastSkill)
              : e.finalBoss && !e.engaged
                ? 'idle'
                : 'run',
        e.x,
        e.z,
        evolutionHeight(e.stage) * 0.9 * (e.finalBoss ? 2.7 : e.boss ? 2 : 1),
        s.time - (e.attackAt ?? -100) < 0.55 ? s.time - e.attackAt : time + e.id * 0.13,
        left,
        { hit: e.hit > 0, boss: e.boss },
      );
      if (e.finalBoss) {
        const aura = this.pooled(
          'devimon-aura',
          'ring',
          e.hp < e.maxHp * 0.5 ? 0xef8ecb : 0xbd8de0,
        ).mesh;
        aura.position.set(e.x, C.heightAt(e.x, e.z, seed) + 0.14, e.z);
        aura.rotation.x = -Math.PI / 2;
        aura.scale.setScalar(4 + Math.sin(time * 2) * 0.18);
        aura.material.opacity = 0.65;
      }
      drawEnemyStatuses(this, e, s, time);
      if (e.boss || e.elite) {
        const q = this.screen(e.x, C.heightAt(e.x, e.z, seed) + (e.boss ? 7 : 4), e.z);
        if (q.visible) {
          this.fxCtx.fillStyle = '#223d39dd';
          this.fxCtx.fillRect(q.x - 28, q.y, 56, 5);
          this.fxCtx.fillStyle = e.boss ? '#e8b565' : '#e6cc8c';
          this.fxCtx.fillRect(q.x - 28, q.y, (56 * e.hp) / e.maxHp, 5);
        }
      }
    }
    this.opacityCategory = 'experience';
    for (const gem of s?.gems || []) {
      const color = gem.heal ? 0xff9986 : gem.value > 15 ? 0xffd165 : 0x32ffff,
        y = C.heightAt(gem.x, gem.z, seed) + 0.8 + Math.sin(time * 3 + gem.id) * 0.13,
        mesh = this.pooled('gem-' + gem.id, 'gem', color).mesh;
      mesh.position.set(gem.x, y, gem.z);
      mesh.scale.setScalar(gem.value > 15 ? 0.82 : 0.56);
      mesh.material.opacity = 1;
      mesh.rotation.set(0, time * 1.8, Math.PI * 0.12);
      const halo = this.pooled('gem-halo-' + gem.id, 'ring', color).mesh;
      halo.position.set(gem.x, C.heightAt(gem.x, gem.z, seed) + 0.08, gem.z);
      halo.rotation.x = -Math.PI / 2;
      halo.scale.setScalar(gem.value > 15 ? 0.9 : 0.58);
      halo.material.opacity = 0.5;
      const q = this.screen(gem.x, y, gem.z);
      if (q.visible) {
        const c = this.fxCtx,
          g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, 12);
        g.addColorStop(0, gem.heal ? '#ffb99b88' : '#49ffff88');
        g.addColorStop(1, '#49ffff00');
        c.save();
        c.globalAlpha = this.visibility?.experience ?? 1;
        c.fillStyle = g;
        c.fillRect(q.x - 12, q.y - 12, 24, 24);
        c.restore();
      }
    }
    for (const shot of s?.shots || []) this.attackEffects.projectile(shot, s, time);
    this.opacityCategory = 'enemy';
    for (const shot of s?.hostile || []) {
      this.attackEffects.projectile(shot, s, time, 'enemy');
      const y = C.heightAt(shot.x, shot.z, seed) + 1.05,
        radius = shot.dark ? 0.72 : 0.58,
        marker = this.pooled('hostile-marker-' + shot.id, 'ring', 0xff668f).mesh;
      marker.position.set(shot.x, y - 1, shot.z);
      marker.rotation.x = -Math.PI / 2;
      marker.scale.setScalar(radius * 1.25);
      marker.material.opacity = 0.9;
      const q = this.screen(shot.x, y, shot.z);
      if (q.visible) {
        const c = this.fxCtx,
          rr = shot.dark ? 7 : 6;
        c.save();
        c.globalAlpha = this.visibility?.enemy ?? 1;
        c.beginPath();
        c.arc(q.x, q.y, rr, 0, Math.PI * 2);
        c.strokeStyle = '#24142e';
        c.lineWidth = 4;
        c.stroke();
        c.strokeStyle = '#ffafbf';
        c.lineWidth = 2;
        c.stroke();
        c.restore();
      }
    }
    this.opacityCategory = 'player';
    for (let i = 0; i < (p.orbits || 0); i++) {
      const a = time * 2.5 + (i * Math.PI * 2) / p.orbits,
        x = p.x + Math.cos(a) * 3.4,
        z = p.z + Math.sin(a) * 3.4,
        mesh = this.pooled('orbit-' + i, 'gem', 0xdde6a5).mesh;
      mesh.position.set(x, C.heightAt(x, z, seed) + 1.1, z);
      mesh.scale.setScalar(0.55);
      mesh.rotation.y = time * 4;
    }
    for (const effect of s?.fx || []) {
      const custom = this.attackEffects.impact(effect, s, time);
      this.opacityCategory =
        ['slash', 'hit', 'burst'].includes(effect.kind) && effect.skillId ? 'player' : null;
      const ratio = effect.life / effect.maxLife,
        progress = 1 - ratio;
      if (effect.text) {
        const q = this.screen(
          effect.x,
          C.heightAt(effect.x, effect.z, seed) + 2.6 + progress * 1.5,
          effect.z,
        );
        if (q.visible) {
          this.fxCtx.globalAlpha = ratio;
          this.fxCtx.font = (effect.crit ? 'bold 23px' : 'bold 16px') + ' Segoe UI';
          this.fxCtx.textAlign = 'center';
          this.fxCtx.lineWidth = 3;
          this.fxCtx.strokeStyle = '#304b3c';
          this.fxCtx.fillStyle =
            effect.kind === 'damage'
              ? '#ffad99'
              : effect.dot
                ? '#c2e9a0'
                : effect.crit
                  ? '#ffe6a0'
                  : '#f7f3d5';
          this.fxCtx.strokeText(effect.text, q.x, q.y);
          this.fxCtx.fillText(effect.text, q.x, q.y);
          this.fxCtx.globalAlpha = 1;
        }
      }
      if (effect.kind !== 'damage' && !custom) {
        const family = window.SkillSystem.skills[effect.skillId]?.family || 'neutral',
          color =
            effect.kind === 'warning'
              ? 0xf09a82
              : effect.kind === 'heal'
                ? 0xafe4b5
                : effect.color || COLORS[family] || 0xe6d99b,
          mesh = this.pooled('fx-' + effect.id, 'ring', color).mesh;
        mesh.position.set(effect.x, C.heightAt(effect.x, effect.z, seed) + 0.18, effect.z);
        mesh.rotation.x = effect.kind === 'slash' ? -Math.PI * 0.25 : -Math.PI / 2;
        mesh.rotation.z = progress * 4;
        mesh.scale.setScalar(
          effect.kind === 'warning' ? effect.radius : (effect.size || 1) * (1 + progress * 2.5),
        );
        mesh.material.opacity = effect.kind === 'warning' ? 0.35 + progress * 0.35 : ratio * 0.8;
        if (['burst', 'hit', 'slash', 'heal'].includes(effect.kind)) {
          for (let i = 0; i < 7; i++) {
            const a = (i * Math.PI * 2) / 7 + effect.id * 0.7,
              r = (0.3 + progress * 2.4) * (effect.size ? Math.min(2, effect.size) : 1),
              spark = this.pooled(
                'spark-' + effect.id + '-' + i,
                family === 'ice' || family === 'nature' ? 'ice' : 'orb',
                i % 3 ? color : 0xfff8d5,
              ).mesh;
            spark.position.set(
              effect.x + Math.cos(a) * r,
              C.heightAt(effect.x, effect.z, seed) +
                0.5 +
                Math.sin(progress * Math.PI) * (1 + (i % 3)) * 0.6,
              effect.z + Math.sin(a) * r,
            );
            spark.scale.setScalar((0.14 + (i % 3) * 0.07) * ratio);
            spark.rotation.set(progress * 6, a, progress * 4);
            spark.material.opacity = ratio;
          }
        }
      }
    }

    this.opacityCategory = null;
    if (fx || s?.hatch > 0) {
      const t = fx ? fx.duration - fx.left : 2.2 - s.hatch;
      for (let i = 0; i < 4; i++) {
        const mesh = this.pooled('evolution-' + i, 'ring', i % 2 ? 0xc2eee2 : 0xffdfa0).mesh;
        mesh.position.set(p.x, goal.y + i * 0.7, p.z);
        mesh.rotation.set(Math.PI / 2, t + i, t * 0.7);
        mesh.scale.setScalar(2.4 + i * 0.35 + Math.sin(t * 4) * 0.15);
        mesh.material.opacity = 0.65;
      }
    }
    if (p.shieldLeft > 0) {
      const mesh = this.pooled('shield', 'ring', 0xabe5dc).mesh;
      mesh.position.set(p.x, goal.y + 0.7, p.z);
      mesh.rotation.y = this.cameraYaw;
      mesh.scale.setScalar(1.8);
    }
    if (s?.challenge) {
      const mesh = this.pooled('challenge', 'ring', 0x89dcd4).mesh;
      mesh.position.set(
        s.challenge.x,
        C.heightAt(s.challenge.x, s.challenge.z, seed) + 0.14,
        s.challenge.z,
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.scale.setScalar(7);
      mesh.material.opacity = 0.6;
    }
    for (const [id, unit] of this.units)
      if (!unit.keep) {
        this.scene.remove(unit.group);
        this.units.delete(id);
        this.unitPool.push(unit);
      }
    for (const [id, item] of this.visuals)
      if (!item.keep) {
        this.scene.remove(item.mesh);
        this.visuals.delete(id);
        if (!this.pools.has(item.type)) this.pools.set(item.type, []);
        this.pools.get(item.type).push(item);
      }
    for (const item of this.visuals.values())
      if (item.keep && item.category)
        item.mesh.material.opacity *= this.visibility?.[item.category] ?? 1;
    this.attackEffects.finish();
    if (submit) this.renderer.render(this.scene, this.camera);
  }
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect(),
      mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    return ray.intersectObject(this.terrain)[0]?.point || null;
  }
  minimap(canvas, run, options = {}) {
    return window.DigibonkMap.draw(canvas, run.s, run.map, C.ponds, C.WORLD, options);
  }
}
