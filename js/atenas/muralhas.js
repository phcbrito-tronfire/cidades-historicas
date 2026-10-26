// Muralha de Temístocles (embasamento de pedra e parte alta de adobe, com torres), as Longas Muralhas que ligam a
// cidade ao porto e à praia do Falero, as portas (o Dípilon é a maior) e o cemitério do Cerâmico do lado de fora.
import * as THREE from 'three';
import { addBox } from '../comum/collision.js';
import { terrainHeight } from './terrain.js';
import { rr, rand } from '../comum/util.js';

const V3 = THREE.Vector3;
export const CITY_WALL = [[-470, 60], [-565, -120], [-480, -388], [-250, -415], [60, -405], [300, -250], [335, 60], [150, 262], [-250, 252], [-470, 60]];
export const LONG_WALLS = [[[-470, 60], [-628, 252]], [[-250, 252], [-302, 398]]];
// portas: nome, ponto e meia-largura do vão
export const GATES = [
  { name: 'Dípilon', x: -480, z: -388, w: 9 },
  { name: 'Porta do Pireu', x: -360, z: 156, w: 7 },
  { name: 'Porta de Itônia', x: -60, z: 257, w: 6 },
  { name: 'Porta de Diocares', x: 318, z: -95, w: 6 },
  { name: 'Porta de Acarnas', x: -100, z: -410, w: 6 },
  { name: 'Porta do Falero', x: -290, z: 368, w: 6 }, // na Longa Muralha sul, perto da praia
];

export function buildWalls(B, M, out) {
  const ty = terrainHeight;
  const nearGate = (x, z) => GATES.find((g) => Math.hypot(x - g.x, z - g.z) < g.w);
  const run = (a, b, H, T) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 4);
    const ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    let towerAcc = 0;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, tm = (t0 + t1) / 2;
      const x = a[0] + (b[0] - a[0]) * tm, z = a[1] + (b[1] - a[1]) * tm;
      if (nearGate(x, z)) continue;
      const len = L / n + 0.15, y = ty(x, z);
      if (y < 0.2) continue; // dentro do mar
      B.box(M.wallStone, len, 2.2, T + 0.3, x, y - 0.8, z, { ry });
      B.box(M.mudbrick, len, H - 1.4, T, x, y + 1.4, z, { ry });
      if (i % 2 === 0) B.box(M.mudbrick, Math.min(len, 1.6), 1.0, T * 0.35, x, y + H, z, { ry }); // ameias
      const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
      addBox(x, z, c * len + s * T, s * len + c * T, y - 1, y + H + 1);
      towerAcc += L / n;
      if (towerAcc > 55) { towerAcc = 0; B.box(M.wallStone, 8, 2.4, 8, x, y - 0.9, z, { ry }); B.box(M.mudbrick, 7.6, H + 1.2, 7.6, x, y + 1.4, z, { ry }); B.box(M.tiles, 8.4, 0.4, 8.4, x, y + H + 2.6, z, { ry }); addBox(x, z, 8, 8, y - 1, y + H + 3); }
    }
  };
  for (let i = 0; i < CITY_WALL.length - 1; i++) run(CITY_WALL[i], CITY_WALL[i + 1], 7.5, 3.0);
  for (const [a, b] of LONG_WALLS) run(a, b, 6.5, 2.6);
  // torres de cada lado das portas
  for (const g of GATES) {
    for (const s of [-1, 1]) {
      // direção da muralha nesse ponto: usa o vizinho mais próximo na lista
      const dir = gateDir(g);
      const x = g.x + dir[0] * s * (g.w + 3.5), z = g.z + dir[1] * s * (g.w + 3.5), y = ty(x, z);
      const ry = -Math.atan2(dir[1], dir[0]);
      B.box(M.wallStone, 7, 3, 7, x, y - 1, z, { ry }); B.box(M.mudbrick, 6.6, 8.5, 6.6, x, y + 2, z, { ry }); B.box(M.tiles, 7.4, 0.4, 7.4, x, y + 10.5, z, { ry });
      addBox(x, z, 7, 7, y - 1, y + 11);
    }
    out.gates.push(g);
  }
  // Dípilon: a porta dupla com pátio, por onde passava a procissão das Panateneias
  out.spots.dipylon = new V3(-472, ty(-472, -380), -380);

  // cemitério do Cerâmico, do lado de fora: estelas de mármore, lécitos, túmulos de terra e ciprestes
  out.trees = out.trees || [];
  for (let i = 0; i < 34; i++) {
    const t = rand(), side = rand() < 0.5 ? -1 : 1;
    const x = -494 - t * 70 + side * rr(7, 16) * 0.6, z = -398 - t * 50 + side * rr(7, 16) * 0.8, y = ty(x, z);
    if (y < 0.5) continue;
    const k = rand();
    if (k < 0.55) { // estela com palmeta no topo
      B.box(M.marble, 0.9, 1.6, 0.2, x, y, z, { ry: rand() * 0.4 });
      B.box(M.marble, 1.0, 0.25, 0.25, x, y + 1.6, z, { ry: rand() * 0.4 });
      B.box(M.marble, 1.2, 0.3, 0.6, x, y - 0.1, z);
    } else if (k < 0.66) { // kouros ou leão de mármore sobre o túmulo (marcos funerários)
      B.box(M.marble, 1.2, 1.0, 1.2, x, y, z);
      out.sculptures.push({ model: rand() < 0.5 ? 'kouros' : 'leao', x, y: y + 1, z, ry: rand() * 6.3, length: 1.9, optional: true });
    } else if (k < 0.85) { // lécito de mármore (vaso de óleo funerário)
      const pts = []; for (let j = 0; j <= 10; j++) { const u = j / 10; pts.push(new THREE.Vector2(0.08 + Math.sin(u * Math.PI * 0.9) * 0.28 + (u > 0.85 ? -0.1 : 0), u * 1.5)); }
      B.geo(new THREE.LatheGeometry(pts, 14), M.marble, x, y, z);
    } else { // túmulo de terra
      const m = new THREE.SphereGeometry(2.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); m.scale(1, 0.55, 1);
      B.geo(m, M.earth, x, y - 0.2, z);
    }
    addBox(x, z, 1.2, 1.2, y, y + 1.6);
    if (rand() < 0.4) out.trees.push({ kind: 'cipreste', x: x + rr(-3, 3), z: z + rr(-3, 3) });
  }
  out.spots.cemetery = new V3(-520, ty(-520, -418), -418);
  out.zones.cemiterio = [-580, -484, -470, -392];
}

function gateDir(g) {
  let best = null, bd = 1e9;
  for (const list of [CITY_WALL, ...LONG_WALLS]) for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    const ab = [b[0] - a[0], b[1] - a[1]], l2 = ab[0] ** 2 + ab[1] ** 2;
    const t = Math.max(0, Math.min(1, ((g.x - a[0]) * ab[0] + (g.z - a[1]) * ab[1]) / l2));
    const d = Math.hypot(g.x - (a[0] + ab[0] * t), g.z - (a[1] + ab[1] * t));
    if (d < bd) { bd = d; const l = Math.sqrt(l2); best = [ab[0] / l, ab[1] / l]; }
  }
  return best;
}

// dentro dos muros? (para as casas)
export function insideCity(x, z) {
  let inside = false;
  for (let i = 0, j = CITY_WALL.length - 2; i < CITY_WALL.length - 1; j = i++) {
    const [xi, zi] = CITY_WALL[i], [xj, zj] = CITY_WALL[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
// distância até a muralha mais próxima
export function distToWall(x, z) {
  let bd = 1e9;
  for (const list of [CITY_WALL, ...LONG_WALLS]) for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1], ab = [b[0] - a[0], b[1] - a[1]], l2 = ab[0] ** 2 + ab[1] ** 2;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (z - a[1]) * ab[1]) / l2));
    bd = Math.min(bd, Math.hypot(x - (a[0] + ab[0] * t), z - (a[1] + ab[1] * t)));
  }
  return bd;
}
