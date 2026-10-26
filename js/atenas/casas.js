// Bairros de Atenas (Melite, Coile, Colito, Cidateneu...): casas de pátio — embasamento de pedra, paredes de adobe
// rebocadas, cômodos em volta de um pátio com altar, telhados de telha de barro caindo para dentro. Ruas estreitas
// e tortas; as ruas principais ligam a ágora às portas. Algumas casas podem ser visitadas por dentro.
import * as THREE from 'three';
import { addBox } from '../comum/collision.js';
import { terrainHeight } from './terrain.js';
import { insideCity, distToWall } from './muralhas.js';
import { PANATHENAIC } from './agora.js';
import { rand, rr, fbm } from '../comum/util.js';

const V3 = THREE.Vector3;
const STREETS = [
  PANATHENAIC,
  [[-300, -110], [-335, 40], [-360, 156]],
  [[-200, -95], [-130, 40], [-60, 180], [-60, 257]],
  [[-100, -110], [-100, -410]],
  [[80, -80], [200, -90], [318, -95]],
  [[22, 150], [-60, 200]],
  [[-150, 70], [-250, 120], [-360, 156]],
  [[60, -40], [150, 40], [150, 200]],
];
function distToPolyline(x, z, pts) {
  let bd = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], ab = [b[0] - a[0], b[1] - a[1]], l2 = ab[0] ** 2 + ab[1] ** 2;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (z - a[1]) * ab[1]) / l2));
    bd = Math.min(bd, Math.hypot(x - (a[0] + ab[0] * t), z - (a[1] + ab[1] * t)));
  }
  return bd;
}

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
    if (STREETS.some((s) => distToPolyline(x, z, s) < 11)) continue;
    // vielas: algumas células ficam vazias (ruas tortas e pracinhas)
    const lane = fbm(x * 0.03 + 4, z * 0.03 + 8, 2);
    if (lane > 0.62 || rand() < 0.1) continue;
    const y = terrainHeight(x, z);
    const sl = Math.max(Math.abs(terrainHeight(x + 6, z) - terrainHeight(x - 6, z)), Math.abs(terrainHeight(x, z + 6) - terrainHeight(x, z - 6))) / 12;
    if (sl > 0.2 || y > 40) continue;
    const w = rr(10.5, 14), d = rr(10, 13.5), ry = (fbm(x * 0.004, z * 0.004, 2) - 0.5) * 0.9 + (rand() < 0.5 ? 0 : Math.PI / 2);
    courtyardHouse(B, M, x, y, z, w, d, ry, { rich: rand() < 0.15, two: rand() < 0.2 });
    placed.push([x, z, Math.max(w, d) / 2]);
    n++;
  }
  out.houseCount = n;
  out.houses = placed;
}

// casa de pátio. Frente (porta) no lado -z local; cômodos ao norte (+z local... ver P), pátio no meio
function courtyardHouse(B, M, x, y, z, w, d, ry, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const H = 3.3, T = 0.5;
  const wallMat = o.rich || o.visit ? M.plaster : rand() < 0.55 ? M.plasterOchre : M.plaster;
  const wall = (lw, ld, lx, lz, h = H) => {
    const [px, pz] = P(lx, lz), gy = Math.min(y, terrainHeight(px, pz));
    B.box(M.socle, lw, 0.8 + (y - gy), ld, px, gy - 0.3, pz, { ry });
    B.box(wallMat, lw, h - 0.5, ld, px, y + 0.5, pz, { ry });
    addBox(px, pz, Math.abs(c) * lw + Math.abs(s) * ld, Math.abs(s) * lw + Math.abs(c) * ld, y - 1, y + h);
  };
  const door = 1.5;
  // muro externo: frente (-d/2) com porta, fundos e laterais
  wall((w - door) / 2, T, -(w + door) / 4, -d / 2); wall((w - door) / 2, T, (w + door) / 4, -d / 2);
  wall(w, T, 0, d / 2); wall(T, d, -w / 2, 0); wall(T, d, w / 2, 0);
  // ala norte (fundos): 4,5 m de fundo, com divisórias e um pórtico de madeira (pastas) voltado para o pátio
  const nd = 4.5, zN = d / 2 - nd;
  wall(w - 3.2, T * 0.8, -1.6, zN); // parede do pórtico com passagem
  for (const lx of [-w / 6, w / 6]) wall(T * 0.8, nd, lx, zN + nd / 2);
  // ala oeste (cozinha e depósito) só nas casas maiores
  const west = w > 12 || o.rich || o.visit;
  if (west) { wall(T * 0.8, d - nd - 1.4, -w / 2 + 3.6, -0.7 - nd / 2 + 0.7); }
  // telhados de uma água, caindo para o pátio
  const roof = (lw, ld, lx, lz, tilt) => { const [px, pz] = P(lx, lz); B.box(M.tiles, lw, 0.22, ld, px, y + H - 0.05, pz, { ry, rx: tilt }); };
  roof(w + 0.6, nd + 1.2, 0, d / 2 - nd / 2 + 0.1, -0.2);
  if (west) roof(4.4, d - nd + 0.4, -w / 2 + 1.8, -nd / 2 + 0.2, 0);
  if (o.two) { // segundo andar sobre a ala norte (quartos), com janelinhas
    const [px, pz] = P(0, d / 2 - nd / 2);
    B.box(wallMat, w, 2.6, nd, px, y + H, pz, { ry });
    B.box(M.tiles, w + 0.6, 0.22, nd + 1.2, px, y + H + 2.6, pz, { ry, rx: -0.2 });
    addBox(px, pz, Math.abs(c) * w + Math.abs(s) * nd, Math.abs(s) * w + Math.abs(c) * nd, y, y + H + 2.8);
  }
  // pátio: piso de terra batida, altar de Zeus Herkeios e um poço/cisterna
  { const [px, pz] = P(1.2, -0.6); B.box(M.marble, 0.8, 0.8, 0.6, px, y, pz, { ry }); addBox(px, pz, 0.8, 0.8, y, y + 0.8); }
  if (o.rich || o.visit) { const [px, pz] = P(3.2, 0.8); B.geo(new THREE.CylinderGeometry(0.5, 0.55, 0.7, 14), M.poros, px, y + 0.35, pz); addBox(px, pz, 1.1, 1.1, y, y + 0.7); }
  // hermas na porta das casas mais ricas
  if (o.rich) { const [px, pz] = P(door / 2 + 0.6, -d / 2 - 0.6); B.box(M.marble, 0.32, 1.3, 0.28, px, y, pz, { ry }); B.geo(new THREE.SphereGeometry(0.15, 10, 8), M.marble, px, y + 1.45, pz); }
  const out = { center: new V3(x, y, z), door: new V3(...(() => { const [a, b] = P(0, -d / 2 - 1.2); return [a, y, b]; })()), rect: null };
  // retângulo aproximado (eixos do mundo) para saber quando o jogador entrou
  const corners = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(-w / 2, d / 2), P(w / 2, d / 2)];
  out.rect = [Math.min(...corners.map((q) => q[0])), Math.max(...corners.map((q) => q[0])), Math.min(...corners.map((q) => q[1])), Math.max(...corners.map((q) => q[1]))];
  if (o.visit) furnish(B, M, P, y, w, d, ry, nd);
  return out;
}

// móveis de uma casa visitável: andrón com sofás (klinai) e piso de seixos, tear, lareira, jarros, lamparinas
function furnish(B, M, P, y, w, d, ry, nd) {
  const zR = d / 2 - nd / 2;
  // andrón (sala de banquete) na ala norte, à direita: sofás encostados nas paredes e mesinhas
  { const [px, pz] = P(w / 3, zR); B.box(M.marble, w / 3 - 0.6, 0.04, nd - 0.6, px, y + 0.02, pz, { ry }); }
  for (const [lx, lz] of [[w / 3 - 1.2, zR + nd / 2 - 0.9], [w / 3 + 1.2, zR + nd / 2 - 0.9]]) {
    const [px, pz] = P(lx, lz); B.box(M.wood, 1.9, 0.55, 0.85, px, y, pz, { ry }); B.box(M.awning[1], 1.9, 0.14, 0.85, px, y + 0.55, pz, { ry }); addBox(px, pz, 1.9, 1.9, y, y + 0.7);
    const [tx, tz] = P(lx, lz - 1.0); B.box(M.darkWood, 0.9, 0.5, 0.5, tx, y, tz, { ry });
  }
  // gineceu (quarto das mulheres) à esquerda: tear vertical com pesos de barro e um cesto de lã
  { const [px, pz] = P(-w / 3, zR + 0.8); B.box(M.wood, 0.08, 1.9, 0.08, px - 0.8, y, pz, { ry }); B.box(M.wood, 0.08, 1.9, 0.08, px + 0.8, y, pz, { ry }); B.box(M.wood, 1.8, 0.08, 0.08, px, y + 1.85, pz, { ry }); B.box(M.cloth('#c8b48a', '#7a2a1e'), 1.5, 1.3, 0.02, px, y + 0.5, pz, { ry }); addBox(px, pz, 1.8, 1, y, y + 1.9); }
  // cozinha (ala oeste): fogareiro, pithos de grãos e ânforas
  { const [px, pz] = P(-w / 2 + 1.8, -1.6); B.box(M.mudbrick, 1.2, 0.7, 0.9, px, y, pz, { ry }); addBox(px, pz, 1.2, 1, y, y + 0.7); }
  { const [px, pz] = P(-w / 2 + 1.6, 0.8); const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI) * 0.42, t * 1.3)); } B.geo(new THREE.LatheGeometry(pts, 14), M.terracotta, px, y, pz); addBox(px, pz, 1, 1, y, y + 1.3); }
}
