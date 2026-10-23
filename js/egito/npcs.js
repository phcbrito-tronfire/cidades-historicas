// Gente e bichos de Mênfis: NPCs principais, moradores, soldados, crianças e animais
import * as THREE from 'three';
import { makeBird } from './characters.js';
import { makeAnimal, animateAnimal } from './animals.js';
import { makeHumanoid, animateHumanoid } from './mixamo.js';
import { NPCS, VILLAGER_LINES, SOLDIER_LINES, WORKER_LINES, FARMER_LINES, CHILD_LINES } from './dialogues.js';
import { groundAt, moveWithCollision, terrainAt } from './collision.js';
import { riverX, terrainHeight } from './terrain.js';
import { labelTexture, markerTexture } from './textures.js';
import { rr, rand, pick, angleLerp } from './util.js';

const V3 = THREE.Vector3;

// sombra só para quem está a até ~40 m (mais longe ela ocupa poucos pixels no mapa de sombra); troca só ao mudar de faixa
function castsShadow(root, on) {
  if (root.userData.sh === on) return;
  root.userData.sh = on;
  root.traverse((o) => { if (o.isMesh) o.castShadow = on; });
}

export class Actors {
  constructor(scene, city) {
    this.scene = scene; this.city = city;
    this.key = []; this.agents = []; this.animals = []; this.flocks = [];
    this.camera = null; this._fr = new THREE.Frustum(); this._pv = new THREE.Matrix4(); this._s = new THREE.Sphere(); this.pp = new THREE.Vector3();
    this.markerTex = markerTexture('!');
    this.t = 0;
  }

  addHuman(look, x, z, ry = 0, y) {
    const rig = makeHumanoid(look);
    const pos = new V3(x, y ?? groundAt(x, z, terrainAt(x, z) + 1.6), z);
    rig.root.position.copy(pos);
    rig.root.rotation.y = ry;
    this.scene.add(rig.root);
    return { rig, pos };
  }

  spawnKeyNPCs() {
    const S = this.city.spots;
    const fruit = this.city.stalls.find((s) => s.type === 'fruit');
    const P = {
      nebamun: [64.5, 4.2, Math.PI / 2],
      khaemwaset: [-18, 5, Math.PI / 2],
      nebet: [-48, 8, Math.PI / 2],
      merit: [60, 51.8, Math.PI],
      djehuty: [72, 65.8, Math.PI],
      henut: [fruit.x, fruit.z + 1.8, Math.PI],
      ipi: [S.ipi.x, S.ipi.z, -Math.PI / 2],
      tiy: [S.tiy.x, S.tiy.z, -Math.PI / 2],
      hori: [S.hori.x, S.hori.z, Math.PI / 2],
      nofret: [S.nofret.x, S.nofret.z, Math.PI / 4],
      mahu: [S.quartel.x, S.quartel.z + 2.5, Math.PI / 2],
      ramses: [S.throne.x, S.throne.z, Math.PI / 2],
      merneptah: [S.quartel.x + 5, S.quartel.z + 3, -Math.PI / 2],
      isetnofret: [36, -121, -Math.PI / 2],
    };
    for (const def of NPCS) {
      const [x, z, ry] = P[def.id];
      const look = { ...def.look };
      const h = this.addHuman(look, x, z, ry);
      if (def.id === 'nebet') this.giveSistrum(h.rig);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(def.name, def.title), transparent: true, depthWrite: false }));
      label.scale.set(2.6, 0.65, 1); label.position.y = 2.35; label.renderOrder = 5;
      h.rig.root.add(label);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex, transparent: true, depthWrite: false }));
      marker.scale.setScalar(0.8); marker.position.y = 2.95; h.rig.root.add(marker);
      const k = { def, ...h, ry, label, marker, talking: false, kind: 'npc', mode: 'idle' };
      // Ramsés recebe sentado no trono
      if (def.id === 'ramses' && S.throneSeat) { h.rig.root.position.copy(S.throneSeat); k.seated = true; for (const o of [h.rig.tail, h.rig.skirt]) if (o) o.visible = false; }
      this.key.push(k);
    }
    // guardas do palácio e do templo
    const G = S.gate;
    this.guards = [];
    for (const dz of [-3.6, 3.6]) {
      const h = this.addHuman({ outfit: 'soldier', hair: 'khat', khat: 0xe8dcc0, extras: ['spear', 'shield'], pose: 'spear' }, G.x + 0.5, G.z + dz, Math.PI / 2);
      const g = { ...h, kind: 'guard', ry: Math.PI / 2, home: h.pos.clone(), mode: 'idle' };
      this.guards.push(g);
    }
    for (const dz of [-4.6, 4.6]) {
      const h = this.addHuman({ outfit: 'soldier', hair: 'khat', khat: 0x2c5d9c, extras: ['spear', 'shield'], pose: 'spear' }, 7, dz, Math.PI / 2);
      this.agents.push({ ...h, kind: 'soldier', ry: Math.PI / 2, static: true, lines: SOLDIER_LINES, mode: 'idle' });
    }
  }

  giveSistrum(rig) {
    const g = new THREE.Group();
    const b = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.35 });
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), b); a.position.y = 0.06; g.add(a);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 5, 12, Math.PI), b); r.position.y = 0.16; g.add(r);
    rig.armR.hand.add(g);
    rig.holding = true;
  }

  openGate(open) {
    this.city.gateBlock.enabled = !open;
    this.gateOpen = open;
    const G = this.city.spots.gate;
    this.guards.forEach((g, i) => {
      const dz = i === 0 ? -1 : 1;
      g.target = new V3(G.x + (open ? 1.5 : 0.5), 0, G.z + dz * (open ? 5.2 : 3.6));
    });
  }

  spawnAmbient() {
    const C = this.city;
    const regions = {
      norte: [-110, 70, 30, 235], sul: [-110, 70, -235, -45], avenida: [20, 100, -10, 26], mercado: [42, 90, 30, 90], patio: [-36, -8, -12, 12],
    };
    const randIn = (r) => new V3(rr(r[0], r[1]), 0, rr(r[2], r[3]));
    const looks = () => {
      const r = rand();
      if (r < 0.45) return { outfit: rand() < 0.7 ? 'kilt' : 'longkilt', hair: pick(['short', 'short', 'bald', 'khat']) };
      if (r < 0.85) return { outfit: 'dress', hair: 'long', linen: pick([0xf1ead8, 0xe8dcc0, 0xf6f0e0]) };
      return { outfit: 'worker', hair: pick(['short', 'khat']), extras: [pick(['basket', 'jar'])], collar: null };
    };
    const villager = (region, n) => {
      for (let i = 0; i < n; i++) {
        const p = randIn(regions[region]);
        const look = looks();
        const h = this.addHuman(look, p.x, p.z, rand() * 6);
        this.agents.push({ ...h, kind: 'villager', region: regions[region], speed: rr(1.0, 1.5), wait: rr(0, 4), lines: VILLAGER_LINES, mode: 'idle', carrying: look.extras && look.extras.length });
      }
    };
    villager('norte', 7); villager('sul', 6); villager('avenida', 4); villager('mercado', 6); villager('patio', 2);
    // sacerdotes no templo
    for (let i = 0; i < 3; i++) {
      const p = randIn([-62, -10, -12, 12]);
      const h = this.addHuman({ outfit: 'longkilt', hair: 'bald', collar: null }, p.x, p.z, rand() * 6);
      this.agents.push({ ...h, kind: 'villager', region: [-62, -10, -12, 12], speed: 0.8, wait: rr(1, 6), lines: ['Silêncio, por favor. Estamos na casa do deus.', 'Que Ptah ouça suas preces.', 'Já fiz minha purificação no lago sagrado hoje.'], mode: 'idle' });
    }
    // patrulhas de soldados
    const routes = [
      [new V3(70, 0, -6), new V3(70, 0, -80), new V3(60, 0, -128), new V3(70, 0, -80)],
      [new V3(30, 0, 22), new V3(30, 0, 95), new V3(60, 0, 100), new V3(90, 0, 22)],
      [new V3(-100, 0, 30), new V3(-100, 0, -30), new V3(-130, 0, 0)],
    ];
    for (const route of routes) {
      for (let k = 0; k < 2; k++) {
        const s = route[0].clone().add(new V3(k * 1.2, 0, k * 1.2));
        const h = this.addHuman({ outfit: 'soldier', hair: 'khat', khat: 0xe8dcc0, extras: ['spear', 'shield'], pose: 'spear' }, s.x, s.z, 0);
        this.agents.push({ ...h, kind: 'soldier', route: route.map((r) => r.clone().add(new V3(k * 1.2, 0, k * 1.2))), ri: 1, speed: 1.4, wait: k * 0.8, lines: SOLDIER_LINES, mode: 'idle' });
      }
    }
    // soldados treinando no quartel
    const Q = C.spots.quartel;
    for (let i = 0; i < 3; i++) {
      const h = this.addHuman({ outfit: 'soldier', hair: 'short', extras: [i === 2 ? 'khopesh' : 'spear'], pose: i === 2 ? null : 'spear' }, Q.x + 3 + i * 1.8, Q.z + 8, -Math.PI / 2);
      this.agents.push({ ...h, kind: 'soldier', static: true, lines: SOLDIER_LINES, mode: i === 2 ? 'talk' : 'idle', ry: -Math.PI / 2 });
    }
    // operários nas pirâmides
    const Hs = C.spots.hori;
    for (let i = 0; i < 6; i++) {
      const x = Hs.x + rr(-10, 6), z = Hs.z + rr(-12, 6);
      const h = this.addHuman({ outfit: 'worker', hair: pick(['short', 'bald', 'khat']), collar: null }, x, z, rand() * 6);
      const work = i < 3;
      this.agents.push({ ...h, kind: 'worker', static: work, region: [Hs.x - 14, Hs.x + 8, Hs.z - 16, Hs.z + 10], speed: 1.1, wait: rr(0, 3), lines: WORKER_LINES, mode: work ? 'work' : 'idle', ry: rand() * 6 });
    }
    // lavradores da margem leste
    for (let i = 0; i < 4; i++) {
      const z = C.spots.tiy.z + rr(-40, 40), x = riverX(z) + rr(65, 120);
      const h = this.addHuman({ outfit: i % 2 ? 'worker' : 'dress', hair: 'khat', collar: null }, x, z, rand() * 6);
      this.agents.push({ ...h, kind: 'farmer', static: true, lines: FARMER_LINES, mode: 'work', ry: rand() * 6 });
    }
    // crianças brincando na praça de Nofret
    const N = C.spots.nofret;
    for (let i = 0; i < 3; i++) {
      const h = this.addHuman({ outfit: 'child', hair: 'sidelock', height: rr(1.05, 1.25), collar: null }, N.x + rr(-6, 6), N.z + rr(-6, 6), 0);
      this.agents.push({ ...h, kind: 'child', region: [N.x - 9, N.x + 9, N.z - 9, N.z + 9], speed: 3.2, wait: rr(0, 2), lines: CHILD_LINES, mode: 'idle', run: true });
    }
  }

  spawnAnimals() {
    const C = this.city;
    const add = (kind, x, z, opts = {}) => {
      const a = makeAnimal(kind);
      const y = opts.y ?? groundAt(x, z, terrainAt(x, z) + 1.6);
      a.g.position.set(x, y, z); a.g.rotation.y = rand() * 6;
      if (opts.scale) a.g.scale.setScalar(opts.scale);
      a.seed = rand() * 10;
      this.scene.add(a.g);
      const o = { a, pos: a.g.position, home: new V3(x, y, z), radius: opts.radius ?? 6, speed: a.speed * (opts.speedMul || 1), wait: rr(0, 5), water: opts.water, static: opts.static, bank: opts.bank };
      this.animals.push(o);
      return o;
    };
    const N = C.spots.nofret;
    for (let i = 0; i < 5; i++) add('cat', N.x + rr(-4, 4), N.z + rr(-4, 4), { radius: 5 });
    for (let i = 0; i < 4; i++) add('cat', rr(-60, 40), rr(-60, 200), { radius: 8 });
    add('cat', -24, 6, { radius: 6 }); // gato do templo
    for (let i = 0; i < 3; i++) add('donkey', rr(45, 88), rr(30, 90), { radius: 10 });
    add('donkey', C.spots.quay.x - 8, 10, { radius: 6 });
    const F = C.spots.farm;
    for (let i = 0; i < 5; i++) add('cow', F.x + rr(-10, 25), F.z + rr(10, 35), { radius: 12 });
    add('donkey', F.x + 2, F.z + 2, { radius: 5 });
    // íbis nas margens
    for (let i = 0; i < 10; i++) { const z = rr(-250, 250), side = rand() < 0.5 ? -1 : 1; const x = riverX(z) + side * 41; add('ibis', x, z, { radius: 6, bank: true }); }
    // crocodilos tomando sol na margem leste
    for (const z of [128, -168, 240]) { const x = riverX(z) + 41.5; add('croc', x, z, { radius: 4, speedMul: 1, bank: true }).a.g.rotation.y = -Math.PI / 2 + rr(-0.5, 0.5); }
    // hipopótamos e patos no rio
    for (const z of [-70, 190]) { const o = add('hippo', riverX(z) + 12, z, { y: -0.5, static: true }); o.water = true; }
    for (let i = 0; i < 14; i++) { const z = rr(-200, 220); add('duck', riverX(z) + rr(-30, 30), z, { y: 0, water: true, radius: 10 }); }
    // bandos de pássaros
    for (let f = 0; f < 4; f++) {
      const center = new V3(rr(-150, 200), rr(30, 55), rr(-200, 200));
      const birds = [];
      for (let i = 0; i < 9; i++) { const b = makeBird(); b.off = new V3(rr(-6, 6), rr(-2, 2), rr(-6, 6)); b.ph = rand() * 6; this.scene.add(b.g); birds.push(b); }
      this.flocks.push({ center, r: rr(40, 90), w: rr(0.06, 0.12) * (rand() < 0.5 ? -1 : 1), birds, ph: rand() * 6 });
    }
  }

  // alvo de interação mais próximo
  nearestInteractable(p, max = 2.8) {
    let best = null, bd = max * max;
    const test = (o, type) => {
      const d = (o.pos.x - p.x) ** 2 + (o.pos.z - p.z) ** 2;
      if (d < bd && Math.abs(o.pos.y - p.y) < 2) { bd = d; best = { type, o }; }
    };
    for (const k of this.key) test(k, 'npc');
    for (const g of this.guards) test(g, 'guard');
    for (const a of this.agents) test(a, a.kind);
    return best;
  }

  // animação por nível de detalhe: perto e na tela, todo quadro; mais longe ou fora da câmera, menos vezes por
  // segundo (o tempo acumulado vai inteiro para o mixer, então o movimento não atrasa nem acelera)
  anim(rig, dt, speed, mode, t) {
    rig._acc = (rig._acc || 0) + dt;
    const p = rig.root.position;
    const d2 = (p.x - this.pp.x) ** 2 + (p.z - this.pp.z) ** 2;
    castsShadow(rig.root, d2 < 40 * 40);
    let every = 0;
    if (this.camera) {
      this._s.center.set(p.x, p.y + 0.95, p.z); this._s.radius = 1.6;
      const seen = this._fr.intersectsSphere(this._s);
      every = !seen ? 1 / 8 : d2 < 25 * 25 ? 0 : d2 < 45 * 45 ? 1 / 30 : 1 / 15;
    }
    if (rig._acc < every) return;
    animateHumanoid(rig, rig._acc, speed, mode, t);
    rig._acc = 0;
  }

  update(dt, t, player, quests, nightFactor) {
    this.t = t;
    const pp = player.pos;
    this.pp = pp;
    if (this.camera) { this._pv.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._fr.setFromProjectionMatrix(this._pv); }
    const near = (o, r) => (o.pos.x - pp.x) ** 2 + (o.pos.z - pp.z) ** 2 < r * r;
    const face = (o, target, k) => {
      if (!target) return;
      const ang = Math.atan2(target.x - o.pos.x, target.z - o.pos.z);
      o.rig.root.rotation.y = angleLerp(o.rig.root.rotation.y, ang, Math.min(1, dt * k));
    };

    for (const k of this.key) {
      const vis = near(k, 75);
      k.rig.root.visible = vis;
      if (!vis) continue;
      const close = near(k, 5);
      if (!k.seated && (k.talking || close)) face(k, pp, 5);
      else k.rig.root.rotation.y = angleLerp(k.rig.root.rotation.y, k.ry, dt * 2);
      this.anim(k.rig, dt, 0, k.seated ? 'sit' : k.talking ? 'talk' : 'idle', t);
      k.label.visible = near(k, 20);
      const pending = !quests.isDone(k.def.objective) && k.def.objective && !((k.def.id === 'ramses' || k.def.id === 'isetnofret') && !this.gateOpen);
      const beerPending = k.def.id === 'hori' && player.holding && player.holding.type === 'cerveja' && !quests.isDone('cerveja');
      k.marker.visible = (pending || beerPending) && near(k, 60);
      k.marker.position.y = 2.95 + Math.sin(t * 3) * 0.08;
      k.marker.material.color.set(beerPending && !pending ? 0x9fe0ff : 0xffffff);
    }
    for (const g of this.guards) {
      if (g.target) {
        const d = new V3(g.target.x - g.pos.x, 0, g.target.z - g.pos.z);
        if (d.length() > 0.1) {
          d.normalize().multiplyScalar(Math.min(d.length(), dt * 1.5));
          g.pos.x += d.x; g.pos.z += d.z; g.pos.y = groundAt(g.pos.x, g.pos.z, g.pos.y + 0.3);
          face(g, g.target, 6); this.anim(g.rig, dt, 1.5, 'walk', t);
          g.rig.root.position.copy(g.pos);
          continue;
        } else g.target = null;
      }
      if (near(g, 5)) face(g, pp, 4); else g.rig.root.rotation.y = angleLerp(g.rig.root.rotation.y, g.ry, dt * 2);
      this.anim(g.rig, dt, 0, g.talking ? 'talk' : 'idle', t);
    }

    for (const a of this.agents) {
      const vis = near(a, 60);
      a.rig.root.visible = vis;
      if (!vis) continue;
      if (a.talking) { face(a, pp, 6); this.anim(a.rig, dt, 0, 'talk', t); continue; }
      if (a.static) {
        if (a.ry !== undefined && a.mode !== 'work') a.rig.root.rotation.y = angleLerp(a.rig.root.rotation.y, a.ry, dt * 2);
        this.anim(a.rig, dt, 0, a.mode, t);
        continue;
      }
      // pausa ou caminhada
      if (a.wait > 0) { a.wait -= dt; this.anim(a.rig, dt, 0, 'idle', t); continue; }
      if (!a.target) {
        if (a.route) { a.target = a.route[a.ri]; a.ri = (a.ri + 1) % a.route.length; }
        else {
          for (let i = 0; i < 8; i++) {
            const c = new V3(rr(a.region[0], a.region[1]), 0, rr(a.region[2], a.region[3]));
            if (terrainAt(c.x, c.z) > 0.6) { a.target = c; break; }
          }
          if (!a.target) { a.wait = 2; continue; }
        }
        a.stuck = 0;
      }
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.6) { a.target = null; a.wait = a.route ? rr(0.5, 2) : rr(2, 9); continue; }
      const sp = a.speed * dt;
      const ox = a.pos.x, oz = a.pos.z;
      moveWithCollision(a.pos, (dx / dist) * sp, (dz / dist) * sp, 0.3, 1.7);
      const moved = Math.hypot(a.pos.x - ox, a.pos.z - oz);
      if (moved < sp * 0.3) { a.stuck = (a.stuck || 0) + dt; if (a.stuck > 0.8) { a.target = null; a.wait = 0.5; } }
      a.pos.y = groundAt(a.pos.x, a.pos.z, a.pos.y + 0.3);
      a.rig.root.position.copy(a.pos);
      face(a, a.target, 5);
      this.anim(a.rig, dt, a.speed, a.run ? 'run' : 'walk', t);
    }

    for (const o of this.animals) {
      const vis = near(o, 60);
      o.a.g.visible = vis;
      if (!vis) continue;
      castsShadow(o.a.g, near(o, 25));
      let moving = false;
      if (!o.static) {
        if (o.wait > 0) o.wait -= dt;
        else {
          if (!o.target) {
            for (let i = 0; i < 6; i++) {
              const c = new V3(o.home.x + rr(-o.radius, o.radius), 0, o.home.z + rr(-o.radius, o.radius));
              const h = terrainHeight(c.x, c.z);
              if (o.water ? h < -1 : o.bank ? h > -0.5 && h < 1.0 : h > 0.6) { o.target = c; break; }
            }
            if (!o.target) o.wait = 2;
          }
          if (o.target) {
            const dx = o.target.x - o.pos.x, dz = o.target.z - o.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.3) { o.target = null; o.wait = rr(2, o.a.kind === 'croc' ? 25 : 10); }
            else {
              const sp = o.speed * dt;
              if (o.water) { o.pos.x += dx / d * sp; o.pos.z += dz / d * sp; }
              else {
                const ox = o.pos.x, oz = o.pos.z;
                moveWithCollision(o.pos, dx / d * sp, dz / d * sp, 0.2, 0.6);
                if (Math.hypot(o.pos.x - ox, o.pos.z - oz) < sp * 0.3) { o.target = null; o.wait = 1; }
                o.pos.y = Math.max(groundAt(o.pos.x, o.pos.z, o.pos.y + 0.3), o.a.kind === 'croc' ? -0.15 : -10);
              }
              o.a.g.rotation.y = angleLerp(o.a.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4));
              moving = true;
            }
          }
        }
      }
      // gatos e burros fogem um pouco do jogador
      animateAnimal(o.a, dt, moving, t);
    }

    for (const f of this.flocks) {
      f.ph += dt * f.w;
      const cx = f.center.x + Math.cos(f.ph) * f.r, cz = f.center.z + Math.sin(f.ph) * f.r;
      const heading = Math.atan2(-Math.sin(f.ph) * Math.sign(f.w), Math.cos(f.ph) * Math.sign(f.w));
      for (const b of f.birds) {
        b.g.position.set(cx + b.off.x, f.center.y + b.off.y + Math.sin(t + b.ph) * 1.5, cz + b.off.z);
        b.g.rotation.y = heading;
        const flap = Math.sin(t * 9 + b.ph) * 0.6;
        b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
        b.g.visible = nightFactor < 0.5;
      }
    }
  }
}
