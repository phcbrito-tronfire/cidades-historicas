// Varredura de "briga de textura" (ferramenta de teste): duas superfícies no mesmo plano, que piscam uma contra a
// outra quando a câmera se mexe. Abrir a cidade com ?scan=1 e, no console:
//   const Z = await import('./tools/pisca.js'); await Z.scan(__game, { step: 8 }); Z.top(40)
//   await Z.spot(__game, [{ from: [x, y, z], at: [x, y, z] }])   // um lugar só, com as peças que disputam o plano
// De cada ponto onde se anda, a cena é desenhada duas vezes com a câmera deslocada 1 mm, cada material com um número.
// Onde o número muda entre as duas imagens NO MESMO LUGAR (menos de 9 mm), duas peças disputam o plano.
// Grupos pequenos (menos de ~25 pontos) costumam ser só a linha de encontro de duas peças, não briga.
export async function scan(g, A = {}) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (A?.status) { const j = window.__zf; return j ? { done: j.done, i: j.i, total: j.total, secs: Math.round((performance.now() - j.t0) / 1000), err: j.err } : 'sem varredura'; }
  if (window.__zf && !window.__zf.done) return 'já rodando';
  const THREE = await import('three');
  const C = await import('../js/comum/collision.js');
  const R = g.renderer, scene = g.scene, P = globalThis.__pieces || [];
  const step = A?.step || 8, FAR = A?.far || 90, N = 160;
  const B = A?.box || g.player.bounds;
  const job = (window.__zf = { done: false, i: 0, total: 0, t0: performance.now(), clusters: null });
  const raf = window.requestAnimationFrame; let held = null;
  window.requestAnimationFrame = (cb) => { held = cb; return 0; };
  await new Promise((r) => setTimeout(r, 200));

  const vs = 'varying vec3 vW; void main(){ vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n vec4 w = modelMatrix * p; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const fs = 'uniform float uId; varying vec3 vW; void main(){ gl_FragColor = vec4(vW, uId); }';
  const ids = new Map(), names = [null];
  const matNone = new THREE.MeshBasicMaterial({ visible: false });
  const pick = (m) => {
    if (!m || m.side === THREE.BackSide || m.transparent || m.visible === false || m.alphaTest > 0) return matNone;
    let s = ids.get(m); if (!s) { s = new THREE.ShaderMaterial({ side: m.side, vertexShader: vs, fragmentShader: fs, uniforms: { uId: { value: names.length } }, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits }); names.push(m.name || m.map?.name || (m.color ? '#' + m.color.getHexString() : m.type)); ids.set(m, s); }
    return s;
  };
  const swapped = [];
  scene.traverse((o) => { if (!o.isMesh || o.isSkinnedMesh || !(o.layers.mask & 9)) return; swapped.push([o, o.material]); o.material = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material); });
  const hidden = []; scene.traverse((o) => { if ((o.isPoints || o.isLine || o.isSprite) && o.visible) { hidden.push(o); o.visible = false; } });

  const pts = [];
  for (let x = B[0] + 3; x < B[1]; x += step) for (let z = B[2] + 3; z < B[3]; z += step) {
    const t = C.terrainAt(x, z), w = C.waterAt(x, z);
    const g0 = C.groundAt(x, z, t + 0.3); if (g0 < w - 0.3) continue;
    if (C.blocked(x, z, g0, 0.3, 1.7) || C.solidAt(x, g0 + 1.6, z)) continue;
    pts.push([x, g0 + 1.6, z]);
  }
  job.total = pts.length;
  const rt = new THREE.WebGLRenderTarget(N, N, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const cam = new THREE.PerspectiveCamera(95, 1, 0.15, 600); cam.layers.enable(3);
  const a = new Float32Array(N * N * 4), b = new Float32Array(N * N * 4), cells = new Map(), CS = 2;
  const oldTarget = R.getRenderTarget(), oldClear = R.getClearColor(new THREE.Color()), oldAlpha = R.getClearAlpha(), oldTM = R.toneMapping;
  R.toneMapping = THREE.NoToneMapping;
  const shoot = (x, y, z, yaw, pitch, buf) => { cam.position.set(x, y, z); cam.rotation.set(pitch, yaw, 0, 'YXZ'); cam.updateMatrixWorld(true); R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam); R.readRenderTargetPixels(rt, 0, 0, N, N, buf); };
  try {
    for (let i = 0; i < pts.length; i++) {
      const [x, y, z] = pts[i]; job.i = i;
      for (let k = 0; k < 4; k++) {
        const yaw = k * Math.PI / 2 + 0.3, pitch = k % 2 ? 0.12 : -0.3; // duas vistas olham mais para o chão (pisos e calçadas)
        shoot(x, y, z, yaw, pitch, a); shoot(x + 0.001, y + 0.0007, z - 0.001, yaw, pitch, b);
        for (let p = 0; p < a.length; p += 4) {
          const ia = a[p + 3], ib = b[p + 3]; if (ia === ib || ia < 0.5 || ib < 0.5) continue;
          const dx = a[p] - b[p], dy = a[p + 1] - b[p + 1], dz = a[p + 2] - b[p + 2]; if (dx * dx + dy * dy + dz * dz > 0.000081) continue; // lugares diferentes: é só a borda de um objeto
          const d = Math.hypot(a[p] - x, a[p + 1] - y, a[p + 2] - z); if (d > FAR || d < 0.8) continue;
          const key = Math.floor(a[p] / CS) + ',' + Math.floor(a[p + 1] / CS) + ',' + Math.floor(a[p + 2] / CS);
          let c = cells.get(key); if (!c) cells.set(key, (c = { n: 0, x: 0, y: 0, z: 0, d: 1e9, from: null, pair: {}, best: 0, cur: 0, curI: -1 }));
          c.n++; c.x += a[p]; c.y += a[p + 1]; c.z += a[p + 2];
          if (c.curI !== i * 4 + k) { c.curI = i * 4 + k; c.cur = 0; } c.cur++;
          if (c.cur > c.best) { c.best = c.cur; c.from = [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)]; c.d = d; }
          const pk = Math.min(ia, ib) + '/' + Math.max(ia, ib); c.pair[pk] = (c.pair[pk] || 0) + 1;
        }
      }
      if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  } catch (e) { job.err = String(e.stack || e).slice(0, 400); }
  R.setRenderTarget(oldTarget); R.setClearColor(oldClear, oldAlpha); R.toneMapping = oldTM;
  for (const [o, m] of swapped) o.material = m; for (const o of hidden) o.visible = true;
  rt.dispose(); for (const s of ids.values()) s.dispose();
  window.requestAnimationFrame = raf; if (held) raf(held);

  // as peças com uma face passando pelo ponto (as que disputam o plano), com a pilha de chamadas que criou cada uma
  const short = (src) => src.split(' < ').map((f) => f.replace('js/', '')).join('<');
  const srcOf = (x, y, z) => { const s = new Map(); for (const p of P) { const bb = p.b; if (x < bb.min.x - 0.06 || x > bb.max.x + 0.06 || y < bb.min.y - 0.06 || y > bb.max.y + 0.06 || z < bb.min.z - 0.06 || z > bb.max.z + 0.06) continue;
    const face = Math.min(Math.abs(x - bb.min.x), Math.abs(x - bb.max.x), Math.abs(y - bb.min.y), Math.abs(y - bb.max.y), Math.abs(z - bb.min.z), Math.abs(z - bb.max.z)); if (face > 0.06) continue;
    const k = (p.mn || '?') + ' ' + short(p.src); s.set(k, (s.get(k) || 0) + 1); } return [...s.keys()].slice(0, 5).join('  ||  '); };
  const list = [...cells.values()].filter((c) => c.best >= 8).sort((u, v) => v.best - u.best);
  job.count = list.length;
  job.clusters = list.slice(0, 500).map((c) => { const x = c.x / c.n, y = c.y / c.n, z = c.z / c.n; const pr = Object.entries(c.pair).sort((u, v) => v[1] - u[1])[0][0].split('/').map((n) => names[n]); return { px: c.best, tot: c.n, at: [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)], from: c.from, d: +c.d.toFixed(1), mats: pr.join(' × '), src: srcOf(x, y, z) }; });
  job.done = true;
  return { samples: pts.length, cells: list.length, secs: Math.round((performance.now() - job.t0) / 1000) };

}
export function top(n = 40, min = 25) {
  const j = window.__zf; if (!j || !j.done) return 'não terminou';
  return j.clusters.filter((c) => c.px >= min).slice(0, n).map((c) => `${c.px}px d${c.d} em (${c.at}) de (${c.from}) [${c.mats}] ${c.src}`);
}
// A = [{ from: [x, y, z], at: [x, y, z], fov? }]: em cada vista, os pares de materiais que disputam o plano e as peças
export async function spot(g, A) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = await import('three');
  const R = g.renderer, scene = g.scene, P = globalThis.__pieces || [], N = 256;
  const raf = window.requestAnimationFrame; let held = null; window.requestAnimationFrame = (cb) => { held = cb; return 0; }; await wait(150);
  const vs = 'varying vec3 vW; void main(){ vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n vec4 w = modelMatrix * p; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const fs = 'uniform float uId; varying vec3 vW; void main(){ gl_FragColor = vec4(vW, uId); }';
  const ids = new Map(), info = [null], matNone = new THREE.MeshBasicMaterial({ visible: false });
  const desc = (m, o) => `${m.name || ''}#${m.color ? m.color.getHexString() : ''} ${m.map ? 'map:' + String(m.map.image?.src || m.map.image?.tagName || '').split('/').slice(-2).join('/') : 'semmapa'} ${o.isInstancedMesh ? 'inst' : ''} tris:${Math.round((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3)} ${o.matrixAutoUpdate ? 'solta' : 'estática'} pai:${o.parent?.name || o.parent?.type}`;
  const pick = (m, o) => { if (!m || m.side === THREE.BackSide || m.transparent || m.visible === false || m.alphaTest > 0) return matNone; const k = m.uuid + '|' + o.uuid; let s = ids.get(k); if (!s) { s = new THREE.ShaderMaterial({ side: m.side, vertexShader: vs, fragmentShader: fs, uniforms: { uId: { value: info.length } }, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits }); info.push(desc(m, o)); ids.set(k, s); } return s; };
  const swapped = []; scene.traverse((o) => { if (!o.isMesh || o.isSkinnedMesh || !(o.layers.mask & 9)) return; swapped.push([o, o.material]); o.material = Array.isArray(o.material) ? o.material.map((m) => pick(m, o)) : pick(o.material, o); });
  const rt = new THREE.WebGLRenderTarget(N, N, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const cam = new THREE.PerspectiveCamera(60, 1, 0.15, 600); cam.layers.enable(3);
  const a = new Float32Array(N * N * 4), b = new Float32Array(N * N * 4), out = [];
  const oldT = R.getRenderTarget(), oldTM = R.toneMapping; R.toneMapping = THREE.NoToneMapping;
  const shoot = (p, at, buf) => { cam.position.set(...p); cam.lookAt(...at); cam.updateMatrixWorld(true); R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam); R.readRenderTargetPixels(rt, 0, 0, N, N, buf); };
  const piecesAt = (x, y, z) => { const s = new Set(); for (const p of P) { const bb = p.b; if (x < bb.min.x - 0.03 || x > bb.max.x + 0.03 || y < bb.min.y - 0.03 || y > bb.max.y + 0.03 || z < bb.min.z - 0.03 || z > bb.max.z + 0.03) continue; const face = Math.min(Math.abs(x - bb.min.x), Math.abs(x - bb.max.x), Math.abs(y - bb.min.y), Math.abs(y - bb.max.y), Math.abs(z - bb.min.z), Math.abs(z - bb.max.z)); if (face > 0.03) continue; s.add(`${p.mn} [${[bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map((v) => v.toFixed(2)).join('x')} y${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)}] ${p.src.split(' < ').map((f) => f.replace('js/', '')).join('<')}`); } return [...s].slice(0, 6); };
  for (const s of A) {
    cam.fov = s.fov || 60; cam.updateProjectionMatrix();
    shoot(s.from, s.at, a); shoot([s.from[0] + 0.001, s.from[1] + 0.0007, s.from[2] - 0.001], s.at, b);
    const pairs = new Map();
    for (let p = 0; p < a.length; p += 4) { const ia = a[p + 3], ib = b[p + 3]; if (ia === ib || ia < 0.5 || ib < 0.5) continue; const dx = a[p] - b[p], dy = a[p + 1] - b[p + 1], dz = a[p + 2] - b[p + 2]; if (dx * dx + dy * dy + dz * dz > 0.000081) continue;
      const k = Math.min(ia, ib) + '/' + Math.max(ia, ib); let e = pairs.get(k); if (!e) pairs.set(k, (e = { n: 0, x: 0, y: 0, z: 0 })); e.n++; e.x += a[p]; e.y += a[p + 1]; e.z += a[p + 2]; }
    out.push({ vista: s.from.join(',') + ' → ' + s.at.join(','), pares: [...pairs.entries()].sort((u, v) => v[1].n - u[1].n).slice(0, 4).map(([k, e]) => { const [i, j] = k.split('/').map(Number); const x = e.x / e.n, y = e.y / e.n, z = e.z / e.n; return { px: e.n, em: [x, y, z].map((v) => +v.toFixed(2)), A: info[i], B: info[j], pecas: piecesAt(x, y, z) }; }) });
  }
  R.setRenderTarget(oldT); R.toneMapping = oldTM; for (const [o, m] of swapped) o.material = m; rt.dispose(); for (const s of ids.values()) s.dispose();
  window.requestAnimationFrame = raf; if (held) raf(held);
  return out;

}
