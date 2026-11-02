// A domus do Aventino: a casa de uma família rica, construída cômodo por cômodo e toda visitável.
// Da rua se entra pelas fauces (o corredor da porta), entre duas lojas alugadas; o átrio tem o telhado aberto no meio
// (compluvium) e, embaixo, o tanque que recolhe a chuva (impluvium); dos lados, os quartos (cubicula); ao fundo, o
// tablinum (o escritório do dono) se abre para o peristilo — o jardim cercado de colunas, com a fonte e a estátua — e,
// no fundo do jardim, o triclínio com os três leitos onde se jantava deitado. Paredes pintadas de vermelho pompeiano.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { sculptureInstance } from '../comum/sculptures.js';
import { roofHalf } from '../atenas/arquitetura.js';
import { corinthian } from './forum.js';
import { DOMUS } from './terrain.js';

const V3 = THREE.Vector3;

export function buildDomus(B, M, out) {
  const X = DOMUS.x, Z = DOMUS.z, Y = DOMUS.y, W = 34, D = 46, H = 6, t = 0.5; // x: largura, z: fundo; a rua fica em +z
  const x0 = X - W / 2, x1 = X + W / 2, z0 = Z - D / 2, z1 = Z + D / 2;
  // parede alinhada a um eixo, de (ax, az) a (bx, bz), com vãos de porta [posição ao longo, largura] e a verga por cima
  const wall = (ax, az, bx, bz, doors = [], mat = M.plaster, h = H) => {
    const alongX = Math.abs(bz - az) < 0.01, a0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), a1 = alongX ? Math.max(ax, bx) : Math.max(az, bz);
    const cuts = [...doors].sort((p, q) => p[0] - q[0]); let a = a0;
    const seg = (s0, s1) => { if (s1 - s0 < 0.05) return; const m = (s0 + s1) / 2, L = s1 - s0;
      if (alongX) { B.box(mat, L, h, t, m, Y, az); addBox(m, az, L, t, Y - 1, Y + h); } else { B.box(mat, t, h, L, ax, Y, m); addBox(ax, m, t, L, Y - 1, Y + h); } };
    for (const [p, w] of cuts) { seg(a, p - w / 2); if (alongX) B.box(mat, w, h - 2.6, t, p, Y + 2.6, az); else B.box(mat, t, h - 2.6, w, ax, Y + 2.6, p); a = p + w / 2; }
    seg(a, a1);
  };
  B.box(M.marble, W, 0.12, D, X, Y - 0.08, Z); // piso de mosaico claro
  const zA0 = z1 - 6, zA1 = z1 - 22, zT = zA1 - 6, zP = z0 + 8; // lojas | átrio | tablinum | peristilo | triclínio
  // ---- paredes externas (reboco, rodapé de tijolo) e a fachada com a porta e as duas lojas
  wall(x0, z1, x1, z1, [[X, 2.4], [x0 + 5, 3], [x1 - 5, 3]], M.plasterOchre);
  wall(x0, z0, x1, z0, [], M.plasterOchre); wall(x0, z0, x0, z1, [], M.plasterOchre); wall(x1, z0, x1, z1, [], M.plasterOchre);
  for (const [cx, cz, w, d] of [[X, z1, W + 0.1, 0.6], [X, z0, W + 0.1, 0.6], [x0, Z, 0.6, D], [x1, Z, 0.6, D]]) B.box(M.brick, w, 1.0, d, cx, Y, cz); // rodapé
  wall(x0, zA0, x1, zA0, [[X, 2.4]]); wall(X - 1.6, zA0, X - 1.6, z1); wall(X + 1.6, zA0, X + 1.6, z1); // fauces e as lojas
  for (const s of [-1, 1]) B.box(M.travertine2, 2.6, 1.0, 0.6, X + s * 11, Y, z1 - 1.2); // balcão das lojas
  // ---- átrio: quartos dos dois lados, o tanque no meio e o telhado com a abertura
  const ax0 = X - 9, ax1 = X + 9;
  for (const s of [-1, 1]) { const wx = s < 0 ? ax0 : ax1; wall(wx, zA0, wx, zA1, [[zA0 - 3.5, 1.4], [zA0 - 8.5, 1.4], [zA0 - 13.5, 1.4]], M.plasterRed);
    for (const zz of [zA0 - 6, zA0 - 11]) wall(s < 0 ? x0 : ax1, zz, s < 0 ? ax0 : x1, zz, [], M.plasterRed); }
  { const ix = X, iz = (zA0 + zA1) / 2;
    B.box(M.marble, 6, 0.35, 6, ix, Y, iz); B.box(M.water, 5.4, 0.05, 5.4, ix, Y + 0.2, iz); addBox(ix, iz, 6, 6, Y - 1, Y + 0.35);
    for (const s of [-1, 1]) { B.geo(roofHalf(18, 4.5, 1.1, 0.2), M.tiles, ix, Y + H - 0.2, iz + s * 7.5, { ry: s > 0 ? Math.PI : 0 }); B.geo(roofHalf(4, 4.0, 1.0, 0.2), M.tiles, ix + s * 7, Y + H - 0.2, iz, { ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 }); }
    B.box(M.travertine2, 1.2, 1.1, 0.6, ax0 + 1, Y, zA0 - 1); B.box(M.plasterRed, 1.0, 1.0, 0.1, ax0 + 1, Y + 1.1, zA0 - 0.75); } // o lararium
  // ---- tablinum: a sala do dono, aberta para o átrio e para o jardim
  wall(x0, zA1, ax0, zA1, [], M.plasterRed); wall(ax1, zA1, x1, zA1, [], M.plasterRed);
  wall(X - 5, zA1, X - 5, zT, [], M.plasterRed); wall(X + 5, zA1, X + 5, zT, [], M.plasterRed);
  wall(x0, zT, X - 5, zT, [[x0 + 5, 1.6]], M.plasterRed); wall(X + 5, zT, x1, zT, [[x1 - 5, 1.6]], M.plasterRed);
  B.box(M.darkWood, 2.4, 0.9, 1.0, X, Y, zT + 3); addBox(X, zT + 3, 2.4, 1.0, Y - 1, Y + 0.9); // a mesa de trabalho
  // ---- peristilo: colunata em volta do jardim, canteiros, fonte
  const gx = 9.5, gz0 = zP + 3, gz1 = zT - 3, colG = corinthian(3.6, 0.2);
  for (let x = X - gx; x <= X + gx + 0.01; x += gx / 3) for (const z of [gz0, gz1]) { for (const g of colG) B.geo(g, M.colMarble, x, Y, z, { uv: false }); addCircle(x, z, 0.25, Y - 1, Y + 3.6); }
  for (let z = gz0 + (gz1 - gz0) / 4; z < gz1 - 0.1; z += (gz1 - gz0) / 4) for (const x of [X - gx, X + gx]) { for (const g of colG) B.geo(g, M.colMarble, x, Y, z, { uv: false }); addCircle(x, z, 0.25, Y - 1, Y + 3.6); }
  for (const s of [-1, 1]) { B.box(M.tiles, 2 * gx + 6, 0.2, 3.2, X, Y + 3.7, s < 0 ? gz0 - 1.3 : gz1 + 1.3); B.box(M.tiles, 3.2, 0.2, gz1 - gz0, X + s * (gx + 1.3), Y + 3.7, (gz0 + gz1) / 2); }
  B.box(M.earth, 2 * gx - 0.6, 0.15, gz1 - gz0 - 0.6, X, Y - 0.02, (gz0 + gz1) / 2);
  const bush = new THREE.IcosahedronGeometry(0.5, 0);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; B.geo(bush, M.plant, X + Math.cos(a) * 6.5, Y + 0.35, (gz0 + gz1) / 2 + Math.sin(a) * 4.2); }
  { const fz = (gz0 + gz1) / 2; B.geo(new THREE.CylinderGeometry(1.8, 1.9, 0.5, 20), M.marble, X, Y + 0.25, fz); B.geo(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 20), M.water, X, Y + 0.48, fz); B.geo(new THREE.CylinderGeometry(0.15, 0.25, 1.4, 10), M.marble, X, Y + 0.7, fz); addCircle(X, fz, 1.9, Y - 1, Y + 0.5); }
  // ---- triclínio: a sala de jantar no fundo, com os três leitos em U e a mesinha
  wall(x0, zP, x1, zP, [[X, 3.2]], M.plasterRed);
  for (const [cx, cz, w, d] of [[X - 3.2, zP - 4, 1.2, 5], [X + 3.2, zP - 4, 1.2, 5], [X, zP - 6.6, 5.6, 1.2]]) { B.box(M.marbleWall, w, 0.75, d, cx, Y, cz); B.box(M.plasterRed, w - 0.1, 0.12, d - 0.1, cx, Y + 0.75, cz); addBox(cx, cz, w, d, Y - 1, Y + 0.85); }
  B.geo(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 16), M.marble, X, Y + 0.7, zP - 4); B.geo(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 8), M.bronze, X, Y + 0.35, zP - 4);
  // ---- afrescos: rodapé escuro e friso dourado nas paredes do átrio
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const z = zA0 - 2.5 - k * 5, x = (s < 0 ? ax0 : ax1) - s * 0.27; B.box(M.dark, 0.04, 0.9, 4.6, x, Y, z); B.box(M.gold, 0.04, 0.06, 4.2, x, Y + 2.9, z); }
  // ---- telhados por cima de tudo (menos o jardim e a abertura do átrio)
  for (const [cx, cz, w, d] of [[X, (z1 + zA0) / 2, W, 6], [X, (zA1 + zT) / 2, W, 6], [X, (zP + z0) / 2, W, 8]]) for (const s of [-1, 1]) B.geo(roofHalf(w + 0.6, d / 2 + 0.4, 1.4), M.tiles, cx, Y + H + 1.4, cz, { ry: s > 0 ? 0 : Math.PI });
  for (const s of [-1, 1]) B.geo(roofHalf(16.2, 4.5, 1.2), M.tiles, s < 0 ? (x0 + ax0) / 2 : (ax1 + x1) / 2, Y + H + 1.2, (zA0 + zA1) / 2, { ry: s < 0 ? Math.PI / 2 : -Math.PI / 2 });
  out.domusStatue = new V3(X + gx - 1.5, Y, (gz0 + gz1) / 2);
  out.spots.domus = new V3(X, Y, z1 + 3);
}

export async function placeLandmarks(scene, city) {
  // as estátuas de bronze: Trajano no meio da praça e no alto da coluna; uma no jardim da domus
  (city.trajanStatues || []).forEach((p, i) => sculptureInstance('doryphoros', i ? 4.2 : 5).then((o) => { if (!o.children.length) return; const h = new THREE.Group(); h.position.copy(p); h.rotation.y = Math.PI; h.add(o); scene.add(h); }));
  if (city.domusStatue) sculptureInstance('doryphoros', 1.9).then((o) => { if (!o.children.length) return; const h = new THREE.Group(); h.position.copy(city.domusStatue); h.rotation.y = -Math.PI / 2; h.add(o); scene.add(h); });
}
