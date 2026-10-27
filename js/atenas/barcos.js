// Barcos de Atenas: trirremes nos galpões e no cais, mercantes, barcos de pesca na areia e os que navegam ao largo.
// O explorador pode embarcar (E): no barco a remo e no de vela ele pilota (setas); na trirreme Páralos ele vai em
// pé no convés e conduz o navio com as setas, como os outros barcos.
import * as THREE from 'three';
import { sculptureInstance } from '../comum/sculptures.js';
import { terrainHeight, coastPoint, WATER_Y } from './terrain.js';
import { animateHumanoid, makeHumanoid } from '../comum/mixamo.js';
import { rr, rand, pick, clamp, lerp } from '../comum/util.js';
import { blocked, groundAt } from '../comum/collision.js';

const V3 = THREE.Vector3;
const ray = new THREE.Raycaster();
let FR = 0;

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
      // altura do piso num ponto do barco: o primeiro chão (normal para cima, no mundo) abaixo da altura do convés
      // (acima ficam mastro, vela e enfeites da proa)
      const top = d.model === 'trirreme' ? 3.2 : d.model === 'mercante' ? 4 : 1.2;
      const deckAt = (lx, lz) => {
        ray.set(new V3(lx, 30, lz).applyMatrix4(g.matrixWorld), new V3(0, -1, 0)); ray.far = 40;
        const h = ray.intersectObject(m, true).find((h) => h.face && h.point.y - g.position.y < top && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.5);
        return h ? h.point.y - g.position.y : null;
      };
      const seat = this.seatLocal(b), dy = deckAt(seat.x, seat.z);
      if (dy !== null) b.deckY = dy;
      // cada tripulante fica no convés de verdade embaixo dele (o casco não é plano); sem piso ali, no do assento
      for (const c of b.crew) { const y = deckAt(c.lx, c.lz); c.y = y !== null && y > b.deckY - 0.8 ? y : b.deckY; }
      b.ready = true;
    });
    // tripulação: na trirreme, o timoneiro (kybernetes) na popa, o chefe dos remadores (keleustes), o tocador de
    // aulos que marca o ritmo, os fuzileiros (epibatai) e o vigia da proa. Os 170 remadores ficam dentro do casco,
    // nos três níveis de bancos — de fora só se veem os remos
    b.crew = [];
    const sailor = () => ({ outfit: 'exomis', cloth: pick([0xd8cfb8, 0x8a7a5a, 0x3a5f8a, 0xa89a7a]), beard: rand() < 0.6 ? 'short' : null, extras: ['pilos'] });
    const hoplite = () => ({ outfit: 'hoplite', cloth: pick([0x8e2c22, 0x9a3a24]), border: 0x2a1a10, beard: 'short', extras: ['spear', 'aspis', 'helmet', 'cuirass'], device: 'owl', pose: 'spear' });
    const L = d.len, put = (look, fx, fz, mode, ry = Math.PI / 2) => { const r = makeHumanoid(look); b.crew.push({ r, lx: L * fx, lz: fz, mode, ry }); g.add(r.root); };
    if (d.model === 'trirreme' && (d.moored || d.route)) {
      put(sailor(), -0.4, 0, 'idle'); // timoneiro
      put(sailor(), -0.3, 0.6, 'sit'); // auletes
      put(sailor(), -0.06, -0.5, 'idle'); // keleustes
      put(hoplite(), 0.06, 1.1, 'guard', 0); put(hoplite(), 0.14, -1.1, 'guard', Math.PI);
      if (d.moored) { put(hoplite(), -0.16, 1.1, 'guard', 0); put(hoplite(), 0.24, -1.0, 'guard', Math.PI); }
      put(sailor(), 0.36, 0, 'idle'); // vigia da proa
    } else if (d.route) { put(sailor(), -0.38, 0, 'idle'); put(sailor(), 0.1, 0.5, 'sit'); }
    else if (d.model === 'barco_pesca' && d.pilot) put(sailor(), 0.22, 0, 'sit', -Math.PI / 2); // o pescador vai junto, olhando para quem pilota
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
    this.riding = b; b.v = 0; b.turnV = 0;
    player.keys.clear();
    player.boardCam(b.model === 'trirreme' ? 0.46 : 0.4);
  }

  // desembarcar (E, a qualquer momento): desce pelo bordo mais perto da terra; atracado ao cais, sobe no cais;
  // em alto-mar, cai na água nadando (o barco fica onde está, dá para voltar nadando e embarcar de novo)
  leave(player, quay) {
    const b = this.riding; if (!b) return;
    this.riding = null;
    player.leaveCam();
    b.v = 0; b.turnV = 0;
    let best = null;
    const w = b.model === 'trirreme' ? 3.4 : 1.8;
    for (const sd of [1, -1]) for (const dd of [w, w + 1.4, w + 3]) {
      const v = new V3(0, 0, sd * dd).applyAxisAngle(new V3(0, 1, 0), b.yaw), x = b.g.position.x + v.x, z = b.g.position.z + v.z;
      const g = groundAt(x, z, WATER_Y + 3), depth = WATER_Y - g; // (o topo do cais conta como chão)
      if (!best || depth < best.depth) best = { x, z, g, depth };
    }
    player.pos.set(best.x, Math.max(best.g, WATER_Y - 0.72), best.z);
    player.onGround = best.depth < 1.2; player.swimming = best.depth >= 1.2; player.vy = 0;
    void quay;
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
      if (b.crew.length) {
        const d2 = (g.position.x - player.pos.x) ** 2 + (g.position.z - player.pos.z) ** 2, near = d2 < 110 * 110 && b.ready;
        for (const c of b.crew) {
          c.r.root.visible = near; if (!near) continue;
          c.r.root.position.set(c.lx, (c.y ?? b.deckY) + (c.mode === 'sit' ? -0.05 : 0), c.lz); c.r.root.rotation.y = c.ry;
          if (d2 < 60 * 60 || (FR++ & 1)) animateHumanoid(c.r, dt, 0, c.mode, t); // longe, anima um quadro sim, outro não
        }
      }
      if (b.oars) for (const o of b.oars) { const k = b === this.riding ? Math.abs(b.v) / 2.4 : 0; o.piv.rotation.y = Math.sin(t * 2.2) * 0.55 * k * o.s; o.piv.rotation.x = (Math.cos(t * 2.2) * 0.2 * k) * o.s; }
    }
    const b = this.riding;
    if (!b) return;
    this.drive(b, dt, player);
    b.g.rotation.x = (b.heel || 0) + Math.sin(t * 0.7 + b.bob * 2) * 0.012;
    // explorador no assento (ou em pé no convés da trirreme)
    const seat = this.seatLocal(b).applyAxisAngle(new V3(0, 1, 0), b.yaw);
    const pos = new V3(b.g.position.x + seat.x, b.g.position.y + b.deckY, b.g.position.z + seat.z);
    // câmera de barco: mira o meio do casco, bem mais alta e longe (dá para ver o barco inteiro e o mar à frente)
    const cam = { x: b.g.position.x, y: b.g.position.y + b.deckY + (b.model === 'trirreme' ? 3 : 1.2), z: b.g.position.z, dist: b.model === 'trirreme' ? 34 : 11 };
    player.ride(dt, t, pos, b.yaw + Math.PI / 2, b.model === 'trirreme' ? 'idle' : 'sit', b.v, cam);
    if (Math.abs(b.v) > 0.6 && Math.random() < dt * 6) { const back = new V3(-b.len * 0.45, 0, 0).applyAxisAngle(new V3(0, 1, 0), b.yaw); this.fx?.ripple(new V3(b.g.position.x + back.x, WATER_Y + 0.02, b.g.position.z + back.z), 0.8 + Math.abs(b.v) * 0.3); }
  }

  // pilotagem igual ao andar do explorador: as setas apontam para onde ir em relação à câmera (↑ = para onde a
  // câmera olha) e o barco vira a proa para lá e acelera. Tem inércia (desliza ao soltar), vira devagar quanto maior
  // for, inclina na curva e bate de leve no cais, nas pedras e nos outros barcos em vez de atravessar
  drive(b, dt, player) {
    const k = player.keys;
    let f = (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0) - (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0);
    let s = (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
    if (player.touch && Math.hypot(player.touch.x, player.touch.y) > 0.15) { f = -player.touch.y; s = player.touch.x; }
    const P = { trirreme: [5, 0.45], barco_pesca: [5.2, 0.8], barco_remo: [3.2, 1.2], mercante: [4, 0.5] }[b.model] || [3.2, 1];
    const maxV = P[0], turnRate = P[1];
    const cy = player.camYawW, fx = -Math.sin(cy), fz = -Math.cos(cy);
    const mx = fx * f - fz * s, mz = fz * f + fx * s, amt = Math.min(1, Math.hypot(mx, mz));
    let want = 0, sp = Math.min(1, Math.abs(b.v) / maxV);
    if (amt > 0.05) {
      const target = Math.atan2(-mz, mx); // rumo pedido (no ângulo do barco: proa = (cos, -sin))
      const diff = Math.atan2(Math.sin(target - b.yaw), Math.cos(target - b.yaw));
      // gira a proa (mais rápido andando, mas nunca na hora: é um barco)
      const rate = turnRate * (0.45 + 0.55 * sp);
      b.turnV = lerp(b.turnV || 0, clamp(diff * 1.5, -1, 1) * rate, Math.min(1, dt * 2.5));
      // só acelera de verdade quando a proa já aponta mais ou menos para lá
      want = maxV * amt * Math.max(0.4, Math.cos(Math.min(Math.abs(diff), Math.PI / 2)));
    } else b.turnV = lerp(b.turnV || 0, 0, Math.min(1, dt * 2));
    b.v += (want - b.v) * Math.min(1, dt * (want > b.v ? 0.7 : 0.35));
    b.yaw += b.turnV * dt;
    const dir = new V3(Math.cos(b.yaw), 0, -Math.sin(b.yaw)), side = new V3(-dir.z, 0, dir.x);
    const nx = b.g.position.x + dir.x * b.v * dt, nz = b.g.position.z + dir.z * b.v * dt;
    // casco: proa, popa e os dois bordos precisam de água e não podem entrar no cais nem em outro barco
    const tri = b.model === 'trirreme', half = b.len * 0.48, beam = tri ? 2.4 : b.model === 'barco_pesca' ? 1.1 : 0.9, draft = WATER_Y - (tri ? 1.2 : 0.35), sg = Math.sign(b.v || 1);
    const pts = [[half, 0], [-half * 0.7, 0], [0, beam], [0, -beam], [half * 0.5, beam * 0.7], [half * 0.5, -beam * 0.7]];
    // quantos pontos do casco estão em terra / no cais / em outro barco
    const hits = (x, z) => {
      let n = 0;
      for (const [a, c] of pts) {
        const px = x + dir.x * a + side.x * c, pz = z + dir.z * a + side.z * c;
        if (terrainHeight(px, pz) > draft || blocked(px, pz, WATER_Y - 1.2, 0.2, 3)) n++;
      }
      for (const o of this.list) {
        if (o === b || o.beached || o.shed) continue;
        const r = o.len * 0.35 + half * 0.5;
        if ((o.g.position.x - x) ** 2 + (o.g.position.z - z) ** 2 < r * r) n++;
      }
      return n;
    };
    // bloqueia só o que piora: encostado no cais ou na areia, o barco sempre consegue se afastar
    const hit = hits(nx, nz) > hits(b.g.position.x, b.g.position.z);
    if (!hit) { b.g.position.x = nx; b.g.position.z = nz; }
    else { b.v *= -0.25; if (!(b.bumpT > 0)) { this.fx?.ripple(new V3(nx + dir.x * half * sg, WATER_Y + 0.02, nz + dir.z * half * sg), 1.2); b.bumpT = 0.6; } }
    b.bumpT = (b.bumpT || 0) - dt;
    b.g.rotation.y = b.yaw;
    sp = Math.min(1, Math.abs(b.v) / maxV);
    b.heel = lerp(b.heel || 0, -b.turnV * sp * (b.model === 'barco_pesca' ? 0.22 : 0.1), Math.min(1, dt * 2)); // inclina para fora na curva
  }
}
