// Roma, c. 117 d.C.: monta a cidade a partir das partes — por enquanto o Coliseu (completo e explorável) e os
// bairros de ínsulas em volta; o Fórum, os templos, as termas, o Circo Máximo, o porto e a Naumaquia vêm em seguida.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { addBox, addCircle, blocked } from '../comum/collision.js';
import { rr, rand } from '../comum/util.js';
import { pbrSet, getTextures } from './textures.js';
import { buildColosseum, COL } from './coliseu.js';
import { buildForum } from './forum.js';
import { buildMonuments } from './monumentos.js';
import { buildOstia } from './ostia.js';
import { buildMarket } from './mercado.js';
import { buildPortus } from './portus.js';
import { buildDistricts } from './insulae.js';
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
  M.colMarble = std({ map: T.plainMarble, color: 0xfff8ee, roughness: 0.5 }); M.colMarble.userData.uv = { s: 2 };
  M.granite = std({ color: 0x8a5a4c, roughness: 0.45 });
  M.water = std({ color: 0x3aa8c0, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 });
  M.brick = std({ ...pbrSet(P.medieval_red_brick, 1), color: 0xf0b090 }); M.brick.userData.uv = { s: 1.6 }; // tijolo romano (opus latericium): fino, alaranjado, argamassa grossa
  M.brickY = std({ ...pbrSet(P.brown_brick_02, 1), color: 0xf4d0a8 }); M.brickY.userData.uv = { s: 1.6 }; // tijolo amarelado (outra olaria)
  M.brickPl = std({ ...pbrSet(P.rough_plaster_brick, 1), color: 0xd89070 }); M.brickPl.userData.uv = { s: 2.2 }; // reboco gasto sobre tijolo
  M.shutter = std({ ...pbrSet(P.madeira_clara, 1), color: 0x7a4a2a }); M.shutter.userData.uv = { s: 1.5 }; // venezianas de madeira
  M.plant = std({ color: 0x4a7a32, roughness: 0.9, flatShading: true });
  M.terracotta = std({ color: 0xb4623a, roughness: 0.85 });
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

// árvores: pinheiros-mansos (a copa em guarda-chuva, típica de Roma) e ciprestes, nas colinas, jardins, margens do
// rio e arredores — instanciadas (duas malhas por espécie para a cidade toda)
function buildTrees(scene, M, ex = []) {
  const pines = [], cyps = [];
  for (let i = 0; i < 2600; i++) {
    const x = rr(-960, 270), z = rr(-410, 900), h = terrainHeight(x, z);
    if (h < 1.2 || coastC(x, z) > -40) continue;
    const e = (x / (COL.A + 30)) ** 2 + (z / (COL.B + 30)) ** 2; if (e < 1.3) continue;
    if (Math.abs(x - FORUM.x) < FORUM.hw + 6 && Math.abs(z - FORUM.z) < FORUM.hd + 6) continue;
    if (Math.abs(x - CIRCUS.x) < CIRCUS.hw + 4 && Math.abs(z - CIRCUS.z) < CIRCUS.hd + 4) continue;
    if (((x - NAUMACHIA.x) / (NAUMACHIA.a + 18)) ** 2 + ((z - NAUMACHIA.z) / (NAUMACHIA.b + 18)) ** 2 < 1) continue;
    const td = tiberDist(x, z).d; if (td < TIBER_HALF + 4) continue;
    if (ex.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue;
    const hilly = h > 16, bank = td < TIBER_HALF + 40, out = Math.hypot(x + 160, z - 30) > 520;
    if (!hilly && !bank && !out && rand() > 0.04) continue; // na cidade, só uma árvore aqui e ali (jardins)
    if (blocked(x, z, h, 1.2, 4)) continue;
    (rand() < 0.62 ? pines : cyps).push([x, h, z, rr(0.8, 1.25), rand() * 6]);
  }
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.95 });
  const pineM = new THREE.MeshStandardMaterial({ color: 0x3f5f2c, roughness: 0.9, flatShading: true });
  const cypM = new THREE.MeshStandardMaterial({ color: 0x2c4424, roughness: 0.9, flatShading: true });
  const inst = (geo, mat, list, f) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D();
    list.forEach((p, i) => { f(d, p); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
  };
  const trunk = new THREE.CylinderGeometry(0.22, 0.32, 9, 7); trunk.translate(0, 4.5, 0); trunk.rotateZ(0.06);
  const crown = new THREE.IcosahedronGeometry(1, 1); crown.scale(4.2, 1.5, 4.2); crown.translate(0.5, 9.6, 0);
  inst(trunk, trunkM, pines, (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.3, z); d.rotation.set(0, r, 0); d.scale.setScalar(s); });
  inst(crown, pineM, pines, (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.3, z); d.rotation.set(0, r, 0); d.scale.setScalar(s); });
  const cyp = new THREE.IcosahedronGeometry(1, 1); cyp.scale(1.1, 5.2, 1.1); cyp.translate(0, 5.4, 0);
  const cypT = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6); cypT.translate(0, 0.6, 0);
  inst(cypT, trunkM, cyps, (d, [x, y, z, s]) => { d.position.set(x, y - 0.2, z); d.rotation.set(0, 0, 0); d.scale.setScalar(s); });
  inst(cyp, cypM, cyps, (d, [x, y, z, s, r]) => { d.position.set(x, y - 0.2, z); d.rotation.set(0, r, 0); d.scale.set(s, s * rr(0.85, 1.2), s); });
  for (const [x, y, z] of [...pines, ...cyps]) addCircle(x, z, 0.4, y - 1, y + 6);
  return pines.length + cyps.length;
}

export function buildCity(scene, tex) {
  const M = createMaterials(tex);
  const B = new Batcher();
  B.yxz = true;
  const out = { M, spots: {}, zones: {}, torches: [], lights: [], sculptures: [], exclusions: [], stalls: [], visitHouses: [], animated: [], boats: [], flags: [], statues: [], gates: [] };
  buildColosseum(B, M, out);
  buildStreets(B, M);
  buildForum(B, M, out);
  buildMonuments(B, M, out); // aqueduto, Termas de Trajano, Panteão em obras
  buildOstia(B, M, out); // o porto na foz do Tibre
  buildPortus(B, M, out); // o porto hexagonal de Trajano
  buildMarket(B, M, out); // Fórum Boário: barracas, cercado do gado e o templo de Hércules
  buildDistricts(B, M, out); // os bairros: Subura, Ópio, Célio, Aventino, Trastévere, Campo de Marte
  out.spots.start = new THREE.Vector3(-COL.A - 16, terrainHeight(-COL.A - 16, -6), -6);
  B.build(scene);
  for (const o of out.extra || []) scene.add(o);
  out.trees = buildTrees(scene, M, out.exclusions);
  return out;
}
