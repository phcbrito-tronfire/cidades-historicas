// Varredura de peças flutuando (ferramenta de teste). Abrir a cidade com ?scan=1 e, no console:
//   const r = await (await import('./tools/flutuantes.js')).scan()
// Lista as peças do Batcher que não encostam em nada (chão, água ou outra peça) com a base acima do chão,
// agrupadas pela linha do código que as criou. Modelos baixados e bonecos não entram (não passam pelo Batcher).
import { terrainAt, waterAt } from '../js/comum/collision.js';

export function scan({ minGap = 0.1, e = 0.06 } = {}) {
  const P = globalThis.__pieces; if (!P) return 'abra a página com ?scan=1';
  const H = new Map(), S = 4, key = (i, j) => i + ',' + j;
  P.forEach((p, n) => { const b = p.b; for (let i = Math.floor(b.min.x / S); i <= Math.floor(b.max.x / S); i++) for (let j = Math.floor(b.min.z / S); j <= Math.floor(b.max.z / S); j++) { const k = key(i, j); if (!H.has(k)) H.set(k, []); H.get(k).push(n); } });
  const out = [];
  P.forEach((p, n) => {
    const b = p.b, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, sx = (b.max.x - b.min.x) * 0.4, sz = (b.max.z - b.min.z) * 0.4;
    const gap = b.min.y - Math.max(...[[0, 0], [-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz]].map(([dx, dz]) => terrainAt(cx + dx, cz + dz)));
    if (gap < minGap || b.min.y <= waterAt(cx, cz) + 0.3) return;
    const seen = new Set();
    for (let i = Math.floor((b.min.x - e) / S); i <= Math.floor((b.max.x + e) / S); i++) for (let j = Math.floor((b.min.z - e) / S); j <= Math.floor((b.max.z + e) / S); j++) for (const m of H.get(key(i, j)) || []) {
      if (m === n || seen.has(m)) continue; seen.add(m); const q = P[m].b;
      if (q.min.x <= b.max.x + e && q.max.x >= b.min.x - e && q.min.z <= b.max.z + e && q.max.z >= b.min.z - e && q.min.y <= b.max.y + e && q.max.y >= b.min.y - e) return;
    }
    out.push({ src: p.src, gap: +gap.toFixed(2), x: +cx.toFixed(1), y: +b.min.y.toFixed(2), z: +cz.toFixed(1), size: [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((v) => +v.toFixed(2)).join('x') });
  });
  const by = {}; for (const o of out) (by[o.src] ||= []).push(o);
  globalThis.__floats = out;
  return { pieces: P.length, floating: out.length, bySrc: Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([s, l]) => ({ src: s, n: l.length, ex: l.slice(0, 2).map((o) => `gap ${o.gap} em (${o.x}, ${o.y}, ${o.z}) ${o.size}`) })) };
}
