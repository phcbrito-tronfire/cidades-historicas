// Bairros de Atenas (Melite, Coile, Colito, Cidateneu...): casas de pátio — embasamento de pedra, paredes de adobe
// rebocadas, cômodos em volta de um pátio com altar, telhados de telha de barro caindo para dentro. Ruas estreitas
// e tortas; as ruas principais ligam a ágora às portas. Algumas casas podem ser visitadas por dentro.
import * as THREE from 'three';
import { addBox, addCircle } from '../comum/collision.js';
import { terrainHeight } from './terrain.js';
import { insideCity, distToWall } from './muralhas.js';
import { STREETS, distToPolyline } from './ruas.js';
export { STREETS };
import { rand, rr, fbm } from '../comum/util.js';

const V3 = THREE.Vector3;
// casas que se pode visitar: nome, onde e o que contar ao entrar
export const VISIT = [
  { id: 'pericles', name: 'Casa de Péricles e Aspásia', x: -280, z: -48, ry: 0.15, tag: 'Casa', text: 'Uma casa de cidadão rico, mas sem luxo à vista: Péricles fazia questão de viver com simplicidade. Os cômodos se abrem para o pátio, onde fica o altar de Zeus Herkeios, protetor do lar. O andrón, com sofás e piso de seixos, é a sala dos banquetes (os simpósios); os aposentos das mulheres, com o tear, ficam mais ao fundo.' },
  { id: 'oleiro', name: 'Casa e oficina de Cálias', x: -410, z: -288, ry: -0.1, tag: 'Oficina', text: 'Casa de um oleiro do Cerâmico: a família mora nos fundos e trabalha na frente. Aqui o barro da Ática vira ânforas, taças e vasos de figuras vermelhas, pintados com um engobe que fica preto brilhante no forno.' },
];

export function buildHouses(B, M, out) {
  const ex = out.exclusions;
  const blocked = (x, z, pad = 0) => ex.some((e) => x > e[0] - pad && x < e[1] + pad && z > e[2] - pad && z < e[3] + pad);
  const placed = [];
  // visitáveis primeiro (o resto da cidade se ajusta em volta)
  for (const v of VISIT) {
    const y = terrainHeight(v.x, v.z);
    const h = courtyardHouse(B, M, v.x, y, v.z, 15, 13, v.ry, { visit: true });
    out.visitHouses.push({ ...v, door: h.door, rect: h.rect, y });
    ex.push([v.x - 12, v.x + 12, v.z - 11, v.z + 11]);
    placed.push([v.x, v.z, 12]);
    out.spots['casa_' + v.id] = h.center;
  }
  const C = 17;
  let n = 0;
  for (let gx = -560; gx < 340; gx += C) for (let gz = -420; gz < 270; gz += C) {
    const x = gx + rr(-2.5, 2.5), z = gz + rr(-2.5, 2.5);
    if (!insideCity(x, z) || distToWall(x, z) < 14) continue;
    if (blocked(x, z, 6)) continue;
    if (STREETS.some((s) => distToPolyline(x, z, s) < 15)) continue; // (centro da casa a 15 m: as paredes não invadem a rua)
    // vielas: algumas células ficam vazias (ruas tortas e pracinhas)
    const lane = fbm(x * 0.03 + 4, z * 0.03 + 8, 2);
    if (lane > 0.62 || rand() < 0.1) continue;
    const y = terrainHeight(x, z);
    const sl = Math.max(Math.abs(terrainHeight(x + 6, z) - terrainHeight(x - 6, z)), Math.abs(terrainHeight(x, z + 6) - terrainHeight(x, z - 6))) / 12;
    if (sl > 0.2 || y > 40) continue;
    const w = rr(11, 14.5), d = rr(10.5, 14), ry = (fbm(x * 0.004, z * 0.004, 2) - 0.5) * 0.3 + Math.floor(rand() * 4) * Math.PI / 2; // quarteirões quase alinhados, portas para os quatro lados
    courtyardHouse(B, M, x, y, z, w, d, ry, { rich: rand() < 0.15, two: rand() < 0.2 });
    placed.push([x, z, Math.max(w, d) / 2]);
    n++;
  }
  out.houseCount = n;
  out.houses = placed;
}

// Casa ateniense de pátio (como as escavadas ao pé do Areópago e da Pnyx): por fora quase cega — paredes caiadas
// de adobe sobre embasamento de pedra, janelinhas altas, uma porta de madeira recuada com verga de pedra; por
// dentro, alas de cômodos em volta de um pátio a céu aberto (altar, cisterna), telhados de telha de uma água caindo
// para o pátio e, diante da ala norte (a que pega o sol do inverno), o pórtico de madeira (pastas).
// Local: frente (rua) em -z, fundos (norte da casa) em +z.
function courtyardHouse(B, M, x, y, z, w, d, ry, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const H = 3.2, HX = H + 0.8, T = 0.45; // HX: parede externa, mais alta (o telhado cai para dentro)
  const wallMat = o.rich || o.visit ? M.plaster : rand() < 0.5 ? M.plasterOchre : M.plaster;
  const big = o.rich || o.visit || w * d > 150;
  const nd = d * 0.36, sd = 2.4, ww = w * 0.27, ew = big ? w * 0.24 : 0;
  const cx0 = -w / 2 + ww, cx1 = w / 2 - ew, cz0 = -d / 2 + sd, cz1 = d / 2 - nd; // o pátio
  const pastas = 1.8;
  const aabb = (lw, ld) => [Math.abs(c) * lw + Math.abs(s) * ld, Math.abs(s) * lw + Math.abs(c) * ld];
  const wall = (x0, z0, x1, z1, h, mat = wallMat) => { // parede de (x0,z0) a (x1,z1), alinhada a x ou a z
    const lw = Math.max(T, Math.abs(x1 - x0)), ld = Math.max(T, Math.abs(z1 - z0));
    const [px, pz] = P((x0 + x1) / 2, (z0 + z1) / 2), gy = Math.min(y, terrainHeight(px, pz));
    B.box(M.socle, lw + 0.04, 0.75 + (y - gy), ld + 0.04, px, gy - 0.3, pz, { ry });
    B.box(mat, lw, h - 0.45, ld, px, y + 0.45, pz, { ry });
    const [ax, az] = aabb(lw, ld); addBox(px, pz, ax, az, y - 1, y + h);
  };
  // paredes com vãos: lista de aberturas [centro, largura] ao longo da parede
  // parede acima de uma porta (do alto do vão até o topo da parede)
  const over = (lx, lz, lw, ld, h) => { const [px, pz] = P(lx, lz); B.box(wallMat, lw, h - 2.35, ld, px, y + 2.35, pz, { ry }); };
  const wallX = (x0, x1, zz, h, gaps = []) => { let a = x0; for (const [gc, gw] of gaps.sort((p, q) => p[0] - q[0])) { if (gc - gw / 2 > a + 0.05) wall(a, zz, gc - gw / 2, zz, h); over(gc, zz, gw + 0.02, T, h); a = gc + gw / 2; } if (x1 > a + 0.05) wall(a, zz, x1, zz, h); };
  const wallZ = (z0, z1, xx, h, gaps = []) => { let a = z0; for (const [gc, gw] of gaps.sort((p, q) => p[0] - q[0])) { if (gc - gw / 2 > a + 0.05) wall(xx, a, xx, gc - gw / 2, h); over(xx, gc, T, gw + 0.02, h); a = gc + gw / 2; } if (z1 > a + 0.05) wall(xx, a, xx, z1, h); };
  const doorX = (cx0 + cx1) / 2 + (rand() - 0.5) * 1.5;
  // ---- paredes externas (a da rua com a porta), e os cômodos por dentro
  wallX(-w / 2, w / 2, -d / 2, HX, [[doorX, 1.5]]);
  wallX(-w / 2, w / 2, d / 2, HX); wallZ(-d / 2, d / 2, -w / 2, HX); wallZ(-d / 2, d / 2, w / 2, HX);
  wallX(-w / 2, w / 2, cz1, H, [[cx0 + (cx1 - cx0) * 0.25, 1.1], [cx0 + (cx1 - cx0) * 0.75, 1.1]]); // fundo do pórtico, com portas para os cômodos
  wallZ(cz0, cz1, cx0, H, [[(cz0 + cz1) / 2, 1.1]]); // ala oeste (cozinha, depósito)
  if (ew) wallZ(cz0, cz1, cx1, H, [[(cz0 + cz1) / 2, 1.1]]); // ala leste (andrón, nas casas maiores)
  wallX(-w / 2, w / 2, cz0, H, [[doorX, 1.5]]); // vestíbulo de entrada
  wallZ(cz1, d / 2, (cx0 + cx1) / 2, H); // divisória dos quartos da ala norte
  // ---- porta: batentes e verga de pedra no vão da parede, soleira, e as duas folhas de madeira abertas para
  // dentro, encostadas na parede (giram na dobradiça, junto ao batente)
  {
    const zf = -d / 2, dep = T + 0.08, at = (lx, lz) => P(lx, lz);
    for (const sd of [-1, 1]) { const [px, pz] = at(doorX + sd * 0.67, zf); B.box(M.marble, 0.16, 2.3, dep, px, y, pz, { ry }); }
    { const [px, pz] = at(doorX, zf); B.box(M.marble, 1.8, 0.28, dep, px, y + 2.28, pz, { ry }); B.box(M.marble, 1.5, 0.08, dep, px, y, pz, { ry }); }
    for (const sd of [-1, 1]) { const [px, pz] = at(doorX + sd * (0.75 + 0.33), zf + T / 2 + 0.04); B.box(M.darkWood, 0.66, 2.2, 0.06, px, y + 0.06, pz, { ry }); }
  }
  // ---- janelinhas altas (ficam acesas à noite)
  const win = (lx, lz, alongX) => { const [px, pz] = P(lx, lz); B.box(M.window, alongX ? 0.5 : 0.1, 0.42, alongX ? 0.1 : 0.5, px, y + 2.55, pz, { ry }); };
  win(-w / 4, -d / 2 - 0.2, true); win(w / 4, -d / 2 - 0.2, true); win(-w / 2 - 0.2, d / 4, false); win(w / 2 + 0.2, d / 4, false); win(0, d / 2 + 0.2, true);
  // ---- pórtico (pastas): pilares de madeira diante da ala norte
  const nPost = Math.max(2, Math.round((cx1 - cx0) / 2.6));
  for (let i = 0; i < nPost; i++) {
    const lx = cx0 + 0.4 + (i + 0.5) * ((cx1 - cx0 - 0.8) / nPost), [px, pz] = P(lx, cz1 - pastas);
    B.geo(new THREE.CylinderGeometry(0.11, 0.13, H - 0.2, 8), M.wood, px, y + (H - 0.2) / 2, pz, { uv: false });
    addCircle(px, pz, 0.14, y - 1, y + H);
  }
  // ---- telhados de uma água, do alto da parede externa até a beira do pátio
  const roofZ = (lx0, lx1, zOut, zIn, yOut, yIn) => { // alas norte/sul: cai de zOut (alto) para zIn
    const L = Math.abs(zOut - zIn), dy = yOut - yIn, len = Math.hypot(L, dy), ang = Math.atan2(dy, L) * Math.sign(zOut - zIn);
    const [px, pz] = P((lx0 + lx1) / 2, (zOut + zIn) / 2); B.box(M.tiles, lx1 - lx0, 0.18, len, px, y + (yOut + yIn) / 2 - 0.09, pz, { ry, rx: -ang });
  };
  const roofX = (lz0, lz1, xOut, xIn, yOut, yIn) => { // alas leste/oeste
    const L = Math.abs(xOut - xIn), dy = yOut - yIn, len = Math.hypot(L, dy), ang = Math.atan2(dy, L) * Math.sign(xOut - xIn);
    const [px, pz] = P((xOut + xIn) / 2, (lz0 + lz1) / 2); B.box(M.tiles, len, 0.18, lz1 - lz0, px, y + (yOut + yIn) / 2 - 0.09, pz, { ry, rz: ang });
  };
  const two = o.two && !o.visit;
  if (two) { // sobrado sobre a ala norte (quartos), com o telhado mais alto; o pórtico tem o seu, mais baixo
    const top = HX + 2.6;
    wallX(-w / 2, w / 2, d / 2, top); wallZ(cz1, d / 2, -w / 2, top); wallZ(cz1, d / 2, w / 2, top); wallX(-w / 2, w / 2, cz1, top);
    win(-w / 4, cz1 - 0.2, true); win(w / 4, cz1 - 0.2, true);
    roofZ(-w / 2 - 0.3, w / 2 + 0.3, d / 2 + 0.35, cz1 - 0.35, top + 0.75, top);
    roofZ(cx0, cx1, cz1, cz1 - pastas - 0.35, H + 0.3, H - 0.25);
  } else roofZ(-w / 2 - 0.3, w / 2 + 0.3, d / 2 + 0.35, cz1 - pastas - 0.35, HX + 0.1, H - 0.25);
  roofX(cz0 - 0.05, cz1, -w / 2 - 0.35, cx0 + 0.4, HX + 0.1, H - 0.1);
  if (ew) roofX(cz0 - 0.05, cz1, w / 2 + 0.35, cx1 - 0.4, HX + 0.1, H - 0.1);
  roofZ(-w / 2 - 0.3, w / 2 + 0.3, -d / 2 - 0.35, cz0 + 0.4, HX + 0.1, H - 0.1);
  // ---- pátio: chão de terra batida com seixos, altar de Zeus Herkeios e a boca da cisterna
  { const [px, pz] = P((cx0 + cx1) / 2, (cz0 + cz1 - pastas) / 2); B.box(M.marble, 0.75, 0.8, 0.6, px, y, pz, { ry }); addBox(px, pz, 0.8, 0.8, y, y + 0.8); }
  if (big) { const [px, pz] = P(cx1 - 1.2, cz0 + 1.2); B.geo(new THREE.CylinderGeometry(0.45, 0.5, 0.65, 14), M.poros, px, y + 0.32, pz); addBox(px, pz, 1, 1, y, y + 0.65); }
  if (o.rich) { const [px, pz] = P(doorX + 1.3, -d / 2 - 0.5); B.box(M.marble, 0.3, 1.3, 0.26, px, y, pz, { ry }); B.geo(new THREE.SphereGeometry(0.15, 10, 8), M.marble, px, y + 1.45, pz); } // herma na porta
  const out = { center: new V3(x, y, z), door: new V3(...(() => { const [a, b] = P(doorX, -d / 2 - 1.2); return [a, y, b]; })()), rect: null };
  const corners = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(-w / 2, d / 2), P(w / 2, d / 2)];
  out.rect = [Math.min(...corners.map((q) => q[0])), Math.max(...corners.map((q) => q[0])), Math.min(...corners.map((q) => q[1])), Math.max(...corners.map((q) => q[1]))];
  if (o.visit) furnish(B, M, P, y, w, d, ry, nd, { cx0, cx1, cz0, cz1 });
  return out;
}

// móveis de uma casa visitável: andrón com sofás (klinai) e piso de seixos, tear, fogareiro, jarros
function furnish(B, M, P, y, w, d, ry, nd, R) {
  // andrón na ala leste: sofás encostados nas paredes, mesinhas e o piso de seixos
  const ax = (R.cx1 + w / 2) / 2, az = (R.cz0 + R.cz1) / 2;
  { const [px, pz] = P(ax, az); B.box(M.marble, w / 2 - R.cx1 - 0.6, 0.04, R.cz1 - R.cz0 - 0.6, px, y + 0.02, pz, { ry }); }
  for (const dz of [-1.3, 1.3]) {
    const [px, pz] = P(w / 2 - 0.75, az + dz); B.box(M.wood, 0.85, 0.55, 1.9, px, y, pz, { ry }); B.box(M.awning[1], 0.85, 0.14, 1.9, px, y + 0.55, pz, { ry }); addBox(px, pz, 1.9, 1.9, y, y + 0.7);
    const [tx, tz] = P(w / 2 - 1.75, az + dz); B.box(M.darkWood, 0.5, 0.5, 0.9, tx, y, tz, { ry });
  }
  // quarto das mulheres (ala norte, à esquerda): tear vertical com pesos de barro
  { const [px, pz] = P(-w / 4, d / 2 - 0.9); B.box(M.wood, 0.08, 1.9, 0.08, px - 0.8, y, pz, { ry }); B.box(M.wood, 0.08, 1.9, 0.08, px + 0.8, y, pz, { ry }); B.box(M.wood, 1.8, 0.08, 0.08, px, y + 1.85, pz, { ry }); B.box(M.cloth('#c8b48a', '#7a2a1e'), 1.5, 1.3, 0.02, px, y + 0.5, pz, { ry }); addBox(px, pz, 1.8, 1, y, y + 1.9); }
  // cozinha (ala oeste): fogareiro e o pithos de grãos
  { const [px, pz] = P(-w / 2 + 1.2, R.cz0 + 1.2); B.box(M.mudbrick, 1.2, 0.7, 0.9, px, y, pz, { ry }); addBox(px, pz, 1.2, 1, y, y + 0.7); }
  { const [px, pz] = P(-w / 2 + 1.2, R.cz1 - 1.0); const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI) * 0.42, t * 1.3)); } B.geo(new THREE.LatheGeometry(pts, 14), M.terracotta, px, y, pz); addBox(px, pz, 1, 1, y, y + 1.3); }
}
