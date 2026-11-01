// Os jogos do Coliseu. A cada dia de jogo (a manhã que chega, ou C para passar o tempo) o programa muda:
//   munus     — combates de gladiadores (mirmilão × trácio, com o juiz), a plateia de pé quando um cai
//   venatio   — caçada: venatores com lanças contra as feras (crocodilos do Nilo, como nos jogos de Augusto)
//   pompa     — o desfile de abertura: gladiadores, músicos e o organizador dão a volta na arena, depois um combate
//   naumachia — batalha naval na Naumaquia de Trajano, além do Tibre (o Coliseu fica vazio, varrendo a areia)
// À noite não há jogos. A plateia é uma multidão instanciada (barata), que balança e se levanta nos momentos fortes.
import * as THREE from 'three';
import { COL } from './coliseu.js';
import { makeHumanoid, animateHumanoid, playOnce } from '../comum/mixamo.js';
import { creature } from '../comum/fauna.js';
import { rr, rand, pick, angleLerp, lerp } from '../comum/util.js';

export const PROGRAM = [
  { id: 'munus', name: 'Munus — combates de gladiadores', desc: 'Hoje há combates de gladiadores: o mirmilão, com o escudo grande e o elmo de peixe, contra o trácio, de espada curva. O juiz (summa rudis) separa quando é preciso.' },
  { id: 'venatio', name: 'Venatio — caçada na arena', desc: 'Hoje há caçada: os venatores enfrentam feras trazidas das províncias — hoje, crocodilos do Nilo, como nos jogos de Augusto.' },
  { id: 'pompa', name: 'Pompa — o desfile de abertura', desc: 'Hoje abre um novo ciclo de jogos: o desfile dos gladiadores, com trompas e o organizador, e depois o primeiro combate.' },
  { id: 'naumachia', name: 'Naumaquia — batalha naval', desc: 'Hoje não há jogos no Coliseu: a batalha naval é na Naumaquia de Trajano, o lago artificial do outro lado do Tibre.' },
];

// multidão: corpo + cabeça bem simples, uma instância por espectador, cor da túnica por instância
function crowdGeometry() {
  const body = new THREE.CylinderGeometry(0.17, 0.22, 0.62, 6); body.translate(0, 0.31, 0);
  const head = new THREE.IcosahedronGeometry(0.11, 0); head.translate(0, 0.74, 0);
  const g = new THREE.BufferGeometry();
  const parts = [body.toNonIndexed(), head.toNonIndexed()];
  const n = parts.reduce((a, p) => a + p.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), skin = new Float32Array(n);
  let o = 0;
  parts.forEach((p, i) => { p.computeVertexNormals(); pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); skin.fill(i, o, o + p.attributes.position.count); o += p.attributes.position.count; });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('skin', new THREE.BufferAttribute(skin, 1));
  return g;
}

export class Games {
  constructor(scene, city, { toast, info, audio, quality }) {
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
    for (let i = 0; i < 260; i++) { const th = rand() * TAU, d = rr(0.8, 2.2); seats.push([(C.a0 + d) * Math.cos(th), Y + C.podiumH, (C.b0 + d) * Math.sin(th), th, -1]); }
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
    this.uTime = { value: 0 }; this.uExcite = { value: 0 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime; sh.uniforms.uExcite = this.uExcite;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float skin; uniform float uTime; uniform float uExcite; varying float vSkin;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vSkin = skin;
          float ph = float(gl_InstanceID) * 1.731;
          // balança de leve; na empolgação, levanta e pula
          transformed.y += (sin(uTime * 2.0 + ph) * 0.02 + uExcite * (0.35 + 0.15 * sin(uTime * 9.0 + ph))) * (0.6 + 0.4 * fract(ph));`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSkin;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (vSkin > 0.5) diffuseColor.rgb = vec3(0.62, 0.42, 0.3);');
    };
    const im = new THREE.InstancedMesh(crowdGeometry(), mat, seats.length);
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
        : kind === 'judge' ? { outfit: 'chiton', cloth: 0xf2ece0, border: 0x8e2c22, beard: 'full', extras: ['rudis'] }
        : kind === 'venator' ? { outfit: 'chiton', cloth: pick([0x8a6a3a, 0x6a7a4a]), border: null, skin: skin(), extras: ['spear'] }
        : kind === 'musician' ? { outfit: 'chiton', cloth: 0xd8c8a0, border: 0x8e2c22, skin: skin() }
        : { outfit: 'chiton', cloth: 0xb0402c, border: 0xd8b45a, beard: 'short', extras: ['lorica', 'galea'] };
      const r = makeHumanoid(look); r.root.visible = false; scene.add(r.root);
      return { r, kind, pos: new THREE.Vector3(), h: 0, hp: 1, down: false };
    };
    this.pair = [fighter('murmillo'), fighter('thraex')];
    this.judge = fighter('judge');
    this.parade = [fighter('murmillo'), fighter('thraex'), fighter('musician'), fighter('musician'), fighter('venator'), fighter('legion'), fighter('legion')];
    this.venatores = [fighter('venator'), fighter('venator')];
    this.beasts = [];
    for (let i = 0; i < 2; i++) creature('jacare', 3.2, { still: true }).then((c) => {
      if (!c) return;
      const b = { ...c, pos: new THREE.Vector3(rr(-10, 10), Y, rr(-6, 6)), h: rand() * 6, v: 0 };
      if (c.mixer && c.clips[0]) { b.walk = c.mixer.clipAction(c.clips[0]); b.walk.play(); }
      c.mixer?.update(0.01); c.holder.updateMatrixWorld(true);
      let lo = 1e9; const v = new THREE.Vector3();
      c.holder.traverse((m) => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position; for (let j = 0; j < p.count; j += 9) { m.getVertexPosition(j, v); m.localToWorld(v); lo = Math.min(lo, v.y); } });
      if (lo < 1e8) c.o.position.y -= lo - c.holder.position.y;
      c.holder.visible = false; scene.add(c.holder); this.beasts.push(b);
    });
    this.resetBout();
  }

  resetBout() {
    const [a, b] = this.pair;
    a.down = b.down = false; a.hp = b.hp = 1; this.boutT = 0; this.boutEnd = rr(28, 45); this.cool = 2; this.ang = rand() * 6;
    for (const f of this.pair) { f.r.once = null; }
    this.loser = rand() < 0.5 ? 0 : 1;
  }

  // dia de jogo: muda quando chega uma manhã nova
  onTime(phase) {
    if (this.lastPhase === 'noite' && phase === 'manha') { this.day++; this.event = PROGRAM[this.day % PROGRAM.length]; this.toast(`Novo dia em Roma — no programa: ${this.event.name}.`, 'quest', 6000); }
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
    vis(this.pair, fightOn); this.judge.r.root.visible = fightOn;
    vis(this.parade, show && ev.id === 'pompa');
    vis(this.venatores, show && ev.id === 'venatio');
    this.beasts.forEach((b) => { b.holder.visible = show && ev.id === 'venatio'; });
    if (!show) return;
    if (fightOn) this.bout(dt, t);
    if (ev.id === 'pompa') this.procession(dt, t);
    if (ev.id === 'venatio') this.hunt(dt, t);
  }

  // combate: os dois rodeiam o centro, um ataca, o outro apara; no fim um cai, a plateia se levanta, e outro par entra
  bout(dt, t) {
    const C = COL, Y = C.y, [a, b] = this.pair, cx = this.event.id === 'pompa' ? 8 : -4, cz = 0;
    this.boutT += dt;
    const over = this.boutT > this.boutEnd;
    if (over && !a.down && !b.down) { const L = this.pair[this.loser]; L.down = true; playOnce(L.r, 'desmaiar', 4.5); this.excite = 1; this.audio?.chime?.(); }
    if (this.boutT > this.boutEnd + 9) this.resetBout();
    if (!over) this.ang += dt * 0.35;
    const R = 1.5 + Math.sin(t * 0.7) * 0.25;
    this.cool -= dt;
    [a, b].forEach((f, i) => {
      const o = this.pair[1 - i], an = this.ang + i * Math.PI;
      const tx = cx + Math.cos(an) * R, tz = cz + Math.sin(an) * R;
      if (!f.down) { f.pos.x = lerp(f.pos.x || tx, tx, Math.min(1, dt * 3)); f.pos.z = lerp(f.pos.z || tz, tz, Math.min(1, dt * 3)); }
      f.pos.y = Y; f.r.root.position.copy(f.pos);
      f.h = angleLerp(f.h, Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z), Math.min(1, dt * 6)); f.r.root.rotation.y = f.h;
      if (!f.down && !o.down && !over && this.cool <= 0 && rand() < dt * 2.2) { playOnce(f.r, 'espada', 0.95); this.cool = rr(0.9, 2.2); if (rand() < 0.3) this.excite = Math.max(this.excite, 0.45); }
      animateHumanoid(f.r, dt, f.down ? 0 : 0.7, f.down ? 'idle' : over ? 'idle' : 'walk', t);
    });
    // juiz: fica perto, um pouco de lado, olhando a luta
    const J = this.judge, jx = cx + Math.cos(this.ang + Math.PI / 2) * 3.4, jz = cz + Math.sin(this.ang + Math.PI / 2) * 3.4;
    J.pos.set(lerp(J.pos.x || jx, jx, Math.min(1, dt * 1.5)), Y, lerp(J.pos.z || jz, jz, Math.min(1, dt * 1.5))); J.r.root.position.copy(J.pos);
    J.h = angleLerp(J.h, Math.atan2(cx - J.pos.x, cz - J.pos.z), Math.min(1, dt * 4)); J.r.root.rotation.y = J.h;
    animateHumanoid(J.r, dt, 0.5, 'walk', t);
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
    this.beasts.forEach((b, i) => {
      const tgt = this.venatores[i % 2].pos;
      b.flee = (b.flee || 0) - dt;
      const want = Math.atan2(tgt.x - b.pos.x, tgt.z - b.pos.z) + (b.flee > 0 ? Math.PI : 0);
      b.h = angleLerp(b.h, want, Math.min(1, dt * 1.6));
      const sp = b.flee > 0 ? 2.4 : b.pos.distanceTo(tgt) > 2.6 ? 1.3 : 0;
      b.v = lerp(b.v, sp, Math.min(1, dt * 2));
      b.pos.x += Math.sin(b.h) * b.v * dt; b.pos.z += Math.cos(b.h) * b.v * dt;
      const k = Math.hypot(b.pos.x / (C.a0 - 2.5), b.pos.z / (C.b0 - 2.5)); if (k > 1) b.pos.multiplyScalar(1 / k);
      b.holder.position.set(b.pos.x, Y, b.pos.z); b.holder.rotation.y = b.h;
      if (b.walk) { b.walk.timeScale = b.v > 0.1 ? 0.4 + b.v * 0.6 : 0; b.mixer.update(dt); }
    });
  }
}
