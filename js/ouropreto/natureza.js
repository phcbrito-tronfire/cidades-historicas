// A natureza em volta de Vila Rica em 1789 (primeira passada — a Etapa 3 põe os quintais com bananeiras e frutas):
// - os morros quase pelados: em 80 anos de mineração a mata foi derrubada para lenha, carvão, esteios das galerias e
//   para a água desmontar o morro. Ficou o campo de capim com moitas e arvoretas retorcidas (candeias);
// - capões de mata atlântica só nas grotas e nos fundos dos vales acima da vila (copas redondas, algumas árvores mais
//   altas saindo por cima);
// - macaúbas (a palmeira do cerrado mineiro, de tronco espinhoso) soltas nas encostas baixas;
// - afloramentos de quartzito (a pedra cinza das serras de Ouro Preto) no alto dos morros;
// - os córregos correndo no leito de pedra, e o ribeirão no fundo do vale.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCircle, blocked } from '../comum/collision.js';
import { rippleNormals } from '../comum/aguaparada.js';
import { fbm, mulberry32 } from '../comum/util.js';
import { terrainHeight, forestAt, meadowAt, mineAt, polyDist, pointAt, STREAMS, streamLevel, BOUNDS } from './terrain.js';

const rnd = mulberry32(1789);
const rr = (a, b) => a + rnd() * (b - a);

function leafTex(base, dots) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) { const v = rnd(); x.fillStyle = dots[v < 0.45 ? 0 : v < 0.8 ? 1 : 2]; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, 2 + rnd() * 4, 1.5 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); }
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
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g.toNonIndexed();
}
// galho: cilindro de uma ponta à outra
function limb(a, b, r0, r1) { const d = new THREE.Vector3().subVectors(b, a), L = d.length(), g = new THREE.CylinderGeometry(r1, r0, L, 6); g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g.toNonIndexed(); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// a folha da macaúba: uma fita arqueada com os folíolos (cartão com recorte)
function frondTex() {
  const W = 256, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.strokeStyle = '#6a7040'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke();
  for (let i = 4; i < W - 4; i += 5) { const l = 26 * Math.sin((i / W) * Math.PI) + 4; for (const sg of [-1, 1]) { x.strokeStyle = ['#4e6a2c', '#5e7a34', '#6e8a3e'][(i / 5) % 3 | 0]; x.lineWidth = 2.2; x.beginPath(); x.moveTo(i, H / 2); x.lineTo(i + 6, H / 2 + sg * l); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// capim: touceira em cruz, folhas finas, umas verdes e outras já secas
function grassTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 96; const x = c.getContext('2d');
  for (let i = 0; i < 34; i++) { const bx = 6 + rnd() * 52; x.strokeStyle = rnd() < 0.3 ? 'rgba(200,184,120,0.95)' : 'rgba(150,170,90,0.95)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(32 + (rnd() - 0.5) * 14, 96); x.quadraticCurveTo(bx, 50, bx + (rnd() - 0.5) * 26, 6 + rnd() * 34); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// a folha da bananeira: comprida, com a nervura no meio e as bordas rasgadas pelo vento
function bananaLeafTex() {
  const W = 64, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  for (let y = 4; y < H - 6; y += 3) { const w = Math.sin((y / H) * Math.PI) * 28 * (0.85 + rnd() * 0.15); const g = 70 + rnd() * 40; x.fillStyle = 'rgb(' + (60 + rnd() * 20) + ',' + (g + 50) + ',' + (30 + rnd() * 15) + ')'; if (rnd() < 0.12) continue; x.fillRect(32 - w, y, w * 2, 3); }
  x.fillStyle = '#c8d090'; x.fillRect(30, 0, 4, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// a couve: a roseta de folhas largas, verde-azulada
function couveTex() {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; x.fillStyle = i % 2 ? '#3e6a4a' : '#4e7a58'; x.beginPath(); x.ellipse(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14, 14, 9, a, 0, 7); x.fill(); x.strokeStyle = 'rgba(200,220,190,0.6)'; x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildNature(scene, tex, quality = 'leve', avoid = () => false, yardPlants = []) {
  const dens = quality === 'alto' ? 1 : quality === 'minimo' ? 0.45 : 0.7;
  const farR = quality === 'alto' ? 900 : quality === 'minimo' ? 420 : 620;
  const kinds = { mata: [], alta: [], candeia: [], macauba: [], rock: [], capim: [] };
  const [X0, X1, Z0, Z1] = BOUNDS;
  // mata: uma árvore a cada ~7 m onde o capão é cheio
  const STEP = 7;
  for (let gx = X0; gx < X1; gx += STEP) for (let gz = Z0; gz < Z1; gz += STEP) {
    const x = gx + rr(-3, 3), z = gz + rr(-3, 3), f = forestAt(x, z);
    if (f < 0.15 || rnd() > f * 0.85) continue;
    const h = terrainHeight(x, z); if (avoid(x, z, 3) || blocked(x, z, h, 1.0, 4)) continue;
    (rnd() < 0.12 ? kinds.alta : kinds.mata).push([x, h, z, rr(0.8, 1.2), rnd() * 6]);
  }
  // no campo: candeias soltas, moitas de macaúba nas encostas baixas, pedras no alto
  for (let i = 0; i < 5200; i++) {
    const x = rr(X0, X1), z = rr(Z0, Z1); if (!meadowAt(x, z) || avoid(x, z, 2)) continue;
    const h = terrainHeight(x, z), n = fbm(x * 0.02 + 5, z * 0.02 - 3, 2);
    if (n > 0.6 && rnd() < 0.5) kinds.candeia.push([x, h, z, rr(0.7, 1.2), rnd() * 6]);
    else if (h < 40 && n < 0.38 && rnd() < 0.18) kinds.macauba.push([x, h, z, rr(0.85, 1.15), rnd() * 6]);
    else if (h > 80 && rnd() < 0.25) kinds.rock.push([x, h, z, rr(0.6, 2.2), rnd() * 6]);
  }
  for (let i = 0; i < Math.round(16000 * dens); i++) {
    const x = rr(X0, X1), z = rr(Z0, Z1); if (!meadowAt(x, z) || mineAt(x, z) > 0.2 || avoid(x, z, 1)) continue;
    if (fbm(x * 0.03 + 9, z * 0.03, 2) < 0.42) continue; // (o capim em manchas, não um tapete)
    kinds.capim.push([x, terrainHeight(x, z), z, rr(0.6, 1.1), rnd() * 6]);
  }

  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 0.95 });
  const barkPale = new THREE.MeshStandardMaterial({ color: 0x8a7e6c, roughness: 0.95 });
  const mataM = new THREE.MeshStandardMaterial({ color: 0x6e9050, map: leafTex('#5e8044', ['rgba(30,50,22,0.55)', 'rgba(110,150,70,0.5)', 'rgba(170,200,120,0.45)']), roughness: 0.9, vertexColors: true });
  const altaM = new THREE.MeshStandardMaterial({ color: 0x7a9458, map: mataM.map, roughness: 0.9, vertexColors: true });
  const candeiaM = new THREE.MeshStandardMaterial({ color: 0x9aa078, map: leafTex('#8a9068', ['rgba(60,66,40,0.5)', 'rgba(170,176,140,0.5)', 'rgba(200,204,170,0.45)']), roughness: 0.95, vertexColors: true }); // (folha cinzenta por baixo: a candeia parece prateada de longe)
  const palmM = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
  const palmTrunk = new THREE.MeshStandardMaterial({ color: 0x5e5246, roughness: 1 });
  const rockM = new THREE.MeshStandardMaterial({ ...(tex.pbr?.rock_face_03 ? { map: tex.pbr.rock_face_03.map, normalMap: tex.pbr.rock_face_03.normalMap } : {}), color: 0xb0aaa0, roughness: 0.95 });
  const capimM = new THREE.MeshStandardMaterial({ map: grassTex(), color: 0xc8c8a0, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
  const M = { bark, mataM, altaM, candeiaM, palmM, rockM, capimM };

  // em pedaços de 120 m (a câmera e a sombra descartam o que está fora de vista)
  const chunks = [];
  const inst = (geo, mat, list, f, shadow = true, far = 0) => {
    const cells = new Map();
    for (const p of list) { const k = Math.floor(p[0] / 120) + ',' + Math.floor(p[2] / 120); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(p); }
    const d = new THREE.Object3D();
    for (const L of cells.values()) {
      const im = new THREE.InstancedMesh(geo, mat, L.length);
      L.forEach((p, i) => { f(d, p); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere(); if (far) im.userData.far = far; scene.add(im); chunks.push(im);
    }
  };
  const place = (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.25, z); d.rotation.set(0, r, 0); d.scale.setScalar(s); };
  // árvore da mata: tronco com dois galhos e a copa larga em tufos
  { const T = mergeGeometries([limb(V(0, 0, 0), V(0.2, 5, 0), 0.3, 0.2), limb(V(0.2, 4.2, 0), V(1.8, 6.6, 0.6), 0.14, 0.08), limb(V(0.1, 4.6, 0), V(-1.5, 6.8, -0.8), 0.13, 0.07)]);
    const C = mergeGeometries([tuft(3.2, 2.2, 3.0, 0.2, 7.4, 0, 6), tuft(2.2, 1.6, 2.1, 2.0, 6.6, 1.0, 7), tuft(2.2, 1.6, 2.2, -1.8, 6.9, -0.9, 8), tuft(1.8, 1.3, 1.8, 0.4, 8.6, -1.2, 9)]);
    inst(T, bark, kinds.mata, place); inst(C, mataM, kinds.mata, place); }
  // as mais altas (jequitibás, cedros, perobas que sobraram): tronco claro e reto, copa em cima de tudo
  { const T = mergeGeometries([limb(V(0, 0, 0), V(0, 13, 0), 0.5, 0.3), limb(V(0, 11, 0), V(2.6, 15, 0.8), 0.22, 0.12), limb(V(0, 11.5, 0), V(-2.4, 15.2, -1), 0.2, 0.11)]);
    const C = mergeGeometries([tuft(4.4, 2.2, 4.2, 0, 16.2, 0, 16), tuft(2.8, 1.6, 2.6, 2.8, 15.2, 1.2, 17), tuft(2.8, 1.6, 2.8, -2.6, 15.4, -1.1, 18)]);
    inst(T, barkPale, kinds.alta, place); inst(C, altaM, kinds.alta, place); }
  // candeia: arvoreta de 3 a 5 m, tronco torto de casca grossa, copa rala e achatada
  { const T = mergeGeometries([limb(V(0, 0, 0), V(0.5, 2.2, 0.1), 0.16, 0.11), limb(V(0.5, 2.2, 0.1), V(0.1, 3.4, 0.4), 0.11, 0.07), limb(V(0.5, 2.0, 0.1), V(1.4, 3.1, -0.3), 0.07, 0.04)]);
    const C = mergeGeometries([tuft(1.5, 0.6, 1.4, 0.2, 3.7, 0.3, 26, 0.5), tuft(1.0, 0.5, 1.0, 1.3, 3.3, -0.3, 27, 0.5)]);
    inst(T, bark, kinds.candeia, place); inst(C, candeiaM, kinds.candeia, place); }
  // macaúba: tronco escuro (com os restos das folhas velhas) e a coroa de folhas arqueadas
  { const T = new THREE.CylinderGeometry(0.2, 0.26, 8, 7); T.translate(0, 4, 0);
    const parts = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2, up = i % 3 === 0 ? 0.75 : 0.2; const g = new THREE.PlaneGeometry(4.2, 1.1, 6, 1); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const u = (p.getX(k) + 2.1) / 4.2; p.setY(k, p.getY(k) + up * u * 2 - u * u * 2.2); p.setX(k, p.getX(k) + 2.1); } g.rotateX(-Math.PI / 2 * 0.15); g.rotateY(-a); g.translate(0, 8, 0); parts.push(g); }
    inst(T, palmTrunk, kinds.macauba, place); inst(mergeGeometries(parts), palmM, kinds.macauba, place); }
  // pedras de quartzito: blocos lascados, meio enterrados
  { const g = new THREE.DodecahedronGeometry(1, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 1.3, p.getY(i) * 0.7, p.getZ(i)); g.computeVertexNormals();
    inst(g, rockM, kinds.rock, (d, [x, y, z, s, r]) => { d.position.set(x, y + s * 0.15, z); d.rotation.set(0.2, r, 0.1); d.scale.setScalar(s); }); }
  inst((() => { const a = new THREE.PlaneGeometry(1.1, 0.9), b = a.clone(); a.translate(0, 0.45, 0); b.translate(0, 0.45, 0); b.rotateY(Math.PI / 2); return mergeGeometries([a, b]); })(), capimM, kinds.capim,
    (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.04, z); d.rotation.set(0, r, 0); d.scale.set(s, s * rr(0.8, 1.3), s); }, false, quality === 'alto' ? 300 : quality === 'minimo' ? 120 : 180);
  // ---- os quintais (as posições vêm das casas)
  for (const [k, x, y, z, s, r] of yardPlants) (kinds[k] ||= []).push([x, y, z, s, r]);
  { // bananeira: o pseudocaule verde-escuro e as folhas grandes arqueadas, umas já secas penduradas
    const T = new THREE.CylinderGeometry(0.11, 0.16, 2.6, 7); T.translate(0, 1.3, 0);
    const parts = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + (i % 2) * 0.3, g = new THREE.PlaneGeometry(0.55, 2.0, 1, 6), p = g.attributes.position; for (let k = 0; k < p.count; k++) { const v = (p.getY(k) + 1.0) / 2.0; p.setY(k, v * 1.4 - v * v * 0.9 + (i === 6 ? -v * 1.2 : 0)); p.setZ(k, v * 1.8); } g.rotateY(a); g.translate(0, 2.5, 0); parts.push(g); }
    const leafM = new THREE.MeshStandardMaterial({ map: bananaLeafTex(), color: 0xc8d8a8, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 });
    const stemM = new THREE.MeshStandardMaterial({ color: 0x5a6a3a, roughness: 0.9 });
    if (kinds.banana?.length) { inst(T, stemM, kinds.banana, place); inst(mergeGeometries(parts), leafM, kinds.banana, place); }
  }
  { // laranjeira (copa redonda, escura, com as laranjas) e jabuticabeira (tronco liso e claro que se divide baixo)
    const T = mergeGeometries([limb(V(0, 0, 0), V(0.1, 1.3, 0), 0.12, 0.09), limb(V(0.1, 1.2, 0), V(0.7, 2.0, 0.3), 0.07, 0.05), limb(V(0.1, 1.2, 0), V(-0.6, 2.1, -0.2), 0.07, 0.05)]);
    const C = mergeGeometries([tuft(1.6, 1.3, 1.6, 0, 2.6, 0, 31), tuft(1.1, 0.9, 1.1, 0.8, 2.3, 0.4, 32)]);
    const orangeTex = leafTex('#2e4a26', ['rgba(16,30,14,0.6)', 'rgba(70,100,50,0.5)', 'rgba(232,140,40,0.95)']);
    const lm = new THREE.MeshStandardMaterial({ map: orangeTex, color: 0x9ab08a, roughness: 0.85, vertexColors: true });
    if (kinds.laranja?.length) { inst(T, bark, kinds.laranja, place); inst(C, lm, kinds.laranja, place); }
    const TJ = mergeGeometries([limb(V(0, 0, 0), V(0.4, 1.6, 0.1), 0.13, 0.08), limb(V(0, 0, 0), V(-0.35, 1.7, -0.2), 0.12, 0.08), limb(V(0, 0, 0), V(0.05, 1.8, 0.45), 0.11, 0.07)]);
    const jm = new THREE.MeshStandardMaterial({ map: leafTex('#3a5a2e', ['rgba(20,36,16,0.6)', 'rgba(80,110,60,0.5)', 'rgba(30,20,30,0.8)']), color: 0xa8b898, roughness: 0.85, vertexColors: true }); // (as jabuticabas, pretas, grudadas nos galhos)
    if (kinds.jabuticaba?.length) { inst(TJ, barkPale, kinds.jabuticaba, place); inst(mergeGeometries([tuft(1.7, 1.2, 1.7, 0, 2.5, 0, 41), tuft(1.0, 0.8, 1.0, -0.7, 2.2, 0.5, 42)]), jm, kinds.jabuticaba, place); }
  }
  if (kinds.couve?.length) { // couve: as rosetas baixas nos canteiros de terra
    const g = (() => { const a = new THREE.PlaneGeometry(0.6, 0.6), b = new THREE.PlaneGeometry(0.5, 0.35), c = b.clone(); a.rotateX(-Math.PI / 2); a.translate(0, 0.3, 0); b.translate(0, 0.17, 0); c.rotateY(Math.PI / 2); c.translate(0, 0.17, 0); return mergeGeometries([a, b, c]); })();
    inst(g, new THREE.MeshStandardMaterial({ map: couveTex(), alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8, transparent: false }), kinds.couve, (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.02, z); d.rotation.set(0, r, 0); d.scale.setScalar(s); }, false, 160);
  }
  for (const k of ['mata', 'alta', 'candeia', 'macauba']) for (const [x, y, z, s] of kinds[k]) addCircle(x, z, (k === 'alta' ? 0.5 : 0.28) * s + 0.05, y - 1, y + 6);
  for (const k of ['banana', 'laranja', 'jabuticaba']) for (const [x, y, z, s] of kinds[k] || []) addCircle(x, z, 0.18 * s, y - 1, y + 3);
  for (const [x, y, z, s] of kinds.rock) addCircle(x, z, s * 1.1, y - 1, y + s * 0.8);

  // ---- a água dos córregos e do ribeirão
  const waters = Object.values(STREAMS).map((C) => { const m = streamMesh(C); scene.add(m); return m; });

  const counts = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.length]));
  let cullT = 0; const cc = chunks.map((im) => (im.boundingSphere ? im.boundingSphere.center.clone() : new THREE.Vector3()));
  return { M, waters, counts, kinds, chunks,
    cull(cam, dt) { if ((cullT -= dt) > 0) return; cullT = 0.4; const p = cam.position; for (let i = 0; i < chunks.length; i++) { const c = cc[i], dx = c.x - p.x, dz = c.z - p.z, R = (chunks[i].userData.far || farR) + 70; chunks[i].visible = dx * dx + dz * dz < R * R; } },
    update(dt) { for (const w of waters) w.userData.tick(dt); } };
}

// a água corrente: uma faixa que acompanha o leito (passa um pouco da beira e entra no barranco — a borda nunca fica no
// ar), com as ondinhas descendo a correnteza e a beira rasa e clara, onde se vê o fundo de pedra
function streamMesh(C) {
  const pts = []; const L = C.len, n = Math.ceil(L / 2.5);
  for (let k = 0; k <= n; k++) { const p = pointAt(C.pts, (k / n) * L); pts.push([p.x, p.z]); }
  const lvl = pts.map(([x, z]) => streamLevel(C, polyDist(C.pts, x, z)));
  for (let i = 1; i < lvl.length; i++) lvl[i] = Math.min(lvl[i], lvl[i - 1]); // a água só desce
  const XS = [-1, -0.6, -0.25, 0, 0.25, 0.6, 1], NC = XS.length, HW = C.hw + 2.0; // (a beira da fita entra no barranco, debaixo do chão)
  const pos = [], uv = [], across = [], idx = []; let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i], [nx, nz] = pts[Math.min(pts.length - 1, i + 1)], [px, pz] = pts[Math.max(0, i - 1)];
    let dx = nx - px, dz = nz - pz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const y = lvl[i];
    for (const xs of XS) { pos.push(x - dz * HW * xs, y, z + dx * HW * xs); uv.push((xs * HW) / 6, s / 6); across.push((xs + 1) / 2); }
    if (i > 0) for (let j = 0; j < NC - 1; j++) { const a0 = (i - 1) * NC + j, b0 = a0 + NC; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
    if (i < pts.length - 1) s += Math.hypot(nx - x, nz - z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('across', new THREE.Float32BufferAttribute(across, 1));
  g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } g.computeVertexNormals(); } // (a face de cima para cima)
  const nm = rippleNormals(); nm.repeat.set(1.3, 1.3);
  // a água dos córregos de Vila Rica: barrenta, cor de chá (a terra das lavras descia com ela)
  const mat = new THREE.MeshStandardMaterial({ color: 0x2c2e1e, normalMap: nm, normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.3, metalness: 0.02, envMapIntensity: 0.28, transparent: true, opacity: 0.92, depthWrite: false });
  mat.userData.keepEnv = true;
  const U = { uT: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float across; varying float vAcross; varying vec2 vFlow;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAcross = across; vFlow = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; varying float vAcross; varying vec2 vFlow;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ex = vAcross, mid = smoothstep(0.0, 0.3, ex) * smoothstep(1.0, 0.7, ex);
        diffuseColor.rgb = mix(vec3(0.3, 0.27, 0.2), diffuseColor.rgb, mid);
        diffuseColor.a *= smoothstep(0.0, 0.16, ex) * smoothstep(1.0, 0.84, ex) * (0.55 + 0.45 * mid);`)
      .replace('#include <normal_fragment_maps>', `vec3 mapN = (texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0) + (texture2D(normalMap, vFlow * vec2(1.3, 0.9) + vec2(0.31, -uT * 0.6)).xyz * 2.0 - 1.0);
        mapN.xy *= normalScale; normal = normalize(tbn * mapN);`);
  };
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.receiveShadow = true;
  m.userData.tick = (dt) => { U.uT.value += dt; nm.offset.y -= dt * 0.14; };
  return m;
}
