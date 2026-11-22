const dx = [0, 1, 0, -1],
  dy = [-1, 0, 1, 0];
const clamp = (n, max) => Math.max(0, Math.min(max, n));
function box(c, color, x, y, w, h) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function disc(c, color, x, y, r) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function label(c, text, x, y, size = 18) {
  c.textAlign = 'center';
  c.font = 'bold ' + size + 'px system-ui';
  c.fillStyle = '#e8fff8';
  c.fillText(text, x, y);
}
function sprite(c, name, x, y, size, t, pose = 'idle') {
  window.DigiSprites.drawGrounded(c, name, pose, x, y, size, t);
}
function makeWave(s, rng) {
  const cells = Array.from({ length: 25 }, (_, i) => i);
  for (let i = 0; i < 11; i++) {
    const j = i + Math.floor(rng() * (25 - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  s.danger = cells.slice(0, 10);
  // Place the bonus on a marked tile, leaving time to grab it and move away.
  s.bonus = s.danger.find((i) => i !== s.cell);
}
const rain = {
  title: 'Lluvia de datos',
  description:
    'Muévete con las flechas. Cada dos segundos cae una descarga sobre las casillas marcadas. Recoge los rombos y sal antes del impacto.',
  directions: true,
  init(rng) {
    const s = { cell: 12, wave: 0, dodged: 0, gems: 0 };
    makeWave(s, rng);
    return s;
  },
  input(s, i) {
    if (i < 0) return;
    s.cell = clamp((s.cell % 5) + dx[i], 4) + 5 * clamp(Math.floor(s.cell / 5) + dy[i], 4);
    if (s.cell === s.bonus) {
      s.gems++;
      s.bonus = -1;
    }
  },
  tick(s, t, rng) {
    while (t >= (s.wave + 1) * 2) {
      if (!s.danger.includes(s.cell)) s.dodged++;
      if (++s.wave === 10) return (0.75 * s.dodged) / 10 + (0.25 * s.gems) / 10;
      makeWave(s, rng);
    }
  },
  draw(c, s, t, name) {
    const beat = t % 2;
    for (let i = 0; i < 25; i++) {
      const x = 158 + (i % 5) * 45,
        y = 7 + Math.floor(i / 5) * 45,
        bad = s.danger.includes(i);
      box(c, bad ? (beat > 1.5 ? '#c7514c' : '#784746') : '#284e57', x, y, 43, 43);
      if (bad) label(c, '×', x + 21, y + 29);
      if (i === s.bonus) label(c, '◆', x + 21, y + 30, 27);
      if (i === s.cell) sprite(c, name, x + 22, y + 41, 38, t);
    }
    label(
      c,
      Math.ceil(20 - t) + ' s   ·   Esquivas ' + s.dodged + '   ·   Fragmentos ' + s.gems,
      270,
      257,
    );
  },
};
// Masks use N,E,S,W bits. The source enters from the left, the core exits right.
const rotate = (m) => ((m << 1) & 15) | (m >> 3);
function powered(s) {
  let at = 3,
    incoming = 3;
  const lit = [];
  while (at >= 0 && at < 9 && !lit.includes(at)) {
    const mask = s.tiles[at];
    if (!(mask & (1 << incoming))) break;
    lit.push(at);
    const out = [0, 1, 2, 3].find((i) => i !== incoming && mask & (1 << i));
    if (at === 5 && out === 1) return { lit, done: true };
    const x = (at % 3) + dx[out],
      y = Math.floor(at / 3) + dy[out];
    if (x < 0 || x > 2 || y < 0 || y > 2) break;
    at = y * 3 + x;
    incoming = (out + 2) % 4;
  }
  return { lit, done: false };
}
const circuit = {
  title: 'Circuito roto',
  description:
    'Conecta la fuente izquierda con el núcleo derecho. Selecciona un cable con las flechas y gíralo con Espacio. Puedes pensar sin límite de tiempo.',
  directions: true,
  action: 'Girar cable',
  init(rng) {
    const up = rng() < 0.5,
      route = up ? [3, 0, 1, 2, 5] : [3, 6, 7, 8, 5];
    const s = { tiles: Array(9).fill(0), cell: 3, turns: 0, min: 0 };
    route.forEach((at, j) => {
      const prev = route[j - 1],
        next = route[j + 1];
      const dir = (d) => [-3, 1, 3, -1].indexOf(d);
      const goal = (1 << (j ? dir(prev - at) : 3)) | (1 << (j === 4 ? 1 : dir(next - at)));
      let m = goal;
      const spins = j === 0 ? 1 : Math.floor(rng() * 4);
      for (let i = 0; i < spins; i++) m = rotate(m);
      s.tiles[at] = m;
      while (m !== goal) {
        m = rotate(m);
        s.min++;
      }
    });
    return s;
  },
  input(s, i) {
    if (i >= 0) {
      s.cell = clamp((s.cell % 3) + dx[i], 2) + 3 * clamp(Math.floor(s.cell / 3) + dy[i], 2);
      return;
    }
    if (!s.tiles[s.cell]) return;
    s.tiles[s.cell] = rotate(s.tiles[s.cell]);
    s.turns++;
    if (powered(s).done) return 0.5 + (0.5 * s.min) / s.turns;
  },
  draw(c, s) {
    const { lit } = powered(s);
    label(c, 'FUENTE →', 100, 124);
    label(c, '→ NÚCLEO', 441, 124);
    s.tiles.forEach((m, i) => {
      const x = 168 + (i % 3) * 68,
        y = 14 + Math.floor(i / 3) * 68;
      box(c, i === s.cell ? '#f6d274' : '#45636d', x, y, 64, 64);
      box(c, '#193840', x + 3, y + 3, 58, 58);
      for (let d = 0; d < 4; d++)
        if (m & (1 << d)) {
          c.strokeStyle = lit.includes(i) ? '#7df0c5' : '#a9c0ca';
          c.lineWidth = 7;
          c.beginPath();
          c.moveTo(x + 32, y + 32);
          c.lineTo(x + 32 + 32 * dx[d], y + 32 + 32 * dy[d]);
          c.stroke();
        }
    });
    label(c, 'Giros · ' + s.turns, 270, 252);
  },
};
function advanceEcho(s, hit, rng) {
  if (hit) s.hits++;
  if (++s.round === 5) return s.hits / 5;
  s.target = (s.target + 1 + Math.floor(rng() * 2)) % 3;
  s.start = s.now;
}
const echo = {
  title: 'Eco de Devimon',
  description:
    'Solo el Devimon real proyecta una sombra ovalada bajo los pies. Elige con 1, 2 o 3 antes de que ataque. Hay cinco rondas.',
  choices: ['1', '2', '3'],
  init(rng) {
    return { round: 0, hits: 0, target: Math.floor(rng() * 3), now: 0, start: 0 };
  },
  input(s, i, t, rng) {
    if (i < 0 || i > 2 || t - s.start < 0.3) return;
    s.now = t;
    return advanceEcho(s, i === s.target, rng);
  },
  tick(s, t, rng) {
    s.now = t;
    if (t - s.start >= 3) return advanceEcho(s, false, rng);
  },
  draw(c, s, t) {
    label(c, 'Ronda ' + (s.round + 1) + ' / 5', 270, 34);
    for (let i = 0; i < 3; i++) {
      const x = 105 + i * 165;
      box(c, '#587284', x - 64, 169, 128, 22);
      if (i === s.target) {
        c.fillStyle = '#182032';
        c.beginPath();
        c.ellipse(x, 179, 38, 9, 0, 0, 2 * Math.PI);
        c.fill();
      }
      sprite(c, 'Devimon', x, 175, 110, t, 'attack2');
      label(c, String(i + 1), x, 224);
    }
    box(c, '#efb57f', 65, 244, 410 * clamp(1 - (t - s.start) / 3, 1), 5);
  },
};
const orbit = {
  title: 'Órbita inestable',
  description:
    'Cambia de anillo con Espacio. Evita los bloques rojos y recoge los emblemas dorados durante tres vueltas. Un choque anula el siguiente emblema.',
  action: 'Cambiar de anillo',
  init(rng) {
    return {
      lane: 0,
      passed: 0,
      coins: 0,
      penalty: false,
      lanes: Array.from({ length: 24 }, () => Math.floor(rng() * 2)),
    };
  },
  input(s, i) {
    if (i === -1) s.lane = 1 - s.lane;
  },
  tick(s, t) {
    while (s.passed < 24 && t >= (s.passed + 1) * 0.85) {
      const n = s.passed++;
      if (n % 2 === 0) {
        if (s.lane === s.lanes[n]) s.penalty = true;
      } else {
        if (!s.penalty && s.lane === s.lanes[n]) s.coins++;
        s.penalty = false;
      }
      if (s.passed === 24) return s.coins / 12;
    }
  },
  draw(c, s, t, name) {
    const pos = (lane, angle) => [
      270 + Math.cos(angle) * (lane ? 142 : 94),
      131 + Math.sin(angle) * (lane ? 102 : 63),
    ];
    for (let l = 0; l < 2; l++) {
      c.strokeStyle = '#527781';
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(270, 131, l ? 142 : 94, l ? 102 : 63, 0, 0, Math.PI * 2);
      c.stroke();
    }
    for (let j = s.passed; j < Math.min(24, s.passed + 8); j++) {
      const [x, y] = pos(s.lanes[j], ((j + 1) * Math.PI) / 4);
      if (j % 2) disc(c, '#ffda64', x, y, 8);
      else box(c, '#ff776e', x - 8, y - 8, 16, 16);
    }
    const [x, y] = pos(s.lane, ((t / 0.85) * Math.PI) / 4);
    disc(c, '#90f4e1', x, y, 9);
    sprite(c, name, x, y, 30, t);
    label(c, 'Vuelta ' + (1 + Math.floor(s.passed / 8)) + ' / 3', 270, 129);
    label(c, s.penalty ? 'Penalización' : '◆ ' + s.coins, 270, 152, 15);
  },
};
export const challenges = { rain, circuit, echo, orbit };
