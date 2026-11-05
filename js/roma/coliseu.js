// O Coliseu (Anfiteatro Flávio), em ~3/4 do tamanho real: arena de madeira coberta de areia sobre o hipogeu (os
// corredores, jaulas e elevadores por onde subiam feras e gladiadores), o pódio dos senadores, 38 fileiras com 20
// escadas radiais, o corredor térreo (ambulacro) em volta e a fachada de 80 arcos em três ordens (toscana, jônica e
// coríntia) mais o ático com os mastros do velário. Entradas: leste e oeste no nível da arena (Porta Triunfal e
// Libitinense); norte e sul sobem em rampa até o pódio (camarote do imperador e dos cônsules).
// Tudo andável: a altura do chão sai de colGround (fileiras, rampas, túneis); arena, teto dos túneis e paredes são caixas.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { buildHypogeumLife } from './hipogeu.js';

export const COL = {
  x: 0, z: 0, y: 8,
  a0: 31, b0: 18.5, // arena (semieixos)
  podium: 2.6, podiumH: 4, // terraço do pódio e altura do muro da arena
  D: 33, row: 0.8, rise: 0.45, // cávea: profundidade, fundo e altura de cada fileira
  amb: 6, wall: 2.6, // ambulacro térreo e espessura da fachada
  hyp: 6, gate: 1.6, aisles: 20, aisleW: 0.8,
};
COL.rows = Math.floor((COL.D - COL.podium) / COL.row);
COL.A = COL.a0 + COL.D + COL.amb + COL.wall; COL.B = COL.b0 + COL.D + COL.amb + COL.wall;
const HOLE = { x0: 18.6, x1: 25.4, z: 1.6 }; // abertura no piso da arena com a escada para o hipogeu

// "distância" d de um ponto até a borda da arena, medida em elipses paralelas (a0+d, b0+d)
export function dOf(x, z) {
  x -= COL.x; z -= COL.z;
  let lo = -COL.b0 + 0.01, hi = 120;
  for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if ((x / (COL.a0 + m)) ** 2 + (z / (COL.b0 + m)) ** 2 > 1) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const P = (d, th) => [COL.x + (COL.a0 + d) * Math.cos(th), COL.z + (COL.b0 + d) * Math.sin(th)];
const thetaOf = (x, z, d) => Math.atan2((z - COL.z) / (COL.b0 + d), (x - COL.x) / (COL.a0 + d));
const rowY = (k) => COL.y + COL.podiumH + COL.rise * (k + 1);
// rampa dos túneis norte e sul: do chão (no ambulacro) até o pódio
const rampY = (d) => COL.y + COL.podiumH * Math.min(1, Math.max(0, (COL.D - d) / (COL.D - 8)));
// teto dos túneis norte e sul (os 14 trechos da rampa) e as fileiras que ele corta: nelas a fileira para na parede do
// túnel em vez de atravessá-lo (e a plateia não senta ali)
const NT = 14, SEGL = (COL.D - COL.podium) / NT;
const ceilB = (d) => { const j = Math.min(NT - 1, Math.max(0, Math.floor((d - COL.podium) / SEGL))); return Math.max(rampY(COL.podium + j * SEGL), rampY(COL.podium + (j + 1) * SEGL)) + 3.2; };
export function rowCutNS(k) { const d0 = COL.podium + k * COL.row, d1 = d0 + COL.row + 0.02; return Math.min(ceilB(d0), ceilB(d1 - 0.03)) + 0.4 > rowY(k) - (COL.rise + 0.6); }
const inEW = (x, z) => Math.abs(z - COL.z) < COL.gate; // túnel leste-oeste (eixo maior)
const inNS = (x, z) => Math.abs(x - COL.x) < COL.gate; // túnel norte-sul (eixo menor)

// chão desenhado (malha do terreno): fundo do hipogeu sob a arena, chão térreo sob o resto
export function colTerrain(x, z) {
  const d = dOf(x, z);
  if (d > COL.D + COL.amb + COL.wall + 0.5) return null;
  return d < 0 ? COL.y - COL.hyp : COL.y;
}
// chão para andar
export function colGround(x, z) {
  const d = dOf(x, z), C = COL;
  if (d >= C.D + C.amb + C.wall) return null;
  if (d < 0) return C.y - C.hyp; // hipogeu (o piso da arena é uma caixa por cima)
  if (inEW(x, z) && d < C.D + C.amb) return C.y; // túnel até a arena
  if (inNS(x, z) && d < C.D && d >= C.podium) return rampY(d);
  if (d < C.podium) return C.y + C.podiumH;
  if (d < C.D) {
    const u = (d - C.podium) / C.row, k = Math.min(C.rows - 1, Math.floor(u));
    let y = rowY(k);
    const th = thetaOf(x, z, d), r = (C.a0 + C.b0) / 2 + d, step = (Math.PI * 2) / C.aisles;
    const da = Math.abs(((th / step) % 1 + 1.5) % 1 - 0.5) * step; // distância angular à escada mais próxima
    if (da * r < C.aisleW && u - k < 0.5) y -= C.rise / 2;
    return y;
  }
  return C.y; // ambulacro e soleira da fachada
}

// ---------------------------------------------------------------------------------------------------------------
// geometria
// bloco em forma de setor de anel elíptico: topo em y, descendo h; ângulos th0..th1 (as pontas podem afinar com a
// distância: a0/a1 são deslocamentos em metros de arco, para a largura das escadas ficar constante)
function ringSlab(d0, d1, th0, th1, y, h, cut0 = 0, cut1 = 0, bottom = true) {
  const n = Math.max(2, Math.ceil(Math.abs(th1 - th0) * ((COL.a0 + COL.b0) / 2 + d1) / 1.8));
  const pos = [], idx = [];
  const quad = (a, b, c, e) => { const i = pos.length / 3; pos.push(...a, ...b, ...c, ...e); idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  const at = (t, d, yy) => { const r = (COL.a0 + COL.b0) / 2 + d, th = th0 + cut0 / r + (th1 - cut1 / r - th0 - cut0 / r) * t, [x, z] = P(d, th); return [x, yy, z]; };
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    quad(at(t0, d0, y), at(t1, d0, y), at(t1, d1, y), at(t0, d1, y));
    quad(at(t0, d0, y - h), at(t1, d0, y - h), at(t1, d0, y), at(t0, d0, y));
    quad(at(t1, d1, y - h), at(t0, d1, y - h), at(t0, d1, y), at(t1, d1, y));
    if (bottom) quad(at(t1, d0, y - h), at(t0, d0, y - h), at(t0, d1, y - h), at(t1, d1, y - h)); // (a face de baixo: sem ela, quem olhava o teto do corredor de baixo via o céu através dele)
  }
  quad(at(0, d1, y - h), at(0, d0, y - h), at(0, d0, y), at(0, d1, y));
  quad(at(1, d0, y - h), at(1, d1, y - h), at(1, d1, y), at(1, d0, y));
  return finish(pos, idx);
}
// muro ao longo de uma elipse (distância d, espessura t), de y0 a y1, entre os ângulos th0..th1
function ringWall(d, t, th0, th1, y0, y1) {
  const n = Math.max(2, Math.ceil(Math.abs(th1 - th0) * ((COL.a0 + COL.b0) / 2 + d) / 2));
  const pos = [], idx = [];
  const quad = (a, b, c, e) => { const i = pos.length / 3; pos.push(...a, ...b, ...c, ...e); idx.push(i, i + 1, i + 2, i, i + 2, i + 3); };
  const at = (k, dd, yy) => { const [x, z] = P(dd, th0 + (th1 - th0) * k); return [x, yy, z]; };
  for (let i = 0; i < n; i++) {
    const k0 = i / n, k1 = (i + 1) / n;
    quad(at(k0, d - t / 2, y0), at(k1, d - t / 2, y0), at(k1, d - t / 2, y1), at(k0, d - t / 2, y1));
    quad(at(k1, d + t / 2, y0), at(k0, d + t / 2, y0), at(k0, d + t / 2, y1), at(k1, d + t / 2, y1));
    quad(at(k0, d - t / 2, y1), at(k1, d - t / 2, y1), at(k1, d + t / 2, y1), at(k0, d + t / 2, y1));
    quad(at(k1, d - t / 2, y0), at(k0, d - t / 2, y0), at(k0, d + t / 2, y0), at(k1, d + t / 2, y0)); // face de baixo
  }
  if (Math.abs(th1 - th0) < Math.PI * 2 - 1e-6) { // as pontas do muro (nos portões e túneis ficava oco, dava para ver dentro e através)
    quad(at(0, d + t / 2, y0), at(0, d - t / 2, y0), at(0, d - t / 2, y1), at(0, d + t / 2, y1));
    quad(at(1, d - t / 2, y0), at(1, d + t / 2, y0), at(1, d + t / 2, y1), at(1, d - t / 2, y1));
  }
  return finish(pos, idx);
}
function finish(pos, idx) {
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g = g.toNonIndexed(); g.computeVertexNormals();
  return g;
}
// colisão ao longo de uma elipse: círculos lado a lado
function ringCollide(d, r, th0, th1, y0, y1) {
  const L = Math.abs(th1 - th0) * ((COL.a0 + COL.b0) / 2 + d), n = Math.ceil(L / (r * 1.4));
  for (let i = 0; i <= n; i++) { const [x, z] = P(d, th0 + (th1 - th0) * (i / n)); addCircle(x, z, r, y0, y1); }
}
// vão de arco (fachada): retângulo w x h com a abertura em arco pleno (largura ow, altura oh) e espessura t
function archBay(w, h, ow, oh, t) {
  const r = ow / 2, s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0); s.lineTo(-ow / 2, oh - r); s.absarc(0, oh - r, r, Math.PI, 0, true);
  s.lineTo(ow / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -t / 2);
  return g;
}

export function buildColosseum(B, M, out) {
  const C = COL, Y = C.y, TAU = Math.PI * 2;
  const S = out.spots, V = (x, y, z) => new THREE.Vector3(x, y, z);
  // ---- arena: tablado coberto de areia, com a abertura e a escada para o hipogeu
  {
    const s = new THREE.Shape(); s.absellipse(C.x, -C.z, C.a0 + 0.1, C.b0 + 0.1, 0, TAU, false, 0);
    const h = new THREE.Path(); h.moveTo(HOLE.x0, -HOLE.z); h.lineTo(HOLE.x1, -HOLE.z); h.lineTo(HOLE.x1, HOLE.z); h.lineTo(HOLE.x0, HOLE.z); h.lineTo(HOLE.x0, -HOLE.z); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false, curveSegments: 64 }); g.rotateX(-Math.PI / 2);
    B.geo(g, M.sand, 0, Y - 0.35, 0);
    // (o chão vai até o muro: antes as caixas paravam antes da borda da areia e quem andava rente ao muro caía no hipogeu)
    for (let x = -C.a0 - 1.5; x < C.a0 + 1.5; x += 3) for (let z = -C.b0 - 1.5; z < C.b0 + 1.5; z += 3) {
      const cx = x + 1.5, cz = z + 1.5;
      if ((Math.max(0, Math.abs(cx) - 1.5) / C.a0) ** 2 + (Math.max(0, Math.abs(cz) - 1.5) / C.b0) ** 2 > 1) continue; // fica se algum pedaço da caixa toca a arena
      if (cx + 1.5 > HOLE.x0 && cx - 1.5 < HOLE.x1 && Math.abs(cz) - 1.5 < HOLE.z) { // perto do alçapão: em pedaços de 0,5 m, só fora do vão (antes sobravam frestas por onde se caía)
        for (let u = cx - 1.25; u < cx + 1.5; u += 0.5) for (let v = cz - 1.25; v < cz + 1.5; v += 0.5) if (!(u + 0.25 > HOLE.x0 && u - 0.25 < HOLE.x1 && Math.abs(v) - 0.25 < HOLE.z)) addBox(u, v, 0.5, 0.5, Y - 0.35, Y);
        continue;
      }
      addBox(cx, cz, 3, 3, Y - 0.35, Y);
    }
    // tábuas ao redor da abertura (para não cair pelas frestas da grade de colisão)
    for (const sz of [-1, 1]) addBox((HOLE.x0 + HOLE.x1) / 2, sz * (HOLE.z + 0.75), HOLE.x1 - HOLE.x0, 1.5, Y - 0.35, Y);
    addBox(HOLE.x0 - 0.75, 0, 1.5, HOLE.z * 2 + 3, Y - 0.35, Y); addBox(HOLE.x1 + 0.75, 0, 1.5, HOLE.z * 2 + 3, Y - 0.35, Y);
    // guarda-corpo de madeira nos lados e no fundo do alçapão (a entrada da escada fica livre, no lado leste)
    for (const sz of [-1, 1]) { B.box(M.darkWood, HOLE.x1 - HOLE.x0, 0.08, 0.08, (HOLE.x0 + HOLE.x1) / 2, Y + 0.95, sz * (HOLE.z + 0.1)); for (let x = HOLE.x0; x <= HOLE.x1 + 0.01; x += (HOLE.x1 - HOLE.x0) / 4) B.box(M.darkWood, 0.1, 1.0, 0.1, x, Y, sz * (HOLE.z + 0.1)); addBox((HOLE.x0 + HOLE.x1) / 2, sz * (HOLE.z + 0.1), HOLE.x1 - HOLE.x0, 0.2, Y - 0.3, Y + 1.0); }
    B.box(M.darkWood, 0.08, 0.08, HOLE.z * 2 + 0.2, HOLE.x0 - 0.1, Y + 0.95, 0); for (const sz of [-1, 0, 1]) B.box(M.darkWood, 0.1, 1.0, 0.1, HOLE.x0 - 0.1, Y, sz * HOLE.z); addBox(HOLE.x0 - 0.1, 0, 0.2, HOLE.z * 2 + 0.2, Y - 0.3, Y + 1.0);
    // escada: desce para oeste, do piso da arena ao fundo do hipogeu
    const n = 16, run = (HOLE.x1 - HOLE.x0) / n, rise = C.hyp / n;
    for (let k = 0; k < n; k++) {
      const x = HOLE.x1 - run * (k + 0.5), top = Y - rise * (k + 1);
      B.box(M.wood, run + 0.02, 0.2, HOLE.z * 2 - 0.1, x, top - 0.2, 0); B.box(M.travertine, run, top - (Y - C.hyp) - 0.2, HOLE.z * 2 - 0.2, x, Y - C.hyp, 0);
      addBox(x, 0, run, HOLE.z * 2, Y - C.hyp - 1, top);
    }
    S.hypogeumStair = V(HOLE.x1 + 1, Y, 0);
  }
  // ---- hipogeu: corredores paralelos ao eixo maior, celas com grades, elevadores de madeira e postes do tablado
  {
    const y0 = Y - C.hyp, hh = C.hyp - 0.36;
    const xAt = (z) => C.a0 * Math.sqrt(Math.max(0, 1 - (z / C.b0) ** 2)) - 1.2;
    for (const z of [-13, -8.6, -4.3, 4.3, 8.6, 13]) {
      const L = xAt(Math.abs(z) + 0.4); if (L < 4) continue;
      for (let x = -L; x < L; x += 6.5) { // trechos de parede com portas
        const x1 = Math.min(L, x + 5);
        if (Math.abs(z) < 5 && x1 > HOLE.x0 - 1 && x < HOLE.x1 + 1) continue; // a escada desce no corredor central
        B.box(M.brick, x1 - x, hh, 0.6, (x + x1) / 2, y0, z); addBox((x + x1) / 2, z, x1 - x, 0.6, y0 - 1, Y - 0.36);
      }
    }
    // celas das feras junto à curva (grade de madeira na frente)
    for (let i = 0; i < 18; i++) {
      const th = (i / 18) * TAU + 0.12; if (Math.abs(Math.cos(th)) > 0.97) continue;
      const [x, z] = P(-2.2, th), [xo, zo] = P(-0.4, th), ang = Math.atan2(z - zo, xo - x);
      B.box(M.brick, 0.4, hh, 3.2, xo, y0, zo, { ry: -ang + Math.PI / 2 });
      for (let b = -4; b <= 4; b++) { const tx = -Math.sin(th) * b * 0.32, tz = Math.cos(th) * b * 0.32; B.geo(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 5), M.darkWood, x + tx, y0 + 1.2, z + tz, { uv: false }); }
      addCircle(x, z, 1.1, y0 - 1, y0 + 2.4);
    }
    // elevadores: armação de 4 postes, plataforma e roldana (subiam a jaula até um alçapão no piso da arena)
    out.lifts = [];
    for (const [x, z] of [[-20, -6.45], [-8, 6.45], [6, -6.45], [-14, 10.8], [12, 10.8], [-2, -10.8]]) {
      for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) { B.box(M.darkWood, 0.18, hh, 0.18, x + dx, y0, z + dz); addCircle(x + dx, z + dz, 0.15, y0 - 1, Y); }
      B.box(M.wood, 1.9, 0.12, 1.9, x, y0 + 0.4, z);
      B.geo(new THREE.CylinderGeometry(0.25, 0.25, 2, 10), M.darkWood, x, Y - 0.9, z, { rx: Math.PI / 2, uv: false });
      out.lifts.push(V(x, y0, z));
    }
    // tochas no hipogeu (é escuro debaixo do tablado)
    for (const [x, z] of [[-24, 0], [-10, 0], [4, 0], [14, -2.6], [-18, 10.8], [8, -10.8], [-4, 10.8]]) out.torches.push(V(x, y0 + 2.4, z));
    buildHypogeumLife(B, M, out, y0); // arsenal, gladiadores, médico, jaulas com feras, cabrestantes, braseiros
    S.hypogeum = V(0, y0, 0);
  }
  // ---- muro do pódio (da base do hipogeu até o parapeito acima do terraço), com os portões leste e oeste
  {
    const y0 = Y - C.hyp - 0.4, y1 = Y + C.podiumH + 1.1, gap = (C.gate + 0.3) / C.a0;
    for (const [a, b] of [[gap, Math.PI - gap], [Math.PI + gap, TAU - gap]]) {
      B.geo(ringWall(-0.3, 0.6, a, b, y0, y1), M.marbleWall, 0, 0, 0);
      ringCollide(-0.3, 0.45, a, b, Y - C.hyp - 1, y1);
    }
    for (const s of [-1, 1]) { // lintel e ombreiras dos portões
      B.box(M.marbleWall, 1, y1 - (Y + 3.3), C.gate * 2 + 1.2, s * (C.a0 - 0.3), Y + 3.3, 0);
      for (const sz of [-1, 1]) B.box(M.marbleWall, 1, Y + 3.3 - y0, 0.6, s * (C.a0 - 0.3), y0, sz * (C.gate + 0.3));
    }
    // rede e mastros de proteção no alto do muro (contra as feras)
    for (let i = 0; i < 64; i++) { const th = (i / 64) * TAU, [x, z] = P(-0.3, th); B.geo(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), M.bronze, x, y1 + 0.8, z, { uv: false }); }
  }
  // ---- terraço do pódio e as fileiras, com as escadas radiais; os túneis norte e sul se abrem na cávea
  {
    const step = TAU / C.aisles, nsI = [C.aisles / 4, (3 * C.aisles) / 4];
    // o teto dos túneis norte e sul (o mesmo cálculo dos 14 trechos da rampa, lá embaixo): onde ele passa acima do
    // fundo de uma fileira, a fileira e a escada eram desenhadas por dentro do túnel — blocos pendurados que se
    // atravessava andando. Ali a fileira para na parede do túnel e, se o teto fica abaixo do degrau, uma pedra completa
    B.geo(ringSlab(0, C.podium, 0, TAU, Y + C.podiumH, 1.2), M.marble, 0, 0, 0);
    for (let k = 0; k < C.rows; k++) {
      const d0 = C.podium + k * C.row, d1 = d0 + C.row + 0.02, y = rowY(k), dm = (d0 + d1) / 2, rr = (C.a0 + C.b0) / 2 + dm;
      const cbHi = Math.max(ceilB(d0), ceilB(d1 - 0.03)), cTop = Math.min(ceilB(d0), ceilB(d1 - 0.03)) + 0.4;
      const intrude = rowCutNS(k), cutT = (C.gate + 0.45) * rr / (C.a0 + dm), xe = C.aisleW * (C.a0 + dm) / rr;
      for (let i = 0; i < C.aisles; i++) {
        const a = i * step, b = a + step;
        const c0 = intrude && nsI.includes(i) ? cutT : C.aisleW, c1 = intrude && nsI.includes(i + 1) ? cutT : C.aisleW;
        B.geo(ringSlab(d0, d1, a, b, y, C.rise + 0.6, c0, c1, false), k % 2 ? M.travertine : M.travertine2, 0, 0, 0);
        // escada: dois meios degraus, onde não é a boca de um túnel
        const nsOpen = nsI.includes(i) && rampY(d0) + 3.2 > y;
        if (nsOpen) continue;
        for (const half of [0, 1]) {
          const e0 = d0 + half * (C.row / 2), e1 = e0 + C.row / 2 + 0.02, top = y - (half ? 0 : C.rise / 2);
          let h = C.rise + 0.4; if (intrude && nsI.includes(i)) { h = Math.min(h, top - cTop); if (h < 0.03) continue; } // (por cima do teto do túnel, não através dele)
          B.geo(ringSlab(e0, e1, a - C.aisleW / ((C.a0 + C.b0) / 2 + e0), a + C.aisleW / ((C.a0 + C.b0) / 2 + e0), top, h, 0, 0, false), M.marble, 0, 0, 0);
        }
      }
      if (intrude && y > cTop + 0.02) for (const s of [-1, 1]) for (const sx of [-1, 1]) { const w = C.gate + 0.45 - xe; B.box(k % 2 ? M.travertine : M.travertine2, w, y - cbHi, C.row + 0.02, sx * (xe + w / 2), cbHi, s * (C.b0 + dm), { noGround: true }); }
      // teto dos túneis: em cima, os degraus continuam (caixas que servem de piso para quem anda na arquibancada)
      for (const s of [-1, 1]) {
        addBox(s * (C.a0 + (d0 + d1) / 2), 0, C.row, C.gate * 2, Y + 3.2, y); // leste/oeste
        const ceil = rampY(d0) + 3.2; if (ceil < y) addBox(0, s * (C.b0 + (d0 + d1) / 2), C.gate * 2, C.row, ceil, y); // norte/sul
      }
    }
    // túneis: paredes e teto dos de leste/oeste; rampa, paredes e teto dos de norte/sul
    for (const s of [-1, 1]) {
      const xa = C.a0, xb = C.a0 + C.D;
      for (const sz of [-1, 1]) { B.box(M.brick, xb - xa, 3.2, 0.4, s * (xa + xb) / 2, Y, sz * (C.gate + 0.2)); addBox(s * (xa + xb) / 2, sz * (C.gate + 0.2), xb - xa, 0.4, Y - 1, Y + 3.2); }
      B.box(M.travertine, xb - xa, 0.4, C.gate * 2 + 0.8, s * (xa + xb) / 2, Y + 3.2, 0);
      // piso de pedra do túnel, da fachada até dentro da arena: o chão desenhado (grade de 3,4 m) descia em rampa da
      // altura do túnel até o fundo do hipogeu bem na soleira, e ali aparecia um buraco
      { const x0 = C.a0 - 0.8, x1 = C.A + 0.3; B.box(M.travertine2, x1 - x0, 0.3, C.gate * 2 + 0.1, s * (x0 + x1) / 2, Y - 0.28, 0); }
      // norte/sul: rampa (segmentos inclinados)
      const n = 14;
      for (let j = 0; j < n; j++) {
        const dA = C.podium + (j / n) * (C.D - C.podium), dB = C.podium + ((j + 1) / n) * (C.D - C.podium), yA = rampY(dA), yB = rampY(dB), zc = s * (C.b0 + (dA + dB) / 2), len = dB - dA; // desde o pódio: sem vão entre a fila da frente e o túnel
        const slope = Math.atan2(yA - yB, len) * s;
        B.box(M.travertine, C.gate * 2, 0.3, len + 0.05, 0, (yA + yB) / 2 - 0.3, zc, { rx: slope });
        for (const sx of [-1, 1]) { B.box(M.brick, 0.4, 3.4 + Math.abs(yA - yB) + 0.2, len + 0.05, sx * (C.gate + 0.2), Math.min(yA, yB), zc); /* (até dentro do teto: na rampa sobrava uma fresta entre a parede e o teto) */ addBox(sx * (C.gate + 0.2), zc, 0.4, len, Math.min(yA, yB) - 1, Math.max(yA, yB) + 3.2); }
        // teto do túnel; onde as fileiras ficam mais baixas que ele, o teto vira o camarote elevado (o pulvinar), com mureta
        { const top = Math.max(yA, yB) + 3.2, rowH = rowY(Math.min(C.rows - 1, Math.floor((dA - C.podium) / C.row)));
          B.box(M.travertine, C.gate * 2 + 0.8, 0.4, len + 0.05, 0, top, zc); addBox(0, zc, C.gate * 2 + 0.8, len, top - 0.2, top + 0.4);
          if (top > rowH) for (const sx of [-1, 1]) { B.box(M.marble, 0.3, 1.0, len + 0.05, sx * (C.gate + 0.25), top + 0.4, zc); addBox(sx * (C.gate + 0.25), zc, 0.3, len, top, top + 1.4); } }
      }
    }
    S.podium = V(0, Y + C.podiumH, -(C.b0 + 1.3)); S.topRow = V(0, rowY(C.rows - 1), -(C.b0 + C.D - 0.5));
  }
  // ---- fundo da cávea (com o pórtico do alto), ambulacro, andares de cima e a fachada de arcos
  {
    const gapE = (C.gate + 0.4) / (C.a0 + C.D), gapN = (C.gate + 0.4) / (C.b0 + C.D);
    const segs = [[gapE, Math.PI / 2 - gapN], [Math.PI / 2 + gapN, Math.PI - gapE], [Math.PI + gapE, 1.5 * Math.PI - gapN], [1.5 * Math.PI + gapN, TAU - gapE]];
    const top = rowY(C.rows - 1);
    for (const [a, b] of segs) { B.geo(ringWall(C.D + 0.4, 0.8, a, b, Y, top + 2.6), M.travertine, 0, 0, 0); ringCollide(C.D + 0.4, 0.5, a, b, Y - 1, top + 3); }
    // por cima dos túneis, o muro de fundo continua acima da porta
    for (const th of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) { const [x, z] = P(C.D + 0.4, th); B.box(M.travertine, Math.abs(Math.cos(th)) > 0.5 ? 0.8 : C.gate * 2 + 0.8, top + 2.6 - (Y + 3.2), Math.abs(Math.cos(th)) > 0.5 ? C.gate * 2 + 0.8 : 0.8, x, Y + 3.2, z); ringCollide(C.D + 0.4, 0.5, th - 0.04, th + 0.04, top - 0.5, top + 3); }
    // colunata no alto da cávea (o pórtico de madeira e mármore onde ficava a plebe em pé)
    for (let i = 0; i < 96; i++) { const th = (i / 96) * TAU, [x, z] = P(C.D + 0.2, th); B.geo(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), M.marble, x, top + 2.6 + 2.1, z, { uv: false }); }
    B.geo(ringSlab(C.D - 0.4, C.D + 1.2, 0, TAU, top + 7.2, 0.5), M.travertine, 0, 0, 0);
    // teto do ambulacro e massa dos andares de cima (corredores internos vistos pelos arcos)
    B.geo(ringSlab(C.D + 0.8, C.D + C.amb + 0.2, 0, TAU, Y + 6.8, 0.6), M.travertine, 0, 0, 0);
    B.geo(ringWall(C.D + C.amb - 1.6, 0.6, 0, TAU, Y + 6.8, Y + 26), M.travertine2, 0, 0, 0);
    B.geo(ringSlab(C.D + 0.8, C.D + C.amb + C.wall, 0, TAU, Y + 26.2, 0.6), M.travertine, 0, 0, 0);
    // fachada: 80 vãos em três ordens e o ático
    const dF = C.D + C.amb + C.wall / 2, NB = 80, levels = [[0, 8, 0.6, 0.78, 'tuscan'], [8, 7.5, 0.58, 0.8, 'ionic'], [15.5, 7.5, 0.58, 0.8, 'corinth']];
    const up = new THREE.Vector3(0, 1, 0), mtx = new THREE.Matrix4();
    for (let i = 0; i < NB; i++) {
      // meio vão de deslocamento: os quatro túneis dos eixos saem bem no meio de um arco (e não num pilar)
      const th0 = ((i - 0.5) / NB) * TAU, th1 = ((i + 0.5) / NB) * TAU, thm = (th0 + th1) / 2;
      const [x0, z0] = P(dF, th0), [x1, z1] = P(dF, th1), [xm, zm] = P(dF, thm);
      const w = Math.hypot(x1 - x0, z1 - z0) + 0.04, t = new THREE.Vector3(x1 - x0, 0, z1 - z0).normalize(), n = new THREE.Vector3().crossVectors(t, up).normalize();
      for (const [y0, h, ow, oh] of levels) {
        mtx.makeBasis(t, up, n).setPosition(xm, Y + y0, zm);
        B.add(archBay(w, h, w * ow, h * oh, C.wall), M.facade, mtx);
        if (y0 > 0) { const m2 = mtx.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.55, 0.6)); B.add(new THREE.BoxGeometry(w * ow, 1.1, 0.5), M.facade, m2); } // parapeito
        // meia-coluna na frente do pilar (na borda do vão) e a cornija do andar
        const [cx, cz] = P(dF + C.wall / 2 + 0.1, th0);
        B.geo(new THREE.CylinderGeometry(0.42, 0.46, h - 0.9, 12), M.facade, cx, Y + y0 + (h - 0.9) / 2, cz, { uv: false });
        B.box(M.facade, 1.3, 0.5, 1.3, cx, Y + y0 + h - 0.9, cz, { ry: -thm });
      }
      // ático: parede cheia com janelinha a cada dois vãos, e as mísulas/mastros do velário
      mtx.makeBasis(t, up, n).setPosition(xm, Y + 23, zm);
      B.add(new THREE.BoxGeometry(w, 7, C.wall).translate(0, 3.5, 0), M.facade, mtx);
      if (i % 2 === 0) { const m2 = mtx.clone().multiply(new THREE.Matrix4().makeTranslation(0, 3.6, C.wall / 2 + 0.01)); B.add(new THREE.BoxGeometry(1.2, 1.6, 0.05), M.dark, m2); }
      const [px, pz] = P(dF + C.wall / 2 + 0.25, thm);
      B.geo(new THREE.CylinderGeometry(0.12, 0.14, 7, 6), M.darkWood, px, Y + 30 + 1.5, pz, { uv: false });
      // colisão: pilares do térreo (os vãos ficam livres para entrar)
      const [qx, qz] = P(dF, th0); addCircle(qx, qz, 1.05, Y - 1, Y + 30);
    }
    for (const [y0, h] of levels) B.geo(ringWall(dF + C.wall / 2 + 0.2, 0.6, 0, TAU, Y + y0 + h - 0.5, Y + y0 + h), M.facade, 0, 0, 0); // cornijas
    B.geo(ringWall(dF + C.wall / 2 + 0.2, 0.7, 0, TAU, Y + 29.6, Y + 30.2), M.facade, 0, 0, 0);
    // paredes internas do térreo entre os vãos: o ambulacro fica livre; os pilares do lado de dentro também
    // pilares ímpares: fora dos eixos dos túneis
    for (let i = 1; i < NB; i += 2) { const [x, z] = P(C.D + C.amb * 0.45, (i / NB) * TAU); B.geo(new THREE.CylinderGeometry(0.75, 0.75, 6.8, 8), M.travertine2, x, Y + 3.4, z, { uv: false }); addCircle(x, z, 0.75, Y - 1, Y + 6.8); }
  }
  // ---- velário: o toldo de lona listrada esticado dos mastros do ático sobre a arquibancada (a arena fica a céu
  // aberto). Marinheiros da frota de Miseno manobravam as cordas. Uma malha só, com listras radiais na textura.
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 8; const x = c.getContext('2d');
    for (let i = 0; i < 64; i++) { x.fillStyle = i % 2 ? '#f2e6cc' : (i % 8 === 0 ? '#b8402c' : '#e8d4ac'); x.fillRect(i * 16, 0, 16, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide });
    const dIn = 9, dOut = C.D + C.amb + C.wall + 0.3, n = 160, m = 6, pos = [], uv = [], idx = [];
    for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) {
      const u = j / m, d = dIn + (dOut - dIn) * u, th = (i / n) * TAU, [px, pz] = P(d, th);
      pos.push(px, Y + 23.5 + 6.6 * u - Math.sin(u * Math.PI) * 1.2, pz); uv.push((i / n) * 4, u);
    }
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + n + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const vel = new THREE.Mesh(g, mat); vel.castShadow = true; vel.receiveShadow = true;
    out.extra = out.extra || []; out.extra.push(vel); out.velarium = vel;
    // o anel de cordas que segura a borda de dentro
    B.geo(ringWall(dIn, 0.12, 0, TAU, Y + 23.4, Y + 23.6), M.darkWood, 0, 0, 0);
  }
  // tochas no ambulacro e nas entradas
  for (let i = 0; i < 16; i++) { const [x, z] = P(C.D + 1.2, (i / 16) * TAU + 0.1); out.torches.push(V(x, Y + 3.2, z)); }
  S.colosseum = V(C.x, Y, C.z);
  S.colGateW = V(-(C.A + 3), Y, 0); S.colGateE = V(C.A + 3, Y, 0); S.colArena = V(-10, Y, 0);
  out.zones.coliseu = [C.x - C.A, C.x + C.A, C.z - C.B, C.z + C.B];
}
