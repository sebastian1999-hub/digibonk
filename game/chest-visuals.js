import * as THREE from './vendor/three.module.js';

export function createChest(geo, free = false) {
  const group = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: free ? '#183a52' : '#3c3046' });
  const trim = new THREE.MeshLambertMaterial({ color: '#efbf63' });
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
  add(geo.cube, metal, 0, 0.62, 0, [1.9, 1.05, 1.3], body);
  add(geo.cube, trim, 0, 0.15, 0, [2.04, 0.18, 1.44], body);
  add(geo.cube, trim, 0, 1.12, 0, [2.04, 0.16, 1.44], body);
  add(geo.cube, metal, 0, 1.32, 0, [1.96, 0.3, 1.38], body);
  add(geo.cube, light, 0, 1.19, 0, [1.92, 0.055, 1.36], body);
  for (const x of [-0.76, 0.76]) {
    add(geo.cube, trim, x, 0.77, 0, [0.16, 1.28, 1.47], body);
    for (const z of [-0.74, 0.74]) add(geo.cube, light, x, 0.69, z, [0.09, 0.39, 0.035], body);
  }
  add(geo.cube, trim, 0, 0.83, 0.77, [0.57, 0.62, 0.18], body);
  const seal = add(geo.gem, light, 0, 0.86, 0.91, [0.23, 0.29, 0.13], body);
  for (const z of [-0.45, 0.45]) add(geo.cube, trim, 0, 1.51, z, [1.8, 0.08, 0.12], body);
  const core = add(geo.gem, light, 0, free ? 2.15 : 1.92, 0, [0.3, 0.42, 0.3]);
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
  c.core.position.y = (c.free ? 2.15 : 1.92) + Math.sin(phase) * 0.12;
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
