// Plantas de Mênfis feitas em código (como o bambu do Japão): arbustos de raminhos com folhas de verdade em vez de
// "bolinhas" e cartões de borrões, palmeirinhas de vaso com a copa saindo da terra do vaso (antes a copa grande
// encolhida ficava torta, metade enterrada no vaso), sicômoros — a árvore sagrada de Hathor, a "senhora do
// sicômoro", plantada em todo jardim egípcio — e a palmeira-dum, a palmeira de tronco que se divide em dois, típica
// do Alto Egito. Tudo instanciado (um desenho por espécie).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
let RS = 1; const R = () => { RS = (RS * 16807) % 2147483647; return (RS - 1) / 2147483646; }; // (sempre a mesma planta)

// raminhos com folhas em lança, fundo transparente; flower: pontinhos de flor (rosa, branco ou amarelo)
function sprigTexture({ greens, flower = null, leafL = [9, 15], leafW = 0.32, n = 34 }) {
  RS = 7;
  const W = 256, H = 256, c = canvas(W, H), x = c.getContext('2d');
  for (let s = 0; s < n; s++) {
    const bx = 30 + R() * 196, by = 250, a = -Math.PI / 2 + (R() - 0.5) * 1.5, len = 90 + R() * 130;
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    x.strokeStyle = '#5b4a2a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
    const k = 7 + Math.floor(R() * 7);
    for (let i = 1; i <= k; i++) {
      const t = i / (k + 1), px = bx + (ex - bx) * t, py = by + (ey - by) * t;
      for (const sd of [-1, 1]) {
        const g = greens[Math.floor(R() * greens.length)], L = leafL[0] + R() * (leafL[1] - leafL[0]);
        x.fillStyle = g; x.save(); x.translate(px, py); x.rotate(a + sd * (0.7 + R() * 0.5));
        x.beginPath(); x.ellipse(L / 2, 0, L / 2, L * leafW / 2, 0, 0, Math.PI * 2); x.fill(); x.restore();
      }
    }
    x.fillStyle = greens[0]; x.beginPath(); x.ellipse(ex, ey, 6, 2.4, a, 0, Math.PI * 2); x.fill();
    if (flower && R() < 0.7) for (let i = 0; i < 5; i++) { x.fillStyle = flower; x.beginPath(); x.arc(ex + (R() - 0.5) * 14, ey + (R() - 0.5) * 14, 2.2 + R() * 1.6, 0, 7); x.fill(); }
  }
  return tex(c);
}

// moita: cartões verticais em leque, inclinados para fora (sem tampa chata em cima — ela dava o ar de "caixa")
function shrubGeometry(n = 7, w = 1.5, h = 1.3) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.PlaneGeometry(w, h, 2, 2); p.translate(0, h / 2, 0);
    const pos = p.attributes.position;
    for (let j = 0; j < pos.count; j++) { const y = pos.getY(j) / h; pos.setZ(j, pos.getZ(j) + y * y * 0.25); } // (curva para fora no alto)
    p.rotateX(-0.22 - (i % 3) * 0.08); p.rotateY((i / n) * Math.PI * 2 + (i % 2) * 0.35);
    parts.push(p);
  }
  return mergeGeometries(parts);
}

// palmeirinha de vaso: folhas novas saindo do meio do vaso, em arco
function potPalmGeometry() {
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const L = 0.75 + (i % 3) * 0.18, f = new THREE.PlaneGeometry(0.34, L, 1, 5); f.translate(0, L / 2, 0);
    const p = f.attributes.position;
    for (let j = 0; j < p.count; j++) { const t = p.getY(j) / L; p.setZ(j, -t * t * 0.45); p.setX(j, p.getX(j) * (1 - t * 0.5)); }
    f.rotateX(-(0.25 + (i % 3) * 0.25)); f.rotateY((i / 9) * Math.PI * 2 + (i % 2) * 0.3);
    parts.push(f);
  }
  const g = mergeGeometries(parts); g.translate(0, 0.62, 0); // (o pé das folhas na terra do vaso)
  return g;
}
function potGeometry() {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.17 + Math.sin(t * Math.PI * 0.85) * 0.2 + (t > 0.9 ? 0.05 : 0), t * 0.68)); }
  pts.push(new THREE.Vector2(0.2, 0.68), new THREE.Vector2(0.2, 0.6), new THREE.Vector2(0, 0.6)); // borda virada e a terra
  return new THREE.LatheGeometry(pts, 16);
}

// sicômoro: tronco grosso e curto, galhos abertos e a copa larga em tufos (cartões de folhagem)
function sycamoreGeometry() {
  RS = 3;
  const wood = [], leaves = [];
  const trunk = new THREE.CylinderGeometry(0.32, 0.55, 2.6, 9, 3); trunk.translate(0, 1.3, 0); wood.push(trunk);
  const tufts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + R() * 0.4, L = 2.2 + R() * 1.2, up = 0.55 + R() * 0.3;
    const b = new THREE.CylinderGeometry(0.1, 0.22, L, 6); b.translate(0, L / 2, 0); b.rotateZ(-up); b.rotateY(a); b.translate(0, 2.4, 0); wood.push(b);
    const tip = new THREE.Vector3(Math.sin(up) * L, 2.4 + Math.cos(up) * L, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    tufts.push(tip);
  }
  tufts.push(new THREE.Vector3(0, 4.6, 0));
  for (const t of tufts) for (let k = 0; k < 4; k++) {
    const s = 2.6 + R() * 1.0, p = new THREE.PlaneGeometry(s, s * 0.8); p.rotateX(-0.3 - R() * 0.4); p.rotateY((k / 4) * Math.PI + R() * 0.5);
    p.translate(t.x + (R() - 0.5) * 0.6, t.y + 0.2 + (R() - 0.5) * 0.4, t.z + (R() - 0.5) * 0.6); leaves.push(p);
  }
  for (let k = 0; k < 3; k++) { const p = new THREE.PlaneGeometry(4.2, 4.2); p.rotateX(-Math.PI / 2 + (R() - 0.5) * 0.4); p.rotateY(R() * 3); p.translate(0, 4.9 + k * 0.35, 0); leaves.push(p); } // (o teto da copa, de baixo se vê a sombra)
  return { wood: mergeGeometries(wood), leaves: mergeGeometries(leaves) };
}

// palmeira-dum: o tronco se divide em dois (às vezes em quatro) e cada braço termina num leque de folhas
function doumGeometry(frond) {
  RS = 11;
  const wood = [], fans = [];
  const t0 = new THREE.CylinderGeometry(0.2, 0.26, 3.2, 8); t0.translate(0, 1.6, 0); wood.push(t0);
  const arms = [[0.45, 0], [0.4, Math.PI], [0.62, Math.PI / 2]];
  for (const [tilt, a] of arms) {
    const L = 2.6 + R() * 1.4, b = new THREE.CylinderGeometry(0.14, 0.19, L, 7); b.translate(0, L / 2, 0); b.rotateZ(tilt); b.rotateY(a); b.translate(0, 3.1, 0); wood.push(b);
    const tip = new THREE.Vector3(-Math.sin(tilt) * L, 3.1 + Math.cos(tilt) * L, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    for (let i = 0; i < 9; i++) { // leque: folhas curtas e largas em roseta
      const f = new THREE.PlaneGeometry(1.0, 2.1, 1, 4); f.translate(0, 1.05, 0);
      const p = f.attributes.position; for (let j = 0; j < p.count; j++) { const t = p.getY(j) / 2.1; p.setZ(j, -t * t * 1.1); p.setX(j, p.getX(j) * (0.6 + t * 0.6)); } // (alarga na ponta: folha em leque)
      f.rotateX(Math.PI / 2 - 0.12 - (i % 3) * 0.14); f.rotateY((i / 9) * Math.PI * 2 + (i % 2) * 0.3); f.translate(tip.x, tip.y, tip.z); fans.push(f);
    }
  }
  return { wood: mergeGeometries(wood), fans: mergeGeometries(fans) };
}

export function plantKit(T) {
  const shrubTex = sprigTexture({ greens: ['#3f6a26', '#4f7d2c', '#5b8a34', '#365d22', '#6a9440'] });
  const flowerTex = sprigTexture({ greens: ['#46702a', '#557f30', '#3a6324'], flower: '#e9a0b8', leafL: [10, 17], leafW: 0.28 });
  const tamTex = sprigTexture({ greens: ['#6f8a5a', '#7e9a66', '#62804e'], leafL: [4, 7], leafW: 0.5, n: 46 }); // tamargueira: folhinha miúda, verde-acinzentado
  const sycTex = sprigTexture({ greens: ['#2f5a22', '#3b6a28', '#46772e', '#29501d'], leafL: [14, 22], leafW: 0.6, n: 40 });
  const alpha = (map) => new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.82 });
  const depth = (map) => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.45 });
  const frondMat = T.frondMat;
  return {
    shrub: { geo: shrubGeometry(), mats: [alpha(shrubTex), alpha(flowerTex), alpha(tamTex)], depth: [depth(shrubTex), depth(flowerTex), depth(tamTex)] },
    pot: { geo: potGeometry(), mat: new THREE.MeshStandardMaterial({ color: 0xa4552f, roughness: 0.85 }), plant: potPalmGeometry(), plantMat: frondMat },
    syc: { ...sycamoreGeometry(), woodMat: new THREE.MeshStandardMaterial({ map: T.bark, color: 0x9a8a78, roughness: 0.95 }), leafMat: alpha(sycTex), leafDepth: depth(sycTex) },
    doum: { ...doumGeometry(), woodMat: new THREE.MeshStandardMaterial({ map: T.bark, roughness: 0.95 }), fanMat: frondMat },
  };
}

// instancia uma lista de pontos {x, y, z, s, ry, k}; k escolhe a variante (moitas)
export function plantInstances(scene, geo, mat, pts, { depth, tint } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length)); m.count = pts.length;
  const d = new THREE.Object3D(), c = new THREE.Color();
  pts.forEach((p, i) => { d.position.set(p.x, p.y, p.z); d.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0); d.scale.set(p.s, p.sy || p.s, p.s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (tint) m.setColorAt(i, c.setHSL(...tint(p, i))); });
  m.castShadow = true; m.receiveShadow = true; if (depth) m.customDepthMaterial = depth;
  scene.add(m); return m;
}
