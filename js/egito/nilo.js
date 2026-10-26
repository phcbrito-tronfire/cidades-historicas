// Bichos do Nilo: crocodilos tomando sol nas margens (Sobek, o deus-crocodilo, era venerado em Mênfis, mas os de
// verdade matavam pescadores e lavadeiras) e peixes — tilápias e percas — passando no fundo do rio.
import { riverX, RIVER_HALF, terrainHeight, WATER_Y } from './terrain.js';
import { Crocodiles, SeaLife } from '../comum/fauna.js';

const inRiver = (x, z, margin = 0) => Math.abs(x - riverX(z)) < RIVER_HALF + margin;

// lugar de cada crocodilo: na beira d'água (onde a margem começa a subir), olhando para o rio
function bankSpot(z, side) {
  const rx = riverX(z);
  for (let d = 18; d < RIVER_HALF + 12; d += 0.5) {
    const x = rx + side * d;
    if (terrainHeight(x, z) > WATER_Y - 0.45) return { x: rx + side * (d - 1.2), z, ry: side > 0 ? -Math.PI / 2 + (Math.random() - 0.5) * 0.8 : Math.PI / 2 + (Math.random() - 0.5) * 0.8 };
  }
  return null;
}

export async function buildNile(scene, city, { onBite, onWarn }) {
  // margem leste (a de lá, longe da cidade) e as pontas da margem oeste, longe dos cais e de onde se lava roupa
  const homes = [];
  for (const z of [-340, -230, -120, 10, 130, 250, 345]) { const h = bankSpot(z, 1); if (h) homes.push(h); }
  for (const z of [-330, 335]) { if (Math.abs(z - city.pierZ) < 60 || Math.abs(z - city.pier2Z) < 60) continue; const h = bankSpot(z, -1); if (h) homes.push(h); }
  const crocs = new Crocodiles(scene, { waterY: WATER_Y, floorAt: terrainHeight, inRiver, homes, onBite, onWarn });
  crocs.populate();
  const fish = new SeaLife(scene, {
    waterY: WATER_Y, floorAt: terrainHeight,
    seaPoint: (r) => { for (let i = 0; i < 30; i++) { const z = (r() - 0.5) * 700, x = riverX(z) + (r() - 0.5) * 50; if (WATER_Y - terrainHeight(x, z) > 2) return { x, z }; } return null; },
  });
  fish.populate([['pargo', 9, 0.4, 'fish']]);
  return { crocs, update(dt, t, player) { crocs.update(dt, t, player); fish.update(dt, t, player); } };
}
