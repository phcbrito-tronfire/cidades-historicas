// Vestir o boneco de verdade: em vez de peças soltas presas a um osso (que flutuam ou atravessam o corpo), as alças,
// cintos, lenços, golas e couraças são moldadas sobre a superfície real da roupa/pele do modelo na pose T.
// Cada ponto é achado lançando um raio até o corpo; a peça fica a alguns milímetros da superfície e herda os pesos
// de esqueleto do triângulo atingido — então ela se dobra e anda exatamente como a camisa ou a calça por baixo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const strip = (n) => n.replace(/^mixamorig\d*:?/, '');
const _v = new THREE.Vector3();

// body = makeFitter({ meshes, rootInv, ref }): meshes são as malhas com pele cuja superfície serve de molde
export function makeFitter({ meshes, rootInv, ref, skip = [] }) {
  const skel = ref.skeleton, boneIdx = new Map(skel.bones.map((b, i) => [strip(b.name), i]));
  const iH = boneIdx.get('Hips') ?? 0;
  // ponto do modelo (pose T) → espaço cru da malha de referência (ver o tecido em mixamo.js: a desquantização mora nas boneInverses)
  const toRaw = new THREE.Matrix4().multiplyMatrices(rootInv, skel.bones[iH].matrixWorld).multiply(skel.boneInverses[iH]).multiply(ref.bindMatrix).invert();
  const P = [], W = [], T = []; // posições (pose T, modelo), pesos {osso: peso} por vértice, triângulos
  for (const me of meshes) {
    const g = me.geometry, pa = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const toModel = new THREE.Matrix4().multiplyMatrices(rootInv, me.matrixWorld), base = P.length;
    const names = me.skeleton.bones.map((b) => strip(b.name));
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i); me.applyBoneTransform(i, _v); _v.applyMatrix4(toModel); P.push(_v.clone());
      const w = {}; for (let k = 0; k < 4; k++) { const x = sw.getComponent(i, k); if (x > 0) { const nm = names[si.getComponent(i, k)]; w[nm] = (w[nm] || 0) + x; } } W.push(w);
    }
    const idx = g.index ? g.index.array : [...Array(pa.count).keys()];
    for (let t = 0; t < idx.length; t += 3) {
      const a = base + idx[t], b = base + idx[t + 1], c = base + idx[t + 2];
      // ossos que não fazem parte do molde (ex.: os braços, ao vestir o tronco) ficam de fora
      const dom = (w) => Object.entries(w).sort((p, q) => q[1] - p[1])[0]?.[0];
      if (skip.length && [a, b, c].some((i) => skip.some((s) => dom(W[i])?.includes(s)))) continue;
      const y0 = Math.min(P[a].y, P[b].y, P[c].y), y1 = Math.max(P[a].y, P[b].y, P[c].y);
      T.push({ a, b, c, y0, y1 });
    }
  }
  // grade por altura: um raio quase horizontal só testa os triângulos da sua faixa
  const BY = 0.02, y0g = Math.min(...T.map((t) => t.y0)), rows = [];
  for (const t of T) for (let r = Math.floor((t.y0 - y0g) / BY); r <= Math.floor((t.y1 - y0g) / BY); r++) (rows[r] ||= []).push(t);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3();
  // raio de o na direção d (unitária), até maxD: o primeiro triângulo de frente para o raio
  const cast = (o, d, maxD = 1) => {
    let list = T;
    if (Math.abs(d.y) < 0.25) { const ya = o.y, yb = o.y + d.y * maxD, r0 = Math.floor((Math.min(ya, yb) - y0g) / BY), r1 = Math.floor((Math.max(ya, yb) - y0g) / BY); const s = new Set(); for (let r = r0; r <= r1; r++) for (const t of rows[r] || []) s.add(t); list = s; }
    let best = null, bt = maxD;
    for (const tr of list) {
      const A = P[tr.a], B = P[tr.b], C = P[tr.c];
      e1.subVectors(B, A); e2.subVectors(C, A); pv.crossVectors(d, e2); const det = e1.dot(pv);
      if (det < 1e-12) continue; // só a face virada para o raio (por fora da roupa)
      const inv = 1 / det; tv.subVectors(o, A); const u = tv.dot(pv) * inv; if (u < 0 || u > 1) continue;
      qv.crossVectors(tv, e1); const v = d.dot(qv) * inv; if (v < 0 || u + v > 1) continue;
      const t = e2.dot(qv) * inv; if (t > 0 && t < bt) { bt = t; best = { tr, u, v, t }; }
    }
    if (!best) return null;
    const { tr, u, v } = best, A = P[tr.a], B = P[tr.b], C = P[tr.c];
    const p = new THREE.Vector3().copy(A).multiplyScalar(1 - u - v).addScaledVector(B, u).addScaledVector(C, v);
    const n = new THREE.Vector3().crossVectors(e1.subVectors(B, A), e2.subVectors(C, A)).normalize();
    const w = {}; for (const [i, f] of [[tr.a, 1 - u - v], [tr.b, u], [tr.c, v]]) for (const [k, x] of Object.entries(W[i])) w[k] = (w[k] || 0) + x * f;
    return { p, n, w, t: best.t };
  };
  // pesos {osso: peso} → 4 índices do esqueleto de referência
  const skinOf = (w) => {
    const e = Object.entries(w).filter(([k]) => boneIdx.has(k)).sort((p, q) => q[1] - p[1]).slice(0, 4);
    const s = e.reduce((a, [, x]) => a + x, 0) || 1, idx = [0, 0, 0, 0], wt = [0, 0, 0, 0];
    e.forEach(([k, x], i) => { idx[i] = boneIdx.get(k); wt[i] = x / s; }); if (!e.length) { idx[0] = iH; wt[0] = 1; }
    return { idx, wt };
  };
  const mix = (ws, fs) => { const w = {}; ws.forEach((x, j) => { for (const [k, v] of Object.entries(x)) w[k] = (w[k] || 0) + v * fs[j]; }); return w; };

  // geometria crua (pose T, espaço do modelo) + pesos por vértice → acumulada por material
  const pieces = new Map();
  const add = (mat, pos, nor, uv, skin, index) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skin.idx, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skin.wt, 4));
    g.setIndex(index); if (!nor) g.computeVertexNormals();
    if (!pieces.has(mat)) pieces.set(mat, []); pieces.get(mat).push(g);
    return g;
  };
  const skinArrays = (ws) => { const idx = [], wt = []; for (const w of ws) { const s = skinOf(w); idx.push(...s.idx); wt.push(...s.wt); } return { idx, wt }; };

  // ---- uma faixa (alça, cinto, tira): guias = [{ p: ponto por fora, c: ponto por dentro }], amostrada em curva suave
  // opções: w largura, th espessura, off folga da superfície, n amostras, closed (volta inteira)
  const band = (mat, guides, { w = 0.04, th = 0.005, off = 0.004, n = 40, closed = false, lift = null } = {}) => {
    const cp = new THREE.CatmullRomCurve3(guides.map((g) => g.p), closed, 'centripetal'), cc = new THREE.CatmullRomCurve3(guides.map((g) => g.c), closed, 'centripetal');
    const S = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n; if (closed && i === n) break;
      const o = cp.getPoint(t), c = cc.getPoint(t), d = c.clone().sub(o), L = d.length(); d.normalize();
      const h = cast(o, d, L + 0.05); if (!h) continue;
      const nn = h.n.clone(); if (nn.dot(d) > 0) nn.negate();
      const extra = lift ? lift(t) : 0;
      S.push({ p: h.p.clone().addScaledVector(nn, off + extra), n: nn, w: h.w });
    }
    if (S.length < 2) return null;
    // normais suavizadas (a malha da roupa tem facetas)
    const N = S.map((s, i) => { const v = new THREE.Vector3(); for (let k = -2; k <= 2; k++) { const q = S[closed ? (i + k + S.length) % S.length : Math.min(S.length - 1, Math.max(0, i + k))]; v.add(q.n); } return v.normalize(); });
    const pos = [], uv = [], ws = [], index = []; let len = 0;
    const m = S.length;
    for (let i = 0; i < m; i++) {
      const a = S[closed ? (i - 1 + m) % m : Math.max(0, i - 1)].p, b = S[closed ? (i + 1) % m : Math.min(m - 1, i + 1)].p;
      const tg = b.clone().sub(a).normalize(), bn = new THREE.Vector3().crossVectors(N[i], tg).normalize(), p = S[i].p;
      if (i > 0) len += p.distanceTo(S[i - 1].p);
      for (const [sx, sy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { const q = p.clone().addScaledVector(bn, sx * w / 2).addScaledVector(N[i], sy * th); pos.push(q.x, q.y, q.z); uv.push((sx + 1) / 2, len / w); ws.push(S[i].w); }
    }
    const seg = closed ? m : m - 1;
    for (let i = 0; i < seg; i++) {
      const a = i * 4, b = ((i + 1) % m) * 4;
      for (const [p0, p1] of [[3, 2], [2, 1], [0, 3], [1, 0]]) index.push(a + p0, b + p0, b + p1, a + p0, b + p1, a + p1); // topo, lados, base
    }
    if (!closed) { const e = (m - 1) * 4; index.push(0, 1, 2, 0, 2, 3, e, e + 2, e + 1, e, e + 3, e + 2); }
    return add(mat, pos, null, uv, skinArrays(ws), index);
  };

  // ---- uma casca em volta do tronco/quadril (couraça, cinta, gola): linhas de altura y0..y1, colunas de ângulo a0..a1
  // (ângulo 0 = frente, +z; π/2 = lado esquerdo, +x). bump(θ, y) acrescenta relevo (músculos da couraça).
  // A casca segue a superfície; onde o raio não acha o tronco (cava do braço), fica o buraco.
  const shell = (mat, { y0, y1, rows = 24, cols = 48, a0 = -Math.PI, a1 = Math.PI, off = 0.012, cx = 0, cz = 0, bump = null, top = null, uvScale = [1, 1], tilt = null, r0 = 0.6, mask = null, hang = null } = {}) => {
    const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6, nc = full ? cols : cols + 1;
    const G = [];
    for (let r = 0; r <= rows; r++) {
      const s = r / rows, y = y0 + (y1 - y0) * s; const row = [];
      for (let k = 0; k < nc; k++) {
        const a = a0 + (a1 - a0) * (k / cols), dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
        if (mask && !mask(a, y, s)) { row.push(null); continue; }
        let o = new THREE.Vector3(cx, y, cz).addScaledVector(dir, r0), d = dir.clone().negate(); // (r0 pequeno: o raio não alcança os braços)
        if (top && s > top.from) { // por cima dos ombros: o raio vem inclinado de cima
          const f = (s - top.from) / (1 - top.from), ang = f * top.angle, up = new THREE.Vector3(0, 1, 0);
          const dd = dir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang)).normalize();
          const core = new THREE.Vector3(cx, top.y, cz); o = core.clone().addScaledVector(dd, 0.6); d = dd.negate();
        }
        if (tilt) d.y += tilt; d.normalize();
        const h = cast(o, d, r0 + 0.02);
        if (!h) { row.push(null); continue; }
        const extra = bump ? bump(a, y, s) : 0;
        row.push({ p: h.p.clone().addScaledVector(d, -(off + extra)), w: h.w, u: (k / cols) * uvScale[0], v: s * uvScale[1] });
      }
      G.push(row);
    }
    // a parte que cai solta (peruca, capuz): abaixo da primeira linha, reta para baixo e abrindo um pouco, presa a ela
    if (hang) { const base = G[0], extra = [];
      for (let k = hang.rows; k >= 1; k--) extra.push(base.map((q) => { if (!q) return null; const rad = new THREE.Vector3(q.p.x - cx, 0, q.p.z - cz).normalize(), f = k / hang.rows; return { p: q.p.clone().add(new THREE.Vector3(0, -hang.depth * f, 0)).addScaledVector(rad, (hang.flare || 0) * f), w: q.w, u: q.u, v: -f * 0.3 * uvScale[1] }; }));
      G.unshift(...extra); rows += hang.rows; }
    // um vértice isolado no meio de vizinhos ausentes é ruído: descarta; os buracos pequenos são preenchidos pela média
    const pos = [], uv = [], ws = [], index = [], id = G.map((row) => row.map(() => -1));
    G.forEach((row, r) => row.forEach((q, k) => { if (!q) return; id[r][k] = pos.length / 3; pos.push(q.p.x, q.p.y, q.p.z); uv.push(q.u, q.v); ws.push(q.w); }));
    for (let r = 0; r < rows; r++) for (let k = 0; k < (full ? nc : nc - 1); k++) {
      const k2 = (k + 1) % nc, a = id[r][k], b = id[r][k2], c = id[r + 1][k2], d = id[r + 1][k];
      if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      index.push(a, b, c, a, c, d); // (face para fora)
    }
    if (!index.length) return null;
    return add(mat, pos, null, uv, skinArrays(ws), index);
  };

  // ---- uma peça rígida (fivela, bolsa, coldre) colocada na superfície: âncora achada por raio, pesos do ponto atingido
  const anchor = (o, c) => { const d = c.clone().sub(o), L = d.length(); d.normalize(); const h = cast(o, d, L + 0.05); if (!h) return null; const n = h.n.clone(); if (n.dot(d) > 0) n.negate(); return { p: h.p, n, w: h.w }; };
  const solid = (mat, geo, at, { w = null } = {}) => { // geo já no espaço do modelo
    const g = geo.index ? geo : geo.toNonIndexed(); const cnt = g.attributes.position.count, s = skinOf(w || at.w);
    const si = [], sw = []; for (let i = 0; i < cnt; i++) { si.push(...s.idx); sw.push(...s.wt); }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(cnt * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(k)) g.deleteAttribute(k);
    if (!pieces.has(mat)) pieces.set(mat, []); pieces.get(mat).push(g); return g;
  };

  // junta tudo por material em uma malha com pele, no esqueleto da referência
  const finish = () => {
    const out = [];
    for (const [mat, list] of pieces) {
      const norm = list.map((g) => { if (!g.attributes.normal) g.computeVertexNormals(); return g.index ? g.toNonIndexed() : g; });
      const geo = norm.length > 1 ? mergeGeometries(norm) : norm[0]; if (!geo) continue;
      geo.applyMatrix4(toRaw); geo.computeBoundingSphere();
      const sm = new THREE.SkinnedMesh(geo, mat); sm.castShadow = true; sm.receiveShadow = true;
      sm.position.copy(ref.position); sm.quaternion.copy(ref.quaternion); sm.scale.copy(ref.scale);
      ref.parent.add(sm); sm.bind(skel, ref.bindMatrix); out.push(sm);
    }
    pieces.clear();
    return out;
  };
  return { cast, band, shell, anchor, solid, finish, skinOf, mix, P, W };
}

// ---------------------------------------------------------------------------
// Materiais de tecido e couro feitos na hora (grão, costura) — sem arquivos novos para baixar
const texCache = new Map();
function canvasTex(key, S, draw, repeat = true) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); draw(x, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
// couro: grão fino, manchas de uso e a costura nas duas bordas (u = 0..1 atravessa a tira)
export function leatherTex(base = '#5a3a22', stitch = true) {
  return canvasTex('leather' + base + stitch, 256, (x, S) => {
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { const v = rnd(); x.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.05 + rnd() * 0.08})` : `rgba(255,230,200,${0.03 + rnd() * 0.05})`; x.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 14; i++) { const g = x.createRadialGradient(rnd() * S, rnd() * S, 0, 0, 0, 0); void g; x.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.05})`; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, 10 + rnd() * 30, 6 + rnd() * 18, rnd() * 3, 0, 7); x.fill(); }
    if (stitch) { x.strokeStyle = 'rgba(230,205,160,0.55)'; x.lineWidth = 2; x.setLineDash([7, 6]); for (const u of [0.1, 0.9]) { x.beginPath(); x.moveTo(u * S, 0); x.lineTo(u * S, S); x.stroke(); } x.setLineDash([]); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, S * 0.03, S); x.fillRect(S * 0.97, 0, S * 0.03, S); }
  });
}
// tecido: trama (linho, lã, algodão) com leve variação
export function clothTex(base = '#e8e0cc', { weave = 0.06, stripes = null } = {}) {
  return canvasTex('cloth' + base + weave + JSON.stringify(stripes), 256, (x, S) => {
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    if (stripes) stripes.forEach(([v0, v1, col]) => { x.fillStyle = col; x.fillRect(0, v0 * S, S, (v1 - v0) * S); });
    for (let y = 0; y < S; y += 2) { x.fillStyle = `rgba(0,0,0,${weave * (0.5 + rnd() * 0.5)})`; x.fillRect(0, y, S, 1); }
    for (let xx = 0; xx < S; xx += 2) { x.fillStyle = `rgba(255,255,255,${weave * 0.6 * rnd()})`; x.fillRect(xx, 0, 1, S); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.03})`; x.fillRect(0, rnd() * S, S, 1 + rnd() * 3); }
  });
}
// relevo de metal batido (pequenas marcas) para bronze e ferro
export function metalTex(base = '#b07a3a') {
  return canvasTex('metal' + base, 256, (x, S) => {
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 500; i++) { x.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.04 + rnd() * 0.06})` : `rgba(255,240,210,${0.04 + rnd() * 0.06})`; x.beginPath(); x.arc(rnd() * S, rnd() * S, 1 + rnd() * 4, 0, 7); x.fill(); }
    for (let i = 0; i < 10; i++) { x.fillStyle = `rgba(40,70,40,${0.03 + rnd() * 0.04})`; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, 8 + rnd() * 24, 5 + rnd() * 14, rnd() * 3, 0, 7); x.fill(); } // pátina
  });
}
