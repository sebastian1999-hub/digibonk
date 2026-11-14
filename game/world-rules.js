(function (root) {
  'use strict';
  const WORLD = 220,
    SECTOR_SIZE = 144,
    MAP_VERSION = 4,
    OBJECTIVE_ZONES = 6;
  const styles = {
    vanguard: {
      id: 'vanguard',
      name: 'Vanguardia',
      ability: 'Embestida ígnea',
      cooldown: 10,
      color: '#ffab67',
      passive: 'La pasiva depende del huevo elegido.',
      description:
        'Habilidad: embiste en tu dirección de movimiento, golpeando y empujando a los enemigos que atraviesas. Recarga base: 10 s.',
    },
    hunter: {
      id: 'hunter',
      name: 'Cazador',
      ability: 'Caza en cadena',
      cooldown: 8,
      color: '#91dce7',
      passive: 'La pasiva depende del huevo elegido.',
      description:
        'Habilidad: dispara tres ataques rápidos más tus proyectiles adicionales a un enemigo cercano. El enemigo más cercano se marca automáticamente. Recarga base: 8 s.',
    },
    guardian: {
      id: 'guardian',
      name: 'Guardián',
      ability: 'Sello sagrado',
      cooldown: 16,
      color: '#ffe7a1',
      passive: 'La pasiva depende del huevo elegido.',
      description:
        'Habilidad: crea un sello de 5 m durante 5 s, que reduce el daño un 25 % y devuelve 3 proyectiles más tus proyectiles adicionales. Recarga base: 16 s.',
    },
    controller: {
      id: 'controller',
      name: 'Controlador',
      ability: 'Jardín de datos',
      cooldown: 14,
      color: '#a6e28b',
      passive: 'La pasiva depende del huevo elegido.',
      description:
        'Habilidad: planta un campo de 5 m cerca de un enemigo; ralentiza un 55 % (30 % a jefes) e inflige daño durante 6 s. Recarga base: 14 s.',
    },
    artillery: {
      id: 'artillery',
      name: 'Artillería',
      ability: 'Bombardeo orbital',
      cooldown: 14,
      color: '#e7c18c',
      passive: 'La pasiva depende del huevo elegido.',
      description:
        'Habilidad: señala hasta tres enemigos más tus proyectiles adicionales y bombardea sus posiciones tras 1 s. Recarga base: 14 s.',
    },
    tide: {
      id: 'tide',
      name: 'Marea',
      ability: 'Onda de choque',
      cooldown: 11,
      color: '#7edbf0',
      passive: 'La pasiva depende del huevo elegido.',
      description:
        'Habilidad: libera una ola de 7 m que daña, empuja y ralentiza a los enemigos durante 2,5 s. Recarga base: 11 s.',
    },
  };
  const types = {
    fire: {
      id: 'fire',
      name: 'Incendio',
      symbol: 'F',
      color: '#ff9456',
      rule: 'Evita los círculos de brasas antes de que estallen.',
    },
    flood: {
      id: 'flood',
      name: 'Inundación',
      symbol: 'A',
      color: '#5ed2f1',
      rule: 'El agua digital reduce tu velocidad un 15 %.',
    },
    glitch: {
      id: 'glitch',
      name: 'Fallo digital',
      symbol: 'D',
      color: '#dc8aff',
      rule: 'Los enemigos de esta zona se mueven un 18 % más rápido.',
    },
  };
  function styleFor(species, stage, family) {
    if (stage < 1) return null;
    if (/MetalGreymon|Machinedramon|MetalTyrannomon|Megadramon/i.test(species))
      return styles.artillery;
    if (/SkullGreymon/i.test(species)) return styles.controller;
    const key =
      {
        fire: 'vanguard',
        ice: 'hunter',
        beast: 'hunter',
        wind: 'hunter',
        holy: 'guardian',
        nature: 'controller',
        dark: 'controller',
        machine: 'artillery',
        water: 'tide',
      }[family] || 'vanguard';
    return styles[key];
  }
  function sectorIndex(x, z) {
    const c = Math.max(0, Math.min(2, Math.floor((x + SECTOR_SIZE * 1.5) / SECTOR_SIZE))),
      r = Math.max(0, Math.min(2, Math.floor((z + SECTOR_SIZE * 1.5) / SECTOR_SIZE)));
    return r * 3 + c;
  }
  const names = [
    'Noroeste',
    'Norte',
    'Noreste',
    'Oeste',
    'Centro',
    'Este',
    'Suroeste',
    'Sur',
    'Sureste',
  ];
  function sectors(seed, walkable) {
    return names.map((name, id) => {
      const x = -SECTOR_SIZE + (id % 3) * SECTOR_SIZE,
        z = -SECTOR_SIZE + Math.floor(id / 3) * SECTOR_SIZE;
      let anchor = { x, z };
      for (let i = 0; i < 120; i++) {
        const angle = i * 2.399963,
          r = Math.sqrt(i) * 1.6,
          xx = x + Math.cos(angle) * r,
          zz = z + Math.sin(angle) * r;
        if (walkable(xx, zz, seed, 1)) {
          anchor = { x: xx, z: zz };
          break;
        }
      }
      return { id, name, x, z, anchor, kind: null, clearedUntil: 0, revision: 0 };
    });
  }
  const api = {
    WORLD,
    SECTOR_SIZE,
    MAP_VERSION,
    OBJECTIVE_ZONES,
    styles,
    types,
    styleFor,
    sectorIndex,
    sectors,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkWorld = api;
})(typeof window !== 'undefined' ? window : globalThis);
