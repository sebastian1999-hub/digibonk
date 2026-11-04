(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function timeGrowth(time) {
    const m = clamp((time - 180) / 60, 0, 1440);
    return 1 + 0.05 * m + 0.018 * m * m + 0.001 * m * m * m;
  }
  function timeFactors(time) {
    const m = clamp((time - 180) / 60, 0, 1440),
      g = timeGrowth(time);
    return {
      hp: g,
      damage: Math.sqrt(g),
      speed: 1 + Math.min(0.3, 0.025 * m + 0.002 * m * m),
      projectile: 1 + Math.min(0.3, 0.02 * m),
      cadence: 1 + Math.min(0.7, 0.025 * m + 0.002 * m * m),
    };
  }
  function deadline(seconds = 0) {
    if (!(seconds > 0)) return { hp: 1, damage: 1, speed: 1, projectile: 1, cadence: 1 };
    const m = clamp(seconds / 60, 0, 120);
    return {
      hp: 2 * (1 + 0.8 * m + 0.45 * m * m),
      damage: 1.5 * (1 + 0.3 * m + 0.12 * m * m),
      speed: 1.12 + Math.min(0.3, m * 0.05),
      projectile: 1.1 + Math.min(0.3, m * 0.04),
      cadence: 1.15 + Math.min(0.5, m * 0.08),
    };
  }
  function factors(time, overdue = 0, finalBoss = false) {
    const t = timeFactors(time),
      d = deadline(overdue);
    return {
      hp: (finalBoss ? Math.sqrt(t.hp) : t.hp) * d.hp,
      damage: t.damage * d.damage,
      speed: t.speed * d.speed,
      projectile: t.projectile * d.projectile,
      cadence: t.cadence * d.cadence,
    };
  }
  function mainStage(time) {
    return clamp(Math.floor(time / 70) - 1, -1, 4);
  }
  function main(time, stage, boss = false) {
    const t = Math.max(0, time),
      intro = clamp(t / 90, 0, 1),
      adult = Math.max(0, stage),
      f = timeFactors(t);
    return {
      hp:
        (boss
          ? 300 * Math.pow(1 + t / 120, 1.65)
          : 18 * Math.pow(1 + t / 100, 1.65) * (1 + adult * 0.25)) *
        (boss ? 1 : (0.7 + 0.3 * intro) * 0.6) *
        f.hp,
      speed: Math.min(
        12,
        (boss ? 4 + stage * 0.3 : (3.2 + Math.min(5.6, t * 0.014)) * (0.85 + 0.15 * intro)) *
          f.speed,
      ),
      projectileSpeed: 10 * f.projectile,
      contact: (9 + t * 0.045 + adult * 2) * (0.72 + 0.28 * intro) * (boss ? 1 : 0.8) * f.damage,
      shot: (10 + adult * 3 + t * 0.025) * (boss ? 1 : 0.85) * f.damage,
      batch: Math.min(6, 3 + Math.floor(t / 120)),
      interval: Math.max(
        0.18,
        (Math.max(0.28, 0.8 - t * 0.0012) * (1 + 0.4 * (1 - intro))) / f.cadence,
      ),
      elite: t < 45 ? 0 : Math.min(0.16, (0.04 + t / 2400) * clamp((t - 45) / 45, 0, 1)),
    };
  }
  function pressure(input, previous = {}) {
    return {
      version: 3,
      overdue: Math.max(0, input.overdue || 0, previous.overdue || 0),
      enemyStage: Math.max(
        input.enemyStage ?? mainStage(input.time),
        input.stage,
        previous.enemyStage ?? -1,
      ),
      level: Math.max(1, input.level, previous.level || 1),
      time: Math.max(0, input.time, previous.time || 0),
      stage: Math.max(-1, input.stage, previous.stage ?? -1),
      shops: Math.max(0, input.shops || 0, previous.shops || 0),
      cleansed: Math.max(0, input.cleansed || 0, previous.cleansed || 0),
    };
  }
  function realm(profile, wave = 1, stageOverride) {
    const progress = clamp(profile.cleansed || 0, 0, 5),
      stage = clamp(
        stageOverride ?? profile.enemyStage ?? Math.max(profile.stage, mainStage(profile.time)),
        -1,
        4,
      ),
      outside = main(profile.time, stage),
      level = Math.pow(1 + (profile.level - 1) / 20, 0.55),
      intensity = 1.05 + progress * 0.18,
      late = deadline(profile.overdue),
      growth = timeFactors(profile.time);
    return {
      stage,
      hp: Math.round(
        Math.max(12, outside.hp * intensity * level * (1 + profile.shops * 0.018)) *
          (1 + (wave - 1) * 0.12) *
          late.hp,
      ),
      speed: Math.min(
        12,
        (Math.max(3.1 + Math.max(0, stage) * 0.2, outside.speed * (0.94 + progress * 0.035)) +
          (wave - 1) * 0.1) *
          late.speed,
      ),
      contact:
        Math.max(outside.contact, 6 + profile.level * 0.35) *
        (0.8 + progress * 0.12) *
        (1 + (wave - 1) * 0.06) *
        late.damage,
      shot: Math.max(outside.shot, 7 + profile.level * 0.3) * (0.8 + progress * 0.12) * late.damage,
      projectileSpeed: Math.min(
        18,
        (7.5 + wave * 0.3 + profile.level * 0.02 + progress * 0.45) *
          growth.projectile *
          late.projectile,
      ),
      shotInterval: Math.max(
        1.2,
        (4.8 - wave * 0.2 - profile.level * 0.008 - progress * 0.22) /
          (growth.cadence * late.cadence),
      ),
      eliteChance: 0.025 + wave * 0.01 + progress * 0.012 + Math.min(0.06, profile.level / 600),
      rangedChance: 0.12 + progress * 0.025,
      reinforcementCount: 4 + progress + Math.min(5, Math.floor(profile.level / 15)),
      reinforcementInterval: 12 - progress * 0.9,
      xp: Math.max(
        1,
        Math.round(
          0.6 *
            (3 + Math.max(0, stage) * 2 + Math.floor(profile.level / 8)) *
            (1 + (wave - 1) * 0.2),
        ),
      ),
      coins: 2 + Math.floor(profile.level / 12) + (wave === 3 ? 1 : 0),
      count: Math.min(
        145,
        [18, 28, 40][wave - 1] +
          Math.min(20, Math.floor((profile.level - 1) / 3)) +
          progress * [6, 9, 12][wave - 1],
      ),
    };
  }
  function tower(profile) {
    return Math.round(
      Math.max(350, (realm(profile, 3).hp / 0.6) * (4 + clamp(profile.cleansed || 0, 0, 5))),
    );
  }
  const api = {
    timeGrowth,
    timeFactors,
    deadline,
    factors,
    mainStage,
    main,
    pressure,
    realm,
    tower,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkBalance = api;
})(typeof window !== 'undefined' ? window : globalThis);
