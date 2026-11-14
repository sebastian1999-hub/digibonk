(function (root) {
  'use strict';
  const definitions = {
    Choromon: [
      'Segunda mano',
      'Una renovación de tarjetas al comenzar y otra por evolución. Se acumulan; una por subida de nivel.',
    ],
    Zurumon: [
      'Todo o nada',
      'Puede arriesgar una recompensa de cofre: 20 % de éxito inicial, hasta 50 % en nivel 400.',
    ],
    Pabumon: [
      'Rebote evolutivo',
      '+1 rebote por evolución. Cada rebote conserva el 80 % del daño.',
    ],
    Petitmon: ['Más allá del límite', 'Puede alcanzar el nivel 450 y seguir eligiendo mejoras.'],
    Nyokimon: [
      'Semillas de datos',
      '0,25 % por baja de obtener una carta que mejora una estadística aleatoria (1/2/3/5 %).',
    ],
    Botamon: ['Crítico feroz', 'Multiplicador crítico inicial ×3,6 en lugar de ×1,8.'],
    Yuramon: [
      'Llamada de la horda',
      '+1 al máximo de enemigos vivos por nivel, también en portales.',
    ],
    Mokumon: [
      'Mercado negro',
      'Compra técnicas de cualquier línea hasta tu fase actual. Puedes cancelar sin pagar.',
    ],
    Pichimon: [
      'Enjambre evolutivo',
      'Duplica todas las unidades de recolector por evolución. Cada tres forman uno evolucionado.',
    ],
    Poyomon: ['Ráfaga evolutiva', '+1 proyectil por evolución, acumulable con tarjetas.'],
    Punimon: [
      'Especialista',
      'Con exactamente una técnica, las bonificaciones de estadísticas de la run son un 25 % más efectivas.',
    ],
    YukimiBotamon: [
      'Pulso preciso',
      'Detén la rueda para elegir la rareza del cofre. Gira hasta un 25 % más despacio en nivel 400.',
    ],
  };
  const stats = [
    'damage',
    'haste',
    'area',
    'maxHp',
    'speed',
    'crit',
    'regen',
    'magnet',
    'xpMult',
    'shieldRatio',
  ];
  function install(C, skills) {
    C.eggPassives = definitions;
    const p = C.Run.prototype,
      choose = p.choose,
      choices = p.choices,
      collect = p.collectGem;
    p.hasEggPassive = function (egg) {
      return this.s.egg === egg && this.s.hatch <= 0;
    };
    p.maxLevel = function () {
      return this.s.egg === 'Petitmon' ? 450 : 400;
    };
    p.enemyCapBonus = function () {
      return this.hasEggPassive('Yuramon') ? this.s.level : 0;
    };
    p.passiveInfo = function () {
      const [name, description] = definitions[this.s.egg] || ['', ''];
      const progress =
        this.s.egg === 'Choromon'
          ? ` Cargas: ${this.s.eggPassive?.refresh ?? 1}.`
          : this.s.egg === 'Zurumon'
            ? ` Éxito actual: ${(this.riskChance() * 100).toFixed(1)} %.`
            : this.s.egg === 'Punimon'
              ? this.s.player.weapons.length === 1
                ? ' Activa.'
                : 'Inactiva: requiere una técnica.'
              : '';
      return name + ' · ' + description + progress;
    };
    p.initializeEggPassive = function (loading = false) {
      // Legacy collectors were acquired at unknown phases: do not multiply them
      // retroactively just because an old run is loaded at an advanced stage.
      const phase = loading && this.s.egg === 'Pichimon' ? Math.max(0, this.s.player.stage + 1) : 0;
      this.s.eggPassive ??= { refresh: 1, phase, bonuses: {}, extra: {} };
      this.s.eggPassive.bonuses ??= {};
      this.s.eggPassive.extra ??= {};
      this.syncEggPhase();
    };
    p.syncEggPhase = function () {
      if (this.s.hatch > 0) return;
      const state = this.s.eggPassive,
        player = this.s.player;
      const phase = Math.max(0, player.stage + 1),
        gained = Math.max(0, phase - state.phase);
      if (!gained) return;
      if (this.hasEggPassive('Choromon')) state.refresh += gained;
      if (this.hasEggPassive('Pabumon')) player.ricochets += gained;
      if (this.hasEggPassive('Poyomon')) player.projectileBonus += gained;
      if (this.hasEggPassive('Pichimon')) player.orbits *= 2 ** gained;
      state.phase = phase;
    };
    p.riskChance = function () {
      return 0.2 + 0.3 * Math.max(0, Math.min(1, (this.s.level - 1) / 399));
    };
    p.criticalMultiplier = function () {
      return (
        (this.hasEggPassive('Botamon') ? 3.6 : 1.8) +
        this.relicRank('critical-lens') *
          0.15 *
          (this.hasEggPassive('Punimon') && this.s.player.weapons.length === 1 ? 1.25 : 1) +
        Math.max(0, this.s.player.crit - 0.85)
      );
    };
    // Keep permanent critical chance uncapped in the save. Combat clamps it and derives
    // overflow; no conversion mutates the save, so loading cannot apply it twice.
    p.removeSpecialist = function () {
      const state = this.s.eggPassive;
      for (const [key, value] of Object.entries(state.extra)) this.s.player[key] -= value;
      state.extra = {};
    };
    p.applySpecialist = function () {
      if (!this.hasEggPassive('Punimon') || this.s.player.weapons.length !== 1) return;
      const state = this.s.eggPassive;
      for (const [key, value] of Object.entries(state.bonuses)) {
        const cap = key === 'speed' ? 15 : key === 'magnet' ? 24 : Infinity;
        const extra = Math.max(0, Math.min(value * 0.25, cap - this.s.player[key]));
        state.extra[key] = extra;
        this.s.player[key] += extra;
      }
    };
    p.choices = function (kind = 'level') {
      if (kind !== 'shop' || !this.hasEggPassive('Mokumon')) return choices.call(this, kind);
      const available = Object.values(skills.skills).filter(
        (s) =>
          s.kind === 'damage' &&
          s.stage <= this.s.player.stage &&
          !this.s.player.weapons.some((w) => w.id === s.id),
      );
      const cards = [];
      while (available.length && cards.length < 3) {
        const skill = available.splice(Math.floor(this.random() * available.length), 1)[0];
        cards.push({
          id: 'buy-' + skill.id,
          type: 'market-weapon',
          weapon: skill.id,
          price: this.shopPrice(),
          title: skill.name,
          text: this.shopPrice() + ' bits. ' + C.describeTechnique(skill.id),
          rarity: 'MERCADO NEGRO',
        });
      }
      cards.push({
        id: 'leave-market',
        type: 'weapon-decline',
        title: 'Salir',
        text: 'Conservar tu equipo y tus bits.',
      });
      return { kind: 'shop', title: 'Wizardmon · Mercado negro', cards };
    };
    p.canRefreshLevel = function () {
      return (
        this.hasEggPassive('Choromon') &&
        this.s.choice?.kind === 'level' &&
        !this.s.choice.refreshed &&
        this.s.eggPassive.refresh > 0
      );
    };
    p.refreshLevel = function () {
      if (!this.canRefreshLevel()) return false;
      this.s.eggPassive.refresh--;
      this.s.choice = { ...this.choices(), refreshed: true };
      return true;
    };
    p.choose = function (id) {
      const choice = this.s.choice,
        card = choice?.cards.find((c) => c.id === id);
      if (!card) return false;
      if (card.type === 'market-weapon') {
        if (!this.hasEggPassive('Mokumon') || this.s.coins < card.price) return false;
        this.s.choice = this.weaponReplacement(card.weapon);
        this.s.choice.marketPrice = card.price;
        if (this.s.player.weapons.length < 4)
          this.s.choice.cards = [
            { ...card, id: 'accept-market', type: 'weapon' },
            ...this.s.choice.cards.filter((c) => c.type === 'weapon-decline'),
          ];
        return true;
      }
      const purchase =
        choice.marketPrice != null && ['weapon', 'weapon-replace'].includes(card.type);
      if (purchase && this.s.coins < choice.marketPrice) return false;
      this.removeSpecialist();
      const before = Object.fromEntries(stats.map((key) => [key, this.s.player[key]]));
      const ok = choose.call(this, id);
      if (ok) {
        if (purchase) {
          this.s.coins -= choice.marketPrice;
          this.s.shopPurchases++;
        }
        if (card.type === 'stat' || card.type === 'artifact') {
          for (const key of stats)
            this.s.eggPassive.bonuses[key] =
              (this.s.eggPassive.bonuses[key] || 0) + (this.s.player[key] - before[key]);
        } else if (card.type === 'evolution') {
          for (const key of ['damage', 'maxHp'])
            this.s.eggPassive.bonuses[key] = (this.s.eggPassive.bonuses[key] || 0) * 1.12;
        }
        this.syncEggPhase();
      }
      this.applySpecialist();
      this.s.player.hp = Math.min(this.s.player.hp, this.s.player.maxHp);
      return ok;
    };
    p.dropDataCard = function (enemy) {
      if (!this.hasEggPassive('Nyokimon') || this.random() >= 0.0025) return;
      const n = this.random(),
        quality = n < 0.7 ? 1 : n < 0.93 ? 2 : n < 0.99 ? 3 : 4;
      this.s.gems.push({
        id: this.s.nextId++,
        x: enemy.x,
        z: enemy.z,
        value: 0,
        dataCard: quality,
        stat: (() => {
          const eligible = stats.filter(
            (key) =>
              this.s.player[key] > 0 &&
              (key !== 'speed' || this.s.player[key] < 15) &&
              (key !== 'magnet' || this.s.player[key] < 24),
          );
          return eligible[Math.floor(this.random() * eligible.length)];
        })(),
      });
    };
    p.collectGem = function (gem) {
      if (!gem.dataCard) return collect.call(this, gem);
      const percent = [0, 0.01, 0.02, 0.03, 0.05][gem.dataCard],
        key = gem.stat;
      this.removeSpecialist();
      const before = this.s.player[key];
      const delta = ['crit', 'shieldRatio'].includes(key) ? percent : before * percent;
      this.s.player[key] = Math.min(
        key === 'speed' ? 15 : key === 'magnet' ? 24 : Infinity,
        before + delta,
      );
      this.s.eggPassive.bonuses[key] =
        (this.s.eggPassive.bonuses[key] || 0) + this.s.player[key] - before;
      this.applySpecialist();
      const labels = {
        damage: 'Daño',
        haste: 'Cadencia',
        area: 'Área',
        maxHp: 'Vida',
        speed: 'Velocidad',
        crit: 'Crítico',
        regen: 'Regeneración',
        magnet: 'Recogida',
        xpMult: 'Experiencia',
        shieldRatio: 'Escudo',
      };
      this.emit('data-card', { text: labels[key] + ' +' + percent * 100 + ' %' });
      this.effect('heal', this.s.player.x, this.s.player.z, {
        text: labels[key] + ' +' + percent * 100 + ' %',
      });
    };
  }
  const api = { install, definitions };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkEggPassives = api;
})(typeof window !== 'undefined' ? window : globalThis);
