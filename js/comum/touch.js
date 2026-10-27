// Controles por toque (celular/tablet): joystick, câmera por arrasto, pinça para zoom e
// botões que disparam as mesmas teclas do computador (tudo o que funciona no teclado funciona aqui).

// celular/tablet de verdade: o ponteiro principal é o dedo, ou o navegador se identifica como móvel.
// (notebooks com tela de toque têm mouse como ponteiro principal e não entram aqui)
export const isTouch = (() => {
  try { return matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); } catch (e) { return false; }
})();
// aparelhos com tela de toque que não foram detectados: liga os controles no primeiro toque
export const canTouch = (() => { try { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; } catch (e) { return false; } })();

const press = (code, key) => dispatchEvent(new KeyboardEvent('keydown', { code, key: key || code }));
const release = (code, key) => dispatchEvent(new KeyboardEvent('keyup', { code, key: key || code }));
const tap = (code, key) => { press(code, key); setTimeout(() => release(code, key), 120); };

export function setupTouch(player) {
  const css = document.createElement('style');
  css.textContent = `
    html, body, #game, #game canvas { touch-action: none; -webkit-user-select: none; user-select: none; overscroll-behavior: none; }
    #touch { position: fixed; inset: 0; z-index: 15; pointer-events: none; }
    #touch .cam { position: absolute; top: 0; right: 0; width: 60%; height: 100%; pointer-events: auto; }
    #touch .stick { position: absolute; left: 3vw; bottom: 4vh; width: 140px; height: 140px; border-radius: 50%; pointer-events: auto;
      background: radial-gradient(circle, rgba(30,20,8,.25), rgba(30,20,8,.55)); border: 2px solid rgba(232,184,74,.65); }
    #touch .knob { position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #ffe39a, #c8902e); box-shadow: 0 3px 10px rgba(0,0,0,.5); }
    #touch .btns { position: absolute; right: 3vw; bottom: 4vh; display: grid; grid-template-columns: repeat(3, 64px); gap: 10px; pointer-events: auto; }
    #touch .top { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; pointer-events: auto; }
    #touch button { border: 1px solid rgba(232,184,74,.7); color: #ffe7b0; background: rgba(28,18,8,.62); font-family: Cinzel, Georgia, serif;
      font-weight: 700; border-radius: 50%; width: 64px; height: 64px; font-size: .72rem; line-height: 1.05; padding: 0; backdrop-filter: blur(3px); }
    #touch .top button { border-radius: 10px; width: auto; height: 38px; padding: 0 10px; font-size: .7rem; }
    #touch button.on, #touch button:active { background: rgba(200,140,40,.85); color: #2a1806; }
    #touch .big { width: 76px; height: 76px; font-size: .8rem; }
    #rotate-hint { position: fixed; inset: 0; z-index: 60; display: none; place-items: center; text-align: center; padding: 24px;
      background: rgba(10,7,4,.92); color: #ffe3a0; font-family: Cinzel, Georgia, serif; font-size: 1.2rem; }
    @media (orientation: portrait) { body.touch-on #rotate-hint { display: grid; } }
    body.touch-on #keys { display: none; }
    body.touch-on #journal { top: 56px; width: 230px; max-height: 40vh; font-size: .85rem; }
    body.touch-on #mini-wrap { width: 110px; height: 110px; top: 56px; bottom: auto; right: 10px; }
    body.touch-on #loc { top: 52px; }
    body.touch-on #loc-place { font-size: 1.05rem; }
    body.touch-on #art-count { top: 100px; font-size: .85rem; }
    body.touch-on #toasts { top: 60px; width: min(440px, 60vw); }
    body.touch-on .toast { font-size: .9rem; padding: 6px 12px; }
    body.touch-on #prompt { bottom: 30vh; font-size: .95rem; white-space: normal; max-width: 70vw; text-align: center; }
    body.touch-on #prompt kbd { display: none; }
    body.touch-on .d-box { padding: 12px 14px; }
    body.touch-on #d-text { font-size: 1.05rem; min-height: 0; }
    body.touch-on #d-options button { font-size: 1rem; padding: 10px 12px; }
  `;
  document.head.appendChild(css);
  document.body.classList.add('touch-on');

  const root = document.createElement('div'); root.id = 'touch';
  root.innerHTML = `
    <div class="cam"></div>
    <div class="stick"><div class="knob"></div></div>
    <div class="top">
      <button data-k="KeyC">Clima</button><button data-k="KeyJ">Diário</button><button data-k="KeyK">Artefatos</button>
      <button data-k="KeyM">Mapa</button><button data-k="Escape">Menu</button>
    </div>
    <div class="btns">
      <button data-k="KeyR">Usar</button><button data-k="KeyP">Pegar</button><button data-k="KeyE" class="big">Falar</button>
      <button data-run>Correr</button><button data-k="Space" class="big" style="grid-column: span 2; border-radius: 40px; width: auto">Pular</button>
    </div>`;
  document.body.appendChild(root);
  const hint = document.createElement('div'); hint.id = 'rotate-hint';
  hint.innerHTML = '<div>↻<br>Gire o celular para jogar na horizontal</div>';
  document.body.appendChild(hint);

  // botões
  root.querySelectorAll('button[data-k]').forEach((b) => {
    // o Espaço fica apertado enquanto o dedo estiver no botão (mergulho: segurar = ficar embaixo d'água)
    if (b.dataset.k === 'Space') {
      b.addEventListener('touchstart', (e) => { e.preventDefault(); press('Space'); }, { passive: false });
      for (const ev of ['touchend', 'touchcancel']) b.addEventListener(ev, (e) => { e.preventDefault(); release('Space'); }, { passive: false });
      return;
    }
    b.addEventListener('touchstart', (e) => { e.preventDefault(); tap(b.dataset.k, b.dataset.k === 'Escape' ? 'Escape' : undefined); }, { passive: false });
    b.addEventListener('click', (e) => { e.preventDefault(); });
  });
  const runBtn = root.querySelector('[data-run]');
  let running = false;
  runBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); running = !running; runBtn.classList.toggle('on', running);
    if (running) press('ShiftLeft'); else release('ShiftLeft');
  }, { passive: false });

  // joystick
  const stick = root.querySelector('.stick'), knob = root.querySelector('.knob');
  let stickId = null, cx = 0, cy = 0;
  const R = 55;
  const setStick = (dx, dy) => {
    const l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
    dx *= k; dy *= k;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    player.touch = { x: dx / R, y: dy / R };
  };
  stick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0]; stickId = t.identifier;
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    setStick(t.clientX - cx, t.clientY - cy);
  }, { passive: false });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === stickId) setStick(t.clientX - cx, t.clientY - cy);
  }, { passive: false });
  const endStick = (e) => {
    for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; knob.style.transform = ''; player.touch = { x: 0, y: 0 }; }
  };
  addEventListener('touchend', endStick); addEventListener('touchcancel', endStick);

  // câmera: arrastar com um dedo; pinça com dois dedos = zoom
  const cam = root.querySelector('.cam');
  const pts = new Map();
  let pinch = 0;
  cam.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) pts.set(t.identifier, { x: t.clientX, y: t.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  }, { passive: false });
  cam.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (player.locked) return;
    if (pts.size >= 2) {
      for (const t of e.changedTouches) if (pts.has(t.identifier)) pts.set(t.identifier, { x: t.clientX, y: t.clientY });
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      player.camTargetDist = Math.max(2.2, Math.min(16, player.camTargetDist - (d - pinch) * 0.03));
      pinch = d;
      return;
    }
    for (const t of e.changedTouches) {
      const p = pts.get(t.identifier); if (!p) continue;
      player.camYawW -= (t.clientX - p.x) * 0.008;
      player.camPitch = Math.max(-0.25, Math.min(1.3, player.camPitch + (t.clientY - p.y) * 0.005));
      player.lastMouse = performance.now() / 1000;
      pts.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
  }, { passive: false });
  const endCam = (e) => { for (const t of e.changedTouches) pts.delete(t.identifier); };
  cam.addEventListener('touchend', endCam); cam.addEventListener('touchcancel', endCam);

  return {
    show(v) { root.style.display = v ? '' : 'none'; },
  };
}
