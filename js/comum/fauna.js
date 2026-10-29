// Bichos da água (modelos do Sketchfab, CC BY): cardumes, pargos, golfinhos, tartarugas e águas-vivas no mar;
// crocodilos no Nilo. Cada modelo é carregado uma vez, virado para +z (a "frente" no quadro local) e copiado;
// os animados ganham um mixer próprio, que só roda perto do jogador (longe, o bicho some e não custa nada).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ver, mulberry32, clamp, lerp, angleLerp } from './util.js';

const DIR = 'assets/models/fauna/';
// yaw/rot: endireita o modelo e vira a cabeça para +z; fit: medida usada para o tamanho (comprimento ou altura);
// base: origem embaixo (bichos do fundo) em vez do centro (nadadores)
const DEFS = {
  golfinho: {}, pargo: {}, cardume: {},
  tartaruga: { yaw: -Math.PI / 2 },
  aguaviva: { fit: 'y' },
  jacare: { yaw: 0, base: true, keep: true }, // animado (andar): a animação é controlada pela velocidade
  anfora_mar: { fit: 'y', base: true },
  estrela: { rot: [-Math.PI / 2, 0, 0], base: true },
  cavalo: { base: true, keep: true }, jumento: { base: true, keep: true }, // montarias: as animações são escolhidas por nome
};
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = {};
function unit(name) {
  return (cache[name] ??= loader.loadAsync(ver(DIR + name + '.glb')).then((g) => {
    const d = DEFS[name] || {};
    const inner = g.scene; if (d.rot) inner.rotation.set(...d.rot);
    const turn = new THREE.Group(); turn.rotation.y = d.yaw || 0; turn.add(inner);
    const norm = new THREE.Group(); norm.add(turn); norm.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(norm), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    turn.position.set(-c.x, d.base ? -box.min.y : -c.y, -c.z);
    const k = 1 / (d.fit === 'y' ? s.y : Math.max(s.x, s.z));
    const u = new THREE.Group(); u.scale.setScalar(k); u.add(norm);
    let skinned = false;
    u.traverse((o) => { if (!o.isMesh) return; if (o.isSkinnedMesh) skinned = true; o.frustumCulled = !o.isSkinnedMesh; o.castShadow = false; o.receiveShadow = false; if (o.material) o.material.envMapIntensity = 0.4; });
    return { u, clips: g.animations, skinned };
  }).catch((e) => { console.warn('fauna', name, e); return null; }));
}

// uma cópia do tamanho pedido, já animando (se o modelo tiver animação)
export async function creature(name, size, { speed = 1, tint = null, still = false } = {}) {
  const U = await unit(name); if (!U) return null;
  const o = U.skinned ? skClone(U.u) : U.u.clone();
  o.scale.setScalar(size * U.u.scale.x);
  if (tint) o.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(...tint)); } });
  let mixer = null;
  if (U.clips.length) { mixer = new THREE.AnimationMixer(o); if (!still) { const a = mixer.clipAction(U.clips[0]); a.time = Math.random() * U.clips[0].duration; a.timeScale = speed; a.play(); } }
  const holder = new THREE.Group(); holder.add(o);
  return { holder, o, mixer, clips: U.clips };
}

// muitas cópias paradas de um modelo (estrelas-do-mar, ânforas) numa InstancedMesh por pedaço
export async function scatterStatic(scene, name, pts) {
  const U = await unit(name); if (!U || !pts.length) return;
  U.u.updateMatrixWorld(true);
  const d = new THREE.Object3D(), m4 = new THREE.Matrix4();
  U.u.traverse((o) => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, pts.length);
    pts.forEach((p, i) => { d.position.set(p.x, p.y, p.z); d.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0); d.scale.setScalar(p.s); d.updateMatrix(); im.setMatrixAt(i, m4.multiplyMatrices(d.matrix, o.matrixWorld)); });
    im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
  });
}

// ouriço-do-mar feito aqui (o escaneado tinha 225 mil triângulos): bolinha roxa cheia de espinhos
export function urchinGeometry() {
  const parts = [new THREE.IcosahedronGeometry(0.07, 1)];
  const dirs = new THREE.IcosahedronGeometry(1, 1).attributes.position, seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize(), k = v.toArray().map((x) => x.toFixed(2)).join();
    if (seen.has(k) || v.y < -0.4) continue; seen.add(k);
    const c = new THREE.ConeGeometry(0.008, 0.13, 3); c.translate(0, 0.13, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v)); parts.push(c);
  }
  for (const p of parts) p.deleteAttribute('uv');
  return mergeGeometries(parts.map((p) => p.toNonIndexed()));
}

// ------------------------------------------------------------------------------------------------------------
// Mar vivo: os bichos nadam em voltas largas (cada um com centro, raio e faixa de profundidade próprios), fogem do
// explorador (os peixes) ou chegam perto dele (os golfinhos, curiosos), e as águas-vivas queimam quem encosta.
export class SeaLife {
  // opts: { waterY, floorAt(x,z), seaPoint(rng) → {x,z} ou null, onSting() }
  constructor(scene, opts) {
    this.scene = scene; this.o = opts; this.list = []; this.t = 0; this.stingCd = 0;
    this.rng = mulberry32(777);
  }
  async populate(spec) {
    const R = this.rng;
    for (const [name, n, size, kind] of spec) {
      for (let i = 0; i < n; i++) {
        const p = this.o.seaPoint(R, kind); if (!p) continue;
        const c = await creature(name, size * (0.85 + R() * 0.3), { speed: kind === 'jelly' ? 0.6 : 1 }); if (!c) break;
        const a = { ...c, name, kind, cx: p.x, cz: p.z, R: kind === 'jelly' ? 2 + R() * 3 : kind === 'dolphin' ? 25 + R() * 20 : 6 + R() * 14, ang: R() * 6.3, dir: R() < 0.5 ? -1 : 1,
          sp: { fish: 1.6, school: 1.2, dolphin: 5.5, turtle: 0.9, jelly: 0.15 }[kind] * (0.8 + R() * 0.4), yk: R(), size, h: 0, flee: new THREE.Vector3(), jump: 0 };
        a.holder.visible = false; this.scene.add(a.holder); this.list.push(a);
      }
    }
  }
  update(dt, t, player) {
    this.t = t; this.stingCd -= dt;
    const W = this.o.waterY, P = player.pos;
    for (const a of this.list) {
      const dx0 = a.cx - P.x, dz0 = a.cz - P.z;
      const near = dx0 * dx0 + dz0 * dz0 < (a.R + 75) ** 2;
      a.holder.visible = near; if (!near) continue;
      // golfinhos curiosos: quando o explorador nada por perto, a volta deles passa a ser em torno dele
      if (a.kind === 'dolphin' && player.swimming && dx0 * dx0 + dz0 * dz0 < 60 * 60) { a.cx = lerp(a.cx, P.x, dt * 0.25); a.cz = lerp(a.cz, P.z, dt * 0.25); a.R = lerp(a.R, 9, dt * 0.2); }
      a.ang += a.dir * a.sp / a.R * dt;
      const wob = Math.sin(t * 0.3 + a.yk * 9) * a.R * 0.25;
      let x = a.cx + Math.cos(a.ang) * (a.R + wob), z = a.cz + Math.sin(a.ang) * (a.R + wob);
      // os peixes desviam do explorador
      if (a.kind === 'fish' || a.kind === 'school' || a.kind === 'turtle') {
        const ex = x - P.x, ez = z - P.z, d = Math.hypot(ex, ez), r = a.kind === 'school' ? 7 : 4;
        if (d < r && (player.swimming || player.wading)) a.flee.set(ex / d, 0, ez / d).multiplyScalar((r - d) * 1.2);
        a.flee.multiplyScalar(Math.exp(-dt * 0.8));
        x += a.flee.x; z += a.flee.z;
      }
      const floor = this.o.floorAt(x, z), depth = W - floor;
      let y;
      if (a.kind === 'jelly') y = W - 0.8 - (0.5 + 0.5 * Math.sin(t * 0.4 + a.yk * 6)) * Math.min(4, depth * 0.5);
      else if (a.kind === 'dolphin') {
        y = W - 1.1 + Math.sin(t * 0.7 + a.yk * 5) * 0.5;
        // de vez em quando, um salto fora d'água
        if (a.jump <= 0 && Math.sin(t * 0.13 + a.yk * 20) > 0.995) a.jump = 1;
        if (a.jump > 0) { a.jump -= dt / 1.4; y = W - 1.1 + Math.sin((1 - a.jump) * Math.PI) * 3.2; }
      } else y = floor + 0.7 + (0.3 + 0.4 * a.yk) * Math.max(0, depth - 1.6);
      y = Math.min(y, a.kind === 'dolphin' ? 99 : W - 0.5); y = Math.max(y, floor + 0.35);
      const vx = x - a.holder.position.x, vz = z - a.holder.position.z, vy = y - a.holder.position.y;
      if (vx * vx + vz * vz > 1e-6) a.h = angleLerp(a.h, Math.atan2(vx, vz), Math.min(1, dt * 3));
      a.holder.position.set(x, y, z);
      a.holder.rotation.set(0, 0, 0);
      if (a.kind !== 'jelly') { a.holder.rotation.y = a.h; a.holder.rotation.x = clamp(-Math.atan2(vy, Math.hypot(vx, vz) + 1e-4), -0.8, 0.8); }
      // animação: perto, todo quadro; longe, a cada 3 (economiza com muitos peixes)
      if (a.mixer) { a.mt = (a.mt || 0) + dt; if (dx0 * dx0 + dz0 * dz0 < 45 * 45 || (a.k3 = ((a.k3 || 0) + 1) % 3) === 0) { a.mixer.update(a.mt); a.mt = 0; } }
      // água-viva: queima ao encostar
      if (a.kind === 'jelly' && this.stingCd <= 0 && (player.swimming || player.wading)) {
        const cy = P.y + (player.swimming ? 0.3 : 0.9);
        if ((x - P.x) ** 2 + (z - P.z) ** 2 < (0.6 + a.size * 0.6) ** 2 && Math.abs(y - cy) < 1.2) { this.stingCd = 2; this.o.onSting?.(); }
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------------------
// Crocodilos do Nilo: tomam sol na margem (meio dentro d'água, só as costas e os olhos de fora). Se o explorador
// nada ou anda perto da água, um deles vem deslizando, dá o bote e morde; depois volta para o seu lugar.
export class Crocodiles {
  // opts: { waterY, floorAt(x,z), inRiver(x,z), homes: [{x,z,ry}], onBite(), onWarn() }
  constructor(scene, opts) { this.scene = scene; this.o = opts; this.list = []; this.warned = false; }
  async populate() {
    for (const h of this.o.homes) {
      const c = await creature('jacare', 3.6 + Math.random() * 1.2, { still: true }); if (!c) return;
      const k = { ...c, home: h, x: h.x, z: h.z, h: h.ry, state: 'bask', cd: 0, lunge: 0, t: Math.random() * 10, v: 0 };
      if (c.mixer && c.clips[0]) { k.walk = c.mixer.clipAction(c.clips[0]); k.walk.play(); k.walk.time = Math.random() * c.clips[0].duration; }
      // a origem do modelo (pose de ligação) fica bem abaixo das patas: mede o corpo já animado e assenta no chão
      c.mixer?.update(0.01); c.holder.updateMatrixWorld(true);
      let lo = 1e9, hi = -1e9; const v = new THREE.Vector3();
      c.holder.traverse((m) => { if (!m.isSkinnedMesh) return; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i += 9) { m.getVertexPosition(i, v); m.localToWorld(v); lo = Math.min(lo, v.y); hi = Math.max(hi, v.y); } });
      if (lo < 1e8) { c.o.position.y -= lo - c.holder.position.y; k.bodyH = hi - lo; }
      this.scene.add(c.holder); this.list.push(k);
    }
  }
  reset() { for (const k of this.list) { k.x = k.home.x; k.z = k.home.z; k.h = k.home.ry; k.state = 'bask'; k.cd = 0; } }
  update(dt, t, player) {
    const P = player.pos, W = this.o.waterY;
    for (const k of this.list) {
      const dx = P.x - k.x, dz = P.z - k.z, d = Math.hypot(dx, dz);
      const vis = d < 140; k.holder.visible = vis; if (!vis) continue;
      k.cd -= dt;
      const exposed = player.swimming || player.wading || this.o.inRiver(P.x, P.z, 3);
      const fromHome = Math.hypot(P.x - k.home.x, P.z - k.home.z);
      if (k.state === 'bask' && exposed && d < 16 && k.cd <= 0) { k.state = 'hunt'; if (!this.warned) { this.warned = true; this.o.onWarn?.(); } }
      if (k.state === 'hunt' && (fromHome > 34 || !exposed && d > 6)) k.state = 'back';
      let sp = 0, want = k.h;
      if (k.state === 'hunt') {
        want = Math.atan2(dx, dz); sp = player.swimming ? 3.4 : 2.6;
        if (d < 2.6 && k.cd <= 0) { k.lunge = 0.35; k.cd = 2.2; }
        if (k.lunge > 0) { sp = d > 1.4 ? 9 : 0; k.lunge -= dt; if (k.lunge <= 0 && d < 3.2) { this.o.onBite?.(k); k.state = 'back'; k.cd = 5; } }
      } else if (k.state === 'back') {
        const hx = k.home.x - k.x, hz = k.home.z - k.z, hd = Math.hypot(hx, hz);
        if (hd < 0.8) { k.state = 'bask'; want = k.home.ry; } else { want = Math.atan2(hx, hz); sp = 1.6; }
      } else want = k.home.ry;
      k.h = angleLerp(k.h, want, Math.min(1, dt * (k.lunge > 0 ? 8 : 2.2)));
      // velocidade com inércia: o bicho pesado arranca devagar e desliza ao parar (o bote é a exceção)
      k.v = lerp(k.v, sp, Math.min(1, dt * (k.lunge > 0 ? 10 : sp > k.v ? 1.4 : 2.5)));
      const nx = k.x + Math.sin(k.h) * k.v * dt, nz = k.z + Math.cos(k.h) * k.v * dt;
      if (this.o.inRiver(nx, nz, 2)) { k.x = nx; k.z = nz; }
      const floor = this.o.floorAt(k.x, k.z), depth = W - floor;
      // na água: só as costas e os olhos de fora (como os de verdade); na margem: deitado no chão
      const y = depth > 0.7 ? W - (k.bodyH || 1) * 0.78 : floor - 0.04;
      k.holder.position.set(k.x, lerp(k.holder.position.y || y, y, Math.min(1, dt * 4)), k.z);
      // patas e cauda: a caminhada do modelo no ritmo da velocidade (parado, congela numa pose de descanso; na água,
      // a cauda segue balançando devagar, como quem se mantém no lugar)
      if (k.walk) {
        const swim = depth > 0.7;
        k.walk.timeScale = k.v > 0.15 ? Math.min(3, 0.35 + k.v * 0.55) : swim ? 0.18 : 0;
        k.mixer.update(dt);
      }
      // nadando, o corpo ondula um pouco de lado; parado na margem, respira
      const sw = k.v > 0.3 && depth > 0.7 ? Math.sin(t * (3 + k.v)) * 0.05 : 0;
      k.holder.rotation.set(0, k.h + sw, 0);
      k.o.scale.y = k.o.scale.x * (1 + (k.v < 0.1 ? Math.sin(t * 1.3 + k.t) * 0.012 : 0));
    }
  }
}
