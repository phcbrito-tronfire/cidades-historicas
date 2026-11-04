// A montanha: o que os peregrinos encontravam na trilha Yoshida. Marcos de pedra com a altura de cada trecho,
// a "pedra das mulheres" (nyonin-tenba: no período Edo as mulheres não podiam subir além dali — a proibição só caiu
// em 1872), as estações de descanso (gōme, "décimos" da subida): cabanas baixas de pedra vulcânica com o teto
// de madeira preso por pedras contra o vento, onde se comprava água, chá e um carimbo no cajado; e no cume, a
// borda da cratera com o santuário de cima (okumiya) e o torii, onde os peregrinos esperavam o nascer do sol
// (goraikō) gritando "Rokkon shōjō!" — "que os seis sentidos se purifiquem".
import * as THREE from 'three';
import { addCircle } from '../comum/collision.js';
import { frame, torii, shimenawa } from './kit.js';
import { terrainHeight, TRAIL, FUJI, polyDist, STATIONS, trailAt } from './terrain.js';

const V3 = THREE.Vector3;
export { trailAt } from './terrain.js';

function hut(B, M, out, x, z, ry, n, name) {
  const w = 7, d = 4.5, H = 2.1;
  const y = terrainHeight(x, z) + 0.05; // (num patamar plano cortado na encosta)
  const f = frame(B, x, y, z, ry);
  f.box(M.lava, w + 0.6, 0.4, d + 0.6, 0, -0.3, 0);
  f.wall(M.lava, -w / 2, -d / 2, w / 2, -d / 2, H, 0.6); f.wall(M.lava, -w / 2, -d / 2, -w / 2, d / 2, H, 0.6); f.wall(M.lava, w / 2, -d / 2, w / 2, d / 2, H, 0.6);
  f.wall(M.wood, -w / 2, d / 2, w / 2, d / 2, H, 0.12, [[w / 2 - 1, 1.8, 1.8]]);
  f.box(M.wood, w - 1.2, 0.4, 1.4, 0, 0, -d / 2 + 1.0); f.box(M.straw, w - 1.4, 0.06, 1.2, 0, 0.4, -d / 2 + 1.0); // o estrado onde se dormia, com esteiras
  f.box(M.wood, w + 1, 0.2, d + 1.2, 0, H, 0, { rx: 0.06 }); // o teto de tábuas
  for (let i = 0; i < 8; i++) f.geo(new THREE.DodecahedronGeometry(0.3 + (i % 3) * 0.08, 0), M.lava, -w / 2 + 0.7 + (i % 4) * 1.8, H + 0.35, i < 4 ? -0.9 : 0.9, { uv: false }); // as pedras que seguram o teto
  f.box(M.wood, 1.6, 0.45, 0.6, 1.5, 0, d / 2 + 1.0); f.solid(1.5, d / 2 + 1.0, 1.6, 0.6, -1, 0.45); // o banco de fora
  f.box(M.wood, 0.12, 1.8, 0.12, -1.6, 0, d / 2 + 0.6); f.box(M.paper, 0.5, 1.2, 0.03, -1.6, 0.8, d / 2 + 0.66, { noGround: true }); // a placa com o nome da estação
  f.box(M.noren[1], 1.7, 0.5, 0.02, w / 2 - 1, 1.7, d / 2 + 0.08, { noGround: true });
  const [ix, iz] = f.W(-1.5, -0.2); out.torches.push(new V3(ix, y + 0.5, iz));
  out.stations.push({ n, name, x, z, y, ry, door: f.W(w / 2 - 1, d / 2 + 1.6), bench: f.W(1.5, d / 2 + 1.0) });
}

export function buildMountain(B, M, out) {
  // marcos de pedra a cada ~120 m (a altura em "go", os décimos tradicionais da subida)
  for (let f = 0.06; f < 0.98; f += 0.055) { const p = trailAt(f), x = p.x + p.dz * 2.8, z = p.z - p.dx * 2.8, y = terrainHeight(x, z);
    B.box(M.stone, 0.4, 1.2, 0.3, x, y, z, { ry: Math.atan2(p.dx, p.dz) }); B.box(M.stone, 0.6, 0.25, 0.5, x, y, z); addCircle(x, z, 0.3, y - 1, y + 1.2); }
  // as estações: 1ª (na floresta), 2ª (a das mulheres), 3ª, 5ª (o meio da montanha, onde acaba a floresta), 7ª, 8ª
  for (const st of STATIONS) hut(B, M, out, st.x, st.z, st.ry, st.n, st.name);
  // a pedra das mulheres, na segunda estação: um pequeno altar de pedra e a corda sagrada
  { const p = trailAt(0.22), x = p.x - p.dz * 4, z = p.z + p.dx * 4, y = terrainHeight(x, z);
    B.geo(new THREE.DodecahedronGeometry(1.1, 1), M.lava, x, y + 0.7, z, { sy: 1.2, uv: false }); shimenawa(B, M, x - 1.0, y + 1.3, z, x + 1.0, z, 0.1); addCircle(x, z, 1.0, y - 1, y + 2);
    out.spots.nyonin = new V3(x + p.dz, y, z - p.dx); }
  // o cume: o santuário de cima (okumiya) na borda norte da cratera, o torii de pedra e os montes de pedra (cairns)
  { const x = FUJI.x, z = FUJI.z - FUJI.crater - 10, y = terrainHeight(x, z);
    torii(B, M, x, y, z - 6, 0, 4, 4.4, 'shinmei');
    const f = frame(B, x + 7, terrainHeight(x + 7, z), z, Math.PI);
    f.wall(M.lava, -2.5, -2, 2.5, -2, 1.8, 0.7); f.wall(M.lava, -2.5, -2, -2.5, 2, 1.8, 0.7); f.wall(M.lava, 2.5, -2, 2.5, 2, 1.8, 0.7);
    f.box(M.cedar, 2, 1.4, 1.4, 0, 0.3, -0.6); f.roof(M.bark, 2.6, 2.2, 0.7, 1.7, { thick: 0.15, sori: 0.3, gable: true }, 0, -0.6); f.box(M.gold, 0.4, 0.4, 0.04, 0, 1.0, 0.12);
    f.box(M.wood, 6, 0.3, 5, 0, 1.8, 0, { rx: 0.05 }); for (let i = 0; i < 6; i++) f.geo(new THREE.DodecahedronGeometry(0.32, 0), M.lava, -2 + (i % 3) * 2, 2.2, i < 3 ? -1.2 : 1.2, { uv: false });
    for (let i = 0; i < 7; i++) { const a = -0.8 + i * 0.26, cxr = FUJI.x + Math.sin(a) * (FUJI.crater + 6), czr = FUJI.z - Math.cos(a) * (FUJI.crater + 6), cy = terrainHeight(cxr, czr);
      for (let k = 0; k < 3; k++) B.geo(new THREE.DodecahedronGeometry(0.35 - k * 0.08, 0), M.lava, cxr, cy + 0.25 + k * 0.4, czr, { uv: false }); addCircle(cxr, czr, 0.4, cy - 1, cy + 1.2); }
    out.spots.summit = new V3(x, y, z); out.spots.okumiya = new V3(x + 7, terrainHeight(x + 7, z + 4), z + 4); }
  void polyDist;
}
