import { challenges } from './portal-challenges.js';
const games = {
  ...Object.fromEntries(
    Object.entries(challenges).map(([id, g]) => [id, [g.title, g.description]]),
  ),
  pulse: [
    'Pulso de precisión',
    'Detén el cursor con Espacio o con el botón. Apunta al centro de la franja en los cinco intentos.',
  ],
  maze: [
    'Laberinto de datos',
    'Lleva a tu Digimon hasta la salida verde con las flechas. El reloj empieza al pulsar Comenzar.',
  ],
  memory: [
    'Secuencia de sellos',
    'Observa las flechas iluminadas y repítelas en orden. Cada ronda añade una flecha.',
  ],
};
const arrows = ['↑', '→', '↓', '←'];
const maze = [
  '#############',
  '#.....#.....#',
  '###.#.#.###.#',
  '#...#...#...#',
  '#.#######.#.#',
  '#.........#.#',
  '#############',
];
const exits = { x: 11, y: 5 };
const cursor = (t) => 1 - Math.abs(((t.elapsed * (1.05 + t.round * 0.16)) % 2) - 1);
const width = (t) => 0.42 - t.round * 0.065;
const center = (t) => [0.54, 0.34, 0.68, 0.43, 0.61][t.round];
const memoryLength = (t) => 2 + t.round;
const replayTime = (t) => memoryLength(t) * 0.85;
export function trialRoom(getRun, save, resume) {
  const el = (id) => document.getElementById('trial-' + id);
  const dialog = el('room'),
    canvas = el('board'),
    ctx = canvas.getContext('2d');
  const action = el('action'),
    skip = el('skip'),
    directions = el('directions');
  let saveClock = 0;
  const state = () => getRun()?.s.trial;
  const kind = (t) => t.games[t.scores.length];
  dialog.oncancel = (e) => e.preventDefault();
  function finish(score) {
    getRun().scoreTrial(score);
    save();
    render();
  }
  const random = () => getRun().random();
  function playChallenge(i) {
    const t = state();
    const score = challenges[kind(t)].input(t.challenge, i, t.elapsed, random);
    if (score !== undefined) return finish(score);
    save();
    render();
  }
  function activate() {
    const t = state();
    if (!t) return;
    if (t.scores.length === 2) {
      delete getRun().s.trial;
      save();
      dialog.close();
      resume();
    } else if (!t.started) {
      if (challenges[kind(t)]) t.challenge = challenges[kind(t)].init(random);
      t.started = true;
      t.elapsed = 0;
      save();
      render();
    } else if (challenges[kind(t)]?.action) {
      playChallenge(-1);
    } else if (kind(t) === 'pulse') {
      const offset = Math.abs(cursor(t) - center(t)) / (width(t) / 2);
      const hit = offset <= 1 ? 1 - 0.75 * offset : 0;
      t.points = (t.points || 0) + hit;
      t.lastHit = Math.round(hit * 100);
      if (++t.round === 5) return finish(t.points / 5);
      t.elapsed = 0;
      save();
      render();
    }
  }
  function direction(i) {
    const t = state();
    if (!t?.started) return;
    if (challenges[kind(t)]) return playChallenge(i);
    if (kind(t) === 'memory' && t.elapsed >= replayTime(t)) {
      if (t.pattern[t.step] !== i) return finish((t.points || 0) / 14);
      t.points = (t.points || 0) + 1;
      if (++t.step === memoryLength(t)) {
        if (++t.round === 4) return finish(1);
        t.elapsed = 0;
        t.step = 0;
      }
    } else if (kind(t) === 'maze') {
      const x = t.x + [0, 1, 0, -1][i] * (t.mirror ? -1 : 1);
      const y = t.y + [-1, 0, 1, 0][i];
      if (maze[y]?.[x] !== '.') return;
      Object.assign(t, { x, y });
      if (x === exits.x && y === exits.y)
        return finish(Math.min(1, 0.25 + 9 / Math.max(1, t.elapsed)));
    } else return;
    save();
    render();
  }
  arrows.forEach((symbol, i) => {
    const b = document.createElement('button');
    b.textContent = symbol;
    b.onclick = () => direction(i);
    directions.append(b);
  });
  action.onclick = activate;
  skip.onclick = () => finish(0);
  dialog.addEventListener('keydown', (e) => {
    const i = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    if (kind(state()) === 'echo' && /^[123]$/.test(e.key)) {
      e.preventDefault();
      if (!e.repeat) direction(Number(e.key) - 1);
      return;
    }
    if (i >= 0 && !['maze', 'memory', 'circuit', 'rain'].includes(kind(state()))) return;
    if (i >= 0 || e.code === 'Space') {
      e.preventDefault();
      if (e.repeat && !(i >= 0 && ['rain', 'maze'].includes(kind(state())))) return;
      if (i >= 0) direction(i);
      else if (!action.hidden) activate();
    }
  });
  function render() {
    const t = state(),
      k = kind(t),
      done = !k;
    el('count').textContent = done
      ? 'PORTAL COMPLETADO'
      : 'PRUEBA ' + (1 + t.scores.length) + ' DE 2';
    el('title').textContent = done ? 'Resultado del portal' : games[k][0];
    el('description').textContent = done
      ? 'Dificultad de la isla: ×' +
        t.before.toLocaleString('es-ES', { maximumFractionDigits: 2 }) +
        ' → ×' +
        t.after.toLocaleString('es-ES', { maximumFractionDigits: 2 })
      : games[k][1];
    canvas.hidden = done || !t.started;
    const game = challenges[k];
    action.hidden = !!k && t.started && k !== 'pulse' && !game?.action;
    skip.hidden = done;
    directions.hidden =
      done || !t.started || k === 'pulse' || (game && !game.directions && !game.choices);
    Array.from(directions.children).forEach((b, i) => {
      b.hidden = !!game?.choices && i >= game.choices.length;
      b.textContent = game?.choices?.[i] || arrows[i];
    });
    action.textContent = done
      ? 'Volver a la isla'
      : t.started
        ? game?.action || 'Detener'
        : 'Comenzar';
    el('feedback').textContent = !t.started
      ? t.scores
          .map((s, i) => games[t.games[i]][0] + ' · ' + Math.round(100 * s) + ' %')
          .join('   /   ')
      : '';
    if (!canvas.hidden) draw(t, k);
    if (!dialog.contains(document.activeElement) || document.activeElement.hidden)
      (action.hidden ? directions.firstElementChild : action).focus();
  }
  function draw(t, k) {
    ctx.fillStyle = '#091e29';
    ctx.fillRect(0, 0, 540, 270);
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a4f2ce';
    if (challenges[k])
      return challenges[k].draw(ctx, t.challenge, t.elapsed, getRun().s.player.species);
    if (k === 'pulse') {
      ctx.fillText('Intento ' + (t.round + 1) + ' / 5', 270, 68);
      ctx.fillStyle = '#375161';
      ctx.fillRect(24, 117, 492, 32);
      ctx.fillStyle = '#61dda9';
      ctx.fillRect(24 + 492 * (center(t) - width(t) / 2), 117, 492 * width(t), 32);
      ctx.fillStyle = '#fff';
      ctx.fillRect(22 + 492 * center(t), 117, 4, 32);
      ctx.fillStyle = '#ffd176';
      ctx.fillRect(21 + 492 * cursor(t), 100, 6, 66);
      if (t.round) ctx.fillText('Último intento · ' + t.lastHit + ' %', 270, 215);
    } else if (k === 'maze') {
      const px = (x) => 75 + 30 * (t.mirror ? 12 - x : x);
      for (let y = 0; y < maze.length; y++)
        for (let x = 0; x < 13; x++) {
          ctx.fillStyle = maze[y][x] === '#' ? '#365367' : '#142e3c';
          ctx.fillRect(px(x), 12 + y * 30, 30, 30);
        }
      ctx.fillStyle = '#7ff4bd';
      ctx.fillRect(px(exits.x) + 4, 16 + exits.y * 30, 22, 22);
      ctx.fillStyle = '#ffca6b';
      ctx.beginPath();
      ctx.arc(px(t.x) + 15, 27 + t.y * 30, 10, 0, Math.PI * 2);
      ctx.fill();
      window.DigiSprites.drawGrounded(
        ctx,
        getRun().s.player.species,
        'idle',
        px(t.x) + 15,
        40 + t.y * 30,
        27,
        t.elapsed,
      );
      ctx.fillText(Math.floor(t.elapsed) + ' s', 270, 255);
    } else {
      const show = t.elapsed < replayTime(t),
        slot = Math.floor(t.elapsed / 0.85);
      ctx.fillText(show ? 'Observa' : 'Tu turno · ' + t.step + ' / ' + memoryLength(t), 270, 64);
      arrows.forEach((a, i) => {
        ctx.fillStyle =
          show && t.elapsed % 0.85 < 0.64 && i === t.pattern[slot] ? '#a6ffcc' : '#385463';
        ctx.fillRect(62 + i * 108, 102, 88, 76);
        ctx.fillStyle = '#081b24';
        ctx.font = 'bold 42px system-ui';
        ctx.fillText(a, 106 + i * 108, 155);
      });
    }
  }
  return {
    frame(dt) {
      const t = state();
      if (!dialog.open) {
        dialog.showModal();
        render();
      }
      if (t.started) {
        t.elapsed += dt;
        const score = challenges[kind(t)]?.tick?.(t.challenge, t.elapsed, random);
        if (score !== undefined) finish(score);
        else draw(t, kind(t));
      }
      saveClock += dt;
      if (saveClock >= 3) {
        saveClock = 0;
        save();
      }
    },
  };
}
