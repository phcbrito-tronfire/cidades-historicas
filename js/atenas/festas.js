// Os dias de Atenas (432 a.C.): a cada manhã nova (C passa o tempo) a cidade vive outra coisa —
//   ekklesia     — a assembleia na Pnyx: milhares de cidadãos sentados na encosta, de frente para a bema;
//   dionisias    — as Grandes Dionísias: o teatro de Dionísio lotado e o coro de quinze dançando na orquestra;
//   panateneias  — a procissão das Panateneias, do Dípilon, atravessando a ágora, até a Acrópole: as moças com os
//                  cestos sagrados, homens com ramos de oliveira, os músicos e as vacas brancas do sacrifício;
//   mercado      — um dia comum: a ágora cheia de gente fazendo compras (o normal de todo dia).
// A plateia são os mesmos cartões de gente de verdade da Roma (comum/plateia.js), com roupas gregas.
import * as THREE from 'three';
import { makeCrowd } from '../comum/plateia.js';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { creature } from '../comum/fauna.js';
import { THEATER, BEMA, AGORA, groundHeight } from './terrain.js';
import { rr, rand, pick, angleLerp } from '../comum/util.js';

export const DAYS = [
  { id: 'mercado', name: 'Dia de mercado', desc: 'Um dia comum em Atenas: a ágora cheia de gente comprando peixe, azeite, cerâmica e figos, os filósofos discutindo nas stoas e os escravos buscando água nas fontes.' },
  { id: 'ekklesia', name: 'Ekklesia — a assembleia na Pnyx', desc: 'Hoje há assembleia: os cidadãos sobem a colina da Pnyx (seis mil precisam estar presentes para certas votações) e qualquer um pode pedir a palavra na bema. Péricles vai falar sobre a guerra com Esparta.' },
  { id: 'dionisias', name: 'Grandes Dionísias — teatro', desc: 'Hoje é dia de teatro: o teatro de Dionísio, na encosta da Acrópole, está lotado para as tragédias. O coro de quinze dança e canta na orquestra, todos com máscaras.' },
  { id: 'panateneias', name: 'Panateneias — a grande procissão', desc: 'Hoje é a festa de Atena: a procissão sai do Dípilon, atravessa a ágora pela Via Panatenaica e sobe até a Acrópole, levando o peplo novo da deusa, os cestos sagrados e as vacas do sacrifício.' },
];

export class Festivals {
  constructor(scene, city, { renderer, toast, info, quality }) {
    this.scene = scene; this.city = city; this.toast = toast; this.info = info;
    this.day = 0; this.event = DAYS[0]; this.lastPhase = null; this.seen = new Set(); this.seenNear = -1;
    const crowd = makeCrowd(renderer); this.uTime = crowd.uTime; this.uExcite = crowd.uExcite; this.excite = 0;
    const fill = quality === 'alto' ? 0.55 : quality === 'leve' ? 0.35 : 0.2;
    const d3 = new THREE.Object3D();
    const inst = (pts) => { const im = new THREE.InstancedMesh(crowd.geometry, crowd.material, pts.length); pts.forEach(([x, y, z, ry], i) => { d3.position.set(x, y, z); d3.rotation.set(0, ry, 0); d3.scale.setScalar(rr(0.92, 1.06)); d3.updateMatrix(); im.setMatrixAt(i, d3.matrix); }); im.frustumCulled = false; im.visible = false; scene.add(im); return im; };
    // ---- teatro: uma pessoa por assento, nas fileiras da cávea, de frente para a orquestra
    { const T = THEATER, step = (T.r1 - T.r0) / T.rows, pts = [];
      for (let k = 0; k < T.rows; k++) { const dist = T.r0 + (k + 0.55) * step, y = T.y + T.rise * (k + 1), n = Math.floor((2 * T.span * dist) / 0.62);
        for (let i = 0; i < n; i++) { const ang = -T.span + (i + 0.5) * ((2 * T.span) / n); if (T.aisles.some((a) => Math.abs(Math.sin(ang - a)) * dist < T.aisleW + 0.25) || rand() > fill) continue;
          pts.push([T.x + Math.sin(ang) * dist, y, T.z - Math.cos(ang) * dist, Math.atan2(Math.sin(ang), -Math.cos(ang))]); } }
      this.theater = inst(pts); }
    // ---- Pnyx: os cidadãos sentados na encosta, de frente para a bema
    { const pts = [];
      for (let i = 0; i < 1400 * fill * 2; i++) { const a = Math.atan2(-0.8, 0.6) + rr(-1.25, 1.25), d = rr(7, 52), x = BEMA.x + Math.cos(a) * d, z = BEMA.z + Math.sin(a) * d;
        pts.push([x, groundHeight(x, z) + 0.42, z, Math.atan2(x - BEMA.x, z - BEMA.z)]); }
      this.pnyx = inst(pts); }
    // ---- o coro: quinze coreutas de máscara branca, dançando em roda na orquestra
    this.chorus = [];
    for (let i = 0; i < 15; i++) { const r = makeHumanoid({ outfit: 'chiton', cloth: 0xf2ecdc, border: 0x8e2c22, beard: null }); r.root.visible = false; scene.add(r.root);
      const mask = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.6 })); mask.scale.set(1, 1.3, 0.7); mask.position.set(0, 1.62, 0.08); r.root.add(mask);
      this.chorus.push({ r, i }); }
    // ---- a procissão das Panateneias: o caminho do Dípilon à Acrópole
    const S = city.spots, dip = S.dipylon || new THREE.Vector3(AGORA.x - 160, 0, AGORA.z - 170);
    this.route = [[dip.x, dip.z], [AGORA.x - 60, AGORA.z - 60], [AGORA.x + 30, AGORA.z + 40], [-190, -70], [-160, -20], [-132, 0]];
    this.routeL = [0]; for (let i = 1; i < this.route.length; i++) this.routeL.push(this.routeL[i - 1] + Math.hypot(this.route[i][0] - this.route[i - 1][0], this.route[i][1] - this.route[i - 1][1]));
    this.parade = [];
    const look = (i) => i < 10 ? { outfit: 'peplos', cloth: pick([0xf2ecdc, 0xe8d8b0, 0xd8b45a]), border: 0x8e2c22, hair: 'up', extras: ['basket'] } // as canéforas, com os cestos
      : i < 14 ? { outfit: 'chiton', cloth: 0xd8c8a0, border: null, extras: ['lyre'] } // músicos
      : { outfit: pick(['himation', 'chiton']), cloth: pick([0xf4efe2, 0xe4dccb, 0xb0402c]), border: null, beard: 'full', extras: ['staff'] }; // cidadãos com ramos
    for (let i = 0; i < 30; i++) { const r = makeHumanoid(look(i)); r.root.visible = false; scene.add(r.root); this.parade.push({ r, off: i * 2.4 + (i >= 14 ? 6 : 0), cow: false }); }
    for (let i = 0; i < 2; i++) creature('touro', 2.4, { still: true }).then((c) => { if (!c) return;
      c.o.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color.setRGB(2.2, 2.1, 1.9); } }); // as vacas brancas do sacrifício
      const w = c.clips.find((cl) => /walk/i.test(cl.name)) || c.clips[0]; const act = c.mixer.clipAction(w); act.play();
      c.holder.visible = false; scene.add(c.holder); this.parade.push({ c, off: 30 * 2.4 + 10 + i * 5, cow: true }); });
    this.s = 0;
  }

  onTime(phase) {
    if (this.lastPhase === 'noite' && phase === 'manha') { this.day++; this.event = DAYS[this.day % DAYS.length]; this.s = 0; this.seenNear = -1; this.toast(`Novo dia em Atenas — ${this.event.name}.`, 'quest', 6000); }
    this.lastPhase = phase;
  }

  update(dt, t, player, night) {
    this.player = player;
    const p = player.pos, ev = night > 0.5 ? null : this.event, id = ev?.id;
    this.uTime.value = t; this.excite = Math.max(0, this.excite - dt * 0.3); this.uExcite.value = this.excite;
    const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    // teatro
    const thOn = id === 'dionisias' && near(THEATER.x, THEATER.z, 300);
    this.theater.visible = thOn; this.chorus.forEach((c) => { c.r.root.visible = thOn; });
    if (thOn) {
      const T = THEATER;
      this.chorus.forEach((c) => { const a = t * 0.25 + (c.i / 15) * Math.PI * 2, R = T.r0 * 0.55, x = T.x + Math.cos(a) * R, z = T.z + 1 + Math.sin(a) * R;
        c.r.root.position.set(x, T.y, z); c.r.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI / 2 * Math.sign(Math.sin(t * 0.3)); animateHumanoid(c.r, dt, 1.0, 'walk', t); });
      if (rand() < dt * 0.04) this.excite = 0.8; // aplausos no fim de um episódio
      this.notice('dionisias', T.x, T.z, 70);
    }
    // assembleia
    const pnOn = id === 'ekklesia' && near(BEMA.x, BEMA.z, 300);
    this.pnyx.visible = pnOn;
    if (pnOn) { if (rand() < dt * 0.03) this.excite = 0.5; this.notice('ekklesia', BEMA.x, BEMA.z, 70); }
    // procissão
    const prOn = id === 'panateneias';
    const L = this.routeL[this.routeL.length - 1];
    if (prOn) this.s = Math.min(this.s + dt * 1.15, L + 40);
    for (const m of this.parade) {
      const s = this.s - m.off, on = prOn && s > 0 && s < L, holder = m.cow ? m.c.holder : m.r.root;
      holder.visible = on; if (!on) continue;
      let i = 1; while (i < this.route.length - 1 && this.routeL[i] < s) i++;
      const [ax, az] = this.route[i - 1], [bx, bz] = this.route[i], u = (s - this.routeL[i - 1]) / (this.routeL[i] - this.routeL[i - 1]);
      const x = ax + (bx - ax) * u + (m.cow ? 0 : ((this.parade.indexOf(m) % 2) - 0.5) * 1.6), z = az + (bz - az) * u;
      holder.position.set(x, groundHeight(x, z), z); holder.rotation.y = angleLerp(holder.rotation.y, Math.atan2(bx - ax, bz - az), Math.min(1, dt * 4));
      if (m.cow) m.c.mixer.update(dt); else animateHumanoid(m.r, dt, 1.15, 'walk', t);
    }
    if (prOn) { const lead = this.parade[0].r.root.position; if (this.parade[0].r.root.visible) this.notice('panateneias', lead.x, lead.z, 40); }
    if (id === 'mercado') this.notice('mercado', AGORA.x, AGORA.z, 90);
  }

  // o cartaz do dia aparece uma vez, quando o explorador chega perto do acontecimento
  notice(id, x, z, r) {
    if (this.seenNear === this.day) return;
    if (Math.hypot(this.player?.pos.x - x, this.player?.pos.z - z) > r) return;
    this.seenNear = this.day; this.seen.add(id);
    this.info({ tag: 'Hoje em Atenas', name: this.event.name, era: `Dia ${this.day + 1} · Atenas, 432 a.C.`, story: this.event.desc, foot: 'Aperte C para passar o tempo: cada novo dia traz outro acontecimento.' });
  }
}
