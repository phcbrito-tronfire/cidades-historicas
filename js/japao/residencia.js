// A residência do senhor local (jin'ya): a casa-escritório de onde um vassalo (hatamoto) ou o representante do
// xogunato governava a região — cobrava o imposto em arroz, julgava as brigas e cuidava das estradas e da
// montanha. Muro branco com telhado de telha, o portão longo (nagaya-mon) com a guarita, o salão principal com a
// sala de audiências (o estrado do senhor, o tokonoma), o jardim com lago, ponte e lanternas, o dōjō de esgrima,
// a raia de arco (kyūdō) com o pavilhão de tiro e os alvos a 28 m, o estábulo, o poço e os armazéns de arroz.
// Fictícia: não havia um jin'ya famoso exatamente aqui, mas era assim nas vilas sob o governo direto do xogum.
import * as THREE from 'three';
import { addCircle } from '../comum/collision.js';
import { frame, toro } from './kit.js';
import { house, kura } from './vila.js';
import { RESIDENCE, LEVEL } from './terrain.js';

const V3 = THREE.Vector3;

export function buildResidence(B, M, out) {
  const R = RESIDENCE, Y = LEVEL.residence, cx = R.x, cz = R.z, W = R.w - 8, D = R.d - 8, hw = W / 2, hd = D / 2;
  const f = frame(B, cx, Y, cz, Math.PI / 2); // o portão olha para o leste (para a vila); local +z = leste
  // o muro (dobei): base de pedra, reboco branco, telhadinho de telha; o portão no meio da frente
  const wallSeg = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ax = Math.abs(x1 - x0) > 0.1;
    f.box(M.stone, ax ? L : 1.0, 0.7, ax ? 1.0 : L, mx, -0.3, mz); f.box(M.plaster, ax ? L : 0.6, 2.0, ax ? 0.6 : L, mx, 0.4, mz);
    f.roof(M.kawara, ax ? L + 0.4 : 1.6, ax ? 1.6 : L + 0.4, 0.45, 2.4, { thick: 0.12, sori: 0.05, gable: true, seg: 3 }, mx, mz);
    f.solid(mx, mz, ax ? L : 0.8, ax ? 0.8 : L, -1, 2.8); };
  // (a água de cima do telhadinho tem a cumeeira no eixo x local: as paredes do eixo z giram o telhado)
  const wallZ = (x, z0, z1) => { const L = Math.abs(z1 - z0), mz = (z0 + z1) / 2; f.box(M.stone, 1.0, 0.7, L, x, -0.3, mz); f.box(M.plaster, 0.6, 2.0, L, x, 0.4, mz);
    f.geo(roofZ(L + 0.4), M.kawara, x, 2.4, mz, { uv: M.kawara.userData.uv }); f.solid(x, mz, 0.8, L, -1, 2.8); };
  wallSeg(-hw, -hd, hw, -hd); wallZ(-hw, -hd, hd); wallZ(hw, -hd, hd);
  wallSeg(-hw, hd, -6, hd); wallSeg(6, hd, hw, hd);
  // o portão longo: dois blocos com a guarita e o alojamento dos guardas, e o vão das portas pesadas
  for (const sd of [-1, 1]) { f.box(M.plaster, 4.5, 3.2, 4.5, sd * 4.5, 0, hd); f.box(M.namako, 4.54, 1.0, 4.54, sd * 4.5, 0, hd); f.solid(sd * 4.5, hd, 4.5, 4.5, -1, 3.2);
    for (let i = 0; i < 4; i++) f.box(M.blackWood, 0.08, 0.7, 0.1, sd * 4.5 - 0.6 + i * 0.4, 1.6, hd + 2.28); }
  for (const sd of [-1, 1]) f.post(M.blackWood, sd * 2.1, hd, 3.6, 0.22);
  f.box(M.blackWood, 4.6, 0.4, 0.5, 0, 3.2, hd); f.box(M.blackWood, 1.9, 3.1, 0.14, -1.3, 0, hd + 0.9, { ry: -1.2 }); f.box(M.blackWood, 1.9, 3.1, 0.14, 1.3, 0, hd + 0.9, { ry: 1.2 }); // as folhas abertas
  for (let i = 0; i < 5; i++) f.geo(new THREE.SphereGeometry(0.05, 6, 4), M.iron, -1.6 + i * 0.15, 2.3, hd + 1.3, { uv: false });
  f.roof(M.kawara, 15, 6.2, 1.9, 3.6, { thick: 0.22, sori: 0.2, irimoya: true }, 0, hd);
  f.box(M.kawara, 9.4, 0.4, 0.45, 0, 3.6 + 1.7, hd);
  out.spots.residenceGate = new V3(...(() => { const [a, b] = f.W(0, hd + 4); return [a, Y, b]; })());
  out.guards.push(...[[-2.6, hd + 1.6, 0], [2.6, hd + 1.6, 0]].map(([a, b, r]) => { const [x, z] = f.W(a, b); return { x, z, ry: Math.PI / 2 + r }; }));
  // o pátio de cascalho e o caminho de lajes até o salão
  f.box(M.earthFloor, W - 2, 0.06, D - 2, 0, 0.02, 0);
  for (let i = 0; i < 12; i++) f.box(M.stoneLight, 1.6, 0.1, 1.0, 0, 0.05, hd - 3 - i * 1.3);
  // o salão principal (shoin), telhado de telha, com a sala de audiências
  { const sz = -hd + 15, sx = -4, w = 24, d = 14;
    house(B, M, out, { x: f.W(sx, sz)[0], z: f.W(sx, sz)[1], ry: Math.PI / 2, w, d, roof: 'kawara', front: 'shoji', engawa: true, kind: 'lord', doma: 3.6, h: 3.1 });
    // o estrado do senhor (jōdan-no-ma) e o apoio de braço, na sala do fundo
    const g = frame(B, ...f.W(sx, sz).flatMap((v, i) => (i === 0 ? [v, Y + 0.05] : [v])), Math.PI / 2);
    g.box(M.tatami, 4.4, 0.22, 3.6, w / 2 - 3, 0.45, -1.5); g.box(M.blackWood, 0.9, 0.3, 0.3, w / 2 - 3, 0.67, -2.5); g.box(M.gold, 2.6, 1.7, 0.04, w / 2 - 3, 0.45, -d / 2 + 0.2); // o biombo dourado (em pé no assoalho)
    out.spots.audience = new V3(...(() => { const [a, b] = g.W(w / 2 - 6, -1.5); return [a, Y + 0.5, b]; })()); out.spots.lordSeat = new V3(...(() => { const [a, b] = g.W(w / 2 - 3, -1.8); return [a, Y + 0.67, b]; })());
  }
  // o jardim com lago, ponte arqueada, pedras e lanternas (no canto sudoeste, de frente para o lago Kawaguchi)
  { const gx = -hw + 13, gz = hd - 13, f2 = frame(B, ...f.W(gx, gz).flatMap((v, i) => (i === 0 ? [v, Y] : [v])), Math.PI / 2);
    f2.geo(new THREE.CylinderGeometry(5.5, 5.5, 0.06, 28), M.water, 0, -0.2, 0, { sz: 0.65, uv: false });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; f2.geo(new THREE.DodecahedronGeometry(0.45 + (i % 3) * 0.15, 0), M.stone, Math.cos(a) * 5.7, 0.05, Math.sin(a) * 3.7, { uv: false }); }
    for (let i = 0; i < 7; i++) { const t = (i - 3) / 3; f2.box(M.vermilion, 0.6, 0.12, 1.4, t * 2.4, 0.5 - t * t * 0.45, 0); } f2.solid(0, 0, 5, 1.4, -1, 0.5, true); // a ponte
    const [tx, tz] = f2.W(4, -3); toro(B, M, out, tx, Y, tz, 1.1); const [px, pz] = f2.W(-5, 3.8); B.geo(new THREE.SphereGeometry(0.9, 9, 6), M.moss, px, Y + 1.4, pz, { sy: 0.5, uv: false }); B.geo(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 7), M.darkWood, px, Y + 0.8, pz, { uv: false });
    out.spots.garden = new V3(...(() => { const [a, b] = f2.W(0, 4); return [a, Y, b]; })()); }
  // o dōjō: piso de tábuas, os suportes das espadas de madeira, a placa
  { const dx = hw - 12, dz = -hd + 10, w = 14, d = 10, g = frame(B, ...f.W(dx, dz).flatMap((v, i) => (i === 0 ? [v, Y] : [v])), Math.PI / 2), FL = 0.5;
    g.box(M.stoneLight, w + 0.3, 0.3, d + 0.3, 0, -0.25, 0); g.box(M.cedar, w, FL, d, 0, 0, 0); g.solid(0, 0, w, d, -1, FL, true);
    for (const [sx, sz, sw, sdd] of [[w / 2 + 0.45, 0, 0.7, 2.4], [0, d / 2 + 0.45, 3, 0.7]]) { g.box(M.stone, sw, 0.26, sdd, sx, 0, sz); g.solid(sx, sz, sw, sdd, -1, 0.26, true); } // as pedras de degrau das duas entradas
    for (const [px, pz] of [[-w / 2, -d / 2], [0, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) g.post(M.darkWood, px, pz, 3.6, 0.14); // (sem pilar no meio da entrada)
    g.wall(M.plaster, -w / 2, -d / 2, w / 2, -d / 2, 3.0, 0.12, [], { y0: FL }); g.wall(M.plaster, -w / 2, -d / 2, -w / 2, d / 2, 3.0, 0.12, [[d / 2, 1.8, 2.2]], { y0: FL });
    g.wall(M.koshi, w / 2, -d / 2, w / 2, d / 2, 3.0, 0.08, [[d / 2, 3.4, 2.4]], { y0: FL }); g.wall(M.koshi, -w / 2, d / 2, w / 2, d / 2, 3.0, 0.08, [[w / 2, 4.0, 2.4]], { y0: FL });
    for (let i = 0; i < 10; i++) g.geo(new THREE.CylinderGeometry(0.025, 0.03, 1.0, 6), M.wood, -w / 2 + 2 + i * 0.4, FL + 1.3, -d / 2 + 0.2, { rz: 0.0, uv: false }); // espadas de madeira (bokken) no suporte
    for (const yy of [0.85, 1.72]) g.box(M.darkWood, 4.4, 0.08, 0.12, -w / 2 + 3.8, FL + yy, -d / 2 + 0.2); for (const xx of [-w / 2 + 1.6, -w / 2 + 6]) g.box(M.darkWood, 0.1, 1.8, 0.12, xx, FL, -d / 2 + 0.2); // o suporte
    g.box(M.wood, 2.2, 0.6, 0.06, 0, FL + 2.5, -d / 2 + 0.12); g.box(M.dark, 1.8, 0.4, 0.02, 0, FL + 2.6, -d / 2 + 0.16);
    g.roof(M.kawara, w + 2.6, d + 2.6, (d + 2.6) * 0.36, FL + 3.6, { thick: 0.2, sori: 0.3, irimoya: true }); g.solid(0, 0, w + 1, d + 1, FL + 3.65, FL + 6, true); // (o teto segura a câmera)
    out.spots.dojo = new V3(...(() => { const [a, b] = g.W(0, 0); return [a, Y + FL, b]; })()); out.dojo = { f: g, w, d, FL, y: Y }; }
  // a raia de arco: o pavilhão de tiro (shajō), a areia e o montículo dos alvos (azuchi) a 28 m
  { const g = frame(B, cx - 8, Y, cz - 26, Math.PI / 2); // ao longo do muro norte, atirando para o leste
    g.box(M.cedar, 8, 0.4, 4, 0, 0, 0); g.solid(0, 0, 8, 4, -1, 0.4, true); for (const px of [-4, 0, 4]) g.post(M.darkWood, px, -2, 3.2, 0.12);
    g.roof(M.kawara, 9.5, 5.2, 1.4, 3.2, { thick: 0.18, sori: 0.2, gable: true });
    g.box(M.earthFloor, 6, 0.04, 28, 0, 0.02, 16); g.box(M.earthFloor, 8, 2.4, 3, 0, 0, 31); g.solid(0, 31, 8, 3, -1, 2.4); g.roof(M.thatch, 9, 3.6, 1.1, 2.6, { thick: 0.3, sori: 0.05, gable: true }, 0, 31);
    for (let i = 0; i < 4; i++) { g.geo(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 20), M.paper, -2.4 + i * 1.6, 1.0, 29.4, { rx: Math.PI / 2, uv: false }); g.geo(new THREE.RingGeometry(0.08, 0.13, 20), M.dark, -2.4 + i * 1.6, 1.0, 29.35, { ry: Math.PI, uv: false }); }
    out.range = { f: g, y: Y + 0.4, from: g.W(0, 0.6), to: g.W(0, 29.3), targets: [0, 1, 2, 3].map((i) => g.W(-2.4 + i * 1.6, 29.4)) };
    out.spots.range = new V3(...(() => { const [a, b] = g.W(3, -1.5); return [a, Y, b]; })()); }
  // o estábulo, o poço e os armazéns de arroz (o imposto)
  { const sx = -hw + 8, sz = -hd + 8, g = frame(B, ...f.W(sx, sz).flatMap((v, i) => (i === 0 ? [v, Y] : [v])), Math.PI / 2);
    for (const px of [-5, 0, 5]) for (const pz of [-2.5, 2.5]) g.post(M.darkWood, px, pz, 2.8, 0.12);
    g.wall(M.wood, -5, -2.5, 5, -2.5, 2.6, 0.1); g.wall(M.wood, -5, -2.5, -5, 2.5, 2.6, 0.1); g.wall(M.wood, 5, -2.5, 5, 2.5, 2.6, 0.1);
    for (const px of [-2.5, 2.5]) g.wall(M.wood, px, -2.5, px, 0.8, 1.3, 0.08);
    g.box(M.straw, 9.6, 0.12, 4.8, 0, 0.02, 0); g.box(M.wood, 1.2, 0.5, 0.5, -3.7, 0.6, -2.0); g.box(M.wood, 1.2, 0.5, 0.5, 3.7, 0.6, -2.0); // feno e os cochos
    g.roof(M.thatch, 12, 7, 2.4, 2.8, { thick: 0.5, sori: 0.05 });
    out.spots.stable = new V3(...(() => { const [a, b] = g.W(0, 4.5); return [a, Y, b]; })()); }
  { const [wx, wz] = f.W(-6, 4); B.geo(new THREE.CylinderGeometry(0.75, 0.8, 0.75, 16, 1, true), M.stone, wx, Y + 0.37, wz, { uv: false }); B.geo(new THREE.CircleGeometry(0.7, 16), M.dark, wx, Y + 0.6, wz, { rx: -Math.PI / 2, uv: false });
    for (const sd of [-1, 1]) B.box(M.darkWood, 0.12, 2.0, 0.12, wx + sd * 0.9, Y, wz); B.box(M.darkWood, 2.0, 0.12, 0.12, wx, Y + 2.0, wz); addCircle(wx, wz, 0.85, Y - 1, Y + 0.75); }
  for (const [a, b] of [[-hw + 6, 6], [-hw + 6, -2]]) { const [x, z] = f.W(a, b); kura(B, M, out, x, z, Math.PI, 5.5, 4.2); }
  out.zones.residence = [cx - R.w / 2, cx + R.w / 2, cz - R.d / 2, cz + R.d / 2];
}

// telhadinho de duas águas com a cumeeira no eixo z (para os muros que correm de norte a sul no quadro local)
function roofZ(L) {
  const a = 0.8, h = 0.45, t = 0.12, z = L / 2;
  const p = [-a, 0, z, 0, h, -z, 0, h, z, -a, 0, z, -a, 0, -z, 0, h, -z, a, 0, -z, 0, h, z, 0, h, -z, a, 0, -z, a, 0, z, 0, h, z,
    -a, -t, z, 0, h - t, z, 0, h - t, -z, -a, -t, z, 0, h - t, -z, -a, -t, -z, a, -t, -z, 0, h - t, -z, 0, h - t, z, a, -t, -z, 0, h - t, z, a, -t, z];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3 * 2), 2)); return g;
}
