// A venatio — a caçada na arena: as feras sobem do hipogeu pelos elevadores e surgem dos alçapões no meio da areia,
// várias de uma vez (leões e a fera do dia: tigres, ursos, touros, javalis, crocodilos, um rinoceronte, um elefante).
// Os venatores, de lança, correm, cercam e estocam; as feras rondam, rugem, investem, dão o bote e derrubam quem não
// sai da frente a tempo. É uma confusão: cada fera escolhe o caçador mais perto, e o explorador (quando desce à
// arena) é só mais um deles no meio da poeira. Quando a leva acaba, sobe outra.
import * as THREE from 'three';
import { animateHumanoid, playOnce, hasClip } from '../comum/mixamo.js';
import { Fera, ESPECIES } from '../comum/feras.js';
import { COL } from './coliseu.js';
import { rr, rand, pick, lerp, clamp, angleLerp } from '../comum/util.js';

// o jeito de cada fera: vida, dano, alcance, velocidade da investida, raio em que ronda e o estilo de ataque
const BEH = {
  leao: { hp: 95, dmg: [13, 19], reach: 2.0, charge: 8, ring: 7, style: 'felino' },
  tigre: { hp: 110, dmg: [14, 21], reach: 2.1, charge: 8.5, ring: 7, style: 'felino' },
  urso: { hp: 140, dmg: [17, 25], reach: 2.0, charge: 5.5, ring: 5, style: 'urso' },
  touro: { hp: 120, dmg: [19, 27], reach: 2.4, charge: 9, ring: 11, style: 'chifre' },
  javali: { hp: 55, dmg: [9, 14], reach: 1.5, charge: 7, ring: 6, style: 'chifre' },
  elefante: { hp: 280, dmg: [25, 33], reach: 3.6, charge: 4.5, ring: 6, style: 'elefante' },
  rino: { hp: 220, dmg: [23, 31], reach: 2.8, charge: 9.5, ring: 12, style: 'chifre' },
  crocodilo: { hp: 110, dmg: [15, 21], reach: 2.5, charge: 3.5, ring: 4, style: 'croc' },
};
// as levas quando o explorador desce à arena (cresce a cada uma; a última é a mais perigosa)
const PLAYER_WAVES = [['leao', 'leao', 'javali', 'javali'], ['urso', 'tigre', 'touro', 'leao'], ['elefante', 'rino', 'tigre', 'leao']];
const WAVE_SAY = ['Os alçapões se abrem: dois leões e dois javalis sobem do hipogeu!', 'Agora um urso, um tigre da Hircânia, um touro bravo — e mais um leão!', 'Por último, o elefante e o rinoceronte, com um tigre e um leão. A plateia fica de pé!'];

// uma fera na arena (o que a lança, o gládio e as estocadas dos venatores enxergam)
class Beast {
  constructor(H, f) { this.H = H; this.f = f; this.kind = f.kind; this.K = { ...ESPECIES[f.kind], ...BEH[f.kind] }; this.pos = new THREE.Vector3(); this.h = 0; this.v = 0; this.rad = Math.max(0.6, f.size * 0.22); }
  reset(p, h) {
    const f = this.f; this.pos.copy(p); this.h = h; this.v = 0; this.hp = this.maxHp = this.K.hp; this.st = 'rise'; this.rise = 2.2; this.cool = rr(1.5, 3.5); this.roarT = rr(2, 8);
    this.target = null; this.retarget = 0; this.side = rand() < 0.5 ? 1 : -1; this.stagger = 0; this.flee = 0; this.knock = 0; this.deadT = 0; this.hitDone = false; this.byPlayer = false;
    f.dead = false; f.one = null; f.o.rotation.z = 0; f.tip = 0; for (const [k, a] of Object.entries(f.acts)) if (!f.loco.includes(k)) a.stop();
    f.holder.visible = true;
  }
  get alive() { return this.st !== 'dead' && this.st !== 'rise' && this.st !== 'off'; }
  get aimY() { return COL.y + this.f.height * 0.6; }
  // golpe recebido (do explorador ou de um venator)
  hit(dmg, dir, how = {}) {
    if (!this.alive) return 'none';
    const H = this.H; this.hp -= dmg; this.byPlayer = !how.npc;
    H.g.blood?.spray(this.pos.clone().setY(this.aimY), dir, how.npc ? 12 : 16); if (rand() < 0.5) H.g.blood?.stain(this.pos.x + rr(-0.4, 0.4), this.pos.z + rr(-0.4, 0.4), rr(0.12, 0.3));
    H.g.excite = Math.max(H.g.excite, 0.7);
    if (this.hp <= 0) { this.st = 'dead'; this.f.die(); this.v = 0; H.voz(this, { rate: 0.9, vol: 1 }); H.g.excite = 1; for (let i = 0; i < 4; i++) H.g.blood?.stain(this.pos.x + rr(-1, 1), this.pos.z + rr(-1, 1), rr(0.3, 0.7)); H.onBeastDown?.(this); return 'hit'; }
    H.voz(this, { vol: 0.8, rate: 1.08, gap: 1.2 });
    this.knock = 0.16; this.kdir = dir.clone(); this.stagger = how.heavy ? 0.55 : 0.3;
    if (this.f.has('golpe') && !this.f.busy && (how.heavy || !how.npc) && (this.K.hp < 150 || how.heavy)) this.f.play('golpe', { rate: 1.2 }); // (a estocada leve de um venator não faz o elefante parar)
    if (this.st === 'charge' && how.heavy) { this.st = 'prowl'; this.cool = rr(1, 2); }
    if (rand() < (how.npc ? 0.25 : 0.35) && this.K.style !== 'elefante') { this.flee = rr(0.8, 1.5); }
    return 'hit';
  }
}

export class Hunt {
  constructor(games, venatores, scene, sons) {
    this.g = games; this.v = venatores; this.scene = scene; this.sons = sons;
    this.pool = {}; this.active = []; this.wave = 0; this.endT = 0; this.player = null; this.loading = false; this.shown = false;
  }
  voz(b, o = {}) { this.sons?.voz(b.kind, b.pos, { quem: b, ...o }); }
  // feras prontas para a leva (reaproveita as que já existem; carrega as que faltam)
  async get(kinds) {
    const used = new Set(), out = [];
    for (const k of kinds) {
      const L = (this.pool[k] ||= []); let b = L.find((x) => !used.has(x));
      if (!b) { const f = await Fera.criar(k, this.scene); if (!f) continue; f.holder.visible = false; b = new Beast(this, f); L.push(b); }
      used.add(b); out.push(b);
    }
    return out;
  }
  hideAll() { for (const L of Object.values(this.pool)) for (const b of L) { b.f.holder.visible = false; b.st = 'off'; } this.active = []; }
  // o explorador desce à arena (ctx: { player, melee, onWave(i, n), onBeastDown(b), onDone() }) / sai dela
  begin(ctx) { this.player = ctx; this.wave = 0; this.endT = 0; this.hideAll(); this.start(); }
  end() { this.player = null; this.wave = 0; this.hideAll(); }
  targets() { return this.active.filter((b) => b.alive); }
  get done() { return !!this.player && this.wave >= PLAYER_WAVES.length && !this.loading && this.active.every((b) => b.st === 'dead'); }

  // nova leva: os venatores voltam para perto dos portões, as feras sobem pelos elevadores
  async start() {
    if (this.loading) return; this.loading = true;
    const G = this.g, Y = COL.y, lifts = (G.city.lifts || []).slice(), P = this.player;
    let kinds;
    if (P) kinds = PLAYER_WAVES[this.wave] || [];
    else { const q = G.quality === 'alto' ? 2 : G.quality === 'leve' ? 1 : 0; const day = G.beastKind || 'leao'; kinds = [['leao', day], ['leao', day, day], ['leao', 'leao', day, day]][q]; if (rand() < 0.5 && q) kinds.push(pick(['javali', 'tigre', 'urso'])); }
    const list = await this.get(kinds);
    if (P !== this.player) { this.loading = false; return; } // (o explorador saiu enquanto carregava)
    for (const b of this.active) if (!list.includes(b)) { b.f.holder.visible = false; b.st = 'off'; }
    this.wave++; this.endT = 0; this.finished = false;
    this.v.forEach((v, i) => { const a = (i / this.v.length) * Math.PI * 2 + 0.4; v.pos.set(Math.cos(a) * (COL.a0 - 6), Y, Math.sin(a) * (COL.b0 - 5)); v.hp = 3; v.down = false; v.r.once = null; v.cool = rr(0, 1); v.dodge = 0; v.stagger = 0; v.h = Math.atan2(-v.pos.x, -v.pos.z); });
    list.forEach((b, i) => {
      const L = lifts.length ? lifts[i % lifts.length] : new THREE.Vector3(rr(-10, 10), Y - 6, rr(-6, 6));
      b.reset(new THREE.Vector3(L.x + rr(-0.5, 0.5), Y, L.z + rr(-0.5, 0.5)), rand() * 6); b.rise = 2.2 + i * 0.8;
    });
    this.active = list; this.loading = false;
    if (P) P.onWave?.(this.wave - 1, PLAYER_WAVES.length, WAVE_SAY[this.wave - 1]);
    else if (this.wave > 1) G.toast?.('Os alçapões se abrem: sobe outra leva de feras do hipogeu!', 'quest', 4000);
  }

  setVisible(on) {
    if (on === this.shown) return; this.shown = on;
    for (const b of this.active) b.f.holder.visible = on && b.st !== 'off';
  }

  // quem está de pé na areia para ser caçado: os venatores e, se desceu, o explorador
  humans() {
    const out = this.v.filter((v) => !v.down);
    const P = this.player; if (P && !P.player.dead && !P.health?.dead) out.push({ pos: P.player.pos, isPlayer: true, h: P.player.facing });
    return out;
  }

  update(dt, t) {
    const G = this.g, Y = COL.y, C = COL;
    if (!this.active.length && !this.loading) { if (!this.player || this.wave < PLAYER_WAVES.length) this.start(); return; }
    const humans = this.humans(), beasts = this.active.filter((b) => b.alive);
    if (!this.loading && this.active.every((b) => b.st === 'dead' || b.st === 'off')) {
      if ((this.endT += dt) > (this.player ? 4.5 : 8)) { if (this.player && this.wave >= PLAYER_WAVES.length) { if (!this.finished) { this.finished = true; this.player.onDone?.(); } } else this.start(); }
    } else if (!this.player && !humans.length && (this.endT += dt) > 8) this.start();
    // ---- os venatores
    for (const v of this.v) this.updateVenator(v, dt, t, beasts);
    // ---- as feras
    for (const b of this.active) this.updateBeast(b, dt, t, humans);
  }

  updateVenator(v, dt, t, beasts) {
    const Y = COL.y, C = COL;
    if (v.down) { // ferido no chão; depois de um tempo levanta, cambaleando, e volta para a luta (a confusão não acaba)
      animateHumanoid(v.r, dt, 0, 'idle', t); v.r.root.position.copy(v.pos);
      if ((v.downT = (v.downT || 0) + dt) > 14 && beasts.length) { v.down = false; v.downT = 0; v.hp = 2; v.r.once = null; v.stagger = 0.6; v.cool = 1.5; }
      return;
    }
    const prey = beasts.reduce((m, b) => (!m || b.pos.distanceTo(v.pos) < m.pos.distanceTo(v.pos) ? b : m), null);
    let sp = 0, dir = v.h;
    v.cool -= dt; v.dodge -= dt; v.stagger -= dt;
    if (prey) {
      const d = prey.pos.distanceTo(v.pos) - prey.rad, to = Math.atan2(prey.pos.x - v.pos.x, prey.pos.z - v.pos.z);
      const charging = prey.st === 'charge' && prey.target === v;
      if (v.dodge > 0) { sp = 5.2; dir = v.dodgeDir; } // salto para o lado, fugindo do bote
      else if (charging && d < 4.5 && rand() < dt * 4) { v.dodge = 0.5; v.dodgeDir = to + (rand() < 0.5 ? 1 : -1) * Math.PI / 2; }
      else if (d > 2.4) { sp = d > 8 ? 4.6 : 2.4; dir = to + Math.sin(t * 0.7 + v.pos.x) * 0.5; } // corre para cima da fera, em ziguezague
      else if (d < 1.2) { sp = 2.2; dir = to + Math.PI; } // recua para não ficar colado
      else { sp = 1.0; dir = to + Math.PI / 2 * (v.pos.x > 0 ? 1 : -1); } // rodeia
      v.h = angleLerp(v.h, sp > 3 || v.dodge > 0 ? dir : to, Math.min(1, dt * 8));
      if (d < 2.5 && v.cool <= 0 && v.dodge <= 0) { // estocada com a lança
        v.cool = rr(1.0, 1.9); const clip = hasClip('lanca') ? 'lanca' : 'espada'; playOnce(v.r, clip, 0.75); { const a = v.r.act?.(clip); if (a) a.timeScale = 1.6; }
        if (rand() < 0.55) prey.hit(rr(4, 7), new THREE.Vector3(prey.pos.x - v.pos.x, 0, prey.pos.z - v.pos.z).normalize(), { npc: true, heavy: rand() < 0.2 });
      }
    } else { // sem fera de pé: volta devagar para a borda e espera
      const k = Math.hypot(v.pos.x / (C.a0 - 6), v.pos.z / (C.b0 - 5)); if (k < 0.9) { sp = 1.2; dir = Math.atan2(v.pos.x, v.pos.z); v.h = angleLerp(v.h, dir, Math.min(1, dt * 4)); }
    }
    if (v.stagger > 0) { sp = 2.5; dir = v.h + Math.PI; }
    v.pos.x += Math.sin(dir) * sp * dt; v.pos.z += Math.cos(dir) * sp * dt;
    const k = Math.hypot(v.pos.x / (C.a0 - 2), v.pos.z / (C.b0 - 2)); if (k > 1) v.pos.multiplyScalar(1 / k);
    v.pos.y = Y; v.r.root.position.copy(v.pos); v.r.root.rotation.y = v.h;
    v.r.root.rotation.x = v.stagger > 0 ? -0.2 : 0;
    animateHumanoid(v.r, dt, sp, sp > 0.3 ? 'walk' : 'idle', t);
  }

  updateBeast(b, dt, t, humans) {
    const G = this.g, Y = COL.y, C = COL, f = b.f, K = b.K, N = f.nat;
    if (b.st === 'off') return;
    if (b.st === 'rise') { // subindo no elevador: aparece pelo alçapão
      b.rise -= dt; const k = clamp(1 - b.rise / 2.2, 0, 1); f.holder.position.set(b.pos.x, lerp(Y - 6, Y, k * k), b.pos.z); f.holder.rotation.set(0, b.h, 0); f.update(dt, 0);
      if (b.rise <= 0) { b.st = 'prowl'; G.excite = Math.max(G.excite, 0.6); if (f.has('rugir') && rand() < 0.7) { f.play('rugir'); this.voz(b, { vol: 1 }); } }
      return;
    }
    if (b.st === 'dead') { b.deadT += dt; f.update(dt, 0); f.holder.position.set(b.pos.x, Y, b.pos.z); return; }
    // alvo: o caçador mais perto (o explorador conta um pouco mais perto: ele é o que mais chama atenção)
    b.retarget -= dt;
    if (!b.target || b.retarget <= 0 || !humans.includes(b.target) && !(b.target.isPlayer && humans.some((h) => h.isPlayer))) {
      b.retarget = rr(1.5, 3.5); let best = null, bd = 1e9;
      for (const hm of humans) { const d = hm.pos.distanceTo(b.pos) * (hm.isPlayer ? 0.75 : 1) * rr(0.85, 1.15); if (d < bd) { bd = d; best = hm; } }
      b.target = best;
    }
    if (b.target?.isPlayer) b.target = humans.find((h) => h.isPlayer) || null;
    const T = b.target;
    let want = 0, head = b.h;
    b.cool -= dt; b.flee -= dt; b.stagger -= dt; b.roarT -= dt;
    if (b.knock > 0) { const k = Math.min(dt, b.knock); b.knock -= dt; b.pos.x += b.kdir.x * 3.5 * k; b.pos.z += b.kdir.z * 3.5 * k; }
    if (!T) { head = b.h + Math.sin(t * 0.5) * 0.4; want = N.walk * 0.8; b.st = 'prowl'; }
    else {
      const dx = T.pos.x - b.pos.x, dz = T.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1, to = Math.atan2(dx, dz);
      const reach = K.reach + (T.isPlayer ? 0.35 : 0.2);
      if (b.flee > 0 && b.st !== 'maul') { head = to + Math.PI + Math.sin(t * 2 + b.pos.x) * 0.6; want = Math.min(K.charge, N.run) * 0.75; b.st = 'prowl'; }
      else if (b.st === 'roar') { want = 0; head = to; if (!f.busy) { b.st = 'prowl'; } }
      else if (b.st === 'charge') { // a investida: o felino corrige a mira; quem tem chifre vai reto
        head = K.style === 'chifre' || K.style === 'elefante' ? Math.atan2(b.cdir.x, b.cdir.z) : to; want = K.charge; b.chargeT -= dt;
        if (K.style === 'felino' && f.has('salto') && !b.leapt && d < 4.8 && d > 2.2) { b.leapt = true; f.play('salto', { rate: 1.1 }); this.voz(b, { vol: 0.9 }); }
        if (!b.hitDone && d < reach + b.rad * 0.5) { b.hitDone = true; this.strike(b, T, rr(K.dmg[0], K.dmg[1]), { heavy: true, knock: K.style === 'chifre' ? 2.4 : 1.4 }); if (K.style === 'felino' || K.style === 'urso') { b.st = 'maul'; b.atkT = 0; b.cool = 0; } }
        if (b.chargeT <= 0 || (b.hitDone && d > 4)) { b.st = 'prowl'; b.cool = rr(2, 4); }
      } else if (b.st === 'maul') { // o bote de perto: patada, mordida, presa, tromba
        head = to; want = d > reach ? N.walk : 0;
        if (b.atkT === 0 && (!f.busy || f.one?.k === 'golpe')) { const k = f.has('atk2') && rand() < 0.45 ? 'atk2' : f.has('atk') ? 'atk' : null; b.atkD = k ? f.play(k, { rate: K.style === 'elefante' ? 1 : 1.25 }) : 0.9; b.hitDone = false; this.voz(b, { vol: 0.85 }); if (!k) b.lunge = 0.25; }
        b.atkT += dt; if (b.lunge > 0) { b.lunge -= dt; want = 4; }
        if (!b.hitDone && b.atkT > b.atkD * 0.42) { b.hitDone = true; if (d < reach + 0.5) this.strike(b, T, rr(K.dmg[0], K.dmg[1]) * 0.85, { heavy: rand() < 0.4 }); }
        if (b.atkT > b.atkD) { b.atkT = 0; if (rand() < 0.45 || d > reach + 1.5) { b.st = 'prowl'; b.cool = rr(1.2, 2.8); } }
      } else { // ronda: anda em volta, medindo, e de tempos em tempos investe ou dá o bote
        const ring = K.ring; head = to + (d > ring ? 0.3 : 1.25) * b.side;
        want = d > ring + 3 ? (N.trote || N.walk * 2) : N.walk * 1.05;
        if (rand() < dt * 0.15) b.side = -b.side;
        b.st = 'prowl';
        if (b.roarT <= 0 && f.has('rugir') && d > 4) { b.roarT = rr(7, 15); b.st = 'roar'; f.play('rugir', { rate: b.kind === 'urso' ? 1.6 : 1 }); this.voz(b, { vol: 1 }); }
        else if (b.cool <= 0 && b.stagger <= 0) {
          if (d < reach + 0.4 && K.style !== 'chifre') { b.st = 'maul'; b.atkT = 0; }
          else if (d < ring + 4) { b.st = 'charge'; b.cdir = new THREE.Vector3(dx / d, 0, dz / d); b.chargeT = K.style === 'chifre' ? 2.6 : 1.8; b.hitDone = false; b.leapt = false; this.voz(b, { vol: 0.9 }); G.excite = Math.max(G.excite, 0.5);
            if (T.isPlayer && !this.warned) { this.warned = true; this.player?.warn?.(`${K.name[0].toUpperCase() + K.name.slice(1)} baixa a cabeça e avança! Saia de lado (Espaço).`); } }
        } else if (d < reach * 0.8) { want = 0; head = to; } // (encostado: não empurra, encara)
      }
    }
    if (b.stagger > 0) want *= 0.2;
    if (f.busy && f.one?.k !== 'salto' && b.st !== 'charge') want = Math.min(want, 0.6);
    b.h = angleLerp(b.h, head, Math.min(1, dt * (b.st === 'charge' ? (K.style === 'felino' ? 3 : 1.2) : 3)));
    b.v = lerp(b.v, want, Math.min(1, dt * (want > b.v ? 2.2 : 4)));
    b.pos.x += Math.sin(b.h) * b.v * dt; b.pos.z += Math.cos(b.h) * b.v * dt;
    // não atravessa ninguém: nem as outras feras, nem os caçadores
    for (const o of this.active) { if (o === b || o.st === 'off' || o.st === 'rise') continue; const ox = b.pos.x - o.pos.x, oz = b.pos.z - o.pos.z, od = Math.hypot(ox, oz), m = (b.rad + o.rad) * 1.35 + (b.f.size + o.f.size) * 0.12; if (od < m && od > 1e-3) { b.pos.x += (ox / od) * (m - od) * 0.5; b.pos.z += (oz / od) * (m - od) * 0.5; } }
    // (o corpo é comprido: o elefante tem 5 m do rabo à tromba — conta o corpo inteiro, não só o meio)
    { const fx = Math.sin(b.h), fz = Math.cos(b.h), hl = b.f.size * 0.3;
      for (const hm of humans) { const rx = hm.pos.x - b.pos.x, rz = hm.pos.z - b.pos.z, u = clamp(rx * fx + rz * fz, -hl, hl), qx = b.pos.x + fx * u, qz = b.pos.z + fz * u, ox = qx - hm.pos.x, oz = qz - hm.pos.z, od = Math.hypot(ox, oz), m = b.rad + 0.45; if (od < m && od > 1e-3) { b.pos.x += (ox / od) * (m - od); b.pos.z += (oz / od) * (m - od); } } }
    const k = Math.hypot(b.pos.x / (C.a0 - 1.8 - b.rad), b.pos.z / (C.b0 - 1.8 - b.rad)); if (k > 1) { b.pos.x /= k; b.pos.z /= k; b.h += dt * 2 * b.side; }
    if (b.pos.x > 18.2 - b.rad && b.pos.x < 25.8 + b.rad && Math.abs(b.pos.z) < 2.2 + b.rad) b.pos.z = Math.sign(b.pos.z || 1) * (2.4 + b.rad); // (o alçapão do hipogeu)
    f.holder.position.set(b.pos.x, Y, b.pos.z); f.holder.rotation.set(0, b.h, 0);
    f.update(dt, b.v);
  }

  // a fera acerta alguém
  strike(b, T, dmg, how) {
    const G = this.g, Y = COL.y;
    if (T.isPlayer) { const r = this.player.melee.receive(dmg, b.pos, how); if (r !== 'dodged') G.excite = 1; return; }
    const v = T;
    if (rand() < 0.35) { v.dodge = 0.45; v.dodgeDir = v.h + (rand() < 0.5 ? 1 : -1) * Math.PI / 2; return; } // escapou por pouco
    const dir = new THREE.Vector3(v.pos.x - b.pos.x, 0, v.pos.z - b.pos.z).normalize();
    v.hp--; v.stagger = 0.5; G.blood?.spray(v.pos.clone().setY(Y + 1.1), dir, 22); G.blood?.stain(v.pos.x, v.pos.z, rr(0.15, 0.3)); G.excite = Math.max(G.excite, 0.8);
    if (v.hp <= 0) { v.down = true; v.downT = 0; playOnce(v.r, 'desmaiar', 30); G.excite = 1; for (let i = 0; i < 4; i++) G.blood?.stain(v.pos.x + rr(-0.7, 0.7), v.pos.z + rr(-0.7, 0.7), rr(0.3, 0.6)); }
  }
}
