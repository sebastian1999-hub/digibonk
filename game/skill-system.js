(function (root) {
  'use strict';
  const STATUS_RULES =
    typeof module !== 'undefined' && module.exports
      ? require('./status-rules.js')
      : root.DigibonkStatusRules;
  const list = [
    ['bubble', 'Burbujas', 'neutral', 'damage', -1, 6, 180, 4, 0.65, '#c9e5d6'],
    ['fireball', 'Llama pimienta', 'fire', 'damage', 1, 12, 260, 5, 1.05, '#f1a15e'],
    ['mega-flame', 'Mega llama', 'fire', 'damage', 2, 23, 300, 7, 1.65, '#ef844c'],
    ['inferno', 'Infierno', 'fire', 'damage', 3, 32, 340, 10, 2.05, '#df6b49'],
    ['blue-fire', 'Fuego azul', 'ice', 'damage', 1, 12, 260, 5, 1.05, '#8bcfdf'],
    ['ice-breath', 'Aliento helado', 'ice', 'damage', 2, 22, 310, 7, 1.6, '#b1dfe7'],
    ['air-shot', 'Disparo de aire', 'wind', 'damage', 1, 10, 280, 4.5, 1, '#e3e8b2'],
    ['cyclone', 'Ciclón', 'wind', 'damage', 2, 22, 320, 7, 1.55, '#dce3be'],
    ['water-jet', 'Chorro de agua', 'water', 'damage', 1, 11, 280, 5, 1.1, '#80c8d7'],
    ['tidal-wave', 'Marea digital', 'water', 'damage', 3, 28, 340, 9, 1.9, '#6fb3d3'],
    ['leaf-blade', 'Hoja cortante', 'nature', 'damage', 1, 10, 260, 4.5, 1.05, '#a3cf85'],
    ['spore-burst', 'Esporas', 'nature', 'damage', 2, 20, 280, 7, 1.55, '#c8b58b'],
    ['holy-ray', 'Rayo sagrado', 'holy', 'damage', 2, 24, 320, 7.5, 1.7, '#f2dfa0'],
    ['heaven-light', 'Luz celestial', 'holy', 'damage', 3, 32, 350, 10, 2.1, '#fff0bd'],
    ['dark-pulse', 'Pulso oscuro', 'dark', 'damage', 1, 14, 270, 5.5, 1.2, '#b59acb'],
    ['nightmare', 'Pesadilla', 'dark', 'damage', 3, 28, 330, 9, 1.95, '#9676ae'],
    ['energy-bolt', 'Descarga', 'machine', 'damage', 1, 14, 280, 5.5, 1.2, '#b3d8ad'],
    ['mega-laser', 'Mega láser', 'machine', 'damage', 3, 32, 350, 9, 2.1, '#e5bd79'],
    ['claw', 'Garra feroz', 'beast', 'damage', 1, 8, 85, 4, 1.2, '#e1c597'],
    ['fang-rush', 'Colmillo veloz', 'beast', 'damage', 2, 16, 85, 6, 1.75, '#ead5ac'],
    ['terra-force', 'Fuerza Terra', 'fire', 'damage', 4, 45, 380, 12, 2.65, '#ffb54d'],
    ['giga-destroyer', 'Destructor Giga', 'machine', 'damage', 3, 35, 360, 10, 2.25, '#ffc179'],
    ['cocytus-breath', 'Aliento Cocytus', 'ice', 'damage', 4, 42, 370, 11, 2.5, '#a0edff'],
    ['harpoon-torpedo', 'Torpedo arpón', 'water', 'damage', 2, 23, 310, 7, 1.6, '#77daef'],
    ['heavens-knuckle', 'Puño del cielo', 'holy', 'damage', 2, 24, 290, 7, 1.65, '#ffe8a0'],
    ['celestial-arrow', 'Flecha celestial', 'holy', 'damage', 3, 34, 360, 9, 2.1, '#fff0ad'],
    ['seven-heavens', 'Siete cielos', 'holy', 'damage', 4, 45, 380, 12, 2.7, '#fff4c6'],
    ['electro-shocker', 'Electrochoque', 'nature', 'damage', 2, 23, 300, 7, 1.6, '#a6efff'],
    ['flower-cannon', 'Cañón floral', 'nature', 'damage', 3, 33, 340, 9, 2.05, '#f09cd0'],
    ['death-claw', 'Garra de la muerte', 'dark', 'damage', 2, 21, 85, 6, 1.65, '#c58af1'],
    ['night-raid', 'Onda de oscuridad', 'dark', 'damage', 3, 32, 340, 9, 2.05, '#b87fe3'],
    ['shadow-wing', 'Alas de sombra', 'wind', 'damage', 3, 32, 350, 9, 2.05, '#ffcb82'],
    ['fist-beast-king', 'Puño del rey bestia', 'beast', 'damage', 2, 23, 290, 7, 1.65, '#f6ca79'],
    ['royal-saber', 'Sable real', 'holy', 'damage', 4, 43, 380, 11, 2.65, '#fff2bc'],
    ['heal', 'Pulso vital', 'any', 'heal', 1, 18, 500, 9, 0.24, '#b3e3a0'],
    ['guard', 'Escudo digital', 'any', 'shield', 0, 14, 500, 9, 0.5, '#a4d5ca'],
    ['rally', 'Grito de guerra', 'any', 'buff', 2, 18, 500, 11, 0.25, '#e6c686'],
    ['focus', 'Concentración', 'any', 'restore', 1, 4, 500, 13, 25, '#a6c6e1'],
    ['haste', 'Impulso veloz', 'any', 'haste', 2, 14, 500, 10, 0.25, '#c9e1c5'],
    ['great-heal', 'Luz reparadora', 'holy', 'heal', 3, 28, 500, 11, 0.4, '#dceebd'],
  ];
  const skills = Object.fromEntries(
    list.map(([id, name, family, kind, stage, cost, range, cooldown, power, color]) => [
      id,
      {
        id,
        name,
        family,
        kind,
        stage,
        cost,
        range,
        cooldown,
        power,
        color,
        mode: range <= 90 ? 'melee' : 'ranged',
        cast: kind === 'damage' ? 0.55 : 0.8,
      },
    ]),
  );
  const signatureIds = {
    Agumon: 'fireball',
    Greymon: 'mega-flame',
    MetalGreymon: 'giga-destroyer',
    'MetalGreymon (Virus)': 'giga-destroyer',
    WarGreymon: 'terra-force',
    BlackWarGreymon: 'terra-force',
    Gabumon: 'blue-fire',
    Garurumon: 'ice-breath',
    MetalGarurumon: 'cocytus-breath',
    'MetalGarurumon (Black)': 'cocytus-breath',
    Angemon: 'heavens-knuckle',
    Angewomon: 'celestial-arrow',
    Gallantmon: 'royal-saber',
    Ikkakumon: 'harpoon-torpedo',
    Kabuterimon: 'electro-shocker',
    Tentomon: 'energy-bolt',
    Lillymon: 'flower-cannon',
    Devimon: 'death-claw',
    LadyDevimon: 'night-raid',
    Garudamon: 'shadow-wing',
    Leomon: 'fist-beast-king',
    Seraphimon: 'seven-heavens',
    Omnimon: 'royal-saber',
    Beelzemon: 'nightmare',
    Myotismon: 'night-raid',
    VenomMyotismon: 'nightmare',
    Dorumon: 'energy-bolt',
    Dorugamon: 'claw',
    DoruGreymon: 'giga-destroyer',
    Dorugoramon: 'mega-laser',
    Impmon: 'dark-pulse',
    Taomon: 'flower-cannon',
    Sakuyamon: 'flower-cannon',
  };
  const styles = {
    bubble: 'bubble',
    fireball: 'flame',
    'mega-flame': 'flame',
    inferno: 'inferno',
    'terra-force': 'sun',
    'blue-fire': 'blue-flame',
    'ice-breath': 'ice',
    'cocytus-breath': 'frost',
    'air-shot': 'air',
    cyclone: 'tornado',
    'shadow-wing': 'phoenix',
    'water-jet': 'jet',
    'tidal-wave': 'wave',
    'harpoon-torpedo': 'torpedo',
    'leaf-blade': 'leaf',
    'spore-burst': 'spores',
    'electro-shocker': 'lightning',
    'flower-cannon': 'flower',
    'holy-ray': 'holy-beam',
    'heaven-light': 'holy-beam',
    'royal-saber': 'holy-beam',
    'heavens-knuckle': 'holy-fist',
    'celestial-arrow': 'arrow',
    'seven-heavens': 'stars',
    'dark-pulse': 'dark-orb',
    nightmare: 'dark-orb',
    'night-raid': 'bats',
    'death-claw': 'dark-claw',
    'energy-bolt': 'lightning',
    'mega-laser': 'laser',
    'giga-destroyer': 'missile',
    claw: 'claw',
    'fang-rush': 'claw',
    'fist-beast-king': 'beast-fist',
  };
  const nextOrder = [
    ['heat-breath', 'Aliento abrasador', 'fire', 1, 1.15, 5, 'cone', 'breath-cone'],
    ['fire-tower', 'Torre de fuego', 'fire', 2, 1.85, 7, 'pillar', 'fire-pillar'],
    ['magma-bomb', 'Bomba de magma', 'fire', 3, 2.45, 10, 'meteor', 'magma-fall'],
    ['waterfall', 'Cascada', 'water', 2, 1.75, 7, 'pillar', 'waterfall'],
    ['heavy-rain', 'Lluvia torrencial', 'water', 3, 1.95, 9, 'rain', 'rainfall'],
    ['ice-statue', 'Estatua de hielo', 'ice', 2, 1.8, 7, 'pillar', 'ice-statue', 'slow'],
    ['aurora-freeze', 'Congelación aurora', 'ice', 4, 2.55, 11, 'ring', 'aurora', 'slow'],
    ['wind-cutter', 'Cuchilla de viento', 'wind', 1, 1.15, 5, 'volley', 'wind-cutter'],
    ['electric-cloud', 'Nube eléctrica', 'wind', 2, 1.8, 7, 'pillar', 'thunder-cloud'],
    ['hurricane', 'Huracán', 'wind', 4, 2.4, 10, 'ring', 'hurricane'],
    ['poison-powder', 'Polvo venenoso', 'nature', 1, 1.0, 6, 'rain', 'poison-cloud', 'poison'],
    ['root-bind', 'Raíces cautivas', 'nature', 2, 1.65, 7, 'pillar', 'root-cage', 'slow'],
    ['thorn-whip', 'Látigo de espinas', 'nature', 3, 1.65, 8, 'chain', 'thorn-chain'],
    ['dark-spirit', 'Espíritu oscuro', 'dark', 1, 1.15, 5, 'volley', 'soul-chaser'],
    ['black-hole', 'Agujero negro', 'dark', 3, 2.1, 9, 'pillar', 'black-hole', 'slow'],
    ['soul-chaser', 'Lluvia de almas', 'dark', 4, 2.45, 11, 'rain', 'soul-rain'],
    ['saint-ray', 'Rayo santo', 'holy', 1, 1.2, 5, 'volley', 'saint-ray'],
    ['holy-breath', 'Aliento sagrado', 'holy', 2, 1.75, 7, 'cone', 'holy-breath'],
    ['judgement', 'Juicio celestial', 'holy', 4, 2.65, 12, 'pillar', 'judgement'],
    ['laser-barrage', 'Batería láser', 'machine', 2, 1.45, 7, 'volley', 'laser-barrage'],
    ['megaton-hammer', 'Martillo megatón', 'machine', 3, 2.2, 9, 'pillar', 'metal-impact'],
    ['dg-dimension', 'Dimensión digital', 'machine', 4, 2.5, 11, 'ring', 'digital-grid'],
    ['sonic-jab', 'Puño sónico', 'beast', 1, 1.3, 5, 'cone', 'sonic-fist'],
    ['earthquake', 'Terremoto', 'beast', 3, 2.05, 9, 'ring', 'earthquake'],
  ];
  for (const [id, name, family, stage, power, cooldown, pattern, visual, status] of nextOrder) {
    const color = {
      fire: '#ff9c3b',
      water: '#74dbff',
      ice: '#b6f6ff',
      wind: '#b6ffdd',
      nature: '#a8e969',
      dark: '#bc7bff',
      holy: '#fff2b5',
      machine: '#f8b5f3',
      beast: '#edc09a',
    }[family];
    skills[id] = {
      id,
      name,
      family,
      stage,
      power,
      cooldown,
      pattern,
      visual,
      status,
      kind: 'damage',
      cost: 20 + stage * 5,
      range: pattern === 'cone' ? 165 : pattern === 'ring' ? 180 : 340,
      color,
      mode: 'ranged',
      cast: 0.55,
      nextOrder: true,
    };
  }
  const familyNames = {
    fire: 'Fuego',
    water: 'Agua',
    ice: 'Hielo',
    wind: 'Aire',
    nature: 'Naturaleza',
    dark: 'Oscuridad',
    holy: 'Sagrado',
    machine: 'Máquina',
    beast: 'Combate',
    neutral: 'Neutral',
    any: 'Apoyo',
  };
  const patternNames = {
    cone: 'Cono frontal que alcanza a todos los enemigos delante de ti.',
    pillar: 'Impacto de área bajo el objetivo más cercano tras 0,4 s.',
    meteor: 'Meteorito que cae sobre el objetivo tras 0,4 s.',
    rain: 'Lluvia de área sobre el objetivo tras 0,4 s.',
    ring: 'Golpea a todos los enemigos alrededor del personaje.',
    chain: 'Encadena hasta 3 objetivos cercanos.',
    volley:
      'Lanza hasta 3 proyectiles a objetivos diferentes; la cantidad de proyectiles amplía la ráfaga.',
  };
  for (const skill of Object.values(skills))
    skill.visual = styles[skill.id] || skill.visual || 'support';
  function pose(id) {
    const skill = skills[id];
    if (skill?.kind !== 'damage') return 'guard';
    if (skill.mode === 'melee') return 'attack';
    if (
      ['sun', 'stars', 'holy-beam', 'dark-orb', 'bats', 'spores', 'flower'].includes(skill.visual)
    )
      return 'attack4';
    if (['flame', 'blue-flame', 'inferno', 'ice', 'frost', 'wave', 'jet'].includes(skill.visual))
      return 'attack3';
    return 'attack2';
  }
  function signature(p) {
    const special = skills[signatureIds[p.species]];
    if (special && p.stage >= special.stage) return special;
    return (
      available(p)
        .filter((s) => s.kind === 'damage' && s.family === family(p.species))
        .sort((a, b) => b.stage - a.stage || b.power - a.power)[0] || skills.bubble
    );
  }
  function family(species) {
    const n = String(species);
    if (n === 'Omnimon') return 'holy';
    if (['Dorumon', 'Dorugamon', 'Dorugoramon'].includes(n)) return 'machine';
    if (n === 'Impmon') return 'dark';
    if (
      /Greymon|Agumon|Koromon|Tyranno|Meramon|Coronamon|Apollomon|Growlmon|Guilmon|Flare|Flame|Lynxmon|Dracomon|Coredra|Slayerdra|Breakdra/i.test(
        n,
      )
    )
      return 'fire';
    if (/Garuru|Gabumon|Tsunomon|Frigimon|Snow|Icemon|Hyoga|Mammoth|Dianamon|Lunamon/i.test(n))
      return 'ice';
    if (/Angemon|Angewomon|Salamon|Gatomon|Seraphi|Cherubi|Holy|Lucemon|Gallant|Ophani/i.test(n))
      return 'holy';
    if (
      /Patamon|Biyomon|Bird|Falco|Crowmon|Ravemon|Peckmon|Phoenix|Airdra|Kokatori|Saberdram|Parrot/i.test(
        n,
      )
    )
      return 'wind';
    if (
      /Seadra|Gomamon|Bukamon|Ikkaku|Zudo|Vike|Dolph|Whamon|Plesio|Otama|Geko|Gesomon|Octomon|Pichimon|Pukumon|Shellmon|Syakomon/i.test(
        n,
      )
    )
      return 'water';
    if (
      /Palmon|Tanemon|Toge|Lilly|Lila|Rose|Renamon|Kyubi|Taomon|Sakuya|Wood|Cherrymon|Flora|Vegi|Mush|Kabu|Kuwa|Tentomon|Kunemon|Wormmon|Stingmon|Butter|Flymon|Piximon/i.test(
        n,
      )
    )
      return 'nature';
    if (
      /Devimon|DemiDevi|Vamp|Myotis|Skull|Daemon|Piedmon|Phanto|Bakemon|Dark|Black|Belphe|Beelze|DemiMera|Pagumon|Tsukaimon/i.test(
        n,
      )
    )
      return 'dark';
    if (
      /Machine|Metal|Andro|Haguru|Guardro|Clock|Mamemon|Tank|MegaDra|Gigadra|Giromon|Datamon|Cannon|Gold|Gotsu|Golemon|Anky|Kame|Torto/i.test(
        n,
      )
    )
      return 'machine';
    if (
      /Leomon|Gaomon|Gaoga|Goburi|Ogremon|Grizz|Veemon|ExVee|Dino|Monzae|Nume|Suka|Rare|Geremon|Tapir|Unimon|Centaru|Apemon|Etemon|Psychemon/i.test(
        n,
      )
    )
      return 'beast';
    return 'neutral';
  }
  function compatible(p, skill) {
    return (
      !!skill &&
      !p.isEgg &&
      p.stage >= skill.stage &&
      (skill.family === 'any' ||
        skill.family === 'neutral' ||
        skill.family === family(p.species) ||
        signatureIds[p.species] === skill.id)
    );
  }
  function available(p) {
    return Object.values(skills).filter((s) => compatible(p, s));
  }
  function learn(p, id) {
    if (!compatible(p, skills[id]) || p.learnedSkills.includes(id)) return null;
    p.learnedSkills.push(id);
    if (p.equippedSkills.length < 2) p.equippedSkills.push(id);
    return skills[id];
  }
  function sync(p) {
    p.learnedSkills ??= [];
    p.equippedSkills ??= [];
    p.skillResearch ??= {};
    p.battlesCompleted ??= 0;
    if (p.isEgg) {
      p.equippedSkills = [];
      return [];
    }
    p.learnedSkills = p.learnedSkills.filter((id) => skills[id]);
    p.equippedSkills = [...new Set(p.equippedSkills)]
      .filter((id) => p.learnedSkills.includes(id) && compatible(p, skills[id]))
      .slice(0, 2);
    const learned = [];
    if (p.skillSpecies !== p.species) {
      p.skillSpecies = p.species;
      const moveSignature = signature(p);
      for (const id of [moveSignature.id, ...(p.stage >= 0 ? ['guard'] : [])]) {
        const move = learn(p, id);
        if (move) learned.push(move);
      }
    }
    return learned;
  }
  function equip(p, slot, id) {
    sync(p);
    if (
      p.isEgg ||
      ![0, 1].includes(slot) ||
      (id && (!p.learnedSkills.includes(id) || !compatible(p, skills[id])))
    )
      return false;
    const next = [p.equippedSkills[0] || '', p.equippedSkills[1] || ''];
    if (id && next[1 - slot] === id) return false;
    next[slot] = id;
    p.equippedSkills = next.filter(Boolean);
    return true;
  }
  function equipped(p) {
    sync(p);
    return p.equippedSkills.map((id) => skills[id]).filter(Boolean);
  }
  function afterBattle(p, observed = []) {
    sync(p);
    p.battlesCompleted++;
    const news = [];
    for (const id of new Set(observed)) {
      if (p.learnedSkills.includes(id) || !compatible(p, skills[id])) continue;
      p.skillResearch[id] = (p.skillResearch[id] || 0) + 1;
      if (p.skillResearch[id] >= 2) {
        const move = learn(p, id);
        if (move) news.push(move);
      }
    }
    if (p.battlesCompleted % 3 === 0) {
      const move = available(p).find((s) => !p.learnedSkills.includes(s.id));
      if (move) {
        const learned = learn(p, move.id);
        if (learned) news.push(learned);
      }
    }
    return news;
  }
  function learnTechnique(p, id) {
    sync(p);
    return learn(p, id);
  }
  const api = {
    skills,
    statusText: STATUS_RULES.describe,
    nextOrder,
    familyNames,
    patternNames,
    pose,
    signature,
    signatureIds,
    family,
    compatible,
    available,
    sync,
    equip,
    equipped,
    afterBattle,
    learnTechnique,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SkillSystem = api;
})(typeof window !== 'undefined' ? window : globalThis);
