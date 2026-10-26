// Visão debaixo d'água (mergulho): neblina curta da cor da água, a superfície vista por baixo (prateada, com a luz
// do sol atravessando), bolhas saindo do explorador e a imagem tingida e ondulando (post.js).
import * as THREE from 'three';
import { waterAt } from './collision.js';

export function makeUnderwater(scene, water, { color = 0x1d6f78, near = 0.5, far = 28 } = {}) {
  // a superfície vista de baixo: o Water só desenha a face de cima
  const under = new THREE.Mesh(water.geometry, new THREE.MeshBasicMaterial({ color: 0x9fd8d8, transparent: true, opacity: 0.75, side: THREE.BackSide, depthWrite: false, fog: true }));
  under.rotation.copy(water.rotation); under.position.copy(water.position);
  under.visible = false; under.layers.set(1);
  scene.add(under);
  // bolhas
  const N = 60, pos = new Float32Array(N * 3), life = new Float32Array(N);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const bubbles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe8ffff, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
  bubbles.frustumCulled = false; bubbles.layers.set(1); scene.add(bubbles);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -1000;
  let bi = 0, bubT = 0, saved = null, k = 0;
  const fogCol = new THREE.Color(color);
  return {
    // k (0..1) = quanto a câmera está submersa; aplicado à neblina da cena e ao tom da imagem
    update(dt, camera, player) {
      const wl = waterAt(camera.position.x, camera.position.z);
      const below = camera.position.y < wl - 0.05;
      k = below ? 1 : 0;
      under.visible = below;
      if (below && !saved && scene.fog) saved = { c: scene.fog.color.clone(), n: scene.fog.near, f: scene.fog.far };
      if (below && scene.fog) { scene.fog.color.copy(fogCol); scene.fog.near = near; scene.fog.far = far; }
      if (!below && saved && scene.fog) { scene.fog.color.copy(saved.c); scene.fog.near = saved.n; scene.fog.far = saved.f; saved = null; }
      // bolhas da respiração (e mais quando nada rápido)
      if (player.diving) {
        bubT -= dt * (1.5 + player.speed);
        if (bubT <= 0) {
          bubT = 1;
          const h = player.rig.bones.Head; const v = new THREE.Vector3(); if (h) h.getWorldPosition(v); else v.copy(player.pos);
          for (let j = 0; j < 3; j++) { const i = bi++ % N; pos[i * 3] = v.x + (Math.random() - 0.5) * 0.1; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z + (Math.random() - 0.5) * 0.1; life[i] = 4; }
        }
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        pos[i * 3 + 1] += dt * 0.9; pos[i * 3] += Math.sin(life[i] * 9 + i) * dt * 0.05;
        if (pos[i * 3 + 1] > waterAt(pos[i * 3], pos[i * 3 + 2]) - 0.02 || life[i] <= 0) { life[i] = 0; pos[i * 3 + 1] = -1000; }
      }
      geo.attributes.position.needsUpdate = true;
      return k;
    },
    get amount() { return k; },
  };
}
