// Vila Rica construída a partir das partes: as casas das ruas (casas.js) e, a seguir, as igrejas, o Palácio, a
// Câmara em obra, a Casa dos Contos, a Casa da Ópera e os chafarizes. Tudo pelo Batcher, com o gancho do chão.
import { Batcher } from '../comum/batcher.js';
import { createMaterials } from './kit.js';
import { buildHouses } from './casas.js';
import { buildMonuments } from './monumentos.js';
import { terrainHeight } from './terrain.js';

export function buildCity(scene, tex) {
  const M = createMaterials(tex);
  const B = new Batcher();
  B.yxz = true;
  B.ground = terrainHeight;
  const floors = []; B.onFloor = (r) => floors.push(r);
  const out = { M, houses: [], press: [], torches: [], lights: [], spots: {} };
  buildMonuments(B, M, out);
  out.rects = buildHouses(B, M, out);
  B.build(scene);
  out.floors = floors.concat(out.press);
  return out;
}
