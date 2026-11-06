// Viagem rápida pelo mapa (M): os mapas são grandes, então alguns lugares de cada cidade aparecem no mapa como
// pontos dourados. Clicou num deles, o explorador some numa coluna de luz dourada (a tela clareia) e reaparece no
// destino, com a mesma luz se desfazendo em volta dele. (No mapa os pontos são azuis com uma estrelinha branca: os
// amarelos são os objetivos.)
// Regra (pedido do Pedro, 06/11/2026): cada ponto só libera a viagem depois que o aluno chega lá por conta própria
// (a pé, a cavalo ou de barco) — senão ninguém anda pela cidade, só pula de um lugar para o outro. No mapa, os
// pontos ainda não visitados ficam cinza, com cadeado. Os liberados ficam salvos no navegador, por cidade.
//
// Uso (main.js de cada cidade, ANTES do warmUp, para os shaders da luz já estarem compilados):
//   const travel = makeTravel({ scene, player, points, close: () => { mapOpen = ui.toggleBigMap(...) }, before, after })
//   ui.onMapDrawn = (ctx, toPx, fromPx) => travel.draw(ctx, toPx, fromPx)
//   no laço: travel.update(dt)
import * as THREE from 'three';

const CSS = `
#travel-flash { position: fixed; inset: 0; z-index: 30; pointer-events: none; opacity: 0; transition: opacity 0.55s ease;
  background: radial-gradient(circle at 50% 55%, rgba(255,250,225,0.98) 0%, rgba(255,226,150,0.92) 35%, rgba(214,160,60,0.75) 75%, rgba(120,80,20,0.6) 100%); }
#travel-flash.on { opacity: 1; }
#travel-tip { position: fixed; z-index: 40; pointer-events: none; padding: 6px 10px; border-radius: 6px; font: 600 14px Cinzel, Georgia, serif;
  color: #3a2410; background: rgba(255,245,220,0.95); border: 1px solid #b8862e; box-shadow: 0 2px 8px rgba(0,0,0,0.35); transform: translate(-50%, -140%); white-space: nowrap; }
#travel-tip small { display: block; font: 12px Georgia, serif; color: #6a4a24; margin-top: 2px; }
`;

// textura de brilho redondo (as partículas de luz)
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, 'rgba(255,220,140,0.8)'); g.addColorStop(1, 'rgba(255,180,60,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// textura da coluna: some nas pontas de cima e de baixo, com faixas verticais suaves
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  for (let i = 0; i < 64; i++) { const a = 0.35 + 0.65 * Math.pow(Math.sin((i / 64) * Math.PI * 6) * 0.5 + 0.5, 2); x.fillStyle = `rgba(255,${200 + ((i * 7) % 40)},120,${a})`; x.fillRect(i, 0, 1, 128); }
  const m = x.createLinearGradient(0, 0, 0, 128); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.25, 'rgba(0,0,0,0)'); m.addColorStop(0.85, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,0.6)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

const RADIUS = 25; // chegar a 25 m do ponto libera a viagem até ele
export function makeTravel({ scene, player, points, close, before = () => true, after = () => {}, toast = () => {} }) {
  const KEY = 'cidades-historicas:' + ((location.pathname.match(/(\w+)\.html/) || [])[1] || 'cidade') + ':viagem';
  const open = new Set(); try { JSON.parse(localStorage.getItem(KEY) || '[]').forEach((n) => open.add(n)); } catch (e) { /* sem armazenamento */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...open])); } catch (e) { /* */ } };
  let first = !open.size; // no primeiro passeio, o lugar onde a jornada começa já vale como visitado
  if (!document.getElementById('travel-css')) { const st = document.createElement('style'); st.id = 'travel-css'; st.textContent = CSS; document.head.appendChild(st); }
  const flash = document.createElement('div'); flash.id = 'travel-flash'; document.body.appendChild(flash);
  const tip = document.createElement('div'); tip.id = 'travel-tip'; tip.hidden = true; document.body.appendChild(tip);
  for (const p of points) p.f ??= Math.atan2((p.lx ?? p.x) - p.x, (p.lz ?? p.z + 1) - p.z); // de frente para o que interessa

  // ---- a luz: uma coluna (cilindro aberto, aditivo) e 90 faíscas que sobem em espiral
  const fx = new THREE.Group(); fx.visible = false; scene.add(fx);
  const beamTex = beamTexture();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6, 32, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: 0xffd890, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 3; fx.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.4, 40), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffe0a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; fx.add(ring);
  const N = 90, pos = new Float32Array(N * 3), seed = Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2 * 3.7, r: 0.4 + ((i * 37) % 10) / 14, s: 0.6 + ((i * 53) % 10) / 12, y0: ((i * 29) % 100) / 100 }));
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffe2a0, size: 0.32, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sparks.frustumCulled = false; fx.add(sparks);
  fx.traverse((o) => { o.renderOrder = 3; o.layers.set(1); });

  let job = null, last = null; // last: a última desenhada do mapa (para o clique achar o ponto)
  const canvas = document.getElementById('bigmap-canvas');
  const foot = document.querySelector('#bigmap .bm-foot'), footBase = foot?.textContent || '';
  const footText = () => { if (foot) foot.textContent = `${footBase} · viagem rápida: ${open.size} de ${points.length} lugares liberados (os cinza se liberam quando você chega lá)`; };
  const pick = (e) => {
    if (!last) return null;
    const r = canvas.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * canvas.width, py = ((e.clientY - r.top) / r.height) * canvas.height;
    let best = null, bd = 18 * 18;
    for (const p of points) { const [x, y] = last.toPx(p.x, p.z), d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  };
  canvas?.addEventListener('mousemove', (e) => {
    const p = pick(e); canvas.style.cursor = p && open.has(p.name) ? 'pointer' : '';
    if (!p) { tip.hidden = true; return; }
    tip.hidden = false; tip.innerHTML = open.has(p.name) ? `${p.name}${p.sub ? `<small>${p.sub}</small>` : ''}` : `${p.name}<small>Ainda não visitado: vá até lá (andando, a cavalo ou de barco) para liberar a viagem</small>`; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px';
  });
  canvas?.addEventListener('mouseleave', () => { tip.hidden = true; });
  canvas?.addEventListener('click', (e) => { const p = pick(e); if (p) go(p); });

  function go(p) {
    if (job || !open.has(p.name) || !before(p)) return;
    tip.hidden = true; if (!document.getElementById('bigmap')?.hidden) close(); // (fecha o mapa só se estiver aberto)
    player.locked = true; player.keys?.clear();
    job = { p, t: 0, moved: false };
    put(player.pos);
  }
  function put(at) { fx.position.set(at.x, at.y, at.z); fx.visible = true; }

  const api = {
    points, go,
    // desenha os pontos no mapa grande (chamado pelo ui depois de desenhar o fundo)
    draw(ctx, toPx) {
      last = { toPx }; footText();
      for (const p of points) {
        const [x, y] = toPx(p.x, p.z);
        if (!open.has(p.name)) { // ainda não visitado: cinza, com um cadeadinho
          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.fillStyle = 'rgba(110,104,96,0.85)';
          ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#f2ece0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y - 1.2, 2.2, Math.PI, 0); ctx.stroke();
          ctx.fillStyle = '#f2ece0'; ctx.fillRect(x - 3, y - 1, 6, 4.2);
          continue;
        }
        // (azul com anel branco: diferente dos marcadores amarelos dos objetivos)
        const g = ctx.createRadialGradient(x, y, 0, x, y, 17); g.addColorStop(0, 'rgba(150,215,255,0.85)'); g.addColorStop(1, 'rgba(90,170,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#1f4f86';
        ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r = k % 2 ? 1.6 : 4.4; ctx.lineTo(x + Math.cos(a - Math.PI / 2) * r, y + Math.sin(a - Math.PI / 2) * r); } ctx.closePath(); ctx.fill(); // estrelinha
      }
    },
    get busy() { return !!job; },
    // os lugares de cada cidade que o aluno já visitou (o reinício da jornada apaga)
    reset() { open.clear(); try { localStorage.removeItem(KEY); } catch (e) { /* */ } },
    isOpen: (p) => open.has(p.name),
    update(dt, active = true) {
      if (active && !job) { // chegou perto de um ponto por conta própria: libera
        const P = player.pos;
        if (first) { first = false; let best = null, bd = 80 * 80; for (const p of points) { const d = (p.x - P.x) ** 2 + (p.z - P.z) ** 2; if (d < bd) { bd = d; best = p; } } if (best) { open.add(best.name); save(); } }
        for (const p of points) if (!open.has(p.name) && (p.x - P.x) ** 2 + (p.z - P.z) ** 2 < RADIUS * RADIUS) { open.add(p.name); save(); toast(`Viagem rápida liberada: ${p.name}. Agora dá para voltar aqui pelo mapa (M).`); }
      }
      if (!job) return;
      job.t += dt; const t = job.t, T1 = 0.75, T2 = 1.7;
      // ida: a luz cresce em volta do explorador e a tela clareia; no meio, ele muda de lugar; volta: a luz se desfaz
      const k = t < T1 ? t / T1 : Math.max(0, 1 - (t - T1) / (T2 - T1));
      if (t > 0.35 && t < T1 && !flash.classList.contains('on')) flash.classList.add('on');
      if (t >= T1 && !job.moved) {
        job.moved = true; const p = job.p;
        player.place(p.x, p.z, p.f); player.swimming = false; player.diving = false; player.wading = false; player.vy = 0; player.speed = 0; player.onGround = true;
        put(player.pos); after(p);
        setTimeout(() => flash.classList.remove('on'), 120);
      }
      beam.material.opacity = 0.75 * k; beam.scale.set(1 - 0.45 * k, 0.6 + 0.4 * k, 1 - 0.45 * k); beamTex.offset.x += dt * 0.6;
      ring.material.opacity = 0.9 * k; ring.scale.setScalar(0.6 + k * 0.6);
      sparks.material.opacity = Math.min(1, k * 1.4);
      for (let i = 0; i < N; i++) {
        const q = seed[i], up = (q.y0 + t * q.s * 0.7) % 1, a = q.a + t * (2 + q.s), r = q.r * (1 - up * 0.5) * (0.7 + 0.3 * k);
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = up * 5.5; pos[i * 3 + 2] = Math.sin(a) * r;
      }
      pg.attributes.position.needsUpdate = true;
      if (t >= T2) { fx.visible = false; player.locked = false; job = null; }
    },
  };
  window.__travel = api; // (para os testes)
  return api;
}
