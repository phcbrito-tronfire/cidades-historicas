// Terreno, rio Nilo, lago sagrado, canais e vegetação
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { fbm, smoothstep, lerp, rand, rr, clamp } from './util.js';
import { blocked, addCircle, setTerrain, setWater } from './collision.js';

export const WATER_Y = 0;
export const RIVER_HALF = 38;
export const WORLD = 370; // limite que o jogador pode andar
export const LAKE = { x0: -50, x1: -14, z0: -62, z1: -40, y: 0.55 };

export function riverX(z) {
  return 150 + 18 * Math.sin(z / 110) + 8 * Math.sin(z / 37 + 1.3);
}

export function terrainHeight(x, z) {
  const rx = riverX(z);
  const d = x - rx, ad = Math.abs(d);
  const n1 = fbm(x * 0.008 + 50, z * 0.008 + 50, 4) - 0.5;
  const n2 = fbm(x * 0.04 + 7, z * 0.04 + 3, 3) - 0.5;
  let land;
  if (d < 0) {
    const plateau = smoothstep(-172, -215, x);
    const amp = lerp(0.1, 2.2, plateau);
    land = 1.0 + plateau * 6.0 + n1 * amp + n2 * 0.08 * (1 + plateau * 4);
  } else {
    const des = smoothstep(150, 250, d);
    land = 0.9 + des * 5 + n1 * lerp(0.1, 5, des) + n2 * 0.06;
  }
  // canal do rio
  const k = smoothstep(RIVER_HALF + 10, RIVER_HALF - 4, ad);
  let h = land;
  if (k > 0) {
    const t = Math.min(ad, RIVER_HALF) / RIVER_HALF;
    const bed = -1.4 - 3.6 * (1 - t * t) + n2 * 0.6;
    h = lerp(land, bed, k);
  }
  // dunas com crista no deserto (a oeste do planalto e no deserto leste)
  const duneZone = d < 0 ? smoothstep(-300, -340, x) + smoothstep(-200, -260, x) * smoothstep(200, 260, Math.abs(z)) : smoothstep(165, 200, d);
  if (duneZone > 0) {
    const wx = x * 0.012 + fbm(x * 0.004, z * 0.004, 2) * 3, wz = z * 0.02;
    const ridge = 1 - Math.abs(2 * fbm(wx + 3, wz + 7, 3) - 1);
    h += duneZone * (ridge * ridge * 9 + fbm(x * 0.05, z * 0.05, 2) * 1.5);
  }
  // penhascos de arenito na margem leste (como os de Tebas) e morros rochosos a oeste
  const cliff = d > 0 ? smoothstep(215, 250, d + n1 * 30) : smoothstep(-345, -380, x + n1 * 25);
  if (cliff > 0) {
    const crag = fbm(x * 0.03 + 9, z * 0.03, 4);
    h += cliff * (34 + crag * 30) + smoothstep(0.55, 0.75, crag) * cliff * 10;
  }
  // bordas do mundo (exceto onde o rio passa)
  const e = Math.max(Math.abs(x), Math.abs(z));
  const riverFree = 1 - smoothstep(RIVER_HALF + 40, RIVER_HALF + 5, ad);
  h += smoothstep(340, 410, e) * (22 + n1 * 16) * riverFree;
  // lago sagrado do templo
  if (x > LAKE.x0 && x < LAKE.x1 && z > LAKE.z0 && z < LAKE.z1) h = Math.min(h, -1.1);
  return h;
}

export function waterLevelAt(x, z) {
  if (x > LAKE.x0 - 0.2 && x < LAKE.x1 + 0.2 && z > LAKE.z0 - 0.2 && z < LAKE.z1 + 0.2) return LAKE.y;
  if (Math.abs(x - riverX(z)) < RIVER_HALF + 14) return WATER_Y;
  return -100;
}

setTerrain(terrainHeight);
setWater(waterLevelAt);

const tmpC = new THREE.Color();
function col(r, g, b) { return tmpC.setRGB(r, g, b, THREE.SRGBColorSpace); }

function terrainColor(x, z, h) {
  const d = x - riverX(z), ad = Math.abs(d);
  const n = fbm(x * 0.05, z * 0.05, 3);
  const n2 = fbm(x * 0.3, z * 0.3, 2);
  let r = 0.86, g = 0.71, b = 0.49; // areia do deserto
  const mix = (cr, cg, cb, t) => { r = lerp(r, cr, t); g = lerp(g, cg, t); b = lerp(b, cb, t); };
  if (d < 0) {
    const plateau = smoothstep(-160, -200, x);
    mix(0.74, 0.6, 0.44, 1 - plateau);           // chão batido da cidade
    mix(0.88, 0.76, 0.56, plateau * 0.6);       // planalto
    const silt = smoothstep(-80, -55, d);
    mix(0.36, 0.33, 0.2, silt * 0.85);           // Kemet, terra negra fértil
    mix(0.33, 0.42, 0.2, silt * smoothstep(0.45, 0.7, n) * 0.6);
  } else {
    const field = smoothstep(46, 54, d) * (1 - smoothstep(140, 158, d));
    const plot = Math.floor((z + 1000) / 34) + Math.floor(d / 30) * 7;
    const ripe = (plot * 2654435761 >>> 0) % 3 === 0;
    mix(0.38, 0.31, 0.21, smoothstep(160, 120, d));
    if (ripe) mix(0.66, 0.56, 0.27, field * 0.9);
    else mix(0.3, 0.42, 0.16, field * 0.9);
    mix(0.82, 0.68, 0.47, smoothstep(170, 230, d));
  }
  // margem molhada e leito do rio
  if (h < 0.9 && ad < RIVER_HALF + 14) mix(0.3, 0.27, 0.19, smoothstep(0.9, 0.1, h));
  if (h < -0.3) mix(0.42, 0.36, 0.24, 0.6);
  const v = 0.9 + n * 0.2 + (n2 - 0.5) * 0.08;
  return col(r * v, g * v, b * v);
}

// pesos das 3 fotos do chão (areia, chão batido, lodo) e um tom multiplicador
function terrainSurface(x, z, h) {
  const d = x - riverX(z), ad = Math.abs(d);
  const n = fbm(x * 0.03 + 11, z * 0.03, 3);
  let sand = 0, ground = 0, mud = 0;
  let r = 1, g = 1, b = 1;
  if (d < 0) {
    const plateau = smoothstep(-160, -200, x);
    const silt = smoothstep(-82, -52, d);
    ground = (1 - plateau) * (1 - silt);
    sand = plateau * (1 - silt) + ground * (0.45 + smoothstep(0.55, 0.75, n) * 0.5); // areia solta sobre o chão batido
    mud = silt;
    if (silt > 0.2) { const gr = smoothstep(0.45, 0.7, n) * silt * 0.5; r -= 0.35 * gr; b -= 0.4 * gr; }
  } else {
    const field = smoothstep(46, 54, d) * (1 - smoothstep(140, 158, d));
    const des = smoothstep(150, 200, d);
    mud = 1 - des;
    sand = des;
    const plot = Math.floor((z + 1000) / 34) + Math.floor(d / 30) * 7;
    const ripe = ((plot * 2654435761) >>> 0) % 3 === 0;
    const fallow = plot % 5 === 0;
    if (!fallow) {
      if (ripe) { r = lerp(r, 1.25, field); g = lerp(g, 1.1, field); b = lerp(b, 0.6, field); }
      else { r = lerp(r, 0.62, field); g = lerp(g, 0.95, field); b = lerp(b, 0.42, field); }
    }
  }
  // margem molhada e leito do rio
  if (h < 0.9 && ad < RIVER_HALF + 14) { const w = smoothstep(0.9, 0.0, h); mud = lerp(mud, 1, w); sand *= 1 - w; ground *= 1 - w; r -= 0.35 * w; g -= 0.35 * w; b -= 0.3 * w; }
  const v = 0.92 + (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 0.18;
  const s = sand + ground + mud || 1;
  return [r * v, g * v, b * v, sand / s, ground / s, mud / s];
}

export function buildTerrain(scene, tex) {
  const SIZE = 820, SEG = 330;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const splat = new Float32Array(pos.count * 3);
  const uv = geo.attributes.uv;
  const P = tex.pbr;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    if (P) {
      const s = terrainSurface(x, z, h);
      colors[i * 3] = s[0]; colors[i * 3 + 1] = s[1]; colors[i * 3 + 2] = s[2];
      splat[i * 3] = s[3]; splat[i * 3 + 1] = s[4]; splat[i * 3 + 2] = s[5];
    } else {
      const c = terrainColor(x, z, h);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    uv.setXY(i, x / 4, z / 4);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 3));
  geo.computeVertexNormals();
  let mat;
  if (P) {
    mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: P.dry_ground_01.map, normalMap: P.dry_ground_01.normalMap, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.9, 0.9) });
    const U = { tSand: { value: P.aerial_sand.map }, tGround: { value: P.dry_ground_01.map }, tMud: { value: P.brown_mud_dry.map }, tSandN: { value: P.aerial_sand.normalMap }, tMudN: { value: P.brown_mud_dry.normalMap }, tRock: { value: P.rock_boulder_dry.map } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 splat;\nvarying vec3 vSplat;\nvarying vec2 vWXZ;\nvarying vec3 vWP;\nvarying vec3 vWN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvWXZ = (modelMatrix * vec4(position, 1.0)).xz;\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
uniform sampler2D tSand, tGround, tMud, tSandN, tMudN, tRock;
varying vec3 vSplat; varying vec2 vWXZ; varying vec3 vWP; varying vec3 vWN;
vec4 tri(sampler2D t, vec2 p){ return mix(texture2D(t, p), texture2D(t, p * 0.23 + 0.31), 0.4); }`)
        .replace('#include <map_fragment>', `
vec3 wS = vSplat / max(0.0001, vSplat.x + vSplat.y + vSplat.z);
vec3 cS = tri(tSand, vWXZ / 16.0).rgb * vec3(1.02, 0.97, 0.9);
vec3 cG = tri(tGround, vWXZ / 4.0).rgb * vec3(1.2, 1.02, 0.76);
vec3 cM = tri(tMud, vWXZ / 3.5).rgb;
vec3 baseC = (cS * wS.x + cG * wS.y + cM * wS.z) * 1.15;
// rocha nas encostas íngremes, projetada nos 3 eixos (não estica nos penhascos)
vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
vec3 cR = (texture2D(tRock, vWP.zy / 9.0).rgb * bw.x + texture2D(tRock, vWP.xz / 9.0).rgb * bw.y + texture2D(tRock, vWP.xy / 9.0).rgb * bw.z) * vec3(1.35, 1.0, 0.72);
float strata = 0.85 + 0.15 * sin(vWP.y * 1.7 + sin(vWP.x * 0.05) * 2.0);
float rockW = smoothstep(0.22, 0.45, 1.0 - vWN.y);
diffuseColor.rgb *= mix(baseC, cR * strata * 1.25, rockW);`)
        .replace('#include <normal_fragment_maps>', `
#ifdef USE_NORMALMAP
vec3 nS = texture2D(tSandN, vWXZ / 16.0).xyz * 2.0 - 1.0;
vec3 nG = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
vec3 nM = texture2D(tMudN, vWXZ / 3.5).xyz * 2.0 - 1.0;
vec3 mapN = normalize(nS * wS.x + nG * wS.y + nM * wS.z);
mapN.xy *= normalScale;
normal = normalize( tbn * mapN );
#endif`);
    };
  } else mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex.sandDetail, roughness: 0.96, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Nilo
  const wgeo = new THREE.PlaneGeometry(300, 1300, 1, 1);
  const water = new Water(wgeo, {
    textureWidth: 512, textureHeight: 512,
    waterNormals: tex.waterNormals,
    sunDirection: new THREE.Vector3(0.5, 0.6, 0.4).normalize(),
    sunColor: 0xfff2d8,
    waterColor: 0x14605f,
    distortionScale: 2.6,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(150, WATER_Y, 0);
  water.material.uniforms.size.value = 2.2;
  scene.add(water);

  // Lago sagrado e canais: água simples refletindo o céu
  const calmWater = new THREE.MeshStandardMaterial({ color: 0x1f6f72, roughness: 0.06, metalness: 0.25, normalMap: tex.waterNormals, normalScale: new THREE.Vector2(0.25, 0.25) });
  calmWater.normalMap = tex.waterNormals.clone();
  calmWater.normalMap.repeat.set(4, 4);
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(LAKE.x1 - LAKE.x0, LAKE.z1 - LAKE.z0), calmWater);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set((LAKE.x0 + LAKE.x1) / 2, LAKE.y, (LAKE.z0 + LAKE.z1) / 2);
  lake.receiveShadow = true;
  scene.add(lake);

  // canal paralelo ao rio na margem leste + canais transversais
  const canalGeos = [];
  const strip = (pts, w) => {
    const verts = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      let tx = q.x - o.x, tz = q.z - o.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const nx = -tz * w / 2, nz = tx * w / 2;
      verts.push(p.x + nx, terrainHeight(p.x + nx, p.z + nz) + 0.06, p.z + nz, p.x - nx, terrainHeight(p.x - nx, p.z - nz) + 0.06, p.z - nz);
      if (i < pts.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const uvs = []; for (let i = 0; i < verts.length / 3; i++) uvs.push(verts[i * 3] / 8, verts[i * 3 + 2] / 8);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return g;
  };
  const main = []; for (let z = -300; z <= 300; z += 3) main.push({ x: riverX(z) + 53, z });
  canalGeos.push(strip(main, 2.2));
  for (let z = -270; z <= 270; z += 68) {
    const pts = []; for (let d = 53; d <= 140; d += 3) pts.push({ x: riverX(z) + d, z });
    canalGeos.push(strip(pts, 1.4));
  }
  const canals = new THREE.Mesh(mergeGeometries(canalGeos), calmWater);
  canals.receiveShadow = true;
  scene.add(canals);

  return { terrain: mesh, water, calmWater };
}

// ----------------------------------------------------------------------------
// Vegetação instanciada
// ----------------------------------------------------------------------------

function palmGeometry() {
  const H = 8;
  const trunk = new THREE.CylinderGeometry(0.17, 0.3, H, 8, 8, true);
  trunk.translate(0, H / 2, 0);
  const tp = trunk.attributes.position;
  const bend = 0.9;
  for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + bend * (y / H) ** 2); }
  trunk.computeVertexNormals();
  const top = new THREE.Vector3(bend, H, 0);
  const fronds = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const f = new THREE.PlaneGeometry(1.1, 4.2, 1, 6);
    f.translate(0, 2.1, 0);
    const fp = f.attributes.position;
    for (let j = 0; j < fp.count; j++) {
      const y = fp.getY(j); const t = y / 4.2;
      fp.setZ(j, -t * t * 2.2 * (1 + (i % 3) * 0.2));
      fp.setX(j, fp.getX(j) * (1 - t * 0.3));
    }
    f.rotateX(Math.PI / 2 - (i < 4 ? 0.9 : 0.35));
    f.rotateY((i / N) * Math.PI * 2 + (i % 2) * 0.2);
    f.translate(top.x, top.y, top.z);
    fronds.push(f);
  }
  // cachos de tâmaras
  const dates = new THREE.SphereGeometry(0.35, 6, 5); dates.scale(1, 1.4, 1); dates.translate(top.x, top.y - 0.6, top.z + 0.2);
  const crown = mergeGeometries(fronds);
  return { trunk, crown, dates };
}

function papyrusGeometry() {
  const parts = [];
  const colors = [];
  const pushColored = (g, c) => {
    g = g.index ? g.toNonIndexed() : g;
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    parts.push(g);
  };
  const stalkC = new THREE.Color().setRGB(0.3, 0.45, 0.16, THREE.SRGBColorSpace);
  const umbC = new THREE.Color().setRGB(0.55, 0.66, 0.25, THREE.SRGBColorSpace);
  for (let i = 0; i < 7; i++) {
    const h = 2.2 + Math.random() * 1.6;
    const a = (i / 7) * Math.PI * 2, r = 0.25 + Math.random() * 0.25;
    const tilt = 0.08 + Math.random() * 0.12;
    const s = new THREE.CylinderGeometry(0.025, 0.04, h, 3);
    s.translate(0, h / 2, 0); s.rotateZ(Math.cos(a) * tilt); s.rotateX(Math.sin(a) * tilt);
    s.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    pushColored(s, stalkC);
    const u = new THREE.ConeGeometry(0.32, 0.45, 7, 1, true);
    u.rotateX(Math.PI);
    u.translate(0, h + 0.15, 0); u.rotateZ(Math.cos(a) * tilt); u.rotateX(Math.sin(a) * tilt);
    u.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    pushColored(u, umbC);
  }
  return mergeGeometries(parts);
}

export function buildVegetation(scene, tex, exclusions) {
  const dummy = new THREE.Object3D();
  const isExcluded = (x, z) => exclusions.some((e) => x > e[0] && x < e[1] && z > e[2] && z < e[3]);

  // --- palmeiras
  const palmPts = [];
  const tryPalm = (x, z, s) => {
    const h = terrainHeight(x, z);
    if (h < 0.5 || isExcluded(x, z) || blocked(x, z, h, 1.2)) return;
    for (const p of palmPts) if ((p.x - x) ** 2 + (p.z - z) ** 2 < 9) return;
    palmPts.push({ x, z, y: h, s: s || rr(0.75, 1.25) });
  };
  for (let z = -350; z < 350; z += rr(5, 10)) tryPalm(riverX(z) - rr(46, 75), z);
  for (let z = -350; z < 350; z += rr(6, 12)) tryPalm(riverX(z) + rr(44, 52), z);
  for (let i = 0; i < 70; i++) { const z = rr(-330, 330); tryPalm(riverX(z) + rr(56, 150), z); }
  for (let x = 24; x < 100; x += 11) { tryPalm(x, 14); tryPalm(x, -14); }
  for (let i = 0; i < 90; i++) tryPalm(rr(-140, 80), rr(-260, 260));
  // jardim do palácio
  for (let x = 30; x < 52; x += 6) { tryPalm(x, -110 + rr(-1, 1), 0.85); tryPalm(x, -155 + rr(-1, 1), 0.85); }
  // oásis perto da esfinge
  for (let i = 0; i < 8; i++) tryPalm(-150 + rr(-8, 8), 70 + rr(-8, 8));

  const pg = palmGeometry();
  const trunkMat = new THREE.MeshStandardMaterial({ map: tex.bark, roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ map: tex.frond, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75, color: 0xd8d890 });
  const datesMat = new THREE.MeshStandardMaterial({ color: 0x9a4a18, roughness: 0.7 });
  const trunks = new THREE.InstancedMesh(pg.trunk, trunkMat, palmPts.length);
  const crowns = new THREE.InstancedMesh(pg.crown, frondMat, palmPts.length);
  const datesM = new THREE.InstancedMesh(pg.dates, datesMat, palmPts.length);
  palmPts.forEach((p, i) => {
    dummy.position.set(p.x, p.y - 0.1, p.z); dummy.rotation.set(0, rand() * Math.PI * 2, 0); dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix); crowns.setMatrixAt(i, dummy.matrix); datesM.setMatrixAt(i, dummy.matrix);
    addCircle(p.x, p.z, 0.35 * p.s, -10, p.y + 8);
  });
  for (const m of [trunks, crowns, datesM]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  crowns.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex.frond, alphaTest: 0.45 });

  // --- papiros nas margens
  const papPts = [];
  for (let i = 0; i < 6000 && papPts.length < 800; i++) {
    const z = rr(-360, 360);
    const side = rand() < 0.5 ? -1 : 1;
    const x = riverX(z) + side * rr(34, 47);
    const h = terrainHeight(x, z);
    if (h < -0.9 || h > 0.5 || isExcluded(x, z)) continue;
    if (side < 0 && z > 22 && z < 66) continue; // cais
    if (side < 0 && Math.abs(z) < 10) continue;  // escadaria do templo
    papPts.push({ x, z, y: h });
  }
  const papMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const pap = new THREE.InstancedMesh(papyrusGeometry(), papMat, papPts.length);
  papPts.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, rand() * 6, 0); dummy.scale.setScalar(rr(0.7, 1.3));
    dummy.updateMatrix(); pap.setMatrixAt(i, dummy.matrix);
  });
  pap.castShadow = true; pap.receiveShadow = true; scene.add(pap);

  // --- trigo e cevada na margem leste
  const wheatG = (() => {
    const a = new THREE.PlaneGeometry(1.1, 1.0); a.translate(0, 0.5, 0);
    const b = a.clone(); b.rotateY(Math.PI / 2);
    const c = a.clone(); c.rotateY(Math.PI / 4);
    return mergeGeometries([a, b, c]);
  })();
  const wheatMat = new THREE.MeshStandardMaterial({ map: tex.wheat, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  const wheatPts = [];
  for (let i = 0; i < 30000 && wheatPts.length < 9000; i++) {
    const z = rr(-300, 300), d = rr(56, 140);
    if (Math.abs(((z + 270) % 68) - 0) < 2.5) continue;
    const x = riverX(z) + d;
    if (isExcluded(x, z)) continue;
    const plot = Math.floor((z + 1000) / 34) + Math.floor(d / 30) * 7;
    if (plot % 5 === 0) continue; // terra em pousio
    wheatPts.push({ x, z, ripe: ((plot * 2654435761) >>> 0) % 3 === 0 });
  }
  const wheat = new THREE.InstancedMesh(wheatG, wheatMat, wheatPts.length);
  const green = new THREE.Color(0x7fa33a), gold = new THREE.Color(0xffffff);
  wheatPts.forEach((p, i) => {
    dummy.position.set(p.x, terrainHeight(p.x, p.z) - 0.05, p.z); dummy.rotation.set(0, rand() * 3, 0);
    dummy.scale.set(rr(0.8, 1.3), rr(0.7, 1.2), rr(0.8, 1.3)); dummy.updateMatrix();
    wheat.setMatrixAt(i, dummy.matrix); wheat.setColorAt(i, p.ripe ? gold : green);
  });
  wheat.receiveShadow = true; scene.add(wheat);

  // --- pedras e arbustos do deserto
  const rockG = new THREE.IcosahedronGeometry(1, 2);
  { // pedras irregulares
    const p = rockG.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 0.75 + fbm(v.x * 1.7 + 5, v.y * 1.7 + v.z * 1.3, 3) * 0.55; p.setXYZ(i, v.x * k, v.y * k * 0.8, v.z * k); }
    rockG.computeVertexNormals();
  }
  const rockMat = tex.pbr
    ? new THREE.MeshStandardMaterial({ map: tex.pbr.rock_boulder_dry.map, normalMap: tex.pbr.rock_boulder_dry.normalMap, roughnessMap: tex.pbr.rock_boulder_dry.roughnessMap, color: 0xf0d2a8, roughness: 1 })
    : new THREE.MeshStandardMaterial({ color: 0xb89a70, roughness: 1, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockG, rockMat, 380);
  for (let i = 0; i < 380; i++) {
    let x, z;
    if (rand() < 0.6) { x = rr(-360, -180); z = rr(-360, 360); } else { z = rr(-360, 360); x = riverX(z) + rr(170, 260); }
    const s = rr(0.3, 1.8);
    dummy.position.set(x, terrainHeight(x, z) - s * 0.3, z); dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s, s * rr(0.5, 0.9), s * rr(0.8, 1.3)); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.castShadow = true; rocks.receiveShadow = true; scene.add(rocks);

  // --- touceiras de folhas (beira do rio, jardins, ruas) e palmeirinhas em vasos
  const leafTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 140; i++) {
      const x = 20 + Math.random() * 216, y = 30 + Math.random() * 210, a = Math.random() * Math.PI * 2, l = 14 + Math.random() * 22;
      const g = 85 + Math.random() * 60;
      ctx.fillStyle = `rgb(${50 + g * 0.3},${g},${32})`;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, l, l * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bushG = (() => {
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.PlaneGeometry(1.6, 1.3); p.translate(0, 0.6, 0);
      p.rotateX(-0.25 + Math.random() * 0.2); p.rotateY((i / 6) * Math.PI + Math.random() * 0.3);
      parts.push(p);
    }
    const top = new THREE.PlaneGeometry(1.5, 1.5); top.rotateX(-Math.PI / 2); top.translate(0, 1.0, 0); parts.push(top);
    return mergeGeometries(parts);
  })();
  const bushMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  const bushPts = [];
  const tryBush = (x, z, s) => {
    const h = terrainHeight(x, z);
    if (h < 0.15 || isExcluded(x, z) || blocked(x, z, h, 0.6)) return;
    bushPts.push({ x, z, y: h, s: s || rr(0.6, 1.4) });
  };
  for (let i = 0; i < 800; i++) { const z = rr(-360, 360); tryBush(riverX(z) + (rand() < 0.5 ? -1 : 1) * rr(44, 70), z); }
  for (let i = 0; i < 260; i++) tryBush(rr(-140, 85), rr(-260, 260), rr(0.5, 1.0));
  for (let i = 0; i < 40; i++) tryBush(-150 + rr(-12, 12), 70 + rr(-12, 12)); // oásis
  const bushes = new THREE.InstancedMesh(bushG, bushMat, bushPts.length);
  const bc = new THREE.Color();
  bushPts.forEach((p, i) => {
    dummy.position.set(p.x, p.y - 0.1, p.z); dummy.rotation.set(0, rand() * 6, 0); dummy.scale.set(p.s, p.s * rr(0.7, 1.1), p.s);
    dummy.updateMatrix(); bushes.setMatrixAt(i, dummy.matrix);
    bushes.setColorAt(i, bc.setHSL(0.17 + rand() * 0.08, 0.35 + rand() * 0.2, 0.55 + rand() * 0.25));
  });
  bushes.castShadow = true; bushes.receiveShadow = true; scene.add(bushes);
  bushes.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.45 });

  // palmeirinhas em vasos de terracota (avenida, pátio do templo, jardim do palácio)
  const potPts = [];
  for (let x = 28.5; x < 105; x += 9) for (const z of [-9, 9]) potPts.push([x, z, 1.15]);
  for (let x = -9.5; x >= -36; x -= 5) for (const z of [-12.6, 12.6]) potPts.push([x, z, 1.2]);
  for (let x = 28; x <= 50; x += 4.5) potPts.push([x, -126, 1.0]);
  const potPts2 = potPts.filter(([x, z, y]) => !blocked(x, z, y, 0.4));
  const potG = (() => { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.18 + Math.sin(t * Math.PI * 0.85) * 0.22 + (t > 0.9 ? 0.05 : 0), t * 0.7)); } return new THREE.LatheGeometry(pts, 14); })();
  const potMat = new THREE.MeshStandardMaterial({ color: 0xa4552f, roughness: 0.85 });
  const pots = new THREE.InstancedMesh(potG, potMat, potPts2.length);
  const sprouts = new THREE.InstancedMesh(pg.crown, frondMat, potPts2.length);
  potPts2.forEach(([x, z, y], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, rand() * 6, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pots.setMatrixAt(i, dummy.matrix);
    dummy.scale.setScalar(rr(0.2, 0.26)); dummy.position.set(x - 0.9 * dummy.scale.x, y + 0.55 - 8 * dummy.scale.y, z); dummy.updateMatrix(); sprouts.setMatrixAt(i, dummy.matrix);
    addCircle(x, z, 0.4, -5, y + 1.5);
  });
  for (const m of [pots, sprouts]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  sprouts.customDepthMaterial = crowns.customDepthMaterial;

  return { palms: palmPts };
}

// Montanhas e escarpas distantes no horizonte (silhuetas enevoadas, deixam o vale do Nilo aberto)
export function buildHorizon(scene, tex) {
  const R = 1250, SEG = 360, ROWS = 6;
  const geo = new THREE.CylinderGeometry(R, R, 1, SEG, ROWS, true);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i) + 0.5; // 0 embaixo, 1 em cima
    const a = Math.atan2(z, x);
    const valley = smoothstep(0.15, 0.55, Math.abs(Math.cos(a))); // o Nilo corre de norte a sul (eixo z)
    const ridge = 1 - Math.abs(2 * fbm(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + 5, 4) - 1);
    const top = 25 + valley * (70 + ridge * 150) + fbm(a * 20, 3, 2) * 20;
    const k = 1 - y * 0.18;
    p.setXYZ(i, x * k, -6 + y * top, z * k);
    const shade = 0.75 + y * 0.35;
    colors[i * 3] = 0.86 * shade; colors[i * 3 + 1] = 0.66 * shade; colors[i * 3 + 2] = 0.48 * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false, side: THREE.DoubleSide });
  if (tex.pbr) { mat.map = tex.pbr.rock_boulder_dry.map.clone(); mat.map.repeat.set(60, 2); mat.map.needsUpdate = true; }
  // névoa atmosférica própria: quanto mais baixo, mais "apagado" na cor do céu
  const U = { uHaze: { value: new THREE.Color(0xe8cfa2) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze;\nvarying float vH;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat hz = 0.55 + 0.35 * (1.0 - smoothstep(0.0, 160.0, vH));\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.haze = U.uHaze;
  scene.add(mesh);
  return mesh;
}
