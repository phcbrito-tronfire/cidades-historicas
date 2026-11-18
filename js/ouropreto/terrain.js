// Vila Rica (Ouro Preto), 1789 — o relevo: o vale do ribeirão, os dois vales que descem do norte (o do córrego do
// Funil, onde ficam o Pilar e os Contos, e o de Antônio Dias), os espigões entre eles (no do meio, a praça do Palácio;
// a leste, o Alto da Cruz de Santa Efigênia), o Morro da Queimada ao norte e o Itacolomi no horizonte, a sudoeste.
// A vila é uma fileira de arraiais ao longo do Caminho Tronco, de oeste para leste, sempre subindo e descendo: daí as
// ladeiras. As ruas são cortadas no terreno (o chão em volta acompanha), calçadas de pé de moleque, com a água
// correndo pelo meio.
// ESCALA (documentada, como pede o plano): a cidade de verdade tem ~3 km de ponta a ponta; aqui são ~1,4 km, com as
// distâncias encurtadas ~2,2× e os desníveis ~0,6× (a praça fica ~45 m acima dos vales; na real, ~70 a 90 m). Casas,
// igrejas e pessoas ficam em escala real. O Itacolomi está mais perto e um pouco mais baixo que o de verdade.
// Eixos: +x leste, +z sul (o norte é -z). A praça está em (0, 0).
import * as THREE from 'three';
import { fbm, smoothstep, lerp, clamp } from '../comum/util.js';
import { setTerrain, setWater } from '../comum/collision.js';
import { pressAt } from '../comum/chao.js';
export { pressTerrain } from '../comum/chao.js';

const ss = smoothstep;
export const BOUNDS = [-770, 790, -680, 350]; // x0, x1, z0, z1 andáveis

// distância até uma polilinha (com o ponto mais próximo e o comprimento percorrido até ele)
export function polyDist(L, x, z) {
  let best = Infinity, bx = 0, bz = 0, s = 0, bs = 0, seg = 0;
  for (let i = 0; i < L.length - 1; i++) {
    const [ax, az] = L[i], [cx, cz] = L[i + 1], dx = cx - ax, dz = cz - az, l2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bx = px; bz = pz; bs = s + Math.sqrt(l2) * t; seg = i; }
    s += Math.sqrt(l2);
  }
  return { d: best, x: bx, z: bz, s: bs, seg };
}
const polyLen = (L) => { let s = 0; for (let i = 0; i < L.length - 1; i++) s += Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]); return s; };
export function pointAt(L, s) {
  for (let i = 0; i < L.length - 1; i++) { const [ax, az] = L[i], [bx, bz] = L[i + 1], l = Math.hypot(bx - ax, bz - az); if (s <= l || i === L.length - 2) { const t = clamp(s / l, 0, 1); return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / l, dz: (bz - az) / l }; } s -= l; }
  return { x: L[0][0], z: L[0][1], dx: 1, dz: 0 };
}

// ---- a água: o ribeirão (corre de oeste para leste, no sul da vila) e os dois córregos que descem do norte
export const STREAMS = {
  ribeirao: { name: 'Ribeirão do Funil', hw: 3.2, bank: 8, pts: [[-790, 172], [-640, 166], [-500, 180], [-400, 176], [-330, 172], [-220, 184], [-100, 190], [0, 192], [110, 186], [230, 176], [330, 170], [450, 182], [590, 176], [700, 184], [810, 190]] },
  funil: { name: 'Córrego do Funil', hw: 1.5, bank: 4.2, pts: [[-292, -360], [-312, -250], [-306, -150], [-296, -60], [-292, 0], [-299, 39], [-310, 90], [-322, 135], [-330, 172]] },
  adias: { name: 'Córrego de Antônio Dias', hw: 1.5, bank: 4.2, pts: [[350, -360], [330, -250], [336, -150], [328, -50], [331, 20], [334, 74], [331, 125], [330, 170]] },
};
// a margem norte do ribeirão em função de x (a polilinha anda sempre para leste)
function ribZ(x) { const P = STREAMS.ribeirao.pts; for (let i = 0; i < P.length - 1; i++) if (x <= P[i + 1][0]) { const t = clamp((x - P[i][0]) / (P[i + 1][0] - P[i][0]), 0, 1); return lerp(P[i][1], P[i + 1][1], t); } return P[P.length - 1][1]; }

// ---- os lugares: largos, adros das igrejas e a praça (planos cortados no morro, com a borda mansa)
// y: a cota do plano (calculada no relevo, com um ajuste quando o lugar fica cortado ou aterrado no morro)
export const PLACES = {
  // (adro: plano de borda firme, que a Etapa 3 cerca com muro de arrimo de pedra; largo: plano de borda mansa)
  praca: { name: 'Praça do Palácio', x: 0, z: 0, w: 46, d: 104, edge: 3, dy: -1, sz: -0.07 }, // (a praça desce de leve do Palácio para a Câmara, como o espigão)
  palacio: { name: 'Palácio dos Governadores', x: 0, z: -80, w: 60, d: 44, edge: 2, at: 'praca', dy: 0.2, adro: true },
  camara: { name: 'Casa de Câmara e Cadeia, em obra', x: 10, z: 70, w: 34, d: 30, edge: 2, at: 'praca', dy: -0.4, adro: true },
  pilar: { name: 'Matriz de Nossa Senhora do Pilar', x: -442, z: 90, w: 56, d: 50, edge: 2, adro: true },
  rosario: { name: 'Igreja do Rosário', x: -604, z: 30, w: 36, d: 46, edge: 2, adro: true },
  contos: { name: 'Largo dos Contos', x: -245, z: 26, w: 34, d: 30, edge: 6 },
  carmo: { name: 'Igreja do Carmo', x: -62, z: 102, w: 34, d: 46, edge: 2, y: 50, adro: true },
  coimbra: { name: 'Largo de Coimbra', x: 118, z: 94, w: 36, d: 30, edge: 6, y: 37 },
  saofrancisco: { name: 'Igreja de São Francisco de Assis', x: 170, z: 72, w: 60, d: 46, edge: 2, y: 38.5, adro: true, stairs: [{ x: 140, z: 72, w: 10, dir: [-1, 0], to: 'coimbra' }] }, // (a escadaria desce do adro para o Largo de Coimbra)
  antoniodias: { name: 'Matriz de Nossa Senhora da Conceição de Antônio Dias', x: 394, z: 62, w: 46, d: 58, edge: 2, adro: true },
  efigenia: { name: 'Igreja de Santa Efigênia', x: 612, z: -84, w: 38, d: 52, edge: 2, adro: true },
  queimada: { name: 'Morro da Queimada', x: 112, z: -365, w: 64, d: 54, edge: 18 },
};

// ---- terrenos reservados para os prédios grandes que não ficam num adro (as casas não entram aqui)
export const RESERVED = [
  { id: 'contos', x: -277, z: 14, w: 24, d: 22, ry: 0 }, // a Casa dos Contos, entre a Rua de São José e o córrego
  { id: 'opera', x: -100, z: 121.5, w: 14, d: 22, ry: Math.PI }, // a Casa da Ópera, ao lado do Carmo
];

// ---- as ruas: polilinhas com a meia-largura (hw). Cada uma é cortada no terreno com um perfil suave.
export const STREETS = {
  direita: { name: 'Rua Direita', hw: 3.5, pts: [[-23, -6], [-60, 6], [-110, 16], [-165, 22], [-212, 25], [-233, 25]] },
  saojose: { name: 'Rua de São José', hw: 3.2, pts: [[-267, 30], [-284, 34], [-299, 39], [-336, 52], [-385, 70], [-417, 80]] },
  rosario: { name: 'Caminho do Rosário', hw: 2.8, pts: [[-463, 72], [-500, 62], [-545, 46], [-586, 34]] },
  rio: { name: 'Estrada do Rio de Janeiro', hw: 2.6, pts: [[-622, 26], [-660, 18], [-720, 24], [-790, 34]] },
  carmo: { name: 'Ladeira do Carmo', hw: 2.8, pts: [[-12, 52], [-32, 70], [-50, 79]] },
  opera: { name: 'Rua da Ópera', hw: 2.8, pts: [[-79, 110], [-118, 104], [-168, 82], [-212, 52], [-235, 38]] },
  claudio: { name: 'Rua do Ouvidor', hw: 3.0, pts: [[23, 30], [52, 50], [80, 68], [100, 82]] },
  antoniodias: { name: 'Rua de Antônio Dias', hw: 3.0, pts: [[136, 104], [176, 112], [222, 108], [272, 96], [314, 82], [334, 74], [373, 66]] },
  efigenia: { name: 'Ladeira de Santa Efigênia', hw: 2.8, pts: [[394, 33], [420, 10], [460, -18], [510, -46], [560, -66], [593, -76]] },
  mariana: { name: 'Estrada de Mariana', hw: 2.6, pts: [[631, -76], [680, -64], [740, -46], [810, -36]] },
  queimada: { name: 'Caminho do Morro da Queimada', hw: 2.4, pts: [[23, -40], [40, -76], [46, -120], [50, -185], [70, -250], [90, -305], [102, -338]] },
};
for (const S of Object.values(STREETS)) S.len = polyLen(S.pts);
// caixa de cada polilinha (para descartar rápido o que está longe)
function boxOf(O, m) { const xs = O.pts.map((p) => p[0]), zs = O.pts.map((p) => p[1]); O.box = [Math.min(...xs) - m, Math.max(...xs) + m, Math.min(...zs) - m, Math.max(...zs) + m]; }
for (const S of Object.values(STREETS)) boxOf(S, S.hw + 34);
for (const C of Object.values(STREAMS)) { boxOf(C, 50); C.vbox = C.box; boxOf(C, C.bank + 20); } // (vbox: a caixa larga do vale, onde o chão amansa)
const near = (O, x, z) => x > O.box[0] && x < O.box[1] && z > O.box[2] && z < O.box[3];

// ---- relevo de base
// o chão do vale do ribeirão desce de oeste para leste
const valleyY = (x) => lerp(10, -2, clamp((x + 790) / 1600, 0, 1));
// espigões (1) e vales (0): o da praça no meio, o do Alto da Cruz a leste e um mais baixo a oeste (do Rosário)
function ridge(x) { return Math.max(Math.exp(-(((x - 0) / 190) ** 2)), Math.exp(-(((x - 612) / 150) ** 2)), 0.55 * Math.exp(-(((x + 640) / 150) ** 2))); }
// u: quanto se sobe para o norte a partir do ribeirão
const valleyUp = (u) => 0.075 * Math.min(u, 900) + 150 * ss(420, 780, u);
const spurUp = (u) => 50 * (1 - Math.exp(-u / 75)) + 0.06 * Math.min(u, 900) + 150 * ss(420, 780, u);
// a serra ao sul do ribeirão (os morros do lado do Itacolomi, mais baixos que a praça)
const southUp = (v, x) => 0.1 * Math.min(v, 380) + 62 * ss(40, 420, v) * (0.75 + fbm(x * 0.004 + 3, 1, 2) * 0.5) - 40 * ss(700, 1600, v) * (0.6 + fbm(x * 0.002, 4, 2) * 0.8); // (depois da serrinha do sul, o chão desce para o vale do Itacolomi)
function baseHeight(x, z) {
  const zs = ribZ(x), u0 = zs - z, u = Math.sign(u0) * Math.max(0, Math.abs(u0) - 14); // (a várzea: 14 m de chão quase plano de cada lado do ribeirão)
  let h = valleyY(x);
  if (u >= 0) { const R = ridge(x); h += lerp(valleyUp(u), spurUp(u), R); }
  else h += southUp(-u, x);
  // ondulação: morros nunca lisos (menos perto do fundo do vale)
  let rough = ss(0, 60, Math.abs(u));
  // no fundo dos vales dos córregos o chão é manso (o leito desce por igual, sem barranco de pedra a pique)
  if (u > 0) for (const id of ['funil', 'adias']) { const C = STREAMS[id], B = C.vbox; if (x > B[0] && x < B[1] && z > B[2] && z < B[3]) rough *= ss(3, 45, polyDist(C.pts, x, z).d); }
  h += ((fbm(x * 0.008 + 7, z * 0.008, 3) - 0.5) * 14 + (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 2.4) * rough;
  return h;
}

// ---- os planos (praça, largos, adros)
// a cota do plano num ponto (a praça é um plano inclinado: sz é a queda por metro no sentido de z)
export const planeY = (P, x, z) => P.y + (P.sz || 0) * (z - P.z);
function placeY(P) { if (P.y !== undefined) return P.y; const at = P.at && PLACES[P.at]; const base = at ? (placeY(at), planeY(at, P.x, P.z)) : baseHeight(P.x, P.z); return (P.y = base + (P.dy || 0)); }
for (const P of Object.values(PLACES)) placeY(P);
function rectD(x, z, P) { return Math.max(Math.abs(x - P.x) - P.w / 2, Math.abs(z - P.z) - P.d / 2, 0); }
export function inPlace(x, z, P, m = 0) { return Math.abs(x - P.x) < P.w / 2 + m && Math.abs(z - P.z) < P.d / 2 + m; }
function withPlaces(x, z) {
  let h = baseHeight(x, z);
  for (const P of Object.values(PLACES)) { const d = rectD(x, z, P); if (d < P.edge) h = lerp(planeY(P, x, z), h, ss(0, P.edge, d)); }
  return h;
}

// ---- perfil de cada rua: o chão amostrado a cada 2 m, alisado (a ladeira sobe por igual, sem degraus), com as
// pontas presas na cota dos largos e a corcova das pontes de pedra
const SSTEP = 2;
export const BRIDGES = [];
function segX(a, b, c, d) { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null; }
for (const [sid, S] of Object.entries(STREETS)) for (const [cid, C] of Object.entries(STREAMS)) {
  for (let i = 0; i < S.pts.length - 1; i++) for (let j = 0; j < C.pts.length - 1; j++) { const p = segX(S.pts[i], S.pts[i + 1], C.pts[j], C.pts[j + 1]); if (!p || BRIDGES.some((B) => Math.hypot(B.x - p[0], B.z - p[1]) < 3)) continue; /* (o mesmo cruzamento achado em dois segmentos vizinhos) */
    const q = polyDist(S.pts, p[0], p[1]), d = pointAt(S.pts, q.s); BRIDGES.push({ street: sid, stream: cid, x: p[0], z: p[1], s: q.s, dx: d.dx, dz: d.dz, hw: S.hw, name: cid === 'funil' ? 'Ponte dos Contos' : cid === 'adias' ? 'Ponte de Antônio Dias' : 'Ponte' }); }
}
function profile(S) {
  if (S.prof) return S.prof;
  const n = Math.ceil(S.len / SSTEP) + 1; let a = new Float32Array(n);
  for (let k = 0; k < n; k++) { const p = pointAt(S.pts, Math.min(S.len, k * SSTEP)); a[k] = withPlaces(p.x, p.z); }
  // alisa o que sobra da reta entre as duas pontas (refletido nas pontas: elas ficam presas sem degrau)
  const y0 = a[0], y1 = a[n - 1], ramp = (k) => lerp(y0, y1, k / (n - 1));
  for (let k = 0; k < n; k++) a[k] -= ramp(k);
  const r = (i) => (i < 0 ? -a[-i] : i > n - 1 ? -a[2 * (n - 1) - i] : a[i]);
  for (let pass = 0; pass < 4; pass++) { const b = new Float32Array(n); for (let k = 0; k < n; k++) { let s = 0; for (let j = -6; j <= 6; j++) s += r(clamp(k + j, -(n - 1), 2 * (n - 1))); b[k] = s / 13; } b[0] = 0; b[n - 1] = 0; a = b; }
  for (let k = 0; k < n; k++) a[k] += ramp(k);
  // nenhuma ladeira passa do limite (o calçamento desce por igual, cortando o morro ou em aterro, sem rampa de 100%)
  const g = Math.max(0.23, (Math.abs(y1 - y0) / S.len) * 1.12) * SSTEP;
  for (let it = 0; it < 6; it++) { for (let k = 1; k < n; k++) a[k] = clamp(a[k], a[k - 1] - g, a[k - 1] + g); a[n - 1] = y1; for (let k = n - 2; k >= 0; k--) a[k] = clamp(a[k], a[k + 1] - g, a[k + 1] + g); a[0] = y0; }
  { const b = Float32Array.from(a); for (let k = 1; k < n - 1; k++) b[k] = (a[k - 1] + a[k] * 2 + a[k + 1]) / 4; a = b; }
  for (const B of BRIDGES) if (STREETS[B.street] === S) { for (let k = 0; k < n; k++) { const d = Math.abs(k * SSTEP - B.s); a[k] += 1.9 * (1 - ss(0, 16, d)); } B.y = a[Math.round(B.s / SSTEP)]; }
  return (S.prof = a);
}
function profAt(S, s) { const P = profile(S), f = clamp(s / SSTEP, 0, P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), t = f - i; return P[i] + (P[i + 1] - P[i]) * t; }
for (const S of Object.values(STREETS)) profile(S);
export const streetY = (S, s) => profAt(S, s); // (a altura do eixo da rua, s metros desde o começo)
// a altura da rua num ponto (null se longe): o centro um pouco mais fundo (a água da chuva corre pelo meio)
export function streetAt(x, z) {
  let best = null;
  for (const S of Object.values(STREETS)) { if (!near(S, x, z)) continue; const q = polyDist(S.pts, x, z); if (q.d < S.hw && (!best || q.d < best.d)) best = { d: q.d, S, s: q.s, y: profAt(S, q.s) - 0.07 * (1 - q.d / S.hw) ** 2 }; }
  return best;
}
const STREET_EDGE = 11;
function withStreets(x, z) {
  let h = withPlaces(x, z);
  for (const S of Object.values(STREETS)) {
    if (!near(S, x, z)) continue; const q = polyDist(S.pts, x, z); if (q.d > S.hw + STREET_EDGE) continue;
    const ys = profAt(S, q.s) - 0.07 * (1 - Math.min(1, q.d / S.hw)) ** 2;
    h = lerp(ys, h, ss(S.hw, S.hw + STREET_EDGE, q.d));
  }
  return h;
}

// ---- o leito dos córregos: amostrado no relevo SEM as ruas (a ponte passa por cima), sempre descendo
const BSTEP = 2;
function bedProfile(C) {
  if (C.bed) return C.bed;
  C.len = polyLen(C.pts); const n = Math.ceil(C.len / BSTEP) + 1, bed = new Float32Array(n);
  const deep = C.hw > 2 ? 2.0 : 1.8;
  for (let k = 0; k < n; k++) { const p = pointAt(C.pts, Math.min(C.len, k * BSTEP)); bed[k] = withPlaces(p.x, p.z) - deep; if (k) bed[k] = Math.min(bed[k], bed[k - 1] - 0.006); }
  return (C.bed = bed);
}
for (const C of Object.values(STREAMS)) bedProfile(C);
// os córregos desaguam no ribeirão: a boca de cada um fica na altura da água do ribeirão (nada de cachoeira na foz)
for (const id of ['funil', 'adias']) { const C = STREAMS[id], R = STREAMS.ribeirao, end = C.pts[C.pts.length - 1], q = polyDist(R.pts, end[0], end[1]), rb = bedAt(R, q.s);
  const n = C.bed.length; for (let k = n - 1; k >= 0; k--) { const need = rb + (n - 1 - k) * BSTEP * 0.012; if (C.bed[k] < need) C.bed[k] = need; else break; } }
export function bedAt(C, s) { const P = C.bed, f = clamp(s / BSTEP, 0, P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), t = f - i; return P[i] + (P[i + 1] - P[i]) * t; }
export const DEPTH = 0.42; // a lâmina d'água (os córregos de Vila Rica eram rasos fora das chuvas)
export function streamLevel(C, q) { return bedAt(C, q.s) + DEPTH; }

export function terrainHeight(x, z) {
  let h = withStreets(x, z);
  // os córregos: leito plano, barranco curto que passa logo da água e depois a encosta (nada de água no ar)
  for (const C of Object.values(STREAMS)) {
    if (!near(C, x, z)) continue; const q = polyDist(C.pts, x, z), W = C.bank + 6; if (q.d > W) continue;
    const bed = bedAt(C, q.s), top = bed + DEPTH + (C.hw > 2 ? 0.9 : 1.1);
    const inner = q.d < C.bank ? bed + (top - bed) * ss(C.hw, C.bank, q.d) : lerp(top, Math.max(h, top), ss(C.bank, C.bank + 3, q.d));
    h = lerp(inner, h, ss(C.bank + 3, W, q.d));
  }
  return h;
}

// a altura do chão para andar: o terreno, mas logo abaixo das lajes de piso
export function groundHeight(x, z) { return Math.min(terrainHeight(x, z), pressAt(x, z) + 0.05); }
export function waterLevelAt(x, z) {
  for (const C of Object.values(STREAMS)) { if (!near(C, x, z)) continue; const q = polyDist(C.pts, x, z); if (q.d < C.hw + 0.9) return streamLevel(C, q); }
  return -100;
}
setTerrain(groundHeight);
setWater(waterLevelAt);

// ---------------------------------------------------------------------------
// Onde fica o quê: as faixas das casas (ao longo das ruas), o mato, os capões de mata e as lavras
// ---------------------------------------------------------------------------
// a faixa das casas: dos dois lados das ruas e em volta dos largos (as casas entram na Etapa 3; nada de árvore aqui)
export function houseBand(x, z, m = 0) {
  for (const S of Object.values(STREETS)) { if (!near(S, x, z)) continue; const q = polyDist(S.pts, x, z); if (q.d < S.hw + 16 + m) return true; }
  for (const P of Object.values(PLACES)) if (inPlace(x, z, P, 8 + m)) return true;
  return false;
}
// as lavras: barrancos de terra vermelha e cascalho nos morros do norte, onde a água das catas desmontou o morro
export function mineAt(x, z) {
  const u = ribZ(x) - z; if (u < 240) return 0;
  const n = fbm(x * 0.012 + 40, z * 0.012 - 8, 3), q = Math.hypot(x - PLACES.queimada.x, z - PLACES.queimada.z);
  return clamp(ss(0.55, 0.7, n) * ss(240, 340, u) + (1 - ss(60, 160, q)) * 0.5 * ss(0.4, 0.6, n), 0, 1);
}
// capões de mata: nos fundos dos vales acima da vila e nas grotas dos morros (o resto foi derrubado para lenha,
// carvão e mineração — em 1789 os morros em volta de Vila Rica eram quase pelados)
export function forestAt(x, z) {
  const u = ribZ(x) - z;
  let f = 0;
  for (const id of ['funil', 'adias']) { const q = polyDist(STREAMS[id].pts, x, z); if (u > 330) f = Math.max(f, 1 - ss(25, 70, q.d)); }
  f = Math.max(f, ss(0.62, 0.74, fbm(x * 0.01 + 11, z * 0.01 + 3, 3)) * (u < 0 ? 1 : ss(260, 420, u)));
  if (u < -40) f = Math.max(f, ss(0.5, 0.62, fbm(x * 0.008 - 5, z * 0.008, 3)) * ss(-40, -160, u) * 0.9); // os morros do sul, menos mexidos
  f *= 1 - mineAt(x, z);
  if (houseBand(x, z, 4)) f = 0;
  for (const C of Object.values(STREAMS)) if (near(C, x, z) && polyDist(C.pts, x, z).d < C.bank + 1.5) f = 0;
  return clamp(f, 0, 1);
}
export function meadowAt(x, z) { return !houseBand(x, z, 2) && forestAt(x, z) < 0.2 && mineAt(x, z) < 0.3 && Object.values(STREAMS).every((C) => polyDist(C.pts, x, z).d > C.bank + 1); }

// ---------------------------------------------------------------------------
// Superfície: canais [seixos do leito, terra vermelha (lavras, caminhos de terra, terreiros), capim, pé de moleque]
// ---------------------------------------------------------------------------
function surface(x, z) {
  const n = fbm(x * 0.02 + 11, z * 0.02, 3), n2 = fbm(x * 0.09, z * 0.09, 2);
  let bed = 0; for (const C of Object.values(STREAMS)) { if (!near(C, x, z)) continue; const q = polyDist(C.pts, x, z); bed = Math.max(bed, 1 - ss(C.hw + 0.6, C.bank + 0.5, q.d)); }
  const st = streetAt(x, z), cob = st ? 1 - ss(st.S.hw - 0.35, st.S.hw, st.d) : 0;
  let place = 0; for (const [id, P] of Object.entries(PLACES)) if (id !== 'queimada' && id !== 'palacio') place = Math.max(place, 1 - ss(0, 1.2, rectD(x, z, P)));
  // nos largos: terra batida com pedras soltas (só os caminhos principais eram calçados); a praça é de terra também
  const mine = mineAt(x, z);
  let earth = Math.max(place * 0.9, mine, ss(0.62, 0.8, n2) * 0.35);
  // beira das ruas: terra pisada antes do capim (as casas cobrem isto depois)
  if (!st) { let ne = 0; for (const S of Object.values(STREETS)) { if (!near(S, x, z)) continue; const q = polyDist(S.pts, x, z); ne = Math.max(ne, 1 - ss(S.hw, S.hw + 1.6, q.d)); } earth = Math.max(earth, ne * 0.7); }
  let grass = clamp(0.85 + (n - 0.5) * 0.6, 0, 1);
  earth *= 1 - bed; grass *= (1 - bed) * (1 - earth) * (1 - cob); earth *= 1 - cob;
  const b = bed * (1 - cob);
  const v = 0.92 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 0.2;
  const sum = b + earth + grass + cob || 1;
  return [v, v, v, b / sum, earth / sum, grass / sum, cob / sum];
}

const TEXSET = (P) => ({
  tSand: { value: P.dry_ground_rocks.map }, tGround: { value: P.barro_ocre.map }, tGrass: { value: P.sparse_grass.map },
  tTrail: { value: P.rocky_trail.map }, tRock: { value: P.rock_face_03.map },
  uTime: { value: 0 }, uGrass: { value: new THREE.Vector3(0.92, 1.0, 0.7) }, uDry: { value: 0 },
});
function terrainMaterial(tex) {
  const P = tex.pbr;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: P.dry_ground_01.map, normalMap: P.dry_ground_01.normalMap, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
  mat.userData.keepEnv = true;
  const U = TEXSET(P);
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 splat;\nattribute float forest;\nvarying vec4 vSplat;\nvarying float vForest;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvForest = forest;\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tSand, tGround, tGrass, tTrail, tRock; uniform float uTime, uDry; uniform vec3 uGrass;
varying vec4 vSplat; varying float vForest; varying vec3 vWP; varying vec3 vWN;
vec4 tri(sampler2D t, vec2 p){ return mix(texture2D(t, p), texture2D(t, p * 0.21 + 0.37), 0.4); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
// pé de moleque: pedras irregulares de quartzito (cinzas, algumas com a ferrugem do minério) assentadas na terra
vec3 cobble(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; vec2 id = vec2(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = h22(i + g) * 0.76 + 0.12; vec2 r = g + o - f; float d = dot(r, r); if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
  return vec3(sqrt(d2) - sqrt(d1), h21(id), sqrt(d1)); }`)
      .replace('#include <map_fragment>', `
vec4 w = vSplat / max(0.0001, vSplat.x + vSplat.y + vSplat.z + vSplat.w);
vec2 P = vWP.xz;
vec3 cS = tri(tSand, P / 3.0).rgb * vec3(0.78, 0.74, 0.68); // seixos e cascalho do leito
vec3 cG = tri(tGround, P / 4.0).rgb * vec3(0.92, 0.66, 0.5); // a terra vermelha de Minas (o minério de ferro tinge tudo)
cG = mix(cG, cG * vec3(0.78, 0.7, 0.62), vn(P / 7.0) * 0.5);
vec3 cGr0 = tri(tGrass, P / 5.0).rgb; float gL = dot(cGr0, vec3(0.3, 0.59, 0.11));
vec3 cGr = mix(cGr0 * vec3(0.86, 0.96, 0.6), gL * vec3(1.42, 1.5, 0.82), 0.78) * uGrass;
cGr = mix(cGr, cGr * vec3(1.12, 1.0, 0.82), smoothstep(0.35, 0.75, vn(P / 23.0))); // (manchas de capim mais seco)
cGr *= 1.18; // capim do campo: verde-oliva, puxando para o palha
cGr = mix(cGr, gL * vec3(1.55, 1.35, 0.85), uDry * (0.5 + 0.5 * vn(P / 12.0))); // (no tempo seco, o capim amarela)
cGr = mix(cGr, cGr * vec3(0.6, 0.66, 0.5), vForest * 0.65); // chão de mata: sombra e folhas
// pé de moleque
vec3 cb = cobble(P / 0.17); float stone = smoothstep(0.05, 0.16, cb.x);
vec3 sc = mix(vec3(0.27, 0.25, 0.215), vec3(0.34, 0.27, 0.2), smoothstep(0.5, 0.95, cb.y)) * (0.78 + 0.42 * fract(cb.y * 7.13));
sc *= 0.7 + 0.5 * smoothstep(0.02, 0.2, cb.x); // (a pedra é abaulada: clara no alto, escura na beira onde encosta na terra)
vec3 mortar = tri(tGround, P / 2.0).rgb * vec3(0.34, 0.26, 0.2);
vec3 cT = mix(mortar, sc * (0.8 + 0.35 * tri(tTrail, P / 1.6).r), stone);
cT *= (0.85 + 0.25 * vn(P / 3.0)) * vec3(1.04, 1.0, 0.9); // (trechos mais gastos e mais sujos; o quartzito puxa para o amarelo, não para o azul)
cT = mix(cT, vec3(0.2, 0.18, 0.15) * (0.9 + 0.2 * vn(P / 6.0)), smoothstep(22.0, 70.0, length(vViewPosition))); // (de longe, a média das pedras e da terra: sem o calçamento virar risco branco)
vec3 baseC = (cS * w.x + cG * w.y + cGr * w.z + cT * w.w) * 1.08;
vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
vec3 cR = (texture2D(tRock, vWP.zy / 14.0).rgb * bw.x + texture2D(tRock, vWP.xz / 14.0).rgb * bw.y + texture2D(tRock, vWP.xy / 14.0).rgb * bw.z) * vec3(0.78, 0.72, 0.68);
float rockW = smoothstep(0.5, 0.7, 1.0 - vWN.y) * (1.0 - w.w);
vec3 col = mix(baseC, cR, rockW);
diffuseColor.rgb *= col;`)
      ; // (a pedra seca e gasta fica fosca como a terra: com brilho, o calçamento refletia o céu e ficava branco de longe)
  };
  return mat;
}

function terrainMesh(mat, X0, X1, Z0, Z1, step, lower = null) {
  const SEGX = Math.round((X1 - X0) / step), SEGZ = Math.round((Z1 - Z0) / step);
  const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SEGX, SEGZ);
  geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3), splat = new Float32Array(pos.count * 4), forest = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, (lower === 'far' ? farHeight(x, z) : terrainHeight(x, z)) - (typeof lower === 'function' ? lower(x, z) : 0)); }
  geo.computeVertexNormals();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), s = lower === 'far' ? [1, 1, 1, 0, 0.12, 0.88, 0] : surface(x, z);
    colors.set(s.slice(0, 3), i * 3); splat.set(s.slice(3), i * 4); forest[i] = lower === 'far' ? ss(0.45, 0.7, fbm(x * 0.0016 + 3, z * 0.0016 - 7, 3)) * 0.9 : forestAt(x, z); // (de longe: manchas de mata nas serras, mais preservadas que os morros da vila)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
  geo.setAttribute('forest', new THREE.BufferAttribute(forest, 1));
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
  return mesh;
}

// ---- o Itacolomi: o maciço a sudoeste, com a pedra no alto e a "filha" (a pedra menor) do lado — o nome vem do
// tupi, "pedra-menino". Aqui fica a ~3,5 km da praça (o de verdade, a uns 6 km), visível de quase toda a vila.
export const ITACOLOMI = { x: -1500, z: 3300, H: 520, R: 2300 };
function itacolomiH(x, z) {
  const I = ITACOLOMI, u = (x - I.x) * 0.8 + (z - I.z) * 0.6, v = -(x - I.x) * 0.6 + (z - I.z) * 0.8, d = Math.hypot(u / 1.5, v); if (d > I.R * 1.2) return 0; // (a crista corre de sudoeste para nordeste)
  const t = Math.max(0, 1 - d / I.R);
  let h = I.H * (1 - Math.pow(1 - t, 2.2)) * 0.95 + (fbm(x * 0.003, z * 0.003, 3) - 0.5) * 120 * t;
  // as duas pedras do alto: um bloco de quartzito de paredes quase retas e um menor ao lado
  const rock = (cx, cz, r, hh) => { const q = Math.hypot(x - cx, z - cz); return hh * (1 - ss(r * 0.75, r, q)); };
  h += rock(I.x + 30, I.z - 40, 130, 20) + rock(I.x + 175, I.z - 5, 70, 12); // (a base das pedras; as pedras mesmo são malhas à parte)
  return h;
}
function itacolomiRocks(tex) {
  // (uma "pedra" grande e arredondada, de paredes quase retas e o alto em cúpula, e a "filha" menor do lado)
  const P = tex.pbr.rock_face_03, m = new THREE.MeshStandardMaterial({ map: P.map, normalMap: P.normalMap, color: 0xb4b0a6, roughness: 0.95 });
  const g = new THREE.Group(), I = ITACOLOMI;
  for (const [dx, dz, r, h, sd] of [[30, -40, 80, 175, 3], [175, -5, 42, 95, 9]]) {
    const geo = new THREE.SphereGeometry(1, 28, 18); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const side = Math.pow(Math.max(0, 1 - Math.max(0, y) ** 6), 0.5); // (as paredes sobem quase retas e o alto fecha em cúpula)
      const k = (y < 0 ? 1.08 : side) * (1 + (fbm(a * 3 + sd, y * 2, 3) - 0.5) * 0.3) * (1 - Math.max(0, y) * 0.12);
      p.setXYZ(i, Math.cos(a) * k * r, (y < 0 ? y * 0.4 : y) * h, Math.sin(a) * k * r * 0.8); }
    geo.computeVertexNormals();
    const x = I.x + dx, z = I.z + dz, mesh = new THREE.Mesh(geo, m); mesh.position.set(x, farHeight(x, z) - 14, z); mesh.rotation.y = 0.6; g.add(mesh);
  }
  return g;
}
// o relevo longe da vila: os morros continuam, a serra de Ouro Preto ao norte, o Itacolomi a sudoeste
function farHeight(x, z) {
  const inside = x > BOUNDS[0] - 60 && x < BOUNDS[1] + 60 && z > BOUNDS[2] - 60 && z < BOUNDS[3] + 60;
  let h = inside ? terrainHeight(x, z) : baseHeight(x, z);
  h += itacolomiH(x, z);
  h += 120 * ss(-900, -2200, z) * (0.6 + fbm(x * 0.002, 3, 3) * 0.8); // a serra ao norte (a Serra de Ouro Preto)
  return h;
}

// três malhas: o miolo da vila (ruas e largos, 2 m), o resto da área andável (4 m) e o longe (40 m), cada uma um pouco
// abaixo onde a mais fina cobre (sem briga de texturas)
export const CORE = [-650, 670, -140, 205];
export function buildTerrain(scene, tex) {
  const mat = terrainMaterial(tex);
  const [cx0, cx1, cz0, cz1] = CORE;
  const core = terrainMesh(mat, cx0, cx1, cz0, cz1, 2);
  const inCore = (x, z) => x > cx0 + 2.5 && x < cx1 - 2.5 && z > cz0 + 2.5 && z < cz1 - 2.5;
  const X0 = BOUNDS[0] - 30, X1 = BOUNDS[1] + 30, Z0 = BOUNDS[2] - 30, Z1 = BOUNDS[3] + 30;
  const mid = terrainMesh(mat, X0, X1, Z0, Z1, 4, (x, z) => (inCore(x, z) ? 2.5 : 0));
  const inside = (x, z) => x > X0 + 4 && x < X1 - 4 && z > Z0 + 4 && z < Z1 - 4;
  const far = terrainMesh(mat, -5200, 5200, -4400, 6400, 40, 'far');
  { const p = far.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (inside(p.getX(i), p.getZ(i))) p.setY(i, p.getY(i) - 30); far.geometry.computeVertexNormals(); }
  far.receiveShadow = false;
  scene.add(core, mid, far);
  scene.add(itacolomiRocks(tex));
  return { terrain: core, mid, far, mat };
}

// as serras no horizonte (o Espinhaço ao norte e a leste, a Serra do Itacolomi ao sul), azuladas pela distância
export function buildHorizon(scene) {
  const R = 6000, SEG = 360, ROWS = 6;
  const geo = new THREE.CylinderGeometry(R, R, 1, SEG, ROWS, true);
  const p = geo.attributes.position, colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i) + 0.5, a = Math.atan2(z, x), dx = Math.cos(a), dz = Math.sin(a);
    const ridgeN = 1 - Math.abs(2 * fbm(dx * 3 + 5, dz * 3 + 5, 4) - 1);
    const top = 160 + ridgeN * 380 + fbm(a * 18, 3, 2) * 70;
    const k = 1 - y * 0.1;
    p.setXYZ(i, x * k, -30 + y * top, z * k);
    const shade = 0.7 + y * 0.3; colors[i * 3] = 0.52 * shade; colors[i * 3 + 1] = 0.56 * shade; colors[i * 3 + 2] = 0.58 * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, side: THREE.DoubleSide });
  const U = { uHaze: { value: new THREE.Color(0xb8c8d8) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze;\nvarying float vH;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat hz = 0.5 + 0.38 * (1.0 - smoothstep(0.0, 500.0, vH));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);');
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.userData.haze = U.uHaze;
  scene.add(mesh);
  return mesh;
}

// nome do lugar onde o explorador está
export function placeName(x, z, y) {
  for (const B of BRIDGES) if (Math.hypot(x - B.x, z - B.z) < 9) return B.name;
  for (const P of Object.values(PLACES)) if (inPlace(x, z, P, 4)) return P.name;
  const st = streetAt(x, z); if (st) return st.S.name;
  for (const C of Object.values(STREAMS)) if (polyDist(C.pts, x, z).d < C.bank + 4) return 'Beira do ' + C.name;
  if (mineAt(x, z) > 0.4) return 'Lavras do morro';
  const u = ribZ(x) - z;
  if (u < -20) return 'Morros do sul, de frente para o Itacolomi';
  if (u > 380) return 'Morro da Queimada';
  if (x < -360) return 'Bairro do Pilar';
  if (x > 260) return 'Bairro de Antônio Dias';
  return 'Vila Rica';
}
