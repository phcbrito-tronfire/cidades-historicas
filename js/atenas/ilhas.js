// As ilhas do golfo, aonde se chega de barco (ou nadando, para quem tem fôlego):
// · Psitália: ilhota de pedra diante do Pireu. Na batalha de Salamina (480 a.C.) Xerxes pôs ali tropas para matar
//   os gregos que naufragassem; Aristides desembarcou hoplitas atenienses e as destruiu. Pausânias viu na ilha
//   "imagens de madeira de Pã, toscamente talhadas" — o deus que espalhou o pânico entre os persas.
// · Salamina, ponta de Cinosura: o troféu (tropaion) da vitória sobre a frota persa e o santuário de Ájax, o herói
//   da ilha; uma aldeia de pescadores, oliveiras e cabras.
import * as THREE from 'three';
import { ISLANDS, terrainHeight, WATER_Y } from './terrain.js';
import { addBox, addCircle } from '../comum/collision.js';
import { mulberry32 } from '../comum/util.js';

const V3 = THREE.Vector3;

export function buildIslands(B, M, out) {
  const R = mulberry32(5150), S = out.spots;
  const ty = (x, z) => terrainHeight(x, z);
  const [P, SA] = ISLANDS;
  const onIsland = (I, k = 0.7) => { for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * k; const c = Math.cos(I.rot), s = Math.sin(I.rot); const u = Math.cos(a) * d * I.rx, v = Math.sin(a) * d * I.rz; const x = I.x + u * c - v * s, z = I.z + u * s + v * c; if (ty(x, z) > WATER_Y + 1.2) return [x, z]; } return null; };
  // pedras soltas (as duas ilhas são de calcário)
  const rockG = new THREE.IcosahedronGeometry(1, 1); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const v = new V3().fromBufferAttribute(p, i), k = 0.75 + Math.sin(v.x * 3 + v.z * 2) * 0.15; p.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k); } rockG.computeVertexNormals(); }
  const rock = (x, z, s) => { const y = ty(x, z); B.geo(rockG, M.rock, x, y - s * 0.3, z, { rx: R() * 3, ry: R() * 3, sx: s * (0.8 + R() * 0.6), sy: s, sz: s * (0.8 + R() * 0.5), uv: { s: 3 } }); if (s > 0.9) addCircle(x, z, s * 0.8, y - 2, y + s); };
  for (const I of ISLANDS) for (let i = 0; i < (I === P ? 45 : 70); i++) { const q = onIsland(I, 0.95); if (q) rock(q[0], q[1], 0.4 + R() * R() * 2.6); }

  // ---------------- Psitália: santuário rústico de Pã e restos da batalha ----------------
  {
    const x = P.x + 6, z = P.z - 4, y = ty(x, z);
    // recinto de pedras secas e três imagens de madeira de Pã (troncos talhados com cabeça e chifres)
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; rock(x + Math.cos(a) * 5, z + Math.sin(a) * 4, 0.55); }
    for (let i = 0; i < 3; i++) {
      const px = x - 1.6 + i * 1.6, pz = z + 0.5, py = ty(px, pz);
      B.geo(new THREE.CylinderGeometry(0.2, 0.26, 1.9, 8), M.wood, px, py + 0.95, pz);
      B.geo(new THREE.SphereGeometry(0.24, 10, 8), M.wood, px, py + 2.05, pz);
      for (const s of [-1, 1]) B.geo(new THREE.ConeGeometry(0.05, 0.32, 6), M.darkWood, px + s * 0.13, py + 2.33, pz, { rz: -s * 0.5 });
      addCircle(px, pz, 0.3, py - 1, py + 2.3);
    }
    B.box(M.poros, 1.2, 0.7, 0.8, x, y, z - 2.2); addBox(x, z - 2.2, 1.2, 0.8, y - 1, y + 0.7); // altarzinho
    S.pan = new V3(x, y, z - 4);
    S.aminias = new V3(x + 2.2, ty(x + 2.2, z - 3), z - 3); // o veterano, diante do altar de Pã
    out.islandGoats = [[P.x - 14, P.z + 4, 3]];
    // escudos de vime persas e flechas espalhados entre as pedras da praia
    for (let i = 0; i < 6; i++) { const q = onIsland(P, 0.9); if (!q) continue; const [qx, qz] = q, qy = ty(qx, qz); B.geo(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 14), M.wicker || M.wood, qx, qy + 0.04, qz, { rx: 0.2, rz: R() * 0.4 }); }
    S.psitalia = new V3(P.x, ty(P.x, P.z), P.z);
    S.psitaliaArt = new V3(P.x - 12, 0, P.z + 6);
  }

  // ---------------- Salamina: troféu da vitória, santuário de Ájax e aldeia de pescadores ----------------
  {
    // troféu: coluna de mármore com a panóplia (elmo, couraça e escudo) pendurada num tronco, no alto do cabo
    const c = Math.cos(SA.rot), s = Math.sin(SA.rot), W = (u, v) => [SA.x + u * c - v * s, SA.z + u * s + v * c];
    const [tx, tz] = W(10, -70), y = ty(tx, tz);
    B.box(M.marble, 3.6, 0.5, 3.6, tx, y - 0.1, tz); B.box(M.marble, 2.6, 0.6, 2.6, tx, y + 0.4, tz);
    B.geo(new THREE.CylinderGeometry(0.42, 0.48, 6.5, 20), M.colMarble, tx, y + 1 + 3.25, tz);
    B.geo(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8), M.wood, tx, y + 7.5 + 1.1, tz); B.box(M.wood, 1.6, 0.12, 0.12, tx, y + 8.6, tz);
    B.geo(new THREE.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M.bronze, tx, y + 9.55, tz); // elmo
    B.box(M.bronze, 0.75, 0.9, 0.4, tx, y + 8.0, tz); // couraça
    B.geo(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20), M.bronze, tx + 0.65, y + 8.4, tz, { rz: Math.PI / 2 }); // escudo
    addBox(tx, tz, 3.6, 3.6, y - 1, y + 1);
    S.tropaion = new V3(tx + 3, y, tz);
    // santuário de Ájax: templo pequeno de duas colunas in antis (aqui sem modelo, em blocos)
    const [ax, az] = W(-22, -12), ay = ty(ax, az);
    B.box(M.marble, 9, 0.6, 6, ax, ay - 0.2, az); addBox(ax, az, 9, 6, ay - 2, ay + 0.4);
    for (const [w, d, ox, oz] of [[7, 0.6, 0, 2.6], [7, 0.6, 0, -2.6], [0.6, 5.8, -3.2, 0]]) { B.box(M.marbleWall, w, 4, d, ax + ox, ay + 0.4, az + oz); addBox(ax + ox, az + oz, w, d, ay, ay + 4.4); }
    for (const oz of [-1.2, 1.2]) { B.geo(new THREE.CylinderGeometry(0.3, 0.35, 4, 16), M.colMarble, ax + 3.6, ay + 0.4 + 2, az + oz); addCircle(ax + 3.6, az + oz, 0.35, ay, ay + 4.4); }
    B.box(M.marble, 9.4, 0.6, 6.4, ax, ay + 4.4, az); B.box(M.roofTiles || M.tiles, 9.6, 0.3, 6.6, ax, ay + 5, az);
    B.box(M.darkWood, 0.7, 2.2, 0.5, ax - 2.4, ay + 0.4, az); // a estátua de ébano de Ájax (Pausânias)
    S.ajax = new V3(ax + 6, ay, az);
    // aldeia: cabanas de pedra com telhado de palha, redes secando e barcos puxados na areia
    for (let i = 0; i < 6; i++) {
      const [hx, hz] = W(-45 + i * 9, 55 + (i % 2) * 8), hy = ty(hx, hz); if (hy < 1.5) continue;
      B.box(M.plasterOchre || M.plaster, 4, 2.4, 3.2, hx, hy - 0.2, hz, { ry: SA.rot }); B.box(M.thatch || M.wood, 4.4, 0.4, 3.6, hx, hy + 2.2, hz, { ry: SA.rot });
      addBox(hx, hz, 4.2, 4.2, hy - 1, hy + 2.6);
    }
    S.salamina = new V3(SA.x, ty(SA.x, SA.z), SA.z);
    // gruta de Eurípides: boca de pedra na encosta, com banco, mesinha e rolos de papiro (a "gruta de Eurípides"
    // foi achada de verdade no sul de Salamina, com um vaso com o nome dele)
    {
      const [gx, gz] = W(55, 25), gy = ty(gx, gz), ry = Math.atan2(SA.x - gx, SA.z - gz) + Math.PI; // de costas para o centro da ilha
      const k = new THREE.Group(); k.position.set(gx, gy, gz); k.rotation.y = ry;
      const rm = M.rock;
      for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; const rk = new THREE.Mesh(rockG, rm); rk.position.set(Math.cos(a) * 3.2, Math.sin(a) * 2.6, -1.2); rk.scale.set(1.5, 1.4, 1.8); k.add(rk); }
      const back = new THREE.Mesh(rockG, rm); back.position.set(0, 1.2, -3.2); back.scale.set(3.6, 2.6, 1.6); k.add(back);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.5), M.poros); bench.position.set(-1.1, 0.22, -1.6); k.add(bench);
      const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), M.wood); table.position.set(0.8, 0.35, -1.7); k.add(table);
      for (let i = 0; i < 5; i++) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), M.linen || M.plaster); sc.rotation.z = Math.PI / 2; sc.position.set(0.55 + (i % 3) * 0.18, 0.75 + Math.floor(i / 3) * 0.1, -1.7 + (i % 2) * 0.12); k.add(sc); }
      k.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      (out.extra ||= []).push(k);
      k.updateMatrixWorld(true);
      const loc = (lx, lz) => new V3(lx, 0, lz).applyMatrix4(k.matrixWorld);
      for (const [lx, lz, r] of [[-3.2, -1.2, 1.4], [3.2, -1.2, 1.4], [0, -3.2, 2.2], [-2.3, -0.4, 1], [2.3, -0.4, 1]]) { const w = loc(lx, lz); addCircle(w.x, w.z, r, gy - 2, gy + 4); }
      const e = loc(-0.4, 0.4); S.euripides = new V3(e.x, gy, e.z); S.euripidesRy = ry;
    }
    out.islandVillage = (() => { const a = W(-50, 50), b = W(10, 68); return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])]; })();
    out.islandGoats.push([SA.x - 20, SA.z - 20, 6], [SA.x + 25, SA.z + 40, 5]);
    S.salaminaArt = new V3(...[ax + 4.5, 0, az]);
    // oliveiras e ciprestes
    out.trees = out.trees || [];
    for (let i = 0; i < 40; i++) { const q = onIsland(SA, 0.8); if (q) out.trees.push({ kind: R() < 0.7 ? 'oliveira' : 'cipreste', x: q[0], z: q[1] }); }
    for (let i = 0; i < 4; i++) { const q = onIsland(P, 0.6); if (q) out.trees.push({ kind: 'pinheiro', x: q[0], z: q[1] }); }
  }
  // zonas (nome do lugar e objetivos)
  const zone = (I) => [I.x - Math.max(I.rx, I.rz) * 1.1, I.x + Math.max(I.rx, I.rz) * 1.1, I.z - Math.max(I.rx, I.rz) * 1.1, I.z + Math.max(I.rx, I.rz) * 1.1];
  out.zones.psitalia = zone(P); out.zones.salamina = zone(SA);
}
