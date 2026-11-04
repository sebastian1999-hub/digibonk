export function renderBook(host, run, mode = 'techniques', family = 'all') {
  host.replaceChildren();
  const skills = window.SkillSystem,
    C = window.DigibonkCore,
    p = run?.s.player,
    stageNames = {
      [-1]: 'Bebé',
      0: 'Bebé II',
      1: 'Rookie',
      2: 'Champion',
      3: 'Ultimate',
      4: 'Mega',
    };
  if (mode === 'states') {
    const note = document.createElement('p');
    note.className = 'status-book-note';
    note.textContent =
      'Los estados afectan a los enemigos. Las torres son inmunes. Los jefes reciben la mitad del daño periódico y convierten congelación, parálisis y raíces en escarcha. Su vulnerabilidad y la conducción eléctrica también son menores. Quemadura, veneno y sangrado pueden coexistir; repetir un mismo estado renueva su duración y conserva el golpe más potente, sin acumular cargas.';
    host.append(note);
    for (const [id, definition] of Object.entries(DigibonkStatusRules.effects)) {
      const card = document.createElement('article'),
        icon = document.createElement('canvas'),
        heading = document.createElement('h3'),
        text = document.createElement('p');
      card.className = 'book-card';
      icon.width = icon.height = 40;
      icon.className = 'status-book-icon';
      DigibonkStatusIcons.draw(icon.getContext('2d'), id, 20, 20, 36);
      heading.textContent = definition.name;
      text.textContent = definition.text;
      card.append(icon, heading, text);
      host.append(card);
    }
    return;
  }
  if (mode === 'relics') {
    for (const item of DigibonkLoot.relics) {
      const card = document.createElement('article'),
        img = document.createElement('img'),
        heading = document.createElement('h3'),
        badge = document.createElement('small'),
        text = document.createElement('p');
      card.className = 'book-card' + (item.legendary ? ' legendary' : '');
      img.src = DigibonkLoot.icon(item.id);
      img.alt = '';
      heading.textContent = item.name;
      const owned = run?.s.relics.find((r) => r.id === item.id);
      badge.textContent =
        (item.legendary ? 'LEGENDARIO ÚNICO' : 'RELIQUIA · RANGOS 1–3') +
        (owned ? ' · EQUIPADO' : '');
      text.textContent = item.description(owned?.rank || 1);
      card.append(img, badge, heading, text);
      host.append(card);
    }
    return;
  }
  for (const skill of Object.values(skills.skills)
    .filter((s) => family === 'all' || s.family === family)
    .sort((a, b) => a.stage - b.stage || a.name.localeCompare(b.name, 'es'))) {
    const card = document.createElement('article'),
      heading = document.createElement('h3'),
      badge = document.createElement('small'),
      text = document.createElement('p'),
      state = document.createElement('strong');
    card.className = 'book-card';
    const weapon = p?.weapons.find((w) => w.id === skill.id);
    if (weapon) card.classList.add('equipped');
    badge.textContent = skills.familyNames[skill.family] + ' · ' + stageNames[skill.stage];
    heading.textContent = skill.name;
    text.textContent = C.describeTechnique(skill.id, weapon?.rank || 1, p || { haste: 1 });
    state.textContent = weapon
      ? 'EQUIPADA · RANGO ' + weapon.rank + '/9'
      : !p
        ? 'Se puede elegir al subir de nivel'
        : skills.compatible({ ...p, isEgg: p.stage === -2 }, skill)
          ? 'PUEDE APARECER AL SUBIR DE NIVEL'
          : 'Requiere una forma compatible de ' + stageNames[skill.stage] + ' o superior';
    card.append(badge, heading, text, state);
    host.append(card);
  }
}
