// Os lugares para descobrir entre a vila e a montanha:
// - as aldeias espalhadas (a dos pescadores, com o píer, os barcos e as redes secando; a dos lavradores a leste;
//   a dos lenhadores e carvoeiros na beira da floresta; a do norte, perto do templo);
// - o moinho d'água (suisha) no riacho, com a roda girando;
// - a plantação de chá em fileiras redondas na encosta do templo;
// - o caminho dos torii vermelhos de Inari (o kami do arroz), até o santuarinho com as raposas de pedra
//   (as raposas são as mensageiras de Inari — não são deuses, e não são a raposa de verdade da floresta);
// - o pagode de três andares do templo;
// - no fundo plano da cratera do Fuji, uma casinha de eremita, a cerejeira e o laguinho (isto é fantasia do jogo:
//   no período Edo ninguém morava no cume — havia só os santuários e as cabanas da borda).
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { mulberry32 } from '../comum/util.js';
import { frame, toro, torii, nobori, roofGeo } from './kit.js';
import { house, kura } from './vila.js';
import { terrainHeight, HAMLETS, TEA, INARI, MILL, FUJI, TEMPLE, LEVEL, inLake, polyDist, STREAM } from './terrain.js';

const V3 = THREE.Vector3;
const rnd = mulberry32(1795);
const rr = (a, b) => a + rnd() * (b - a);

function hamlet(B, M, out, H) {
  let placed = 0;
  for (let k = 0; k < H.n * 4 && placed < H.n; k++) {
    const a = rnd() * 6.28, d = rr(8, H.r - 6), x = H.x + Math.cos(a) * d, z = H.z + Math.sin(a) * d;
    if (inLake(x, z, 6) || polyDist(STREAM, x, z).d < 12) continue;
    const hs = [[-8, -6], [8, -6], [-8, 6], [8, 6]].map(([p, q]) => terrainHeight(x + p, z + q)); if (Math.max(...hs) - Math.min(...hs) > 1.8) continue;
    if (out.houses.some((h) => Math.hypot(h.x - x, h.z - z) < 17)) continue;
    const ry = H.ry + rr(-0.35, 0.35);
    house(B, M, out, { x, z, ry, w: rr(11, 14), d: rr(8, 10), roof: 'thatch', front: 'shoji', kind: 'farm', doma: 4.4 });
    if (placed % 2 === 0) kura(B, M, out, x + Math.cos(ry) * 10, z - Math.sin(ry) * 10, ry, 4, 3.2);
    placed++;
  }
  // o poço e o Jizō da aldeia
  { const y = terrainHeight(H.x, H.z); B.geo(new THREE.CylinderGeometry(0.7, 0.75, 0.75, 14, 1, true), M.stone, H.x, y + 0.37, H.z, { uv: false }); for (const sd of [-1, 1]) B.box(M.darkWood, 0.1, 1.9, 0.1, H.x + sd * 0.85, y, H.z); B.box(M.darkWood, 1.9, 0.1, 0.1, H.x, y + 1.9, H.z); addCircle(H.x, H.z, 0.8, y - 1, y + 0.75);
    const jx = H.x + 4, jy = terrainHeight(jx, H.z); B.geo(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 10), M.stoneLight, jx, jy + 0.3, H.z, { uv: false }); B.geo(new THREE.SphereGeometry(0.15, 10, 8), M.stoneLight, jx, jy + 0.72, H.z, { uv: false }); B.geo(new THREE.ConeGeometry(0.24, 0.28, 10, 1, true), M.redCloth, jx, jy + 0.5, H.z, { rx: Math.PI, uv: false }); }
  out.hamlets.push({ ...H, placed });
}

export function buildExtras(B, M, out) {
  out.hamlets = []; out.animated = out.animated || [];
  for (const H of HAMLETS) hamlet(B, M, out, H);
  // ---- a aldeia dos pescadores: o píer de tábuas entrando no lago, os barcos e os varais de rede
  { const H = HAMLETS[0]; let sx = H.x; while (!inLake(sx, H.z, 0) && sx > H.x - 120) sx -= 1; // a margem
    const y0 = 0.35, L = 14;
    for (let i = 0; i < 7; i++) { const px = sx + 2 - i * 2; B.box(M.wood, 2.1, 0.12, 2.2, px, y0, H.z, { noGround: true }); for (const sd of [-1, 1]) B.box(M.darkWood, 0.14, 2.4, 0.14, px, y0 - 2.3, H.z + sd * 1.0, { noGround: true }); }
    addBox(sx + 2 - 6, H.z, L, 2.2, -2, y0 + 0.12);
    out.pier = { x: sx - 10, z: H.z, y: y0 + 0.12 };
    const boat = (x, z, ry, floating) => { const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.9 });
      const hg = new THREE.BoxGeometry(1.3, 0.55, 5.4, 2, 1, 8), hp = hg.attributes.position; // o casco: fundo chato, a proa afinando e levantada
      for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i), t = Math.max(0, (z - 1.2) / 1.5), b = hp.getY(i) < 0; hp.setX(i, hp.getX(i) * (1 - t * 0.85) * (b ? 0.8 : 1)); hp.setY(i, hp.getY(i) + t * t * 0.35); }
      hg.computeVertexNormals(); const hull = new THREE.Mesh(hg, wood); hull.position.y = 0.05; g.add(hull);
      const inside = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 4.0), new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9 })); inside.position.set(0, 0.29, -0.4); g.add(inside);
      for (const zz of [-1.2, 0.6]) { const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.3), wood); seat.position.set(0, -0.05, zz); g.add(seat); }
      const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 5), wood); oar.position.set(0.5, 0.1, -2.6); oar.rotation.x = 1.2; g.add(oar);
      g.position.set(x, floating ? 0.12 : terrainHeight(x, z) + 0.3, z); g.rotation.y = ry; g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); out.extra.push(g); out.animated.push({ g, bob: floating }); };
    boat(sx - 6, H.z + 3.5, Math.PI / 2, true); boat(sx - 9, H.z - 3.4, Math.PI / 2 + 0.2, true); boat(sx + 4, H.z + 8, 0.6, false);
    for (let k = 0; k < 2; k++) { const x = sx + 8, z = H.z - 8 + k * 5, y = terrainHeight(x, z); for (const dx of [-2, 2]) B.box(M.darkWood, 0.1, 2.0, 0.1, x + dx, y, z); B.box(M.darkWood, 4.2, 0.08, 0.08, x, y + 1.9, z);
      B.box(M.netting, 3.8, 1.4, 0.06, x, y + 0.48, z, { noGround: true }); } // as redes secando
    out.spots.fishing = new V3(sx + 3, terrainHeight(sx + 3, H.z), H.z);
  }
  // ---- o moinho d'água: a casinha de tábuas e a roda grande, com as pás, movida pelo riacho
  { const S = polyDist(STREAM, MILL.x, MILL.z); let px = MILL.x - S.x, pz = MILL.z - S.z; const pl = Math.hypot(px, pz) || 1; px /= pl; pz /= pl; // (a casa fica na margem; a roda, na beira da água)
    const hx = S.x + px * 8.2, hz = S.z + pz * 8.2, ry = Math.atan2(pz, -px), f = frame(B, hx, terrainHeight(hx, hz) + 0.05, hz, ry), y = f.y;
    f.box(M.stoneLight, 7.4, 0.3, 6.4, 0, -0.25, 0); f.wall(M.wood, -3.5, -3, 3.5, -3, 2.6, 0.12); f.wall(M.wood, -3.5, -3, -3.5, 3, 2.6, 0.12); f.wall(M.wood, 3.5, -3, 3.5, 3, 2.6, 0.12, [[3, 1.6, 2]]); f.wall(M.wood, -3.5, 3, 3.5, 3, 2.6, 0.12);
    f.roof(M.thatch, 9, 8, 2.8, 2.7, { thick: 0.5, sori: 0.05, irimoya: true });
    f.geo(new THREE.CylinderGeometry(0.55, 0.65, 0.6, 14), M.stone, 0, 0.3, 0, { uv: false }); // a mó dentro
    const wheel = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
    for (const sd of [-0.45, 0.45]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 6, 28), wood); rim.position.z = sd; wheel.add(rim); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, pad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.0), wood); pad.position.set(Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0); pad.rotation.z = a; wheel.add(pad); const sp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 0.07), wood); sp.position.set(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0); sp.rotation.z = a; wheel.add(sp); }
    const wx = S.x + px * 3.4, wz = S.z + pz * 3.4; wheel.position.set(wx, terrainHeight(S.x, S.z) + 1.75, wz); wheel.rotation.y = Math.atan2(px, pz); wheel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    out.extra.push(wheel); out.animated.push({ g: wheel, spin: -0.7 });
    out.spots.mill = new V3(...(() => { const [a, b] = f.W(0, 5); return [a, y, b]; })()); }
  // ---- a plantação de chá: fileiras de arbustos podados redondos, acompanhando a encosta
  for (let z = TEA.z0 + 2; z < TEA.z1; z += 3.2) for (let x = TEA.x0; x < TEA.x1; x += 4) { const y = terrainHeight(x + 2, z); B.geo(new THREE.CylinderGeometry(0.75, 0.75, 4.1, 10, 1, false, 0, Math.PI), M.moss, x + 2, y + 0.15, z, { rz: Math.PI / 2, sy: 1, uv: M.moss.userData.uv }); B.box(M.moss, 4.1, 0.2, 1.5, x + 2, y - 0.05, z); addBox(x + 2, z, 4.1, 1.5, y - 1, y + 0.9); }
  out.spots.tea = new V3((TEA.x0 + TEA.x1) / 2, terrainHeight((TEA.x0 + TEA.x1) / 2, TEA.z0 - 3), TEA.z0 - 3);
  // ---- o caminho de Inari: torii vermelhos um atrás do outro (doados por quem teve um pedido atendido), até o santuarinho
  { let s = 0; const L = INARI; for (let i = 0; i < L.length - 1; i++) { const [ax, az] = L[i], [bx, bz] = L[i + 1], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az); // (os pilares atravessados, o caminho passa por dentro)
      for (let d = s; d < len; d += 2.1) { const x = ax + (bx - ax) * d / len, z = az + (bz - az) * d / len; torii(B, M, x, terrainHeight(x, z) - 0.05, z, ry, 2.3, 3.0, 'myojin'); }
      s = (s + 2.1 - (len % 2.1)) % 2.1; }
    const [ex, ez] = L[L.length - 1], ey = terrainHeight(ex, ez), f = frame(B, ex, ey, ez, Math.atan2(L[L.length - 2][0] - ex, L[L.length - 2][1] - ez));
    f.box(M.stone, 3, 0.6, 2.4, 0, -0.2, 0); f.box(M.vermilion, 1.4, 1.2, 1.0, 0, 0.4, -0.2); f.roof(M.bark, 2.2, 1.8, 0.6, 1.6, { thick: 0.12, sori: 0.3, gable: true }, 0, -0.2); f.solid(0, -0.2, 1.4, 1.0, -1, 1.6);
    for (const sd of [-1, 1]) { const [fx, fz] = f.W(sd * 1.5, 1.2), fy = ey + 0.4; // as raposas de pedra, sentadas, com o babador vermelho
      B.box(M.stoneLight, 0.5, 0.4, 0.5, fx, ey - 0.05, fz); B.geo(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 8), M.stoneLight, fx, fy + 0.25, fz, { uv: false }); B.geo(new THREE.SphereGeometry(0.12, 10, 8), M.stoneLight, fx, fy + 0.6, fz, { sz: 1.3, uv: false });
      B.geo(new THREE.ConeGeometry(0.07, 0.25, 6), M.stoneLight, fx, fy + 0.62, fz + 0.12 * Math.cos(f.ry) + 0.0, { rx: Math.PI / 2, ry: f.ry, uv: false });
      for (const e of [-1, 1]) B.geo(new THREE.ConeGeometry(0.04, 0.13, 5), M.stoneLight, fx + e * 0.07, fy + 0.74, fz, { uv: false });
      B.geo(new THREE.CylinderGeometry(0.05, 0.03, 0.4, 6), M.stoneLight, fx - 0.18, fy + 0.25, fz, { rz: 0.7, uv: false }); B.geo(new THREE.ConeGeometry(0.17, 0.12, 10, 1, true), M.redCloth, fx, fy + 0.42, fz, { rx: Math.PI, uv: false }); addCircle(fx, fz, 0.3, ey - 1, ey + 1.3); }
    toro(B, M, out, ...f.W(0, 2.5).flatMap((v, i) => (i === 0 ? [v, ey] : [v])), 0.8);
    out.spots.inari = new V3(...(() => { const [a, b] = f.W(0, 3); return [a, ey, b]; })()); out.spots.inariStart = new V3(L[0][0], terrainHeight(L[0][0], L[0][1]), L[0][1]); }
  // ---- o pagode de três andares do templo
  { const cx = TEMPLE.x + 4, cz = TEMPLE.z - 20, y = LEVEL.temple, f = frame(B, cx, y, cz, 0);
    f.box(M.stone, 7.4, 0.8, 7.4, 0, -0.2, 0); f.solid(0, 0, 7.4, 7.4, -1, 0.6, true);
    let h = 0.6; const sizes = [5.6, 4.8, 4.0];
    for (let k = 0; k < 3; k++) { const w = sizes[k], H = k ? 2.6 : 3.2;
      for (const px of [-w / 2, w / 2]) for (const pz of [-w / 2, w / 2]) f.box(M.vermilion, 0.3, H, 0.3, px, h, pz);
      f.box(M.plaster, w - 0.2, H - 0.8, w - 0.2, 0, h, 0); f.box(M.vermilion, w + 0.3, 0.5, w + 0.3, 0, h + H - 0.8, 0);
      f.roof(M.kawara, w + 3.4, w + 3.4, 1.3, h + H, { thick: 0.3, sori: 0.6, sag: 1.6 }); h += H + 0.9; }
    f.geo(new THREE.CylinderGeometry(0.08, 0.12, 6.5, 8), M.bronze, 0, h + 2.4, 0, { uv: false }); // a haste do alto (sōrin) com os nove anéis
    for (let i = 0; i < 9; i++) f.geo(new THREE.TorusGeometry(0.32 - i * 0.015, 0.05, 6, 14), M.bronze, 0, h + 0.4 + i * 0.42, 0, { rx: Math.PI / 2, uv: false });
    f.solid(0, 0, 5.8, 5.8, 0.6, h);
    out.spots.pagoda = new V3(cx - 6, y, cz); }
  // ---- o cume: a casinha do eremita, a cerejeira e o laguinho no fundo da cratera
  { const cx = FUJI.x, cz = FUJI.z, y = terrainHeight(cx, cz);
    B.geo(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 28), M.stone, cx + 6, y - 0.2, cz + 4, { uv: false }); B.geo(new THREE.CylinderGeometry(3.8, 3.8, 0.05, 28), M.water, cx + 6, y + 0.02, cz + 4, { uv: false }); addCircle(cx + 6, cz + 4, 3.9, y - 1, y + 0.1);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; B.geo(new THREE.DodecahedronGeometry(0.4 + (i % 3) * 0.12, 0), M.lava, cx + 6 + Math.cos(a) * 4.3, y + 0.1, cz + 4 + Math.sin(a) * 4.3, { uv: false }); }
    house(B, M, out, { x: cx - 7, z: cz - 1, ry: Math.PI * 0.85, w: 9, d: 7, roof: 'thatch', front: 'shoji', engawa: true, kind: 'hermit', doma: 3 });
    toro(B, M, out, cx - 1, y, cz + 6, 0.9);
    out.summitTree = { x: cx + 1.5, y, z: cz - 6 }; addCircle(cx + 1.5, cz - 6, 0.5, y - 1, y + 4);
    out.spots.hermit = new V3(cx - 3, y, cz + 3); }
  void nobori; void roofGeo;
}
