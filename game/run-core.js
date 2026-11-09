(function (root) {
  'use strict';
  const DIFFICULTY =
    typeof module !== 'undefined' && module.exports
      ? require('./difficulty-system.js')
      : root.DigibonkDifficulty;
  const STATUSES =
    typeof module !== 'undefined' && module.exports
      ? require('./status-system.js')
      : root.DigibonkStatusSystem;
  const PATTERNS =
    typeof module !== 'undefined' && module.exports
      ? require('./pattern-combat.js')
      : root.DigibonkPatternCombat;
  const RELIC_EFFECTS =
    typeof module !== 'undefined' && module.exports
      ? require('./relic-effects.js')
      : root.DigibonkRelicEffects;
  const CHEST =
    typeof module !== 'undefined' && module.exports
      ? require('./chest-system.js')
      : root.DigibonkChest;
  const LOOT =
    typeof module !== 'undefined' && module.exports ? require('./loot.js') : root.DigibonkLoot;
  const WORLD_SYSTEM =
    typeof module !== 'undefined' && module.exports
      ? require('./world-system.js')
      : root.DigibonkWorldSystem;
  const BALANCE =
    typeof module !== 'undefined' && module.exports
      ? require('./balance.js')
      : root.DigibonkBalance;
  const WORLD_RULES =
    typeof module !== 'undefined' && module.exports
      ? require('./world-rules.js')
      : root.DigibonkWorld;
  const WORLD = WORLD_RULES.WORLD,
    VERSION = 1,
    EVOLUTION_LEVELS = { 0: 3, 1: 6, 2: 12, 3: 20, 4: 30 };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
    distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function hash(x, z, seed) {
    let n = Math.imul(x + 317, 374761393) ^ Math.imul(z + 719, 668265263) ^ (seed | 0);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const ponds = [
    { x: -39, z: 31, r: 9 },
    { x: 46, z: -48, r: 11 },
    { x: -140, z: -120, r: 14 },
    { x: 135, z: 90, r: 16 },
    { x: -140, z: 145, r: 11 },
    { x: 125, z: -145, r: 12 },
  ];
  const maps = new Map();
  function heightAt(x, z, seed) {
    const offset = (seed % 97) * 0.13,
      base =
        1.25 +
        Math.sin(x * 0.045 + offset) * 1.2 +
        Math.cos(z * 0.052 - offset) * 0.9 +
        Math.sin((x + z) * 0.07) * 0.45;
    for (const pond of ponds) {
      const d = Math.hypot(x - pond.x, z - pond.z);
      if (d < pond.r + 2) return -0.7 + clamp((d - pond.r) / 2, 0, 1) * (base + 0.7);
    }
    return base;
  }
  function mapFor(seed) {
    if (maps.has(seed)) return maps.get(seed);
    let n = seed >>> 0;
    const random = () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
    const pois = [
      { id: 'fire', type: 'fire', name: 'Hoguera de descanso', x: -12, z: 6, cost: 20 },
      {
        id: 'merchant',
        type: 'merchant',
        name: 'Wizardmon · Quitar técnicas',
        species: 'Wizardmon',
        x: 23,
        z: 23,
        cost: 40,
      },
      { id: 'altar-1', type: 'altar', name: 'Santuario del valor', x: -43, z: -20, cost: 0 },
      { id: 'altar-2', type: 'altar', name: 'Santuario de las ruinas', x: 68, z: 65, cost: 0 },
      { id: 'fire-north', type: 'fire', name: 'Campamento del norte', x: -80, z: -145, cost: 20 },
      { id: 'fire-south', type: 'fire', name: 'Campamento del sur', x: 80, z: 145, cost: 20 },
      {
        id: 'merchant-west',
        type: 'merchant',
        name: 'Wizardmon · Tienda del oeste',
        species: 'Wizardmon',
        x: -160,
        z: 40,
        cost: 40,
      },
      { id: 'altar-east', type: 'altar', name: 'Santuario del este', x: 155, z: -85, cost: 0 },
    ];
    for (let i = 0; i < 48; i++) {
      let x, z;
      do {
        x = (random() - 0.5) * (WORLD * 2 - 34);
        z = (random() - 0.5) * (WORLD * 2 - 34);
      } while (
        ponds.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 4) ||
        Math.hypot(x, z) < 15 ||
        pois.some((p) => Math.hypot(x - p.x, z - p.z) < 7)
      );
      pois.push({ id: 'chest-' + i, type: 'chest', name: 'Cofre de datos', x, z, cost: 30 });
    }
    const obstacles = [],
      grid = new Map();
    for (let i = 0; i < 1000; i++) {
      const x = (random() - 0.5) * (WORLD * 2 - 10),
        z = (random() - 0.5) * (WORLD * 2 - 10);
      if (
        Math.hypot(x, z) < 11 ||
        pois.some((p) => Math.hypot(x - p.x, z - p.z) < 6) ||
        ponds.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 3)
      )
        continue;
      const type = i % 9 === 0 ? 'crystal' : i % 4 === 0 ? 'rock' : 'tree',
        r = type === 'tree' ? 0.9 : type === 'rock' ? 1.2 : 0.75,
        o = { id: i, x, z, type, r, size: 0.8 + random() * 0.65 };
      obstacles.push(o);
      const key = Math.floor(x / 8) + ':' + Math.floor(z / 8);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(o);
    }
    const map = {
      seed,
      pois: pois.filter((p) => p.type !== 'chest' || Number(p.id.slice(6)) < 6),
      obstacles,
      grid,
    };
    maps.set(seed, map);
    if (maps.size > 5) maps.delete(maps.keys().next().value);
    return map;
  }
  function walkable(x, z, seed, r = 0.5) {
    if (Math.abs(x) > WORLD - 3 || Math.abs(z) > WORLD - 3) return false;
    if (ponds.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + r)) return false;
    const map = mapFor(seed),
      gx = Math.floor(x / 8),
      gz = Math.floor(z / 8);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const o of map.grid.get(gx + i + ':' + (gz + j)) || [])
          if (Math.hypot(x - o.x, z - o.z) < o.r + r) return false;
    return true;
  }
  // Shared reverse navigation field: every enemy routes around the same static obstacles.
  const navigationMaps = new Map(),
    NAV_STEP = 2,
    NAV_N = WORLD - 3,
    NAV_MIN = -WORLD + 4;
  function clearPath(a, b, seed, r = 0.62) {
    const d = distance(a, b),
      steps = Math.max(1, Math.ceil(d / 0.65));
    for (let i = 1; i <= steps; i++)
      if (!walkable(a.x + ((b.x - a.x) * i) / steps, a.z + ((b.z - a.z) * i) / steps, seed, r))
        return false;
    return true;
  }
  function navigation(seed) {
    if (navigationMaps.has(seed)) return navigationMaps.get(seed);
    const count = NAV_N * NAV_N,
      points = Array.from({ length: count }, (_, i) => ({
        x: NAV_MIN + (i % NAV_N) * NAV_STEP,
        z: NAV_MIN + Math.floor(i / NAV_N) * NAV_STEP,
      })),
      edges = Array.from({ length: count }, () => []),
      open = points.map((p) => walkable(p.x, p.z, seed, 0.8));
    for (let i = 0; i < count; i++) {
      if (!open[i]) continue;
      const x = i % NAV_N,
        z = Math.floor(i / NAV_N);
      for (const [dx, dz] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ]) {
        const xx = x + dx,
          zz = z + dz;
        if (xx < 0 || xx >= NAV_N || zz >= NAV_N) continue;
        const j = zz * NAV_N + xx;
        if (open[j] && clearPath(points[i], points[j], seed, 0.8)) {
          edges[i].push(j);
          edges[j].push(i);
        }
      }
    }
    const nav = { points, edges, open, target: -1, dist: new Int32Array(count) };
    navigationMaps.set(seed, nav);
    if (navigationMaps.size > 5) navigationMaps.delete(navigationMaps.keys().next().value);
    return nav;
  }
  function nearbyNodes(unit, nav, range = 2) {
    const x = Math.round((unit.x - NAV_MIN) / NAV_STEP),
      z = Math.round((unit.z - NAV_MIN) / NAV_STEP),
      list = [];
    for (let dz = -range; dz <= range; dz++)
      for (let dx = -range; dx <= range; dx++) {
        const xx = x + dx,
          zz = z + dz;
        if (xx >= 0 && xx < NAV_N && zz >= 0 && zz < NAV_N) {
          const i = zz * NAV_N + xx;
          if (nav.open[i]) list.push(i);
        }
      }
    return list;
  }
  function fieldFor(target, seed) {
    const nav = navigation(seed),
      candidates = nearbyNodes(target, nav, 3).sort(
        (a, b) => distance(nav.points[a], target) - distance(nav.points[b], target),
      ),
      goal = candidates.find((i) => clearPath(target, nav.points[i], seed)) ?? candidates[0];
    if (goal === undefined) return nav;
    if (nav.target === goal) return nav;
    nav.target = goal;
    nav.dist.fill(-1);
    const queue = new Int32Array(nav.points.length);
    let head = 0,
      tail = 1;
    queue[0] = goal;
    nav.dist[goal] = 0;
    while (head < tail) {
      const i = queue[head++];
      for (const j of nav.edges[i])
        if (nav.dist[j] < 0) {
          nav.dist[j] = nav.dist[i] + 1;
          queue[tail++] = j;
        }
    }
    return nav;
  }
  function enemyDirection(unit, target, seed) {
    if (clearPath(unit, target, seed)) {
      unit.navWaypoint = null;
      return { x: target.x - unit.x, z: target.z - unit.z };
    }
    const nav = fieldFor(target, seed);
    if (unit.navGoal !== nav.target) {
      unit.navGoal = nav.target;
      unit.navWaypoint = null;
    }
    if (
      unit.navWaypoint &&
      distance(unit, unit.navWaypoint) > 0.25 &&
      clearPath(unit, unit.navWaypoint, seed)
    )
      return { x: unit.navWaypoint.x - unit.x, z: unit.navWaypoint.z - unit.z };
    let best = null,
      score = Infinity;
    for (const i of nearbyNodes(unit, nav, 2)) {
      if (nav.dist[i] < 0) continue;
      const point = nav.points[i],
        d = distance(unit, point),
        value = nav.dist[i] * NAV_STEP + d;
      if (d > 0.3 && value < score && clearPath(unit, point, seed)) {
        score = value;
        best = point;
      }
    }
    unit.navWaypoint = best ? { x: best.x, z: best.z } : null;
    return best ? { x: best.x - unit.x, z: best.z - unit.z } : { x: 0, z: 0 };
  }
  function xpNeeded(level) {
    if (level >= 400) return Infinity;
    return (
      6 +
      level * 3 +
      Math.floor(Math.pow(level, 1.3) * 0.4 + 0.35 * Math.pow(Math.max(0, level - 12), 2.2))
    );
  }
  const upgrades = [
    { id: 'power', title: 'Instinto feroz', text: '+10 % de daño', stat: 'damage', factor: 1.1 },
    {
      id: 'haste',
      title: 'Ritmo de combate',
      text: 'Ataques un 10 % más rápidos',
      stat: 'haste',
      factor: 1.1,
    },
    { id: 'speed', title: 'Paso ligero', text: '+8 % de velocidad', stat: 'speed', factor: 1.08 },
    {
      id: 'heart',
      title: 'Corazón digital',
      text: '+20 de vida máxima y recupera 25',
      stat: 'maxHp',
      amount: 20,
    },
    {
      id: 'regen',
      title: 'Código reparador',
      text: 'Regenera 0,4 de vida por segundo',
      stat: 'regen',
      amount: 0.4,
    },
    {
      id: 'crit',
      title: 'Punto débil',
      text: '+7 % de probabilidad crítica',
      stat: 'crit',
      amount: 0.07,
    },
    {
      id: 'magnet',
      title: 'Imán de fragmentos',
      text: '+25 % de alcance de recogida',
      stat: 'magnet',
      factor: 1.25,
    },
    {
      id: 'wisdom',
      title: 'Memoria expandida',
      text: '+12 % de experiencia recogida',
      stat: 'xpMult',
      factor: 1.12,
    },
    {
      id: 'area',
      title: 'Resonancia',
      text: '+15 % de área de las técnicas',
      stat: 'area',
      factor: 1.15,
    },
    { id: 'armor', title: 'Escamas resistentes', text: '+1 de armadura', stat: 'armor', amount: 1 },
    {
      id: 'projectile',
      title: 'Disparo gemelo',
      text: '+1 golpe o proyectil en todas las técnicas ofensivas',
      stat: 'projectileBonus',
      amount: 1,
      rare: true,
    },
    {
      id: 'orbit',
      title: 'Satélite de datos',
      text: 'Añade un orbe que busca experiencia y la trae al Digimon',
      stat: 'orbits',
      amount: 1,
      rare: true,
    },
  ];
  function crowdGrid(enemies) {
    const grid = new Map();
    for (const e of enemies) {
      if (e.hp <= 0 || e.tower) continue;
      const key = Math.floor(e.x / 2.2) + ',' + Math.floor(e.z / 2.2);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(e);
    }
    return grid;
  }
  function crowdDirection(e, direction, grid) {
    if (e.boss || e.tower) return direction;
    const cx = Math.floor(e.x / 2.2),
      cz = Math.floor(e.z / 2.2);
    let rx = 0,
      rz = 0;
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let z = cz - 1; z <= cz + 1; z++)
        for (const other of grid.get(x + ',' + z) || []) {
          if (other === e || other.hp <= 0) continue;
          let dx = e.x - other.x,
            dz = e.z - other.z,
            d = Math.hypot(dx, dz);
          if (d >= 2.1) continue;
          if (d < 0.001) {
            const angle = (e.id + other.id) * 2.399963,
              side = e.id < other.id ? 1 : -1;
            dx = Math.cos(angle) * side;
            dz = Math.sin(angle) * side;
            d = 1;
          }
          const force = 1 - Math.min(2.1, Math.hypot(e.x - other.x, e.z - other.z)) / 2.1;
          rx += (dx / d) * force;
          rz += (dz / d) * force;
        }
    const n = Math.hypot(direction.x, direction.z) || 1,
      strength = Math.max(1, Math.hypot(rx, rz) / 2);
    return {
      x: direction.x / n + (rx / strength) * 1.4,
      z: direction.z / n + (rz / strength) * 1.4,
    };
  }
  function create(catalog, routes, skills) {
    const species = new Map(catalog.map((s) => [s.id, s])),
      forward = new Map();
    for (const r of routes) {
      if (
        !species.has(r.from) ||
        !species.has(r.to) ||
        species.get(r.to).stage !== species.get(r.from).stage + 1
      )
        continue;
      if (!forward.has(r.from)) forward.set(r.from, []);
      if (!forward.get(r.from).includes(r.to)) forward.get(r.from).push(r.to);
    }
    const reach = new Map();
    function reachesMega(id, seen = new Set()) {
      if (reach.has(id)) return reach.get(id);
      if (species.get(id)?.stage === 4) return true;
      if (seen.has(id)) return false;
      const next = new Set(seen).add(id),
        ok = (forward.get(id) || []).some((n) => reachesMega(n, next));
      reach.set(id, ok);
      return ok;
    }
    const eggChoices = catalog
      .filter((s) => s.stage === -1 && reachesMega(s.id))
      .map((s, i) => ({
        id: s.id,
        skin: 'egg-' + (i % 8),
        branches: (forward.get(s.id) || []).filter((id) => reachesMega(id)),
      }));
    function evolutionOptions(id, training) {
      const level = ['damage', 'haste', 'maxHp', 'speed'].reduce(
        (n, key) => n + (training?.[key] || 0),
        0,
      );
      return (forward.get(id) || [])
        .filter((next) => reachesMega(next))
        .slice(0, 1 + Math.floor(level / 2));
    }
    function evolutionLine(egg, training, preferred = []) {
      const line = [];
      let current = egg;
      while (species.get(current)?.stage < 4) {
        const options = evolutionOptions(current, training);
        const next = options.includes(preferred[line.length]) ? preferred[line.length] : options[0];
        if (!next) break;
        line.push(next);
        current = next;
      }
      return line;
    }
    function signature(id) {
      return skills.signature({ species: id, stage: species.get(id).stage, isEgg: false });
    }
    function supportEffect(skill, rank = 1) {
      rank = clamp(rank, 1, 9);
      return {
        heal: (skill.id === 'great-heal' ? 0.18 : 0.1) + rank * 0.012,
        duration: skill.kind === 'shield' ? 4 + rank * 0.2 : 6 + (rank - 1) * 0.4,
        cooldown: skill.cooldown * (1 - (rank - 1) * 0.02),
        threshold: 0.8,
        damageBoost: 0.25,
        criticalBoost: 0.15,
        hasteBoost: 0.2,
        damageReduction: 0.55,
      };
    }
    function describeTechnique(id, rank = 1, player = { haste: 1 }) {
      const skill = skills.skills[id];
      if (!skill) return '';
      if (skill.kind === 'damage') {
        const behavior =
          {
            cone: 'Ataque en área en cono.',
            ring: 'Ataque en área a tu alrededor.',
            pillar: 'Ataque en área sobre un enemigo.',
            meteor: 'Meteorito que explota en área.',
            rain: 'Lluvia de ataques en área.',
            chain: 'Ataque que salta entre enemigos.',
            volley: 'Ráfaga de proyectiles a enemigos cercanos.',
          }[skill.pattern] ||
          (skill.mode === 'melee'
            ? 'Golpe cuerpo a cuerpo a enemigos cercanos.'
            : 'Disparo de proyectiles a enemigos cercanos.');
        return behavior;
      }
      return (
        {
          heal: 'Recupera vida automáticamente cuando estás herido.',
          shield: 'Reduce el daño recibido durante unos segundos.',
          buff: 'Aumenta tu daño durante unos segundos.',
          restore: 'Aumenta la probabilidad de golpe crítico.',
          haste: 'Tus ataques se activan más rápido durante unos segundos.',
        }[skill.kind] || ''
      );
    }

    class Run {
      constructor(egg, { seed = Date.now() >>> 0, saved = null, id = null } = {}) {
        if (saved) {
          this.s = structuredClone(saved);
          this.validate();
        } else {
          const selected =
            eggChoices.find((e) => e.id === egg) ||
            eggChoices.find((e) => e.id === 'Botamon') ||
            eggChoices[0];
          this.s = {
            version: VERSION,
            id: id || 'run-' + Date.now().toString(36) + '-' + seed,
            seed: seed >>> 0,
            mapSeed: seed >>> 0,
            time: 0,
            hatch: 2.2,
            egg: selected.id,
            skin: selected.skin,
            level: 1,
            xp: 0,
            totalXp: 0,
            kills: 0,
            score: 0,
            coins: 0,
            nextId: 1,
            spawnClock: 1,
            nextBoss: 90,
            done: false,
            choice: null,
            evolution: null,
            history: [],
            usedPois: [],
            poiPrices: {},
            challenge: null,
            player: {
              x: 0,
              z: 0,
              hp: 100,
              maxHp: 100,
              damage: 10,
              speed: 8,
              armor: 0,
              crit: 0.05,
              haste: 1,
              area: 1,
              xpMult: 1,
              magnet: 4.8,
              regen: 0,
              projectileBonus: 0,
              orbits: 0,
              orbitClock: 0,
              stage: -2,
              species: 'DigiHuevo',
              invulnerable: 0,
              dash: 0,
              dashLeft: 0,
              attackAt: -10,
              basicClock: 0,
              face: false,
              action: 'idle',
              rallyLeft: 0,
              shieldLeft: 0,
              focusLeft: 0,
              weapons: [],
            },
            enemies: [],
            shots: [],
            hostile: [],
            gems: [],
            fx: [],
          };
        }
        this.s.relics ??= [];
        this.s.droppedChests ??= [];
        this.s.chestsOpened ??= [
          this.s,
          this.s.mainScene,
          ...Object.values(this.s.portalRuns || {}).map((r) => r.scene),
        ].reduce(
          (n, scene) =>
            n +
            (scene?.usedPois || []).filter(
              (id) => id.startsWith('chest-') || id.startsWith('drop-chest-'),
            ).length,
          0,
        );
        this.s.buddies ??= this.s.buddy ? [this.s.buddy] : [];
        delete this.s.buddy;
        this.s.relicClocks ??= {};
        this.s.shopPurchases ??= Object.entries(
          this.s.mainScene?.poiPrices || this.s.poiPrices || {},
        ).reduce(
          (n, [id, price]) =>
            n + (id.startsWith('merchant') ? Math.max(0, Math.round((price - 40) / 25)) : 0),
          0,
        );
        this.map = mapFor(this.s.mapSeed);
        this.events = [];
        this.initializeWorld();
        this.s.level = Math.min(400, Math.max(1, this.s.level));
        if (this.s.level === 400) this.s.xp = 0;
        if (this.s.techniqueRevision !== 1) {
          const p = this.s.player,
            id = skills.signatureIds[p.species];
          if (p.stage >= 1 && id && !p.weapons.some((w) => w.id === id)) {
            const candidate = p.weapons
              .filter(
                (w) =>
                  skills.skills[w.id]?.kind === 'damage' &&
                  [skills.family(p.species), skills.skills[id].family].includes(
                    skills.skills[w.id].family,
                  ),
              )
              .sort((a, b) => skills.skills[b.id].stage - skills.skills[a.id].stage)[0];
            if (candidate) {
              candidate.id = id;
              candidate.clock = 0;
            } else if (p.weapons.length < 4) p.weapons.push({ id, rank: 1, clock: 0 });
          }
          this.s.techniqueRevision = 1;
        }
        if (this.s.choice?.kind === 'shop' && !this.s.choice.roll)
          this.s.choice = this.removalChoices();
        if (this.s.choice?.kind === 'evolution') {
          const target = this.s.player.stage + 1;
          const options = evolutionOptions(this.s.player.species, this.s.eggTraining);
          const planned = this.s.evolutionLine?.[target];
          const next = options.includes(planned) ? planned : options[0];
          this.s.choice = next
            ? { kind: 'evolution', cards: [{ id: next, type: 'evolution', species: next }] }
            : null;
          if (next) this.choose(next);
        }
      }
      validate() {
        const s = this.s;
        if (
          s.version !== VERSION ||
          !s.player ||
          !species.has(s.egg) ||
          !Array.isArray(s.enemies) ||
          !Number.isFinite(s.time) ||
          s.time < 0 ||
          !Number.isFinite(s.player.hp)
        )
          throw Error('Partida no compatible');
        s.enemies = s.enemies.slice(0, 220);
        s.shots = s.shots.slice(0, 180);
        s.gems = s.gems.slice(0, 250);
        s.fx = s.fx.slice(0, 100);
      }
      random() {
        this.s.seed = (Math.imul(this.s.seed, 1664525) + 1013904223) >>> 0;
        return this.s.seed / 4294967296;
      }
      emit(type, data = {}) {
        this.events.push({ type, ...data });
      }
      effect(kind, x, z, other = {}) {
        const s = this.s,
          visual = skills.skills[other.skillId]?.visual,
          duration =
            kind === 'burst'
              ? visual === 'wave'
                ? 1.1
                : visual === 'sun'
                  ? 1.2
                  : 0.85
              : kind === 'slash'
                ? 0.4
                : kind === 'cast'
                  ? 0.25
                  : 0.6;
        s.fx.push({
          id: s.nextId++,
          kind,
          x,
          z,
          dx: s.player.lastDX || 1,
          dz: s.player.lastDZ || 0,
          life: duration,
          maxLife: duration,
          ...other,
        });
        if (s.fx.length > 100) s.fx.shift();
      }
      move(unit, dx, dz, speed, dt, r = 0.5, arrive = false) {
        if (unit.structure) return false;
        const length = Math.hypot(dx, dz);
        if (!length) return false;
        const distanceToMove = Math.min(speed * dt, arrive ? length : Infinity),
          parts = Math.max(1, Math.ceil(distanceToMove / 0.35)),
          step = distanceToMove / parts,
          nx = dx / length,
          nz = dz / length,
          seed = this.s.mapSeed,
          startX = unit.x,
          startZ = unit.z;
        for (let i = 0; i < parts; i++) {
          const beforeX = unit.x,
            beforeZ = unit.z,
            x = clamp(unit.x + nx * step, -WORLD + 3, WORLD - 3),
            z = clamp(unit.z + nz * step, -WORLD + 3, WORLD - 3);
          if (walkable(x, z, seed, r)) {
            unit.x = x;
            unit.z = z;
          } else {
            if (walkable(x, unit.z, seed, r)) unit.x = x;
            if (walkable(unit.x, z, seed, r)) unit.z = z;
            if (
              unit === this.s.player &&
              !arrive &&
              Math.hypot(unit.x - beforeX, unit.z - beforeZ) < step * 0.25
            ) {
              for (const angle of [0.65, -0.65, 1.1, -1.1, 1.5, -1.5]) {
                const cx = beforeX + (nx * Math.cos(angle) - nz * Math.sin(angle)) * step,
                  cz = beforeZ + (nx * Math.sin(angle) + nz * Math.cos(angle)) * step;
                if (walkable(cx, cz, seed, r)) {
                  unit.x = cx;
                  unit.z = cz;
                  break;
                }
              }
            }
          }
        }
        return Math.hypot(unit.x - startX, unit.z - startZ) > 0.00001;
      }
      addWeapon(id) {
        const p = this.s.player,
          definition = skills.skills[id];
        if (!definition) return;
        const same = p.weapons.find((w) => w.id === id);
        if (same) {
          same.rank = Math.min(9, same.rank + 1);
          return;
        }
        const related =
          definition.kind === 'damage' &&
          p.weapons.find(
            (w) =>
              skills.skills[w.id]?.family === definition.family &&
              skills.skills[w.id]?.kind === 'damage',
          );
        if (related) {
          related.id = id;
          related.rank = Math.min(9, related.rank + 1);
          related.clock = 0;
          return;
        }
        if (p.weapons.length < 4) p.weapons.push({ id, rank: 1, clock: 0 });
        else {
          const weakest = p.weapons.slice().sort((a, b) => a.rank - b.rank)[0];
          weakest.id = id;
          weakest.clock = 0;
        }
      }
      upgradeAvailable(u) {
        const p = this.s.player;
        return !{
          projectile: p.projectileBonus >= 5,
          orbit: p.orbits >= 6,
          speed: p.speed >= 15,
          crit: p.crit >= 0.85,
          magnet: p.magnet >= 24,
        }[u.id];
      }
      shopPrice() {
        const n = this.s.shopPurchases;
        return 40 + 25 * n + 5 * Math.floor(n / 5) ** 2;
      }
      poiCost(poi) {
        if (poi.type === 'chest') return this.chestPrice();
        return poi.type === 'merchant' ? 0 : (this.s.poiPrices[poi.id] ?? poi.cost);
      }
      removalChoices() {
        return {
          kind: 'remove',
          title: 'Wizardmon · Quitar una técnica',
          cards: [
            ...this.s.player.weapons.map((w) => ({
              id: 'remove-' + w.id,
              type: 'weapon-remove',
              weapon: w.id,
              title: skills.skills[w.id].name,
              text: 'Quitar esta técnica y liberar su hueco.',
              rarity: 'QUITAR TÉCNICA',
            })),
            {
              id: 'cancel-remove',
              type: 'weapon-decline',
              title: 'Salir',
              text: 'Conservar mis técnicas.',
              rarity: 'VOLVER',
            },
          ],
        };
      }
      choices(kind = 'level') {
        if (kind === 'shop') return this.removalChoices();
        const p = this.s.player,
          pool = upgrades
            .filter((u) => this.upgradeAvailable(u))
            .map((u) => this.levelUpgradeCard(u))
            .filter(Boolean);
        for (const w of p.weapons) {
          if (kind === 'shop' || w.rank >= 9) continue;
          const quality = this.rollUpgradeQuality(),
            ranks = Math.min(quality, 9 - w.rank),
            target = w.rank + ranks;
          pool.push({
            id: 'rank-' + w.id,
            type: 'weapon-rank',
            weapon: w.id,
            quality,
            ranks,
            title: skills.skills[w.id].name + ' · Rango ' + w.rank + ' → ' + target,
            text:
              'Sube ' +
              ranks +
              (ranks === 1 ? ' rango.\n' : ' rangos.\n') +
              describeTechnique(w.id, target, p),
            rarity: ['', 'Común', 'Raro', 'Épico', 'Legendario'][quality],
            rare: quality >= 3,
          });
        }
        if (kind === 'level' && p.weapons.length < 4) {
          const known = new Set(p.weapons.map((w) => w.id));
          for (const skill of skills
            .available({ isEgg: false, species: p.species, stage: p.stage })
            .filter((k) => !known.has(k.id)))
            pool.push({
              id: 'learn-' + skill.id,
              type: 'weapon',
              weapon: skill.id,
              title: skill.name,
              text:
                (p.weapons.length >= 4
                  ? 'Sustituye una técnica de tu elección; conserva su rango y suma uno. '
                  : '') + describeTechnique(skill.id, 1, p),
              rarity: 'NUEVA TÉCNICA',
            });
        }
        const selected = [];
        const techniques = pool.filter((c) => c.type === 'weapon');
        if (techniques.length) {
          const card = techniques[Math.floor(this.random() * techniques.length)];
          selected.push(card);
          pool.splice(pool.indexOf(card), 1);
        }
        while (pool.length && selected.length < 3) {
          const i = Math.floor(this.random() * pool.length);
          selected.push(pool.splice(i, 1)[0]);
        }
        return {
          kind,
          title:
            kind === 'relic'
              ? 'Un regalo de los datos'
              : 'Nivel ' + this.s.level + ' · Elige tu mejora',
          cards: selected,
        };
      }
      relicRank(id) {
        return this.s.relics.find((r) => r.id === id)?.rank || 0;
      }
      chestChoices() {
        const s = this.s,
          available = LOOT.relics.filter((r) => {
            const rank = this.relicRank(r.id);
            return rank < LOOT.maxRank && (rank > 0 || s.relics.length < LOOT.maxRelics);
          }),
          cards = [];
        while (available.length && cards.length < 2) {
          const item = available.splice(Math.floor(this.random() * available.length), 1)[0],
            rank = this.relicRank(item.id) + 1;
          cards.push({
            id: 'relic-' + item.id,
            type: 'artifact',
            item: item.id,
            rank,
            icon: item.icon,
            theme: item.theme,
            title: item.name,
            text: item.description(rank),
            rarity:
              rank > 1
                ? 'MEJORA DE RELIQUIA · ' + rank + '/3'
                : 'RELIQUIA · ' + (s.relics.length + 1),
          });
        }
        const buddies =
          s.buddies.length >= 3
            ? []
            : LOOT.companions.filter(
                (b) => !s.buddies.some((owned) => owned.species === b.id) && species.has(b.id),
              );
        while (buddies.length && cards.length < 3) {
          const b = buddies.splice(Math.floor(this.random() * buddies.length), 1)[0];
          cards.push({
            id: 'buddy-' + b.id,
            type: 'companion',
            buddy: b.id,
            species: b.id,
            title: b.name,
            rarity: 'COMPAÑERO · ' + b.role.toUpperCase(),
            text:
              'Se une a tu grupo (' +
              (s.buddies.length + 1) +
              '/3). Conservas tus compañeros. ' +
              b.description,
          });
        }
        return { kind: 'chest', title: 'Un cofre. Una decisión.', cards };
      }
      updateCollectors(dt) {
        const s = this.s,
          p = s.player,
          scene = s.realm?.portalId ?? 'main';
        if (s.collectorScene !== scene) {
          s.collectors = [];
          s.collectorScene = scene;
        }
        s.collectors ??= [];
        s.collectors.length = Math.min(s.collectors.length, p.orbits);
        while (s.collectors.length < p.orbits) s.collectors.push({ x: p.x, z: p.z });
        const reserved = new Set(s.collectors.map((o) => o.target).filter((id) => id != null));
        for (const [i, orb] of s.collectors.entries()) {
          let gem = s.gems.find((g) => g.id === orb.target);
          if (!gem) {
            orb.target = null;
            orb.returning = false;
            gem = s.gems
              .filter((g) => !g.attracted && !reserved.has(g.id))
              .sort((a, b) => distance(a, orb) - distance(b, orb))[0];
            if (gem) {
              orb.target = gem.id;
              reserved.add(gem.id);
            }
          }
          const angle = s.time * 2.5 + (i * Math.PI * 2) / Math.max(1, p.orbits);
          const target = gem
            ? orb.returning
              ? p
              : gem
            : { x: p.x + Math.cos(angle) * 3.4, z: p.z + Math.sin(angle) * 3.4 };
          const d = distance(orb, target),
            step = Math.min(d, (24 + p.speed) * dt);
          orb.x += ((target.x - orb.x) / (d || 1)) * step;
          orb.z += ((target.z - orb.z) / (d || 1)) * step;
          if (gem && !orb.returning && distance(orb, gem) < 0.6) orb.returning = true;
          if (gem && orb.returning) {
            gem.x = orb.x;
            gem.z = orb.z;
          }
        }
      }
      updateBuddy(dt) {
        for (const [index, buddy] of this.s.buddies.entries())
          this.updateCompanion(buddy, index, dt);
      }
      updateCompanion(b, index, dt) {
        const s = this.s,
          p = s.player;
        if (!b || s.done) return;
        const definition = LOOT.companions.find((c) => c.id === b.species);
        if (!definition) return;
        const target = { x: p.x + [-2.4, 2.4, 0][index], z: p.z + [1.5, 1.5, 3.5][index] },
          far = distance(b, target) > 1,
          dir = far
            ? clearPath(b, target, s.mapSeed, 0.5)
              ? { x: target.x - b.x, z: target.z - b.z }
              : enemyDirection(b, p, s.mapSeed)
            : { x: 0, z: 0 };
        b.action = far ? 'run' : 'idle';
        if (far) {
          b.face = dir.x < 0;
          this.move(b, dir.x, dir.z, Math.min(19, p.speed + 4), dt, 0.4, true);
        }
        b.clock = Math.max(0, b.clock - dt);
        if (b.clock > 0) return;
        const enemies = s.enemies
          .filter((e) => e.hp > 0 && !e.shielded)
          .sort((a, c) => distance(a, b) - distance(c, b));
        if (b.species === 'Terriermon') {
          const enemy = enemies[0];
          if (!enemy || distance(enemy, b) > 13) return;
          s.shots.push({
            id: s.nextId++,
            x: b.x,
            z: b.z,
            ox: b.x,
            oz: b.z,
            target: enemy.id,
            speed: 22,
            damage: p.damage * 0.55,
            area: 0,
            life: 2.8,
            skillId: 'air-shot',
            color: '#e3e8b2',
          });
          if (s.shots.length > 180) s.shots.shift();
        } else if (b.species === 'Salamon') {
          if (p.hp >= p.maxHp) return;
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.06);
          this.effect('heal', p.x, p.z, { skillId: 'heal' });
        } else {
          if (!s.gems.some((g) => distance(g, b) < 14)) return;
          for (const gem of s.gems) if (distance(gem, b) < 14) gem.attracted = true;
          this.effect('heal', b.x, b.z, { skillId: 'focus', size: 2 });
        }
        b.clock = definition.cooldown;
        b.attackAt = s.time;
        this.emit('companion');
      }
      maybeLevel() {
        const s = this.s;
        if (s.level >= 400) {
          s.level = 400;
          s.xp = 0;
          return;
        }
        if (
          s.choice ||
          s.evolution ||
          s.hatch > 0 ||
          s.done ||
          s.realm?.phase === 'cleared' ||
          s.pendingRealmReturn ||
          s.xp < xpNeeded(s.level)
        )
          return;
        s.xp -= xpNeeded(s.level);
        s.level++;
        if (s.level === 400) s.xp = 0;
        s.score += 40;
        const p = s.player,
          target = p.stage + 1;
        const eligible =
          s.level >= (EVOLUTION_LEVELS[target] || Infinity)
            ? evolutionOptions(p.species, s.eggTraining)
            : [];
        if (eligible.length) {
          const planned = s.evolutionLine?.[target];
          const id = eligible.includes(planned) ? planned : eligible[0];
          s.evolutionLine ??= evolutionLine(s.egg, s.eggTraining);
          s.evolutionLine[target] = id;
          s.choice = { kind: 'evolution', cards: [{ id, type: 'evolution', species: id }] };
          this.choose(id);
        } else s.choice = this.choices();
        this.emit('level');
      }
      skipChest() {
        if (this.s.choice?.kind !== 'chest' || this.s.done) return false;
        this.s.choice = null;
        this.emit('pick');
        return true;
      }
      choose(id) {
        const s = this.s,
          choice = s.choice;
        if (choice?.roll && choice.roll.phase !== 'revealed') return false;
        const card = choice?.cards.find((c) => c.id === id);
        if (!card) return false;
        if (choice.kind === 'shop' && !choice.roll && card.type === 'stat') {
          const rolled = this.shopRoll(card);
          if (!rolled) return false;
          s.choice = rolled;
          return true;
        }
        const p = s.player;
        if (choice.kind === 'shop' && card.type === 'weapon') return false;
        if (card.type === 'weapon-remove-menu') {
          s.choice = this.removalChoices();
          return true;
        }
        if (card.type === 'weapon-remove') {
          p.weapons = p.weapons.filter((w) => w.id !== card.weapon);
          s.techniqueEchoes = (s.techniqueEchoes || []).filter((e) => e.skillId !== card.weapon);
        } else if (card.type === 'artifact') {
          const def = LOOT.relics.find((r) => r.id === card.item);
          if (!def) return false;
          const owned = s.relics.find((r) => r.id === def.id);
          if (owned) owned.rank = Math.min(LOOT.maxRank, Math.max(owned.rank + 1, card.rank || 1));
          else if (s.relics.length < LOOT.maxRelics)
            s.relics.push({
              id: def.id,
              rank: Math.min(LOOT.maxRank, Math.max(1, card.rank || 1)),
            });
          else return false;
        } else if (card.type === 'companion') {
          if (
            !LOOT.companions.some((b) => b.id === card.buddy) ||
            s.buddies.length >= 3 ||
            s.buddies.some((b) => b.species === card.buddy)
          )
            return false;
          s.buddies.push({
            species: card.buddy,
            x: p.x,
            z: p.z,
            clock: 2,
            attackAt: -100,
            action: 'idle',
            face: false,
          });
        } else if (card.type === 'currency') {
          s.coins += card.amount;
        } else if (card.type === 'evolution') {
          const from = p.species;
          p.species = card.species;
          p.stage = species.get(p.species).stage;
          p.maxHp = Math.round(p.maxHp * 1.12 + 10);
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.18);
          p.damage *= 1.12;
          p.armor += 0.5;
          p.speed = Math.max(p.speed, Math.min(15, p.speed + 0.2));
          this.addWeapon(signature(p.species).id);
          s.history.push({ from, to: p.species, level: s.level, time: s.time });
          s.evolution = { from, to: p.species, left: 2.4, duration: 2.4 };
          s.score += 150;
          this.emit('evolution');
        } else if (card.type === 'weapon') {
          if (p.weapons.length < 4) p.weapons.push({ id: card.weapon, rank: 1, clock: 0 });
          else {
            s.choice = {
              kind: 'replace',
              title: '¿Qué técnica quieres sustituir?',
              cards: [
                ...p.weapons.map((w) => ({
                  id: 'replace-' + w.id,
                  type: 'weapon-replace',
                  replace: w.id,
                  weapon: card.weapon,
                  title: skills.skills[w.id].name + ' → ' + skills.skills[card.weapon].name,
                  text:
                    'Rango ' +
                    Math.min(9, w.rank + 1) +
                    '/9. ' +
                    describeTechnique(card.weapon, Math.min(9, w.rank + 1), p),
                  rarity: 'SUSTITUIR TÉCNICA',
                })),
                {
                  id: 'keep-weapons',
                  type: 'weapon-decline',
                  title: 'Conservar mis técnicas',
                  text: 'Renuncia a aprender este ataque. Mantienes las cuatro técnicas actuales.',
                  rarity: 'CANCELAR',
                },
              ],
            };
            return true;
          }
        } else if (card.type === 'weapon-replace') {
          const w = p.weapons.find((w) => w.id === card.replace);
          if (!w || p.weapons.some((w) => w.id === card.weapon)) return false;
          w.id = card.weapon;
          w.rank = Math.min(9, w.rank + 1);
          w.clock = 0;
        } else if (card.type === 'weapon-decline') {
        } else if (card.type === 'weapon-rank') {
          const w = p.weapons.find((w) => w.id === card.weapon);
          if (w) w.rank = Math.min(9, w.rank + (card.ranks || 1));
        } else {
          if (card.factor) p[card.stat] *= card.factor;
          else p[card.stat] += card.amount;
          p.crit = Math.min(0.85, p.crit);
          p.speed = Math.min(15, p.speed);
          p.magnet = Math.min(24, p.magnet);
          if ((card.baseId || card.id) === 'heart')
            p.hp = Math.min(p.maxHp, p.hp + (card.heal || 25));
        }
        s.choice = null;
        this.emit('pick');
        return true;
      }
      hurt(enemy, amount, skillId = null, periodic = false) {
        if (this.s.done || enemy.hp <= 0 || enemy.shielded) return;
        const s = this.s,
          p = s.player,
          crit = !periodic && this.random() < Math.min(0.85, p.crit + (p.focusLeft > 0 ? 0.15 : 0)),
          damage = Math.max(
            1,
            Math.round(
              periodic
                ? amount
                : amount *
                    this.elementDamageMultiplier(enemy, skillId) *
                    (this.style()?.id === 'hunter' && p.preyId === enemy.id ? 1.15 : 1) *
                    (crit ? 1.8 + this.relicRank('critical-lens') * 0.15 : 1) *
                    (enemy.hp / enemy.maxHp < 0.3 ? 1 + this.relicRank('finisher') * 0.15 : 1) *
                    (enemy.boss || enemy.elite ? 1 + this.relicRank('boss-hunter') * 0.12 : 1),
            ),
          );
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hit = 0.16;
        if (crit && this.relicRank('frost')) enemy.slowLeft = 1 + this.relicRank('frost') * 0.5;
        this.effect('hit', enemy.x, enemy.z, {
          text: String(damage),
          crit,
          skillId,
          dot: periodic,
        });
        if (!periodic) this.applyTechniqueStatus(enemy, skillId, damage);
        if (enemy.hp <= 0) {
          if (enemy.tower) {
            this.onTowerDestroyed(enemy);
            return;
          }
          s.kills++;
          this.dropEnemyChest(enemy);
          const battery = this.relicRank('battery');
          if (battery && s.kills % (24 - battery * 4) === 0 && (s.relicClocks.battery || 0) <= 0) {
            p.shieldLeft = Math.max(p.shieldLeft, 2);
            s.relicClocks.battery = 12;
            this.effect('heal', p.x, p.z, { skillId: 'guard' });
          }
          s.score += enemy.finalBoss ? 5000 : enemy.boss ? 500 : enemy.elite ? 35 : 10;
          s.coins +=
            enemy.coinValue ?? (enemy.finalBoss ? 250 : enemy.boss ? 10 : enemy.elite ? 3 : 1);
          if (enemy.finalBoss) this.defeatDevimon();
          const value =
            enemy.xpValue ??
            (enemy.finalBoss
              ? 180
              : enemy.boss
                ? 45 + enemy.stage * 14
                : 2 + Math.max(0, enemy.stage));
          s.gems.push({
            id: s.nextId++,
            x: enemy.x,
            z: enemy.z,
            value: Math.round(value * (enemy.elite ? 2 : 1)),
            heal: !enemy.boss && this.random() < 0.035,
          });
          if (s.gems.length > 240) {
            const a = s.gems.shift();
            s.gems[0].value += a.value;
          }
          this.emit(enemy.boss ? 'boss-ko' : 'ko');
        }
        this.onRelicHit(enemy, damage, crit);
      }
      hitPlayer(amount) {
        const s = this.s,
          p = s.player;
        if (p.invulnerable > 0 || p.dashLeft > 0 || s.done) return;
        const value =
          Math.max(1, amount - p.armor) *
          (p.shieldLeft > 0 ? 0.45 : 1) *
          this.incomingStyleDamage();
        p.hp = Math.max(0, p.hp - value);
        p.invulnerable = 0.48;
        this.effect('damage', p.x, p.z, { text: '−' + Math.ceil(value) });
        this.emit('damage');
        this.onRelicDamage();
        if (p.hp > 0 && this.relicRank('thorns')) {
          for (const enemy of s.enemies)
            if (enemy.hp > 0 && distance(enemy, p) < 3)
              this.hurt(enemy, p.damage * 0.4 * this.relicRank('thorns'), 'leaf-blade');
          this.effect('burst', p.x, p.z, { skillId: 'leaf-blade', size: 1.5 });
        }
        if (p.hp <= 0) {
          s.done = true;
          s.score = Math.floor(s.score + s.time * 2);
          this.emit('end');
        }
      }
      spawn(boss = false) {
        const s = this.s,
          p = s.player,
          stage = boss
            ? Math.min(4, Math.max(1, Math.floor(s.time / 150) + 1))
            : BALANCE.mainStage(s.time),
          pool = catalog.filter((c) => c.stage === stage && c.id !== 'Devimon');
        if (s.enemies.filter((e) => e.hp > 0).length >= (boss ? 219 : 210)) return;
        for (let tries = 0; tries < 24; tries++) {
          const angle = this.random() * Math.PI * 2,
            r = 38 + this.random() * 12,
            x = p.x + Math.cos(angle) * r,
            z = p.z + Math.sin(angle) * r;
          // Reject positions outside the island instead of clamping them near the player.
          if (Math.abs(x) > WORLD - 6 || Math.abs(z) > WORLD - 6) continue;
          if (!walkable(x, z, s.mapSeed, 0.6)) continue;
          const cohort = Math.floor(s.time / 35),
            type = boss
              ? pool[Math.floor(this.random() * pool.length)]
              : pool[((hash(0, stage, s.mapSeed) >>> 0) + cohort) % pool.length],
            stats = BALANCE.main(s.time, stage, boss),
            elite = !boss && this.random() < stats.elite,
            hp = stats.hp * (elite ? 1.8 : 1);
          s.enemies.push({
            id: s.nextId++,
            x,
            z,
            species: type.id,
            stage,
            hp,
            maxHp: hp,
            boss,
            elite,
            hit: 0,
            speed: stats.speed,
            shotClock: 3 + this.random() * 5,
            ranged: boss || elite || this.random() < 0.24,
            xpValue: boss ? undefined : Math.max(1, Math.round((2 + Math.max(0, stage)) * 0.6)),
            coinValue: boss ? undefined : elite ? 2 : this.random() < 0.6 ? 1 : 0,
            stomp: 5,
            basic: false,
          });
          if (boss) this.emit('boss');
          return;
        }
      }
      chestPrice() {
        const n = this.s.chestsOpened || 0;
        return 100 + 75 * n + 15 * n * n;
      }
      chestDropChance(enemy) {
        if (enemy.tower || enemy.structure) return 0;
        if (enemy.boss && !enemy.finalBoss) return 1;
        return (
          0.001 +
          this.relicRank('treasure-radar') * 0.0005 +
          this.relicRank('loot-antenna') * 0.00025
        );
      }
      dropEnemyChest(enemy) {
        const chance = this.chestDropChance(enemy);
        if (!chance || (chance < 1 && this.random() >= chance)) return false;
        const chest = {
          id: 'drop-chest-' + this.s.nextId++,
          type: 'chest',
          name: 'Cofre de enemigo',
          x: enemy.x,
          z: enemy.z,
          expires: this.s.time + 60,
        };
        this.placeSafely(chest);
        this.s.droppedChests.push(chest);
        return true;
      }
      nearestPoi() {
        const s = this.s;
        return (
          [...this.map.pois, ...this.s.droppedChests]
            .filter((p) => !s.usedPois.includes(p.id) && distance(p, s.player) < 4.5)
            .sort((a, b) => distance(a, s.player) - distance(b, s.player))[0] || null
        );
      }
      interact() {
        const s = this.s,
          p = s.player,
          poi = this.nearestPoi();
        if (!poi || s.choice || s.evolution || s.done || s.hatch > 0) return { ok: false };
        const cost = this.poiCost(poi);
        if (poi.type === 'merchant') {
          s.choice = this.choices('shop');
          return { ok: true };
        }
        if (s.coins < cost) return { ok: false, message: 'Necesitas ' + cost + ' bits.' };
        if (poi.type === 'fire') {
          if (p.hp >= p.maxHp) return { ok: false, message: 'Ya tienes toda la vida.' };
          s.coins -= cost;
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
          s.poiPrices[poi.id] = cost + 10;
          this.effect('heal', p.x, p.z);
          return { ok: true, message: 'La hoguera restaura tu vida.' };
        }
        if (poi.type === 'altar') {
          if (s.challenge) return { ok: false, message: 'Ya hay un santuario activo.' };
          s.usedPois.push(poi.id);
          s.challenge = { id: poi.id, x: poi.x, z: poi.z, progress: 0 };
          return { ok: true, message: 'Resiste 8 segundos dentro del círculo del santuario.' };
        }
        s.coins -= cost;
        if (poi.type === 'chest') {
          s.chestsOpened++;
          s.usedPois.push(poi.id);
          p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.05 * this.relicRank('rations'));
          s.choice = this.chestChoices();
        } else {
          s.shopPurchases++;
          s.choice = this.choices('shop');
        }
        s.score += 50;
        return { ok: true };
      }
      collectGem(gem) {
        const s = this.s,
          p = s.player,
          value = gem.value * p.xpMult;
        if (gem.heal) p.hp = Math.min(p.maxHp, p.hp + 8);
        s.xp += value;
        s.totalXp += value;
        s.score += Math.ceil(gem.value);
        this.emit('gem');
      }
      update(dt, input = {}) {
        const s = this.s,
          p = s.player;
        this.events = [];
        s.droppedChests = s.droppedChests.filter(
          (c) => c.expires > s.time && !s.usedPois.includes(c.id),
        );
        dt = clamp(dt, 0, 0.05);
        if (s.done || s.pendingRealmReturn) return;
        if (s.realm?.phase === 'cleared') {
          s.time += dt;
          this.updateWorld(dt, input);
          return;
        }
        if (s.choice) return;
        if (s.hatch > 0) {
          s.hatch = Math.max(0, s.hatch - dt);
          if (!s.hatch) {
            p.species = s.egg;
            p.stage = -1;
            this.addWeapon('bubble');
            this.emit('hatch');
          }
          return;
        }
        if (s.evolution) {
          s.evolution.left -= dt;
          if (s.evolution.left <= 0) s.evolution = null;
          return;
        }
        this.maybeLevel();
        if (s.choice) return;
        s.time += dt;
        p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
        p.invulnerable = Math.max(0, p.invulnerable - dt);
        p.dash = Math.max(0, p.dash - dt);
        p.dashLeft = Math.max(0, p.dashLeft - dt);
        p.rallyLeft = Math.max(0, p.rallyLeft - dt);
        p.shieldLeft = Math.max(0, p.shieldLeft - dt);
        p.focusLeft = Math.max(0, p.focusLeft - dt);
        p.hasteLeft = Math.max(0, (p.hasteLeft || 0) - dt);
        p.basicClock -= dt;
        for (const id of Object.keys(s.relicClocks))
          s.relicClocks[id] = Math.max(0, s.relicClocks[id] - dt);
        if (this.updateWorld(dt, input) || s.done) return;
        let dx = Number(input.x) || 0,
          dz = Number(input.z) || 0;
        if ((dx || dz) && input.dash && p.dash <= 0) {
          p.dash = 3.2;
          p.dashLeft = 0.32;
          if (this.relicRank('dash-drive')) p.relicHasteLeft = 3;
          p.dashX = dx;
          p.dashZ = dz;
          this.effect('dash', p.x, p.z);
          const vacuum = this.relicRank('vacuum');
          if (vacuum) {
            for (const gem of s.gems) if (distance(gem, p) < 8 + vacuum * 2) gem.attracted = true;
            this.effect('heal', p.x, p.z, { skillId: 'focus', size: 2 });
          }
          const burst = this.relicRank('dash-burst');
          if (burst) {
            for (const enemy of s.enemies)
              if (enemy.hp > 0 && distance(enemy, p) < 3)
                this.hurt(enemy, p.damage * 0.4 * burst, 'energy-bolt');
            this.effect('burst', p.x, p.z, { skillId: 'energy-bolt', size: 1.5 });
          }
        }
        if (p.dashLeft > 0) {
          dx = p.dashX;
          dz = p.dashZ;
        }
        p.action = dx || dz ? 'run' : 'idle';
        if (dx || dz) {
          p.lastDX = dx;
          p.lastDZ = dz;
          p.moveDX = dx;
          p.moveDZ = dz;
          this.move(p, dx, dz, p.speed * this.playerWorldSpeed() * (p.dashLeft > 0 ? 3 : 1), dt);
          p.face = dx < 0;
        }
        this.updateStyleFields(dt);
        for (const e of s.fx) e.life -= dt;
        s.fx = s.fx.filter((e) => e.life > 0);
        if (!s.realm) {
          s.spawnClock -= dt;
          if (s.spawnClock <= 0 && s.enemies.filter((e) => e.hp > 0).length < 210) {
            const density = BALANCE.main(s.time, p.stage);
            s.spawnClock = Math.max(
              0.18,
              density.interval * (0.8 + this.random() * 0.4) * (s.challenge ? 0.65 : 1),
            );
            for (let i = 0; i < density.batch; i++) this.spawn();
          }
          if (s.time >= s.nextBoss) {
            s.nextBoss += 90;
            this.spawn(true);
          }
        }
        const alive = s.enemies.filter((e) => e.hp > 0),
          nearest = this.combatTargets(alive)[0];
        const effectiveHaste =
            p.haste *
            (p.hasteLeft > 0 ? 1.2 : 1) *
            (p.relicHasteLeft > 0 ? 1 + this.relicRank('dash-drive') * 0.1 : 1),
          damageMultiplier = p.damage * (p.rallyLeft > 0 ? 1.25 : 1);
        if (nearest && distance(nearest, p) < 2.7 && p.basicClock <= 0) {
          p.basicClock = 0.5 / effectiveHaste;
          p.attackAt = s.time;
          p.lastDX = nearest.x - p.x;
          p.lastDZ = nearest.z - p.z;
          p.lastSkill = 'claw';
          this.hurt(nearest, damageMultiplier * 0.75, 'claw');
          this.effect('slash', p.x, p.z, { skillId: 'claw' });
        }
        for (const w of p.weapons) {
          w.clock -= dt;
          if (w.clock > 0) continue;
          const skill = skills.skills[w.id];
          if (skill.kind !== 'damage') {
            const effect = supportEffect(skill, w.rank);
            if (skill.kind === 'heal' && p.hp > p.maxHp * effect.threshold) continue;
            if (skill.kind === 'heal') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * effect.heal);
            if (skill.kind === 'shield') p.shieldLeft = effect.duration;
            if (skill.kind === 'buff') p.rallyLeft = effect.duration;
            if (skill.kind === 'restore') p.focusLeft = effect.duration;
            if (skill.kind === 'haste') p.hasteLeft = effect.duration;
            w.clock = effect.cooldown / effectiveHaste;
            this.effect('heal', p.x, p.z, { skillId: skill.id });
            continue;
          }
          if (
            !nearest ||
            distance(nearest, p) > (skill.range / 22) * p.area * this.styleRangeMultiplier()
          )
            continue;
          w.clock = Math.max(
            0.18,
            (skill.cooldown * 0.48) / (effectiveHaste * (1 + (w.rank - 1) * 0.045)),
          );
          p.attackAt = s.time;
          p.lastDX = nearest.x - p.x;
          p.lastDZ = nearest.z - p.z;
          p.lastSkill = skill.id;
          if (skill.stage >= 1) this.effect('cast', p.x, p.z, { skillId: skill.id });
          const damage = damageMultiplier * skill.power * (1 + (w.rank - 1) * 0.15),
            area = (skill.stage >= 2 ? 1.7 : 0) * p.area * (1 + w.rank * 0.06);
          this.castTechnique(skill, w.rank, nearest, damage, area);
          const count =
            (skill.pattern === 'volley' ? 3 : 1) + p.projectileBonus + Math.floor(w.rank / 4);
          if (count > 1) {
            s.techniqueEchoes ??= [];
            for (let i = 1; i < count && s.techniqueEchoes.length < 128; i++)
              s.techniqueEchoes.push({
                skillId: skill.id,
                rank: w.rank,
                damage,
                area,
                target: nearest.id,
                left: i * 0.12,
                scene: s.realm?.portalId ?? 'main',
              });
          }
        }

        for (const shot of s.shots) {
          shot.prevX = shot.x;
          shot.prevZ = shot.z;
          shot.life -= dt;
          const target = s.enemies.find((e) => e.id === shot.target && e.hp > 0);
          if (!target) {
            shot.life = 0;
            continue;
          }
          const d = distance(shot, target);
          if (d < shot.speed * dt + 0.5 * (shot.visualScale || 1)) {
            shot.life = 0;
            this.hurt(target, shot.damage, shot.skillId);
            if (shot.area > 0)
              for (const e of s.enemies)
                if (e !== target && e.hp > 0 && distance(e, target) < shot.area)
                  this.hurt(e, shot.damage * 0.55, shot.skillId);
            this.effect('burst', target.x, target.z, {
              skillId: shot.skillId,
              color: shot.color,
              size: shot.area || 1,
              radius: shot.area || 0.6 * (shot.visualScale || 1),
              visualScale: shot.visualScale || 1,
            });
          } else {
            shot.x += ((target.x - shot.x) / (d || 1)) * shot.speed * dt;
            shot.z += ((target.z - shot.z) / (d || 1)) * shot.speed * dt;
          }
        }
        s.shots = s.shots.filter((s) => s.life > 0).slice(-180);
        this.updateCollectors(dt);
        const crowd = crowdGrid(alive);
        for (const e of alive) {
          if (e.hp <= 0) continue;
          e.hit = Math.max(0, e.hit - dt);
          if (e.tower) continue;
          if (this.enemyStatusBlocked(e)) {
            e.slowLeft = Math.max(0, (e.slowLeft || 0) - dt);
            continue;
          }
          if (e.finalBoss && !e.engaged) {
            if (Math.hypot(p.x, p.z) > 32) continue;
            e.engaged = true;
            this.emit('devimon-engaged');
          }
          const chase = e.finalBoss && Math.hypot(p.x, p.z) > 40 ? { x: 0, z: 0 } : p;
          if (e.finalBoss && chase !== p && distance(e, chase) < 1) continue;
          const direction = crowdDirection(e, enemyDirection(e, chase, s.mapSeed), crowd);
          this.move(
            e,
            direction.x,
            direction.z,
            e.speed *
              (e.slowLeft > 0 ? 0.65 : 1) *
              this.enemyWorldSpeed(e) *
              this.enemyStatusMovement(e),
            dt,
            0.55,
            true,
          );
          e.slowLeft = Math.max(0, (e.slowLeft || 0) - dt);
          if (distance(e, p) < 1.25) {
            if (s.time - (e.attackAt ?? -100) > 0.65) {
              e.attackAt = s.time;
              e.lastSkill = 'claw';
            }
            this.hitPlayer(
              (e.contactDamage ?? BALANCE.main(s.time, e.stage, !!e.boss).contact) *
                this.enemyStatusAttack(e),
            );
          }
          e.shotClock -= dt;
          if (e.ranged !== false && e.stage >= 1 && e.shotClock <= 0 && distance(e, p) < 20) {
            e.shotClock = e.shotInterval || (e.boss ? 1.8 : 4);
            e.attackAt = s.time;
            e.lastSkill = species.has(e.species) ? signature(e.species).id : 'energy-bolt';
            const d = distance(e, p) || 1;
            s.hostile.push({
              id: s.nextId++,
              x: e.x,
              z: e.z,
              ox: e.x,
              oz: e.z,
              bornAt: s.time,
              skillId: species.has(e.species) ? signature(e.species).id : 'energy-bolt',
              dx: (p.x - e.x) / d,
              dz: (p.z - e.z) / d,
              life: 3,
              speed: e.projectileSpeed || 10,
              damage:
                (e.shotDamage ?? BALANCE.main(s.time, e.stage, !!e.boss).shot) *
                this.enemyStatusAttack(e),
            });
          }
          if (e.finalBoss) this.updateDevimon(e, dt);
          if (e.boss) {
            e.stomp -= dt;
            if (e.stomp <= 0) {
              e.stomp = e.finalBoss ? 4.5 : 7;
              this.effect('warning', p.x, p.z, {
                life: 1.3,
                maxLife: 1.3,
                radius: 5.5,
                armed: false,
                damage: 24 * this.difficultyAttackFactor(e),
              });
            }
          }
        }
        for (const shot of s.hostile) {
          shot.life -= dt;
          shot.x += shot.dx * (shot.speed || 10) * dt;
          shot.z += shot.dz * (shot.speed || 10) * dt;
          if (this.reflectProjectile(shot)) continue;
          if (distance(shot, p) < 0.8) {
            this.hitPlayer(shot.damage);
            shot.life = 0;
          }
        }
        s.hostile = s.hostile.filter((s) => s.life > 0).slice(-80);
        for (const fx of s.fx)
          if (fx.kind === 'warning' && !fx.armed && fx.life < 0.15) {
            fx.armed = true;
            if (distance(fx, p) < fx.radius) this.hitPlayer(fx.damage ?? 24);
            this.effect('stomp', fx.x, fx.z, { size: fx.radius });
          }
        this.updatePatternFields(dt);
        this.updateRelicEffects(dt);
        this.updateBuddy(dt);
        s.enemies = s.enemies.filter((e) => e.hp > 0);
        s.gems = s.gems.filter((g) => {
          const d = distance(g, p);
          if (d < 1.05) {
            this.collectGem(g);
            return false;
          }
          if ((d < p.magnet || g.attracted) && !s.collectors?.some((o) => o.target === g.id)) {
            g.attracted = true;
            const step = Math.min(d, (32 + d * 3) * dt);
            g.x += ((p.x - g.x) / (d || 1)) * step;
            g.z += ((p.z - g.z) / (d || 1)) * step;
          }
          return true;
        });
        if (s.challenge) {
          if (distance(s.challenge, p) < 7) s.challenge.progress += dt;
          if (s.challenge.progress >= 8) {
            s.xp += 40 + p.stage * 10;
            s.totalXp += 40 + p.stage * 10;
            s.score += 200;
            s.challenge = null;
            s.choice = this.choices('relic');
            this.emit('relic');
          }
        }
        if (!s.done) this.maybeLevel();
      }
      snapshot() {
        return structuredClone(this.s);
      }
    }
    const result = {
      Run,
      species,
      forward,
      eggChoices,
      evolutionOptions,
      evolutionLine,
      reachesMega,
      signature,
      upgrades,
      enemyDirection,
      crowdGrid,
      crowdDirection,
      clearPath,
      supportEffect,
      describeTechnique,
    };
    WORLD_SYSTEM.install(result, { walkable, mapFor, hash, skills });
    CHEST.install(result, LOOT);
    RELIC_EFFECTS.install(result, LOOT);
    PATTERNS.install(result, skills);
    STATUSES.install(result, skills);
    DIFFICULTY.install(result);
    return result;
  }
  const api = {
    create,
    WORLD,
    VERSION,
    EVOLUTION_LEVELS,
    heightAt,
    mapFor,
    walkable,
    MAX_LEVEL: 400,
    xpNeeded,
    ponds,
    hash,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else
    root.DigibonkCore = {
      ...api,
      ...create(root.SPECIES_CATALOG, root.EVOLUTION_ROUTES, root.SkillSystem),
    };
})(typeof window !== 'undefined' ? window : globalThis);
