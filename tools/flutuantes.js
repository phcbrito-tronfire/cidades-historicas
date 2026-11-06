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
  if (arguments[0]?.groups) return { ...groups(P, H, S, key, e, minGap), single: out.length };
  return { pieces: P.length, floating: out.length, bySrc: Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([s, l]) => ({ src: s, n: l.length, ex: l.slice(0, 2).map((o) => `gap ${o.gap} em (${o.x}, ${o.y}, ${o.z}) ${o.size}`) })) };
}

// Grupos inteiros no ar: junta as peças que se encostam (uma casa, um templo) e aponta o grupo em que nenhuma peça
// toca o chão — a casa toda flutuando, que a busca de peça solta não pega. scan({ groups: true })
function groups(P, H, S, key, e, minGap) {
  const par = P.map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  P.forEach((p, n) => { const b = p.b;
    for (let i = Math.floor((b.min.x - e) / S); i <= Math.floor((b.max.x + e) / S); i++) for (let j = Math.floor((b.min.z - e) / S); j <= Math.floor((b.max.z + e) / S); j++) for (const m of H.get(key(i, j)) || []) {
      if (m <= n) continue; const q = P[m].b;
      if (q.min.x <= b.max.x + e && q.max.x >= b.min.x - e && q.min.z <= b.max.z + e && q.max.z >= b.min.z - e && q.min.y <= b.max.y + e && q.max.y >= b.min.y - e) { const a = find(n), c = find(m); if (a !== c) par[a] = c; }
    } });
  const G = new Map();
  P.forEach((p, n) => { const r = find(n); let g = G.get(r); if (!g) G.set(r, (g = { n: 0, low: Infinity, grounded: false, wet: false, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], src: {} }));
    const b = p.b; g.n++; g.src[p.src] = (g.src[p.src] || 0) + 1;
    for (const [k, v] of [['x', 0], ['y', 1], ['z', 2]]) { g.min[v] = Math.min(g.min[v], b.min[k]); g.max[v] = Math.max(g.max[v], b.max[k]); }
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, sx = (b.max.x - b.min.x) * 0.45, sz = (b.max.z - b.min.z) * 0.45;
    for (const [dx, dz] of [[0, 0], [-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz]]) { const gap = b.min.y - terrainAt(cx + dx, cz + dz); g.low = Math.min(g.low, gap); if (gap < minGap) g.grounded = true; if (b.min.y <= waterAt(cx + dx, cz + dz) + 0.3) g.wet = true; } });
  const fl = [...G.values()].filter((g) => !g.grounded && !g.wet && g.n >= 2).sort((a, b) => b.n - a.n);
  globalThis.__groups = fl;
  // apoiados só de um lado: as peças da base (as mais baixas do grupo) com um canto a mais de 35 cm do chão — o lado
  // de baixo da casa na encosta, com o vão aparecendo por baixo
  const part = [];
  P.forEach((p, n) => { const g = G.get(find(n)); if (!g.grounded || g.n < 6) return; const b = p.b; if (b.min.y > g.min[1] + 0.3) return;
    const sx = (b.max.x - b.min.x) / 2, sz = (b.max.z - b.min.z) / 2; if (sx < 0.4 && sz < 0.4) return;
    const cx = b.min.x + sx, cz = b.min.z + sz; let worst = 0, wx = 0, wz = 0;
    for (const [dx, dz] of [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz], [0, -sz], [0, sz], [-sx, 0], [sx, 0]]) { const x = cx + dx, z = cz + dz, gap = b.min.y - terrainAt(x, z); if (gap > worst && b.min.y > waterAt(x, z) + 0.3) { worst = gap; wx = x; wz = z; } }
    if (worst > 0.35) { const k = Object.keys(g.src)[0]; (g.part ||= []).push({ gap: worst, x: wx, z: wz, src: p.src }); if (g.part.length === 1) part.push(g); } });
  globalThis.__partial = part;
  const partial = part.map((g) => { const w = g.part.sort((a, b) => b.gap - a.gap)[0]; return `${g.n} vão ${w.gap.toFixed(2)} em (${w.x.toFixed(1)}, ${w.z.toFixed(1)}) ${w.src}`; });
  return { partial: partial.slice(0, 60), partialN: partial.length, groups: G.size, floatingGroups: fl.length, list: fl.slice(0, 40).map((g) => ({ n: g.n, gap: +g.low.toFixed(2), at: [(g.min[0] + g.max[0]) / 2, g.min[1], (g.min[2] + g.max[2]) / 2].map((v) => +v.toFixed(1)), size: g.max.map((v, i) => +(v - g.min[i]).toFixed(1)), src: Object.entries(g.src).sort((a, b) => b[1] - a[1]).slice(0, 2).map((s) => s[0]).join(' ; ') })) };
}

// Peças da base contra a malha DESENHADA do chão (não a conta do relevo): onde a malha é mais grossa que o relevo,
// o chão desenhado fica abaixo e a peça parece flutuar. meshGaps(scene) — usa as malhas grandes de terreno da cena.
export function meshGaps(scene, { minGap = 0.3, maxAbove = 0.3 } = {}) {
  const P = globalThis.__pieces; if (!P) return 'abra a página com ?scan=1';
  const grids = [];
  scene.traverse((m) => { const g = m.geometry; if (!m.isMesh || g?.type !== 'PlaneGeometry' || g.parameters.widthSegments < 60) return;
    m.updateMatrixWorld(true); const p = g.attributes.position;
    const nx = g.parameters.widthSegments + 1, nz = g.parameters.heightSegments + 1, E = m.matrixWorld.elements;
    const W = (i) => [E[0] * p.getX(i) + E[4] * p.getY(i) + E[8] * p.getZ(i) + E[12], E[1] * p.getX(i) + E[5] * p.getY(i) + E[9] * p.getZ(i) + E[13], E[2] * p.getX(i) + E[6] * p.getY(i) + E[10] * p.getZ(i) + E[14]];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < p.count; i++) { const [x, , z] = W(i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const dx = (x1 - x0) / (nx - 1), dz = (z1 - z0) / (nz - 1), H = new Float32Array(nx * nz);
    for (let i = 0; i < p.count; i++) { const [x, y, z] = W(i); H[Math.round((z - z0) / dz) * nx + Math.round((x - x0) / dx)] = y; }
    grids.push({ x0, z0, x1, z1, dx, dz, nx, nz, H }); });
  grids.sort((a, b) => a.dx - b.dx);
  const meshH = (x, z) => { for (const G of grids) { if (x < G.x0 || x > G.x1 - G.dx || z < G.z0 || z > G.z1 - G.dz) continue;
      const fx = (x - G.x0) / G.dx, fz = (z - G.z0) / G.dz, ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, w = fz - iz, h = (i, j) => G.H[j * G.nx + i];
      const a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
      return Math.min(u + w < 1 ? a + (b - a) * u + (c - a) * w : d + (c - d) * (1 - u) + (b - d) * (1 - w), u > w ? a + (b - a) * u + (d - b) * w : a + (c - a) * w + (d - c) * u); }
    return null; };
  const bad = new Map(); globalThis.__meshBad = [];
  for (const p of P) { const b = p.b, sx = (b.max.x - b.min.x) / 2, sz = (b.max.z - b.min.z) / 2; if (sx < 0.3 && sz < 0.3) continue; const cx = b.min.x + sx, cz = b.min.z + sz;
    const ta = terrainAt(cx, cz); if (b.min.y - ta > maxAbove || b.min.y < ta - 3) continue;
    let worst = 0, wx = 0, wz = 0; for (const [dx, dz] of [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz], [0, 0]]) { const x = cx + dx, z = cz + dz; if (waterAt(x, z) > b.min.y - 0.3) continue; const mh = meshH(x, z); if (mh === null) continue; const gap = b.min.y - mh; if (gap > worst) { worst = gap; wx = x; wz = z; } }
    if (worst > minGap) { globalThis.__meshBad.push({ src: p.src, gap: worst, x: wx, z: wz }); const k = p.src.split(' < ')[0]; const e = bad.get(k) || { n: 0, max: 0, ex: '' }; e.n++; if (worst > e.max) { e.max = worst; e.ex = `(${wx.toFixed(1)}, ${wz.toFixed(1)})`; } bad.set(k, e); } }
  return { grids: grids.map((G) => G.dx.toFixed(2)), list: [...bad.entries()].sort((a, b) => b[1].max - a[1].max).slice(0, 40).map(([k, e]) => `${e.n}x até ${e.max.toFixed(2)} ${e.ex} ${k}`) };
}

// Superfícies brigando: duas peças de materiais diferentes com uma face no mesmo plano e se sobrepondo (o "pisca-pisca"
// de textura, como a faixa azul das esfinges no topo do pedestal). coplanar() — lista por linha do código.
export function coplanar({ tol = 0.004, minArea = 0.02 } = {}) {
  const P = globalThis.__pieces; if (!P) return 'abra a página com ?scan=1';
  const H = new Map(), S = 4, key = (i, j) => i + ',' + j;
  P.forEach((p, n) => { const b = p.b; for (let i = Math.floor(b.min.x / S); i <= Math.floor(b.max.x / S); i++) for (let j = Math.floor(b.min.z / S); j <= Math.floor(b.max.z / S); j++) { const k = key(i, j); if (!H.has(k)) H.set(k, []); H.get(k).push(n); } });
  const ov = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const hits = new Map(), seen = new Set();
  for (const L of H.values()) for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const A = P[L[i]], Bp = P[L[j]]; if (A.m === Bp.m) continue; const id = L[i] + ':' + L[j]; if (seen.has(id)) continue; seen.add(id);
    const a = A.b, b = Bp.b;
    const ox = ov(a.min.x, a.max.x, b.min.x, b.max.x), oy = ov(a.min.y, a.max.y, b.min.y, b.max.y), oz = ov(a.min.z, a.max.z, b.min.z, b.max.z);
    let face = null;
    if (ox * oz > minArea && (Math.abs(a.max.y - b.max.y) < tol)) face = 'topo';
    else if (oy * oz > minArea && (Math.abs(a.max.x - b.max.x) < tol || Math.abs(a.min.x - b.min.x) < tol) && ox > 0.01) face = 'x';
    else if (ox * oy > minArea && (Math.abs(a.max.z - b.max.z) < tol || Math.abs(a.min.z - b.min.z) < tol) && oz > 0.01) face = 'z';
    if (!face) continue;
    const k = [A.src.split(' < ')[0], Bp.src.split(' < ')[0]].sort().join(' x ') + ' (' + face + ')';
    const e = hits.get(k) || { n: 0, ex: '' }; e.n++; if (!e.ex) e.ex = `(${((a.min.x + a.max.x) / 2).toFixed(1)}, ${a.max.y.toFixed(2)}, ${((a.min.z + a.max.z) / 2).toFixed(1)})`; hits.set(k, e);
  }
  return [...hits.entries()].sort((x, y) => y[1].n - x[1].n).map(([k, e]) => `${e.n}x ${k} ${e.ex}`);
}

// Peças enterradas: o chão passa por cima da base de um lado (peça pequena na encosta, meio enfiada na terra). Não
// conta fundações, muros de arrimo e peças grandes (h > 3,5 m), que descem de propósito. buried()
export function buried({ depth = 0.35, maxH = 3.5 } = {}) {
  const P = globalThis.__pieces; if (!P) return 'abra a página com ?scan=1';
  const by = new Map();
  for (const p of P) { const b = p.b, h = b.max.y - b.min.y; if (h > maxH || h < 0.15) continue;
    const sx = (b.max.x - b.min.x) / 2, sz = (b.max.z - b.min.z) / 2; if (sx < 0.3 && sz < 0.3) continue; const cx = b.min.x + sx, cz = b.min.z + sz;
    let hi = -Infinity, lo = Infinity; for (const [dx, dz] of [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz], [0, 0]]) { const t = terrainAt(cx + dx, cz + dz); hi = Math.max(hi, t); lo = Math.min(lo, t); }
    if (waterAt(cx, cz) > b.min.y) continue;
    const sunk = hi - b.min.y; if (sunk > depth && hi - lo > 0.3 && b.max.y - hi < h * 0.8) { const k = p.src.split(' < ')[0]; const e = by.get(k) || { n: 0, max: 0, ex: '' }; e.n++; if (sunk > e.max) { e.max = sunk; e.ex = `(${cx.toFixed(1)}, ${cz.toFixed(1)})`; } by.set(k, e); } }
  return [...by.entries()].sort((a, b) => b[1].max - a[1].max).map(([k, e]) => `${e.n}x até ${e.max.toFixed(2)} m ${e.ex} ${k}`);
}
