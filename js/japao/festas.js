// Os dias da vila (passam com a tecla C, de noite para manhã): a cada dia um acontecimento.
// - Dia comum: o treino de arco da manhã na raia da residência (as flechas voam até os alvos a 28 m).
// - Dança kagura no santuário: a dançarina (miko) de branco e vermelho, com o leque e o molho de sininhos, no palco.
// - Partida dos peregrinos: a confraria sai do santuário em fila, de madrugada, gritando "Rokkon shōjō".
// - Festa do fogo (Yoshida no Himatsuri, no fim do 7º mês: fecha a temporada de subida): à noite, tochas de pinho
//   de 3 m acesas ao longo de toda a rua — a vila inteira fica dourada.
// Os avisos só aparecem para quem está no lugar do acontecimento.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce, loadAnims } from '../comum/mixamo.js';
import { terrainHeight, STREET, SHRINE } from './terrain.js';
import { rr, rand } from '../comum/util.js';

const V3 = THREE.Vector3;
// A dança da miko (miko-mai): lenta e cerimonial, de frente para o salão do kami. Ela se curva, ergue o molho de
// sininhos (suzu) e o sacode, anda em círculo pelo palco (o "mai" é girar), gira no lugar com a hakama abrindo e
// balança com as mãos juntas em oração; e recomeça. Movimentos do Mixamo (reverência formal, oração balançando, giro,
// braço erguido), mais lentos; o tambor (taiko) marca o tempo e os sininhos tocam quando ela os ergue.
const KG_CLIPS = ['kg_reverencia', 'kg_oracao', 'kg_giro', 'kg_ergue'];
const KG_SEQ = [
  { clip: 'kg_reverencia', speed: 0.7 }, { clip: 'kg_ergue', speed: 0.65, bells: true }, { walk: 0.25, dur: 4.5 },
  { clip: 'kg_giro', speed: 0.75 }, { clip: 'kg_oracao', speed: 0.8, dur: 6 }, { clip: 'kg_ergue', speed: 0.65, bells: true },
  { walk: 0.25, dur: 4.5 }, { clip: 'kg_giro', speed: 0.75 }, { walk: 0.25, dur: 4.5 }, { walk: 0.25, dur: 4.5 },
];
// o suzu: cabo curto, três anéis de sininhos dourados e as cinco fitas coloridas (goshiki) caindo
function suzu() {
  const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xd8b048, metalness: 0.9, roughness: 0.3 });
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); h.position.y = 0.06; g.add(h);
  const bell = new THREE.SphereGeometry(0.014, 8, 6);
  [[0.2, 0.06, 7], [0.25, 0.045, 5], [0.29, 0.03, 3]].forEach(([y, r, n]) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = new THREE.Mesh(bell, gold); b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); g.add(b); } });
  ['#2a7a3a', '#e8c040', '#c0281e', '#f2f0ea', '#4a3a9a'].forEach((c, i) => { const rb = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.42), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 })); rb.position.set(-0.03 + i * 0.015, -0.2, 0.01 * (i - 2)); rb.rotation.y = i * 0.35; g.add(rb); });
  return g;
}
// o leque (hiōgi): branco com o sol vermelho e as bordas douradas
function fan() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#c0281e'; x.beginPath(); x.arc(128, 60, 30, 0, 7); x.fill();
  x.fillStyle = '#d8b048'; x.fillRect(0, 0, 256, 8); x.fillRect(0, 120, 256, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.26, 18, 1, 0, Math.PI * 0.75), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 }));
  const g = new THREE.Group(); m.rotation.set(0, Math.PI / 2, -0.9); g.add(m); return g;
}
export const DAYS = [
  { id: 'comum', label: 'Dia comum', msg: 'Um dia comum na vila: os lavradores nos arrozais, os samurais no treino de arco da manhã.' },
  { id: 'kagura', label: 'Dança kagura', msg: 'Hoje há dança kagura no santuário: a miko dança para os kami no palco do pátio.' },
  { id: 'partida', label: 'Partida dos peregrinos', msg: 'Hoje uma confraria de Edo parte para o cume. Eles saem em fila do santuário, de branco.' },
  { id: 'himatsuri', label: 'Festa do fogo', msg: 'Hoje é a festa do fogo de Yoshida: quando anoitecer, as tochas gigantes de pinho serão acesas na rua.' },
];

export class Festas {
  constructor(scene, city, { toast, glow, audio }) {
    this.scene = scene; this.city = city; this.toast = toast; this.audio = audio;
    this.day = 0; this.seen = new Set(); this.hits = 0; this.onSeen = null;
    // as flechas da raia
    const arrowG = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.95, 4), new THREE.MeshStandardMaterial({ color: 0xc8a878 })); shaft.rotation.x = Math.PI / 2; arrowG.add(shaft);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0xf2f0ea })); fl.position.z = -0.4; arrowG.add(fl);
    this.arrows = []; for (let i = 0; i < 6; i++) { const a = arrowG.clone(); a.visible = false; scene.add(a); this.arrows.push({ g: a, t: -1 }); }
    // a dançarina de kagura (miko): quimono branco, hakama vermelha, leque
    if (city.spots.kagura) { const k = city.spots.kagura; this.miko = makeHumanoid({ outfit: 'kannushi', cloth: 0xf8f6f0, hakama: 0xb8261e, female: true, hair: 'shimada', extras: [] }); this.miko.root.position.set(k.x, k.y, k.z); this.miko.root.visible = false; scene.add(this.miko.root);
      this.miko.handR.add(suzu()); this.miko.handL.add(fan()); loadAnims(KG_CLIPS);
      this.kg = { i: 0, t: 0, ang: 0, face: Math.atan2(10, 14), beat: 0, bellT: 0 }; } // (de frente para o salão do kami)
    // as tochas da festa do fogo: feixes de pinho em pé na beira da rua, com a ponta acesa
    this.fires = []; const bundle = new THREE.CylinderGeometry(0.45, 0.6, 3.2, 10), bm = new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 1 }), rope = new THREE.MeshStandardMaterial({ color: 0xc8b070 });
    const sprite = new THREE.SpriteMaterial({ map: glow, color: 0xff9a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.fireGroup = new THREE.Group(); this.fireGroup.visible = false; scene.add(this.fireGroup);
    for (let z = STREET.z0 + 14; z < STREET.z1 + 30; z += 14) for (const sd of [-1, 1]) {
      const x = STREET.x + sd * (STREET.hw - 0.9), y = terrainHeight(x, z), b = new THREE.Mesh(bundle, bm); b.position.set(x, y + 1.6, z); this.fireGroup.add(b);
      for (const yy of [0.8, 1.8, 2.6]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 4, 12), rope); r.rotation.x = Math.PI / 2; r.position.set(x, y + yy, z); this.fireGroup.add(r); }
      const s = new THREE.Sprite(sprite.clone()); s.scale.setScalar(4.5); s.position.set(x, y + 3.6, z); this.fireGroup.add(s);
      const s2 = new THREE.Sprite(sprite.clone()); s2.material.color.set(0xffd080); s2.scale.setScalar(2.2); s2.position.set(x, y + 3.4, z); this.fireGroup.add(s2);
      this.fires.push({ s, s2, ph: rand() * 6 });
    }
    this.fireLights = [0, 1, 2, 3].map((i) => { const l = new THREE.PointLight(0xff9040, 0, 60, 2); l.position.set(STREET.x, terrainHeight(STREET.x, -380 + i * 120) + 5, -380 + i * 120); scene.add(l); return l; }); // (fora do grupo: a luz fica sempre na cena, só apaga)
    // a fila da partida: aparece no pátio do santuário
    this.procession = [];
  }
  // uma flecha sai do arco de um arqueiro (a soltura do kyūdō): vai para o alvo da frente dele
  fire(from) {
    const R = this.city.range, a = this.arrows.find((q) => q.t < 0); if (!R || !a) return;
    let k = 0, best = 1e9; R.targets.forEach(([tx, tz], i) => { const d = Math.abs((tx - from.x) * Math.cos(R.f.ry) - (tz - from.z) * Math.sin(R.f.ry)); if (d < best) { best = d; k = i; } });
    const [tx, tz] = R.targets[k]; a.from = from.clone(); a.to = new V3(tx + rr(-0.25, 0.25), R.y + 1.0 + rr(-0.2, 0.2), tz); a.t = 0; a.g.visible = true; a.hit = rand() < 0.55; a.stuck = false;
  }
  get event() { return DAYS[this.day]; }
  onTime(phase) { if (phase === 'manha') { this.day = (this.day + 1) % DAYS.length; this.announced = false; } }
  update(dt, t, player, night) {
    const C = this.city, p = player.pos, ev = this.event.id;
    const at = (zone, m = 0) => zone && p.x > zone[0] - m && p.x < zone[1] + m && p.z > zone[2] - m && p.z < zone[3] + m;
    // ---- kyūdō: todos os dias de manhã e de tarde; no dia comum com mais arqueiros
    const R = C.range;
    if (R && night < 0.5) {
      for (const a of this.arrows) { if (a.t < 0) continue; a.t += dt / 0.7; const k = Math.min(1, a.t); a.g.position.lerpVectors(a.from, a.to, k); a.g.position.y += Math.sin(k * Math.PI) * 0.9; a.g.lookAt(a.to.x, a.to.y + (1 - k) * 0.8, a.to.z);
        if (a.t >= 1 && !a.stuck) { a.stuck = true; if (Math.hypot(p.x - a.to.x, p.z - a.to.z) < 45) { this.hits++; this.audio?.burst?.(0.08, 1400, 0.06); if (a.hit && this.onSeen) this.onSeen('kyudo_tiro'); } }
        if (a.t > 4) { a.t = -1; a.stuck = false; a.g.visible = false; } }
    }
    // ---- kagura
    if (this.miko) {
      const on = ev === 'kagura' && night < 0.5, dK = Math.hypot(p.x - C.spots.kagura.x, p.z - C.spots.kagura.z), M = this.miko, K = this.kg, k = C.spots.kagura;
      M.root.visible = on && dK < 110;
      if (M.root.visible) {
        const st = KG_SEQ[K.i], act = st.clip && M.act(st.clip), dur = st.dur ?? (act ? act.getClip().duration / st.speed : 3);
        if (K.t === 0 && act) act.reset(); // cada passo começa do início
        K.t += dt;
        let mode = 'idle', speed = 0;
        if (st.walk) { K.ang += dt * 0.35; mode = 'walk'; speed = 0.45; } // anda em círculo pelo palco (devagar)
        else if (act) { mode = '@' + st.clip; M.speeds = { [st.clip]: st.speed }; }
        const R = 1.2; /* o círculo tem 1,2 m: ela fica nele também nos passos parados */
        M.root.position.set(k.x + Math.sin(K.ang) * R, k.y, k.z + Math.cos(K.ang) * R);
        M.root.rotation.y = st.walk ? K.ang + Math.PI / 2 : K.face;
        animateHumanoid(M, dt, speed, mode, t);
        if (st.bells && dK < 45) { K.bellT -= dt; const f = K.t / dur; if (f > 0.25 && f < 0.7 && K.bellT <= 0) { K.bellT = 0.22; this.audio?.tone?.([2400 + rand() * 900, 3300 + rand() * 600], 0.25, 'triangle', 0.035); } } // os sininhos
        if (dK < 55) { K.beat -= dt; if (K.beat <= 0) { K.beat = st.walk ? 0.9 : 1.6; this.audio?.burst?.(0.3, 95, 0.32); } } // o taiko marca o tempo
        if (K.t >= dur) { K.t = 0; K.i = (K.i + 1) % KG_SEQ.length; }
        if (dK < 25 && !this.seen.has('kagura')) { this.seen.add('kagura'); this.toast('A miko dança a kagura: o leque e os sininhos chamam os kami. As danças contam histórias dos mitos — como a deusa do sol, escondida numa caverna, saiu para ver a dança.', 'quest', 9000); this.onSeen?.('kagura'); }
      }
    }
    // ---- a festa do fogo
    const fire = ev === 'himatsuri' && night > 0.5;
    this.fireGroup.visible = fire; if (!fire && this.fireLights[0].intensity) for (const l of this.fireLights) l.intensity = 0;
    if (fire) { for (const f of this.fires) { const k = 0.85 + Math.sin(t * 9 + f.ph) * 0.1 + Math.sin(t * 23 + f.ph * 2) * 0.05; f.s.scale.setScalar(4.5 * k); f.s2.scale.setScalar(2.2 * (2 - k)); } for (const l of this.fireLights) l.intensity = 60 + Math.sin(t * 7) * 8;
      if (Math.abs(p.x - STREET.x) < 30 && p.z > STREET.z0 && p.z < STREET.z1 + 40 && !this.seen.has('himatsuri')) { this.seen.add('himatsuri'); this.toast('A festa do fogo de Yoshida: as tochas de pinho ardem a noite toda ao longo da rua. Assim a vila agradece à montanha e fecha a temporada de subida.', 'quest', 9000); this.onSeen?.('himatsuri'); } }
    // ---- o aviso do dia, só para quem está no lugar
    if (!this.announced) {
      const place = ev === 'kagura' ? at(C.zones.shrine) : ev === 'himatsuri' ? (Math.abs(p.x - STREET.x) < 40 && p.z > STREET.z0 && p.z < STREET.z1) : ev === 'partida' ? at(C.zones.shrine) : at(C.zones.residence);
      if (place) { this.announced = true; this.toast(`Hoje: ${this.event.label}. ${this.event.msg}`, '', 7000); }
    }
    void SHRINE; void playOnce;
  }
}
