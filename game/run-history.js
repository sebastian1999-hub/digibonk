export function recordRun(history, state, bits, date = new Date().toISOString()) {
  if (!state.done || history.some((entry) => entry.id === state.id)) return history;
  const entry = {
    id: state.id,
    date,
    egg: state.egg,
    species: state.player.species,
    stage: state.player.stage,
    time: state.time,
    score: state.score,
    kills: state.kills,
    level: state.level,
    experience: state.totalXp,
    coins: state.coins,
    bits,
    portals: state.world.cleansed,
    portalTarget: state.world.target,
    devimon: state.world.devimonDefeated,
    evolutions: state.history,
    relics: state.relics,
    companions: state.buddies.map((buddy) => buddy.species),
    weapons: state.player.weapons.map(({ id, rank }) => ({ id, rank })),
    orbits: state.player.orbits,
    report: state.combatReport,
  };
  return [structuredClone(entry), ...history].slice(0, 3);
}

export function damageRows(damage, phases = Object.keys(damage)) {
  const rows = new Map();
  for (const phase of phases) {
    for (const [source, stats] of Object.entries(damage[phase] || {})) {
      const total = rows.get(source) || { source, damage: 0, hits: 0, kills: 0 };
      total.damage += stats.damage;
      total.hits += stats.hits;
      total.kills += stats.kills;
      rows.set(source, total);
    }
  }
  return [...rows.values()].sort((a, b) => b.damage - a.damage || a.source.localeCompare(b.source));
}

function element(tag, content) {
  const node = document.createElement(tag);
  if (content != null) node.textContent = content;
  return node;
}

export function openRunHistory(dialog, history, { clock, number, stages, skills, relics, statuses }) {
  const list = dialog.querySelector('#history-list');
  const detail = dialog.querySelector('#history-detail');
  const buttons = [];
  const date = (entry) => new Date(entry.date).toLocaleString('es-ES', {
    dateStyle: 'medium', timeStyle: 'short',
  });
  const relicName = (id) => relics.find((relic) => relic.id === id)?.name || id;
  const evolutionStyles = {
    hunter: 'Cazador', guardian: 'Guardián', vanguard: 'Vanguardia',
    tide: 'Marea', controller: 'Controlador', artillery: 'Artillería',
  };
  function sourceName(source) {
    const [kind, id] = source.split(':');
    switch (kind) {
      case 'technique': return skills[id]?.name || id;
      case 'basic': return 'Ataque básico';
      case 'collectors': return 'Recolectores rojos';
      case 'companion': return 'Compañero · ' + id;
      case 'relic': return 'Reliquia · ' + relicName(id);
      case 'evolution': return 'Habilidad evolutiva · ' + (evolutionStyles[id] || id);
      case 'status': return 'Estado · ' + (statuses[id]?.name || id);
      default: return 'Otras fuentes';
    }
  }
  function addStats(values) {
    const stats = element('dl');
    stats.className = 'history-stats';
    for (const [label, value] of values) {
      const pair = element('div');
      pair.append(element('dt', label), element('dd', value));
      stats.append(pair);
    }
    detail.append(stats);
  }
  function addTable(host, headers, rows) {
    const table = element('table');
    const head = table.createTHead().insertRow();
    for (const title of headers) {
      const cell = element('th', title);
      cell.scope = 'col';
      head.append(cell);
    }
    const body = table.createTBody();
    for (const values of rows) {
      const row = body.insertRow();
      for (const value of values) row.append(element('td', value));
    }
    host.append(table);
  }
  function addDamage(host, rows) {
    addTable(host, ['Fuente', 'Daño', 'Impactos', 'Remates'],
      rows.map((row) => [sourceName(row.source), number(row.damage), number(row.hits), number(row.kills)]));
  }
  function show(entry, selected) {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
    detail.replaceChildren(element('h3', entry.species + ' · ' + stages[entry.stage]));
    detail.scrollTop = 0;
    const report = entry.report;
    const totals = damageRows(report.damage);
    const collectors = totals.find((row) => row.source === 'collectors');
    addStats([
      ['Tiempo', clock(entry.time)], ['Puntos', number(entry.score)], ['Bajas', number(entry.kills)],
      ['Nivel', number(entry.level)], ['Portales', entry.portals + ' / ' + entry.portalTarget],
      ['Devimon', entry.devimon ? 'Derrotado' : 'Pendiente'],
      ['Bits para la cuenta', number(entry.bits)], ['Bits al terminar', number(entry.coins)],
      ['Experiencia', number(entry.experience || 0)], ['Daño total', number(totals.reduce((n, row) => n + row.damage, 0))],
      ['Daño de recolectores', number(collectors?.damage || 0)],
      ['Cofres abiertos', number(report.chestsOpened)], ['Cofres de enemigos', number(report.chestDrops)],
      ['Vida perdida', number(report.lifeLost)], ['Escudo perdido', number(report.shieldLost)],
    ]);
    if (report.since > 0) detail.append(element('p', 'Registro de combate y botín disponible desde ' + clock(report.since) + '.'));
    detail.append(element('p', [entry.egg, ...entry.evolutions.map((step) => step.to)].join(' → ')));
    detail.append(element('h4', 'Técnicas por daño'));
    const techniques = totals.filter((row) => row.source.startsWith('technique:'));
    if (techniques.length) addDamage(detail, techniques);
    else detail.append(element('p', 'Todavía no hay impactos de técnicas en el registro.'));
    const other = totals.filter((row) => !row.source.startsWith('technique:'));
    if (other.length) {
      detail.append(element('h4', 'Otras fuentes de daño'));
      addDamage(detail, other);
    }
    detail.append(element('h4', 'Daño por fase evolutiva'));
    const phases = Object.keys(report.damage).sort((a, b) => Number(a) - Number(b));
    for (const phase of phases) {
      const section = element('details');
      const rows = damageRows(report.damage, [phase]);
      section.open = phases.length === 1;
      section.append(element('summary', stages[phase] + ' · ' + number(rows.reduce((n, row) => n + row.damage, 0)) + ' de daño'));
      addDamage(section, rows);
      detail.append(section);
    }
    if (!phases.length) detail.append(element('p', 'La partida no tiene daño registrado.'));
    detail.append(element('h4', 'Objetos recopilados'));
    if (entry.relics.length) addTable(detail, ['Objeto', 'Copias registradas', 'Rango final'],
      [...entry.relics].sort((a, b) => relicName(a.id).localeCompare(relicName(b.id))).map((item) => [
        relicName(item.id), number(report.loot[item.id] || 0), number(item.rank),
      ]));
    else detail.append(element('p', 'Sin reliquias.'));
    detail.append(element('h4', 'Equipo final'));
    detail.append(element('p', entry.weapons.map((weapon) => sourceName('technique:' + weapon.id) + ' · Rango ' + weapon.rank).join(' / ') || 'Sin técnicas equipadas.'));
    detail.append(element('p', 'Compañeros · ' + (entry.companions.join(', ') || 'Ninguno')));
    detail.append(element('p', 'Recolectores · ' + Math.floor(entry.orbits / 3) + ' rojos y ' + entry.orbits % 3 + ' básicos'));
  }
  list.replaceChildren();
  detail.replaceChildren();
  for (const [index, entry] of history.entries()) {
    const button = element('button');
    button.type = 'button';
    button.append(element('strong', entry.species), element('small', date(entry)),
      element('small', clock(entry.time) + ' · ' + number(entry.score) + ' puntos'));
    button.addEventListener('click', () => show(entry, index));
    buttons.push(button);
    list.append(button);
  }
  if (history.length) show(history[0], 0);
  else detail.append(element('p', 'Termina una partida para guardar aquí su informe de combate.'));
  dialog.showModal();
}
