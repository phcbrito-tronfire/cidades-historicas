// Ajudantes de teste no navegador (com o som mudo). No console da página da cidade:
//   const T = await import('./tools/teste.js'); await T.start(); await T.view('nome', x, z, grausDeFrente)
// As imagens vão para _arquivos/shots (o serve.js local grava com POST /__shot).
export async function start() {
  AudioContext.prototype.resume = async () => {};
  for (let i = 0; i < 120 && !document.querySelector('#intro:not([hidden])') && !document.querySelector('#fallback:not([hidden])'); i++) await new Promise((r) => setTimeout(r, 1000));
  const fail = document.querySelector('#fallback:not([hidden])'); if (fail) return 'FALHOU: ' + fail.textContent.trim().slice(0, 400);
  [...document.querySelectorAll('button')].find((b) => /explorar/.test(b.textContent))?.click();
  await new Promise((r) => setTimeout(r, 1200));
  return 'ok';
}
export async function shot(n) {
  const g = window.__game; g.scene.updateMatrixWorld();
  g.scene.traverse((o) => { if (o.isSkinnedMesh) o.skeleton._frame = -1; }); // (o jogo só recalcula cada esqueleto uma vez por quadro)
  for (let i = 0; i < 2; i++) { g.renderer.info.reset(); g.renderer.shadowMap.needsUpdate = true; g.post.render(0.016, g.sky.state.night, 0); } // (info.reset: o esqueleto dos bonecos é recalculado)
  const d = g.renderer.domElement.toDataURL('image/jpeg', 0.82);
  return (await fetch('/__shot?n=' + n, { method: 'POST', body: d })).text();
}
export async function view(n, x, z, deg, steps = 20) {
  const g = window.__game; g.tp(x, z, (deg * Math.PI) / 180);
  for (let i = 0; i < steps; i++) g.player.update(1 / 60, i / 60);
  g.sky.update(0.016, 1, g.player.pos);
  return shot(n);
}
// caminha até (x, z) com a física do jogo; devolve onde parou
export function walk(x, z, maxS = 120, run = true) {
  const g = window.__game, P = g.player; P.keys.clear(); P.keys.add('ArrowUp'); if (run) P.keys.add('ShiftLeft');
  let t = 0; const dt = 1 / 30;
  while (t < maxS) { const dx = x - P.pos.x, dz = z - P.pos.z; if (Math.hypot(dx, dz) < 1) break; P.camYawW = Math.atan2(dx, dz) + Math.PI; P.update(dt, t); t += dt; }
  P.keys.clear(); return { x: +P.pos.x.toFixed(1), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(1), t: +t.toFixed(1), ok: Math.hypot(x - P.pos.x, z - P.pos.z) < 1.5 };
}
