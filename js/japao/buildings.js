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
import { terrainHeight, STREET } from './terrain.js';

export function buildCity(scene, tex) {
  const M = createMaterials(tex);
  const B = new Batcher();
  B.yxz = true;
  B.ground = terrainHeight;
  const floors = []; B.onFloor = (r) => floors.push(r);
  const out = { M, spots: {}, zones: {}, torches: [], lights: [], houses: [], hearths: [], seats: [], oshi: [], farms: [], guards: [], stations: [], exclusions: [] };
  buildShrine(B, M, out);
  buildVillage(B, M, out);
  buildTemple(B, M, out);
  buildResidence(B, M, out);
  buildMountain(B, M, out);
  out.spots.start = new THREE.Vector3(STREET.x, terrainHeight(STREET.x, -330), -330);
  B.build(scene);
  out.floors = floors;
  return out;
}
