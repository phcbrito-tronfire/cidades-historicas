// O explorador: movimento (setas), pulo (espaço), nado no Nilo e câmera em terceira pessoa
import * as THREE from 'three';
import { makeHumanoid, animateHumanoid, playOnce } from './mixamo.js';
import { groundAt, waterAt, moveWithCollision, solidAt, terrainAt, blocked } from './collision.js';
import { clamp, lerp, angleLerp } from './util.js';

// tocha na mão esquerda: nos eixos da mão +y sobe pelo antebraço e +z aponta para a frente; o cabo sai do punho
// inclinado para a frente e para cima (~50°), sem atravessar o braço
const TORCH_ROT = [1.15, 0, 0], TORCH_GRIP = [0, -0.04, 0.06];

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
    this.night = 0; // 0 = dia, 1 = noite (vem do céu a cada quadro)
    this.locked = false; // durante diálogos
    this.speed = 0; this.mode = 'idle';
    this.diving = false; this.breath = 30; this.diveVy = 0; // mergulho (fôlego em segundos)
    this.bounds = [-370, 370, -370, 370]; // limite do mundo andável (x0, x1, z0, z1), definido pela cidade
    this.events = { splash: () => {}, ripple: () => {}, step: () => {} };
    this.rippleT = 0; this.stepT = 0; this.swingT = 0;
    this.bindInput();
  }

// tocha na mão esquerda, acesa sozinha à noite (a direita fica livre para os objetos pegos com P).
  // A luz já existe desde o início (só a intensidade muda): ligar/desligar uma luz recompila os shaders e trava.
  makeTorch(glowTex) {
    const mount = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.55, 8), wood); stick.position.y = 0.16;
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.034, 0.13, 10), cloth); wrap.position.y = 0.45;
    const flame = new THREE.Group(); flame.position.y = 0.51;
    const fm = new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.92, depthWrite: false });
    const fm2 = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95, depthWrite: false });
    const g1 = new THREE.ConeGeometry(0.07, 0.3, 8); g1.translate(0, 0.15, 0);
    const g2 = new THREE.ConeGeometry(0.035, 0.18, 6); g2.translate(0, 0.09, 0);
    const f1 = new THREE.Mesh(g1, fm), f2 = new THREE.Mesh(g2, fm2);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a40, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.75); glow.position.y = 0.14;
    // queda suave (decay 1): ilumina o entorno sem estourar o rosto, que fica a meio metro da chama
    const light = new THREE.PointLight(0xffa050, 0, 14, 1); light.position.y = 0.3;
    flame.add(f1, f2, glow, light);
    mount.add(stick, wrap, flame);
    mount.rotation.set(...TORCH_ROT); mount.position.set(...TORCH_GRIP);
    mount.traverse((n) => { n.layers.set(n.isSprite ? 1 : 0); if (n.isMesh) n.castShadow = n === stick || n === wrap; });
    this.rig.handL.add(mount);
    this.torch = { mount, flame, f1, glow, light, on: 0, wq: new THREE.Quaternion() };
    mount.visible = false;
  }

  updateTorch(dt, t) {
    const T = this.torch; if (!T) return;
    // acende quando escurece; apaga na água (e reacende ao sair)
    const want = this.night > 0.5 && !this.swimming ? 1 : 0;
    T.on = want ? Math.min(1, T.on + dt * 2.5) : Math.max(0, T.on - dt * (this.swimming ? 8 : 2));
    T.mount.visible = T.on > 0.01;
    T.light.intensity = 2.0 * T.on * (0.88 + Math.sin(t * 12.3) * 0.07 + Math.sin(t * 27.1) * 0.05);
    if (!T.mount.visible) return;
    // a chama fica sempre de pé, mesmo com o braço balançando
    T.mount.parent.updateWorldMatrix(true, false);
    T.mount.getWorldQuaternion(T.wq).invert();
    T.flame.quaternion.copy(T.wq);
    const k = T.on * (0.9 + Math.sin(t * 14 + 1) * 0.08 + Math.sin(t * 31) * 0.05);
    T.f1.scale.set(1, k, 1); T.f1.parent.scale.setScalar(Math.max(0.05, T.on));
    T.glow.material.opacity = 0.45 * T.on;
  }


  // fôlego no mergulho: barrinha que aparece embaixo d'água
  updateBreathBar() {
    if (!this.breathEl) {
      this.breathEl = document.createElement('div');
      this.breathEl.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);width:180px;height:8px;border-radius:5px;background:rgba(0,20,30,.45);border:1px solid rgba(220,250,255,.6);z-index:20;display:none;overflow:hidden';
      this.breathEl.innerHTML = '<div style="height:100%;width:100%;background:linear-gradient(90deg,#bff3ff,#5fd0e8);transition:width .2s"></div>';
      document.body.appendChild(this.breathEl);
    }
    const show = this.diving || (this.breath < 29.5 && this.swimming);
    this.breathEl.style.display = show ? 'block' : 'none';
    if (show) { const f = this.breath / 30; const bar = this.breathEl.firstChild; bar.style.width = (f * 100).toFixed(0) + '%'; bar.style.background = f < 0.25 ? '#ff8a6a' : 'linear-gradient(90deg,#bff3ff,#5fd0e8)'; }
  }

  // roupa molhada: ao sair da água o tecido e a pele ficam mais escuros e brilhantes, pingando, e secam em ~40 s
  updateWet(dt, inWater, depth, wl) {
    if (!this.wetMats) {
      this.wetMats = [];
      this.rig.model.traverse((n) => { if (n.isSkinnedMesh && n.visible && n.material && !this.wetMats.some((w) => w.m === n.material)) this.wetMats.push({ m: n.material, c: n.material.color.clone(), r: n.material.roughness }); });
      this.wet = 0; this._wetShown = -1; this.dripT = 0;
    }
    // molha até onde a água chega: nadando, inteiro; andando no raso, só um pouco
    if (inWater) this.wet = 1; else if (this.wading) this.wet = Math.max(this.wet, Math.min(0.5, depth)); else this.wet = Math.max(0, this.wet - dt / 40);
    if (Math.abs(this.wet - this._wetShown) > 0.01) {
      this._wetShown = this.wet;
      const k = this.wet;
      for (const w of this.wetMats) { w.m.color.copy(w.c).multiplyScalar(1 - 0.32 * k); w.m.roughness = w.r * (1 - 0.5 * k); }
    }
    // pingos caindo da roupa e das mãos
    if (!inWater && this.wet > 0.15) {
      this.dripT -= dt * (0.5 + this.wet * 5);
      if (this.dripT <= 0) {
        this.dripT = 1;
        const B = this.rig.bones, bn = ['LeftHand', 'RightHand', 'Hips', 'Spine2', 'LeftLeg', 'RightLeg'][Math.floor(Math.random() * 6)];
        if (B[bn]) { const v = new THREE.Vector3(); B[bn].getWorldPosition(v); this.events.drip?.(v); }
      }
    }
  }

  // braçadas e pernadas de verdade: os respingos saem de onde a mão entra na água e a espuma de onde os pés batem
  trackSwimLimbs(wl, speed, dt) {
    const B = this.rig.bones;
    if (!this.limbs) this.limbs = ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'].filter((n) => B[n]).map((n) => ({ n, hand: /Hand/.test(n), prev: null, cd: 0, v: new THREE.Vector3() }));
    this.rig.root.updateMatrixWorld(true);
    const power = Math.min(1, speed / 5);
    for (const L of this.limbs) {
      B[L.n].getWorldPosition(L.v);
      const h = L.v.y - wl;
      L.cd -= dt;
      if (L.prev !== null && speed > 0.3) {
        if (L.hand) {
          if (L.prev > 0.03 && h <= 0.03 && L.cd <= 0) { this.events.handIn?.({ x: L.v.x, y: wl, z: L.v.z }, this.facing, power); L.cd = 0.25; }
          else if (L.prev < -0.02 && h >= -0.02) this.events.handOut?.({ x: L.v.x, y: wl, z: L.v.z });
        } else if (Math.abs(h) < 0.22 && L.cd <= 0) { this.events.kick?.({ x: L.v.x, y: wl, z: L.v.z }, this.facing); L.cd = 0.16 / (0.5 + power); }
      }
      L.prev = h;
    }
  }

  place(x, z, facing) {
    this.pos.set(x, groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6), z); // (em cima de cais e plataformas sobre a água)
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

  // sair da água: nadando contra um cais, uma pedra ou um barranco (até ~2,3 m acima da água), o explorador
  // apoia as mãos na borda, ergue o corpo e sobe — sem precisar achar uma praia
  tryClimb(wl) {
    const p = this.pos, fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    for (const d of [0.5, 0.85]) {
      const ax = p.x + fx * d, az = p.z + fz * d;
      const top = groundAt(ax, az, wl + 2.3);
      if (top < wl - 0.3 || top > wl + 2.3) continue;
      const lx = p.x + fx * (d + 0.5), lz = p.z + fz * (d + 0.5);
      const land = groundAt(lx, lz, top + 0.3);
      if (Math.abs(land - top) > 0.5 || waterAt(lx, lz) - land > 0.8 || blocked(lx, lz, land, 0.3, 1.7)) continue;
      // animação do Mixamo "Pulling Up To A Ledge", acelerada para durar o tempo da subida
      const dur = 1.5 + Math.max(0, top - wl) * 0.35;
      playOnce(this.rig, 'borda', dur);
      { const a = this.rig.act('borda'); if (a) a.timeScale = a.getClip().duration / dur; }
      this.climb = { t: 0, dur, from: p.clone(), edge: new THREE.Vector3(p.x + fx * (d - 0.25), top, p.z + fz * (d - 0.25)), to: new THREE.Vector3(lx, land, lz) };
      this.swimming = false; this.diving = false; this.speed = 0;
      this.events.ripple(new THREE.Vector3(p.x, wl + 0.02, p.z), 1.2);
      return true;
    }
    return false;
  }

  updateClimb(dt, t) {
    const C = this.climb, p = this.pos;
    C.t += dt / C.dur;
    const k = Math.min(1, C.t);
    // primeiro ergue o corpo até a borda (perto da parede), depois passa o peso para a frente e fica de pé
    if (k < 0.6) { const e = k / 0.6, s = e * e * (3 - 2 * e); p.set(lerp(C.from.x, C.edge.x, s * 0.6), lerp(C.from.y, C.edge.y + 0.05, s), lerp(C.from.z, C.edge.z, s * 0.6)); }
    else { const e = (k - 0.6) / 0.4, s = e * e * (3 - 2 * e); const ex = lerp(C.from.x, C.edge.x, 0.6), ez = lerp(C.from.z, C.edge.z, 0.6); p.set(lerp(ex, C.to.x, s), lerp(C.edge.y + 0.05, C.to.y, s), lerp(ez, C.to.z, s)); }
    this.mode = 'air';
    animateHumanoid(this.rig, dt, 0, 'idle', t);
    this.rig.root.rotation.y = this.facing;
    this.pitch = lerp(this.pitch || 0, 0, Math.min(1, dt * 8)); this.rig.model.rotation.x = this.pitch; this.rig.model.rotation.z = 0;
    this.updateWet(dt, false, 0, -100); this.updateTorch(dt, t); this.updateBreathBar();
    if (k >= 1) { this.climb = null; this.onGround = true; this.vy = 0; this.wasInWater = false; this.events.step(true); }
    this.updateCamera(dt);
  }

  update(dt, t) {
    if (this.climb) return this.updateClimb(dt, t);
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
    if (has) target = (this.swimming ? (run ? 4.6 : 2.9) : walk ? 1.6 : run ? 8.6 : 4.8) * (analog < 0.5 ? 0.45 : analog);
    if (this.wading) target *= 0.55;
    if (has && turnDiff > 1.2 && this.onGround) target *= 0.35; // meia-volta: desacelera e gira
    // curva suave (arranque progressivo, sem degrau) com um piso linear para não ficar eterna no fim
    const grounded = this.onGround || this.swimming;
    const k = target > this.speed ? (grounded ? (this.swimming ? 1.6 : 3.2) : 0.6) : (grounded ? (this.swimming ? 2.2 : 4) : 0.3);
    const prevSpeed = this.speed;
    const dv = target - this.speed;
    this.speed += Math.sign(dv) * Math.min(Math.abs(dv), Math.abs(dv) * (1 - Math.exp(-dt * k)) + dt * (grounded ? 1.2 : 0.2));
    this.accelNow = (this.speed - prevSpeed) / Math.max(dt, 1e-4);

    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    const before = p.clone();
    if (this.speed > 0.01) moveWithCollision(p, fx * this.speed * dt, fz * this.speed * dt, 0.32, 1.75);
    const W = this.bounds; p.x = clamp(p.x, W[0], W[1]); p.z = clamp(p.z, W[2], W[3]);
    const realSpeed = before.distanceTo(new THREE.Vector3(p.x, before.y, p.z)) / Math.max(dt, 1e-4);
    if (realSpeed < this.speed * 0.3 && this.onGround) this.speed = Math.max(realSpeed, this.speed * 0.8); // bateu na parede

    // chão / água
    const ground = groundAt(p.x, p.z, p.y);
    const wl = waterAt(p.x, p.z);
    const depth = wl - ground;

    if (this.swimming) {
      const surfY = wl - 0.72; // cabeça e ombros acima da linha d'água; as mãos rompem a superfície a cada braçada
      // mergulho: Espaço afunda (onde há fundo suficiente); embaixo d'água, Espaço sobe e Ctrl desce mais
      const sp = this.key('Space') && !this.locked;
      if (sp && !this.spaceHeld) {
        if (!this.diving && depth > 2.4) { this.diving = true; this.surfacing = false; this.diveVy = -2.4; this.events.ripple(new THREE.Vector3(p.x, wl + 0.02, p.z), 1.4); }
        else if (this.diving) this.surfacing = true;
      }
      this.spaceHeld = sp;
      if (this.diving) {
        // nadando para a frente, vai para onde a câmera aponta (câmera mais alta, olhando para baixo = descer)
        let vyT = -Math.sin(this.camPitch - 0.28) * 1.3 * this.speed + 0.15 + (this.key('ControlLeft', 'ControlRight') ? -1.6 : 0);
        if (this.surfacing || this.breath <= 0) vyT = 1.9;
        this.diveVy = lerp(this.diveVy, vyT, Math.min(1, dt * (this.diveVy < -1 ? 0.8 : 3)));
        p.y += this.diveVy * dt;
        if (p.y < ground + 0.3) { p.y = ground + 0.3; this.diveVy = Math.max(0, this.diveVy); }
        this.breath = Math.max(0, this.breath - dt);
        if ((p.y >= surfY && this.diveVy > 0) || depth < 1.4) {
          this.diving = false; this.surfacing = false; p.y = Math.min(p.y, surfY);
          this.events.splash?.(p.clone().setY(wl), 0.35); // volta à tona com um respingo pequeno
        }
      } else {
        if (has && this.tryClimb(wl)) return this.updateClimb(dt, t);
        p.y = lerp(p.y, surfY, Math.min(1, dt * 4));
        this.breath = Math.min(30, (this.breath ?? 30) + dt * 8);
      }
      this.vy = 0;
      if (depth < 1.0 && !this.diving) { this.swimming = false; p.y = Math.max(ground, p.y); }
    } else {
      if (this.onGround && this.key('Space') && !this.locked && !this.jumpHeld) {
        this.vy = 6.4; this.onGround = false; this.jumpHeld = true; this.events.step(true);
      }
      if (!this.key('Space')) this.jumpHeld = false;
      if (!this.onGround && !this.headDive && this.vy < -2 && p.y - wl > 1.2 && depth > 2.2) { this.headDive = true; playOnce(this.rig, 'salto_agua', 0.9); }
      if (this.onGround) this.headDive = false;
      if (!this.onGround) {
        this.vy -= 20 * dt;
        p.y += this.vy * dt;
        if (p.y <= ground) {
          if (this.vy < -7.5) { playOnce(this.rig, 'Jump_Land', 0.32); this.speed *= 0.45; } // aterrissagem pesada
          if (this.vy < -13) this.fallHit = -this.vy; // queda alta machuca (a vida lê isto)
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
    // dentro d'água o explorador sai do reflexo (o corpo meio submerso refletido parecia um vulto escuro na superfície)
    const inWater = this.swimming || (this.wading && depth > 0.7);
    if (inWater !== this._layerWet) {
      this._layerWet = inWater;
      this.rig.root.traverse((n) => { if (!n.isSprite) n.layers.set(inWater ? 2 : 0); });
    }

    // ondas na água
    this.rippleT -= dt;
    if ((this.swimming || this.wading) && !this.diving && this.rippleT <= 0) {
      this.events.ripple(new THREE.Vector3(p.x, wl + 0.02, p.z), realSpeed > 0.3 ? 1 : 0.6);
      this.rippleT = realSpeed > 0.3 ? 0.45 : 1.3;
    }
    // esteira, espuma e respingos das braçadas
    if (this.swimming && !this.diving) this.events.swim?.(new THREE.Vector3(p.x, wl, p.z), this.facing, realSpeed, dt, t);
    else if (this.wasSwimming) this.events.stopSwim?.();
    this.wasSwimming = this.swimming && !this.diving;
    this.updateBreathBar();
    // passos
    if (this.onGround && !this.wading && realSpeed > 1) {
      this.stepT -= dt * realSpeed;
      if (this.stepT <= 0) { this.events.step(false, run); this.stepT = realSpeed > 5 ? 1.9 : 1.4; }
    }

    // animação
    let mode = 'idle';
    if (this.swimming) mode = this.diving ? 'dive' : 'swim';
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
    // inclina o tronco para a frente na arrancada e no sprint, e para trás ao frear
    // nadando: cabeça um pouco acima e pernas mais fundas (os calcanhares não furam a superfície a cada pernada)
    const pitchT = this.diving ? clamp(-this.diveVy * 0.32, -0.55, 0.7) : this.swimming ? -0.13 : !this.onGround ? 0 : clamp(this.accelNow * 0.012, -0.07, 0.1) + clamp((realSpeed - 4.8) / 3.8, 0, 1) * 0.07;
    this.pitch = lerp(this.pitch || 0, pitchT, Math.min(1, dt * 5));
    this.rig.model.rotation.x = this.pitch;
    if (this.swimming && !this.diving) this.trackSwimLimbs(wl, realSpeed, dt); else if (this.limbs) for (const L of this.limbs) L.prev = null;
    // a câmera abre um pouco no sprint (sensação de velocidade)
    const fovT = 60 + clamp((realSpeed - 4.8) / 3.8, 0, 1) * 6;
    if (Math.abs(this.camera.fov - fovT) > 0.05) { this.camera.fov = lerp(this.camera.fov, fovT, Math.min(1, dt * 3)); this.camera.updateProjectionMatrix(); }
    if (this.holding) this.holding.mesh.visible = !this.swimming;
    this.updateWet(dt, inWater, depth, wl);
    this.updateTorch(dt, t);

    // câmera acompanha por trás com atraso, se o mouse estiver parado
    const idleMouse = t - this.lastMouse > 1.5;
    if (realSpeed > 0.5 && idleMouse && !this.dragging) {
      const behind = this.facing + Math.PI;
      const diff = Math.abs(((behind - this.camYawW + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < 2.4) this.camYawW = angleLerp(this.camYawW, behind, Math.min(1, dt * 1.4 * Math.min(1.5, realSpeed / 3.5)));
    }
    this.updateCamera(dt);
  }

  // a bordo de um barco: o barco decide a posição; o explorador só anima (sentado ou em pé) e a câmera acompanha
  // reações (animações do Mixamo): golpe ao levar dano, desmaio quando a vida acaba, gole ao comer/beber
  hurt() { if (!this.swimming && !this.climb && this.onGround) playOnce(this.rig, 'golpe', 0.42); }
  collapse() { if (!this.swimming) playOnce(this.rig, 'desmaiar', 4.5); }
  drink() { if (!this.swimming) playOnce(this.rig, 'beber', 2.6); }

  // câmera própria do barco: guarda a do explorador e abre o enquadramento
  boardCam(pitch = 0.36) { this.savedCam = { pitch: this.camPitch, dist: this.camTargetDist }; this.camPitch = pitch; this.boatZoom = 1; }
  leaveCam() { this.rideCam = null; if (this.savedCam) { this.camPitch = this.savedCam.pitch; this.camTargetDist = this.savedCam.dist; this.savedCam = null; } }

  ride(dt, t, pos, facing, mode, speed = 0, cam = null) {
    this.rideCam = cam;
    this.pos.copy(pos); this.facing = facing; this.rig.root.rotation.y = facing;
    this.speed = speed; this.swimming = false; this.diving = false; this.wading = false; this.onGround = true; this.vy = 0;
    this.mode = mode;
    this.rig.model.rotation.set(0, 0, 0); this.pitch = 0; this.lean = 0;
    if (this._layerWet) { this._layerWet = false; this.rig.root.traverse((n) => { if (!n.isSprite) n.layers.set(0); }); }
    this.rig.holding = !!this.holding;
    animateHumanoid(this.rig, dt, 0, mode, t);
    this.updateTorch(dt, t);
    this.updateWet(dt, false, 0, -100);
    this.updateBreathBar();
    const idleMouse = t - this.lastMouse > 1.5;
    if (idleMouse && !this.dragging && Math.abs(speed) > 0.3) this.camYawW = angleLerp(this.camYawW, facing + Math.PI, Math.min(1, dt * 0.8));
    this.updateCamera(dt);
  }

  updateCamera(dt, snap = false) {
    const R = this.rideCam;
    if (R) return this.updateBoatCamera(dt, R);
    this.camDist = lerp(this.camDist, this.camTargetDist + (this.speed > 6 ? 0.8 : 0), Math.min(1, dt * 3));
    // alvo levemente acima do ombro direito (enquadramento de jogo de aventura)
    const sx = Math.cos(this.camYawW) * 0.45, sz = -Math.sin(this.camYawW) * 0.45;
    const target = new THREE.Vector3(this.pos.x + sx, this.pos.y + (this.diving ? 0.75 : this.swimming ? 0.9 : 1.6), this.pos.z + sz);
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
    // a câmera não fica cortando a superfície: acima dela nadando ou andando, abaixo dela no mergulho
    if (this.diving) { if (want.y > wl - 0.3) want.y = wl - 0.3; }
    else if (want.y < wl + 0.35) want.y = wl + 0.35;
    if (snap) this.camPos.copy(want);
    else this.camPos.lerp(want, Math.min(1, dt * 14));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  // no barco: órbita em volta do meio do casco (a roda do mouse aproxima/afasta), sem colidir com o próprio barco
  updateBoatCamera(dt, R) {
    const dist = R.dist * clamp(this.camTargetDist / 6.5, 0.45, 2.2);
    this.camDist = lerp(this.camDist, dist, Math.min(1, dt * 2.5));
    const tgt = new THREE.Vector3(R.x, R.y, R.z);
    this.camTarget = this.camTarget ? this.camTarget.lerp(tgt, Math.min(1, dt * 6)) : tgt;
    const pitch = Math.max(0.12, this.camPitch), yaw = this.camYawW;
    const want = this.camTarget.clone().add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(this.camDist));
    want.y = Math.max(want.y, waterAt(want.x, want.z) + 1.2, terrainAt(want.x, want.z) + 1);
    this.camPos.lerp(want, Math.min(1, dt * 5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  frontPoint(dist = 0.9) {
    return new THREE.Vector3(this.pos.x + Math.sin(this.facing) * dist, this.pos.y, this.pos.z + Math.cos(this.facing) * dist);
  }
}
