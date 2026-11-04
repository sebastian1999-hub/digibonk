(function (root) {
  'use strict';
  const relics = [
    {
      id: 'vacuum',
      name: 'Imán de bolsillo',
      icon: '⊕',
      description: (r) =>
        'Al esquivar, atrae fragmentos a ' + (8 + r * 2) + ' metros. Ideal para explorar.',
      theme: 'mint',
    },
    {
      id: 'thorns',
      name: 'Coraza de espinas',
      icon: '✹',
      description: (r) =>
        'Al recibir daño, devuelve ' + r * 40 + ' % de tu daño a los enemigos a 3 metros.',
      theme: 'green',
    },
    {
      id: 'finisher',
      name: 'Colmillo depredador',
      icon: '◈',
      description: (r) =>
        'Inflige ' + r * 15 + ' % más de daño a enemigos con menos del 30 % de vida.',
      theme: 'gold',
    },
    {
      id: 'boss-hunter',
      name: 'Marca del cazador',
      icon: '⌖',
      description: (r) => 'Inflige ' + r * 12 + ' % más de daño a invasores y élites.',
      theme: 'coral',
    },
    {
      id: 'battery',
      name: 'Batería de emergencia',
      icon: 'ϟ',
      description: (r) =>
        'Cada ' + (24 - r * 4) + ' bajas, obtienes un escudo de 2 segundos. Recarga mínima: 12 s.',
      theme: 'mint',
    },
    {
      id: 'dash-burst',
      name: 'Botas de choque',
      icon: '»',
      description: (r) =>
        'Tu esquiva libera una onda que inflige ' + r * 40 + ' % de tu daño a 3 metros.',
      theme: 'coral',
    },
    {
      id: 'frost',
      name: 'Cristal de escarcha',
      icon: '❄',
      description: (r) =>
        'Tus críticos ralentizan un 35 % durante ' +
        (1 + r * 0.5).toFixed(1) +
        ' s. No afecta a su cadencia de disparo.',
      theme: 'ice',
    },
    {
      id: 'rations',
      name: 'Raciones de reserva',
      icon: '♡',
      description: (r) =>
        'Al abrir el siguiente cofre y los posteriores, recuperas un ' +
        r * 5 +
        ' % de vida máxima.',
      theme: 'green',
    },
    {
      id: 'critical-chip',
      name: 'Chip de puntería',
      icon: '⌖',
      theme: 'gold',
      description: (r) => '+' + r * 4 + ' puntos porcentuales de crítico (máximo 85 %).',
    },
    {
      id: 'haste-chip',
      name: 'Procesador turbo',
      icon: 'ϟ',
      theme: 'mint',
      description: (r) => '+' + r * 8 + ' % de velocidad de ataque.',
    },
    {
      id: 'vitality-chip',
      name: 'Núcleo de vitalidad',
      icon: '♡',
      theme: 'green',
      description: (r) =>
        '+' + r * 15 + ' de vida máxima. Recupera esa vida al obtenerlo o mejorarlo.',
    },
    {
      id: 'power-chip',
      name: 'Chip de potencia',
      icon: '⚔',
      theme: 'coral',
      description: (r) => '+' + r * 8 + ' % de daño de ataque.',
    },
    {
      id: 'area-chip',
      name: 'Amplificador de campo',
      icon: '◎',
      theme: 'ice',
      description: (r) => '+' + r * 10 + ' % de área y alcance de técnicas.',
    },
    {
      id: 'armor-chip',
      name: 'Placa de Chrome Digizoid',
      icon: '⬡',
      theme: 'mint',
      description: (r) => '+' + r + ' de armadura: reduce el daño recibido antes de escudos.',
    },
    {
      id: 'regen-chip',
      name: 'Código de reparación',
      icon: '✚',
      theme: 'green',
      description: (r) => 'Regenera ' + (r * 0.25).toFixed(2) + ' de vida por segundo.',
    },
    {
      id: 'magnet-chip',
      name: 'Antena recolectora',
      icon: '⊕',
      theme: 'mint',
      description: (r) => '+' + r * 15 + ' % de radio para recoger experiencia (máximo 24 m).',
    },
    {
      id: 'swift-chip',
      name: 'Botas de datos',
      icon: '»',
      theme: 'mint',
      description: (r) => '+' + r * 6 + ' % de velocidad de movimiento (máximo 15).',
    },
    {
      id: 'xp-chip',
      name: 'Memoria de combate',
      icon: '▣',
      theme: 'gold',
      description: (r) => '+' + r * 8 + ' % de experiencia recogida.',
    },
    {
      id: 'critical-lens',
      name: 'Visor del depredador',
      icon: '◈',
      theme: 'gold',
      description: (r) =>
        'Los críticos pasan de ×1,8 a ×' + (1.8 + r * 0.15).toFixed(2) + ' de daño.',
    },
    {
      id: 'life-steal',
      name: 'Colmillo vampírico',
      icon: '◈',
      theme: 'coral',
      description: (r) => 'Tus críticos recuperan ' + r + ' de vida. Recarga: 1 s.',
    },
    {
      id: 'kill-burst',
      name: 'Condensador explosivo',
      icon: '✹',
      theme: 'coral',
      description: (r) =>
        'Cada 8 bajas explota en el enemigo: ' + r * 70 + ' % de tu daño en 3,5 m. Recarga: 2 s.',
    },
    {
      id: 'dash-drive',
      name: 'Impulsor de ráfaga',
      icon: '»',
      theme: 'mint',
      description: (r) =>
        'Tras esquivar, ganas ' + r * 10 + ' % de velocidad de ataque durante 3 s.',
    },
    {
      id: 'panic-shell',
      name: 'Escudo de emergencia',
      icon: '⬡',
      theme: 'ice',
      description: (r) =>
        'Al recibir daño y quedar bajo el 30 % de vida, activa un escudo durante ' +
        (2 + r) +
        ' s. Recarga: 20 s.',
    },
    {
      id: 'phoenix-core',
      name: 'Digitama del renacer',
      icon: '♧',
      theme: 'gold',
      legendary: true,
      description: () =>
        'Una vez por partida, evita un golpe mortal y recupera el 50 % de tu vida. Invulnerabilidad: 3 s. El uso se conserva al guardar.',
    },
    {
      id: 'meteor-core',
      name: 'Fragmento de Apocalymon',
      icon: '☄',
      theme: 'coral',
      legendary: true,
      description: () =>
        'Cada 12 s cae un meteorito sobre el enemigo más cercano: 250 % de tu daño en 5 m.',
    },
    {
      id: 'time-core',
      name: 'Reloj de Clockmon',
      icon: '◷',
      theme: 'ice',
      legendary: true,
      description: () =>
        'Cada 20 s destruye proyectiles enemigos a 12 m y ralentiza a los rivales cercanos un 35 % durante 5 s.',
    },
    {
      id: 'void-core',
      name: 'Singularidad digital',
      icon: '◎',
      theme: 'mint',
      legendary: true,
      description: () =>
        'Cada 12 bajas atrae toda la experiencia y libera una explosión del 200 % de tu daño a 6 m. Recarga: 8 s.',
    },
    {
      id: 'storm-core',
      name: 'Corazón de tormenta',
      icon: 'ϟ',
      theme: 'gold',
      legendary: true,
      description: () =>
        'Un crítico encadena rayos a hasta 3 enemigos cercanos: 90 % de tu daño por objetivo. Recarga: 1,5 s.',
    },
  ];
  relics.push({
    id: 'fortune-charm',
    name: 'Talismán de la fortuna',
    icon: '✦',
    art: 'boss-hunter',
    theme: 'gold',
    description: (r) =>
      'Aumenta en ' +
      r * 2 +
      ' puntos porcentuales la probabilidad de obtener legendarios en los próximos cofres, si quedan legendarios disponibles. No cambia las recompensas ya sorteadas.',
  });
  relics.push({
    id: 'selection-chip',
    name: 'Chip de selección',
    icon: '✧',
    art: 'battery',
    theme: 'ice',
    description: (r) =>
      'Mejora las futuras tarjetas de estadísticas: común ' +
      (70 - r * 5) +
      ' %, rara ' +
      (23 + r * 3) +
      ' %, épica ' +
      (6 + r * 1.5) +
      ' % y legendaria ' +
      (1 + r * 0.5) +
      ' %. No afecta a técnicas ni a los objetos de cofres.',
  });
  const extra = [
    ['training-band', 'Banda de entrenamiento', 'damage', 0.04, 'daño', 'power-chip'],
    ['combat-gloves', 'Guantes de combate', 'damage', 0.06, 'daño', 'power-chip'],
    ['servo', 'Servomotor', 'haste', 0.06, 'velocidad de ataque', 'haste-chip'],
    ['clockwork', 'Engranaje acelerado', 'haste', 0.1, 'velocidad de ataque', 'haste-chip'],
    ['shell', 'Caparazón de datos', 'armor', 1, 'armadura', 'armor-chip'],
    ['repair-kit', 'Kit de reparación', 'regen', 0.2, 'vida por segundo', 'regen-chip'],
    ['life-cell', 'Célula vital', 'maxHp', 12, 'vida máxima', 'vitality-chip'],
    ['wind-ribbon', 'Cinta de viento', 'speed', 0.04, 'movimiento', 'swift-chip'],
    ['data-cache', 'Caché de aprendizaje', 'xpMult', 0.06, 'experiencia', 'xp-chip'],
    ['scope', 'Mira digital', 'crit', 0.03, 'crítico', 'critical-chip'],
    ['field-coil', 'Bobina de expansión', 'area', 0.08, 'área', 'area-chip'],
    ['signal', 'Receptor de señal', 'magnet', 0.12, 'recogida', 'magnet-chip'],
    ['omega-reactor', 'Reactor de Omegamon', 'damage', 0.35, 'daño', 'power-chip', true],
    ['ulforce-drive', 'Motor Ulforce', 'haste', 0.35, 'velocidad de ataque', 'haste-chip', true],
    ['aegis', 'Égida real', 'armor', 6, 'armadura', 'armor-chip', true],
    ['yggdrasil', 'Semilla de Yggdrasil', 'regen', 2, 'vida por segundo', 'regen-chip', true],
  ];
  for (const [id, name, stat, value, label, art, legendary] of extra)
    relics.push({
      id,
      name,
      stat,
      value,
      art,
      legendary: !!legendary,
      icon: '◆',
      theme: legendary ? 'gold' : 'mint',
      description: (r) =>
        '+' +
        Number((value * r * (['armor', 'regen', 'maxHp'].includes(stat) ? 1 : 100)).toFixed(2)) +
        (['armor', 'regen', 'maxHp'].includes(stat) ? '' : ' %') +
        ' de ' +
        label +
        '. Activo durante esta run.',
    });
  const companions = [
    {
      id: 'Terriermon',
      name: 'Terriermon',
      role: 'Artillero',
      description: 'Dispara aire cada 3,8 s. Su daño equivale al 55 % de tu ataque.',
      skill: 'air-shot',
      cooldown: 3.8,
    },
    {
      id: 'Salamon',
      name: 'Salamon',
      role: 'Sanador',
      description: 'Recupera el 6 % de tu vida máxima cada 14 s si estás herido.',
      skill: 'heal',
      cooldown: 14,
    },
    {
      id: 'Hagurumon',
      name: 'Hagurumon',
      role: 'Recolector',
      description: 'Cada 9 s atrae los fragmentos situados a 14 metros de él.',
      skill: 'focus',
      cooldown: 9,
    },
  ];
  const icon = (id) => 'assets/loot/' + (relics.find((r) => r.id === id)?.art || id) + '.png';
  const api = { relics, companions, icon, maxRelics: Infinity, maxRank: 3 };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkLoot = api;
})(typeof window !== 'undefined' ? window : globalThis);
