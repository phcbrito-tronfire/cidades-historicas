// Os dias de Mênfis (c. 1250 a.C., Ramsés II): a cada manhã nova (C passa o tempo) acontece outra coisa —
//   comum  — um dia de trabalho: o cais cheio, os campos, as oficinas;
//   barca  — a procissão da barca sagrada de Ptah: os sacerdotes carregam nos ombros a barca dourada com o naos
//            (o santuário portátil, onde viaja a estátua do deus) do templo até o cais do Nilo, e o povo de linho
//            branco se junta dos dois lados do caminho, aclamando;
//   apis   — o touro Ápis, a imagem viva de Ptah: preto com manchas brancas, o disco do sol entre os chifres,
//            conduzido pelos sacerdotes pela cidade, entre o povo.
import * as THREE from 'three';
import { makeCrowd } from '../comum/plateia.js';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { creature } from '../comum/fauna.js';
import { groundAt, terrainAt } from '../comum/collision.js';
import { rr, rand, angleLerp } from '../comum/util.js';

export const DAYS = [
  { id: 'comum', name: 'Um dia de trabalho', desc: 'Um dia comum em Mênfis: os barcos de grãos descarregando no cais, os camponeses nos campos, os escribas contando tudo, os artesãos nas oficinas do templo de Ptah.' },
  { id: 'barca', name: 'A procissão da barca de Ptah', desc: 'Hoje é dia de festa: os sacerdotes tiram do templo a barca sagrada de Ptah, com o santuário onde viaja a estátua do deus, e a levam nos ombros até o Nilo. O povo de Mênfis se junta no caminho para ver passar o deus e pedir seus favores.' },
  { id: 'apis', name: 'O touro Ápis passeia pela cidade', desc: 'Hoje o touro Ápis — a imagem viva do deus Ptah, escolhido pelas manchas no pelo — sai do seu estábulo sagrado com o disco do sol entre os chifres. Quem o vê passar recebe sorte; os sacerdotes leem o futuro nos movimentos dele.' },
];
const EGYPT_LOOKS = [
  (c) => ({ outfit: 'kilt', hair: 'short', linen: c }), (c) => ({ outfit: 'longkilt', hair: 'bald', linen: c }),
  (c) => ({ outfit: 'dress', hair: 'long', linen: c }), (c) => ({ outfit: 'dress', hair: 'long', linen: c, collar: 'royal' }),
];
const LINEN = [[0xf6f0e0, 0xf1ead8, 0xe8dcc0], [0xffffff, 0xf6f0e0, 0xece2cc], [0xf6f0e0, 0xf1ead8, 0xe8dcc0], [0xffffff, 0xf1ead8, 0xe0d4b8]];

export class Festivals {
  constructor(scene, city, { renderer, toast, info, quality }) {
    this.scene = scene; this.city = city; this.toast = toast; this.info = info;
    this.day = 0; this.event = DAYS[0]; this.lastPhase = null; this.seen = new Set(); this.seenNear = -1; this.s = 0;
    const S = city.spots, from = S.santuario || new THREE.Vector3(-78, 0, 4.5), to = S.quay || new THREE.Vector3(118, 0, 0);
    // o caminho: do santuário, pela avenida, até a escada do cais
    this.route = [[from.x + 6, from.z], [from.x + 40, from.z + 1], [(from.x + to.x) / 2, 3], [to.x - 18, 2], [to.x - 3, 0]];
    this.L = [0]; for (let i = 1; i < this.route.length; i++) this.L.push(this.L[i - 1] + Math.hypot(this.route[i][0] - this.route[i - 1][0], this.route[i][1] - this.route[i - 1][1]));
    const at = (s, o = {}) => { let i = 1; while (i < this.route.length - 1 && this.L[i] < s) i++; const [ax, az] = this.route[i - 1], [bx, bz] = this.route[i], u = Math.max(0, Math.min(1, (s - this.L[i - 1]) / (this.L[i] - this.L[i - 1]))); o.x = ax + (bx - ax) * u; o.z = az + (bz - az) * u; o.h = Math.atan2(bx - ax, bz - az); return o; };
    this.at = at;
    // o povo dos dois lados do caminho, de pé e aclamando (cartões de gente de verdade, com linho egípcio)
    const crowd = makeCrowd(renderer, { looks: EGYPT_LOOKS, colors: LINEN }); this.uTime = crowd.uTime; crowd.uExcite.value = 1;
    const pts = [], fill = quality === 'alto' ? 1 : quality === 'leve' ? 0.6 : 0.35, total = this.L[this.L.length - 1];
    for (let s = 45; s < total - 4; s += 0.9) for (const sd of [-1, 1]) { // (dentro do pátio do templo só entram os sacerdotes)
      if (rand() > 0.75 * fill) continue;
      const q = at(s), off = sd * rr(3.6, 5.5), x = q.x + Math.cos(q.h) * off, z = q.z - Math.sin(q.h) * off, y = groundAt(x, z, terrainAt(x, z) + 1.5);
      pts.push([x, y + 0.47, z, Math.atan2(x - q.x, z - q.z)]);
    }
    const d3 = new THREE.Object3D(); this.crowd = new THREE.InstancedMesh(crowd.geometry, crowd.material, pts.length);
    pts.forEach(([x, y, z, ry], i) => { d3.position.set(x, y, z); d3.rotation.set(0, ry, 0); d3.scale.setScalar(rr(0.92, 1.06)); d3.updateMatrix(); this.crowd.setMatrixAt(i, d3.matrix); });
    this.crowd.frustumCulled = false; this.crowd.visible = false; scene.add(this.crowd);
    // a barca sagrada: casco dourado de proa e popa curvas, o naos no meio, as varas apoiadas nos ombros de oito sacerdotes
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 0.95, roughness: 0.25 }), wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 });
    const linen = new THREE.MeshStandardMaterial({ color: 0xf6f0e0, roughness: 0.95, side: THREE.DoubleSide });
    const bark = new THREE.Group();
    { const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 4.2, 12, 1, false, Math.PI / 2, Math.PI), gold); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.6); bark.add(hull);
      for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 6, 12, Math.PI / 2), gold); end.position.set(s * 1.9, 0.5, 0); end.rotation.y = s > 0 ? 0 : Math.PI; bark.add(end); const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), gold); head.position.set(s * 2.45, 1.05, 0); bark.add(head); } // as cabeças de carneiro na proa e na popa
      const naos = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.7), gold); naos.position.y = 0.6; bark.add(naos);
      const veil = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.6, 0.85), linen); veil.position.y = 0.55; bark.add(veil); // o véu que esconde o deus
      for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.6, 6), wood); pole.rotation.z = Math.PI / 2; pole.position.set(0, -0.25, s * 0.75); bark.add(pole); }
      bark.traverse((o) => { if (o.isMesh) o.castShadow = true; }); bark.visible = false; scene.add(bark); }
    this.bark = bark;
    const priest = () => { const r = makeHumanoid({ outfit: 'longkilt', hair: 'bald', collar: null }); r.root.visible = false; scene.add(r.root); return r; };
    this.bearers = []; for (let i = 0; i < 8; i++) this.bearers.push({ r: priest(), lx: -1.8 + (i % 4) * 1.2, lz: i < 4 ? -0.75 : 0.75 });
    this.leaders = []; for (let i = 0; i < 6; i++) this.leaders.push({ r: priest(), off: 6 + i * 1.6, side: i % 2 ? 0.8 : -0.8 }); // vão na frente, com incenso
    // Ápis
    this.apis = null;
    creature('touro', 2.6, { still: true }).then((c) => { if (!c) return;
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), gold); disk.rotation.x = Math.PI / 2; disk.position.set(0, 1.85, 1.05); c.holder.add(disk);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 1.0), new THREE.MeshStandardMaterial({ color: 0x2a4a9a, roughness: 0.9 })); cloth.position.set(0, 1.45, -0.1); c.holder.add(cloth); // manta azul com franja de ouro
      const w = c.clips.find((cl) => /walk/i.test(cl.name)) || c.clips[0]; c.mixer.clipAction(w).play();
      c.holder.visible = false; scene.add(c.holder); this.apis = c; });
  }

  onTime(phase) {
    if (this.lastPhase === 'noite' && phase === 'manha') { this.day++; this.event = DAYS[this.day % DAYS.length]; this.s = 0; this.seenNear = -1; this.toast(`Novo dia em Mênfis — ${this.event.name}.`, 'quest', 6000); }
    this.lastPhase = phase;
  }

  update(dt, t, player, night) {
    const p = player.pos, id = night > 0.5 ? null : this.event.id, total = this.L[this.L.length - 1];
    const on = id === 'barca' || id === 'apis', mid = this.at(total / 2), near = Math.hypot(p.x - mid.x, p.z - mid.z) < 260;
    this.crowd.visible = on && near; this.uTime.value = t;
    const show = on && near;
    if (show) this.s = (this.s + dt * 0.9) % (total + 12);
    const lead = this.at(Math.min(this.s, total)), ground = (x, z) => groundAt(x, z, terrainAt(x, z) + 1.5);
    // barca e carregadores
    const barca = show && id === 'barca';
    this.bark.visible = barca; this.bearers.forEach((b) => { b.r.root.visible = barca; });
    if (barca) {
      const cs = Math.cos(lead.h), sn = Math.sin(lead.h), fx = Math.sin(lead.h), fz = Math.cos(lead.h);
      this.bark.position.set(lead.x, ground(lead.x, lead.z) + 1.65 + Math.sin(t * 2.4) * 0.03, lead.z); this.bark.rotation.y = lead.h - Math.PI / 2;
      for (const b of this.bearers) { const x = lead.x + fx * b.lx + cs * b.lz, z = lead.z + fz * b.lx - sn * b.lz; b.r.root.position.set(x, ground(x, z), z); b.r.root.rotation.y = lead.h; animateHumanoid(b.r, dt, 0.9, 'walk', t); }
    }
    // os sacerdotes na frente (nos dois dias)
    this.leaders.forEach((l) => { l.r.root.visible = show; if (!show) return; const q = this.at(Math.min(total, this.s + l.off)), x = q.x + Math.cos(q.h) * l.side, z = q.z - Math.sin(q.h) * l.side; l.r.root.position.set(x, ground(x, z), z); l.r.root.rotation.y = angleLerp(l.r.root.rotation.y, q.h, Math.min(1, dt * 4)); animateHumanoid(l.r, dt, 0.9, 'walk', t); });
    // Ápis
    if (this.apis) { const a = this.apis, v = show && id === 'apis'; a.holder.visible = v;
      if (v) { a.holder.position.set(lead.x, ground(lead.x, lead.z), lead.z); a.holder.rotation.y = angleLerp(a.holder.rotation.y, lead.h, Math.min(1, dt * 3)); a.mixer.update(dt * 0.8); } }
    if (show && Math.hypot(p.x - lead.x, p.z - lead.z) < 45 && this.seenNear !== this.day) {
      this.seenNear = this.day; this.seen.add(id);
      this.info({ tag: 'Hoje em Mênfis', name: this.event.name, era: `Dia ${this.day + 1} · Mênfis, c. 1250 a.C.`, story: this.event.desc, foot: 'Aperte C para passar o tempo: cada novo dia traz outro acontecimento.' });
    }
  }
}
