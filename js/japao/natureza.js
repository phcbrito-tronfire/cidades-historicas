// A natureza do pé do Fuji (primeira passada — a Etapa 4 refina e as estações mudam as cores):
// - cedros-japoneses (sugi): altos e estreitos, plantados em volta do santuário e espalhados na floresta baixa;
// - pinheiros-vermelhos (akamatsu): tronco avermelhado e torto, copa em tufos, perto do lago e nos morros;
// - folhosas (bordos, carvalhos, faias): copa redonda — no outono vão ficar vermelhas e douradas;
// - abetos e lariços no alto, cada vez mais baixos até a linha das árvores;
// - bambuzal só no vale úmido do riacho e na encosta do templo (não pela montanha toda).
// O riacho corre de verdade (faixa d'água que desce acompanhando o leito) e cai na cachoeira.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCircle, blocked } from '../comum/collision.js';
import { fbm, mulberry32 } from '../comum/util.js';
import { terrainHeight, forestAt, fujiH, polyDist, STREAM, STREAM_HW, TEMPLE } from './terrain.js';

const rnd = mulberry32(1790);
const rr = (a, b) => a + rnd() * (b - a);

function leafTex(base, dots) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { const v = Math.random(); x.fillStyle = dots[v < 0.45 ? 0 : v < 0.8 ? 1 : 2]; x.beginPath(); x.ellipse(Math.random() * S, Math.random() * S, 2 + Math.random() * 4, 1.5 + Math.random() * 3, Math.random() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(3, 3); return t;
}
// tufo: esfera amassada por ruído, clara em cima e escura embaixo (cor por vértice)
function tuft(rx, ry, rz, cx, cy, cz, seed, rough = 0.35, det = 1) {
  const g = new THREE.IcosahedronGeometry(1, det), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (fbm(x * 2.2 + seed, y * 2.2 + z * 1.7, 3) - 0.5) * rough * 2;
    p.setXYZ(i, cx + x * rx * k, cy + y * ry * k, cz + z * rz * k);
    const l = 0.6 + 0.45 * (y * 0.5 + 0.5); col.push(l * 0.95, l, l * 0.9);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
// copa cônica em camadas (cedro, abeto): cones achatados empilhados, com a borda franjada
function layered(h, r0, n, seed) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n, r = r0 * (1 - t * 0.85), y = h * (0.28 + t * 0.66);
    const g = new THREE.ConeGeometry(r, h * 0.24, 9, 1, true); g.translate(0, y, 0);
    const p = g.attributes.position, col = [];
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), yy = p.getY(k), e = 1 + (fbm(x * 1.3 + seed + i, z * 1.3, 2) - 0.5) * 0.5; p.setX(k, x * e); p.setZ(k, z * e); const l = 0.55 + 0.5 * ((yy - y) / (h * 0.24) + 0.5); col.push(l * 0.9, l, l * 0.92); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); parts.push(g.toNonIndexed());
  }
  const m = mergeGeometries(parts); m.computeVertexNormals(); return m;
}

export function buildNature(scene, tex, quality = 'leve', avoid = () => false) {
  const dens = quality === 'alto' ? 1 : quality === 'minimo' ? 0.4 : 0.7;
  const kinds = { sugi: [], pine: [], broad: [], maple: [], sakura: [], fir: [], bamboo: [] };
  // grade com sorteio: 1 árvore a cada ~8 m onde a floresta é cheia
  const STEP = 8.5;
  for (let gx = -715; gx < 715; gx += STEP) for (let gz = -775; gz < 1600; gz += STEP) {
    const x = gx + rr(-3.5, 3.5), z = gz + rr(-3.5, 3.5), f = forestAt(x, z);
    if (f < 0.12 || rnd() > f * dens) continue;
    const h = terrainHeight(x, z), fu = fujiH(x, z);
    if (avoid(x, z, 3) || blocked(x, z, h, 1.0, 4)) continue;
    const n = fbm(x * 0.012 + 4, z * 0.012, 2), up = fu / 330; // 0 no vale, 1 na linha das árvores
    let k;
    if (up > 0.55) k = rnd() < 0.75 ? 'fir' : 'broad';
    else if (Math.abs(x - 40) < 60 && z > 0 && z < 240) k = 'sugi'; // a alameda de cedros do santuário
    else if (z < -450 || Math.abs(x - 30) > 480) k = n > 0.55 ? 'pine' : rnd() < 0.5 ? 'broad' : 'pine';
    else k = n > 0.6 ? 'sugi' : n < 0.38 ? 'pine' : rnd() < 0.6 ? 'broad' : 'sugi';
    if (k === 'broad' && rnd() < 0.45) k = 'maple'; // bordos (momiji) misturados às faias e carvalhos
    if (z < 60 && up < 0.2 && (polyDist(STREAM, x, z).d < 30 || (k === 'broad' && rnd() < 0.18))) k = 'sakura'; // cerejeiras na beira do riacho e soltas no vale
    const s = k === 'fir' ? 1.1 - up * 0.6 : rr(0.8, 1.25);
    kinds[k].push([x, h, z, s, rnd() * 6]);
  }
  // bambuzal: nas margens do riacho perto da vila e na encosta sul do templo
  const grove = (cx, cz, R, n) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (polyDist(STREAM, x, z).d < STREAM_HW + 1.5) continue; const h = terrainHeight(x, z); if (avoid(x, z, 1.5) || blocked(x, z, h, 0.3, 3)) continue; kinds.bamboo.push([x, h, z, rr(0.8, 1.15), rnd() * 6]); } };
  grove(240, -30, 34, Math.round(700 * dens)); grove(180, -210, 26, Math.round(420 * dens)); grove(TEMPLE.x - 20, TEMPLE.z + 70, 30, Math.round(500 * dens));

  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.95 });
  const barkRed = new THREE.MeshStandardMaterial({ color: 0x7a4a36, roughness: 0.9 });
  const sugiM = new THREE.MeshStandardMaterial({ color: 0x4f6a3e, map: leafTex('#4c6038', ['rgba(20,36,18,0.6)', 'rgba(90,120,60,0.5)', 'rgba(140,165,90,0.4)']), roughness: 0.95, vertexColors: true, side: THREE.DoubleSide });
  const firM = new THREE.MeshStandardMaterial({ color: 0x3f5a40, map: leafTex('#3c5236', ['rgba(16,30,20,0.6)', 'rgba(70,100,60,0.5)', 'rgba(120,150,90,0.4)']), roughness: 0.95, vertexColors: true, side: THREE.DoubleSide });
  const pineM = new THREE.MeshStandardMaterial({ color: 0x6a8a52, map: leafTex('#5e7a48', ['rgba(30,50,24,0.55)', 'rgba(120,150,80,0.5)', 'rgba(180,200,130,0.45)']), roughness: 0.92, vertexColors: true });
  const broadM = new THREE.MeshStandardMaterial({ color: 0x7aa05a, map: leafTex('#6e9450', ['rgba(36,60,26,0.55)', 'rgba(130,170,80,0.5)', 'rgba(190,215,130,0.45)']), roughness: 0.9, vertexColors: true });
  const bambooM = new THREE.MeshStandardMaterial({ color: 0x8aa858, roughness: 0.6 });
  const bambooLeaf = new THREE.MeshStandardMaterial({ color: 0x9ab860, map: leafTex('#86a454', ['rgba(50,80,30,0.5)', 'rgba(150,190,90,0.5)', 'rgba(200,225,140,0.4)']), roughness: 0.85, vertexColors: true });
  const mapleM = new THREE.MeshStandardMaterial({ color: 0x7aa05a, map: broadM.map, roughness: 0.9, vertexColors: true });
  const sakuraM = new THREE.MeshStandardMaterial({ color: 0xf2c4d4, map: leafTex('#e8b4c4', ['rgba(200,120,150,0.5)', 'rgba(255,230,238,0.6)', 'rgba(255,250,252,0.55)']), roughness: 0.85, vertexColors: true });
  const sakuraBark = new THREE.MeshStandardMaterial({ color: 0x4a3a36, roughness: 0.8 });
  const M = { bark, barkRed, sugiM, firM, pineM, broadM, mapleM, sakuraM, sakuraBark, bambooM, bambooLeaf };

  // as árvores vão em pedaços de 120 m (a câmera e a sombra descartam os pedaços fora de vista)
  const inst = (geo, mat, list, f, shadow = true) => {
    const made = [];
    const cells = new Map();
    for (const p of list) { const k = Math.floor(p[0] / 120) + ',' + Math.floor(p[2] / 120); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(p); }
    const d = new THREE.Object3D();
    for (const L of cells.values()) {
      const im = new THREE.InstancedMesh(geo, mat, L.length);
      L.forEach((p, i) => { f(d, p); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); made.push(im);
    }
    return made;
  };
  const place = (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.3, z); d.rotation.set(0, r, 0); d.scale.setScalar(s); };
  // cedro: tronco reto e alto, copa estreita em camadas
  const sugiT = new THREE.CylinderGeometry(0.22, 0.42, 22, 7); sugiT.translate(0, 11, 0);
  inst(sugiT, bark, kinds.sugi, place); inst(layered(24, 3.2, 7, 3), sugiM, kinds.sugi, place);
  // abeto do alto
  const firT = new THREE.CylinderGeometry(0.15, 0.3, 12, 6); firT.translate(0, 6, 0);
  inst(firT, bark, kinds.fir, place); inst(layered(13, 2.6, 6, 8), firM, kinds.fir, place);
  // pinheiro-vermelho: tronco inclinado, copa de tufos irregulares no alto
  const pineT = new THREE.CylinderGeometry(0.18, 0.32, 12, 7); pineT.translate(0, 6, 0); pineT.rotateZ(0.1);
  const pineC = mergeGeometries([tuft(2.6, 1.0, 2.4, 0.9, 11.6, 0, 1), tuft(1.8, 0.8, 1.7, 2.6, 10.6, 1.0, 2), tuft(1.9, 0.8, 1.8, -0.8, 10.2, -1.4, 3), tuft(1.5, 0.7, 1.5, 1.6, 12.4, -1.0, 4)]);
  inst(pineT, barkRed, kinds.pine, place); inst(pineC, pineM, kinds.pine, place);
  // folhosa: copa redonda de 3 tufos
  const broadT = new THREE.CylinderGeometry(0.2, 0.34, 6, 7); broadT.translate(0, 3, 0);
  const broadC = mergeGeometries([tuft(3.4, 2.8, 3.2, 0, 8.0, 0, 6), tuft(2.4, 2.0, 2.3, 2.0, 7.0, 1.2, 7), tuft(2.3, 2.0, 2.4, -1.8, 7.4, -0.9, 8)]);
  inst(broadT, bark, kinds.broad, place); const crowns = { broad: inst(broadC, broadM, kinds.broad, place) };
  inst(broadT, bark, kinds.maple, place); crowns.maple = inst(broadC, mapleM, kinds.maple, (d, p) => { place(d, p); d.scale.multiplyScalar(0.82); });
  // cerejeira: tronco escuro e torto, copa larga e baixa em vários tufos
  const sakT = new THREE.CylinderGeometry(0.16, 0.3, 4.2, 7); sakT.translate(0, 2.1, 0); sakT.rotateZ(0.15);
  const sakC = mergeGeometries([tuft(2.8, 1.5, 2.6, 0.4, 5.0, 0, 21, 0.45), tuft(1.9, 1.2, 1.8, 2.2, 4.4, 0.9, 22, 0.45), tuft(1.8, 1.1, 1.8, -1.8, 4.6, -0.8, 23, 0.45), tuft(1.6, 1.0, 1.6, 0.6, 5.6, -1.6, 24, 0.45)]);
  inst(sakT, sakuraBark, kinds.sakura, place); crowns.sakura = inst(sakC, sakuraM, kinds.sakura, place);
  // bambu: colmo fino e alto, levemente curvado, com as folhas em cima
  const culm = new THREE.CylinderGeometry(0.05, 0.065, 11, 5, 4); { const p = culm.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 5.5; p.setX(i, p.getX(i) + (y / 11) ** 2 * 0.7); p.setY(i, y); } culm.computeVertexNormals(); }
  const bTop = mergeGeometries([tuft(1.2, 1.6, 1.1, 0.55, 9.6, 0, 11, 0.5), tuft(0.9, 1.0, 0.9, 0.7, 7.8, 0.4, 12, 0.5)]);
  inst(culm, bambooM, kinds.bamboo, place, false); inst(bTop, bambooLeaf, kinds.bamboo, place);

  for (const k of ['sugi', 'pine', 'broad', 'maple', 'sakura', 'fir']) for (const [x, y, z, s] of kinds[k]) addCircle(x, z, 0.35 * s + 0.05, y - 1, y + 6);
  for (const [x, y, z] of kinds.bamboo) addCircle(x, z, 0.09, y - 1, y + 6);

  // ---- o riacho: faixa d'água que acompanha o leito (desce a cachoeira), com espuma onde corre rápido
  const water = streamMesh(tex);
  scene.add(water);
  // a cachoeira: lâmina de água branca caindo pelo paredão (o riacho cruza o degrau perto de z = 205)
  const fallTex = (() => { const S = 128, c = document.createElement('canvas'); c.width = 64; c.height = S; const x = c.getContext('2d'); x.fillStyle = '#c8dcdc'; x.fillRect(0, 0, 64, S);
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`; x.fillRect(Math.random() * 64, Math.random() * S, 1 + Math.random() * 3, 10 + Math.random() * 30); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(70,110,110,${0.15 + Math.random() * 0.25})`; x.fillRect(Math.random() * 64, Math.random() * S, 1 + Math.random() * 2, 8 + Math.random() * 20); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(2, 1.5); return t; })();
  const F = water.userData.fall, fx = F.x, top = F.top, bot = F.bot;
  const fallMat = new THREE.MeshStandardMaterial({ map: fallTex, roughness: 0.3, transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(4.6, top - bot + 0.6), fallMat);
  sheet.position.set(fx, (top + bot) / 2 - 0.2, F.z); sheet.rotation.set(0, F.yaw, 0); sheet.renderOrder = 3; scene.add(sheet);
  const foam = new THREE.Mesh(new THREE.CircleGeometry(4.2, 20), new THREE.MeshStandardMaterial({ map: fallTex, color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(F.x - F.dx * 2.5, bot + 0.04, F.z - F.dz * 2.5); foam.renderOrder = 3; scene.add(foam);
  const counts = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.length]));
  // as estações: a cor das copas (e as folhosas sem folhas no inverno)
  const SEASON = {
    primavera: { broad: 0x8ab85a, maple: 0x9ac060, sakura: 0xf6c8d8, show: true },
    verao: { broad: 0x6a9a4a, maple: 0x6a9a48, sakura: 0x6a9a4a, show: true },
    outono: { broad: 0xd8a040, maple: 0xd84a2a, sakura: 0xc86a3a, show: true },
    inverno: { broad: 0x6a5a48, maple: 0x6a5048, sakura: 0x5a4a44, show: false },
  };
  const setSeason = (sn) => { const S = SEASON[sn]; broadM.color.setHex(S.broad); mapleM.color.setHex(S.maple); sakuraM.color.setHex(S.sakura); sakuraM.map = sn === 'primavera' ? sakuraLeaf : broadM.map; sakuraM.needsUpdate = true;
    for (const k of ['broad', 'maple', 'sakura']) for (const im of crowns[k]) im.visible = S.show;
    firM.color.setHex(sn === 'inverno' ? 0x6a7a6a : 0x3f5a40); sugiM.color.setHex(sn === 'inverno' ? 0x6a7060 : sn === 'outono' ? 0x5a6a3e : 0x4f6a3e); }; // (no inverno os pinheiros e cedros ficam mais cinzentos, com geada)
  const sakuraLeaf = sakuraM.map;
  return { M, water, counts, setSeason, kinds, update(dt) { fallTex.offset.y += dt * 1.6; water.material.map.offset.y -= dt * 0.6; if (water.material.normalMap) water.material.normalMap.offset.y -= dt * 0.35; } };
}

function streamMesh(tex) {
  const pts = []; // amostra o leito a cada 2,5 m
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 2.5);
    for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  }
  pts.push(STREAM[STREAM.length - 1]);
  const pos = [], uv = [], col = [], idx = []; let s = 0;
  const lvl = pts.map(([x, z]) => terrainHeight(x, z) + 0.55);
  for (let i = 1; i < lvl.length; i++) lvl[i] = Math.min(lvl[i], lvl[i - 1] + 0.02); // a água só desce (correnteza abaixo)
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)], [px, pz] = pts[Math.max(0, i - 1)];
    let dx = nx - px, dz = nz - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const w = STREAM_HW * 0.8, y = lvl[i], drop = i > 0 ? Math.max(0, lvl[i - 1] - y) / 2.5 : 0, foam = Math.min(1, drop * 2.2);
    for (const sd of [-1, 1]) { pos.push(x - dz * w * sd, y, z + dx * w * sd); uv.push(sd < 0 ? 0 : 1, s / 6); col.push(0.42 + foam * 0.9, 0.5 + foam * 0.8, 0.5 + foam * 0.75); }
    if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    if (i < pts.length - 1) s += Math.hypot(nx - x, nz - z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const ripple = (() => { const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.fillStyle = '#4a7a78'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(220,240,240,${0.08 + Math.random() * 0.22})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const yy = Math.random() * S, xx = Math.random() * S; x.moveTo(xx, yy); x.quadraticCurveTo(xx + 6, yy + 8, xx + rr(-6, 6), yy + 16); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const nm = tex.waterNormals ? tex.waterNormals.clone() : null; if (nm) { nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.repeat.set(1, 0.2); nm.needsUpdate = true; }
  const mat = new THREE.MeshStandardMaterial({ map: ripple, normalMap: nm, vertexColors: true, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.receiveShadow = true;
  // onde a água mais despenca (a cachoeira): posição, alturas e direção da correnteza
  let bi = 1; for (let i = 1; i < lvl.length; i++) if (lvl[i - 1] - lvl[i] > lvl[bi - 1] - lvl[bi]) bi = i;
  { let j0 = bi, j1 = bi; while (j0 > 1 && lvl[j0 - 2] - lvl[j0 - 1] > 0.6) j0--; while (j1 < lvl.length - 1 && lvl[j1] - lvl[j1 + 1] > 0.6) j1++;
    const [ax, az] = pts[j0 - 1], [bx, bz] = pts[j1], L = Math.hypot(bx - ax, bz - az) || 1;
    m.userData.fall = { x: (ax + bx) / 2, z: (az + bz) / 2, top: lvl[j0 - 1], bot: lvl[j1], dx: (bx - ax) / L, dz: (bz - az) / L, yaw: Math.atan2(bx - ax, bz - az) }; }
  return m;
}
