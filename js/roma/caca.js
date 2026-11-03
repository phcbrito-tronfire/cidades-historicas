// A venatio — a caçada na arena, sem enfeite: as feras sobem do hipogeu pelos elevadores e surgem dos alçapões no
// meio da areia (sempre leões, e a fera do dia: ursos, touros ou crocodilos). Os venatores, de lança, correm, cercam
// e estocam; as feras rondam, disparam num bote e derrubam quem não esquiva a tempo. Quem é ferido sangra; a fera
// ferida foge, volta, e por fim tomba de lado. Quando a leva acaba, sobe outra.
import * as THREE from 'three';
import { animateHumanoid, playOnce } from '../comum/mixamo.js';
import { COL } from './coliseu.js';
import { rr, rand, lerp, angleLerp } from '../comum/util.js';

const SPEED = { leao: [1.6, 8.0], urso: [1.3, 5.0], touro: [1.5, 7.0], jacare: [0.9, 3.4] }; // ronda, bote (m/s)
const HP = { leao: 4, urso: 6, touro: 5, jacare: 4 };

export class Hunt {
  constructor(games, venatores) { this.g = games; this.v = venatores; this.waveT = 0; this.active = []; this.wave = 0; }

  // nova leva: os venatores voltam para perto dos portões, as feras sobem pelos elevadores
  start() {
    const G = this.g, Y = COL.y, lifts = (G.city.lifts || []).slice();
    this.wave++; this.waveT = 0; this.endT = 0;
    this.v.forEach((v, i) => { const a = (i / this.v.length) * Math.PI * 2; v.pos.set(Math.cos(a) * (COL.a0 - 5), Y, Math.sin(a) * (COL.b0 - 4)); v.hp = 3; v.down = false; v.r.once = null; v.cool = rr(0, 1); v.dodge = 0; v.stagger = 0; });
    const kind = G.beastKind === 'leao' ? 'urso' : G.beastKind;
    this.active = G.beasts.filter((b) => b.kind === 'leao' || b.kind === kind);
    this.active.forEach((b, i) => {
      const L = lifts.length ? lifts[i % lifts.length] : new THREE.Vector3(rr(-10, 10), Y - 6, rr(-6, 6));
      b.pos.set(L.x + rr(-0.5, 0.5), Y, L.z + rr(-0.5, 0.5)); b.rise = 2.2 + i * 0.7; b.y = Y - 6; b.hp = HP[b.kind] || 4; b.dead = false; b.dieT = 0;
      b.state = 'prowl'; b.v = 0; b.cool = rr(1, 3); b.flee = 0; b.h = rand() * 6; b.holder.rotation.set(0, b.h, 0);
    });
    if (this.wave > 1) G.toast?.('Os alçapões se abrem: sobe outra leva de feras do hipogeu!', 'quest', 4000);
  }

  update(dt, t) {
    const G = this.g, Y = COL.y, C = COL;
    if (!this.active.length || this.wave === 0) this.start();
    this.waveT += dt;
    const alive = this.v.filter((v) => !v.down), beasts = this.active.filter((b) => !b.dead);
    if ((!beasts.length || !alive.length) && (this.endT += dt) > 8) this.start();
    // ---- os venatores
    for (const v of this.v) {
      if (v.down) { animateHumanoid(v.r, dt, 0, 'idle', t); v.r.root.position.copy(v.pos); continue; }
      const prey = beasts.filter((b) => b.rise <= 0).reduce((m, b) => (!m || b.pos.distanceTo(v.pos) < m.pos.distanceTo(v.pos) ? b : m), null);
      let sp = 0, dir = v.h;
      v.cool -= dt; v.dodge -= dt; v.stagger -= dt;
      if (prey) {
        const d = prey.pos.distanceTo(v.pos), to = Math.atan2(prey.pos.x - v.pos.x, prey.pos.z - v.pos.z);
        const charging = prey.state === 'charge' && prey.target === v;
        if (v.dodge > 0) { sp = 5.2; dir = v.dodgeDir; } // salto para o lado, fugindo do bote
        else if (charging && d < 4.5 && rand() < dt * 4) { v.dodge = 0.5; v.dodgeDir = to + (rand() < 0.5 ? 1 : -1) * Math.PI / 2; }
        else if (d > 3.2) { sp = d > 9 ? 4.6 : 2.4; dir = to + Math.sin(t * 0.7 + v.pos.x) * 0.5; } // corre para cima da fera, em ziguezague
        else if (d < 2.0) { sp = 2.2; dir = to + Math.PI; } // recua para não ficar colado
        else { sp = 1.0; dir = to + Math.PI / 2; } // rodeia
        v.h = angleLerp(v.h, sp > 3 || v.dodge > 0 ? dir : to, Math.min(1, dt * 8));
        if (d < 3.3 && v.cool <= 0 && v.dodge <= 0) { // estocada com a lança
          v.cool = rr(1.1, 2.0); playOnce(v.r, 'espada', 0.85);
          if (rand() < 0.55) this.hurtBeast(prey, v);
        }
      }
      if (v.stagger > 0) { sp = 2.5; dir = v.h + Math.PI; }
      v.pos.x += Math.sin(dir) * sp * dt; v.pos.z += Math.cos(dir) * sp * dt;
      const k = Math.hypot(v.pos.x / (C.a0 - 2), v.pos.z / (C.b0 - 2)); if (k > 1) v.pos.multiplyScalar(1 / k);
      v.pos.y = Y; v.r.root.position.copy(v.pos); v.r.root.rotation.y = v.h;
      v.r.root.rotation.x = v.stagger > 0 ? -0.2 : 0;
      animateHumanoid(v.r, dt, sp, sp > 0.3 ? 'walk' : 'idle', t);
    }
    // ---- as feras
    for (const b of this.active) {
      if (b.rise > 0) { // subindo no elevador: aparece pelo alçapão
        b.rise -= dt; const k = Math.max(0, Math.min(1, 1 - (b.rise - 0) / 2.2)); b.y = lerp(Y - 6, Y, k * k);
        b.holder.position.set(b.pos.x, b.y, b.pos.z); b.holder.visible = true; b.mixer?.update(dt); if (b.rise <= 0) { b.y = Y; G.excite = Math.max(G.excite, 0.6); } continue;
      }
      if (b.dead) { b.dieT += dt; b.holder.rotation.z = lerp(b.holder.rotation.z, Math.PI / 2 * 0.9, Math.min(1, dt * 3)); b.holder.position.y = lerp(b.holder.position.y, Y + 0.25 * b.size, Math.min(1, dt * 3)); continue; }
      const [slow, fast] = SPEED[b.kind] || [1.4, 5];
      const tgt = alive.reduce((m, v) => (!m || v.pos.distanceTo(b.pos) < m.pos.distanceTo(b.pos) ? v : m), null);
      b.cool -= dt; b.flee -= dt;
      let want = 0, head = b.h;
      if (tgt) {
        const d = tgt.pos.distanceTo(b.pos), to = Math.atan2(tgt.pos.x - b.pos.x, tgt.pos.z - b.pos.z);
        if (b.flee > 0) { head = to + Math.PI + Math.sin(t * 2 + b.pos.x) * 0.6; want = fast * 0.7; b.state = 'flee'; }
        else if (b.state === 'charge') { head = to; want = fast; b.target = tgt; if (d < 1.7) { b.state = 'maul'; b.cool = 0.4; } if (b.cool < -3) b.state = 'prowl'; }
        else if (b.state === 'maul') { head = to; want = d > 1.6 ? 2 : 0; if (b.cool <= 0) { b.cool = 1.1; this.hurtMan(tgt, b); if (rand() < 0.4) { b.flee = 1.2; b.state = 'prowl'; } } if (d > 3.5) b.state = 'prowl'; }
        else { head = to + Math.sin(t * 0.8 + b.pos.z) * 0.7; want = d > 6 ? slow : slow * 0.5; b.state = 'prowl'; if (d < 14 && b.cool <= 0) { b.state = 'charge'; b.cool = 0; G.excite = Math.max(G.excite, 0.5); } }
      }
      b.h = angleLerp(b.h, head, Math.min(1, dt * (b.state === 'charge' ? 5 : 2.4)));
      b.v = lerp(b.v, want, Math.min(1, dt * (want > b.v ? 2.5 : 4)));
      b.pos.x += Math.sin(b.h) * b.v * dt; b.pos.z += Math.cos(b.h) * b.v * dt;
      const k = Math.hypot(b.pos.x / (C.a0 - 2.5), b.pos.z / (C.b0 - 2.5)); if (k > 1) { b.pos.multiplyScalar(1 / k); b.h += dt * 2; }
      b.holder.position.set(b.pos.x, Y, b.pos.z); b.holder.rotation.set(0, b.h, 0);
      if (b.mixer) {
        const atk = b.state === 'maul';
        const w = { idle: b.v < 0.15 && !atk ? 1 : 0, walk: b.v >= 0.15 && b.v < 2.6 && !atk ? 1 : 0, run: b.v >= 2.6 ? 1 : 0, atk: atk ? 1 : 0 };
        if (!b.aIdle) w.walk += w.idle; if (!b.aAtk) w.run += w.atk;
        b.wt = b.wt || { idle: 0, walk: 0, run: 0, atk: 0 };
        for (const [kk, ac] of [['idle', b.aIdle], ['walk', b.aWalk], ['run', b.aRun], ['atk', b.aAtk]]) { if (!ac) continue; b.wt[kk] = lerp(b.wt[kk], w[kk], Math.min(1, dt * 6)); ac.setEffectiveWeight(b.wt[kk]); }
        if (b.aWalk && b.aWalk === b.aRun) b.aWalk.timeScale = Math.max(0.3, b.v * 0.45);
        else if (b.aRun) b.aRun.timeScale = Math.max(0.8, b.v / fast * 1.3);
        b.mixer.update(dt);
      }
    }
  }

  hurtBeast(b, v) {
    const G = this.g, Y = COL.y, dir = new THREE.Vector3(b.pos.x - v.pos.x, 0, b.pos.z - v.pos.z).normalize();
    b.hp--; b.flee = 1.4; G.blood.spray(b.pos.clone().setY(Y + 0.6 * (b.size || 1)), dir, 20); G.blood.stain(b.pos.x, b.pos.z, rr(0.15, 0.35)); G.excite = Math.max(G.excite, 0.7);
    if (b.hp <= 0) { b.dead = true; b.v = 0; G.excite = 1; for (let i = 0; i < 5; i++) G.blood.stain(b.pos.x + rr(-1, 1), b.pos.z + rr(-1, 1), rr(0.3, 0.7)); G.blood.spray(b.pos.clone().setY(Y + 0.5), new THREE.Vector3(), 30); }
  }
  hurtMan(v, b) {
    const G = this.g, Y = COL.y;
    if (rand() < 0.35) { v.dodge = 0.45; v.dodgeDir = v.h + (rand() < 0.5 ? 1 : -1) * Math.PI / 2; return; } // escapou por pouco
    const dir = new THREE.Vector3(v.pos.x - b.pos.x, 0, v.pos.z - b.pos.z).normalize();
    v.hp--; v.stagger = 0.5; G.blood.spray(v.pos.clone().setY(Y + 1.1), dir, 22); G.blood.stain(v.pos.x, v.pos.z, rr(0.15, 0.3)); G.excite = Math.max(G.excite, 0.8);
    if (v.hp <= 0) { v.down = true; playOnce(v.r, 'desmaiar', 30); G.excite = 1; for (let i = 0; i < 4; i++) G.blood.stain(v.pos.x + rr(-0.7, 0.7), v.pos.z + rr(-0.7, 0.7), rr(0.3, 0.6)); }
  }
}
