// Os combates do munus: várias duplas lutando ao mesmo tempo na arena, cada uma com o seu árbitro (summa rudis).
// Cada luta tem ritmo de verdade: rodeiam em guarda, um ataca (às vezes em sequência de golpes), o outro apara com
// o escudo, esquiva para o lado ou é atingido — cambaleia, sangra, a plateia grita. Quando um não aguenta mais, cai
// de joelhos e pede clemência (ad digitum); o árbitro para a luta, o povo decide: na maioria das vezes, missio (o
// derrotado sai vivo); às vezes não. O vencedor ergue a arma para a plateia. As manchas ficam na areia.
import * as THREE from 'three';
import { animateHumanoid, playOnce } from '../comum/mixamo.js';
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
export class Bout {
  constructor(games, a, b, judge, home) { this.g = games; this.f = [a, b]; this.judge = judge; this.home = home; this.reset(); }
  reset() {
    for (const f of this.f) { f.r.once = null; f.pos.set(0, 0, 0); f.hp = Math.round(rr(5, 8)); f.down = false; f.stagger = 0; f.kneel = false; }
    this.cx = this.home[0]; this.cz = this.home[1]; this.ax = rand() * 6; this.dist = 2.4; this.atk = rand() < 0.5 ? 0 : 1;
    this.phase = 'guard'; this.phaseT = rr(1, 2); this.combo = 0; this.endT = 0; this.wait = rr(0, 6); // as lutas não começam todas juntas
  }
  set visible(v) { for (const f of this.f) f.r.root.visible = v; this.judge.r.root.visible = v; }
  update(dt, t) {
    const G = this.g, Y = COL.y, [a, b] = this.f;
    if (this.wait > 0) { this.wait -= dt; }
    this.phaseT -= dt;
    let want = 2.2, push = 0, strafe = 0;
    if (this.phase === 'guard') { // rodeiam em guarda, um passo para o lado, olhando nos olhos
      this.ax += dt * 0.5 * Math.sin(t * 0.5 + this.home[0]); strafe = Math.sin(t * 1.3 + this.home[1]) * 0.6; want = 2.1 + Math.sin(t * 1.7) * 0.35;
      if (this.phaseT <= 0 && this.wait <= 0) this.startAttack(rand() < 0.55 ? 1 - this.atk : this.atk);
    } else if (this.phase === 'attack') {
      const k = 1 - this.phaseT / 0.85; want = k < 0.5 ? 1.25 : 1.6; push = k < 0.55 ? 2.2 : 0.3;
      if (!this.hitDone && k > 0.45) { this.hitDone = true; this.resolve(); }
      if (this.phaseT <= 0) {
        if (this.phase !== 'attack') { /* a luta terminou no golpe */ } else if (this.combo > 0 && rand() < 0.7) { this.combo--; this.startAttack(this.atk); }
        else if (rand() < 0.3) this.startAttack(1 - this.atk); // contra-ataque na hora
        else { this.phase = 'guard'; this.phaseT = rr(0.6, 1.8); }
      }
    } else if (this.phase === 'kneel') { // o derrotado de joelhos, pedindo clemência; o árbitro segura o vencedor
      want = 2.6;
      if (this.phaseT <= 0) {
        const L = this.f[this.loser];
        if (rand() < 0.7) { this === G.bouts[0] && G.toast?.('A plateia grita "missio!": o derrotado sai vivo da arena.', 'quest', 4500); }
        else { L.down = true; playOnce(L.r, 'desmaiar', 4.5); G.blood.spray(L.pos.clone().setY(Y + 0.6), new THREE.Vector3(0, 0, 0), 30); for (let i = 0; i < 4; i++) G.blood.stain(L.pos.x + rr(-0.8, 0.8), L.pos.z + rr(-0.8, 0.8), rr(0.25, 0.5)); }
        G.excite = 1; this.phase = 'done'; this.endT = 7;
      }
    } else if (this.phase === 'done') { this.endT -= dt; want = 3.2; if (this.endT <= 0) { this.g.nextPairing(this); return; } }
    // a dupla anda pela arena com o embalo dos golpes, sem sair dela
    const dx = Math.cos(this.ax), dz = Math.sin(this.ax), sg = this.atk === 0 ? 1 : -1;
    this.cx += (dx * push * sg + -dz * strafe) * dt; this.cz += (dz * push * sg + dx * strafe) * dt;
    const C = COL, kk = Math.hypot(this.cx / (C.a0 - 4), this.cz / (C.b0 - 4)); if (kk > 1) { this.cx /= kk; this.cz /= kk; this.ax += dt * 1.4; }
    this.dist = lerp(this.dist, want, Math.min(1, dt * 5));
    [a, b].forEach((f, i) => {
      const s2 = i === 0 ? -1 : 1, tx = this.cx + dx * s2 * this.dist / 2, tz = this.cz + dz * s2 * this.dist / 2;
      if (!f.pos.lengthSq()) f.pos.set(tx, Y, tz);
      const ox = f.pos.x, oz = f.pos.z;
      if (f.stagger > 0) { f.stagger -= dt; f.pos.x += dx * s2 * dt * 1.6; f.pos.z += dz * s2 * dt * 1.6; } // empurrado pelo golpe
      else if (!f.down && !f.kneel) { f.pos.x = lerp(f.pos.x, tx, Math.min(1, dt * 7)); f.pos.z = lerp(f.pos.z, tz, Math.min(1, dt * 7)); }
      f.pos.y = Y; f.r.root.position.copy(f.pos);
      const o = this.f[1 - i];
      if (!f.down) f.h = angleLerp(f.h, Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z), Math.min(1, dt * 10));
      f.r.root.rotation.y = f.h;
      f.r.root.rotation.x = f.stagger > 0 ? -0.18 * Math.sin((f.stagger / 0.5) * Math.PI) : 0; // o corpo vai para trás com a pancada
      const fwd = ((f.pos.x - ox) * Math.sin(f.h) + (f.pos.z - oz) * Math.cos(f.h)) / Math.max(dt, 1e-4);
      f.spd = lerp(f.spd || 0, Math.abs(fwd) + Math.abs(strafe) * 0.6, Math.min(1, dt * 8));
      const winnerPose = this.phase === 'done' && i !== this.loser && !this.f[this.loser].down;
      animateHumanoid(f.r, dt, f.spd, f.down || f.kneel || winnerPose || f.spd < 0.25 ? 'idle' : 'walk', t);
      if (winnerPose && f.r.bones?.RightArm) f.r.bones.RightArm.rotation.z += 1.2; // arma erguida para a plateia
    });
    // o árbitro acompanha de lado e, no fim, entra entre os dois
    const J = this.judge, side = this.phase === 'kneel' || this.phase === 'done' ? 0.6 : 3.6, jx = this.cx + Math.cos(this.ax + Math.PI / 2) * side, jz = this.cz + Math.sin(this.ax + Math.PI / 2) * side;
    if (!J.pos.lengthSq()) J.pos.set(jx, Y, jz);
    const ox = J.pos.x, oz = J.pos.z; J.pos.set(lerp(J.pos.x, jx, Math.min(1, dt * 1.6)), Y, lerp(J.pos.z, jz, Math.min(1, dt * 1.6))); J.r.root.position.copy(J.pos);
    J.h = angleLerp(J.h, Math.atan2(this.cx - J.pos.x, this.cz - J.pos.z), Math.min(1, dt * 4)); J.r.root.rotation.y = J.h;
    const js = Math.hypot(J.pos.x - ox, J.pos.z - oz) / Math.max(dt, 1e-4); animateHumanoid(J.r, dt, js, js > 0.3 ? 'walk' : 'idle', t);
  }
  startAttack(i) { this.atk = i; this.phase = 'attack'; this.phaseT = 0.85; this.hitDone = false; if (this.combo <= 0) this.combo = rand() < 0.4 ? Math.floor(rr(1, 3)) : 0; playOnce(this.f[i].r, 'espada', 0.85); }
  // o golpe chega: apara com o escudo, esquiva ou acerta
  resolve() {
    const G = this.g, A = this.f[this.atk], D = this.f[1 - this.atk], hasShield = D.kind !== 'retiarius', r = rand();
    const dir = new THREE.Vector3(D.pos.x - A.pos.x, 0, D.pos.z - A.pos.z).normalize();
    if (hasShield && r < 0.4) { G.excite = Math.max(G.excite, 0.25); D.stagger = 0.15; return; } // aparou no escudo
    if (r < (hasShield ? 0.55 : 0.45)) { this.ax += (rand() < 0.5 ? 1 : -1) * 0.9; return; } // esquivou para o lado
    D.hp--; D.stagger = 0.5; // acertou
    G.blood.spray(D.pos.clone().setY(COL.y + 1.15), dir, D.hp <= 1 ? 26 : 16); G.blood.stain(D.pos.x + dir.x * 0.4, D.pos.z + dir.z * 0.4, rr(0.12, 0.3));
    G.excite = Math.max(G.excite, 0.75);
    if (D.hp <= 1) { this.loser = 1 - this.atk; D.kneel = true; playOnce(D.r, 'ajoelhado', 9); this.phase = 'kneel'; this.phaseT = rr(5, 8); this.combo = 0; G.excite = 1; this === G.bouts[0] && G.toast?.('Um gladiador cai de joelhos e ergue o dedo pedindo clemência...', 'quest', 4000); }
  }
}
