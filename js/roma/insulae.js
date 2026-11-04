// Os bairros de Roma: ínsulas como as que ainda estão de pé em Óstia — tijolo aparente (opus latericium) ou reboco
// sobre tijolo, térreo de lojas (tabernae) com a verga de tijolo, o arco de descarga e a janelinha do mezanino onde o
// lojista dormia; balcões de alvenaria com os dolia embutidos nas popinas (os botecos); pórtico de pilares na frente
// das lojas nas ruas principais (a regra de Nero depois do incêndio de 64); sacadas de madeira (maeniana), janelas
// com peitoril de travertino e venezianas, cornija marcando o primeiro andar e telhado de duas águas com empena.
// Nas esquinas, as fontes de bairro (lacus) e os altarzinhos dos Lares das encruzilhadas (compita).
import * as THREE from 'three';
import { mat4 } from '../comum/batcher.js';
import { addBox, addRotBox } from '../comum/collision.js';
import { roofHalf, pedimentGeo } from '../atenas/arquitetura.js';
import { terrainHeight, tiberDist, TIBER_HALF, coastC, FORUM, CIRCUS, PALATINE, CAPITOL, NAUMACHIA, inPortus } from './terrain.js';
import { COL } from './coliseu.js';
import { rr, rand, pick } from '../comum/util.js';

const V3 = THREE.Vector3;
const cache = {};
const once = (k, f) => (cache[k] ??= f());
// arco de tijolo (meio anel) no plano XY, com a base no y = 0, extrudado em z
const archRing = (span, th, depth) => once(`ar${span}|${th}|${depth}`, () => {
  const R = span / 2 + th, r = span / 2, s = new THREE.Shape();
  s.moveTo(R, 0); s.absarc(0, 0, R, 0, Math.PI, false); s.lineTo(-r, 0); s.absarc(0, 0, r, Math.PI, 0, true); s.lineTo(R, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -depth / 2); return g;
});
const dolium = once('dol', () => new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12));
const pot = once('pot', () => new THREE.CylinderGeometry(0.16, 0.11, 0.3, 8));
const bush = once('bush', () => new THREE.IcosahedronGeometry(0.3, 0));

// uma ínsula. o = { x, z, w (fachada), d (fundo), ry, floors, portico, balcony }
export function insula(B, M, out, o) {
  const { x, z, w, d, ry } = o, n = o.floors;
  const ys = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([a, b]) => terrainHeight(x + a * Math.cos(ry) + b * Math.sin(ry), z - a * Math.sin(ry) + b * Math.cos(ry)));
  const y = Math.min(...ys) - 0.2, lift = Math.max(...ys) - y; // em leve declive, o térreo acompanha o lado mais baixo
  const F = mat4(x, y, z, 0, ry, 0);
  const box = (mat, bw, bh, bd, lx, ly, lz, ex = {}) => B.box(mat, bw, bh, bd, lx, ly, lz, { frame: F, ...ex });
  const geo = (g, mat, lx, ly, lz, rx = 0, rY = 0, rz = 0) => B.geo(g, mat, 0, 0, 0, { frame: F.clone().multiply(mat4(lx, ly, lz, rx, rY, rz)) });
  const H0 = 4.4 + lift, HF = 3.0, Ht = H0 + (n - 1) * HF + 0.5;
  const wall = o.wall || (rand() < 0.55 ? M.brick : rand() < 0.5 ? M.brickY : pick([M.plasterOchre, M.plasterRed, M.brickPl]));
  const accent = wall === M.brick ? M.brickY : M.brick; // vergas e arcos em tijolo de outra cor
  box(wall, w, Ht, d, 0, 0, 0);
  if (wall !== M.brick && wall !== M.brickY) box(M.brick, w + 0.04, H0, d + 0.04, 0, 0, 0); // térreo sempre de tijolo
  box(M.travertine, w + 0.5, 0.26, d + 0.5, 0, H0, 0); // cornija do primeiro andar
  box(M.travertine2, w + 0.3, 0.2, d + 0.3, 0, Ht - 0.2, 0); // beiral de cima
  // ---- as duas fachadas compridas (±z local)
  for (const sd of [-1, 1]) {
    const fz = sd * d / 2, front = sd * 0.04, portico = o.portico && sd === 1;
    const ns = Math.max(2, Math.floor((w - 1.6) / 3.7)), sp = (w - 1.6) / ns;
    for (let i = 0; i < ns; i++) {
      const u = -w / 2 + 0.8 + sp * (i + 0.5), door = sd === 1 && i === Math.floor(ns / 2);
      if (door) { // a entrada da escada dos andares de cima: portal de travertino com frontãozinho
        box(M.dark, 1.5, 2.9 + lift, 0.08, u, 0, fz + front);
        for (const e of [-1, 1]) box(M.travertine, 0.3, 3.1 + lift, 0.22, u + e * 0.9, 0, fz + sd * 0.1);
        box(M.travertine, 2.2, 0.3, 0.26, u, 3.1 + lift, fz + sd * 0.12);
        geo(pedimentGeo(2.4, 0.6, 0.24), M.travertine, u, 3.4 + lift, fz + sd * 0.12);
        continue;
      }
      const shut = rand() < 0.22, oy = 0; // loja fechada com as tábuas encaixadas
      box(shut ? M.shutter : M.dark, 2.4, 2.75, 0.08, u, oy, fz + front);
      box(accent, 2.9, 0.34, 0.14, u, oy + 2.75, fz + sd * 0.06); // verga reta de tijolo
      geo(archRing(2.4, 0.3, 0.14), accent, u, oy + 3.09, fz + sd * 0.06); // arco de descarga
      box(M.dark, 0.9, 0.62, 0.06, u, oy + 3.25, fz + front); // janelinha do mezanino
      box(M.travertine2, 2.5, 0.1, 0.4, u, oy, fz + sd * 0.2); // soleira
      if (!shut && rand() < 0.38) { // popina: balcão de alvenaria com os dolia embutidos
        box(M.travertine2, 2.0, 1.0, 0.6, u, oy, fz + sd * 0.55);
        for (const e of [-0.5, 0.45]) geo(dolium, M.dark, u + e, oy + 1.01, fz + sd * 0.55);
        out.shops?.push({ x: x + Math.cos(ry) * u + Math.sin(ry) * (fz - sd * 0.6), z: z - Math.sin(ry) * u + Math.cos(ry) * (fz - sd * 0.6), ry: ry + (sd > 0 ? 0 : Math.PI), kind: 'popina' });
      } else if (!shut && rand() < 0.4) { // mercadoria na porta: ânforas, cestos
        for (let k = 0; k < 3; k++) geo(pot, M.terracotta, u - 0.8 + k * 0.5, oy + 0.15, fz + sd * 0.5);
        out.shops?.push({ x: x + Math.cos(ry) * u + Math.sin(ry) * (fz - sd * 0.6), z: z - Math.sin(ry) * u + Math.cos(ry) * (fz - sd * 0.6), ry: ry + (sd > 0 ? 0 : Math.PI), kind: 'taberna' });
      }
    }
    if (portico) { // pórtico de pilares de tijolo, com o terraço por cima
      const depth = 3.2, np = ns + 1;
      for (let i = 0; i < np; i++) {
        const u = -w / 2 + 0.8 + sp * i, px = x + Math.cos(ry) * u + Math.sin(ry) * (fz + sd * depth), pz = z - Math.sin(ry) * u + Math.cos(ry) * (fz + sd * depth);
        box(M.brick, 0.75, H0, 0.75, u, 0, fz + sd * depth); addBox(px, pz, 0.8, 0.8, y - 1, y + H0);
      }
      box(M.travertine, w - 1.2, 0.5, depth + 0.4, 0, H0 - 0.5, fz + sd * (depth / 2 + 0.1));
      for (let i = 0; i < Math.floor((w - 1.4) / 0.9); i++) box(M.travertine2, 0.12, 0.8, 0.12, -w / 2 + 0.8 + i * 0.9, H0, fz + sd * (depth - 0.1)); // balaústres (só em cima da laje)
      box(M.travertine2, w - 1.4, 0.1, 0.18, 0, H0 + 0.8, fz + sd * (depth - 0.1));
      for (let k = 0; k < 4; k++) { const u = rr(-w / 2 + 2, w / 2 - 2); const v = fz + sd * rr(1, Math.min(2.6, depth - 0.4)); geo(pot, M.terracotta, u, H0 + 0.15, v); geo(bush, M.plant, u, H0 + 0.5, v); } // (o arbusto dentro do vaso, e o vaso sobre a laje)
    } else if (o.balcony && sd === (o.balconySide || 1)) { // sacada de madeira no primeiro andar, sobre vigas
      const bw = w * rr(0.55, 0.8), bu = rr(-(w - bw) / 2, (w - bw) / 2);
      box(M.wood, bw, 0.14, 1.15, bu, H0 + 0.26, fz + sd * 0.6);
      for (let k = 0; k <= Math.floor(bw / 1.5); k++) box(M.darkWood, 0.14, 0.18, 1.3, bu - bw / 2 + k * (bw / Math.floor(bw / 1.5)), H0 + 0.1, fz + sd * 0.6);
      for (let k = 0; k <= Math.floor(bw / 0.6); k++) box(M.darkWood, 0.06, 0.85, 0.06, bu - bw / 2 + k * (bw / Math.floor(bw / 0.6)), H0 + 0.4, fz + sd * 1.15);
      box(M.darkWood, bw, 0.08, 0.1, bu, H0 + 1.25, fz + sd * 1.15);
      if (rand() < 0.7) for (let k = 0; k < 3; k++) { const u = bu + rr(-bw / 2 + 0.5, bw / 2 - 0.5); geo(pot, M.terracotta, u, H0 + 0.55, fz + sd * 0.8); geo(bush, M.plant, u, H0 + 0.85, fz + sd * 0.8); }
      if (rand() < 0.5) box(pick(M.awning), bw * 0.9, 0.04, 1.3, bu, H0 + 2.6, fz + sd * 0.55, { rx: sd * 0.25 }); // toldo
    }
    // janelas dos andares: peitoril de travertino, venezianas abertas ou fechadas
    const nw = Math.max(2, Math.floor(w / 2.9)), wsp = w / nw;
    for (let f = 1; f < n; f++) {
      const wy = H0 + (f - 1) * HF + 0.9;
      box(accent, w + 0.06, 0.12, d + 0.06, 0, H0 + f * HF - 0.05, 0); // fiada de tijolo marcando o andar
      for (let i = 0; i < nw; i++) {
        const u = -w / 2 + wsp * (i + 0.5);
        if (rand() < 0.12) continue; // parede cega aqui e ali
        const tall = f === 1 ? 1.5 : 1.25;
        box(M.dark, 0.95, tall, 0.06, u, wy, fz + front);
        box(M.travertine, 1.15, 0.09, 0.2, u, wy - 0.09, fz + sd * 0.08);
        if (f === 1 && wall !== M.plasterOchre && wall !== M.plasterRed) geo(archRing(0.95, 0.16, 0.1), accent, u, wy + tall, fz + sd * 0.04);
        const sh = rand();
        if (sh < 0.45) for (const e of [-1, 1]) box(M.shutter, 0.46, tall, 0.05, u + e * 0.72, wy, fz + sd * 0.07); // abertas
        else if (sh < 0.62) box(M.shutter, 0.95, tall, 0.05, u, wy, fz + sd * 0.07); // fechadas
      }
    }
  }
  // ---- os lados curtos (±x local): menos janelas
  for (const sx of [-1, 1]) {
    const nw = Math.max(1, Math.floor(d / 3.4)), wsp = d / nw;
    for (let f = 1; f < n; f++) for (let i = 0; i < nw; i++) {
      if (rand() < 0.3) continue;
      const v = -d / 2 + wsp * (i + 0.5), wy = H0 + (f - 1) * HF + 0.9;
      box(M.dark, 0.06, 1.25, 0.9, sx * (w / 2 + 0.04), wy, v);
      box(M.travertine, 0.2, 0.09, 1.1, sx * (w / 2 + 0.08), wy - 0.09, v);
    }
  }
  // ---- telhado de duas águas ao longo da fachada, com as empenas de tijolo
  const rh = Math.min(2.4, d * 0.17);
  for (const s of [-1, 1]) geo(roofHalf(w + 0.9, d / 2 + 0.55, rh), M.tiles, 0, Ht + rh, 0, 0, s > 0 ? 0 : Math.PI, 0);
  for (const sx of [-1, 1]) geo(pedimentGeo(d, rh, 0.3), wall, sx * (w / 2 - 0.15), Ht, 0, 0, Math.PI / 2, 0);
  addRotBox(x, z, w, d, ry, y - 1, y + Ht + rh); // (a caixa reta em volta do prédio girado era parede invisível na rua)
}

// fonte de bairro (lacus): tanque de pedra com a bica numa coluninha
function lacus(B, M, x, z, ry) {
  const y = terrainHeight(x, z) - 0.1, F = mat4(x, y, z, 0, ry, 0);
  B.box(M.travertine, 2.6, 0.85, 1.5, 0, 0, 0, { frame: F }); B.box(M.water, 2.3, 0.05, 1.2, 0, 0.72, 0, { frame: F });
  B.box(M.travertine2, 0.5, 1.6, 0.4, 0, 0, -0.75, { frame: F }); B.box(M.bronze, 0.08, 0.08, 0.35, 0, 1.25, -0.5, { frame: F });
  addBox(x, z, 2.7, 2.7, y - 1, y + 0.85);
}
// altar dos Lares da encruzilhada (compitum): nicho pintado de vermelho com frontãozinho e um altar na frente
function compitum(B, M, x, z, ry) {
  const y = terrainHeight(x, z) - 0.1, F = mat4(x, y, z, 0, ry, 0);
  B.box(M.travertine2, 1.6, 2.2, 0.8, 0, 0, 0, { frame: F }); B.box(M.plasterRed, 1.0, 1.0, 0.05, 0, 0.9, 0.41, { frame: F });
  B.geo(pedimentGeo(1.8, 0.45, 0.85), M.travertine, 0, 0, 0, { frame: F.clone().multiply(mat4(0, 2.2, 0)) });
  B.box(M.travertine, 0.6, 0.9, 0.5, 0, 0, 0.9, { frame: F });
  addBox(x, z, 1.8, 1.8, y - 1, y + 2.2);
}

// os bairros (regiões de verdade da cidade): ruas em grade, quarteirões de ínsulas, fontes e altares nas esquinas
export const DISTRICTS = [
  { name: 'Subura', x0: -150, x1: 52, z0: -330, z1: -96, floors: [4, 5], portico: 0.45 }, // o bairro popular, apertado e barulhento
  { name: 'Ópio', x0: 70, x1: 225, z0: -95, z1: 70, floors: [3, 5], portico: 0.3 },
  { name: 'Célio', x0: 20, x1: 215, z0: 75, z1: 270, floors: [3, 4], portico: 0.25 },
  { name: 'Aventino', x0: -430, x1: -240, z0: 330, z1: 480, floors: [3, 4], portico: 0.2 },
  { name: 'Trastévere', x0: -740, x1: -608, z0: -70, z1: 300, floors: [3, 4], portico: 0.15 }, // além do Tibre: barqueiros, curtidores, estrangeiros
  { name: 'Campo de Marte', x0: -500, x1: -390, z0: -230, z1: -90, floors: [3, 5], portico: 0.5 },
];

export function buildDistricts(B, M, out) {
  out.shops = [];
  const free = (x, z, r) => {
    for (const [x0, x1, z0, z1] of out.exclusions) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return false;
    if ((x / (COL.A + 30)) ** 2 + (z / (COL.B + 30)) ** 2 < 1) return false;
    if (Math.abs(x - FORUM.x) < FORUM.hw + 16 && Math.abs(z - FORUM.z) < FORUM.hd + 16) return false;
    if (Math.abs(x - CIRCUS.x) < CIRCUS.hw + 18 && Math.abs(z - CIRCUS.z) < CIRCUS.hd + 18) return false;
    if (tiberDist(x, z).d < TIBER_HALF + 22 || coastC(x, z) > -60 || inPortus(x, z, 40)) return false;
    if (((x - NAUMACHIA.x) / (NAUMACHIA.a + 26)) ** 2 + ((z - NAUMACHIA.z) / (NAUMACHIA.b + 26)) ** 2 < 1) return false;
    if (Math.hypot(x - PALATINE.x, z - PALATINE.z) < 95 || Math.hypot(x - CAPITOL.x, z - CAPITOL.z) < 75) return false;
    return true;
  };
  let count = 0;
  for (const D of DISTRICTS) {
    const BX = 32, BZ = 26; // quarteirão + rua
    for (let gx = D.x0; gx + BX <= D.x1 + 6; gx += BX) for (let gz = D.z0; gz + BZ <= D.z1 + 6; gz += BZ) {
      const cx = gx + BX / 2, cz = gz + BZ / 2;
      const w = rr(20, 24), d = rr(13, 16);
      if (!free(cx, cz, 12)) continue;
      const hs = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([a, b]) => terrainHeight(cx + a, cz + b));
      if (Math.max(...hs) - Math.min(...hs) > 2.6) continue; // encosta forte: fica jardim
      if (rand() < 0.1) { // um largo com árvore e fonte no lugar do quarteirão
        lacus(B, M, cx, cz, rand() * 6); out.squares = (out.squares || 0) + 1; continue;
      }
      insula(B, M, out, { x: cx, z: cz, w, d, ry: 0, floors: D.floors[0] + Math.floor(rand() * (D.floors[1] - D.floors[0] + 1)), portico: rand() < D.portico, balcony: rand() < 0.6, balconySide: rand() < 0.5 ? 1 : -1 });
      count++;
      // na esquina: fonte, altar dos Lares ou nada
      const ex = gx + BX - 1.5, ez = gz + BZ - 1.8, k = rand();
      if (k < 0.12 && free(ex, ez, 2)) lacus(B, M, ex, ez, 0);
      else if (k < 0.2 && free(ex, ez, 2)) compitum(B, M, ex - 1.2, ez, Math.PI / 2);
      if (rand() < 0.1) out.torches.push(new V3(cx + w / 2 + 0.6, terrainHeight(cx + w / 2 + 0.6, cz) + 2.6, cz));
    }
  }
  out.insulae = count;
}
