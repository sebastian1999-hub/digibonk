(function (root) {
  'use strict';
  function install(C, L) {
    const p = C.Run.prototype,
      choose = p.choose,
      dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    p.choose = function (id) {
      const before = Object.fromEntries(this.s.relics.map((r) => [r.id, r.rank])),
        ok = choose.call(this, id);
      if (!ok) return false;
      for (const item of this.s.relics) {
        const old = before[item.id] || 0;
        if (old === item.rank) continue;
        const r = item.rank,
          delta = r - old,
          player = this.s.player,
          stats = {
            'critical-chip': ['crit', 0.04],
            'vitality-chip': ['maxHp', 15],
            'armor-chip': ['shieldRatio', 0.1],
            'regen-chip': ['regen', 0.25],
          },
          factors = {
            'haste-chip': ['haste', 0.08],
            'power-chip': ['damage', 0.08],
            'area-chip': ['area', 0.1],
            'magnet-chip': ['magnet', 0.15],
            'swift-chip': ['speed', 0.06],
            'xp-chip': ['xpMult', 0.08],
          };
        const def = L.relics.find((d) => d.id === item.id);
        if (def?.stat) {
          if (['shieldRatio', 'regen', 'maxHp', 'crit'].includes(def.stat)) {
            player[def.stat] += def.value * delta;
            if (def.stat === 'maxHp')
              player.hp = Math.min(player.maxHp, player.hp + def.value * delta);
          } else player[def.stat] *= (1 + def.value * r) / (1 + def.value * old);
        }
        if (stats[item.id]) {
          const [stat, n] = stats[item.id];
          player[stat] += n * delta;
        }
        if (factors[item.id]) {
          const [stat, n] = factors[item.id];
          player[stat] *= (1 + n * r) / (1 + n * old);
        }
        if (item.id === 'vitality-chip') player.hp = Math.min(player.maxHp, player.hp + 15 * delta);

        player.speed = Math.min(15, player.speed);
        player.magnet = Math.min(24, player.magnet);
      }
      return true;
    };
    p.relicBurst = function (center, radius, mult, skill) {
      const s = this.s;
      for (const e of [...s.enemies])
        if (e.hp > 0 && !e.shielded && dist(e, center) < radius)
          this.hurt(e, s.player.damage * mult, skill);
      this.effect('burst', center.x, center.z, {
        skillId: skill,
        size: radius / 2,
        radius,
        life: 0.85,
        maxLife: 0.85,
      });
    };
    p.onRelicHit = function (enemy, damage, crit) {
      if (this._relicProc || this.s.done) return;
      this._relicProc = true;
      try {
        const s = this.s,
          p = s.player,
          c = s.relicClocks,
          rank = (id) => this.relicRank(id);
        if (crit && rank('life-steal') && !(c.vampire > 0)) {
          p.hp = Math.min(p.maxHp, p.hp + rank('life-steal'));
          c.vampire = 1;
          this.effect('heal', p.x, p.z, { skillId: 'heal' });
        }
        if (crit && rank('storm-core') && !(c.storm > 0)) {
          c.storm = 1.5;
          for (const e of s.enemies
            .filter((e) => e !== enemy && e.hp > 0 && !e.shielded && dist(e, enemy) < 7)
            .slice(0, 3)) {
            this.hurt(e, p.damage * 0.9 * rank('storm-core'), 'energy-bolt');
            this.effect('burst', e.x, e.z, {
              skillId: 'energy-bolt',
              size: 1,
              fromX: enemy.x,
              fromZ: enemy.z,
            });
          }
        }
        if (enemy.hp <= 0 && !enemy.tower) {
          if (rank('kill-burst') && s.kills % 8 === 0 && !(c.blast > 0)) {
            c.blast = 2;
            this.relicBurst(enemy, 3.5, 0.7 * rank('kill-burst'), 'inferno');
          }
          if (rank('void-core') && s.kills % 12 === 0 && !(c.void > 0)) {
            c.void = 8;
            for (const g of s.gems) g.attracted = true;
            this.relicBurst(p, 6, 2 * rank('void-core'), 'nightmare');
          }
        }
      } finally {
        this._relicProc = false;
      }
    };
    p.onRelicDamage = function () {
      const s = this.s,
        p = s.player,
        c = s.relicClocks;
      if (
        p.hp <= 0 &&
        this.relicRank('phoenix-core') > (s.phoenixUses ?? Number(!!s.phoenixUsed))
      ) {
        s.phoenixUses = (s.phoenixUses ?? Number(!!s.phoenixUsed)) + 1;
        s.phoenixUsed = true;
        p.hp = p.maxHp * 0.5;
        p.invulnerable = 3;
        this.effect('heal', p.x, p.z, { skillId: 'great-heal', size: 4 });
        this.emit('reborn');
      }
      if (p.hp > 0 && p.hp <= p.maxHp * 0.3 && this.relicRank('panic-shell') && !(c.panic > 0)) {
        c.panic = 20;
        p.shieldLeft = Math.max(p.shieldLeft, 2 + this.relicRank('panic-shell'));
        this.effect('heal', p.x, p.z, { skillId: 'guard' });
      }
    };
    p.updateRelicEffects = function (dt) {
      const s = this.s,
        p = s.player,
        c = s.relicClocks;
      if (s.done) return;
      if (this.relicRank('meteor-core') && !(c.meteor > 0)) {
        const target = this.combatTargets(s.enemies)[0];
        if (target) {
          c.meteor = 12;
          s.attackFields ??= [];
          s.attackFields.push({
            x: target.x,
            z: target.z,
            radius: 5,
            damage: p.damage * 2.5 * this.relicRank('meteor-core'),
            skillId: 'magma-bomb',
            left: 0.4,
          });
          if (s.attackFields.length > 48) s.attackFields.shift();
          this.effect('burst', target.x, target.z, {
            skillId: 'magma-bomb',
            radius: 5,
            size: 1.6,
            life: 0.9,
            maxLife: 0.9,
          });
        }
      }
      if (this.relicRank('time-core') && !(c.time > 0)) {
        c.time = 20;
        s.hostile = s.hostile.filter(
          (shot) => dist(shot, p) >= 12 + 2 * (this.relicRank('time-core') - 1),
        );
        for (const e of s.enemies)
          if (e.hp > 0 && !e.tower && dist(e, p) < 12 + 2 * (this.relicRank('time-core') - 1))
            this.slowEnemy(e, 5);
        this.effect('burst', p.x, p.z, { skillId: 'ice-breath', size: 4 });
      }
      p.relicHasteLeft = Math.max(0, (p.relicHasteLeft || 0) - dt);
    };
  }
  const api = { install };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkRelicEffects = api;
})(typeof window !== 'undefined' ? window : globalThis);
