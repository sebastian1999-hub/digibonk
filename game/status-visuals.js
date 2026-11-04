import * as THREE from './vendor/three.module.js';
const priority = [
  'freeze',
  'shock',
  'root',
  'burn',
  'poison',
  'bleed',
  'wet',
  'curse',
  'fracture',
  'weaken',
  'chill',
];
export function drawEnemyStatuses(renderer, enemy, s, time) {
  const states = Object.entries(enemy.statuses || {})
    .filter(([id, v]) => v.left > 0 && window.DigibonkStatusRules.effects[id])
    .sort((a, b) => priority.indexOf(a[0]) - priority.indexOf(b[0]));
  if (enemy.slowLeft > 0 && !states.some(([id]) => id === 'chill'))
    states.push(['chill', { left: enemy.slowLeft, max: 3 }]);
  if (!states.length) return;
  const ground = window.DigibonkCore.heightAt(enemy.x, enemy.z, s.mapSeed),
    height = enemy.boss || enemy.finalBoss ? 8 : 3.5 + Math.max(0, enemy.stage) * 0.35,
    q = renderer.screen(enemy.x, ground + height, enemy.z);
  if (!q.visible) return;
  const c = renderer.fxCtx,
    shown = states.slice(0, 4),
    width = shown.length * 21;
  for (let i = 0; i < shown.length; i++) {
    const [id, state] = shown[i];
    window.DigibonkStatusIcons.draw(
      c,
      id,
      q.x - width / 2 + 10 + i * 21,
      q.y - 10,
      19,
      state.left / (state.max || 3),
    );
  }
  if (states.length > 4) {
    c.save();
    c.font = 'bold 10px Segoe UI';
    c.fillStyle = '#fff3cf';
    c.textAlign = 'center';
    c.fillText('+' + (states.length - 4), q.x + width / 2 + 10, q.y - 7);
    c.restore();
  }
  const a = renderer.attackEffects,
    x = enemy.x,
    z = enemy.z,
    phase = time * 3 + enemy.id,
    active = (id) => states.some(([key]) => key === id),
    floor = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  if (active('burn'))
    for (let i = 0; i < 2; i++)
      a.flame(
        x + Math.cos(phase + i * Math.PI) * 0.45,
        ground + 0.05,
        z + Math.sin(phase + i * Math.PI) * 0.45,
        0.4,
        time,
        enemy.id + i,
        false,
        'player',
        0.75,
      );
  if (active('poison')) {
    a.emit(
      'poison-status-cloud',
      'quad',
      'smoke',
      x,
      ground + 0.65,
      z,
      1.4,
      1.3,
      1,
      '#a0c75e',
      0.35,
      null,
      'player',
    );
    for (let i = 0; i < 2; i++)
      a.emit(
        'poison-status-bubbles',
        'quad',
        'bubble',
        x + Math.cos(phase + i * 3) * 0.4,
        ground + 0.3 + ((time + i * 0.4) % 1.2),
        z + Math.sin(phase + i * 3) * 0.4,
        0.17,
        0.17,
        1,
        '#c5ef8d',
        0.7,
        null,
        'player',
      );
  }
  if (active('freeze'))
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      a.emit(
        'frozen-crystals',
        'shard',
        null,
        x + Math.cos(angle) * 0.55,
        ground + 0.7,
        z + Math.sin(angle) * 0.55,
        0.15,
        1.2,
        0.15,
        '#b5f5ff',
        0.8,
        a.yaw(angle),
        'player',
      );
    }
  if (active('shock'))
    for (let i = 0; i < 3; i++) {
      const angle = phase + i * 2.1,
        from = new THREE.Vector3(
          x + Math.cos(angle) * 0.5,
          ground + 0.3,
          z + Math.sin(angle) * 0.5,
        ),
        to = new THREE.Vector3(
          x + Math.cos(angle + 0.8) * 0.5,
          ground + 1.4,
          z + Math.sin(angle + 0.8) * 0.5,
        );
      a.beam('paralysis-sparks', from, to, 0.025, '#fff2a2', 0.9, 'player');
    }
  if (active('wet'))
    for (let i = 0; i < 2; i++)
      a.emit(
        'wet-droplets',
        'sphere',
        null,
        x + Math.cos(phase + i * 3) * 0.45,
        ground + 1.3 - ((time + i * 0.5) % 1.1),
        z + Math.sin(phase + i * 3) * 0.45,
        0.055,
        0.11,
        0.055,
        '#8ae7ff',
        0.85,
        null,
        'player',
      );
  if (active('curse') || active('fracture'))
    a.emit(
      'hex-mark',
      'ring',
      null,
      x,
      ground + 0.13,
      z,
      0.7,
      0.7,
      0.7,
      active('curse') ? '#bf86eb' : '#f0afde',
      0.7,
      floor,
      'player',
    );
  if (active('bleed'))
    a.emit(
      'bleeding-drop',
      'shard',
      null,
      x + 0.3,
      ground + 1 - ((time * 0.9) % 1),
      z,
      0.06,
      0.17,
      0.06,
      '#ff788c',
      0.8,
      null,
      'player',
    );
  if (active('root'))
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.1;
      a.beam(
        'root-bindings',
        new THREE.Vector3(x + Math.cos(angle) * 0.6, ground, z + Math.sin(angle) * 0.6),
        new THREE.Vector3(
          x + Math.cos(angle + 0.5) * 0.3,
          ground + 1.2,
          z + Math.sin(angle + 0.5) * 0.3,
        ),
        0.07,
        '#a1bd6f',
        0.85,
        'player',
      );
    }
}

export function warmStatusVisuals(a) {
  a.begin();
  for (const [name, geometry, texture] of [
    ['poison-status-cloud', 'quad', 'smoke'],
    ['poison-status-bubbles', 'quad', 'bubble'],
    ['frozen-crystals', 'shard', null],
    ['paralysis-sparks', 'beam', null],
    ['wet-droplets', 'sphere', null],
    ['hex-mark', 'ring', null],
    ['bleeding-drop', 'shard', null],
    ['root-bindings', 'beam', null],
  ])
    a.emit(name, geometry, texture, 0, 0, 0, 1, 1, 1, '#ffffff', 0);
  a.finish();
}
