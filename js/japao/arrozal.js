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
  const waters = [], rowsPos = [], plots = [], grid = [];
  // o nível de cada tabuleiro: um pouco abaixo do ponto mais baixo do chão dele; onde o chão desce demais
  // (a margem do riacho), não há tabuleiro — senão vira um poço com paredes de terra
  for (let i = 0; i < nx; i++) { grid[i] = []; for (let j = 0; j < nz; j++) {
    const cx = FIELDS.x0 + (i + 0.5) * PW, cz = FIELDS.z0 + (j + 0.5) * PD, ys = [];
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) ys.push(terrainHeight(cx + a * PW * 0.24, cz + b * PD * 0.24));
    const lo = Math.min(...ys), hi = Math.max(...ys);
    grid[i][j] = hi - lo > 0.7 ? null : { cx, cz, y: lo - 0.05, i, j };
  } }
  const at = (i, j) => (grid[i] && grid[i][j]) || null;
  // a taipa (aze) entre dois tabuleiros: baixa, com capim por cima — sobe-se andando (no máximo uns 40 cm)
  const bund = (x, z, w, d, ya, yb) => { const top = Math.max(ya, yb) + 0.2, bot = Math.min(ya, yb) - 0.4;
    B.box(M.earthFloor, w, top - bot, d, x, bot, z, { noGround: true }); B.box(M.moss, w, 0.05, d * 0.75, x, top, z, { noGround: true }); addBox(x, z, w, d, bot - 0.6, top); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const P = at(i, j); if (!P) continue; const { cx, cz, y } = P;
    plots.push(P);
    const S = at(i, j - 1), Wn = at(i - 1, j), Nn = at(i, j + 1), En = at(i + 1, j);
    bund(cx, cz - PD / 2, PW + 0.9, 0.9, y, S ? S.y : y); bund(cx - PW / 2, cz, 0.9, PD, y, Wn ? Wn.y : y);
    if (!Nn) bund(cx, cz + PD / 2, PW + 0.9, 0.9, y, y); if (!En) bund(cx + PW / 2, cz, 0.9, PD, y, y);
    B.box(M.earthFloor, PW - 0.9, 0.6, PD - 0.9, cx, y - 0.62, cz, { noGround: true }); // o fundo de barro (grosso: não deixa fresta com o terreno)
    out.floors.push({ x: cx, z: cz, w: PW + 0.8, d: PD + 0.8, ry: 0, top: y - 0.02 });
    waters.push([cx, y + 0.12, cz, PW - 0.9, PD - 0.9]); // (a água cobre os pés: uns 10 cm)
    for (let r = 0; r < Math.floor((PD - 1.6) / 0.62); r++) rowsPos.push([cx, y, cz - PD / 2 + 1.1 + r * 0.62, PW - 1.6]);
    if (j === 0 && i % 2 === 0) { const gx = cx - PW / 2, gz = cz - PD / 2; B.box(M.darkWood, 0.15, 0.7, 1.0, gx, y, gz + 3); B.box(M.wood, 0.1, 0.45, 0.9, gx, y + 0.1, gz + 3); } // a comporta de tábua
  }
  // o canal de irrigação ao longo da borda oeste
  { const x = FIELDS.x0 - 3; for (let z = FIELDS.z0; z < FIELDS.z1; z += 8) { const y = terrainHeight(x, z + 4); B.box(M.stone, 0.3, 0.6, 8, x - 0.6, y - 0.5, z + 4, { noGround: true }); B.box(M.stone, 0.3, 0.6, 8, x + 0.6, y - 0.5, z + 4, { noGround: true }); B.box(M.water, 0.9, 0.04, 8, x, y - 0.25, z + 4, { noGround: true }); } }
  // a água dos tabuleiros: uma malha só, espelhada
  const wg = []; for (const [x, y, z, w, d] of waters) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); wg.push(g); }
  const nrm = rippleNormals(); nrm.repeat.set(0.12, 0.12);
  const water = new THREE.Mesh(worldUV(mergeAll(wg)), new THREE.MeshStandardMaterial({ color: 0x5a7a80, roughness: 0.16, metalness: 0.3, transparent: true, opacity: 0.8, normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35), depthWrite: false }));
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
  const PL = plots, wet = { at: new THREE.Vector3(), s: 1, splash: false }; let stepT = 0, wetNow = true;
  return {
    plots, water, rows, racks,
    // quem anda dentro de um tabuleiro alagado: devolve onde pôr o anel na água (e, a cada passo, o respingo)
    wade(p, speed, dt, riding) {
      nrm.offset.x += dt * 0.004; nrm.offset.y += dt * 0.0025;
      if (!wetNow || speed < 0.4) { stepT = 0; return null; }
      const P = PL.find((q) => Math.abs(p.x - q.cx) < PW / 2 - 0.5 && Math.abs(p.z - q.cz) < PD / 2 - 0.5); if (!P || p.y > P.y + 0.35) return null;
      stepT -= dt * speed / (riding ? 1.3 : 0.75); if (stepT > 0) return null;
      stepT = 1; wet.at.set(p.x, P.y + 0.13, p.z); wet.s = riding ? 1.4 : speed > 4 ? 1.1 : 0.8; wet.splash = true; return wet;
    },
    setSeason(s) { const S = STAGE[s]; wetNow = S.water > 0.05; setRows(S.h); riceM.color.setHex(S.color); water.visible = S.water > 0.05; water.material.opacity = 0.5 + S.water * 0.4; racks.visible = S.racks; },
  };
}
export function rippleNormals() { // ondinhas pequenas e irregulares (normais em canvas)
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N);
  const w = (2 * Math.PI) / N, h = (i, j) => Math.sin(i * w * 5 + Math.sin(j * w * 3) * 2) * 0.5 + Math.sin(j * w * 6 + Math.sin(i * w * 2) * 2.4) * 0.5 + Math.sin((i + j) * w * 16) * 0.18; // (frequências inteiras: a textura emenda sem costura)
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const dx = h(i + 1, j) - h(i - 1, j), dy = h(i, j + 1) - h(i, j - 1), k = (j * N + i) * 4; img.data[k] = 128 + dx * 60; img.data[k + 1] = 128 + dy * 60; img.data[k + 2] = 255; img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function worldUV(g) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i)); return g; }
function mergeAll(gs) { // (BufferGeometryUtils sem importar: só posições/normais/uv de planos)
  const n = gs.reduce((s, g) => s + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = []; let o = 0;
  for (const g of gs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); for (const i of g.index.array) idx.push(i + o); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setIndex(idx); return m;
}
