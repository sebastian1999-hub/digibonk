export function techniqueAsset(id, kind = 'cards') {
  return 'assets/techniques/' + kind + '/' + id + '.png';
}

export function frameTechnique(card, id) {
  card.classList.add('technique-card');
  card.style.setProperty('--technique-frame', `url("${techniqueAsset(id)}")`);
}

export function techniqueEmblem(id) {
  const img = document.createElement('img');
  img.src = techniqueAsset(id, 'emblems');
  img.alt = '';
  img.className = 'technique-emblem';
  return img;
}

export function renderTechniqueDevice(host, player) {
  host.replaceChildren();
  const device = document.createElement('div'),
    art = document.createElement('img'),
    detail = document.createElement('p');
  device.className = 'technique-device';
  art.src = 'assets/techniques/device.png';
  art.alt = '';
  art.className = 'technique-device-art';
  detail.className = 'technique-detail';
  detail.setAttribute('aria-live', 'polite');
  device.append(art);
  const describe = (weapon) => {
    const skill = window.SkillSystem.skills[weapon.id];
    detail.textContent =
      skill.name +
      ' · ' +
      window.SkillSystem.stageName(weapon.id) +
      ' · Rango ' +
      weapon.rank +
      '/9. ' +
      window.DigibonkCore.describeTechnique(weapon.id, weapon.rank, player);
  };
  for (let index = 0; index < 4; index++) {
    const weapon = player.weapons[index],
      slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'technique-slot';
    slot.style.setProperty('--slot-index', index);
    if (weapon) {
      const name = window.SkillSystem.skills[weapon.id].name;
      slot.append(techniqueEmblem(weapon.id));
      slot.title = name + ' · Rango ' + weapon.rank + '/9';
      slot.setAttribute('aria-label', 'Técnica ' + (index + 1) + ': ' + slot.title);
      slot.onclick = () => {
        describe(weapon);
        for (const other of device.querySelectorAll('.technique-slot'))
          other.setAttribute('aria-pressed', String(other === slot));
      };
      slot.setAttribute('aria-pressed', String(index === 0));
    } else {
      slot.disabled = true;
      slot.setAttribute('aria-label', 'Técnica ' + (index + 1) + ': hueco libre');
    }
    device.append(slot);
  }
  if (player.weapons.length) describe(player.weapons[0]);
  else detail.textContent = 'Cuatro huecos libres. Aprende técnicas al subir de nivel.';
  host.append(device, detail);
}
