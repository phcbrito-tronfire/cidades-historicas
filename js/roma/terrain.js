// Roma, c. 117 d.C. (Trajano) — relevo: o vale do Coliseu entre o Palatino, o Célio e o Ópio (Esquilino), o Fórum
// até o Capitólio, o Circo Máximo entre o Palatino e o Aventino, o Campo de Marte na várzea, o Tibre com suas curvas
// e a ilha Tiberina, e o rio descendo até o mar Tirreno em Óstia. Distâncias encurtadas (o mar fica a ~25 km).
// Eixos: +x leste, +z sul. O Coliseu está em (0, 0).
import * as THREE from 'three';
import { fbm, smoothstep, lerp, clamp } from '../comum/util.js';
import { setTerrain, setWater } from '../comum/collision.js';
import { COL, colGround, colTerrain } from './coliseu.js';

export const WATER_Y = 0;
export const BOUNDS = [-1180, 520, -560, 1060]; // x0, x1, z0, z1 andáveis (o mar segue até o horizonte)
const ss = smoothstep;

// costa do Tirreno a sudoeste: distância assinada ao longo de N (c > 0 = mar)
const NX = -0.72, NZ = 0.69;
export const along = (x, z) => 0.69 * x + 0.72 * z;
const shoreS = (a) => 1330 + 12 * Math.sin(a / 70) + 6 * Math.sin(a / 23 + 1);
export function coastC(x, z) { return NX * x + NZ * z - shoreS(along(x, z)); }
export function coastPoint(a, off = 0) { const s = shoreS(a) + off; return { x: 0.69 * a + NX * s, z: 0.72 * a + NZ * s }; }

// o Tibre: linha de pontos de norte a sul, com as curvas do Campo de Marte e a ilha Tiberina, até a foz em Óstia
export const TIBER = [[-560, -620], [-520, -380], [-610, -200], [-570, -40], [-500, 90], [-470, 200], [-540, 360], [-660, 500], [-800, 640], [-930, 780], [-1060, 900]];
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
export const CAPITOL = { x: -345, z: -30, top: 0 };
export const NAUMACHIA = { x: -720, z: -260, a: 90, b: 60, y: 0 }; // lago da Naumaquia de Trajano (109 d.C.), além do Tibre

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
  h += hill(x, z, CAPITOL.x, CAPITOL.z, 62, 70, 0.3, 32, 3.2) * (0.9 + n * 0.15);
  h += hill(x, z, -330, 400, 115, 95, -0.3, 26, 2.6);
  h += hill(x, z, 95, 205, 120, 80, 0.2, 18);
  h += hill(x, z, 110, -170, 130, 95, -0.2, 17);
  h += hill(x, z, -300, -300, 150, 90, 0.4, 20);
  h += hill(x, z, 330, -40, 160, 300, 0, 12); // Esquilino, a leste
  // ---- vales nivelados: o Fórum Romano, o Circo Máximo e o vale do Coliseu
  h = flat(x, z, FORUM.x, FORUM.z, FORUM.hw, FORUM.hd, FORUM.y, 22, h);
  h = flat(x, z, CIRCUS.x, CIRCUS.z, CIRCUS.hw, CIRCUS.hd, CIRCUS.y, 26, h);
  { const e = (x / (COL.A + 30)) ** 2 + (z / (COL.B + 30)) ** 2; if (e < 1.6) h = lerp(h, COL.y, ss(1.6, 1.0, e)); }
  // ---- o Tibre: leito fundo, margens de terra e a ilha Tiberina
  {
    const { d } = tiberDist(x, z), half = TIBER_HALF + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 6;
    if (d < half + 30) {
      const t = Math.min(d, half) / half, bed = -1.8 - 3.8 * (1 - t * t) + n * 0.6;
      h = lerp(h, bed, ss(half + 26, half - 2, d));
    }
    const c = Math.cos(ISOLA.rot), s = Math.sin(ISOLA.rot), u = ((x - ISOLA.x) * c + (z - ISOLA.z) * s) / ISOLA.a, v = (-(x - ISOLA.x) * s + (z - ISOLA.z) * c) / ISOLA.b;
    const r = Math.hypot(u, v); if (r < 1.5) h = Math.max(h, lerp(-2, 2.4 + n * 0.4, ss(1.4, 0.7, r)));
  }
  // ---- Naumaquia de Trajano: bacia oval escavada além do rio (vira lago nos dias de batalha naval)
  { const N = NAUMACHIA, e = ((x - N.x) / N.a) ** 2 + ((z - N.z) / N.b) ** 2; if (e < 1.8) { const ground = lerp(h, 3, ss(1.8, 1.25, e)); h = e < 1 ? lerp(-3.2, ground, ss(0.9, 1.0, e)) : ground; } }
  // ---- bordas do mundo em terra: os montes Albanos e Sabinos ao longe (leste e norte)
  {
    const d = -coastC(x, z);
    const e = Math.max((x - 420) / 120, (-460 - z) / 110);
    if (e > 0 && d > 60) h += ss(0, 1, e) * (24 + (fbm(x * 0.01, z * 0.01, 3) - 0.5) * 26) * ss(60, 160, d);
  }
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
  if (coastC(x, z) > -30 || inRiver(x, z, 14)) return WATER_Y;
  const N = NAUMACHIA; if (((x - N.x) / N.a) ** 2 + ((z - N.z) / N.b) ** 2 < 1.02) return N.flooded ? 0.2 : -100;
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
function surface(x, z, h, slope) {
  const d = -coastC(x, z);
  const n = fbm(x * 0.02 + 11, z * 0.02, 3), n2 = fbm(x * 0.11, z * 0.11, 2);
  let sand = 0, ground = 0, grass = 0, trail = 0;
  let beach = 1 - ss(30, 60, d);
  // nas ilhas a praia é só a beira: acima de ~2,5 m, terra, mato e pedra
  if (d < 0 && h > 0.6) beach = Math.min(beach, 1 - ss(0.8, 2.8, h));
  sand = beach;
  const inland = 1 - beach;
  // cidade e ruas de terra batida; nos morros e fora dos muros, grama seca e pedras
  const hillness = (d < 0 ? ss(3, 10, h) : ss(20, 34, h)) + ss(0.12, 0.35, slope) * 0.6;
  // margens do Tibre: barro úmido e capim
  const riv = 1 - ss(TIBER_HALF + 2, TIBER_HALF + 22, tiberDist(x, z).d);
  if (riv > 0 && d > 30) beach = Math.max(beach, riv * 0.8);
  const rural = ss(560, 700, Math.hypot(x + 150, z));
  grass = inland * clamp(hillness * 0.7 + rural * 0.8 + ss(0.55, 0.72, n) * 0.4, 0, 1);
  trail = inland * hillness * ss(0.4, 0.6, n2) * 0.7;
  ground = inland * Math.max(0, 1 - grass - trail);
  let r = 1, g = 1, b = 1;
  const v = 0.92 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 0.2;
  const s = sand + ground + grass + trail || 1;
  return [r * v, g * v, b * v, sand / s, ground / s, grass / s, trail / s];
}

export function buildTerrain(scene, tex) {
  const X0 = -1260, X1 = 600, Z0 = -640, Z1 = 1140;
  const SX = X1 - X0, SZ = Z1 - Z0, SEGX = 560, SEGZ = 534;
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
    tTrail: { value: P.rocky_trail.map }, tRock: { value: P.rock_face_03.map }, tRockN: { value: P.rock_face_03.normalMap }, tSandN: { value: P.aerial_beach_01.normalMap },
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
vec3 cGr = tri(tGrass, P / 5.0).rgb * vec3(1.05, 1.0, 0.75);
vec3 cT = tri(tTrail, P / 5.0).rgb;
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
