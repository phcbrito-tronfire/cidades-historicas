// Atenas, 432 a.C. (ano em que o Parthenon fica pronto): monta a cidade a partir das partes — Acrópole,
// encosta sul (teatro e Odeon), ágora e Hefesteion, Pnyx, bairros de casas, muralhas, Cerâmico e o porto.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { pbrSet, getTextures } from './textures.js';
import { templeTextures } from './relevos.js';
import { buildAcropolis } from './acropole.js';
import { buildAgora } from './agora.js';
import { buildHouses } from './casas.js';
import { buildWalls } from './muralhas.js';
import { buildHarbor } from './porto.js';
import { buildIslands } from './ilhas.js';
import { addTorches } from './luzes.js';
import { terrainHeight } from './terrain.js';

export function createMaterials(tex) {
  const P = tex.pbr, T = getTextures();
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  const M = {};
  // mármore pentélico: branco quente, que com o tempo ganha um tom de mel
  M.marble = std({ ...pbrSet(P.marble_01, 1), color: 0xfff6ea, roughness: 0.55 }); M.marble.userData.uv = { s: 3 };
  M.colMarble = std({ map: T.plainMarble, color: 0xfff8ee, roughness: 0.5 }); M.colMarble.userData.uv = { s: 2 };
  M.marbleWall = std({ ...pbrSet(P.marble_01, 1), color: 0xf6ecdc, roughness: 0.6 }); M.marbleWall.userData.uv = { s: 2.2 };
  // a foto do Poly Haven tem tom de arenito: tira a maior parte da cor (fica o desenho dos blocos e veios) e clareia,
  // para ler como o mármore branco recém-cortado de 432 a.C.
  const whiten = (m, keep, lift) => { m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, ${keep.toFixed(2)}) * ${lift.toFixed(2)} * vec3(1.04, 1.0, 0.93); l = dot(diffuseColor.rgb, vec3(0.333)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l), 0.0) + 0.06; }`); }; };
  whiten(M.marble, 0.42, 1.15); whiten(M.marbleWall, 0.42, 1.15);
  M.poros = std({ ...pbrSet(P.marble_01, 1), color: 0xe2cfa8, roughness: 0.85 }); M.poros.userData.uv = { s: 2.6 }; // calcário (poros) em blocos: alicerces, muros de arrimo
  M.paintRed = std({ color: 0x9a2a1e, roughness: 0.7 });
  M.paintBlue = std({ color: 0x1f3a7a, roughness: 0.7 });
  M.triglyph = std({ color: 0x1d2d5c, roughness: 0.6 });
  M.metope = std({ ...pbrSet(P.marble_01, 1), color: 0xf2e6d2, roughness: 0.6 }); M.metope.userData.uv = { s: 1.5 };
  M.pediment = std({ color: 0x2f4f8f, roughness: 0.7 }); // fundo azul do frontão (as estátuas ficam na frente)
  M.roofTiles = std({ map: pbrSet(P.marble_01, 1).map, normalMap: pbrSet(P.clay_roof_tiles_02, 1).normalMap, color: 0xfbf6ee, roughness: 0.5 }); M.roofTiles.userData.uv = { s: 2.4 }; // telhas de mármore (o relevo das telhas, a cor do mármore)
  M.tiles = std({ ...pbrSet(P.clay_roof_tiles_02, 1), color: 0xffffff }); M.tiles.userData.uv = { s: 2.2 }; // telhas de barro
  M.ceiling = std({ map: T.coffers, color: 0xffffff, roughness: 0.8 }); M.ceiling.userData.uv = { s: 2.6 }; // forro de caixotões azuis com estrelas douradas
  M.gold = std({ color: 0xffc64a, metalness: 1, roughness: 0.28 });
  // relevos e pinturas dos templos (métopas, friso, molduras, antefixas, piso de lajes)
  { const R = templeTextures();
    M.metopeR = R.metopes.map((t) => std({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.6 }));
    M.frieze = R.frieze.map((t) => std({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.6 }));
    M.molding = std({ map: R.molding, roughness: 0.65 });
    M.antefix = std({ map: R.antefix, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
    M.slabs = std({ map: R.slabs.map, normalMap: R.slabs.normalMap, roughness: 0.5 }); M.slabs.userData.uv = { s: 4 }; }
  M.bronze = std({ color: 0xa8743a, metalness: 0.9, roughness: 0.35 });
  M.wood = std({ ...pbrSet(P.madeira_clara, 1), color: 0xe8c8a0 }); M.wood.userData.uv = { s: 2 };
  M.darkWood = std({ ...pbrSet(P.madeira_clara, 1), color: 0x9a7452 }); M.darkWood.userData.uv = { s: 2 };
  M.plaster = std({ ...pbrSet(P.cal_branca, 1), color: 0xffffff, roughness: 0.9 }); // cal (foto clareada) M.plaster.userData.uv = { s: 3 };
  M.plasterOchre = std({ ...pbrSet(P.barro_ocre, 1), color: 0xffffff }); M.plasterOchre.userData.uv = { s: 3 };
  M.mudbrick = std({ ...pbrSet(P.rough_plaster_brick, 1), color: 0xf8e2c0 }); M.mudbrick.userData.uv = { s: 2.5 };
  M.socle = std({ ...pbrSet(P.pedra_clara, 1), color: 0xffffff }); M.socle.userData.uv = { s: 2.5 };
  M.wallStone = std({ ...pbrSet(P.pedra_clara, 1), color: 0xfff6e4 }); M.wallStone.userData.uv = { s: 4 };
  M.rock = std({ ...pbrSet(P.rock_face_03, 1), color: 0xf2e6d4, roughness: 0.95 }); M.rock.userData.uv = { s: 3 };
  M.quay = std({ ...pbrSet(P.seaworn_stone_tiles, 1), color: 0xe2d6bc }); M.quay.userData.uv = { s: 4 };
  M.stoaWall = std({ map: T.stucco('#2c2a28', '#8e2c22'), color: 0xffffff, roughness: 0.9 }); M.stoaWall.userData.uv = { s: 6, sv: 6 };
  M.redFigure = std({ map: T.redFigure, roughness: 0.3 });
  M.terracotta = std({ color: 0xb4623a, roughness: 0.8 });
  M.cloth = (base, border) => std({ map: T.cloth(base, border), roughness: 0.95, side: THREE.DoubleSide });
  M.awning = [M.cloth('#efe6d2', '#a8392a'), M.cloth('#e9dcc0', '#2c4f8c'), M.cloth('#d8b45a', '#3d5f39')];
  M.earth = std({ ...pbrSet(P.dry_ground_rocks, 1), color: 0xfff0d8 }); M.earth.userData.uv = { s: 4 };
  M.road = std({ ...pbrSet(P.rocky_trail, 1), color: 0xe0d2b8, polygonOffset: true, polygonOffsetFactor: -2 }); M.road.userData.uv = { s: 5 };
  M.water = std({ color: 0x3a7f8a, roughness: 0.08, metalness: 0.2 });
  M.fire = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  M.window = std({ color: 0x2a1a10, emissive: 0xffa040, emissiveIntensity: 0 }); // janelinhas acesas à noite
  M.flame = new THREE.MeshBasicMaterial({ color: 0xffb050 });
  return M;
}

export function buildCity(scene, tex, available = new Set()) {
  const M = createMaterials(tex);
  const B = new Batcher();
  B.yxz = true; // peças giradas e inclinadas: inclinação no eixo da própria peça
  const out = {
    M, spots: {}, zones: {}, torches: [], lights: [], sculptures: [], exclusions: [], stalls: [], visitHouses: [], animated: [],
    boats: [], flags: [], statues: [], gates: [], available,
  };
  buildAcropolis(B, M, out);
  buildAgora(B, M, out);
  buildWalls(B, M, out);
  buildHarbor(B, M, out);
  buildIslands(B, M, out); // Psitália e a ponta de Salamina
  buildHouses(B, M, out); // por último: as casas ocupam o que sobrou
  addTorches(B, M, out); // postes com braseiro nas ruas, ágora, cais, Acrópole e ilhas (depois das casas: não caem dentro delas)
  // as 5 corujas de prata (tetradracmas)
  {
    const S = out.spots, V = (x, y, z) => new THREE.Vector3(x, y, z);
    S.owl1 = V(S.parthenon.x - 26, S.parthenon.y, S.parthenon.z + 6); // no fundo do templo, onde se guardava o tesouro
    S.owl2 = V(S.bema.x - 1.2, S.bema.y, S.bema.z + 1.2);
    S.owl3 = V(S.themistocles.x, S.themistocles.y, S.themistocles.z);
    S.owl4 = V(S.cemetery.x - 6, S.cemetery.y, S.cemetery.z - 4);
    S.owl5 = V(-150, terrainHeight(-150, -98), -98); // no alto do Areópago
  }
  B.build(scene);
  for (const o of out.extra || []) scene.add(o);
  return out;
}
