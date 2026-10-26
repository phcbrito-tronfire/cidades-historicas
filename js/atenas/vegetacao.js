// Vegetação da Ática: olivais em fileiras fora dos muros, ciprestes no cemitério e nos santuários, plátanos na ágora,
// pinheiros nas colinas, a oliveira sagrada da Acrópole, arbustos (lentisco, tomilho) e capim seco de verão.
// Usa os modelos do Sketchfab quando existem (instanciados); senão, árvores feitas aqui.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terrainHeight, coastC } from './terrain.js';
import { insideCity, distToWall } from './muralhas.js';
import { distToStreets } from './ruas.js';
import { addCircle } from '../comum/collision.js';
import { sculptureUnit, instancedFromUnit } from '../comum/sculptures.js';
import { fbm, rand, rr } from '../comum/util.js';

function leafTexture(base, light) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  for (let i = 0; i < 260; i++) {
    const px = 10 + Math.random() * 236, py = 10 + Math.random() * 236, a = Math.random() * 6.3, l = 7 + Math.random() * 12;
    x.fillStyle = Math.random() < 0.4 ? light : base;
    x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.ellipse(0, 0, l, l * 0.28, 0, 0, 7); x.fill(); x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// copa: aglomerado de "cartões" de folhas cruzados em volta de alguns centros
function canopy(centers, size) {
  const parts = [];
  for (const [cx, cy, cz, s] of centers) for (let i = 0; i < 5; i++) {
    const p = new THREE.PlaneGeometry(size * s, size * s * 0.85);
    p.rotateY((i / 5) * Math.PI + Math.random() * 0.4); p.rotateX(-0.3 + Math.random() * 0.6);
    p.translate(cx, cy, cz); parts.push(p);
  }
  return mergeGeometries(parts);
}
function trunkGeo(h, r0, r1, bend, twist = 0) {
  const g = new THREE.CylinderGeometry(r1, r0, h, 9, 8, true); g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / h, a = Math.atan2(p.getZ(i), p.getX(i));
    const k = 1 + 0.18 * Math.sin(a * 3 + t * twist * 6) * (1 - t); // tronco retorcido da oliveira
    p.setXYZ(i, p.getX(i) * k + bend * t * t, y, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

const SPECIES = {
  oliveira: () => ({ trunk: trunkGeo(2.2, 0.32, 0.16, 0.5, 1.5), crown: canopy([[0.4, 2.6, 0, 1.2], [-0.6, 2.9, 0.5, 1], [0.9, 3.1, -0.6, 0.9], [-0.2, 3.5, -0.3, 1], [0.2, 2.4, 0.9, 0.8]], 2.3), bark: 0x6a5a48, leaf: ['#5f6e48', '#9aa88a'], tint: 0xc8d0b0 }),
  cipreste: () => ({ trunk: trunkGeo(1.2, 0.18, 0.12, 0), crown: (() => { const parts = []; for (let i = 0; i < 9; i++) { const y = 1.2 + i * 1.1, s = 1.6 * (1 - i / 10); const p = canopy([[0, y, 0, s]], 1.5); parts.push(p); } return mergeGeometries(parts); })(), bark: 0x5a4a3a, leaf: ['#2f4a2a', '#4a6a3a'], tint: 0xb8c8a8 }),
  platano: () => ({ trunk: trunkGeo(4.5, 0.38, 0.24, 0.3), crown: canopy([[0, 6, 0, 1.6], [2, 5.5, 1, 1.3], [-2, 5.8, -1, 1.3], [1, 7, -1.5, 1.2], [-1, 6.5, 2, 1.2], [0, 7.5, 0, 1.1]], 3.6), bark: 0xb8a890, leaf: ['#4a7a34', '#7aa04a'], tint: 0xd0e0b8 }),
  pinheiro: () => ({ trunk: trunkGeo(6, 0.3, 0.16, 0.8), crown: canopy([[0.8, 6.2, 0, 1.6], [-0.8, 6.0, 0.6, 1.3], [0.2, 6.8, -0.8, 1.4], [1.6, 5.8, 0.8, 1.1]], 3.4), bark: 0x7a5a40, leaf: ['#3a5a2a', '#6a8a4a'], tint: 0xc0d0a8 }),
};

export async function buildVegetation(scene, tex, city) {
  const ex = city.exclusions;
  const isEx = (x, z) => distToWall(x, z) < 7 || distToStreets(x, z) < 6 || ex.some((e) => x > e[0] && x < e[1] && z > e[2] && z < e[3]) || (city.houses || []).some(([hx, hz, r]) => (hx - x) ** 2 + (hz - z) ** 2 < (r + 2) ** 2);
  const slope = (x, z) => Math.max(Math.abs(terrainHeight(x + 3, z) - terrainHeight(x - 3, z)), Math.abs(terrainHeight(x, z + 3) - terrainHeight(x, z - 3))) / 6;
  const lists = { oliveira: [], cipreste: [], platano: [], pinheiro: [] };
  // olivais: fileiras orientadas por talhão, fora da cidade e longe da praia
  for (let gx = -790; gx < 470; gx += 10) for (let gz = -470; gz < 700; gz += 10) {
    const field = fbm(gx * 0.006 + 2, gz * 0.006 + 5, 2);
    if (field < 0.5) continue;
    const x = gx + rr(-1.2, 1.2), z = gz + rr(-1.2, 1.2);
    if (insideCity(x, z) || coastC(x, z) > -70 || isEx(x, z) || slope(x, z) > 0.18) continue;
    const y = terrainHeight(x, z); if (y < 2) continue;
    lists.oliveira.push({ x, y, z, ry: rand() * 6, s: rr(0.8, 1.25) });
  }
  // no máximo ~800 oliveiras, sorteadas por todos os olivais (desempenho)
  if (lists.oliveira.length > 800) { const keep = 800 / lists.oliveira.length; lists.oliveira = lists.oliveira.filter(() => rand() < keep); }
  // dentro dos muros: árvores isoladas nos quintais e nas pracinhas
  for (let i = 0; i < 160; i++) {
    const x = rr(-560, 330), z = rr(-410, 260);
    if (!insideCity(x, z) || isEx(x, z) || slope(x, z) > 0.2) continue;
    const y = terrainHeight(x, z), k = rand();
    lists[k < 0.5 ? 'oliveira' : k < 0.8 ? 'cipreste' : 'pinheiro'].push({ x, y, z, ry: rand() * 6, s: rr(0.75, 1.1) });
  }
  // pinheiros nas colinas (Mouseion, Pnyx, Ninfas) e nos morros de fora
  for (let i = 0; i < 400 && lists.pinheiro.length < 140; i++) {
    const x = rr(-790, 470), z = rr(-470, 600), y = terrainHeight(x, z);
    if (y < 18 || isEx(x, z) || slope(x, z) > 0.35 || coastC(x, z) > -40) continue;
    if (Math.abs(x) < 140 && Math.abs(z) < 80) continue; // a rocha da Acrópole não tem árvores
    lists.pinheiro.push({ x, y, z, ry: rand() * 6, s: rr(0.8, 1.2) });
  }
  for (const t of city.trees || []) { const y = terrainHeight(t.x, t.z); lists[t.kind]?.push({ x: t.x, y, z: t.z, ry: rand() * 6, s: rr(0.9, 1.15) }); }
  if (city.sacredOlive) { const o = city.sacredOlive; lists.oliveira.push({ x: o.x, y: o.y, z: o.z, ry: 1, s: 1.35, hero: true }); }
  // colisão dos troncos
  for (const [k, list] of Object.entries(lists)) for (const p of list) addCircle(p.x, p.z, (k === 'platano' ? 0.45 : 0.3) * p.s, p.y - 1, p.y + 4);
  // modelos do Sketchfab, se houver; senão as árvores procedurais
  // em quadras de 160 m: cada quadra é desenhada só quando está na tela
  const cells = (list) => { const m = new Map(); for (const p of list) { const key = Math.floor(p.x / 160) + ',' + Math.floor(p.z / 160); if (!m.has(key)) m.set(key, []); m.get(key).push(p); } return [...m.values()]; };
  for (let [k, all] of Object.entries(lists)) {
    if (!all.length) continue;
    // modelo real nas árvores de destaque (as mais perto do centro da cidade); o resto do olival, a versão leve
    const unit = await sculptureUnit(k);
    const HERO = { oliveira: 140, cipreste: 60 }[k] || 0;
    if (unit && HERO) {
      all.sort((p, q) => (p.hero ? -1 : 0) - (q.hero ? -1 : 0) || Math.hypot(p.x + 150, p.z + 80) - Math.hypot(q.x + 150, q.z + 80));
      const heroes = all.slice(0, HERO); all = all.slice(HERO);
      for (const list of cells(heroes)) scene.add(instancedFromUnit(unit, list.map((p) => ({ ...p, s: p.s * (k === 'oliveira' ? 5.2 : 10) }))));
      if (!all.length) continue;
    }
    const sp = SPECIES[k]();
    const leafTex = leafTexture(sp.leaf[0], sp.leaf[1]);
    const trunkMat = new THREE.MeshStandardMaterial({ map: tex.pbr?.rock_face_03.map, color: sp.bark, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8, color: sp.tint });
    const dummy = new THREE.Object3D();
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.45 });
    for (const list of cells(all)) {
      const T = new THREE.InstancedMesh(sp.trunk, trunkMat, list.length), C = new THREE.InstancedMesh(sp.crown, leafMat, list.length);
      list.forEach((p, i) => { dummy.position.set(p.x, p.y - 0.1, p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); T.setMatrixAt(i, dummy.matrix); C.setMatrixAt(i, dummy.matrix); });
      for (const m of [T, C]) { m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); }
      C.customDepthMaterial = depth;
    }
  }
  // arbustos e capim seco
  const bushTex = leafTexture('#6a7044', '#8a8a5a');
  const bushG = (() => { const parts = []; for (let i = 0; i < 5; i++) { const p = new THREE.PlaneGeometry(1.4, 1.0); p.translate(0, 0.45, 0); p.rotateY((i / 5) * Math.PI); parts.push(p); } return mergeGeometries(parts); })();
  const grassTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); for (let i = 0; i < 30; i++) { const px = 4 + Math.random() * 56; x.strokeStyle = `hsl(${40 + Math.random() * 20},${35 + Math.random() * 25}%,${45 + Math.random() * 20}%)`; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, 128); x.quadraticCurveTo(px + (Math.random() - 0.5) * 12, 70, px + (Math.random() - 0.5) * 14, 20 + Math.random() * 40); x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const grassG = (() => { const a = new THREE.PlaneGeometry(0.9, 0.7); a.translate(0, 0.35, 0); const b = a.clone(); b.rotateY(Math.PI / 2); return mergeGeometries([a, b]); })();
  const bushes = [], grass = [];
  for (let i = 0; i < 9000 && (bushes.length < 1400 || grass.length < 6000); i++) {
    const x = rr(-790, 470), z = rr(-470, 760);
    const c = coastC(x, z); if (c > -6) continue;
    const y = terrainHeight(x, z); if (y < 0.5) continue;
    if (isEx(x, z) || (Math.abs(x) < 132 && Math.abs(z) < 64)) continue;
    const city = insideCity(x, z);
    if (!city && bushes.length < 1400 && (y > 16 || rand() < 0.3)) bushes.push({ x, y, z });
    else if (grass.length < 6000 && (!city || rand() < 0.15)) grass.push({ x, y, z, beach: c > -60 });
  }
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const B = new THREE.InstancedMesh(bushG, new THREE.MeshStandardMaterial({ map: bushTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }), bushes.length);
  bushes.forEach((p, i) => { const s = rr(0.6, 1.4); dummy.position.set(p.x, p.y - 0.05, p.z); dummy.rotation.set(0, rand() * 6, 0); dummy.scale.set(s, s * rr(0.7, 1.1), s); dummy.updateMatrix(); B.setMatrixAt(i, dummy.matrix); B.setColorAt(i, col.setHSL(0.16 + rand() * 0.06, 0.25 + rand() * 0.15, 0.6 + rand() * 0.2)); });
  const G = new THREE.InstancedMesh(grassG, new THREE.MeshStandardMaterial({ map: grassTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.95 }), grass.length);
  grass.forEach((p, i) => { const s = rr(0.6, 1.3); dummy.position.set(p.x, p.y - 0.05, p.z); dummy.rotation.set(0, rand() * 3, 0); dummy.scale.set(s, s * rr(0.7, 1.2), s); dummy.updateMatrix(); G.setMatrixAt(i, dummy.matrix); G.setColorAt(i, p.beach ? col.setHSL(0.14, 0.3, 0.7) : col.setHSL(0.11 + rand() * 0.04, 0.4, 0.75 + rand() * 0.15)); });
  for (const m of [B, G]) { m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); }
  B.castShadow = true;
  B.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: bushTex, alphaTest: 0.45 });
  return lists;
}
