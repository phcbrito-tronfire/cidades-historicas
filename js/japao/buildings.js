// O Japão do pé do Fuji, montado a partir das partes: a vila dos oshi, o santuário Sengen, o templo da colina, a
// residência do senhor e a trilha da montanha (as estações e o cume). Tudo pelo Batcher com o gancho do chão.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { createMaterials } from './kit.js';
import { buildVillage } from './vila.js';
import { buildShrine } from './santuario.js';
import { buildTemple } from './templo.js';
import { buildResidence } from './residencia.js';
import { buildMountain } from './montanha.js';
import { buildPaddies } from './arrozal.js';
import { buildExtras } from './extras.js';
import { terrainHeight, STREET } from './terrain.js';

export function buildCity(scene, tex) {
  const M = createMaterials(tex);
  const B = new Batcher();
  B.yxz = true;
  B.ground = terrainHeight;
  const floors = []; B.onFloor = (r) => floors.push(r);
  const out = { M, spots: {}, zones: {}, torches: [], lights: [], houses: [], hearths: [], seats: [], oshi: [], farms: [], guards: [], stations: [], exclusions: [], extra: [], animated: [] };
  buildShrine(B, M, out);
  buildVillage(B, M, out);
  buildTemple(B, M, out);
  buildResidence(B, M, out);
  buildMountain(B, M, out);
  buildExtras(B, M, out); // aldeias, moinho, chá, Inari, pagode, a casinha do cume
  out.paddies = buildPaddies(scene, M, B, { floors });
  out.spots.start = new THREE.Vector3(STREET.x, terrainHeight(STREET.x, -330), -330);
  B.build(scene);
  for (const o of out.extra) scene.add(o);
  out.floors = floors;
  return out;
}
