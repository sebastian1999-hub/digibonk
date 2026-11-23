import * as THREE from './vendor/three.module.js';

export function createChest(geo, free = false) {
  const group = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: free ? '#145953' : '#9c243c' });
  const trim = new THREE.MeshLambertMaterial({ color: free ? '#d6f4ee' : '#edb649' });
  const light = new THREE.MeshBasicMaterial({ color: free ? '#79ffe1' : '#ffc96c' });
  const aura = new THREE.MeshBasicMaterial({
    color: free ? '#50efd4' : '#efa84e',
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const add = (geometry, material, x, y, z, scale, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(...scale);
    mesh.castShadow = material === metal || material === trim;
    parent.add(mesh);
    return mesh;
  };
  const ring = add(geo.ring, aura, 0, 0.08, 0, [2.1, 2.1, 2.1]);
  ring.rotation.x = -Math.PI / 2;
  const body = new THREE.Group();
  group.add(body);
  add(geo.cube, metal, 0, 0.62, 0, [1.95, 1.16, 1.55], body);
  add(geo.cube, metal, 0, 1.31, 0, [2.07, 0.28, 1.67], body);
  add(geo.cube, trim, 0, 0.75, 0, [0.32, 1.45, 1.69], body);
  add(geo.cube, trim, 0, 0.75, 0, [2.09, 1.46, 0.28], body);
  add(geo.cube, light, 0, 1.18, 0, [2.08, 0.04, 1.68], body);
  for (const side of [-1, 1]) {
    const loop = add(geo.ring, trim, side * 0.32, 1.68, 0, [0.39, 0.2, 0.85], body);
    loop.rotation.z = side * 0.48;
    const tail = add(geo.cube, trim, side * 0.24, 1.49, 0.32, [0.2, 0.045, 0.68], body);
    tail.rotation.y = side * 0.52;
  }
  const seal = add(geo.gem, light, 0, 0.86, 0.87, [0.23, 0.29, 0.1], body);
  const core = add(geo.gem, light, 0, 1.62, 0, [0.19, 0.16, 0.18], body);
  const motes = [];
  if (free) {
    const halo = add(geo.ring, aura, 0, 1.9, 0, [0.85, 0.85, 0.85]);
    halo.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 7; i++) motes.push(add(geo.gem, light, 0, 0, 0, [0.055, 0.1, 0.055]));
    for (const x of [-1.13, 1.13]) add(geo.cube, light, x, 0.52, 0, [0.09, 0.8, 0.45], body);
    group.scale.setScalar(1.18);
  }
  group.userData.chest = {
    free,
    body,
    ring,
    core,
    seal,
    motes,
    materials: [metal, trim, light, aura],
  };
  return group;
}

export function animateChest(group, time) {
  const c = group.userData.chest;
  if (!c) return;
  const phase = time * 2 + group.position.x * 0.3;
  c.body.position.y = c.free ? 0.1 + Math.sin(phase) * 0.07 : 0;
  c.core.rotation.y = time;
  c.ring.rotation.z = time * 0.35;
  c.ring.scale.setScalar((c.free ? 2.25 : 2.1) + Math.sin(phase) * 0.1);
  for (const [i, mote] of c.motes.entries()) {
    const a = (i * Math.PI * 2) / c.motes.length + time * 0.35;
    mote.position.set(
      Math.cos(a) * 1.25,
      0.4 + ((time * 0.65 + i * 0.43) % 2.8),
      Math.sin(a) * 1.25,
    );
    mote.rotation.y = time + i;
  }
}

export function disposeChest(group) {
  for (const material of group.userData.chest?.materials || []) material.dispose();
}
