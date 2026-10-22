// Efeitos de água do explorador: ondas com espuma, esteira em "V", espuma ao redor do corpo,
// respingos das braçadas e do mergulho.
import * as THREE from 'three';
import { rr } from './util.js';

function foamTexture(ring) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2), r = Math.hypot(dx, dy);
    const a0 = Math.atan2(dy, dx);
    const n = 0.55 + 0.45 * Math.sin(a0 * 23 + Math.sin(a0 * 7) * 3) * Math.sin(r * 40 + a0 * 5);
    let a;
    if (ring) a = Math.max(0, 1 - Math.abs(r - 0.82) / 0.13) * n;
    else a = Math.max(0, 1 - r) ** 1.6 * (0.6 + 0.4 * n);
    const i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, a * 255);
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeWaterFX(scene) {
  const ringTex = foamTexture(true), blobTex = foamTexture(false);
  const flat = new THREE.PlaneGeometry(1, 1); flat.rotateX(-Math.PI / 2);
  const mk = (tex, n) => Array.from({ length: n }, () => {
    const m = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({ map: tex, color: 0xf4fbff, transparent: true, opacity: 0, depthWrite: false, fog: true }));
    m.visible = false; m.renderOrder = 2; m.layers.set(1); scene.add(m);
    return { m, life: 0, max: 1, vx: 0, vz: 0, s0: 1, s1: 2, a0: 0.4 };
  });
  const rings = mk(ringTex, 40), blobs = mk(blobTex, 90);
  let ri = 0, bi = 0;
  const body = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({ map: blobTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  body.renderOrder = 2; body.layers.set(1); scene.add(body);

  // gotas
  const N = 260;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dropMat = new THREE.PointsMaterial({ color: 0xeaf6ff, size: 0.075, transparent: true, opacity: 0.85, depthWrite: false, map: blobTex, alphaTest: 0.02 });
  const drops = new THREE.Points(geo, dropMat); drops.frustumCulled = false; drops.layers.set(1); scene.add(drops);
  let di = 0;
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -1000;

  const emit = (p, n, spread, up) => {
    for (let k = 0; k < n; k++) {
      const i = di++ % N;
      pos[i * 3] = p.x + rr(-spread, spread) * 0.3; pos[i * 3 + 1] = p.y + 0.05; pos[i * 3 + 2] = p.z + rr(-spread, spread) * 0.3;
      vel[i * 3] = rr(-spread, spread); vel[i * 3 + 1] = rr(up * 0.5, up); vel[i * 3 + 2] = rr(-spread, spread);
      life[i] = rr(0.5, 1.1);
    }
  };
  // gotas lançadas numa direção (o respingo da braçada vai para a frente e para os lados)
  const emitDir = (p, n, dx, dz, along, up) => {
    for (let k = 0; k < n; k++) {
      const i = di++ % N;
      pos[i * 3] = p.x + rr(-0.08, 0.08); pos[i * 3 + 1] = p.y + 0.04; pos[i * 3 + 2] = p.z + rr(-0.08, 0.08);
      const a = rr(0.2, 1) * along, side = rr(-0.7, 0.7);
      vel[i * 3] = dx * a + dz * side; vel[i * 3 + 1] = rr(up * 0.45, up); vel[i * 3 + 2] = dz * a - dx * side;
      life[i] = rr(0.4, 0.9);
    }
  };
  const spawn = (pool, idx, p, o) => {
    const r = pool[idx % pool.length];
    r.m.position.set(p.x, p.y + 0.015 + Math.random() * 0.01, p.z); r.m.rotation.y = Math.random() * 6;
    Object.assign(r, { life: o.life, max: o.life, vx: o.vx || 0, vz: o.vz || 0, s0: o.s0, s1: o.s1, a0: o.a });
    r.m.visible = true;
  };

  return {
    ripple(p, s = 1) { spawn(rings, ri++, p, { life: 2.2, s0: 0.6, s1: 3.2 * s, a: 0.35 }); },
    splash(p) {
      emit(p, 90, 2.6, 5.5);
      spawn(rings, ri++, p, { life: 2.6, s0: 1, s1: 6, a: 0.6 });
      spawn(rings, ri++, p, { life: 1.8, s0: 0.5, s1: 4, a: 0.5 });
      for (let k = 0; k < 6; k++) spawn(blobs, bi++, p, { life: 1.6, s0: 1, s1: 2.5, a: 0.55, vx: rr(-1, 1), vz: rr(-1, 1) });
    },
    // chamado continuamente enquanto nada
    swim(p, facing, speed, dt, t) {
      const fx = Math.sin(facing), fz = Math.cos(facing);
      body.position.set(p.x + fx * 0.3, p.y + 0.012, p.z + fz * 0.3);
      body.scale.set(1.4 + speed * 0.12, 1, 2.2 + speed * 0.35);
      body.rotation.y = facing;
      body.material.opacity = 0.32 + Math.sin(t * 6) * 0.06;
      this._wake = (this._wake || 0) - dt;
      if (speed > 0.4 && this._wake <= 0) {
        this._wake = 0.07;
        // dois "braços" da esteira em V, abrindo para os lados
        for (const side of [-1, 1]) {
          const px = p.x - fx * 0.6 + fz * side * 0.35, pz = p.z - fz * 0.6 - fx * side * 0.35;
          spawn(blobs, bi++, { x: px, y: p.y, z: pz }, { life: 2.4, s0: 0.5, s1: 1.8, a: 0.42, vx: fz * side * 0.55 - fx * 0.2, vz: -fx * side * 0.55 - fz * 0.2 });
        }
      }
    },
    // mão entrando na água (braçada): respingo para a frente, coroa de gotas e anel no ponto exato
    handIn(p, facing, power) {
      const fx = Math.sin(facing), fz = Math.cos(facing);
      emitDir(p, 14 + Math.round(power * 10), fx, fz, 1.4 + power * 0.8, 1.6 + power * 1.4);
      spawn(rings, ri++, p, { life: 1.3, s0: 0.25, s1: 1.3 + power * 0.6, a: 0.5 });
      spawn(blobs, bi++, p, { life: 1.1, s0: 0.35, s1: 0.9, a: 0.55, vx: -fx * 0.3, vz: -fz * 0.3 });
    },
    // mão saindo da água: a água escorre do braço em gotas
    handOut(p) { emit(p, 6, 0.25, 0.8); },
    // pernada: espuma batida atrás dos pés
    kick(p, facing) {
      const fx = Math.sin(facing), fz = Math.cos(facing);
      spawn(blobs, bi++, p, { life: 1.0, s0: 0.3, s1: 0.8, a: 0.5, vx: -fx * 0.4, vz: -fz * 0.4 });
      emit(p, 3, 0.4, 1.1);
    },
    stopSwim() { body.material.opacity = 0; },
    update(dt) {
      for (const pool of [rings, blobs]) for (const r of pool) {
        if (r.life <= 0) continue;
        r.life -= dt;
        const k = 1 - Math.max(0, r.life) / r.max;
        const s = r.s0 + (r.s1 - r.s0) * (1 - (1 - k) ** 2);
        r.m.scale.set(s, 1, s);
        r.m.position.x += r.vx * dt; r.m.position.z += r.vz * dt;
        r.vx *= 0.985; r.vz *= 0.985;
        r.m.material.opacity = r.a0 * (1 - k) ** 1.5;
        if (r.life <= 0) r.m.visible = false;
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vel[i * 3 + 1] -= 13 * dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < -0.05 || life[i] <= 0) { life[i] = 0; pos[i * 3 + 1] = -1000; }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
