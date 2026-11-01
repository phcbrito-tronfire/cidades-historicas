// Naumaquia de Trajano (inaugurada em 109 d.C., além do Tibre, perto do Vaticano): um lago oval cavado de propósito,
// com arquibancadas de madeira em volta. Nos dias de batalha naval duas frotas de "trirremes" (tripuladas por
// prisioneiros) encenam uma batalha famosa; nos outros dias o lago fica calmo.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { addCircle } from '../comum/collision.js';
import { sculptureInstance } from '../comum/sculptures.js';
import { NAUMACHIA, terrainHeight } from './terrain.js';
import { rand, pick, rr, angleLerp } from '../comum/util.js';

export function buildNaumachia(scene, M, crowdGeo, crowdMat) {
  const N = NAUMACHIA, B = new Batcher(), TAU = Math.PI * 2;
  const P = (d, th) => [N.x + (N.a + d) * Math.cos(th), N.z + (N.b + d) * Math.sin(th)];
  // arquibancada de madeira: 8 degraus subindo para fora, em volta do lago (com 4 aberturas para entrar)
  const seats = [];
  for (let k = 0; k < 8; k++) {
    const d = 4 + k * 1.3, y = 3.2 + k * 0.7;
    for (let i = 0; i < 96; i++) {
      const th = (i / 96) * TAU; if (i % 24 < 2) continue;
      const [x0, z0] = P(d, th), [x1, z1] = P(d, th + TAU / 96), len = Math.hypot(x1 - x0, z1 - z0) + 0.1;
      B.box(M.wood, len, 0.25, 1.3, (x0 + x1) / 2, y - 0.25, (z0 + z1) / 2, { ry: Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2 });
      B.box(M.darkWood, 0.25, y - terrainHeight(x0, z0) + 0.3, 0.25, x0, terrainHeight(x0, z0) - 0.3, z0);
      for (let s = 0; s < 3; s++) if (rand() < 0.7) { const u = (s + 0.5) / 3, [sx, sz] = P(d, th + (u * TAU) / 96); seats.push([sx, y, sz]); }
      if (k === 7 && i % 4 === 0) addCircle(x0, z0, 0.6, 0, y + 1);
    }
  }
  // mastros com bandeiras vermelhas em volta
  for (let i = 0; i < 24; i++) { const th = (i / 24) * TAU, [x, z] = P(15, th), y = terrainHeight(x, z); B.box(M.darkWood, 0.25, 9, 0.25, x, y, z); B.box(M.plasterRed, 0.05, 1.2, 1.8, x, y + 7.4, z + 0.9); }
  B.build(scene);
  // público instanciado (o mesmo da arena)
  const im = new THREE.InstancedMesh(crowdGeo, crowdMat, seats.length), d3 = new THREE.Object3D(), col = new THREE.Color();
  seats.forEach(([x, y, z], i) => { d3.position.set(x, y, z); d3.updateMatrix(); im.setMatrixAt(i, d3.matrix); im.setColorAt(i, col.set(pick([0xefe8d8, 0xb0402c, 0xc8a050, 0x3a5a8a, 0x6a7a4a, 0xe4dccb]))); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.visible = false;
  scene.add(im);
  // as duas frotas: dois navios de cada lado, dando voltas e se cruzando no meio do lago
  const ships = [];
  const mk = (side, j) => sculptureInstance('trirreme', 24).then((o) => {
    const g = new THREE.Group(); o.position.y = -0.8; g.add(o); g.visible = false; scene.add(g);
    ships.push({ g, side, j, ph: rand() * TAU, h: 0 });
  });
  for (const side of [0, 1]) for (let j = 0; j < 2; j++) mk(side, j);
  return {
    seats: seats.length,
    update(dt, t, player, active) {
      const near = Math.hypot(player.pos.x - N.x, player.pos.z - N.z) < 320;
      im.visible = near && active;
      for (const s of ships) {
        s.g.visible = near && active; if (!s.g.visible) continue;
        // cada frota faz um oito: as duas se cruzam no centro (é ali que "abalroam" e a plateia vibra)
        const sp = 0.06 + s.j * 0.01, th = t * sp * (s.side ? 1 : -1) + s.ph;
        const x = N.x + Math.sin(th) * (N.a - 22), z = N.z + Math.sin(th * 2) * (N.b - 24) * 0.5 * (s.side ? 1 : -1) + (s.j - 0.5) * 10;
        const nx = N.x + Math.sin(th + 0.02 * (s.side ? 1 : -1)) * (N.a - 22), nz = N.z + Math.sin((th + 0.02 * (s.side ? 1 : -1)) * 2) * (N.b - 24) * 0.5 * (s.side ? 1 : -1) + (s.j - 0.5) * 10;
        s.h = angleLerp(s.h, Math.atan2(-(nz - z), nx - x), Math.min(1, dt * 2));
        s.g.position.set(x, Math.sin(t * 1.1 + s.ph) * 0.05, z); s.g.rotation.set(Math.sin(t * 0.8 + s.ph) * 0.02, s.h, 0);
      }
    },
  };
}
