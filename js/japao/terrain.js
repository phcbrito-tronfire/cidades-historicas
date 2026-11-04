// Japão, período Edo (c. 1790) — relevo: o pé norte do Monte Fuji, inspirado em Fujiyoshida e no lago Kawaguchi.
// Região fictícia, mas com a geografia de verdade: o Fuji ao sul, o lago a noroeste, a vila dos oshi (a rua dos guias
// de peregrinos) descendo do santuário Sengen, no pé da montanha, até o lago; arrozais a nordeste, a residência do
// senhor local num terraço a oeste, um templo budista na colina a leste e o riacho que desce da floresta.
// ESCALA (documentada, como pede o plano): o Fuji está comprimido ~1:5 — o cume fica 780 m acima do vale (o real tem
// 3.776 m de altitude, ~3.000 m acima de Fujiyoshida) e a base tem ~3,8 km de diâmetro. A vila, as casas, as árvores e
// as pessoas estão em escala real. A trilha Yoshida sobe por uma fatia da montanha, do santuário até a cratera.
// Eixos: +x leste, +z sul (o norte é -z). O santuário está perto de (40, 70).
import * as THREE from 'three';
import { fbm, smoothstep, lerp, clamp } from '../comum/util.js';
import { setTerrain, setWater } from '../comum/collision.js';
import { pressAt } from '../comum/chao.js';
export { pressTerrain } from '../comum/chao.js';

const ss = smoothstep;
export const WATER_Y = 0;
export const BOUNDS = [-700, 700, -760, 2330]; // x0, x1, z0, z1 andáveis
export const FUJI = { x: 60, z: 2250, H: 780, R: 2050, crater: 80, depth: 48, p: 2.0 }; // p: quanto o perfil é côncavo (saia larga, topo íngreme)
export const LAKE = { x: -440, z: -560, a: 300, b: 135, rot: 0.22 };
export const STREET = { x: 40, z0: -440, z1: 20, hw: 5.5 }; // a rua dos oshi (norte–sul)
export const SHRINE = { x: 40, z: 75, w: 90, d: 110 }; // o recinto do santuário Sengen, na floresta
export const RESIDENCE = { x: -275, z: -255, w: 86, d: 72, lift: 4 }; // a residência do senhor (jin'ya)
export const TEMPLE = { x: 330, z: -110, r: 62, lift: 16 }; // templo budista no alto da colina
export const FIELDS = { x0: 95, x1: 480, z0: -660, z1: -300 }; // arrozais
export const SNOW_Y = 600; // neve acima disto (primavera); as estações mudam isto depois

// o riacho (Katsura): nasce na floresta, desce a cachoeira, corta a vila a leste da rua e sai pelo nordeste
export const STREAM = [[395, 330], [380, 240], [355, 170], [300, 60], [215, -40], [150, -150], [180, -300], [260, -430], [330, -560], [380, -800]];
export const STREAM_HW = 3.2;
// a trilha Yoshida: do portão de trás do santuário até a borda da cratera; reta e larga embaixo, em zigue-zague no alto
export const TRAIL = (() => {
  const p = [[40, 130], [45, 300], [30, 520], [58, 760], [42, 980], [72, 1180], [55, 1350]];
  // zigue-zague (as encostas de cima passam de 30°): onze voltas até a borda, cada vez mais curtas
  const zr = FUJI.z - FUJI.crater - 4, n = 11; for (let k = 1; k <= n; k++) { const z = 1350 + (zr - 1350) * k / (n + 1); p.push([k % 2 ? FUJI.x + 70 - k * 3 : FUJI.x - 60 + k * 3, z]); }
  p.push([FUJI.x, FUJI.z - FUJI.crater - 4]);
  return p;
})();
export const TRAIL_HW = 2.2;
// ponto da trilha a uma fração do caminho (0 = santuário, 1 = cratera), com a direção
export function trailAt(f) {
  const L = []; let tot = 0; for (let i = 0; i < TRAIL.length - 1; i++) { const l = Math.hypot(TRAIL[i + 1][0] - TRAIL[i][0], TRAIL[i + 1][1] - TRAIL[i][1]); L.push(l); tot += l; }
  let s = f * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i] || i === L.length - 1) { const t = Math.min(1, s / L[i]), [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1]; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / L[i], dz: (bz - az) / L[i] }; } s -= L[i]; }
  return { x: TRAIL[0][0], z: TRAIL[0][1], dx: 0, dz: 1 };
}
// as estações de descanso (gōme): fração da trilha, número, e o lado (as cabanas ficam a 7 m da trilha, num patamar)
export const STATIONS = [[0.12, 1, 'Primeira estação'], [0.24, 2, 'Segunda estação'], [0.38, 3, 'Terceira estação'], [0.55, 5, 'Quinta estação'], [0.72, 7, 'Sétima estação'], [0.86, 8, 'Oitava estação']].map(([f, n, name]) => {
  const p = trailAt(f), sd = n % 2 ? 1 : -1; return { f, n, name, x: p.x + p.dz * 7 * sd, z: p.z - p.dx * 7 * sd, ry: Math.atan2(-p.dz * sd, p.dx * sd), tx: p.x, tz: p.z };
});

// distância até uma polilinha (com o ponto mais próximo e o comprimento percorrido até ele)
export function polyDist(L, x, z) {
  let best = Infinity, bx = 0, bz = 0, s = 0, bs = 0;
  for (let i = 0; i < L.length - 1; i++) {
    const [ax, az] = L[i], [cx, cz] = L[i + 1], dx = cx - ax, dz = cz - az, l2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bx = px; bz = pz; bs = s + Math.sqrt(l2) * t; }
    s += Math.sqrt(l2);
  }
  return { d: best, x: bx, z: bz, s: bs };
}

// ---- o Fuji: perfil côncavo (manso embaixo, ~35° no alto), cratera rasa e as ravinas que descem do cume
export function fujiR(x, z) { return Math.hypot(x - FUJI.x, z - FUJI.z); }
export function fujiH(x, z) {
  const F = FUJI, r = fujiR(x, z);
  if (r > F.R) return 0;
  const a = Math.atan2(z - F.z, x - F.x);
  if (r < F.crater) { const q = r / F.crater; return F.H - F.depth * Math.pow(1 - q * q, 0.7) + (fbm(a * 3 + 7, q * 2, 2) - 0.5) * 8 * q; }
  const t = 1 - (r - F.crater) / (F.R - F.crater);
  let h = F.H * Math.pow(t, F.p);
  // borda da cratera com picos (o Kengamine é o mais alto) e as ravinas (osawa) riscando a encosta
  h += 10 * Math.exp(-(((r - F.crater) / 25) ** 2)) * (0.6 + fbm(a * 5, 3, 2) * 0.8);
  const gully = Math.abs(Math.sin(a * 23 + fbm(r * 0.004, a * 2, 2) * 6));
  h -= (1 - gully) ** 3 * 9 * t * (1 - t) * 4;
  return h;
}

// ---- o vale
function valleyBase(x, z) {
  let h = 4 + Math.max(0, z + 700) * 0.007; // o chão sobe devagar em direção à montanha
  h += (fbm(x * 0.006 + 3, z * 0.006, 3) - 0.5) * 10 + (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 2.2;
  // montanhas Misaka ao norte (atrás do lago) e os morros a leste e oeste, cobertos de floresta
  h += 140 * ss(-640, -1000, z) * (0.7 + fbm(x * 0.004, 9, 3) * 0.6);
  const side = Math.abs(x - 30);
  h += 95 * ss(500, 820, side) * (0.6 + fbm(z * 0.005, x > 0 ? 2 : 5, 3) * 0.8) * (1 - ss(400, 900, z));
  return h;
}

// ---- planos para a vila, a residência, o templo e o santuário (o Batcher e o gancho do chão fazem o resto)
function flat(x, z, cx, cz, hw, hd, edge, target, h) {
  const d = Math.max(Math.abs(x - cx) - hw, Math.abs(z - cz) - hd, 0);
  return lerp(target, h, ss(0, edge, d));
}
const base = (x, z) => valleyBase(x, z) + fujiH(x, z);
// cotas dos planos, medidas no próprio relevo
export const LEVEL = {};
LEVEL.street0 = base(STREET.x, STREET.z0); LEVEL.street1 = base(STREET.x, STREET.z1);
LEVEL.shrine = base(SHRINE.x, SHRINE.z) - 1;
LEVEL.residence = base(RESIDENCE.x, RESIDENCE.z) + RESIDENCE.lift;
LEVEL.temple = base(TEMPLE.x, TEMPLE.z) + TEMPLE.lift;
for (const st of STATIONS) st.y = base(st.x, st.z);

export function terrainHeight(x, z) {
  let h = base(x, z);
  // a colina do templo (com o alto aplainado)
  { const d = Math.hypot(x - TEMPLE.x, z - TEMPLE.z); h += TEMPLE.lift * (1 - ss(TEMPLE.r * 0.55, TEMPLE.r * 1.9, d)) + 6 * (1 - ss(TEMPLE.r, TEMPLE.r * 3, d)) * fbm(x * 0.02, z * 0.02, 2); h = lerp(LEVEL.temple, h, ss(TEMPLE.r * 0.45, TEMPLE.r * 0.6, d)); }
  // a rua dos oshi: rampa suave do lago até o santuário (o chão em volta acompanha)
  { const t = clamp((z - STREET.z0) / (STREET.z1 - STREET.z0), 0, 1), sy = lerp(LEVEL.street0, LEVEL.street1, t), d = Math.max(Math.abs(x - STREET.x) - 60, z < STREET.z0 ? STREET.z0 - z : z > STREET.z1 ? z - STREET.z1 : 0, 0); h = lerp(sy, h, ss(0, 30, d)); }
  h = flat(x, z, SHRINE.x, SHRINE.z, SHRINE.w / 2, SHRINE.d / 2, 22, LEVEL.shrine, h);
  h = flat(x, z, RESIDENCE.x, RESIDENCE.z, RESIDENCE.w / 2, RESIDENCE.d / 2, 14, LEVEL.residence, h);
  // arrozais: o chão quase plano, em leve degrau (os tabuleiros vêm depois)
  { const d = Math.max(FIELDS.x0 - x, x - FIELDS.x1, FIELDS.z0 - z, z - FIELDS.z1, 0); const fl = 4.2 + Math.max(0, z + 700) * 0.007 + (x - FIELDS.x0) * 0.004; h = lerp(fl, h, ss(0, 40, d)); }
  // a trilha: um banco cortado na encosta (sem degraus bruscos de um lado para o outro)
  { const T = polyDist(TRAIL, x, z); if (T.d < 14 && z > 200) { const hc = base(T.x, T.z); h = lerp(hc, h, ss(TRAIL_HW, 12, T.d)); } }
  // os patamares das estações (cortados na encosta, com a trilha ao lado no mesmo nível)
  for (const st of STATIONS) { const d = Math.hypot(x - st.x, z - st.z); if (d < 26) h = lerp(st.y, h, ss(9.5, 20, d)); }
  // o lago: fundo de até 12 m, praia de seixos na borda
  { const L = LAKE, c = Math.cos(L.rot), s = Math.sin(L.rot), u = (x - L.x) * c + (z - L.z) * s, v = -(x - L.x) * s + (z - L.z) * c;
    const e = Math.hypot(u / L.a, v / L.b) + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 0.18;
    if (e < 1.3) { const bed = -1.2 - 11 * Math.pow(Math.max(0, 1 - e * e), 0.6); h = e < 1 ? Math.min(h, bed) : lerp(Math.min(h, lerp(-1.2, 0.9, (e - 1) / 0.12)), h, ss(1.0, 1.3, e)); } }
  // o riacho: leito 1,6 m abaixo do chão, com barrancos
  { const S = polyDist(STREAM, x, z); if (S.d < 14) { const bed = base(S.x, S.z) - 1.7; h = lerp(bed, Math.min(h, base(S.x, S.z) + 0.2), ss(STREAM_HW * 0.75, 8, S.d)); } } // (barranco firme: a água fica dentro do leito)
  // a cachoeira: o riacho cai de um degrau de rocha na floresta
  // (a borda de uma camada de lava antiga: um paredão de 11 m que atravessa a floresta de leste a oeste, mais alto
  //  no meio, onde o riacho despenca — como as cachoeiras do pé do Fuji, que caem da beira das camadas de lava)
  { const fx = 368, fz = 205, edgeZ = fz + Math.sin(x * 0.03) * 4 + (fbm(x * 0.02, 4, 2) - 0.5) * 8 * ss(10, 40, Math.abs(x - fx)), w = 1 - ss(70, 150, Math.abs(x - fx));
    if (w > 0) h += 11 * w * ss(0, 1, (z - edgeZ) / 3 + 0.5); }
  return h;
}

// altura do chão para andar: o terreno, mas logo abaixo das lajes de piso
export function groundHeight(x, z) { return Math.min(terrainHeight(x, z), pressAt(x, z) + 0.05); }
export function inLake(x, z, m = 0) { const L = LAKE, c = Math.cos(L.rot), s = Math.sin(L.rot), u = (x - L.x) * c + (z - L.z) * s, v = -(x - L.x) * s + (z - L.z) * c; return Math.hypot(u / (L.a + m), v / (L.b + m)) < 1; }
export function waterLevelAt(x, z) { return inLake(x, z, 40) ? WATER_Y : -100; }
setTerrain(groundHeight);
setWater(waterLevelAt);

// ---------------------------------------------------------------------------
// Superfície: canais [seixos da praia, terra batida (ruas e caminhos), grama, trilha de cascalho vulcânico];
// no shader: floresta escurece a grama, acima da linha das árvores a escória vulcânica, e a neve no alto.
// ---------------------------------------------------------------------------
function surface(x, z, h, slope) {
  const n = fbm(x * 0.02 + 11, z * 0.02, 3), n2 = fbm(x * 0.09, z * 0.09, 2);
  let shore = 0; if (inLake(x, z, 26)) shore = 1 - ss(0.4, 2.6, h);
  const S = polyDist(STREAM, x, z); shore = Math.max(shore, 1 - ss(STREAM_HW, STREAM_HW + 3, S.d));
  const st = Math.max(Math.abs(x - STREET.x) - STREET.hw, z < STREET.z0 ? STREET.z0 - z : z > STREET.z1 + 60 ? z - STREET.z1 - 60 : 0, 0);
  let road = 1 - ss(0, 1.5, st);
  const T = polyDist(TRAIL, x, z); const trail = z > 120 ? 1 - ss(TRAIL_HW - 0.4, TRAIL_HW + 1.2, T.d) : 0;
  road = Math.max(road, z > 120 ? 0 : 0);
  const fuji = fujiH(x, z), high = ss(290, 380, fuji); // acima disto acaba a floresta: cascalho e escória
  let ground = Math.max(road, ss(0.6, 0.85, n2) * 0.25) + high * 0.6;
  let grass = clamp(0.9 + (n - 0.5) * 0.6, 0, 1) * (1 - high);
  ground *= 1 - shore; grass *= (1 - shore) * (1 - road); const tr = trail * (1 - shore);
  grass *= 1 - tr; ground *= 1 - tr;
  // arrozais: lotes alagados (espelho d'água) — por enquanto só a cor; os tabuleiros com água vêm depois
  let r = 1, g = 1, b = 1;
  if (x > FIELDS.x0 && x < FIELDS.x1 && z > FIELDS.z0 && z < FIELDS.z1) {
    const iu = Math.floor((x - FIELDS.x0) / 38), iw = Math.floor((z - FIELDS.z0) / 26), fu = ((x - FIELDS.x0) / 38) % 1, fw = ((z - FIELDS.z0) / 26) % 1;
    const edge = ss(0.03, 0.08, Math.min(fu, 1 - fu)) * ss(0.04, 0.11, Math.min(fw, 1 - fw)), hh = Math.abs(Math.sin(iu * 127.1 + iw * 311.7) * 43758.5) % 1;
    const k = edge * (1 - ss(-4, 4, -Math.min(x - FIELDS.x0, FIELDS.x1 - x, z - FIELDS.z0, FIELDS.z1 - z)));
    r = lerp(1, 0.82 + hh * 0.1, k); g = lerp(1, 1.12 - hh * 0.08, k); b = lerp(1, 0.7, k);
  }
  const v = 0.92 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 0.2;
  const sum = shore + ground + grass + tr || 1;
  return [r * v, g * v, b * v, shore / sum, ground / sum, grass / sum, tr / sum];
}

// floresta: onde ficam as árvores (o shader escurece o chão debaixo delas)
export function forestAt(x, z) {
  const fuji = fujiH(x, z);
  if (fuji > 330) return 0;
  const n = fbm(x * 0.008 + 21, z * 0.008, 3);
  let f = 0;
  const zEdge = z + (fbm(x * 0.008, 7, 2) - 0.5) * 200; // a borda da floresta é recortada, não uma régua
  f = Math.max(f, ss(60, 200, zEdge) * (1 - ss(220, 330, fuji))); // a floresta do pé da montanha
  f = Math.max(f, ss(0.66, 0.8, fbm(x * 0.014 + 50, z * 0.014, 3)) * 0.85); // bosques soltos no vale
  f = Math.max(f, ss(-640, -700, z) + ss(470, 560, Math.abs(x - 30)) * (1 - ss(300, 700, z)) * 0.0); // morros ao norte
  f = Math.max(f, ss(480, 600, Math.abs(x - 30)) * 0.9);
  f = Math.max(f, (1 - ss(TEMPLE.r * 0.6, TEMPLE.r * 1.6, Math.hypot(x - TEMPLE.x, z - TEMPLE.z))) * 0.8);
  f *= clamp(0.75 + (n - 0.5) * 1.2, 0, 1);
  // clareiras: a vila, o santuário (só o recinto), a residência, o lago, os arrozais, a trilha e o riacho
  if (Math.abs(x - STREET.x) < 75 && z < STREET.z1 + 20) f = 0;
  if (Math.abs(x - SHRINE.x) < SHRINE.w / 2 + 2 && Math.abs(z - SHRINE.z) < SHRINE.d / 2 + 2) f = 0;
  if (Math.abs(x - RESIDENCE.x) < RESIDENCE.w / 2 + 14 && Math.abs(z - RESIDENCE.z) < RESIDENCE.d / 2 + 14) f = 0;
  if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < TEMPLE.r * 0.55) f = 0;
  if (inLake(x, z, 30)) f = 0;
  if (x > FIELDS.x0 - 8 && x < FIELDS.x1 + 8 && z > FIELDS.z0 - 8 && z < FIELDS.z1 + 8) f = 0;
  if (polyDist(TRAIL, x, z).d < TRAIL_HW + 2.5) f = 0;
  if (polyDist(STREAM, x, z).d < STREAM_HW + 2) f = 0;
  return f;
}

const TEXSET = (P) => ({
  tSand: { value: P.damp_beach_sand.map }, tGround: { value: P.dry_ground_rocks.map }, tGrass: { value: P.sparse_grass.map },
  tTrail: { value: P.rocky_trail.map }, tRock: { value: P.rock_face_03.map }, tScoria: { value: P.rock_boulder_dry.map },
  uTime: { value: 0 }, uSnow: { value: SNOW_Y }, uTree: { value: 360 },
});
function terrainMaterial(tex) {
  const P = tex.pbr;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: P.dry_ground_01.map, normalMap: P.dry_ground_01.normalMap, roughness: 1, metalness: 0 });
  const U = TEXSET(P);
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 splat;\nattribute float forest;\nvarying vec4 vSplat;\nvarying float vForest;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvForest = forest;\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tSand, tGround, tGrass, tTrail, tRock, tScoria; uniform float uTime, uSnow, uTree;
varying vec4 vSplat; varying float vForest; varying vec3 vWP; varying vec3 vWN;
vec4 tri(sampler2D t, vec2 p){ return mix(texture2D(t, p), texture2D(t, p * 0.21 + 0.37), 0.4); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `
vec4 w = vSplat / max(0.0001, vSplat.x + vSplat.y + vSplat.z + vSplat.w);
vec2 P = vWP.xz;
vec3 cS = tri(tSand, P / 5.0).rgb * vec3(0.86, 0.86, 0.84); // seixos cinzentos da beira do lago
vec3 cG = tri(tGround, P / 4.5).rgb * vec3(0.8, 0.74, 0.64); // terra batida escura (cinza vulcânica no chão)
vec3 cGr0 = tri(tGrass, P / 5.0).rgb; float gL = dot(cGr0, vec3(0.3, 0.59, 0.11));
vec3 cGr = mix(cGr0 * vec3(0.7, 1.05, 0.55), gL * vec3(1.05, 1.75, 0.68), 0.75); // o verde úmido do Japão
cGr = mix(cGr, cGr * vec3(0.62, 0.68, 0.5), vForest * 0.6); // chão de floresta: musgo e sombra
vec3 cT = tri(tTrail, P / 3.0).rgb * vec3(0.62, 0.52, 0.48); // cascalho vulcânico da trilha
vec3 baseC = (cS * w.x + cG * w.y + cGr * w.z + cT * w.w) * 1.1;
// acima da floresta: escória vulcânica (vermelho-escura e preta) e a rocha das ravinas
float hi = smoothstep(uTree - 80.0, uTree + 60.0, vWP.y + (vn(P / 40.0) - 0.5) * 60.0);
vec3 cSc = tri(tScoria, P / 7.0).rgb * mix(vec3(0.62, 0.42, 0.36), vec3(0.34, 0.31, 0.32), vn(P / 90.0));
baseC = mix(baseC, mix(cSc, cT, w.w * 0.6), hi);
vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
vec3 cR = (texture2D(tRock, vWP.zy / 16.0).rgb * bw.x + texture2D(tRock, vWP.xz / 16.0).rgb * bw.y + texture2D(tRock, vWP.xy / 16.0).rgb * bw.z) * mix(vec3(1.0, 0.98, 0.94), vec3(0.6, 0.52, 0.5), hi);
float rockW = smoothstep(0.42, 0.62, 1.0 - vWN.y) * (1.0 - hi * 0.5);
vec3 col = mix(baseC, cR, rockW);
// neve: acima de uSnow, mais nas ravinas e menos nas cristas ao vento (com a borda recortada)
float sn = smoothstep(uSnow - 30.0, uSnow + 40.0, vWP.y + (vn(P / 25.0) - 0.5) * 70.0 + (vn(P / 6.0) - 0.5) * 12.0);
sn *= 1.0 - smoothstep(0.55, 0.85, 1.0 - vWN.y) * 0.6;
col = mix(col, vec3(0.92, 0.94, 0.98) * (0.94 + vn(P * 0.8) * 0.08), sn);
// debaixo d'água: escurece e azula com a profundidade
float under = smoothstep(0.0, -0.4, vWP.y); float dep = clamp(-vWP.y, 0.0, 14.0);
col *= mix(vec3(1.0), vec3(0.55, 0.72, 0.7) * (1.0 - dep * 0.03), under);
diffuseColor.rgb *= col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, smoothstep(uSnow - 30.0, uSnow + 40.0, vWP.y));');
  };
  return mat;
}

function terrainMesh(mat, X0, X1, Z0, Z1, step, lower = null) {
  const SEGX = Math.round((X1 - X0) / step), SEGZ = Math.round((Z1 - Z0) / step);
  const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SEGX, SEGZ);
  geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3), splat = new Float32Array(pos.count * 4), forest = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, terrainHeight(x, z) - (lower ? lower(x, z) : 0)); }
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), s = surface(x, z, pos.getY(i), 1 - nor.getY(i));
    colors.set(s.slice(0, 3), i * 3); splat.set(s.slice(3), i * 4); forest[i] = forestAt(x, z);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
  geo.setAttribute('forest', new THREE.BufferAttribute(forest, 1));
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
  return mesh;
}

// três malhas: o vale (3,4 m), a encosta onde se anda (6,8 m) e o resto do Fuji e dos morros, leve (40 m),
// afundado onde as outras duas cobrem (sem briga de texturas)
export function buildTerrain(scene, tex) {
  const mat = terrainMaterial(tex);
  const X0 = -720, X1 = 720, ZA = -780, ZB = 340, ZC = 2360;
  const valley = terrainMesh(mat, X0, X1, ZA, ZB, 3.4);
  const slope = terrainMesh(mat, X0, X1, ZB - 4.25, ZC, 4.25, (x, z) => (z < ZB ? 0.15 : 0)); // (4,25 m: fino o bastante para os patamares das estações) // (a fileira que entra no vale fica um pouco abaixo)
  const inside = (x, z) => x > X0 + 2 && x < X1 - 2 && z > ZA + 2 && z < ZC - 2;
  const far = terrainMesh(mat, -4400, 4400, -3600, 6000, 40, (x, z) => (inside(x, z) ? 6 : 0));
  far.receiveShadow = false;
  scene.add(valley, slope, far);
  return { terrain: valley, slope, far, mat };
}

// as montanhas no horizonte (Misaka ao norte, Tanzawa a leste, o Kofu ao longe), azuladas pela distância
export function buildHorizon(scene, tex) {
  const R = 5200, SEG = 360, ROWS = 6;
  const geo = new THREE.CylinderGeometry(R, R, 1, SEG, ROWS, true);
  const p = geo.attributes.position, colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i) + 0.5, a = Math.atan2(z, x), dx = Math.cos(a), dz = Math.sin(a);
    const ridge = 1 - Math.abs(2 * fbm(dx * 3 + 5, dz * 3 + 5, 4) - 1);
    const south = ss(0.2, 0.8, dz); // ao sul o Fuji domina: ali o horizonte é baixo
    const top = (1 - south * 0.75) * (260 + ridge * 520 + fbm(a * 18, 3, 2) * 80);
    const k = 1 - y * 0.1;
    p.setXYZ(i, x * k, -20 + y * top, z * k);
    const shade = 0.7 + y * 0.3; colors[i * 3] = 0.5 * shade; colors[i * 3 + 1] = 0.58 * shade; colors[i * 3 + 2] = 0.55 * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, side: THREE.DoubleSide });
  const U = { uHaze: { value: new THREE.Color(0xb8c8d8) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze;\nvarying float vH;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat hz = 0.45 + 0.4 * (1.0 - smoothstep(0.0, 600.0, vH));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);');
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(0, 0, 400); mesh.userData.haze = U.uHaze;
  scene.add(mesh);
  return mesh;
}
