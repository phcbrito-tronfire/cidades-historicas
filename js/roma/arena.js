// O explorador na arena do Coliseu. Depois de conhecer Roma inteira (todos os objetivos e todos os artefatos) e
// vestido de gladiador, um guarda na entrada oeste pergunta se ele quer descer à arena:
//   munus (dia dos gladiadores, ou do desfile) — três combates seguidos: o trácio, o reciário e, por fim, o secutor e
//     o hoplômaco juntos. Cada um luta do seu jeito (o trácio é rápido e baixo, o reciário mantém distância com o
//     tridente, o secutor avança atrás do escudo). Quem não aguenta mais cai de joelhos e pede clemência: a plateia
//     grita, e o explorador poupa (E) ou dá o golpe final (F). Se o explorador cai, a plateia decide por ele.
//   venatio (dia da caçada) — de lança na mão, contra as feras: o leão, o urso e, por fim, o touro.
// Na areia ficam armas largadas (gládios, lanças, escudos): perdeu a sua, pega outra (P) ou arremessa (G).
// O vencedor recebe o que os gladiadores de fato recebiam: a folha de palmeira, o dinheiro e, depois de várias
// vitórias, a rudis — a espada de madeira que dava a liberdade.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce, hasClip } from '../comum/mixamo.js';
import { creature } from '../comum/fauna.js';
import { groundAt } from '../comum/collision.js';
import { COL } from './coliseu.js';
import { HIT_AT, makeWeapon } from './luta.js';
import { rr, rand, pick, lerp, clamp, angleLerp } from '../comum/util.js';

const Y = COL.y;
const GUARD = { x: -(COL.A + 2.2), z: -3.4 }; // do lado de fora da entrada oeste (a Porta Libitinense), do lado oposto ao de Caio Domício
const IN_WEST = { x: -COL.a0 + 4, z: 0 }, IN_EAST = { x: COL.a0 - 3, z: 0 };
const insideArena = (x, z, m = 1.2) => (x / (COL.a0 - m)) ** 2 + (z / (COL.b0 - m)) ** 2 < 1;
const clampArena = (p, m = 1.2) => { const k = Math.hypot(p.x / (COL.a0 - m), p.z / (COL.b0 - m)); if (k > 1) { p.x /= k; p.z /= k; } };
const inHole = (x, z) => x > 18.2 && x < 25.8 && Math.abs(z) < 2.2; // (o alçapão do hipogeu)

// ---- os prêmios (guardados no navegador; cada um aparece num cartão, como os artefatos)
const PRIZE_KEY = 'cidades-historicas:roma-premios';
export const PRIZES = {
  palma: { name: 'Folha de palmeira da vitória', era: 'Coliseu · o prêmio de cada vitória', story: 'O vencedor de um combate recebia do organizador dos jogos uma folha de palmeira e dava com ela a volta na arena, sob os gritos da plateia. Nas lápides de gladiadores, as palmas gravadas contam quantas vitórias cada um teve.' },
  bolsa: { name: 'Bolsa de sestércios', era: 'Coliseu · o prêmio em dinheiro', story: 'Além da palma, o vencedor ganhava dinheiro, entregue numa bandeja ou numa bolsa. Muitos gladiadores eram escravos ou condenados, mas podiam juntar esse dinheiro; os voluntários (auctorati) lutavam justamente por ele.' },
  rudis: { name: 'Rudis — a espada de madeira da liberdade', era: 'Coliseu · depois de muitas vitórias', story: 'A rudis era uma espada de madeira, usada nos treinos. Recebê-la na arena significava a liberdade: o gladiador deixava de lutar. Alguns libertos continuavam no ofício como treinadores ou como árbitros (summa rudis).' },
  aureo: { name: 'Áureo de Trajano', era: 'Coliseu · o prêmio da caçada', story: 'O áureo era a moeda de ouro do império; um valia 25 denários de prata. Nos jogos, o imperador ou o organizador às vezes recompensava os venatores mais corajosos, e moedas e presentes chegavam a ser jogados à plateia.' },
  auriga: { name: 'Palma e coroa do auriga', era: 'Circo Máximo · o prêmio da corrida', story: 'O auriga vencedor recebia a palma, uma coroa e dinheiro, e dava a volta da vitória. Os melhores ficavam famosos e ricos: Diocles, no século II, venceu 1.462 corridas e juntou uma fortuna.' },
};
const prizesGot = () => { try { return JSON.parse(localStorage.getItem(PRIZE_KEY) || '{}'); } catch (e) { return {}; } };

// ---- os adversários
const KINDS = {
  thraex: { name: 'o trácio', look: { extras: ['thraex', 'parmula', 'sica', 'manica'], shieldColor: 0x2a4a8a }, w: 'gladio', shield: true, hp: 115, speed: 3.0, reach: 1.7, dmg: [9, 14], block: 0.3, dodge: 0.3, aggr: 1.25, keep: 1.6 },
  retiarius: { name: 'o reciário', look: { extras: ['trident', 'net', 'galerus'] }, w: 'lanca', shield: false, hp: 120, speed: 3.4, reach: 2.4, dmg: [10, 15], block: 0, dodge: 0.45, aggr: 1.0, keep: 2.5 },
  secutor: { name: 'o secutor', look: { extras: ['secutor', 'scutum', 'gladius', 'manica'], shieldColor: 0x2a6a3a }, w: 'gladio', shield: true, hp: 150, speed: 2.4, reach: 1.8, dmg: [12, 17], block: 0.5, dodge: 0.1, aggr: 0.9, keep: 1.7 },
  hoplomachus: { name: 'o hoplômaco', look: { extras: ['thraex', 'parmula', 'spear', 'manica'], shieldColor: 0xb8862a }, w: 'lanca', shield: true, hp: 125, speed: 2.7, reach: 2.4, dmg: [10, 15], block: 0.35, dodge: 0.15, aggr: 0.85, keep: 2.3 },
};
const ROUNDS = [['thraex'], ['retiarius'], ['secutor', 'hoplomachus']];
const ATTACKS = [['gl_alto', 3], ['gl_baixo', 2], ['gl_desce', 2], ['gl_combo', 1.4], ['gl_forte', 1], ['gl_cabo', 0.8], ['gl_chute', 0.8]];
const pickAttack = (armed) => { const L = armed ? ATTACKS.filter(([c]) => hasClip(c)) : [['so_jab', 2.5], ['so_direto', 2], ['so_gancho', 1.5], ['so_uppercut', 1], ['gl_cabo', 1.2], ['gl_chute', 1]].filter(([c]) => hasClip(c)); /* (sem arma: no soco, como os gladiadores de verdade quando perdiam a espada) */ let s = 0; for (const [, w] of L) s += w; let r = rand() * s; for (const [c, w] of L) { r -= w; if (r <= 0) return c; } return L[0]?.[0] || 'golpe'; };

class Foe {
  constructor(A, kind, scene) {
    const K = KINDS[kind]; this.A = A; this.K = K; this.kind = kind;
    const skin = pick([0xc8a07e, 0xb48662, 0xa87a58, 0x8a5a3a, 0xd2aa8a]);
    this.r = makeHumanoid({ outfit: 'worker', skin, beard: 'short', ...K.look }); scene.add(this.r.root);
    this.r.root.userData.cullFar = 200;
    this.pos = new THREE.Vector3(); this.h = 0; this.hp = K.hp; this.maxHp = K.hp; this.weapon = K.w; this.shield = K.shield;
    this.cd = rr(1.2, 2.2); this.st = 'enter'; this.rad = 0.45; this.strafe = rand() < 0.5 ? 1 : -1; this.ph = rand() * 9;
  }
  get alive() { return this.st !== 'dead' && this.st !== 'kneel' && this.st !== 'gone' && this.st !== 'exit'; }
  disarm(dir) {
    if (!this.weapon) return; const kind = this.weapon; this.weapon = null;
    for (const c of this.r.handR.children) c.visible = false; // (a arma do adereço some da mão)
    this.A.melee.drop(kind, this.pos.x + dir.x * rr(2.5, 4), this.pos.z + dir.z * rr(2.5, 4), Y + 1.3);
    this.A.say(`A arma voa da mão d${this.K.name.slice(0, 2) === 'o ' ? 'o' : 'e'} ${this.K.name.slice(2)}!`);
  }
  arm(kind) { this.weapon = kind; const w = makeWeapon(kind); const h = w.userData.hand; w.rotation.set(...h.rot); w.position.set(...h.pos); this.r.handR.add(w); }
  play(clip, rate = 1, hold = null) { const a = this.r.act(clip); if (!a) return 0.6; const d = a.getClip().duration / rate; playOnce(this.r, clip, hold ?? d * 0.95); a.timeScale = rate; return d; }
  hit(dmg, dir, how = {}) {
    if (!this.alive) return 'none';
    const P = this.A.player.pos, front = ((P.x - this.pos.x) * Math.sin(this.h) + (P.z - this.pos.z) * Math.cos(this.h)) > 0;
    if (this.blockT > 0 && this.shield && front && !how.thrown && !how.kick) { this.play('gl_bloqueio', 1.1); this.blockT = 0; this.knock = 0.12; this.kdir = dir; return 'blocked'; }
    const now = performance.now(); this.streak = now - (this.lastHit || 0) < 1500 ? (this.streak || 0) + 1 : 1; this.lastHit = now;
    if (this.streak >= 3 && front && !how.thrown) { // (não se deixa encurralar: apara no escudo ou aguenta e devolve o golpe)
      this.streak = 0;
      if (this.shield && rand() < 0.6) { this.play('gl_bloqueio', 1.1); this.knock = 0.1; this.kdir = dir; this.cd = 0; return 'blocked'; }
      this.hp -= dmg * 0.6; this.cd = 0; this.stagger = 0; this.counter = true; this.A.blood?.spray(this.pos.clone().setY(Y + 1.25), dir, 8); return 'hit';
    }
    this.hp -= dmg; this.atk = null; this.blockT = 0;
    this.A.blood?.spray(this.pos.clone().setY(Y + 1.25), dir, how.heavy ? 18 : 11); if (rand() < 0.5) this.A.blood?.stain(this.pos.x + dir.x * 0.5, this.pos.z + dir.z * 0.5, rr(0.1, 0.25));
    this.stagger = how.heavy ? 0.55 : 0.32; this.knock = how.kick ? 0.45 : how.heavy ? 0.3 : 0.16; this.kdir = dir;
    this.play(how.heavy && hasClip('gl_cabeca') ? 'gl_cabeca' : hasClip('gl_impacto') ? 'gl_impacto' : 'golpe', 1.1);
    this.A.games.excite = Math.max(this.A.games.excite, how.heavy ? 0.85 : 0.6);
    if ((how.heavy || how.kick) && this.weapon && rand() < 0.22) this.disarm(dir);
    if (this.hp <= this.maxHp * 0.15) this.A.foeDown(this, how);
    return 'hit';
  }
  update(dt, t) {
    const A = this.A, P = A.player, me = this.pos, K = this.K;
    if (this.st === 'dead' || this.st === 'gone') { animateHumanoid(this.r, dt, 0, 'idle', t); return; }
    if (this.st === 'kneel') { if (this.finishT > 0 && (this.finishT -= dt) <= 0) { A.kill(this); return; } if (!this.r.once) playOnce(this.r, 'ajoelhado', 999); animateHumanoid(this.r, dt, 0, 'idle', t); this.place(); return; }
    const goal = this.st === 'exit' ? IN_EAST : null;
    let tx = P.pos.x, tz = P.pos.z;
    if (goal) { tx = goal.x + 4; tz = goal.z; }
    const dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz) || 1;
    this.h = angleLerp(this.h, Math.atan2(dx, dz), Math.min(1, dt * (this.atk ? 3 : 8)));
    let vx = 0, vz = 0, sp = 0;
    if (this.stagger > 0) { this.stagger -= dt; }
    if (this.knock > 0) { const k = Math.min(dt, this.knock); this.knock -= dt; me.x += this.kdir.x * 5 * k; me.z += this.kdir.z * 5 * k; }
    if (this.blockT > 0) this.blockT -= dt;
    if (this.dodgeT > 0) { this.dodgeT -= dt; me.x += this.ddx * 6 * dt; me.z += this.ddz * 6 * dt; }
    if (goal || this.st === 'enter') { // entrando pela porta leste / saindo
      if (d > 0.6) { vx = dx / d; vz = dz / d; sp = goal ? 2.2 : 3.2; }
      if (this.st === 'enter' && Math.hypot(P.pos.x - me.x, P.pos.z - me.z) < 9) this.st = 'fight';
      if (goal && d < 1) { this.st = 'gone'; this.r.root.visible = false; }
    } else if (this.stagger <= 0 && !this.atk) {
      // sem arma: vai buscar uma no chão, se houver perto e o explorador não estiver colado
      if (!this.weapon && !this.pickGoal) { const it = A.melee.ground.find((g) => g.kind !== 'escudo' && !g.vy && Math.hypot(g.g.position.x - me.x, g.g.position.z - me.z) < 14); if (it && d > 2.6) this.pickGoal = it; }
      if (this.pickGoal) {
        const g = this.pickGoal; if (!A.melee.ground.includes(g)) this.pickGoal = null;
        else { const gx = g.g.position.x - me.x, gz = g.g.position.z - me.z, gd = Math.hypot(gx, gz); if (gd < 0.8) { A.melee.ground.splice(A.melee.ground.indexOf(g), 1); A.scene.remove(g.g); this.arm(g.kind); this.play('pegar', 1.4); this.pickGoal = null; } else { vx = gx / gd; vz = gz / gd; sp = K.speed; this.h = Math.atan2(gx, gz); } }
      } else {
        // em guarda: mantém a distância da arma, rodeando de lado; de tempos em tempos ataca
        const keep = this.weapon ? K.keep : 1.15;
        const rad = d > keep + 0.35 ? 1 : d < keep - 0.4 ? -0.8 : 0;
        this.ph += dt; if (rand() < dt * 0.25) this.strafe *= -1;
        vx = (dx / d) * rad + (-dz / d) * this.strafe * 0.55; vz = (dz / d) * rad + (dx / d) * this.strafe * 0.55;
        sp = rad > 0 && d > 5 ? K.speed * 1.4 : K.speed * 0.55;
        this.cd -= dt * K.aggr * A.diff;
        const reach = this.weapon ? K.reach : 1.25;
        if (this.cd <= 0 && d < reach + 0.4 && A.health.hp > 0) { // ataque
          const clip = this.counter && hasClip('gl_forte') && this.weapon ? 'gl_forte' : pickAttack(!!this.weapon); this.counter = false; const dur = this.play(clip, rr(1.0, 1.2));
          this.atk = { clip, t: 0, dur, hits: HIT_AT[clip] || [0.45], i: 0 }; this.cd = rr(0.9, 2.0);
          if (clip === 'gl_forte' || clip === 'gl_desce' || clip === 'gl_combo') this.cd += 0.5;
        }
      }
    }
    // o ataque em curso: o golpe chega na fração certa
    if (this.atk) {
      const a = this.atk; a.t += dt; const f = a.t / a.dur, hk = a.hits[a.i];
      if (f < 0.5) { vx = dx / d; vz = dz / d; sp = 0.9; } // (avança no golpe)
      if (hk !== undefined && f >= hk) {
        a.i++;
        const pd = Math.hypot(P.pos.x - me.x, P.pos.z - me.z), facing = ((P.pos.x - me.x) * Math.sin(this.h) + (P.pos.z - me.z) * Math.cos(this.h)) / Math.max(pd, 0.01);
        const reach = (this.weapon ? K.reach : 1.25) + 0.35;
        if (pd < reach && facing > 0.45) {
          const heavy = a.clip === 'gl_forte' || a.clip === 'gl_desce' || a.clip === 'gl_chute';
          const dmg = rr(K.dmg[0], K.dmg[1]) * (this.weapon ? 1 : 0.45) * (heavy ? 1.35 : 1) * (a.clip === 'gl_chute' ? 0.5 : 1);
          const res = A.melee.receive(dmg, me, { heavy, knock: a.clip === 'gl_chute' ? 1.6 : 1 });
          if (res === 'blocked') { this.stagger = 0.35; this.knock = 0.1; this.kdir = new THREE.Vector3(-(P.pos.x - me.x) / pd, 0, -(P.pos.z - me.z) / pd); }
          A.games.excite = Math.max(A.games.excite, 0.6);
        }
      }
      if (a.t >= a.dur) this.atk = null;
    }
    // separação: ninguém atravessa ninguém
    for (const o of [P.pos, ...A.foes.filter((f) => f !== this && f.r.root.visible).map((f) => f.pos)]) { const ox = me.x - o.x, oz = me.z - o.z, od = Math.hypot(ox, oz); if (od < 0.85 && od > 1e-3) { me.x += (ox / od) * (0.85 - od) * 0.6; me.z += (oz / od) * (0.85 - od) * 0.6; } }
    if (sp > 0) { const n = Math.hypot(vx, vz) || 1; me.x += (vx / n) * sp * dt; me.z += (vz / n) * sp * dt; }
    if (this.st !== 'exit') clampArena(me);
    if (inHole(me.x, me.z)) me.z = Math.sign(me.z || 1) * 2.3;
    this.place();
    // animação: em guarda, de lado, andando
    const mv = sp * (this.atk ? 0.3 : 1);
    let mode = 'idle';
    if (mv > 1.4) mode = 'walk';
    else if (mv > 0.3 && hasClip('gl_lado')) { mode = '@gl_lado'; (this.r.speeds ||= {}).gl_lado = this.strafe > 0 ? -1 : 1; }
    else if (hasClip('gl_guarda') && this.weapon) mode = '@gl_guarda';
    animateHumanoid(this.r, dt, mv, mode, t);
  }
  place() { this.pos.y = Y; this.r.root.position.copy(this.pos); this.r.root.rotation.set(0, this.h, 0); }
  // reação ao golpe do explorador que vem aí: apara no escudo ou sai de lado
  react() {
    if (!this.alive || this.atk || this.stagger > 0) return;
    const P = this.A.player.pos, d = Math.hypot(P.x - this.pos.x, P.z - this.pos.z); if (d > 3.2) return;
    const r = rand() / this.A.diff;
    if (this.shield && r < this.K.block) { this.blockT = 0.7; this.play('gl_bloqueio', 0.9, 0.5); const a = this.r.act('gl_bloqueio'); if (a) { a.time = a.getClip().duration * 0.2; a.timeScale = 0.2; } }
    else if (r < this.K.block + this.K.dodge) { const s = rand() < 0.5 ? 1 : -1; this.dodgeT = 0.28; this.ddx = Math.cos(this.h) * s; this.ddz = -Math.sin(this.h) * s; }
  }
}

// ---- as feras da caçada
const BEASTS = { leao: { name: 'o leão', size: 2.4, hp: 85, speed: 3.2, charge: 10, dmg: [14, 20], reach: 2.0 }, urso: { name: 'o urso', size: 2.1, hp: 125, speed: 2.6, charge: 8, dmg: [18, 26], reach: 2.0 }, touro: { name: 'o touro', size: 2.7, hp: 115, speed: 2.8, charge: 12, dmg: [20, 28], reach: 2.3, horns: true } };
const HUNT = [['leao'], ['urso'], ['touro', 'leao']];
class Beast {
  constructor(A, kind) { this.A = A; this.kind = kind; this.K = BEASTS[kind]; this.pos = new THREE.Vector3(); this.h = Math.PI; this.hp = this.K.hp; this.maxHp = this.K.hp; this.st = 'loading'; this.rad = 0.9; this.cd = rr(1.5, 3); this.ready = this.load(); }
  async load() {
    const c = await creature(this.kind, this.K.size, { still: true }); if (!c) { this.st = 'gone'; return; }
    Object.assign(this, c); this.acts = {};
    if (c.mixer) for (const cl of c.clips) this.acts[cl.name] = c.mixer.clipAction(cl);
    const pickA = (...names) => names.map((n) => this.acts[n] || Object.entries(this.acts).find(([k]) => k.toLowerCase().endsWith('_' + n.toLowerCase()) || k.toLowerCase().includes(n.toLowerCase()))?.[1]).find(Boolean) || Object.values(this.acts)[0];
    this.aWalk = pickA('Walk', 'Play', 'Unreal Take'); this.aRun = pickA('Run', 'Gallop', 'Trot', 'Walk'); this.aIdle = pickA('Stand_Idle_01', 'Idle'); this.aAtk = pickA('Attack', 'Attack_StandAngry_01_High');
    for (const a of new Set([this.aWalk, this.aRun, this.aIdle, this.aAtk])) if (a) { a.play(); a.setEffectiveWeight(0); }
    c.mixer?.update(0.01); c.holder.updateMatrixWorld(true);
    let lo = 1e9; const v = new THREE.Vector3();
    c.holder.traverse((m) => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position; for (let j = 0; j < p.count; j += 9) { m.getVertexPosition(j, v); m.localToWorld(v); lo = Math.min(lo, v.y); } });
    if (lo < 1e8) c.o.position.y -= lo - c.holder.position.y;
    c.holder.userData.cullFar = 200; this.A.scene.add(c.holder); this.st = 'enter';
  }
  get alive() { return this.st !== 'dead' && this.st !== 'gone' && this.st !== 'loading'; }
  get aimY() { return Y + this.K.size * 0.35; }
  hit(dmg, dir, how = {}) {
    if (!this.alive) return 'none';
    this.hp -= dmg; this.stagger = how.heavy ? 0.6 : 0.35; this.knock = 0.18; this.kdir = dir; if (this.st === 'charge') { this.st = 'prowl'; this.cd = rr(1, 2); }
    this.A.blood?.spray(this.pos.clone().setY(this.aimY), dir, 14);
    this.A.games.excite = Math.max(this.A.games.excite, 0.7);
    if (this.hp <= 0) { this.st = 'dead'; this.deadT = 0; this.A.beastDown(this); }
    return 'hit';
  }
  weights(w) { for (const [a, k] of [[this.aIdle, w.idle || 0], [this.aWalk, w.walk || 0], [this.aRun, w.run || 0], [this.aAtk, w.atk || 0]]) if (a) a.setEffectiveWeight(k); }
  update(dt, t) {
    if (this.st === 'loading' || this.st === 'gone') return;
    const A = this.A, P = A.player, me = this.pos, K = this.K;
    if (this.st === 'dead') { this.deadT += dt; this.holder.rotation.z = lerp(this.holder.rotation.z, Math.PI / 2, Math.min(1, dt * 4)); this.holder.position.y = Y + Math.min(1, this.deadT * 3) * K.size * 0.12; this.weights({ idle: 1 }); return; }
    const dx = P.pos.x - me.x, dz = P.pos.z - me.z, d = Math.hypot(dx, dz) || 1;
    let sp = 0, wantH = Math.atan2(dx, dz);
    if (this.stagger > 0) this.stagger -= dt;
    if (this.knock > 0) { const k = Math.min(dt, this.knock); this.knock -= dt; me.x += this.kdir.x * 4 * k; me.z += this.kdir.z * 4 * k; }
    if (this.st === 'enter') { sp = K.speed; if (d < 14) this.st = 'prowl'; }
    else if (this.st === 'prowl') { // rodeia, medindo; de tempos em tempos investe
      const ring = K.horns ? 11 : 7; wantH = Math.atan2(dx, dz) + (d > ring ? 0.35 : 1.35) * (this.side ||= rand() < 0.5 ? 1 : -1);
      sp = d > ring + 2 ? K.speed * 1.3 : K.speed * 0.8;
      this.cd -= dt * A.diff;
      if (this.cd <= 0 && this.stagger <= 0) { this.st = 'charge'; this.chargeDir = new THREE.Vector3(dx / d, 0, dz / d); this.chargeT = 2.2; this.hitDone = false; if (!this.warned) { this.warned = true; A.say(`${K.name[0].toUpperCase() + K.name.slice(1)} baixa a cabeça e avança! Saia de lado (Espaço).`); } }
      if (d < K.reach && this.stagger <= 0 && !K.horns && this.cd < 1.2) { this.st = 'bite'; this.atkT = 0; }
    } else if (this.st === 'charge') { // investida em linha reta (dá para sair de lado no último instante)
      wantH = Math.atan2(this.chargeDir.x, this.chargeDir.z); sp = K.charge; this.chargeT -= dt;
      if (!this.hitDone && d < K.reach) { this.hitDone = true; if (A.melee.receive(rr(K.dmg[0], K.dmg[1]), me, { heavy: true, knock: K.horns ? 2.2 : 1.4 }) !== 'dodged') A.games.excite = 1; }
      if (this.chargeT <= 0 || (this.hitDone && d > 4)) { this.st = 'prowl'; this.cd = rr(2, 4); }
    } else if (this.st === 'bite') { // o bote: patada e mordida
      this.atkT += dt; sp = 0;
      if (!this.hitDone && this.atkT > 0.45) { this.hitDone = true; if (d < K.reach + 0.5) A.melee.receive(rr(K.dmg[0], K.dmg[1]) * 0.8, me, { heavy: rand() < 0.4 }); }
      if (this.atkT > 1.1) { this.st = 'prowl'; this.cd = rr(1.5, 3); this.hitDone = false; }
    }
    if (this.stagger > 0) sp *= 0.2;
    this.h = angleLerp(this.h, wantH, Math.min(1, dt * (this.st === 'charge' ? 2 : 5)));
    me.x += Math.sin(this.h) * sp * dt; me.z += Math.cos(this.h) * sp * dt;
    // (a fera não atravessa o explorador)
    { const ox = me.x - P.pos.x, oz = me.z - P.pos.z, od = Math.hypot(ox, oz); if (od < 1.1 && od > 1e-3) { me.x += (ox / od) * (1.1 - od); me.z += (oz / od) * (1.1 - od); } }
    clampArena(me, 1.6); if (inHole(me.x, me.z)) me.z = Math.sign(me.z || 1) * 2.4;
    me.y = Y; this.holder.position.copy(me); this.holder.rotation.set(0, this.h, 0);
    this.weights(this.st === 'bite' ? { atk: 1 } : sp > 5 ? { run: 1 } : sp > 0.3 ? { walk: 1 } : { idle: 1 });
    if (this.aRun) this.aRun.timeScale = clamp(sp / 8, 0.7, 1.5); if (this.aWalk) this.aWalk.timeScale = clamp(sp / 2.4, 0.6, 1.4);
    this.mixer?.update(dt);
  }
}

export class Arena {
  constructor(scene, { games, player, melee, health, ui, audio, artifacts, toast, eligible, faint, onEnd }) {
    Object.assign(this, { scene, games, player, melee, health, ui, audio, artifacts, toast, eligible, faint, onEnd });
    this.blood = games.blood; melee.blood = games.blood;
    artifacts.prizes = () => { const g = prizesGot(); return Object.keys(PRIZES).filter((id) => g[id]).map((id) => PRIZES[id]); }; // (a coleção, K, mostra os prêmios)
    this.mode = null; this.foes = []; this.beasts = []; this.diff = 1; this.round = 0;
    // o guarda: legionário de serviço na entrada oeste, de lança e escudo
    this.guard = makeHumanoid({ outfit: 'chiton', cloth: 0xb0402c, border: 0xd8b45a, beard: 'short', extras: ['lorica', 'galea', 'spear', 'scutum'], shieldColor: 0xa8261e });
    const gy = groundAt(GUARD.x, GUARD.z, Y + 4);
    this.guard.root.position.set(GUARD.x, gy, GUARD.z); this.guard.root.rotation.y = -Math.PI / 2; this.guard.root.visible = false; scene.add(this.guard.root);
    this.guardPos = this.guard.root.position;
    melee.targets = () => (this.mode === 'munus' ? this.foes : this.mode === 'venatio' ? this.beasts : []);
    melee.onSwing = () => { if (this.mode === 'munus') for (const f of this.foes) f.react(); };
    // escolha diante de quem pede clemência: E poupa, F dá o golpe final
    addEventListener('keydown', (e) => {
      if (!this.kneeling || e.repeat || this.ui.dialogOpen) return;
      if (e.code === 'KeyE') { e.stopImmediatePropagation(); this.verdict(false); }
      if (e.code === 'KeyF' && this.kneelNear()) { e.stopImmediatePropagation(); this.verdict(true); } // (longe dele, o F é um golpe comum: na última luta há outro adversário de pé)
    }, true);
  }

  get running() { return !!this.mode; }
  say(m, ms = 3800) { this.toast(m, 'quest', ms); }
  // o guarda aparece para quem conhece Roma inteira (de dia); para descer à arena, ele exige a roupa de gladiador
  // (antes ele só aparecia com a roupa vestida, e quem estava de legionário não achava ninguém na porta)
  guardHere(night) { return this.eligible() && !night && !this.mode; }
  nearGuard(p, night) { return this.guardHere(night) && Math.hypot(p.x - GUARD.x, p.z - GUARD.z) < 3.2 && Math.abs(p.y - this.guardPos.y) < 3; }

  talk(night) {
    const ui = this.ui, P = this.player, ev = this.games.event.id;
    P.locked = true; ui.openDialog({ name: 'Guarda do Coliseu', title: 'à porta dos gladiadores' }); this.audio?.talk?.();
    const close = () => { ui.closeDialog(); P.locked = false; };
    const wins = prizesGot().vitorias || 0;
    if (P.look !== 'gladiador') return ui.say('Pela porta dos gladiadores só passa quem está pronto para a arena. Vista-se de gladiador — elmo, manica, escudo e gládio — e volte aqui. (Aperte V para trocar de roupa.)', [{ label: '(Seguir caminho)', cb: close }]);
    if (ev === 'naumachia') return ui.say('Hoje a arena fica vazia: o povo foi ver a batalha naval na Naumaquia, do outro lado do Tibre. Volte amanhã.', [{ label: '(Seguir caminho)', cb: close }]);
    if (ev === 'venatio') return ui.say(`Hoje é dia de caçada. As feras já estão no hipogeu: leões da África, um urso, um touro. Quer descer com os venatores? Você entra de lança${wins ? '' : '; a armadura não serve contra garra e chifre'}.`, [{ label: 'Quero enfrentar as feras.', cb: () => { close(); this.start('venatio'); } }, { label: 'Hoje não.', cb: close }]);
    ui.say(`${wins ? `Você de novo! O povo ainda fala das suas ${wins} vitória${wins > 1 ? 's' : ''}.` : 'Você está vestido como mirmilão, mas não é do ludus.'} Quer descer à arena? Serão três combates: o trácio, o reciário e, se ainda estiver de pé, dois de uma vez. Quem cai pede clemência, e a plateia decide.`,
      [{ label: 'Quero lutar.', cb: () => { close(); this.start('munus'); } }, { label: 'Ainda não.', cb: close }]);
  }

  // ---- começa: o explorador desce à arena pela porta oeste
  start(mode) {
    const P = this.player, M = this.melee;
    this.mode = mode; this.round = 0; this.kneeling = null; this.endT = 0; this.state = 'intro'; this.introT = 3.2;
    this.hpBefore = this.health.hp; this.health.revive(100); // (o lanista manda descer descansado)
    this.games.playerEvent = mode; this.games.excite = 0.8;
    P.place(IN_WEST.x, IN_WEST.z, Math.PI / 2); P.pos.y = groundAt(IN_WEST.x, IN_WEST.z, Y + 1.5); P.updateCamera(1, true); // (na areia: o chão de baixo é o do hipogeu)
    this.games.seenDay = this.games.day; // (o cartaz do programa do dia não abre por cima da luta)
    M.clearGround();
    if (mode === 'munus') M.equip(M.right || 'gladio', M.left === undefined ? 'escudo' : M.left || 'escudo', true);
    else M.equip('lanca', null, true);
    // armas largadas na areia
    const kinds = mode === 'munus' ? ['gladio', 'gladio', 'lanca', 'lanca', 'escudo', 'escudo'] : ['lanca', 'lanca', 'lanca', 'lanca', 'gladio', 'escudo'];
    for (const k of kinds) { let x, z, n = 0; do { x = rr(-COL.a0 + 6, COL.a0 - 6); z = rr(-COL.b0 + 4, COL.b0 - 4); n++; } while ((inHole(x, z) || !insideArena(x, z, 3) || Math.hypot(x - IN_WEST.x, z) < 5) && n < 30); M.drop(k, x, z, null, pick([0xa8261e, 0x2a4a8a, 0x2a6a3a, 0xb8862a])); }
    this.say(mode === 'munus' ? 'Os portões se abrem. A plateia ruge quando você pisa na areia...' : 'Você desce à arena de lança na mão. Do outro lado, ouve-se o rugido no hipogeu...', 4200);
  }

  nextRound() {
    const list = this.mode === 'munus' ? ROUNDS[this.round] : HUNT[this.round];
    if (!list) return this.victory();
    this.state = 'fight';
    if (this.mode === 'munus') {
      for (const f of this.foes) this.scene.remove(f.r.root);
      this.foes = list.map((k, i) => { const f = new Foe(this, k, this.scene); f.pos.set(IN_EAST.x, Y, (i - (list.length - 1) / 2) * 1.6); f.h = -Math.PI / 2; f.place(); return f; });
      this.say(this.round === 0 ? `Entra ${KINDS[list[0]].name}, de escudo pequeno e espada curva. A luta começa!` : this.round === 1 ? 'Entra o reciário: sem escudo nem elmo, com o tridente e a rede. Rápido e traiçoeiro.' : 'Os dois últimos entram juntos: o secutor, atrás do escudo grande, e o hoplômaco, de lança. A plateia fica de pé!', 5000);
    } else {
      for (const b of this.beasts) if (b.holder) this.scene.remove(b.holder);
      this.beasts = list.map((k, i) => { const b = new Beast(this, k); b.pos.set(IN_EAST.x - 2, Y, (i - (list.length - 1) / 2) * 3); b.h = -Math.PI / 2; return b; });
      this.say(this.round === 0 ? 'Um alçapão se abre e o leão sobe para a areia!' : this.round === 1 ? 'Agora um urso, enorme, sacudindo a cabeça.' : 'Por último, o touro — e mais um leão. Cuidado com os chifres!', 4500);
    }
  }

  // quem não aguenta mais cai de joelhos e pede clemência; a plateia grita e o explorador decide
  foeDown(f, how) {
    if (how.thrown && f.hp <= 0) return this.kill(f);
    if (this.kneeling) { f.st = 'exit'; f.r.once = null; this.say(`${f.K.name[0].toUpperCase() + f.K.name.slice(1)} larga a arma e sai da arena, vencido.`); return; }
    f.st = 'kneel'; f.atk = null; playOnce(f.r, 'ajoelhado', 999);
    const missio = rand() < 0.62; this.kneeling = { f, missio }; this.games.excite = 1;
    this.say(`${f.K.name[0].toUpperCase() + f.K.name.slice(1)} cai de joelhos e ergue o dedo pedindo clemência. A plateia grita: ${missio ? '"Missio!" — querem que você o poupe' : '"Iugula!" — querem o golpe final'}. E: poupar · de perto, F: golpe final.`, 9000);
  }
  kneelNear() { const k = this.kneeling, P = this.player.pos; return !!k && Math.hypot(k.f.pos.x - P.x, k.f.pos.z - P.z) < 2.6; }
  verdict(kill) {
    const { f, missio } = this.kneeling; this.kneeling = null;
    if (kill) { const P = this.player; P.facing = Math.atan2(f.pos.x - P.pos.x, f.pos.z - P.pos.z); this.melee.request(); f.finishT = 0.5; this.say(missio ? 'A plateia vaia: queriam que ele vivesse.' : 'O povo aplaude o golpe final.'); }
    else { f.st = 'exit'; f.r.once = null; this.say(missio ? 'Você o poupa, e a plateia aplaude: ele sai vivo da arena.' : 'Você o poupa contra a vontade do povo; vaias por toda a cávea, mas ele sai vivo.'); }
    this.games.excite = 1;
  }
  kill(f) { f.st = 'dead'; f.r.once = null; const c = hasClip('gl_morte_f') && rand() < 0.5 ? 'gl_morte_f' : hasClip('gl_morte_t') ? 'gl_morte_t' : 'desmaiar'; playOnce(f.r, c, 9999); this.blood?.spray(f.pos.clone().setY(Y + 0.8), new THREE.Vector3(), 26); for (let i = 0; i < 3; i++) this.blood?.stain(f.pos.x + rr(-0.6, 0.6), f.pos.z + rr(-0.6, 0.6), rr(0.25, 0.45)); }
  beastDown(b) { this.games.excite = 1; this.say(`${b.K.name[0].toUpperCase() + b.K.name.slice(1)} tomba na areia. A plateia grita o seu nome!`); }

  // o explorador caiu: a plateia decide (quase sempre missio, como era de fato)
  playerDown() {
    if (!this.mode || this.state === 'lost') return !!this.mode;
    this.state = 'lost'; const P = this.player; P.locked = true; P.collapse();
    const spared = this.mode === 'venatio' || rand() < 0.8;
    this.say(this.mode === 'venatio' ? 'A fera derruba você. Os bestiários correm com tochas e afastam o animal; os carregadores levam você para fora.' : spared ? 'Você cai de joelhos e ergue o dedo. A plateia grita "Missio!": você sai vivo da arena.' : 'Você cai, e o povo vira o polegar... tudo escurece.', 6000);
    setTimeout(() => this.faint(spared ? 'Os carregadores levam você para fora da arena...' : 'Tudo escureceu...', () => { this.finish(false); this.health.revive(35); P.locked = false; P.rig.once = null; }), 2600);
    return true;
  }

  victory() {
    this.state = 'won'; this.endT = 6; const P = this.player;
    playOnce(P.rig, hasClip('gl_vitoria') ? 'gl_vitoria' : 'idle', 3); this.games.excite = 1;
    const got = prizesGot(); const award = [];
    if (this.mode === 'munus') { got.vitorias = (got.vitorias || 0) + 1; if (!got.palma) award.push('palma'); if (!got.bolsa) award.push('bolsa'); if (got.vitorias >= 3 && !got.rudis) award.push('rudis'); }
    else { got.cacas = (got.cacas || 0) + 1; if (!got.aureo) award.push('aureo'); }
    for (const id of award) got[id] = true;
    try { localStorage.setItem(PRIZE_KEY, JSON.stringify(got)); } catch (e) { /* */ }
    this.say(this.mode === 'munus' ? `Vitória! O organizador dos jogos manda trazer a palma e o dinheiro. (${got.vitorias} vitória${got.vitorias > 1 ? 's' : ''} na arena${got.vitorias < 3 ? `; com 3, a rudis` : ''})` : 'As feras estão vencidas! O povo joga flores e moedas na areia.', 7000);
    this.pending = award;
  }
  has(id) { return !!prizesGot()[id]; }
  award(id) {
    const p = PRIZES[id]; if (!p) return;
    const got = prizesGot(); got[id] = true; try { localStorage.setItem(PRIZE_KEY, JSON.stringify(got)); } catch (e) { /* */ }
    this.artifacts.showInfo({ tag: 'Prêmio', name: p.name, era: p.era, story: p.story, foot: 'Os prêmios de Roma ficam guardados com você.' });
  }

  finish(won) {
    const P = this.player;
    for (const f of this.foes) this.scene.remove(f.r.root); for (const b of this.beasts) if (b.holder) this.scene.remove(b.holder);
    this.foes = []; this.beasts = []; this.kneeling = null; this.melee.clearGround(); this.melee.reset(); this.melee.equip(null, null, false); this.melee.lookSeen = null;
    this.games.playerEvent = null; this.mode = null; this.state = null;
    P.place(GUARD.x - 2.5, GUARD.z - 1.5, -Math.PI / 2);
    if (won && this.pending?.length) { const list = this.pending; this.pending = null; list.forEach((id, i) => setTimeout(() => this.award(id), 600 + i * 300)); }
    this.onEnd?.(won);
  }

  update(dt, t, night) {
    const P = this.player;
    this.guard.root.visible = this.guardHere(night) && Math.hypot(P.pos.x - GUARD.x, P.pos.z - GUARD.z) < 140;
    if (this.guard.root.visible) { const gp = this.guardPos; this.guard.root.rotation.y = angleLerp(this.guard.root.rotation.y, Math.hypot(P.pos.x - gp.x, P.pos.z - gp.z) < 8 ? Math.atan2(P.pos.x - gp.x, P.pos.z - gp.z) : -Math.PI / 2, Math.min(1, dt * 3)); animateHumanoid(this.guard, dt, 0, 'idle', t); }
    if (!this.mode) return;
    // o explorador fica na arena até o fim
    clampArena(P.pos, 0.9); if (inHole(P.pos.x, P.pos.z) && P.pos.y < Y + 0.5) P.pos.z = Math.sign(P.pos.z || 1) * 2.4;
    if (this.state === 'intro') { this.introT -= dt; if (this.introT <= 0) this.nextRound(); }
    for (const f of this.foes) f.update(dt, t);
    for (const b of this.beasts) b.update(dt, t);
    if (this.state === 'fight') {
      const list = this.mode === 'munus' ? this.foes : this.beasts;
      const done = list.length && list.every((x) => x.st === 'dead' || x.st === 'gone' || (x.st === 'exit'));
      if (done && !this.kneeling) { this.state = 'between'; this.betweenT = 4.5; this.round++; this.health.hp = Math.min(100, this.health.hp + 25); this.health.render(); if ((this.mode === 'munus' ? ROUNDS : HUNT)[this.round]) this.say('A plateia aplaude. Um respiro — e o próximo entra pela porta leste.'); }
    } else if (this.state === 'between') { this.betweenT -= dt; if (this.betweenT <= 0) this.nextRound(); }
    else if (this.state === 'won') { this.endT -= dt; if (this.endT <= 0) this.finish(true); }
  }

  hint() {
    if (!this.mode) return '';
    if (this.kneeling) return this.kneelNear() ? '<kbd>E</kbd> Poupar &nbsp;·&nbsp; <kbd>F</kbd> Golpe final' : '<kbd>E</kbd> Poupar &nbsp;·&nbsp; chegue perto para o golpe final';
    const list = this.mode === 'munus' ? this.foes : this.beasts, alive = list.filter((x) => x.alive);
    return alive.map((x) => `${(x.K.name).replace(/^o /, '')}: ${Math.max(0, Math.round((x.hp / (x.maxHp || x.K.hp)) * 100))}%`).join(' · ');
  }
}
