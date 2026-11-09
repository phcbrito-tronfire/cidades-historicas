// Varredura de "paredes abertas" (ferramenta de teste). Abrir a cidade com ?scan=1 e, no console:
//   const V = await import('./tools/avesso.js'); await V.scan(__game, { step: 5 }); V.top(40)
// De milhares de pontos onde se anda (o chão e o topo das caixas de colisão), desenha a cena numa imagem pequena em
// 4 direções marcando as faces vistas PELO AVESSO. O jogo não desenha o avesso: ali se vê através da parede, do vaso,
// do toldo. Junta os pontos vizinhos e diz, para cada grupo, de onde se vê, a que distância e que linha do código
// criou a peça (as peças do Batcher; modelos baixados saem como "(modelo)").
// Leva de 2 a 15 minutos por cidade, com o jogo parado. Desde 09/11/2026 o Batcher põe o avesso sozinho em toda peça
// com borda solta, então o que sobra aqui são malhas soltas e pontos em que a câmera de teste encostou numa peça
// (distância ~1 m, vista de um ponto só: conferir por imagem antes de mexer).
// opts: step (m entre pontos perto de construções; longe delas a grade é 4x mais aberta), far (até que distância
// conta), box [x0, x1, z0, z1] (só um pedaço do mapa), status (só diz em que ponto está).
export async function scan(g, A = {}) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (A?.status) { const j = window.__bf; return j ? { done: j.done, i: j.i, total: j.total, samples: j.samples, secs: Math.round((performance.now() - j.t0) / 1000), err: j.err } : 'sem varredura'; }
  if (window.__bf && !window.__bf.done) return 'já rodando';
  const THREE = await import('three');
  const C = await import('../js/comum/collision.js');
  const R = g.renderer, scene = g.scene, P = globalThis.__pieces || [];
  const step = A?.step || 4, FAR = A?.far || 70, N = 128;
  const B = A?.box || g.player.bounds;
  const job = (window.__bf = { done: false, i: 0, total: 0, samples: 0, t0: performance.now(), clusters: null, inside: [] });

  // para o laço do jogo enquanto a varredura roda
  const raf = window.requestAnimationFrame; let held = null;
  window.requestAnimationFrame = (cb) => { held = cb; return 0; };
  await new Promise((r) => setTimeout(r, 200));

  const vs = 'varying vec3 vW; void main(){ vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n vec4 w = modelMatrix * p; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const matA = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: vs, fragmentShader: 'varying vec3 vW; void main(){ gl_FragColor = vec4(vW, gl_FrontFacing ? 1.0 : 2.0); gl_FragDepth = gl_FragCoord.z + (gl_FrontFacing ? 0.0 : 0.00001); }' }); // (o avesso perde para a frente quando os dois estão no mesmo lugar: as peças que já ganharam avesso não contam)
  const matB = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: vs, fragmentShader: 'varying vec3 vW; void main(){ gl_FragColor = vec4(vW, 1.0); }' });
  const matNone = new THREE.MeshBasicMaterial({ visible: false });
  const pick = (m) => (!m || m.side === THREE.BackSide || (m.transparent && m.depthWrite === false) || m.visible === false ? matNone : m.side === THREE.DoubleSide || m.alphaTest > 0 || m.transparent ? matB : matA);
  const swapped = [];
  scene.traverse((o) => { if (!o.isMesh || o.isSkinnedMesh || !(o.layers.mask & 9)) return; swapped.push([o, o.material]); o.material = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material); });
  const hidden = []; scene.traverse((o) => { if ((o.isPoints || o.isLine || o.isSprite) && o.visible) { hidden.push(o); o.visible = false; } });

  // ocupação: células com alguma peça de construção (só perto delas a grade é fina)
  const occ = new Set(), OC = 8; for (const p of P) { const b = p.b; for (let i = Math.floor((b.min.x - 6) / OC); i <= Math.floor((b.max.x + 6) / OC); i++) for (let j = Math.floor((b.min.z - 6) / OC); j <= Math.floor((b.max.z + 6) / OC); j++) occ.add(i * 100003 + j); }
  const pts = [];
  for (let x = B[0] + 2; x < B[1]; x += step) for (let z = B[2] + 2; z < B[3]; z += step) {
    const built = occ.has(Math.floor(x / OC) * 100003 + Math.floor(z / OC));
    if (!built && (Math.round((x - B[0]) / step) % 4 || Math.round((z - B[2]) / step) % 4)) continue; // longe de construções: grade 4x mais aberta
    const t = C.terrainAt(x, z), w = C.waterAt(x, z);
    const levels = new Set(); const g0 = C.groundAt(x, z, t + 0.3); if (g0 > w - 0.3) levels.add(+g0.toFixed(2));
    if (built) for (const b of C.boxes) { if (!b.enabled || b.noFloor || x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ || b.top < t + 0.4 || b.top > t + 60) continue; levels.add(+b.top.toFixed(2)); if (levels.size > 4) break; }
    for (const y of levels) { if (C.blocked(x, z, y, 0.3, 1.7) || C.solidAt(x, y + 1.55, z)) continue; pts.push([x, y + 1.55, z]); }
  }
  job.total = pts.length;

  const rt = new THREE.WebGLRenderTarget(N, N, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const cam = new THREE.PerspectiveCamera(100, 1, 0.12, 170); cam.layers.enable(3);
  const buf = new Float32Array(N * N * 4), cells = new Map(), CS = 1.5;
  const oldTarget = R.getRenderTarget(), oldClear = R.getClearColor(new THREE.Color()), oldAlpha = R.getClearAlpha(), oldTM = R.toneMapping;
  R.toneMapping = THREE.NoToneMapping;
  try {
    for (let i = 0; i < pts.length; i++) {
      const [x, y, z] = pts[i]; job.i = i;
      for (let k = 0; k < 4; k++) {
        const yaw = k * Math.PI / 2 + 0.4;
        cam.position.set(x, y, z); cam.rotation.set(0.26, yaw, 0, 'YXZ'); cam.updateMatrixWorld(true);
        R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(scene, cam);
        R.readRenderTargetPixels(rt, 0, 0, N, N, buf);
        let nb = 0, near = 0; const local = [];
        for (let p = 0; p < buf.length; p += 4) { if (buf[p + 3] < 1.5) continue; const dx = buf[p] - x, dy = buf[p + 1] - y, dz = buf[p + 2] - z, d = Math.hypot(dx, dy, dz); if (d < 1.0) { near++; continue; } if (d > FAR) continue; nb++; local.push(buf[p], buf[p + 1], buf[p + 2], d); }
        if (near > N * N * 0.004) { if (job.inside.length < 300) job.inside.push([+x.toFixed(1), +y.toFixed(1), +z.toFixed(1), near]); continue; } // a câmera encostou/entrou numa peça: a vista não vale
        if (!nb) continue;
        if (nb > N * N * 0.4) { if (job.inside.length < 300) job.inside.push([+x.toFixed(1), +y.toFixed(1), +z.toFixed(1), nb]); continue; } // a câmera está dentro de alguma peça
        const seen = new Map();
        for (let q = 0; q < local.length; q += 4) { const key = Math.floor(local[q] / CS) + ',' + Math.floor(local[q + 1] / CS) + ',' + Math.floor(local[q + 2] / CS); let e = seen.get(key); if (!e) seen.set(key, (e = { n: 0, x: 0, y: 0, z: 0, d: 1e9 })); e.n++; e.x += local[q]; e.y += local[q + 1]; e.z += local[q + 2]; e.d = Math.min(e.d, local[q + 3]); }
        for (const [key, e] of seen) { let c = cells.get(key); if (!c) cells.set(key, (c = { n: 0, views: 0, best: 0, from: null, x: 0, y: 0, z: 0, d: 1e9 })); c.n += e.n; c.views++; c.x += e.x; c.y += e.y; c.z += e.z; c.d = Math.min(c.d, e.d); if (e.n > c.best) { c.best = e.n; c.from = [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)]; } }
      }
      job.samples++;
      if (i % 40 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  } catch (e) { job.err = String(e.stack || e).slice(0, 400); }
  R.setRenderTarget(oldTarget); R.setClearColor(oldClear, oldAlpha); R.toneMapping = oldTM;
  for (const [o, m] of swapped) o.material = m; for (const o of hidden) o.visible = true;
  rt.dispose();
  window.requestAnimationFrame = raf; if (held) raf(held);

  // agrupa as células vizinhas e liga cada grupo à linha do código que criou a peça
  const list = [...cells.entries()].map(([k, c]) => ({ k: k.split(',').map(Number), n: c.n, views: c.views, best: c.best, from: c.from, x: c.x / c.n, y: c.y / c.n, z: c.z / c.n, d: c.d })).filter((c) => c.best >= 6);
  const byKey = new Map(list.map((c) => [c.k.join(','), c])), groups = [];
  for (const c of list) { if (c.g) continue; const G = { cells: [], n: 0, best: 0, from: null, x: 0, y: 0, z: 0, d: 1e9, views: 0 }; const st = [c]; c.g = G;
    while (st.length) { const a = st.pop(); G.cells.push(a); G.n += a.n; G.views = Math.max(G.views, a.views); G.d = Math.min(G.d, a.d); if (a.best > G.best) { G.best = a.best; G.from = a.from; G.x = a.x; G.y = a.y; G.z = a.z; }
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) { const b = byKey.get((a.k[0] + i) + ',' + (a.k[1] + j) + ',' + (a.k[2] + l)); if (b && !b.g) { b.g = G; st.push(b); } } }
    groups.push(G); }
  const srcOf = (x, y, z) => { const s = {}; for (const p of P) { const b = p.b; if (x > b.min.x - 0.3 && x < b.max.x + 0.3 && y > b.min.y - 0.3 && y < b.max.y + 0.3 && z > b.min.z - 0.3 && z < b.max.z + 0.3) { const k = p.src.split(' < ')[0]; s[k] = (s[k] || 0) + 1; } } return Object.entries(s).sort((a, b) => a[1] - b[1]).slice(0, 3).map((e) => e[0]).join(' | '); };
  groups.sort((a, b) => b.best - a.best);
  job.clusters = groups.slice(0, 400).map((G) => ({ px: G.best, tot: G.n, views: G.views, at: [+G.x.toFixed(1), +G.y.toFixed(1), +G.z.toFixed(1)], from: G.from, d: +G.d.toFixed(1), size: G.cells.length, src: srcOf(G.x, G.y, G.z) }));
  job.groups = groups.length; job.done = true;
  return { samples: job.samples, groups: groups.length, secs: Math.round((performance.now() - job.t0) / 1000) };

}
// os maiores grupos da última varredura
export function top(n = 40, min = 20) {
  const j = window.__bf; if (!j || !j.done) return 'não terminou';
  return j.clusters.filter((c) => c.px >= min).slice(0, n).map((c) => `${c.px}px vistas:${c.views} d${c.d} em (${c.at}) de (${c.from}) ${c.src || '(modelo)'}`);
}
