// Os dias da vila (passam com a tecla C, de noite para manhã): a cada dia um acontecimento.
// - Dia comum: o treino de arco da manhã na raia da residência (as flechas voam até os alvos a 28 m).
// - Dança kagura no santuário: a dançarina (miko) de branco e vermelho, com o leque e o molho de sininhos, no palco.
// - Partida dos peregrinos: a confraria sai do santuário em fila, de madrugada, gritando "Rokkon shōjō".
// - Festa do fogo (Yoshida no Himatsuri, no fim do 7º mês: fecha a temporada de subida): à noite, tochas de pinho
//   de 3 m acesas ao longo de toda a rua — a vila inteira fica dourada.
// Os avisos só aparecem para quem está no lugar do acontecimento.
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce } from '../comum/mixamo.js';
import { terrainHeight, STREET, SHRINE } from './terrain.js';
import { rr, rand } from '../comum/util.js';

const V3 = THREE.Vector3;
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
    if (city.spots.kagura) { const k = city.spots.kagura; this.miko = makeHumanoid({ outfit: 'kannushi', cloth: 0xf8f6f0, hakama: 0xb8261e, female: true, hair: 'shimada', extras: ['fan'] }); this.miko.root.position.set(k.x, k.y, k.z); this.miko.root.visible = false; scene.add(this.miko.root); }
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
    this.fireLights = [0, 1, 2, 3].map((i) => { const l = new THREE.PointLight(0xff9040, 0, 60, 2); l.position.set(STREET.x, terrainHeight(STREET.x, -380 + i * 120) + 5, -380 + i * 120); this.fireGroup.add(l); return l; });
    // a fila da partida: aparece no pátio do santuário
    this.procession = [];
  }
  get event() { return DAYS[this.day]; }
  onTime(phase) { if (phase === 'manha') { this.day = (this.day + 1) % DAYS.length; this.announced = false; } }
  update(dt, t, player, night) {
    const C = this.city, p = player.pos, ev = this.event.id;
    const at = (zone, m = 0) => zone && p.x > zone[0] - m && p.x < zone[1] + m && p.z > zone[2] - m && p.z < zone[3] + m;
    // ---- kyūdō: todos os dias de manhã e de tarde; no dia comum com mais arqueiros
    const R = C.range;
    if (R && night < 0.5) {
      this.shootT = (this.shootT ?? 2) - dt;
      if (this.shootT < 0) { this.shootT = rr(3, 6); const a = this.arrows.find((q) => q.t < 0); if (a) { const k = Math.floor(rand() * R.targets.length); a.from = new V3(R.from[0] + rr(-2, 2), R.y + 1.45, R.from[1]); const [tx, tz] = R.targets[k]; a.to = new V3(tx + rr(-0.25, 0.25), R.y + 1.0 + rr(-0.2, 0.2), tz); a.t = 0; a.g.visible = true; a.hit = rand() < 0.55; } }
      for (const a of this.arrows) { if (a.t < 0) continue; a.t += dt / 0.7; const k = Math.min(1, a.t); a.g.position.lerpVectors(a.from, a.to, k); a.g.position.y += Math.sin(k * Math.PI) * 0.9; a.g.lookAt(a.to.x, a.to.y + (1 - k) * 0.8, a.to.z);
        if (a.t >= 1 && !a.stuck) { a.stuck = true; if (Math.hypot(p.x - a.to.x, p.z - a.to.z) < 45) { this.hits++; this.audio?.burst?.(0.08, 1400, 0.06); if (a.hit && this.onSeen) this.onSeen('kyudo_tiro'); } }
        if (a.t > 4) { a.t = -1; a.stuck = false; a.g.visible = false; } }
    }
    // ---- kagura
    if (this.miko) { const on = ev === 'kagura' && night < 0.5; this.miko.root.visible = on && Math.hypot(p.x - C.spots.kagura.x, p.z - C.spots.kagura.z) < 70;
      if (this.miko.root.visible) { this.miko.root.rotation.y = Math.sin(t * 0.6) * 1.6 + Math.PI / 2; animateHumanoid(this.miko, dt, Math.abs(Math.cos(t * 0.6)) > 0.7 ? 0.6 : 0, Math.abs(Math.cos(t * 0.6)) > 0.7 ? 'walk' : 'talk', t);
        if (Math.hypot(p.x - C.spots.kagura.x, p.z - C.spots.kagura.z) < 22) { if (!this.seen.has('kagura')) { this.seen.add('kagura'); this.toast('A miko dança a kagura: o leque e os sininhos chamam os kami. As danças contam histórias dos mitos — como a deusa do sol, escondida numa caverna, saiu para ver a dança.', 'quest', 9000); this.onSeen?.('kagura'); } } } }
    // ---- a festa do fogo
    const fire = ev === 'himatsuri' && night > 0.5;
    this.fireGroup.visible = fire;
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
