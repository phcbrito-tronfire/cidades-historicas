// Mênfis, c. 1250 a.C.: templo de Ptah, pirâmides de Gizé, Esfinge, palácio,
// mercado, cais, casas, quartel e a fazenda da margem leste.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, rr, ri, pick } from './util.js';
import { addBox, addCircle, addPyramid } from './collision.js';
import { terrainHeight, riverX, LAKE } from './terrain.js';
import { pbrSet } from './textures.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fbm } from './util.js';

// ---------------------------------------------------------------------------
// Batcher: junta geometrias estáticas por material (poucas draw calls)
// ---------------------------------------------------------------------------
const V3 = THREE.Vector3, Q = THREE.Quaternion, E = THREE.Euler;
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new V3(x, y, z), new Q().setFromEuler(new E(rx, ry, rz)), new V3(sx, sy, sz));
}

function worldUV(g, { s = 4, sv, y0 = 0 }) {
  sv = sv || s;
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x / s; v = z / s; }
    else if (ax >= az) { u = z / s; v = (y - y0) / sv; }
    else { u = x / s; v = (y - y0) / sv; }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export class Batcher {
  constructor() { this.groups = new Map(); }
  add(geo, mat, matrix, uv) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(matrix);
    if (this.jitter) { // paredes de adobe irregulares: desloca pela posição (sem abrir frestas)
      const p = g.attributes.position, j = this.jitter;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        p.setXYZ(i, x + (fbm(x * 0.45 + 3, y * 0.6 + z * 0.45, 2) - 0.5) * j, y + (fbm(x * 0.3, z * 0.3, 2) - 0.5) * j * 0.6, z + (fbm(z * 0.45 + 9, y * 0.6 + x * 0.45, 2) - 0.5) * j);
      }
      g.computeVertexNormals();
    }
    const opt = uv === false ? null : (uv || mat.userData.uv);
    if (opt) worldUV(g, opt);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(g);
  }
  // y = base da peça
  box(mat, w, h, d, x, y, z, o = {}) {
    const m = mat4(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0);
    this.add(new THREE.BoxGeometry(w, h, d), mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
  }
  // parede de adobe: levemente inclinada para dentro no topo e irregular
  adobe(mat, w, h, d, x, y, z, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(h / 1.8)), Math.max(2, Math.ceil(d / 2)));
    const p = g.attributes.position, k = o.batter ?? 0.035;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + h / 2) / h;
      const s = 1 - k * t;
      p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s);
      // cantos arredondados pelo desgaste
      const cx = Math.abs(p.getX(i)) / (w / 2), cz = Math.abs(p.getZ(i)) / (d / 2);
      if (cx > 0.98 && cz > 0.98) { p.setX(i, p.getX(i) * 0.985); p.setZ(i, p.getZ(i) * 0.985); }
    }
    g.computeVertexNormals();
    const m = mat4(x, y + h / 2, z, 0, o.ry || 0, 0);
    const prev = this.jitter; this.jitter = o.jitter ?? 0.16;
    this.add(g, mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
    this.jitter = prev;
  }
  // caixa com quinas arredondadas
  rbox(mat, w, h, d, x, y, z, o = {}) {
    const r = Math.min(o.r ?? 0.12, w / 2.2, h / 2.2, d / 2.2);
    const m = mat4(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0);
    const g = new RoundedBoxGeometry(w, h, d, o.seg ?? 2, r);
    const prev = this.jitter; if (o.jitter) this.jitter = o.jitter;
    this.add(g, mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
    this.jitter = prev;
  }
  geo(geo, mat, x, y, z, o = {}) {
    const m = mat4(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx || o.s || 1, o.sy || o.s || 1, o.sz || o.s || 1);
    this.add(geo, mat, o.frame ? o.frame.clone().multiply(m) : m, o.uv);
  }
  build(scene) {
    for (const [mat, list] of this.groups) {
      const merged = mergeGeometries(list);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    this.groups.clear();
  }
}

function taper(w, h, d, kx, kz = kx) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * kx); p.setZ(i, p.getZ(i) * kz); }
  g.computeVertexNormals();
  return g;
}

function pyramidGeo(half, h, uvS = 18, y0 = 0, y1 = h) {
  // pirâmide (ou tronco se y1 < h), faces planas com UV em "fiadas"
  const pos = [], uv = [];
  const k0 = 1 - y0 / h, k1 = 1 - y1 / h;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const A0 = [a[0] * half * k0, y0, a[1] * half * k0], B0 = [b[0] * half * k0, y0, b[1] * half * k0];
    const A1 = [a[0] * half * k1, y1, a[1] * half * k1], B1 = [b[0] * half * k1, y1, b[1] * half * k1];
    const uA0 = 0, uB0 = (2 * half * k0) / uvS, off = (half * (k0 - k1)) / uvS;
    const quad = [[A0, uA0, y0], [B0, uB0, y0], [B1, uB0 - off, y1], [A0, uA0, y0], [B1, uB0 - off, y1], [A1, uA0 + off, y1]];
    if (y1 >= h - 0.001) quad.splice(3, 3);
    for (const [v, u, y] of quad) { pos.push(v[0], v[1], v[2]); uv.push(u, (y / uvS) * 2.2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Casco curvo de barco egípcio (proa e popa levantadas)
export function hullGeometry(L, W, H, curl = 1.2) {
  const g = new THREE.BoxGeometry(L, H, W, 24, 2, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (L / 2), y = p.getY(i) / (H / 2);
    const taperW = Math.max(0.06, 1 - x * x) * (y < 0 ? 0.65 : 1);
    p.setZ(i, p.getZ(i) * taperW);
    p.setY(i, p.getY(i) + curl * Math.pow(Math.abs(x), 4) * H * 2);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
export function createMaterials(tex) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  const M = {
    sandstone: std({ map: tex.sandstone }),
    relief: std({ map: tex.relief }),
    limestone: std({ map: tex.limestone, roughness: 0.75 }),
    mud: std({ map: tex.mud }),
    white: std({ map: tex.white }),
    palaceWall: std({ map: tex.palaceWall }),
    wood: std({ map: tex.wood, roughness: 0.8 }),
    column: std({ map: tex.column }),
    gold: std({ color: 0xffc64a, metalness: 1, roughness: 0.28 }),
    granite: std({ color: 0x9a5548, roughness: 0.45 }),
    basalt: std({ color: 0x2d2a2a, roughness: 0.5 }),
    blue: std({ color: 0x2c5d9c, roughness: 0.6 }),
    red: std({ color: 0xa8392a, roughness: 0.7 }),
    green: std({ color: 0x3d7f59, roughness: 0.7 }),
    ptahSkin: std({ color: 0x3f8a5c, roughness: 0.5 }),
    dark: std({ color: 0x140d08, roughness: 1 }),
    window: std({ color: 0x140d08, roughness: 1, emissive: 0xffa040, emissiveIntensity: 0 }),
    reed: std({ color: 0xb79c5c, roughness: 1 }),
    terracotta: std({ color: 0xa4552f, roughness: 0.85 }),
    bread: std({ color: 0xc88a48, roughness: 0.9 }),
    fish: std({ color: 0x9aa6a8, roughness: 0.4, metalness: 0.2 }),
    linen: std({ color: 0xf1ead8, roughness: 0.95 }),
    rope: std({ color: 0x8a6a3a, roughness: 1 }),
    fruitRed: std({ color: 0xa82030, roughness: 0.6 }),
    fruitPurple: std({ color: 0x4d2a62, roughness: 0.5 }),
    fruitBrown: std({ color: 0x6b2d12, roughness: 0.6 }),
    fruitGreen: std({ color: 0x6d9a3a, roughness: 0.6 }),
    onion: std({ color: 0xe7d6b4, roughness: 0.7 }),
    incense: std({ color: 0xd9b27a, roughness: 1 }),
    spiceRed: std({ color: 0xb4502a, roughness: 1 }),
    spiceYellow: std({ color: 0xd9a83e, roughness: 1 }),
    awnings: tex.awnings.map((t) => std({ map: t, side: THREE.DoubleSide })),
    nemes: std({ map: tex.nemes, roughness: 0.6 }),
    hide: std({ map: tex.hide }),
    stoneGrey: std({ color: 0xbfb6a4, roughness: 0.85 }),
    lion: std({ map: tex.sandstone, color: 0xe8d2a8, roughness: 0.8 }),
    paintedFace: std({ color: 0xc8936a, roughness: 0.85 }),
  };
  M.sandstone.userData.uv = { s: 6 };
  M.relief.userData.uv = { s: 9 };
  M.limestone.userData.uv = { s: 12 };
  M.mud.userData.uv = { s: 5 };
  M.white.userData.uv = { s: 6 };
  M.wood.userData.uv = { s: 3 };
  M.hide.userData.uv = { s: 2 };
  M.clay = M.mud;

  // texturas fotográficas (cor + relevo + rugosidade)
  const P = tex.pbr;
  if (P) {
    const set = (mat, s, opts = {}) => {
      const { color, ...rest } = { ...s, ...opts };
      Object.assign(mat, rest);
      if (color !== undefined) mat.color.set(color);
      mat.needsUpdate = true;
      return mat;
    };
    const rep = (src, r) => pbrSet(src, r);
    set(M.sandstone, rep(P.sandstone_blocks_08, 1), { normalScale: new THREE.Vector2(1.2, 1.2) });
    M.sandstone.userData.uv = { s: 3.2 };
    set(M.relief, { map: tex.relief, normalMap: rep(P.sandstone_blocks_08, tex.reliefTiles).normalMap, roughnessMap: rep(P.sandstone_blocks_08, tex.reliefTiles).roughnessMap });
    M.relief.userData.uv = { s: 9.6 };
    set(M.limestone, rep(P.white_sandstone_blocks_02, 1), { color: 0xf4ecdc });
    M.limestone.userData.uv = { s: 3 };
    M.pyramid = std(pbrSet(P.white_sandstone_blocks_02, [12, 5]));
    M.pyramid.color.set(0xf6eedf);
    set(M.mud, rep(P.rough_plaster_brick, 1), { color: 0xf2cf9c });
    M.mud.userData.uv = { s: 3 };
    M.clay = std({ ...rep(P.clay_plaster, 1), color: 0xd9c3a6 });
    M.clay.userData.uv = { s: 3 };
    set(M.white, rep(P.white_plaster_rough_01, 1), { color: 0xefe4cf });
    M.white.userData.uv = { s: 3 };
    set(M.palaceWall, { map: tex.palaceWall, normalMap: rep(P.white_plaster_rough_01, 2).normalMap, roughnessMap: rep(P.white_plaster_rough_01, 2).roughnessMap });
    set(M.wood, rep(P.weathered_planks, 1), { color: 0xd8c0a0 });
    M.wood.userData.uv = { s: 2.2 };
    set(M.column, { map: tex.column, normalMap: pbrSet(P.sandstone_blocks_08, [2, 4]).normalMap, roughnessMap: pbrSet(P.sandstone_blocks_08, [2, 4]).roughnessMap });
    set(M.granite, rep(P.rock_boulder_dry, 1), { color: 0xc98a78, roughness: 1, roughnessMap: rep(P.rock_boulder_dry, 1).roughnessMap });
    M.granite.userData.uv = { s: 2.5 };
    set(M.lion, rep(P.rock_boulder_dry, 1), { color: 0xf2d6a6 });
    M.lion.userData.uv = { s: 3 };
    M.awnings.forEach((m, i) => set(m, { map: tex.awnings[i], normalMap: rep(P.rough_linen, 1).normalMap }));
    set(M.linen, rep(P.rough_linen, 1), { color: 0xffffff });
    M.linen.userData.uv = { s: 1 };
    set(M.paintedFace, { normalMap: rep(P.rock_boulder_dry, 1).normalMap });
    M.paintedFace.userData.uv = { s: 3 };
    set(M.basalt, { normalMap: rep(P.rock_boulder_dry, 1).normalMap });
    M.basalt.userData.uv = { s: 2 };
  } else M.pyramid = M.limestone;
  // colunas pintadas: fuste listrado, amarras em faixas e capitel com chevrons, tinta gasta
  {
    const stoneImg = P ? P.sandstone_blocks_08.map.image : null;
    const paintTex = (W, H, draw, repeatU = 1) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ece1cc'; ctx.fillRect(0, 0, W, H);
      const paint = document.createElement('canvas'); paint.width = W; paint.height = H;
      const p = paint.getContext('2d');
      draw(p, W, H);
      // desgaste: lascas onde a tinta caiu
      p.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < (W * H) / 900; i++) {
        p.globalAlpha = 0.25 + Math.random() * 0.6;
        p.beginPath(); p.ellipse(Math.random() * W, Math.random() * H, 2 + Math.random() * 9, 1 + Math.random() * 5, Math.random() * 3, 0, 7); p.fill();
      }
      p.globalAlpha = 1; p.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.92; ctx.drawImage(paint, 0, 0); ctx.globalAlpha = 1;
      if (stoneImg) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.55; for (let y = 0; y < H; y += W / repeatU) ctx.drawImage(stoneImg, 0, y, W, W / repeatU); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      return t;
    };
    const OR = '#d8743e', BL = '#6fa6c0', YE = '#e2b44a', RD = '#b84a32', CR = '#efe3cb';
    const shaft = paintTex(1024, 1024, (p, W, H) => {
      const lobeW = W / 8;
      for (let i = 0; i < 8; i++) {
        const x0 = i * lobeW - lobeW / 2;
        const col = [OR, BL, OR, YE][i % 4];
        p.fillStyle = col; p.fillRect(x0 + lobeW * 0.3, 0, lobeW * 0.4, H);
        p.fillStyle = CR; p.fillRect(x0 + lobeW * 0.36, 0, lobeW * 0.08, H);
        p.fillStyle = 'rgba(120,70,40,0.6)'; p.fillRect(x0 + lobeW * 0.98, 0, 3, H); // sulco entre as hastes
      }
      // folhas na base
      for (let i = 0; i < 16; i++) {
        const x = (i / 16) * W;
        p.fillStyle = i % 2 ? BL : OR;
        p.beginPath(); p.moveTo(x, H); p.quadraticCurveTo(x + W / 32, H - 170, x + W / 16, H); p.fill();
      }
    }, 1);
    const bands = paintTex(1024, 256, (p, W, H) => {
      const cols = [OR, CR, BL, CR, YE, CR, OR];
      const bh = H / cols.length;
      cols.forEach((c, i) => { p.fillStyle = c; p.fillRect(0, i * bh, W, bh * 0.92); });
    }, 4);
    const cap = paintTex(1024, 512, (p, W, H) => {
      // base: faixas; meio: pétalas com chevrons; topo: borda azul
      for (let i = 0; i < 4; i++) { p.fillStyle = [OR, CR, BL, CR][i]; p.fillRect(0, H - (i + 1) * 22, W, 20); }
      const n = 16;
      for (let k = 0; k < n; k++) {
        const x = (k / n) * W, w = W / n;
        p.fillStyle = k % 2 ? BL : OR;
        p.beginPath(); p.moveTo(x, H - 88); p.quadraticCurveTo(x + w / 2, 40, x + w, H - 88); p.fill();
        p.strokeStyle = k % 2 ? YE : CR; p.lineWidth = 7;
        for (let j = 0; j < 4; j++) { const yy = H - 120 - j * 70; p.beginPath(); p.moveTo(x + w * 0.2, yy); p.lineTo(x + w / 2, yy - 28); p.lineTo(x + w * 0.8, yy); p.stroke(); }
      }
      p.fillStyle = RD; p.fillRect(0, 0, W, 18);
    }, 2);
    const nrm = P ? pbrSet(P.sandstone_blocks_08, 1).normalMap : null;
    M.colShaft = std({ map: shaft, normalMap: nrm, roughness: 0.85 });
    M.colBands = std({ map: bands, normalMap: nrm, roughness: 0.85 });
    M.colCap = std({ map: cap, normalMap: nrm, roughness: 0.85 });
  }
  // piramídio: ouro com faixas de hieróglifos gravados
  {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 512, 512); g.addColorStop(0, '#f6d27a'); g.addColorStop(0.5, '#d9a63c'); g.addColorStop(1, '#f0c862');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(90,55,10,0.75)'; ctx.fillStyle = 'rgba(90,55,10,0.7)'; ctx.lineWidth = 3;
    for (let row = 0; row < 6; row++) {
      const y = 30 + row * 82;
      ctx.fillRect(0, y - 6, 512, 3); ctx.fillRect(0, y + 58, 512, 3);
      for (let x = 12; x < 500; x += 28) {
        const k = (x * 7 + row * 13) % 6;
        ctx.beginPath();
        if (k === 0) ctx.arc(x + 10, y + 26, 9, 0, 7);
        else if (k === 1) { ctx.moveTo(x, y + 44); ctx.quadraticCurveTo(x + 12, y + 4, x + 22, y + 30); }
        else if (k === 2) { ctx.rect(x + 2, y + 14, 16, 26); }
        else if (k === 3) { ctx.moveTo(x + 10, y + 4); ctx.lineTo(x + 10, y + 50); ctx.moveTo(x, y + 18); ctx.lineTo(x + 20, y + 18); }
        else if (k === 4) { ctx.ellipse(x + 10, y + 26, 11, 6, 0, 0, 7); }
        else { for (let i = 0; i < 3; i++) { ctx.moveTo(x, y + 14 + i * 12); ctx.lineTo(x + 20, y + 14 + i * 12); } }
        ctx.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    M.capGold = std({ map: t, metalness: 1, roughness: 0.3 });
  }
  // cornija: arenito com folhas de palmeira pintadas (azul, vermelho, verde)
  {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    if (P) ctx.drawImage(P.sandstone_blocks_08.map.image, 0, 0, 512, 128); else { ctx.fillStyle = '#cfa978'; ctx.fillRect(0, 0, 512, 128); }
    const cols = ['#2c5d9c', '#a8392a', '#3d7f59', '#d9a23e'];
    ctx.globalAlpha = 0.78;
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = cols[(x / 16) % 4];
      ctx.beginPath(); ctx.moveTo(x + 2, 128); ctx.lineTo(x + 2, 22); ctx.quadraticCurveTo(x + 8, 4, x + 14, 22); ctx.lineTo(x + 14, 128); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    M.cornice = std({ map: t, normalMap: P ? pbrSet(P.sandstone_blocks_08, 1).normalMap : null });
    M.cornice.userData.uv = { s: 4, sv: 1.2 };
  }
  return M;
}

// ---------------------------------------------------------------------------
export function buildCity(scene, tex) {
  const M = createMaterials(tex);
  const B = new Batcher();
  const out = { torches: [], flags: [], animated: [], exclusions: [], zones: {}, spots: {}, M, lights: [] };
  const G = (x, z) => terrainHeight(x, z);
  const torch = (x, y, z, stand = true) => {
    if (stand) {
      B.box(M.wood, 0.18, 1.7, 0.18, x, y, z);
      B.geo(new THREE.CylinderGeometry(0.32, 0.16, 0.3, 8), M.terracotta, x, y + 1.85, z);
      addCircle(x, z, 0.25, y - 1, y + 2);
    }
    out.torches.push(new V3(x, y + (stand ? 2.05 : 0), z));
  };

  // ======================= TEMPLO DE PTAH ==================================
  const TY = 1.2; // piso do templo
  out.exclusions.push([-92, 22, -30, 30], [8, 120, -9, 9]);
  B.box(M.sandstone, 94, 0.5, 44, -38, TY - 0.5, 0);
  addBox(-38, 0, 94, 44, -5, TY);
  // avenida processional até o cais
  const quayX = riverX(0) - 47;
  B.box(M.sandstone, quayX - 8, 0.4, 9, (quayX + 8) / 2, TY - 0.45, 0);
  addBox((quayX + 8) / 2, 0, quayX - 8, 9, -5, TY - 0.05);
  // escadaria até a água
  for (let i = 0; i < 6; i++) {
    const top = TY - 0.05 - (i + 1) * 0.4, x0 = quayX + i * 1.6;
    B.box(M.sandstone, 1.6, top + 4, 12, x0 + 0.8, -4, 0);
    addBox(x0 + 0.8, 0, 1.6, 12, -5, top);
  }
  B.box(M.sandstone, 10, 3.4, 1.2, quayX + 5, -2.2, 6.6); B.box(M.sandstone, 10, 3.4, 1.2, quayX + 5, -2.2, -6.6);
  out.spots.quay = new V3(quayX, TY, 0);

  // pilono
  // bocel (moldura redonda) + cornija côncava egípcia no alto de um muro
  const cornice = (cx, cz, w, d, y, ov = 0.9) => {
    const along = w >= d;
    B.geo(new THREE.CylinderGeometry(0.2, 0.2, (along ? w : d) + 0.3, 10), M.sandstone, cx, y + 0.1, cz, along ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 });
    const g = new THREE.BoxGeometry(w + 0.3, 1.2, d + 0.3, along ? 1 : 1, 6, along ? 1 : 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 0.6) / 1.2; // 0 embaixo, 1 em cima
      const grow = Math.sin(t * Math.PI / 2) ** 2 * ov; // perfil côncavo
      const sx = p.getX(i) > 0 ? 1 : -1, sz = p.getZ(i) > 0 ? 1 : -1;
      if (along) p.setZ(i, p.getZ(i) + sz * grow); else p.setX(i, p.getX(i) + sx * grow);
    }
    g.computeVertexNormals();
    B.geo(g, M.cornice, cx, y + 0.8, cz, { uv: { s: 4, sv: 1.2, y0: y + 0.2 } });
    B.box(M.sandstone, (along ? w : w + 2 * ov) + 0.3, 0.25, (along ? d + 2 * ov : d) + 0.3, cx, y + 1.4, cz);
  };
  const pyl = (zc) => {
    B.geo(taper(8, 18, 17.5, 0.82, 0.88), M.relief, 1, TY + 9, zc);
    cornice(1, zc, 6.6, 15.4, TY + 18, 0.7);
    addBox(1, zc, 8, 17.5, -5, TY + 19.8);
  };
  pyl(12.25); pyl(-12.25);
  B.box(M.relief, 6, 4, 7, 1, TY + 11, 0);
  B.box(M.gold, 5.4, 0.8, 0.2, 4.05, TY + 13.2, 0); // disco solar alado (simplificado)
  B.geo(new THREE.SphereGeometry(0.7, 16, 12), M.gold, 4.2, TY + 13.6, 0, { sz: 0.25 });
  addBox(1, 0, 6, 7, TY + 11, TY + 15);
  B.box(M.sandstone, 6.4, 11, 0.6, 1, TY, 3.7); B.box(M.sandstone, 6.4, 11, 0.6, 1, TY, -3.7);
  // mastros com flâmulas
  for (const z of [-17, -7, 7, 17]) {
    B.geo(new THREE.CylinderGeometry(0.16, 0.24, 26, 8), M.wood, 5.6, TY + 13, z);
    addCircle(5.6, z, 0.3, -2, TY + 26);
    out.flags.push({ x: 5.6, y: TY + 23.5, z, color: z % 2 ? 0xa8392a : 0x2c5d9c });
  }
  // colossos sentados de Ramsés II
  // colossos de Ramsés II em pé (as figuras são criadas depois, a partir do corpo humano)
  out.statues = [];
  for (const z of [-7.5, 7.5]) {
    B.box(M.granite, 3.2, 1.6, 3.2, 9.5, TY, z);
    B.box(M.gold, 3.3, 0.18, 3.3, 9.5, TY + 1.5, z);
    addBox(9.5, z, 3.2, 3.2, -5, TY + 10);
    out.statues.push({ x: 9.5, y: TY + 1.6, z, ry: Math.PI / 2, h: 8.5 });
  }
  for (const z of [-15.5, 15.5]) {
    B.box(M.granite, 2.6, 1.2, 2.6, 8.6, TY, z);
    addBox(8.6, z, 2.6, 2.6, -5, TY + 8);
    out.statues.push({ x: 8.6, y: TY + 1.2, z, ry: Math.PI / 2, h: 6.5 });
  }
  // obeliscos
  for (const z of [-11.5, 11.5]) {
    B.box(M.granite, 2.6, 1.2, 2.6, 15, TY, z);
    B.geo(taper(1.7, 20, 1.7, 0.62), M.granite, 15, TY + 11.2, z);
    B.geo(pyramidGeo(0.53, 1.4), M.gold, 15, TY + 21.2, z);
    addBox(15, z, 2.6, 2.6, -2, TY + 22);
  }
  // avenida de esfinges
  for (let x = 24; x < quayX - 4; x += 9) for (const s of [-1, 1]) miniSphinx(B, M, x, TY - 0.05, s * 6.2, s > 0 ? -Math.PI / 2 : Math.PI / 2);

  // pátio com colunatas
  const wallH = 8;
  B.box(M.relief, 38, wallH, 2, -22, TY, 20); B.box(M.relief, 38, wallH, 2, -22, TY, -20);
  addBox(-22, 20, 38, 2, -5, TY + wallH); addBox(-22, -20, 38, 2, -5, TY + wallH);
  cornice(-22, 20, 38, 2, TY + wallH, 0.6); cornice(-22, -20, 38, 2, TY + wallH, 0.6);
  for (let x = -7; x >= -37; x -= 5) for (const z of [-15, 15]) column(B, M, x, TY, z, 0.75, 6.4, wallH);
  for (const z of [-17, 17]) { B.box(M.sandstone, 38, 0.8, 6, -22, TY + wallH, z); addBox(-22, z, 38, 6, TY + wallH, TY + wallH + 0.8); }
  // altar de oferendas
  B.box(M.granite, 3, 1.1, 2, -22, TY, 0);
  B.box(M.gold, 0.5, 0.4, 0.5, -22.6, TY + 1.1, 0.3);
  offerings(B, M, -22, TY + 1.1, 0);
  addBox(-22, 0, 3, 2, -2, TY + 1.1);
  torch(-19, TY, 3); torch(-19, TY, -3); torch(-25, TY, 3); torch(-25, TY, -3);
  out.zones.templo = [-84, 8, -21, 21];

  // sala hipostila
  const hallH = 13;
  B.box(M.relief, 2, hallH, 18, -42, TY, 12); B.box(M.relief, 2, hallH, 18, -42, TY, -12);
  B.box(M.relief, 2, hallH - 9, 6, -42, TY + 9, 0);
  addBox(-42, 12, 2, 18, -5, TY + hallH); addBox(-42, -12, 2, 18, -5, TY + hallH); addBox(-42, 0, 2, 6, TY + 9, TY + hallH);
  for (const z of [20, -20]) { B.box(M.relief, 26, hallH, 2, -54, TY, z); addBox(-54, z, 26, 2, -5, TY + hallH); }
  B.box(M.relief, 2, hallH, 16, -66, TY, 13); B.box(M.relief, 2, hallH, 16, -66, TY, -13);
  B.box(M.relief, 2, hallH - 7, 10, -66, TY + 7, 0);
  addBox(-66, 13, 2, 16, -5, TY + hallH); addBox(-66, -13, 2, 16, -5, TY + hallH); addBox(-66, 0, 2, 10, TY + 7, TY + hallH);
  B.box(M.sandstone, 27, 1, 42, -54, TY + hallH, 0);
  cornice(-54, 20.5, 27, 1, TY + hallH + 0.6, 0.7); cornice(-54, -20.5, 27, 1, TY + hallH + 0.6, 0.7);
  cornice(-41, 0, 1, 42, TY + hallH + 0.6, 0.7);
  cornice(-75.5, 8.6, 17.5, 0.8, TY + sHtop(), 0.5); cornice(-75.5, -8.6, 17.5, 0.8, TY + sHtop(), 0.5); cornice(-83.9, 0, 0.8, 18, TY + sHtop(), 0.5);
  B.box(M.blue, 25.6, 0.05, 40.6, -54, TY + hallH - 0.05, 0, { uv: false }); // teto azul estrelado (simplificado)
  addBox(-54, 0, 27, 42, TY + hallH, TY + hallH + 1);
  for (const x of [-47, -53, -59]) {
    for (const z of [-4.5, 4.5]) column(B, M, x, TY, z, 1.05, hallH - 1.6, hallH, true);
    for (const z of [-10.5, 10.5, -16, 16]) column(B, M, x, TY, z, 0.8, hallH - 1.6, hallH, false);
  }
  torch(-44.5, TY, 2.5); torch(-44.5, TY, -2.5); torch(-63.5, TY, 3.5); torch(-63.5, TY, -3.5);
  out.lights.push({ pos: new V3(-54, TY + 6, 0), color: 0xffa860, intensity: 180, dist: 30 });

  // santuário
  const sH = 9;
  B.box(M.relief, 16, sH, 1.5, -75, TY, 8.25); B.box(M.relief, 16, sH, 1.5, -75, TY, -8.25);
  B.box(M.relief, 1.5, sH, 18, -83.25, TY, 0);
  addBox(-75, 8.25, 16, 1.5, -5, TY + sH); addBox(-75, -8.25, 16, 1.5, -5, TY + sH); addBox(-83.25, 0, 1.5, 18, -5, TY + sH);
  B.box(M.sandstone, 17.5, 0.8, 18, -75.5, TY + sH, 0); addBox(-75.5, 0, 17.5, 18, TY + sH, TY + sH + 0.8);
  // naos e estátua de Ptah
  B.box(M.basalt, 3.2, 0.8, 3.2, -79, TY, 0); addBox(-79, 0, 3.2, 3.2, -2, TY + 0.8);
  B.box(M.basalt, 0.3, 4.4, 3.2, -80.4, TY + 0.8, 0);
  ptahStatue(B, M, -79, TY + 0.8, 0);
  offerings(B, M, -76.5, TY, 0);
  torch(-72, TY, 4.5); torch(-72, TY, -4.5);
  out.lights.push({ pos: new V3(-75, TY + 4, 0), color: 0xffb070, intensity: 90, dist: 18 });
  out.spots.santuario = new V3(-78, TY, 4.5);

  // lago sagrado
  const lw = LAKE.x1 - LAKE.x0, ld = LAKE.z1 - LAKE.z0, lcx = (LAKE.x0 + LAKE.x1) / 2, lcz = (LAKE.z0 + LAKE.z1) / 2;
  for (const [cx, cz, w, d] of [[lcx, LAKE.z0 - 0.6, lw + 2.4, 1.2], [lcx, LAKE.z1 + 0.6, lw + 2.4, 1.2], [LAKE.x0 - 0.6, lcz, 1.2, ld], [LAKE.x1 + 0.6, lcz, 1.2, ld]]) {
    B.box(M.sandstone, w, 2.6, d, cx, -1.3, cz); addBox(cx, cz, w, d, -5, 1.3);
  }
  for (let i = 0; i < 5; i++) {
    const top = 0.9 - i * 0.42;
    B.box(M.sandstone, 8, top + 1.2, 1.4, lcx, -1.1, LAKE.z1 - 0.7 - i * 1.4);
    addBox(lcx, LAKE.z1 - 0.7 - i * 1.4, 8, 1.4, -5, top);
  }
  out.exclusions.push([LAKE.x0 - 4, LAKE.x1 + 4, LAKE.z0 - 4, LAKE.z1 + 4]);

  // ======================= PIRÂMIDES DE GIZÉ ================================
  const pyramidAt = (cx, cz, half, h, opts = {}) => {
    let base = Infinity;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) base = Math.min(base, G(cx + i * half / 2, cz + j * half / 2));
    base -= 0.4;
    B.geo(pyramidGeo(half, h, 18), M.pyramid, cx, base, cz, { uv: false });
    if (opts.granite) B.geo(pyramidGeo(half * 1.004, h * 1.004, 18, 0, h * 0.16), M.granite, cx, base - 0.05, cz, { uv: false });
    const capH = h * 0.045;
    B.geo(pyramidGeo(half * (capH / h) * 1.06, capH * 1.06, 4), M.capGold, cx, base + h - capH, cz, { uv: false });
    addPyramid(cx, cz, half, h, base);
    return base;
  };
  const khufu = { x: -258, z: -70, half: 48, h: 61 };
  const khafre = { x: -246, z: 52, half: 44, h: 58 };
  const menk = { x: -228, z: 152, half: 22, h: 28 };
  const kb = pyramidAt(khufu.x, khufu.z, khufu.half, khufu.h);
  pyramidAt(khafre.x, khafre.z, khafre.half, khafre.h);
  pyramidAt(menk.x, menk.z, menk.half, menk.h, { granite: true });
  for (const z of [-104, -86, -68]) pyramidAt(-196, z, 7, 9);
  out.pyramids = { khufu, khafre, menk, khufuBase: kb };
  // templos funerários e calçada até o vale
  const causeway = (x0, z0, x1, z1) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 5);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const y = G(x, z);
      B.box(M.limestone, 5.4, 1.2, 4.5, x, y - 0.4, z, { ry: -ang });
    }
  };
  B.box(M.limestone, 16, 6, 30, khafre.x + khafre.half + 9, G(khafre.x + khafre.half + 9, khafre.z) - 0.5, khafre.z);
  addBox(khafre.x + khafre.half + 9, khafre.z, 16, 30, -5, G(khafre.x + khafre.half + 9, khafre.z) + 5.5);
  causeway(khafre.x + khafre.half + 17, khafre.z, -172, 30);
  B.box(M.limestone, 14, 5, 22, -164, G(-164, 34) - 0.5, 48); // templo do vale
  addBox(-164, 48, 14, 22, -5, G(-164, 48) + 4.5);
  B.box(M.limestone, 14, 5, 24, khufu.x + khufu.half + 8, G(khufu.x + khufu.half + 8, khufu.z) - 0.5, khufu.z);
  addBox(khufu.x + khufu.half + 8, khufu.z, 14, 24, -5, G(khufu.x + khufu.half + 8, khufu.z) + 4.5);

  // Esfinge
  out.spots.sphinx = sphinx(B, M, -158, 22);
  { // estátua do rei entre as patas da Esfinge
    const gy = G(-146.6, 22);
    B.box(M.limestone, 1.2, 0.6, 1.2, -146.6, gy - 0.2, 22);
    addBox(-146.6, 22, 1.2, 1.2, -5, gy + 3.4);
    out.statues.push({ x: -146.6, y: gy + 0.4, z: 22, ry: Math.PI / 2, h: 3, painted: true });
  }
  addBox(-163, 22, 22, 7, -5, G(-160, 22) + 8);
  addBox(-148.8, 22, 3, 5.6, -5, G(-150, 22) + 8);
  for (const s of [-1, 1]) addBox(-146.5, 22 + s * 2.1, 9, 1.8, -5, G(-146, 22) + 1.4);
  out.zones.piramides = [-320, -150, -130, 190];

  // canteiro da restauração do príncipe Khaemwaset
  const cx = -184, cz = -10, cy = G(cx, cz);
  for (let i = 0; i < 14; i++) {
    const w = rr(1.4, 2.2), x = cx + rr(-10, 4), z = cz + rr(-10, 8), y = G(x, z);
    B.box(M.limestone, w, rr(0.9, 1.3), w * rr(0.9, 1.4), x, y - 0.1, z, { ry: rand() });
    addBox(x, z, w, w, -5, y + 1.1);
  }
  // trenó com bloco
  B.box(M.wood, 4, 0.3, 0.3, cx + 6, cy, cz - 6 - 0.8); B.box(M.wood, 4, 0.3, 0.3, cx + 6, cy, cz - 6 + 0.8);
  for (let i = -1; i <= 1; i++) B.box(M.wood, 0.3, 0.2, 2, cx + 6 + i * 1.3, cy + 0.3, cz - 6);
  B.box(M.limestone, 2.4, 1.6, 1.8, cx + 6, cy + 0.5, cz - 6);
  for (let i = 0; i < 3; i++) B.geo(new THREE.CylinderGeometry(0.04, 0.04, 6, 4), M.rope, cx + 10 + i * 0.3, cy + 0.6, cz - 6 + (i - 1) * 0.4, { rz: Math.PI / 2 - 0.05 });
  addBox(cx + 6, cz - 6, 4, 2, -5, cy + 2);
  // tendas
  for (let i = 0; i < 4; i++) {
    const x = cx - 14 + i * 7, z = cz + 14, y = G(x, z);
    B.geo(new THREE.CylinderGeometry(1.8, 1.8, 5, 3, 1, true), M.awnings[i % 4], x, y + 0.9, z, { rz: Math.PI / 2, ry: Math.PI / 2, uv: false });
    addBox(x, z, 3.2, 5, -5, y + 2.2);
  }
  torch(cx + 2, cy, cz + 6);
  out.spots.hori = new V3(cx + 3, cy, cz + 2);

  // ======================= PALÁCIO REAL =====================================
  const PX0 = -15, PX1 = 55, PZ0 = -160, PZ1 = -105, PY = 1.0, PWH = 5;
  out.exclusions.push([PX0 - 6, PX1 + 30, PZ0 - 6, PZ1 + 6]);
  const pw = (cx_, cz_, w, d, h = PWH) => { B.box(M.palaceWall, w, h, d, cx_, PY - 0.4, cz_, { uv: { s: 6, sv: h + 0.4, y0: PY - 0.4 } }); addBox(cx_, cz_, w, d, -5, PY + h); };
  pw((PX0 + PX1) / 2, PZ0, PX1 - PX0, 1.5); pw((PX0 + PX1) / 2, PZ1, PX1 - PX0, 1.5);
  pw(PX0, (PZ0 + PZ1) / 2, 1.5, PZ1 - PZ0);
  pw(PX1, (PZ0 - 136) / 2, 1.5, -136 - PZ0); // muro leste, trecho sul
  pw(PX1, (-129 + PZ1) / 2, 1.5, PZ1 + 129);
  B.box(M.sandstone, 70, 0.3, 55, (PX0 + PX1) / 2, PY - 0.25, (PZ0 + PZ1) / 2);
  // torres do portão
  for (const z of [-138.5, -126.5]) { B.geo(taper(4.5, 8, 5, 0.85), M.relief, PX1 + 0.5, PY + 4 - 0.4, z); addBox(PX1 + 0.5, z, 4.5, 5, -5, PY + 8); }
  B.box(M.relief, 4.5, 2.4, 7, PX1 + 0.5, PY + 5, -132.5); addBox(PX1 + 0.5, -132.5, 4.5, 7, PY + 5, PY + 7.4);
  out.gateBlock = addBox(PX1 + 0.5, -132.5, 4.5, 7, -5, PY + 5, { camPass: true });
  out.zones.palacio = [PX0, PX1, PZ0, PZ1];
  out.spots.gate = new V3(PX1 + 4, PY, -132.5);
  torch(PX1 + 3.5, PY, -135.5); torch(PX1 + 3.5, PY, -129.5);

  // sala do trono
  const TX0 = -12, TX1 = 22, TZ0 = -150, TZ1 = -115, TH = 8;
  const tw = (cx_, cz_, w, d, y0 = PY - 0.3, h = TH) => { B.box(M.palaceWall, w, h, d, cx_, y0, cz_, { uv: { s: 6, sv: TH, y0: PY - 0.3 } }); addBox(cx_, cz_, w, d, y0 > PY ? y0 : -5, y0 + h); };
  tw((TX0 + TX1) / 2, TZ0, TX1 - TX0, 1); tw((TX0 + TX1) / 2, TZ1, TX1 - TX0, 1); tw(TX0, (TZ0 + TZ1) / 2, 1, TZ1 - TZ0);
  tw(TX1, (TZ0 - 135) / 2, 1, -135 - TZ0);
  tw(TX1, (-130 + TZ1) / 2, 1, TZ1 + 130);
  tw(TX1, -132.5, 1, 5, PY + 5, TH - 5.3);
  B.box(M.white, TX1 - TX0 + 1, 0.8, TZ1 - TZ0 + 1, (TX0 + TX1) / 2, PY - 0.3 + TH, (TZ0 + TZ1) / 2);
  B.box(M.blue, TX1 - TX0 - 1, 0.05, TZ1 - TZ0 - 1, (TX0 + TX1) / 2, PY - 0.35 + TH, (TZ0 + TZ1) / 2, { uv: false });
  addBox((TX0 + TX1) / 2, (TZ0 + TZ1) / 2, TX1 - TX0 + 1, TZ1 - TZ0 + 1, PY - 0.3 + TH, PY + TH + 0.5);
  // janela das aparições (sacada dourada acima da porta)
  B.box(M.gold, 1.2, 0.3, 6, TX1 + 0.9, PY + 4.4, -132.5);
  B.box(M.blue, 0.4, 1.6, 6.4, TX1 + 0.6, PY + 5.6, -132.5);
  for (let x = -6; x <= 18; x += 6) for (const z of [-140, -125]) column(B, M, x, PY - 0.3, z, 0.55, TH - 1.1, TH, false, M.white);
  // estrado e trono
  B.box(M.sandstone, 8, 0.4, 16, -7, PY - 0.3, -132.5); addBox(-7, -132.5, 8, 16, -5, PY + 0.1);
  B.box(M.sandstone, 4.5, 0.4, 10, -8.5, PY + 0.1, -132.5); addBox(-8.5, -132.5, 4.5, 10, -5, PY + 0.5);
  B.box(M.gold, 1.3, 0.8, 1.4, -9.2, PY + 0.5, -132.5);
  B.box(M.gold, 0.25, 2.2, 1.4, -9.9, PY + 0.5, -132.5);
  B.box(M.blue, 1.2, 0.15, 1.3, -9.2, PY + 1.3, -132.5, { uv: false });
  for (const z of [-133.3, -131.7]) B.box(M.gold, 1.2, 0.5, 0.1, -9.2, PY + 1.3, z);
  addBox(-9.3, -132.5, 1.6, 1.6, -5, PY + 2.6);
  for (const z of [-137, -128]) { B.geo(new THREE.CylinderGeometry(0.3, 0.3, 1.8, 10), M.gold, -5.5, PY + 1.4, z); torch(-5.5, PY + 0.1, z, false); }
  torch(18, PY - 0.3, -146); torch(18, PY - 0.3, -119);
  out.lights.push({ pos: new V3(2, PY + 5, -132.5), color: 0xffb070, intensity: 150, dist: 30 });
  out.spots.throne = new V3(-6, PY + 0.5, -132.5);
  out.zones.trono = [TX0, TX1, TZ0, TZ1];

  // jardim com piscina em T
  for (const [x0, x1, z0, z1] of [[30, 46, -137, -128], [42, 46, -150, -115]]) {
    const cxx = (x0 + x1) / 2, czz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    B.box(M.sandstone, w + 1, 0.6, d + 1, cxx, PY - 0.2, czz);
  }
  const pool = new THREE.Group();
  for (const [x0, x1, z0, z1] of [[30.3, 45.7, -136.7, -128.3], [42.3, 45.7, -149.7, -115.3]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), null);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, PY + 0.42, (z0 + z1) / 2); pool.add(m);
  }
  out.pool = pool;
  addBox(38, -132.5, 17, 10, -5, PY + 0.4); addBox(44, -132.5, 5, 36, -5, PY + 0.4);
  for (let i = 0; i < 18; i++) {
    const x = rr(31, 45), z = rr(-136, -129);
    B.geo(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 10), M.green, x, PY + 0.44, z);
    if (i % 3 === 0) B.geo(new THREE.ConeGeometry(0.12, 0.25, 6), M.linen, x, PY + 0.5, z);
  }
  for (let x = 27; x < 52; x += 3) for (const z of [-113, -152]) B.geo(new THREE.SphereGeometry(0.5, 7, 5), M.green, x, PY + 0.2, z, { sy: 0.7 });
  // depósitos e cozinhas
  for (let i = 0; i < 4; i++) {
    const x = TX0 + 4 + i * 8;
    B.box(M.mud, 7, 3.5, 6, x, PY - 0.3, -156); addBox(x, -156, 7, 6, -5, PY + 3.2);
    B.box(M.dark, 1, 2, 0.1, x, PY - 0.3, -152.95, { uv: false });
  }
  out.spots.palaceGarden = new V3(28, PY, -150);

  // ======================= QUARTEL ==========================================
  const QX = 66, QZ = -90;
  out.exclusions.push([QX - 14, QX + 14, QZ - 12, QZ + 12]);
  for (const [cx_, cz_, w, d] of [[QX, QZ - 10, 24, 1], [QX - 12, QZ, 1, 20]]) { B.box(M.mud, w, 2.6, d, cx_, 0.6, cz_); addBox(cx_, cz_, w, d, -5, 3.2); }
  B.box(M.mud, 10, 2.6, 1, QX - 7, 0.6, QZ + 10); addBox(QX - 7, QZ + 10, 10, 1, -5, 3.2);
  B.box(M.mud, 8, 4, 7, QX - 7, 0.6, QZ - 5.5); addBox(QX - 7, QZ - 5.5, 8, 7, -5, 4.6);
  B.box(M.dark, 0.1, 2, 1.2, QX - 2.95, 0.6, QZ - 5.5, { uv: false });
  // armeiro
  B.box(M.wood, 4, 0.15, 0.6, QX + 2, 1.8, QZ - 8.5); B.box(M.wood, 0.15, 1.8, 0.6, QX, 0.6, QZ - 8.5); B.box(M.wood, 0.15, 1.8, 0.6, QX + 4, 0.6, QZ - 8.5);
  for (let i = 0; i < 6; i++) B.geo(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), M.wood, QX + 0.4 + i * 0.6, 1.9, QZ - 8.3, { rz: 0.12 });
  addBox(QX + 2, QZ - 8.5, 4.4, 1, -5, 2.4);
  // alvos de arco
  for (const z of [QZ + 2, QZ + 6]) {
    B.box(M.wood, 0.2, 2, 0.2, QX + 9, 0.6, z); B.geo(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 14), M.hide, QX + 9, 2.2, z, { rz: Math.PI / 2, uv: false });
    addCircle(QX + 9, z, 0.5, -2, 3);
  }
  chariot(B, M, QX - 3, G(QX - 3, QZ + 5), QZ + 5, 0.4);
  addBox(QX - 3, QZ + 5, 3.5, 2.2, -5, 2.2);
  torch(QX + 13, 0.9, QZ - 2); torch(QX + 13, 0.9, QZ + 3);
  out.spots.quartel = new V3(QX + 2, 1, QZ - 7);
  out.zones.quartel = [QX - 12, QX + 12, QZ - 10, QZ + 10];

  // ======================= MERCADO E CAIS ===================================
  out.exclusions.push([38, 96, 26, 94]);
  const stallTypes = ['bread', 'fruit', 'pottery', 'fish', 'linen', 'spice', 'beer', 'fruit', 'bread', 'onion', 'pottery', 'spice', 'fish', 'linen'];
  let si = 0;
  out.stalls = [];
  for (const x of [48, 60, 72, 84]) for (const z of [36, 50, 64, 80]) {
    if ((x === 72 && z === 50) || (x === 60 && z === 64)) continue; // praça
    const type = x === 60 && z === 50 ? 'bread' : x === 72 && z === 64 ? 'linen' : stallTypes[si++ % stallTypes.length];
    const y = G(x, z);
    stall(B, M, x, y, z, type, si);
    addBox(x, z + 0.3, 3.2, 1.6, -5, y + 1.0);
    out.stalls.push({ x, y, z, type });
  }
  torch(66, G(66, 57), 57); torch(78, G(78, 72), 72); torch(54, G(54, 43), 43);
  out.zones.mercado = [40, 92, 28, 92];
  out.spots.merit = new V3(60, G(60, 52), 52.2);
  out.spots.djehuty = new V3(72, G(72, 66), 66.2);

  // cais de madeira
  const pz = 44, px0 = riverX(pz) - 52, px1 = riverX(pz) - 20, pcx = (px0 + px1) / 2;
  B.box(M.wood, px1 - px0, 0.3, 5, pcx, 0.95, pz);
  addBox(pcx, pz, px1 - px0, 5, 0.9, 1.25);
  for (let x = px0 + 2; x < px1; x += 3.5) for (const z of [pz - 2.3, pz + 2.3]) B.geo(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), M.wood, x, -2, z);
  const p2z = 60, p2x0 = riverX(p2z) - 50, p2x1 = riverX(p2z) - 32;
  B.box(M.wood, p2x1 - p2x0, 0.3, 4, (p2x0 + p2x1) / 2, 0.95, p2z); addBox((p2x0 + p2x1) / 2, p2z, p2x1 - p2x0, 4, 0.9, 1.25);
  for (let x = p2x0 + 2; x < p2x1; x += 3.5) for (const z of [p2z - 1.8, p2z + 1.8]) B.geo(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), M.wood, x, -2, z);
  // cargas no cais
  for (let i = 0; i < 6; i++) jar(B, M, px0 + 3 + i * 0.8, 1.25, pz + 1.8, 0.9);
  B.box(M.wood, 1.4, 1, 1.4, px0 + 8, 1.25, pz - 1.4); B.box(M.wood, 1.2, 0.9, 1.2, px0 + 8.2, 2.25, pz - 1.3);
  addBox(px0 + 8, pz - 1.4, 1.4, 1.4, 0.9, 3.2);
  torch(px1 - 1, 1.25, pz + 2.2, true);
  out.spots.pier = new V3(px1 - 2, 1.25, pz);
  out.spots.ipi = new V3(px1 - 4, 1.25, pz - 1.2);
  out.zones.cais = [px0 - 4, px1, pz - 6, p2z + 4];
  out.pierZ = pz; out.pier2Z = p2z;

  // ======================= MARGEM LESTE: FAZENDA DE TIY =====================
  const fz = -20, fx = riverX(fz) + 60, fy = G(fx, fz);
  out.exclusions.push([fx - 6, fx + 28, fz - 18, fz + 12]);
  B.box(M.mud, 7, 3.2, 6, fx + 14, fy - 0.2, fz - 8); addBox(fx + 14, fz - 8, 7, 6, -5, fy + 3);
  B.box(M.dark, 0.1, 1.9, 1, fx + 10.45, fy - 0.2, fz - 8, { uv: false });
  B.box(M.reed, 4, 0.12, 4, fx + 8.5, fy + 2.2, fz - 8);
  for (const [dx, dz] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8]]) B.box(M.wood, 0.12, 2.4, 0.12, fx + 8.5 + dx, fy - 0.2, fz - 8 + dz);
  for (let i = 0; i < 3; i++) { B.geo(new THREE.SphereGeometry(1.3, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mud, fx + 20 + i * 2.8, fy - 0.1, fz + 2, { sy: 1.5 }); addCircle(fx + 20 + i * 2.8, fz + 2, 1.2, -5, fy + 2); }
  // eira de debulha
  B.geo(new THREE.CylinderGeometry(4, 4, 0.12, 20), M.mud, fx + 6, fy - 0.02, fz + 6);
  B.geo(new THREE.ConeGeometry(1.6, 1.2, 10), M.reed, fx + 6, fy + 0.6, fz + 6);
  out.spots.tiy = new V3(fx + 5, fy, fz - 3);
  out.spots.farm = new V3(fx + 6, fy, fz + 6);
  out.zones.leste = 'east';
  // shaduf (animado)
  const shaduf = new THREE.Group();
  const sx = riverX(fz) + 51.2, sy = G(sx, fz - 12);
  shaduf.position.set(sx, sy, fz - 12);
  const postM = M.wood;
  for (const dz of [-0.6, 0.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), postM); p.position.set(0, 1.3, dz); shaduf.add(p); }
  const beamPivot = new THREE.Group(); beamPivot.position.y = 2.5; shaduf.add(beamPivot);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 6), postM); beam.rotation.z = Math.PI / 2; beamPivot.add(beam);
  const weight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), M.mud); weight.position.x = 2.8; beamPivot.add(weight);
  const ropeM = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 4), M.rope); ropeM.position.set(-2.9, -1.1, 0); beamPivot.add(ropeM);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.35, 8), M.terracotta); bucket.position.set(-2.9, -2.3, 0); beamPivot.add(bucket);
  shaduf.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  out.animated.push({ obj: shaduf, update: (t) => { beamPivot.rotation.z = Math.sin(t * 0.9) * 0.35; ropeM.rotation.z = -beamPivot.rotation.z; bucket.rotation.z = -beamPivot.rotation.z; } });
  scene.add(shaduf);
  addBox(sx, fz - 12, 0.6, 1.6, -5, sy + 2.6);
  // vilarejo de cabanas ao sul da fazenda
  for (let i = 0; i < 9; i++) {
    const z = -90 - i * 14 + rr(-3, 3), x = riverX(z) + rr(48, 62), y = G(x, z);
    const w = rr(3.5, 5);
    B.box(M.mud, w, rr(2.4, 3), w, x, y - 0.2, z, { ry: rr(-0.3, 0.3) });
    addBox(x, z, w * 1.1, w * 1.1, -5, y + 3);
    out.exclusions.push([x - 4, x + 4, z - 4, z + 4]);
  }

  // ======================= BAIRROS RESIDENCIAIS =============================
  out.exclusions.push([2, 22, 108, 132]); // praça de Nofret
  out.spots.nofret = new V3(12, G(12, 120), 120);
  const houseExcl = [...out.exclusions, [-200, -128, -400, 400]];
  const blockedByExcl = (x0, x1, z0, z1) => houseExcl.some((e) => x1 > e[0] - 2 && x0 < e[1] + 2 && z1 > e[2] - 2 && z0 < e[3] + 2);
  out.houses = [];
  for (let gx = -122; gx <= 84; gx += 15) {
    for (let gz = -255; gz <= 255; gz += 15) {
      if (rand() < 0.16) continue;
      const w = rr(6, 10), d = rr(6, 10);
      const x = gx + rr(-1.5, 1.5), z = gz + rr(-1.5, 1.5);
      if (blockedByExcl(x - w / 2, x + w / 2, z - d / 2, z + d / 2)) continue;
      if (x + w / 2 > riverX(z) - 56) continue;
      const y = G(x, z);
      if (y < 0.75 || y > 1.5) continue;
      house(B, M, x, y, z, w, d, out);
    }
  }
  B.build(scene);
  return out;
}

// ---------------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------------
const sHtop = () => 9.8;

// coluna em feixe de papiro (8 hastes), com capitel em botão fechado ou flor aberta
const LOBES = 8;
function lobed(geo, amp) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const th = Math.atan2(z, x);
    const k = 1 - amp + amp * Math.abs(Math.cos(th * LOBES / 2));
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}
function column(B, M, x, y, z, r, h, total, open = false, mat) {
  if (mat) { // colunas simples (palácio)
    B.geo(new THREE.CylinderGeometry(r * 0.9, r, h, 16, 1), mat, x, y + h / 2, z, { uv: false });
  } else {
    // fuste: estreita levemente na base, como o caule do papiro
    const shaft = new THREE.CylinderGeometry(r, r * 0.92, h * 0.88, 64, 6, true);
    const sp = shaft.attributes.position;
    for (let i = 0; i < sp.count; i++) { const t = (sp.getY(i) + h * 0.44) / (h * 0.88); const k = t < 0.12 ? 0.86 + t * 1.15 : 1; sp.setX(i, sp.getX(i) * k); sp.setZ(i, sp.getZ(i) * k); }
    B.geo(lobed(shaft, 0.1), M.colShaft, x, y + h * 0.44, z, { uv: false });
    // anéis (as amarras do feixe)
    B.geo(lobed(new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.08, 64, 1, true), 0.08), M.colBands, x, y + h * 0.88 + h * 0.04, z, { uv: false });
    // capitel
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const rr2 = open ? r * (0.95 + 1.0 * Math.pow(t, 1.6)) : r * (1.0 + 0.42 * Math.sin(t * Math.PI * 0.95) - 0.25 * t);
      pts.push(new THREE.Vector2(rr2, t * (open ? 1.3 : 1.25)));
    }
    B.geo(lobed(new THREE.LatheGeometry(pts, 64), open ? 0.06 : 0.14), M.colCap, x, y + h, z, { uv: false });
  }
  B.geo(new THREE.CylinderGeometry(r * 1.2, r * 1.25, 0.35, 24), M.sandstone, x, y + 0.17, z);
  const capH = mat ? 0 : open ? 1.3 : 1.25;
  if (mat) { if (open) B.geo(new THREE.CylinderGeometry(r * 1.9, r * 0.9, 1.0, 16, 1), M.green, x, y + h + 0.5, z); else B.geo(new THREE.SphereGeometry(r * 1.15, 14, 8), M.green, x, y + h + 0.25, z, { sy: 0.8 }); }
  const rest = total - h - (mat ? (open ? 1.0 : 0.6) : capH);
  if (rest > 0) B.box(M.sandstone, r * (open ? 2.6 : 2.0), rest, r * (open ? 2.6 : 2.0), x, y + total - rest, z);
  addCircle(x, z, r, -5, y + total);
}

function colossus(B, M, x, y, z, ry) {
  const F = mat4(x, y, z, 0, ry, 0);
  const o = (extra = {}) => ({ frame: F, ...extra });
  const S = M.granite;
  B.box(M.sandstone, 4.6, 1.2, 3.6, 0, 0, 0, o());
  B.box(S, 3, 4.2, 3, -0.7, 1.2, 0, o());          // trono
  B.box(S, 1.4, 4.2, 3.4, -2.1, 1.2, 0, o());     // encosto
  B.box(S, 2.4, 0.8, 1.0, 0.8, 4.6, -0.6, o()); B.box(S, 2.4, 0.8, 1.0, 0.8, 4.6, 0.6, o()); // coxas
  B.box(S, 0.8, 3.4, 0.9, 1.9, 1.2, -0.6, o()); B.box(S, 0.8, 3.4, 0.9, 1.9, 1.2, 0.6, o()); // canelas
  B.box(S, 1.3, 0.35, 0.9, 2.2, 1.2, -0.6, o()); B.box(S, 1.3, 0.35, 0.9, 2.2, 1.2, 0.6, o());
  B.box(S, 1.3, 2.9, 2.2, -0.6, 5.4, 0, o());      // tronco
  B.box(S, 2.2, 0.5, 0.5, 0.5, 5.3, -1.0, o()); B.box(S, 2.2, 0.5, 0.5, 0.5, 5.3, 1.0, o()); // braços
  B.box(M.gold, 0.2, 0.9, 1.5, 0.12, 6.9, 0, o());  // colar
  B.geo(new THREE.SphereGeometry(0.62, 14, 12), S, -0.5, 8.9, 0, o({ sx: 0.95, sy: 1.15 }));
  B.geo(taper(1.4, 1.5, 1.8, 0.75), M.nemes, -0.75, 9.1, 0, o({ uv: false }));
  B.box(M.nemes, 0.3, 1.4, 0.4, 0, 7.3, -0.75, o({ uv: false })); B.box(M.nemes, 0.3, 1.4, 0.4, 0, 7.3, 0.75, o({ uv: false }));
  B.geo(new THREE.CylinderGeometry(0.45, 0.6, 1.4, 12), M.red, -0.55, 10.4, 0, o()); // coroa
  B.geo(new THREE.CylinderGeometry(0.3, 0.32, 1.0, 12), M.white, -0.55, 11.5, 0, o());
  B.box(S, 0.2, 0.6, 0.2, 0.05, 8.1, 0, o());       // barba
  const wpos = new V3(x, 0, z);
  addBox(wpos.x - 0.5, wpos.z, 5, 3.8, -5, y + 9);
}

function miniSphinx(B, M, x, y, z, ry) {
  const F = mat4(x, y, z, 0, ry, 0);
  const o = { frame: F };
  const S = M.lion;
  B.box(M.sandstone, 3, 1, 1.4, 0, 0, 0, o);
  B.box(M.blue, 3.04, 0.12, 1.44, 0, 0.88, 0, { frame: F, uv: false });
  B.geo(new THREE.CapsuleGeometry(0.42, 1.3, 4, 10), S, -0.25, 1.42, 0, { frame: F, rz: Math.PI / 2, sz: 1.05 });
  B.geo(new THREE.SphereGeometry(0.4, 10, 8), S, -0.9, 1.38, 0, { frame: F, sx: 1.1, sy: 0.95 });
  for (const z of [-0.26, 0.26]) B.box(S, 0.95, 0.22, 0.24, 1.0, 1.0, z, o);
  B.box(S, 0.5, 0.75, 0.75, 0.6, 1.1, 0, o); // peito
  B.geo(new THREE.SphereGeometry(0.27, 12, 10), S, 0.85, 2.05, 0, { frame: F, sx: 0.9, sy: 1.1 });
  B.geo(taper(0.62, 0.55, 0.72, 0.7), M.nemes, 0.72, 2.12, 0, { frame: F, uv: false });
  for (const z of [-0.27, 0.27]) B.box(M.nemes, 0.16, 0.5, 0.14, 0.95, 1.55, z, { frame: F, uv: false });
  B.box(S, 0.1, 0.22, 0.08, 1.1, 1.72, 0, o);
  B.box(M.gold, 0.08, 0.12, 0.08, 1.08, 2.32, 0, o);
  const p = new V3(0, 0, 0).applyMatrix4(F);
  addBox(p.x, p.z, 1.6, 3.1, -5, y + 2.8);
}

function ptahStatue(B, M, x, y, z) {
  const o = { uv: false };
  B.box(M.sandstone, 1.3, 0.3, 1.3, x, y, z);
  B.geo(new THREE.CapsuleGeometry(0.32, 1.5, 6, 12), M.gold, x, y + 1.2, z, { sx: 0.9, sz: 1.1 });
  B.geo(new THREE.SphereGeometry(0.24, 14, 12), M.ptahSkin, x + 0.03, y + 2.35, z);
  B.geo(new THREE.SphereGeometry(0.26, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.blue, x, y + 2.42, z, o);
  B.box(M.blue, 0.06, 0.4, 0.12, x + 0.26, y + 1.95, z);
  B.box(M.gold, 0.08, 1.6, 0.08, x + 0.36, y + 0.9, z); // cetro was
  B.box(M.gold, 0.08, 0.08, 0.35, x + 0.36, y + 2.5, z);
  B.box(M.gold, 0.1, 0.24, 0.24, x + 0.36, y + 2.15, z);
}

function offerings(B, M, x, y, z) {
  for (let i = 0; i < 4; i++) B.geo(new THREE.SphereGeometry(0.16, 8, 6), M.bread, x + rr(-0.6, 0.6), y + 0.1, z + rr(-0.5, 0.5), { sy: 0.6 });
  for (let i = 0; i < 3; i++) B.geo(new THREE.SphereGeometry(0.1, 8, 6), pick([M.fruitRed, M.fruitPurple, M.fruitGreen]), x + rr(-0.6, 0.6), y + 0.1, z + rr(-0.5, 0.5));
  B.geo(new THREE.CylinderGeometry(0.12, 0.07, 0.4, 8), M.gold, x + 0.4, y + 0.2, z - 0.5);
  for (let i = 0; i < 3; i++) B.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), M.green, x - 0.5 + i * 0.1, y + 0.15, z + 0.6, { rz: 0.2 });
}

function sphinx(B, M, x, z) {
  const y = terrainHeight(x, z) - 0.5;
  const F = mat4(x, y, z, 0, 0, 0);
  const o = { frame: F };
  B.box(M.sandstone, 3.2, 1.2, 8, -2, -0.5, 0, o); // embasamento rochoso
  B.box(M.sandstone, 17, 5.4, 6.4, -2, 0.5, 0, o);  // corpo
  B.box(M.sandstone, 5, 6.5, 6, -9, 0.3, 0, o);     // ancas
  B.box(M.sandstone, 4.5, 7.2, 5.4, 5.5, 0.5, 0, o);  // peito
  for (const s of [-1, 1]) {
    B.box(M.sandstone, 9, 1.7, 1.7, 11.5, 0.5, s * 2.1, o); // patas
    B.box(M.sandstone, 3.5, 1.2, 1.5, -7.5, 0.5, s * 3.6, o); // patas traseiras
  }
  // cabeça: rosto arredondado, nemes listrado com abas laterais
  B.geo(new THREE.SphereGeometry(1.7, 20, 16), M.paintedFace, 6.9, 9.8, 0, { frame: F, sx: 0.95, sy: 1.2, sz: 0.92, uv: false });
  B.geo(new THREE.SphereGeometry(1.95, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.nemes, 6.4, 10.3, 0, { frame: F, sx: 1.05, sy: 1.1, sz: 1.08, uv: false });
  for (const s of [-1, 1]) B.geo(taper(1.1, 4.2, 0.8, 1.0, 1.6), M.nemes, 6.6, 8.3, s * 1.95, { frame: F, uv: false });
  B.geo(taper(3.2, 3.6, 3.4, 0.6), M.nemes, 4.6, 9.6, 0, { frame: F, uv: false });
  B.box(M.paintedFace, 0.6, 0.95, 0.7, 8.3, 9.4, 0, o); // nariz
  for (const s of [-1, 1]) { B.box(M.dark, 0.25, 0.22, 0.75, 8.35, 10.5, s * 0.75, o); B.box(M.dark, 0.25, 0.08, 1.0, 8.42, 10.85, s * 0.75, o); }
  B.box(M.red, 0.25, 0.22, 1.2, 8.25, 8.55, 0, o);
  B.geo(new THREE.CylinderGeometry(0.22, 0.32, 1.6, 10), M.paintedFace, 8.0, 7.2, 0, { frame: F }); // barba
  B.box(M.gold, 0.6, 1.0, 0.45, 8.15, 11.9, 0, o); // ureu
  // estela do sonho de Tutmés IV entre as patas
  B.box(M.relief, 0.5, 3.6, 3.2, 10.4, 0.5, 0, o);
  return new V3(x + 14.5, terrainHeight(x + 14.5, z), z);
}

function stall(B, M, x, y, z, type, seed) {
  const aw = M.awnings[seed % M.awnings.length];
  for (const [dx, dz] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.4], [1.6, 1.4]]) B.box(M.wood, 0.12, dz > 0 ? 2.5 : 2.9, 0.12, x + dx, y, z + dz);
  B.box(aw, 3.6, 0.05, 3.0, x, y + 2.7, z + 0.1, { rx: 0.14, uv: false });
  B.box(M.wood, 3.1, 0.9, 1.3, x, y, z + 0.3);
  const top = y + 0.9;
  const pile = (mat, n, r = 0.12, sy = 1) => { for (let i = 0; i < n; i++) B.geo(new THREE.SphereGeometry(r, 7, 5), mat, x + rr(-1.3, 1.3), top + r * sy * 0.8 + (i % 3) * r * 0.5, z + 0.3 + rr(-0.45, 0.45), { sy }); };
  switch (type) {
    case 'bread': pile(M.bread, 16, 0.18, 0.6); B.geo(new THREE.CylinderGeometry(0.7, 0.8, 1.3, 12), M.mud, x - 2.6, y + 0.65, z + 1.4); break;
    case 'fruit':
      for (let k = 0; k < 3; k++) B.geo(new THREE.CylinderGeometry(0.42, 0.32, 0.25, 10), M.reed, x - 0.9 + k * 0.9, top + 0.12, z + 0.3);
      pile(M.fruitRed, 6, 0.1); pile(M.fruitPurple, 8, 0.07); pile(M.fruitBrown, 10, 0.06, 1.4); pile(M.fruitGreen, 2, 0.24, 0.8); break;
    case 'pottery': for (let i = 0; i < 5; i++) jar(B, M, x - 1.2 + i * 0.6, top, z + 0.3, rr(0.5, 0.8)); for (let i = 0; i < 4; i++) jar(B, M, x - 1.3 + i * 0.8, y, z - 1.3, 1.1); break;
    case 'fish':
      for (let i = 0; i < 9; i++) B.geo(new THREE.SphereGeometry(0.12, 8, 5), M.fish, x + rr(-1.2, 1.2), top + 0.06, z + 0.3 + rr(-0.4, 0.4), { sx: 3, sy: 0.5, ry: rand() * 3 });
      for (let i = 0; i < 6; i++) B.geo(new THREE.SphereGeometry(0.1, 6, 4), M.fish, x - 1.4 + i * 0.55, y + 2.1, z - 1.2, { sy: 3 });
      break;
    case 'linen': for (let i = 0; i < 6; i++) B.geo(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 10), i % 3 ? M.linen : M.awnings[i % 4], x - 1 + i * 0.4, top + 0.14, z + 0.3, { rx: Math.PI / 2, uv: false }); break;
    case 'spice':
      for (let i = 0; i < 4; i++) B.geo(new THREE.ConeGeometry(0.3, 0.4, 10), [M.spiceRed, M.spiceYellow, M.incense, M.green][i], x - 1.1 + i * 0.73, top + 0.2, z + 0.3);
      break;
    case 'beer': for (let i = 0; i < 6; i++) jar(B, M, x - 1.3 + i * 0.5, top, z + 0.3, 0.6); for (let i = 0; i < 3; i++) jar(B, M, x + 2.4, y, z - 1 + i * 0.8, 1.2); break;
    case 'onion': pile(M.onion, 18, 0.1); pile(M.green, 6, 0.08, 2); break;
  }
}

export function jar(B, M, x, y, z, s = 1) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI) * 0.28 + (t > 0.85 ? 0.06 : 0), t * 0.8)); }
  B.geo(new THREE.LatheGeometry(pts, 10), M.terracotta, x, y, z, { s, uv: false });
}

function chariot(B, M, x, y, z, ry) {
  const F = mat4(x, y, z, 0, ry, 0);
  const o = { frame: F, uv: false };
  B.box(M.wood, 1.2, 0.1, 1.4, 0, 0.9, 0, o);
  B.box(M.gold, 0.06, 0.8, 1.4, 0.6, 0.95, 0, o);
  B.box(M.wood, 1.2, 0.6, 0.06, 0, 0.95, 0.7, o); B.box(M.wood, 1.2, 0.6, 0.06, 0, 0.95, -0.7, o);
  for (const s of [-1, 1]) {
    B.geo(new THREE.TorusGeometry(0.5, 0.04, 6, 18), M.wood, -0.3, 0.55, s * 0.85, o);
    for (let i = 0; i < 6; i++) B.box(M.wood, 0.03, 0.9, 0.03, -0.3, 0.1, s * 0.85, { frame: F.clone().multiply(mat4(-0.3, 0.55, s * 0.85, 0, 0, (i / 6) * Math.PI).multiply(mat4(0.3, -0.55, -s * 0.85))), uv: false });
  }
  B.box(M.wood, 0.06, 0.06, 1.9, -0.3, 0.52, 0, o);
  B.box(M.wood, 2.8, 0.08, 0.08, 1.9, 0.95, 0, { frame: F, uv: false, rz: -0.25 });
}

function house(B, M, x, y, z, w, d, out) {
  const r0 = rand();
  const mat = r0 < 0.3 ? M.white : r0 < 0.65 ? M.mud : M.clay;
  const two = rand() < 0.28;
  const h = rr(3.2, 4.2);
  const base = y - 0.3;
  B.adobe(mat, w, h + 0.3, d, x, base, z);
  // rodapé de barro mais escuro, gasto pela água e pelos pés
  B.adobe(M.mud, w + 0.12, 0.45, d + 0.12, x, base, z, { jitter: 0.1, batter: 0 });
  addBox(x, z, w, d, -5, y + h);
  const sh = 1 - 0.035; // largura no topo (paredes inclinadas)
  let top = y + h;
  if (two) {
    const w2 = w * rr(0.5, 0.7), d2 = d * rr(0.5, 0.7);
    const ox = (w - w2) / 2 * (rand() < 0.5 ? -1 : 1) * 0.9, oz = (d - d2) / 2 * (rand() < 0.5 ? -1 : 1) * 0.9;
    const h2 = rr(2.6, 3.2);
    B.adobe(mat, w2, h2, d2, x + ox, top - 0.05, z + oz);
    addBox(x + ox, z + oz, w2, d2, -5, top + h2);
    B.box(M.window, 0.2, 0.5, 0.7, x + ox + w2 / 2 * 0.98, top + h2 - 1.2, z + oz, { uv: false });
    if (rand() < 0.4) { // apanhador de vento (malqaf)
      B.adobe(mat, 1.2, 1.4, 0.9, x + ox, top + h2 - 0.05, z + oz, { jitter: 0.06 });
      B.box(M.dark, 0.95, 0.75, 0.2, x + ox, top + h2 + 0.3, z + oz - 0.4, { uv: false });
    }
  }
  // parapeito
  const t = 0.26, ph = 0.5, W = w * sh, D = d * sh;
  B.adobe(mat, W, ph, t, x, top - 0.05, z - D / 2 + t / 2, { jitter: 0.06 }); B.adobe(mat, W, ph, t, x, top - 0.05, z + D / 2 - t / 2, { jitter: 0.06 });
  B.adobe(mat, t, ph, D, x - W / 2 + t / 2, top - 0.05, z, { jitter: 0.06 }); B.adobe(mat, t, ph, D, x + W / 2 - t / 2, top - 0.05, z, { jitter: 0.06 });
  // vigas de palmeira saindo da parede, logo abaixo do terraço
  for (let i = 0; i < Math.floor(w / 1.3); i++) B.geo(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), M.wood, x - w / 2 * sh + 0.6 + i * 1.3, top - 0.25, z + (d / 2) * sh, { rx: Math.PI / 2 });
  // porta e janelas
  const face = ri(0, 3);
  const doorAt = [[x + w / 2 * 0.985, z, Math.PI / 2], [x - w / 2 * 0.985, z, Math.PI / 2], [x, z + d / 2 * 0.985, 0], [x, z - d / 2 * 0.985, 0]][face];
  B.box(M.dark, 1.0, 2.0, 0.26, doorAt[0], y - 0.05, doorAt[1], { ry: doorAt[2], uv: false });
  B.box(M.wood, 1.35, 0.16, 0.34, doorAt[0], y + 1.95, doorAt[1], { ry: doorAt[2] });
  for (const s of [-0.58, 0.58]) B.box(M.wood, 0.12, 2.0, 0.3, doorAt[0] + (face < 2 ? 0 : s), y - 0.05, doorAt[1] + (face < 2 ? s : 0), { ry: doorAt[2] });
  for (let k = 0; k < 2; k++) {
    const f = (face + 2 + k) % 4;
    const k2 = 0.975;
    const o = [[x + w / 2 * k2, z + rr(-d / 4, d / 4), Math.PI / 2], [x - w / 2 * k2, z + rr(-d / 4, d / 4), Math.PI / 2], [x + rr(-w / 4, w / 4), z + d / 2 * k2, 0], [x + rr(-w / 4, w / 4), z - d / 2 * k2, 0]][f];
    B.box(M.window, 0.7, 0.45, 0.26, o[0], y + h - 1.1, o[1], { ry: o[2], uv: false });
    // grade de madeira na janela
    for (const s of [-0.18, 0, 0.18]) B.box(M.wood, 0.05, 0.45, 0.3, o[0] + (f < 2 ? 0 : s), y + h - 1.1, o[1] + (f < 2 ? s : 0), { ry: o[2], uv: false });
  }
  // toldo de junco no terraço
  if (rand() < 0.45) {
    const cw = Math.min(w, 4), cd = Math.min(d, 3.5);
    const cx = x - w / 2 + cw / 2 + 0.3, cz = z - d / 2 + cd / 2 + 0.3;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(M.wood, 0.1, 2.1, 0.1, cx + dx * (cw / 2 - 0.2), top, cz + dz * (cd / 2 - 0.2));
    for (let i = 0; i < Math.ceil(cw / 0.16); i++) B.geo(new THREE.CylinderGeometry(0.07, 0.07, cd, 3), M.reed, cx - cw / 2 + i * 0.16, top + 2.13, cz, { rx: Math.PI / 2, uv: false });
  }
  // silos, forno, jarros
  if (rand() < 0.35) {
    const sx = x + (w / 2 + 1.3) * (rand() < 0.5 ? -1 : 1), sz = z + rr(-d / 3, d / 3);
    B.geo(new THREE.SphereGeometry(1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.mud, sx, y - 0.1, sz, { sy: 1.6 });
    addCircle(sx, sz, 1.05, -5, y + 1.7);
  }
  if (rand() < 0.5) for (let i = 0; i < ri(1, 3); i++) jar(B, M, doorAt[0] + (face < 2 ? (face === 0 ? 0.6 : -0.6) : 1 + i * 0.6), y - 0.05, doorAt[1] + (face >= 2 ? (face === 2 ? 0.6 : -0.6) : 1 + i * 0.6), rr(0.8, 1.2));
  if (rand() < 0.2) {
    const ox = x + rr(-w / 3, w / 3), oz = z + (d / 2 + 1.4) * (rand() < 0.5 ? -1 : 1);
    B.geo(new THREE.CylinderGeometry(0.5, 0.65, 1.0, 10), M.mud, ox, y + 0.45, oz);
    addCircle(ox, oz, 0.6, -5, y + 1);
  }
  out.houses.push({ x, z, w, d, h, top: y + h });
}
