// Atenas, 432 a.C. — relevo: a rocha da Acrópole (penhascos e a rampa a oeste), Areópago, Pnyx, colina das Musas,
// a ágora nivelada, a planície até o mar e a baía do Falero (praia de areia, fundo raso e o cais do porto).
// As distâncias até o mar estão encurtadas (na realidade o Falero fica a ~4 km da Acrópole).
// Eixos: +x leste, +z sul. A Acrópole está em (0, 0).
import * as THREE from 'three';
import { fbm, smoothstep, lerp, clamp } from '../comum/util.js';
import { setTerrain, setWater } from '../comum/collision.js';

export const WATER_Y = 0;
export const BOUNDS = [-790, 470, -470, 860]; // x0, x1, z0, z1 andáveis (o mar segue até o horizonte)
// costa: distância assinada ao longo de N = (-0,6; 0,8) (sudoeste). c > 0 = mar.
const NX = -0.6, NZ = 0.8;
export const along = (x, z) => 0.8 * x + 0.6 * z;
function shoreS(a) {
  return 540 - 46 * Math.exp(-(((a - 60) / 230) ** 2)) // a baía do Falero, côncava
    + 9 * Math.sin(a / 63) + 5 * Math.sin(a / 23 + 1)
    + 70 * Math.exp(-(((a + 470) / 110) ** 2)); // ponta de Muníquia, a oeste do porto
}
export function coastC(x, z) { return NX * x + NZ * z - shoreS(along(x, z)); }
// ponto da costa num dado "along" (para posicionar o porto e a praia)
export function coastPoint(a, off = 0) {
  const s = shoreS(a) + off;
  return { x: 0.8 * a + NX * s, z: 0.6 * a + NZ * s };
}
export const ACRO = { top: 58, a: 124, b: 57 };
export const AGORA = { x: -255, z: -200, hw: 105, hd: 95, y: 0 };
export const HEPH = { x: -392, z: -205, y: 0 };
export const PNYX = { x: -340, z: 25 };
export const BEMA = { x: -352, z: 44 };
// teatro de Dioniso na encosta sul da Acrópole: centro da orquestra, raio dos degraus e abertura
export const THEATER = { x: 22, z: 112, r0: 11, r1: 52, rows: 44, y: 0 };

const ss = smoothstep;
function base(x, z) {
  const d = -coastC(x, z); // metros terra adentro
  const n1 = fbm(x * 0.006 + 40, z * 0.006 + 40, 4) - 0.5, n2 = fbm(x * 0.03 + 5, z * 0.03 + 9, 3) - 0.5;
  let h = 0.45 + 2.2 * ss(0, 45, d) + 9.5 * ss(45, 430, d) + n1 * 3 * ss(40, 220, d) + n2 * 0.25 * ss(20, 80, d);
  if (d < 0) { // fundo do mar: plataforma rasa de areia que vai afundando (com ondulações de areia)
    const c = -d;
    h = 0.45 - 0.07 * c - 0.0011 * c * c + Math.sin(along(x, z) * 0.35 + c * 0.6) * 0.06 * ss(5, 40, c) + n1 * 1.2 * ss(30, 200, c);
    h = Math.max(h, -24 + n1 * 3);
  }
  // bacia do porto dragada (os navios encostam no cais): mais funda junto à costa entre along -350 e -150
  {
    const a = along(x, z), k = ss(-372, -352, a) * ss(-128, -148, a);
    if (k > 0 && d < 14) h = lerp(h, Math.min(h, -4.2 + Math.min(0, d) * 0.01), k * ss(14, -2, d));
  }
  return h;
}
const hill = (x, z, cx, cz, rx, rz, rot, hgt, pw = 2) => {
  const c = Math.cos(rot), s = Math.sin(rot), u = ((x - cx) * c + (z - cz) * s) / rx, v = (-(x - cx) * s + (z - cz) * c) / rz;
  const r = Math.hypot(u, v);
  return hgt * Math.max(0, 1 - r ** pw) ** 1.6;
};

// altura do terreno desenhado (o teatro tem degraus por cima; ver groundHeight)
export function terrainHeight(x, z) {
  let h = base(x, z);
  const n = fbm(x * 0.05 + 3, z * 0.05 + 1, 3) - 0.5;
  // ---- Acrópole: superelipse com borda irregular, penhasco e encosta de pedras; a oeste, a subida suave
  {
    const rot = -0.08, c = Math.cos(rot), s = Math.sin(rot);
    const u = x * c + z * s, v = -x * s + z * c;
    let r = (Math.abs(u / ACRO.a) ** 4 + Math.abs(v / ACRO.b) ** 4) ** 0.25;
    r += (fbm(Math.atan2(v, u) * 2 + 7, 2.1, 3) - 0.5) * 0.05;
    const top = ACRO.top + 1.6 * (1 - Math.min(1, r * r)) + n * 0.6;
    let p;
    const west = ss(-60, -105, u) * ss(52, 30, Math.abs(v)); // setor da rampa
    const cliff = r < 0.985 ? 1 : r < 1.06 ? lerp(1, 0.34, ss(0.985, 1.06, r)) : r < 1.55 ? 0.34 * (1 - ss(1.06, 1.55, r)) : 0;
    const ramp = r < 0.97 ? 1 : Math.max(0, 1 - (r - 0.97) / 0.95);
    p = lerp(cliff, ramp, west);
    const plain = base(x, z);
    h = Math.max(h, lerp(plain, top, p) + (p > 0.05 && p < 0.97 ? (fbm(x * 0.07, z * 0.07, 3) - 0.5) * 2.2 * (1 - west) : 0));
    // patamar do Propileu (nivelado no alto da rampa)
    if (u < -100 && u > -132 && Math.abs(v) < 26) h = lerp(h, ACRO.top - 2.2, ss(26, 18, Math.abs(v)) * ss(-132, -124, u));
  }
  // ---- Areópago (rochoso), Pnyx, colina das Musas, Colono Agoraios (Hefesteion), Ninfas
  h += hill(x, z, -152, -96, 58, 30, 0.35, 13, 2.6) * (0.85 + (fbm(x * 0.09, z * 0.09, 3) - 0.3) * 0.5);
  h += hill(x, z, PNYX.x, PNYX.z, 100, 80, 0.5, 17);
  h += hill(x, z, -175, 185, 85, 70, 0.2, 25);
  h += hill(x, z, -330, -95, 70, 55, 0, 12);
  h += hill(x, z, HEPH.x, HEPH.z, 44, 32, 0, 8.5, 3);
  // ---- Ágora: praça nivelada
  {
    const m = Math.max(Math.abs(x - AGORA.x) - AGORA.hw, Math.abs(z - AGORA.z) - AGORA.hd);
    if (m < 22) h = lerp(h, AGORA.y, ss(22, 0, m));
  }
  // ---- Pnyx: plataforma da assembleia (semicírculo aberto para nordeste, rampa suave até a bema)
  {
    const dx = x - BEMA.x, dz = z - BEMA.z, dist = Math.hypot(dx, dz);
    const dirx = 0.6, dirz = -0.8; // para a ágora e a Acrópole
    const front = (dx * dirx + dz * dirz) / (dist || 1);
    if (dist < 75 && front > -0.25) {
      const want = PNYX.y0 + dist * 0.06;
      h = lerp(h, want, ss(75, 58, dist) * ss(-0.25, 0.05, front));
    }
  }
  // ---- teatro: a encosta sob os degraus fica 0,4 m abaixo deles (os degraus são malha, ver buildings)
  {
    const t = theaterStep(x, z);
    if (t !== null) h = t.y - 0.45;
    else {
      const dx = x - THEATER.x, dz = z - THEATER.z, dist = Math.hypot(dx, dz);
      if (dist < THEATER.r0 + 1) h = lerp(h, THEATER.y, ss(THEATER.r0 + 1, THEATER.r0 - 2, dist)); // orquestra
    }
  }
  // ---- bordas do mundo em terra: morros (Himeto a leste, Egáleo a oeste, Parnes ao norte)
  {
    const d = -coastC(x, z);
    const e = Math.max((x - 380) / 120, (-380 - z) / 110, (-700 - x) / 120);
    if (e > 0 && d > 60) h += ss(0, 1, e) * (26 + (fbm(x * 0.01, z * 0.01, 3) - 0.5) * 30) * ss(60, 160, d);
  }
  return h;
}

// degraus do teatro (cávea em leque, de frente para o sul): null fora deles
function theaterStep(x, z) {
  const T = THEATER, dx = x - T.x, dz = z - T.z, dist = Math.hypot(dx, dz);
  if (dist < T.r0 || dist > T.r1) return null;
  const ang = Math.atan2(dx, -dz); // 0 = norte (subindo a encosta)
  if (Math.abs(ang) > 1.15) return null;
  const k = Math.floor((dist - T.r0) / ((T.r1 - T.r0) / T.rows));
  return { y: T.y + 0.6 + k * 0.42, k };
}

// altura do chão para andar (colisão): igual ao terreno, mas com os degraus do teatro
export function groundHeight(x, z) {
  const t = theaterStep(x, z);
  return t ? t.y : terrainHeight(x, z);
}

export function waterLevelAt(x, z) { return coastC(x, z) > -30 ? WATER_Y : -100; }

// alturas de referência calculadas no próprio relevo (o resto do mapa usa)
PNYX.y0 = base(BEMA.x, BEMA.z) + 15;
AGORA.y = base(AGORA.x, AGORA.z);
THEATER.y = base(THEATER.x, THEATER.z) + 3;
HEPH.y = AGORA.y + 8.5;

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
  const beach = 1 - ss(30, 60, d);
  sand = beach;
  const inland = 1 - beach;
  // cidade e ruas de terra batida; nos morros e fora dos muros, grama seca e pedras
  const hillness = ss(14, 26, h) + ss(0.12, 0.35, slope) * 0.6;
  const rural = ss(330, 420, Math.hypot(x + 140, z + 60));
  grass = inland * clamp(hillness * 0.7 + rural * 0.8 + ss(0.55, 0.72, n) * 0.4, 0, 1);
  trail = inland * hillness * ss(0.4, 0.6, n2) * 0.7;
  ground = inland * Math.max(0, 1 - grass - trail);
  let r = 1, g = 1, b = 1;
  const v = 0.92 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 0.2;
  const s = sand + ground + grass + trail || 1;
  return [r * v, g * v, b * v, sand / s, ground / s, grass / s, trail / s];
}

export function buildTerrain(scene, tex) {
  const X0 = -860, X1 = 560, Z0 = -540, Z1 = 920;
  const SX = X1 - X0, SZ = Z1 - Z0, SEGX = 470, SEGZ = 486;
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
    top = Math.max(top, isl(2.75, 0.32, 120) + isl(2.15, 0.12, 95) + isl(1.9, 0.06, 60));
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
  mesh.position.set(-150, 0, 150);
  mesh.userData.haze = U.uHaze;
  scene.add(mesh);
  return mesh;
}
