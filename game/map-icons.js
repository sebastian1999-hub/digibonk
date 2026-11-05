(function (root) {
  'use strict';
  const names = {
    chest: 'Cofre',
    shop: 'Tienda',
    fire: 'Descanso',
    shrine: 'Santuario',
    portal: 'Portal',
    closed: 'Portal cerrado',
    exit: 'Regreso',
    tower: 'Torre Negra',
    boss: 'Devimon',
    player: 'Tú',
  };
  const colors = {
    chest: '#ffd35a',
    shop: '#69d8ff',
    fire: '#ff9854',
    shrine: '#9aff83',
    portal: '#c48aff',
    closed: '#94a3b8',
    exit: '#50ffe0',
    tower: '#ff6685',
    boss: '#ff4545',
    player: '#fffdf3',
  };
  function markers(s, map) {
    const list = [];
    for (const p of map.pois) {
      if (s.usedPois.includes(p.id)) continue;
      list.push({
        x: p.x,
        z: p.z,
        type: { chest: 'chest', merchant: 'shop', fire: 'fire', altar: 'shrine' }[p.type],
      });
    }
    if (s.realm) {
      list.push({ x: 0, z: 0, type: 'exit' });
      if (s.realm.phase !== 'cleared') list.push({ ...s.realm.towerPosition, type: 'tower' });
    } else {
      for (const p of s.world.portals)
        list.push({ x: p.x, z: p.z, type: p.closed ? 'closed' : 'portal' });
      if (!s.world.devimonDefeated)
        list.push({ x: 0, z: 0, type: 'boss', locked: !s.world.devimonSpawned });
    }
    list.push({
      x: s.player.x,
      z: s.player.z,
      type: 'player',
      angle: Math.atan2(s.player.lastDZ || 0, s.player.lastDX || 0) + Math.PI / 2,
    });
    return list;
  }
  function symbol(c, type, x, y, size = 14, angle = 0, locked = false) {
    c.save();
    c.translate(x, y);
    c.scale(size / 24, size / 24);
    c.lineWidth = 2;
    const color = colors[type] || '#f3efe1';
    c.strokeStyle = color;
    c.fillStyle = color + '66';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const line = (points) => {
      c.beginPath();
      points.forEach(([xx, yy], i) => (i ? c.lineTo(xx, yy) : c.moveTo(xx, yy)));
      c.stroke();
    };
    const box = (x, y, w, h) => {
      c.beginPath();
      c.rect(x, y, w, h);
      c.fill();
      c.stroke();
    };
    if (type === 'chest') {
      box(-10, -6, 20, 15);
      line([
        [-10, -1],
        [10, -1],
      ]);
      box(-2, -3, 4, 6);
      line([
        [-7, -6],
        [-7, -9],
        [7, -9],
        [7, -6],
      ]);
    }
    if (type === 'shop') {
      c.beginPath();
      c.moveTo(-10, 7);
      c.lineTo(0, -11);
      c.lineTo(4, -2);
      c.lineTo(8, 7);
      c.closePath();
      c.fill();
      c.stroke();
      line([
        [-12, 9],
        [12, 9],
      ]);
      line([
        [-3, 3],
        [6, 3],
      ]);
      c.beginPath();
      c.arc(2, -3, 1, 0, Math.PI * 2);
      c.stroke();
    }
    if (type === 'fire') {
      c.beginPath();
      c.moveTo(0, -12);
      c.bezierCurveTo(5, -5, 10, -1, 7, 5);
      c.bezierCurveTo(2, 12, -8, 8, -7, 1);
      c.lineTo(-3, -5);
      c.lineTo(-2, 2);
      c.closePath();
      c.fill();
      c.stroke();
      line([
        [-10, 11],
        [9, 8],
      ]);
      line([
        [-9, 8],
        [10, 11],
      ]);
    }
    if (type === 'shrine') {
      line([
        [-11, -7],
        [11, -7],
      ]);
      line([
        [-12, -11],
        [12, -11],
      ]);
      line([
        [-7, -11],
        [-7, 11],
      ]);
      line([
        [7, -11],
        [7, 11],
      ]);
      line([
        [-10, 11],
        [-4, 11],
      ]);
      line([
        [4, 11],
        [10, 11],
      ]);
      line([
        [0, -2],
        [3, 2],
        [0, 6],
        [-3, 2],
        [0, -2],
      ]);
    }
    if (['portal', 'closed', 'exit'].includes(type)) {
      c.beginPath();
      c.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      if (type === 'portal') {
        c.beginPath();
        c.ellipse(0, 0, 3.5, 6, 0, 0, Math.PI * 1.7);
        c.stroke();
      }
      if (type === 'closed')
        line([
          [-5, 0],
          [-1, 5],
          [7, -5],
        ]);
      if (type === 'exit') {
        line([
          [9, 0],
          [-9, 0],
          [-3, -5],
        ]);
        line([
          [-9, 0],
          [-3, 5],
        ]);
      }
    }
    if (type === 'tower') {
      c.beginPath();
      c.moveTo(-7, 11);
      c.lineTo(-7, -6);
      c.lineTo(-10, -6);
      c.lineTo(-10, -11);
      c.lineTo(-5, -11);
      c.lineTo(-5, -8);
      c.lineTo(0, -8);
      c.lineTo(0, -11);
      c.lineTo(5, -11);
      c.lineTo(5, -8);
      c.lineTo(10, -8);
      c.lineTo(10, -6);
      c.lineTo(7, -6);
      c.lineTo(7, 11);
      c.closePath();
      c.fill();
      c.stroke();
      line([
        [-10, 11],
        [10, 11],
      ]);
      line([
        [-2, 0],
        [2, 0],
      ]);
      line([
        [-2, 5],
        [2, 5],
      ]);
    }
    if (type === 'boss') {
      c.beginPath();
      c.moveTo(-8, -5);
      c.lineTo(-11, -12);
      c.lineTo(-2, -7);
      c.lineTo(2, -7);
      c.lineTo(11, -12);
      c.lineTo(8, -5);
      c.bezierCurveTo(13, 4, 5, 11, 0, 11);
      c.bezierCurveTo(-5, 11, -13, 4, -8, -5);
      c.closePath();
      c.fill();
      c.stroke();
      line([
        [-6, 0],
        [-2, 2],
      ]);
      line([
        [6, 0],
        [2, 2],
      ]);
      line([
        [-3, 7],
        [3, 7],
      ]);
      if (locked) {
        c.lineWidth = 2.5;
        line([
          [-11, 12],
          [11, -10],
        ]);
      }
    }
    if (type === 'player') {
      c.rotate(angle);
      c.fillStyle = colors.player;
      c.strokeStyle = '#0d1b20';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, -13);
      c.lineTo(10, 10);
      c.lineTo(0, 6);
      c.lineTo(-10, 10);
      c.closePath();
      c.fill();
      c.stroke();
    }
    c.restore();
  }
  function draw(canvas, s, map, ponds, world, { large = false } = {}) {
    const c = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height,
      margin = large ? 20 : 12,
      scale = (Math.min(w, h) - margin * 2) / (world * 2),
      project = (x, z) => ({ x: w / 2 + x * scale, y: h / 2 + z * scale });
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#1a292e';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#85928f';
    c.lineWidth = 1;
    c.strokeRect(margin - 3, margin - 3, w - margin * 2 + 6, h - margin * 2 + 6);
    c.strokeStyle = '#82938a24';
    for (let i = 1; i < 6; i++) {
      const x = margin + ((w - margin * 2) * i) / 6,
        y = margin + ((h - margin * 2) * i) / 6;
      c.beginPath();
      c.moveTo(x, margin);
      c.lineTo(x, h - margin);
      c.moveTo(margin, y);
      c.lineTo(w - margin, y);
      c.stroke();
    }
    for (const pond of ponds) {
      const q = project(pond.x, pond.z),
        r = pond.r * scale;
      c.strokeStyle = '#a8b7af77';
      c.beginPath();
      c.arc(q.x, q.y, r, 0, Math.PI * 2);
      c.stroke();
      for (const dy of [-2, 2]) {
        c.beginPath();
        c.moveTo(q.x - r * 0.45, q.y + dy);
        c.quadraticCurveTo(q.x, q.y + dy - 2, q.x + r * 0.45, q.y + dy);
        c.stroke();
      }
    }
    const list = markers(s, map),
      size = large ? 23 : 12;
    for (const item of list) {
      const q = project(item.x, item.z);
      if (item.type !== 'player') {
        c.fillStyle = '#17272bdf';
        c.beginPath();
        c.arc(q.x, q.y, size * 0.65, 0, Math.PI * 2);
        c.fill();
      }
      symbol(
        c,
        item.type,
        q.x,
        q.y,
        item.type === 'player' ? size * 1.2 : size,
        item.angle || 0,
        item.locked,
      );
    }
    c.fillStyle = '#eff1e1';
    c.font = 'bold ' + (large ? 12 : 9) + 'px Segoe UI';
    c.textAlign = 'center';
    c.fillText('N', w / 2, large ? 13 : 9);
    return list;
  }
  const api = { names, colors, markers, symbol, draw };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkMap = api;
})(typeof window !== 'undefined' ? window : globalThis);
