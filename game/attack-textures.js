import * as THREE from './vendor/three.module.js';
import { paintAttackDetail } from './attack-detail-textures.js';

// Original, code-drawn VFX art. Crisp silhouettes carry the action; soft light is an accent.
export function attackTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'),
    tau = Math.PI * 2;
  const gradient = (stops) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 123);
    stops.forEach(([p, color]) => g.addColorStop(p, color));
    return g;
  };
  if (paintAttackDetail(c, kind)) {
    // Additional elemental masks share the same cached texture/material pipeline.
  } else if (kind === 'fx-comet') {
    // Points right: a rounded head, torn tail, and a narrow white-hot centre.
    for (let layer = 0; layer < 3; layer++) {
      c.save();
      c.translate(208, 128);
      c.scale(1 - layer * 0.22, 1 - layer * 0.26);
      c.translate(-208, -128);
      const g = c.createLinearGradient(0, 0, 245, 0);
      g.addColorStop(0, '#ffffff00');
      g.addColorStop(0.55, layer ? '#ffffffb0' : '#ffffff55');
      g.addColorStop(1, '#ffffffff');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(240, 128);
      c.bezierCurveTo(239, 77, 193, 63, 135, 91);
      c.lineTo(45, 60);
      c.lineTo(95, 110);
      c.lineTo(3, 104);
      c.lineTo(67, 136);
      c.lineTo(20, 181);
      c.lineTo(126, 158);
      c.bezierCurveTo(185, 204, 235, 181, 240, 128);
      c.fill();
      c.restore();
    }
  } else if (kind === 'fx-blast') {
    // Broken, asymmetric explosion silhouette with a solid centre and torn hot edges.
    c.fillStyle = gradient([
      [0, '#ffffffff'],
      [0.55, '#ffffffff'],
      [0.82, '#ffffffd0'],
      [1, '#ffffff00'],
    ]);
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i * tau) / 48,
        r = 87 + Math.sin(i * 2.8) * 17 + (i % 6 === 0 ? 18 : 0);
      c.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.strokeStyle = '#ffffff70';
    c.lineWidth = 7;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(128, 128, 70 + i * 6, i * 1.3, i * 1.3 + 0.6);
      c.stroke();
    }
  } else if (kind === 'fx-cut') {
    const g = c.createLinearGradient(0, 256, 256, 0);
    g.addColorStop(0, '#ffffff00');
    g.addColorStop(0.4, '#ffffff95');
    g.addColorStop(0.7, '#ffffffff');
    g.addColorStop(1, '#ffffff00');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(18, 239);
    c.bezierCurveTo(250, 213, 258, 64, 179, 14);
    c.bezierCurveTo(230, 91, 181, 175, 18, 239);
    c.fill();
    c.strokeStyle = '#ffffff65';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(22, 224);
    c.bezierCurveTo(198, 203, 230, 91, 178, 24);
    c.stroke();
  } else if (kind === 'fx-star') {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * tau) / 16,
        r = i % 2 ? 13 : i % 4 ? 59 : 121;
      c.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  } else if (kind === 'fx-ripple' || kind === 'fx-rune') {
    c.strokeStyle = '#fff';
    c.lineWidth = kind === 'fx-rune' ? 2 : 5;
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = 1 - i * 0.3;
      c.beginPath();
      c.arc(128, 128, 110 - i * 9, i * 2, tau + i * 2 - (kind === 'fx-ripple' ? 0.6 : 0.08));
      c.stroke();
    }
    c.globalAlpha = 0.85;
    if (kind === 'fx-rune')
      for (let i = 0; i < 12; i++) {
        c.save();
        c.translate(128, 128);
        c.rotate((i * tau) / 12);
        c.strokeRect(77, -4, 6, 8);
        c.beginPath();
        c.moveTo(87, 0);
        c.lineTo(98, 0);
        c.stroke();
        c.restore();
      }
  } else if (kind === 'fx-smoke') {
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39996,
        r = 12 + (i % 5) * 10,
        x = 128 + Math.cos(a) * r,
        y = 128 + Math.sin(a) * r;
      const g = c.createRadialGradient(x - 10, y - 12, 4, x, y, 58);
      g.addColorStop(0, '#ffffff70');
      g.addColorStop(0.65, '#ffffff48');
      g.addColorStop(1, '#ffffff00');
      c.fillStyle = g;
      c.fillRect(x - 60, y - 60, 120, 120);
    }
  } else if (kind === 'fx-crack') {
    c.strokeStyle = '#fff';
    c.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      c.save();
      c.translate(128, 128);
      c.rotate((i * tau) / 8);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(28, 9);
      c.lineTo(57, -7);
      c.lineTo(71, 12);
      c.lineTo(119, 2);
      c.stroke();
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(57, -7);
      c.lineTo(80, -34);
      c.stroke();
      c.restore();
    }
  } else if (kind === 'fx-droplet') {
    const g = c.createLinearGradient(30, 0, 225, 0);
    g.addColorStop(0, '#ffffff00');
    g.addColorStop(0.65, '#ffffff80');
    g.addColorStop(1, '#ffffffff');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(5, 128);
    c.bezierCurveTo(128, 100, 220, 38, 240, 122);
    c.bezierCurveTo(245, 191, 163, 165, 5, 128);
    c.fill();
    c.strokeStyle = '#fff';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(205, 124, 23, 3.8, 5.9);
    c.stroke();
  } else if (kind === 'fx-void') {
    c.fillStyle = gradient([
      [0, '#ffffffff'],
      [0.68, '#ffffffff'],
      [0.8, '#ffffffc0'],
      [1, '#ffffff00'],
    ]);
    c.fillRect(0, 0, 256, 256);
  } else {
    c.fillStyle = gradient([
      [0, '#ffffffff'],
      [0.12, '#ffffffe0'],
      [0.35, '#ffffff35'],
      [1, '#ffffff00'],
    ]);
    c.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
