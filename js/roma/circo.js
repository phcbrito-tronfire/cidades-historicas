// Corrida de bigas no Circo Máximo: quatro carros (Verdes, Azuis, Brancos e Vermelhos — as "facções" pelas quais
// Roma inteira torcia) dão sete voltas em volta da spina, contra o sentido do relógio, rasgando as curvas nas metas.
// Na spina, sete golfinhos de bronze viram a cada volta, para a plateia saber quanto falta. No fim, o vencedor dá a
// volta da vitória e, depois de um intervalo, os carros se alinham de novo nas baias de largada (carceres).
import * as THREE from 'three';
import { creature } from '../comum/fauna.js';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { CIRCUS, terrainHeight } from './terrain.js';
import { rr, rand, lerp, clamp, angleLerp } from '../comum/util.js';

const TEAMS = [{ name: 'Verdes', c: 0x2a8a3a }, { name: 'Azuis', c: 0x2a52a8 }, { name: 'Brancos', c: 0xeeeae0 }, { name: 'Vermelhos', c: 0xb02a20 }];
const LAPS = 7, LH = CIRCUS.hw - 46; // meia-reta: de uma meta à outra

// pista em forma de estádio em volta da spina, com raio r (a distância da spina): devolve posição e direção
function track(u, r, out) {
  const C = CIRCUS, P = 4 * LH + 2 * Math.PI * r;
  let s = (((u % 1) + 1) % 1) * P;
  if (s < 2 * LH) { out.x = C.x - LH + s; out.z = C.z - r; out.h = Math.PI / 2; out.turn = 0; return out; }
  s -= 2 * LH;
  if (s < Math.PI * r) { const a = -Math.PI / 2 + s / r; out.x = C.x + LH + Math.cos(a) * r; out.z = C.z + Math.sin(a) * r; out.h = Math.atan2(-Math.sin(a), Math.cos(a)); out.turn = 1; return out; }
  s -= Math.PI * r;
  if (s < 2 * LH) { out.x = C.x + LH - s; out.z = C.z + r; out.h = -Math.PI / 2; out.turn = 0; return out; }
  s -= 2 * LH;
  const a = Math.PI / 2 + s / r; out.x = C.x - LH + Math.cos(a) * r; out.z = C.z + Math.sin(a) * r; out.h = Math.atan2(-Math.sin(a), Math.cos(a)); out.turn = 1; return out;
}

export class Races {
  constructor(scene, { crowdGeo, crowdMat, quality, toast, excite }) {
    this.scene = scene; this.toast = toast; this.excite = excite;
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    const C = CIRCUS, y0 = terrainHeight(C.x, C.z) - 0.15; this.y = y0 + 0.05;
    // os carros: caixa de madeira com o parapeito na cor da facção, duas rodas e o timão até a parelha
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 }), iron = new THREE.MeshStandardMaterial({ color: 0x4a4a4e, metalness: 0.6, roughness: 0.5 });
    const nh = quality === 'minimo' ? 1 : 2;
    this.cars = TEAMS.map((tm, i) => {
      const g = new THREE.Group(), col = new THREE.MeshStandardMaterial({ color: tm.c, roughness: 0.6 });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.8), wood); floor.position.y = 0.55; g.add(floor);
      const front = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.8, 12, 1, true, -Math.PI / 2, Math.PI), col); front.material.side = THREE.DoubleSide; front.scale.z = 0.6; front.position.set(0, 0.95, 0.1); g.add(front);
      const wheels = [];
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 16), iron); w.rotation.y = Math.PI / 2; w.position.set(s * 0.58, 0.48, -0.05); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.86, 0.04), wood); w.add(sp); const sp2 = sp.clone(); sp2.rotation.z = Math.PI / 2; w.add(sp2); g.add(w); wheels.push(w); }
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), wood); axle.rotation.z = Math.PI / 2; axle.position.set(0, 0.48, -0.05); g.add(axle);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.6), wood); pole.position.set(0, 0.75, 1.6); pole.rotation.x = -0.12; g.add(pole);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      // o auriga: túnica curta na cor da equipe, de pé no carro, inclinado para a frente
      const rig = makeHumanoid({ outfit: 'chiton', cloth: tm.c, border: null, beard: rand() < 0.5 ? 'short' : null });
      rig.root.position.set(0, 0.58, -0.05); rig.root.rotation.x = 0.12; g.add(rig.root);
      this.group.add(g);
      const car = { team: tm, g, wheels, rig, horses: [], u: 0, r: 9 + i * 3, rT: 9 + i * 3, v: 0, skill: rr(-0.5, 0.5), ph: rand() * 6, p: {} };
      for (let k = 0; k < nh; k++) creature('cavalo', 2.45, { still: true }).then((c) => {
        if (!c) return;
        const a = c.clips.find((cl) => /gallop/i.test(cl.name)) || c.clips[0]; const act = c.mixer.clipAction(a); act.play(); act.time = rand();
        c.holder.position.set(nh === 1 ? 0 : (k ? 0.6 : -0.6), 0, 2.6); g.add(c.holder);
        c.holder.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        car.horses.push({ ...c, act });
      });
      return car;
    });
    // os golfinhos de bronze (contam as voltas) num pórtico em cima da spina, perto da meta leste
    this.dolphins = [];
    { const bronze = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.3 }), x0 = C.x + LH - 30;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 0.3), bronze); bar.position.set(x0, y0 + 5.4, C.z); scene.add(bar);
      for (const s of [-1, 1]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 4, 8), bronze); col.position.set(x0 + s * 7, y0 + 3.4, C.z); scene.add(col); }
      for (let i = 0; i < LAPS; i++) {
        const d = new THREE.Group(); d.position.set(x0 - 6 + i * 2, y0 + 5.55, C.z);
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), bronze); body.rotation.z = Math.PI / 2; body.position.y = 0.45; d.add(body);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 4), bronze); tail.position.set(-0.6, 0.55, 0); tail.rotation.z = Math.PI / 2; d.add(tail);
        scene.add(d); this.dolphins.push(d);
      }
    }
    // a plateia nas arquibancadas dos dois lados (as mesmas figurinhas instanciadas do Coliseu)
    const fill = quality === 'alto' ? 0.55 : quality === 'leve' ? 0.35 : 0.18, seats = [];
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
      const z = C.z + s * (C.hd - 4 + k * 1.6), yy = y0 + (k + 1) * 1.1;
      for (let x = C.x - C.hw + 12; x < C.x + C.hw - 12; x += 0.7) if (rand() < fill) seats.push([x + rr(-0.1, 0.1), yy, z + rr(-0.15, 0.15), s]);
    }
    const im = new THREE.InstancedMesh(crowdGeo, crowdMat, seats.length), d3 = new THREE.Object3D(), cc = new THREE.Color();
    const tunics = [0xefe8d8, 0xe4dccb, 0xb0402c, 0xc8a050, 0x6a7a4a, 0x3a5a8a, 0x9a8a70, 0x2a8a3a, 0x2a52a8];
    seats.forEach(([x, yy, z, s], i) => { d3.position.set(x, yy, z); d3.rotation.set(0, s > 0 ? 0 : Math.PI, 0); d3.scale.setScalar(rr(0.9, 1.08)); d3.updateMatrix(); im.setMatrixAt(i, d3.matrix); im.setColorAt(i, cc.set(tunics[Math.floor(rand() * tunics.length)])); });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.visible = false;
    scene.add(im); this.crowd = im;
    this.state = 'start'; this.timer = 6; this.lead = 0; this.resetRace();
  }

  resetRace() {
    // nas baias de largada, lado a lado, todos parados
    this.cars.forEach((c, i) => { c.u = -0.006 * i; c.r = c.rT = 9 + i * 3; c.v = 0; c.skill = rr(-0.6, 0.6); });
    this.state = 'start'; this.timer = 8; this.dolphins.forEach((d) => { d.rotation.z = 0; });
  }

  update(dt, t, player, night) {
    const C = CIRCUS, p = player.pos;
    const near = Math.hypot(p.x - C.x, p.z - C.z) < 360 && night < 0.5;
    this.group.visible = near; this.crowd.visible = near;
    if (!near) return;
    if (this.state === 'start') { this.timer -= dt; if (this.timer <= 0) { this.state = 'run'; if ((Math.abs(p.x - C.x) < C.hw + 25 && Math.abs(p.z - C.z) < C.hd + 25)) this.toast('Cai o pano branco: começa a corrida no Circo Máximo!'); } }
    const order = [...this.cars].sort((a, b) => b.u - a.u);
    for (const c of this.cars) {
      const P = 4 * LH + 2 * Math.PI * c.r;
      let want = 0;
      if (this.state === 'run') {
        const turn = track(c.u, c.r, c.p).turn;
        want = (15.5 + c.skill + Math.sin(t * 0.3 + c.ph) * 1.1) * (turn ? 0.86 : 1);
        // ultrapassagem: se tem alguém logo à frente na mesma faixa, abre para fora; nas curvas, todos querem a de dentro
        const ahead = this.cars.find((o) => o !== c && (o.u - c.u) * P > 0 && (o.u - c.u) * P < 9 && Math.abs(o.r - c.r) < 2.6);
        if (ahead) { c.rT = Math.min(21, ahead.r + 3.2); want = Math.min(want, ahead.v + 0.6); }
        else if (rand() < dt * 0.25) c.rT = turn ? rr(8, 11) : rr(8, 17);
      } else if (this.state === 'end') want = c === order[0] ? 6 : 3;
      c.v = lerp(c.v, want, Math.min(1, dt * (want > c.v ? 0.6 : 1.5)));
      c.r = lerp(c.r, clamp(c.rT, 7.5, 21), Math.min(1, dt * 0.7));
      c.u += c.v * dt / P;
      const q = track(c.u, c.r, c.p);
      c.g.position.set(q.x, this.y, q.z);
      c.h = c.h === undefined ? q.h : angleLerp(c.h, q.h, Math.min(1, dt * 6));
      c.g.rotation.y = c.h;
      c.g.rotation.z = q.turn ? -0.06 * clamp(c.v / 15, 0, 1) : 0; // o carro inclina na curva
      for (const w of c.wheels) w.rotation.x += (c.v * dt) / 0.45;
      for (const hz of c.horses) { hz.act.timeScale = c.v < 1.5 ? 0.15 : clamp(c.v / 12, 0.6, 1.4); hz.mixer.update(dt); }
      animateHumanoid(c.rig, dt, 0, 'idle', t);
    }
    // golfinhos: um vira a cada volta completada pelo primeiro
    const laps = Math.floor(Math.max(0, order[0].u));
    this.dolphins.forEach((d, i) => { d.rotation.z = lerp(d.rotation.z, i < laps ? -1.2 : 0, Math.min(1, dt * 3)); });
    if (this.state === 'run' && order[0].u >= LAPS) {
      this.state = 'end'; this.timer = 26; this.excite?.();
      if ((Math.abs(p.x - C.x) < C.hw + 25 && Math.abs(p.z - C.z) < C.hd + 25)) this.onWin?.();
      if ((Math.abs(p.x - C.x) < C.hw + 25 && Math.abs(p.z - C.z) < C.hd + 25)) this.toast(`Vitória dos ${order[0].team.name}! O auriga recebe a palma e a coroa.`, 'quest', 6000);
    } else if (this.state === 'end') { this.timer -= dt; if (this.timer <= 0) this.resetRace(); }
  }
}
