// A bateia (Etapa 7): na beira de um córrego, B abre a bateia — a gamela rasa de madeira — com o cascalho e a água.
// Girando (o mouse em círculos, ou ← → alternados), a água leva a areia e a terra pela beira; o ouro, que pesa mais,
// escorrega para o fundo. Girar devagar demais não limpa; depressa demais, joga o ouro fora junto. Espaço termina.
// O que sobra no fundo é contado em grãos (e no valor do tempo: oitavas e vinténs).
export class Bateia {
  constructor({ ui, audio, quests, toast }) {
    Object.assign(this, { ui, audio, quests, toast }); this.total = 0;
    const css = document.createElement('style');
    css.textContent = `#bateia{position:fixed;inset:0;z-index:39;display:grid;place-items:center;background:rgba(8,6,3,.62);backdrop-filter:blur(2px)}
      #bateia .box{display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px 22px;border-radius:12px;background:radial-gradient(ellipse at 20% 0%,#f8eed6,#efe0bd 55%,#e2cc9c);border:1px solid #b8914c;color:#2a1a0c;box-shadow:0 30px 80px rgba(0,0,0,.6);max-width:96vw}
      #bateia h2{font-family:Cinzel,serif;margin:0;color:#3a2410;font-size:1.5rem}
      #bateia p{margin:0;font-size:1.08rem;text-align:center;max-width:520px}
      #bateia canvas{border-radius:50%;cursor:grab;touch-action:none;width:min(420px,86vw,52vh);height:auto}
      @media (max-height:560px){#bateia .box{padding:10px 16px;gap:6px}#bateia h2{font-size:1.1rem}#bateia p{font-size:.86rem;max-width:640px}#bateia button{padding:.4rem 1rem}}
      #bateia .conta{font-family:Cinzel,serif;font-size:1rem;color:#5a3a14}
      #bateia .bt{display:flex;gap:10px}
      #bateia button{padding:.6rem 1.2rem;border-radius:8px;border:1px solid #8a5a14;font-family:Cinzel,serif;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#ffe39a,#e8b84a 60%,#b8832a)}
      #bateia button.no{background:rgba(255,255,255,.4)}`;
    document.head.appendChild(css);
    const el = (this.el = document.createElement('div')); el.id = 'bateia'; el.hidden = true;
    el.innerHTML = '<div class="box"><h2>A bateia</h2><p>Gire em círculos com o mouse ou o dedo (ou ← → alternados): a água leva a areia pela beira e o ouro desce para o fundo. Devagar não limpa; depressa demais joga o ouro fora.</p><canvas width="420" height="420"></canvas><div class="conta"></div><div class="bt"><button class="ok">Terminar (Espaço)</button><button class="no">Desistir (Esc)</button></div></div>';
    el.querySelector('.ok').onclick = () => this.close(true); el.querySelector('.no').onclick = () => this.close(false);
    document.body.appendChild(el); this.cv = el.querySelector('canvas'); this.cx = this.cv.getContext('2d'); this.bar = el.querySelector('.conta');
    let last = null;
    const ang = (e) => { const r = this.cv.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
    this.cv.addEventListener('pointermove', (e) => { const a = ang(e); if (last !== null) { let d = a - last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; this.push += d; } last = a; });
    this.cv.addEventListener('pointerleave', () => { last = null; });
    addEventListener('keydown', (e) => { if (!this.open) return; e.stopImmediatePropagation(); if (e.code === 'Escape') this.close(false); else if (e.code === 'Space') this.close(true); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.push -= 0.28; else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.push += 0.28; }, true);
  }
  get open() { return !this.el.hidden; }
  start() {
    this.el.hidden = false; this.push = 0; this.w = 0; this.t = 0; this.water = 1;
    const P = (this.p = []), gold = 3 + Math.floor(Math.random() * 9);
    for (let i = 0; i < 260; i++) P.push({ r: Math.sqrt(Math.random()) * 0.82, a: Math.random() * 6.28, g: false, s: 0.6 + Math.random() * 0.8, c: ['#6a4a2e', '#8a6a44', '#5a5048', '#a08a64', '#4a3a2a'][i % 5] });
    for (let i = 0; i < gold; i++) P.push({ r: Math.sqrt(Math.random()) * 0.7, a: Math.random() * 6.28, g: true, s: 0.5 + Math.random() * 0.5 });
    this.gold0 = gold; this.lastT = performance.now(); const tick = (now) => { if (!this.open) return; this.step(Math.min(0.05, (now - this.lastT) / 1000)); this.lastT = now; this.draw(); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  }
  step(dt) {
    this.t += dt; this.w += (this.push / Math.max(dt, 0.001) - this.w) * Math.min(1, dt * 6); this.push = 0; // (a velocidade do giro, suavizada)
    const w = Math.min(14, Math.abs(this.w)), spin = Math.sign(this.w);
    for (const q of this.p) { if (q.out) continue; q.a += spin * w * dt * (q.g ? 0.55 : 0.9) * q.s;
      if (q.g) q.r += ((w > 9 ? (w - 9) * 0.06 : 0) - 0.05) * dt * 1.4; // (o ouro desce; só sai se o giro for violento)
      else q.r += (w > 1.5 ? Math.min(w - 1.5, 8) * 0.012 * q.s : -0.004) * dt * 2.2; // (a areia sobe para a beira com o giro)
      q.r = Math.max(0, q.r); if (q.r > 1) { q.out = true; if (q.g) this.audio.drop?.(); } }
    if (w > 2 && Math.random() < dt * 4) this.audio.burst?.(0.12, 900 + Math.random() * 600, 0.04); // (a água chacoalhando)
    const sand = this.p.filter((q) => !q.g && !q.out).length, gold = this.p.filter((q) => q.g && !q.out).length;
    this.bar.textContent = `Areia na bateia: ${Math.round((sand / 260) * 100)}% · ouro que brilha no fundo: ${gold}`;
    if (sand < 18) this.close(true);
  }
  draw() {
    const x = this.cx, W = 420, C = W / 2, R = 190;
    x.clearRect(0, 0, W, W);
    const g = x.createRadialGradient(C, C, 20, C, C, R); g.addColorStop(0, '#5a3a20'); g.addColorStop(0.75, '#7a5230'); g.addColorStop(1, '#3a2414'); x.fillStyle = g; x.beginPath(); x.arc(C, C, R, 0, 7); x.fill(); // a gamela de madeira
    x.strokeStyle = 'rgba(30,18,8,.6)'; x.lineWidth = 2; for (let k = 1; k < 6; k++) { x.beginPath(); x.arc(C, C, R * k / 6, 0, 7); x.stroke(); } // (os anéis da madeira torneada)
    x.fillStyle = 'rgba(70,90,80,.35)'; x.beginPath(); x.arc(C, C, R * 0.96, 0, 7); x.fill(); // a água turva
    for (const q of this.p) { if (q.out) continue; const px = C + Math.cos(q.a) * q.r * R * 0.95, py = C + Math.sin(q.a) * q.r * R * 0.95;
      if (q.g) { x.fillStyle = '#ffd860'; x.beginPath(); x.arc(px, py, 3.2, 0, 7); x.fill(); x.fillStyle = 'rgba(255,240,170,.8)'; x.fillRect(px - 1, py - 1, 2, 2); }
      else { x.fillStyle = q.c; x.beginPath(); x.arc(px, py, 2.4 + q.s, 0, 7); x.fill(); } }
    x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.ellipse(C - 50, C - 70, 90, 40, -0.6, 0, 7); x.fill(); // (o reflexo na água)
  }
  close(keep) {
    if (!this.open) return; this.el.hidden = true;
    if (!keep) { this.toast('Você devolve o cascalho ao córrego.'); return; }
    const n = this.p.filter((q) => q.g && !q.out).length, lost = this.gold0 - n; this.total += n;
    if (n > 0) { this.quests.complete('bateia'); this.audio.coin?.(); }
    const oit = this.total / 72; // (a oitava, uns 3,6 gramas, tinha 72 grãos — o grão era também medida de peso)
    this.toast(n ? `No fundo da bateia brilham ${n} grão${n > 1 ? 's' : ''} de ouro${lost > 0 ? ` (${lost} foram embora com a água)` : ''}. Juntando tudo, você tem uns ${this.total} grãos — ${oit < 1 ? 'nem uma oitava ainda' : `umas ${oit.toFixed(1)} oitavas`}. É assim, de pitada em pitada, que um faiscador junta para a alforria.` : 'Nada no fundo: o ouro foi embora com a água. Gire mais devagar.', 'quest', 9000);
  }
}
