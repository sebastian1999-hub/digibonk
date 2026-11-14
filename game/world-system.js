(function (root) {
  'use strict';
  const W = typeof module !== 'undefined' ? require('./world-rules') : root.DigibonkWorld;
  const PORTALS = typeof module !== 'undefined' ? require('./portal-system') : root.DigibonkPortals;
  function install(C, base) {
    const proto = C.Run.prototype,
      skills = base.skills,
      dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    proto.initializeWorld = function () {
      const s = this.s,
        p = s.player;
      if (s.world?.missionVersion !== W.MAP_VERSION) {
        s.sectors = W.sectors(s.mapSeed, base.walkable);
        const outer = [0, 1, 2, 3, 5, 6, 7, 8];
        for (let i = outer.length - 1; i > 0; i--) {
          const j = base.hash(i, 91, s.mapSeed) % (i + 1);
          [outer[i], outer[j]] = [outer[j], outer[i]];
        }
        for (let i = 0; i < W.OBJECTIVE_ZONES; i++) {
          const zone = s.sectors[outer[i]];
          zone.kind = ['fire', 'flood', 'glitch'][i % 3];
          zone.required = true;
          zone.purified = false;
          zone.revision = 1;
        }
        const relocate = (unit) => {
          unit.x = Math.max(
            -W.WORLD + 3,
            Math.min(W.WORLD - 3, Number.isFinite(unit.x) ? unit.x : 0),
          );
          unit.z = Math.max(
            -W.WORLD + 3,
            Math.min(W.WORLD - 3, Number.isFinite(unit.z) ? unit.z : 0),
          );
          if (base.walkable(unit.x, unit.z, s.mapSeed, 0.6)) return;
          const x = unit.x,
            z = unit.z;
          for (let i = 0; i < 150; i++) {
            const angle = i * 2.399963,
              r = Math.sqrt(i) * 0.8,
              xx = x + Math.cos(angle) * r,
              zz = z + Math.sin(angle) * r;
            if (base.walkable(xx, zz, s.mapSeed, 0.6)) {
              unit.x = xx;
              unit.z = zz;
              return;
            }
          }
          unit.x = unit.z = 0;
        };
        relocate(p);
        p.dashLeft = 0;
        if (s.buddy) {
          s.buddy.x = p.x;
          s.buddy.z = p.z;
          relocate(s.buddy);
        }
        s.enemies = [];
        s.hostile = [];
        s.shots = [];
        s.worldHazards = [];
        s.styleFields = [];
        s.purifying = null;
        s.world = {
          missionVersion: W.MAP_VERSION,
          target: W.OBJECTIVE_ZONES,
          cleansed: 0,
          phase: 'purify',
          devimonSpawned: false,
          devimonDefeated: false,
          hazardClock: 4,
          lastX: p.x,
          lastZ: p.z,
        };
      }
      s.worldHazards ??= [];
      s.styleFields ??= [];
      s.purifying ??= null;
      p.styleCooldown ??= 0;
      p.moveMomentum ??= 0;
      p.stillTime ??= 0;
    };
    proto.spawnDevimon = function () {
      const s = this.s,
        w = s.world,
        p = s.player;
      if (w.devimonSpawned || w.phase === 'endless') return false;
      s.enemies = s.enemies.filter((e) => e.hp > 0);
      while (s.enemies.length >= 220) {
        const index = s.enemies.findIndex((e) => !e.boss);
        s.enemies.splice(Math.max(0, index), 1);
      }
      const hp = Math.round(
        Math.max(2500, p.damage * (90 + s.level * 3)) * (1 + Math.min(0.75, s.time / 1200)),
      );
      const boss = {
        id: s.nextId++,
        x: 0,
        z: 0,
        species: 'Devimon',
        stage: 2,
        hp,
        maxHp: hp,
        boss: true,
        finalBoss: true,
        engaged: false,
        elite: false,
        hit: 0,
        speed: 4.5,
        shotClock: 2.5,
        stomp: 4.5,
        darkClock: 3,
        summonClock: 18,
      };
      s.enemies.push(boss);
      w.devimonSpawned = true;
      w.devimonId = boss.id;
      w.phase = 'devimon';
      this.effect('burst', 0, 0, {
        skillId: 'nightmare',
        color: '#c998ef',
        size: 5,
        life: 3,
        maxLife: 3,
      });
      this.emit('devimon-awakened');
      return true;
    };
    proto.defeatDevimon = function () {
      const s = this.s,
        w = s.world;
      if (w.devimonDefeated) return;
      w.devimonDefeated = true;
      w.phase = 'endless';
      w.completedAt = s.time;
      s.player.celebrateLeft = 2;
      this.emit('devimon-defeated');
    };
    proto.updateDevimon = function (boss, dt) {
      const s = this.s,
        p = s.player;
      if (!boss.engaged || dist(boss, p) > 28) return;
      boss.darkClock -= dt;
      boss.summonClock -= dt;
      if (boss.darkClock <= 0) {
        boss.attackAt = s.time;
        const enraged = boss.hp < boss.maxHp * 0.5,
          count = enraged ? 7 : 5,
          angle = Math.atan2(p.z - boss.z, p.x - boss.x);
        boss.darkClock = (enraged ? 1.8 : 2.8) / Math.min(1.8, this.difficultyCadenceFactor(boss));
        for (let i = 0; i < count; i++) {
          const a = angle + (i - (count - 1) / 2) * 0.16;
          s.hostile.push({
            id: s.nextId++,
            x: boss.x,
            z: boss.z,
            ox: boss.x,
            oz: boss.z,
            bornAt: s.time,
            skillId: 'dark-pulse',
            dx: Math.cos(a),
            dz: Math.sin(a),
            speed: enraged ? 13 : 10,
            life: 3,
            damage:
              (18 + s.time * 0.018) *
              this.enemyStatusAttack(boss) *
              this.difficultyAttackFactor(boss),
            dark: true,
          });
        }
      }
      if (boss.summonClock <= 0) {
        boss.summonClock = 18;
        for (let i = 0; i < 3 && s.enemies.length < 210 + this.enemyCapBonus(); i++) {
          const a = this.random() * Math.PI * 2,
            x = boss.x + Math.cos(a) * 8,
            z = boss.z + Math.sin(a) * 8;
          if (!base.walkable(x, z, s.mapSeed, 0.6)) continue;
          const hp = 100 + s.time * 0.15;
          s.enemies.push({
            id: s.nextId++,
            x,
            z,
            species: 'DemiDevimon',
            stage: 1,
            hp,
            maxHp: hp,
            boss: false,
            elite: false,
            hit: 0,
            speed: 4.3,
            shotClock: 3,
          });
        }
      }
    };
    proto.style = function (name = this.s.player.species, stage = this.s.player.stage) {
      return W.styleFor(name, stage, skills.family(name));
    };
    proto.currentSector = function (unit = this.s.player) {
      return this.s.sectors[W.sectorIndex(unit.x, unit.z)];
    };
    proto.styleRangeMultiplier = function () {
      return 1;
    };
    proto.playerWorldSpeed = function () {
      const p = this.s.player,
        style = this.style();
      return this.currentSector().kind === 'flood' ? 0.85 : 1;
    };
    proto.enemyWorldSpeed = function (enemy) {
      let factor = this.currentSector(enemy).kind === 'glitch' ? 1.18 : 1;
      for (const f of this.s.styleFields)
        if (!enemy.uncontrollable && f.kind === 'roots' && f.life > 0 && dist(f, enemy) < f.radius)
          factor *= enemy.boss ? 0.7 : 0.45;
      return factor * this.portalReturnSpeed();
    };
    proto.incomingStyleDamage = function () {
      const p = this.s.player,
        style = this.style();
      let factor = 1;
      if (this.s.styleFields.some((f) => f.kind === 'sanctuary' && dist(f, p) < f.radius))
        factor *= 0.75;
      return factor;
    };
    proto.styleDamage = function () {
      const p = this.s.player;
      const rank = Math.max(1, ...p.weapons.map((w) => w.rank));
      return (
        p.damage *
        (1 + Math.max(0, p.stage - 1) * 0.25) *
        (1 + (rank - 1) * 0.15) *
        (p.rallyLeft > 0 ? 1.25 : 1)
      );
    };
    proto.styleCooldownDuration = function () {
      const p = this.s.player;
      return Math.max(
        2.5,
        (this.style()?.cooldown || 2.5) / (p.haste * (p.hasteLeft > 0 ? 1.2 : 1)),
      );
    };
    proto.castStyle = function () {
      const s = this.s,
        p = s.player,
        style = this.style();
      if (!style || p.styleCooldown > 0 || s.done || s.choice || s.evolution || s.hatch > 0)
        return false;
      const enemies = s.enemies
          .filter((e) => e.hp > 0 && !e.shielded)
          .sort((a, b) => dist(a, p) - dist(b, p)),
        target = enemies[0];
      if (['hunter', 'artillery'].includes(style.id) && (!target || dist(target, p) > 20))
        return false;
      p.styleCooldown = p.styleCooldownDuration = this.styleCooldownDuration();
      p.attackAt = s.time;
      const field = (kind, x, z, life, radius) => {
        const f = {
          id: s.nextId++,
          kind,
          x,
          z,
          life,
          maxLife: life,
          radius: radius * p.area,
          tick: 0,
          absorbed: 0,
        };
        s.styleFields.push(f);
        return f;
      };
      if (style.id === 'vanguard') {
        p.dashLeft = 0.32;
        p.dash = 3.2;
        const moving = Math.hypot(p.moveDX || 0, p.moveDZ || 0) > 0.01;
        p.dashX = moving ? p.moveDX : target ? target.x - p.x : 1;
        p.dashZ = moving ? p.moveDZ : target ? target.z - p.z : 0;
        p.chargeTrail = 0.32;
        p.chargeId = s.nextId++;
        p.lastSkill = 'mega-flame';
        this.effect('burst', p.x, p.z, { skillId: 'mega-flame', size: 2 });
      }
      if (style.id === 'hunter') {
        p.preyId = target.id;
        p.lastSkill = 'fang-rush';
        for (let i = 0; i < 3 + p.projectileBonus; i++)
          s.shots.push({
            id: s.nextId++,
            x: p.x,
            z: p.z,
            ox: p.x,
            oz: p.z,
            target: target.id,
            speed: 26 + i * 7,
            damage: this.styleDamage() * 1.2,
            area: 0,
            life: 2.8,
            skillId: 'air-shot',
            color: '#a8eced',
          });
        this.effect('slash', p.x, p.z, { skillId: 'fang-rush', size: 2 });
      }
      if (style.id === 'guardian') {
        field('sanctuary', p.x, p.z, 5, 5);
        p.lastSkill = 'holy-ray';
      }
      if (style.id === 'controller') {
        const point = target && dist(target, p) < 14 ? target : p;
        field('roots', point.x, point.z, 6, 5);
        p.lastSkill = 'spore-burst';
      }
      if (style.id === 'artillery') {
        for (const enemy of enemies
          .filter((e) => dist(e, p) < 20 * p.area)
          .slice(0, 3 + p.projectileBonus))
          field('bomb', enemy.x, enemy.z, 1, 3);
        p.lastSkill = 'mega-laser';
      }
      if (style.id === 'tide') {
        for (const enemy of enemies)
          if (dist(enemy, p) < 7 * p.area) {
            this.hurt(enemy, this.styleDamage() * 3, 'tidal-wave');
            this.slowEnemy(enemy, 2.5);
            this.move(enemy, enemy.x - p.x, enemy.z - p.z, 10, 0.12, 0.55);
          }
        this.effect('burst', p.x, p.z, {
          skillId: 'tidal-wave',
          color: '#5de2f0',
          size: 3,
          radius: 7 * p.area,
        });
        p.lastSkill = 'tidal-wave';
      }
      s.styleFields = s.styleFields.slice(-12);
      s.shots = s.shots.slice(-180);
      this.emit('style', { name: style.ability });
      return true;
    };
    proto.updateWorld = function (dt, input) {
      const s = this.s,
        p = s.player,
        w = s.world,
        style = this.style(),
        moving = Math.hypot(p.x - w.lastX, p.z - w.lastZ) > 0.005;
      w.lastX = p.x;
      w.lastZ = p.z;
      p.moveMomentum = moving
        ? Math.min(3, p.moveMomentum + dt)
        : Math.max(0, p.moveMomentum - dt * 2);
      p.stillTime = moving ? 0 : p.stillTime + dt;
      p.styleCooldown = Math.max(0, p.styleCooldown - dt);
      p.celebrateLeft = Math.max(0, (p.celebrateLeft || 0) - dt);
      if (input.special) this.castStyle();
      p.preyId = null;
      const zone = this.currentSector();
      w.hazardClock -= dt;
      if (zone.kind === 'fire' && w.hazardClock <= 0 && !s.purifying) {
        w.hazardClock = 5;
        s.worldHazards.push({
          id: s.nextId++,
          zone: zone.id,
          x: p.x,
          z: p.z,
          life: 1.3,
          maxLife: 1.3,
          radius: 3.2,
        });
      }
      s.worldHazards = s.worldHazards.filter((h) => {
        h.life -= dt;
        if (h.life <= 0) {
          if (s.sectors[h.zone].kind === 'fire' && dist(h, p) < h.radius)
            this.hitPlayer((10 + s.time * 0.02) * 1);
          this.effect('burst', h.x, h.z, {
            skillId: 'inferno',
            enemy: true,
            color: '#ff8d51',
            size: 2,
          });
          return false;
        }
        return true;
      });
      if (s.purifying) {
        const q = s.purifying,
          z = s.sectors[q.zone];
        if (!z.kind || dist(p, z.anchor) > 3.8) {
          s.purifying = null;
          this.emit('purify-cancel');
        } else {
          q.progress += dt;
          if (q.progress >= 5) {
            z.kind = null;
            z.purified = true;
            z.clearedUntil = 0;
            z.revision++;
            w.cleansed++;
            s.purifying = null;
            s.worldHazards = s.worldHazards.filter((h) => h.zone !== z.id);
            s.coins += 20;
            s.xp += 20;
            s.totalXp += 20;
            s.score += 100;
            this.effect('heal', z.anchor.x, z.anchor.z, { size: 5, life: 1.2, maxLife: 1.2 });
            this.emit('purified', { zone: z.name });
            if (w.cleansed >= w.target) this.spawnDevimon();
          }
        }
      }
    };
    proto.updateStyleFields = function (dt) {
      const s = this.s,
        p = s.player;

      p.chargeTrail = Math.max(0, (p.chargeTrail || 0) - dt);
      if (p.chargeTrail > 0 && p.dashLeft > 0)
        for (const enemy of s.enemies)
          if (enemy.hp > 0 && enemy.chargeId !== p.chargeId && dist(enemy, p) < 2.8 * p.area) {
            enemy.chargeId = p.chargeId;
            this.hurt(enemy, this.styleDamage() * 3, 'mega-flame');
            this.move(enemy, enemy.x - p.x, enemy.z - p.z, 9, 0.12, 0.55);
            this.effect('burst', enemy.x, enemy.z, { skillId: 'mega-flame', size: 1.5 });
          }
      for (const f of s.styleFields) {
        f.life -= dt;
        f.tick -= dt;
        if (f.kind === 'roots' && f.tick <= 0) {
          f.tick = 1;
          for (const e of s.enemies)
            if (e.hp > 0 && dist(e, f) < f.radius)
              this.hurt(e, this.styleDamage() * 0.6, 'spore-burst');
        }
        if (f.kind === 'bomb' && f.life <= 0) {
          for (const e of s.enemies)
            if (e.hp > 0 && dist(e, f) < f.radius)
              this.hurt(e, this.styleDamage() * 4, 'mega-laser');
          this.effect('burst', f.x, f.z, { skillId: 'mega-laser', color: '#ffd291', size: 2 });
        }
      }
      s.styleFields = s.styleFields.filter((f) => f.life > 0);
    };
    proto.reflectProjectile = function (shot) {
      const s = this.s,
        f = s.styleFields.find(
          (f) =>
            f.kind === 'sanctuary' &&
            f.absorbed < 3 + s.player.projectileBonus &&
            dist(f, shot) < f.radius,
        );
      if (!f) return false;
      f.absorbed++;
      shot.life = 0;
      const target = s.enemies
        .filter((e) => e.hp > 0 && !e.shielded)
        .sort((a, b) => dist(a, f) - dist(b, f))[0];
      if (target && s.shots.length < 180)
        s.shots.push({
          id: s.nextId++,
          x: shot.x,
          z: shot.z,
          ox: shot.x,
          oz: shot.z,
          target: target.id,
          speed: 26,
          damage: this.styleDamage() * 1.2,
          area: 0,
          life: 2.8,
          skillId: 'holy-ray',
          color: '#ffe6a0',
        });
      return true;
    };
    const oldNearest = proto.nearestPoi,
      oldInteract = proto.interact;
    proto.nearestPoi = function () {
      const node = this.s.sectors
          .filter((z) => z.kind && dist(z.anchor, this.s.player) < 3.8)
          .map((z) => ({
            id: 'purifier-' + z.id,
            type: 'purifier',
            zone: z.id,
            x: z.anchor.x,
            z: z.anchor.z,
            name: 'Purificar ' + z.name + ' · permanece 5 s',
            cost: 0,
          }))[0],
        poi = oldNearest.call(this);
      return node && (!poi || dist(node, this.s.player) <= dist(poi, this.s.player)) ? node : poi;
    };
    proto.interact = function () {
      const poi = this.nearestPoi();
      if (poi?.type !== 'purifier') return oldInteract.call(this);
      const s = this.s;
      if (s.choice || s.evolution || s.done || s.hatch > 0) return { ok: false };
      s.purifying = { zone: poi.zone, progress: 0 };
      return { ok: true, message: 'Quédate junto al nodo durante 5 segundos. Sigues atacando.' };
    };
    PORTALS.install(C, base, { nearest: oldNearest, interact: oldInteract });
  }
  const api = { install };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkWorldSystem = api;
})(typeof window !== 'undefined' ? window : globalThis);
