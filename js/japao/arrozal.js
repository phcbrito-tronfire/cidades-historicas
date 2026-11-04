// Os arrozais a nordeste da vila: tabuleiros em degraus (cada um num nível), separados por taipas de terra
// com capim, o canal de irrigação e as comportas de madeira. O arroz muda com a estação:
// - primavera: os tabuleiros alagados viram espelhos e as mudas, pequenas, em fileiras;
// - verão: o arroz verde e alto, a água quase escondida;
// - outono: o arroz maduro, dourado e curvado, e os varais (hazakake) com os feixes secando;
// - inverno: o restolho seco, sem água (a terra descansa), e às vezes neve.
import * as THREE from 'three';
import { addBox } from '../comum/collision.js';
import { mulberry32 } from '../comum/util.js';
import { terrainHeight, FIELDS } from './terrain.js';

const rnd = mulberry32(1793);

function riceTex() { // fileira de arroz: folhas finas em leque, com transparência
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  for (let i = 0; i < 70; i++) { const bx = (i / 70) * 256 + rnd() * 3, h = 40 + rnd() * 22; for (let k = 0; k < 4; k++) { x.strokeStyle = `rgba(255,255,255,${0.7 + rnd() * 0.3})`; x.lineWidth = 1.2 + rnd(); x.beginPath(); x.moveTo(bx, 64); x.quadraticCurveTo(bx + (k - 1.5) * 4, 64 - h * 0.6, bx + (k - 1.5) * 9 + (rnd() - 0.5) * 6, 64 - h); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildPaddies(scene, M, B, out) {
  const PW = 38, PD = 26, nx = Math.floor((FIELDS.x1 - FIELDS.x0) / PW), nz = Math.floor((FIELDS.z1 - FIELDS.z0) / PD);
  const waters = [], rowsPos = [], plots = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const cx = FIELDS.x0 + (i + 0.5) * PW, cz = FIELDS.z0 + (j + 0.5) * PD;
    const ys = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([a, b]) => terrainHeight(cx + a * PW * 0.45, cz + b * PD * 0.45)), y = Math.min(...ys) - 0.05;
    plots.push({ cx, cz, y });
    // a taipa em volta (aze): terra com capim por cima, onde se anda
    for (const [w, d, dx, dz] of [[PW, 0.9, 0, -PD / 2], [PW, 0.9, 0, PD / 2], [0.9, PD, -PW / 2, 0], [0.9, PD, PW / 2, 0]]) {
      const top = Math.max(y + 0.35, terrainHeight(cx + dx, cz + dz) + 0.1);
      B.box(M.earthFloor, w, top - y + 0.4, d, cx + dx, y - 0.4, cz + dz, { noGround: true }); B.box(M.moss, w, 0.06, d * 0.7, cx + dx, top, cz + dz, { noGround: true });
      addBox(cx + dx, cz + dz, w, d, y - 1, top);
    }
    B.box(M.earthFloor, PW - 0.9, 0.3, PD - 0.9, cx, y - 0.32, cz, { noGround: true }); // o fundo de barro (o terreno fica por baixo)
    out.floors.push({ x: cx, z: cz, w: PW, d: PD, ry: 0, top: y - 0.02 });
    waters.push([cx, y + 0.02, cz, PW - 0.9, PD - 0.9]);
    for (let r = 0; r < Math.floor((PD - 1.6) / 0.62); r++) rowsPos.push([cx, y, cz - PD / 2 + 1.1 + r * 0.62, PW - 1.6]);
    if (j === 0 && i % 2 === 0) { const gx = cx - PW / 2, gz = cz - PD / 2; B.box(M.darkWood, 0.15, 0.7, 1.0, gx, y, gz + 3); B.box(M.wood, 0.1, 0.45, 0.9, gx, y + 0.1, gz + 3); } // a comporta de tábua
  }
  // o canal de irrigação ao longo da borda oeste
  { const x = FIELDS.x0 - 3; for (let z = FIELDS.z0; z < FIELDS.z1; z += 8) { const y = terrainHeight(x, z + 4); B.box(M.stone, 0.3, 0.6, 8, x - 0.6, y - 0.5, z + 4, { noGround: true }); B.box(M.stone, 0.3, 0.6, 8, x + 0.6, y - 0.5, z + 4, { noGround: true }); B.box(M.water, 0.9, 0.04, 8, x, y - 0.25, z + 4, { noGround: true }); } }
  // a água dos tabuleiros: uma malha só, espelhada
  const wg = []; for (const [x, y, z, w, d] of waters) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); wg.push(g); }
  const water = new THREE.Mesh(mergeAll(wg), new THREE.MeshStandardMaterial({ color: 0x6a8a92, roughness: 0.05, metalness: 0.55, transparent: true, opacity: 0.88 }));
  water.receiveShadow = true; scene.add(water);
  // as fileiras de arroz: tiras verticais com a textura das folhas (cada fileira é uma instância)
  const rowG = new THREE.PlaneGeometry(1, 1); rowG.translate(0, 0.5, 0);
  const tex = riceTex();
  const riceM = new THREE.MeshStandardMaterial({ map: tex, color: 0x7aa04a, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  const rows = new THREE.InstancedMesh(rowG, riceM, rowsPos.length), d = new THREE.Object3D();
  const setRows = (h) => { rowsPos.forEach(([x, y, z, w], k) => { d.position.set(x, y, z); d.rotation.set(0, 0, 0); d.scale.set(w, h * (0.9 + ((k * 7) % 5) * 0.04), 1); d.updateMatrix(); rows.setMatrixAt(k, d.matrix); }); rows.instanceMatrix.needsUpdate = true; };
  setRows(0.6); rows.receiveShadow = true; scene.add(rows);
  tex.repeat.set(10, 1);
  // os varais de secar arroz (hazakake), só no outono: postes, a vara e os feixes pendurados
  const racks = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }), straw = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 1 });
  for (const p of plots.filter((q, k) => k % 3 === 1)) {
    const x0 = p.cx - 12, z = p.cz + 8.5, y = p.y;
    for (let k = 0; k <= 4; k++) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 5), wood); pole.position.set(x0 + k * 6, y + 1.1, z); racks.add(pole); }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 24, 5), wood); bar.rotation.z = Math.PI / 2; bar.position.set(x0 + 12, y + 1.9, z); racks.add(bar);
    for (let s = 0; s < 40; s++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.22), straw); sh.position.set(x0 + 0.3 + s * 0.59, y + 1.45, z + (s % 2 ? 0.12 : -0.12)); racks.add(sh); }
  }
  racks.visible = false; scene.add(racks);
  // a estação: altura e cor do arroz, a água, os varais
  const STAGE = {
    primavera: { h: 0.18, color: 0x8ab858, water: 1, racks: false },
    verao: { h: 0.8, color: 0x5a9a3a, water: 0.6, racks: false },
    outono: { h: 0.95, color: 0xd8b04a, water: 0, racks: true }, // (drenado para a colheita)
    inverno: { h: 0.12, color: 0x9a845a, water: 0, racks: false },
  };
  return {
    plots, water, rows, racks,
    setSeason(s) { const S = STAGE[s]; setRows(S.h); riceM.color.setHex(S.color); water.visible = S.water > 0.05; water.material.opacity = 0.5 + S.water * 0.4; racks.visible = S.racks; },
  };
}
function mergeAll(gs) { // (BufferGeometryUtils sem importar: só posições/normais/uv de planos)
  const n = gs.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = []; let o = 0;
  for (const g of gs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); for (const i of g.index.array) idx.push(i + o); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setIndex(idx); return m;
}
