// O explorador: movimento (setas), pulo (espaço), nado no Nilo e câmera em terceira pessoa
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce } from './mixamo.js';
import { groundAt, waterAt, moveWithCollision, solidAt, terrainAt } from './collision.js';
import { WORLD } from './terrain.js';
import { clamp, lerp, angleLerp } from './util.js';

export class Player {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.rig = makeHumanoid({ outfit: 'explorer', hair: 'fedora', skin: 0xc48d62, height: 1.8, collar: null, realHead: false }); // cabeça escaneada desligada até os corpos do Mixamo chegarem
    this.rig.root.traverse((n) => n.layers.set(0)); // o explorador aparece no reflexo do Nilo
    scene.add(this.rig.root);
    this.pos = this.rig.root.position;
    this.facing = -Math.PI / 2; // olhando para o templo (oeste)
    this.vy = 0; this.onGround = true; this.swimming = false; this.wading = false;
    this.keys = new Set();
    this.camYawW = this.facing + Math.PI; this.camPitch = 0.28; this.camDist = 6.5; this.camTargetDist = 6.5;
    this.lastMouse = -10; this.dragging = false;
    this.camPos = new THREE.Vector3();
    this.holding = null;
    this.locked = false; // durante diálogos
    this.speed = 0; this.mode = 'idle';
    this.events = { splash: () => {}, ripple: () => {}, step: () => {} };
    this.rippleT = 0; this.stepT = 0; this.swingT = 0;
    this.bindInput();
  }

  place(x, z, facing) {
    this.pos.set(x, groundAt(x, z, terrainAt(x, z) + 1.6), z);
    if (facing !== undefined) this.facing = facing;
    this.camYawW = this.facing + Math.PI;
    this.updateCamera(1, true);
  }

  bindInput() {
    const gameKeys = ['ControlLeft', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'];
    addEventListener('keydown', (e) => {
      if (gameKeys.includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    const canvas = document.querySelector('#game canvas') || document.body;
    addEventListener('mousedown', (e) => { if (e.target.tagName === 'CANVAS') { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; } });
    addEventListener('mouseup', () => (this.dragging = false));
    addEventListener('mousemove', (e) => {
      if (!this.dragging || this.locked) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.camYawW -= dx * 0.006;
      this.camPitch = clamp(this.camPitch + dy * 0.004, -0.25, 1.3);
      this.lastMouse = performance.now() / 1000;
    });
    addEventListener('wheel', (e) => { if (e.target.tagName === 'CANVAS') this.camTargetDist = clamp(this.camTargetDist + Math.sign(e.deltaY) * 0.8, 2.2, 16); }, { passive: true });
    addEventListener('contextmenu', (e) => { if (e.target.tagName === 'CANVAS') e.preventDefault(); });
    void canvas;
  }

  key(...codes) { return codes.some((c) => this.keys.has(c)); }

  update(dt, t) {
    // entrada relativa à câmera (estilo Uncharted): ↑ vai para onde a câmera olha, ← → para os lados
    let f = this.locked ? 0 : (this.key('ArrowUp', 'KeyW') ? 1 : 0) - (this.key('ArrowDown', 'KeyS') ? 1 : 0);
    let s = this.locked ? 0 : (this.key('ArrowRight', 'KeyD') ? 1 : 0) - (this.key('ArrowLeft', 'KeyA') ? 1 : 0);
    // joystick do celular (analógico: quanto mais longe do centro, mais rápido)
    let analog = 1;
    if (!this.locked && this.touch && Math.hypot(this.touch.x, this.touch.y) > 0.15) { f = -this.touch.y; s = this.touch.x; analog = Math.min(1, Math.hypot(f, s)); }
    const run = this.key('ShiftLeft', 'ShiftRight');
    const walk = this.key('ControlLeft', 'ControlRight');
    const p = this.pos;
    const fwdX = -Math.sin(this.camYawW), fwdZ = -Math.cos(this.camYawW);
    let mx = fwdX * f + -fwdZ * s, mz = fwdZ * f + fwdX * s;
    const has = Math.hypot(mx, mz) > 0.01;

    // giro suave em direção ao movimento
    const prevFacing = this.facing;
    let turnDiff = 0;
    if (has) {
      const want = Math.atan2(mx, mz);
      turnDiff = Math.abs(((want - this.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const rate = this.swimming ? 4 : !this.onGround ? 2.5 : this.speed > 6 ? 7 : 11;
      this.facing = angleLerp(this.facing, want, 1 - Math.exp(-dt * rate));
    }
    const omega = (((this.facing - prevFacing + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / Math.max(dt, 1e-4);

    // aceleração e freada (nada de parar ou arrancar seco)
    let target = 0;
    if (has) target = (this.swimming ? (run ? 5.2 : 3.4) : walk ? 1.6 : run ? 8.6 : 4.8) * (analog < 0.5 ? 0.45 : analog);
    if (this.wading) target *= 0.55;
    if (has && turnDiff > 1.2 && this.onGround) target *= 0.35; // meia-volta: desacelera e gira
    const accel = target > this.speed ? (this.onGround || this.swimming ? 9 : 2) : (this.onGround || this.swimming ? 12 : 1);
    this.speed += Math.sign(target - this.speed) * Math.min(Math.abs(target - this.speed), accel * dt);

    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    const before = p.clone();
    if (this.speed > 0.01) moveWithCollision(p, fx * this.speed * dt, fz * this.speed * dt, 0.32, 1.75);
    p.x = clamp(p.x, -WORLD, WORLD); p.z = clamp(p.z, -WORLD, WORLD);
    const realSpeed = before.distanceTo(new THREE.Vector3(p.x, before.y, p.z)) / Math.max(dt, 1e-4);
    if (realSpeed < this.speed * 0.3 && this.onGround) this.speed = Math.max(realSpeed, this.speed * 0.8); // bateu na parede

    // chão / água
    const ground = groundAt(p.x, p.z, p.y);
    const wl = waterAt(p.x, p.z);
    const depth = wl - ground;

    if (this.swimming) {
      const ty = wl - 0.8; // costas e cabeça acima da linha d'água
      p.y = lerp(p.y, ty, Math.min(1, dt * 4));
      this.vy = 0;
      if (depth < 1.0) { this.swimming = false; p.y = Math.max(ground, p.y); }
    } else {
      if (this.onGround && this.key('Space') && !this.locked && !this.jumpHeld) {
        this.vy = 6.4; this.onGround = false; this.jumpHeld = true; this.events.step(true);
      }
      if (!this.key('Space')) this.jumpHeld = false;
      if (!this.onGround) {
        this.vy -= 20 * dt;
        p.y += this.vy * dt;
        if (p.y <= ground) {
          if (this.vy < -7.5) { playOnce(this.rig, 'Jump_Land', 0.32); this.speed *= 0.45; } // aterrissagem pesada
          p.y = ground; this.onGround = true; this.vy = 0; this.events.step(true);
        }
      } else if (ground < p.y - 0.5) { this.onGround = false; this.vy = 0; }
      else p.y = lerp(p.y, ground, Math.min(1, dt * 18)); // degraus sem tranco
      if (depth > 1.3 && p.y < wl - 0.55) {
        this.swimming = true; this.onGround = false;
        if (this.vy < -3 || !this.wasInWater) this.events.splash(p.clone().setY(wl));
        this.vy = 0;
      }
    }
    this.wading = !this.swimming && depth > 0.35 && p.y < wl;
    this.wasInWater = this.swimming || this.wading;

    // ondas na água
    this.rippleT -= dt;
    if ((this.swimming || this.wading) && this.rippleT <= 0) {
      this.events.ripple(new THREE.Vector3(p.x, wl + 0.02, p.z), realSpeed > 0.3 ? 1 : 0.6);
      this.rippleT = realSpeed > 0.3 ? 0.45 : 1.3;
    }
    // esteira, espuma e respingos das braçadas
    if (this.swimming) this.events.swim?.(new THREE.Vector3(p.x, wl, p.z), this.facing, realSpeed, dt, t);
    else if (this.wasSwimming) this.events.stopSwim?.();
    this.wasSwimming = this.swimming;
    // passos
    if (this.onGround && !this.wading && realSpeed > 1) {
      this.stepT -= dt * realSpeed;
      if (this.stepT <= 0) { this.events.step(false, run); this.stepT = realSpeed > 5 ? 1.9 : 1.4; }
    }

    // animação
    let mode = 'idle';
    if (this.swimming) mode = 'swim';
    else if (!this.onGround && (this.vy > 1 || p.y - ground > 0.6)) mode = 'air';
    else if (realSpeed > 0.15) mode = this.wading ? 'wade' : 'run';
    this.mode = mode;
    this.rig.holding = !!this.holding && !this.swimming;
    if (this.swingT > 0) { this.swingT = 0; playOnce(this.rig, 'Sword_Attack', 0.9); }
    if (this.pickT > 0) { this.pickT = 0; playOnce(this.rig, 'PickUp_Table', 0.8); }
    animateHumanoid(this.rig, dt, realSpeed, mode, t);
    this.rig.root.rotation.y = this.facing;
    // inclina o corpo nas curvas e ao acelerar
    const leanT = this.swimming ? 0 : clamp(-omega * realSpeed * 0.018, -0.22, 0.22);
    this.lean = lerp(this.lean || 0, leanT, Math.min(1, dt * 6));
    this.rig.model.rotation.z = this.lean;
    if (this.holding) this.holding.mesh.visible = !this.swimming;

    // câmera acompanha por trás com atraso, se o mouse estiver parado
    const idleMouse = t - this.lastMouse > 1.5;
    if (realSpeed > 0.5 && idleMouse && !this.dragging) {
      const behind = this.facing + Math.PI;
      const diff = Math.abs(((behind - this.camYawW + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < 2.4) this.camYawW = angleLerp(this.camYawW, behind, Math.min(1, dt * 1.4 * Math.min(1.5, realSpeed / 3.5)));
    }
    this.updateCamera(dt);
  }

  updateCamera(dt, snap = false) {
    this.camDist = lerp(this.camDist, this.camTargetDist + (this.speed > 6 ? 0.8 : 0), Math.min(1, dt * 3));
    // alvo levemente acima do ombro direito (enquadramento de jogo de aventura)
    const sx = Math.cos(this.camYawW) * 0.45, sz = -Math.sin(this.camYawW) * 0.45;
    const target = new THREE.Vector3(this.pos.x + sx, this.pos.y + (this.swimming ? 0.9 : 1.6), this.pos.z + sz);
    this.camTarget = this.camTarget ? this.camTarget.lerp(target, Math.min(1, dt * 12)) : target.clone();
    if (snap) this.camTarget.copy(target);
    const yaw = this.camYawW;
    const pitch = this.camPitch;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    // recua até bater em algo sólido
    let d = this.camDist;
    for (let st = 0.4; st <= this.camDist; st += 0.25) {
      const q = this.camTarget.clone().addScaledVector(dir, st);
      if (solidAt(q.x, q.y, q.z)) { d = Math.max(0.6, st - 0.35); break; }
    }
    const want = this.camTarget.clone().addScaledVector(dir, d);
    const wl = waterAt(want.x, want.z);
    if (want.y < wl + 0.35) want.y = wl + 0.35;
    if (snap) this.camPos.copy(want);
    else this.camPos.lerp(want, Math.min(1, dt * 14));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  frontPoint(dist = 0.9) {
    return new THREE.Vector3(this.pos.x + Math.sin(this.facing) * dist, this.pos.y, this.pos.z + Math.cos(this.facing) * dist);
  }
}
