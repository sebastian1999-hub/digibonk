(function (root) {
  'use strict';
  const R = typeof module !== 'undefined' ? require('./status-rules.js') : root.DigibonkStatusRules;
  function install(C, S) {
    const p = C.Run.prototype,
      fields = p.updatePatternFields;
    p.slowEnemy = function (enemy, duration) {
      if (enemy.uncontrollable || enemy.hp <= 0 || enemy.tower) return false;
      enemy.slowLeft = Math.max(enemy.slowLeft || 0, duration);
      return true;
    };
    p.updateEnemyControl = function (enemy, dt) {
      if (enemy.hp <= 0 || enemy.tower) return;
      if (enemy.uncontrollable) {
        enemy.uncontrollableLeft = Math.max(0, (enemy.uncontrollableLeft ?? 5) - Math.max(0, dt));
        if (enemy.uncontrollableLeft <= 1e-8) {
          enemy.uncontrollableLeft = 0;
          enemy.uncontrollable = false;
          enemy.controlTime = 0;
        }
        return;
      }
      const states = enemy.statuses || {};
      let remaining = Math.max(
        enemy.slowLeft || 0,
        ...['freeze', 'shock', 'root', 'chill'].map((id) => states[id]?.left || 0),
      );
      for (const field of this.s.styleFields || []) {
        if (
          field.kind === 'roots' &&
          field.life > 0 &&
          Math.hypot(field.x - enemy.x, field.z - enemy.z) < field.radius
        )
          remaining = Math.max(remaining, field.life);
      }
      if (remaining <= 0) return;
      enemy.controlTime = Math.min(
        5,
        (enemy.controlTime || 0) + Math.min(Math.max(0, dt), remaining),
      );
      if (enemy.controlTime < 5 - 1e-8) return;
      enemy.controlTime = 5;
      enemy.uncontrollable = true;
      enemy.uncontrollableLeft = 5;
      enemy.slowLeft = 0;
      enemy.controlGuardLeft = 0;
      for (const id of ['freeze', 'shock', 'root', 'chill']) delete states[id];
      this.effect('hit', enemy.x, enemy.z, { text: 'INCONTROLABLE', life: 1, maxLife: 1 });
    };
    p.addEnemyStatus = function (enemy, id, damage = 0) {
      const def = R.effects[id];
      if (!def || enemy.hp <= 0 || enemy.tower || enemy.shielded) return false;
      if (enemy.uncontrollable && (def.control || id === 'chill')) return false;
      enemy.statuses ??= {};
      if (def.control) {
        if (enemy.boss || enemy.finalBoss) return this.addEnemyStatus(enemy, 'chill');
        if ((enemy.controlGuardLeft || 0) > 0) return false;
        enemy.controlGuardLeft = def.duration + 3;
      }
      const old = enemy.statuses[id],
        power = (def.ratio || 0) * damage * (enemy.boss || enemy.finalBoss ? 0.5 : 1);
      enemy.statuses[id] = {
        left: Math.max(old?.left || 0, def.duration),
        max: def.duration,
        clock: old?.clock ?? 0.5,
        power: Math.max(old?.power || 0, power),
      };
      if (id === 'chill') this.slowEnemy(enemy, def.duration);
      if (id === 'poison') {
        enemy.poisonLeft = enemy.statuses.poison.left;
        enemy.poisonClock = enemy.statuses.poison.clock;
        enemy.poisonDamage = enemy.statuses.poison.power;
      }
      return true;
    };
    p.applyTechniqueStatus = function (enemy, id, damage) {
      if (this.s.done || enemy.hp <= 0 || enemy.tower || enemy.shielded) return;
      for (const spec of R.forSkill(S.skills[id]))
        if (spec.chance === 1 || this.random() < spec.chance)
          this.addEnemyStatus(enemy, spec.id, damage);
    };
    p.enemyStatusBlocked = function (enemy) {
      if (enemy.uncontrollable) return false;
      return !!(enemy.statuses?.freeze?.left > 0 || enemy.statuses?.shock?.left > 0);
    };
    p.enemyStatusMovement = function (enemy) {
      if (enemy.uncontrollable) return 1;
      return this.enemyStatusBlocked(enemy) || enemy.statuses?.root?.left > 0 ? 0 : 1;
    };
    p.enemyStatusAttack = function (enemy) {
      return enemy.statuses?.weaken?.left > 0 ? 0.8 : 1;
    };
    p.elementDamageMultiplier = function (enemy, id) {
      const states = enemy.statuses;
      if (!states) return 1;
      const boss = enemy.boss || enemy.finalBoss;
      let mult =
        states.curse?.left > 0
          ? boss
            ? 1.075
            : 1.15
          : states.fracture?.left > 0
            ? boss
              ? 1.06
              : 1.12
            : 1;
      if (states.wet?.left > 0 && R.electric(S.skills[id])) {
        delete states.wet;
        mult *= boss ? 1.12 : 1.25;
        this.effect('hit', enemy.x, enemy.z, { text: 'CONDUCCIÓN', life: 0.8, maxLife: 0.8 });
      }
      return mult;
    };
    p.updateEnemyStatuses = function (dt) {
      if (this.s.done) return;
      for (const enemy of [...this.s.enemies]) {
        if (enemy.hp <= 0 || enemy.tower) continue;
        enemy.controlGuardLeft = Math.max(0, (enemy.controlGuardLeft || 0) - dt);
        enemy.statuses ??= {};
        if (enemy.poisonLeft > 0 && !enemy.statuses.poison)
          enemy.statuses.poison = {
            left: enemy.poisonLeft,
            max: 3,
            clock: enemy.poisonClock ?? 0.5,
            power: enemy.poisonDamage || 1,
          };
        for (const [id, status] of Object.entries(enemy.statuses)) {
          const elapsed = Math.min(Math.max(0, status.left), dt);
          status.left = Math.max(0, status.left - dt);
          if (R.effects[id]?.ratio) {
            status.clock -= elapsed;
            while (status.clock <= 1e-8 && enemy.hp > 0) {
              status.clock += 0.5;
              this.hurt(
                enemy,
                status.power,
                id === 'poison' ? 'poison-powder' : id === 'burn' ? 'fireball' : 'claw',
                true,
              );
            }
          }
          if (status.left <= 0) delete enemy.statuses[id];
        }
        enemy.poisonLeft = enemy.statuses.poison?.left || 0;
        enemy.poisonClock = enemy.statuses.poison?.clock ?? 0.5;
        enemy.poisonDamage = enemy.statuses.poison?.power || 0;
      }
    };
    p.updatePatternFields = function (dt) {
      fields.call(this, dt);
      this.updateEnemyStatuses(dt);
    };
  }
  const api = { install };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkStatusSystem = api;
})(typeof window !== 'undefined' ? window : globalThis);
