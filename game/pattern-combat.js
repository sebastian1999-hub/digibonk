(function (root) {
  'use strict';
  function install(C, S) {
    const p = C.Run.prototype,
      dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    p.castTechnique = function (skill, rank, nearest, damage, area) {
      const s = this.s,
        player = s.player;
      if (skill.pattern) return this.castPattern(skill, rank, nearest, damage);
      if (skill.mode === 'melee') {
        for (const e of this.combatTargets(s.enemies))
          if (dist(e, player) < 4 * player.area) this.hurt(e, damage, skill.id);
        this.effect('slash', player.x, player.z, {
          skillId: skill.id,
          visualScale: player.area,
          radius: 4 * player.area,
        });
        return;
      }
      s.shots.push({
        id: s.nextId++,
        x: player.x,
        z: player.z,
        ox: player.x,
        oz: player.z,
        target: nearest.id,
        height: 1.1 + Math.max(0, player.stage) * 0.23,
        bornAt: s.time,
        speed:
          skill.visual === 'wave'
            ? 18
            : skill.visual === 'missile'
              ? 22
              : skill.visual.includes('beam') || skill.visual === 'laser'
                ? 40
                : 24,
        damage,
        area,
        life: 2.8,
        skillId: skill.id,
        color: skill.color,
        visualScale: player.area,
      });
    };
    p.castPattern = function (skill, rank, nearest, damage) {
      const s = this.s,
        p = s.player,
        apply = (e) => {
          this.hurt(e, damage, skill.id);
        },
        radius =
          (skill.pattern === 'ring' ? 5 : skill.pattern === 'cone' ? 7 : 3.5) *
          p.area *
          (1 + (rank - 1) * 0.035),
        targets = this.combatTargets(s.enemies);
      if (skill.pattern === 'volley') {
        for (const e of [nearest])
          s.shots.push({
            id: s.nextId++,
            x: p.x,
            z: p.z,
            ox: p.x,
            oz: p.z,
            target: e.id,
            height: 1.2,
            bornAt: s.time,
            speed: 26,
            damage,
            area: 0,
            visualScale: p.area,
            life: 2.8,
            skillId: skill.id,
            color: skill.color,
          });
        return;
      }
      if (skill.pattern === 'cone') {
        const dx = nearest.x - p.x,
          dz = nearest.z - p.z,
          n = Math.hypot(dx, dz) || 1;
        for (const e of targets) {
          const d = dist(e, p);
          if (d < radius && ((e.x - p.x) * dx + (e.z - p.z) * dz) / (Math.max(0.01, d) * n) > 0.5)
            apply(e);
        }
        this.effect('burst', p.x, p.z, {
          skillId: skill.id,
          visualScale: p.area,
          size: radius / 3,
          radius,
          dx: dx / n,
          dz: dz / n,
          life: 0.7,
          maxLife: 0.7,
        });
        return;
      }
      if (skill.pattern === 'ring') {
        for (const e of targets) if (dist(e, p) < radius) apply(e);
        this.effect('burst', p.x, p.z, {
          skillId: skill.id,
          visualScale: p.area,
          radius,
          size: radius / 3,
          life: 1,
          maxLife: 1,
        });
        return;
      }
      if (skill.pattern === 'chain') {
        let origin = p;
        const available = [...targets];
        for (let i = 0; i < 3; i++) {
          available.sort((a, b) => dist(a, origin) - dist(b, origin));
          const e = available.shift();
          if (!e || dist(e, origin) > 15 * p.area) break;
          apply(e);
          this.effect('burst', e.x, e.z, {
            skillId: skill.id,
            visualScale: p.area,
            fromX: origin.x,
            fromZ: origin.z,
            life: 0.65,
            maxLife: 0.65,
          });
          origin = e;
        }
        return;
      }
      s.attackFields ??= [];
      s.attackFields.push({
        x: nearest.x,
        z: nearest.z,
        radius,
        damage,
        skillId: skill.id,
        visualScale: p.area,
        left: 0.4,
      });
      if (s.attackFields.length > 48) s.attackFields.shift();
      this.effect('burst', nearest.x, nearest.z, {
        skillId: skill.id,
        visualScale: p.area,
        radius,
        size: radius / 3,
        life: 0.9,
        maxLife: 0.9,
      });
    };
    p.updatePatternFields = function (dt) {
      const s = this.s;
      const echoes = s.techniqueEchoes || [];
      s.techniqueEchoes = [];
      for (const echo of echoes) {
        if (echo.scene !== (s.realm?.portalId ?? 'main')) continue;
        echo.left -= dt;
        if (echo.left > 0) {
          s.techniqueEchoes.push(echo);
          continue;
        }
        const skill = S.skills[echo.skillId],
          target =
            s.enemies.find((e) => e.id === echo.target && e.hp > 0) ||
            this.combatTargets(s.enemies)[0];
        if (skill && target && !s.done)
          this.castTechnique(skill, echo.rank, target, echo.damage, echo.area);
      }
      if (s.done) return;
      s.attackFields ??= [];
      for (const field of s.attackFields) {
        field.left -= dt;
        if (field.left <= 0) {
          for (const e of [...s.enemies])
            if (e.hp > 0 && !e.shielded && dist(e, field) < field.radius) {
              this.hurt(e, field.damage, field.skillId);
            }
        }
      }
      s.attackFields = s.attackFields.filter((f) => f.left > 0);
    };
  }
  const api = { install };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkPatternCombat = api;
})(typeof window !== 'undefined' ? window : globalThis);
