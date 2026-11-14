(function (root) {
  'use strict';
  const qualities = {
      1: { name: 'Común', className: 'common', weight: 65 },
      2: { name: 'Raro', className: 'rare', weight: 28 },
      3: { name: 'Épico', className: 'epic', weight: 7 },
      4: { name: 'Legendario', className: 'legendary', weight: 2 },
    },
    riskSuccess = 0.2;
  function install(C, L) {
    const p = C.Run.prototype;
    p.shopQualityPool = function (base, maxQuality = 3) {
      const labels = {
          damage: 'daño',
          haste: 'velocidad de ataque',
          speed: 'velocidad',
          maxHp: 'vida máxima',
          regen: 'vida por segundo',
          crit: 'probabilidad crítica',
          magnet: 'alcance de recogida',
          xpMult: 'experiencia recogida',
          area: 'área de las técnicas',
          shieldRatio: 'vida máxima como escudo',
          projectileBonus: 'golpes o proyectiles extra en todas las técnicas ofensivas',
          ricochets: 'rebotes de proyectil (80 % de daño por rebote)',
          orbits: 'recolectores de experiencia (cada 3 se fusionan)',
        },
        icons = {
          damage: 'finisher',
          haste: 'dash-burst',
          speed: 'dash-burst',
          maxHp: 'rations',
          regen: 'rations',
          crit: 'boss-hunter',
          magnet: 'vacuum',
          xpMult: 'battery',
          area: 'frost',
          shieldRatio: 'thorns',
          projectileBonus: 'dash-burst',
          ricochets: 'dash-burst',
          orbits: 'battery',
        },
        caps = {
          speed: 15,
          crit: Infinity,
          magnet: 24,
          projectileBonus: Infinity,
          orbits: Infinity,
          ricochets: Infinity,
        },
        cards = [];
      let last = -1;
      for (
        let q = base.stat === 'projectileBonus' ? 3 : base.minQuality || 1;
        q <= (base.stat === 'projectileBonus' ? 3 : maxQuality);
        q++
      ) {
        const card = {
            ...base,
            id: base.id + '-q' + q,
            baseId: base.id,
            quality: q,
            rarity: qualities[q].name,
            iconPath: L.icon(icons[base.stat] || 'battery'),
          },
          current = this.s.player[base.stat],
          cap = caps[base.stat] ?? Infinity;
        let delta;
        if (base.factor) {
          card.factor = Math.min(1 + (base.factor - 1) * q, cap / current);
          delta = card.factor - 1;
        } else {
          card.amount = Math.min(
            base.amount *
              (base.stat === 'projectileBonus' ? 1 : base.stat === 'ricochets' ? q - 1 : q),
            cap - current,
          );
          delta = card.amount;
        }
        if (delta <= 0 || Math.abs(delta - last) < 1e-9) continue;
        last = delta;
        const percent = !!base.factor || ['crit', 'shieldRatio'].includes(base.stat),
          value = percent ? delta * 100 : delta;
        card.text =
          '+' +
          Number(value.toFixed(2)).toLocaleString('es-ES') +
          (percent ? ' %' : '') +
          ' de ' +
          labels[base.stat] +
          '.';
        if (base.id === 'heart') {
          card.heal = 25 * q;
          card.text += ' Recupera ' + card.heal + ' de vida.';
        }
        cards.push(card);
      }
      return cards;
    };
    p.statUpgradeOdds = function () {
      const rank = Math.min(3, Math.max(0, this.relicRank('selection-chip')));
      return [0.7 - rank * 0.05, 0.23 + rank * 0.03, 0.06 + rank * 0.015, 0.01 + rank * 0.005];
    };
    p.rollUpgradeQuality = function (stats = false) {
      const odds = stats ? this.statUpgradeOdds() : [0.7, 0.23, 0.06, 0.01];
      const n = this.random();
      let total = 0;
      for (let i = 0; i < odds.length; i++) {
        total += odds[i];
        if (n < total) return i + 1;
      }
      return 4;
    };
    p.levelUpgradeCard = function (base) {
      const quality = this.rollUpgradeQuality(true);
      if (base.stat === 'projectileBonus' && quality !== 3) return null;
      const card = this.shopQualityPool(base, 4)
        .filter((c) => c.quality <= quality)
        .at(-1);
      if (!card) return null;
      card.id = base.id;
      card.baseId = base.id;
      card.type = 'stat';
      card.rare = card.quality >= 3;
      if (base.stat === 'projectileBonus')
        card.text = '+1 golpe o proyectil en todas las técnicas ofensivas.';
      return card;
    };
    p.shopRoll = function (base) {
      const pool = this.shopQualityPool(base),
        winner = this.rollChestCard(pool, false);
      if (!winner) return null;
      return {
        kind: 'chest',
        title: 'Mejora comprada',
        cards: [winner],
        roll: {
          id: 'roll-' + this.s.nextId++,
          revision: 0,
          phase: 'spinning',
          source: 'shop',
          base: structuredClone(base),
          riskUsed: false,
          empty: false,
          pool,
          odds: this.chestOdds(pool, false),
        },
      };
    };
    p.riskPool = function () {
      const c = this.s.choice;
      return c?.roll?.source === 'shop' ? this.shopQualityPool(c.roll.base) : this.chestPool();
    };
    p.chestPool = function () {
      const s = this.s,
        cards = [];
      for (const item of L.relics) {
        const owned = s.relics.find((r) => r.id === item.id),
          rank = owned?.rank || 0;
        for (let q = item.legendary ? 4 : 1; q <= (item.legendary ? 4 : 3); q++)
          cards.push({
            id: 'relic-' + item.id + '-q' + q,
            type: 'artifact',
            item: item.id,
            rank: rank + (item.legendary ? 1 : q),
            quality: q,
            icon: item.icon,
            iconPath: L.icon(item.id),
            theme: item.theme,
            title: item.name,
            rarity: qualities[q].name,
            text:
              item.description(rank + (item.legendary ? 1 : q)) +
              ' Acumulación ' +
              rank +
              ' → ' +
              (rank + (item.legendary ? 1 : q)) +
              '. Sin límite de copias.',
          });
      }
      if (s.buddies.length < 3)
        for (const b of L.companions)
          if (C.species.has(b.id) && !s.buddies.some((x) => x.species === b.id))
            cards.push({
              id: 'buddy-' + b.id,
              type: 'companion',
              buddy: b.id,
              species: b.id,
              quality: 2,
              title: b.name,
              rarity: 'Raro',
              text: 'Se une al grupo (' + (s.buddies.length + 1) + '/3). ' + b.description,
            });
      return cards;
    };
    p.chestOdds = function (pool, portal = !!this.s.realm) {
      const weight = (q) => qualities[q].weight * (portal ? [0, 1, 1.12, 1.2, 1.25][q] : 1);
      const qs = [1, 2, 3, 4].filter((q) => pool.some((c) => c.quality === q));
      const sum = qs.reduce((n, q) => n + weight(q), 0);
      if (!sum) return [];
      const base = qs.includes(4) ? weight(4) / sum : 0;
      const bonus = this.relicRank('fortune-charm') * 0.02;
      const legendary = qs.includes(4) ? Math.min(1, base + bonus) : 0;
      return qs.map((q) => ({
        quality: q,
        chance: q === 4 ? legendary : (weight(q) / sum) * (base ? (1 - legendary) / (1 - base) : 1),
      }));
    };
    p.rollChestCard = function (pool, portal = !!this.s.realm) {
      if (!pool.length) return null;
      const odds = this.chestOdds(pool, portal),
        r = this.random();
      let cumulative = 0,
        quality = odds.at(-1).quality;
      for (const o of odds) {
        cumulative += o.chance;
        if (r < cumulative) {
          quality = o.quality;
          break;
        }
      }
      const candidates = pool.filter((c) => c.quality === quality),
        total = candidates.reduce((n, c) => n + (c.type === 'companion' ? 3 : 1), 0);
      let pick = this.random() * total;
      for (const c of candidates) {
        pick -= c.type === 'companion' ? 3 : 1;
        if (pick < 0) return structuredClone(c);
      }
      return structuredClone(candidates.at(-1));
    };
    p.precisionWheelOdds = function (pool) {
      // Timing sectors retain their readable ordering, independently of luck relics.
      const available = [1, 2, 3, 4].filter((q) => pool.some((c) => c.quality === q));
      const weight = (q) => qualities[q].weight * (this.s.realm ? [0, 1, 1.12, 1.2, 1.25][q] : 1);
      const total = available.reduce((n, q) => n + weight(q), 0);
      return available.map((quality) => ({ quality, chance: weight(quality) / total }));
    };
    p.chestChoices = function () {
      let pool = this.chestPool();
      if (!pool.length)
        pool = [
          {
            id: 'chest-recycle',
            type: 'currency',
            quality: 1,
            title: 'Datos reciclados',
            rarity: 'Común',
            iconPath: L.icon('bits'),
            amount: 10,
            text: 'Tu equipo está completo. Recuperas 10 bits.',
          },
        ];
      const winner = this.rollChestCard(pool);
      return {
        kind: 'chest',
        title: 'Cofre de datos',
        cards: [winner],
        roll: {
          id: 'roll-' + this.s.nextId++,
          revision: 0,
          phase: 'spinning',
          riskUsed: false,
          empty: false,
          pool,
          odds: this.hasEggPassive('YukimiBotamon')
            ? this.precisionWheelOdds(pool)
            : this.chestOdds(pool),
          riskChance: this.riskChance(),
          precision: this.hasEggPassive('YukimiBotamon'),
          wheelSpeed: 2.4 * (1 - 0.25 * Math.max(0, Math.min(1, (this.s.level - 1) / 399))),
        },
      };
    };
    p.revealChest = function (token) {
      const c = this.s.choice;
      if (
        c?.kind !== 'chest' ||
        !c.roll ||
        c.roll.phase !== 'spinning' ||
        token !== c.roll.id + ':' + c.roll.revision
      )
        return false;
      if (c.roll.precision) return false;
      c.roll.phase = 'revealed';
      return true;
    };
    p.stopChestWheel = function (token, position) {
      const c = this.s.choice;
      if (
        !c?.roll?.precision ||
        c.roll.phase !== 'spinning' ||
        token !== c.roll.id + ':' + c.roll.revision ||
        !Number.isFinite(position)
      )
        return false;
      let total = 0;
      const point = ((position % 1) + 1) % 1;
      const quality =
        c.roll.odds.find((o) => (total += o.chance) > point)?.quality ?? c.roll.odds.at(-1).quality;
      const pool = c.roll.pool.filter((card) => card.quality === quality);
      c.cards = [structuredClone(pool[Math.floor(this.random() * pool.length)])];
      c.roll.position = point;
      c.roll.phase = 'revealed';
      return true;
    };
    p.canRiskChest = function () {
      const c = this.s.choice;
      return !!(
        this.hasEggPassive('Zurumon') &&
        c?.kind === 'chest' &&
        c.roll?.phase === 'revealed' &&
        c.roll.source !== 'shop' &&
        !c.roll.riskUsed &&
        c.cards[0] &&
        this.riskPool().some((x) => x.quality > c.cards[0].quality)
      );
    };
    p.riskChest = function () {
      if (!this.canRiskChest()) return false;
      const c = this.s.choice,
        pool = this.riskPool().filter((x) => x.quality > c.cards[0].quality);
      c.roll.riskUsed = true;
      c.roll.riskChance = this.riskChance();
      c.roll.revision++;
      c.roll.phase = 'spinning';
      c.roll.pool = [
        ...pool,
        {
          id: 'empty-chest',
          type: 'empty',
          quality: 0,
          title: 'Cofre vacío',
          iconPath: L.icon('empty'),
          rarity: 'Sin recompensa',
        },
      ];
      const card = this.random() < this.riskChance() ? this.rollChestCard(pool) : null;
      c.cards = card ? [card] : [];
      c.roll.empty = !card;
      return true;
    };
  }
  const api = { install, qualities, riskSuccess };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkChest = api;
})(typeof window !== 'undefined' ? window : globalThis);
