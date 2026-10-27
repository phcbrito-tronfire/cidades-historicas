// Montaria: H chama o animal da cidade (cavalo em Atenas, jumento em Mênfis). Ele aparece por perto, vem até o
// explorador, e H de novo monta/desmonta. Montado, as setas funcionam como andando (relativas à câmera); Shift
// galopa. O animal molha os cascos na beira da água, mas se recusa a entrar onde fica fundo.
// Modelos do Sketchfab (CC BY): o cavalo sem a sela e as ferraduras modernas (os gregos montavam em pelo ou sobre
// um pano); por cima, uma manta de lã.
import * as THREE from 'three';
import { creature } from './fauna.js';
import { groundAt, waterAt, terrainAt, moveWithCollision, dryAt, blocked } from './collision.js';
import { clamp, lerp, angleLerp } from './util.js';
import { ridePose } from './mixamo.js';

const V3 = THREE.Vector3;
// medidas e passos de cada animal (m/s); len = comprimento do focinho à cauda; back = altura do lombo; seat = onde
// fica o quadril do cavaleiro, na frente (+) ou atrás (−) do meio do corpo
const KINDS = {
  cavalo: { len: 2.45, back: 1.42, seat: 0.12, belly: 0.34, shin: 0.22, walk: 1.8, run: 11.5, trot: 5.4, wade: 0.75, r: 0.55, name: 'cavalo', blanket: 0x8e2c22, border: 0xe8c060 },
  jumento: { len: 1.85, back: 1.05, seat: -0.05, belly: 0.27, shin: 0.75, walk: 1.5, run: 7.4, trot: 4.3, wade: 0.55, r: 0.45, name: 'jumento', blanket: 0x3a6a8a, border: 0xe8dcc0 },
};

export class Mount {
  constructor(scene, kind, { toast, onMount } = {}) {
    this.scene = scene; this.K = KINDS[kind]; this.kindName = kind; this.toast = toast || (() => {}); this.onMount = onMount;
    this.state = 'none'; // none · coming · waiting · riding
    this.pos = new V3(); this.h = 0; this.v = 0; this.loading = null;
  }
  async load() {
    if (this.obj) return true;
    this.loading ??= creature(this.kindName, this.K.len, { still: true }).then((c) => {
      if (!c) return false;
      this.obj = c; this.scene.add(c.holder); c.holder.visible = false;
      const acts = {}; for (const cl of c.clips) acts[cl.name.replace(/^.*\|/, '')] = c.mixer.clipAction(cl);
      this.acts = acts; this.w = {}; for (const k in acts) { acts[k].play(); acts[k].setEffectiveWeight(0); this.w[k] = 0; }
      // osso do lombo (onde fica a manta e o cavaleiro)
      c.o.traverse((b) => { if (b.isBone && !this.back && /Spine_01/.test(b.name)) this.back = b; });
      // manta de lã com barra colorida, presa ao lombo
      const m = new THREE.MeshStandardMaterial({ color: this.K.blanket, roughness: 0.95 }), mb = new THREE.MeshStandardMaterial({ color: this.K.border, roughness: 0.9 });
      const g = new THREE.Group(), L = this.K.len;
      // manta: cobre o lombo e cai um palmo de cada lado (largura do corpo ~0,2 do comprimento)
      const bw = L * 0.2, bl = L * 0.3, drop = L * 0.1;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.025, bl), m); g.add(cloth);
      for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.025, drop, bl), m); side.position.set(s * bw / 2, -drop / 2, 0); side.rotation.z = s * 0.12; g.add(side); const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, bl + 0.01), mb); b.position.set(s * (bw / 2 + drop * 0.12), -drop, 0); g.add(b); }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      c.holder.add(g); this.blanket = g;
      c.holder.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.layers.set(0); } });
      return true;
    });
    return this.loading;
  }
  // H: chama (aparece a uns metros, em chão seco, e vem trotando), monta quando está perto, desmonta montado
  async key(player) {
    if (this.state === 'riding') return this.dismount(player);
    if (player.swimming || player.diving || player.climb) { this.toast(`O ${this.K.name} não vem até a água funda.`); return; }
    if (this.state === 'waiting' || this.state === 'coming') {
      if (this.pos.distanceTo(player.pos) < 3.2) return this.mount(player);
    }
    if (!(await this.load())) { this.toast('Não deu para carregar o animal agora.'); return; }
    // aparece atrás do explorador, a 9–14 m, onde houver chão seco e livre
    const P = player.pos; let spot = null;
    for (let tries = 0; tries < 40 && !spot; tries++) {
      const a = player.facing + Math.PI + (Math.random() - 0.5) * 2.4, d = 9 + Math.random() * 5;
      const x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d, y = groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6);
      if (Math.abs(y - P.y) < 4 && dryAt(x, z) && !blocked(x, z, y, this.K.r, 2)) spot = new V3(x, y, z);
    }
    if (!spot) { const a = player.facing + Math.PI; spot = new V3(P.x + Math.sin(a) * 2.5, P.y, P.z + Math.cos(a) * 2.5); }
    this.pos.copy(spot); this.h = Math.atan2(P.x - spot.x, P.z - spot.z); this.v = 0;
    this.state = 'coming'; this.obj.holder.visible = true;
    this.toast(`O ${this.K.name} vem vindo. Chegue perto e aperte H para montar.`);
  }
  mount(player) {
    this.state = 'riding'; this.mountT = 0; this.v = 0;
    this.from = player.pos.clone(); player.keys.clear();
    player.boardCam(0.32);
    this.onMount?.();
  }
  dismount(player) {
    // desce pelo lado esquerdo (ou pelo direito, se o esquerdo estiver ocupado)
    const side = (s) => new V3(this.pos.x + Math.cos(this.h) * s * 1.3, 0, this.pos.z - Math.sin(this.h) * s * 1.3);
    let p = side(1); if (blocked(p.x, p.z, this.pos.y, 0.32, 1.7)) p = side(-1);
    player.leaveCam();
    player.pos.set(p.x, groundAt(p.x, p.z, this.pos.y + 1), p.z); player.onGround = true; player.vy = 0; player.speed = 0;
    this.state = 'waiting'; this.v = 0;
  }
  // animações pela velocidade: parado, passo, trote (só o jumento tem) e galope
  anim(dt) {
    const s = Math.abs(this.v), K = this.K, A = this.acts, T = {};
    if (s < 0.25) T.idle = 1;
    else if (s < K.walk + 0.6) T.walk = 1;
    else if (A.trot && s < (K.trot + K.run) / 2) T.trot = 1;
    else T.gallop = 1;
    for (const k in A) {
      this.w[k] = lerp(this.w[k], T[k] || 0, Math.min(1, dt * 6)); A[k].setEffectiveWeight(this.w[k]);
      A[k].timeScale = k === 'walk' ? clamp(s / K.walk, 0.6, 1.6) : k === 'trot' ? clamp(s / K.trot, 0.7, 1.5) : k === 'gallop' ? clamp(s / (K.run * 0.85), 0.7, 1.3) : 1;
    }
    this.obj.mixer.update(dt);
  }
  // anda com colisão; a água funda o animal recusa (só a beira)
  step(dt, dir) {
    const K = this.K, nx = this.pos.x + dir.x * this.v * dt, nz = this.pos.z + dir.z * this.v * dt;
    const g = groundAt(nx, nz, this.pos.y + 0.5), w = waterAt(nx, nz);
    if (w - g > K.wade) { if (Math.abs(this.v) > 1 && !(this.refuseT > 0)) { this.toast(`O ${K.name} bufa e se recusa a entrar na água funda.`); this.refuseT = 4; } this.v *= 0.2; return; }
    const before = this.pos.clone();
    moveWithCollision(this.pos, dir.x * this.v * dt, dir.z * this.v * dt, K.r, 2);
    const ng = groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6);
    if (ng < this.pos.y - 1.2) { this.pos.copy(before); this.v *= 0.3; return; } // beira de muro / penhasco: não pula
    this.pos.y = lerp(this.pos.y, ng, Math.min(1, dt * 12));
    if (before.distanceTo(this.pos) < Math.abs(this.v) * dt * 0.3) this.v *= 0.7; // bateu
  }
  update(dt, t, player) {
    if (!this.obj || this.state === 'none') return;
    this.refuseT = (this.refuseT || 0) - dt;
    const K = this.K;
    if (this.state === 'coming') { // trota até o explorador e para do lado dele
      const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 2.4) { this.state = 'waiting'; this.v = 0; }
      else { this.h = angleLerp(this.h, Math.atan2(dx, dz), Math.min(1, dt * 4)); this.v = lerp(this.v, Math.min(K.trot, d), Math.min(1, dt * 2)); }
      this.step(dt, new V3(Math.sin(this.h), 0, Math.cos(this.h)));
    } else if (this.state === 'waiting') { this.v = lerp(this.v, 0, Math.min(1, dt * 4)); }
    else if (this.state === 'riding') {
      const k = player.keys;
      let f = (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0) - (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0);
      let s = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
      if (player.touch && Math.hypot(player.touch.x, player.touch.y) > 0.15) { f = -player.touch.y; s = player.touch.x; }
      const run = k.has('ShiftLeft') || k.has('ShiftRight'), slow = k.has('ControlLeft') || k.has('ControlRight');
      const cy = player.camYawW, fx = -Math.sin(cy), fz = -Math.cos(cy);
      const mx = fx * f - fz * s, mz = fz * f + fx * s, amt = Math.min(1, Math.hypot(mx, mz));
      let want = 0;
      if (amt > 0.05) {
        const target = Math.atan2(mx, mz), diff = Math.abs(Math.atan2(Math.sin(target - this.h), Math.cos(target - this.h)));
        this.h = angleLerp(this.h, target, Math.min(1, dt * (this.v > 6 ? 2.2 : 3.5)));
        want = (slow ? K.walk : run ? K.run : K.trot) * amt * (diff > 1.6 ? 0.3 : 1);
      }
      this.v += (want - this.v) * Math.min(1, dt * (want > this.v ? 1.6 : 2.6));
      this.step(dt, new V3(Math.sin(this.h), 0, Math.cos(this.h)));
    }
    // corpo do animal
    const H = this.obj.holder;
    H.position.copy(this.pos); H.rotation.y = this.h;
    this.anim(dt);
    if (this.state === 'riding') {
      H.updateMatrixWorld(true);
      const seat = new V3();
      if (this.back) this.back.getWorldPosition(seat); else seat.set(this.pos.x, this.pos.y + K.back, this.pos.z);
      seat.addScaledVector(new V3(Math.sin(this.h), 0, Math.cos(this.h)), K.seat);
      if (this.blanket) { this.blanket.position.set(0, seat.y - this.pos.y + 0.04, K.seat); }
      // subir no lombo: meio segundo de transição a partir de onde o explorador estava
      this.mountT = Math.min(1, (this.mountT || 0) + dt / 0.5);
      const seatRoot = seat.clone().add(new V3(0, -0.5, 0));
      const pos = this.mountT < 1 ? this.from.clone().lerp(seatRoot, this.mountT).add(new V3(0, Math.sin(this.mountT * Math.PI) * 0.6, 0)) : seatRoot;
      player.ride(dt, t, pos, this.h, 'sit', this.v, null);
      if (this.mountT >= 1) ridePose(player.rig, seat.clone().add(new V3(0, 0.04, 0)), new V3(Math.sin(this.h), 0, Math.cos(this.h)), K.belly, K.shin); // montado de verdade, pernas abertas
      player.riding = true;
    } else {
      if (this.blanket && this.back) { H.updateMatrixWorld(true); const b = new V3(); this.back.getWorldPosition(b); this.blanket.position.set(0, b.y - this.pos.y + 0.04, K.seat); }
      player.riding = false;
    }
  }
}
