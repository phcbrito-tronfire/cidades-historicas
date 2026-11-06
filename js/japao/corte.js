// O corte com a katana (Japão, com a armadura de samurai). O bambu e os feixes de palha de arroz partem no ângulo do
// golpe: a parte de cima escorrega pelo corte e cai, e no toco fica o corte inclinado, com o bambu oco por dentro.
// O golpe tem peso: no impacto o tempo para por uma fração de segundo, a câmera treme, o bambu estala seco e voam
// lascas e folhas. A espada que bate em parede ou pedra tine, solta faíscas e trava.
// O bambuzal se refaz com as estações: o toco cortado fica até a estação mudar, e então o colmo cresce de novo (o
// bambu cresce muito rápido). Os feixes de palha do pátio do dōjō são trocados por novos.
import * as THREE from 'three';
import { mergeGeometries as mergeGeos } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundAt, solidAt, addCircle } from '../comum/collision.js';

const V3 = THREE.Vector3, UP = new V3(0, 1, 0);
// cada golpe: a altura do corte (acima dos pés), a inclinação do plano (graus) e a abertura do arco (graus para cada lado)
const CUTS = { kt_desce: { h: 1.25, tilt: 38, arc: 70 }, kt_forte: { h: 1.05, tilt: -32, arc: 75 }, kt_baixo: { h: 0.55, tilt: 14, arc: 75 }, kt_giro: { h: 0.95, tilt: -10, arc: 180 }, kt_salto: { h: 1.3, tilt: 42, arc: 60 } };
const REACH = 2.3, MAX_BAMBOO = 3; // (um golpe bom corta até três colmos)
const SAVE = 'cidades-historicas:japao:corte';

// o plano do corte: n (normal, para cima) passando por p0; a altura dele em (x, z)
const planeY = (n, p0, x, z) => p0.y - (n.x * (x - p0.x) + n.z * (z - p0.z)) / n.y;
// a peça de baixo (below) ou de cima: os vértices do outro lado do plano descem/sobem até ele, na vertical
function slice(src, n, p0, below) {
  const g = src.clone(), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const yp = planeY(n, p0, p.getX(i), p.getZ(i)), y = p.getY(i); if (below ? y > yp : y < yp) p.setY(i, yp); }
  p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
// a face do corte: um anel (ou disco) deitado exatamente no plano (a seção de um colmo reto por um plano inclinado)
function face(r0, r1, n, p0, lift, seg = 12) {
  const g = r0 > 0 ? new THREE.RingGeometry(r0, r1, seg) : new THREE.CircleGeometry(r1, seg);
  g.rotateX(-Math.PI / 2); g.translate(p0.x, 0, p0.z);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, planeY(n, p0, p.getX(i), p.getZ(i)) + lift);
  p.needsUpdate = true; g.computeVertexNormals(); return g;
}
function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// partículas: folhas, lascas e fios de palha (uma malha só, com cor por peça), e as faíscas (brilhantes)
class Bits {
  constructor(scene, mat, max) {
    this.im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, max); this.im.count = 0; this.im.frustumCulled = false;
    this.im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.im.setColorAt(0, new THREE.Color()); this.max = max;
    scene.add(this.im); this.list = []; this.d = new THREE.Object3D();
  }
  emit(at, n, o) {
    for (let i = 0; i < n && this.list.length < this.max; i++) {
      const v = new V3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2).multiplyScalar(o.spread ?? 1.5);
      if (o.dir) v.addScaledVector(o.dir, (0.6 + Math.random() * 0.8) * (o.push ?? 2));
      v.y += o.up ?? 1;
      const p = at.clone(); if (o.box) p.add(new V3((Math.random() - 0.5) * o.box[0], (Math.random() - 0.5) * o.box[1], (Math.random() - 0.5) * o.box[2]));
      const c = new THREE.Color(o.color[Math.floor(Math.random() * o.color.length)]);
      this.list.push({ p, v, r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(o.spin ?? 12), sx: o.size[0] * (0.7 + Math.random() * 0.6), sy: o.size[1] * (0.7 + Math.random() * 0.6), life: o.life * (0.6 + Math.random() * 0.6), drag: o.drag ?? 0.5, flutter: o.flutter ?? 0, g: o.g ?? 9.8, c, rest: false, t: Math.random() * 6 });
    }
  }
  update(dt) {
    const L = this.list, d = this.d;
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i]; q.life -= dt; if (q.life <= 0) { L.splice(i, 1); continue; }
      if (!q.rest) {
        q.t += dt; q.v.y -= q.g * dt; q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt));
        if (q.flutter) { q.v.x += Math.sin(q.t * 3.1) * q.flutter * dt; q.v.z += Math.cos(q.t * 2.3) * q.flutter * dt; } // (a folha balança caindo)
        q.p.addScaledVector(q.v, dt); q.r.x += q.w.x * dt; q.r.y += q.w.y * dt; q.r.z += q.w.z * dt;
        const gy = groundAt(q.p.x, q.p.z, q.p.y + 0.3);
        if (q.p.y < gy + 0.01) { q.p.y = gy + 0.01; q.rest = true; q.r.x = -Math.PI / 2; q.r.y = 0; q.life = Math.min(q.life, 4 + Math.random() * 3); } // (deita no chão)
      }
    }
    for (let i = 0; i < L.length; i++) { const q = L[i], k = Math.min(1, q.life * 2); d.position.copy(q.p); d.rotation.copy(q.r); d.scale.set(q.sx * k, q.sy * k, 1); d.updateMatrix(); this.im.setMatrixAt(i, d.matrix); this.im.setColorAt(i, q.c); }
    this.im.count = L.length; this.im.instanceMatrix.needsUpdate = true; if (this.im.instanceColor) this.im.instanceColor.needsUpdate = true;
  }
}

export function makeCutting({ scene, player, nature, city, audio, toast }) {
  const B = nature.bamboo, said = (() => { try { return new Set(JSON.parse(localStorage.getItem(SAVE) || '[]')); } catch (e) { return new Set(); } })();
  const tell = (id, msg) => { if (said.has(id)) return; said.add(id); try { localStorage.setItem(SAVE, JSON.stringify([...said])); } catch (e) { /* */ } toast?.(msg, 'quest', 8000); };
  // materiais (criados já: o aquecimento compila todos antes do jogo começar)
  const M = {
    culm: B.M.culm.clone(), leaf: B.M.leaf.clone(),
    flesh: new THREE.MeshStandardMaterial({ color: 0xe6dcb0, roughness: 0.75, side: THREE.DoubleSide }), // a parede do colmo, por dentro
    hollow: new THREE.MeshStandardMaterial({ color: 0x5a5230, roughness: 1, side: THREE.DoubleSide }), // o oco
    straw: new THREE.MeshStandardMaterial({ roughness: 1, color: 0xd8d0c0, map: canvasTex(128, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9c8048'); gr.addColorStop(0.5, '#b39a5c'); gr.addColorStop(1, '#9a7e46'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { x.strokeStyle = ['#d2bb7c', '#8a6e36', '#c4a862', '#e2d29a', '#74592a', '#b89c58'][i % 6]; x.globalAlpha = 0.55 + Math.random() * 0.45; x.lineWidth = 0.6 + Math.random() * 1.4; const sx = Math.random() * w, y0 = Math.random() * h * 0.3 - 20, len = h * (0.5 + Math.random() * 0.7), wv = (Math.random() - 0.5) * 8; x.beginPath(); x.moveTo(sx, y0); x.quadraticCurveTo(sx + wv, y0 + len / 2, sx + (Math.random() - 0.5) * 4, y0 + len); x.stroke(); }
      x.globalAlpha = 1; for (const by of [0.2, 0.62]) { const yb = h * (1 - by); x.fillStyle = '#4a3418'; x.fillRect(0, yb - 7, w, 14); x.strokeStyle = '#7a5a2e'; x.lineWidth = 2; for (let k = -14; k < w + 14; k += 6) { x.beginPath(); x.moveTo(k, yb - 7); x.lineTo(k + 8, yb + 7); x.stroke(); } x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, yb + 7, w, 3); } }) }), // os fios de palha e as duas amarras de corda torcida
    strawEnds: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, alphaTest: 0.35, map: canvasTex(64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 140; i++) { x.strokeStyle = ['#d2bb7c', '#a8894a', '#e2d29a', '#8a6e36'][i % 4]; x.lineWidth = 1 + Math.random(); const sx = Math.random() * w; x.beginPath(); x.moveTo(sx, h); x.lineTo(sx + (Math.random() - 0.5) * 22, h * (0.05 + Math.random() * 0.6)); x.stroke(); } }) }), // as pontas soltas e desfiadas no alto do feixe
    strawCut: new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#d8bf78'; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { x.fillStyle = ['#efd890', '#b8964a', '#f6e6b0'][i % 3]; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }) }), // a ponta dos fios cortados
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.85 }),
    bits: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }),
    spark: new THREE.MeshBasicMaterial({ color: 0xffd28a, side: THREE.DoubleSide, toneMapped: false }),
  };
  M.culm.color.setRGB(0.94, 0.98, 0.88); M.leaf.color.setRGB(0.94, 0.98, 0.88); // (o tom médio do bambuzal)
  const bits = new Bits(scene, M.bits, 320), sparks = new Bits(scene, M.spark, 60);
  { const tpl = new THREE.Group(); tpl.position.set(0, -800, 0); for (const m of Object.values(M)) tpl.add(new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), m)); scene.add(tpl); } // (para o aquecimento)

  // ---- o bambuzal: grade de 4 m para achar os colmos perto da espada
  const grid = new Map(), K = (x, z) => Math.floor(x / 4) * 100003 + Math.floor(z / 4);
  for (const p of B.list) { const k = K(p[0], p[2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), tmpM = new THREE.Matrix4();
  const stumps = [], falling = [];
  const rad = (yl) => 0.062 + (0.045 - 0.062) * (yl / 11); // o raio do colmo na altura local

  function cutBamboo(p, Hc, n, F, at) {
    const [x, y, z, s, r] = p, base = y - 0.3, yl = (Hc - base) / s;
    // o plano no espaço do colmo (girado r, escala s)
    const c = Math.cos(-r), sn = Math.sin(-r), nL = new V3(n.x * c + n.z * sn, n.y, -n.x * sn + n.z * c).normalize(), p0 = new V3(B.bend(yl), yl, 0);
    const R = rad(yl);
    // esconde o colmo inteiro e põe o toco no lugar
    p.saved = p.refs.map(([im, i]) => { im.getMatrixAt(i, tmpM); const m = tmpM.clone(); im.setMatrixAt(i, ZERO); im.instanceMatrix.needsUpdate = true; return m; });
    const stump = new THREE.Group(); stump.position.set(x, base, z); stump.rotation.y = r; stump.scale.setScalar(s);
    const sg = new THREE.Mesh(slice(B.culm, nL, p0, true), M.culm); sg.castShadow = true; stump.add(sg);
    stump.add(new THREE.Mesh(face(R * 0.72, R * 1.02, nL, p0, 0.002), M.flesh), new THREE.Mesh(face(0, R * 0.74, nL, p0, -0.03), M.hollow));
    scene.add(stump); stumps.push({ p, g: stump, t: 0 });
    // a parte de cima: gira em volta do ponto do corte
    const top = new THREE.Group(); top.position.set(x, base, z); top.rotation.y = r; top.scale.setScalar(s);
    const tg = new THREE.Mesh(slice(B.culm, nL, p0, false), M.culm), lv = new THREE.Mesh(B.bTop, M.leaf); tg.castShadow = lv.castShadow = true;
    top.add(tg, lv, new THREE.Mesh(face(R * 0.72, R * 1.02, nL, p0, -0.002), M.flesh), new THREE.Mesh(face(0, R * 0.74, nL, p0, 0.03), M.hollow));
    const C = new V3(x + B.bend(yl) * Math.cos(r) * s, Hc, z - B.bend(yl) * Math.sin(r) * s), pivot = new THREE.Group(); pivot.position.copy(C);
    top.position.sub(C); pivot.add(top); scene.add(pivot);
    // cai para longe da espada e para o lado em que o corte desce (a parte de cima escorrega pelo plano)
    const S = new V3(n.x, 0, n.z); const slide = S.length() > 0.05 ? S.normalize() : F.clone();
    const dir = F.clone().multiplyScalar(0.7).addScaledVector(slide, 0.7).normalize();
    falling.push({ kind: 'bamboo', pivot, top, C: C.clone(), dir, axis: new V3().crossVectors(UP, dir).normalize(), slide, ang: 0, w: 0.15, t: 0, bounce: 0, rest: 0, g: groundAt(C.x + dir.x * 5, C.z + dir.z * 5, C.y + 2) });
    // as lascas no corte e as folhas soltas lá de cima
    bits.emit(C, 7, { dir: at, push: 2.2, spread: 0.8, up: 1.4, size: [0.05, 0.03], color: [0xe6dcb0, 0x8aa050, 0xd8cc98], life: 3.5, drag: 0.6 });
    bits.emit(new V3(x, base + 8 * s, z), 22, { box: [3, 4, 3], spread: 0.4, up: 0, size: [0.17, 0.045], color: [0x6f8f3e, 0x88a24c, 0xa8b060, 0x5e7a34], life: 14, drag: 3.2, g: 3.5, flutter: 2.2, spin: 3 });
  }

  // ---- os feixes de palha (wara) no pátio do dōjō, em suportes de madeira
  const straws = [];
  const RH = 1.05, RY = 0.78, RR = 0.125, rollGeo = new THREE.CylinderGeometry(RR, RR, RH, 20, 24, true); rollGeo.translate(0, RH / 2, 0);
  { const p = rollGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), hy = y / RH;
      let k = 1 + 0.05 * Math.sin(a * 3 + y * 7) + 0.03 * Math.sin(a * 7 - y * 13) + 0.05 * hy; // (feixe torto e mais cheio no alto)
      for (const b of [0.2, 0.62]) k -= 0.1 * Math.exp(-((((hy - b) * RH) / 0.035) ** 2)); // (a corda aperta a palha)
      p.setX(i, x * k); p.setZ(i, z * k); } rollGeo.computeVertexNormals(); }
  const crownGeo = (() => { const parts = []; for (let i = 0; i < 4; i++) { const g = new THREE.PlaneGeometry(RR * 2.6, 0.16); g.translate(0, 0.07, 0); g.rotateY((i * Math.PI) / 4); parts.push(g); } const d = new THREE.CircleGeometry(RR * 1.08, 20); d.rotateX(-Math.PI / 2); d.translate(0, 0.005, 0); return { tuft: mergeGeos(parts), disc: d }; })();
  if (city.dojo) {
    const f = city.dojo.f, d = city.dojo.d, y = city.dojo.y;
    for (const [lx, lz] of [[-5.5, d / 2 + 3.6], [-3.4, d / 2 + 4.4], [3.4, d / 2 + 4.4], [5.5, d / 2 + 3.6]]) {
      const [x, z] = f.W(lx, lz), gy = groundAt(x, z, y + 1);
      const g = new THREE.Group(); g.position.set(x, gy, z); scene.add(g);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), M.wood); base.position.y = 0.06; base.castShadow = true; g.add(base);
      for (const a of [0, Math.PI / 2]) { const ft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.09), M.wood); ft.position.y = 0.035; ft.rotation.y = a; g.add(ft); } // (os pés em cruz)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, RY + 0.25, 8), M.wood); post.position.y = (RY + 0.25) / 2; post.castShadow = true; g.add(post);
      const col = addCircle(x, z, 0.16, gy - 1, gy + RY + RH);
      const s = { g, x, z, y: gy, col, roll: null, cap: null, top: 0, t: 0, cuts: 0 }; straws.push(s); newRoll(s);
    }
  }
  function newRoll(s) {
    if (s.roll) { s.g.remove(s.roll); if (s.roll.geometry !== rollGeo) s.roll.geometry.dispose(); } if (s.cap) { s.g.remove(s.cap); s.cap.traverse((m) => { if (m.isMesh && m.geometry !== crownGeo.tuft && m.geometry !== crownGeo.disc) m.geometry.dispose(); }); }
    s.roll = new THREE.Mesh(rollGeo, M.straw); s.roll.position.y = RY; s.roll.castShadow = true; s.g.add(s.roll);
    s.cap = new THREE.Group(); s.cap.position.y = RY + RH; s.cap.add(new THREE.Mesh(crownGeo.tuft, M.strawEnds), new THREE.Mesh(crownGeo.disc, M.strawCut)); s.g.add(s.cap); /* (o alto do feixe: as pontas soltas da palha; vai embora com o primeiro pedaço cortado) */ s.top = s.y + RY + RH; s.t = 0; s.cuts = 0;
  }
  function cutStraw(s, Hc, n, F, at) {
    const yl = Hc - s.y - RY, p0 = new V3(0, yl, 0), cur = s.roll.geometry;
    const low = new THREE.Mesh(slice(cur, n, p0, true), M.straw), up = new THREE.Mesh(slice(cur, n, p0, false), M.straw);
    low.position.y = up.position.y = RY; low.castShadow = up.castShadow = true;
    const capL = new THREE.Mesh(face(0, RR * 1.2, n, p0, 0.002), M.strawCut), capU = new THREE.Mesh(face(0, RR * 1.2, n, p0, -0.002), M.strawCut); capL.position.y = capU.position.y = RY;
    // a peça de cima leva a face do corte anterior; o feixe que fica, a nova
    const piece = new THREE.Group(); piece.add(up, capU); if (s.cap) piece.add(s.cap);
    s.g.remove(s.roll); if (s.roll.geometry !== rollGeo) s.roll.geometry.dispose(); s.roll = low; s.cap = capL; s.g.add(low, capL);
    s.top = s.y + RY + yl; s.cuts++; s.t = 0;
    // a peça voa: gira em volta do próprio meio
    const mid = (Hc + Math.max(Hc, s.topWas ?? s.y + RY + RH)) / 2, C = new V3(s.x, mid, s.z), hold = new THREE.Group(); hold.position.copy(C);
    piece.position.set(s.x - C.x, s.y - C.y, s.z - C.z); hold.add(piece); scene.add(hold); s.topWas = s.top;
    const slide = new V3(n.x, 0, n.z); if (slide.length() > 0.05) slide.normalize();
    falling.push({ kind: 'straw', hold, v: F.clone().multiplyScalar(1.6).addScaledVector(slide, 1.4).add(new V3(0, 1.3, 0)), w: new V3().crossVectors(UP, F).normalize().multiplyScalar(5 + Math.random() * 3), t: 0, rest: 0 });
    bits.emit(new V3(s.x, Hc, s.z), 26, { dir: at, push: 2, spread: 1.0, up: 1.2, size: [0.14, 0.012], color: [0xc4aa68, 0xa8894a, 0xd8c488], life: 6, drag: 2.0, g: 5, flutter: 1.2, spin: 9 });
  }

  // ---- o golpe: chamado a cada quadro da janela de corte
  let swingDone = -1, swingHits = 0, swingClang = -1;
  const tipW = new V3(), midW = new V3();
  function hit(clip, swing, parts) {
    const CU = CUTS[clip]; if (!CU) return;
    if (swing !== swingDone) { swingDone = swing; swingHits = 0; }
    const P = player.pos, f = player.facing, F = new V3(Math.sin(f), 0, Math.cos(f)), Rt = new V3(-Math.cos(f), 0, Math.sin(f));
    const t = THREE.MathUtils.degToRad(CU.tilt), n = UP.clone().multiplyScalar(Math.cos(t)).addScaledVector(Rt, Math.sin(t)).normalize(), Hc = P.y + CU.h, arc = THREE.MathUtils.degToRad(CU.arc);
    const at = Rt.clone().multiplyScalar(-Math.sign(CU.tilt) || 1); // (para onde as lascas voam: o lado para onde a lâmina corre)
    const inArc = (x, z) => { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d < 0.25 || d > REACH) return false; let a = Math.atan2(dx, dz) - f; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) <= arc; };
    let cutNow = 0;
    // os feixes de palha (um por golpe em cada feixe)
    for (const s of straws) {
      if (s.lastSwing === swing || !inArc(s.x, s.z)) continue;
      if (Hc < s.y + RY + 0.08 || Hc > s.top - 0.06) continue;
      s.lastSwing = swing; cutStraw(s, Hc, n, F, at); cutNow++;
      tell('palha', 'Os samurais testavam o corte em feixes de palha de arroz bem amarrados. O fio precisa entrar no ângulo certo: torto, a lâmina empurra a palha em vez de cortar.');
    }
    // o bambu
    if (swingHits < MAX_BAMBOO) {
      const i0 = Math.floor(P.x / 4), j0 = Math.floor(P.z / 4);
      for (let i = i0 - 1; i <= i0 + 1 && swingHits < MAX_BAMBOO; i++) for (let j = j0 - 1; j <= j0 + 1 && swingHits < MAX_BAMBOO; j++) {
        const L = grid.get(i * 100003 + j); if (!L) continue;
        for (const p of L) {
          if (p.saved || !inArc(p[0], p[2])) continue;
          const base = p[1] - 0.3; if (Hc < base + 0.3 || Hc > base + 6 * p[3]) continue;
          cutBamboo(p, Hc, n, F, at); swingHits++; cutNow++;
          tell('bambu', 'O bambu é duro por fora e oco por dentro, dividido pelos nós. Um corte limpo e inclinado é sinal de espada bem afiada e de mão firme.');
          if (swingHits >= MAX_BAMBOO) break;
        }
      }
    }
    if (cutNow) {
      player.hitStop = Math.max(player.hitStop || 0, 0.065); player.shake = Math.max(player.shake || 0, 0.06);
      if (swingHits) audio?.cutBamboo?.(); else audio?.cutStraw?.();
      return;
    }
    // a lâmina bateu em algo duro (parede, pedra, madeira): tine, faísca e trava um instante
    if (swingClang === swing || !parts?.tip) return;
    parts.tip.getWorldPosition(tipW); parts.mid.getWorldPosition(midW);
    for (const q of [tipW, midW.lerp(tipW, 0.5)]) {
      if (q.y < P.y + 0.35 || !solidAt(q.x, q.y, q.z)) continue;
      swingClang = swing; player.hitStop = Math.max(player.hitStop || 0, 0.11); player.shake = Math.max(player.shake || 0, 0.1);
      sparks.emit(q, 14, { spread: 2.6, up: 1.5, size: [0.035, 0.01], color: [0xffd28a, 0xffb050, 0xfff0c0], life: 0.45, drag: 1.5, g: 9.8, spin: 20 });
      audio?.clang?.(); break;
    }
  }

  function update(dt) {
    for (const s of straws) s.col.enabled = false; /* (a coluna de colisão do suporte não é chão: o pedaço cortado pousava em cima dela, parado no ar) */
    try { step(dt); } finally { for (const s of straws) s.col.enabled = true; }
  }
  function step(dt) {
    const P = player.pos;
    for (let i = falling.length - 1; i >= 0; i--) {
      const o = falling[i]; o.t += dt;
      if (o.kind === 'bamboo') {
        if (!o.rest) {
          if (o.t < 0.22) { o.pivot.position.addScaledVector(o.slide, 0.8 * dt); o.pivot.position.y -= 0.35 * dt; } // (escorrega pelo corte)
          o.w += (0.5 + 2.4 * Math.sin(o.ang)) * dt; o.ang += o.w * dt;
          const AM = Math.PI / 2 - 0.04, k = Math.min(1, o.ang / AM);
          o.pivot.position.y = THREE.MathUtils.lerp(o.C.y, o.g + 0.07, k * k);
          if (o.ang >= AM) { o.ang = AM; if (o.bounce < 2 && o.w > 0.6) { o.bounce++; o.w = -o.w * 0.18; if (o.bounce === 1) { if (P.distanceTo(o.pivot.position) < 40) { audio?.fall?.(); player.shake = Math.max(player.shake || 0, 0.03); } bits.emit(o.pivot.position.clone().addScaledVector(o.dir, 6), 12, { box: [2, 1, 2], spread: 0.6, up: 1.2, size: [0.17, 0.045], color: [0x6f8f3e, 0x88a24c], life: 8, drag: 3, g: 4, flutter: 2 }); } } else { o.rest = 0.001; o.w = 0; } }
          o.pivot.quaternion.setFromAxisAngle(o.axis, o.ang);
        } else { o.rest += dt; if (o.rest > 25) { o.pivot.position.y -= dt * 0.4; if (o.rest > 28) { scene.remove(o.pivot); o.top.traverse((m) => { if (m.isMesh && m.geometry !== B.bTop) m.geometry.dispose(); }); falling.splice(i, 1); } } }
      } else {
        const h = o.hold;
        if (!o.rest) {
          o.v.y -= 9.8 * dt; h.position.addScaledVector(o.v, dt);
          const dq = new THREE.Quaternion().setFromAxisAngle(o.w.clone().normalize(), o.w.length() * dt); h.quaternion.premultiply(dq);
          const gy = groundAt(h.position.x, h.position.z, h.position.y + 0.3) + RR;
          if (h.position.y < gy) { h.position.y = gy; if (o.v.y < -0.8) { o.v.y *= -0.3; o.v.x *= 0.6; o.v.z *= 0.6; o.w.multiplyScalar(0.5); } else { o.v.set(0, 0, 0); o.rest = 0.001; } }
        } else {
          o.rest += dt;
          // deita: o eixo do feixe vai para o chão
          const ax = new V3(0, 1, 0).applyQuaternion(h.quaternion), flat = new V3(ax.x, 0, ax.z); if (flat.length() < 0.01) flat.set(1, 0, 0); flat.normalize();
          h.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(ax, flat).multiply(h.quaternion), Math.min(1, dt * 4));
          if (o.rest > 20) { h.position.y -= dt * 0.3; if (o.rest > 22) { scene.remove(h); h.traverse((m) => { if (m.isMesh && m.geometry !== rollGeo) m.geometry.dispose(); }); falling.splice(i, 1); } }
        }
      }
    }
    // os feixes cortados são trocados por novos (o bambu só volta com a estação: regrow)
    for (const s of straws) if (s.cuts) { s.t += dt; if ((s.t > 25 || s.top - s.y - RY < 0.2) && s.t > 4 && Math.hypot(P.x - s.x, P.z - s.z) > 4) { newRoll(s); s.topWas = null; } }
    bits.update(dt); sparks.update(dt);
  }
  // a estação mudou: todo o bambu cortado cresce de novo
  function regrow() {
    for (const s of stumps) { s.p.refs.forEach(([im, k], j) => { im.setMatrixAt(k, s.p.saved[j]); im.instanceMatrix.needsUpdate = true; }); s.p.saved = null; scene.remove(s.g); s.g.traverse((m) => m.isMesh && m.geometry.dispose()); }
    stumps.length = 0;
  }
  return { hit, update, regrow, straws, stumps, falling };
}
