// Roma, c. 117 d.C. (Trajano) — relevo: o vale do Coliseu entre o Palatino, o Célio e o Ópio (Esquilino), o Fórum
// até o Capitólio, o Circo Máximo entre o Palatino e o Aventino, o Campo de Marte na várzea, o Tibre com suas curvas
// e a ilha Tiberina, e o rio descendo até o mar Tirreno em Óstia. Distâncias encurtadas de propósito (o mar fica a
// ~25 km): um mapa compacto, sem campo vazio — do Aventino já se vê o mar, e do porto se volta a pé ao Circo.
// Eixos: +x leste, +z sul. O Coliseu está em (0, 0).
import * as THREE from 'three';
import { fbm, smoothstep, lerp, clamp } from '../comum/util.js';
import { setTerrain, setWater } from '../comum/collision.js';
import { COL, colGround, colTerrain } from './coliseu.js';

export const WATER_Y = 0;
export const BOUNDS = [-980, 290, -420, 980]; // x0, x1, z0, z1 andáveis (o mar segue até o horizonte)
const ss = smoothstep;

// costa do Tirreno a sudoeste: distância assinada ao longo de N (c > 0 = mar)
const NX = -0.72, NZ = 0.69;
export const along = (x, z) => 0.69 * x + 0.72 * z;
const shoreS = (a) => 800 + 12 * Math.sin(a / 70) + 6 * Math.sin(a / 23 + 1);
export function coastC(x, z) { return NX * x + NZ * z - shoreS(along(x, z)); }
export function coastPoint(a, off = 0) { const s = shoreS(a) + off; return { x: 0.69 * a + NX * s, z: 0.72 * a + NZ * s }; }

// Portus de Trajano (100–112 d.C.): a bacia hexagonal escavada ao lado da foz, ligada ao mar por um canal
const TX = 0.69, TZ = 0.72; // direção da costa (tangente)
export const PORTUS = (() => { const a = -255, off = -80, s = shoreS(a) + off; return { x: 0.69 * a + NX * s, z: 0.72 * a + NZ * s, R: 54, a, off }; })();
export function portusLocal(x, z) { const dx = x - PORTUS.x, dz = z - PORTUS.z; return { u: dx * TX + dz * TZ, v: dx * NX + dz * NZ }; } // u ao longo da costa, v para o mar
export function portusHex(x, z) { const { u, v } = portusLocal(x, z), ax = Math.abs(u), ay = Math.abs(v); return Math.max(ax * 0.8660254 + ay * 0.5, ay); } // < R·0,866 = dentro
export function inPortus(x, z, m = 0) { const { u, v } = portusLocal(x, z); return portusHex(x, z) < PORTUS.R * 0.866 + m || (Math.abs(u) < 13 + m && v > 0 && v < 140); }
// o Tibre: linha de pontos de norte a sul, com as curvas do Campo de Marte e a ilha Tiberina, até a foz em Óstia
export const TIBER = [[-560, -560], [-520, -380], [-610, -200], [-570, -40], [-500, 90], [-470, 200], [-540, 360], [-600, 470], [-660, 580], [-720, 690]];
export const TIBER_HALF = 30;
export const ISOLA = { x: -490, z: 150, a: 13, b: 34, rot: 0.25 }; // ilha Tiberina
export function tiberDist(x, z) {
  let best = 1e9, t = 0;
  for (let i = 0; i < TIBER.length - 1; i++) {
    const [ax, az] = TIBER[i], [bx, bz] = TIBER[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(x - ax - dx * u, z - az - dz * u);
    if (d < best) { best = d; t = i + u; }
  }
  return { d: best, t };
}

// lugares de referência (o resto do mapa usa)
export const FORUM = { x: -205, z: -18, hw: 105, hd: 40, y: 0 };
export const CIRCUS = { x: -235, z: 250, hw: 150, hd: 34, y: 0 };
export const PALATINE = { x: -165, z: 115, top: 0 };
export const CAPITOL = { x: -356, z: -30, top: 32, rx: 42, rz: 50 }; // o platô do Capitólio (Área Capitolina)
// Clivo Capitolino: a rampa calçada que sobe do Fórum, contorna o morro pelo sul e chega ao platô
export const CLIVUS = [[-296, 54], [-342, 56], [-396, 40], [-406, 6], [-386, -8]];
const CLV = (() => { const L = [0]; for (let i = 1; i < CLIVUS.length; i++) L.push(L[i - 1] + Math.hypot(CLIVUS[i][0] - CLIVUS[i - 1][0], CLIVUS[i][1] - CLIVUS[i - 1][1])); return L; })();
export function clivus(x, z) { // distância à rampa e a altura dela ali
  let best = 1e9, s = 0;
  for (let i = 0; i < CLIVUS.length - 1; i++) {
    const [ax, az] = CLIVUS[i], [bx, bz] = CLIVUS[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * u, z - az - dz * u);
    if (d < best) { best = d; s = CLV[i] + u * Math.sqrt(L2); }
  }
  const top = CLV[3], y = s >= top ? CAPITOL.top : lerp(FORUM.y - 0.3, CAPITOL.top, s / top);
  return { d: best, y };
}
export const DOMUS = { x: -332, z: 398, hw: 26, hd: 26, y: 33 }; // a casa rica (domus) no alto do Aventino
export const NAUMACHIA = { x: -770, z: -170, a: 72, b: 48, y: 0 }; // lago da Naumaquia de Trajano (109 d.C.), além do Tibre

const hill = (x, z, cx, cz, rx, rz, rot, hgt, pw = 2) => {
  const c = Math.cos(rot), s = Math.sin(rot), u = ((x - cx) * c + (z - cz) * s) / rx, v = (-(x - cx) * s + (z - cz) * c) / rz;
  const r = Math.hypot(u, v);
  return hgt * Math.max(0, 1 - r ** pw) ** 1.6;
};
const flat = (x, z, cx, cz, hw, hd, y, edge, h) => { const m = Math.max(Math.abs(x - cx) - hw, Math.abs(z - cz) - hd); return m < edge ? lerp(h, y, ss(edge, 0, m)) : h; };

function base(x, z) {
  const d = -coastC(x, z);
  const n1 = fbm(x * 0.006 + 40, z * 0.006 + 40, 4) - 0.5, n2 = fbm(x * 0.03 + 5, z * 0.03 + 9, 3) - 0.5;
  // planície alta da cidade (~8 m), descendo para a várzea do rio e para a praia
  let h = 0.45 + 2 * ss(0, 40, d) + 6 * ss(40, 500, d) + n1 * 2.5 * ss(60, 300, d) + n2 * 0.2;
  if (d < 0) { const c = -d; h = 0.45 - 0.07 * c - 0.0011 * c * c + n1 * 1.2 * ss(30, 200, c); h = Math.max(h, -26 + n1 * 3); }
  return h;
}

export function terrainHeight(x, z) {
  let h = base(x, z);
  const n = fbm(x * 0.05 + 3, z * 0.05 + 1, 3) - 0.5;
  // ---- as colinas: Palatino (palácios), Capitólio (templo de Júpiter), Aventino, Célio, Ópio/Esquilino, Quirinal
  h += hill(x, z, PALATINE.x, PALATINE.z, 120, 82, 0.15, 30, 3) * (0.92 + n * 0.12);
  h += hill(x, z, -330, 400, 115, 95, -0.3, 26, 2.6);
  h += hill(x, z, 95, 205, 120, 80, 0.2, 18);
  h += hill(x, z, 110, -170, 130, 95, -0.2, 17);
  h += hill(x, z, -300, -300, 150, 90, 0.4, 20);
  h += hill(x, z, 330, -40, 160, 300, 0, 12); // Esquilino, a leste
  h = flat(x, z, DOMUS.x, DOMUS.z, DOMUS.hw, DOMUS.hd, DOMUS.y, 14, h); // terreiro plano da domus
  // ---- vales nivelados: o Fórum Romano, o Circo Máximo e o vale do Coliseu
  h = flat(x, z, FORUM.x, FORUM.z, FORUM.hw, FORUM.hd, FORUM.y, 22, h);
  h = flat(x, z, CIRCUS.x, CIRCUS.z, CIRCUS.hw, CIRCUS.hd, CIRCUS.y, 26, h);
  { const e = (x / (COL.A + 30)) ** 2 + (z / (COL.B + 30)) ** 2; if (e < 1.6) h = lerp(h, COL.y, ss(1.6, 1.0, e)); }
  // ---- o Capitólio: platô no alto e penhascos em volta (a Rocha Tarpeia), e a rampa do Clivo subindo
  { const e = Math.hypot((x - CAPITOL.x) / CAPITOL.rx, (z - CAPITOL.z) / CAPITOL.rz); if (e < 1.45 && x < CAPITOL.x + CAPITOL.rx + 9) h = Math.max(h, lerp(CAPITOL.top + n * 0.25, h, ss(1.0, 1.42, e))); }
  { const c = clivus(x, z); if (c.d < 10) h = lerp(h, c.y, ss(10, 4, c.d)); }
  // ---- o Tibre: leito fundo, margens de terra e a ilha Tiberina
  {
    const { d } = tiberDist(x, z), half = TIBER_HALF + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 6;
    if (d < half + 30) {
      const t = Math.min(d, half) / half, bed = -1.8 - 3.8 * (1 - t * t) + n * 0.6;
      h = lerp(h, bed, ss(half + 26, half - 2, d) * (1 - ss(-60, 10, coastC(x, z)))); // no mar o leito some (a foz abre na praia)
    }
    const c = Math.cos(ISOLA.rot), s = Math.sin(ISOLA.rot), u = ((x - ISOLA.x) * c + (z - ISOLA.z) * s) / ISOLA.a, v = (-(x - ISOLA.x) * s + (z - ISOLA.z) * c) / ISOLA.b;
    const r = Math.hypot(u, v); if (r < 1.5) h = Math.max(h, lerp(-2, 2.4 + n * 0.4, ss(1.4, 0.7, r)));
  }
  // ---- Naumaquia de Trajano: bacia oval escavada além do rio (vira lago nos dias de batalha naval)
  { const N = NAUMACHIA, e = ((x - N.x) / N.a) ** 2 + ((z - N.z) / N.b) ** 2; if (e < 1.8) { const ground = lerp(h, 3, ss(1.8, 1.25, e)); h = e < 1 ? lerp(-3.2, ground, ss(0.9, 1.0, e)) : ground; } }
  // ---- bordas do mundo em terra: os montes Albanos e Sabinos ao longe (leste e norte)
  {
    const d = -coastC(x, z);
    const e = Math.max((x - 230) / 110, (-360 - z) / 100);
    if (e > 0 && d > 60) h += ss(0, 1, e) * (24 + (fbm(x * 0.01, z * 0.01, 3) - 0.5) * 26) * ss(60, 160, d);
  }
  // ---- Portus: bacia e canal escavados, fundo de 5 m (as paredes de cais são construídas por cima)
  { const hd = portusHex(x, z), { u, v } = portusLocal(x, z), Rin = PORTUS.R * 0.866;
    if (hd < Rin + 10) h = lerp(h, -5, ss(Rin + 3, Rin, hd));
    if (Math.abs(u) < 22 && v > 0 && v < 150) h = Math.min(h, lerp(-5, h, ss(13, 16, Math.abs(u)))); }
  // ---- dentro do Coliseu: o chão do hipogeu sob a arena e o piso térreo sob a arquibancada
  const c = colTerrain(x, z); if (c !== null) h = c;
  return h;
}

// altura do chão para andar: o terreno, mas com as fileiras, rampas e túneis do Coliseu
export function groundHeight(x, z) {
  const c = colGround(x, z);
  return c !== null ? c : terrainHeight(x, z);
}

export function inRiver(x, z, margin = 0) { return tiberDist(x, z).d < TIBER_HALF + margin; }
export function waterLevelAt(x, z) {
  if (coastC(x, z) > -30 || inRiver(x, z, 14) || inPortus(x, z, 2)) return WATER_Y;
  const N = NAUMACHIA; if (((x - N.x) / N.a) ** 2 + ((z - N.z) / N.b) ** 2 < 1.02) return WATER_Y; // o lago da naumaquia tem água sempre
  return -100;
}

FORUM.y = base(FORUM.x, FORUM.z) + 0.5;
CIRCUS.y = base(CIRCUS.x, CIRCUS.z);
COL.y = base(0, 0);

setTerrain(groundHeight);
setWater(waterLevelAt);

// ---------------------------------------------------------------------------
// Malha do terreno com 4 fotos (areia da praia, terra batida, grama rala, trilha de pedras) + rocha calcária nas
// encostas (projeção nos 3 eixos), areia molhada na beira e luz ondulante (cáusticas) no fundo raso do mar.
// ---------------------------------------------------------------------------
// Roma é verde: colinas de grama e jardins (o Palatino, os horti), pinheiros e ciprestes; na cidade, ruas e praças
// calçadas de pedra (basalto nas vias, travertino em volta do Coliseu e do Fórum) e terra batida só nos becos
// Canais: [areia/barro da margem, terra batida, grama, calçamento]
function surface(x, z, h, slope) {
  const d = -coastC(x, z);
  const n = fbm(x * 0.02 + 11, z * 0.02, 3), n2 = fbm(x * 0.09, z * 0.09, 2), n3 = fbm(x * 0.35 + 5, z * 0.35, 2);
  let sand = 1 - ss(30, 60, d);
  if (d < 0 && h > 0.6) sand = Math.min(sand, 1 - ss(0.8, 2.8, h));
  const riv = 1 - ss(TIBER_HALF + 2, TIBER_HALF + 18, tiberDist(x, z).d);
  if (riv > 0 && d > 30) sand = Math.max(sand, riv * 0.75);
  const inland = 1 - sand;
  // cidade: dentro do círculo urbano, no plano (fora das encostas e do alto das colinas)
  const urban = (1 - ss(470, 640, Math.hypot(x + 160, z - 30))) * (1 - ss(0.1, 0.22, slope)) * (1 - ss(14, 22, h - 8));
  const colPlaza = 1 - ss(1.25, 1.55, Math.hypot(x / (COL.A + 30), z / (COL.B + 30)));
  const forum = Math.max(0, 1 - Math.max(Math.abs(x - FORUM.x) - FORUM.hw, Math.abs(z - FORUM.z) - FORUM.hd, 0) / 14);
  const capE = Math.hypot((x - CAPITOL.x) / CAPITOL.rx, (z - CAPITOL.z) / CAPITOL.rz), clv = clivus(x, z).d;
  let pave = Math.max(colPlaza, forum, urban * clamp(0.55 + (n2 - 0.5) * 1.6, 0, 1), 1 - ss(0.82, 0.96, capE), 1 - ss(3.5, 5.5, clv));
  let grass = (1 - urban * 0.85) * clamp(0.75 + (n - 0.5) * 0.8, 0, 1) + ss(0.14, 0.3, slope) * 0.2;
  let ground = urban * (1 - pave) * 0.9 + (1 - urban) * ss(0.6, 0.75, n3) * 0.35; // terra batida: becos e trilhas
  pave *= inland; grass *= inland * (1 - pave); ground *= inland;
  const v = 0.92 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 0.2;
  let r = v, g = v, b = v;
  // campo: fora da cidade, no plano, a terra é dividida em lotes (trigo maduro, terra arada em sulcos, pasto verde,
  // vinha) separados por cercas vivas — o "ager" que alimentava Roma junto com o trigo do Egito
  const rural = (1 - urban) * inland * (1 - ss(0.07, 0.15, slope)) * ss(50, 110, d) * (1 - riv) * (1 - Math.min(1, pave * 1.5));
  if (rural > 0.02) {
    const ca = Math.cos(0.35), sa = Math.sin(0.35), u = x * ca - z * sa, w = x * sa + z * ca;
    const iu = Math.floor(u / 64), iw = Math.floor(w / 42), fu = u / 64 - iu, fw = w / 42 - iw;
    const hh = Math.abs(Math.sin(iu * 127.1 + iw * 311.7) * 43758.5) % 1;
    const edge = ss(0.015, 0.05, Math.min(fu, 1 - fu)) * ss(0.02, 0.07, Math.min(fw, 1 - fw)); // cerca viva entre os lotes
    const k = rural * edge;
    if (hh < 0.28) { r = lerp(r, 1.22, k); g = lerp(g, 1.08, k); b = lerp(b, 0.62, k); } // trigo maduro
    else if (hh < 0.46) { const furrow = 0.5 + 0.5 * Math.sin(u * 2.4); const t = k * 0.9; ground = lerp(ground, 1, t); grass *= 1 - t; r = lerp(r, 0.8 + furrow * 0.25, t); g = lerp(g, 0.72 + furrow * 0.22, t); b = lerp(b, 0.62 + furrow * 0.2, t); } // terra arada
    else if (hh < 0.66) { r = lerp(r, 0.78, k); g = lerp(g, 1.05, k); b = lerp(b, 0.7, k); } // pasto verde
    else if (hh < 0.8) { const row = ss(0.55, 0.8, 0.5 + 0.5 * Math.sin(w * 2.1)); const t = k * 0.8; ground = lerp(ground, 1 - row * 0.7, t); grass = lerp(grass, row, t); } // vinha em fileiras
    else { r = lerp(r, 1.05, k * 0.6); g = lerp(g, 1.0, k * 0.6); b = lerp(b, 0.82, k * 0.6); } // capim seco
  }
  // na cidade: o calçamento muda de quarteirão para quarteirão (pedra mais clara, mais escura, mais quente)
  if (pave > 0.1) { const pv = fbm(x * 0.012 + 40, z * 0.012, 2) - 0.5; r *= 1 + pv * 0.35; g *= 1 + pv * 0.28; b *= 1 + pv * 0.18; }
  const sum = sand + ground + grass + pave || 1;
  return [r, g, b, sand / sum, ground / sum, grass / sum, pave / sum];
}

export function buildTerrain(scene, tex) {
  const X0 = -1060, X1 = 380, Z0 = -500, Z1 = 1060;
  const SX = X1 - X0, SZ = Z1 - Z0, SEGX = 424, SEGZ = 459; // ~3,4 m por quadrado (leve para PCs fracos)
  const geo = new THREE.PlaneGeometry(SX, SZ, SEGX, SEGZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const colors = new Float32Array(pos.count * 3), splat = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const s = surface(x, z, pos.getY(i), 1 - nor.getY(i));
    colors.set(s.slice(0, 3), i * 3); splat.set(s.slice(3), i * 4);
    uv.setXY(i, x / 4, z / 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
  const P = tex.pbr;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: P.dry_ground_rocks.map, normalMap: P.dry_ground_rocks.normalMap, roughness: 1, metalness: 0 });
  const U = {
    tSand: { value: P.aerial_beach_01.map }, tWet: { value: P.damp_beach_sand.map }, tGround: { value: P.dry_ground_rocks.map }, tGrass: { value: P.sparse_grass.map },
    tTrail: { value: P.seaworn_stone_tiles.map }, tRock: { value: P.rock_face_03.map }, tRockN: { value: P.rock_face_03.normalMap }, tSandN: { value: P.aerial_beach_01.normalMap },
    uTime: { value: 0 },
  };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tSand, tWet, tGround, tGrass, tTrail, tRock, tRockN, tSandN; uniform float uTime;
varying vec4 vSplat; varying vec3 vWP; varying vec3 vWN;
vec4 tri(sampler2D t, vec2 p){ return mix(texture2D(t, p), texture2D(t, p * 0.21 + 0.37), 0.4); }
float cau(vec2 p){ // luz ondulante no fundo raso
  vec2 q = p * 0.55; float c = 0.0;
  for (int i = 0; i < 3; i++) { q = vec2(q.x + sin(q.y * 1.7 + uTime * 0.9), q.y + cos(q.x * 1.5 - uTime * 0.7)); c += abs(sin(q.x) * sin(q.y)); }
  return pow(1.0 - c / 3.0, 6.0);
}`)
      .replace('#include <map_fragment>', `
vec4 w = vSplat / max(0.0001, vSplat.x + vSplat.y + vSplat.z + vSplat.w);
vec2 P = vWP.xz;
vec3 cS = tri(tSand, P / 12.0).rgb * vec3(1.05, 1.0, 0.92);
vec3 cWet = tri(tWet, P / 5.0).rgb * vec3(0.95, 0.92, 0.86);
float wet = 1.0 - smoothstep(0.08, 0.5, vWP.y + (tri(tSand, P / 7.0).r - 0.5) * 0.3);
cS = mix(cS, cWet, wet * 0.85);
vec3 cG = tri(tGround, P / 4.5).rgb * vec3(1.12, 1.0, 0.84);
vec3 cGr = tri(tGrass, P / 5.0).rgb * vec3(0.78, 1.08, 0.6); // grama verde (Roma, verão ameno)
vec3 cT = tri(tTrail, P / 3.2).rgb * vec3(0.92, 0.9, 0.86); // calçamento de pedra
vec3 baseC = (cS * w.x + cG * w.y + cGr * w.z + cT * w.w) * 1.12;
vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
vec3 cR = (texture2D(tRock, vWP.zy / 16.0).rgb * bw.x + texture2D(tRock, vWP.xz / 16.0).rgb * bw.y + texture2D(tRock, vWP.xy / 16.0).rgb * bw.z) * vec3(1.25, 1.14, 1.0);
float strata = 0.88 + 0.12 * sin(vWP.y * 1.3 + sin(vWP.x * 0.07) * 2.0);
float rockW = smoothstep(0.28, 0.5, 1.0 - vWN.y);
diffuseColor.rgb *= mix(baseC, cR * strata * 1.2, rockW);
// debaixo d'água: areia mais escura e azulada com a profundidade, e as cáusticas
float under = smoothstep(0.0, -0.4, vWP.y);
float dep = clamp(-vWP.y, 0.0, 20.0);
diffuseColor.rgb *= mix(vec3(1.0), vec3(0.62, 0.86, 0.9) * (1.0 - dep * 0.025), under);
float caus = cau(P) * under * exp(-dep * 0.12);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.75, 0.95, 1.0) * caus * 0.55;')
      .replace('#include <normal_fragment_maps>', `
#ifdef USE_NORMALMAP
vec3 nG = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
vec3 nS = texture2D(tSandN, P / 12.0).xyz * 2.0 - 1.0;
vec3 mapN = normalize(mix(nG, nS, w.x));
mapN.xy *= normalScale;
normal = normalize(tbn * mapN);
#endif`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { terrain: mesh, mat };
}

// Morros distantes no horizonte (Himeto, Pentélico, Parnes, Egáleo) e as ilhas no mar (Salamina, Egina)
export function buildHorizon(scene, tex) {
  const R = 2600, SEG = 400, ROWS = 6;
  const geo = new THREE.CylinderGeometry(R, R, 1, SEG, ROWS, true);
  const p = geo.attributes.position, colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i) + 0.5;
    const a = Math.atan2(z, x); // 0 = leste, +pi/2 = sul
    const dx = Math.cos(a), dz = Math.sin(a);
    const sea = ss(0.1, 0.45, NX * dx + NZ * dz); // direção do mar: só ilhas baixas
    const ridge = 1 - Math.abs(2 * fbm(dx * 3 + 5, dz * 3 + 5, 4) - 1);
    let top = (1 - sea) * (90 + ridge * 260 + fbm(a * 18, 3, 2) * 40);
    // Salamina (oeste-sudoeste) e Egina (sul-sudoeste, mais longe e azulada)
    const isl = (c, w, hgt) => hgt * Math.max(0, 1 - ((a - c) / w) ** 2);
    void isl;
    const k = 1 - y * 0.12;
    p.setXYZ(i, x * k, -4 + y * top, z * k);
    const shade = 0.72 + y * 0.32;
    colors[i * 3] = 0.62 * shade; colors[i * 3 + 1] = 0.6 * shade; colors[i * 3 + 2] = 0.52 * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, side: THREE.DoubleSide });
  if (tex.pbr) { mat.map = tex.pbr.rock_face_03.map.clone(); mat.map.repeat.set(90, 2); mat.map.needsUpdate = true; }
  const U = { uHaze: { value: new THREE.Color(0xc9d6e2) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze;\nvarying float vH;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat hz = 0.5 + 0.35 * (1.0 - smoothstep(0.0, 260.0, vH));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(-350, 0, 250);
  mesh.userData.haze = U.uHaze;
  scene.add(mesh);
  return mesh;
}
