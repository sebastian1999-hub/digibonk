(function (root) {
  'use strict';
  const B = typeof module !== 'undefined' ? require('./balance.js') : root.DigibonkBalance;
  function install(C) {
    const p = C.Run.prototype,
      init = p.initializeWorld,
      update = p.updateWorld,
      spawn = p.spawn,
      closed = p.onTowerDestroyed;
    p.initializeWorld = function () {
      init.call(this);
      const s = this.s;
      s.portalCycle ??= { version: 1, remaining: 180, overdue: 0, expiredNotified: false };
      s.portalCycle.remaining = Number.isFinite(s.portalCycle.remaining)
        ? Math.max(0, Math.min(180, s.portalCycle.remaining))
        : 180;
      s.portalCycle.overdue = Number.isFinite(s.portalCycle.overdue)
        ? Math.max(0, s.portalCycle.overdue)
        : 0;
      if (s.portalCycle.overdue > 0) s.portalCycle.remaining = 0;
      s.pressureRefresh ??= 1;
    };
    p.difficultyTime = function () {
      return Math.max(0, this.s.time - (this.s.trialTimeDiscount || 0));
    };
    p.startTrials = function () {
      const s = this.s;
      if (!s.world.devimonDefeated || s.realm || s.trial || s.time < (s.nextTrialAt || 0)) return;
      const pool = ['pulse', 'maze', 'memory', 'rain', 'circuit', 'echo', 'orbit'];
      const first = pool.splice(Math.floor(this.random() * pool.length), 1)[0];
      s.nextTrialAt = s.time + 600;
      s.trial = {
        games: [first, pool[Math.floor(this.random() * pool.length)]],
        scores: [],
        elapsed: 0,
        round: 0,
        step: 0,
        x: 1,
        y: 1,
        pattern: Array.from({ length: 5 }, () => Math.floor(this.random() * 4)),
        mirror: this.random() < 0.5,
        started: false,
      };
    };
    p.scoreTrial = function (score) {
      const trial = this.s.trial;
      if (!trial || trial.scores.length >= 2) return;
      trial.scores.push(Math.max(0, Math.min(1, score)));
      Object.assign(trial, { started: false, elapsed: 0, round: 0, step: 0, points: 0 });
      if (trial.scores.length < 2) return;
      const before = this.difficultyTime();
      trial.before = B.timeGrowth(before);
      const reduction = (trial.scores[0] + trial.scores[1]) / 8;
      const target = 1 + (trial.before - 1) * (1 - reduction);
      if (target < trial.before) {
        let low = 0,
          high = before;
        for (let i = 0; i < 48; i++) {
          const mid = (low + high) / 2;
          if (B.timeGrowth(mid) < target) low = mid;
          else high = mid;
        }
        this.s.trialTimeDiscount = this.s.time - high;
        this.syncMainPressure();
      }
      trial.after = B.timeGrowth(this.difficultyTime());
    };
    p.portalClockInfo = function () {
      const s = this.s,
        c = s.portalCycle;
      return {
        phase:
          s.world.cleansed >= s.world.target
            ? 'complete'
            : s.realm
              ? 'inside'
              : c.remaining > 0
                ? 'countdown'
                : 'overdue',
        remaining: c.remaining,
        overdue: c.overdue,
        growth: B.timeGrowth(this.difficultyTime()),
      };
    };
    p.scaleEnemyDifficulty = function (e) {
      if (e.hp <= 0 || e.tower || e.realmMob) return;
      const s = this.s,
        t = B.timeFactors(this.difficultyTime()),
        target = B.factors(this.difficultyTime(), s.portalCycle.overdue, !!e.finalBoss);
      if (e.basic === false && !e.finalBoss) {
        const stats = B.main(this.difficultyTime(), e.stage, !!e.boss),
          late = B.deadline(s.portalCycle.overdue),
          health = e.hp / e.maxHp;
        e.maxHp = stats.hp * (e.elite ? 1.8 : 1) * late.hp;
        e.hp = e.maxHp * health;
        e.contactDamage = stats.contact * late.damage;
        e.shotDamage = stats.shot * late.damage;
        e.speed = Math.min(24, stats.speed * late.speed);
        e.projectileSpeed = Math.min(36, stats.projectileSpeed * late.projectile);
        e.shotInterval = Math.max(0.45, (e.boss ? 1.8 : 4) / target.cadence);
        e.pressureFactors = target;
        return;
      }
      if (!e.pressureFactors) {
        const stats = B.main(this.difficultyTime(), e.stage, !!e.boss);
        e.pressureFactors = { hp: 1, damage: 1, speed: 1, projectile: 1, cadence: 1 };
        e.contactDamage ??= stats.contact / t.damage;
        e.shotDamage ??= stats.shot / t.damage;
        e.projectileSpeed ??= 10;
      }
      const old = e.pressureFactors,
        health = e.hp / e.maxHp;
      e.maxHp *= target.hp / old.hp;
      e.hp = e.maxHp * health;
      e.contactDamage *= target.damage / old.damage;
      e.shotDamage *= target.damage / old.damage;
      e.speed = Math.min(24, (e.speed * target.speed) / old.speed);
      e.projectileSpeed = Math.min(36, (e.projectileSpeed * target.projectile) / old.projectile);
      e.shotInterval = Math.max(
        0.45,
        ((e.shotInterval || (e.boss ? 1.8 : 4)) * old.cadence) / target.cadence,
      );
      e.pressureFactors = target;
    };
    p.syncMainPressure = function () {
      for (const e of this.s.enemies) this.scaleEnemyDifficulty(e);
    };
    p.difficultyAttackFactor = function (e) {
      return (
        e.pressureFactors?.damage ??
        B.factors(this.difficultyTime(), this.s.portalCycle.overdue, !!e.finalBoss).damage
      );
    };
    p.difficultyCadenceFactor = function (e) {
      return (
        e.pressureFactors?.cadence ??
        B.factors(this.difficultyTime(), this.s.portalCycle.overdue, !!e.finalBoss).cadence
      );
    };
    p.spawn = function (boss = false) {
      const s = this.s,
        before = s.nextId,
        result = spawn.call(this, boss);
      for (const e of s.enemies)
        if (e.id >= before && !e.realmMob && !e.tower) {
          const f = B.timeFactors(this.difficultyTime()),
            stats = B.main(this.difficultyTime(), e.stage, !!e.boss);
          e.pressureFactors = f;
          e.contactDamage = stats.contact;
          e.shotDamage = stats.shot;
          e.projectileSpeed = stats.projectileSpeed;
          this.scaleEnemyDifficulty(e);
        }
      return result;
    };
    p.onTowerDestroyed = function (tower) {
      const result = closed.call(this, tower);
      if (result) {
        this.s.portalCycle = { version: 1, remaining: 180, overdue: 0, expiredNotified: false };
        this.s.pressureRefresh = 0;
      }
      return result;
    };
    p.updateWorld = function (dt, input) {
      const s = this.s,
        c = s.portalCycle;
      if (!s.realm && s.world.cleansed < s.world.target) {
        const spent = Math.min(c.remaining, dt);
        c.remaining = Math.max(0, c.remaining - spent);
        c.overdue += dt - spent;
        if (c.remaining === 0 && c.overdue === 0) c.overdue = 0.001;
        if (c.remaining === 0 && !c.expiredNotified) {
          c.expiredNotified = true;
          this.emit('portal-deadline');
          s.pressureRefresh = 0;
        }
      }
      const changed = update.call(this, dt, input);
      if (!s.done && !changed) {
        s.pressureRefresh -= dt;
        if (s.pressureRefresh <= 0) {
          s.pressureRefresh = 1;
          if (s.realm && s.realm.phase !== 'cleared') this.refreshRealmPressure(true);
          else if (!s.realm) this.syncMainPressure();
        }
      }
      return changed;
    };
  }
  const api = { install };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkDifficulty = api;
})(typeof window !== 'undefined' ? window : globalThis);
