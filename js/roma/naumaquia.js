// Naumaquia de Trajano (inaugurada em 109 d.C., além do Tibre, perto do Vaticano): um lago oval cavado de propósito,
// com arquibancadas de madeira em volta. Nos dias de batalha naval duas frotas, tripuladas por prisioneiros e
// condenados (os naumachiarii), encenavam uma batalha famosa — e lutavam de verdade: morria gente.
// Aqui, em rodadas: as frotas (vermelha e azul, cada uma com uma quadrirreme e uma liburna) se aproximam; chuva de
// dardos; o esporão abalroa o costado do inimigo; a ponte de abordagem (o "corvo") desce e os soldados atravessam e
// lutam de espada no convés; os mortos caem, alguns no lago; o navio abalroado aderna e afunda, os que sobram pulam e
// nadam para a margem; o vencedor dá a volta da vitória com as espadas erguidas. Depois começa outra rodada.
import * as THREE from 'three';
import { Batcher } from '../comum/batcher.js';
import { addCircle } from '../comum/collision.js';
import { sculptureInstance } from '../comum/sculptures.js';
import { makeHumanoid, animateHumanoid, playOnce } from '../comum/mixamo.js';
import { Blood } from './combate.js';
import { NAUMACHIA, terrainHeight } from './terrain.js';
import { rand, pick, rr, angleLerp, lerp } from '../comum/util.js';

const V3 = THREE.Vector3;
const SHIPS = [{ model: 'quadrirreme', len: 26, sink: -1.3 }, { model: 'liburna', len: 23, sink: -1.6 }];
const FLEET = [{ name: 'vermelha', shield: 0xa8261e, cloth: 0xb0402c }, { name: 'azul', shield: 0x2a4a8a, cloth: 0x3a5a8a }];

export function buildNaumachia(scene, M, crowdGeo, crowdMat, { fx = null, toast = null, quality = 'leve' } = {}) {
  const N = NAUMACHIA, B = new Batcher(), TAU = Math.PI * 2;
  const P = (d, th) => [N.x + (N.a + d) * Math.cos(th), N.z + (N.b + d) * Math.sin(th)];
  // arquibancada de madeira: 8 degraus subindo para fora, em volta do lago (com 4 aberturas para entrar)
  const seats = [];
  for (let k = 0; k < 8; k++) {
    const d = 4 + k * 1.3, y = 3.2 + k * 0.7;
    for (let i = 0; i < 96; i++) {
      const th = (i / 96) * TAU; if (i % 24 < 2) continue;
      const [x0, z0] = P(d, th), [x1, z1] = P(d, th + TAU / 96), len = Math.hypot(x1 - x0, z1 - z0) + 0.1;
      B.box(M.wood, len, 0.25, 1.3, (x0 + x1) / 2, y - 0.25, (z0 + z1) / 2, { ry: Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2 });
      B.box(M.darkWood, 0.25, y - terrainHeight(x0, z0) + 0.3, 0.25, x0, terrainHeight(x0, z0) - 0.3, z0);
      for (let s = 0; s < 3; s++) if (rand() < 0.7) { const u = (s + 0.5) / 3, [sx, sz] = P(d, th + (u * TAU) / 96); seats.push([sx, y, sz]); }
      if (k === 7 && i % 4 === 0) addCircle(x0, z0, 0.6, 0, y + 1);
    }
  }
  for (let i = 0; i < 24; i++) { const th = (i / 24) * TAU, [x, z] = P(15, th), y = terrainHeight(x, z); B.box(M.darkWood, 0.25, 9, 0.25, x, y, z); B.box(i % 2 ? M.plasterRed : M.awning[1], 0.05, 1.2, 1.8, x, y + 7.4, z + 0.9); }
  B.build(scene);
  const im = new THREE.InstancedMesh(crowdGeo, crowdMat, seats.length), d3 = new THREE.Object3D(), col = new THREE.Color();
  seats.forEach(([x, y, z], i) => { d3.position.set(x, y, z); d3.updateMatrix(); im.setMatrixAt(i, d3.matrix); im.setColorAt(i, col.set(pick([0xefe8d8, 0xb0402c, 0xc8a050, 0x3a5a8a, 0x6a7a4a, 0xe4dccb]))); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; im.visible = false;
  scene.add(im);

  const blood = new Blood(scene, 0.02);
  const CREW = quality === 'alto' ? 6 : quality === 'minimo' ? 3 : 4;
  const ray = new THREE.Raycaster();
  // dardos (pila) em voo
  const JN = 40, jav = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a4a2e, roughness: 0.8 }), JN);
  jav.frustumCulled = false; jav.count = 0; scene.add(jav); const javs = [];
  // a ponte de abordagem (corvus): prancha com o gancho de ferro na ponta
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: 0.9 });

  // ---- navios e tripulações
  const ships = [];
  const look = (f) => ({ outfit: 'chiton', cloth: FLEET[f].cloth, border: null, beard: rand() < 0.6 ? 'short' : null, skin: pick([0xc8a07e, 0xb48662, 0xa87a58, 0x8a5a3a]), extras: ['galea', 'scutum', 'gladius'], shieldColor: FLEET[f].shield });
  for (const fleet of [0, 1]) for (let j = 0; j < 2; j++) {
    const S = SHIPS[(fleet + j) % 2], g = new THREE.Group(); g.visible = false; scene.add(g);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshStandardMaterial({ color: FLEET[fleet].shield, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(-S.len * 0.42, 6.5, 0); g.add(flag);
    const s = { g, fleet, j, S, deckY: 1.6, pos: new V3(), h: 0, v: 0, crew: [], ready: false, flag, roll: 0, pitch: 0, sinkY: 0 };
    sculptureInstance(S.model, S.len).then((o) => {
      o.position.y = S.sink; g.add(o);
      g.updateMatrixWorld(true);
      ray.set(new V3(0, 30, 0).applyMatrix4(g.matrixWorld), new V3(0, -1, 0)); ray.far = 40;
      // o convés: a primeira superfície virada para cima entre 0,5 e 3,2 m acima da água (sem isso o raio achava o fundo do casco)
      const h = ray.intersectObject(o, true).find((h) => { const y = h.point.y - g.position.y; return y > 0.5 && y < 3.2 && h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).y > 0.5; });
      s.deckY = h ? h.point.y - g.position.y : 1.6;
      s.ready = true;
    });
    for (let k = 0; k < CREW; k++) {
      const r = makeHumanoid(look(fleet)); r.root.visible = false; scene.add(r.root);
      s.crew.push({ r, ship: s, home: new V3((k - (CREW - 1) / 2) * (S.len * 0.5 / CREW), 0, k % 2 ? 0.9 : -0.9), state: 'deck', hp: 3, pos: new V3(), ry: 0, t: 0, vel: new V3(), foe: null, cd: rr(0.5, 2) });
    }
    ships.push(s);
  }
  const people = ships.flatMap((s) => s.crew);
  const pairs = [[ships[0], ships[2]], [ships[3], ships[1]]]; // [atacante, alvo]: cada frota vence numa das duplas
  const worldOf = (s, lx, ly, lz) => new V3(lx, ly, lz).applyAxisAngle(new V3(0, 1, 0), s.h).add(s.pos);
  const inLake = (x, z, m = 0) => ((x - N.x) / (N.a - m)) ** 2 + ((z - N.z) / (N.b - m)) ** 2 < 1;

  // ---- a rodada
  let phase = 'wait', phaseT = 3, round = 0, said = {}, simT = 0; const later = []; // golpes agendados no tempo do jogo (pausa junto)
  const after = (dt, fn) => later.push({ t: simT + dt, fn });
  const say = (k, m) => { if (!said[k] && toast) { said[k] = true; toast(m, 'quest', 4500); } };
  const reset = () => {
    round++; said = {};
    ships.forEach((s, i) => {
      const side = s.fleet ? 1 : -1, lane = s.j ? 1 : -1;
      s.pos.set(N.x + side * (N.a - 16), 0, N.z + lane * 11); s.h = s.fleet ? Math.PI : 0; s.v = 0; s.roll = 0; s.pitch = 0; s.sinkY = 0; s.sunk = false; s.sinking = false; s.rammed = false; s.lock = null;
      for (const c of s.crew) { c.state = 'deck'; c.hp = 3; c.foe = null; c.cd = rr(0.5, 2.5); c.r.once = null; c.ship = s; c.t = 0; c.r.root.rotation.set(0, 0, 0); if (c.r.root.parent !== s.g) s.g.add(c.r.root); c.r.root.position.set(c.home.x, s.deckY, c.home.z); c.r.root.rotation.y = s.fleet ? -Math.PI / 2 : Math.PI / 2; }
      void i;
    });
    for (const p of pairs) { if (p.plank) { scene.remove(p.plank); p.plank = null; } p.state = 'approach'; p.t = 0; }
    javs.length = 0; jav.count = 0; blood.clear(); later.length = 0;
    phase = 'battle'; phaseT = 150;
  };

  // um tripulante sai do navio para o mundo (pular, cair, atravessar a ponte)
  const detach = (c) => { const w = c.r.root.getWorldPosition(new V3()); scene.add(c.r.root); c.r.root.position.copy(w); c.pos.copy(w); c.r.root.rotation.set(0, c.r.root.rotation.y + c.ship.h, 0); };
  const fallOverboard = (c, dead) => {
    if (c.state === 'water' || c.state === 'fall' || c.state === 'gone') return;
    if (c.r.root.parent !== scene) detach(c);
    const away = new V3(c.pos.x - c.ship.pos.x, 0, c.pos.z - c.ship.pos.z).normalize();
    c.vel.set(away.x * rr(2, 3.5), rr(2.5, 4), away.z * rr(2, 3.5)); c.state = 'fall'; c.dead = dead; c.t = 0;
    playOnce(c.r, dead ? 'desmaiar' : 'caindo', 2);
  };
  const hit = (c, dir) => {
    c.hp--; blood.spray(c.r.root.getWorldPosition(new V3()).setY((c.r.root.getWorldPosition(new V3()).y) + 1.2), dir, c.hp <= 0 ? 24 : 12);
    if (c.hp <= 0) { if (rand() < 0.55) fallOverboard(c, true); else { c.state = 'dead'; playOnce(c.r, 'desmaiar', 99); } }
    else playOnce(c.r, 'golpe', 0.8);
  };
  const alive = (s) => s.crew.filter((c) => c.ship === s && (c.state === 'deck' || c.state === 'fight'));
  const throwJav = (from, to) => {
    if (javs.length >= JN) return;
    const a = from.r.root.getWorldPosition(new V3()).add(new V3(0, 1.6, 0)), b = to.r.root.getWorldPosition(new V3()).add(new V3(0, 1.2, 0));
    const T = 1.1 + a.distanceTo(b) / 30; javs.push({ a, b, T, t: 0, to, h: rand() < 0.38 }); playOnce(from.r, 'espada', 0.7);
  };

  // movimento de um navio: vira devagar para o rumo e anda
  const steer = (s, tx, tz, vWant, dt) => {
    const want = Math.atan2(-(tz - s.pos.z), tx - s.pos.x);
    s.h = angleLerp(s.h, want, Math.min(1, dt * 0.35)); s.v = lerp(s.v, vWant, Math.min(1, dt * 0.6));
    s.pos.x += Math.cos(s.h) * s.v * dt; s.pos.z -= Math.sin(s.h) * s.v * dt;
    if (!inLake(s.pos.x, s.pos.z, 10)) { const k = 0.995; s.pos.x = N.x + (s.pos.x - N.x) * k; s.pos.z = N.z + (s.pos.z - N.z) * k; }
  };

  function updatePair(p, dt) {
    const [A, T] = p; p.t += dt;
    const d = A.pos.distanceTo(T.pos);
    if (p.state === 'approach') {
      steer(A, T.pos.x, T.pos.z, 4.2, dt); steer(T, A.pos.x + 20 * Math.sign(T.pos.x - A.pos.x), A.pos.z + 8, 2.5, dt);
      if (d < 46) { p.state = 'volley'; p.t = 0; say('dardos', 'Na Naumaquia, as frotas se aproximam e começa a chuva de dardos!'); }
    } else if (p.state === 'volley') {
      steer(A, T.pos.x, T.pos.z, p.t < 9 ? 1.4 : 3.6, dt); steer(T, T.pos.x + Math.cos(T.h) * 10, T.pos.z - Math.sin(T.h) * 10, 1.2, dt); // (devagar no começo: a chuva de dardos dura)
      for (const [S1, S2] of [[A, T], [T, A]]) for (const c of alive(S1)) { c.cd -= dt; if (c.cd <= 0) { c.cd = rr(1.5, 3.2); const v = pick(alive(S2)); if (v) throwJav(c, v); } }
      if (d < A.S.len * 0.55 + 1 && p.t > 9) { // o esporão bate no costado
        p.state = 'board'; p.t = 0; T.rammed = true; A.v = 0; T.v = 0;
        const imp = new V3(T.pos.x - A.pos.x, 0, T.pos.z - A.pos.z).normalize();
        fx && fx.splash(new V3((A.pos.x + T.pos.x) / 2, 0, (A.pos.z + T.pos.z) / 2), 2.4);
        T.pos.addScaledVector(imp, 1.2); T.roll = 0.12;
        // o navio atingido fica de lado para o atacante; a ponte vai da proa do atacante ao convés dele
        T.h = A.h + Math.PI / 2; p.lockA = A.pos.clone(); p.lockT = worldOf(A, A.S.len * 0.5 + 6.5, 0, 0); // (o costado do outro fica a uns 3 m da proa: a ponte cobre o vão)
        T.pos.copy(p.lockT);
        const bow = worldOf(A, A.S.len * 0.45, A.deckY + 0.3, 0), far = worldOf(A, A.S.len * 0.5 + 5.4, T.deckY + 0.3, 0), L = bow.distanceTo(far);
        const pl = new THREE.Mesh(new THREE.BoxGeometry(L + 1, 0.12, 1.3), plankMat); pl.position.copy(bow).lerp(far, 0.5); pl.rotation.y = A.h; pl.castShadow = true; scene.add(pl); p.plank = pl;
        say('abalroa', A.fleet ? 'Abalroamento! O esporão da frota azul rasga o costado do inimigo — a ponte de abordagem desce!' : 'Abalroamento! O esporão vermelho entra no costado do navio azul — abordagem!');
        // os atacantes atravessam a ponte, cada um com um adversário
        const def = alive(T), atk = alive(A);
        atk.forEach((c, i) => { c.foe = def[i % Math.max(1, def.length)] || null; c.state = 'cross'; c.t = 0; detach(c); c.from = c.pos.clone(); c.mid = bow.clone(); c.to = worldOf(T, (i - (atk.length - 1) / 2) * 1.6, T.deckY, i % 2 ? 0.6 : -0.6); });
      }
    } else if (p.state === 'board') {
      A.v = 0; T.v = 0; A.pos.copy(p.lockA); T.pos.copy(p.lockT);
      const atk = A.crew.filter((c) => c.ship === A && c.state === 'fight');
      const defs = alive(T);
      for (const c of atk) {
        let f = c.foe; if (!f || !(f.state === 'deck' || f.state === 'fight')) f = c.foe = pick(defs) || null;
        if (!f) continue;
        // os dois se encaram e trocam golpes
        const a = c.r.root.position, b = f.r.root.getWorldPosition(new V3()); c.r.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        if (a.distanceTo(b) > 1.6) a.lerp(new V3(b.x, a.y, b.z), Math.min(1, dt * 1.5));
        c.cd -= dt; if (c.cd <= 0) { c.cd = rr(0.9, 1.6); playOnce(c.r, 'espada', 0.85); after(0.35, () => { if (rand() < 0.34) hit(f, new V3(b.x - a.x, 0, b.z - a.z).normalize()); else playOnce(f.r, 'espada', 0.7); });
          if (rand() < 0.16) after(0.7, () => { if (c.state === 'fight') hit(c, new V3(a.x - b.x, 0, a.z - b.z).normalize()); }); } // o defensor também acerta
      }
      if (p.t > 4) say('luta', 'Luta no convés: espadas, escudos, gente caindo no lago...');
      if (!alive(T).length || p.t > 26) { // o navio abordado é tomado: aderna e afunda
        p.state = 'sink'; p.t = 0; T.sinking = true; if (p.plank) { scene.remove(p.plank); p.plank = null; }
        for (const c of T.crew) if (c.state === 'deck' || c.state === 'fight' || c.state === 'dead') fallOverboard(c, c.state === 'dead');
        for (const c of A.crew) if (c.state === 'fight') { c.state = 'back'; c.t = 0; c.from = c.r.root.position.clone(); c.to = worldOf(A, c.home.x, A.deckY, c.home.z); }
        say('afunda', `O navio da frota ${FLEET[T.fleet].name} está afundando! Os sobreviventes pulam no lago.`);
      }
    } else if (p.state === 'sink') {
      T.roll = Math.min(0.55, T.roll + dt * 0.035); T.pitch = Math.min(0.25, T.pitch + dt * 0.015); T.sinkY -= dt * 0.22;
      if (fx && rand() < dt * 3) fx.splash(worldOf(T, rr(-T.S.len / 2, T.S.len / 2), 0, rr(-2, 2)).setY(0), 0.35);
      if (T.sinkY < -7) { T.sunk = true; T.g.visible = false; }
      if (p.t > 6) { p.state = 'victory'; p.t = 0; say('vitoria', `A frota ${FLEET[A.fleet].name} vence esta luta: a tripulação ergue as espadas e a plateia vai ao delírio.`); }
    } else if (p.state === 'victory') {
      T.roll = Math.min(0.55, T.roll + dt * 0.035); T.sinkY -= dt * 0.22; if (T.sinkY < -7) { T.sunk = true; T.g.visible = false; }
      const th = p.t * 0.12 + (A.fleet ? Math.PI : 0); steer(A, N.x + Math.cos(th) * (N.a - 22), N.z + Math.sin(th) * (N.b - 18), 3.5, dt);
      for (const c of A.crew) if (c.ship === A && c.state === 'deck' && rand() < dt * 0.4) playOnce(c.r, 'espada', 0.8);
    }
  }

  function updatePerson(c, dt, t) {
    const r = c.r;
    if (c.state === 'deck') { r.root.position.y = c.ship.deckY; animateHumanoid(r, dt, 0, 'idle', t); return; }
    if (c.state === 'dead') { animateHumanoid(r, dt, 0, 'idle', t); return; }
    if (c.state === 'cross' || c.state === 'back') { // pela ponte (ou de volta para o próprio navio)
      c.t += dt / 2.2; const k = Math.min(1, c.t);
      const p = c.state === 'cross' ? (k < 0.5 ? c.from.clone().lerp(c.mid, k * 2) : c.mid.clone().lerp(c.to, (k - 0.5) * 2)) : c.from.clone().lerp(c.to, k);
      p.y += Math.sin(k * Math.PI) * 0.4; const d = p.clone().sub(r.root.position); if (d.lengthSq() > 1e-6) r.root.rotation.y = Math.atan2(d.x, d.z);
      r.root.position.copy(p); animateHumanoid(r, dt, 3.2, 'run', t);
      if (k >= 1) { if (c.state === 'cross') { c.state = 'fight'; c.cd = rr(0.3, 1); } else { c.ship.g.add(r.root); r.root.position.set(c.home.x, c.ship.deckY, c.home.z); r.root.rotation.set(0, c.ship.fleet ? -Math.PI / 2 : Math.PI / 2, 0); c.state = 'deck'; } }
      return;
    }
    if (c.state === 'fight') { animateHumanoid(r, dt, 0, 'idle', t); return; }
    if (c.state === 'fall') {
      c.vel.y -= 9.8 * dt; r.root.position.addScaledVector(c.vel, dt); r.root.rotation.x = Math.min(1.4, r.root.rotation.x + dt * (c.dead ? 2 : 0.6));
      animateHumanoid(r, dt, 0, 'air', t);
      if (r.root.position.y < -0.4) { c.state = 'water'; c.t = 0; r.root.position.y = -0.6; r.root.rotation.x = 0; fx && fx.splash(r.root.position.clone().setY(0), 0.8); if (c.dead) { for (let i = 0; i < 3; i++) blood.stain(r.root.position.x + rr(-0.8, 0.8), r.root.position.z + rr(-0.8, 0.8), rr(0.4, 0.9)); } }
      return;
    }
    if (c.state === 'water') {
      c.t += dt; const p = r.root.position;
      if (c.dead) { animateHumanoid(r, dt, 0, 'swimIdle', t); p.y = -0.75 - Math.max(0, c.t - 10) * 0.15; r.root.rotation.z = 1.2; if (c.t > 22) { c.state = 'gone'; r.root.visible = false; } return; }
      // nada para a margem mais perto
      const th = Math.atan2((p.z - N.z) / N.b, (p.x - N.x) / N.a), tx = N.x + Math.cos(th) * (N.a + 2), tz = N.z + Math.sin(th) * (N.b + 2);
      const dx = tx - p.x, dz = tz - p.z, L = Math.hypot(dx, dz) || 1; p.x += (dx / L) * 1.3 * dt; p.z += (dz / L) * 1.3 * dt; p.y = -0.6; r.root.rotation.y = Math.atan2(dx, dz);
      animateHumanoid(r, dt, 1.3, 'swim', t); if (fx && rand() < dt * 2) fx.ripple(p.clone().setY(0), 0.6);
      if (!inLake(p.x, p.z, 2) || c.t > 60) { c.state = 'gone'; r.root.visible = false; }
    }
  }

  return {
    seats: seats.length,
    debug: () => ({ phase, phaseT, pairs: pairs.map((p) => [p.state, +(p.t || 0).toFixed(1), +p[0].pos.distanceTo(p[1].pos).toFixed(1)]), ships: ships.map((s) => [+s.pos.x.toFixed(1), +s.pos.z.toFixed(1), +s.v.toFixed(2), alive(s).length, s.ready]), javs: javs.length, deck: ships.map((s) => +s.deckY.toFixed(2)), crew: people.map((c) => c.state + "@" + c.r.root.getWorldPosition(new V3()).toArray().map((v) => v.toFixed(1)).join(",")) }),
    update(dt, t, player, active) {
      const near = Math.hypot(player.pos.x - N.x, player.pos.z - N.z) < 300, on = near && active;
      im.visible = on; blood.update(dt, on); jav.visible = on;
      for (const s of ships) s.g.visible = on && !s.sunk;
      for (const c of people) c.r.root.visible = on && c.state !== 'gone';
      if (!on || !ships.every((s) => s.ready)) return;
      if (phase === 'wait') { phaseT -= dt; if (phaseT <= 0) reset(); return; }
      simT += dt; for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= simT) { const e = later.splice(i, 1)[0]; e.fn(); }
      for (const p of pairs) updatePair(p, dt);
      // o navio: posição, balanço, adernar
      for (const s of ships) { s.g.position.set(s.pos.x, Math.sin(t * 1.1 + s.j) * 0.05 + s.sinkY, s.pos.z); s.g.rotation.set(s.roll, s.h, s.pitch + Math.sin(t * 0.8 + s.fleet) * 0.015, 'YXZ'); s.flag.rotation.y = Math.sin(t * 3 + s.j) * 0.3; }
      for (const c of people) if (c.state !== 'gone') updatePerson(c, dt, t);
      // dardos
      const o = new THREE.Object3D(); let n = 0;
      for (let i = javs.length - 1; i >= 0; i--) { const J = javs[i]; J.t += dt / J.T; if (J.t >= 1) { javs.splice(i, 1); if (J.h && (J.to.state === 'deck' || J.to.state === 'fight')) hit(J.to, J.b.clone().sub(J.a).setY(0).normalize()); else fx && fx.splash(J.b.clone().setY(0).add(new V3(rr(-2, 2), 0, rr(-2, 2))), 0.25); continue; }
        const p = J.a.clone().lerp(J.b, J.t); p.y += Math.sin(J.t * Math.PI) * J.T * 2.4; const q = J.a.clone().lerp(J.b, Math.min(1, J.t + 0.02)); q.y += Math.sin(Math.min(1, J.t + 0.02) * Math.PI) * J.T * 2.4;
        o.position.copy(p); o.lookAt(q); o.rotateY(Math.PI / 2); o.updateMatrix(); jav.setMatrixAt(n++, o.matrix); }
      jav.count = n; jav.instanceMatrix.needsUpdate = true;
      if (pairs.every((p) => p.state === 'victory' && p.t > 18) || (phaseT -= dt) <= 0) { phase = 'wait'; phaseT = 8; }
    },
  };
}
