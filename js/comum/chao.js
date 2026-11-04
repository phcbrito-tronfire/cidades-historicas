// Lajes de piso (praças, cais, calçadas, pisos de templo) registradas pela cidade pelo Batcher.onFloor: o chão fica
// logo abaixo delas — sem isso o terreno ondulado atravessava o calçamento (manchas e briga de texturas) e o pé
// afundava ou flutuava. Vale para todas as cidades (cada página carrega uma só).
const PRESS = new Map(), PCELL = 8;
export const pressAt = (x, z) => { const L = PRESS.get(Math.floor(x / PCELL) + ',' + Math.floor(z / PCELL)); if (!L) return Infinity; let t = Infinity;
  for (const r of L) { const dx = x - r.x, dz = z - r.z, u = dx * r.c - dz * r.s, v = dx * r.s + dz * r.c; if (Math.abs(u) <= r.w / 2 + r.m && Math.abs(v) <= r.d / 2 + r.m) t = Math.min(t, r.top); } return t; };
export function pressTerrain(mesh, rects, margin = 1.8) {
  for (const q of rects) {
    const r = { ...q, c: Math.cos(q.ry), s: Math.sin(q.ry), m: margin, top: q.top - 0.07 }, R = Math.hypot(q.w, q.d) / 2 + margin;
    for (let i = Math.floor((q.x - R) / PCELL); i <= Math.floor((q.x + R) / PCELL); i++) for (let j = Math.floor((q.z - R) / PCELL); j <= Math.floor((q.z + R) / PCELL); j++) { const k = i + ',' + j; if (!PRESS.has(k)) PRESS.set(k, []); PRESS.get(k).push(r); }
  }
  if (!mesh) return;
  const p = mesh.geometry.attributes.position; let n = 0;
  for (let i = 0; i < p.count; i++) { const t = pressAt(p.getX(i), p.getZ(i)); if (t < p.getY(i)) { p.setY(i, t); n++; } }
  p.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
  return n;
}
