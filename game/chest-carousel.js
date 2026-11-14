export class ChestCarousel {
  constructor(host) {
    this.host = host;
    this.key = '';
    this.animation = null;
  }
  clear() {
    this.animation?.cancel();
    cancelAnimationFrame(this.wheelFrame);
    this.animation = null;
    this.key = '';
    this.host.replaceChildren();
  }
  rewardArt(card, portraits) {
    const art = document.createElement('div');
    art.className = 'reward-art quality-' + (card.quality || 0);
    if (card.species) {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 140;
      art.append(canvas);
      portraits.push({ canvas, species: card.species });
    } else {
      const icon = document.createElement('img');
      icon.src = card.iconPath || 'assets/loot/empty.png';
      icon.alt = '';
      icon.className = 'reward-icon';
      art.append(icon);
    }
    const frameName = [null, 'common', 'rare', 'epic', 'legendary'][card.quality];
    if (frameName && card.type !== 'stat') {
      const frame = document.createElement('img');
      frame.src = 'assets/rarity-frames/' + frameName + '.png';
      frame.alt = '';
      frame.className = 'reward-frame';
      art.append(frame);
    }
    return art;
  }
  show(choice, callbacks, portraits) {
    const roll = choice.roll,
      key = roll.id + ':' + roll.revision + ':' + roll.phase;
    if (key === this.key) return;
    this.clear();
    this.key = key;
    const chance = roll.riskChance ?? DigibonkChest.riskSuccess,
      success = Math.round(chance * 100),
      failure = 100 - success;
    const winner = choice.cards[0] || roll.pool.find((c) => c.type === 'empty'),
      spinning = roll.phase === 'spinning';
    if (roll.precision && spinning) {
      const wrap = document.createElement('div');
      wrap.className = 'precision-wheel-wrap';
      const wheel = document.createElement('div');
      wheel.className = 'precision-wheel';
      const colors = ['', '#8ed238', '#15e3ef', '#d332ed', '#ff9e18'];
      let total = 0;
      wheel.style.background =
        'conic-gradient(' +
        roll.odds
          .map((o) => {
            const start = total;
            total += o.chance * 100;
            return colors[o.quality] + ' ' + start + '% ' + total + '%';
          })
          .join(',') +
        ')';
      const pointer = document.createElement('div');
      pointer.className = 'wheel-pointer';
      pointer.textContent = '▼';
      wrap.append(wheel, pointer);
      this.host.append(wrap);
      const legend = document.createElement('p');
      legend.textContent = roll.odds
        .map(
          (o) => DigibonkChest.qualities[o.quality].name + ' ' + Math.round(o.chance * 100) + '%',
        )
        .join(' · ');
      this.host.append(legend);
      const stop = document.createElement('button');
      stop.className = 'primary';
      stop.textContent = 'Detener';
      this.host.append(stop);
      const started = performance.now();
      let rotation = 0;
      const frame = (now) => {
        if (this.key !== key) return;
        rotation = (((now - started) / 1000) * roll.wheelSpeed) % 1;
        wheel.style.transform = 'rotate(' + rotation * 360 + 'deg)';
        this.wheelFrame = requestAnimationFrame(frame);
      };
      this.wheelFrame = requestAnimationFrame(frame);
      stop.onclick = () => {
        stop.disabled = true;
        cancelAnimationFrame(this.wheelFrame);
        callbacks.stop(roll.id + ':' + roll.revision, (1 - rotation) % 1);
      };
      return;
    }
    const viewport = document.createElement('div'),
      track = document.createElement('div');
    viewport.className = 'chest-window';
    track.className = 'chest-track';
    track.setAttribute('aria-hidden', 'true');
    viewport.append(track);
    this.host.append(viewport);
    let seed = 0;
    for (const ch of roll.id + roll.revision) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      },
      pick = () => {
        if (roll.riskUsed && random() >= chance) return roll.pool.find((c) => c.type === 'empty');
        const pool = roll.pool.filter((c) => c.quality > 0),
          qualities = [1, 2, 3, 4].filter((q) => pool.some((c) => c.quality === q)),
          weight = (q) =>
            (!roll.riskUsed ? roll.odds?.find((o) => o.quality === q)?.chance : null) ??
            DigibonkChest.qualities[q].weight,
          total = qualities.reduce((n, q) => n + weight(q), 0);
        let value = random() * total,
          quality = qualities.at(-1);
        for (const q of qualities) {
          value -= weight(q);
          if (value < 0) {
            quality = q;
            break;
          }
        }
        const eligible = pool.filter((c) => c.quality === quality);
        return eligible[Math.floor(random() * eligible.length)];
      };
    let target;
    for (let i = 0; i < 38; i++) {
      const card = i === 32 ? winner : pick(),
        tile = document.createElement('article');
      tile.className = 'chest-tile quality-' + (card.quality || 0);
      if (card.type === 'stat') tile.classList.add('stat-card');
      tile.append(this.rewardArt(card, portraits));
      const name = document.createElement('strong'),
        quality = document.createElement('small');
      name.textContent = card.title;
      quality.textContent = card.rarity;
      tile.append(name, quality);
      track.append(tile);
      if (i === 32) target = tile;
    }
    const status = document.createElement('div');
    status.className = 'chest-result';
    if (!spinning && winner.type === 'stat')
      status.classList.add('stat-card', 'quality-' + winner.quality);
    status.setAttribute('aria-live', 'polite');
    const heading = document.createElement('h3'),
      description = document.createElement('p');
    heading.textContent = spinning
      ? roll.source === 'shop'
        ? 'Revelando calidad…'
        : 'Descifrando cofre…'
      : winner.title;
    description.textContent = spinning
      ? 'El tiempo está detenido.'
      : winner.text || 'Has perdido la recompensa al intentar mejorarla.';
    if (!spinning && winner.quality > 0) {
      const art = this.rewardArt(winner, portraits);
      art.classList.add('reward-revealed');
      status.append(art);
    }
    status.append(heading, description);
    this.host.append(status);
    const odds = document.createElement('p');
    odds.className = 'chest-odds';
    odds.textContent = roll.riskUsed
      ? 'Intento de mejora: ' + success + ' % recompensa superior · ' + failure + ' % cofre vacío'
      : roll.odds
          .map(
            (o) =>
              DigibonkChest.qualities[o.quality].name + ' ' + Math.round(o.chance * 100) + ' %',
          )
          .join(' · ');
    this.host.append(odds);
    const buttons = document.createElement('div');
    buttons.className = 'chest-actions';
    this.host.append(buttons);
    const button = (text, fn, primary = false) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.disabled = spinning;
      b.onclick = fn;
      if (primary) b.className = 'primary';
      buttons.append(b);
    };
    if (!spinning && callbacks.canRisk())
      button('Arriesgar · ' + success + ' % mejorar / ' + failure + ' % perder', callbacks.risk);
    if (choice.cards.length) button('1 · Quedármelo', () => callbacks.claim(winner.id), true);
    button(choice.cards.length ? 'Cerrar sin recoger' : 'Continuar', callbacks.discard);
    if (!spinning && (winner.quality === 4 || (winner.quality === 3 && roll.source === 'shop'))) {
      const note = document.createElement('p');
      note.className = 'chest-warning';
      note.textContent = (winner.quality === 4 ? 'Legendario' : 'Épico') + ' · calidad máxima';
      this.host.append(note);
    }
    const center = () => viewport.clientWidth / 2 - target.offsetLeft - target.offsetWidth / 2;
    requestAnimationFrame(() => {
      if (this.key !== key) return;
      const end = center();
      if (!spinning) {
        track.style.transform = 'translateX(' + end + 'px)';
        return;
      }
      this.animation = track.animate(
        [{ transform: 'translateX(0px)' }, { transform: 'translateX(' + end + 'px)' }],
        {
          duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 3600,
          easing: 'cubic-bezier(.12,.72,.12,1)',
          fill: 'forwards',
        },
      );
      this.animation.finished
        .then(() => {
          if (this.key === key) callbacks.reveal(roll.id + ':' + roll.revision);
        })
        .catch(() => {});
    });
  }
}
