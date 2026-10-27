// Fogo para as noites de Atenas: postes de madeira com braseiro de ferro ao longo das ruas, em volta da ágora, no
// cais do porto, no caminho da Acrópole, no teatro, na Pnyx e nas ilhas. (Atenas não tinha iluminação pública:
// à noite se andava com tochas e lamparinas; os braseiros aqui marcam os lugares por onde o povo passava.)
import * as THREE from 'three';
import { addCircle, blocked, groundAt, terrainAt, waterAt } from '../comum/collision.js';
import { STREETS } from './ruas.js';
import { AGORA, THEATER, BEMA, coastPoint } from './terrain.js';

const V3 = THREE.Vector3;

export function addTorches(B, M, out) {
  const S = out.spots, seen = [];
  const post = (x, z, { tall = 2.2, force = false } = {}) => {
    const y = groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6);
    if (!force && (blocked(x, z, y, 0.4, 2) || waterAt(x, z) > y - 0.2)) return;
    if (seen.some(([a, b]) => (a - x) ** 2 + (b - z) ** 2 < 64)) return; // nada de dois postes colados
    seen.push([x, z]);
    B.geo(new THREE.CylinderGeometry(0.07, 0.09, tall, 6), M.darkWood || M.wood, x, y + tall / 2, z);
    B.geo(new THREE.CylinderGeometry(0.24, 0.12, 0.2, 10, 1, true), M.bronze, x, y + tall + 0.05, z, { uv: false });
    addCircle(x, z, 0.16, y - 1, y + tall);
    out.torches.push(new V3(x, y + tall + 0.15, z));
  };
  // ruas: a cada ~30 m, alternando os dois lados, a 4 m do eixo
  for (const line of STREETS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let d = 12, k = 0; d < L; d += 30, k++) { const t = d / L, s = k % 2 ? 1 : -1; post(ax + (bx - ax) * t + nx * 4.2 * s, az + (bz - az) * t + nz * 4.2 * s); }
    }
  }
  // ágora: em volta da praça
  { const A = AGORA, x0 = A.x - A.hw + 5, x1 = A.x + A.hw - 5, z0 = A.z - A.hd + 5, z1 = A.z + A.hd - 5;
    for (let x = x0; x <= x1; x += 24) { post(x, z0); post(x, z1); }
    for (let z = z0 + 24; z < z1; z += 24) { post(x0, z); post(x1, z); } }
  // cais do porto
  for (let a = -300; a <= -150; a += 16) { const p = coastPoint(a, -6); post(p.x, p.z); }
  // praia do Falero (junto às cabanas dos pescadores)
  for (let a = 40; a <= 140; a += 25) { const p = coastPoint(a, -14); post(p.x, p.z); }
  // Acrópole: dos Propileus ao Parthenon e em volta do grande altar
  for (const [x, z] of [[-132, -6], [-132, 6], [-96, -6], [-96, 6], [-80, 10], [-62, -14], [-40, 8], [-18, -10], [0, 8], [-10, -40], [40, -16], [40, 34], [70, 0]]) post(x, z);
  // teatro de Dioniso: em volta da orquestra; odeon; Pnyx
  for (let i = 0; i < 6; i++) { const a = -1 + (i / 5) * 2; post(THEATER.x + Math.sin(a) * (THEATER.r0 + 1.5), THEATER.z + Math.cos(a) * (THEATER.r0 + 1.5)); }
  for (const [dx, dz] of [[-6, -8], [6, -8], [-10, 4], [10, 4]]) post(BEMA.x + dx, BEMA.z + dz);
  // ilhas: aldeia de Salamina, gruta de Eurípides, troféu e o santuário de Pã em Psitália
  if (out.islandVillage) { const v = out.islandVillage; for (let i = 0; i < 4; i++) post(v[0] + (v[1] - v[0]) * (0.15 + i * 0.23), (v[2] + v[3]) / 2 + (i % 2 ? 4 : -4)); }
  if (S.euripides) post(S.euripides.x + 1.6, S.euripides.z + 1.6, { tall: 1.4 });
  if (S.tropaion) { post(S.tropaion.x + 2, S.tropaion.z + 2); post(S.tropaion.x - 4, S.tropaion.z - 1); }
  if (S.pan) post(S.pan.x + 3, S.pan.z + 1, { tall: 1.4 });
  if (S.ajax) post(S.ajax.x + 1, S.ajax.z + 3);
}
