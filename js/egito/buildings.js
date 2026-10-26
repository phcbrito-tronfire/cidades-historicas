// Mênfis, c. 1250 a.C.: templo de Ptah, pirâmides de Gizé, Esfinge, palácio,
// mercado, cais, casas, quartel e a fazenda da margem leste.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, rr, ri, pick } from '../comum/util.js';
import { addBox, addCircle, addPyramid } from '../comum/collision.js';
import { terrainHeight, riverX, LAKE } from './terrain.js';
import { pbrSet } from './textures.js';
import { Batcher, mat4 } from '../comum/batcher.js';
export { mat4 };
const V3 = THREE.Vector3;

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
    // ordem anti-horária vista de fora (antes estava invertida e as faces externas sumiam)
    const quad = [[A0, uA0, y0], [B1, uB0 - off, y1], [B0, uB0, y0], [A0, uA0, y0], [A1, uA0 + off, y1], [B1, uB0 - off, y1]];
    if (y1 >= h - 0.001) quad.splice(3, 3);
    for (const [v, u, y] of quad) { pos.push(v[0], v[1], v[2]); uv.push(u, (y / uvS) * 2.2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
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
    // revestimento de calcário de Tura: polido, claro e brilhante, com juntas finas quase invisíveis
    {
      const c = document.createElement('canvas'); c.width = c.height = 1024;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#efe7d6'; ctx.fillRect(0, 0, 1024, 1024);
      // leve variação de tom entre blocos e manchas de tempo
      const rows = 9, cols = 12;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * (1024 / cols / 2);
        for (let k = -1; k < cols; k++) {
          const v = 228 + Math.floor(Math.random() * 18);
          ctx.fillStyle = `rgb(${v + 6},${v},${v - 14})`;
          ctx.fillRect(k * (1024 / cols) + off, r * (1024 / rows), 1024 / cols, 1024 / rows);
        }
      }
      ctx.globalAlpha = 0.07; ctx.drawImage(P.white_sandstone_blocks_02.map.image, 0, 0, 1024, 1024); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(150,130,100,0.35)'; ctx.lineWidth = 1.5;
      for (let r = 0; r <= rows; r++) { const y = r * (1024 / rows); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
        const off = (r % 2) * (1024 / cols / 2);
        for (let k = 0; k <= cols; k++) { const x = k * (1024 / cols) + off; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 1024 / rows); ctx.stroke(); } }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      t.repeat.set(1.5, 1);
      const n = P.white_sandstone_blocks_02.normalMap.clone(); n.repeat.set(6, 3); n.needsUpdate = true;
      M.pyramid = std({ map: t, normalMap: n, normalScale: new THREE.Vector2(0.18, 0.18), roughness: 0.32, metalness: 0, envMapIntensity: 1.2 });
      M.pyramid.userData.keepEnv = true;
    }
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
    M.awnings.forEach((m, i) => set(m, { map: tex.awnings[i], normalMap: rep(P.rough_linen, 1).normalMap }));
    set(M.linen, rep(P.rough_linen, 1), { color: 0xffffff });
    M.linen.userData.uv = { s: 1 };
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
  out.sculptures = SCULPT = []; // modelos 3D esculpidos (esfinges), carregados à parte em sculptures.js
  for (const z of [-7.5, 7.5]) {
    B.box(M.granite, 3.2, 1.6, 3.2, 9.5, TY, z);
    B.box(M.gold, 3.3, 0.18, 3.3, 9.5, TY + 1.5, z);
    addBox(9.5, z, 3.2, 3.2, -5, TY + 10);
    SCULPT.push({ model: 'anubis', x: 9.5, y: TY + 1.6, z, ry: 0, length: 8.5 }); // Anúbis guardando o pilone
  }
  for (const z of [-15.5, 15.5]) {
    B.box(M.granite, 2.6, 1.2, 2.6, 8.6, TY, z);
    addBox(8.6, z, 2.6, 2.6, -5, TY + 8);
    SCULPT.push({ model: 'anubis', x: 8.6, y: TY + 1.2, z, ry: 0, length: 6.5 });
  }
  // obeliscos
  for (const z of [-11.5, 11.5]) {
    B.box(M.granite, 2.6, 1.2, 2.6, 15, TY, z);
    B.geo(taper(1.7, 20, 1.7, 0.62), M.granite, 15, TY + 11.2, z);
    B.geo(pyramidGeo(0.53, 1.4), M.gold, 15, TY + 21.2, z);
    addBox(15, z, 2.6, 2.6, -2, TY + 22);
  }
  // avenida de esfinges
  for (let x = 24; x < quayX - 4; x += 9) for (const s of [-1, 1]) miniSphinx(B, M, x, TY - 0.05, s * 6.2, s > 0 ? Math.PI / 2 : -Math.PI / 2);

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
  // Anúbis deitado sobre o cofre (como o do túmulo de Tutancâmon), um de cada lado do altar
  for (const z of [-4.6, 4.6]) {
    B.box(M.granite, 2.4, 0.6, 1.6, -22, TY, z); addBox(-22, z, 2.4, 1.6, -5, TY + 2.4);
    SCULPT.push({ model: 'anubis_deitado', x: -22, y: TY + 0.6, z, ry: 0, length: 2.2 });
  }
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
    base -= 0.05;
    B.geo(pyramidGeo(half, h, 18), M.pyramid, cx, base, cz, { uv: false });
    // pátio de calcário ao redor da base e o degrau de fundação
    const pw = Math.max(4, half * 0.14);
    for (const [ox, oz, w, d] of [[0, half + pw / 2, half * 2 + pw * 2, pw], [0, -half - pw / 2, half * 2 + pw * 2, pw], [half + pw / 2, 0, pw, half * 2], [-half - pw / 2, 0, pw, half * 2]]) {
      B.box(M.limestone, w, 1.2, d, cx + ox, base - 1.0, cz + oz);
      addBox(cx + ox, cz + oz, w, d, -5, base + 0.2);
    }
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
  // Grande Esfinge: corpo de leão esculpido na rocha e rosto humano (de frente para o nascer do sol)
  {
    // modelo 3D esculpido (Sketchfab, CC BY): comprimento L, largura ~0,59 L, altura ~0,53 L; olha para +x
    const SX = -166, SZ = 22, L = 32, gy = G(-158, 22) - 0.3;
    SCULPT.push({ model: 'esfinge_giza', x: SX, y: gy, z: SZ, ry: 0, length: L });
    // estela do sonho de Tutmés IV e a estátua do rei diante das patas
    const fx = SX + 0.5 * L;
    B.box(M.relief, 0.5, 3.6, 2.4, fx + 2.6, gy, SZ, { uv: { s: 3 } });
    addBox(fx + 2.6, SZ, 0.6, 2.4, -5, gy + 3.6);
    const sx = fx + 4.8;
    B.box(M.limestone, 1.1, 0.5, 1.1, sx, gy, SZ); addBox(sx, SZ, 1.1, 1.1, -5, gy + 3.4);
    out.statues.push({ x: sx, y: gy + 0.5, z: SZ, ry: Math.PI / 2, h: 2.8, painted: true });
    out.spots.sphinx = new V3(fx + 8, G(fx + 8, SZ), SZ);
    // colisão: tronco e cabeça, e as patas estendidas
    addBox(SX - 0.15 * L, SZ, 0.7 * L, 0.6 * L, -5, gy + 0.53 * L);
    addBox(SX + 0.33 * L, SZ, 0.34 * L, 0.42 * L, -5, gy + 0.1 * L);
  }
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
  // trono (modelo 3D em sculptures.js): com 1,55 m de altura o assento fica a 0,71 m do estrado; o rei senta
  // um pouco mais alto que uma cadeira comum e apoia os pés num escabelo, como nas pinturas
  SCULPT.push({ model: 'trono', x: -9.25, y: PY + 0.5, z: -132.5, ry: 0, length: 1.55 });
  B.box(M.wood, 0.42, 0.26, 0.7, -8.62, PY + 0.5, -132.5);
  B.box(M.gold, 0.44, 0.04, 0.72, -8.62, PY + 0.76, -132.5);
  addBox(-9.3, -132.5, 1.6, 1.6, -5, PY + 2.6);
  for (const z of [-137, -128]) { B.geo(new THREE.CylinderGeometry(0.3, 0.3, 1.8, 10), M.gold, -5.5, PY + 1.4, z); torch(-5.5, PY + 0.1, z, false); }
  torch(18, PY - 0.3, -146); torch(18, PY - 0.3, -119);
  out.lights.push({ pos: new V3(2, PY + 5, -132.5), color: 0xffb070, intensity: 150, dist: 30 });
  out.spots.throne = new V3(-6, PY + 0.5, -132.5);
  out.spots.throneSeat = new V3(-9.12, PY + 0.72, -132.5); // raiz do corpo do rei sentado: quadril sobre o assento, pés no escabelo
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

  // ======================= CASAS VISITÁVEIS ================================
  out.visitHouses = [];
  const VH = [
    { x: 12, z: 140, ry: Math.PI, name: 'Casa de Nofret', tag: 'Casa de família', mat: M.white,
      text: 'Uma casa típica de família de Mênfis. Na entrada fica o altar dos ancestrais: os egípcios guardavam bustos dos parentes falecidos e lhes ofereciam pão e cerveja. A sala principal, com uma coluna de madeira no centro, era onde se recebia visitas e se trabalhava no tear. No fundo, o quarto e a cozinha a céu aberto, com o forno de pão e o moinho de pedra. Pela escada se chega ao terraço, onde a família secava grãos e dormia nas noites quentes.' },
    { x: 40, z: -21, ry: 0, name: 'Casa do escriba', tag: 'Casa de um escriba', mat: M.white,
      text: 'Escribas viviam bem: casa caiada, banco de adobe forrado de almofadas, cadeiras de madeira e um baú para os rolos de papiro. No quarto, a cama com pés de leão e o apoio de cabeça. Muitas casas de escribas tinham uma pequena biblioteca de textos antigos, copiados para estudo.' },
    { x: 24, z: 62, ry: Math.PI / 2, name: 'Casa da padeira', tag: 'Casa e padaria', mat: M.mud,
      text: 'Nesta casa se faz o pão vendido no mercado. Na cozinha a céu aberto, os grãos de emmer e cevada eram moídos de joelhos, esfregando uma pedra sobre outra — trabalho pesado, quase sempre feito por mulheres. A massa assava no forno de barro em forma de cone. Os jarros guardam grãos, água e cerveja.' },
    { x: -62, z: -104, ry: 0, name: 'Casa do artesão', tag: 'Casa de um artesão', mat: M.clay,
      text: 'Casa de um escultor do templo de Ptah, o deus padroeiro dos artesãos. Casas assim, parecidas com as da vila de Deir el-Medina, tinham poucos cômodos em fila, paredes de adobe rebocadas e pinturas simples. Na sala, ferramentas de cobre, pigmentos e uma estatueta em preparação.' },
    { x: -58, z: 92, ry: Math.PI, name: 'Casa do oleiro', tag: 'Casa de um oleiro', mat: M.mud,
      text: 'Família de oleiros: os potes de barro do Nilo eram moldados à mão ou no torno lento e queimados em fornos. Toda casa egípcia estava cheia de jarros — para água, grãos, óleo, cerveja e vinho. Repare no apanhador de vento e no terraço, por onde entra a brisa do norte.' },
  ];
  for (const h of VH) {
    const y = G(h.x, h.z);
    visitHouse(B, M, h.x, y, h.z, h.ry, h.mat, out, h);
    out.exclusions.push([h.x - 8, h.x + 8, h.z - 8, h.z + 8]);
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
// Casa visitável (planta típica do Novo Império): entrada com altar dos ancestrais,
// sala com coluna, quarto e cozinha a céu aberto com escada para o terraço.
// Coordenadas locais: frente (porta) em +z, largura em x.
// ---------------------------------------------------------------------------
function visitHouse(B, M, x, y, z, ry, mat, out, info) {
  const W = 11, D = 9, H = 3.2, t = 0.45;
  const F = mat4(x, y, z, 0, ry, 0);
  const c = Math.cos(ry), s = Math.sin(ry);
  const toW = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const box = (m, w, h, d, lx, ly, lz, o = {}) => B.box(m, w, h, d, lx, ly, lz, { ...o, frame: F });
  const geo = (g, m, lx, ly, lz, o = {}) => B.geo(g, m, lx, ly, lz, { ...o, frame: F });
  const col = (lx, lz, w, d, b, tp) => { const [wx, wz] = toW(lx, lz); const sw = Math.abs(c) > 0.5; addBox(wx, wz, sw ? w : d, sw ? d : w, y + b, y + tp); };
  const solid = (m, w, h, d, lx, ly, lz, o) => { box(m, w, h, d, lx, ly, lz, o); col(lx, lz, w, d, ly - 0.01, ly + h); };
  const ljar = (lx, lz, sc = 1) => { const [wx, wz] = toW(lx, lz); jar(B, M, wx, y + 0.08, wz, sc); col(lx, lz, 0.5 * sc, 0.5 * sc, -1, 0.8 * sc); };
  const wallX = (lz, x0, x1, gaps = []) => {
    let cur = x0;
    for (const [g0, g1] of [...gaps, [x1, x1]]) {
      if (g0 > cur) solid(mat, g0 - cur, H, t, (cur + g0) / 2, 0, lz);
      if (g1 > g0) { box(mat, g1 - g0, H - 2.15, t, (g0 + g1) / 2, 2.15, lz); col((g0 + g1) / 2, lz, g1 - g0, t, 2.15, H); box(M.wood, g1 - g0 + 0.2, 0.14, t + 0.06, (g0 + g1) / 2, 2.05, lz); }
      cur = Math.max(cur, g1);
    }
  };
  const wallZ = (lx, z0, z1, gaps = []) => {
    let cur = z0;
    for (const [g0, g1] of [...gaps, [z1, z1]]) {
      if (g0 > cur) solid(mat, t, H, g0 - cur, lx, 0, (cur + g0) / 2);
      if (g1 > g0) { box(mat, t, H - 2.15, g1 - g0, lx, 2.15, (g0 + g1) / 2); col(lx, (g0 + g1) / 2, t, g1 - g0, 2.15, H); }
      cur = Math.max(cur, g1);
    }
  };
  // piso de barro batido
  box(M.clay, W, 0.1, D, 0, -0.02, 0); col(0, 0, W - 0.1, D - 0.1, -1, 0.08);
  // paredes externas e internas
  wallX(D / 2 - t / 2, -W / 2, W / 2, [[-0.6, 0.6]]);
  wallX(-D / 2 + t / 2, -W / 2, W / 2);
  wallZ(-W / 2 + t / 2, -D / 2 + t, D / 2 - t);
  wallZ(W / 2 - t / 2, -D / 2 + t, D / 2 - t);
  wallX(1.8, -W / 2 + t, W / 2 - t, [[-0.55, 0.55]]);
  wallX(-1.6, -W / 2 + t, W / 2 - t, [[-3.6, -2.6], [2.4, 3.4]]);
  wallZ(0, -D / 2 + t, -1.6 - t / 2);
  // friso pintado na sala principal
  for (const sx of [-1, 1]) box(M.palaceWall, 0.02, H - 0.1, 2.9, sx * (W / 2 - t - 0.012), 0.05, 0.1, { uv: { s: 6, sv: H, y0: y } });
  // telhado (sala da frente, sala principal e quarto) — a cozinha fica a céu aberto
  const rf = (w, d, lx, lz) => { box(M.reed, w, 0.08, d, lx, H - 0.08, lz); box(mat, w, 0.25, d, lx, H, lz); col(lx, lz, w, d, H, H + 0.25); };
  rf(W, D / 2 + 1.6 + t / 2, 0, (D / 2 - 1.6 - t / 2) / 2);
  rf(W / 2, D / 2 - 1.6 - t / 2, -W / 4, (-D / 2 - 1.6 - t / 2) / 2);
  for (const [w, d, lx, lz] of [[W, 0.25, 0, D / 2 - 0.125], [0.25, 6.3, -W / 2 + 0.125, 1.34], [0.25, 6.3, W / 2 - 0.125, 1.34]]) solid(mat, w, 0.55, d, lx, H + 0.25, lz);
  // vigas aparentes
  for (let i = -2; i <= 2; i++) box(M.wood, 0.14, 0.14, D / 2 + 1.4, i * 2, H - 0.22, 1.4);

  // ---- entrada: altar dos ancestrais e banco
  solid(M.white, 1.1, 1.0, 0.5, -4.3, 0, 2.35);
  box(M.relief, 0.9, 1.5, 0.06, -4.3, 1.0, 2.07, { uv: { s: 3 } }); // estela de "porta falsa"
  geo(new THREE.CylinderGeometry(0.1, 0.13, 0.22, 10), M.limestone, -4.3, 1.11, 2.4);
  geo(new THREE.SphereGeometry(0.12, 12, 10), M.limestone, -4.3, 1.33, 2.4, { sy: 1.15 }); // busto do ancestral
  geo(new THREE.CylinderGeometry(0.16, 0.1, 0.06, 12), M.terracotta, -3.95, 1.03, 2.45);
  for (let i = 0; i < 3; i++) geo(new THREE.SphereGeometry(0.06, 8, 6), M.bread, -3.95 + (i - 1) * 0.07, 1.08, 2.45, { sy: 0.6 });
  solid(mat, 0.55, 0.45, 2.2, 4.85, 0, 3.15);
  ljar(-0.9, 4.0, 1.2); ljar(0.9, 3.95, 1.0);

  // ---- sala principal
  box(M.reed, 4.2, 0.02, 2.4, 0.3, 0.08, 0.1); // esteira de junco
  geo(new THREE.CylinderGeometry(0.17, 0.2, H, 12), M.red, 0, H / 2, 0.1); col(0, 0.1, 0.4, 0.4, -1, H);
  geo(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12), M.sandstone, 0, 0.06, 0.1);
  solid(M.white, 1.2, 0.42, 3.0, -4.6, 0, 0.1); // divã de adobe
  for (const lz of [-0.6, 0.3, 1.1]) box(M.awnings[1], 0.9, 0.16, 0.6, -4.6, 0.42, lz, { uv: false });
  const stool = (lx, lz) => { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(M.wood, 0.05, 0.42, 0.05, lx + a * 0.17, 0, lz + b * 0.17); box(M.wood, 0.42, 0.06, 0.42, lx, 0.42, lz); col(lx, lz, 0.45, 0.45, -1, 0.48); };
  stool(1.6, -0.6); stool(2.6, 0.9);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(M.wood, 0.05, 0.55, 0.05, 2.2 + a * 0.35, 0, 0.1 + b * 0.25);
  box(M.wood, 0.8, 0.05, 0.6, 2.2, 0.55, 0.1); col(2.2, 0.1, 0.8, 0.6, -1, 0.6);
  geo(new THREE.SphereGeometry(0.1, 10, 8), M.bread, 2.05, 0.66, 0.05, { sy: 0.6 });
  geo(new THREE.CylinderGeometry(0.12, 0.08, 0.1, 12), M.terracotta, 2.4, 0.65, 0.2);
  for (const [lx, lz] of [[-3.3, 1.3], [3.9, -1.0]]) { // lamparinas
    box(M.wood, 0.06, 1.1, 0.06, lx, 0, lz);
    geo(new THREE.CylinderGeometry(0.12, 0.06, 0.08, 10), M.terracotta, lx, 1.14, lz);
    const [wx, wz] = toW(lx, lz); out.torches.push(new V3(wx, y + 1.2, wz));
  }
  // tear vertical (tecelagem de linho)
  for (const lx of [3.5, 4.8]) box(M.wood, 0.08, 2.2, 0.08, lx, 0, 1.2);
  box(M.wood, 1.5, 0.08, 0.08, 4.15, 2.1, 1.2); box(M.wood, 1.5, 0.08, 0.08, 4.15, 0.35, 1.2);
  box(M.linen, 1.2, 1.2, 0.02, 4.15, 0.8, 1.2, { uv: false });
  col(4.15, 1.2, 1.6, 0.3, -1, 2.3);

  // ---- quarto
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(M.wood, 0.07, 0.42, 0.07, -3.4 + a * 0.45, 0, -3.1 + b * 0.9);
  box(M.wood, 1.0, 0.08, 2.0, -3.4, 0.42, -3.1); box(M.linen, 0.9, 0.06, 1.85, -3.4, 0.5, -3.1);
  col(-3.4, -3.1, 1.0, 2.0, -1, 0.56);
  geo(new THREE.TorusGeometry(0.11, 0.03, 6, 12, Math.PI), M.wood, -3.4, 0.72, -3.95, { rz: Math.PI });
  box(M.wood, 0.05, 0.14, 0.05, -3.4, 0.56, -3.95);
  solid(M.wood, 0.8, 0.55, 0.5, -1.0, 0, -3.95);
  box(M.blue, 0.82, 0.06, 0.52, -1.0, 0.55, -3.95, { uv: false });

  // ---- cozinha a céu aberto
  geo(new THREE.CylinderGeometry(0.45, 0.6, 1.1, 14), M.mud, 1.2, 0.55, -3.7); col(1.2, -3.7, 1.2, 1.2, -1, 1.1);
  box(M.dark, 0.35, 0.35, 0.05, 1.2, 0.25, -3.1, { uv: false }); // boca do forno
  box(M.granite, 0.55, 0.22, 0.85, 2.5, 0, -3.9, { rx: 0.18 }); geo(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), M.granite, 2.5, 0.3, -3.8, { rz: Math.PI / 2 }); // moinho
  col(2.5, -3.9, 0.6, 0.9, -1, 0.35);
  for (let i = 0; i < 4; i++) geo(new THREE.DodecahedronGeometry(0.1, 0), M.stoneGrey, 1.3 + Math.cos(i * 1.6) * 0.3, 0.06, -2.4 + Math.sin(i * 1.6) * 0.3);
  box(M.dark, 0.5, 0.02, 0.5, 1.3, 0.02, -2.4, { uv: false }); // cinzas do fogo
  ljar(3.6, -4.0, 1.3); ljar(3.0, -2.2, 1.1); ljar(1.9, -2.0, 0.8);
  geo(new THREE.CylinderGeometry(0.3, 0.24, 0.35, 12), M.reed, 2.3, 0.18, -2.5); // cesto de grãos
  // escada para o terraço (sobe em direção à sala principal)
  for (let i = 0; i < 10; i++) {
    const top = ((i + 1) / 10) * (H + 0.25);
    solid(mat, 0.9, top, 0.24, 4.85, 0, -4.15 + i * 0.235);
  }

  const [dx, dz] = toW(0, D / 2 + 0.8);
  const hw = Math.abs(c) > 0.5 ? [W, D] : [D, W];
  out.visitHouses.push({ ...info, rect: [x - hw[0] / 2, x + hw[0] / 2, z - hw[1] / 2, z + hw[1] / 2], door: new V3(dx, y, dz) });
  torchAt(out, B, M, toW(1.0, D / 2 + 0.5), y);
}
function torchAt(out, B, M, [x, z], y) {
  B.box(M.wood, 0.14, 1.7, 0.14, x, y, z);
  B.geo(new THREE.CylinderGeometry(0.28, 0.14, 0.26, 8), M.terracotta, x, y + 1.82, z);
  addCircle(x, z, 0.22, y - 1, y + 2);
  out.torches.push(new V3(x, y + 2.0, z));
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

let SCULPT = [];
function miniSphinx(B, M, x, y, z, ry) {
  const F = mat4(x, y, z, 0, ry, 0);
  B.box(M.sandstone, 3, 1, 1.4, 0, 0, 0, { frame: F });
  B.box(M.blue, 3.04, 0.12, 1.44, 0, 0.88, 0, { frame: F, uv: false });
  const p = new V3(0, 0, 0).applyMatrix4(F);
  SCULPT.push({ model: 'esfinge_avenida', x: p.x, y: y + 1.0, z: p.z, ry, length: 2.9 }); // escultura (modelo 3D) sobre o pedestal
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
