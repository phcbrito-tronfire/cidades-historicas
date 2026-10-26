// Barcos de Atenas: trirremes nos galpões e no cais, mercantes, barcos de pesca na areia e os que navegam ao largo.
// O explorador pode embarcar (E): no barco a remo e no de vela ele pilota (setas); na trirreme Páralos ele vai em
// pé no convés enquanto os remadores levam o navio num passeio pela baía e de volta ao cais.
import * as THREE from 'three';
import { sculptureInstance } from '../comum/sculptures.js';
import { terrainHeight, coastPoint, WATER_Y } from './terrain.js';
import { animateHumanoid, makeHumanoid } from '../comum/mixamo.js';
import { rr, rand, pick, clamp, lerp, angleLerp } from '../comum/util.js';

const V3 = THREE.Vector3;
const ray = new THREE.Raycaster();

// casco simples, usado se o modelo não carregar
function fallbackHull(kind, L) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: kind === 'trirreme' ? 0x3a2a1e : 0x8a6a44, roughness: 0.8 });
  const hull = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  hull.scale(L / 2, kind === 'trirreme' ? 1.6 : 0.6, kind === 'trirreme' ? 2.6 : 1.0);
  const h = new THREE.Mesh(hull, wood); h.position.y = kind === 'trirreme' ? 1.6 : 0.6; g.add(h);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, 0.08, kind === 'trirreme' ? 4.4 : 1.4), new THREE.MeshStandardMaterial({ color: 0xa88a60, roughness: 0.9 }));
  deck.position.y = kind === 'trirreme' ? 1.55 : 0.35; g.add(deck);
  if (kind !== 'barco_remo') { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, L * 0.45, 8), wood); mast.position.y = L * 0.24; g.add(mast); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export class Boats {
  constructor(scene, city, fx) {
    this.scene = scene; this.fx = fx; this.list = []; this.riding = null;
    for (const d of city.boats) this.add(d);
  }

  add(d) {
    const g = new THREE.Group(); // pivô na linha d'água (ou no chão), +x = proa
    const holder = new THREE.Group(); g.add(holder);
    const b = { ...d, g, holder, bob: rand() * 6, deckY: d.model === 'trirreme' ? 1.6 : 0.4, yaw: d.ry || 0, v: 0, ready: false };
    if (d.route) { const p = coastPoint(d.route.a0, d.route.off); g.position.set(p.x, WATER_Y, p.z); b.ra = d.route.a0; }
    else g.position.set(d.x, d.y ?? WATER_Y, d.z);
    g.rotation.y = b.yaw;
    if (d.beached) { g.rotation.z = rr(-0.12, 0.12); g.rotation.x = rr(-0.05, 0.05); }
    this.scene.add(g);
    // calado de cada modelo: quanto o casco afunda (o pivô é a linha d'água)
    const sink = { trirreme: -0.9, mercante: -0.7, barco_remo: -0.18, barco_pesca: -0.3 }[d.model] ?? -0.3;
    sculptureInstance(d.model, d.len).then((o) => {
      const empty = !o.children.length;
      const m = empty ? fallbackHull(d.model, d.len) : o;
      m.position.y = d.beached || d.shed ? 0 : sink;
      holder.add(m);
      // altura do convés: um raio de cima para baixo no ponto onde o explorador fica
      g.updateMatrixWorld(true);
      const seat = this.seatLocal(b);
      const from = new V3(seat.x, 30, seat.z).applyMatrix4(g.matrixWorld);
      ray.set(from, new V3(0, -1, 0)); ray.far = 40;
      const hit = ray.intersectObject(m, true).find((h) => h.face && h.face.normal.y > 0.3) || ray.intersectObject(m, true)[0];
      if (hit) b.deckY = hit.point.y - g.position.y;
      b.ready = true;
    });
    // tripulação na trirreme do cais e nos barcos que navegam
    b.crew = [];
    if (d.moored && d.model === 'trirreme' || d.route) {
      for (let i = 0; i < (d.model === 'trirreme' ? 6 : 2); i++) {
        const r = makeHumanoid({ outfit: 'exomis', cloth: pick([0xd8cfb8, 0x8a7a5a, 0x3a5f8a]), beard: rand() < 0.5 ? 'short' : null, extras: ['pilos'] });
        b.crew.push({ r, lx: -d.len * 0.3 + i * (d.len * 0.6 / 5), lz: (i % 2 ? 1 : -1) * 0.8, mode: i === 0 ? 'idle' : 'sit' });
        g.add(r.root);
      }
    }
    if (d.pilot) b.oars = this.makeOars(b);
    this.list.push(b);
    return b;
  }

  seatLocal(b) { return b.model === 'trirreme' ? new V3(-b.len * 0.18, 0, 0) : b.model === 'barco_pesca' ? new V3(-b.len * 0.28, 0, 0) : new V3(-b.len * 0.05, 0, 0); }

  // dois remos presos nas laterais do barco a remo (giram quando se rema)
  makeOars(b) {
    if (b.model !== 'barco_remo') return null;
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.8 });
    const oars = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(b.len * 0.02, 0.5, s * 0.65); b.g.add(piv);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6), mat); shaft.rotation.x = Math.PI / 2 - s * 0.35; shaft.position.z = s * 1.0; shaft.position.y = -0.25; piv.add(shaft);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.5), mat); blade.position.set(0, -0.68, s * 2.15); piv.add(blade);
      oars.push({ piv, s });
    }
    return oars;
  }

  nearestBoardable(p) {
    let best = null, bd = 1e9;
    for (const b of this.list) {
      if (!b.board || !b.ready) continue;
      const d = Math.hypot(b.g.position.x - p.x, b.g.position.z - p.z) - (b.model === 'trirreme' ? b.len * 0.45 : b.len * 0.5);
      if (d < 3.2 && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  board(player, b) {
    this.riding = b; b.v = 0;
    if (b.model === 'trirreme') { b.cruise = 0; b.home = { x: b.g.position.x, z: b.g.position.z, yaw: b.yaw }; }
    player.keys.clear();
  }

  // desembarcar: na trirreme volta ao cais; nos barcos pequenos, pula para o lado (na água rasa ou na areia)
  leave(player, quay) {
    const b = this.riding; if (!b) return;
    this.riding = null;
    const side = new V3(0, 0, 1.6).applyAxisAngle(new V3(0, 1, 0), b.yaw);
    if (b.model === 'trirreme' && b.cruise === 0 && quay) player.place(quay.x, quay.z, player.facing);
    else player.pos.set(b.g.position.x + side.x, Math.max(terrainHeight(b.g.position.x + side.x, b.g.position.z + side.z), WATER_Y - 0.6), b.g.position.z + side.z);
  }

  update(dt, t, player) {
    for (const b of this.list) {
      const g = b.g;
      if (!b.beached && !b.shed) { g.position.y = (b.y ?? WATER_Y) + Math.sin(t * 1.1 + b.bob) * (b.model === 'trirreme' ? 0.05 : 0.08); g.rotation.z = Math.sin(t * 0.9 + b.bob) * 0.02; g.rotation.x = Math.sin(t * 0.7 + b.bob * 2) * 0.012; }
      if (b.route && b !== this.riding) { // navegando ao longo da costa, ida e volta
        const dir = Math.sign(b.route.a1 - b.route.a0);
        b.ra += dir * b.speed * dt;
        if ((dir > 0 && b.ra > b.route.a1) || (dir < 0 && b.ra < b.route.a1)) { const t0 = b.route.a0; b.route.a0 = b.route.a1; b.route.a1 = t0; }
        const p = coastPoint(b.ra, b.route.off), q = coastPoint(b.ra + dir * 3, b.route.off);
        g.position.x = p.x; g.position.z = p.z;
        b.yaw = Math.atan2(-(q.z - p.z), q.x - p.x); g.rotation.y = b.yaw;
        if (Math.random() < dt * 4) this.fx?.ripple(new V3(p.x, WATER_Y + 0.02, p.z), 1.6);
      }
      for (const c of b.crew) { c.r.root.position.set(c.lx, b.deckY, c.lz); c.r.root.rotation.y = Math.PI / 2; const near = (g.position.x - player.pos.x) ** 2 + (g.position.z - player.pos.z) ** 2 < 70 * 70; c.r.root.visible = near; if (near) animateHumanoid(c.r, dt, 0, c.mode, t); }
      if (b.oars) for (const o of b.oars) { const k = b === this.riding ? Math.abs(b.v) / 2.4 : 0; o.piv.rotation.y = Math.sin(t * 2.2) * 0.55 * k * o.s; o.piv.rotation.x = (Math.cos(t * 2.2) * 0.2 * k) * o.s; }
    }
    const b = this.riding;
    if (!b) return;
    if (b.model === 'trirreme') this.cruise(b, dt, t);
    else this.drive(b, dt, player);
    // explorador no assento (ou em pé no convés da trirreme)
    const seat = this.seatLocal(b).applyAxisAngle(new V3(0, 1, 0), b.yaw);
    const pos = new V3(b.g.position.x + seat.x, b.g.position.y + b.deckY, b.g.position.z + seat.z);
    player.ride(dt, t, pos, b.yaw + Math.PI / 2, b.model === 'trirreme' ? 'idle' : 'sit', b.v);
    if (Math.abs(b.v) > 0.6 && Math.random() < dt * 6) { const back = new V3(-b.len * 0.45, 0, 0).applyAxisAngle(new V3(0, 1, 0), b.yaw); this.fx?.ripple(new V3(b.g.position.x + back.x, WATER_Y + 0.02, b.g.position.z + back.z), 0.8 + Math.abs(b.v) * 0.3); }
  }

  // pilotagem: setas para remar/velejar e virar; encalha onde o fundo é raso
  drive(b, dt, player) {
    const k = player.keys;
    const f = (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0) - (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0);
    const s = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
    const maxV = b.model === 'barco_pesca' ? 4.2 : 2.4;
    const touch = player.touch && Math.hypot(player.touch.x, player.touch.y) > 0.15 ? player.touch : null;
    const fwd = touch ? -touch.y : f, turn = touch ? touch.x : s;
    b.v = lerp(b.v, fwd * maxV * (fwd < 0 ? 0.4 : 1), Math.min(1, dt * 0.9));
    b.yaw -= turn * dt * (0.35 + Math.min(1, Math.abs(b.v) / maxV) * 0.55);
    const dir = new V3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
    const nx = b.g.position.x + dir.x * b.v * dt, nz = b.g.position.z + dir.z * b.v * dt;
    const bow = terrainHeight(nx + dir.x * b.len * 0.5 * Math.sign(b.v || 1), nz + dir.z * b.len * 0.5 * Math.sign(b.v || 1));
    if (bow < WATER_Y - 0.45) { b.g.position.x = nx; b.g.position.z = nz; } else b.v *= 0.3; // encalhou na areia
    b.g.rotation.y = b.yaw;
  }

  // passeio da trirreme: sai do cais, contorna a baía e volta (os remadores fazem o trabalho)
  cruise(b, dt, t) {
    b.cruise += dt;
    const T = 110; // segundos de passeio
    const u = Math.min(1, b.cruise / T);
    const a = -228 + Math.sin(u * Math.PI) * 260, off = 12 + Math.sin(u * Math.PI) * 140;
    const p = coastPoint(a, off), q = coastPoint(a + (u < 0.5 ? 3 : -3), off + (u < 0.5 ? 1.6 : -1.6));
    const target = new V3(p.x, 0, p.z);
    const prev = b.g.position.clone();
    b.g.position.x = lerp(b.g.position.x, target.x, Math.min(1, dt * 1.5)); b.g.position.z = lerp(b.g.position.z, target.z, Math.min(1, dt * 1.5));
    const yaw = Math.atan2(-(q.z - p.z), q.x - p.x);
    b.yaw = angleLerp(b.yaw, u >= 1 ? b.home.yaw : yaw, Math.min(1, dt * 0.6)); b.g.rotation.y = b.yaw;
    b.v = prev.distanceTo(b.g.position) / Math.max(dt, 1e-3);
    if (u >= 1) { b.g.position.x = lerp(b.g.position.x, b.home.x, Math.min(1, dt)); b.g.position.z = lerp(b.g.position.z, b.home.z, Math.min(1, dt)); if (b.cruise > T + 4) b.cruise = 0; }
    void t; void clamp;
  }
}
