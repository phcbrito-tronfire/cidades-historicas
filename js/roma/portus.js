// Portus de Trajano: a bacia hexagonal (cada lado com ~54 m aqui; a de verdade tinha 358 m) escavada entre 100 e
// 112 d.C. ao lado do porto de Cláudio, ligada ao mar por um canal. Cais de travertino com os frades de amarração,
// armazéns (horrea) de tijolo em volta para o trigo do Egito e da África, guindastes de roda e pilhas de ânforas.
// Aqui ficam atracadas a quadrirreme que o explorador pode comandar e a liburna da frota de Miseno.
import * as THREE from 'three';
import { addBox, addCircle, addRotBox } from '../comum/collision.js';
import { roofHalf } from '../atenas/arquitetura.js';
import { mat4 } from '../comum/batcher.js';
import { terrainHeight, PORTUS } from './terrain.js';
import { rr, rand } from '../comum/util.js';
import { amphoraPile, amphoraLean } from './anfora.js';

const V3 = THREE.Vector3;
const TX = 0.69, TZ = 0.72, NX = -0.72, NZ = 0.69;
const W = (u, v) => ({ x: PORTUS.x + u * TX + v * NX, z: PORTUS.z + u * TZ + v * NZ }); // local (u ao longo da costa, v para o mar) → mundo
const yawOf = (du, dv) => Math.atan2(du * TX + dv * NX, du * TZ + dv * NZ);

export function buildPortus(B, M, out) {
  const S = out.spots, R = PORTUS.R, Rin = R * 0.866, TOP = 1.4, BOT = -5.2;
  const verts = [[R, 0], [R / 2, Rin], [-R / 2, Rin], [-R, 0], [-R / 2, -Rin], [R / 2, -Rin]];
  // cais: as paredes de cada lado do hexágono (no lado do mar, a boca do canal fica aberta)
  const wall = (u0, v0, u1, v1, gap) => {
    const L = Math.hypot(u1 - u0, v1 - v0), n = Math.ceil(L / 3), ry = yawOf(u1 - u0, v1 - v0);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t;
      if (gap && Math.abs(u) < 13) continue;
      const p = W(u, v);
      B.box(M.travertine, 2.6, TOP - BOT, L / n + 0.05, p.x, BOT, p.z, { ry });
      B.box(M.travertine2, 2.9, 0.3, L / n + 0.05, p.x, TOP - 0.3, p.z, { ry }); // borda do cais
      addCircle(p.x, p.z, 1.5, BOT - 1, TOP);
      if (k % 4 === 2) { const q = W(u * 0.97, v * 0.97); B.geo(new THREE.CylinderGeometry(0.3, 0.38, 0.9, 10), M.travertine2, q.x, TOP + 0.45, q.z); } // frade de amarração
    }
  };
  for (let i = 0; i < 6; i++) { const [u0, v0] = verts[i], [u1, v1] = verts[(i + 1) % 6]; wall(u0 * 1.03, v0 * 1.03, u1 * 1.03, v1 * 1.03, i === 1); }
  // o canal até o mar, com as paredes dos dois lados
  for (const s of [-1, 1]) for (let v = Rin + 2; v < 150; v += 3) {
    const p = W(s * 14.5, v); if (terrainHeight(p.x, p.z) < -4 && v > 100) break;
    B.box(M.travertine, 2.6, TOP - BOT, 3.05, p.x, BOT, p.z, { ry: yawOf(0, 1) }); B.box(M.travertine2, 2.9, 0.3, 3.05, p.x, TOP - 0.3, p.z, { ry: yawOf(0, 1) }); addCircle(p.x, p.z, 1.5, BOT - 1, TOP);
  }
  // o chão do cais em volta da bacia (calçamento de travertino) — uma faixa larga sobre o terreno
  for (let i = 0; i < 6; i++) {
    const [u0, v0] = verts[i], [u1, v1] = verts[(i + 1) % 6], L = Math.hypot(u1 - u0, v1 - v0), ry = yawOf(u1 - u0, v1 - v0);
    const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, k = 1 + 9 / Rin, p = W(mu * k, mv * k);
    if (i === 1) { for (const s of [-1, 1]) { const q = W(s * (R / 4 + 8), Rin + 9); B.box(M.travertine2, 15, 0.35, 16, q.x, TOP - 0.35, q.z, { ry }); } }
    else B.box(M.travertine2, 16, 0.35, L + 12, p.x, TOP - 0.35, p.z, { ry });
  }
  // armazéns (horrea) atrás do cais, nos lados de terra: longos, de tijolo, com portas em fila e telhado de telhas
  for (const i of [3, 4, 5, 2]) {
    const [u0, v0] = verts[i], [u1, v1] = verts[(i + 1) % 6], ry = yawOf(u1 - u0, v1 - v0);
    const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, k = 1 + 30 / Rin, c = W(mu * k, mv * k), y = Math.max(terrainHeight(c.x, c.z), TOP) - 0.3, L = 46, D = 16, H = 8;
    const F = mat4(c.x, y, c.z, 0, ry - Math.PI / 2, 0), box = (m, w, h, d, x, yy, z) => B.box(m, w, h, d, x, yy, z, { frame: F });
    { let lo = y; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const p = new THREE.Vector3(a * L / 2, 0, b * D / 2).applyMatrix4(F); lo = Math.min(lo, terrainHeight(p.x, p.z)); } // o embasamento: desce até o chão do lado mais baixo
      if (y - lo > 0.05) box(M.travertine, L + 0.3, y - lo + 0.4, D + 0.3, 0, lo - y - 0.4, 0); }
    box(M.brick, L, H, D, 0, 0, 0); box(M.travertine, L + 0.4, 0.3, D + 0.4, 0, H, 0);
    for (let j = 0; j < 9; j++) { box(M.dark, 2.2, 3.4, 0.08, -L / 2 + 2.6 + j * 5.1, 0, D / 2 + 0.03); box(M.travertine, 2.8, 0.35, 0.2, -L / 2 + 2.6 + j * 5.1, 3.4, D / 2 + 0.08); }
    for (const s of [-1, 1]) B.geo(roofHalf(L + 0.8, D / 2 + 0.6, 2.2), M.tiles, 0, 0, 0, { frame: F.clone().multiply(mat4(0, H + 0.3 + 2.2, 0, 0, s > 0 ? 0 : Math.PI, 0)) });
    addRotBox(c.x, c.z, L, D, ry - Math.PI / 2, y - 1, y + H + 2); // (a caixa reta em volta do armazém girado era parede invisível no cais)
    out.exclusions.push([c.x - 30, c.x + 30, c.z - 30, c.z + 30]);
    // ânforas empilhadas na frente
    for (let j = 0; j < 5; j++) { const t = (j - 2) * 6, q = W(mu * (1 + 14 / Rin) + t * (u1 - u0) / R, mv * (1 + 14 / Rin) + t * (v1 - v0) / R); if (j % 2) amphoraPile(B, M.plasterRed, q.x, TOP - 0.05, q.z, ry, 5, 3); else amphoraLean(B, M.plasterRed, q.x, TOP - 0.05, q.z, rand() * 6); } // ânforas em pilhas deitadas na frente do armazém
  }
  // dois guindastes de roda no cais
  for (const [u, v] of [[-R * 0.55, -Rin * 0.75], [R * 0.7, -Rin * 0.4]]) {
    const p = W(u * 1.12, v * 1.12), ry = yawOf(u, v);
    B.box(M.darkWood, 0.45, 13, 0.45, p.x, TOP, p.z, { rz: 0.35, ry }); B.geo(new THREE.TorusGeometry(2.4, 0.2, 6, 20), M.darkWood, p.x, TOP + 2.6, p.z, { ry: ry + Math.PI / 2 });
  }
  // barcos atracados dentro da bacia
  { const p = W(-R * 0.25, -Rin * 0.62); out.boats.push({ model: 'quadrirreme', x: p.x, z: p.z, y: 0, ry: yawOf(1, 0) + Math.PI / 2, len: 30, moored: true, board: true, name: 'Concórdia' }); S.quadrireme = new V3(p.x, 0, p.z); }
  { const p = W(R * 0.42, -Rin * 0.15); out.boats.push({ model: 'liburna', x: p.x, z: p.z, y: 0, ry: yawOf(-0.5, 0.866) + Math.PI / 2, len: 26, moored: true, name: 'Pietas' }); }
  const c = W(0, -Rin - 8);
  S.portus = new V3(c.x, TOP, c.z);
  out.zones.portus = [PORTUS.x - R - 40, PORTUS.x + R + 40, PORTUS.z - R - 40, PORTUS.z + R + 40];
}
