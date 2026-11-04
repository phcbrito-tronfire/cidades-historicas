// Ânfora romana (tipo Dressel 20/2-4): feita no torno — pé em ponta, bojo, ombro, gargalo e boca — com as duas alças.
// As de transporte não ficam de pé sozinhas: no cais e nos armazéns iam deitadas em pilhas, ou encostadas umas nas outras.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let GEO = null;
export function amphoraGeo() { // 0,8 m de altura, com o pé em y = 0 (de pé, eixo y)
  if (GEO) return GEO;
  const prof = [[0, 0], [0.025, 0.02], [0.04, 0.08], [0.1, 0.2], [0.15, 0.34], [0.165, 0.45], [0.15, 0.55], [0.1, 0.62], [0.055, 0.66], [0.05, 0.74], [0.065, 0.78], [0.06, 0.8], [0.0, 0.8]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(prof, 14);
  const parts = [body];
  for (const s of [-1, 1]) { const h = new THREE.TorusGeometry(0.06, 0.013, 5, 10, Math.PI); h.rotateY(s > 0 ? 0 : Math.PI); h.rotateZ(-Math.PI / 2 * s); h.translate(s * 0.07, 0.68, 0); parts.push(h); }
  GEO = mergeGeometries(parts.map((g) => g.toNonIndexed()).map((g) => { g.deleteAttribute('uv'); return g; }));
  GEO.computeVertexNormals(); return GEO;
}
// pilha de ânforas deitadas (fileiras cruzadas, as de cima no vão das de baixo); y = chão; ry = direção da pilha
export function amphoraPile(B, mat, x, y, z, ry = 0, n = 3, rows = 2) {
  const g = amphoraGeo(), c = Math.cos(ry), s = Math.sin(ry);
  for (let r = 0; r < rows; r++) for (let i = 0; i < n - r; i++) {
    const u = (i - (n - r - 1) / 2) * 0.34, yy = y + 0.16 + r * 0.28, flip = (i + r) % 2 ? Math.PI : 0;
    B.geo(g, mat, x + u * c, yy, z - u * s, { rz: Math.PI / 2, ry: ry + Math.PI / 2 + flip, uv: false });
  }
}
// duas ou três encostadas (de pé, inclinadas umas nas outras, com o pé enterrado um pouco)
export function amphoraLean(B, mat, x, y, z, ry = 0) {
  const g = amphoraGeo();
  for (let k = 0; k < 3; k++) { const a = ry + (k / 3) * Math.PI * 2; B.geo(g, mat, x + Math.sin(a) * 0.13, y - 0.04, z + Math.cos(a) * 0.13, { rx: Math.cos(a) * 0.22, rz: -Math.sin(a) * 0.22, uv: false }); }
}
