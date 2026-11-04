(function (root) {
  'use strict';
  const stats = {
    damage: { name: 'Fuerza', step: 0.06 },
    haste: { name: 'Velocidad de ataque', step: 0.05 },
    maxHp: { name: 'Vitalidad', step: 8 },
    speed: { name: 'Movimiento', step: 0.02 },
  };
  const fresh = () => ({
      bits: 0,
      eggs: { Botamon: { damage: 0, haste: 0, maxHp: 0, speed: 0 } },
      claimed: {},
    }),
    level = (e) => Object.keys(stats).reduce((n, k) => n + (e?.[k] || 0), 0),
    cost = (e, k) => 60 + 40 * (e?.[k] || 0),
    eggCost = (i) => 180 + i * 90;
  function buy(s, id, k, i) {
    if (k && !stats[k]) return false;
    const e = s.eggs[id],
      price = k ? cost(e, k) : eggCost(i);
    if ((k && (!e || e[k] >= 10)) || (!k && e) || s.bits < price) return false;
    s.bits -= price;
    if (k) e[k]++;
    else s.eggs[id] = { damage: 0, haste: 0, maxHp: 0, speed: 0 };
    return true;
  }
  function apply(r, e) {
    r.s.eggTraining = { ...e };
    for (const [k, d] of Object.entries(stats)) {
      if (k === 'maxHp') {
        r.s.player.maxHp += d.step * (e[k] || 0);
        r.s.player.hp = r.s.player.maxHp;
      } else r.s.player[k] *= 1 + d.step * (e[k] || 0);
    }
  }
  const reward = (s) =>
    Math.max(
      0,
      Math.floor(s.kills / 3) +
        Math.floor(s.time / 20) +
        (s.world?.cleansed || 0) * 50 +
        (s.world?.devimonDefeated ? 250 : 0),
    );
  function claim(m, s) {
    const amount = reward(s),
      old = m.claimed[s.id] || 0,
      delta = Math.max(0, amount - old);
    m.bits += delta;
    m.claimed[s.id] = Math.max(old, amount);
    return delta;
  }
  const api = { stats, fresh, level, cost, eggCost, buy, apply, reward, claim };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkProgression = api;
})(typeof window !== 'undefined' ? window : globalThis);
