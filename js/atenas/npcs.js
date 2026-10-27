// O povo de Atenas: personagens principais, cidadãos na ágora, mulheres na fonte, operários dos Propileus, o coro
// no teatro, a assembleia na Pnyx, hoplitas, marinheiros, pescadores, crianças e os bichos (cães, cabras, ovelhas,
// burros, bois e gaivotas).
import * as THREE from 'three';
import { makeAnimal, animateAnimal, makeBird } from '../comum/animals.js';
import { makeHumanoid, animateHumanoid } from '../comum/mixamo.js';
import { NPCS, VILLAGER_LINES, SOLDIER_LINES, WORKER_LINES, SAILOR_LINES, CHILD_LINES, PRIEST_LINES } from './dialogues.js';
import { groundAt, moveWithCollision, terrainAt, waterAt, dryAt } from '../comum/collision.js';
import { terrainHeight, coastPoint, AGORA, BEMA, THEATER } from './terrain.js';
import { labelTexture, markerTexture } from './textures.js';
import { rr, rand, pick, angleLerp } from '../comum/util.js';

const V3 = THREE.Vector3;
export const SKINS_GR = [0xc8a07e, 0xbf9470, 0xd2aa8a, 0xb48662, 0xa87a58, 0xc49a78];
const COLORS = [0xe8e0cc, 0xf2ecdc, 0xc87a3a, 0x8e2c22, 0x3a5f8a, 0x6a7f4a, 0xb89a6a, 0x9a8e78, 0xd8b45a, 0x5a3a5e];
const BORDERS = [0x8e2c22, 0x2c4f8c, 0x3a2a1e, 0xd8b45a, null];

function castsShadow(root, on) {
  if (root.userData.sh === on) return;
  root.userData.sh = on;
  root.traverse((o) => { if (o.isMesh) o.castShadow = on; });
}

export class Actors {
  constructor(scene, city) {
    this.scene = scene; this.city = city;
    this.key = []; this.agents = []; this.animals = []; this.flocks = []; this.guards = [];
    this.camera = null; this._fr = new THREE.Frustum(); this._pv = new THREE.Matrix4(); this._s = new THREE.Sphere(); this.pp = new THREE.Vector3();
    this.markerTex = markerTexture('!');
    this.t = 0;
  }

  addHuman(look, x, z, ry = 0, y) {
    const rig = makeHumanoid({ skin: pick(SKINS_GR), ...look });
    // o piso é procurado a partir da superfície da água (cais e plataformas sobre o rio ou o mar ficam ao alcance)
    const pos = new V3(x, y ?? groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6), z);
    rig.root.position.copy(pos);
    rig.root.rotation.y = ry;
    this.scene.add(rig.root);
    return { rig, pos };
  }

  spawnKeyNPCs() {
    const S = this.city.spots;
    const figs = this.city.stalls.find((s) => s.type === 'figos');
    const P = {
      herodoto: [S.twelveGods.x + 2, S.twelveGods.z + 4, -Math.PI / 2],
      socrates: [S.simon.x, S.simon.z, Math.PI],
      mirrina: [figs.x, figs.z - 1.4, 0],
      mnesicles: [S.mnesicles.x, S.mnesicles.z, -Math.PI / 2],
      fidias: [S.partenos.x, S.partenos.z + 3.2, -Math.PI / 2],
      ictino: [S.parthenonDoor.x + 2, S.parthenonDoor.z - 9, Math.PI / 2],
      lisimaque: [S.olive.x, S.olive.z, -Math.PI / 4],
      sofocles: [THEATER.x + 4, THEATER.z + 3, Math.PI],
      aspasia: [S.casa_pericles.x + 1.5, S.casa_pericles.z + 1, Math.PI],
      calias: [S.potter.x, S.potter.z, 0],
      demon: [S.dipylon.x + 6, S.dipylon.z + 6, Math.PI * 0.75],
      formiao: [S.quay.x, S.quay.z, 0],
      glauco: [S.fisher.x, S.fisher.z, 0],
      euripides: [S.euripides.x, S.euripides.z, S.euripidesRy],
      aminias: [S.aminias.x, S.aminias.z, Math.PI],
      pericles: [BEMA.x, BEMA.z, Math.atan2(0.6, -0.8)],
    };
    S.npc_herodoto = new V3(P.herodoto[0], 0, P.herodoto[1]);
    for (const def of NPCS) {
      const [x, z, ry] = P[def.id];
      const h = this.addHuman({ ...def.look }, x, z, ry, def.id === 'pericles' ? S.bema.y : undefined);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(def.name, def.title), transparent: true, depthWrite: false }));
      label.scale.set(2.6, 0.65, 1); label.position.y = 2.35; label.renderOrder = 5;
      h.rig.root.add(label);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex, transparent: true, depthWrite: false }));
      marker.scale.setScalar(0.8); marker.position.y = 2.95; h.rig.root.add(marker);
      const k = { def, ...h, ry, label, marker, talking: false, kind: 'npc', mode: def.id === 'socrates' ? 'sit' : 'idle' };
      // sentado no banco: a saia de tecido (feita para quem está de pé) some; o manto continua pelas pernas
      if (k.mode === 'sit' && h.rig.skirt) h.rig.skirt.visible = false;
      this.key.push(k);
    }
  }

  // aparência variada dos atenienses
  looks(kind) {
    const c = pick(COLORS), b = pick(BORDERS);
    if (kind === 'woman') return { outfit: 'peplos', cloth: c, border: b, hair: rand() < 0.35 ? 'veil' : 'up', veilColor: pick([0xf2ecdc, 0xd8c8a8, 0x8e6a4a]) };
    if (kind === 'citizen') return rand() < 0.45 ? { outfit: 'himation', cloth: c, border: b, beard: rand() < 0.8 ? pick(['full', 'short']) : null, hairColor: pick([0x2a1c14, 0x3a2a1e, 0x5a4a3a, 0x8a8a82]) }
      : { outfit: 'chiton', cloth: c, border: b, beard: rand() < 0.6 ? 'short' : null, hairColor: pick([0x2a1c14, 0x3a2a1e, 0x4a3426]) };
    if (kind === 'worker') return { outfit: 'exomis', cloth: pick([0xa89a7a, 0x8a7a5a, 0xc8b89a]), border: null, beard: rand() < 0.5 ? 'short' : null, extras: rand() < 0.4 ? ['pilos'] : [] };
    if (kind === 'hoplite') return { outfit: 'hoplite', cloth: pick([0x8e2c22, 0x9a3a24, 0x7a2a2a]), border: 0x2a1a10, beard: 'short', extras: ['spear', 'aspis', 'helmet', 'cuirass'], device: pick(['owl', 'gorgon', 'bolt', 'other']), pose: 'spear' };
    if (kind === 'sailor') return { outfit: 'exomis', cloth: pick([0xd8cfb8, 0x8a7a5a, 0x3a5f8a]), border: null, beard: rand() < 0.6 ? 'short' : null, extras: ['pilos'] };
    if (kind === 'child') return { outfit: 'chiton', cloth: pick([0xf2ecdc, 0xd8b45a, 0x6a7f4a]), border: null, height: rr(1.05, 1.3) };
    if (kind === 'priest') return { outfit: 'himation', cloth: 0xf4efe2, border: 0xd8b45a, beard: 'full', hairColor: 0x8a8a82, extras: ['diadem'] };
    return { outfit: 'chiton', cloth: c };
  }

  spawnAmbient() {
    const C = this.city, S = C.spots, A = AGORA;
    // ponto sorteado na região, sempre em chão seco (nada de gente nascendo no fundo do rio ou do porto)
    const randIn = (r) => { let p; for (let i = 0; i < 30; i++) { p = new V3(rr(r[0], r[1]), 0, rr(r[2], r[3])); if (dryAt(p.x, p.z)) break; } return p; };
    const walker = (kind, region, n, o = {}) => {
      for (let i = 0; i < n; i++) {
        const p = randIn(region);
        const look = { ...this.looks(kind), ...(o.look || {}) };
        const h = this.addHuman(look, p.x, p.z, rand() * 6);
        this.agents.push({ ...h, kind: o.as || (kind === 'woman' ? 'villager' : kind === 'hoplite' ? 'soldier' : kind === 'citizen' ? 'villager' : kind), region, speed: o.speed ?? rr(1.0, 1.5), wait: rr(0, 4), lines: o.lines || VILLAGER_LINES, mode: 'idle', run: o.run });
      }
    };
    // aldeia de pescadores de Salamina: gente consertando redes, mulheres e crianças
    const ISL = ['Aqui em Salamina todo mundo tem um avô que remou na batalha.', 'O peixe daqui é melhor que o do Falero, pode perguntar a qualquer um.', 'Lá na gruta mora o poeta Eurípides. Fala pouco, escreve muito.', 'O santuário de Ájax fica no alto. Ájax era daqui, sabia? O maior guerreiro depois de Aquiles.', 'Do outro lado do estreito é o Pireu. Num dia claro dá para ver o Parthenon brilhando.'];
    if (C.islandVillage) { const v = C.islandVillage; walker('sailor', v, 4, { lines: ISL }); walker('woman', v, 3, { lines: ISL }); walker('child', v, 2, { lines: CHILD_LINES }); }
    // ágora: cidadãos conversando e passeando, mulheres e escravos fazendo compras
    const ag = [A.x - A.hw + 8, A.x + A.hw - 8, A.z - A.hd + 8, A.z + A.hd - 8];
    walker('citizen', ag, 12); walker('woman', ag, 5); walker('worker', ag, 3, { lines: WORKER_LINES });
    // grupos parados conversando na Stoa Pintada e perto dos Tiranicidas
    for (const [c, n] of [[S.stoaPoikile, 4], [S.tyrannicides, 3], [S.stoaZeus, 3]]) for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = c.x + Math.cos(a) * 1.4, z = c.z + Math.sin(a) * 1.4;
      const h = this.addHuman(this.looks('citizen'), x, z, Math.atan2(c.x - x, c.z - z));
      this.agents.push({ ...h, kind: 'villager', static: true, ry: Math.atan2(c.x - x, c.z - z), lines: VILLAGER_LINES, mode: i % 2 ? 'talk' : 'idle' });
    }
    // fonte: mulheres com a hídria (o jarro de água) na cabeça
    { const f = S.fountain; walker('woman', [f.x - 10, f.x + 10, f.z - 12, f.z - 2], 4, { look: { extras: ['jar'] } }); }
    // bairros
    for (const r of [[-380, -260, -140, 20], [-240, -60, 80, 230], [-40, 230, 130, 240], [-60, 250, -380, -120], [-540, -420, -260, -60]]) { walker('citizen', r, 4); walker('woman', r, 3); walker('child', r, 2, { lines: CHILD_LINES, speed: 2.8, run: true, as: 'child' }); }
    // Acrópole: visitantes, sacerdotes e os operários das obras
    walker('citizen', [-60, 60, -40, 40], 5);
    walker('priest', [-40, 40, -45, -15], 2, { lines: PRIEST_LINES, speed: 0.7 });
    { const m = S.mnesicles; for (let i = 0; i < 5; i++) { const x = m.x + rr(-8, 8), z = m.z + rr(-6, 6); const h = this.addHuman(this.looks('worker'), x, z, rand() * 6); const work = i < 3; this.agents.push({ ...h, kind: 'worker', static: work, region: [m.x - 12, m.x + 12, m.z - 8, m.z + 8], speed: 1.0, wait: rr(0, 3), lines: WORKER_LINES, mode: work ? 'work' : 'idle', ry: rand() * 6 }); } }
    // teatro: o coro ensaiando na orquestra (quinze cantores em fileiras)
    for (let i = 0; i < 12; i++) {
      const x = THEATER.x - 6 + (i % 6) * 2.4, z = THEATER.z - 2 + Math.floor(i / 6) * 2.6;
      const h = this.addHuman({ outfit: 'chiton', cloth: 0xd8b45a, border: 0x8e2c22 }, x, z, Math.PI);
      this.agents.push({ ...h, kind: 'villager', static: true, ry: Math.PI, lines: ['Ió, ió! ...Desculpe, estamos ensaiando o canto do coro.', 'Sófocles quer tudo perfeito para as Dionisias.'], mode: 'talk' });
    }
    // Pnyx: cidadãos sentados esperando o discurso
    for (let i = 0; i < 26; i++) {
      const a = -1.0 + rand() * 2.0, d = rr(12, 50), dir = Math.atan2(0.6, -0.8) + a * 0.9;
      const x = BEMA.x + Math.sin(dir) * d, z = BEMA.z + Math.cos(dir) * d;
      const h = this.addHuman(this.looks('citizen'), x, z, Math.atan2(BEMA.x - x, BEMA.z - z));
      this.agents.push({ ...h, kind: 'villager', static: true, ry: Math.atan2(BEMA.x - x, BEMA.z - z), lines: VILLAGER_LINES, mode: rand() < 0.75 ? 'sit' : 'idle' });
    }
    // hoplitas: guarda nas portas e patrulhas nas ruas principais
    for (const g of C.gates) for (const s of [-1, 1]) {
      const x = g.x + s * 3, z = g.z + 2;
      const h = this.addHuman(this.looks('hoplite'), x, z, 0);
      this.agents.push({ ...h, kind: 'soldier', static: true, ry: rand() * 6, lines: SOLDIER_LINES, mode: 'idle' });
    }
    const routes = [
      [new V3(-330, 0, -268), new V3(-222, 0, -150), new V3(-218, 0, -40), new V3(-222, 0, -150)],
      [new V3(-335, 0, 40), new V3(-360, 0, 140), new V3(-300, 0, -110)],
    ];
    for (const route of routes) for (let k = 0; k < 2; k++) {
      const s = route[0].clone().add(new V3(k * 1.2, 0, k * 1.2));
      const h = this.addHuman(this.looks('hoplite'), s.x, s.z, 0);
      this.agents.push({ ...h, kind: 'soldier', route: route.map((r) => r.clone().add(new V3(k * 1.2, 0, k * 1.2))), ri: 1, speed: 1.4, wait: k * 0.8, lines: SOLDIER_LINES, mode: 'idle' });
    }
    // porto: marinheiros e estivadores; praia: pescadores consertando redes
    { const q = S.quay; walker('sailor', [q.x - 30, q.x + 30, q.z - 22, q.z + 6], 8, { lines: SAILOR_LINES }); }
    for (let i = 0; i < 5; i++) {
      const p = coastPoint(10 + i * 45 + rr(-6, 6), -16 - rr(0, 6));
      const h = this.addHuman(this.looks('sailor'), p.x, p.z, rand() * 6);
      this.agents.push({ ...h, kind: 'sailor', static: true, ry: rand() * 6, lines: ['A pesca hoje foi fraca. Poseidon está de mau humor.', 'Conserte a rede antes que o polvo a rasgue de novo!', 'Ali adiante dá para ver Salamina. Foi lá que meu avô remou contra os persas.'], mode: i % 2 ? 'work' : 'idle' });
    }
    // Cerâmico: oleiros trabalhando
    { const p = S.potter; for (let i = 0; i < 3; i++) { const h = this.addHuman(this.looks('worker'), p.x + 6 + i * 8, p.z + rr(-2, 2), rand() * 6); this.agents.push({ ...h, kind: 'worker', static: true, ry: rand() * 6, lines: ['Cuidado, o vaso ainda está mole!', 'Este barro veio do cabo Colias. É o melhor da Ática.'], mode: 'work' }); } }
  }

  spawnAnimals() {
    const C = this.city, S = C.spots;
    const add = (kind, x, z, opts = {}) => {
      const a = makeAnimal(kind);
      const y = opts.y ?? groundAt(x, z, Math.max(terrainAt(x, z), waterAt(x, z)) + 1.6);
      a.g.position.set(x, y, z); a.g.rotation.y = rand() * 6;
      if (opts.scale) a.g.scale.setScalar(opts.scale);
      a.seed = rand() * 10;
      this.scene.add(a.g);
      const o = { a, pos: a.g.position, home: new V3(x, y, z), radius: opts.radius ?? 6, speed: a.speed * (opts.speedMul || 1), wait: rr(0, 5), static: opts.static };
      this.animals.push(o);
      return o;
    };
    const A = AGORA;
    for (let i = 0; i < 4; i++) add('dog', A.x + rr(-80, 80), A.z + rr(-70, 70), { radius: 12 });
    for (let i = 0; i < 3; i++) add('donkey', A.x + rr(30, 90), A.z + rr(-40, 20), { radius: 10 });
    for (let i = 0; i < 3; i++) add('cat', rr(-380, -200), rr(-150, 50), { radius: 8 });
    // bois esperando o sacrifício perto do grande altar e no Cerâmico
    add('ox', S.altar.x + 6, S.altar.z + 3, { radius: 3 }); add('ox', S.altar.x + 8, S.altar.z + 5, { radius: 3 });
    // cabras e ovelhas nas encostas do Mouseion e da Pnyx, e fora dos muros
    for (let i = 0; i < 8; i++) add(rand() < 0.5 ? 'goat' : 'sheep', -175 + rr(-30, 30), 185 + rr(-25, 25), { radius: 14 });
    for (let i = 0; i < 6; i++) add(rand() < 0.5 ? 'goat' : 'sheep', -420 + rr(-30, 30), 10 + rr(-30, 30), { radius: 14 });
    for (let i = 0; i < 4; i++) add('dog', rr(-560, 200), rr(-300, 200), { radius: 15 });
    // cabras nas ilhas (Psitália e Salamina) e um cachorro na aldeia de pescadores
    for (const [gx, gz, n] of C.islandGoats || []) for (let i = 0; i < n; i++) add('goat', gx + rr(-10, 10), gz + rr(-10, 10), { radius: 10 });
    if (C.islandVillage) { const v = C.islandVillage; add('dog', (v[0] + v[1]) / 2, (v[2] + v[3]) / 2, { radius: 12 }); }
    // gaivotas sobre o mar e a praia; andorinhas sobre a cidade
    for (let f = 0; f < 5; f++) {
      const sea = f < 3;
      const c = sea ? coastPoint(-200 + f * 160, 20) : { x: rr(-300, 100), z: rr(-250, 100) };
      const center = new V3(c.x, sea ? rr(12, 30) : rr(40, 70), c.z);
      const birds = [];
      for (let i = 0; i < (sea ? 7 : 9); i++) { const b = makeBird(sea ? 0xf0f0ec : undefined); b.off = new V3(rr(-8, 8), rr(-3, 3), rr(-8, 8)); b.ph = rand() * 6; if (sea) b.g.scale.setScalar(1.4); this.scene.add(b.g); birds.push(b); }
      this.flocks.push({ center, r: rr(30, 80), w: rr(0.05, 0.1) * (rand() < 0.5 ? -1 : 1), birds, ph: rand() * 6 });
    }
  }

  nearestInteractable(p, max = 2.8) {
    let best = null, bd = max * max;
    const test = (o, type) => {
      const d = (o.pos.x - p.x) ** 2 + (o.pos.z - p.z) ** 2;
      if (d < bd && Math.abs(o.pos.y - p.y) < 2) { bd = d; best = { type, o }; }
    };
    for (const k of this.key) test(k, 'npc');
    for (const a of this.agents) test(a, a.kind);
    return best;
  }

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
      const seated = k.mode === 'sit' && !k.talking;
      if (k.talking || (close && !seated)) face(k, pp, 5);
      else k.rig.root.rotation.y = angleLerp(k.rig.root.rotation.y, k.ry, dt * 2);
      this.anim(k.rig, dt, 0, k.talking ? 'talk' : k.mode, t);
      k.label.visible = near(k, 20);
      const lockedFinal = k.def.id === 'pericles' && !quests.finalUnlocked();
      const carry = k.def.id === 'aspasia' && player.holding?.type === 'kylix' && !quests.isDone('kylix');
      const pending = (!quests.isDone(k.def.objective) && !lockedFinal) || carry;
      k.marker.visible = pending && near(k, 60);
      k.marker.position.y = 2.95 + Math.sin(t * 3) * 0.08;
      k.marker.material.color.set(carry ? 0x9fe0ff : 0xffffff);
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
      if (a.wait > 0) { a.wait -= dt; this.anim(a.rig, dt, 0, 'idle', t); continue; }
      if (!a.target) {
        if (a.route) { a.target = a.route[a.ri]; a.ri = (a.ri + 1) % a.route.length; }
        else {
          for (let i = 0; i < 8; i++) {
            const c = new V3(rr(a.region[0], a.region[1]), 0, rr(a.region[2], a.region[3]));
            if (waterAt(c.x, c.z) < terrainAt(c.x, c.z) - 0.2 || terrainAt(c.x, c.z) > 1) { a.target = c; break; }
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
      if (!dryAt(a.pos.x, a.pos.z, a.pos.y + 0.3)) { a.pos.x = ox; a.pos.z = oz; a.target = null; a.wait = rr(0.5, 2); } // beira do cais / da água: dá meia-volta
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
              if (terrainHeight(c.x, c.z) > 1) { o.target = c; break; }
            }
            if (!o.target) o.wait = 2;
          }
          if (o.target) {
            const dx = o.target.x - o.pos.x, dz = o.target.z - o.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.3) { o.target = null; o.wait = rr(2, 10); }
            else {
              const sp = o.speed * dt, ox = o.pos.x, oz = o.pos.z;
              moveWithCollision(o.pos, dx / d * sp, dz / d * sp, 0.2, 0.6);
              if (Math.hypot(o.pos.x - ox, o.pos.z - oz) < sp * 0.3) { o.target = null; o.wait = 1; }
              o.pos.y = groundAt(o.pos.x, o.pos.z, o.pos.y + 0.3);
              o.a.g.rotation.y = angleLerp(o.a.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 4));
              moving = true;
            }
          }
        }
      }
      animateAnimal(o.a, dt, moving, t);
    }
    for (const f of this.flocks) {
      f.ph += dt * f.w;
      const cx = f.center.x + Math.cos(f.ph) * f.r, cz = f.center.z + Math.sin(f.ph) * f.r;
      const heading = Math.atan2(-Math.sin(f.ph) * Math.sign(f.w), Math.cos(f.ph) * Math.sign(f.w));
      for (const b of f.birds) {
        b.g.position.set(cx + b.off.x, f.center.y + b.off.y + Math.sin(t + b.ph) * 1.5, cz + b.off.z);
        b.g.rotation.y = heading;
        const flap = Math.sin(t * 7 + b.ph) * 0.5;
        b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
        b.g.visible = nightFactor < 0.5;
      }
    }
  }
}
