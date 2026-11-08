// Reusable, hand-drawn Canvas masks: their colour comes from each technique's palette.
// No per-frame canvases, image downloads or additional asset requests.
export function paintAttackDetail(c, kind) {
  const TAU = Math.PI * 2;
  const path = (points) => {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  };
  const polygon = (r, sides, rotation = 0) => {
    path(
      Array.from({ length: sides }, (_, i) => {
        const q = (i * TAU) / sides + rotation;
        return [128 + Math.cos(q) * r, 128 + Math.sin(q) * r];
      }),
    );
  };
  c.fillStyle = c.strokeStyle = '#fff';
  c.lineJoin = c.lineCap = 'round';
  if (kind === 'fx-plasma') {
    const g = c.createLinearGradient(0, 0, 250, 0);
    g.addColorStop(0, '#ffffff00');
    g.addColorStop(0.32, '#ffffff80');
    g.addColorStop(0.8, '#ffffffff');
    g.addColorStop(1, '#ffffffd0');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(245, 128);
    c.bezierCurveTo(232, 72, 198, 54, 140, 80);
    c.bezierCurveTo(157, 96, 114, 94, 75, 46);
    c.bezierCurveTo(108, 103, 57, 102, 5, 83);
    c.bezierCurveTo(36, 134, 100, 126, 26, 177);
    c.bezierCurveTo(82, 162, 105, 185, 86, 208);
    c.bezierCurveTo(153, 168, 212, 206, 245, 128);
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(30, 101 + i * 27);
      c.bezierCurveTo(100, 80 + i * 38, 145, 157 - i * 25, 208, 110 + i * 13);
      c.stroke();
    }
  } else if (kind === 'fx-corona') {
    c.beginPath();
    for (let i = 0; i <= 96; i++) {
      const q = (i * TAU) / 96;
      const r =
        92 +
        10 * Math.sin(q * 9) +
        7 * Math.sin(q * 17 + 1) +
        8 * Math.pow(Math.max(0, Math.sin(q * 5)), 6);
      c.lineTo(128 + Math.cos(q) * r, 128 + Math.sin(q) * r);
    }
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    for (let i = 0; i <= 96; i++) {
      const q = (i * TAU) / 96;
      const r = 66 + 9 * Math.sin(q * 9 + 0.3) + 6 * Math.sin(q * 5);
      c.lineTo(128 + Math.cos(q) * r, 128 + Math.sin(q) * r);
    }
    c.closePath();
    c.fill();
    c.lineWidth = 5;
    for (let i = 0; i < 7; i++) {
      const q = (i * TAU) / 7;
      c.beginPath();
      c.moveTo(128 + Math.cos(q) * 75, 128 + Math.sin(q) * 75);
      c.lineTo(128 + Math.cos(q + 0.1) * 128, 128 + Math.sin(q + 0.1) * 128);
      c.stroke();
    }
  } else if (kind === 'fx-splash') {
    c.beginPath();
    c.moveTo(24, 200);
    c.bezierCurveTo(45, 160, 0, 134, 10, 111);
    c.bezierCurveTo(22, 91, 48, 157, 63, 156);
    c.bezierCurveTo(80, 137, 26, 52, 45, 44);
    c.bezierCurveTo(66, 36, 85, 130, 104, 112);
    c.bezierCurveTo(120, 95, 91, 13, 110, 13);
    c.bezierCurveTo(135, 14, 116, 117, 144, 118);
    c.bezierCurveTo(164, 117, 151, 42, 169, 42);
    c.bezierCurveTo(193, 44, 155, 151, 183, 158);
    c.bezierCurveTo(206, 159, 221, 75, 238, 85);
    c.bezierCurveTo(258, 98, 207, 170, 232, 198);
    c.bezierCurveTo(201, 244, 68, 246, 24, 200);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.ellipse(126, 207, 74, 37, 0, 0, TAU);
    c.fill();
    c.lineWidth = 8;
    for (const [x, y] of [
      [44, 137],
      [79, 98],
      [128, 128],
      [175, 115],
      [211, 159],
    ]) {
      c.beginPath();
      c.moveTo(x, 194);
      c.lineTo(x + (x - 128) * 0.18, y);
      c.stroke();
    }
  } else if (kind === 'fx-snowflake') {
    for (let i = 0; i < 6; i++) {
      c.save();
      c.translate(128, 128);
      c.rotate((i * TAU) / 6);
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -111);
      c.stroke();
      c.lineWidth = 3;
      for (const y of [-45, -75]) {
        c.beginPath();
        c.moveTo(-22, y - 18);
        c.lineTo(0, y);
        c.lineTo(22, y - 18);
        c.stroke();
      }
      c.restore();
    }
    polygon(27, 6, Math.PI / 6);
    c.stroke();
  } else if (kind === 'fx-crescent') {
    c.beginPath();
    c.moveTo(17, 232);
    c.bezierCurveTo(233, 203, 250, 60, 149, 17);
    c.bezierCurveTo(235, 111, 135, 170, 17, 232);
    c.fill();
    c.lineWidth = 3;
    c.globalAlpha = 0.6;
    c.beginPath();
    c.moveTo(17, 218);
    c.bezierCurveTo(185, 189, 223, 110, 180, 47);
    c.stroke();
    c.globalAlpha = 0.35;
    c.beginPath();
    c.moveTo(28, 241);
    c.bezierCurveTo(240, 224, 264, 80, 192, 36);
    c.stroke();
  } else if (kind === 'fx-feather' || kind === 'fx-petal') {
    c.beginPath();
    c.moveTo(13, 152);
    c.bezierCurveTo(73, 23, 184, 55, 245, 94);
    c.bezierCurveTo(156, 190, 97, 213, 13, 152);
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(22, 153);
    c.quadraticCurveTo(119, 134, 224, 99);
    c.stroke();
    if (kind === 'fx-feather')
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.moveTo(55 + i * 23, 140 - i * 5);
        c.lineTo(41 + i * 23, 60);
        c.moveTo(55 + i * 23, 150 - i * 5);
        c.lineTo(84 + i * 23, 202);
        c.stroke();
      }
  } else if (kind === 'fx-halo' || kind === 'fx-hex') {
    c.lineWidth = 4;
    if (kind === 'fx-hex') {
      polygon(108, 6, Math.PI / 6);
      c.stroke();
      c.lineWidth = 2;
      polygon(88, 6, Math.PI / 6);
      c.stroke();
    } else {
      for (const r of [106, 87]) {
        c.beginPath();
        c.arc(128, 128, r, 0, TAU);
        c.stroke();
      }
    }
    for (let i = 0; i < 12; i++) {
      c.save();
      c.translate(128, 128);
      c.rotate((i * TAU) / 12);
      c.fillRect(94, -3, i % 3 ? 10 : 25, 6);
      if (i % 3 === 0) {
        c.fillRect(112, -11, 4, 22);
        c.fillRect(61, -2, 12, 4);
      }
      c.restore();
    }
  } else if (kind === 'fx-impact') {
    path([
      [10, 148],
      [78, 120],
      [35, 35],
      [111, 81],
      [141, 5],
      [156, 91],
      [236, 43],
      [197, 117],
      [252, 151],
      [181, 160],
      [196, 236],
      [135, 185],
      [78, 245],
      [88, 178],
      [15, 213],
      [61, 156],
    ]);
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    polygon(43, 6);
    c.fill();
  } else if (kind === 'fx-cross') {
    path([
      [100, 23],
      [156, 23],
      [156, 100],
      [233, 100],
      [233, 156],
      [156, 156],
      [156, 233],
      [100, 233],
      [100, 156],
      [23, 156],
      [23, 100],
      [100, 100],
    ]);
    c.fill();
  } else if (kind === 'fx-shield') {
    path([
      [128, 12],
      [225, 54],
      [216, 152],
      [187, 204],
      [128, 247],
      [69, 204],
      [40, 152],
      [31, 54],
    ]);
    c.lineWidth = 9;
    c.stroke();
    c.globalAlpha = 0.13;
    c.fill();
    c.globalAlpha = 0.8;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++) {
        c.save();
        c.translate((col - 1) * 43 + (row % 2 ? 20 : 0), (row - 1.5) * 35);
        c.lineWidth = 2;
        polygon(23, 6, Math.PI / 6);
        c.stroke();
        c.restore();
      }
  } else if (kind === 'fx-speed') {
    const g = c.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, '#ffffff00');
    g.addColorStop(0.7, '#ffffffd0');
    g.addColorStop(1, '#ffffffff');
    c.fillStyle = g;
    path([
      [0, 96],
      [216, 109],
      [256, 128],
      [216, 147],
      [0, 160],
    ]);
    c.fill();
  } else if (kind === 'fx-aura') {
    const g = c.createRadialGradient(128, 128, 4, 128, 128, 125);
    g.addColorStop(0, '#ffffff90');
    g.addColorStop(0.35, '#ffffff55');
    g.addColorStop(1, '#ffffff00');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  } else return false;
  return true;
}
