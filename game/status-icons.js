(function (root) {
  'use strict';
  const R = typeof module !== 'undefined' ? require('./status-rules.js') : root.DigibonkStatusRules;
  function draw(c, id, x, y, size = 20, left = 1) {
    const r = size / 2;
    c.save();
    c.translate(x, y);
    c.fillStyle = '#172e38ed';
    c.strokeStyle = id === 'uncontrollable' ? '#ffad4c' : R.effects[id]?.color || '#fff';
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.8;
    c.beginPath();
    c.arc(0, 0, r - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, left)));
    c.stroke();
    c.globalAlpha = 1;
    c.scale(size / 24, size / 24);
    c.lineWidth = 1.7;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    if (id === 'uncontrollable') {
      c.moveTo(0, -8);
      c.lineTo(7, -5);
      c.lineTo(5, 4);
      c.lineTo(0, 8);
      c.lineTo(-5, 4);
      c.lineTo(-7, -5);
      c.closePath();
      c.stroke();
      c.moveTo(-4, 4);
      c.lineTo(4, -4);
      c.stroke();
    } else if (['burn', 'poison', 'wet', 'bleed'].includes(id)) {
      c.moveTo(0, -7);
      c.bezierCurveTo(-1, -3, -6, 0, -5, 4);
      c.bezierCurveTo(-4, 8, 5, 8, 5, 3);
      c.bezierCurveTo(5, -1, 2, -2, 0, -7);
      c.stroke();
      if (id === 'burn') {
        c.moveTo(0, 0);
        c.lineTo(-1, 4);
        c.lineTo(2, 5);
        c.stroke();
      }
      if (id === 'poison')
        for (const xx of [-2, 2]) {
          c.beginPath();
          c.arc(xx, 3, 0.8, 0, Math.PI * 2);
          c.fillStyle = c.strokeStyle;
          c.fill();
        }
    } else if (id === 'shock') {
      c.moveTo(2, -7);
      c.lineTo(-5, 1);
      c.lineTo(0, 1);
      c.lineTo(-2, 7);
      c.lineTo(5, -1);
      c.lineTo(1, -1);
      c.closePath();
      c.stroke();
    } else if (id === 'chill') {
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3;
        c.moveTo(0, 0);
        c.lineTo(Math.cos(q) * 6, Math.sin(q) * 6);
      }
      c.stroke();
    } else if (id === 'freeze') {
      for (let i = 0; i < 6; i++) {
        const q = (i * Math.PI) / 3;
        const xx = Math.cos(q) * 6,
          yy = Math.sin(q) * 6;
        i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
      }
      c.closePath();
      c.moveTo(-4, -4);
      c.lineTo(4, 4);
      c.moveTo(0, -6);
      c.lineTo(0, 6);
      c.stroke();
    } else if (id === 'root') {
      c.moveTo(0, 7);
      c.lineTo(0, -6);
      c.moveTo(0, 0);
      c.lineTo(-5, -4);
      c.moveTo(0, 3);
      c.lineTo(5, -2);
      c.moveTo(-4, 7);
      c.lineTo(0, 3);
      c.lineTo(4, 7);
      c.stroke();
    } else if (id === 'weaken') {
      c.moveTo(-4, -5);
      c.lineTo(-4, 1);
      c.lineTo(-6, 1);
      c.lineTo(0, 7);
      c.lineTo(6, 1);
      c.lineTo(4, 1);
      c.lineTo(4, -5);
      c.stroke();
    } else if (id === 'fracture') {
      c.rect(-5, -6, 10, 12);
      c.moveTo(1, -6);
      c.lineTo(-2, -1);
      c.lineTo(2, 1);
      c.lineTo(-1, 6);
      c.stroke();
    } else {
      c.arc(0, 0, 5, 0, Math.PI * 2);
      c.moveTo(-3, -3);
      c.lineTo(3, 3);
      c.moveTo(3, -3);
      c.lineTo(-3, 3);
      c.stroke();
    }
    c.restore();
  }
  const api = { draw };
  if (typeof module !== 'undefined') module.exports = api;
  else root.DigibonkStatusIcons = api;
})(typeof window !== 'undefined' ? window : globalThis);
