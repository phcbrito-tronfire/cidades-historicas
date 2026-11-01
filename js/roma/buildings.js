// Roma, c. 117 d.C.: monta a cidade a partir das partes — por enquanto o Coliseu (completo e explorável) e os
// bairros de ínsulas em volta; o Fórum, os templos, as termas, o Circo Máximo, o porto e a Naumaquia vêm em seguida.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { addBox } from '../comum/collision.js';
import { rr, rand } from '../comum/util.js';
import { pbrSet, getTextures } from './textures.js';
import { buildColosseum, COL } from './coliseu.js';
import { terrainHeight, tiberDist, TIBER_HALF, coastC, FORUM, CIRCUS, PALATINE, CAPITOL, NAUMACHIA } from './terrain.js';

export function createMaterials(tex) {
  const P = tex.pbr, T = getTextures();
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const M = {};
  // travertino (a pedra do Coliseu): calcário claro, cor de mel, com furinhos; duas tonalidades para as fileiras
  M.travertine = std({ ...pbrSet(P.marble_01, 1), color: 0xeadcc0, roughness: 0.82 }); M.travertine.userData.uv = { s: 2.6 };
  M.travertine2 = std({ ...pbrSet(P.pedra_clara, 1), color: 0xe2d2b4, roughness: 0.88 }); M.travertine2.userData.uv = { s: 3 };
  M.facade = std({ ...pbrSet(P.pedra_clara, 1), color: 0xf0e2c6, roughness: 0.8 }); M.facade.userData.uv = { s: 3.2 };
  M.marble = std({ ...pbrSet(P.marble_01, 1), color: 0xfff6ea, roughness: 0.5 }); M.marble.userData.uv = { s: 3 };
  M.marbleWall = std({ ...pbrSet(P.marble_01, 1), color: 0xf6ecdc, roughness: 0.55 }); M.marbleWall.userData.uv = { s: 2.2 };
  M.brick = std({ ...pbrSet(P.rough_plaster_brick, 1), color: 0xd89070 }); M.brick.userData.uv = { s: 2.2 }; // tijolo romano
  M.sand = std({ ...pbrSet(P.aerial_beach_01, 1), color: 0xf6e2b8, roughness: 1 }); M.sand.userData.uv = { s: 5 };
  M.wood = std({ ...pbrSet(P.madeira_clara, 1), color: 0xe8c8a0 }); M.wood.userData.uv = { s: 2 };
  M.darkWood = std({ ...pbrSet(P.madeira_clara, 1), color: 0x8a6446 }); M.darkWood.userData.uv = { s: 2 };
  M.bronze = std({ color: 0xa8743a, metalness: 0.9, roughness: 0.35 });
  M.gold = std({ color: 0xffc64a, metalness: 1, roughness: 0.28 });
  M.dark = std({ color: 0x1e140c, roughness: 1 });
  M.tiles = std({ ...pbrSet(P.clay_roof_tiles_02, 1), color: 0xffb08a }); M.tiles.userData.uv = { s: 2.2 }; // telhas de barro, bem vermelhas
  M.plaster = std({ ...pbrSet(P.cal_branca, 1), color: 0xf6e6c8, roughness: 0.92 }); M.plaster.userData.uv = { s: 3 };
  M.plasterOchre = std({ ...pbrSet(P.barro_ocre, 1), color: 0xffd8a0 }); M.plasterOchre.userData.uv = { s: 3 };
  M.plasterRed = std({ ...pbrSet(P.cal_branca, 1), color: 0xd88468, roughness: 0.92 }); M.plasterRed.userData.uv = { s: 3 };
  M.road = std({ ...pbrSet(P.seaworn_stone_tiles, 1), color: 0xcfc4b0, polygonOffset: true, polygonOffsetFactor: -2 }); M.road.userData.uv = { s: 3 }; // basalto das vias
  M.earth = std({ ...pbrSet(P.dry_ground_rocks, 1), color: 0xfff0d8 }); M.earth.userData.uv = { s: 4 };
  M.window = std({ color: 0x2a1a10, emissive: 0xffa040, emissiveIntensity: 0 });
  M.flame = new THREE.MeshBasicMaterial({ color: 0xffb050 });
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  M.awning = [0xefe6d2, 0xa8392a, 0xd8b45a].map((c) => std({ color: c, side: THREE.DoubleSide, roughness: 0.95 }));
  void T;
  return M;
}

// ínsula: prédio de 3 a 5 andares de tijolo e reboco, lojas (tabernae) no térreo com as portas largas, janelas e
// telhado de telhas vermelhas de quatro águas
function insula(B, M, x, z, w, d, ry, floors) {
  const y = terrainHeight(x, z) - 0.3, h = floors * 3.1, c = Math.cos(ry), s = Math.sin(ry);
  const wall = rand() < 0.4 ? M.plasterOchre : rand() < 0.5 ? M.plaster : M.plasterRed;
  B.box(wall, w, h + 0.3, d, x, y, z, { ry });
  B.box(M.brick, w + 0.05, 3.3, d + 0.05, x, y, z, { ry });
  // portas das lojas e janelas (faixas escuras nas duas fachadas compridas)
  for (const sd of [-1, 1]) {
    const fx = x - s * sd * (d / 2 + 0.02), fz = z - c * sd * (d / 2 + 0.02);
    for (let i = 0; i < Math.floor(w / 3.6); i++) {
      const u = -w / 2 + 1.8 + i * 3.6, px = fx + c * u, pz = fz - s * u;
      B.box(M.dark, 2.2, 2.4, 0.06, px, y + 0.3, pz, { ry });
      for (let f = 1; f < floors; f++) B.box(M.window, 0.9, 1.2, 0.06, px, y + 0.3 + f * 3.1 + 0.9, pz, { ry });
    }
  }
  const roof = new THREE.ConeGeometry(Math.hypot(w, d) / 2 * 1.04, 2.2, 4, 1, true); roof.rotateY(Math.PI / 4); roof.scale(w / Math.hypot(w, d) * 1.42, 1, d / Math.hypot(w, d) * 1.42);
  B.geo(roof, M.tiles, x, y + h + 0.3 + 1.1, z, { ry, uv: { s: 2.2 } });
  addBox(x, z, Math.abs(c) * w + Math.abs(s) * d, Math.abs(s) * w + Math.abs(c) * d, y - 1, y + h + 2.5);
}

// bairros de ínsulas: quarteirões numa grade, fora dos lugares reservados (Coliseu, Fórum, Circo, colinas altas,
// rio, Naumaquia)
function buildInsulae(B, M, out) {
  const free = (x, z) => {
    const e = (x / (COL.A + 26)) ** 2 + (z / (COL.B + 26)) ** 2; if (e < 1) return false;
    if (Math.abs(x - FORUM.x) < FORUM.hw + 14 && Math.abs(z - FORUM.z) < FORUM.hd + 14) return false;
    if (Math.abs(x - CIRCUS.x) < CIRCUS.hw + 16 && Math.abs(z - CIRCUS.z) < CIRCUS.hd + 16) return false;
    if (tiberDist(x, z).d < TIBER_HALF + 26 || coastC(x, z) > -120) return false;
    if (((x - NAUMACHIA.x) / (NAUMACHIA.a + 30)) ** 2 + ((z - NAUMACHIA.z) / (NAUMACHIA.b + 30)) ** 2 < 1) return false;
    if (Math.hypot(x - PALATINE.x, z - PALATINE.z) < 100 || Math.hypot(x - CAPITOL.x, z - CAPITOL.z) < 70) return false;
    // terreno precisa ser razoavelmente plano no quarteirão
    const hs = [[-9, -7], [9, -7], [-9, 7], [9, 7]].map(([a, b]) => terrainHeight(x + a, z + b));
    return Math.max(...hs) - Math.min(...hs) < 2.2;
  };
  let n = 0;
  for (let gx = -560; gx <= 480; gx += 30) for (let gz = -520; gz <= 640; gz += 26) {
    const x = gx + rr(-2, 2), z = gz + rr(-2, 2);
    if (Math.hypot(x, z) > 640 || !free(x, z) || rand() < 0.12) continue;
    const ry = rr(-0.04, 0.04), floors = Math.hypot(x, z) < 300 ? 3 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2);
    insula(B, M, x, z, rr(15, 21), rr(11, 15), ry, floors); n++;
    if (rand() < 0.08) out.torches.push(new THREE.Vector3(x + 11, terrainHeight(x + 11, z) + 2.4, z));
  }
  out.insulae = n;
}

// a Via Sacra (do Coliseu ao Fórum) e a rua em volta do Coliseu, de lajes de basalto
function buildStreets(B, M) {
  const strip = (pts, w) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 4);
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, x = ax + (bx - ax) * (t0 + t1) / 2, z = az + (bz - az) * (t0 + t1) / 2;
        B.box(M.road, w, 0.25, L / n + 0.1, x, terrainHeight(x, z) - 0.15, z, { ry: Math.atan2(bx - ax, bz - az) });
      }
    }
  };
  strip([[-COL.A - 6, -4], [-110, -10], [FORUM.x + FORUM.hw, FORUM.z]], 8);
  const ring = []; for (let i = 0; i <= 48; i++) { const t = (i / 48) * Math.PI * 2; ring.push([(COL.A + 12) * Math.cos(t), (COL.B + 12) * Math.sin(t)]); }
  strip(ring, 9);
}

export function buildCity(scene, tex) {
  const M = createMaterials(tex);
  const B = new Batcher();
  B.yxz = true;
  const out = { M, spots: {}, zones: {}, torches: [], lights: [], sculptures: [], exclusions: [], stalls: [], visitHouses: [], animated: [], boats: [], flags: [], statues: [], gates: [] };
  buildColosseum(B, M, out);
  buildStreets(B, M);
  buildInsulae(B, M, out);
  out.spots.start = new THREE.Vector3(-COL.A - 16, terrainHeight(-COL.A - 16, -6), -6);
  out.spots.quay = out.spots.start;
  B.build(scene);
  for (const o of out.extra || []) scene.add(o);
  return out;
}
