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
import { rippleNormals } from '../comum/aguaparada.js';
import { fbm, mulberry32 } from '../comum/util.js';
import { terrainHeight, forestAt, fujiH, polyDist, STREAM, STREAM_HW, streamLevel, inTameike, TEMPLE, BAMBOO, BAMBOO_PATH, meadowAt, FALLS, fallEdge } from './terrain.js';

const rnd = mulberry32(1790);
const rr = (a, b) => a + rnd() * (b - a);

function leafTex(base, dots) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { const v = Math.random(); x.fillStyle = dots[v < 0.45 ? 0 : v < 0.8 ? 1 : 2]; x.beginPath(); x.ellipse(Math.random() * S, Math.random() * S, 2 + Math.random() * 4, 1.5 + Math.random() * 3, Math.random() * 3, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(3, 3); return t;
}
// a casca do bambu: verde liso com veios finos; em cima de cada entrenó o nó (anel escuro e saliente) e logo abaixo
// a faixa clara de pó branco que o bambu tem junto do nó
function culmTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, '#46682a'); g.addColorStop(0.35, '#5f8a36'); g.addColorStop(0.55, '#79a246'); g.addColorStop(1, '#43642a'); x.fillStyle = g; x.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(${Math.random() < 0.5 ? '60,80,30' : '190,210,140'},0.18)`; x.lineWidth = 1; const px = Math.random() * 64; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (Math.random() - 0.5) * 2, 128); x.stroke(); }
  x.fillStyle = 'rgba(214,226,190,0.32)'; x.fillRect(0, 10, 64, 5); x.fillStyle = 'rgba(214,226,190,0.14)'; x.fillRect(0, 15, 64, 6); // (o pó branco abaixo do nó)
  x.fillStyle = '#4e6628'; x.fillRect(0, 4, 64, 4); x.fillStyle = 'rgba(200,215,150,0.8)'; x.fillRect(0, 3, 64, 1.5); x.fillStyle = 'rgba(40,55,20,0.6)'; x.fillRect(0, 8, 64, 2); // (o nó)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// um raminho de bambu: o galho fino saindo da esquerda (onde prende no colmo) e as folhas compridas e pontudas
// pendendo em leque, cada uma num verde
function bambooLeafTex() {
  const W = 256, H = 192, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const leaf = (lx, ly, ang, len, wid, col) => { x.save(); x.translate(lx, ly); x.rotate(ang); x.fillStyle = col; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.35, -wid, len, 0); x.quadraticCurveTo(len * 0.35, wid, 0, 0); x.fill();
    x.strokeStyle = 'rgba(30,50,15,0.35)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(1, 0); x.lineTo(len * 0.95, 0); x.stroke(); x.restore(); };
  const cols = ['#4a7428', '#5a8430', '#6a9238', '#3e6624', '#76a044', '#55802e'];
  // galho principal e dois secundários
  const twig = (x0, y0, x1, y1) => { x.strokeStyle = '#7a8a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2, y0 - 6, x1, y1); x.stroke(); };
  twig(0, 70, 230, 92); twig(80, 74, 170, 40); twig(120, 80, 210, 140);
  const along = [[30, 72], [60, 74], [95, 78], [125, 82], [150, 84], [180, 88], [205, 90], [228, 92], [110, 62], [140, 52], [165, 42], [150, 100], [180, 118], [205, 136]];
  for (const [lx, ly] of along) for (let k = 0; k < 3; k++) leaf(lx, ly, 0.35 + Math.random() * 1.6 - (k === 0 ? 1.2 : 0), 42 + Math.random() * 30, 5 + Math.random() * 3, cols[(Math.random() * cols.length) | 0]);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
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

export function buildNature(scene, tex, quality = 'leve', avoid = () => false, extraTrees = {}) {
  const dens = quality === 'alto' ? 0.62 : quality === 'minimo' ? 0.26 : 0.42; // (bem menos árvores que antes: a floresta fica em manchas)
  const farR = quality === 'alto' ? 820 : quality === 'minimo' ? 380 : 560; // além disto, os pedaços de floresta não são desenhados (a cor escura do chão faz a mata ao longe)
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
    if (polyDist(STREAM, x, z).d < STREAM_HW + 2.8) continue; const h = terrainHeight(x, z); if (avoid(x, z, 1.5) || blocked(x, z, h, 0.3, 3)) continue; kinds.bamboo.push([x, h, z, rr(0.8, 1.15), rnd() * 6]); } };
  for (const [k, list] of Object.entries(extraTrees)) for (const p of list) kinds[k].push(p); // (a cerejeira do cume e outras plantadas à mão)
  // o bambuzal grande: um mar de colmos verdes, com o caminho estreito por dentro (a luz passando entre as folhas)
  { const n = Math.round(4200 * dens); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * BAMBOO.r, x = BAMBOO.x + Math.cos(a) * d, z = BAMBOO.z + Math.sin(a) * d;
    if (polyDist(BAMBOO_PATH, x, z).d < 2.2 || avoid(x, z, 0.5)) continue; const h = terrainHeight(x, z); kinds.bamboo.push([x, h, z, rr(0.95, 1.3), rnd() * 6]); } }
  grove(240, -30, 34, Math.round(700 * dens)); grove(180, -210, 26, Math.round(420 * dens)); grove(TEMPLE.x - 20, TEMPLE.z + 70, 30, Math.round(500 * dens));

  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.95 });
  const barkRed = new THREE.MeshStandardMaterial({ color: 0x7a4a36, roughness: 0.9 });
  const sugiM = new THREE.MeshStandardMaterial({ color: 0x4f6a3e, map: leafTex('#4c6038', ['rgba(20,36,18,0.6)', 'rgba(90,120,60,0.5)', 'rgba(140,165,90,0.4)']), roughness: 0.95, vertexColors: true, side: THREE.DoubleSide });
  const firM = new THREE.MeshStandardMaterial({ color: 0x3f5a40, map: leafTex('#3c5236', ['rgba(16,30,20,0.6)', 'rgba(70,100,60,0.5)', 'rgba(120,150,90,0.4)']), roughness: 0.95, vertexColors: true, side: THREE.DoubleSide });
  const pineM = new THREE.MeshStandardMaterial({ color: 0x6a8a52, map: leafTex('#5e7a48', ['rgba(30,50,24,0.55)', 'rgba(120,150,80,0.5)', 'rgba(180,200,130,0.45)']), roughness: 0.92, vertexColors: true });
  const broadM = new THREE.MeshStandardMaterial({ color: 0x7aa05a, map: leafTex('#6e9450', ['rgba(36,60,26,0.55)', 'rgba(130,170,80,0.5)', 'rgba(190,215,130,0.45)']), roughness: 0.9, vertexColors: true });
  const bambooM = new THREE.MeshStandardMaterial({ map: culmTex(), roughness: 0.45 }); // (a casca lisa e brilhante, com os nós)
  const bambooLeaf = new THREE.MeshStandardMaterial({ map: bambooLeafTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  const mapleM = new THREE.MeshStandardMaterial({ color: 0x7aa05a, map: broadM.map, roughness: 0.9, vertexColors: true });
  const sakuraM = new THREE.MeshStandardMaterial({ color: 0xf2c4d4, map: leafTex('#e8b4c4', ['rgba(200,120,150,0.5)', 'rgba(255,230,238,0.6)', 'rgba(255,250,252,0.55)']), roughness: 0.85, vertexColors: true });
  const sakuraBark = new THREE.MeshStandardMaterial({ color: 0x4a3a36, roughness: 0.8 });
  const M = { bark, barkRed, sugiM, firM, pineM, broadM, mapleM, sakuraM, sakuraBark, bambooM, bambooLeaf };

  // as árvores vão em pedaços de 120 m (a câmera e a sombra descartam os pedaços fora de vista)
  const chunks = [];
  const inst = (geo, mat, list, f, shadow = true, far = 0, tint = null) => {
    const made = [];
    const cells = new Map();
    for (const p of list) { const k = Math.floor(p[0] / 120) + ',' + Math.floor(p[2] / 120); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(p); }
    const d = new THREE.Object3D();
    for (const L of cells.values()) {
      const im = new THREE.InstancedMesh(geo, mat, L.length);
      L.forEach((p, i) => { f(d, p); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (tint) im.setColorAt(i, tint(p)); (p.refs || (p.refs = [])).push([im, i]); }); /* (refs: onde cada planta está nas malhas — o corte da katana esconde o colmo) */
      im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere(); if (far) im.userData.far = far; scene.add(im); made.push(im); chunks.push(im);
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
  // bambu: o colmo alto, liso e levemente curvado, com os nós (anéis) a cada palmo e meio; as folhas finas saem em
  // raminhos da metade de cima para fora e pendem, em leque — não uma bola verde no alto
  const bend = (y) => (y / 11) ** 2 * 0.7;
  const culm = new THREE.CylinderGeometry(0.045, 0.062, 11, 6, 8); { const p = culm.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 5.5; p.setX(i, p.getX(i) + bend(y)); p.setY(i, y); } culm.computeVertexNormals(); }
  culm.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = v * 26; }); // (26 entrenós ao longo do colmo)
  const bTop = (() => { const parts = [];
    // cada raminho: um cartão de folhas preso ao colmo, saindo para um lado e caindo um pouco
    const spray = (y, ang, w, h, droop) => { const g = new THREE.PlaneGeometry(w, h); g.translate(w / 2, -h * 0.2, 0); g.rotateZ(-droop); g.rotateY(ang); g.translate(bend(y), y, 0); parts.push(g); };
    const S = [[5.6, 0.3, 1.5, 1.1, 0.55], [6.5, 2.4, 1.7, 1.2, 0.5], [7.3, 4.4, 1.8, 1.3, 0.45], [8.0, 1.2, 1.9, 1.3, 0.4], [8.7, 3.3, 1.9, 1.4, 0.38], [9.3, 5.4, 1.8, 1.3, 0.35], [9.9, 0.2, 1.6, 1.2, 0.3], [10.4, 2.6, 1.5, 1.2, 0.2], [10.8, 4.6, 1.3, 1.1, 0.1]];
    for (const [y, a, w, h, dr] of S) spray(y, a, w, h, dr);
    { const g = new THREE.PlaneGeometry(1.4, 1.6), g2 = g.clone(); g.translate(bend(11), 11.2, 0); g2.rotateY(Math.PI / 2); g2.translate(bend(11), 11.2, 0); parts.push(g, g2); } // (a ponta)
    return mergeGeometries(parts); })();
  const bTint = (p) => { const k = Math.abs(Math.sin(p[0] * 12.9898 + p[2] * 78.233)) % 1; return new THREE.Color().setRGB(0.85 + k * 0.25, 0.92 + k * 0.12, 0.8 + (1 - k) * 0.15); }; // (colmos novos mais verdes, velhos mais amarelados)
  const bFar = quality === 'alto' ? 420 : quality === 'minimo' ? 170 : 240; // (o bambu é miúdo e denso: some antes das árvores; de longe a cor do chão faz o bambuzal)
  inst(culm, bambooM, kinds.bamboo, place, false, bFar, bTint); inst(bTop, bambooLeaf, kinds.bamboo, place, true, bFar, bTint);

  // o capim susuki das clareiras: touceiras altas com os penachos (prateados no verão, dourados no outono)
  const susukiM = new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const bx = 8 + rnd() * 48; x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(32, 128); x.quadraticCurveTo(bx, 70, bx + (rnd() - 0.5) * 30, 10 + rnd() * 30); x.stroke(); }
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,250,240,0.9)'; x.beginPath(); x.ellipse(16 + rnd() * 32, 14 + rnd() * 20, 3, 10, rnd() - 0.5, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), color: 0x9ab070, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
  const tuftG = (() => { const a = new THREE.PlaneGeometry(1.4, 1.6), b = a.clone(); a.translate(0, 0.8, 0); b.translate(0, 0.8, 0); b.rotateY(Math.PI / 2); return mergeGeometries([a, b]); })();
  kinds.susuki = [];
  for (let i = 0; i < Math.round(9000 * dens); i++) { const x = rr(-650, 650), z = rr(-700, 420); if (!meadowAt(x, z) || avoid(x, z, 2) || polyDist(STREAM, x, z).d < 6) continue; const h = terrainHeight(x, z); if (blocked(x, z, h, 0.5, 2)) continue; kinds.susuki.push([x, h, z, rr(0.7, 1.2), rnd() * 6]); }
  inst(tuftG, susukiM, kinds.susuki, (d, [x, y, z, sc, ry]) => { d.position.set(x, y - 0.05, z); d.rotation.set(0, ry, 0); d.scale.set(sc, sc * rr(0.8, 1.2), sc); }, false, quality === 'alto' ? 360 : quality === 'minimo' ? 140 : 200); // (capim: some de longe)
  M.susukiM = susukiM;
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
  // o ponto da queda: onde o riacho cruza a borda do paredão (o lábio fica em cima, o poço embaixo)
  const F = (() => { let best = null; for (let i = 0; i < STREAM.length - 1; i++) { const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < L; s += 0.25) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L, e = z - fallEdge(x); if (Math.abs(x - FALLS.x) < 40 && (!best || Math.abs(e) < Math.abs(best.e))) best = { x, z, e, dx: (bx - ax) / L, dz: (bz - az) / L }; } }
    const lipX = best.x - best.dx * 5, lipZ = best.z - best.dz * 5, potX = best.x + best.dx * 6, potZ = best.z + best.dz * 6;
    return { x: best.x, z: best.z, dx: best.dx, dz: best.dz, top: terrainHeight(lipX, lipZ) + 0.55, bot: terrainHeight(potX, potZ) + 0.5 }; })(), fx = F.x, top = F.top, bot = F.bot;
  water.userData.fall = { ...water.userData.fall, ...F };
  void fx;
  const fallMat = new THREE.MeshStandardMaterial({ map: fallTex, roughness: 0.3, transparent: true, opacity: 0.86, depthWrite: false, side: THREE.DoubleSide });
  const fallTex2 = fallTex.clone(); fallTex2.repeat.set(3, 1); fallTex2.needsUpdate = true;
  const fallMat2 = new THREE.MeshStandardMaterial({ map: fallTex2, color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const H = top - bot, sx = -F.dz, sz = F.dx, lx = F.x - F.dx * 4.2, lz = F.z - F.dz * 4.2; // (a borda de cima: o lábio da queda)
  const curtain = (w0, w1, out, push, mat, rep) => { const R = 18, C = 10, pos = [], uv = [], idx = [];
    for (let i = 0; i <= R; i++) { const t = i / R, w = w0 + (w1 - w0) * t, o = out * Math.sqrt(t) + push, y = top + 0.12 - (H + 0.25) * t;
      for (let j = 0; j <= C; j++) { const u = j / C - 0.5, s = u * w, bow = Math.cos(u * Math.PI) * 0.45 * (0.4 + t); // (no meio a água é mais grossa e sai mais para fora)
        pos.push(lx + F.dx * (o + bow) + sx * s, y, lz + F.dz * (o + bow) + sz * s); uv.push((j / C) * rep, 1 - t * 1.4); } }
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const a = i * (C + 1) + j, b = a + C + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.renderOrder = 3; scene.add(m); return m; };
  curtain(3.6, 5.4, 7.6, 0, fallMat, 1); curtain(3.0, 6.0, 8.0, 0.25, fallMat2, 1); // duas camadas: a de trás mais cheia, a da frente rala e mais rápida
  const base = new THREE.Vector3(lx + F.dx * 8, bot, lz + F.dz * 8);
  // o poço: espuma que gira devagar e a névoa que sobe da queda
  const foamTex = fallTex.clone(); foamTex.needsUpdate = true; foamTex.repeat.set(3, 3);
  const foam = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshStandardMaterial({ map: foamTex, color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(base.x, bot + 0.06, base.z); foam.renderOrder = 3; scene.add(foam);
  const mistTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const mist = []; for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5 })); s.userData.ph = i / 10; scene.add(s); mist.push(s); }
  const mistUp = (dt, t) => { foam.rotation.z += dt * 0.15; for (const s of mist) { const k = (t * 0.25 + s.userData.ph) % 1, a = s.userData.ph * 6.28; s.position.set(base.x + Math.sin(a) * (1 + k * 2.5), bot + 0.4 + k * 5, base.z + Math.cos(a) * (1 + k * 2.5)); s.scale.setScalar(2.5 + k * 5); s.material.opacity = 0.45 * (1 - k); } };
  let tFall = 0;
  const counts = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.length]));
  // as estações: a cor das copas (e as folhosas sem folhas no inverno)
  const SEASON = {
    primavera: { broad: 0x8ab85a, maple: 0x9ac060, sakura: 0xf6c8d8, show: true },
    verao: { broad: 0x6a9a4a, maple: 0x6a9a48, sakura: 0x6a9a4a, show: true },
    outono: { broad: 0xd8a040, maple: 0xd84a2a, sakura: 0xc86a3a, show: true },
    inverno: { broad: 0x6a5a48, maple: 0x6a5048, sakura: 0x5a4a44, show: false },
  };
  const setSeason = (sn) => { const S = SEASON[sn]; M.susukiM.color.setHex({ primavera: 0x9ab070, verao: 0x7a9a50, outono: 0xd8b878, inverno: 0xa89a7a }[sn]); broadM.color.setHex(S.broad); mapleM.color.setHex(S.maple); sakuraM.color.setHex(S.sakura); sakuraM.map = sn === 'primavera' ? sakuraLeaf : broadM.map; sakuraM.needsUpdate = true;
    for (const k of ['broad', 'maple', 'sakura']) for (const im of crowns[k]) { im.visible = S.show; im.userData.season = S.show; }
    firM.color.setHex(sn === 'inverno' ? 0x6a7a6a : 0x3f5a40); sugiM.color.setHex(sn === 'inverno' ? 0x6a7060 : sn === 'outono' ? 0x5a6a3e : 0x4f6a3e); }; // (no inverno os pinheiros e cedros ficam mais cinzentos, com geada)
  const sakuraLeaf = sakuraM.map;
  let cullT = 0; const cc = chunks.map((im) => im.boundingSphere ? im.boundingSphere.center.clone() : new THREE.Vector3());
  return { M, water, counts, setSeason, kinds, chunks, bamboo: { list: kinds.bamboo, culm, bTop, bend, M: { culm: bambooM, leaf: bambooLeaf } }, cull(cam, dt) { if ((cullT -= dt) > 0) return; cullT = 0.4; const p = cam.position; for (let i = 0; i < chunks.length; i++) { const c = cc[i], dx = c.x - p.x, dz = c.z - p.z; const R = (chunks[i].userData.far || farR) + 70; chunks[i].visible = dx * dx + dz * dz < R * R && chunks[i].userData.season !== false; } },
    update(dt) { tFall += dt; mistUp(dt, tFall); fallTex2.offset.y += dt * 2.6; fallTex.offset.y += dt * 1.6; water.userData.tick(dt); } };
}

function streamMesh(tex) {
  // a água do riacho: uma faixa larga (passa da beira do leito e entra no barranco — a borda nunca fica no ar) que
  // reflete o céu, com duas camadas de ondinhas descendo a correnteza, a beira rasa e clara sumindo na margem, e
  // espuma onde a água despenca
  const pts = []; // amostra o leito a cada 2,5 m
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 2.5);
    for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
  }
  pts.push(STREAM[STREAM.length - 1]);
  while (pts.length > 3 && inTameike(...pts[pts.length - 2]) < 0.85) pts.pop(); // (acaba logo depois de entrar no tameike)
  const lvl = pts.map(([x, z]) => streamLevel(polyDist(STREAM, x, z)));
  for (let i = 1; i < lvl.length; i++) lvl[i] = Math.min(lvl[i], lvl[i - 1]); // a água só desce
  const XS = [-1, -0.7, -0.4, 0, 0.4, 0.7, 1], C = XS.length, HW = 5.6;
  const pos = [], uv = [], across = [], foamA = [], idx = []; let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)], [px, pz] = pts[Math.max(0, i - 1)];
    let dx = nx - px, dz = nz - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const y = lvl[i], drop = Math.max(i > 0 ? lvl[i - 1] - y : 0, i < pts.length - 1 ? y - lvl[i + 1] : 0) / 2.5, foam = Math.min(1, drop * 2.2);
    const endFade = i === pts.length - 1 ? 0 : 1;
    for (const xs of XS) { pos.push(x - dz * HW * xs, y, z + dx * HW * xs); uv.push((xs * HW) / 8, s / 8); across.push((xs + 1) / 2, endFade); foamA.push(foam); }
    if (i > 0) for (let j = 0; j < C - 1; j++) { const a0 = (i - 1) * C + j, b0 = a0 + C; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
    if (i < pts.length - 1) s += Math.hypot(nx - x, nz - z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('across', new THREE.Float32BufferAttribute(across, 2)); g.setAttribute('foam', new THREE.Float32BufferAttribute(foamA, 1));
  g.setIndex(idx); g.computeVertexNormals();
  const nm = rippleNormals(); nm.repeat.set(1.3, 1.3);
  const mat = new THREE.MeshStandardMaterial({ color: 0x24504c, normalMap: nm, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.1, metalness: 0.18, envMapIntensity: 0.9, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  const U = { uT: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 across; attribute float foam; varying vec2 vAcross; varying float vFoam; varying vec2 vFlow;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAcross = across; vFoam = foam; vFlow = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; varying vec2 vAcross; varying float vFoam; varying vec2 vFlow;')
      // a beira rasa: mais clara (vê-se o fundo de seixos) e cada vez mais transparente até sumir na margem
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ex = vAcross.x, mid = smoothstep(0.0, 0.32, ex) * smoothstep(1.0, 0.68, ex);
        diffuseColor.rgb = mix(vec3(0.27, 0.32, 0.25), diffuseColor.rgb, mid);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.94, 0.95), vFoam * (0.55 + 0.45 * sin(vFlow.y * 9.0 + uT * 6.0 + vFlow.x * 4.0)));
        diffuseColor.a *= smoothstep(0.0, 0.14, ex) * smoothstep(1.0, 0.86, ex) * (0.55 + 0.45 * mid) * vAcross.y;`)
      // duas camadas de ondinhas, em velocidades diferentes, descendo a correnteza
      .replace('#include <normal_fragment_maps>', `vec3 mapN = (texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0) + (texture2D(normalMap, vFlow * vec2(1.3, 0.9) + vec2(0.31, -uT * 0.55)).xyz * 2.0 - 1.0);
        mapN.xy *= normalScale * (1.0 + vFoam); normal = normalize(tbn * mapN);`);
  };
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.receiveShadow = true;
  m.userData.tick = (dt) => { U.uT.value += dt; nm.offset.y -= dt * 0.12; };
  m.userData.fall = {};
  return m;
}
