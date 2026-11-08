const stages = ['Bebé I', 'Bebé II', 'Rookie', 'Champion', 'Ultimate', 'Mega'];
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  node.className = cls;
  if (text) node.textContent = text;
  return node;
};

export function renderIncubatorMenu(host, ctx) {
  const {
    C,
    meta,
    P,
    mode,
    selected,
    confirmed,
    stage,
    select,
    open,
    chooseStage,
    saveLine,
    buy,
    play,
  } = ctx;
  const eggs = [],
    portraits = [];
  host.className = 'digital-menu ' + (mode === 'play' ? 'egg-selection' : 'egg-incubation');
  const sprite = (id, cls = '') => {
    const canvas = el('canvas', cls);
    canvas.width = 96;
    canvas.height = 88;
    canvas.setAttribute('aria-hidden', 'true');
    portraits.push({ canvas, species: id });
    return canvas;
  };
  if (mode === 'play') {
    const pods = el('div', 'pod-grid');
    for (const egg of C.eggChoices) {
      const owned = !!meta.eggs[egg.id];
      const pod = el(
        'button',
        'digital-pod' +
          (confirmed && selected === egg.id ? ' selected' : '') +
          (!owned ? ' locked' : ''),
      );
      pod.setAttribute('aria-label', egg.id + (owned ? ' · Disponible' : ' · Bloqueado'));
      pod.setAttribute('aria-pressed', confirmed && selected === egg.id);
      const canvas = el('canvas', 'pod-egg');
      canvas.width = 120;
      canvas.height = 100;
      eggs.push({ canvas, egg });
      pod.append(
        canvas,
        el('b', 'pod-name', egg.id),
        el('small', 'pod-lock', owned ? '' : 'Bloqueado'),
      );
      const tooltip = el('span', 'pod-preview');
      tooltip.setAttribute('role', 'tooltip');
      tooltip.id = 'egg-preview-' + egg.id;
      pod.setAttribute('aria-describedby', tooltip.id);
      const line = C.evolutionLine(egg.id, meta.eggs[egg.id] || {}, meta.lines?.[egg.id]);
      for (const id of [egg.id, ...line]) {
        const tile = el('span', 'preview-species');
        tile.append(sprite(id), el('span', '', id));
        tooltip.append(tile);
      }
      pod.append(tooltip);
      pod.onclick = () => select(egg.id);
      pods.append(pod);
    }
    host.append(pods);
    const actions = el('div', 'pod-actions');
    actions.hidden = !confirmed;
    for (const [id, label, action] of [
      ['incubate', 'Incubar', () => open('incubator')],
      ['play', 'Jugar', () => play(selected)],
    ]) {
      const button = el('button', 'art-action ' + id);
      button.setAttribute('aria-label', label + ' · ' + selected);
      button.append(el('span', '', label));
      button.disabled = id === 'play' && !meta.eggs[selected];
      button.onclick = action;
      actions.append(button);
    }
    host.append(actions);
  } else {
    const training = meta.eggs[selected],
      line = C.evolutionLine(selected, training || {}, meta.lines?.[selected]);
    const all = [selected, ...line],
      current = Math.max(0, Math.min(5, stage));
    const name = all[current];
    host.append(el('h3', 'incubator-title', selected), el('h4', 'incubator-species', name));
    const track = el('div', 'incubator-stages');
    all.forEach((id, index) => {
      const button = el('button', 'incubator-stage' + (index === current ? ' selected' : ''));
      button.setAttribute('aria-label', stages[index] + ': ' + id);
      button.setAttribute('aria-pressed', current === index);
      const label = el('span', '');
      label.append(el('small', '', stages[index]), el('b', '', id));
      button.append(sprite(id), label);
      button.onclick = () => chooseStage(index);
      track.append(button);
    });
    host.append(track, sprite(name, 'incubator-portrait'));
    const options = current && training ? C.evolutionOptions(all[current - 1], training) : [name];
    for (const direction of [-1, 1]) {
      const button = el('button', 'incubator-arrow ' + (direction < 0 ? 'previous' : 'next'));
      button.setAttribute('aria-label', direction < 0 ? 'Digimon anterior' : 'Digimon siguiente');
      button.disabled = options.length < 2;
      button.onclick = () => {
        const next = options[(options.indexOf(name) + direction + options.length) % options.length];
        saveLine([...line.slice(0, current - 1), next]);
      };
      host.append(button);
    }
    const upgrades = el('div', 'incubator-upgrades');
    for (const [stat, def] of Object.entries(P.stats)) {
      const n = training?.[stat] || 0,
        cost = training ? P.cost(training, stat) : 0;
      const button = el('button', 'incubator-upgrade');
      button.append(
        el('b', '', def.name),
        el(
          'span',
          '',
          `${n}/10 · +${Math.round(n * def.step * (stat === 'maxHp' ? 1 : 100))}${stat === 'maxHp' ? ' vida' : '%'}`,
        ),
        el('small', '', !training ? 'Desbloquea el huevo' : n >= 10 ? 'Máximo' : cost + ' bits'),
      );
      button.disabled = !training || n >= 10 || meta.bits < cost;
      button.onclick = () => buy(stat);
      upgrades.append(button);
    }
    const status = el('div', 'incubator-status');
    status.append(el('b', '', meta.bits + ' bits'));
    if (!training) {
      const cost = P.eggCost(C.eggChoices.findIndex((e) => e.id === selected));
      const unlock = el('button', '', 'Desbloquear · ' + cost + ' bits');
      unlock.disabled = meta.bits < cost;
      unlock.onclick = () => buy(null);
      status.append(unlock);
    } else
      status.append(
        el('small', '', 'Calidad ' + P.level(training) + ' · Cada 2 mejoras abres nuevas ramas'),
      );
    const back = el('button', 'incubator-return', '← Elegir huevo');
    back.onclick = () => open('play');
    host.append(upgrades, status, back);
  }
  return { eggs, portraits };
}
