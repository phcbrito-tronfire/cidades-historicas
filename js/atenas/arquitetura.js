// Kit de arquitetura grega clássica: coluna dórica (caneluras, êntase, equino e ábaco), jônica, crepidoma em
// degraus, entablamento com tríglifos e métopas, frontão, telhado de telhas e a ordem completa de um templo
// períptero ou de uma stoa. Medidas reais (em metros) e cores da policromia original (azul, vermelho, ouro).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat4 } from '../comum/batcher.js';
import { addBox, addCircle } from '../comum/collision.js';

const cache = new Map();
const once = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

// fuste dórico com 20 caneluras côncavas e êntase (fica mais fino em cima, com leve barriga no terço inferior)
export function doricShaft(h, r) {
  return once(`ds${h}|${r}`, () => {
    const N = 20, g = new THREE.CylinderGeometry(1, 1, h, N * 4, 10, true);
    g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = y / h;
      const rad = r * (1 - 0.19 * t) + r * 0.018 * Math.sin(Math.PI * Math.min(1, t * 1.15));
      const fl = 1 - 0.055 * Math.pow(Math.abs(Math.cos((a * N) / 2)), 0.7); // canelura: arestas vivas entre os sulcos
      p.setXYZ(i, Math.cos(a) * rad * fl, y, Math.sin(a) * rad * fl);
    }
    g.computeVertexNormals();
    return g;
  });
}
// capitel dórico: anéis, equino (curva) e ábaco quadrado. Origem embaixo; altura ~0,55 r... medida em r
export function doricCapital(r) {
  return once(`dc${r}`, () => {
    const rt = r * 0.81;
    const pts = [[rt, 0], [rt * 1.0, r * 0.05], [rt * 1.02, r * 0.06], [rt * 1.0, r * 0.09], [rt * 1.03, r * 0.1], [rt * 1.0, r * 0.13], [rt * 1.08, r * 0.2], [rt * 1.22, r * 0.3], [rt * 1.36, r * 0.38], [rt * 1.44, r * 0.44], [rt * 1.46, r * 0.47]];
    const ech = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 40);
    const aw = rt * 1.5 * 2, ah = r * 0.24;
    const ab = new THREE.BoxGeometry(aw, ah, aw); ab.translate(0, r * 0.47 + ah / 2, 0);
    const top = new THREE.CircleGeometry(rt * 1.46, 40); top.rotateX(-Math.PI / 2); top.translate(0, r * 0.47, 0);
    const g = mergeGeometries([ech.toNonIndexed(), ab.toNonIndexed(), top.toNonIndexed()].map((x) => { x.deleteAttribute('uv'); return x; }));
    g.userData.h = r * 0.47 + ah;
    return g;
  });
}
// coluna jônica (stoas, interior do Propileu): base ática, fuste com 24 caneluras e volutas
export function ionicColumn(h, r) {
  return once(`ic${h}|${r}`, () => {
    const parts = [];
    const base = new THREE.LatheGeometry([[r * 1.5, 0], [r * 1.5, r * 0.18], [r * 1.25, r * 0.28], [r * 1.18, r * 0.36], [r * 1.3, r * 0.42], [r * 1.12, r * 0.55], [r, r * 0.62]].map(([a, b]) => new THREE.Vector2(a, b)), 32);
    parts.push(base);
    const N = 24, sh = new THREE.CylinderGeometry(1, 1, h - r * 1.5, N * 3, 6, true); sh.translate(0, r * 0.62 + (h - r * 1.5) / 2, 0);
    const p = sh.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = (y - r * 0.62) / (h - r * 1.5);
      const rad = r * (1 - 0.12 * t) * (1 - 0.06 * Math.pow(Math.abs(Math.cos((a * N) / 2)), 3));
      p.setXYZ(i, Math.cos(a) * rad, y, Math.sin(a) * rad);
    }
    sh.computeVertexNormals(); parts.push(sh);
    const y0 = h - r * 0.88;
    const ech = new THREE.CylinderGeometry(r * 1.05, r * 0.9, r * 0.3, 24); ech.translate(0, y0 + r * 0.15, 0); parts.push(ech);
    const cush = new THREE.BoxGeometry(r * 2.6, r * 0.34, r * 1.7); cush.translate(0, y0 + r * 0.45, 0); parts.push(cush);
    for (const s of [-1, 1]) { const v = new THREE.TorusGeometry(r * 0.32, r * 0.16, 8, 18); v.translate(s * r * 1.15, y0 + r * 0.22, 0); v.scale(1, 1, 1.75); parts.push(v); }
    const ab = new THREE.BoxGeometry(r * 2.5, r * 0.16, r * 2.5); ab.translate(0, h - r * 0.08, 0); parts.push(ab);
    const g = mergeGeometries(parts.map((x) => { const y = x.index ? x.toNonIndexed() : x; y.deleteAttribute('uv'); return y; }));
    g.computeVertexNormals();
    return g;
  });
}

// prisma triangular do frontão (tímpano), largura w, altura h, profundidade d; base em y=0, centrado
export function pedimentGeo(w, h, d) {
  return once(`pd${w}|${h}|${d}`, () => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
    return g;
  });
}
// meia-água de telhado com beiral (placa inclinada), comprimento L (eixo x), meia-largura hw, subida h
export function roofHalf(L, hw, h, th = 0.25) {
  return once(`rh${L}|${hw}|${h}|${th}`, () => {
    const len = Math.hypot(hw, h), g = new THREE.BoxGeometry(L, th, len);
    g.translate(0, 0, len / 2); g.rotateX(Math.atan2(h, hw)); return g; // desce da cumeeira (z=0) até o beiral
  });
}

// ---------------------------------------------------------------------------
// Templo períptero dórico completo (ou stoa): cria peças no Batcher e a colisão.
// o = { x, z, y, ry (0 = frente para +x), nf (colunas na frente), ns (nos lados), col (diâmetro inferior), h (coluna),
//       steps, cella: { w, d, door, inner }, M (materiais), stoa: true (só uma fachada e parede atrás) }
// Devolve medidas úteis (topo do estilobata, cella) para pôr estátuas e gente lá dentro.
// ---------------------------------------------------------------------------
export function doricTemple(B, o) {
  const M = o.M, D = o.col, r = D / 2, H = o.h;
  const ic = o.ic ?? D * 2.25; // intercolúnio (eixo a eixo)
  const nf = o.nf, ns = o.ns;
  const W = o.stoa ? o.depth : (nf - 1) * ic + D * 1.25, L = (ns - 1) * ic + D * 1.25; // largura e comprimento do estilobata
  const F = mat4(o.x, o.y, o.z, 0, o.ry || 0, 0);
  const at = (x, y, z) => F.clone().multiply(mat4(x, y, z));
  const box = (mat, w, h, d, x, y, z, ex = {}) => B.box(mat, w, h, d, x, y, z, { frame: F, ...ex });
  // crepidoma (3 degraus)
  const steps = o.steps ?? 3, sh = o.stepH ?? 0.5, sw = o.stepW ?? 0.7;
  for (let i = 0; i < steps; i++) box(M.marble, L + (steps - i) * 2 * sw, sh, W + (steps - i) * 2 * sw, 0, i * sh, 0);
  if (o.found) box(M.poros, L + steps * 2 * sw + 0.6, o.found, W + steps * 2 * sw + 0.6, 0, -o.found, 0);
  const Y = steps * sh; // topo do estilobata
  // colunas (comprimento no eixo x)
  const cols = [];
  const ring = (ix, iz) => cols.push([-L / 2 + D * 0.625 + ix * ic, W / 2 - D * 0.625 - iz * ic]);
  if (o.stoa) { for (let i = 0; i < ns; i++) ring(i, 0); }
  else { for (let i = 0; i < ns; i++) { ring(i, 0); ring(i, nf - 1); } for (let j = 1; j < nf - 1; j++) { ring(0, j); ring(ns - 1, j); } }
  const cap = doricCapital(r), capH = cap.userData.h;
  const shaftH = H - capH;
  for (const [cx, cz] of cols) {
    B.geo(doricShaft(shaftH, r), M.colMarble || M.marble, 0, 0, 0, { frame: at(cx, Y, cz), uv: { s: 1.2 } });
    B.geo(cap, M.colMarble || M.marble, 0, 0, 0, { frame: at(cx, Y + shaftH, cz), uv: { s: 1.2 } });
    // colisão da coluna (em coordenadas do mundo)
    const wp = new THREE.Vector3(cx, 0, cz).applyMatrix4(F);
    addCircle(wp.x, wp.z, r * 0.95, o.y - 1, o.y + Y + H);
  }
  // entablamento: arquitrave, friso (tríglifos azuis e métopas), cornija
  const Ya = Y + H, ah = D * 0.75, fh = D * 0.78, ch = D * 0.3;
  const EL = L, EW = W, ez = 0;
  // arquitrave e friso em anel (vigas sobre as colunas), o forro fecha por cima: a cella fica com pé-direito até o friso
  const bw = D * 1.05;
  const ringBox = (mat, h, y, inset) => {
    box(mat, EL - inset, h, bw, 0, y, ez + EW / 2 - bw / 2 - inset / 2); box(mat, EL - inset, h, bw, 0, y, ez - EW / 2 + bw / 2 + inset / 2);
    box(mat, bw, h, EW - inset - 2 * bw, -EL / 2 + bw / 2 + inset / 2, y, ez); box(mat, bw, h, EW - inset - 2 * bw, EL / 2 - bw / 2 - inset / 2, y, ez);
  };
  ringBox(M.marble, ah, Ya, 0.05);
  ringBox(M.paintRed, 0.12, Ya + ah - 0.12, 0.0);
  ringBox(M.marble, fh, Ya + ah, 0.1);
  box(M.ceiling, EL - 0.3, 0.3, EW - 0.3, 0, Ya + ah + fh - 0.3, ez); // forro de caixotões (sob o telhado)
  // tríglifos (frente, fundo e lados): sobre cada coluna e no meio de cada vão
  const tg = (x, z, ry) => box(M.triglyph, ic * 0.24, fh * 0.98, 0.12, x, Ya + ah + 0.01, z, { ry });
  const met = (x, z, ry) => box(M.metope, ic * 0.42, fh * 0.86, 0.06, x, Ya + ah + fh * 0.07, z, { ry });
  const front = [], side = [];
  for (let i = 0; i < ns; i++) { side.push(-L / 2 + D * 0.625 + i * ic); if (i < ns - 1) side.push(-L / 2 + D * 0.625 + (i + 0.5) * ic); }
  for (let j = 0; j < nf; j++) { front.push(W / 2 - D * 0.625 - j * ic); if (j < nf - 1) front.push(W / 2 - D * 0.625 - (j + 0.5) * ic); }
  const zF = ez + EW / 2 - 0.02, zB = ez - EW / 2 + 0.02;
  for (let k = 0; k < side.length; k++) {
    tg(side[k], zF, 0); if (!o.stoa) tg(side[k], zB, 0);
    if (k < side.length - 1) { const mx = (side[k] + side[k + 1]) / 2; met(mx, zF + 0.02, 0); if (!o.stoa) met(mx, zB - 0.02, 0); }
  }
  if (!o.stoa) for (let k = 0; k < front.length; k++) {
    tg(-L / 2 + 0.02, front[k], Math.PI / 2); tg(L / 2 - 0.02, front[k], Math.PI / 2);
    if (k < front.length - 1) { const mz = (front[k] + front[k + 1]) / 2; met(-L / 2 - 0.02, mz, Math.PI / 2); met(L / 2 + 0.02, mz, Math.PI / 2); }
  }
  const Yc = Ya + ah + fh;
  box(M.marble, EL + 0.7, ch, EW + 0.7, 0, Yc, ez);
  box(M.paintBlue, EL + 0.72, 0.08, EW + 0.72, 0, Yc + ch - 0.08, ez);
  // telhado e frontões (nos lados menores)
  const rh = (EW / 2) * 0.27; // inclinação ~15°
  const ry0 = Yc + ch;
  for (const s of [-1, 1]) {
    const g = roofHalf(EL + 0.9, EW / 2 + 0.45, rh, 0.3);
    B.geo(g, M.roofTiles, 0, 0, 0, { frame: F.clone().multiply(mat4(0, ry0 + rh, ez, 0, s > 0 ? 0 : Math.PI, 0)), uv: { s: 1.6 } });
  }
  if (!o.stoa) for (const s of [-1, 1]) {
    // tímpano recuado (fundo azul onde ficam as estátuas) e a cornija inclinada na frente
    B.geo(pedimentGeo(EW, rh, 0.6), M.marble, 0, 0, 0, { frame: F.clone().multiply(mat4(s * (EL / 2 - 1.7), ry0, ez, 0, Math.PI / 2, 0)), uv: { s: 2 } });
    B.geo(pedimentGeo(EW - 1.2, rh - 0.35, 0.06), M.pediment, 0, 0, 0, { frame: F.clone().multiply(mat4(s * (EL / 2 - 1.37), ry0 + 0.05, ez, 0, Math.PI / 2, 0)), uv: false });
    const ang = Math.atan2(rh, EW / 2), rl = Math.hypot(EW / 2, rh) + 0.5;
    for (const t of [-1, 1]) box(M.marble, 1.5, 0.55, rl, s * (EL / 2 - 0.4), ry0 + rh / 2 - 0.25, ez + t * EW / 4, { rx: t * ang });
    // acrotérios dourados no topo e nas pontas
    box(M.gold, 0.5, 1.1, 0.5, s * (EL / 2 + 0.1), ry0 + rh + 0.05, ez);
    for (const t of [-1, 1]) box(M.gold, 0.4, 0.7, 0.4, s * (EL / 2 + 0.1), ry0, ez + t * (EW / 2 + 0.2));
  } else {
    // stoa: telhado de uma água para a frente, parede de fundo e laterais
  }
  // cella (naos): paredes de mármore, porta na frente (+x), pronaos e opistódomo com colunas in antis
  const out = { Y: o.y + Y, L, W, frame: F };
  if (o.cella) {
    const c = o.cella, t = 0.9, ch2 = H + ah + fh - 0.3;
    const cx0 = -c.d / 2, cx1 = c.d / 2, cw = c.w;
    const door = c.door ?? 4.5;
    const wall = (w, d, x, z) => { box(M.marbleWall, w, ch2, d, x, Y, z); const a = new THREE.Vector3(x, 0, z).applyMatrix4(F); const rot = Math.abs(Math.sin(o.ry || 0)) > 0.7; addBox(a.x, a.z, rot ? d : w, rot ? w : d, o.y, o.y + Y + ch2); };
    wall(c.d, t, 0, cw / 2 - t / 2); wall(c.d, t, 0, -cw / 2 + t / 2); // laterais
    wall(t, cw, cx0 + t / 2, 0); // fundo
    const seg = (cw - door) / 2;
    wall(t, seg, cx1 - t / 2, cw / 2 - seg / 2); wall(t, seg, cx1 - t / 2, -cw / 2 + seg / 2); // frente com a porta
    box(M.wood, 0.2, ch2 * 0.75, door * 0.48, cx1 + 0.05, Y, door * 0.27, { ry: 0.9 }); // folhas da porta abertas
    box(M.wood, 0.2, ch2 * 0.75, door * 0.48, cx1 + 0.05, Y, -door * 0.27, { ry: -0.9 });
    // teto de madeira pintada (caixotões) e piso
    // colunata interna de dois andares (como no Parthenon): duas filas ao longo da cella
    if (c.inner) {
      const n = c.inner, ri = r * 0.55, h1 = ch2 * 0.55, h2 = ch2 * 0.42;
      for (let i = 0; i < n; i++) for (const sz of [-1, 1]) {
        const x = cx0 + 3 + i * ((c.d - 7) / (n - 1)), z = sz * (cw / 2 - 2.6);
        B.geo(doricShaft(h1 - 0.3, ri), M.colMarble || M.marble, 0, 0, 0, { frame: at(x, Y, z), uv: { s: 1 } });
        box(M.marble, ri * 2.4, 0.3, ri * 2.4, x, Y + h1 - 0.3, z);
        box(M.marble, ri * 2.2, 0.35, 0.6, x, Y + h1, z); // arquitrave do 1º andar (pedaço)
        B.geo(doricShaft(h2 - 0.3, ri * 0.75), M.marble, 0, 0, 0, { frame: at(x, Y + h1 + 0.35, z), uv: { s: 1 } });
        const wp = new THREE.Vector3(x, 0, z).applyMatrix4(F); addCircle(wp.x, wp.z, ri, o.y, o.y + Y + ch2);
      }
      for (const sz of [-1, 1]) box(M.marble, c.d - 6, 0.35, 0.6, 0, Y + h1, sz * (cw / 2 - 2.6));
    }
    out.cella = { x0: cx0, x1: cx1, w: cw, h: ch2 };
  }
  // stoa: parede de fundo, laterais e telhado (uma água) cobrindo a profundidade
  if (o.stoa) {
    const dep = o.depth, zb = W / 2 - dep;
    const wall = (w, d, x, z) => { box(M.stoaWall, w, H + ah + fh - 0.3, d, x, Y, z); const a = new THREE.Vector3(x, 0, z).applyMatrix4(F); const rot = Math.abs(Math.sin(o.ry || 0)) > 0.7; addBox(a.x, a.z, rot ? d : w, rot ? w : d, o.y, o.y + Y + H + ah); };
    wall(L, 0.7, 0, zb + 0.35); // a parede sobe até o friso (H + ah) e o forro geral fecha acima
    wall(0.7, dep, -L / 2 + 0.35, zb + dep / 2); wall(0.7, dep, L / 2 - 0.35, zb + dep / 2);
    // colunas jônicas internas (eixo central)
    if (o.innerIonic) for (let i = 0; i < Math.floor(ns / 2); i++) {
      const x = -L / 2 + ic * 1.0 + i * ic * 2, z = zb + dep * 0.45;
      B.geo(ionicColumn(H + ah - 0.3, r * 0.7), M.colMarble || M.marble, 0, 0, 0, { frame: at(x, Y, z), uv: { s: 1 } });
      const wp = new THREE.Vector3(x, 0, z).applyMatrix4(F); addCircle(wp.x, wp.z, r * 0.7, o.y, o.y + Y + H);
    }
    out.back = zb;
  }
  // escada de entrada no meio da fachada leste (e da oeste): os degraus do crepidoma são altos demais para andar,
  // como nos templos de verdade, que tinham degraus intermediários ou rampa na entrada
  if (!o.stoa && Y > 0.5) {
    const n = Math.ceil(Y / 0.2), rise = Y / n, run = 0.36, W = Math.min(6, ic * 1.4), x0 = L / 2; // do estilobata para fora, cobrindo o crepidoma
    for (const side of [1, -1]) for (let i = 0; i < n; i++) {
      const lx = side * (x0 + (n - 1 - i) * run + run / 2 - 0.02), top = rise * (i + 1);
      box(M.marble, run + 0.02, top, W, lx, 0, 0);
      const wp = new THREE.Vector3(lx, 0, 0).applyMatrix4(F), rot = Math.abs(Math.sin(o.ry || 0)) > 0.7;
      addBox(wp.x, wp.z, rot ? W : run, rot ? run : W, o.y - 1, o.y + top);
    }
  }
  // degraus caminháveis: caixas de colisão do crepidoma (topo = chão)
  for (let i = 0; i < steps; i++) {
    const w = L + (steps - i) * 2 * sw, d = W + (steps - i) * 2 * sw, a = new THREE.Vector3(0, 0, 0).applyMatrix4(F);
    const rot = Math.abs(Math.sin(o.ry || 0)) > 0.7;
    addBox(a.x, a.z, rot ? d : w, rot ? w : d, o.y - 2, o.y + (i + 1) * sh);
  }
  return out;
}
