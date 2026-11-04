import * as THREE from './vendor/three.module.js';
import { AttackVisuals } from './attack-visuals.js';

window.DigibonkCore = { heightAt: () => 0 };
const $ = (id) => document.getElementById(id);
const all = Object.values(window.SkillSystem.skills);
const featured = [
  'fireball',
  'cocytus-breath',
  'tidal-wave',
  'electro-shocker',
  'death-claw',
  'black-hole',
].map((id) => window.SkillSystem.skills[id]);
for (const [id, name] of Object.entries(window.SkillSystem.familyNames)) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  $('family').append(option);
}
const renderer = new THREE.WebGLRenderer({ canvas: $('stage'), antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.setScissorTest(true);
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(4.2, 6, 9);
camera.lookAt(0, 0.7, 0);
scene.add(new THREE.HemisphereLight('#e6f2d7', '#526d61', 2.3));
const sun = new THREE.DirectionalLight('#ffe4b1', 3.1);
sun.position.set(-10, 26, 14);
scene.add(sun);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshLambertMaterial({ color: '#304c3e' }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.04;
scene.add(floor);
const grid = new THREE.GridHelper(30, 30, '#6c906d', '#5d7f61');
grid.material.transparent = true;
grid.material.opacity = 0.18;
scene.add(grid);
const fx = new AttackVisuals({ scene, camera, visibility: { player: 1, enemy: 1 } }),
  state = { mapSeed: 1, sceneSerial: 1 };
const spriteCanvas = document.createElement('canvas'),
  ctx = spriteCanvas.getContext('2d'),
  texture = new THREE.CanvasTexture(spriteCanvas);
spriteCanvas.width = spriteCanvas.height = 64;
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.colorSpace = THREE.SRGBColorSpace;
const target = new THREE.Sprite(
  new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
);
target.position.set(1.8, 0.9, 0);
target.scale.set(1.8, 1.8, 1);
scene.add(target);
const spec = window.SPRITE_DATA.Agumon,
  image = new Image();
image.src = spec.sheet;
let spriteReady = false;
image.onload = () => {
  spriteReady = true;
};
let page = 0,
  selected = featured,
  cards = [],
  clock = 0,
  paused = false,
  last = performance.now(),
  peak = 0,
  frames = 0,
  total = 0;
function refresh() {
  const family = $('family').value;
  selected =
    family === 'featured'
      ? featured
      : family === 'all'
        ? all
        : all.filter((s) => s.family === family);
  page = Math.max(0, Math.min(page, Math.floor((selected.length - 1) / 6)));
  $('cards').replaceChildren();
  cards = selected.slice(page * 6, page * 6 + 6).map((skill) => {
    const el = document.createElement('article');
    el.className = 'card';
    const heading = document.createElement('h2');
    heading.textContent = skill.name;
    const label = document.createElement('small');
    label.textContent =
      window.SkillSystem.familyNames[skill.family] +
      ' · ' +
      (skill.kind === 'damage' ? 'Ataque' : 'Apoyo');
    const viewport = document.createElement('div');
    viewport.className = 'viewport';
    const phase = document.createElement('span');
    phase.className = 'phase';
    el.append(heading, label, viewport, phase);
    $('cards').append(el);
    return { skill, viewport, phase };
  });
  fx.trails.clear();
  clock = 0;
  peak = 0;
}
$('family').onchange = () => {
  page = 0;
  refresh();
};
$('next').onclick = () => {
  page = (page + 1) % Math.ceil(selected.length / 6);
  refresh();
};
$('previous').onclick = () => {
  page = (page + Math.ceil(selected.length / 6) - 1) % Math.ceil(selected.length / 6);
  refresh();
};
$('pause').onclick = () => {
  paused = !paused;
  $('pause').textContent = paused ? 'Reproducir' : 'Pausar';
};
$('step').onclick = () => {
  paused = true;
  $('pause').textContent = 'Reproducir';
  clock += 1 / 30;
};
$('scrub').oninput = () => {
  paused = true;
  $('pause').textContent = 'Reproducir';
  clock = (Number($('scrub').value) / 100) * ($('phase').value === 'impact' ? 1.6 : 2.5);
};
$('ground').onchange = () => {
  floor.material.color.set($('ground').value === 'dark' ? '#101c26' : '#304c3e');
};
window.addEventListener('error', (e) => {
  $('report').textContent = 'ERROR: ' + e.message;
});
let auditing = false,
  auditResult = '';
$('audit').onclick = async () => {
  auditing = true;
  $('audit').disabled = true;
  const wasPaused = paused;
  paused = true;
  let checked = 0,
    errors = 0;
  try {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    for (const skill of all) {
      for (const age of [0.05, 0.3, 0.5, 0.7, 0.95]) {
        const e = {
          id: 999,
          skillId: skill.id,
          x: 0,
          z: 0,
          prevX: -0.1,
          prevZ: 0,
          fromX: -3,
          fromZ: 0,
          radius: 3.5,
          size: 1.5,
          life: 0.9 * (1 - age),
          maxLife: 0.9,
        };
        fx.begin();
        fx.projectile(e, state, age);
        fx.impact({ ...e, kind: 'cast' }, state, age);
        fx.impact({ ...e, kind: skill.kind === 'damage' ? 'burst' : 'heal' }, state, age);
        fx.finish();
        renderer.render(scene, camera);
        if (renderer.getContext().getError() !== 0) errors++;
      }
      checked++;
      $('report').textContent = `Revisando ${checked}/${all.length}: ${skill.name}`;
      await new Promise(requestAnimationFrame);
    }
    auditResult = `${checked}/${all.length} técnicas · ${errors} errores WebGL`;
  } catch (error) {
    auditResult = 'ERROR: ' + error.message;
  } finally {
    auditing = false;
    paused = wasPaused;
    $('audit').disabled = false;
    $('report').textContent = auditResult;
  }
};
refresh();
function animate(now) {
  requestAnimationFrame(animate);
  if (auditing) {
    last = now;
    return;
  }
  const dt = Math.min(0.06, (now - last) / 1000);
  last = now;
  if (!paused) clock += dt * Number($('speed').value);
  const w = innerWidth,
    h = innerHeight;
  if (
    renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) ||
    renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())
  )
    renderer.setSize(w, h, false);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  const start = performance.now();
  for (const { skill, viewport, phase } of cards) {
    const rect = viewport.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > h) continue;
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    const cycle = clock % 2.5,
      mode = $('phase').value;
    const isField = skill.nextOrder && !['volley'].includes(skill.pattern),
      isMelee = skill.mode === 'melee',
      support = skill.kind !== 'damage';
    const flight =
      !isField && !isMelee && !support && (mode === 'flight' || (mode === 'cycle' && cycle < 0.9));
    const t =
      mode === 'impact' || (mode === 'flight' && !flight)
        ? (clock % 1.6) / 1.6
        : Math.max(0, cycle - (isField || isMelee || support ? 0 : 0.9)) / (isField ? 0.9 : 1);
    target.visible = !support;
    target.material.color.set(!flight && t < 0.12 ? '#ffffff' : '#c4cdb8');
    if (spriteReady) {
      const frames = spec.actions.idle,
        f = frames[Math.floor(clock * 3) % frames.length],
        b = f.bounds || { x: 0, y: 0, w: f.w, h: f.h };
      ctx.clearRect(0, 0, 64, 64);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, f.x + b.x, f.y + b.y, b.w, b.h, 0, 0, 64, 64);
      texture.needsUpdate = true;
    }
    fx.begin();
    if (flight) {
      const x = mode === 'flight' ? Math.sin(clock * 1.4) * 2 : (cycle / 0.9) * 7 - 5.2;
      fx.projectile(
        {
          id: all.indexOf(skill) + 1,
          x,
          z: 0,
          prevX: x - 0.1,
          prevZ: 0,
          ox: -5,
          oz: 0,
          skillId: skill.id,
        },
        state,
        clock,
      );
      phase.textContent = 'Recorrido';
    } else if (t < 1) {
      fx.impact(
        {
          id: 100 + all.indexOf(skill),
          kind: support ? 'heal' : isMelee ? 'slash' : 'burst',
          x: 1.8,
          z: 0,
          dx: 1,
          dz: 0,
          skillId: skill.id,
          life: 1 - t,
          maxLife: 1,
          size: 1.5,
          ...(isField
            ? {
                radius: 3.5,
                life: 0.9 * (1 - t),
                maxLife: 0.9,
                fromX: skill.pattern === 'chain' ? -3 : undefined,
                fromZ: 0,
              }
            : {}),
        },
        state,
        clock,
      );
      phase.textContent = isField && t < 0.4 / 0.9 ? 'Preparación' : support ? 'Apoyo' : 'Impacto';
    } else phase.textContent = 'Disipación';
    fx.finish();
    peak = Math.max(peak, fx.count);
    renderer.setViewport(rect.left, h - rect.bottom, rect.width, rect.height);
    renderer.setScissor(rect.left, Math.max(0, h - rect.bottom), rect.width, rect.height);
    renderer.render(scene, camera);
  }
  total += performance.now() - start;
  frames++;
  if (frames % 30 === 0 && !auditResult)
    $('report').textContent =
      `${page * 6 + 1}–${Math.min(selected.length, page * 6 + 6)} / ${selected.length} · ${peak} piezas máx. · ${(total / frames).toFixed(1)} ms/galería`;
}
requestAnimationFrame(animate);
