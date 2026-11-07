import { renderBook } from './technique-book.js';
import { frameTechnique, renderTechniqueDevice } from './technique-art.js';
import { installChoiceFitter } from './choice-layout.js';
import { bindUiScale } from './ui-scale.js';
import { ChestCarousel } from './chest-carousel.js';
import { Cloud } from './cloud.js';

import { Music } from './music.js';

import { Renderer3D } from './render3d.js';

const $ = (s) => document.querySelector(s),
  C = window.DigibonkCore,
  SETTINGS_KEY = 'digibonk.settings.v1';

let RUN_KEY = 'digibonk.run.v1',
  RECORDS_KEY = 'digibonk.records.v1';

const stageNames = {
  [-2]: 'HUEVO',
  [-1]: 'BEBÉ I',
  0: 'BEBÉ II',
  1: 'ROOKIE',
  2: 'CHAMPION',
  3: 'ULTIMATE',
  4: 'MEGA',
};

window.SkillPose = Object.fromEntries(
  Object.values(SkillSystem.skills).map((s) => [
    s.id,
    s.kind !== 'damage' ? 'guard' : s.stage >= 3 ? 'attack4' : s.stage >= 2 ? 'attack3' : 'attack2',
  ]),
);

let loading = false;
let renderer,
  run = null,
  active = false,
  paused = false,
  last = 0,
  saveClock = 0,
  hudClock = 0,
  overlayKey = '',
  toastLeft = 0,
  choiceCanvases = [],
  eggCanvases = [],
  evolutionCanvases = [],
  keys = new DigibonkInput(),
  moveTarget = null,
  specialQueued = false,
  records = read(RECORDS_KEY, []),
  settings = read(SETTINGS_KEY, { sound: true });

settings.visibility = Object.fromEntries(
  ['player', 'experience', 'enemy'].map((id) => [
    id,
    typeof settings.visibility?.[id] === 'number' && Number.isFinite(settings.visibility[id])
      ? Math.max(0, Math.min(1, settings.visibility[id]))
      : 1,
  ]),
);
keys = new DigibonkInput(settings.bindings);
let bindingCapture = null,
  settingsWasPaused = false;
const keyLabel = (action) => keys.label(action);
bindUiScale(settings, () => store(SETTINGS_KEY, settings));

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    $('#home-message').textContent =
      'No se ha podido guardar en este ordenador. Comprueba el espacio disponible.';
  }
}

const clock = (t) =>
    Math.floor(t / 60)
      .toString()
      .padStart(2, '0') +
    ':' +
    Math.floor(t % 60)
      .toString()
      .padStart(2, '0'),
  number = (n) => Math.floor(n).toLocaleString('es-ES');

function toast(text) {
  $('#toast').textContent = text;
  toastLeft = 4;
}

class Audio {
  constructor() {
    this.ctx = null;
    this.lastGem = 0;
    this.lastHit = 0;
  }

  unlock() {
    if (!settings.sound) return;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {}
  }

  tone(freq, duration = 0.08, volume = 0.025, type = 'sine', delay = 0) {
    if (!this.ctx || !settings.sound) return;
    const at = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(volume, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(at);
    o.stop(at + duration);
  }

  play(type) {
    this.unlock();
    const time = performance.now();
    if (type === 'gem') {
      if (time - this.lastGem < 100) return;
      this.lastGem = time;
      this.tone(700 + Math.random() * 350, 0.05, 0.012);
    }
    if (type === 'damage') {
      if (time - this.lastHit < 150) return;
      this.lastHit = time;
      this.tone(90, 0.1, 0.055, 'triangle');
    }
    if (type === 'pick' || type === 'hatch') {
      this.tone(440, 0.1, 0.03);
      this.tone(660, 0.15, 0.025, 'sine', 0.08);
    }
    if (type === 'level')
      for (let i = 0; i < 3; i++) this.tone([440, 554, 660][i], 0.13, 0.025, 'triangle', i * 0.09);
    if (type === 'evolution')
      for (let i = 0; i < 6; i++)
        this.tone([220, 330, 440, 554, 660, 880][i], 0.35, 0.035, 'sine', i * 0.18);
    if (type === 'boss')
      for (let i = 0; i < 3; i++) this.tone(110 + i * 15, 0.3, 0.05, 'triangle', i * 0.25);
    if (type === 'end') this.tone(150, 0.4, 0.035, 'triangle');
  }
}

const audio = new Audio();

const cloud = new Cloud();

const music = new Music();
settings.musicVolume =
  typeof settings.musicVolume === 'number' && Number.isFinite(settings.musicVolume)
    ? Math.max(0, Math.min(1, settings.musicVolume))
    : 0.3;
music.setVolume(settings.musicVolume);
$('#music-volume').value = String(Math.round(settings.musicVolume * 100));
$('#music-volume-value').textContent = Math.round(settings.musicVolume * 100) + ' %';

$('#music-toggle').onclick = () => {
  music.enabled = !music.enabled;
  music.start();
  $('#music-toggle').textContent = music.enabled ? '♫ Música' : '♫ Música desactivada';
};

$('#music-volume').oninput = (e) => {
  settings.musicVolume = Math.max(0, Math.min(1, Number(e.target.value) / 100));
  music.setVolume(settings.musicVolume);
  $('#music-volume-value').textContent = Math.round(settings.musicVolume * 100) + ' %';
  store(SETTINGS_KEY, settings);
};

$('#music-file').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    music.load(file);
    $('#music-track').textContent = file.name + ' (esta sesión)';
  }
};

function save() {
  if (run && !run.s.done) {
    bankBits();
    store(RUN_KEY, run.snapshot());
  }
}

function syncSound() {
  $('#sound-toggle').textContent = settings.sound ? '♪ Efectos' : '♪ Sin efectos';
  store(SETTINGS_KEY, settings);
}

$('#sound-toggle').onclick = () => {
  settings.sound = !settings.sound;
  audio.unlock();
  syncSound();
};
syncSound();

function refreshControlLabels() {
  for (const el of document.querySelectorAll('[data-control]'))
    el.textContent = keyLabel(el.dataset.control);
  $('#controls-hint').textContent =
    keyLabel('up') +
    ' · ' +
    keyLabel('left') +
    ' · ' +
    keyLabel('down') +
    ' · ' +
    keyLabel('right') +
    ' o clic · ' +
    keyLabel('dash') +
    ': esquivar · ' +
    keyLabel('interact') +
    ': interactuar · ' +
    keyLabel('special') +
    ': habilidad · ' +
    keyLabel('map') +
    ': mapa · Esc: pausa';
  $('#style-key-hint').textContent =
    keyLabel('special') + ' · Acción de tu digievolución · detalles en Equipo';
}
function renderBindings() {
  const list = $('#bindings-list');
  list.replaceChildren();
  for (const [action, name] of Object.entries(DigibonkInput.names)) {
    const row = document.createElement('div'),
      label = document.createElement('strong');
    row.className = 'binding-row';
    label.textContent = name;
    row.append(label);
    for (let slot = 0; slot < 2; slot++) {
      const button = document.createElement('button'),
        value = keys.bindings[action][slot];
      button.type = 'button';
      button.textContent = value ? DigibonkInput.keyLabel(value) : 'Sin asignar';
      button.setAttribute(
        'aria-label',
        name + ' · ' + (slot ? 'secundaria' : 'principal') + ' · ' + button.textContent,
      );
      button.dataset.action = action;
      button.dataset.slot = slot;
      if (bindingCapture?.action === action && bindingCapture.slot === slot) {
        button.textContent = 'Pulsa una tecla…';
        button.classList.add('listening');
      }
      button.onclick = () => {
        bindingCapture = { action, slot };
        $('#binding-message').textContent =
          'Pulsa la nueva tecla. Esc cancela.' +
          (slot ? ' Supr o Retroceso elimina esta tecla secundaria.' : '');
        renderBindings();
      };
      row.append(button);
    }
    list.append(row);
  }
}
function openSettings() {
  if ($('#settings-dialog').open) return;
  settingsWasPaused = paused;
  if (active && !run?.s.done) {
    paused = true;
    save();
  }
  keys.clear();
  moveTarget = null;
  specialQueued = false;
  bindingCapture = null;
  $('#binding-message').textContent =
    'Los cambios se guardan en este ordenador. Esc siempre permite pausar o cerrar.';
  renderBindings();
  $('#settings-dialog').showModal();
}
for (const id of ['player', 'experience', 'enemy']) {
  const input = $('#opacity-' + id),
    output = $('#opacity-' + id + '-value'),
    preview = $('#opacity-' + id + '-preview');
  input.value = String(Math.round(settings.visibility[id] * 100));
  output.textContent = input.value + ' %';
  preview.style.opacity = settings.visibility[id];
  input.oninput = () => {
    settings.visibility[id] = Number(input.value) / 100;
    output.textContent = input.value + ' %';
    preview.style.opacity = settings.visibility[id];
    store(SETTINGS_KEY, settings);
  };
}
$('#visibility-reset').onclick = () => {
  for (const id of ['player', 'experience', 'enemy']) {
    settings.visibility[id] = 1;
    $('#opacity-' + id).value = '100';
    $('#opacity-' + id + '-value').textContent = '100 %';
    $('#opacity-' + id + '-preview').style.opacity = '1';
  }
  store(SETTINGS_KEY, settings);
};
$('#settings-toggle').onclick = openSettings;
$('#pause-settings').onclick = openSettings;
$('#bindings-reset').onclick = () => {
  keys.resetBindings();
  bindingCapture = null;
  settings.bindings = keys.bindings;
  store(SETTINGS_KEY, settings);
  renderBindings();
  refreshControlLabels();
  $('#binding-message').textContent = 'Controles predeterminados restaurados.';
};
$('#settings-dialog').addEventListener('cancel', (event) => {
  if (bindingCapture) {
    event.preventDefault();
    bindingCapture = null;
    renderBindings();
    $('#binding-message').textContent = 'Cambio cancelado.';
  }
});
$('#settings-dialog').addEventListener('close', () => {
  bindingCapture = null;
  keys.clear();
  specialQueued = false;
  moveTarget = null;
  paused = settingsWasPaused;
  if (active) $('#world').focus({ preventScroll: true });
});
refreshControlLabels();

let mapWasPaused = false;
function openMap() {
  if (
    !active ||
    !run ||
    run.s.done ||
    $('#map-dialog').open ||
    document.querySelector('dialog[open]')
  )
    return;
  mapWasPaused = paused;
  paused = true;
  keys.clear();
  specialQueued = false;
  moveTarget = null;
  save();
  renderer.minimap($('#world-map'), run, { large: true });
  $('#map-dialog-title').textContent = run.s.realm
    ? 'Mapa del portal · ' + run.s.realm.name
    : 'Mapa principal';
  $('#map-dialog').showModal();
}
$('#map-toggle').onclick = openMap;
$('#minimap').onclick = openMap;
$('#map-dialog').addEventListener('close', () => {
  keys.clear();
  specialQueued = false;
  paused = mapWasPaused;
  if (active) $('#world').focus({ preventScroll: true });
});
const fullLegend = $('#map-full-legend');
for (const [type, name] of Object.entries(DigibonkMap.names)) {
  const item = document.createElement('span'),
    canvas = document.createElement('canvas');
  canvas.dataset.mapIcon = type;
  item.append(canvas, document.createTextNode(name));
  fullLegend.append(item);
}
for (const canvas of document.querySelectorAll('[data-map-icon]')) {
  canvas.width = canvas.height = 28;
  DigibonkMap.symbol(canvas.getContext('2d'), canvas.dataset.mapIcon, 14, 14, 22);
}
function openHelp() {
  specialQueued = false;
  if (active && !run.s.done) {
    paused = true;
    save();
  }
  $('#help-dialog').showModal();
}

$('#help-toggle').onclick = openHelp;
$('#pause-help').onclick = openHelp;

let gearWasPaused = false;
function openGear() {
  if (!run || loading) return;
  gearWasPaused = paused;
  paused = true;
  keys.clear();
  moveTarget = null;
  specialQueued = false;
  save();
  const s = run.s,
    p = s.player;
  const list = $('#gear-list');
  list.replaceChildren();
  const article = (host, title, description, icon) => {
    const card = document.createElement('article');
    if (icon) {
      const img = document.createElement('img');
      img.src = icon;
      img.alt = '';
      card.append(img);
    }
    const body = document.createElement('div'),
      heading = document.createElement('strong'),
      text = document.createElement('p');
    heading.textContent = title;
    text.textContent = description;
    body.append(heading, text);
    card.append(body);
    host.append(card);
  };
  for (const relic of s.relics) {
    const def = DigibonkLoot.relics.find((d) => d.id === relic.id);
    if (!def) continue;
    article(
      list,
      def.name + ' · ' + (def.legendary ? 'Legendario' : relic.rank + '/3'),
      def.description(relic.rank),
      DigibonkLoot.icon(def.id),
    );
  }
  if (!list.children.length) list.textContent = 'Aún no llevas objetos.';
  const companions = $('#gear-companions');
  companions.replaceChildren();
  for (const buddy of s.buddies) {
    const def = DigibonkLoot.companions.find((d) => d.id === buddy.species);
    if (def) article(companions, def.name, def.description);
  }
  if (!companions.children.length) companions.textContent = 'Sin compañeros.';
  $('#gear-species').textContent = p.species;
  $('#gear-stage').textContent = stageNames[p.stage] + ' · NIVEL ' + s.level;
  $('#gear-passive').textContent = run.style()?.passive || '';
  const techniques = $('#gear-techniques');
  renderTechniqueDevice(techniques, p);
  const numberStat = (v) => Number(v.toFixed(2)).toLocaleString('es-ES');
  const stats = [
    ['Vida', numberStat(p.hp) + ' / ' + numberStat(p.maxHp)],
    ['Daño', numberStat(p.damage * (p.rallyLeft > 0 ? 1.25 : 1))],
    [
      'Probabilidad de crítico',
      numberStat(Math.min(0.85, p.crit + (p.focusLeft > 0 ? 0.15 : 0)) * 100) + ' %',
    ],
    ['Daño crítico', numberStat((1.8 + run.relicRank('critical-lens') * 0.15) * 100) + ' %'],
    ['Armadura', numberStat(p.armor)],
    ['Velocidad de movimiento', numberStat(p.speed * run.playerWorldSpeed())],
    [
      'Velocidad de ataque',
      '×' +
        numberStat(
          p.haste *
            (p.hasteLeft > 0 ? 1.2 : 1) *
            (p.relicHasteLeft > 0 ? 1 + run.relicRank('dash-drive') * 0.1 : 1),
        ),
    ],
    [
      'Regeneración',
      numberStat(p.regen + (run.style()?.id === 'guardian' ? p.maxHp * 0.01 : 0)) + ' / s',
    ],
    ['Área de técnicas', numberStat(p.area * 100) + ' %'],
    ['Experiencia', '×' + numberStat(p.xpMult)],
    ['Radio de recogida', numberStat(p.magnet) + ' m'],
    ['Proyectiles extra', String(p.projectileBonus)],
    ['Cofre de enemigo normal', numberStat(run.chestDropChance({}) * 100) + ' %'],
    ['Precio del próximo cofre', numberStat(run.chestPrice()) + ' bits'],
  ];
  const attributes = $('#gear-stats');
  attributes.replaceChildren();
  for (const [name, value] of stats) {
    const label = document.createElement('dt'),
      val = document.createElement('dd');
    label.textContent = name;
    val.textContent = value;
    attributes.append(label, val);
  }
  $('#gear-dialog').showModal();
}
$('#gear-dialog').addEventListener('close', () => {
  paused = gearWasPaused;
  keys.clear();
  moveTarget = null;
  specialQueued = false;
  if (active) $('#world').focus({ preventScroll: true });
});

$('#gear-toggle').onclick = openGear;
let bookMode = 'techniques',
  bookWasPaused = false;
for (const [id, name] of Object.entries(SkillSystem.familyNames)) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  $('#book-family').append(option);
}
function refreshBook() {
  $('#book-family-label').hidden = bookMode !== 'techniques';
  $('#book-techniques').classList.toggle('primary', bookMode === 'techniques');
  $('#book-relics').classList.toggle('primary', bookMode === 'relics');
  $('#book-states').classList.toggle('primary', bookMode === 'states');
  renderBook($('#book-grid'), run, bookMode, $('#book-family').value);
}
$('#book-toggle').onclick = () => {
  bookWasPaused = paused;
  if (active && !run.s.done) {
    paused = true;
    save();
  }
  keys.clear();
  specialQueued = false;
  bookMode = 'techniques';
  $('#book-family').value = run ? SkillSystem.family(run.s.player.species) : 'all';
  refreshBook();
  $('#book-dialog').showModal();
};
$('#book-techniques').onclick = () => {
  bookMode = 'techniques';
  refreshBook();
};
$('#book-relics').onclick = () => {
  bookMode = 'relics';
  refreshBook();
};
$('#book-states').onclick = () => {
  bookMode = 'states';
  refreshBook();
};
$('#book-family').onchange = refreshBook;
$('#book-dialog').addEventListener('close', () => {
  paused = bookWasPaused;
  keys.clear();
  moveTarget = null;
  specialQueued = false;
  if (active) $('#world').focus({ preventScroll: true });
});

function refreshEquipment() {
  $('#equipment-strip').hidden = true;
}

function openRecords() {
  specialQueued = false;
  if (active && !run.s.done) {
    paused = true;
    save();
  }
  const list = $('#records-list');
  list.replaceChildren(
    ...records.slice(0, 10).map((record, i) => {
      const row = document.createElement('article'),
        rank = document.createElement('b'),
        body = document.createElement('div'),
        name = document.createElement('strong'),
        detail = document.createElement('small'),
        score = document.createElement('span');
      rank.textContent = String(i + 1).padStart(2, '0');
      name.textContent = record.species + ' · Nv. ' + record.level;
      detail.textContent =
        clock(record.time) +
        ' · ' +
        number(record.kills) +
        ' bajas · ' +
        new Date(record.date).toLocaleDateString('es-ES');
      score.textContent = number(record.score);
      body.append(name, detail);
      row.append(rank, body, score);
      return row;
    }),
  );
  if (!records.length) list.textContent = 'Tu primera leyenda todavía está por escribirse.';
  $('#records-dialog').showModal();
}

$('#records-toggle').onclick = openRecords;
$('#result-records').onclick = openRecords;

function showHome() {
  document.body.dataset.screen = 'home';
  homeTab = 'menu';
  makeEggs();
  $('#portal-timer').hidden = true;
  $('#style-panel').hidden = true;
  specialQueued = false;
  $('#equipment-strip').hidden = true;
  active = false;
  paused = false;
  keys.clear();
  moveTarget = null;
  $('#home').hidden = false;
  $('#hud').hidden = true;
  $('#map-panel').hidden = true;
  $('#controls-hint').hidden = true;
  for (const id of [
    '#pause-overlay',
    '#result-overlay',
    '#choice-overlay',
    '#evolution-cinema',
    '#boss-bar',
    '#interact',
    '#challenge-label',
  ])
    $(id).hidden = true;
  overlayKey = '';
  const saved = read(RUN_KEY, null);
  $('#continue-run').hidden = !saved || saved.done;
  $('#continue-run').textContent = saved
    ? 'Continuar · ' + saved.player.species + ' · Nv. ' + saved.level + ' · ' + clock(saved.time)
    : 'Continuar partida';
  const high = records[0],
    bestTime = Math.max(0, ...records.map((r) => r.time));
  $('#home-records').replaceChildren();
  for (const [label, value] of [
    ['RÉCORD', high ? number(high.score) : '—'],
    ['SUPERVIVENCIA', bestTime ? clock(bestTime) : '—'],
    ['HUEVOS', Object.keys(progression.eggs).length + '/' + C.eggChoices.length],
  ]) {
    const span = document.createElement('span'),
      b = document.createElement('b');
    b.textContent = value;
    span.append(b, document.createTextNode(label));
    $('#home-records').append(span);
  }
}

function begin(egg) {
  if (loading || !progression.eggs[egg]) return;
  audio.unlock();
  sceneTransition(() => {
    run = new C.Run(egg);
    DigibonkProgression.apply(run, progression.eggs[egg]);
    run.s.evolutionLine = C.evolutionLine(egg, progression.eggs[egg], progression.lines?.[egg]);
    run.s.onlineOwner = cloud.user?.id || null;
    run.s.cloudVersion = '1.3.0';
    activate();
  }, 'Preparando tu aventura');
}

function activate() {
  document.body.dataset.screen = 'game';
  music.start();
  specialQueued = false;
  active = true;
  paused = false;
  overlayKey = '';
  keys.clear();
  moveTarget = null;
  saveClock = 0;
  $('#home').hidden = true;
  $('#hud').hidden = false;
  $('#map-panel').hidden = false;
  $('#controls-hint').hidden = false;
  $('#result-overlay').hidden = true;
  $('#pause-overlay').hidden = true;
  $('#choice-overlay').hidden = true;
  if (run.s.evolution && run.style())
    toast(
      'Nuevo estilo: ' +
        run.style().name +
        ' · ' +
        keyLabel('special') +
        ': ' +
        run.style().ability,
    );
  save();
  refreshHud();
}

$('#continue-run').onclick = () => {
  if (loading) return;
  audio.unlock();
  sceneTransition(() => {
    run = new C.Run(null, { saved: read(RUN_KEY, null) });
    activate();
  }, 'Recuperando tu aventura');
};

$('#brand').onclick = (e) => {
  e.preventDefault();
  if (active && !run.s.done) {
    paused = true;
    return;
  }
  showHome();
};

$('#new-run').onclick = showHome;

$('#pause-run').onclick = () => {
  if (active && !run.s.done && !run.s.choice && !run.s.evolution) {
    paused = !paused;
    specialQueued = false;
    keys.clear();
    save();
  }
};

$('#resume-run').onclick = () => {
  paused = false;
  keys.clear();
  moveTarget = null;
};

$('#save-menu').onclick = () => {
  save();
  showHome();
};

let META_KEY = 'digibonk.progression.v1',
  progression = read(META_KEY, null) || DigibonkProgression.fresh();
function bankBits() {
  if (run) {
    DigibonkProgression.claim(progression, run.s);
    store(META_KEY, progression);
  }
}
let homeTab = 'menu',
  selectedEgg = 'Botamon',
  selectedEvolutionStage = 0;
function purchase(id, stat, index) {
  if (DigibonkProgression.buy(progression, id, stat, index)) {
    store(META_KEY, progression);
    makeEggs();
  }
}
function makeEggs() {
  const grid = $('#egg-grid');
  grid.replaceChildren();
  eggCanvases = [];
  evolutionCanvases = [];
  if (!C.eggChoices.some((e) => e.id === selectedEgg)) selectedEgg = 'Botamon';
  $('#home-bits').textContent = number(progression.bits) + ' bits';
  $('#main-menu').hidden = homeTab !== 'menu';
  $('#information-menu').hidden = homeTab !== 'information';
  $('#home-content').hidden = !['play', 'incubator'].includes(homeTab);
  $('#home-aside').hidden = false;
  $('#menu-back').hidden = false;
  $('#continue-run').hidden =
    homeTab !== 'menu' || !read(RUN_KEY, null) || !!read(RUN_KEY, null)?.done;
  if (['menu', 'league', 'information'].includes(homeTab)) return;
  $('#tab-play').classList.toggle('primary', homeTab === 'play');
  $('#tab-incubator').classList.toggle('primary', homeTab === 'incubator');
  $('#tab-play').setAttribute('aria-selected', homeTab === 'play');
  $('#tab-incubator').setAttribute('aria-selected', homeTab === 'incubator');
  $('#egg-section-title').textContent = homeTab === 'play' ? 'ELIGE TU HUEVO' : 'INCUBADORA';
  $('#egg-section-hint').textContent =
    homeTab === 'play'
      ? 'Selecciona un huevo para empezar'
      : 'Elige tu línea evolutiva y mejora el huevo con tus bits';
  for (const egg of C.eggChoices) {
    const owned = !!progression.eggs[egg.id],
      button = document.createElement('button');
    button.className =
      'egg-card' + (owned ? '' : ' locked') + (selectedEgg === egg.id ? ' selected' : '');
    button.setAttribute(
      'aria-label',
      egg.id + (owned ? ' · Disponible' : ' · Bloqueado. Desbloquear en Incubadora'),
    );
    button.setAttribute('aria-pressed', selectedEgg === egg.id);
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 100;
    const name = document.createElement('b'),
      sub = document.createElement('small');
    name.textContent = egg.id;
    sub.textContent = owned ? 'Desbloqueado' : 'Bloqueado';
    button.append(canvas, name, sub);
    button.onclick = () => {
      selectedEgg = egg.id;
      selectedEvolutionStage = 0;
      makeEggs();
    };
    grid.append(button);
    eggCanvases.push({ canvas, egg });
  }
  const egg = C.eggChoices.find((e) => e.id === selectedEgg),
    training = progression.eggs[selectedEgg],
    panel = document.createElement('section');
  panel.className = 'selected-egg-panel';
  const title = document.createElement('h3');
  title.textContent = selectedEgg;
  panel.append(title);
  if (training) {
    const line = C.evolutionLine(selectedEgg, training, progression.lines?.[selectedEgg]);
    const route = document.createElement('section');
    route.className = 'evolution-plan';
    const heading = document.createElement('h4');
    heading.textContent = 'Tu línea evolutiva';
    route.append(heading);
    const stages = ['Bebé II', 'Rookie', 'Champion', 'Ultimate', 'Mega'];
    const track = document.createElement('div');
    track.className = 'evolution-track';
    track.setAttribute('aria-label', 'Línea evolutiva elegida');
    const icon = (id, caption, interactive = false) => {
      const tile = document.createElement(interactive ? 'button' : 'div');
      tile.className = 'evolution-icon';
      const stage = document.createElement('span');
      stage.className = 'evolution-stage';
      stage.textContent = caption;
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 88;
      canvas.setAttribute('aria-hidden', 'true');
      const name = document.createElement('b');
      name.textContent = id;
      tile.append(stage, canvas, name);
      evolutionCanvases.push({ canvas, species: id });
      return tile;
    };
    track.append(icon(selectedEgg, 'Bebé I'));
    line.forEach((id, index) => {
      const arrow = document.createElement('span');
      arrow.className = 'evolution-arrow';
      arrow.textContent = '→';
      arrow.setAttribute('aria-hidden', 'true');
      const tile = icon(id, stages[index], homeTab === 'incubator');
      if (homeTab === 'incubator') {
        tile.classList.toggle('editing', index === selectedEvolutionStage);
        tile.setAttribute('aria-label', 'Elegir ' + stages[index] + ': ' + id);
        tile.setAttribute('aria-pressed', index === selectedEvolutionStage);
        tile.onclick = () => {
          const scroll = track.scrollLeft;
          selectedEvolutionStage = index;
          makeEggs();
          $('#egg-grid .evolution-track').scrollLeft = scroll;
        };
      }
      track.append(arrow, tile);
    });
    route.append(track);
    if (homeTab === 'incubator') {
      const index = selectedEvolutionStage;
      const options = document.createElement('div');
      options.className = 'evolution-options';
      options.setAttribute('role', 'group');
      options.setAttribute('aria-label', 'Opciones de ' + stages[index]);
      const caption = document.createElement('p');
      caption.className = 'evolution-options-title';
      caption.textContent = 'Elige tu ' + stages[index];
      const from = index ? line[index - 1] : selectedEgg;
      for (const next of C.evolutionOptions(from, training)) {
        const option = icon(next, stages[index], true);
        option.classList.toggle('selected', next === line[index]);
        option.setAttribute('aria-label', 'Usar ' + next);
        option.setAttribute('aria-pressed', next === line[index]);
        option.onclick = () => {
          const scroll = track.scrollLeft;
          const preferred = line.slice(0, index);
          preferred.push(next);
          progression.lines ??= {};
          progression.lines[selectedEgg] = C.evolutionLine(selectedEgg, training, preferred);
          store(META_KEY, progression);
          makeEggs();
          $('#egg-grid .evolution-track').scrollLeft = scroll;
        };
        options.append(option);
      }
      route.append(caption, options);
    } else {
      const change = document.createElement('button');
      change.textContent = 'Cambiar línea en Incubadora';
      change.onclick = () => {
        homeTab = 'incubator';
        makeEggs();
      };
      route.append(change);
    }
    const help = document.createElement('small');
    help.textContent =
      homeTab === 'incubator'
        ? 'Pulsa una etapa y elige su Digimon. Cada 2 mejoras desbloqueas más opciones. La línea se aplica automáticamente en combate.'
        : 'Digievolucionas automáticamente por esta línea al subir de nivel.';
    route.append(help);
    panel.append(route);
  }
  if (homeTab === 'play') {
    const play = document.createElement('button');
    play.className = 'primary';
    play.textContent = training ? 'Jugar con ' + selectedEgg : 'Desbloquear en Incubadora';
    play.onclick = () => {
      if (training) begin(selectedEgg);
      else {
        homeTab = 'incubator';
        makeEggs();
      }
    };
    panel.append(play);
  } else {
    const balance = document.createElement('p');
    balance.className = 'incubator-balance';
    balance.textContent = 'Disponibles: ' + number(progression.bits) + ' bits';
    panel.append(balance);
    if (!training) {
      const unlock = document.createElement('button'),
        index = C.eggChoices.indexOf(egg),
        cost = DigibonkProgression.eggCost(index);
      unlock.textContent = 'Desbloquear huevo · ' + cost + ' bits';
      unlock.disabled = progression.bits < cost;
      unlock.onclick = () => purchase(egg.id, null, index);
      panel.append(unlock);
    } else {
      const level = DigibonkProgression.level(training),
        quality = document.createElement('p');
      quality.textContent =
        'Calidad del huevo · Nivel ' +
        level +
        ' · ' +
        Math.min(egg.branches.length, 1 + Math.floor(level / 2)) +
        '/' +
        egg.branches.length +
        ' primeras ramas disponibles';
      panel.append(quality);
      for (const [stat, def] of Object.entries(DigibonkProgression.stats)) {
        const n = training[stat] || 0,
          cost = DigibonkProgression.cost(training, stat),
          button = document.createElement('button');
        button.textContent =
          def.name +
          ' · ' +
          n +
          '/10 · +' +
          Math.round(n * def.step * (stat === 'maxHp' ? 1 : 100)) +
          (stat === 'maxHp' ? ' vida' : ' %') +
          ' — ' +
          (n >= 10 ? 'Máximo' : cost + ' bits');
        button.disabled = n >= 10 || progression.bits < cost;
        button.onclick = () => purchase(egg.id, stat, C.eggChoices.indexOf(egg));
        panel.append(button);
      }
      const help = document.createElement('p');
      help.textContent =
        'Cada 2 mejoras de calidad abres otra rama evolutiva por etapa. Las mejoras se aplican a tus próximas partidas.';
      panel.append(help);
    }
    const tip = document.createElement('small');
    tip.textContent =
      'Ganas bits al jugar: 1 cada 3 bajas y cada 20 segundos; 50 por portal y 250 por Devimon. Se guardan automáticamente.';
    panel.append(tip);
  }
  grid.append(panel);
}
$('#tab-play').onclick = () => {
  homeTab = 'play';
  makeEggs();
};
$('#tab-incubator').onclick = () => {
  homeTab = 'incubator';
  makeEggs();
};
$('#menu-information').onclick = () => {
  homeTab = 'information';
  makeEggs();
};
$('#information-back').onclick = () => {
  homeTab = 'menu';
  makeEggs();
};
$('#menu-back').onclick = () => {
  homeTab = 'menu';
  makeEggs();
};
for (const [id, target] of [
  ['menu-book', 'book-toggle'],
  ['menu-settings', 'settings-toggle'],
  ['menu-help', 'help-toggle'],
])
  $('#' + id).onclick = () => $('#' + target).click();
$('#menu-league').onclick = () => {
  homeTab = 'menu';
  makeEggs();
  $('#home-aside').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

showHome();

cloud.onBeforeChange = pauseAndSave;

cloud.onChange = (uid) => {
  META_KEY = uid ? 'digibonk.progression.v1:' + uid : 'digibonk.progression.v1';
  progression = read(META_KEY, null) || DigibonkProgression.fresh();
  RUN_KEY = uid ? 'digibonk.run.v1:' + uid : 'digibonk.run.v1';
  RECORDS_KEY = uid ? 'digibonk.records.v1:' + uid : 'digibonk.records.v1';
  records = read(RECORDS_KEY, []);
  run = null;
  showHome();
};

void cloud.initialize();

function refreshHud() {
  if (!run) return;
  refreshPortalTimer();
  refreshEquipment();
  refreshWorldHud();
  const s = run.s,
    p = s.player;
  $('#species-name').textContent = p.species;
  $('#stage-name').textContent = stageNames[p.stage];
  $('#life-fill').style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
  $('#life-label').textContent = Math.ceil(p.hp) + ' / ' + Math.ceil(p.maxHp);
  $('#xp-fill').style.width =
    (s.level >= 400 ? 100 : Math.min(100, (s.xp / C.xpNeeded(s.level)) * 100)) + '%';
  $('#level-label').textContent =
    s.level >= 400
      ? 'NIVEL 400 · MÁXIMO'
      : 'NIVEL ' + s.level + ' · ' + Math.floor(s.xp) + ' / ' + C.xpNeeded(s.level) + ' EXP';
  $('#run-clock').textContent = clock(s.time);
  $('#run-wave').textContent = s.realm
    ? s.realm.phase === 'waves'
      ? 'OLEADA ' + Math.max(1, s.realm.wave) + ' / 3'
      : s.realm.phase === 'tower'
        ? 'TORRE NEGRA'
        : 'PURIFICADO'
    : 'OLEADA ' + (1 + Math.floor(s.time / 30));
  $('#run-score').textContent = number(s.score + (s.done ? 0 : s.time * 2));
  $('#run-kills').textContent = number(s.kills);
  $('#run-coins').textContent = number(s.coins);
  const sig = p.weapons.map((w) => w.id + ':' + w.rank).join(',');
  if ($('#weapons').dataset.signature !== sig) {
    $('#weapons').dataset.signature = sig;
    renderTechniqueDevice($('#weapons'), p, { compact: true });
  }
  const boss =
    s.enemies.find((e) => e.tower && e.hp > 0) ||
    s.enemies.find((e) => e.finalBoss && e.hp > 0) ||
    s.enemies.find((e) => e.boss && e.hp > 0);
  $('#boss-bar').hidden = !boss;
  if (boss) {
    $('#boss-name').textContent = boss.species;
    $('#boss-type').textContent = boss.tower
      ? boss.shielded
        ? 'VINCULADA A LAS OLEADAS'
        : 'VULNERABLE'
      : boss.finalBoss
        ? 'JEFE FINAL'
        : 'INVASOR';
    $('#boss-fill').style.width = (boss.hp / boss.maxHp) * 100 + '%';
  }
  const poi = run.nearestPoi();
  $('#interact').hidden = !poi || paused || !!s.choice || !!s.evolution || s.hatch > 0 || s.done;
  if (poi) {
    const cost = run.poiCost(poi);
    $('#interact').textContent =
      keyLabel('interact') + ' · ' + poi.name + (cost ? ' · ' + cost + ' bits' : '');
  }
  $('#challenge-label').hidden = !s.challenge;
  if (s.challenge)
    $('#challenge-label').textContent =
      'SANTUARIO · ' +
      Math.min(8, s.challenge.progress).toFixed(1) +
      ' / 8 s · Permanece en el círculo';
  if (renderer) renderer.minimap($('#minimap'), run);
}

function refreshPortalTimer() {
  const panel = $('#portal-timer');
  panel.hidden = !active || !run || run.s.done;
  if (panel.hidden) return;
  const info = run.portalClockInfo();
  panel.dataset.phase = info.phase;
  panel.classList.toggle('urgent', info.phase === 'countdown' && info.remaining <= 30);
  $('#portal-timer-label').textContent =
    info.phase === 'inside'
      ? 'PORTAL EN CURSO'
      : info.phase === 'overdue'
        ? 'CORRUPCIÓN ACELERADA'
        : info.phase === 'complete'
          ? 'SUPERVIVENCIA'
          : 'PRÓXIMO PORTAL';
  $('#portal-timer-value').textContent =
    info.phase === 'inside'
      ? 'EN COMBATE'
      : info.phase === 'complete'
        ? '×' + info.growth.toFixed(1).replace('.', ',')
        : info.phase === 'overdue'
          ? '+' + clock(info.overdue)
          : clock(Math.ceil(info.remaining));
  $('#portal-timer-detail').textContent =
    info.phase === 'inside'
      ? 'Derrota las tres oleadas para destruir la torre.'
      : info.phase === 'complete'
        ? 'La dificultad sigue aumentando cada vez más rápido.'
        : info.phase === 'overdue'
          ? 'Enemigos muy potenciados. Entra en un portal cuanto antes.'
          : 'Entra antes de cero: después, los enemigos se potencian.';
  $('#portal-timer-fill').style.width =
    info.phase === 'overdue' ? '100%' : Math.max(0, (info.remaining / 180) * 100) + '%';
}

function refreshWorldHud() {
  if (!run) return;
  const s = run.s,
    p = s.player,
    style = run.style();
  $('#style-panel').hidden = !active || s.done;
  $('#style-name').textContent = style
    ? 'ESTILO · ' + style.name.toUpperCase()
    : 'ESTILO AÚN LATENTE';
  $('#style-passive').textContent = style
    ? style.passive
    : 'Digievoluciona a Rookie para desbloquear una acción propia.';
  $('#style-panel').style.setProperty('--style-color', style?.color || '#a3c4ae');
  $('#style-activate').textContent = style
    ? keyLabel('special') +
      ' · ' +
      style.ability +
      (p.styleCooldown > 0 ? ' · ' + Math.ceil(p.styleCooldown) + ' s' : '')
    : keyLabel('special') + ' · Se desbloquea en Rookie';
  $('#style-activate').disabled =
    !style || p.styleCooldown > 0 || paused || !!s.choice || !!s.evolution || s.hatch > 0;
  $('#style-activate').title = style?.description || '';
  const ready = style ? Math.max(0, Math.min(1, 1 - p.styleCooldown / style.cooldown)) : 0;
  $('#skill-recharge-fill').style.width = ready * 100 + '%';
  $('#skill-recharge').setAttribute('aria-valuenow', String(Math.round(ready * 100)));
  $('#skill-recharge-label').textContent = !style
    ? 'Disponible desde Rookie'
    : p.styleCooldown > 0
      ? 'Recargando · ' + Math.ceil(p.styleCooldown) + ' s'
      : 'Habilidad lista';
}

$('#style-activate').onclick = () => {
  if (active && !paused && !run.s.choice) {
    specialQueued = true;
    $('#world').focus({ preventScroll: true });
  }
};

function choose(id) {
  if (!run?.choose(id)) return;
  if (run.s.choice?.roll) {
    keys.clear();
    moveTarget = null;
    specialQueued = false;
    save();
    overlayKey = '';
    showChoice();
    return;
  }
  chestCarousel.clear();
  audio.play(run.s.evolution ? 'evolution' : 'pick');
  paused = false;
  keys.resumeMovement();
  $('#world').focus({ preventScroll: true });
  moveTarget = null;
  overlayKey = '';
  $('#choice-overlay').hidden = true;
  if (run.s.evolution && run.style())
    toast(
      'Nuevo estilo: ' +
        run.style().name +
        ' · ' +
        keyLabel('special') +
        ': ' +
        run.style().ability,
    );
  save();
  refreshHud();
}

$('#skip-chest').onclick = () => {
  if (!run?.skipChest()) return;
  chestCarousel.clear();
  keys.resumeMovement();
  specialQueued = false;
  overlayKey = '';
  $('#choice-overlay').hidden = true;
  $('#world').focus({ preventScroll: true });
  save();
  refreshHud();
};
const chestCarousel = new ChestCarousel($('#chest-carousel'));
const fitChoices = installChoiceFitter($('#choice-overlay'));
function riskChest() {
  if (!run?.riskChest()) return;
  save();
  overlayKey = '';
  showChoice();
}
function showChoice() {
  if (run.s.choice.roll) {
    const choice = run.s.choice;
    $('#choice-kicker').textContent =
      choice.roll.source === 'shop' ? 'MEJORA COMPRADA' : 'COFRE DE DATOS';
    $('#choice-title').textContent =
      choice.roll.source === 'shop' ? 'La calidad de tu mejora' : 'Tu próxima recompensa';
    $('#choice-subtitle').textContent =
      choice.roll.source === 'shop'
        ? 'La compra ya está pagada. Recógela o arriésgala por una calidad superior.'
        : 'Reliquias comunes, raras, épicas y legendarias; compañeros para tu equipo.';
    $('#choice-cards').hidden = true;
    $('#choice-hint').hidden = true;
    $('#skip-chest').hidden = true;
    $('#chest-carousel').hidden = false;
    $('#choice-overlay').hidden = false;
    fitChoices();
    const key = choice.roll.id + ':' + choice.roll.revision + ':' + choice.roll.phase;
    if (key !== overlayKey) {
      overlayKey = key;
      choiceCanvases = [];
      chestCarousel.show(
        choice,
        {
          claim: choose,
          risk: riskChest,
          canRisk: () => run.canRiskChest(),
          discard: () => $('#skip-chest').onclick(),
          reveal: (token) => {
            if (run?.revealChest(token)) {
              save();
              overlayKey = '';
              showChoice();
            }
          },
        },
        choiceCanvases,
      );
    }
    return;
  }
  chestCarousel.clear();
  $('#chest-carousel').hidden = true;
  $('#choice-cards').hidden = false;
  $('#choice-hint').hidden = false;
  const choice = run.s.choice,
    key = choice.kind + ':' + run.s.level + ':' + choice.cards.map((c) => c.id).join(',');
  if (key === overlayKey) return;
  overlayKey = key;
  choiceCanvases = [];
  $('#choice-kicker').textContent =
    choice.kind === 'evolution'
      ? 'LA SIGUIENTE FORMA DE TU LEYENDA'
      : choice.kind === 'shop'
        ? 'WIZARDMON · QUITAR TÉCNICAS'
        : choice.kind === 'chest'
          ? 'TESORO DIGITAL · ELIGE UNA RECOMPENSA'
          : 'CONSTRUYE TU PROPIA RUN';
  $('#choice-title').textContent = choice.title;
  $('#choice-subtitle').textContent =
    choice.kind === 'evolution'
      ? 'Elige tu rama. La nueva forma aporta vida, daño y una técnica característica.'
      : choice.kind === 'remove'
        ? 'Quitar una técnica es gratis. Perderás su rango y liberarás un hueco para aprender otra al subir de nivel.'
        : choice.kind === 'replace'
          ? 'Selecciona una de tus cuatro técnicas para reemplazarla, o conserva tu equipo actual.'
          : choice.kind === 'shop'
            ? 'Compra una técnica nueva. Si llevas cuatro, elige cuál sustituir. Quitar una técnica es gratis. Con menos de cuatro, puedes encontrar técnicas nuevas al subir de nivel. Precio de compra: ' +
              run.shopPrice() +
              ' bits.'
            : choice.kind === 'chest'
              ? 'Reliquias sin límite de cantidad, de rango 1–3 y 3 compañeros distintos. Los compañeros se suman a tu grupo. Puedes cerrar sin elegir; el cofre queda consumido.'
              : 'Combina técnicas y mejoras. Todo el poder de esta build dura esta partida.';
  $('#choice-cards').replaceChildren(
    ...choice.cards.map((card, i) => {
      const button = document.createElement('button');
      button.className =
        'choice-card' +
        (card.type === 'evolution' ? ' evolution' : '') +
        (card.rare ? ' rare' : '') +
        (card.quality ? ' quality-' + card.quality : '');
      if (card.weapon) frameTechnique(button, card.weapon);
      else if (card.type === 'stat') button.classList.add('stat-card');
      const kicker = document.createElement('span');
      kicker.className = 'card-kicker';
      kicker.textContent =
        (card.weapon ? SkillSystem.stageName(card.weapon) + ' · ' : '') + (card.rarity || 'MEJORA');
      button.append(kicker);
      if (card.species) {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 140;
        button.append(canvas);
        choiceCanvases.push({ canvas, species: card.species });
      } else if (!card.weapon) {
        const symbol = document.createElement('div');
        symbol.className = 'card-symbol';
        if (card.type === 'artifact') {
          symbol.classList.add('relic-symbol', card.theme);
          symbol.textContent = card.icon;
        } else
          symbol.textContent =
            card.type === 'weapon' || card.type === 'weapon-rank'
              ? '✦'
              : {
                  power: '⚔',
                  heart: '♡',
                  speed: '➤',
                  armor: '⬡',
                  wisdom: '◇',
                  projectile: '»',
                  orbit: '◉',
                  magnet: '⊕',
                }[card.id] || '✧';
        button.append(symbol);
      }
      const title = document.createElement('h3'),
        text = document.createElement('p'),
        pick = document.createElement('span');
      title.textContent = card.title;
      text.textContent = card.text;
      pick.textContent = i + 1 + ' · ELEGIR';
      pick.className = 'pick-label';
      button.append(title, text, pick);
      button.onclick = () => choose(card.id);
      return button;
    }),
  );
  $('#skip-chest').hidden = choice.kind !== 'chest';
  $('#choice-overlay').hidden = false;
  fitChoices();
  save();
}

function updateOverlays() {
  if (!run || !active) return;
  const s = run.s;
  $('#choice-overlay').hidden = !s.choice;
  $('#pause-overlay').hidden = !paused || !!s.choice || !!s.evolution || s.done;
  $('#evolution-cinema').hidden = !s.evolution && s.hatch <= 0;
  if (s.evolution) {
    $('#evolution-name').textContent = s.evolution.to;
    $('#evolution-line').textContent = s.evolution.from + ' → ' + s.evolution.to;
  } else if (s.hatch > 0) {
    $('#evolution-name').textContent = 'Una nueva vida';
    $('#evolution-line').textContent = 'El huevo de ' + s.egg + ' está a punto de abrirse.';
  }
  if (s.choice) showChoice();
  else overlayKey = '';
}

function end() {
  bankBits();
  $('#portal-timer').hidden = true;
  if (!run) return;
  const s = run.s;
  $('#style-panel').hidden = true;
  $('#equipment-strip').hidden = true;
  cloud.finish(s);
  if (!records.some((r) => r.id === s.id)) {
    records.push({
      id: s.id,
      score: s.score,
      time: s.time,
      kills: s.kills,
      level: s.level,
      species: s.player.species,
      history: s.history,
      devimonDefeated: !!s.world.devimonDefeated,
      date: new Date().toISOString(),
    });
    records.sort((a, b) => b.score - a.score);
    records = records.slice(0, 20);
    store(RECORDS_KEY, records);
  }
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {}
  $('#result-objective').textContent = s.world.devimonDefeated
    ? 'Devimon derrotado · Objetivo completado'
    : s.world.phase === 'devimon'
      ? 'Seis portales cerrados · Devimon sigue en pie'
      : 'Objetivo: ' + s.world.cleansed + ' / ' + s.world.target + ' portales cerrados';
  $('#result-species').textContent = s.player.species + ' · ' + stageNames[s.player.stage];
  $('#result-stats').replaceChildren();
  for (const [label, value] of [
    ['PUNTOS', number(s.score)],
    ['TIEMPO', clock(s.time)],
    ['BAJAS', number(s.kills)],
    ['NIVEL', s.level],
  ]) {
    const div = document.createElement('div'),
      b = document.createElement('b'),
      span = document.createElement('span');
    b.textContent = value;
    span.textContent = label;
    div.append(b, span);
    $('#result-stats').append(div);
  }
  $('#result-history').textContent = [s.egg, ...s.history.map((e) => e.to)].join(' → ');
  $('#result-build').textContent = [
    ...s.relics.map(
      (r) => DigibonkLoot.relics.find((d) => d.id === r.id)?.name + ' ' + r.rank + '/3',
    ),
    ...s.buddies.map((b) => 'Compañero: ' + b.species),
  ]
    .filter(Boolean)
    .join(' · ');
  $('#result-overlay').hidden = false;
  $('#hud').hidden = true;
  $('#map-panel').hidden = true;
  $('#controls-hint').hidden = true;
  $('#interact').hidden = true;
  $('#boss-bar').hidden = true;
  $('#challenge-label').hidden = true;
  paused = false;
  keys.clear();
}

async function sceneTransition(
  action = () => {},
  title = run?.s.realm ? 'Cruzando el portal' : 'Preparando la isla',
) {
  if (loading) return;
  loading = true;
  keys.clear();
  moveTarget = null;
  specialQueued = false;
  const el = $('#portal-transition'),
    frame = () => new Promise((resolve) => requestAnimationFrame(resolve)),
    progress = (value, text) => {
      $('#loading-detail').textContent = text;
      $('#loading-progress').style.width = Math.round(value * 100) + '%';
      el.querySelector('[role=progressbar]').setAttribute(
        'aria-valuenow',
        String(Math.round(value * 100)),
      );
    };
  el.classList.remove('leaving');
  $('#loading-title').textContent = title;
  $('#loading-retry').hidden = true;
  progress(0, 'Preparando escenario');
  try {
    if (active && run && !run.s.done) await renderer.travel(run, false);
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');
    await frame();
    await frame();
    await new Promise((resolve) => setTimeout(resolve, 300));
    action();
    renderer.travelHidden = active;
    await renderer.prepare(active ? run : null, progress);
    await new Promise((resolve) => setTimeout(resolve, 160));
    el.classList.add('leaving');
    el.classList.remove('active');
    await new Promise((resolve) => setTimeout(resolve, 300));
    el.classList.remove('leaving');
    el.setAttribute('aria-hidden', 'true');
    if (active && run) await renderer.travel(run, true);
    last = performance.now();
    keys.clear();
    moveTarget = null;
    specialQueued = false;
    loading = false;
    if (active) $('#world').focus({ preventScroll: true });
  } catch (error) {
    renderer.travelHidden = false;
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');
    console.error(error);
    $('#loading-detail').textContent =
      'No se ha podido completar la carga. Puedes reintentarlo sin avanzar la partida.';
    $('#loading-retry').hidden = false;
    $('#loading-retry').onclick = () => {
      loading = false;
      sceneTransition(() => {}, title);
    };
  }
}

function interact() {
  if (loading || !active || paused || run.s.choice) return;
  const poi = run.nearestPoi();
  if (['portal', 'realm-exit'].includes(poi?.type) && !run.s.evolution && run.s.hatch <= 0) {
    sceneTransition(
      () => {
        const result = run.interact();
        if (result.ok) {
          save();
          audio.play('pick');
        }
        refreshHud();
      },
      poi.type === 'portal' ? 'Cruzando el portal' : 'Volviendo a la isla',
    );
    return;
  }
  const result = run.interact();
  if (result.sceneChanged) {
    moveTarget = null;
    specialQueued = false;
    sceneTransition();
    toast(
      run.s.realm
        ? 'MAPA CORROMPIDO · Derrota tres oleadas para destruir la Torre Negra.'
        : 'Has vuelto al mapa principal.',
    );
  }
  if (result.message) toast(result.message);
  if (result.ok) {
    audio.play('pick');
    save();
  }
  refreshHud();
}

$('#interact').onclick = interact;

document.addEventListener('keydown', (event) => {
  if (loading) {
    if (!event.target.matches('input,textarea,select')) event.preventDefault();
    return;
  }
  if ($('#settings-dialog').open) {
    if (bindingCapture) {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.key === 'Escape') {
        bindingCapture = null;
        renderBindings();
        $('#binding-message').textContent = 'Cambio cancelado.';
        return;
      }
      const { action, slot } = bindingCapture,
        result = keys.bind(
          action,
          slot,
          slot === 1 && ['Backspace', 'Delete'].includes(event.key) ? '' : event,
        );
      if (result.ok) {
        bindingCapture = null;
        settings.bindings = keys.bindings;
        store(SETTINGS_KEY, settings);
        refreshControlLabels();
        renderBindings();
        $('#binding-message').textContent = 'Tecla guardada.';
      } else $('#binding-message').textContent = result.message;
    }
    return;
  }
  if (event.target.matches('input,textarea,select')) return;
  if (
    event.key === 'Tab' &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    active
  ) {
    if ($('#gear-dialog').open) {
      event.preventDefault();
      if (!event.repeat) $('#gear-dialog').close();
      return;
    }
    if (!document.querySelector('dialog[open]')) {
      event.preventDefault();
      if (!event.repeat) openGear();
      return;
    }
  }
  const key = event.key.toLowerCase(),
    action = keys.actionFor(event);
  if (action === 'map' && $('#map-dialog').open) {
    event.preventDefault();
    if (!event.repeat) $('#map-dialog').close();
    return;
  }
  if (document.querySelector('dialog[open]')) return;
  if (action === 'map') {
    if (active && !run?.s.done) {
      event.preventDefault();
      if (!event.repeat) openMap();
    }
    return;
  }
  if (active && run?.s.choice && ['1', '2', '3', '4', '5'].includes(key)) {
    if (!event.repeat) {
      if (run.s.choice.roll) {
        if (key === '1' && run.s.choice.cards[0]) choose(run.s.choice.cards[0].id);
      } else {
        const card = run.s.choice.cards[Number(key) - 1];
        if (card) choose(card.id);
      }
    }
    event.preventDefault();
    return;
  }
  if (key === 'escape' || action === 'pause') {
    if (active && !run.s.done && !run.s.choice && !run.s.evolution) {
      event.preventDefault();
      if (!event.repeat) {
        paused = !paused;
        specialQueued = false;
        keys.clear();
        save();
      }
    }
    return;
  }
  if (!active || run.s.done || !action) return;
  event.preventDefault();
  if (action === 'special') {
    if (!event.repeat && !paused && !run.s.choice && !run.s.evolution) specialQueued = true;
    return;
  }
  if (action === 'interact') {
    if (!event.repeat) interact();
    return;
  }
  if (!paused) keys.down(event);
});

document.addEventListener('keyup', (event) => keys.up(event));

$('#world').addEventListener('pointerdown', (event) => {
  if (!active || paused || run.s.choice || run.s.done || event.button !== 0) return;
  const point = renderer.pick(event.clientX, event.clientY);
  if (point) moveTarget = { x: point.x, z: point.z };
  audio.unlock();
});

function pauseAndSave() {
  specialQueued = false;
  keys.clear();
  moveTarget = null;
  if (active && run && !run.s.done) {
    paused = true;
    save();
  }
}

window.addEventListener('blur', pauseAndSave);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseAndSave();
});
window.addEventListener('beforeunload', save);
window.addEventListener('digibonk-save', save);

function controls(dt) {
  const sx = (keys.pressed('right') ? 1 : 0) - (keys.pressed('left') ? 1 : 0),
    sz = (keys.pressed('down') ? 1 : 0) - (keys.pressed('up') ? 1 : 0),
    yaw = renderer.cameraYaw;
  let x = sx * Math.cos(yaw) + sz * Math.sin(yaw),
    z = -sx * Math.sin(yaw) + sz * Math.cos(yaw);
  if (sx || sz) moveTarget = null;
  else if (moveTarget) {
    x = moveTarget.x - run.s.player.x;
    z = moveTarget.z - run.s.player.z;
    if (Math.hypot(x, z) < 0.65) {
      x = z = 0;
      moveTarget = null;
    }
  }
  const special = specialQueued;
  specialQueued = false;
  return { x, z, dash: keys.pressed('dash'), special };
}

function drawPortraits(time) {
  if (!active) {
    for (const { canvas, egg } of eggCanvases) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawDigiEgg(ctx, 60, 52, 76, time, egg.skin);
    }
    for (const { canvas, species } of evolutionCanvases) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      DigiSprites.drawGrounded(ctx, species, 'idle', 48, 82, 76, time);
    }
  } else if (run) {
    const p = run.s.player,
      canvas = $('#portrait'),
      ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 80, 80);
    if (run.s.hatch > 0) drawDigiEgg(ctx, 40, 39, 55, time, run.s.skin);
    else DigiSprites.drawGrounded(ctx, p.species, 'idle', 40, 73, 72, time);
    if (run.s.done) {
      const canvas = $('#result-portrait'),
        ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 180, 150);
      DigiSprites.drawGrounded(ctx, p.species, 'ko', 90, 140, 132, time);
    }
  }
  if ($('#gear-dialog').open && run) {
    const canvas = $('#gear-portrait'),
      ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (run.s.hatch > 0) drawDigiEgg(ctx, 140, 140, 140, time, run.s.skin);
    else DigiSprites.drawGrounded(ctx, run.s.player.species, 'idle', 140, 240, 210, time);
  }
  for (const { canvas, species } of choiceCanvases) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    DigiSprites.drawGrounded(ctx, species, 'happy', 90, 128, 120, time);
  }
}

function loop(now) {
  if (loading) {
    last = now;
    requestAnimationFrame(loop);
    return;
  }
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  if (
    active &&
    run &&
    !paused &&
    !document.hidden &&
    !window.DigibonkDesktopHidden &&
    !run.s.done
  ) {
    const scene = run.s.sceneSerial;
    run.update(dt, controls(dt));
    if (run.s.pendingRealmReturn) {
      sceneTransition(() => {
        run.leaveRealm();
        refreshHud();
        save();
      }, 'Portal cerrado · Volviendo a la isla');
    } else if (scene !== run.s.sceneSerial) {
      moveTarget = null;
      specialQueued = false;
      sceneTransition();
      save();
    }
    for (const event of run.events) {
      audio.play(event.type);
      if (event.type === 'damage') {
        $('#damage-flash').style.opacity = '1';
        setTimeout(() => ($('#damage-flash').style.opacity = '0'), 100);
      }
      if (event.type === 'portal-entered')
        toast(
          'PORTAL · ' +
            event.name +
            ' · Presión de nivel ' +
            event.level +
            ' · Derrota tres oleadas para destruir la torre',
        );
      if (event.type === 'portal-deadline')
        toast('TIEMPO AGOTADO · La corrupción potencia a los enemigos. Entra en un portal');
      if (event.type === 'portal-returned') toast('Has regresado al mapa principal.');
      if (event.type === 'realm-wave') toast('OLEADA ' + event.wave + ' / 3');
      if (event.type === 'tower-vulnerable')
        toast('ESCUDO DESTRUIDO · Busca la Torre Negra y atácala');
      if (event.type === 'tower-destroyed')
        toast('TORRE DESTRUIDA · Portal cerrado · +1000 puntos · +100 bits');
      if (event.type === 'boss') toast('Un invasor ha entrado en la isla.');
      if (event.type === 'outbreak')
        toast(
          'CORRUPCIÓN · ' +
            event.zone +
            ' · ' +
            DigibonkWorld.types[event.kind].name +
            '. Busca el nodo luminoso.',
        );
      if (event.type === 'purified')
        toast(
          event.zone +
            ' purificado · ' +
            run.s.world.cleansed +
            '/' +
            run.s.world.target +
            ' zonas · +20 bits · +20 EXP',
        );
      if (event.type === 'devimon-awakened') {
        toast('DEVIMON HA DESPERTADO · Regresa al sello del centro');
        audio.play('boss');
      }
      if (event.type === 'devimon-engaged')
        toast('JEFE FINAL · Devimon · Evita sus orbes y los círculos oscuros');
      if (event.type === 'devimon-defeated') {
        toast('DEVIMON DERROTADO · +5000 puntos · +250 bits · Sigue jugando para hacer récord');
        audio.play('evolution');
      }
      if (event.type === 'purify-cancel') toast('Purificación interrumpida: vuelve junto al nodo.');
      if (event.type === 'style') audio.play('pick');
      if (event.type === 'end') end();
    }
    saveClock += dt;
    if (saveClock >= 5) {
      saveClock = 0;
      save();
    }
  }

  if (active) {
    updateOverlays();
    hudClock += dt;
    if (hudClock > 0.1) {
      hudClock = 0;
      if (!run.s.done) refreshHud();
    }
  }
  if (toastLeft > 0) {
    toastLeft -= dt;
    if (toastLeft <= 0) $('#toast').textContent = '';
  }
  const devimonFight =
    active &&
    !run?.s.done &&
    run?.s.enemies.find((e) => e.finalBoss && e.species === 'Devimon' && e.engaged && e.hp > 0);
  music.tick(
    active && !paused && !document.hidden && !window.DigibonkDesktopHidden && !run?.s.done,
    !active && !document.hidden && !window.DigibonkDesktopHidden && !loading,
    active && !run?.s.realm && !run?.s.done && !devimonFight,
    devimonFight
      ? { kind: 'devimon', portalId: devimonFight.id }
      : active && !run?.s.done
        ? run?.s.realm
        : null,
  );
  if (!loading) renderer.render(active ? run : null, dt, { menu: !active });
  drawPortraits(now / 1000);
  cloud.tick(!active, now / 1000);
  requestAnimationFrame(loop);
}

try {
  renderer = new Renderer3D($('#world'), $('#vfx'));
  renderer.bindings = keys;
  renderer.visibility = settings.visibility;
  sceneTransition(() => {}, 'Preparando Digibonk');
  requestAnimationFrame(loop);
} catch (error) {
  $('#fatal-error').hidden = false;
  $('#fatal-text').textContent = String(error.message || error);
  document.body.dataset.renderer = 'failed';
  console.error(error);
}
