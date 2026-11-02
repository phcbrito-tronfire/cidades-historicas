// Os jogos do Coliseu. A cada dia de jogo (a manhã que chega, ou C para passar o tempo) o programa muda:
//   munus     — combates de gladiadores (mirmilão × trácio, com o juiz), a plateia de pé quando um cai
//   venatio   — caçada: venatores com lanças contra as feras (crocodilos do Nilo, como nos jogos de Augusto)
//   pompa     — o desfile de abertura: gladiadores, músicos e o organizador dão a volta na arena, depois um combate
//   naumachia — batalha naval na Naumaquia de Trajano, além do Tibre (o Coliseu fica vazio, varrendo a areia)
// À noite não há jogos. A plateia é uma multidão instanciada (barata), que balança e se levanta nos momentos fortes.
import * as THREE from 'three';
import { makeCrowd } from '../comum/plateia.js';
import { COL } from './coliseu.js';
import { makeHumanoid, animateHumanoid, playOnce } from '../comum/mixamo.js';
import { creature } from '../comum/fauna.js';
import { rr, rand, pick, angleLerp, lerp } from '../comum/util.js';

export const PROGRAM = [
  { id: 'munus', name: 'Munus — combates de gladiadores', desc: 'Hoje há combates de gladiadores: o mirmilão, com o escudo grande e o elmo de peixe, contra o trácio, de espada curva. O juiz (summa rudis) separa quando é preciso.' },
  { id: 'venatio', name: 'Venatio — caçada na arena', desc: 'Hoje há caçada: os venatores enfrentam feras trazidas de todo o império — crocodilos do Nilo (como nos jogos de Augusto), leões da África, ursos das montanhas ou touros bravos. As feras sobem do hipogeu pelos elevadores.' },
  { id: 'pompa', name: 'Pompa — o desfile de abertura', desc: 'Hoje abre um novo ciclo de jogos: o desfile dos gladiadores, com trompas e o organizador, e depois o primeiro combate.' },
  { id: 'naumachia', name: 'Naumaquia — batalha naval', desc: 'Hoje não há jogos no Coliseu: a batalha naval é na Naumaquia de Trajano, o lago artificial do outro lado do Tibre.' },
];

export class Games {
  constructor(scene, city, { toast, info, audio, quality, renderer }) {
    this.scene = scene; this.city = city; this.toast = toast; this.info = info; this.audio = audio;
    this.day = 0; this.lastPhase = null; this.event = PROGRAM[0]; this.seenDay = -1;
    this.excite = 0; this.t = 0;
    // ---- plateia
    const C = COL, Y = C.y, TAU = Math.PI * 2, step = TAU / C.aisles, seats = [];
    const fill = quality === 'alto' ? 0.62 : quality === 'leve' ? 0.4 : 0.22;
    for (let k = 0; k < C.rows; k++) {
      const d = C.podium + (k + 0.45) * C.row, r = (C.a0 + C.b0) / 2 + d, y = Y + C.podiumH + C.rise * (k + 1);
      const n = Math.floor((TAU * r) / 0.62);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU, da = Math.abs(((th / step) % 1 + 1.5) % 1 - 0.5) * step;
        if (da * r < C.aisleW + 0.3 || rand() > fill) continue;
        seats.push([(C.a0 + d) * Math.cos(th), y, (C.b0 + d) * Math.sin(th), th, k]);
      }
    }
    // senadores no pódio (de toga branca com a faixa púrpura)
    for (let i = 0; i < 260; i++) { const th = rand() * TAU, d = rr(0.8, 2.2); seats.push([(C.a0 + d) * Math.cos(th), Y + C.podiumH + 0.45, (C.b0 + d) * Math.sin(th), th, -1]); }
    // os bancos de mármore dos senadores (bisellia), um debaixo de cada um
    { const pod = seats.filter((q) => q[4] < 0), bm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.45, 0.5).translate(0, -0.225, 0), new THREE.MeshStandardMaterial({ color: 0xf2eadc, roughness: 0.5 }), pod.length), o3 = new THREE.Object3D();
      pod.forEach(([x, y, z, th], i) => { o3.position.set(x, y, z); o3.rotation.set(0, Math.PI / 2 - th, 0); o3.updateMatrix(); bm.setMatrixAt(i, o3.matrix); });
      bm.receiveShadow = true; bm.castShadow = false; scene.add(bm); this.benches = bm; }
    // gente de verdade: cartões com fotos do boneco humano sentado e de pé (ver comum/plateia.js)
    const crowd = makeCrowd(renderer);
    this.uTime = crowd.uTime; this.uExcite = crowd.uExcite;
    const im = new THREE.InstancedMesh(crowd.geometry, crowd.material, seats.length);
    const d3 = new THREE.Object3D(), col = new THREE.Color();
    const tunics = [0xefe8d8, 0xe4dccb, 0xb0402c, 0x8c3a28, 0xc8a050, 0x6a7a4a, 0x3a5a8a, 0x9a8a70, 0xd8c8a8];
    seats.forEach(([x, y, z, th, k], i) => {
      d3.position.set(x, y, z); d3.rotation.set(0, -th - Math.PI / 2 + Math.PI, 0); d3.scale.setScalar(rr(0.9, 1.08)); d3.updateMatrix();
      im.setMatrixAt(i, d3.matrix);
      im.setColorAt(i, col.set(k < 0 ? 0xf6f2ea : pick(tunics)));
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.visible = false;
    scene.add(im); this.crowd = im;
    // ---- lutadores, juiz, venatores e feras (criados uma vez; aparecem conforme o programa)
    const skin = () => pick([0xc8a07e, 0xb48662, 0xa87a58, 0x8a5a3a, 0xd2aa8a]);
    const fighter = (kind) => {
      const look = kind === 'murmillo' ? { outfit: 'worker', skin: skin(), extras: ['murmillo', 'scutum', 'gladius', 'manica'], shieldColor: 0x9a2a1e, beard: 'short' }
        : kind === 'thraex' ? { outfit: 'worker', skin: skin(), extras: ['thraex', 'parmula', 'sica', 'manica'], shieldColor: 0x2a4a8a, beard: 'short' }
        : kind === 'retiarius' ? { outfit: 'worker', skin: skin(), extras: ['trident', 'net', 'galerus'], beard: 'short' }
        : kind === 'secutor' ? { outfit: 'worker', skin: skin(), extras: ['secutor', 'scutum', 'gladius', 'manica'], shieldColor: 0x2a6a3a, beard: 'short' }
        : kind === 'judge' ? { outfit: 'chiton', cloth: 0xf2ece0, border: 0x8e2c22, beard: 'full', extras: ['rudis'] }
        : kind === 'venator' ? { outfit: 'chiton', cloth: pick([0x8a6a3a, 0x6a7a4a]), border: null, skin: skin(), extras: ['spear'] }
        : kind === 'musician' ? { outfit: 'chiton', cloth: 0xd8c8a0, border: 0x8e2c22, skin: skin() }
        : { outfit: 'chiton', cloth: 0xb0402c, border: 0xd8b45a, beard: 'short', extras: ['lorica', 'galea'] };
      const r = makeHumanoid(look); r.root.visible = false; scene.add(r.root);
      return { r, kind, pos: new THREE.Vector3(), h: 0, hp: 1, down: false };
    };
    // duplas clássicas: mirmilão contra trácio, e o reciário (rede e tridente, quase sem armadura) contra o secutor
    this.pairs = [[fighter('murmillo'), fighter('thraex')], [fighter('retiarius'), fighter('secutor')]];
    this.pair = this.pairs[0]; this.pairIdx = 0;
    this.judge = fighter('judge');
    this.parade = [fighter('murmillo'), fighter('thraex'), fighter('musician'), fighter('musician'), fighter('venator'), fighter('legion'), fighter('legion')];
    this.venatores = [fighter('venator'), fighter('venator')];
    // feras: cada dia de caçada traz uma (crocodilos do Nilo, leões da África, ursos da Dalmácia)
    this.beasts = []; this.beastKind = 'jacare';
    const BEASTS = { jacare: [3.2, 2], leao: [2.4, 2], urso: [2.1, 2], touro: [2.7, 2] };
    for (const [kind, [size, n]] of Object.entries(BEASTS)) for (let i = 0; i < n; i++) creature(kind, size, { still: true }).then((c) => {
      if (!c) return;
      const b = { ...c, kind, pos: new THREE.Vector3(rr(-10, 10), Y, rr(-6, 6)), h: rand() * 6, v: 0, acts: {} };
      if (c.mixer) for (const cl of c.clips) b.acts[cl.name] = c.mixer.clipAction(cl);
      const pickA = (...names) => names.map((n) => b.acts[n] || Object.entries(b.acts).find(([k]) => k.toLowerCase().endsWith('_' + n.toLowerCase()))?.[1]).find(Boolean) || Object.values(b.acts)[0];
      b.aWalk = pickA('Walk', 'Play', 'Unreal Take'); b.aRun = pickA('Run', 'Trot', 'Walk', 'Play', 'Unreal Take'); b.aIdle = pickA('Stand_Idle_01', 'Idle'); b.aAtk = pickA('Attack_StandAngry_01_High');
      for (const ac of new Set([b.aWalk, b.aRun, b.aIdle, b.aAtk])) if (ac) { ac.play(); ac.setEffectiveWeight(0); }
      c.mixer?.update(0.01); c.holder.updateMatrixWorld(true);
      let lo = 1e9; const v = new THREE.Vector3();
      c.holder.traverse((m) => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position; for (let j = 0; j < p.count; j += 9) { m.getVertexPosition(j, v); m.localToWorld(v); lo = Math.min(lo, v.y); } });
      if (lo < 1e8) c.o.position.y -= lo - c.holder.position.y;
      c.holder.visible = false; scene.add(c.holder); this.beasts.push(b);
    });
    this.resetBout();
  }

  resetBout() {
    if (this.pairs) { this.pairIdx = (this.pairIdx + 1) % this.pairs.length; this.pairs.forEach((pr) => pr.forEach((f) => { f.r.root.visible = false; })); this.pair = this.pairs[this.pairIdx]; }
    const [a, b] = this.pair;
    a.down = b.down = false; this.boutT = 0; this.boutEnd = rr(30, 48);
    for (const f of this.pair) { f.r.once = null; f.pos.set(0, 0, 0); }
    this.loser = rand() < 0.5 ? 0 : 1;
    this.ax = rand() * 6; this.cx = this.event?.id === 'pompa' ? 8 : -4; this.cz = 0; this.dist = 2.2;
    this.phase = 'guard'; this.phaseT = rr(0.8, 1.6); this.atk = 0;
  }
  // dia de jogo: muda quando chega uma manhã nova
  onTime(phase) {
    if (this.lastPhase === 'noite' && phase === 'manha') { this.day++; this.event = PROGRAM[this.day % PROGRAM.length]; this.beastKind = ['jacare', 'leao', 'urso', 'touro'][Math.floor(this.day / PROGRAM.length) % 4]; this.toast(`Novo dia em Roma — no programa: ${this.event.name}.`, 'quest', 6000); }
    this.lastPhase = phase;
  }

  update(dt, t, player, night) {
    this.t = t;
    const C = COL, Y = C.y, p = player.pos;
    const near = Math.hypot(p.x - C.x, p.z - C.z) < 260;
    const ev = night > 0.5 ? null : this.event;
    const show = near && ev && ev.id !== 'naumachia';
    this.crowd.visible = !!show;
    this.uTime.value = t;
    this.excite = Math.max(0, this.excite - dt * 0.35); this.uExcite.value = this.excite;
    // cartaz ao entrar no Coliseu (uma vez por dia)
    const dIn = Math.hypot(p.x / (C.A), p.z / (C.B)) < 1;
    if (dIn && this.seenDay !== this.day) { this.seenDay = this.day; this.info({ tag: 'Programa do dia', name: night > 0.5 ? 'Noite no Coliseu' : this.event.name, era: `Dia ${this.day + 1} dos jogos · Roma, 117 d.C.`, story: night > 0.5 ? 'À noite não há espetáculo: os escravos limpam as arquibancadas e trocam a areia da arena. Volte de manhã (ou aperte C para passar o tempo).' : this.event.desc, foot: 'A cada novo dia o programa muda: gladiadores, caçada, desfile, batalha naval.' }); }
    const vis = (arr, on) => arr.forEach((f) => { f.r.root.visible = on; });
    const fightOn = show && (ev.id === 'munus' || ev.id === 'pompa');
    this.pairs.forEach((pr) => vis(pr, fightOn && pr === this.pair)); this.judge.r.root.visible = fightOn;
    vis(this.parade, show && ev.id === 'pompa');
    vis(this.venatores, show && ev.id === 'venatio');
    this.beasts.forEach((b) => { b.holder.visible = show && ev.id === 'venatio' && b.kind === this.beastKind; });
    if (!show) return;
    if (fightOn) this.bout(dt, t);
    if (ev.id === 'pompa') this.procession(dt, t);
    if (ev.id === 'venatio') this.hunt(dt, t);
  }

  // combate: os dois sempre de frente um para o outro. Na guarda rodeiam devagar mantendo a distância; no ataque, quem
  // ataca avança com o golpe e o outro recua um passo com o escudo — a dupla "anda" pela arena com o embalo. Às vezes
  // vem o contra-ataque na hora. No fim um cai, a plateia se levanta, e entra outro par.
  bout(dt, t) {
    const C = COL, Y = C.y, [a, b] = this.pair;
    this.boutT += dt;
    const over = this.boutT > this.boutEnd;
    if (over && !a.down && !b.down) { const L = this.pair[this.loser]; L.down = true; playOnce(L.r, 'desmaiar', 4.5); this.excite = 1; this.audio?.chime?.(); }
    if (this.boutT > this.boutEnd + 9) this.resetBout();
    this.phaseT -= dt;
    let want = 2.1, push = 0;
    if (!over) {
      if (this.phase === 'guard') {
        this.ax += dt * 0.35 * Math.sin(t * 0.4 + 1);
        want = 2.0 + Math.sin(t * 1.3) * 0.25;
        if (this.phaseT <= 0) { this.phase = 'attack'; this.phaseT = 0.95; this.atk = rand() < 0.6 ? 1 - this.atk : this.atk; playOnce(this.pair[this.atk].r, 'espada', 0.95); if (rand() < 0.35) this.excite = Math.max(this.excite, 0.45); }
      } else {
        const k = 1 - this.phaseT / 0.95; // progresso do golpe
        want = k < 0.45 ? 1.35 : 1.7; push = k < 0.6 ? 1.6 : 0.4; // quem ataca empurra a dupla para o lado de quem defende
        if (this.phaseT <= 0) {
          if (rand() < 0.3) { this.phase = 'attack'; this.phaseT = 0.95; this.atk = 1 - this.atk; playOnce(this.pair[this.atk].r, 'espada', 0.95); } // contra-ataque
          else { this.phase = 'guard'; this.phaseT = rr(0.7, 1.8); }
        }
      }
    }
    // centro da dupla anda na direção do defensor; não sai da arena
    const dx = Math.cos(this.ax), dz = Math.sin(this.ax), sg = this.atk === 0 ? 1 : -1;
    this.cx += dx * push * sg * dt; this.cz += dz * push * sg * dt;
    const kk = Math.hypot(this.cx / (C.a0 - 5), this.cz / (C.b0 - 5)); if (kk > 1) { this.cx /= kk; this.cz /= kk; this.ax += dt * 1.2; }
    this.dist = lerp(this.dist, want, Math.min(1, dt * 5));
    [a, b].forEach((f, i) => {
      const s2 = i === 0 ? -1 : 1, tx = this.cx + dx * s2 * this.dist / 2, tz = this.cz + dz * s2 * this.dist / 2;
      if (!f.pos.lengthSq()) f.pos.set(tx, Y, tz);
      const ox = f.pos.x, oz = f.pos.z;
      if (!f.down) { f.pos.x = lerp(f.pos.x, tx, Math.min(1, dt * 8)); f.pos.z = lerp(f.pos.z, tz, Math.min(1, dt * 8)); }
      f.pos.y = Y; f.r.root.position.copy(f.pos);
      const o = this.pair[1 - i];
      if (!f.down) f.h = angleLerp(f.h, Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z), Math.min(1, dt * 10));
      f.r.root.rotation.y = f.h;
      // passo: a velocidade para a frente (do jeito que ele olha) escolhe andar ou ficar em guarda
      const fwd = ((f.pos.x - ox) * Math.sin(f.h) + (f.pos.z - oz) * Math.cos(f.h)) / Math.max(dt, 1e-4);
      f.spd = lerp(f.spd || 0, fwd, Math.min(1, dt * 8));
      animateHumanoid(f.r, dt, Math.max(0, f.spd), f.down || over || f.spd < 0.25 ? 'idle' : 'walk', t);
    });
    // juiz: acompanha de lado, a uns 3,5 m, olhando a luta
    const J = this.judge, jx = this.cx + Math.cos(this.ax + Math.PI / 2) * 3.6, jz = this.cz + Math.sin(this.ax + Math.PI / 2) * 3.6;
    if (!J.pos.lengthSq()) J.pos.set(jx, Y, jz);
    const ox = J.pos.x, oz = J.pos.z;
    J.pos.set(lerp(J.pos.x, jx, Math.min(1, dt * 1.5)), Y, lerp(J.pos.z, jz, Math.min(1, dt * 1.5))); J.r.root.position.copy(J.pos);
    J.h = angleLerp(J.h, Math.atan2(this.cx - J.pos.x, this.cz - J.pos.z), Math.min(1, dt * 4)); J.r.root.rotation.y = J.h;
    const js = Math.hypot(J.pos.x - ox, J.pos.z - oz) / Math.max(dt, 1e-4);
    animateHumanoid(J.r, dt, js, js > 0.3 ? 'walk' : 'idle', t);
  }

  // desfile: a fila dá a volta na arena pela beirada
  procession(dt, t) {
    const C = COL, Y = C.y;
    this.parade.forEach((f, i) => {
      const th = t * 0.06 - i * 0.075, x = (C.a0 - 3) * Math.cos(th), z = (C.b0 - 3) * Math.sin(th);
      const nx = (C.a0 - 3) * Math.cos(th + 0.01), nz = (C.b0 - 3) * Math.sin(th + 0.01);
      f.pos.set(x, Y, z); f.r.root.position.copy(f.pos); f.r.root.rotation.y = Math.atan2(nx - x, nz - z);
      animateHumanoid(f.r, dt, 1.3, 'walk', t);
    });
    if (rand() < dt * 0.15) this.excite = Math.max(this.excite, 0.5);
  }

  // caçada: as feras avançam no venator mais perto; ele espeta a lança e a fera recua; às vezes ela foge
  hunt(dt, t) {
    const C = COL, Y = C.y;
    this.venatores.forEach((v, i) => {
      if (!v.pos.lengthSq()) v.pos.set(i ? 8 : -8, Y, i ? 3 : -3);
      const prey = this.beasts.reduce((m, b) => (!m || b.pos.distanceTo(v.pos) < m.pos.distanceTo(v.pos) ? b : m), null);
      if (prey) {
        const d = prey.pos.distanceTo(v.pos);
        v.h = angleLerp(v.h, Math.atan2(prey.pos.x - v.pos.x, prey.pos.z - v.pos.z), Math.min(1, dt * 4));
        if (d < 3.4 && !v.r.once && rand() < dt * 3) { playOnce(v.r, 'espada', 0.95); prey.flee = 1.6; this.excite = Math.max(this.excite, 0.6); }
        const back = d < 2.2 ? -1.2 : d > 6 ? 1 : 0;
        v.pos.x += Math.sin(v.h) * back * dt * 1.4; v.pos.z += Math.cos(v.h) * back * dt * 1.4;
        animateHumanoid(v.r, dt, Math.abs(back) * 1.2, back ? 'walk' : 'idle', t);
      } else animateHumanoid(v.r, dt, 0, 'idle', t);
      const k = Math.hypot(v.pos.x / (C.a0 - 2), v.pos.z / (C.b0 - 2)); if (k > 1) v.pos.multiplyScalar(1 / k);
      v.pos.y = Y; v.r.root.position.copy(v.pos); v.r.root.rotation.y = v.h;
    });
    this.beasts.filter((b) => b.kind === this.beastKind).forEach((b, i) => {
      const tgt = this.venatores[i % 2].pos;
      b.flee = (b.flee || 0) - dt;
      const want = Math.atan2(tgt.x - b.pos.x, tgt.z - b.pos.z) + (b.flee > 0 ? Math.PI : 0);
      b.h = angleLerp(b.h, want, Math.min(1, dt * 1.6));
      const sp = b.flee > 0 ? 2.4 : b.pos.distanceTo(tgt) > 2.6 ? 1.3 : 0;
      b.v = lerp(b.v, sp, Math.min(1, dt * 2));
      b.pos.x += Math.sin(b.h) * b.v * dt; b.pos.z += Math.cos(b.h) * b.v * dt;
      const k = Math.hypot(b.pos.x / (C.a0 - 2.5), b.pos.z / (C.b0 - 2.5)); if (k > 1) b.pos.multiplyScalar(1 / k);
      b.holder.position.set(b.pos.x, Y, b.pos.z); b.holder.rotation.y = b.h;
      if (b.mixer) {
        const near = b.pos.distanceTo(tgt) < 3;
        const w = { idle: b.v < 0.15 && !near ? 1 : 0, walk: b.v >= 0.15 && b.v < 1.8 ? 1 : 0, run: b.v >= 1.8 ? 1 : 0, atk: near && b.v < 0.3 ? 1 : 0 };
        if (!b.aIdle) w.walk += w.idle; if (!b.aAtk) w.walk += w.atk;
        b.wt = b.wt || { idle: 0, walk: 0, run: 0, atk: 0 };
        for (const [k, ac] of [['idle', b.aIdle], ['walk', b.aWalk], ['run', b.aRun], ['atk', b.aAtk]]) { if (!ac) continue; b.wt[k] = lerp(b.wt[k], w[k], Math.min(1, dt * 5)); ac.setEffectiveWeight(b.wt[k]); }
        if (b.aWalk && b.aWalk === b.aRun) b.aWalk.timeScale = Math.max(0.3, b.v * 0.7); // um clipe só (leão): o ritmo segue a velocidade
        b.mixer.update(dt);
      }
    });
  }
}
