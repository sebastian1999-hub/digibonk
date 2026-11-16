export function patchPages(data) {
  const entries = [
    ...(data.pending?.length ? [{ title: 'En preparación', changes: data.pending }] : []),
    ...(data.releases || []).map((r) => ({ ...r, title: r.version + ' · ' + r.title })),
  ];
  return entries;
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
  const dialog = host.closest('dialog');
  const fit = () => {
    if (!dialog?.open) return;
    dialog.style.zoom = '1';
    dialog.style.zoom = String(Math.min(1, (window.innerHeight - 32) / dialog.scrollHeight));
  };
  if (host.patchResize) window.removeEventListener('resize', host.patchResize);
  host.patchResize = fit;
  window.addEventListener('resize', fit);
  let index = 0;
  const draw = () => {
    const page = pages[index];
    const list = node('ul', '');
    for (const change of page.changes) list.append(node('li', change));
    article.replaceChildren(node('h3', page.title), list);
    label.textContent = 'Versión ' + (index + 1) + ' / ' + pages.length;
    back.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    requestAnimationFrame(fit);
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
