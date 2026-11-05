// Os jogos do Coliseu. A cada dia de jogo (a manhã que chega, ou C para passar o tempo) o programa muda:
//   munus     — combates de gladiadores (mirmilão × trácio, com o juiz), a plateia de pé quando um cai
//   venatio   — caçada: venatores com lanças contra as feras (crocodilos do Nilo, como nos jogos de Augusto)
//   pompa     — o desfile de abertura: gladiadores, músicos e o organizador dão a volta na arena, depois um combate
//   naumachia — batalha naval na Naumaquia de Trajano, além do Tibre (o Coliseu fica vazio, varrendo a areia)
// À noite não há jogos. A plateia é uma multidão instanciada (barata), que balança e se levanta nos momentos fortes.
import * as THREE from 'three';
import { makeCrowd } from '../comum/plateia.js';
import { Bout, Blood, GATE } from './combate.js';
import { Hunt } from './caca.js';
import { COL, rowCutNS } from './coliseu.js';
import { makeHumanoid, animateHumanoid, playOnce, loadAnims, rigDetail } from '../comum/mixamo.js';
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
    this.scene = scene; this.city = city; this.info = info; this.audio = audio;
    this.watching = false; this.toast = (m, k, ms) => { if (this.watching) toast(m, k, ms); }; // (os avisos do que acontece na arena só aparecem para quem está lá dentro assistindo)
    this.day = 0; this.lastPhase = null; this.event = PROGRAM[0]; this.seenDay = -1;
    this.excite = 0; this.t = 0;
    // ---- plateia
    const C = COL, Y = C.y, TAU = Math.PI * 2, step = TAU / C.aisles, seats = [];
    const fill = quality === 'alto' ? 0.62 : quality === 'leve' ? 0.4 : 0.22;
    for (let k = 0; k < C.rows; k++) {
      const d = C.podium + (k + 0.45) * C.row, r = (C.a0 + C.b0) / 2 + d, y = Y + C.podiumH + C.rise * (k + 1);
      const n = Math.floor((TAU * r) / 0.62), cutNS = rowCutNS(k);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU, da = Math.abs(((th / step) % 1 + 1.5) % 1 - 0.5) * step;
        if (da * r < C.aisleW + 0.3 || rand() > fill) continue;
        if (cutNS && Math.abs((C.a0 + d) * Math.cos(th)) < C.gate + 0.9) continue; // (ali a fileira para na parede do túnel norte/sul)
        const dc = C.podium + (k - 0.1) * C.row; // (o cartão fica na beirada do degrau: as pernas descem pela frente, não por dentro da pedra)
        seats.push([(C.a0 + dc) * Math.cos(th), y, (C.b0 + dc) * Math.sin(th), th, k]);
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
    // perto de quem está na arquibancada, a plateia é gente de verdade: bonecos sentados no degrau (os mesmos do resto
    // do jogo), que se levantam e gritam quando a luta esquenta. Eles vão para os lugares mais perto de quem anda pelos
    // degraus; os cartões desses lugares somem. De longe, os cartões bastam.
    this.seats = seats; this.cardMat = seats.map((_, i) => { const m4 = new THREE.Matrix4(); im.getMatrixAt(i, m4); return m4; });
    this.pool = []; this.poolT = 0; this.hidden = new Set(); this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    { const LK = [(c) => ({ outfit: 'chiton', cloth: c, border: null, beard: rand() < 0.6 ? 'short' : null, base: 'bryce' }), (c) => ({ outfit: 'chiton', cloth: c, border: 0x8e2c22, beard: 'full', base: 'brian' }),
        (c) => ({ outfit: 'peplos', cloth: c, border: 0xd8b45a, hair: 'veil', veilColor: pick([0xf2ecdc, 0xd8c8a8, 0x8e6a4a]) }), (c) => ({ outfit: 'peplos', cloth: c, border: null, hair: 'up' })];
      const nP = quality === 'alto' ? 22 : quality === 'leve' ? 14 : 7;
      for (let i = 0; i < nP; i++) { const r = makeHumanoid(LK[i % 4](pick(tunics))); if (r.skirt) r.skirt.visible = false; r.root.visible = false; scene.add(r.root); this.pool.push({ r, seat: -1, ph: rand() * 9 }); } }
    // ---- lutadores, juiz, venatores e feras (criados uma vez; aparecem conforme o programa)
    const skin = () => pick([0xc8a07e, 0xb48662, 0xa87a58, 0x8a5a3a, 0xd2aa8a]);
    const fighter = (kind) => {
      const look = kind === 'murmillo' ? { outfit: 'worker', skin: skin(), extras: ['murmillo', 'scutum', 'gladius', 'manica'], shieldColor: 0x9a2a1e, beard: 'short' }
        : kind === 'thraex' ? { outfit: 'worker', skin: skin(), extras: ['thraex', 'parmula', 'sica', 'manica'], shieldColor: 0x2a4a8a, beard: 'short' }
        : kind === 'retiarius' ? { outfit: 'worker', skin: skin(), extras: ['trident', 'net', 'galerus'], beard: 'short' }
        : kind === 'secutor' ? { outfit: 'worker', skin: skin(), extras: ['secutor', 'scutum', 'gladius', 'manica'], shieldColor: 0x2a6a3a, beard: 'short' }
        : kind === 'hoplomachus' ? { outfit: 'worker', skin: skin(), extras: ['thraex', 'parmula', 'spear', 'manica'], shieldColor: 0xb8862a, beard: 'short' }
        : kind === 'judge' ? { outfit: 'chiton', cloth: 0xf2ece0, border: 0x8e2c22, beard: 'full', extras: ['rudis'] }
        : kind === 'venator' ? { outfit: 'chiton', cloth: pick([0x8a6a3a, 0x6a7a4a, 0x9a3a28, 0xc8b89a]), border: null, skin: skin(), beard: rand() < 0.5 ? 'short' : null, extras: rand() < 0.5 ? ['spear', 'manica'] : ['spear', 'parmula'], shieldColor: 0x6a4a2a }
        : kind === 'musician' ? { outfit: 'chiton', cloth: 0xd8c8a0, border: 0x8e2c22, skin: skin() }
        : kind === 'bearer' ? { outfit: 'worker', cloth: 0x4a3a2a, skin: skin(), beard: 'short' }
        : { outfit: 'chiton', cloth: 0xb0402c, border: 0xd8b45a, beard: 'short', extras: ['lorica', 'galea'] };
      const r = makeHumanoid(look); r.root.visible = false; r.root.userData.cullFar = 200; scene.add(r.root); this.rigs.push(r); // (vistos de qualquer degrau da arquibancada)
      return { r, kind, pos: new THREE.Vector3(), h: 0, hp: 1, down: false };
    };
    // várias lutas ao mesmo tempo, cada uma com o seu árbitro, espalhadas pela arena: mirmilão × trácio, reciário ×
    // secutor, hoplômaco × mirmilão, trácio × hoplômaco... (os golpes do Mixamo chegam depois; até lá, o golpe simples)
    this.rigs = []; loadAnims(['gl_guarda', 'gl_lado', 'gl_alto', 'gl_baixo', 'gl_desce', 'gl_combo', 'gl_forte', 'gl_cabo', 'gl_chute', 'gl_bloqueio', 'gl_impacto', 'gl_cabeca', 'gl_morte_f', 'gl_morte_t', 'gl_vitoria']);
    const nB = quality === 'alto' ? 6 : quality === 'leve' ? 5 : 3, homes = [[-14, -6], [12, 6], [-1, -8], [-14, 7], [12, -7], [0, 7]];
    const kinds = [['murmillo', 'thraex'], ['retiarius', 'secutor'], ['hoplomachus', 'murmillo'], ['thraex', 'hoplomachus'], ['secutor', 'retiarius'], ['murmillo', 'thraex']];
    this.blood = new Blood(scene, Y);
    this.bouts = []; for (let i = 0; i < nB; i++) this.bouts.push(new Bout(this, fighter(kinds[i][0]), fighter(kinds[i][1]), fighter('judge'), homes[i]));
    // os carregadores de Libitina: esperam na porta e, quando um gladiador morre, vão buscá-lo e o arrastam para fora
    this.bearers = [fighter('bearer'), fighter('bearer')]; this.bodies = [];
    this.carry = (bout, body) => this.bodies.push({ bout, body });
    this.parade = [fighter('murmillo'), fighter('thraex'), fighter('musician'), fighter('musician'), fighter('venator'), fighter('legion'), fighter('legion')];
    this.venatores = []; for (let i = 0, n = quality === 'alto' ? 7 : quality === 'leve' ? 5 : 3; i < n; i++) this.venatores.push(fighter('venator'));
    this.huntSys = new Hunt(this, this.venatores);
    // feras: cada dia de caçada traz uma (crocodilos do Nilo, leões da África, ursos da Dalmácia)
    this.beasts = []; this.beastKind = 'jacare';
    const q3 = quality === 'alto' ? 0 : quality === 'leve' ? 1 : 2;
    const BEASTS = { leao: [2.4, [4, 3, 2][q3]], urso: [2.1, [3, 2, 1][q3]], touro: [2.7, [3, 2, 1][q3]], jacare: [3.2, [3, 2, 1][q3]] }; // leões em toda caçada, e a fera do dia
    for (const [kind, [size, n]] of Object.entries(BEASTS)) for (let i = 0; i < n; i++) creature(kind, size, { still: true }).then((c) => {
      if (!c) return;
      const b = { ...c, kind, size, pos: new THREE.Vector3(rr(-10, 10), Y, rr(-6, 6)), h: rand() * 6, v: 0, acts: {} };
      if (c.mixer) for (const cl of c.clips) b.acts[cl.name] = c.mixer.clipAction(cl);
      const pickA = (...names) => names.map((n) => b.acts[n] || Object.entries(b.acts).find(([k]) => k.toLowerCase().endsWith('_' + n.toLowerCase()))?.[1]).find(Boolean) || Object.values(b.acts)[0];
      b.aWalk = pickA('Walk', 'Play', 'Unreal Take'); b.aRun = pickA('Run', 'Trot', 'Walk', 'Play', 'Unreal Take'); b.aIdle = pickA('Stand_Idle_01', 'Idle'); b.aAtk = pickA('Attack_StandAngry_01_High');
      for (const ac of new Set([b.aWalk, b.aRun, b.aIdle, b.aAtk])) if (ac) { ac.play(); ac.setEffectiveWeight(0); }
      c.mixer?.update(0.01); c.holder.updateMatrixWorld(true);
      let lo = 1e9; const v = new THREE.Vector3();
      c.holder.traverse((m) => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position; for (let j = 0; j < p.count; j += 9) { m.getVertexPosition(j, v); m.localToWorld(v); lo = Math.min(lo, v.y); } });
      if (lo < 1e8) c.o.position.y -= lo - c.holder.position.y;
      c.holder.visible = false; c.holder.userData.cullFar = 200; scene.add(c.holder); this.beasts.push(b);
    });
  }

  // fim de uma luta: entram dois novos (os mesmos lutadores, outra luta), depois de um respiro
  nextPairing(b) { b.reset(); b.wait = rr(3, 8); }

  // dia de jogo: muda quando chega uma manhã nova
  onTime(phase) {
    if (this.lastPhase === 'noite' && phase === 'manha') { this.blood.clear(); this.huntSys.wave = 0; this.huntSys.active = []; this.day++; this.event = PROGRAM[this.day % PROGRAM.length]; this.beastKind = ['jacare', 'leao', 'urso', 'touro'][Math.floor(this.day / PROGRAM.length) % 4]; this.toast(`Novo dia em Roma — no programa: ${this.event.name}.`, 'quest', 6000); }
    this.lastPhase = phase;
  }

  update(dt, t, player, night) {
    this.t = t;
    const C = COL, Y = C.y, p = player.pos;
    const near = Math.hypot(p.x - C.x, p.z - C.z) < 260;
    const ev = night > 0.5 ? null : this.event;
    const show = near && ev && ev.id !== 'naumachia';
    this.crowd.visible = !!show;
    this.updatePool(dt, t, p, !!show);
    this.uTime.value = t;
    this.excite = Math.max(0, this.excite - dt * 0.35); this.uExcite.value = this.excite;
    // cartaz ao entrar no Coliseu (uma vez por dia)
    const dIn = Math.hypot(p.x / (C.A), p.z / (C.B)) < 1; this.watching = dIn;
    if (dIn && this.seenDay !== this.day) { this.seenDay = this.day; this.info({ tag: 'Programa do dia', name: night > 0.5 ? 'Noite no Coliseu' : this.event.name, era: `Dia ${this.day + 1} dos jogos · Roma, 117 d.C.`, story: night > 0.5 ? 'À noite não há espetáculo: os escravos limpam as arquibancadas e trocam a areia da arena. Volte de manhã (ou aperte C para passar o tempo).' : this.event.desc, foot: 'A cada novo dia o programa muda: gladiadores, caçada, desfile, batalha naval.' }); }
    const vis = (arr, on) => arr.forEach((f) => { f.r.root.visible = on; });
    const fightOn = show && (ev.id === 'munus' || ev.id === 'pompa');
    this.bouts.forEach((b, i) => { b.visible = fightOn && (ev.id === 'munus' || i === 0); });
    this.blood.update(dt, !!show);
    vis(this.parade, show && ev.id === 'pompa');
    vis(this.venatores, show && ev.id === 'venatio');
    this.beasts.forEach((b) => { b.holder.visible = show && ev.id === 'venatio' && this.huntSys.active.includes(b); });
    vis(this.bearers, show && fightOn);
    if (!show) return;
    { const cam = p; for (const r of this.rigs) if (r.root.visible) rigDetail(r, (r.root.position.x - cam.x) ** 2 + (r.root.position.z - cam.z) ** 2 + (r.root.position.y - cam.y) ** 2); } // (de longe, a malha simplificada)
    if (fightOn) this.carryBodies(dt, t);
    if (fightOn) this.bouts.forEach((b, i) => { if (ev.id === 'munus' || i === 0) b.update(dt, t); });
    if (ev.id === 'pompa') this.procession(dt, t);
    if (ev.id === 'venatio') this.huntSys.update(dt, t);
  }

  // a gente de verdade nos degraus perto de quem está na arquibancada
  updatePool(dt, t, p, show) {
    const C = COL, im = this.crowd; let changed = false;
    const free = (m) => { if (m.seat >= 0 && !this.hidden.has(m.seat)) { im.setMatrixAt(m.seat, this.cardMat[m.seat]); changed = true; } m.seat = -1; m.r.root.visible = false; };
    const showCards = () => { for (const i of this.hidden) im.setMatrixAt(i, this.cardMat[i]); changed = this.hidden.size > 0 || changed; this.hidden.clear(); };
    const inStands = show && Math.hypot(p.x / (C.a0 + C.D + 2), p.z / (C.b0 + C.D + 2)) < 1 && p.y > C.y + C.podiumH - 1;
    if (!inStands) { if (this.pool.some((m) => m.seat >= 0) || this.hidden.size) { this.pool.forEach(free); showCards(); im.instanceMatrix.needsUpdate = true; } return; }
    if ((this.poolT -= dt) <= 0) {
      this.poolT = 0.5;
      const near = [], cp = this.cam; for (let i = 0; i < this.seats.length; i++) { const s = this.seats[i], d2 = (s[0] - p.x) ** 2 + (s[2] - p.z) ** 2 + (s[1] - p.y) ** 2; if (d2 < 18 * 18 && d2 > 2.6 && (!cp || (s[0] - cp.x) ** 2 + (s[2] - cp.z) ** 2 > 2.6)) near.push([d2, i]); } // (ninguém senta onde está o explorador nem na frente da câmera)
      near.sort((a, b) => a[0] - b[0]); const want = new Set(near.slice(0, this.pool.length).map((q) => q[1]));
      // de perto, cartão nenhum: até onde vai a gente de verdade (e em volta do explorador e da câmera) os outros lugares
      // ficam vazios — um cartão a dois metros parece o que é, uma foto recortada
      { const rr2 = Math.max(36, near.length >= this.pool.length ? near[this.pool.length - 1][0] : 18 * 18), hide = new Set();
        for (let i = 0; i < this.seats.length; i++) { const s = this.seats[i]; if ((s[0] - p.x) ** 2 + (s[2] - p.z) ** 2 + (s[1] - p.y) ** 2 <= rr2 || (cp && (s[0] - cp.x) ** 2 + (s[2] - cp.z) ** 2 + (s[1] - cp.y) ** 2 < 36)) hide.add(i); }
        for (const i of this.hidden) if (!hide.has(i)) { im.setMatrixAt(i, this.cardMat[i]); changed = true; }
        for (const i of hide) if (!this.hidden.has(i)) { im.setMatrixAt(i, this.zero); changed = true; }
        this.hidden = hide; }
      for (const m of this.pool) if (m.seat >= 0 && !want.has(m.seat)) free(m);
      for (const m of this.pool) if (m.seat >= 0) want.delete(m.seat);
      for (const m of this.pool) { if (m.seat >= 0) continue; const i = want.values().next().value; if (i === undefined) break; want.delete(i); m.seat = i; m.r.root.visible = true; }
    }
    if (changed) im.instanceMatrix.needsUpdate = true;
    for (const m of this.pool) {
      if (m.seat < 0) continue;
      const [, y, , th, k] = this.seats[m.seat], podium = k < 0;
      // sentado na beirada do degrau, os pés no degrau de baixo; no pódio, no banco de mármore. Na hora boa, de pé.
      const stand = this.excite > 0.55 && ((m.seat * 0.618) % 1) < this.excite * 0.6;
      const d = stand ? C.podium + (k + 0.45) * C.row : C.podium + k * C.row + 0.15;
      if (podium) m.r.root.position.set(this.seats[m.seat][0], y - 0.45, this.seats[m.seat][2]); // (no banco do senador)
      else m.r.root.position.set((C.a0 + d) * Math.cos(th), stand ? y : y - 0.45, (C.b0 + d) * Math.sin(th));
      m.r.root.rotation.y = Math.atan2(-Math.cos(th) / (C.a0 + d), -Math.sin(th) / (C.b0 + d));
      animateHumanoid(m.r, dt, 0, stand ? 'idle' : 'sit', t + m.ph);
      rigDetail(m.r, (m.r.root.position.x - p.x) ** 2 + (m.r.root.position.z - p.z) ** 2);
    }
  }

  // os carregadores vão até o morto, o pegam pelos pés e o arrastam até a porta; lá ele some e a luta seguinte começa
  carryBodies(dt, t) {
    const [m1, m2] = this.bearers, Y = COL.y, job = this.bodies[0];
    const go = (f, x, z, sp) => { const dx = x - f.pos.x, dz = z - f.pos.z, d = Math.hypot(dx, dz), s = Math.min(d, sp * dt); if (d > 0.05) { f.pos.x += dx / d * s; f.pos.z += dz / d * s; f.h = angleLerp(f.h, Math.atan2(dx, dz), Math.min(1, dt * 6)); } f.pos.y = Y; f.r.root.position.copy(f.pos); f.r.root.rotation.set(0, f.h, 0); animateHumanoid(f.r, dt, d > 0.3 ? sp : 0, d > 0.3 ? 'walk' : 'idle', t); return d < 0.4; };
    // (esperam dentro do túnel, encostados mas longe das ombreiras do portão: antes ficavam enfiados na parede)
    const wx = GATE.x - 4, wz = 0.95;
    if (!m1.pos.lengthSq()) { m1.pos.set(wx, Y, -wz); m2.pos.set(wx, Y, wz); m1.h = m2.h = Math.PI / 2; }
    if (!job) { for (const [f, z] of [[m1, -wz], [m2, wz]]) if (go(f, wx, z, 1.2)) f.h = angleLerp(f.h, Math.PI / 2, Math.min(1, dt * 3)); return; } // (parados, olham para a arena)
    const B = job.body;
    // (passam sempre pelo meio da porta, na ida e na volta: em linha reta até o morto, cortavam a quina do portão)
    if (!job.got) { if (!job.out) { const a = go(m1, GATE.x + 0.8, -0.6, 2.2), b = go(m2, GATE.x + 0.8, 0.6, 2.2); if (a && b) job.out = true; return; }
      const a = go(m1, B.pos.x - 0.5, B.pos.z - 0.6, 2.2), b = go(m2, B.pos.x + 0.5, B.pos.z - 0.6, 2.2); if (a && b) job.got = true; return; }
    let a;
    if (!job.door) { a = go(m1, GATE.x + 1.2, -0.5, 1.1); const b = go(m2, GATE.x + 1.2, 0.5, 1.1); if (a && b) job.door = true; a = false; }
    else { const tx = GATE.x - 3; a = go(m1, tx, -0.5, 1.1); go(m2, tx, 0.5, 1.1); }
    B.pos.set((m1.pos.x + m2.pos.x) / 2 + Math.sin(m1.h) * -1.2, Y, (m1.pos.z + m2.pos.z) / 2 + Math.cos(m1.h) * -1.2); B.r.root.position.copy(B.pos); // (arrastado atrás deles)
    if (a) { B.gone = true; B.r.root.visible = false; job.bout.body = null; this.bodies.shift(); }
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

}
