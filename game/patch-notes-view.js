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
  const entry = (heading, changes, pending = false) => {
    const article = document.createElement('article');
    article.className = 'patch-entry' + (pending ? ' patch-pending' : '');
    article.append(node('h3', heading));
    const list = document.createElement('ul');
    for (const change of changes) list.append(node('li', change));
    article.append(list);
    host.append(article);
  };
  if (data.pending?.length) entry('En preparación · todavía sin publicar', data.pending, true);
  for (const release of data.releases)
    entry(release.version + ' · ' + release.title, release.changes);
}
