// Vida do explorador: barrinha no canto, dano (mordida de crocodilo, queimadura de água-viva, afogamento, queda)
// com a tela piscando em vermelho, cura comendo e bebendo, e um "desmaio" que leva de volta ao ponto de partida.
const FOOD_HEAL = { pao: 30, cerveja: 35, peixe: 25, queijo: 20, figos: 15, figo: 15, azeitonas: 12, vinho: 20, agua: 18, roma: 15, tamaras: 18, cebola: 10 };

export class Health {
  constructor({ onDeath } = {}) {
    this.max = 100; this.hp = 100; this.onDeath = onDeath; this.hurtT = 0; this.regenWait = 0; this.dead = false;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:82px;left:22px;z-index:11;pointer-events:none;display:flex;align-items:center;gap:8px;font:600 13px Cinzel,serif;color:#f3e2b0;text-shadow:0 1px 3px #000';
    el.innerHTML = '<span style="font-size:17px;color:#e8584a">❤</span><div style="width:190px;height:11px;border-radius:6px;background:rgba(20,10,6,.6);border:1px solid rgba(243,226,176,.55);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5)"><div style="height:100%;width:100%;background:linear-gradient(180deg,#f07a5a,#b8302a);transition:width .25s"></div></div>';
    document.body.appendChild(el);
    this.el = el; this.bar = el.lastChild.firstChild;
    const fl = document.createElement('div');
    fl.style.cssText = 'position:fixed;inset:0;z-index:9;pointer-events:none;opacity:0;transition:opacity .5s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(170,10,0,.6) 100%)';
    document.body.appendChild(fl); this.flashEl = fl;
    this.show(false);
  }
  show(on) { this.el.style.display = on ? 'flex' : 'none'; }
  render() {
    const f = this.hp / this.max;
    this.bar.style.width = (f * 100).toFixed(1) + '%';
    this.bar.style.background = f < 0.3 ? 'linear-gradient(180deg,#ff5a3a,#8a1a10)' : f > 0.99 ? 'linear-gradient(180deg,#f8b06a,#c0582a)' : 'linear-gradient(180deg,#f07a5a,#b8302a)';
  }
  flash(color, k = 1) {
    this.flashEl.style.background = `radial-gradient(ellipse at center,rgba(0,0,0,0) 40%,${color} 100%)`;
    this.flashEl.style.transition = 'none'; this.flashEl.style.opacity = String(k);
    requestAnimationFrame(() => { this.flashEl.style.transition = 'opacity .9s'; this.flashEl.style.opacity = '0'; });
  }
  damage(n) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - n); this.regenWait = 8; this.hurtT = 0.4;
    this.flash('rgba(190,10,0,.65)', Math.min(1, 0.35 + n / 40));
    this.render();
    if (this.hp <= 0) { this.dead = true; this.onDeath?.(); }
  }
  // comer/beber: devolve quanto curou (0 se não for comida)
  eat(type) {
    const h = FOOD_HEAL[type] ?? 12;
    const before = this.hp; this.hp = Math.min(this.max, this.hp + h); this.render();
    if (this.hp > before) this.flash('rgba(120,220,90,.45)', 0.6);
    return Math.round(this.hp - before);
  }
  revive(hp = 70) { this.dead = false; this.hp = hp; this.render(); }
  // regeneração lenta, só até 40% (o resto vem da comida); afogamento sem fôlego e quedas altas
  update(dt, player) {
    if (this.dead) return;
    this.regenWait -= dt;
    if (this.regenWait <= 0 && this.hp < 40) { this.hp = Math.min(40, this.hp + dt * 1.2); this.render(); }
    if (player.diving && player.breath <= 0) { this.drownT = (this.drownT || 0) - dt; if (this.drownT <= 0) { this.drownT = 1; this.damage(9); } }
    if (player.fallHit) { const v = player.fallHit; player.fallHit = 0; if (v > 13) this.damage(Math.round((v - 13) * 6)); }
  }
}

// tela escura do desmaio e volta ao ponto de partida
export function faint(msg, respawn) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:40;background:#000;opacity:0;transition:opacity 1s;display:flex;align-items:center;justify-content:center;color:#f3e2b0;font:600 22px Cinzel,serif;text-align:center;padding:20px';
  d.textContent = msg; document.body.appendChild(d);
  requestAnimationFrame(() => (d.style.opacity = '1'));
  setTimeout(() => { respawn(); d.style.opacity = '0'; setTimeout(() => d.remove(), 1100); }, 2600);
}
