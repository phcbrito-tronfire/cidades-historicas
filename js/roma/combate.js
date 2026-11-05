// Os combates do munus: várias duplas lutando ao mesmo tempo na arena (até seis), cada uma com o seu árbitro (summa rudis).
// Cada luta tem ritmo de verdade: rodeiam em guarda, um ataca (às vezes em sequência de golpes), o outro apara com
// o escudo, esquiva para o lado ou é atingido — cambaleia, sangra, a plateia grita. Quando um não aguenta mais, cai
// de joelhos e pede clemência (ad digitum); o árbitro para a luta, o povo decide: na maioria das vezes, missio (o
// derrotado sai vivo); às vezes não, e o vencedor dá o golpe final. O vencedor ergue a arma para a plateia, os vivos
// saem pela porta e os mortos são levados pelos carregadores de Libitina. As manchas ficam na areia.
import * as THREE from 'three';
import { animateHumanoid, playOnce, hasClip } from '../comum/mixamo.js';
import { COL } from './coliseu.js';
import { rr, rand, lerp, angleLerp } from '../comum/util.js';

// ---- sangue: gotas que voam e caem, e manchas que ficam na areia
export class Blood {
  constructor(scene, Y) {
    this.Y = Y;
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a0c08, roughness: 0.35 });
    this.N = 360; this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 5, 4), mat, this.N); this.drops.frustumCulled = false; this.drops.count = 0;
    this.d = []; for (let i = 0; i < this.N; i++) this.d.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 });
    const stainMat = new THREE.MeshStandardMaterial({ color: 0x5a0a06, roughness: 0.9, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const disk = new THREE.CircleGeometry(1, 10); disk.rotateX(-Math.PI / 2);
    this.S = 120; this.stains = new THREE.InstancedMesh(disk, stainMat, this.S); this.stains.count = 0; this.stains.frustumCulled = false; this.si = 0;
    scene.add(this.drops); scene.add(this.stains); this.o3 = new THREE.Object3D(); this.next = 0;
  }
  spray(pos, dir, n = 18) {
    for (let k = 0; k < n; k++) {
      const d = this.d[this.next]; this.next = (this.next + 1) % this.N;
      d.p.copy(pos); d.v.set(dir.x * rr(1, 3.2) + rr(-0.8, 0.8), rr(0.8, 2.8), dir.z * rr(1, 3.2) + rr(-0.8, 0.8)); d.life = 1.4;
    }
  }
  stain(x, z, r) {
    const o = this.o3; o.position.set(x, this.Y + 0.02 + this.si * 0.0002, z); o.rotation.set(0, rand() * 6, 0); o.scale.set(r * rr(0.7, 1.3), 1, r * rr(0.7, 1.3)); o.updateMatrix();
    this.stains.setMatrixAt(this.si % this.S, o.matrix); this.si++; this.stains.count = Math.min(this.S, this.si); this.stains.instanceMatrix.needsUpdate = true;
  }
  clear() { this.si = 0; this.stains.count = 0; }
  update(dt, visible) {
    this.drops.visible = visible; this.stains.visible = visible;
    let n = 0; const o = this.o3;
    for (const d of this.d) {
      if (d.life <= 0) continue;
      d.life -= dt; d.v.y -= 9.8 * dt; d.p.addScaledVector(d.v, dt);
      if (d.p.y < this.Y + 0.03) { if (rand() < 0.25) this.stain(d.p.x, d.p.z, rr(0.05, 0.14)); d.life = 0; continue; }
      o.position.copy(d.p); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); this.drops.setMatrixAt(n++, o.matrix);
    }
    this.drops.count = n; this.drops.instanceMatrix.needsUpdate = true;
  }
}

// ---- uma luta
// Os golpes são os do pacote de espada e escudo do Mixamo (golpe alto, baixo, de cima para baixo, o golpe forte
// girando o corpo, a sequência de três, a pancada com o punho da espada e o chute no escudo). Quem defende apara no
// escudo (e o braço treme com a pancada), sai de lado ou leva o golpe — no corpo ou na cabeça. Entre um ataque e
// outro, os dois andam de lado em guarda, um medindo o outro.
const ATTACKS = [
  { clip: 'gl_alto', hits: [0.42], dmg: 1, w: 3, head: true },
  { clip: 'gl_baixo', hits: [0.4], dmg: 1, w: 2 },
  { clip: 'gl_desce', hits: [0.48], dmg: 1.5, w: 2, head: true },
  { clip: 'espada', hits: [0.45], dmg: 1, w: 2 },
  { clip: 'gl_combo', hits: [0.2, 0.47, 0.74], dmg: 1, w: 1.6 },
  { clip: 'gl_forte', hits: [0.45], dmg: 2, w: 1, push: 3 },
  { clip: 'gl_cabo', hits: [0.45], dmg: 0.5, w: 1, stun: true },
  { clip: 'gl_chute', hits: [0.38], dmg: 0, w: 1, kick: true },
];
const pickAttack = () => { let s = 0; for (const a of ATTACKS) s += hasClip(a.clip) ? a.w : 0; let r = rand() * s; for (const a of ATTACKS) { if (!hasClip(a.clip)) continue; r -= a.w; if (r <= 0) return a; } return ATTACKS[3]; };
const clipLen = (r, n) => r.act(n)?.getClip().duration || 1.2;
export const GATE = { x: -COL.a0 + 1.5, z: 0 }; // a porta oeste da arena (Libitinensis: por ela saem os mortos)
// cada dupla entra e sai pela porta mais perto. O caminho é uma lista de pontos, da arena até dentro do túnel: a
// porta leste fica bem atrás do alçapão do hipogeu, então ali se contorna o guarda-corpo pelo lado (antes o ponto de
// saída era z = 3,2, já dentro do muro do pódio, e quem saía por ali ficava enfiado na parede)
const exitPath = (home, i) => {
  const lane = (i - 1) * 0.7, A = COL.a0;
  if (home[0] < 0) return [[GATE.x, lane], [GATE.x - 2, lane]];
  const s = home[1] < 0 ? -1 : 1;
  return [[A - 6.2, s * 3.4 + lane * 0.5], [A - 2.4, lane], [A + 2, lane]];
};

export class Bout {
  constructor(games, a, b, judge, home) { this.g = games; this.f = [a, b]; this.judge = judge; this.home = home; this.first = true; this.reset(); }
  reset() {
    for (const f of this.f) { f.r.once = null; f.hp = Math.round(rr(8, 12)); /* (as lutas duram um minuto ou mais) */ f.down = false; f.dead = false; f.stagger = 0; f.kneel = false; f.react = 0; f.dodge = 0; }
    this.cx = this.home[0]; this.cz = this.home[1]; this.ax = rand() * 6; this.dist = 2.4; this.atk = rand() < 0.5 ? 0 : 1;
    this.phase = 'guard'; this.phaseT = rr(1, 2); this.combo = 0; this.endT = 0; this.wait = rr(0, 6); this.body = null;
    if (!this.first) { // depois da primeira luta, a dupla nova entra pela porta da arena e anda até o seu lugar
      this.phase = 'enter';
      [...this.f, this.judge].forEach((f, i) => { const p = exitPath(this.home, i), [x, z] = p[p.length - 1]; f.pos.set(x + Math.sign(x) * i * 0.6, COL.y, z); f.leg = 0; f.h = x < 0 ? Math.PI / 2 : -Math.PI / 2; });
    }
    this.first = false;
  }
  set visible(v) { this.vis = v; for (const f of this.f) f.r.root.visible = v && !f.gone; this.judge.r.root.visible = v && !this.judge.gone; }
  // anda até (x, z); devolve true quando chegou
  walkTo(f, x, z, dt, sp = 1.5) {
    const dx = x - f.pos.x, dz = z - f.pos.z, d = Math.hypot(dx, dz); if (d < 0.4) return true;
    const s = Math.min(d, sp * dt); f.pos.x += dx / d * s; f.pos.z += dz / d * s; f.h = angleLerp(f.h, Math.atan2(dx, dz), Math.min(1, dt * 6)); return false;
  }
  update(dt, t) {
    const G = this.g, Y = COL.y, [a, b] = this.f, J = this.judge;
    if (this.wait > 0) this.wait -= dt;
    this.phaseT -= dt;
    // ---- entrando pela porta / saindo da arena
    if (this.phase === 'enter' || this.phase === 'exit' || this.phase === 'gone') {
      if (this.phase === 'gone') { if (this.wait <= 0 && !this.body) this.reset(); else for (const f of [...this.f, J]) f.r.root.visible = this.vis && f === this.body; return; } // (o morto continua ali até ser levado)
      const dx = Math.cos(this.ax), dz = Math.sin(this.ax); let all = true;
      if (this.legFor !== this.phase) { this.legFor = this.phase; for (const f of [a, b, J]) f.leg = 0; }
      [a, b, J].forEach((f, i) => {
        if (f.dead) return;
        // entrando: o caminho da porta ao contrário e, no fim, o seu lugar na luta; saindo: da arena até dentro do túnel
        const path = exitPath(this.home, i), spot = [this.cx + (i === 2 ? -dz * 3.6 : dx * (i ? 1 : -1) * 1.2), this.cz + (i === 2 ? dx * 3.6 : dz * (i ? 1 : -1) * 1.2)];
        const pts = this.phase === 'exit' ? path : [...path.slice(0, -1).reverse(), spot], [tx, tz] = pts[Math.min(f.leg, pts.length - 1)];
        const ox = f.pos.x, oz = f.pos.z; let there = this.walkTo(f, tx, tz, dt, this.phase === 'enter' ? 2.8 : 2.0); // (entram correndo, saem andando depressa)
        if (there && f.leg < pts.length - 1) { f.leg++; there = false; }
        all = all && there; // (antes esta conta estava presa dentro do comentário: a entrada e a saída acabavam no primeiro quadro)
        f.gone = this.phase === 'exit' && there; f.r.root.visible = this.vis && !f.gone;
        f.pos.y = Y; f.r.root.position.copy(f.pos); f.r.root.rotation.set(0, f.h, 0);
        const sp = Math.hypot(f.pos.x - ox, f.pos.z - oz) / Math.max(dt, 1e-4); animateHumanoid(f.r, dt, sp, sp > 0.3 ? 'walk' : 'idle', t);
      });
      if (all) { if (this.phase === 'enter') { this.phase = 'guard'; this.phaseT = rr(1, 3); for (const f of [a, b, J]) f.gone = false; } else { this.phase = 'gone'; this.wait = rr(1, 3); } }
      return;
    }
    let want = 2.2, push = 0, strafe = 0;
    if (this.phase === 'guard') { // rodeiam em guarda, de lado, olhando nos olhos
      this.ax += dt * 0.5 * Math.sin(t * 0.5 + this.home[0]); strafe = Math.sin(t * 0.9 + this.home[1] * 3) * 0.9; want = 2.2 + Math.sin(t * 1.3 + this.home[0]) * 0.45;
      if (this.phaseT <= 0 && this.wait <= 0) this.startAttack(rand() < 0.55 ? 1 - this.atk : this.atk);
    } else if (this.phase === 'attack') {
      const A = this.f[this.atk], k = 1 - this.phaseT / this.dur, hk = this.move.hits[this.hitI];
      want = this.move.kick ? 1.1 : k < hk ? 1.25 : 1.6; push = k < hk + 0.05 ? (this.move.push || 1.8) : 0.2;
      if (hk !== undefined && k > hk) { this.hitI++; this.resolve(); }
      if (this.phaseT <= 0 && this.phase === 'attack') {
        if (A.down || A.kneel) { /* nada */ } else if (this.combo > 0 && rand() < 0.65) { this.combo--; this.startAttack(this.atk); }
        else if (rand() < 0.3) this.startAttack(1 - this.atk); // o outro devolve na hora
        else { this.phase = 'guard'; this.phaseT = rr(0.8, 2.4); }
      }
    } else if (this.phase === 'kneel') { // o derrotado de joelhos pede clemência; o árbitro segura o vencedor; o povo decide
      want = 2.6;
      if (this.phaseT <= 0) {
        const L = this.f[this.loser], W = this.f[1 - this.loser];
        if (rand() < 0.65) { this.say('A plateia grita "missio!": o derrotado sai vivo da arena.'); this.phase = 'victory'; this.phaseT = 3; }
        else { this.phase = 'kill'; this.phaseT = 1.0; this.playAs(W, 'gl_desce', 1); this.say('A plateia vira o polegar: o vencedor dá o golpe final.'); }
        G.excite = 1;
      }
    } else if (this.phase === 'kill') {
      want = 1.3;
      if (this.phaseT <= 0) { const L = this.f[this.loser]; this.die(L, 'gl_morte_f'); this.phase = 'victory'; this.phaseT = 3; }
    } else if (this.phase === 'victory') { // o vencedor ergue a espada para a plateia
      want = 3.2;
      if (!this.cheered) { this.cheered = true; this.playAs(this.f[1 - this.loser], hasClip('gl_vitoria') ? 'gl_vitoria' : 'idle', 1); G.excite = 1; }
      if (this.phaseT <= 0) { this.cheered = false; this.phase = 'done'; this.endT = 2.5; }
    } else if (this.phase === 'done') {
      this.endT -= dt; want = 3.2;
      if (this.endT <= 0) { // os vivos saem pela porta; o morto fica para os carregadores de Libitina
        const L = this.f[this.loser]; if (L.dead) { this.body = L; G.carry?.(this, L); }
        for (const f of this.f) if (!f.dead) { f.kneel = false; f.r.once = null; } this.phase = 'exit'; return;
      }
    }
    // a dupla anda pela arena com o embalo dos golpes, presa ao seu canto da arena
    const dx = Math.cos(this.ax), dz = Math.sin(this.ax), sg = this.atk === 0 ? 1 : -1;
    this.cx += (dx * push * sg + -dz * strafe) * dt; this.cz += (dz * push * sg + dx * strafe) * dt;
    { const hx = this.cx - this.home[0], hz = this.cz - this.home[1], hd = Math.hypot(hx, hz); if (hd > 3) { this.cx -= hx / hd * (hd - 3) * Math.min(1, dt * 2); this.cz -= hz / hd * (hd - 3) * Math.min(1, dt * 2); } }
    const C = COL, kk = Math.hypot(this.cx / (C.a0 - 4), this.cz / (C.b0 - 4)); if (kk > 1) { this.cx /= kk; this.cz /= kk; this.ax += dt * 1.4; }
    this.dist = lerp(this.dist, want, Math.min(1, dt * 5));
    [a, b].forEach((f, i) => {
      const s2 = i === 0 ? -1 : 1, tx = this.cx + dx * s2 * this.dist / 2, tz = this.cz + dz * s2 * this.dist / 2;
      const ox = f.pos.x, oz = f.pos.z;
      if (f.react > 0) f.react -= dt;
      if (f.stagger > 0) { f.stagger -= dt; f.pos.x += dx * s2 * dt * (f.kicked ? 2.6 : 1.4); f.pos.z += dz * s2 * dt * (f.kicked ? 2.6 : 1.4); } // empurrado pelo golpe
      else if (f.dodge > 0) { f.dodge -= dt; f.pos.x += -dz * f.dodgeDir * dt * 2.4; f.pos.z += dx * f.dodgeDir * dt * 2.4; } // sai de lado
      else if (!f.down && !f.kneel) { f.kicked = false; f.pos.x = lerp(f.pos.x, tx, Math.min(1, dt * 6)); f.pos.z = lerp(f.pos.z, tz, Math.min(1, dt * 6)); }
      f.pos.y = Y; f.r.root.position.copy(f.pos);
      const o = this.f[1 - i];
      if (!f.down) f.h = angleLerp(f.h, Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z), Math.min(1, dt * 10));
      f.r.root.rotation.set(0, f.h, 0);
      // passo: para a frente/trás anda; de lado, o passo cruzado de guarda; parado, a guarda com o escudo à frente
      const vx = (f.pos.x - ox) / Math.max(dt, 1e-4), vz = (f.pos.z - oz) / Math.max(dt, 1e-4);
      const fwd = vx * Math.sin(f.h) + vz * Math.cos(f.h), side = vx * Math.cos(f.h) - vz * Math.sin(f.h);
      f.spd = lerp(f.spd || 0, Math.abs(fwd), Math.min(1, dt * 8)); f.side = lerp(f.side || 0, side, Math.min(1, dt * 6));
      let mode = 'idle';
      if (f.down || f.kneel) mode = 'idle';
      else if (this.phase === 'victory' || this.phase === 'done') mode = 'idle';
      else if (f.spd > 0.7) mode = 'walk';
      else if (Math.abs(f.side) > 0.25 && hasClip('gl_lado')) { mode = '@gl_lado'; (f.r.speeds ||= {}).gl_lado = Math.max(0.6, Math.min(1.4, Math.abs(f.side) * 1.1)) * (f.side > 0 ? -1 : 1); }
      else if (hasClip('gl_guarda')) mode = '@gl_guarda';
      animateHumanoid(f.r, dt, f.spd, mode, t);
    });
    // o árbitro acompanha de lado e, no fim, entra entre os dois
    const side = this.phase === 'kneel' || this.phase === 'victory' || this.phase === 'done' ? 0.6 : 3.6, jx = this.cx + Math.cos(this.ax + Math.PI / 2) * side, jz = this.cz + Math.sin(this.ax + Math.PI / 2) * side;
    const ox = J.pos.x, oz = J.pos.z; J.pos.set(lerp(J.pos.x, jx, Math.min(1, dt * 1.6)), Y, lerp(J.pos.z, jz, Math.min(1, dt * 1.6))); J.r.root.position.copy(J.pos);
    J.h = angleLerp(J.h, Math.atan2(this.cx - J.pos.x, this.cz - J.pos.z), Math.min(1, dt * 4)); J.r.root.rotation.set(0, J.h, 0);
    const js = Math.hypot(J.pos.x - ox, J.pos.z - oz) / Math.max(dt, 1e-4); animateHumanoid(J.r, dt, js, js > 0.3 ? 'walk' : 'idle', t);
  }
  say(m) { if (this === this.g.bouts[0]) this.g.toast?.(m, 'quest', 4500); }
  // toca um golpe ou reação num ritmo (sp) e devolve quanto dura
  playAs(f, clip, sp = 1) { const d = clipLen(f.r, clip) / sp; playOnce(f.r, clip, d * 0.95); const ac = f.r.act(clip); if (ac) ac.timeScale = sp; return d; }
  startAttack(i) {
    const A = this.f[i], D = this.f[1 - i]; if (A.down || A.kneel || D.down || D.kneel) return;
    this.atk = i; this.move = pickAttack(); this.hitI = 0; this.phase = 'attack';
    this.dur = this.playAs(A, this.move.clip, rr(1.0, 1.25)) * 0.92; this.phaseT = this.dur;
    if (this.combo <= 0) this.combo = this.move.hits.length === 1 && rand() < 0.4 ? Math.floor(rr(1, 3)) : 0;
  }
  // o golpe chega: apara com o escudo, esquiva ou acerta
  resolve() {
    const G = this.g, A = this.f[this.atk], D = this.f[1 - this.atk], mv = this.move, hasShield = D.kind !== 'retiarius', r = rand();
    if (D.down || D.kneel) return;
    const dir = new THREE.Vector3(D.pos.x - A.pos.x, 0, D.pos.z - A.pos.z).normalize();
    if (mv.kick) { D.stagger = 0.7; D.kicked = true; this.playAs(D, hasClip('gl_bloqueio') ? 'gl_bloqueio' : 'golpe', 0.8); G.excite = Math.max(G.excite, 0.5); return; } // o chute no escudo joga o outro para trás
    if (hasShield && r < 0.4) { this.playAs(D, hasClip('gl_bloqueio') ? 'gl_bloqueio' : 'golpe', 1.1); D.stagger = 0.15; G.excite = Math.max(G.excite, 0.25); return; } // aparou no escudo
    if (r < (hasShield ? 0.55 : 0.5)) { D.dodge = 0.45; D.dodgeDir = rand() < 0.5 ? 1 : -1; this.ax += D.dodgeDir * 0.6; return; } // saiu de lado
    D.hp -= mv.dmg; D.stagger = mv.stun ? 0.8 : 0.45; // acertou
    if (mv.dmg > 0) { G.blood.spray(D.pos.clone().setY(COL.y + (mv.head ? 1.5 : 1.15)), dir, D.hp <= 1 ? 26 : 16); G.blood.stain(D.pos.x + dir.x * 0.4, D.pos.z + dir.z * 0.4, rr(0.12, 0.3)); }
    G.excite = Math.max(G.excite, 0.75);
    if (D.hp <= 0 && mv.dmg >= 1.5 && rand() < 0.35) { // golpe fatal no meio da luta
      this.loser = 1 - this.atk; this.die(D, rand() < 0.5 ? 'gl_morte_t' : 'gl_morte_f'); this.phase = 'victory'; this.phaseT = 3.5; this.combo = 0; G.excite = 1; this.say('Um golpe forte derruba o gladiador, que não se levanta mais.'); return;
    }
    if (D.hp <= 1) { this.loser = 1 - this.atk; D.kneel = true; playOnce(D.r, 'ajoelhado', 30); this.phase = 'kneel'; this.phaseT = rr(5, 8); this.combo = 0; G.excite = 1; this.say('Um gladiador cai de joelhos e ergue o dedo pedindo clemência...'); return; }
    this.playAs(D, mv.head && hasClip('gl_cabeca') ? 'gl_cabeca' : hasClip('gl_impacto') ? 'gl_impacto' : 'golpe', 1.1);
  }
  die(L, clip) {
    const G = this.g; L.down = true; L.dead = true; L.kneel = false;
    const c = hasClip(clip) ? clip : 'desmaiar'; playOnce(L.r, c, 9999); // (fica no último quadro: caído)
    G.blood.spray(L.pos.clone().setY(COL.y + 0.8), new THREE.Vector3(0, 0, 0), 30); for (let i = 0; i < 4; i++) G.blood.stain(L.pos.x + rr(-0.8, 0.8), L.pos.z + rr(-0.8, 0.8), rr(0.25, 0.5));
  }
}
