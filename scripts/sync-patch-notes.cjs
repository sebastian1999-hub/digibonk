const fs = require('node:fs');
const path = require('node:path');

function parseNotes(markdown, currentVersion, includePending = true) {
  const releases = [], pending = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+)/);
    if (heading) {
      const version = heading[1].match(/^(?:Digibonk\s+)?(\d+\.\d+\.\d+)(?:\s*[·—-]\s*)?(.*)/i);
      if (version) {
        current = { version: version[1], title: version[2] || 'Actualización', changes: [] };
        releases.push(current);
      } else if (/pendiente/i.test(heading[1])) current = { changes: pending };
      else current = null;
    } else if (current && line.trim() && !line.startsWith('#')) {
      const text = line.replace(/^\s*[-*]\s+/, '').replace(/\*\*|`/g, '').trim();
      if (text) current.changes.push(text);
    }
  }
  releases.sort((a, b) => {
    const av = a.version.split('.').map(Number), bv = b.version.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return bv[i] - av[i];
    return 0;
  });
  if (!releases.some(r => r.version === currentVersion && r.changes.length))
    throw new Error('Añade los cambios de la versión ' + currentVersion + ' a RELEASE-NOTES.md antes de empaquetar.');
  return { currentVersion, pending: includePending ? pending : [], releases };
}

if (require.main === module) {
  const project = path.resolve(__dirname, '..');
  const output = process.argv.find(a => a.startsWith('--output='))?.slice(9) || path.join(project, 'game/patch-notes.js');
  const data = parseNotes(fs.readFileSync(path.join(project, 'RELEASE-NOTES.md'), 'utf8'), fs.readFileSync(path.join(project, 'version.txt'), 'utf8').trim(), !process.argv.includes('--published'));
  fs.writeFileSync(output, '// Generated from RELEASE-NOTES.md by scripts/sync-patch-notes.cjs.\nwindow.DigibonkPatchNotes = ' + JSON.stringify(data, null, 2) + ';\n');
  console.log('Info parche: ' + data.releases.length + ' versiones preparadas.');
}
module.exports = { parseNotes };
