export function patchPages(data) {
  const entries = [
    ...(data.pending?.length ? [{ title: 'En preparación', changes: data.pending }] : []),
    ...(data.releases || []).map((r) => ({ ...r, title: r.version + ' · ' + r.title })),
  ];
  return entries.flatMap((entry) => {
    const chunks = [];
    for (const change of entry.changes) {
      let part = '';
      for (const word of change.split(/\s+/)) {
        if (part.length + word.length > 320) {
          chunks.push(part);
          part = '';
        }
        part += (part ? ' ' : '') + word;
      }
      if (part) chunks.push(part);
    }
    return chunks.map((text, i) => ({
      title: entry.title,
      text,
      part: i + 1,
      total: chunks.length,
    }));
  });
}
export function renderPatchNotes(host, data) {
  host.replaceChildren();
  const node = (tag, text) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  if (!data) {
    host.append(node('p', 'No hay información de parches disponible.'));
    return;
  }
  host.append(node('p', 'Versión instalada: ' + data.currentVersion));
  const pages = patchPages(data);
  if (!pages.length) return;
  const article = node('article', '');
  article.className = 'patch-entry';
  article.setAttribute('aria-live', 'polite');
  const nav = node('nav', '');
  nav.className = 'patch-navigation';
  const back = node('button', '← Anterior'),
    label = node('span', ''),
    next = node('button', 'Siguiente →');
  back.type = next.type = 'button';
  nav.append(back, label, next);
  host.append(article, nav);
  let index = 0;
  const draw = () => {
    const page = pages[index];
    article.replaceChildren(
      node('h3', page.title),
      node('small', 'Novedad ' + page.part + ' de ' + page.total),
      node('p', page.text),
    );
    label.textContent = index + 1 + ' / ' + pages.length;
    back.disabled = index === 0;
    next.disabled = index === pages.length - 1;
  };
  back.onclick = () => {
    if (index > 0) {
      index--;
      draw();
    }
  };
  next.onclick = () => {
    if (index < pages.length - 1) {
      index++;
      draw();
    }
  };
  host.onkeydown = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      (event.key === 'ArrowLeft' ? back : next).click();
    }
  };
  draw();
}
