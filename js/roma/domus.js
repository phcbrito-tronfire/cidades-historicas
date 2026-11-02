// Peças prontas (modelos do Sketchfab, CC BY) que dão a Roma o que nenhuma caixa dá:
// · a domus no alto do Aventino — casa de família rica, com o átrio, o peristilo, o jardim e o templete; dá para
//   entrar e andar pelos cômodos (a colisão sai das próprias paredes do modelo);
// · a proa de travertino da Ilha Tiberina — a ilha foi revestida em forma de navio, com o obelisco como mastro.
import * as THREE from 'three';
import { sculptureInstance } from '../comum/sculptures.js';
import { addCircle } from '../comum/collision.js';
import { DOMUS, ISOLA, terrainHeight } from './terrain.js';

// paredes e colunas do modelo viram colisão: cada triângulo em pé (normal quase horizontal) que passe pela altura
// do corpo vira pontinhos de 0,35 m ao longo da sua base; um ponto por casinha de 0,5 m
function wallsToCollision(obj, y0, step = 0.5) {
  obj.updateMatrixWorld(true);
  const seen = new Set(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  let count = 0;
  const mark = (x, z) => { const k = Math.round(x / step) + ',' + Math.round(z / step); if (seen.has(k)) return; seen.add(k); addCircle(x, z, 0.32, y0 - 1, y0 + 3.2); count++; };
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry, pos = g.attributes.position, idx = g.index, tri = idx ? idx.count / 3 : pos.count / 3;
    for (let t = 0; t < tri; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); const len = n.length(); if (len < 1e-6) continue; n.divideScalar(len);
      if (Math.abs(n.y) > 0.35) continue; // chão, teto, telhado
      const lo = Math.min(a.y, b.y, c.y), hi = Math.max(a.y, b.y, c.y);
      if (hi < y0 + 0.6 || lo > y0 + 1.6) continue; // só o que bate na altura do corpo
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const L = Math.hypot(q.x - p.x, q.z - p.z), k = Math.max(1, Math.ceil(L / step));
        for (let i = 0; i <= k; i++) { const t2 = i / k; mark(p.x + (q.x - p.x) * t2, p.z + (q.z - p.z) * t2); }
      }
    }
  });
  return count;
}

export async function placeLandmarks(scene, city) {
  const S = city.spots;
  // a domus
  const d = await sculptureInstance('domus', 40);
  if (d.children.length) {
    const g = new THREE.Group(); g.position.set(DOMUS.x, DOMUS.y - 0.05, DOMUS.z); g.rotation.y = Math.PI / 2; g.add(d);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    const box = new THREE.Box3().setFromObject(g); g.position.y += DOMUS.y - box.min.y - 0.02; // o piso do modelo no terreiro
    city.domusWalls = wallsToCollision(g, DOMUS.y);
    S.domus = new THREE.Vector3(DOMUS.x, DOMUS.y, DOMUS.z + DOMUS.hd + 2);
  }
  // a proa de travertino na ponta da Ilha Tiberina (a ilha-navio)
  const t = await sculptureInstance('tiberina', ISOLA.b * 1.6);
  if (t.children.length) {
    const g = new THREE.Group(); const y = terrainHeight(ISOLA.x, ISOLA.z);
    g.position.set(ISOLA.x, y - 0.6, ISOLA.z); g.rotation.y = Math.atan2(-Math.cos(ISOLA.rot), -Math.sin(ISOLA.rot)); g.add(t);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
  }
}
