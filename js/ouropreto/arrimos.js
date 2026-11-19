// Os quintais de arrimo: Vila Rica é toda em ladeira, e a casa (ou a igreja) que fica abaixo do morro tem atrás e dos
// lados um corredor no nível do piso, segurado por um muro de pedra seca até o chão do morro — como ainda se vê em
// Ouro Preto. Antes, a malha do chão (um vértice a cada 2 m) era rebaixada em volta de cada piso e abria uma vala de
// terra em V encostada nas paredes; e cobrir a vala com o morro enterraria as portas e janelas dos fundos.
// Aqui: (1) o corredor (1,2 m, no nível do piso; na frente da porta, não) entra no chão de verdade (a colisão);
// (2) a tampa refaz o morro fora do corredor; (3) o muro de arrimo fecha a beira do corredor onde o morro é mais alto.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { addRotBox } from '../comum/collision.js';
import { pressAtTight } from '../comum/chao.js';
import { terrainHeight, tamparValas, setPassagens } from './terrain.js';

const PAS = 1.2, T = 0.5;

export function arrimos(scene, M, city, world) {
  // os prédios: as casas (piso = o y da casa; a porta na frente, +z local) e as igrejas (a porta pela posição dela)
  const prs = [];
  for (const h of city.houses) prs.push({ x: h.x, z: h.z, w: h.w, d: h.d, ry: h.ry, top: h.y, door: h.door });
  for (const c of city.churches || []) { const f = city.floors.find((q) => Math.hypot(q.x - c.x, q.z - c.z) < 1.5); if (f) prs.push({ x: f.x, z: f.z, w: f.w, d: f.d, ry: f.ry || 0, top: f.top, door: c.door }); }
  // o lado da porta (no quadro do prédio): u = ±1 (lados em x), v = ±1 (lados em z)
  for (const p of prs) { const c = Math.cos(p.ry), s = Math.sin(p.ry); p.c = c; p.s = s;
    if (p.door) { const dx = p.door[0] - p.x, dz = p.door[1] - p.z, u = dx * c - dz * s, v = dx * s + dz * c; p.doorSide = Math.abs(u) / (p.w / 2) > Math.abs(v) / (p.d / 2) ? ['u', Math.sign(u)] : ['v', Math.sign(v)]; }
    p.e = { 'u-1': PAS, u1: PAS, 'v-1': PAS, v1: PAS }; if (p.doorSide) p.e[p.doorSide[0] + p.doorSide[1]] = 0; }
  setPassagens(prs);
  const inPr = (x, z, m = 0) => prs.some((p) => { const dx = x - p.x, dz = z - p.z; if (Math.abs(dx) + Math.abs(dz) > p.w + p.d + 2 * m) return false; const u = dx * p.c - dz * p.s, v = dx * p.s + dz * p.c; return Math.abs(u) <= p.w / 2 + m && Math.abs(v) <= p.d / 2 + m; });
  // os muros de arrimo: na beira de fora de cada corredor, em lanços de 1 m, do piso até o chão do morro
  const B = new Batcher(); let n = 0;
  const W = (p, u, v) => [p.x + u * p.c + v * p.s, p.z - u * p.s + v * p.c];
  for (const p of prs) {
    const hu = p.w / 2, hv = p.d / 2, e = p.e;
    const sides = [ // [eixo, sinal, de, até] — o lado corre ao longo do outro eixo, incluindo as quinas dos corredores vizinhos
      ['v', -1, -hu - e['u-1'], hu + e.u1], ['v', 1, -hu - e['u-1'], hu + e.u1], ['u', -1, -hv - e['v-1'], hv + e.v1], ['u', 1, -hv - e['v-1'], hv + e.v1]];
    for (const [ax, sg, a0, a1] of sides) { const ex = e[ax + sg]; if (!ex) continue; // (o lado da porta não tem corredor nem muro)
      const off = (ax === 'u' ? hu : hv) + ex + T / 2, L = a1 - a0, nseg = Math.max(1, Math.round(L / 0.5)), sl = L / nseg; // (lanços de meio metro: o muro chega rente à casa vizinha, sem vão)
      for (let k = 0; k < nseg; k++) { const t = a0 + (k + 0.5) * sl, [u, v] = ax === 'u' ? [sg * off, t] : [t, sg * off];
        const [cx, cz] = W(p, u, v); if (pressAtTight(cx, cz, 0) < Infinity || inPr(cx, cz, 0.1)) continue; // (dentro de outro piso ou de outra casa: lá não)
        let g = -Infinity, lo = Infinity; for (const q of [-0.5, 0, 0.5]) for (const o2 of [-T / 2, 0, T / 2, T / 2 + 0.3]) { const tt = t + q * sl, [ou, ov] = ax === 'u' ? [sg * (off + o2), tt] : [tt, sg * (off + o2)]; const hh = terrainHeight(...W(p, ou, ov)); if (o2 === T / 2 + 0.3) g = Math.max(g, hh); lo = Math.min(lo, hh); }
        if (g - p.top < 0.35) continue; // (o morro quase no nível do piso: sem muro)
        const y0 = Math.min(p.top, lo) - 0.35, /* (o pé abaixo do ponto mais baixo do chão em volta: nada de vão debaixo do muro) */ h = g + 0.12 - y0, [bw, bd] = ax === 'u' ? [T, sl + 0.02] : [sl + 0.02, T];
        B.box(M.pedra, bw, h, bd, cx, y0, cz, { ry: p.ry, noGround: true }); addRotBox(cx, cz, bw, bd, p.ry, y0, g + 0.12, true); n++; } }
  }
  B.build(scene);
  // a tampa (o morro de volta, fora dos corredores) — depois dos muros: ela olha onde eles estão
  const tampa = tamparValas(world.terrain, city.floors, (x, z) => inPr(x, z, 0.05)); if (tampa) scene.add(tampa);
  console.info('arrimos:', n, 'lanços · tampa:', tampa ? tampa.geometry.index.count / 6 : 0);
  city.predios = prs; // (para os testes: a varredura de buracos em volta dos prédios)
  return { tampa, n };
}
