// As feras com animação de verdade (modelos do Sketchfab, CC BY): leão, tigre, urso, touro, javali, elefante,
// rinoceronte, hipopótamo e crocodilo. Cada uma anda, trota, corre, ataca, ruge, apanha e morre com as próprias
// animações. As patas acompanham a velocidade do corpo: na primeira cópia de cada bicho, mede-se quanto o pé recua
// no chão durante um passo do "andar" e do "correr", e daí sai a velocidade natural de cada animação — assim o bicho
// nunca desliza (antes o leão só tinha uma animação de cabeça mexendo e andava parado sobre a areia).
import * as THREE from 'three';
import { creature } from './fauna.js';
import { clamp, lerp, rand, rr } from './util.js';

// size: comprimento (m) do focinho à cauda; vel: [andar, correr] padrão, se a medida falhar
export const ESPECIES = {
  leao: { name: 'o leão', size: 2.7, vel: [1.5, 8] },
  tigre: { name: 'o tigre', size: 2.9, vel: [1.5, 8] },
  urso: { name: 'o urso', size: 2.2, vel: [1.3, 6], clips: { idle: 'Stand_Idle_01', walk: 'Walk', run: 'Run', atk: 'Attack_StandAngry_01_High', rugir: 'StandHind_Idle_01', morte: 'Death_Stand_R01' } },
  touro: { name: 'o touro', size: 2.7, vel: [1.4, 6], clips: { idle: 'Bull_game_rig|Bull_game_Idle', walk: 'Bull_game_rig|Bull_game_walk', run: 'Bull_game_rig|Bull_game_Trot' } },
  javali: { name: 'o javali', size: 1.4, vel: [1.2, 6] },
  elefante: { name: 'o elefante', size: 5.6, vel: [1.6, 5] },
  rino: { name: 'o rinoceronte', size: 3.6, vel: [1.4, 7] },
  hipo: { name: 'o hipopótamo', size: 3.8, vel: [1.2, 5], fosco: 0.85 },
  crocodilo: { name: 'o crocodilo', size: 4.2, vel: [0.8, 3.5] },
};
const NAT = {}; // velocidade natural medida de cada animação de locomoção, por espécie

// mede a que velocidade o pé apoiado recua no chão durante a animação (andar no lugar): é a velocidade do corpo
function measure(kind, c, acts) {
  const K = ESPECIES[kind], out = { walk: K.vel[0], run: K.vel[1], trote: (K.vel[0] + K.vel[1]) / 2 };
  const feet = []; c.o.traverse((b) => { if (b.isBone && /foot|ankle|toe|digit|paw|hoof|phalan|hand|finger/i.test(b.name)) feet.push(b); });
  if (!feet.length) return out;
  const p = new THREE.Vector3(), inv = new THREE.Matrix4();
  for (const k of ['walk', 'trote', 'run']) {
    const a = acts[k]; if (!a) continue;
    for (const x of Object.values(acts)) { x.stop(); }
    a.reset().play(); a.setEffectiveWeight(1); a.timeScale = 1;
    const T = a.getClip().duration, N = 48, zs = feet.map(() => []);
    for (let i = 0; i < N; i++) {
      c.mixer.setTime((i / N) * T); c.holder.updateMatrixWorld(true); inv.copy(c.holder.matrixWorld).invert();
      feet.forEach((f, j) => { f.getWorldPosition(p).applyMatrix4(inv); zs[j].push([p.z, p.y]); });
    }
    // pés apoiados (perto do ponto mais baixo de cada um): quanto recuam entre um quadro e o seguinte
    const vs = []; for (const z of zs) { const lo = Math.min(...z.map((q) => q[1])); for (let i = 0; i < N; i++) { const q0 = z[i], q1 = z[(i + 1) % N]; if (q0[1] < lo + 0.05 * c.holder.scale.x + 0.04 && q1[1] < lo + 0.05 + 0.04) { const d = q0[0] - q1[0]; if (d > 0) vs.push(d / (T / N)); } } }
    vs.sort((x, y) => x - y); const v = vs.length > 4 ? vs[Math.floor(vs.length * 0.6)] : 0, ref = out[k]; if (v > ref * 0.35 && v < ref * 2.5) out[k] = v; // (medida absurda: fica o valor de referência)
    a.stop();
  }
  return out;
}

export class Fera {
  // cria uma fera (ou null se o modelo não carregar); size: comprimento em metros (padrão da espécie)
  static async criar(kind, scene, { size } = {}) {
    const K = ESPECIES[kind]; const sz = size || K.size * rr(0.92, 1.08);
    const c = await creature(kind, sz, { still: true }); if (!c) return null;
    const f = new Fera(kind, c, sz); scene?.add(c.holder); return f;
  }
  constructor(kind, c, size) {
    this.kind = kind; this.K = ESPECIES[kind]; this.size = size; Object.assign(this, { holder: c.holder, o: c.o, mixer: c.mixer });
    this.acts = {}; const names = this.K.clips || {};
    for (const cl of c.clips) { const key = Object.keys(names).find((k) => names[k] === cl.name) || cl.name; this.acts[key] = c.mixer.clipAction(cl); }
    // assenta no chão: o ponto mais baixo do corpo, já na pose de andar
    const base = this.acts.walk || this.acts.idle || Object.values(this.acts)[0];
    if (base) { base.play(); this.mixer.update(0); }
    c.holder.updateMatrixWorld(true);
    let lo = 1e9, hi = -1e9; const v = new THREE.Vector3();
    c.holder.traverse((m) => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position; for (let j = 0; j < p.count; j += 7) { m.getVertexPosition(j, v); m.localToWorld(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } });
    if (lo < 1e8) { this.o.position.y -= lo - c.holder.position.y; this.height = hi - lo; } else this.height = size * 0.45;
    this.nat = NAT[kind] ??= measure(kind, c, this.acts);
    for (const a of Object.values(this.acts)) { a.stop(); a.enabled = true; }
    this.loco = ['idle', 'walk', 'trote', 'run', 'nado'].filter((k) => this.acts[k]);
    for (const k of this.loco) { const a = this.acts[k]; a.play(); a.setEffectiveWeight(0); a.time = rand() * a.getClip().duration; }
    this.w = Object.fromEntries(this.loco.map((k) => [k, 0])); this.speed = 0; this.one = null; this.dead = false; this.oneW = 0;
    c.holder.userData.cullFar = 220;
    // pele fosca (o hipopótamo vinha envernizado, azulado de tanto brilho)
    if (this.K.fosco) c.holder.traverse((m) => { if (m.isMesh && m.material && !m.material.userData.fosco) { m.material.roughness = Math.max(m.material.roughness ?? 0.8, this.K.fosco); m.material.metalness = 0; m.material.userData.fosco = true; } });
  }
  has(k) { return !!this.acts[k]; }
  // anima uma vez (atk, atk2, salto, rugir, golpe, ...): devolve a duração (s) ou 0 se a fera não tem esse gesto
  play(k, { rate = 1, hold = false } = {}) {
    const a = this.acts[k]; if (!a || this.dead) return 0;
    if (this.one && this.one.a !== a) this.one.a.stop();
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = rate; a.setEffectiveWeight(1); a.play();
    const d = a.getClip().duration / rate; this.one = { a, k, t: 0, d, hold }; return d;
  }
  // o gesto avulso ainda não acabou (pausado, como a boca aberta do crocodilo, também conta)
  get busy() { return !!this.one; }
  die() {
    if (this.dead) return;
    if (this.acts.morte) { this.play('morte'); this.one.hold = true; } else this.tip = 0; // (sem animação de morte: tomba de lado)
    this.dead = true;
  }
  // speed: velocidade do corpo (m/s), que escolhe e acerta o passo do andar, do trote e da corrida
  update(dt, speed = 0) {
    this.speed = speed; if (!this.mixer) return;
    const N = this.nat, s = speed;
    // pesos alvo da locomoção
    const want = {}; for (const k of this.loco) want[k] = 0;
    if (this.dead) { /* */ } else if (this.swimming && this.acts.nado) want.nado = 1; // (na água: nada, mesmo parado, devagar)
    else if (s < 0.12 || !this.acts.walk) { if (this.acts.idle) want.idle = 1; else if (this.acts.walk) want.walk = 1; }
    else {
      const wv = N.walk, rv = N.run, tv = this.acts.trote ? N.trote : null;
      if (this.acts.run && s > wv * 1.35) {
        if (tv && s < (tv + rv) / 2) { const k = clamp((s - wv * 1.35) / Math.max(0.3, tv - wv * 1.35), 0, 1); want.walk = 1 - k; want.trote = k; }
        else { const lo = tv ? (tv + rv) / 2 : wv * 1.35; const k = clamp((s - lo) / Math.max(0.3, rv * 0.6 - lo), 0, 1); if (tv) { want.trote = 1 - k; want.run = k; } else { want.walk = 1 - k; want.run = k; } }
      } else want.walk = 1;
    }
    const kk = Math.min(1, dt * 7);
    // gesto avulso por cima (ataque, rugido, golpe): a locomoção cede o lugar e volta quando ele termina
    let oneW = 0;
    if (this.one) { // (o fim vem do tempo da própria animação: pausada, ela segura o gesto)
      const o = this.one, a = o.a, D = a.getClip().duration; o.t += dt;
      const left = a.timeScale > 1e-3 ? (D - a.time) / a.timeScale : 1e9;
      oneW = o.hold ? Math.min(1, o.t / 0.1) : Math.min(1, o.t / 0.1, left / 0.15);
      a.setEffectiveWeight(Math.max(0, oneW)); if (!o.hold && o.t > 0.05 && left <= 1e-3) { a.stop(); this.one = null; oneW = 0; }
    }
    this.oneW = oneW;
    for (const k of this.loco) {
      this.w[k] = lerp(this.w[k], want[k], kk); const a = this.acts[k];
      a.setEffectiveWeight(this.w[k] * (1 - oneW));
      if (k === 'nado') a.timeScale = s < 0.12 ? 0.3 : clamp(s / 1.4, 0.4, 2.2);
      else if (k !== 'idle') { const v = N[k] || 1; a.timeScale = s < 0.12 ? (this.acts.idle ? 1 : 0.06) : clamp(s / v, 0.35, 2.4); }
    }
    if (this.dead && !this.acts.morte) { this.tip = Math.min(1, this.tip + dt * 2.5); this.o.rotation.z = this.tip * Math.PI / 2 * 0.95; }
    this.mixer.update(dt);
  }
}
